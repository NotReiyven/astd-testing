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

  const baseHtml = fs.readFileSync(templatePath, "utf-8");
  const units = parseUnits(unitsFile);
  console.log(`[SEO Prerender] Found ${units.length} units to prerender.`);

  let createdCount = 0;

  for (const unit of units) {
    const unitDir = path.join(distDir, "unit", unit.id);
    if (!fs.existsSync(unitDir)) {
      fs.mkdirSync(unitDir, { recursive: true });
    }

    const unitTitle = `${unit.name} Value, Demand & Tier History | ASTD Value List`;
    const metaTitle = `${unit.name} Value & Trading Stats | ASTD Value List`;
    const subtitlePart = unit.subtitle ? ` (${unit.subtitle})` : "";
    const metaDescription = `Check live trading value, demand, obtainability, and price history for ${unit.name}${subtitlePart} in All Star Tower Defense. Live market data & trade calculator.`;
    const unitUrl = `https://all-star-vl.vercel.app/unit/${unit.id}`;
    const unitImage = `https://cdn.jsdelivr.net/gh/NotReiyven/astd-assets@main/units/${unit.id}.webp`;

    let customHtml = baseHtml;

    // Replace Title
    customHtml = customHtml.replace(
      /<title>.*?<\/title>/,
      `<title>${escapeHtml(unitTitle)}</title>`
    );

    // Replace Meta Title
    customHtml = customHtml.replace(
      /<meta\s+name="title"\s+content=".*?"\s*\/?>/,
      `<meta name="title" content="${escapeHtml(metaTitle)}" />`
    );

    // Replace Meta Description
    customHtml = customHtml.replace(
      /<meta\s+name="description"\s+content=".*?"\s*\/?>/,
      `<meta name="description" content="${escapeHtml(metaDescription)}" />`
    );

    // Replace Canonical Link
    customHtml = customHtml.replace(
      /<link\s+rel="canonical"\s+href=".*?"\s*\/?>/,
      `<link rel="canonical" href="${unitUrl}" />`
    );

    // Replace OpenGraph Meta Tags
    customHtml = customHtml.replace(
      /<meta\s+property="og:title"\s+content=".*?"\s*\/?>/,
      `<meta property="og:title" content="${escapeHtml(unitTitle)}" />`
    );
    customHtml = customHtml.replace(
      /<meta\s+property="og:description"\s+content=".*?"\s*\/?>/,
      `<meta property="og:description" content="${escapeHtml(metaDescription)}" />`
    );
    customHtml = customHtml.replace(
      /<meta\s+property="og:url"\s+content=".*?"\s*\/?>/,
      `<meta property="og:url" content="${unitUrl}" />`
    );
    customHtml = customHtml.replace(
      /<meta\s+property="og:image"\s+content=".*?"\s*\/?>/,
      `<meta property="og:image" content="${unitImage}" />`
    );

    // Replace Twitter Meta Tags
    customHtml = customHtml.replace(
      /<meta\s+property="twitter:title"\s+content=".*?"\s*\/?>/,
      `<meta property="twitter:title" content="${escapeHtml(unitTitle)}" />`
    );
    customHtml = customHtml.replace(
      /<meta\s+property="twitter:description"\s+content=".*?"\s*\/?>/,
      `<meta property="twitter:description" content="${escapeHtml(metaDescription)}" />`
    );
    customHtml = customHtml.replace(
      /<meta\s+property="twitter:url"\s+content=".*?"\s*\/?>/,
      `<meta property="twitter:url" content="${unitUrl}" />`
    );
    customHtml = customHtml.replace(
      /<meta\s+property="twitter:image"\s+content=".*?"\s*\/?>/,
      `<meta property="twitter:image" content="${unitImage}" />`
    );

    // Inject Schema.org ItemPage & Product JSON-LD
    const jsonLd = `
    <!-- Unit Profile Schema.org JSON-LD -->
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "ItemPage",
        "name": "${escapeJson(unit.name)}",
        "url": "${unitUrl}",
        "description": "Live trading value, demand, and tier data for ${escapeJson(unit.name)} in All Star Tower Defense",
        "mainEntity": {
          "@type": "Product",
          "name": "${escapeJson(unit.name)}",
          "category": "Virtual Game Items",
          "image": "${unitImage}",
          "description": "${escapeJson(unit.name)}${unit.subtitle ? ` (${escapeJson(unit.subtitle)})` : ""} market statistics, obtainability (${unit.obtainability}), status (${unit.status}) in ASTD.",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          }
        }
      }
    </script>
`;
    customHtml = customHtml.replace("</head>", `${jsonLd}</head>`);

    // Inject rich noscript content for search spiders
    const noscriptContent = `
    <noscript>
      <article style="padding: 24px; font-family: sans-serif; max-width: 700px; margin: 0 auto; color: #fff; background: #111;">
        <h1>${escapeHtml(unit.name)} - ASTD Value &amp; Demand</h1>
        ${unit.subtitle ? `<p><strong>Alternate / Anime Name:</strong> ${escapeHtml(unit.subtitle)}</p>` : ""}
        <p><strong>Obtainability:</strong> ${escapeHtml(unit.obtainability)}</p>
        <p><strong>Market Status:</strong> ${escapeHtml(unit.status)}</p>
        ${unit.notice ? `<p><strong>Market Notice:</strong> ${escapeHtml(unit.notice)}</p>` : ""}
        <p>View historical price graphs, trade calculator evaluations, and market analytics for ${escapeHtml(unit.name)} on ASTD Value List.</p>
        <p><a href="/" style="color: #3b82f6;">Return to ASTD Value List Home</a></p>
      </article>
    </noscript>`;

    customHtml = customHtml.replace(/<noscript>[\s\S]*?<\/noscript>/, noscriptContent);

    fs.writeFileSync(path.join(unitDir, "index.html"), customHtml, "utf-8");
    createdCount++;
  }

  console.log(`[SEO Prerender] Generated ${createdCount} static unit HTML pages.`);

  // Generate updated sitemaps (both in public and dist)
  const sitemapXml = generateSitemap(units);
  fs.writeFileSync(path.join(publicDir, "sitemap.xml"), sitemapXml, "utf-8");
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, "sitemap.xml"), sitemapXml, "utf-8");
  }
  console.log(`[SEO Prerender] Generated comprehensive sitemap.xml with ${units.length + 7} URLs.`);
}

prerender();
