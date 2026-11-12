import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public/units");

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// The 17 new units: slug → Wikia URL
const NEW_IMAGES = {
  "kosuke-ballin": "https://static.wikia.nocookie.net/allstartd/images/3/36/Kosuke_%28BALLIN%29_%28Pose%29.png/revision/latest?cb=20261031172120",
  "koniac": "https://static.wikia.nocookie.net/allstartd/images/1/1b/Koniac_%28Pose%29.png/revision/latest?cb=20261031172110",
  "smoke-hunter": "https://static.wikia.nocookie.net/allstartd/images/3/31/Smoke_Hunter_%28Pose%29.png/revision/latest?cb=20261101020852",
  "the-sniffer": "https://static.wikia.nocookie.net/allstartd/images/8/88/The_Sniffer_%28Pose%29.png/revision/latest?cb=20261031172302",
  "crow-ballin": "https://static.wikia.nocookie.net/allstartd/images/5/5c/Crow_%28BALLIN%29_%28Pose%29.png/revision/latest?cb=20261031171743",
  "koniac-b-kui": "https://static.wikia.nocookie.net/allstartd/images/b/b5/Koniac_%28B-Kui%29_%28Pose%29.png/revision/latest?cb=20261031172055",
  "smoke-hunter-serious": "https://static.wikia.nocookie.net/allstartd/images/f/f8/Smoke_Hunter_%28Serious%29_%28Pose%29.png/revision/latest?cb=20261031172213",
  "the-sniffer-outrage": "https://static.wikia.nocookie.net/allstartd/images/2/2a/The_Sniffer_%28OUTRAGE%29_%28Pose%29.png/revision/latest?cb=20261031172255",
  "trello-lady-melonswag": "https://static.wikia.nocookie.net/allstartd/images/8/80/Trello_Lady_%28Pose%29.png/revision/latest?cb=20261016211901",
  "ice-witch-all-seeing": "https://static.wikia.nocookie.net/allstartd/images/e/e9/Ice_Witch_%28All-Seeing%29_%28Pose%29.png/revision/latest?cb=20261016162405",
  "prince-of-layabouts-skull-knight": "https://static.wikia.nocookie.net/allstartd/images/9/9d/Prince_of_Layabouts_%28%F0%9F%92%80%29_%28Pose%29.png/revision/latest?cb=20261022172922",
  "prince-of-layabouts": "https://static.wikia.nocookie.net/allstartd/images/b/b8/Prince_of_Layabouts_%28Pose%29.png/revision/latest?cb=20261018064224",
  "trello-lady": "https://static.wikia.nocookie.net/allstartd/images/6/62/Trello_Lady_%28Melonswag%29_%28Pose%29.png/revision/latest?cb=20261016162517",
  "harrison": "https://static.wikia.nocookie.net/allstartd/images/d/d0/Harrison_%28Pose%29.png/revision/latest?cb=20261016211935",
  "harrison-resurrection": "https://static.wikia.nocookie.net/allstartd/images/6/6c/Harrison_%28Resurrection%29_%28Pose%29.png/revision/latest/scale-to-width-down/1000?cb=20261016162331",
  "the-guardian": "https://static.wikia.nocookie.net/allstartd/images/a/a9/The_Guardian_%28Pose%29.png/revision/latest?cb=20261016211802",
  "the-guardian-team-captain": "https://static.wikia.nocookie.net/allstartd/images/4/41/The_Guardian_%28Team_Captain%29_%28Pose%29.png/revision/latest/scale-to-width-down/1000?cb=20261016162429",
  "ring": "https://static.wikia.nocookie.net/allstartd/images/b/be/Ring_%28Pose%29.png/revision/latest?cb=20260715064823",
  "ice-witch": "https://static.wikia.nocookie.net/allstartd/images/6/6e/Ice_Witch_%28Pose%29.png/revision/latest?cb=20261016211838",
};

// Referers to try in order
const REFERERS = [
  "https://allstartechnology.fandom.com/",
  "https://allstar-towerdefense.fandom.com/",
  "https://www.fandom.com/",
];

async function fetchWithReferer(url, referer) {
  return fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "Referer": referer,
    },
  });
}

async function downloadAndConvert(slug, url) {
  const outPath = path.join(publicDir, `${slug}.webp`);
  const tmpPath = path.join(publicDir, `${slug}.tmp.webp`);

  // Skip if already valid
  if (fs.existsSync(outPath)) {
    const size = fs.statSync(outPath).size;
    if (size > 500) {
      console.log(`  SKIP   ${slug}.webp (already exists, ${size} bytes)`);
      return true;
    }
    fs.unlinkSync(outPath);
  }

  let res = null;
  for (const referer of REFERERS) {
    try {
      res = await fetchWithReferer(url, referer);
      if (res.ok) break;
      console.warn(`  [${res.status}] ${slug} with Referer ${referer}`);
      res = null;
    } catch (e) {
      console.warn(`  [ERR]  ${slug} with Referer ${referer}: ${e.message}`);
    }
  }

  if (!res || !res.ok) {
    console.error(`  FAIL   ${slug} — could not fetch (tried all referers)`);
    return false;
  }

  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.startsWith("image/")) {
    console.error(`  FAIL   ${slug} — bad content-type: ${contentType}`);
    return false;
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await sharp(buffer)
    .resize(150, 150, { fit: "cover", position: "top" })
    .webp({ quality: 80 })
    .toFile(tmpPath);

  const tmpSize = fs.statSync(tmpPath).size;
  if (tmpSize < 500) {
    fs.unlinkSync(tmpPath);
    console.error(`  FAIL   ${slug} — WebP too small (${tmpSize} bytes)`);
    return false;
  }

  fs.renameSync(tmpPath, outPath);
  console.log(`  OK     ${slug}.webp (${tmpSize} bytes)`);
  return true;
}

async function run() {
  console.log(`Downloading ${Object.keys(NEW_IMAGES).length} new unit images to public/units/...\n`);
  
  const results = { ok: [], fail: [] };

  for (const [slug, url] of Object.entries(NEW_IMAGES)) {
    const ok = await downloadAndConvert(slug, url);
    if (ok) results.ok.push(slug);
    else results.fail.push(slug);
  }

  console.log(`\n✅ Success: ${results.ok.length}`);
  if (results.fail.length > 0) {
    console.log(`❌ Failed:  ${results.fail.length}`);
    for (const slug of results.fail) console.log(`   - ${slug}`);
    process.exit(1);
  }
}

run().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
