import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const publicDir = path.join(rootDir, "public");
const unitsFile = path.join(rootDir, "src/data/units.ts");
const templatePath = path.join(distDir, "index.html");

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeJson(str) {
  if (!str) return "";
  return String(str).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function parseUnits(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[SEO Prerender] units.ts not found at ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const units = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^\s*"([^"]+)":\s*(\{[^}]+\}),?\s*$/);
    if (!match) continue;
    const id = match[1];
    const rawObj = match[2];

    const nameMatch = rawObj.match(/name:\s*"([^"]+)"/);
    const subtitleMatch = rawObj.match(/subtitle:\s*"([^"]+)"/);
    const noticeMatch = rawObj.match(/notice:\s*"([^"]+)"/);
    const obtMatch = rawObj.match(/obtainability:\s*"([^"]+)"/);
    const statusMatch = rawObj.match(/status:\s*"([^"]+)"/);

    const formattedName = id
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    units.push({
      id,
      name: nameMatch ? nameMatch[1] : formattedName,
      subtitle: subtitleMatch ? subtitleMatch[1] : "",
      notice: noticeMatch ? noticeMatch[1] : "",
      obtainability: obtMatch ? obtMatch[1] : "UNOB",
      status: statusMatch ? statusMatch[1] : "stable",
    });
  }

  return units;
}

function generateSitemap(units) {
  const today = new Date().toISOString().split("T")[0];
  const staticRoutes = [
    { path: "", priority: "1.0", changefreq: "daily" },
    { path: "value-list", priority: "0.9", changefreq: "daily" },
    { path: "trading-ads", priority: "0.8", changefreq: "hourly" },
    { path: "tutorial", priority: "0.8", changefreq: "weekly" },
    { path: "inventory", priority: "0.7", changefreq: "weekly" },
    { path: "terms-of-service", priority: "0.5", changefreq: "monthly" },
    { path: "privacy-policy", priority: "0.5", changefreq: "monthly" },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const route of staticRoutes) {
    const loc = route.path
      ? `https://all-star-vl.vercel.app/${route.path}`
      : "https://all-star-vl.vercel.app/";
    xml += `  <url>\n`;
    xml += `    <loc>${loc}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
    xml += `    <priority>${route.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  for (const unit of units) {
    xml += `  <url>\n`;
    xml += `    <loc>https://all-star-vl.vercel.app/unit/${unit.id}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>\n`;
  return xml;
}

function prerender() {
  if (!fs.existsSync(templatePath)) {
    console.error(`[SEO Prerender] dist/index.html not found. Run "vite build" first.`);
    process.exit(1);
  }

  const units = parseUnits(unitsFile);
  console.log(`[SEO Prerender] Found ${units.length} units to index.`);

  // Clean up static dist/unit directory so Vercel does not serve stale static files
  // instead of the dynamic /api/unitMeta handler (which serves live spreadsheet values)
  const distUnitDir = path.join(distDir, "unit");
  if (fs.existsSync(distUnitDir)) {
    try {
      fs.rmSync(distUnitDir, { recursive: true, force: true });
      console.log(`[SEO Prerender] Cleaned up static dist/unit directory to enable live dynamic metadata.`);
    } catch (e) {
      console.warn(`[SEO Prerender] Could not clean dist/unit directory:`, e);
    }
  }

  // Generate updated sitemaps (both in public and dist)
  const sitemapXml = generateSitemap(units);
  fs.writeFileSync(path.join(publicDir, "sitemap.xml"), sitemapXml, "utf-8");
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, "sitemap.xml"), sitemapXml, "utf-8");
  }
  console.log(`[SEO Prerender] Generated comprehensive sitemap.xml with ${units.length + 7} URLs.`);

  // Generate robots.txt
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: https://all-star-vl.vercel.app/sitemap.xml
`;
  fs.writeFileSync(path.join(publicDir, "robots.txt"), robotsTxt, "utf-8");
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, "robots.txt"), robotsTxt, "utf-8");
  }
  console.log(`[SEO Prerender] robots.txt successfully generated.`);
}

prerender();
