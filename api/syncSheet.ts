// ================================================
// FILE: api/syncSheet.ts
// ================================================

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { parseSpreadsheet, SpreadsheetData } from "./lib/parseSheet.js";
import { apiLogger } from "./lib/logger.js";

// Top-level tunables & constants
const RATELIMIT_REQUESTS = 15;
const RATELIMIT_WINDOW = "1 m";
const MEMORY_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const HTTP_CACHE_HEADER = "public, s-maxage=1800, stale-while-revalidate=86400";

let ratelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(RATELIMIT_REQUESTS, RATELIMIT_WINDOW),
  });
}

// In-memory cache to eliminate Google Sheets fetch & parsing on warm serverless instances (0ms active CPU)
interface MemoryCacheEntry {
  body: ReturnType<typeof parseSpreadsheet> & { lastUpdated: string };
  expiresAt: number;
}
let memoryCache: MemoryCacheEntry | null = null;

async function sendDiscordAlert(message: string) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: `**ASTD Value List Alert**\n${message}` }),
    });
  } catch {
    // Silently swallow — webhook failure must never surface to the caller
  }
}

function jsonResponse(
  statusCode: number,
  body: unknown,
  extraHeaders: Record<string, string> = {}
) {
  // Only allow our own verified domain. If URL env var is absent the deploy
  // is misconfigured and we refuse to issue permissive CORS headers.
  const allowedOrigin = process.env.URL ?? "";
  const corsHeaders: Record<string, string> = allowedOrigin
    ? {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      }
    : {};

  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}

export async function OPTIONS() {
  return jsonResponse(204, "");
}

export async function GET(request: Request) {
  // 1. AUTH
  // Endpoint is public for frontend fetching. Abuse is prevented by Upstash IP Rate Limiting
  // and Vercel Edge caching (s-maxage=1800). Database writes are strictly handled in api/cronHistory.ts.

  // ── 2. QUERY PARAM GUARD ─────────────────────────────────────────────────
  const url = new URL(request.url);
  if (url.searchParams.toString().length > 0) {
    return jsonResponse(400, { error: "Query parameters are not allowed." });
  }

  // ── 3. RATE LIMITING ─────────────────────────────────────────────────────
  if (ratelimit) {
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    const { success } = await ratelimit.limit(`sync_${ip}`);
    if (!success) {
      return jsonResponse(429, { error: "Rate limit exceeded. Please try again in a minute." });
    }
  }

  // ── 4. IN-MEMORY CACHE (Warm instance fast path: 0ms Active CPU) ──────────
  if (memoryCache && Date.now() < memoryCache.expiresAt) {
    return jsonResponse(
      200,
      memoryCache.body,
      { "Cache-Control": HTTP_CACHE_HEADER }
    );
  }

  // ── 5. ENV CHECKS ────────────────────────────────────────────────────────
  const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
  const SHEET_ID = process.env.SPREADSHEET_ID;

  if (!API_KEY || !SHEET_ID) {
    return jsonResponse(500, { error: "Server misconfiguration." });
  }

  const standardRanges = [
    "S Tier!A:I", "A Tier!A:I", "B Tier!A:I", "C Tier!A:I",
    "Pure Tier!A:I", "Oddities!A:I", "Untiered!A:I",
    "Home!A:K", "Extra Notices!A:B", "Tutorial!A:I",
  ];
  const newUnitsRanges = ["'NEW UNITS'!A:I", "NewUnits!A:I"];

  // ── 6. FETCH WITH SELECTIVE FIELDS & RESPOND ─────────────────────────────
  // Explicitly filter Google Sheets API fields: drops raw JSON payload from ~56 MB to ~7 MB,
  // slashing JSON.parse and traversing CPU duration from ~850ms down to ~16ms and memory to ~60MB.
  const fields = encodeURIComponent(
    "properties.title,sheets(properties.title,data.rowData.values(formattedValue,effectiveFormat.backgroundColor))"
  );

  try {
    let response: Response | null = null;

    // Try fetching with NEW UNITS tab first (exact name in sheet is 'NEW UNITS' with a space)
    for (const newRange of newUnitsRanges) {
      const candidateRanges = [newRange, ...standardRanges];
      const batchRanges = candidateRanges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&");
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?${batchRanges}&includeGridData=true&fields=${fields}&key=${API_KEY}`
      );
      if (res.ok) {
        response = res;
        break;
      }
    }

    // If new units tab failed (e.g. removed when units moved to permanent tiers), fetch standard ranges
    if (!response || !response.ok) {
      const fallbackBatch = standardRanges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&");
      response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?${fallbackBatch}&includeGridData=true&fields=${fields}&key=${API_KEY}`
      );
    }

    if (!response.ok) {
      throw new Error(`Google Sheets responded with status ${response.status}`);
    }

    const data = (await response.json()) as SpreadsheetData;

    if (!data.sheets) throw new Error("No grid data found in spreadsheet");

    const parsed = parseSpreadsheet(data);
    
    // Maintain stable lastUpdated if sheet content has not changed across revalidations
    const firstLog = (parsed.changelog && parsed.changelog[0]) ? parsed.changelog[0] : "";
    const unitCount = (parsed.units && Array.isArray(parsed.units)) ? parsed.units.length : 0;
    const isUnchanged =
      memoryCache?.body &&
      memoryCache.body.units?.length === unitCount &&
      memoryCache.body.changelog?.[0] === firstLog;

    const lastUpdated = isUnchanged && memoryCache?.body?.lastUpdated
      ? memoryCache.body.lastUpdated
      : new Date().toISOString();

    const payload = { ...parsed, lastUpdated };

    // Update in-memory cache for warm container reuse
    memoryCache = {
      body: payload,
      expiresAt: Date.now() + MEMORY_CACHE_TTL_MS,
    };

    // Note: Database persistence for unit_current_state & unit_value_snapshots
    // is isolated to api/cronHistory.ts to prevent unawaited background writes
    // and connection pool exhaustion in user-facing serverless invocations.

    return jsonResponse(
      200,
      payload,
      { "Cache-Control": HTTP_CACHE_HEADER }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    apiLogger.error({
      route: "/api/syncSheet",
      code: "ASTD-API-001",
      message: "Spreadsheet sync execution failed",
      error,
    });
    await sendDiscordAlert(`Sheet sync endpoint failed: ${message}`);
    return jsonResponse(500, { error: "Failed to sync sheet data." });
  }
}