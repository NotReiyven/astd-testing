import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { apiLogger } from "./lib/logger.js";

export const config = {
  maxDuration: 15,
};

interface UnitStateRow {
  unit_id: string;
  value: number | null;
  value_type: string;
  value_display: string | null;
  value_min: number | null;
  rarity: number;
  liquidity: string;
  status: string;
  notice: string | null;
  tier: string;
}

interface LocalUnitMeta {
  id: string;
  name: string;
  subtitle: string;
  notice: string;
  obtainability: string;
  aliases: string[];
}

interface CacheEntry {
  data: UnitStateRow | null;
  name: string;
  subtitle: string;
  notice: string;
  obtainability: string;
  cachedAt: number;
}

const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedBaseHtml: string | null = null;
let localMetaMap: Map<string, LocalUnitMeta> | null = null;
let aliasMap: Map<string, string> | null = null;
let supabaseClient: ReturnType<typeof createClient> | null = null;

function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeJson(str: string): string {
  if (!str) return "";
  return String(str).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function getSupabase() {
  if (supabaseClient) return supabaseClient;
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  supabaseClient = createClient(url, key);
  return supabaseClient;
}

function getBaseHtml(): string {
  if (cachedBaseHtml) return cachedBaseHtml;
  const candidatePaths = [
    path.join(process.cwd(), "dist", "index.html"),
    path.join(process.cwd(), "public", "index.html"),
    path.join(process.cwd(), "index.html"),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        cachedBaseHtml = fs.readFileSync(p, "utf-8");
        return cachedBaseHtml;
      } catch {
        // Continue to next candidate
      }
    }
  }

  // Safe fallback template if dist/index.html is somehow missing
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ASTD Value List</title>
    <meta name="description" content="All Star Tower Defense live trading values and market analytics." />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
}

function initLocalMetadata() {
  if (localMetaMap && aliasMap) return;
  const metaMap = new Map<string, LocalUnitMeta>();
  const aMap = new Map<string, string>();

  try {
    const filePath = path.join(process.cwd(), "src", "data", "units.ts");
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
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
        const aliasesMatch = rawObj.match(/aliases:\s*\[(.*?)\]/);

        const formattedName = id
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

        const parsedAliases: string[] = [];
        if (aliasesMatch && aliasesMatch[1]) {
          const rawItems = aliasesMatch[1].split(",");
          for (const item of rawItems) {
            const clean = item.replace(/["']/g, "").trim().toLowerCase();
            if (clean) parsedAliases.push(clean);
          }
        }

        const entry: LocalUnitMeta = {
          id,
          name: nameMatch ? nameMatch[1] : formattedName,
          subtitle: subtitleMatch ? subtitleMatch[1] : "",
          notice: noticeMatch ? noticeMatch[1] : "",
          obtainability: obtMatch ? obtMatch[1] : "UNOB",
          aliases: parsedAliases,
        };

        const lowerId = id.toLowerCase();
        metaMap.set(lowerId, entry);
        aMap.set(lowerId, id);
        for (const alias of parsedAliases) {
          aMap.set(alias, id);
        }
      }
    }
  } catch (err) {
    apiLogger.error({
      route: "/api/unitMeta",
      code: "ASTD-META-001",
      message: "Error parsing local units metadata file",
      error: err,
    });
  }

  localMetaMap = metaMap;
  aliasMap = aMap;
}

function formatUnitValue(row: UnitStateRow | null): string {
  if (!row) return "N/A";
  const vt = (row.value_type || "").toLowerCase();
  const vd = (row.value_display || "").trim();

  if (
    vt === "owner" ||
    vd.toLowerCase().includes("owner") ||
    vd.toLowerCase() === "o/c"
  ) {
    return "Owner's Choice";
  }
  if (vd.length > 0) {
    return vd;
  }
  if (typeof row.value === "number" && row.value > 0) {
    return row.value.toLocaleString("en-US");
  }
  if (typeof row.value_min === "number" && row.value_min > 0) {
    return `${row.value_min.toLocaleString("en-US")}+`;
  }
  return "N/A";
}

function formatRarity(row: UnitStateRow | null): string {
  if (!row || row.rarity == null || Number.isNaN(row.rarity)) return "N/A";
  return String(row.rarity);
}

