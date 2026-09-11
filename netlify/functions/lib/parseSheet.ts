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

const COLOR_TARGETS = [
  { tag: "dropping", r: 255, g: 0, b: 0 },
  { tag: "rising", r: 0, g: 255, b: 0 },
  { tag: "rising", r: 56, g: 118, b: 29 },
  { tag: "deflated", r: 74, g: 134, b: 232 },
  { tag: "lowballed", r: 255, g: 153, b: 0 },
  { tag: "lowballed", r: 230, g: 145, b: 56 },
  { tag: "highballed", r: 0, g: 255, b: 255 },
  { tag: "hyped", r: 11, g: 83, b: 148 },
  { tag: "hyped", r: 7, g: 55, b: 99 },
  { tag: "varies", r: 142, g: 124, b: 195 },
  { tag: "varies", r: 217, g: 210, b: 233 },
  { tag: "gatekept", r: 166, g: 77, b: 121 },
  { tag: "gatekept", r: 255, g: 0, b: 255 },
  { tag: "inflated", r: 180, g: 95, b: 6 },
  { tag: "unstable", r: 118, g: 165, b: 175 },
  { tag: "black-marketed", r: 67, g: 67, b: 67 },
  { tag: "stable", r: 252, g: 229, b: 205 },
  { tag: "stable", r: 255, g: 242, b: 204 },
  { tag: "stable", r: 255, g: 229, b: 153 },
  { tag: "stable", r: 207, g: 226, b: 243 },
  { tag: "stable", r: 234, g: 209, b: 220 }, // FIXED: B-Tier Pastel Pink is now mapped to Stable
  { tag: "stable", r: 255, g: 255, b: 255 }
];

export function getTagFromColor(colorObj?: ColorObj) {
  if (!colorObj) return "stable";
  const r = Math.round((colorObj.red || 0) * 255);
  const g = Math.round((colorObj.green || 0) * 255);
  const b = Math.round((colorObj.blue || 0) * 255);

  let bestTag = "stable", minDistance = Infinity;

  for (const target of COLOR_TARGETS) {
    const distance = Math.sqrt(Math.pow(r - target.r, 2) + Math.pow(g - target.g, 2) + Math.pow(b - target.b, 2));
    if (distance < minDistance) { minDistance = distance; bestTag = target.tag; }
  }
  
  return minDistance < 100 ? bestTag : "stable";
}

export function cleanText(input: string | undefined): string {
  if (!input) return "";
  return input.replace(/<[^>]*>?/gm, '').trim();
}

export function parseSpreadsheet(data: SpreadsheetData) {
  const parsedUnits: any[] = [];
  const changelog: string[] = [];
  const notices: any[] = [];
  const sheetTitle = data.properties?.title || "ASTD Official Value List";

  if (!data.sheets) return { units: parsedUnits, changelog, notices, sheetTitle };

  for (const sheet of data.sheets) {
    const tabName = sheet.properties?.title || "Unknown";
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
      if (!colB) continue;

      const rawRowStrs = row.map((c: CellData | undefined) => cleanText(c?.formattedValue?.toString().toLowerCase().trim()));
      
      const hasValue = rawRowStrs.some((s: string) => s.startsWith("value"));
      const hasNotices = rawRowStrs.some((s: string) => s === "notices" || s === "notice");

      if (hasValue || hasNotices) {
        currentSubCategory = colB;
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

      let unitId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

      if (unitId === "ice-dragon" && subtitle.toLowerCase().includes("eis shenron")) {
        unitId = "eis";
      }

      const rawValue = colMap.value !== -1 ? cleanText(getCellStr(colMap.value).toLowerCase()) : "";
      let numericValue: number | "owner" | "range" = 0, valueMin: number | undefined = undefined, valueDisplay: string | undefined = undefined;

      if (rawValue.includes("owner") || rawValue.includes("o/c")) {
        numericValue = "owner"; valueDisplay = "Owner's Choice";
      } else if (rawValue.includes("-") || rawValue.includes("k") || rawValue.includes("m") || rawValue.includes("?")) {
        numericValue = "range";
        valueDisplay = rawValue ? cleanText(getCellStr(colMap.value)) : "0";
        const firstPart = rawValue.split("-")[0].replace("?", "0").trim();
        let multiplier = 1;
        if (firstPart.includes("k")) multiplier = 1000;
        if (firstPart.includes("m")) multiplier = 1000000;
        valueMin = (parseFloat(firstPart.replace(/[^0-9.]/g, "")) || 0) * multiplier;
      } else {
        numericValue = parseInt(rawValue.replace(/[^0-9]/g, "")) || 0;
      }

      const nameFormat = row[1]?.effectiveFormat;
      const nameColor = nameFormat?.backgroundColorStyle?.rgbColor || nameFormat?.backgroundColor;
      
      const valFormat = colMap.value !== -1 ? row[colMap.value]?.effectiveFormat : undefined;
      const valColor = valFormat?.backgroundColorStyle?.rgbColor || valFormat?.backgroundColor;

      let parsedTag = getTagFromColor(nameColor);
      if (parsedTag === "stable") parsedTag = getTagFromColor(valColor);

      const rawStatusText = colMap.statusTxt !== -1 ? cleanText(getCellStr(colMap.statusTxt).toLowerCase().trim().replace(" ", "-")) : "";
      const validStatuses = ["stable", "unstable", "rising", "dropping", "inflated", "deflated", "varies", "lowballed", "highballed", "hyped", "gatekept", "black-marketed"];
      const unitStatus = validStatuses.includes(rawStatusText) ? rawStatusText : parsedTag;

      const secondaryTagsSet = new Set<string>();
      const validSecondaryTags = ["hyped", "gatekept", "black-marketed", "black marketed"];
      
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

  return { units: parsedUnits, changelog, notices, sheetTitle };
}