import { createClient } from "@supabase/supabase-js";

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

    // Explicit guard: if a targetUserId is passed in payload, verify it strictly matches the authenticated user
    if (body.targetUserId && body.targetUserId !== targetUserId) {
      return jsonResponse(403, { error: "Forbidden: You cannot delete another user's account." });
    }

    // 3. Cascade delete user data across all tables
    try {
      await adminClient.from("ad_votes").delete().eq("user_id", targetUserId);
    } catch (err) {
      console.warn("[deleteAccount] ad_votes delete:", err);
    }

    try {
      await adminClient.from("comment_votes").delete().eq("user_id", targetUserId);
    } catch (err) {
      console.warn("[deleteAccount] comment_votes delete:", err);
    }

    try {
      await adminClient.from("notifications").delete().eq("user_id", targetUserId);
      await adminClient.from("notifications").delete().eq("actor_id", targetUserId);
    } catch (err) {
      console.warn("[deleteAccount] notifications delete:", err);
    }

    try {
      await adminClient.from("ad_comments").delete().eq("user_id", targetUserId);
    } catch (err) {
      console.warn("[deleteAccount] ad_comments delete:", err);
    }

    try {
      await adminClient.from("trading_ads").delete().eq("user_id", targetUserId);
    } catch (err) {
      console.warn("[deleteAccount] trading_ads delete:", err);
    }

    try {
      await adminClient.from("user_inventory").delete().eq("user_id", targetUserId);
    } catch (err) {
      console.warn("[deleteAccount] user_inventory delete:", err);
    }

    try {
      await adminClient.from("user_wishlist").delete().eq("user_id", targetUserId);
    } catch (err) {
      console.warn("[deleteAccount] user_wishlist delete:", err);
    }

    // Prune storage banners if any exist
    try {
      const { data: files } = await adminClient.storage
        .from("banners")
        .list(targetUserId);

      if (Array.isArray(files) && files.length > 0) {
        const filePaths = files.map((f) => `${targetUserId}/${f.name}`);
        await adminClient.storage.from("banners").remove(filePaths);
      }
    } catch (storageErr) {
      console.warn("[deleteAccount] storage prune:", storageErr);
    }

    try {
      await adminClient.from("moderation_logs").delete().eq("target_user_id", targetUserId);
    } catch (err) {
      console.warn("[deleteAccount] moderation_logs delete:", err);
    }

    // Delete public profile
    try {
      await adminClient.from("profiles").delete().eq("id", targetUserId);
    } catch (err) {
      console.warn("[deleteAccount] profiles delete:", err);
    }

    // 4. Delete user credentials in auth.users
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(targetUserId);
    if (deleteUserError) {
      console.error("[deleteAccount] Supabase auth.admin.deleteUser error:", deleteUserError);
      return jsonResponse(500, { error: "Failed to delete user authentication record." });
    }

    return jsonResponse(200, {
      success: true,
      message: "Account and associated data deleted successfully.",
    });
  } catch (err: any) {
    console.error("[deleteAccount] Unexpected failure:", err);
    return jsonResponse(500, {
      error: "An unexpected error occurred while deleting account.",
    });
  }
}
