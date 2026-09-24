// ================================================
// FILE: api/syncSheet.ts
// ================================================

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { parseSpreadsheet, SpreadsheetData } from "./lib/parseSheet";

// Removed runtime: 'edge'. Allowing Node.js to handle the memory 
// allocation for the Google Sheets payload.

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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: `🚨 **ASTD Value List Alert**\n${message}` })
    });
  } catch (err) {
    console.error("Failed to send Discord webhook alert:", err);
  }
}

function jsonResponse(statusCode: number, body: unknown, extraHeaders: Record<string, string> = {}) {
  const allowedOrigin = process.env.URL || "https://all-star-vl.vercel.app";
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      ...extraHeaders
    }
  });
}

export async function OPTIONS() {
  return jsonResponse(204, "");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  
  if (url.searchParams.toString().length > 0) {
    return jsonResponse(400, { error: "Query parameters are not allowed." });
  }

  // Rate Limiting
  if (ratelimit) {
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    const { success } = await ratelimit.limit(`sync_${ip}`);
    if (!success) {
      return jsonResponse(429, { error: "Rate limit exceeded. Please try again in a minute." });
    }
  }

  const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
  const SHEET_ID = process.env.SPREADSHEET_ID;

  const ranges = [
    "S Tier!A:I", "A Tier!A:I", "B Tier!A:I", "C Tier!A:I",
    "Pure Tier!A:I", "Oddities!A:I", "Untiered!A:I",
    "Home!A:K", "Extra Notices!A:B"
  ];
  const batchRanges = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join("&");

  if (!API_KEY || !SHEET_ID) {
    return jsonResponse(500, { error: "Missing Environment Variables" });
  }

  try {
    // Implementing an abort controller to prevent the function from hanging indefinitely
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second strict timeout

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?${batchRanges}&includeGridData=true&key=${API_KEY}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);

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
  } catch (error: any) {
    console.error("syncSheet error:", error);
    
    // Distinguish between timeouts and actual crashes
    const isTimeout = error.name === 'AbortError';
    const message = isTimeout ? "Google Sheets API timed out" : (error.message || error);
    
    await sendDiscordAlert(`Sheet sync endpoint failed: ${message}`);
    return jsonResponse(500, { error: "Failed to sync sheet data." });
  }
}