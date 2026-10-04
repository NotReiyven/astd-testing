import { createClient } from "@supabase/supabase-js";

/**
 * EMERGENCY DATA BREACH NOTIFICATION SCRIPT
 * 
 * This is an emergency-use-only endpoint to blast an email to all registered 
 * users in the event of a severe data breach. 
 * 
 * Usage:
 * POST /api/admin/notifyBreach
 * Headers: { "Authorization": "Bearer <YOUR_ADMIN_SECRET>" }
 * Body: { "subject": "URGENT: Security Notice", "message": "..." }
 */

export async function POST(request: Request) {
  const ADMIN_SECRET = process.env.ADMIN_SECRET;
  const RESEND_API_KEY = process.env.RESEND_API_KEY; // Using Resend.com for mass emails

  if (!ADMIN_SECRET || !RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing configuration" }), { status: 500 });
  }

  // 1. Auth Gate
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const { subject, message } = await request.json();
    
    if (!subject || !message) {
      return new Response(JSON.stringify({ error: "Subject and message required" }), { status: 400 });
    }

    // 2. Init Admin Supabase Client
    // We must use the SERVICE_ROLE_KEY to bypass RLS and read the hidden auth.users table
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. Fetch All Users' Emails (Paginated in production, but batch for this example)
    const { data: users, error: dbError } = await supabase.auth.admin.listUsers();
    
    if (dbError) throw dbError;

    const emails = users.users.map(u => u.email).filter(Boolean) as string[];

    if (emails.length === 0) {
      return new Response(JSON.stringify({ message: "No users found" }), { status: 200 });
    }

    // 4. Blast Emails in Batches (Resend API allows up to 50 recipients per batch request)
    // To avoid rate limits in a massive DB, you'd queue these, but this works for < 10k users.
    const BATCH_SIZE = 50;
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE);
      
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "ASTD Security <security@yourdomain.com>",
          bcc: batch, // ALWAYS USE BCC FOR MASS EMAILS TO PREVENT LEAKING OTHER EMAILS
          subject: subject,
          html: `<div style="font-family: sans-serif; color: #1a1a1a;">
                  <h2 style="color: #d90429;">Security Notification</h2>
                  <p>${message.replace(/\n/g, "<br/>")}</p>
                  <hr style="margin-top: 30px;" />
                  <p style="font-size: 12px; color: #666;">You are receiving this legally required notice because you have an account registered with us.</p>
                 </div>`
        })
      });

      if (!res.ok) {
        console.error(`Batch ${i} failed:`, await res.text());
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      usersNotified: emails.length 
    }), { status: 200 });

  } catch (error: any) {
    console.error("Breach notification failed:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
