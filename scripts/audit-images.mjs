import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const publicUnitsDir = path.join(rootDir, "public/units");
const imagesFile = path.join(__dirname, "images.ts");
const unitsFile = path.join(rootDir, "src/data/units.ts");
const envFile = path.join(rootDir, ".env");

function loadEnv() {
  const env = { ...process.env };
  if (fs.existsSync(envFile)) {
    const lines = fs.readFileSync(envFile, "utf-8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed
        .slice(eqIdx + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (!env[key]) env[key] = val;
    }
  }
  return env;
}

function slugify(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseImagesTs() {
  if (!fs.existsSync(imagesFile)) return new Map();
  const content = fs.readFileSync(imagesFile, "utf-8");
  const map = new Map();
  const regex = /(?:["']([^"']+)["']|([a-zA-Z0-9_-]+))\s*:\s*["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const key = match[1] || match[2];
    const url = match[3];
    if (key && url) {
      map.set(key, url);
    }
  }
  return map;
}

function parseUnitsTs() {
  const content = fs.readFileSync(unitsFile, "utf-8");
  const lines = content.split(/\r?\n/);
  let currentTier = "S";
  const units = new Map();

  for (const line of lines) {
    const commentMatch = line.match(/\/\/\s*(?:──|--)\s*(.+?)\s*(?:──|--)?$/);
    if (commentMatch) {
      const h = commentMatch[1].toLowerCase();
      if (h.includes("s tier")) currentTier = "S";
      else if (h.includes("a tier")) currentTier = "A";
      else if (h.includes("b tier")) currentTier = "B";
      else if (h.includes("c tier")) currentTier = "C";
      else if (h.includes("pure")) currentTier = "Pure";
      else if (
        h.includes("oddities") ||
        h.includes("egg") ||
        h.includes("gamepass") ||
        h.includes("bundle")
      ) {
        currentTier = "Oddities";
      }
      continue;
    }

    const entryMatch = line.match(/^\s*"([^"]+)"\s*:\s*\{(.+)\}\s*,?\s*$/);
    if (!entryMatch) continue;
    const id = entryMatch[1];
    const body = entryMatch[2];
    const nameMatch = body.match(/name:\s*"([^"]+)"/);
    const subMatch = body.match(/subtitle:\s*"([^"]+)"/);
    const aliasesMatch = body.match(/aliases:\s*\[([^\]]*)\]/);
    const aliases = aliasesMatch
      ? Array.from(aliasesMatch[1].matchAll(/"([^"]+)"/g)).map((m) => m[1])
      : [];

    units.set(id, {
      id,
      name:
        nameMatch?.[1] ||
        id.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      subtitle: subMatch?.[1] || "",
      aliases,
      tier: currentTier,
      source: "units.ts",
    });
  }
  return units;
}

