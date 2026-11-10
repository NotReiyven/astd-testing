import { createClient } from "@supabase/supabase-js";
import { apiLogger } from "../../_lib/logger.js";
import { verifyLiveClearance } from "../../_lib/clearance.js";

export const config = {
  maxDuration: 60,
};

const PAGE_SIZE = 1000;
const MAX_PAGES = 500; // hard cap => 500,000 users
const BATCH_SIZE = 50; // Resend API max BCC per request

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: Request) {
  // 1. Live Clearance Check (Master only)
  const clearance = await verifyLiveClearance(request, ["master"]);
  if (!clearance.ok) {
    return new Response(JSON.stringify({ error: clearance.error }), {
      status: clearance.status || 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "Resend API key not configured." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const rawSubject = body?.subject;
    const rawMessage = body?.message;

    if (typeof rawSubject !== "string" || rawSubject.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Non-empty subject required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (rawSubject.length > 200) {
      return new Response(JSON.stringify({ error: "Subject must be <= 200 characters." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (typeof rawMessage !== "string" || rawMessage.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Non-empty message required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (rawMessage.length > 5000) {
      return new Response(JSON.stringify({ error: "Message must be <= 5000 characters." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const safeSubject = rawSubject.replace(/[\r\n]+/g, " ").trim();
    const safeMessage = escapeHtml(rawMessage).replace(/\n/g, "<br/>");

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. Paginated fetch of all users
    const emailSet = new Set<string>();
    let page = 1;
    let totalUsersScanned = 0;
    let pagesFetched = 0;

    while (page <= MAX_PAGES) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage: PAGE_SIZE,
      });

      if (error) {
        apiLogger.error({
          route: "/api/admin/notifyBreach",
          code: "ASTD-BRC-002",
          message: `Failed to page listUsers at page ${page}`,
          meta: { page, perPage: PAGE_SIZE },
          error,
        });
        throw error;
      }

      const users = data?.users || [];
      totalUsersScanned += users.length;
      pagesFetched++;

      for (const u of users) {
        if (
          typeof u.email === "string" &&
          u.email.includes("@") &&
          u.email.length <= 320
        ) {
          emailSet.add(u.email.toLowerCase());
        }
      }

      if (users.length < PAGE_SIZE) break;
      page++;
    }

    const emails = Array.from(emailSet);

    if (emails.length === 0) {
      return new Response(JSON.stringify({ message: "No users found" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Send emails in batches
    let batchesSent = 0;
    let batchesFailed = 0;
    const failureDetails: string[] = [];

    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE);

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "ASTD Security <security@yourdomain.com>",
            bcc: batch,
            subject: safeSubject,
            html: `<div style="font-family: sans-serif; color: #1a1a1a;">
                    <h2 style="color: #d90429;">Security Notification</h2>
                    <p>${safeMessage}</p>
                    <hr style="margin-top: 30px;" />
                    <p style="font-size: 12px; color: #666;">You are receiving this legally required notice because you have an account registered with us.</p>
                   </div>`,
          }),
        });

        if (!res.ok) {
          batchesFailed++;
          const errorText = await res.text();
          failureDetails.push(
            `Batch ${i}-${i + batch.length}: ${res.status} ${errorText.slice(0, 200)}`
          );
          apiLogger.error({
            route: "/api/admin/notifyBreach",
            code: "ASTD-BRC-004",
            message: "Breach email batch failed",
            meta: {
              batchIndex: i,
              batchSize: batch.length,
              status: res.status,
              responseText: errorText.slice(0, 500),
            },
          });
        } else {
          batchesSent++;
        }
      } catch (batchErr) {
        batchesFailed++;
        failureDetails.push(`Batch ${i}-${i + batch.length}: network error`);
        apiLogger.error({
          route: "/api/admin/notifyBreach",
          code: "ASTD-BRC-005",
          message: "Breach email batch threw network error",
          meta: { batchIndex: i, batchSize: batch.length },
          error: batchErr,
        });
      }
    }

    const allSucceeded = batchesFailed === 0;
    const someSucceeded = batchesSent > 0;

    apiLogger.info({
      route: "/api/admin/notifyBreach",
      code: "ASTD-BRC-006",
      message: "Breach notification completed",
      meta: {
        totalUsersScanned,
        uniqueEmails: emails.length,
        pagesFetched,
        batchesSent,
        batchesFailed,
      },
    });

    return new Response(
      JSON.stringify({
        success: allSucceeded,
        usersNotified: emails.length,
        batchesSent,
        batchesFailed,
        totalUsersScanned,
        failureDetails: failureDetails.length > 0 ? failureDetails : undefined,
      }),
      {
        status: allSucceeded ? 200 : someSucceeded ? 207 : 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    apiLogger.error({
      route: "/api/admin/notifyBreach",
      code: "ASTD-BRC-099",
      message: "Breach notification process failed catastrophically",
      error,
    });
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}