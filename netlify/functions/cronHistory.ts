import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { parseSpreadsheet, SpreadsheetData } from "./lib/parseSheet";

export default async (req: Request) => {
  const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
  const SHEET_ID = process.env.SPREADSHEET_ID;
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!API_KEY || !SHEET_ID || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing environment variables for history sync.");
    return new Response("Internal Server Error", { status: 500 });
  }

  try {
    const ranges = [
      "S Tier!A:H", "A Tier!A:H", "B Tier!A:H", "C Tier!A:H", 
      "Pure Tier!A:H", "Oddities!A:H", "Untiered!A:H"
    ];
    const batchRanges = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join("&");
    
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?${batchRanges}&includeGridData=true&key=${API_KEY}`);
    const data = (await response.json()) as SpreadsheetData;
    if (!data.sheets) throw new Error("No grid data returned from Google Sheets");

    const { units } = parseSpreadsheet(data);
    if (!units || units.length === 0) return new Response("No units parsed", { status: 200 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: currentRows, error: fetchError } = await supabase
      .from('unit_current_state')
      .select('*');
      
    if (fetchError) throw fetchError;

    const currentMap = new Map();
    currentRows?.forEach(row => currentMap.set(row.unit_id, row));

    const timestamp = new Date().toISOString();
    const snapshotsToInsert: any[] = [];
    const statesToUpsert: any[] = [];

    units.forEach((u: any) => {
      const dbValue = typeof u.value === 'number' ? u.value : null;
      const dbValueType = typeof u.value === 'number' ? 'number' : typeof u.value === 'string' ? u.value : 'unknown';
      const dbValueMin = u.valueMin || null;

      const newState = {
        unit_id: u.id,
        value: dbValue,
        value_type: dbValueType,
        value_display: u.valueDisplay || null,
        value_min: dbValueMin,
        rarity: u.rarity,
        supply: u.supply,
        demand: u.demand,
        status: u.status,
        notice: u.notice || null,
        tier: u.tier
      };

      const oldState = currentMap.get(u.id);

      let hasChanged = false;
      if (!oldState) {
        hasChanged = true;
      } else {
        if (
          Number(oldState.value) !== Number(dbValue) ||
          oldState.value_type !== dbValueType ||
          oldState.value_display !== newState.value_display ||
          Number(oldState.value_min) !== Number(dbValueMin) ||
          Number(oldState.rarity) !== Number(u.rarity) ||
          Number(oldState.supply) !== Number(u.supply) ||
          Number(oldState.demand) !== Number(u.demand) ||
          oldState.status !== u.status ||
          oldState.notice !== newState.notice ||
          oldState.tier !== u.tier
        ) {
          hasChanged = true;
        }
      }

      if (hasChanged) {
        snapshotsToInsert.push({ ...newState, recorded_at: timestamp });
        statesToUpsert.push(newState);
      }
    });

    if (snapshotsToInsert.length > 0) {
      const { error: snapErr } = await supabase.from('unit_value_snapshots').insert(snapshotsToInsert);
      if (snapErr) throw snapErr;

      const { error: upsertErr } = await supabase.from('unit_current_state').upsert(statesToUpsert, { onConflict: 'unit_id' });
      if (upsertErr) throw upsertErr;
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Cron history sync error:", error);
    return new Response("Error", { status: 500 });
  }
};

export const config: Config = {
  schedule: "0 */6 * * *"
};