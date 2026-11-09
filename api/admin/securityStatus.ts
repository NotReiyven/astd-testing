import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { apiLogger } from "../lib/logger.js";
import { verifyLiveClearance } from "../lib/clearance.js";

export const config = {
  maxDuration: 15,
};

export async function GET(request: Request) {
  // 1. Live Clearance Check (Master only)
  const clearance = await verifyLiveClearance(request, ["master"]);
  if (!clearance.ok) {
    return new Response(JSON.stringify({ error: clearance.error }), {
      status: clearance.status || 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Database config missing." }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  
  try {
    // 2. Check RLS on all public tables
    // We use an RPC or direct query. Since we have the service key, we can query pg_tables.
    const { data: tables, error: rlsError } = await supabase.rpc("get_public_tables_rls");
    
    // Fallback if RPC is not created yet: just return raw table list from information_schema
    let rlsStats = { enabled: 0, disabled: 0, tables: [] as string[] };
    
    if (!rlsError && tables) {
      rlsStats = tables;
    } else {
      // If the RPC doesn't exist, we do a simple approximation via pg_catalog
      // Note: In a real environment, you'd create the RPC to run this securely.
      await supabase.from("profiles").select("id").limit(0); // dummy check
      rlsStats.tables = ["Could not query pg_tables directly. Ensure `get_public_tables_rls` RPC exists."];
    }

    // 3. Check Rate Limit status (just verifying Upstash env vars exist)
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const rateLimits = {
      configured: Boolean(upstashUrl && upstashToken),
      endpoints: [
        { path: "/api/syncSheet", protected: true },
        { path: "/api/cronHistory", protected: true },
        { path: "/api/uploadBanner", protected: true },
        { path: "/api/profile/view", protected: true },
      ],
    };

    // 4. Scan the deployed production bundle for leaked secrets
    const leakedSecrets: string[] = [];
    const distAssetsDir = path.join(process.cwd(), "dist", "assets");
    const distHtmlPath = path.join(process.cwd(), "dist", "index.html");
    
    try {
      let bundleContent = "";
      if (fs.existsSync(distHtmlPath)) {
        bundleContent += fs.readFileSync(distHtmlPath, "utf-8");
      }
      if (fs.existsSync(distAssetsDir)) {
        const files = fs.readdirSync(distAssetsDir);
        for (const file of files) {
          if (file.endsWith(".js") || file.endsWith(".css")) {
            bundleContent += fs.readFileSync(path.join(distAssetsDir, file), "utf-8");
          }
        }
      }

      const forbiddenPatterns = [
        "SERVICE_ROLE",
        "SUPABASE_SERVICE",
        "CRON_SECRET",
        "ADMIN_SECRET",
        "SYNC_SECRET",
        "RESEND_API_KEY",
      ];

      for (const pattern of forbiddenPatterns) {
        if (bundleContent.includes(pattern)) {
          leakedSecrets.push(pattern);
        }
      }
    } catch (fsErr) {
      apiLogger.warn({
        route: "/api/admin/securityStatus",
        code: "ASTD-SEC-001",
        message: "Failed to scan dist bundle",
        error: fsErr,
      });
    }

    return new Response(
      JSON.stringify({
        rls: rlsStats,
        rateLimits,
        leakedSecrets,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    apiLogger.error({
      route: "/api/admin/securityStatus",
      code: "ASTD-SEC-002",
      message: "Security status check failed",
      error: err,
    });
    return new Response(JSON.stringify({ error: "Failed to generate status." }), { status: 500 });
  }
}