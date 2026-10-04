// ================================================
// FILE: api/syncSheet.ts
// ================================================

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { parseSpreadsheet, SpreadsheetData } from "./lib/parseSheet.js";

let ratelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(15, "1 m"),
  });
}

async function sendDiscordAlert(message: string) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: `🚨 **ASTD Value List Alert**\n${message}` }),
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
  // ── 1. AUTH ──────────────────────────────────────────────────────────────
  // Secret-gated so arbitrary bots cannot drain Google Sheets API quota.
  // The frontend must attach the same secret via Authorization header.
  const SYNC_SECRET = process.env.SYNC_SECRET;
  if (!SYNC_SECRET) {
    console.error("[syncSheet] SYNC_SECRET env var is not configured");
    return jsonResponse(500, { error: "Server misconfiguration." });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${SYNC_SECRET}`) {
    return jsonResponse(401, { error: "Unauthorized." });
  }

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

  // ── 4. ENV CHECKS ────────────────────────────────────────────────────────
  const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
  const SHEET_ID = process.env.SPREADSHEET_ID;

  if (!API_KEY || !SHEET_ID) {
    return jsonResponse(500, { error: "Server misconfiguration." });
  }

  const ranges = [
    "S Tier!A:I", "A Tier!A:I", "B Tier!A:I", "C Tier!A:I",
    "Pure Tier!A:I", "Oddities!A:I", "Untiered!A:I",
    "Home!A:K", "Extra Notices!A:B",
  ];
  const batchRanges = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&");

  // ── 5. FETCH & RESPOND ───────────────────────────────────────────────────
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?${batchRanges}&includeGridData=true&key=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Google Sheets responded with status ${response.status}`);
    }

    const data = (await response.json()) as SpreadsheetData;

    if (!data.sheets) throw new Error("No grid data found in spreadsheet");

    const parsed = parseSpreadsheet(data);
    const lastUpdated = new Date().toISOString();

    return jsonResponse(
      200,
      { ...parsed, lastUpdated },
      { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" }
    );
  } catch (error: unknown) {
    console.error("[syncSheet] Fetch error");
    const message = error instanceof Error ? error.message : String(error);
    await sendDiscordAlert(`Sheet sync endpoint failed: ${message}`);
    return jsonResponse(500, { error: "Failed to sync sheet data." });
  }
}