async function fetchLiveSheetUnits(env) {
  const apiKey = env.GOOGLE_SHEETS_API_KEY;
  const sheetId = env.SPREADSHEET_ID;
  if (!apiKey || !sheetId) return [];

  const ranges = [
    "S Tier!A:I",
    "A Tier!A:I",
    "B Tier!A:I",
    "C Tier!A:I",
    "Pure Tier!A:I",
    "Oddities!A:I",
    "Untiered!A:I",
  ];
  const batchRanges = ranges
    .map((r) => `ranges=${encodeURIComponent(r)}`)
    .join("&");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?${batchRanges}&includeGridData=true&key=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[WARN] Live sheet fetch returned HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    const parsedUnits = [];
    const idTracker = new Map();

    for (const sheet of data.sheets || []) {
      const tabName = sheet.properties?.title || "Unknown";
      const rowData = sheet.data?.[0]?.rowData;
      if (!rowData) continue;

      let tierKey = "S";
      if (tabName.includes("A Tier")) tierKey = "A";
      else if (tabName.includes("B Tier")) tierKey = "B";
      else if (tabName.includes("C Tier")) tierKey = "C";
      else if (tabName.includes("Pure")) tierKey = "Pure";
      else if (tabName.includes("Oddities")) tierKey = "Oddities";
      else if (tabName.includes("Untiered")) tierKey = "Untiered";

      let colMap = { value: 2, rarity: 3, liquidity: -1, notices: 6, statusTxt: 7 };

      for (let i = 0; i < rowData.length; i++) {
        const row = rowData[i].values;
        if (!row) continue;
        const getCellStr = (idx) =>
          (row[idx]?.formattedValue?.toString().trim() || "").replace(
            /<[^>]*>?/gm,
            ""
          );
        const colB = getCellStr(1);
        if (!colB || colB.length < 2) continue;

        const rawRowStrs = row.map((c) =>
          (c?.formattedValue?.toString().toLowerCase().trim() || "").replace(
            /<[^>]*>?/gm,
            ""
          )
        );
        const hasValue = rawRowStrs.some((s) => s.startsWith("value"));
        const hasNotices = rawRowStrs.some(
          (s) => s === "notices" || s === "notice"
        );

        if (hasValue || hasNotices) {
          if (tierKey === "Oddities") {
            colMap = { value: 2, rarity: 3, liquidity: 4, notices: 5, statusTxt: -1 };
            continue;
          }
          const prevMap = { ...colMap };
          colMap = { value: -1, rarity: -1, liquidity: -1, notices: -1, statusTxt: -1 };
          for (let j = 2; j < row.length; j++) {
            const headerText = rawRowStrs[j];
            if (headerText.startsWith("value")) colMap.value = j;
            else if (headerText.startsWith("rarity")) colMap.rarity = j;
            else if (headerText.startsWith("liquidity")) colMap.liquidity = j;
            else if (headerText.startsWith("notices") || headerText === "notice") {
              colMap.notices = j;
              colMap.statusTxt = j + 1;
            }
          }
          if (colMap.value === -1) colMap.value = prevMap.value;
          if (colMap.rarity === -1) colMap.rarity = prevMap.rarity;
          if (colMap.liquidity === -1) colMap.liquidity = prevMap.liquidity;
          if (colMap.notices === -1) {
            colMap.notices = prevMap.notices;
            colMap.statusTxt = prevMap.statusTxt;
          }
          continue;
        }

        if (
          !colB.includes("/") &&
          colMap.value !== -1 &&
          !getCellStr(colMap.value)
        )
          continue;

        let name = colB;
        let subtitle = "";
        if (colB.includes("/")) {
          const split = colB.split("/");
          name = split[0].trim();
          subtitle = split[1] ? split[1].trim() : "";
        } else if (colB.includes(" - ")) {
          const split = colB.split(" - ");
          name = split[0].trim();
          subtitle = split[1] ? split[1].trim() : "";
        }

        if (tierKey === "Pure" && !name.toLowerCase().includes("(pure)")) {
          name = `${name} (Pure)`;
        }

        let baseId = slugify(name);
        if (
          baseId === "ice-dragon" &&
          subtitle.toLowerCase().includes("eis shenron")
        ) {
          baseId = "eis";
        }

        let unitId = baseId;
        if (idTracker.has(baseId)) {
          const count = idTracker.get(baseId) + 1;
          idTracker.set(baseId, count);
          unitId = `${baseId}-${count}`;
        } else {
          idTracker.set(baseId, 1);
        }

        parsedUnits.push({
          id: unitId,
          name,
          subtitle,
          tier: tierKey,
          source: "sheet",
        });
      }
    }
    return parsedUnits;
  } catch (err) {
    console.warn(`[WARN] Error fetching live sheet: ${err.message}`);
    return [];
  }
}

