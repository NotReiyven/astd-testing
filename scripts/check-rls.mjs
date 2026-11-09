import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const envPath = path.join(rootDir, ".env");

function loadEnv() {
  const env = { ...process.env };
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed
        .slice(eqIdx + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (!env[key]) env[key] = val;
    }
  }
  return env;
}

async function checkRLS() {
  const env = loadEnv();
  const dbUrl = env.SUPABASE_DB_URL;

  if (!dbUrl) {
    console.error("[check-rls] ERROR: SUPABASE_DB_URL is not set in .env");
    console.error("[check-rls] Add your Postgres connection string (Transaction Pooler) to .env");
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }, // Required for Supabase pooler
  });

  try {
    await client.connect();
    console.log("[check-rls] Connected to database. Checking RLS status...");

    // Query to find tables in public schema where rowsecurity is disabled
    const query = `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND rowsecurity = false
    `;

    const res = await client.query(query);
    
    if (res.rows.length > 0) {
      console.error("\n[check-rls] ❌ FAILED: The following tables do NOT have Row Level Security enabled:");
      res.rows.forEach((row) => {
        console.error(`  - public.${row.tablename}`);
      });
      console.error("\nFix this by running: ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;");
      process.exit(1);
    }

    console.log("[check-rls] ✅ PASSED: All tables in the public schema have RLS enabled.");
    process.exit(0);
  } catch (err) {
    console.error("[check-rls] ERROR connecting to database:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkRLS();