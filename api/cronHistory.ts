// ================================================
// FILE: api/cronHistory.ts
// ================================================

import { createClient } from "@supabase/supabase-js";
import { parseSpreadsheet, SpreadsheetData } from "./lib/parseSheet";

export const config = {
  runtime: 'edge'
};

async function sendDiscordEmbed(embedData: { title: string; description: string; color: number; fields?: any[] }) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: embedData.title,
          description: embedData.description,
          color: embedData.color,
          fields: embedData.fields || [],
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (err) {
    console.error("Failed to send Discord embed webhook:", err);
  }
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!process.env.CRON_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized - Missing CRON_SECRET configuration" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid token" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
    const SHEET_ID = process.env.SPREADSHEET_ID;
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!API_KEY || !SHEET_ID || !SUPABASE_URL || !SUPABASE_KEY) {
      const msg = "Missing core environment variables for history sync.";
      await sendDiscordEmbed({
        title: "🚨 ASTD Value List Critical Error",
        description: msg,
        color: 15158332 // Red
      });
      return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // --- AUTONOMOUS CLEANUP ROUTINE ---
    const nowIso = new Date().toISOString();
    
    const { error: adPurgeErr } = await supabase
      .from('trading_ads')
      .delete()
      .lt('expires_at', nowIso);
    if (adPurgeErr) console.error("Error purging expired ads:", adPurgeErr);

    const { data: bannedUsers, error: bannedErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'banned');

    if (!bannedErr && bannedUsers && bannedUsers.length > 0) {
      const bannedIds = bannedUsers.map(b => b.id);
      await Promise.all([
        supabase.from('trading_ads').delete().in('user_id', bannedIds),
        supabase.from('ad_comments').delete().in('user_id', bannedIds),
        supabase.from('user_inventory').delete().in('user_id', bannedIds),
        supabase.from('user_wishlist').delete().in('user_id', bannedIds)
      ]);
    }
    // ---------------------------------

    const ranges = [
      "S Tier!A:I", "A Tier!A:I", "B Tier!A:I", "C Tier!A:I", 
      "Pure Tier!A:I", "Oddities!A:I", "Untiered!A:I"
    ];
    const batchRanges = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join("&");

    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?${batchRanges}&includeGridData=true&key=${API_KEY}`);
    const data = (await response.json()) as SpreadsheetData;
    if (!data.sheets) throw new Error("No grid data returned from Google Sheets API");

    const { units } = parseSpreadsheet(data);
    if (!units || units.length === 0) return new Response(JSON.stringify({ message: "No units parsed" }), { status: 200, headers: { "Content-Type": "application/json" } });

    let allRows: any[] = [];
    let from = 0;
    let to = 999;
    while (true) {
      const { data: chunk, error: fetchError } = await supabase
        .from('unit_current_state')
        .select('*')
        .range(from, to);
      if (fetchError) throw fetchError;
      if (chunk && chunk.length > 0) {
        allRows.push(...chunk);
        if (chunk.length < 1000) break;
        from += 1000;
        to += 1000;
      } else {
        break;
      }
    }

    const currentMap = new Map();
    allRows.forEach(row => currentMap.set(row.unit_id, row));

    const timestamp = new Date().toISOString();
    const snapshotsToInsert: any[] = [];
    const statesToUpsert: any[] = [];
    const valueShifts: string[] = [];

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
        liquidity: u.liquidity || 'Average',
        status: u.status,
        notice: u.notice || null,
        tier: u.tier
      };

      const oldState = currentMap.get(u.id);

      let hasChanged = false;
      let valueChanged = false;
      if (!oldState) {
        hasChanged = true;
      } else {
        const oldValSafe = String(oldState.value);
        const newValSafe = String(dbValue);

        if (oldValSafe !== newValSafe) {
          valueChanged = true;
          if (valueShifts.length < 5) {
            valueShifts.push(`**${u.name}**: \`${oldValSafe}\` ➔ \`${newValSafe}\``);
          }
        }

        if (
          oldValSafe !== newValSafe ||
          oldState.value_type !== dbValueType ||
          oldState.value_display !== newState.value_display ||
          Number(oldState.value_min) !== Number(dbValueMin) ||
          Number(oldState.rarity) !== Number(u.rarity) ||
          oldState.liquidity !== u.liquidity ||
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

    // CHUNKED DATABASE WRITES TO PREVENT PAYLOAD CRASHES
    if (snapshotsToInsert.length > 0) {
      const CHUNK_SIZE = 500;
      
      for (let i = 0; i < snapshotsToInsert.length; i += CHUNK_SIZE) {
        const snapChunk = snapshotsToInsert.slice(i, i + CHUNK_SIZE);
        const { error: snapErr } = await supabase.from('unit_value_snapshots').insert(snapChunk);
        if (snapErr) throw snapErr;
      }

      for (let i = 0; i < statesToUpsert.length; i += CHUNK_SIZE) {
        const stateChunk = statesToUpsert.slice(i, i + CHUNK_SIZE);
        const { error: upsertErr } = await supabase.from('unit_current_state').upsert(stateChunk, { onConflict: 'unit_id' });
        if (upsertErr) throw upsertErr;
      }
    }

    // Build fields for the Discord embed
    const embedFields = [
      { name: "Total Tracked Units", value: `${units.length}`, inline: true },
      { name: "Updates Detected", value: `${snapshotsToInsert.length}`, inline: true }
    ];

    if (valueShifts.length > 0) {
      embedFields.push({
        name: "Notable Value Shifts",
        value: valueShifts.join("\n") + (valueShifts.length === 5 ? "\n_(and more...)_" : ""),
        inline: false
      });
    }

    await sendDiscordEmbed({
      title: "✅ ASTD Value List Autonomous Sync",
      description: "Successfully processed live spreadsheet state and purged expired database ads.",
      color: 3066993, // Green
      fields: embedFields
    });

    return new Response(JSON.stringify({ message: "OK" }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error: any) {
    const errorDetails = error.message || String(error);
    console.error("Cron crash error:", errorDetails);
    await sendDiscordEmbed({
      title: "🚨 ASTD Value List Critical Crash",
      description: `\`\`\`${errorDetails}\`\`\``,
      color: 15158332 // Red
    });
    return new Response(JSON.stringify({ error: errorDetails }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}