async function checkSourceUrl(url) {
  if (!url || url === "PLACEHOLDER_URL" || !url.startsWith("http")) {
    return { ok: false, reason: "PLACEHOLDER_OR_INVALID" };
  }
  const cleanUrl = url
    .replace("/revision/latest/scale-to-width-down/250", "/revision/latest")
    .replace("/revision/latest/scale-to-width-down/1000", "/revision/latest")
    .replace(/&amp;/g, "&");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(cleanUrl, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        Referer: "https://allstar-towerdefense.fandom.com/",
      },
    });
    clearTimeout(timeout);
    const ct = res.headers.get("content-type") || "";
    if (!res.ok) {
      return { ok: false, status: res.status, contentType: ct, reason: `HTTP_${res.status}` };
    }
    if (!ct.startsWith("image/")) {
      return { ok: false, status: res.status, contentType: ct, reason: `NON_IMAGE(${ct})` };
    }
    return { ok: true, status: res.status, contentType: ct };
  } catch (err) {
    return { ok: false, reason: `FETCH_ERR(${err.message})` };
  }
}

async function runAudit() {
  const skipRemoteCheck = process.argv.includes("--skip-remote");
  const skipUrlCheck =
    skipRemoteCheck || process.argv.includes("--skip-url-check");
  const env = loadEnv();
  const imagesMap = parseImagesTs();
  const localUnitsMap = parseUnitsTs();
  const sheetUnits = skipRemoteCheck ? [] : await fetchLiveSheetUnits(env);

  // Read exact filenames in public/units (preserving case for Linux/Vercel check)
  const diskFiles = new Map();
  const diskFilesLower = new Map();
  if (fs.existsSync(publicUnitsDir)) {
    for (const file of fs.readdirSync(publicUnitsDir)) {
      if (!file.toLowerCase().endsWith(".webp")) continue;
      const fullPath = path.join(publicUnitsDir, file);
      const stat = fs.statSync(fullPath);
      const baseName = file.slice(0, -5);
      diskFiles.set(baseName, { file, size: stat.size });
      diskFilesLower.set(baseName.toLowerCase(), { file, baseName, size: stat.size });
    }
  }

  // Merge units (Sheet units take tier priority, local units fill metadata/aliases and any local-only units)
  const allUnits = new Map();
  for (const su of sheetUnits) {
    const local = localUnitsMap.get(su.id);
    allUnits.set(su.id, {
      id: su.id,
      name: su.name,
      subtitle: su.subtitle || local?.subtitle || "",
      aliases: local?.aliases || [],
      tier: su.tier,
      inSheet: true,
      inUnitsTs: Boolean(local),
    });
  }
  for (const [id, lu] of localUnitsMap.entries()) {
    if (!allUnits.has(id)) {
      allUnits.set(id, {
        ...lu,
        inSheet: false,
        inUnitsTs: true,
      });
    }
  }

  // Optional remote URL check with concurrency 12
  const urlCheckResults = new Map();
  if (!skipUrlCheck) {
    const entries = Array.from(imagesMap.entries());
    const concurrency = 12;
    for (let i = 0; i < entries.length; i += concurrency) {
      const batch = entries.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async ([key, url]) => {
          const res = await checkSourceUrl(url);
          urlCheckResults.set(key, res);
        })
      );
    }
  }

  const findAlternateMatch = (u) => {
    const candidates = new Set();
    if (u.subtitle) candidates.add(slugify(u.subtitle));
    for (const a of u.aliases || []) {
      candidates.add(slugify(a));
    }
    if (u.id.endsWith("-pure")) {
      const base = u.id.slice(0, -5);
      candidates.add(base);
    }
    for (const cand of candidates) {
      if (!cand || cand === u.id) continue;
      if (imagesMap.has(cand) || diskFiles.has(cand)) {
        return cand;
      }
    }
    return null;
  };

  const tiers = ["S", "A", "B", "C", "Pure", "Oddities", "Untiered"];
  const reportByTier = {};
  for (const t of tiers) {
    reportByTier[t] = {
      total: 0,
      noImagesTsEntry: [],
      placeholderUrl: [],
      source404OrNonImage: [],
      fileMissingOrSmall: [],
      idFilenameMismatch: [],
    };
  }

  for (const u of allUnits.values()) {
    const t = reportByTier[u.tier] ? u.tier : "Untiered";
    const bucket = reportByTier[t];
    bucket.total++;

    const hasExactImagesEntry = imagesMap.has(u.id);
    const rawUrl = imagesMap.get(u.id);
    const exactDisk = diskFiles.get(u.id);
    const lowerDisk = diskFilesLower.get(u.id.toLowerCase());
    const altSlug = findAlternateMatch(u);

    if (!hasExactImagesEntry) {
      bucket.noImagesTsEntry.push({
        id: u.id,
        name: u.name,
        subtitle: u.subtitle,
        altSlug,
      });
    } else if (rawUrl === "PLACEHOLDER_URL") {
      bucket.placeholderUrl.push({ id: u.id, name: u.name });
    } else if (!skipRemoteCheck) {
      const check = urlCheckResults.get(u.id);
      if (check && !check.ok) {
        bucket.source404OrNonImage.push({
          id: u.id,
          name: u.name,
          reason: check.reason,
          url: rawUrl,
        });
      }
    }

    if (!exactDisk) {
      bucket.fileMissingOrSmall.push({
        id: u.id,
        name: u.name,
        reason: lowerDisk
          ? `CASE_MISMATCH(disk: ${lowerDisk.file})`
          : "MISSING",
        altSlug,
      });
    } else if (exactDisk.size === 0 || exactDisk.size < 500) {
      bucket.fileMissingOrSmall.push({
        id: u.id,
        name: u.name,
        reason: `TOO_SMALL(${exactDisk.size}B)`,
      });
    }

    if (
      (!hasExactImagesEntry || !exactDisk) &&
      (altSlug || (lowerDisk && !exactDisk))
    ) {
      bucket.idFilenameMismatch.push({
        id: u.id,
        name: u.name,
        subtitle: u.subtitle,
        matchedKeyOrFile: altSlug || lowerDisk?.baseName,
      });
    }
  }

  // Also check any scripts/images.ts entries not mapped directly that failed URL check
  const unmappedFailedUrls = [];
  if (!skipRemoteCheck) {
    for (const [key, res] of urlCheckResults.entries()) {
      if (!res.ok) {
        unmappedFailedUrls.push({ key, reason: res.reason, url: imagesMap.get(key) });
      }
    }
  }

  console.log("=== ASTD VALUE LIST UNIT IMAGE AUDIT ===");
  console.log(`Total distinct units audited: ${allUnits.size} (Live sheet units: ${sheetUnits.length}, units.ts entries: ${localUnitsMap.size})`);
  console.log(`Total scripts/images.ts entries: ${imagesMap.size}`);
  console.log(`Total public/units/*.webp files: ${diskFiles.size}\n`);

  for (const t of tiers) {
    const b = reportByTier[t];
    if (b.total === 0) continue;
    console.log(`── Tier ${t} (${b.total} units) ──`);
    console.log(`  (a) No exact entry in scripts/images.ts: ${b.noImagesTsEntry.length}`);
    console.log(`  (b) PLACEHOLDER_URL in scripts/images.ts: ${b.placeholderUrl.length}`);
    console.log(`  (c) Source URL 404/non-image (for exact key): ${b.source404OrNonImage.length}`);
    console.log(`  (d) Missing / <500B in public/units/{id}.webp: ${b.fileMissingOrSmall.length}`);
    console.log(`  (e) ID / filename mismatch (has alias/subtitle/base match): ${b.idFilenameMismatch.length}`);
    if (b.fileMissingOrSmall.length > 0) {
      console.log(
        `      Missing/Small IDs: ${b.fileMissingOrSmall
          .map((x) => `${x.id}${x.altSlug ? ` [-> ${x.altSlug}]` : ` [${x.reason}]`}`)
          .join(", ")}`
      );
    }
    console.log("");
  }

  if (!skipRemoteCheck) {
    console.log(`=== All Failing Source URLs in scripts/images.ts (${unmappedFailedUrls.length}) ===`);
    for (const f of unmappedFailedUrls) {
      console.log(`  - ${f.key}: ${f.reason}`);
    }
  }
}

runAudit();
