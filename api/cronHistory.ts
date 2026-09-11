import { createClient } from "@supabase/supabase-js";
import { parseSpreadsheet, SpreadsheetData } from "./lib/parseSheet";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
  const SHEET_ID = process.env.SPREADSHEET_ID;
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!API_KEY || !SHEET_ID || !SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).send("Internal Server Error");
  }

  try {
    const ranges = ["S Tier!A:H", "A Tier!A:H", "B Tier!A:H", "C Tier!A:H", "Pure Tier!A:H", "Oddities!A:H", "Untiered!A:H"];
    const batchRanges = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join("&");
    
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?${batchRanges}&includeGridData=true&key=${API_KEY}`);
    const data = (await response.json()) as SpreadsheetData;
    const { units } = parseSpreadsheet(data);
    
    if (!units || units.length === 0) return res.status(200).send("No units parsed");

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: currentRows } = await supabase.from('unit_current_state').select('*');
    
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
        unit_id: u.id, value: dbValue, value_type: dbValueType,
        value_display: u.valueDisplay || null, value_min: dbValueMin,
        rarity: u.rarity, liquidity: u.liquidity || 'Average',
        status: u.status, notice: u.notice || null, tier: u.tier
      };

      const oldState = currentMap.get(u.id);
      let hasChanged = !oldState || 
        Number(oldState.value) !== Number(dbValue) || oldState.value_type !== dbValueType ||
        oldState.value_display !== newState.value_display || Number(oldState.value_min) !== Number(dbValueMin) ||
        Number(oldState.rarity) !== Number(u.rarity) || oldState.liquidity !== u.liquidity ||
        oldState.status !== u.status || oldState.notice !== newState.notice || oldState.tier !== u.tier;

      if (hasChanged) {
        snapshotsToInsert.push({ ...newState, recorded_at: timestamp });
        statesToUpsert.push(newState);
      }
    });

    if (snapshotsToInsert.length > 0) {
      await supabase.from('unit_value_snapshots').insert(snapshotsToInsert);
      await supabase.from('unit_current_state').upsert(statesToUpsert, { onConflict: 'unit_id' });
    }

    return res.status(200).send("OK");
  } catch (error) {
    return res.status(500).send("Error");
  }
}