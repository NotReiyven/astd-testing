import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "../public/units");
const imagesFile = path.join(__dirname, "./images.ts");
const unitSlugFile = path.join(__dirname, "../src/data/unitSlug.ts");
const unitsFile = path.join(__dirname, "../src/data/units.ts");

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

function parseSlugMap() {
  const map = new Map();
  if (!fs.existsSync(unitSlugFile)) return map;
  const content = fs.readFileSync(unitSlugFile, "utf-8");
  const mapBlockMatch = content.match(
    /UNIT_IMAGE_SLUG_MAP:\s*Record<string,\s*string>\s*=\s*\{([\s\S]*?)\};/
  );
  if (!mapBlockMatch) return map;
  const regex = /"([^"]+)"\s*:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(mapBlockMatch[1])) !== null) {
    map.set(match[1], match[2]);
  }
  return map;
}

function parseUnitMetadataIds() {
  const ids = [];
  if (!fs.existsSync(unitsFile)) return ids;
  const content = fs.readFileSync(unitsFile, "utf-8");
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*"([^"]+)"\s*:\s*\{.+\}\s*,?\s*$/);
    if (m) ids.push(m[1]);
  }
  return ids;
}

function isValidWebp(filePath) {
  if (!fs.existsSync(filePath)) return false;
  try {
    const stats = fs.statSync(filePath);
    return stats.size > 500;
  } catch {
    return false;
  }
}

