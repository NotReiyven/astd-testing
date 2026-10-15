import { toUnitSlug } from "../../src/data/unitSlug.js";

export interface ColorObj { red?: number; green?: number; blue?: number; }
export interface CellData { 
  formattedValue?: string; 
  effectiveFormat?: { 
    backgroundColor?: ColorObj; 
    backgroundColorStyle?: { rgbColor?: ColorObj };
  }; 
}
export interface RowData { values?: CellData[]; }
export interface SheetProperties { title?: string; }
export interface Sheet { properties?: SheetProperties; data?: { rowData?: RowData[] }[]; }
export interface SpreadsheetData { properties?: SheetProperties; sheets?: Sheet[]; }

export interface ParsedNotice {
  title: string;
  date: string | null;
  content: string;
}

export interface ParsedTutorialTag {
  tag: string;
  slug: string;
  def: string;
  color?: string;
  bg?: string;
  border?: string;
}

export interface ParsedUnit {
  id: string;
  name: string;
  subtitle: string;
  value: number | "owner" | "range";
  valueMin?: number;
  valueDisplay?: string;
  rarity: number;
  liquidity: string;
  notice: string;
  status: string;
  secondaryTags: string[];
  tier: string;
  subCategory: string;
  subCategoryRange: string;
}

const COLOR_TARGETS = [
  // Manipulated (black / near-black)
  { tag: "manipulated", r: 0, g: 0, b: 0 },
  { tag: "manipulated", r: 31, g: 31, b: 31 },
  { tag: "manipulated", r: 20, g: 20, b: 20 },
  // Black marketed (gray 0.6 = 153, and 67)
  { tag: "black-marketed", r: 153, g: 153, b: 153 },
  { tag: "black-marketed", r: 67, g: 67, b: 67 },
  { tag: "black-marketed", r: 80, g: 80, b: 80 },
  // Official Tutorial Sheet Palette
  { tag: "dropping", r: 255, g: 0, b: 0 },
  { tag: "rising", r: 52, g: 168, b: 83 },
  { tag: "rising", r: 0, g: 255, b: 0 },
  { tag: "rising", r: 56, g: 118, b: 29 },
  { tag: "deflated", r: 66, g: 133, b: 244 },
  { tag: "deflated", r: 74, g: 134, b: 232 },
  { tag: "lowballed", r: 255, g: 109, b: 1 },
  { tag: "lowballed", r: 255, g: 153, b: 0 },
  { tag: "lowballed", r: 230, g: 145, b: 56 },
  { tag: "highballed", r: 0, g: 255, b: 255 },
  { tag: "hyped", r: 11, g: 83, b: 148 },
  { tag: "hyped", r: 7, g: 55, b: 99 },
  { tag: "varies", r: 103, g: 78, b: 167 },
  { tag: "varies", r: 142, g: 124, b: 195 },
  { tag: "varies", r: 180, g: 167, b: 214 },
  { tag: "gatekept", r: 194, g: 123, b: 160 },
  { tag: "gatekept", r: 166, g: 77, b: 121 },
  { tag: "gatekept", r: 213, g: 166, b: 189 },
  { tag: "gatekept", r: 255, g: 0, b: 255 },
  { tag: "inflated", r: 120, g: 63, b: 4 },
  { tag: "inflated", r: 180, g: 95, b: 6 },
  { tag: "unstable", r: 118, g: 165, b: 175 },
  { tag: "stable", r: 255, g: 229, b: 153 },
  { tag: "stable", r: 252, g: 229, b: 205 },
  { tag: "stable", r: 255, g: 242, b: 204 },
  { tag: "stable", r: 207, g: 226, b: 243 },
  { tag: "stable", r: 234, g: 209, b: 220 },
  { tag: "stable", r: 255, g: 255, b: 255 }
];

