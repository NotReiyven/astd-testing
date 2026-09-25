import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "../public/units");
const imagesFile = path.join(__dirname, "./images.ts");

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

async function run() {
  if (!fs.existsSync(imagesFile)) {
    console.error(
      `[ERROR] images.ts not found at ${imagesFile}. Please ensure it is placed in the scripts/ folder.`
    );
    process.exit(1);
  }

  const content = fs.readFileSync(imagesFile, "utf-8");
  const regex = /"([^"]+)"\s*:\s*"([^"]+)"/g;
  let match;

  const failedIds = [];
  const missingIds = [];
  let totalProcessed = 0;
  let skipped = 0;

  console.log("Fetching and compressing images to public/units...");

  while ((match = regex.exec(content)) !== null) {
    const id = match[1];
    const url = match[2];

    if (url === "PLACEHOLDER_URL" || !url.startsWith("http")) continue;
    totalProcessed++;

    const outPath = path.join(publicDir, `${id}.webp`);
    const tmpPath = path.join(publicDir, `${id}.tmp.webp`);

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
      } catch (err) {
        console.warn(`[WARN] Could not verify ${outPath}. Redownloading...`);
      }
    }

    try {
      // strips scaling parameters
      const cleanUrl = url
        .replace("/revision/latest/scale-to-width-down/250", "/revision/latest")
        .replace(
          "/revision/latest/scale-to-width-down/1000",
          "/revision/latest"
        )
        .replace(/&amp;/g, "&");

      // bypasses Wikia 403 Forbidden blocks
      const res = await fetch(cleanUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          Referer: "https://allstar-towerdefense.fandom.com/",
        },
      });

      // handles missing gamepasses/bundles without crashing the build
      if (res.status === 404) {
        console.warn(
          `[WARN] 404 Not Found for ${id}. Missing source image, skipping.`
        );
        missingIds.push(id);
        continue;
      }

      if (!res.ok) throw new Error(`HTTP Status ${res.status}`);

      // ensures Wikia doesn't return an HTML error page
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

      // validates the generated webP
      const tmpStats = fs.statSync(tmpPath);
      if (tmpStats.size < 500) {
        fs.unlinkSync(tmpPath);
        throw new Error(
          `Generated WebP is invalid/too small (${tmpStats.size} bytes)`
        );
      }

      // ensuring no partial files
      fs.renameSync(tmpPath, outPath);
      console.log(`[OK] Created ${id}.webp`);
    } catch (err) {
      console.error(`[ERROR] Failed to process ${id}:`, err.message);
      failedIds.push(id);
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    }
  }

  console.log(`\n=== Image Processing Summary ===`);
  console.log(`Total requested: ${totalProcessed}`);
  console.log(`Skipped (already valid): ${skipped}`);
  console.log(`Missing 404s (Ignored): ${missingIds.length}`);
  console.log(`Failed: ${failedIds.length}`);

  // enforces build failures if required images are missing
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
