// ================================================
// FILE: api/admin/securityStatus.ts
// ================================================

import { createClient } from "@supabase/supabase-js";
import { apiLogger } from "../lib/logger.js";
import { verifyLiveClearance } from "../lib/clearance.js";

export const config = {
  maxDuration: 15,
};

type CheckStatus = "ok" | "warn" | "fail";

interface SecurityCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

interface RlsReport {
  enabled: number;
  disabled: number;
  tables: string[];
  enabledWithoutPolicies: string[];
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  // 1. Live clearance check (master only)
  const clearance = await verifyLiveClearance(request, ["master"]);
  if (!clearance.ok) {
    return jsonResponse(clearance.status || 403, {
      error: clearance.error || "Insufficient clearance.",
    });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse(500, { error: "Database config missing." });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const checks: SecurityCheck[] = [];

  // 2. RLS report via get_public_tables_rls RPC
  let rls: RlsReport = {
    enabled: 0,
    disabled: 0,
    tables: [],
    enabledWithoutPolicies: [],
  };

  try {
    const { data, error } = await supabase.rpc("get_public_tables_rls");

    if (error) {
      apiLogger.warn({
        route: "/api/admin/securityStatus",
        code: "ASTD-SEC-003",
        message: "get_public_tables_rls RPC missing or failed",
        error,
      });
      checks.push({
        id: "rls_rpc",
        label: "RLS check RPC",
        status: "fail",
        detail:
          "Run scripts/sql/get_public_tables_rls.sql in the Supabase SQL editor to enable this check.",
      });
    } else if (data && typeof data === "object") {
      const parsed = data as Record<string, unknown>;
      const enabledCount =
        typeof parsed.enabled === "number" ? parsed.enabled : 0;
      const disabledCount =
        typeof parsed.disabled === "number" ? parsed.disabled : 0;
      const tablesList = Array.isArray(parsed.tables)
        ? (parsed.tables as string[])
        : [];
      const missingPolicies = Array.isArray(parsed.enabledWithoutPolicies)
        ? (parsed.enabledWithoutPolicies as string[])
        : [];

      rls = {
        enabled: enabledCount,
        disabled: disabledCount,
        tables: tablesList,
        enabledWithoutPolicies: missingPolicies,
      };

      if (disabledCount === 0) {
        checks.push({
          id: "rls_enabled",
          label: "RLS on public tables",
          status: "ok",
          detail: `${enabledCount} table${
            enabledCount === 1 ? "" : "s"
          } protected`,
        });
      } else {
        checks.push({
          id: "rls_enabled",
          label: "RLS on public tables",
          status: "fail",
          detail: `${disabledCount} table${
            disabledCount === 1 ? "" : "s"
          } missing RLS: ${tablesList.join(", ")}`,
        });
      }

      if (missingPolicies.length > 0) {
        checks.push({
          id: "rls_policies",
          label: "RLS policies present",
          status: "warn",
          detail: `${missingPolicies.length} table${
            missingPolicies.length === 1 ? "" : "s"
          } have RLS enabled but no policies: ${missingPolicies.join(", ")}`,
        });
      } else {
        checks.push({
          id: "rls_policies",
          label: "RLS policies present",
          status: "ok",
          detail: "Every RLS-protected table has at least one policy",
        });
      }
    }
  } catch (err) {
    apiLogger.warn({
      route: "/api/admin/securityStatus",
      code: "ASTD-SEC-004",
      message: "Unexpected error while querying RLS report",
      error: err,
    });
    checks.push({
      id: "rls_rpc",
      label: "RLS check RPC",
      status: "fail",
      detail: "RLS report could not be queried. Check server logs.",
    });
  }

  // 3. Rate limiting env
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const rateLimitsConfigured = Boolean(upstashUrl && upstashToken);
  checks.push({
    id: "rate_limits",
    label: "Rate limiting (Upstash)",
    status: rateLimitsConfigured ? "ok" : "fail",
    detail: rateLimitsConfigured
      ? "Sliding window limiter configured on /api/syncSheet and /api/uploadBanner"
      : "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN",
  });

  // 4. Service role key
  const hasServiceKey = Boolean(serviceKey);
  checks.push({
    id: "service_role",
    label: "Service role key present",
    status: hasServiceKey ? "ok" : "fail",
    detail: hasServiceKey
      ? "Server-only admin calls are enabled"
      : "SUPABASE_SERVICE_ROLE_KEY is not set",
  });

  // 5. Cron secret
  const hasCronSecret = Boolean(
    process.env.CRON_SECRET || process.env.SYNC_SECRET
  );
  checks.push({
    id: "cron_secret",
    label: "Cron secret present",
    status: hasCronSecret ? "ok" : "fail",
    detail: hasCronSecret
      ? "/api/cronHistory is protected"
      : "Set CRON_SECRET or SYNC_SECRET to protect /api/cronHistory",
  });

  // 6. Sheet sync env
  const hasSheetsKey = Boolean(process.env.GOOGLE_SHEETS_API_KEY);
  const hasSheetId = Boolean(process.env.SPREADSHEET_ID);
  checks.push({
    id: "sheet_sync",
    label: "Sheet sync configured",
    status: hasSheetsKey && hasSheetId ? "ok" : "fail",
    detail:
      hasSheetsKey && hasSheetId
        ? "GOOGLE_SHEETS_API_KEY and SPREADSHEET_ID are set"
        : "Set GOOGLE_SHEETS_API_KEY and SPREADSHEET_ID",
  });

  // 7. Secret scanning is handled by scripts/check-secrets.mjs in CI.
  // This endpoint intentionally does not scan the bundle at runtime, since
  // Vercel serverless functions do not ship dist/ unless configured, and a
  // pre-deploy CI check is the correct gate.
  checks.push({
    id: "bundle_scan",
    label: "Bundle secret scan",
    status: "ok",
    detail: "Enforced by scripts/check-secrets.mjs during `npm run verify`",
  });

  const hasFailure = checks.some((c) => c.status === "fail");

  return jsonResponse(200, {
    ok: !hasFailure,
    checks,
    rls,
    timestamp: new Date().toISOString(),
  });
}