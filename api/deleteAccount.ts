// ================================================
// FILE: api/deleteAccount.ts
// ================================================

import { createClient } from "@supabase/supabase-js";
import { apiLogger } from "./lib/logger.js";

export const config = {
  maxDuration: 20,
};

function jsonResponse(status: number, body: Record<string, any>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

interface DeleteTask {
  name: string;
  isCritical: boolean;
  run: () => Promise<{ error: any }>;
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse(500, { error: "Database configuration unavailable." });
  }

  // 1. Auth Gate: Validate Bearer token
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse(401, { error: "Authentication required to delete account." });
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return jsonResponse(401, { error: "Invalid authorization header." });
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 2. Cryptographically verify the session token via Supabase Auth
  const {
    data: { user },
    error: authError,
  } = await adminClient.auth.getUser(token);

  if (authError || !user) {
    return jsonResponse(401, { error: "Unauthorized or expired session." });
  }

  // SECURITY: The user ID to delete is strictly derived from the verified JWT.
  // It is mathematically impossible for one user to delete another user.
  const targetUserId = user.id;

  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty
    }

    // Require typed confirmation phrase
    const confirmation = typeof body.confirmation === "string" ? body.confirmation.trim().toLowerCase() : "";
    if (confirmation !== "delete my account") {
      return jsonResponse(400, {
        error: "Confirmation phrase does not match. Please type 'delete my account' to confirm.",
      });
    }

    // Explicit guard: if targetUserId is explicitly passed in payload, verify it strictly matches JWT
    if (body.targetUserId && body.targetUserId !== targetUserId) {
      return jsonResponse(403, { error: "Forbidden: You cannot delete another user's account." });
    }

    // 3. Define cascade tasks with criticality weighting
    const tasks: DeleteTask[] = [
      {
        name: "trading_ads",
        isCritical: true,
        run: async () => adminClient.from("trading_ads").delete().eq("user_id", targetUserId),
      },
      {
        name: "profiles",
        isCritical: true,
        run: async () => adminClient.from("profiles").delete().eq("id", targetUserId),
      },
      {
        name: "ad_votes",
        isCritical: false,
        run: async () => adminClient.from("ad_votes").delete().eq("user_id", targetUserId),
      },
      {
        name: "comment_votes",
        isCritical: false,
        run: async () => adminClient.from("comment_votes").delete().eq("user_id", targetUserId),
      },
      {
        name: "notifications (user)",
        isCritical: false,
        run: async () => adminClient.from("notifications").delete().eq("user_id", targetUserId),
      },
      {
        name: "notifications (actor)",
        isCritical: false,
        run: async () => adminClient.from("notifications").delete().eq("actor_id", targetUserId),
      },
      {
        name: "ad_comments",
        isCritical: false,
        run: async () => adminClient.from("ad_comments").delete().eq("user_id", targetUserId),
      },
      {
        name: "user_inventory",
        isCritical: false,
        run: async () => adminClient.from("user_inventory").delete().eq("user_id", targetUserId),
      },
      {
        name: "user_wishlist",
        isCritical: false,
        run: async () => adminClient.from("user_wishlist").delete().eq("user_id", targetUserId),
      },
      {
        name: "moderation_logs",
        isCritical: false,
        run: async () => adminClient.from("moderation_logs").delete().eq("target_user_id", targetUserId),
      },
      {
        name: "storage_banners",
        isCritical: false,
        run: async () => {
          try {
            const { data: files, error: listErr } = await adminClient.storage.from("banners").list(targetUserId);
            if (listErr) return { error: listErr };
            if (Array.isArray(files) && files.length > 0) {
              const filePaths = files.map((f) => `${targetUserId}/${f.name}`);
              const { error: removeErr } = await adminClient.storage.from("banners").remove(filePaths);
              return { error: removeErr };
            }
            return { error: null };
          } catch (err) {
            return { error: err };
          }
        },
      },
    ];

    // Execute concurrently via Promise.allSettled
    const results = await Promise.allSettled(
      tasks.map(async (task) => {
        const res = await task.run();
        if (res.error) {
          throw res.error;
        }
        return task.name;
      })
    );

    let hasCriticalFailure = false;
    const failedTables: string[] = [];

    results.forEach((res, index) => {
      const task = tasks[index];
      if (res.status === "rejected") {
        failedTables.push(task.name);
        apiLogger.error({
          route: "/api/deleteAccount",
          code: "ASTD-ACC-001",
          message: `Failed to purge ${task.name} for user`,
          meta: { table: task.name, isCritical: task.isCritical, targetUserId },
          error: res.reason,
        });
        if (task.isCritical) {
          hasCriticalFailure = true;
        }
      }
    });

    // Abort if critical tables failed to delete, preventing orphaned active listings
    if (hasCriticalFailure) {
      apiLogger.fatal({
        route: "/api/deleteAccount",
        code: "ASTD-ACC-002",
        message: `Critical table purge failed for ${targetUserId}. Aborting auth user deletion.`,
        meta: { targetUserId, failedTables },
      });
      return jsonResponse(500, {
        error: "Failed to purge critical user records (trading_ads / profiles). Account deletion aborted to prevent orphaned listings.",
        failedTables,
      });
    }

    // 4. Delete user credentials in auth.users
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(targetUserId);
    if (deleteUserError) {
      apiLogger.error({
        route: "/api/deleteAccount",
        code: "ASTD-ACC-003",
        message: "Supabase auth.admin.deleteUser error",
        meta: { targetUserId },
        error: deleteUserError,
      });
      return jsonResponse(500, { error: "Failed to delete user authentication record." });
    }

    return jsonResponse(200, {
      success: true,
      message: "Account and associated data deleted successfully.",
      failedNonCriticalTables: failedTables.length > 0 ? failedTables : undefined,
    });
  } catch (err: unknown) {
    apiLogger.error({
      route: "/api/deleteAccount",
      code: "ASTD-ACC-004",
      message: "Unexpected failure in deleteAccount",
      error: err,
    });
    return jsonResponse(500, {
      error: "An unexpected error occurred while deleting account.",
    });
  }
}
