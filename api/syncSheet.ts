import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { parseSpreadsheet, SpreadsheetData } from "./lib/parseSheet";

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

export default async function handler(req: any, res: any) {
  const allowedOrigin = process.env.URL || "https://all-star-vl.vercel.app";

  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (Object.keys(req.query || {}).length > 0) {
    return res.status(400).json({ error: "Query parameters are not allowed." });
  }

  if (ratelimit) {
    const ip = req.headers["x-forwarded-for"] || "anonymous";
    const { success } = await ratelimit.limit(`sync_${ip}`);
    if (!success) {
      return res.status(429).json({ error: "Rate limit exceeded. Please try again in a minute." });
    }
  }

  const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
  const SHEET_ID = process.env.SPREADSHEET_ID;

  if (!API_KEY || !SHEET_ID) {
    return res.status(500).json({ error: "Missing Environment Variables" });
  }

  const ranges = [
    "S Tier!A:I", "A Tier!A:I", "B Tier!A:I", "C Tier!A:I",
    "Pure Tier!A:I", "Oddities!A:I", "Untiered!A:I",
    "Home!A:K", "Extra Notices!A:B"
  ];
  const batchRanges = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join("&");

  try {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?${batchRanges}&includeGridData=true&key=${API_KEY}`);
    const data = (await response.json()) as SpreadsheetData;

    if (!data.sheets) throw new Error("No grid data found in spreadsheet");

    const parsed = parseSpreadsheet(data);
    const lastUpdated = new Date().toISOString();

    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ ...parsed, lastUpdated });
  } catch (error) {
    console.error("syncSheet error:", error);
    return res.status(500).json({ error: "Failed to sync sheet data." });
  }
}