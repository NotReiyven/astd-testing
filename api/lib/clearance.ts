import { createClient } from "@supabase/supabase-js";
import { apiLogger } from "./logger.js";

export interface ClearanceResult {
  ok: boolean;
  liveRole?: string;
  error?: string;
  status?: number;
}

/**
 * Verifies that the caller's JWT is valid AND that their role in the database
 * currently matches the required clearance. This prevents a user who was
 * recently demoted or banned from continuing to use admin endpoints with a
 * stale JWT.
 */
export async function verifyLiveClearance(
  request: Request,
  allowedRoles: ("master" | "admin" | "mod")[]
): Promise<ClearanceResult> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return { ok: false, error: "Database configuration unavailable.", status: 500 };
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, error: "Authentication required.", status: 401 };
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return { ok: false, error: "Invalid authorization header.", status: 401 };
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Verify the JWT is cryptographically valid
  const {
    data: { user },
    error: authError,
  } = await adminClient.auth.getUser(token);

  if (authError || !user) {
    return { ok: false, error: "Unauthorized or expired session.", status: 401 };
  }

  // 2. Fetch the user's CURRENT role directly from the database
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    apiLogger.warn({
      route: "verifyLiveClearance",
      code: "ASTD-CLR-001",
      message: "Could not fetch live profile for clearance check",
      meta: { userId: user.id },
      error: profileError,
    });
    return { ok: false, error: "Profile not found.", status: 403 };
  }

  const liveRole = (profile.role || "user").toLowerCase();

  // 3. Enforce the required clearance
  if (!allowedRoles.includes(liveRole as any)) {
    apiLogger.warn({
      route: "verifyLiveClearance",
      code: "ASTD-CLR-002",
      message: "User failed live clearance check",
      meta: { userId: user.id, liveRole, required: allowedRoles },
    });
    return { ok: false, error: "Insufficient clearance.", status: 403 };
  }

  return { ok: true, liveRole };
}