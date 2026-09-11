import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { parseSpreadsheet, SpreadsheetData } from "./lib/parseSheet";
import type { VercelRequest, VercelResponse } from '@vercel/node';

let ratelimit: Ratelimit | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(15, "1 m"),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = process.env.URL || "https://astd-value-list.vercel.app";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });
  if (req.query && Object.keys(req.query).length > 0) return res.status(400).json({ error: "Query parameters not allowed." });

  if (ratelimit) {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || "anonymous";
    const { success } = await ratelimit.limit(`sync_${ip}`);
    if (!success) return res.status(429).json({ error: "Rate limit exceeded." });
  }

  const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
  const SHEET_ID = process.env.SPREADSHEET_ID;
  const ranges = ["S Tier!A:H", "A Tier!A:H", "B Tier!A:H", "C Tier!A:H", "Pure Tier!A:H", "Oddities!A:H", "Untiered!A:H", "Home!A:K", "Extra Notices!A:B"];
  const batchRanges = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join("&");

  try {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?${batchRanges}&includeGridData=true&key=${API_KEY}`);
    const data = (await response.json()) as SpreadsheetData;
    const parsed = parseSpreadsheet(data);
    
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ ...parsed, lastUpdated: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({ error: "Failed to sync sheet data." });
  }
}