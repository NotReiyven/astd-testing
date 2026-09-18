import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { parseSpreadsheet, SpreadsheetData } from "./lib/parseSheet";

export const config = {
  runtime: 'edge'
};

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
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?${batchRanges}&includeGridData=true&key=${API_KEY}`);
    const data = (await response.json()) as SpreadsheetData;

    if (!data.sheets) throw new Error("No grid data found in spreadsheet");

    const parsed = parseSpreadsheet(data);
    const lastUpdated = new Date().toISOString();

    return jsonResponse(
      200,
      { ...parsed, lastUpdated },
      { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" }
    );
  } catch (error) {
    console.error("syncSheet error:", error);
    return jsonResponse(500, { error: "Failed to sync sheet data." });
  }
}