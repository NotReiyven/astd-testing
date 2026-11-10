// ================================================
// FILE: src/app/components/TradeAnalyzer/summaryUtils.tsx
// ================================================

import { TradeCard, MasterUnit } from "../../../types";
import { sanitizeUsername } from "../../../data/helpers";

export const fmtK = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : `${n}`;

export const getAvatarStyle = (name?: string | null) => {
  const safeName = sanitizeUsername(name) || "TR";
  let hash = 0;
  for (let i = 0; i < safeName.length; i++)
    hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return {
    background: `linear-gradient(135deg, hsl(${h}, 60%, 50%), hsl(${
      (h + 40) % 360
    }, 60%, 30%))`,
  };
};

export const getInitials = (name?: string | null) => {
  const cleanName = sanitizeUsername(name);
  if (!cleanName) return "TR";

  const words = cleanName.split(/\s+/);
  if (words.length > 1) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  if (cleanName.length > 4) {
    return cleanName.substring(0, 3).toUpperCase();
  }

  return cleanName.substring(0, 2).toUpperCase();
};

let cachedMap: Map<string, MasterUnit> | null = null;
let cachedArrayRef: MasterUnit[] | null = null;

const getUnitMap = (units: MasterUnit[]) => {
  if (cachedArrayRef === units && cachedMap) return cachedMap;
  cachedMap = new Map(units.map((u) => [u.id, u]));
  cachedArrayRef = units;
  return cachedMap;
};

const getItemWeight = (c: TradeCard, master: MasterUnit | undefined) => {
  if (!master) return 1 * c.qty;
  let val = 1;
  if (typeof master.value === "number") val = master.value;
  else if (master.value === "range" && typeof master.valueMin === "number")
    val = master.valueMin;
  else if (master.value === "owner" || master.valueDisplay === "Owner's Choice")
    val = 10000;
  return Math.max(1, val) * c.qty;
};

export const avgStat = (
  items: TradeCard[],
  key: "rarity" | "supply" | "demand",
  ALL_UNITS: MasterUnit[]
) => {
  if (items.length === 0) return "-";
  let weightedSum = 0;
  let totalWeight = 0;
  const unitMap = getUnitMap(ALL_UNITS);

  items.forEach((c) => {
    const master = unitMap.get(c.id);
    if (master && typeof master[key] === "number") {
      const weight = getItemWeight(c, master);
      weightedSum += (master[key] as number) * weight;
      totalWeight += weight;
    }
  });

  if (totalWeight === 0) return "-";
  return (weightedSum / totalWeight).toFixed(1);
};

const TAG_WEIGHTS: Record<string, { st: number; lt: number }> = {
  stable: { st: 1.0, lt: 1.0 },
  unstable: { st: 0.7, lt: 0.4 },
  rising: { st: 1.5, lt: 1.25 },
  dropping: { st: 0.5, lt: 0.75 },
  inflated: { st: 1.05, lt: 0.85 },
  deflated: { st: 0.95, lt: 1.15 },
  varies: { st: 0.95, lt: 0.9 },
  lowballed: { st: 0.85, lt: 0.8 },
  highballed: { st: 1.15, lt: 1.1 },
  hyped: { st: 1.15, lt: 0.7 },
  gatekept: { st: 1.1, lt: 1.1 },
  "black-marketed": { st: 0.8, lt: 0.85 },
  manipulated: { st: 0.6, lt: 0.5 },
};

const LIQUIDITY_MULTIPLIERS: Record<string, number> = {
  low: 0.2,
  average: 1.0,
  high: 5.0,
};