async function run() {
  if (!fs.existsSync(imagesFile)) {
    console.error(
      `[ERROR] images.ts not found at ${imagesFile}. Please ensure it is placed in the scripts/ folder.`
    );
    process.exit(1);
  }

  const slugMap = parseSlugMap();
  const content = fs.readFileSync(imagesFile, "utf-8");
  const regex = /(?:["']([^"']+)["']|([a-zA-Z0-9_-]+))\s*:\s*["']([^"']+)["']/g;
  let match;

  const entries = [];
  while ((match = regex.exec(content)) !== null) {
    const id = match[1] || match[2];
    const url = match[3];
    if (id && url) entries.push([id, url]);
  }

  // First pass: copy any existing valid canonical/alias .webp files so we don't redownload duplicates
  for (const [unitId, targetSlug] of slugMap.entries()) {
    const unitPath = path.join(publicDir, `${unitId}.webp`);
    const targetPath = path.join(publicDir, `${targetSlug}.webp`);
    if (!isValidWebp(unitPath) && isValidWebp(targetPath)) {
      fs.copyFileSync(targetPath, unitPath);
    } else if (!isValidWebp(targetPath) && isValidWebp(unitPath)) {
      fs.copyFileSync(unitPath, targetPath);
    }
  }

  const failedIds = [];
  const missingIds = [];
  let totalProcessed = 0;
  let skipped = 0;
  let created = 0;

  console.log("Fetching and compressing images to public/units...");

  for (const [id, url] of entries) {
    if (url === "PLACEHOLDER_URL" || !url.startsWith("http")) continue;
    totalProcessed++;

    const outPath = path.join(publicDir, `${id}.webp`);
    const tmpPath = path.join(publicDir, `${id}.tmp.webp`);

    // Check if an alias file was just created in this run
    const mappedSlug = slugMap.get(id);
    if (!isValidWebp(outPath) && mappedSlug) {
      const mappedPath = path.join(publicDir, `${mappedSlug}.webp`);
      if (isValidWebp(mappedPath)) {
        fs.copyFileSync(mappedPath, outPath);
        skipped++;
        continue;
      }
    }

    // Verify existing files aren't corrupted or 0-byte before skipping
    if (fs.existsSync(outPath)) {
      try {
        const stats = fs.statSync(outPath);
        if (stats.size > 500) {
          skipped++;
          continue; // Valid file exists
        }
        console.warn(
          `[WARN] ${id}.webp is suspiciously small or corrupted (${stats.size} bytes). Redownloading...`
        );
        fs.unlinkSync(outPath);
      } catch {
        console.warn(`[WARN] Could not verify ${outPath}. Redownloading...`);
      }
    }

    try {
      const cleanUrl = url
        .replace("/revision/latest/scale-to-width-down/250", "/revision/latest")
        .replace("/revision/latest/scale-to-width-down/268", "/revision/latest")
        .replace("/revision/latest/scale-to-width-down/1000", "/revision/latest")
        .replace(/&amp;/g, "&");

      const res = await fetch(cleanUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          Referer: "https://allstar-towerdefense.fandom.com/",
        },
      });

      if (res.status === 404) {
        console.warn(
          `[WARN] 404 Not Found for ${id}. Missing source image, skipping.`
        );
        missingIds.push(id);
        continue;
      }

      if (!res.ok) throw new Error(`HTTP Status ${res.status}`);

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.startsWith("image/")) {
        throw new Error(`Invalid content-type: ${contentType}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await sharp(buffer)
        .resize(150, 150, { fit: "cover", position: "top" })
        .webp({ quality: 80 })
        .toFile(tmpPath);

      const tmpStats = fs.statSync(tmpPath);
      if (tmpStats.size < 500) {
        fs.unlinkSync(tmpPath);
        throw new Error(
          `Generated WebP is invalid/too small (${tmpStats.size} bytes)`
        );
      }

      fs.renameSync(tmpPath, outPath);
      created++;
      console.log(`[OK] Created ${id}.webp (${tmpStats.size} bytes)`);
    } catch (err) {
      console.error(`[ERROR] Failed to process ${id}:`, err.message);
      failedIds.push(id);
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    }
  }

  // Final pass: ensure both sides of every slugMap entry have matching .webp files
  for (const [unitId, targetSlug] of slugMap.entries()) {
    const unitPath = path.join(publicDir, `${unitId}.webp`);
    const targetPath = path.join(publicDir, `${targetSlug}.webp`);
    if (!isValidWebp(unitPath) && isValidWebp(targetPath)) {
      fs.copyFileSync(targetPath, unitPath);
    } else if (!isValidWebp(targetPath) && isValidWebp(unitPath)) {
      fs.copyFileSync(unitPath, targetPath);
    }
  }

  // Build-time warning check against src/data/units.ts
  const unitMetadataIds = parseUnitMetadataIds();
  const unitsMissingWebp = [];
  for (const uid of unitMetadataIds) {
    const resolved = slugMap.get(uid) || uid;
    const directOk = isValidWebp(path.join(publicDir, `${uid}.webp`));
    const resolvedOk = isValidWebp(path.join(publicDir, `${resolved}.webp`));
    if (!directOk && !resolvedOk) {
      unitsMissingWebp.push(uid);
    }
  }

  console.log(`\n=== Image Processing Summary ===`);
  console.log(`Total requested: ${totalProcessed}`);
  console.log(`Created (new): ${created}`);
  console.log(`Skipped (already valid): ${skipped}`);
  console.log(`Missing 404s (Ignored): ${missingIds.length}`);
  console.log(`Failed: ${failedIds.length}`);

  if (unitsMissingWebp.length > 0) {
    console.warn(
      `\n[WARN] ${unitsMissingWebp.length} unit(s) in src/data/units.ts have no corresponding .webp in public/units/:`
    );
    unitsMissingWebp.forEach((uid) => console.warn(`  - ${uid}`));
  } else {
    console.log(
      `[OK] Every unit in src/data/units.ts (${unitMetadataIds.length} units) has a valid .webp in public/units/.`
    );
  }

  if (failedIds.length > 0) {
    console.error(
      `\n[FATAL] The following unit IDs failed to download or process:`
    );
    failedIds.forEach((id) => console.error(` - ${id}`));
    console.error(
      `\nFailing the build to prevent broken images from deploying to production.`
    );
    process.exit(1);
  }

  console.log("All image assets are valid.");
}

run();