export function getTagFromColor(
  colorObj?: ColorObj,
  targets: { tag: string; r: number; g: number; b: number }[] = COLOR_TARGETS
) {
  if (!colorObj) return "stable";

  // Google Sheets API omits 0-value keys: {} or all undefined means pure black rgb(0,0,0) = manipulated
  if (
    Object.keys(colorObj).length === 0 ||
    (colorObj.red === undefined && colorObj.green === undefined && colorObj.blue === undefined)
  ) {
    return "manipulated";
  }

  const r = Math.round((colorObj.red || 0) * 255);
  const g = Math.round((colorObj.green || 0) * 255);
  const b = Math.round((colorObj.blue || 0) * 255);

  // Pure black or near-black is manipulated
  if (r < 40 && g < 40 && b < 40) return "manipulated";

  // Mid gray (0.6, 0.6, 0.6 = 153) is black-marketed
  if (Math.abs(r - 153) < 35 && Math.abs(g - 153) < 35 && Math.abs(b - 153) < 35) return "black-marketed";
  if (Math.abs(r - 67) < 30 && Math.abs(g - 67) < 30 && Math.abs(b - 67) < 30) return "black-marketed";

  let bestTag = "stable", minDistance = Infinity;

  for (const target of targets) {
    const distance = Math.sqrt(Math.pow(r - target.r, 2) + Math.pow(g - target.g, 2) + Math.pow(b - target.b, 2));
    if (distance < minDistance) { minDistance = distance; bestTag = target.tag; }
  }

  return minDistance < 80 ? bestTag : "stable";
}

export function cleanText(input: string | undefined): string {
  if (!input) return "";
  return input.replace(/<[^>]*>?/gm, '').trim();
}