export const getLiquidityScore = (
  items: TradeCard[],
  ALL_UNITS: MasterUnit[]
) => {
  if (items.length === 0) return 1.0;
  let weightedSum = 0;
  let totalWeight = 0;
  const unitMap = getUnitMap(ALL_UNITS);

  items.forEach((c) => {
    const master = unitMap.get(c.id);
    const liq = (master?.liquidity || "Average").toLowerCase();
    const weight = getItemWeight(c, master);
    weightedSum += (LIQUIDITY_MULTIPLIERS[liq] || 1.0) * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? weightedSum / totalWeight : 1.0;
};

export interface TradeForecastBreakdown {
  calculable: boolean;
  st: number;
  lt: number;
  rawValueRatio: number;

  // Inputs surfaced for the "Explain this score" drawer.
  vGiven: number;
  vReceived: number;
  liquidityGive: number;
  liquidityGet: number;
  rarityGive: number;
  rarityGet: number;
  stMomentumGive: number;
  stMomentumGet: number;
  ltMomentumGive: number;
  ltMomentumGet: number;

  stLiquidityMult: number;
  ltLiquidityMult: number;
  stRarityMult: number;
  ltRarityMult: number;
  stMomentum: number;
  ltMomentum: number;
}

export const getTradeForecastBreakdown = (
  giveItems: TradeCard[],
  getItems: TradeCard[],
  ALL_UNITS: MasterUnit[]
): TradeForecastBreakdown => {
  const defaultBreakdown: TradeForecastBreakdown = {
    calculable: false,
    st: 0,
    lt: 0,
    rawValueRatio: 0,
    vGiven: 0,
    vReceived: 0,
    liquidityGive: 1,
    liquidityGet: 1,
    rarityGive: 0,
    rarityGet: 0,
    stMomentumGive: 1,
    stMomentumGet: 1,
    ltMomentumGive: 1,
    ltMomentumGet: 1,
    stLiquidityMult: 1,
    ltLiquidityMult: 1,
    stRarityMult: 1,
    ltRarityMult: 1,
    stMomentum: 0,
    ltMomentum: 0,
  };

  if (giveItems.length === 0 || getItems.length === 0) return defaultBreakdown;

  const unitMap = getUnitMap(ALL_UNITS);
  const isOC = (id: string) => {
    const u = unitMap.get(id);
    return u?.value === "owner" || u?.valueDisplay === "Owner's Choice";
  };

  if (giveItems.some((i) => isOC(i.id)) || getItems.some((i) => isOC(i.id)))
    return defaultBreakdown;

  const vGiven = giveItems.reduce((acc, c) => acc + c.value * c.qty, 0);
  const vReceived = getItems.reduce((acc, c) => acc + c.value * c.qty, 0);
  if (vGiven === 0) return defaultBreakdown;

  const vw = vReceived / vGiven;

  const getTm = (items: TradeCard[], type: "st" | "lt") => {
    let weightedSum = 0;
    let totalWeight = 0;
    items.forEach((c) => {
      const master = unitMap.get(c.id);
      const weight = c.value * c.qty;
      let status = master?.status || "stable";
      if (!TAG_WEIGHTS[status]) status = "stable";

      weightedSum += TAG_WEIGHTS[status][type] * weight;
      totalWeight += weight;
    });
    return totalWeight > 0 ? weightedSum / totalWeight : 1;
  };

  const stMomentumGive = getTm(giveItems, "st");
  const stMomentumGet = getTm(getItems, "st");
  const ltMomentumGive = getTm(giveItems, "lt");
  const ltMomentumGet = getTm(getItems, "lt");

  const stMomentum = stMomentumGet / stMomentumGive;
  const ltMomentum = ltMomentumGet / ltMomentumGive;

  const vtSt = vw * stMomentum;
  const vtLt = vw * ltMomentum;

  const liquidityGive = getLiquidityScore(giveItems, ALL_UNITS);
  const liquidityGet = getLiquidityScore(getItems, ALL_UNITS);
  const ld = liquidityGet / Math.max(liquidityGive, 0.01);

  const getRa = (items: TradeCard[]) => {
    let r = parseFloat(avgStat(items, "rarity", ALL_UNITS));
    if (isNaN(r)) r = 10;
    return Math.max(r, 0.1);
  };

  const rarityGive = getRa(giveItems);
  const rarityGet = getRa(getItems);
  const ra = rarityGet / rarityGive;

  const scoreSt = (0.8 * (vtSt - 1) + 0.6 * (ld - 1) + 0.1 * (ra - 1)) * 100;
  const scoreLt = (0.85 * (vtLt - 1) + 0.4 * (ld - 1) + 0.25 * (ra - 1)) * 100;

  return {
    calculable: true,
    st: scoreSt,
    lt: scoreLt,
    rawValueRatio: vw,
    vGiven,
    vReceived,
    liquidityGive,
    liquidityGet,
    rarityGive,
    rarityGet,
    stMomentumGive,
    stMomentumGet,
    ltMomentumGive,
    ltMomentumGet,
    stLiquidityMult: ld,
    ltLiquidityMult: ld,
    stRarityMult: ra,
    ltRarityMult: ra,
    stMomentum,
    ltMomentum,
  };
};

export const getTradeForecast = (
  giveItems: TradeCard[],
  getItems: TradeCard[],
  ALL_UNITS: MasterUnit[]
) => {
  const breakdown = getTradeForecastBreakdown(giveItems, getItems, ALL_UNITS);
  return { calculable: breakdown.calculable, st: breakdown.st, lt: breakdown.lt };
};

export const getShareText = (
  giveItems: TradeCard[],
  getItems: TradeCard[],
  giveTotal: number,
  getTotal: number,
  ALL_UNITS: MasterUnit[]
) => {
  const giveParts = giveItems
    .map((c) => `${c.qty}x ${c.name} (${fmtK(c.value * c.qty)})`)
    .join("\n> ");
  const getParts = getItems
    .map((c) => `${c.qty}x ${c.name} (${fmtK(c.value * c.qty)})`)
    .join("\n> ");

  const valDiff = getTotal - giveTotal;
  const sign = valDiff > 0 ? "+" : "";
  const diffStr =
    giveTotal > 0 && getTotal > 0
      ? `${sign}${valDiff.toLocaleString()} (${sign}${(
          (valDiff / giveTotal) *
          100
        ).toFixed(1)}%)`
      : "N/A";

  const rShift = `${avgStat(giveItems, "rarity", ALL_UNITS)} ➔ ${avgStat(
    getItems,
    "rarity",
    ALL_UNITS
  )}`;

  const forecast = getTradeForecast(giveItems, getItems, ALL_UNITS);
  const forecastStr = forecast.calculable
    ? `Short Term: ${forecast.st > 0 ? "+" : ""}${forecast.st.toFixed(
        1
      )} | Long Term: ${forecast.lt > 0 ? "+" : ""}${forecast.lt.toFixed(1)}`
    : "Unavailable (Missing or O/C units)";

  return `**[I GIVE]**\n> ${giveParts || "Nothing"}\n\n**[I GET]**\n> ${
    getParts || "Nothing"
  }\n\n**Raw Value Diff:** ${diffStr}\n**Market Forecast:** ${forecastStr}\n**Rarity shift:**\n> R: ${rShift}\n\nw/l`;
};