function formatLiquidity(row: UnitStateRow | null): string {
  if (!row || !row.liquidity) return "Average";
  const trimmed = row.liquidity.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function formatStatus(row: UnitStateRow | null): string {
  if (!row || !row.status) return "Stable";
  const clean = row.status.trim().replace(/-/g, " ");
  return clean.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTier(row: UnitStateRow | null): string {
  if (!row || !row.tier) return "Unranked";
  return row.tier.trim();
}

function getTierThemeColor(tier: string): string {
  const clean = (tier || "").toUpperCase();
  if (clean === "S") return "#ef4444";
  if (clean === "A") return "#f97316";
  if (clean === "B") return "#eab308";
  if (clean === "C") return "#22c55e";
  if (clean.includes("PURE")) return "#a855f7";
  if (clean.includes("ODD")) return "#ec4899";
  return "#5865F2";
}

export async function GET(request: Request) {
  try {
    initLocalMetadata();

    const url = new URL(request.url);
    let rawSlug = url.searchParams.get("slug") || "";

    if (!rawSlug) {
      const match = url.pathname.match(/\/unit\/(.+)$/);
      if (match) rawSlug = match[1];
    }

    const cleanSlug = decodeURIComponent(rawSlug)
      .trim()
      .toLowerCase()
      .replace(/\/+$/, "")
      .replace(/_/g, "-");

    const baseHtml = getBaseHtml();

    if (!cleanSlug) {
      return new Response(baseHtml, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
        },
      });
    }

    // Resolve canonical unit ID
    let resolvedId = cleanSlug;
    if (aliasMap && aliasMap.has(cleanSlug)) {
      resolvedId = aliasMap.get(cleanSlug)!;
    }

    // Check memory cache
    const cacheKey = resolvedId.toLowerCase();
    const cached = memoryCache.get(cacheKey);
    let dbUnit: UnitStateRow | null = null;
    let localMeta: LocalUnitMeta | null =
      localMetaMap?.get(cacheKey) || null;

    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      dbUnit = cached.data;
    } else {
      const supabase = getSupabase();
      if (supabase) {
        const { data } = await supabase
          .from("unit_current_state")
          .select("*")
          .eq("unit_id", resolvedId)
          .maybeSingle();

        if (data) {
          dbUnit = data as UnitStateRow;
        } else {
          // Fallback search with alternative slug format
          const altSlug = resolvedId.replace(/-/g, "_");
          const { data: altData } = await supabase
            .from("unit_current_state")
            .select("*")
            .eq("unit_id", altSlug)
            .maybeSingle();
          if (altData) {
            dbUnit = altData as UnitStateRow;
          }
        }
      }

      memoryCache.set(cacheKey, {
        data: dbUnit,
        name: localMeta?.name || "",
        subtitle: localMeta?.subtitle || "",
        notice: localMeta?.notice || "",
        obtainability: localMeta?.obtainability || "UNOB",
        cachedAt: Date.now(),
      });
    }

    // Format display attributes
    const formattedFallbackName = resolvedId
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const unitName = localMeta?.name || formattedFallbackName;
    const unitSubtitle = localMeta?.subtitle || "";
    const formattedValue = formatUnitValue(dbUnit);
    const formattedRarity = formatRarity(dbUnit);
    const formattedLiquidity = formatLiquidity(dbUnit);
    const formattedStatus = formatStatus(dbUnit);
    const formattedTier = formatTier(dbUnit);
    const themeColor = getTierThemeColor(formattedTier);

    const cleanName = unitName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanSub = unitSubtitle.toLowerCase().replace(/[^a-z0-9]/g, "");
    const shouldIncludeSubtitle =
      unitSubtitle &&
      cleanSub.length > 0 &&
      !cleanName.includes(cleanSub) &&
      !cleanSub.includes(cleanName);

    const subtitlePart = shouldIncludeSubtitle ? ` (${unitSubtitle})` : "";
    const valueTitleSuffix =
      formattedValue === "Owner's Choice"
        ? " - Owner's Choice"
        : ` - ${formattedValue} Value`;

    const pageTitle = `${unitName}${subtitlePart}${valueTitleSuffix} | ASTD Value List`;
    const metaTitle = `${unitName}${subtitlePart}${valueTitleSuffix} | ASTD Value List`;

    let metaDescription = `Value: ${formattedValue} | Rarity: ${formattedRarity} | Liquidity: ${formattedLiquidity} | Tier: ${formattedTier} | Status: ${formattedStatus}.`;

    const noticeText = (dbUnit?.notice || localMeta?.notice || "").trim();
    if (noticeText) {
      const maxNoticeLen = 120;
      const cleanNotice =
        noticeText.length > maxNoticeLen
          ? `${noticeText.slice(0, maxNoticeLen)}...`
          : noticeText;
      metaDescription += ` Notice: ${cleanNotice}`;
    }
    metaDescription +=
      " Check live ASTD trading values, demand, and price history in All Star Tower Defense.";

    const cdnBase =
      process.env.VITE_ASSET_CDN_BASE_URL?.replace(/\/+$/, "") ||
      "https://cdn.jsdelivr.net/gh/NotReiyven/astd-assets@main";
    const unitImage = `${cdnBase}/units/${resolvedId}.webp`;
    const unitUrl = `https://all-star-vl.vercel.app/unit/${resolvedId}`;

    let customHtml = baseHtml;

    // Replace Title
    customHtml = customHtml.replace(
      /<title>.*?<\/title>/i,
      `<title>${escapeHtml(pageTitle)}</title>`
    );

    // Replace or add Meta Title
    if (/<meta\s+name="title"/i.test(customHtml)) {
      customHtml = customHtml.replace(
        /<meta\s+name="title"\s+content=".*?"\s*\/?>/i,
        `<meta name="title" content="${escapeHtml(metaTitle)}" />`
      );
    }

    // Replace or add Meta Description
    if (/<meta\s+name="description"/i.test(customHtml)) {
      customHtml = customHtml.replace(
        /<meta\s+name="description"\s+content=".*?"\s*\/?>/i,
        `<meta name="description" content="${escapeHtml(metaDescription)}" />`
      );
    }

    // Replace or add Canonical Link
    if (/<link\s+rel="canonical"/i.test(customHtml)) {
      customHtml = customHtml.replace(
        /<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i,
        `<link rel="canonical" href="${unitUrl}" />`
      );
    }

    // Replace OpenGraph tags
    customHtml = customHtml.replace(
      /<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i,
      `<meta property="og:title" content="${escapeHtml(metaTitle)}" />`
    );
    customHtml = customHtml.replace(
      /<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i,
      `<meta property="og:description" content="${escapeHtml(metaDescription)}" />`
    );
    customHtml = customHtml.replace(
      /<meta\s+property="og:url"\s+content=".*?"\s*\/?>/i,
      `<meta property="og:url" content="${unitUrl}" />`
    );
    customHtml = customHtml.replace(
      /<meta\s+property="og:image"\s+content=".*?"\s*\/?>/i,
      `<meta property="og:image" content="${unitImage}" />`
    );

    // Replace Twitter tags
    customHtml = customHtml.replace(
      /<meta\s+property="twitter:title"\s+content=".*?"\s*\/?>/i,
      `<meta property="twitter:title" content="${escapeHtml(metaTitle)}" />`
    );
    customHtml = customHtml.replace(
      /<meta\s+property="twitter:description"\s+content=".*?"\s*\/?>/i,
      `<meta property="twitter:description" content="${escapeHtml(metaDescription)}" />`
    );
    customHtml = customHtml.replace(
      /<meta\s+property="twitter:url"\s+content=".*?"\s*\/?>/i,
      `<meta property="twitter:url" content="${unitUrl}" />`
    );
    customHtml = customHtml.replace(
      /<meta\s+property="twitter:image"\s+content=".*?"\s*\/?>/i,
      `<meta property="twitter:image" content="${unitImage}" />`
    );

    // Inject Discord / Mobile theme-color tag
    if (/<meta\s+name="theme-color"/i.test(customHtml)) {
      customHtml = customHtml.replace(
        /<meta\s+name="theme-color"\s+content=".*?"\s*\/?>/i,
        `<meta name="theme-color" content="${themeColor}" />`
      );
    } else {
      customHtml = customHtml.replace(
        "</head>",
        `  <meta name="theme-color" content="${themeColor}" />\n</head>`
      );
    }

    // Inject Schema.org ItemPage & Product JSON-LD
    const jsonLd = `
    <!-- Dynamic Unit Profile Schema.org JSON-LD -->
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "ItemPage",
        "name": "${escapeJson(unitName)}",
        "url": "${unitUrl}",
        "description": "${escapeJson(metaDescription)}",
        "mainEntity": {
          "@type": "Product",
          "name": "${escapeJson(unitName)}",
          "category": "Virtual Game Items",
          "image": "${unitImage}",
          "description": "${escapeJson(metaDescription)}",
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

    // Replace noscript semantic content for crawlers
    const noscriptContent = `
    <noscript>
      <article style="padding: 24px; font-family: sans-serif; max-width: 700px; margin: 0 auto; color: #fff; background: #111;">
        <h1>${escapeHtml(unitName)} - ASTD Value &amp; Demand</h1>
        ${unitSubtitle ? `<p><strong>Alternate / Anime Name:</strong> ${escapeHtml(unitSubtitle)}</p>` : ""}
        <p><strong>Value:</strong> ${escapeHtml(formattedValue)}</p>
        <p><strong>Rarity:</strong> ${escapeHtml(formattedRarity)}</p>
        <p><strong>Liquidity:</strong> ${escapeHtml(formattedLiquidity)}</p>
        <p><strong>Tier:</strong> ${escapeHtml(formattedTier)}</p>
        <p><strong>Market Status:</strong> ${escapeHtml(formattedStatus)}</p>
        ${noticeText ? `<p><strong>Market Notice:</strong> ${escapeHtml(noticeText)}</p>` : ""}
        <p>View historical price graphs, trade calculator evaluations, and market analytics for ${escapeHtml(unitName)} on ASTD Value List.</p>
        <p><a href="/" style="color: #3b82f6;">Return to ASTD Value List Home</a></p>
      </article>
    </noscript>`;

    customHtml = customHtml.replace(
      /<noscript>[\s\S]*?<\/noscript>/i,
      noscriptContent
    );

    return new Response(customHtml, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
      },
    });
  } catch (error: unknown) {
    apiLogger.error({
      route: "/api/unitMeta",
      code: "ASTD-META-002",
      message: "Unhandled error in unitMeta SSR handler",
      error,
    });
    const fallbackHtml = getBaseHtml();
    return new Response(fallbackHtml, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=86400",
      },
    });
  }
}