export function parseSpreadsheet(data: SpreadsheetData) {
  const parsedUnits: ParsedUnit[] = [];
  const changelog: string[] = [];
  const notices: ParsedNotice[] = [];
  const idTracker = new Map<string, number>(); 
  const sheetTitle = data.properties?.title || "ASTD Official Value List";

  if (!data.sheets) return { units: parsedUnits, changelog, notices, sheetTitle, tags: [] };

  // 1. Dynamic Tag Extraction from official Tutorial sheet
  const dynamicTagTargets: { tag: string; r: number; g: number; b: number }[] = [];
  const parsedTutorialTags: ParsedTutorialTag[] = [];

  const tutorialSheet = data.sheets.find(
    (s) => s.properties?.title?.trim().toLowerCase() === "tutorial"
  );
  if (tutorialSheet) {
    const rows = tutorialSheet.data?.[0]?.rowData || [];
    let inTags = false;
    for (const r of rows) {
      const text = cleanText(r.values?.[1]?.formattedValue);
      const def = cleanText(r.values?.[2]?.formattedValue);
      if (text === "Units Tags:") {
        inTags = true;
        continue;
      }
      if (inTags && text.startsWith("What is")) {
        inTags = false;
        break;
      }
      if (inTags && text) {
        let slug = text.toLowerCase().trim().replace(/\s+/g, "-");
        if (slug === "black-market") slug = "black-marketed";
        const bg = r.values?.[1]?.effectiveFormat?.backgroundColor || {};
        const rVal = Math.round((bg.red || 0) * 255);
        const gVal = Math.round((bg.green || 0) * 255);
        const bVal = Math.round((bg.blue || 0) * 255);
        dynamicTagTargets.push({ tag: slug, r: rVal, g: gVal, b: bVal });
        parsedTutorialTags.push({
          tag: text,
          slug,
          def,
          color: `rgb(${rVal}, ${gVal}, ${bVal})`,
          bg: "rgba(30, 33, 36, 0.95)",
          border: `rgba(${rVal}, ${gVal}, ${bVal}, 0.35)`,
        });
      }
    }
  }

  // Prepend pure black and dark targets for manipulated so 0,0,0 always maps to manipulated
  dynamicTagTargets.unshift(
    { tag: "manipulated", r: 0, g: 0, b: 0 },
    { tag: "manipulated", r: 31, g: 31, b: 31 }
  );

  const activeTargets = [...dynamicTagTargets, ...COLOR_TARGETS];

  for (const sheet of data.sheets) {
    const tabName = sheet.properties?.title || "Unknown";
    if (tabName.trim().toLowerCase() === "tutorial") continue;
    const rowData = sheet.data?.[0]?.rowData;
    if (!rowData) continue;

    if (tabName === "Home") {
      let changelogColIdx = -1;
      rowData.forEach((row: RowData) => {
        if (!row.values) return;
        if (changelogColIdx === -1) {
          for (let j = 0; j < row.values.length; j++) {
            if ((row.values[j]?.formattedValue || "").includes("Latest Update Log")) {
              changelogColIdx = j; break;
            }
          }
        }
        if (changelogColIdx !== -1) {
          const text = cleanText(row.values[changelogColIdx]?.formattedValue?.trim());
          if (text && !text.includes("Latest Update Log")) changelog.push(text);
        }
      });
      continue;
    }

    if (tabName === "Extra Notices") {
      rowData.forEach((row: RowData, idx: number) => {
        if (idx < 3) return; 
        const titleRaw = cleanText(row.values?.[0]?.formattedValue?.trim());
        const content = cleanText(row.values?.[1]?.formattedValue?.trim());
        if (titleRaw && content) {
          const match = titleRaw.match(/(.+?)(?:\s+(\d{1,2}\/\d{1,2}\/\d{2,4}))?$/);
          notices.push({
            title: match?.[1] || titleRaw,
            date: match?.[2] || null,
            content
          });
        }
      });
      continue;
    }

    let tierKey = "S";
    if (tabName.includes("A Tier")) tierKey = "A";
    else if (tabName.includes("B Tier")) tierKey = "B";
    else if (tabName.includes("C Tier")) tierKey = "C";
    else if (tabName.includes("Pure")) tierKey = "Pure";
    else if (tabName.includes("Oddities")) tierKey = "Oddities";
    else if (tabName.includes("Untiered")) tierKey = "Untiered";

    let currentSubCategory = tabName, currentSubCategoryRange = "All";
    let colMap: { value: number; rarity: number; liquidity: number; notices: number; statusTxt: number } = { value: 2, rarity: 3, liquidity: -1, notices: 6, statusTxt: 7 };

    for (let i = 0; i < rowData.length; i++) {
      const row = rowData[i].values;
      if (!row) continue;

      const getCellStr = (idx: number) => row[idx]?.formattedValue?.toString().trim() || "";
      const colB = cleanText(getCellStr(1));
      
      if (!colB || colB.length < 2) continue;

      const rawRowStrs = row.map((c: CellData | undefined) => cleanText(c?.formattedValue?.toString().toLowerCase().trim()));

      const hasValue = rawRowStrs.some((s: string) => s.startsWith("value"));
      const hasNotices = rawRowStrs.some((s: string) => s === "notices" || s === "notice");

      if (hasValue || hasNotices) {
        currentSubCategory = colB;

        if (tierKey === "Oddities") {
          colMap = { value: 2, rarity: 3, liquidity: 4, notices: 5, statusTxt: -1 };
          continue;
        }

        const prevMap = { ...colMap };
        colMap = { value: -1, rarity: -1, liquidity: -1, notices: -1, statusTxt: -1 };

        for (let j = 2; j < row.length; j++) {
          const headerText = rawRowStrs[j];
          if (headerText.startsWith("value")) {
            colMap.value = j;
            currentSubCategoryRange = headerText.replace(/value/i, "").replace(/\s+/g, " ").trim() || "Misc";
          }
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

      if (!colB.includes("/") && colMap.value !== -1 && !getCellStr(colMap.value)) continue;

      let name = colB, subtitle = "";
      if (colB.includes("/")) {
        const split = colB.split("/");
        name = split[0].trim(); subtitle = split[1] ? split[1].trim() : "";
      } else if (colB.includes(" - ")) {
        const split = colB.split(" - ");
        name = split[0].trim(); subtitle = split[1] ? split[1].trim() : "";
      }

      if (tierKey === "Pure" && !name.toLowerCase().includes("(pure)")) {
        name = `${name} (Pure)`;
      }

      let baseId = toUnitSlug(name);
      if (baseId === "ice-dragon" && subtitle.toLowerCase().includes("eis shenron")) {
        baseId = "eis";
      }

      let unitId = baseId;
      if (idTracker.has(baseId)) {
        const count = idTracker.get(baseId)! + 1;
        idTracker.set(baseId, count);
        unitId = `${baseId}-${count}`;
      } else {
        idTracker.set(baseId, 1);
      }

      const rawValue = colMap.value !== -1 ? cleanText(getCellStr(colMap.value).toLowerCase()) : "";
      let numericValue: number | "owner" | "range" = 0;
      let valueMin: number | undefined = undefined;
      let valueDisplay: string | undefined = undefined;

      if (rawValue.includes("owner") || rawValue.includes("o/c")) {
        numericValue = "owner";
        valueDisplay = "Owner's Choice";
      } else if (rawValue.includes("-") || rawValue.includes("k") || rawValue.includes("m") || rawValue.includes("?")) {
        const hasDigits = /\d/.test(rawValue);
        if (!hasDigits || rawValue.split(" ").length > 3) {
          numericValue = 0;
          valueDisplay = "N/A";
        } else {
          const firstPart = rawValue.split("-")[0].replace("?", "0").trim();
          let multiplier = 1;
          if (firstPart.includes("k")) multiplier = 1000;
          if (firstPart.includes("m")) multiplier = 1000000;
          const baseNum = (parseFloat(firstPart.replace(/[^0-9.]/g, "")) || 0) * multiplier;

          numericValue = baseNum;
          valueMin = baseNum;
          valueDisplay = cleanText(getCellStr(colMap.value));
        }
      } else {
        numericValue = parseInt(rawValue.replace(/[^0-9]/g, "")) || 0;
      }

      const nameFormat = row[1]?.effectiveFormat;
      const nameColor = nameFormat?.backgroundColorStyle?.rgbColor || nameFormat?.backgroundColor;

      const valFormat = colMap.value !== -1 ? row[colMap.value]?.effectiveFormat : undefined;
      const valColor = valFormat?.backgroundColorStyle?.rgbColor || valFormat?.backgroundColor;

      // In ASTD spreadsheets, the status tag color is applied to the Value cell (or colMap.value).
      let parsedTag = getTagFromColor(valColor, activeTargets);
      if (parsedTag === "stable" && !valColor) {
        parsedTag = getTagFromColor(nameColor, activeTargets);
      }

      const rawStatusText = colMap.statusTxt !== -1 ? cleanText(getCellStr(colMap.statusTxt).toLowerCase().trim().replace(" ", "-")) : "";
      const validStatuses = [
        "stable", "unstable", "rising", "dropping", "inflated", "deflated",
        "varies", "lowballed", "highballed", "hyped", "gatekept", "black-marketed", "manipulated"
      ];

      let unitStatus = validStatuses.includes(rawStatusText) ? rawStatusText : parsedTag;

      const secondaryTagsSet = new Set<string>();
      const validSecondaryTags = ["hyped", "gatekept", "black-marketed", "black marketed", "manipulated"];

      const rsdStrings = [
        colMap.rarity !== -1 ? getCellStr(colMap.rarity) : "",
        colMap.liquidity !== -1 ? getCellStr(colMap.liquidity) : "",
        colMap.value !== -1 ? getCellStr(colMap.value) : ""
      ];

      rsdStrings.forEach(str => {
        const matches = str.match(/\(([^)]+)\)/g);
        if (matches) {
          matches.forEach(m => {
            let cleanMatch = m.replace(/[()]/g, "").toLowerCase().trim();
            if (cleanMatch === "black marketed") cleanMatch = "black-marketed";
            if (validSecondaryTags.includes(cleanMatch)) {
              secondaryTagsSet.add(cleanMatch);
            }
          });
        }
      });

      const rawNotice = colMap.notices !== -1 ? cleanText(getCellStr(colMap.notices)) : "";
      const noticeLower = rawNotice.toLowerCase();
      if (noticeLower.includes("manipulated")) {
        if (unitStatus === "stable") unitStatus = "manipulated";
        secondaryTagsSet.add("manipulated");
      }
      if (noticeLower.includes("black marketed") || noticeLower.includes("black-marketed")) {
        if (unitStatus === "stable") unitStatus = "black-marketed";
        secondaryTagsSet.add("black-marketed");
      }

      parsedUnits.push({
        id: unitId,
        name, subtitle, value: numericValue, valueMin, valueDisplay,
        rarity: colMap.rarity !== -1 ? parseFloat(getCellStr(colMap.rarity)) || 0 : 0,
        liquidity: colMap.liquidity !== -1 ? cleanText(getCellStr(colMap.liquidity)) : "Average",
        notice: rawNotice,
        status: unitStatus, 
        secondaryTags: Array.from(secondaryTagsSet),
        tier: tierKey, subCategory: currentSubCategory, subCategoryRange: currentSubCategoryRange
      });
    }
  }

  return { units: parsedUnits, changelog, notices, sheetTitle, tags: parsedTutorialTags };
}