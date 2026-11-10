// ================================================
// FILE: scripts/check-secrets.mjs
// ================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const distAssetsDir = path.join(distDir, "assets");
const distHtmlPath = path.join(distDir, "index.html");

const FORBIDDEN_NAMES = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SERVICE_ROLE_KEY",
  "SERVICE_ROLE",
  "CRON_SECRET",
  "SYNC_SECRET",
  "ADMIN_SECRET",
  "RESEND_API_KEY",
  "UPSTASH_REDIS_REST_TOKEN",
  "GOOGLE_SHEETS_API_KEY",
  "DISCORD_WEBHOOK_URL",
  "SENTRY_DSN",
  "SUPABASE_DB_URL",
];

const FORBIDDEN_LITERAL_PATTERNS = [
  { name: "Supabase service role JWT", re: /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{10,}/ },
  { name: "Resend API key", re: /re_[A-Za-z0-9_]{20,}/ },
  { name: "Google API key", re: /AIza[0-9A-Za-z_-]{30,}/ },
  { name: "OpenAI-style API key", re: /sk-[A-Za-z0-9]{20,}/ },
  { name: "Discord webhook URL", re: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+/ },
];

function loadBundle() {
  if (!fs.existsSync(distDir)) {
    console.error("[check-secrets] ERROR: dist/ directory not found. Run `npm run build` first.");
    process.exit(1);
  }

  const chunks = [];

  if (fs.existsSync(distHtmlPath)) {
    chunks.push({ file: "dist/index.html", content: fs.readFileSync(distHtmlPath, "utf-8") });
  }

  if (fs.existsSync(distAssetsDir)) {
    for (const file of fs.readdirSync(distAssetsDir)) {
      if (!/\.(js|css|map)$/i.test(file)) continue;
      const fullPath = path.join(distAssetsDir, file);
      chunks.push({ file: `dist/assets/${file}`, content: fs.readFileSync(fullPath, "utf-8") });
    }
  }

  return chunks;
}

function scanEnvNameLiterals(chunks) {
  const findings = [];

  for (const name of FORBIDDEN_NAMES) {
    const pattern = new RegExp(`["'\`]${name}["'\`]|\\b${name}\\b`, "g");
    for (const chunk of chunks) {
      if (pattern.test(chunk.content)) {
        findings.push({ file: chunk.file, reason: `Env name literal leaked into bundle: ${name}` });
      }
      pattern.lastIndex = 0;
    }
  }

  return findings;
}

function scanLiteralSecretPatterns(chunks) {
  const findings = [];

  for (const rule of FORBIDDEN_LITERAL_PATTERNS) {
    for (const chunk of chunks) {
      if (rule.re.test(chunk.content)) {
        findings.push({ file: chunk.file, reason: `Secret pattern matched: ${rule.name}` });
      }
      rule.re.lastIndex = 0;
    }
  }

  return findings;
}

function scanProcessEnvReads(chunks) {
  // A client bundle must never contain `process.env.<PRIVATE_VAR>`.
  // Vite replaces `import.meta.env.X` at build time but leaves literal
  // `process.env` calls intact (which will blow up in the browser anyway).
  // This is a soft signal, not a failure.
  const findings = [];
  const pattern = /process\.env\.([A-Z_][A-Z0-9_]+)/g;

  for (const chunk of chunks) {
    let match;
    while ((match = pattern.exec(chunk.content)) !== null) {
      if (FORBIDDEN_NAMES.includes(match[1])) {
        findings.push({
          file: chunk.file,
          reason: `process.env.${match[1]} referenced in client bundle`,
        });
      }
    }
    pattern.lastIndex = 0;
  }

  return findings;
}

function run() {
  console.log("[check-secrets] Scanning dist/ for leaked secrets...");
  const chunks = loadBundle();
  console.log(`[check-secrets] Scanned ${chunks.length} file(s).`);

  const envFindings = scanEnvNameLiterals(chunks);
  const literalFindings = scanLiteralSecretPatterns(chunks);
  const processEnvFindings = scanProcessEnvReads(chunks);

  const allFindings = [...envFindings, ...literalFindings, ...processEnvFindings];

  if (allFindings.length > 0) {
    console.error("\n[check-secrets] FAILED. Potential secret leakage detected:\n");
    for (const finding of allFindings) {
      console.error(`  - ${finding.file}: ${finding.reason}`);
    }
    console.error(
      "\nFix: use `import.meta.env.VITE_*` for public values only. Never reference server-only env vars from `src/` or `api/lib/parseSheet.ts` in the client."
    );
    process.exit(1);
  }

  console.log("[check-secrets] PASSED. No leaked secrets found in dist/.");
}

run();