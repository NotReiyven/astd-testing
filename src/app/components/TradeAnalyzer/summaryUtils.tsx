import { TradeCard, MasterUnit } from "../../../types";
import { UNIT_IMAGES } from "../../../data/images";

export const fmtK = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : `${n}`;

export const getAvatarStyle = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return { background: `linear-gradient(135deg, hsl(${h}, 60%, 50%), hsl(${(h + 40) % 360}, 60%, 30%))` };
};

export const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

// Fallback logic implementation
export const getProxyImage = (id: string, fallbackUrl?: string) => {
  return `/units/${id}.webp`; 
};

// Fallback handler for the React `onError` event
export const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, id: string, _ignore?: string) => {
    const target = e.currentTarget;
    const fallbackStage = target.getAttribute('data-fallback-stage');

    if (!fallbackStage) {
        // Stage 1: Local webp failed, try external Wikia link
        target.setAttribute('data-fallback-stage', '1');
        if (UNIT_IMAGES[id]) {
            // Route through wsrv.nl proxy to bypass Wikia's strict 403 Forbidden hotlink blocks
            target.src = `https://wsrv.nl/?url=${encodeURIComponent(UNIT_IMAGES[id])}`;
            return;
        }
    }

    // Stage 2: External link failed OR didn't exist. Hide image to show gradient initials.
    target.style.opacity = '0';
};

const getItemWeight = (c: TradeCard, master: MasterUnit | undefined) => {
  if (!master) return 1 * c.qty;
  let val = 1;
  if (typeof master.value === "number") val = master.value;
  else if (master.value === "range" && typeof master.valueMin === "number") val = master.valueMin;
  else if (master.value === "owner" || master.valueDisplay === "Owner's Choice") val = 10000;
  return Math.max(1, val) * c.qty;
};

export const avgStat = (items: TradeCard[], key: "rarity" | "supply" | "demand", ALL_UNITS: MasterUnit[]) => {
  if (items.length === 0) return "—";
  let weightedSum = 0;
  let totalWeight = 0;

  items.forEach(c => {
    const master = ALL_UNITS.find(u => u.id === c.id);
    if (master && typeof master[key] === "number") {
      const weight = getItemWeight(c, master);
      weightedSum += (master[key] as number) * weight;
      totalWeight += weight;
    }
  });

  if (totalWeight === 0) return "—";
  return (weightedSum / totalWeight).toFixed(1);
};

// MARKET PREDICTION ALGORITHM
const TAG_WEIGHTS: Record<string, { st: number, lt: number }> = {
  stable: { st: 1.0, lt: 1.0 },
  unstable: { st: 0.7, lt: 0.4 },
  rising: { st: 1.5, lt: 1.25 },
  dropping: { st: 0.5, lt: 0.75 },
  inflated: { st: 1.05, lt: 0.85 },
  deflated: { st: 0.95, lt: 1.15 },
  varies: { st: 0.95, lt: 0.9 },
  maximum: { st: 0.85, lt: 0.8 },
  hyped: { st: 1.15, lt: 0.7 },
  gatekept: { st: 1.1, lt: 1.1 },
  "black-marketed": { st: 0.8, lt: 0.85 }
};

export const getTradeForecast = (giveItems: TradeCard[], getItems: TradeCard[], ALL_UNITS: MasterUnit[]) => {
  if (giveItems.length === 0 || getItems.length === 0) return { calculable: false, st: 0, lt: 0 };
  
  const isOC = (id: string) => {
    const u = ALL_UNITS.find(unit => unit.id === id);
    return u?.value === "owner" || u?.valueDisplay === "Owner's Choice";
  };
  if (giveItems.some(i => isOC(i.id)) || getItems.some(i => isOC(i.id))) return { calculable: false, st: 0, lt: 0 };

  const v_given = giveItems.reduce((acc, c) => acc + c.value * c.qty, 0);
  const v_received = getItems.reduce((acc, c) => acc + c.value * c.qty, 0);
  if (v_given === 0) return { calculable: false, st: 0, lt: 0 };

  const vw = v_received / v_given;

  const getTm = (items: TradeCard[], type: 'st' | 'lt') => {
    let weightedSum = 0;
    let totalWeight = 0;
    items.forEach(c => {
      const master = ALL_UNITS.find(u => u.id === c.id);
      const weight = c.value * c.qty; 
      let status = master?.status || "stable";
      if (!TAG_WEIGHTS[status]) status = "stable";
      
      weightedSum += TAG_WEIGHTS[status][type] * weight;
      totalWeight += weight;
    });
    return totalWeight > 0 ? weightedSum / totalWeight : 1;
  };

  const tm_st_given = getTm(giveItems, 'st');
  const tm_st_received = getTm(getItems, 'st');
  const tm_lt_given = getTm(giveItems, 'lt');
  const tm_lt_received = getTm(getItems, 'lt');

  const vt_st = vw * (tm_st_received / tm_st_given);
  const vt_lt = vw * (tm_lt_received / tm_lt_given);

  const getL = (items: TradeCard[]) => {
    let d = parseFloat(avgStat(items, "demand", ALL_UNITS));
    let s = parseFloat(avgStat(items, "supply", ALL_UNITS));
    if (isNaN(d)) d = 3;
    if (isNaN(s) || s === 0) s = 3;
    return d / s;
  };

  const l_given = getL(giveItems);
  const ld = getL(getItems) / Math.max(l_given, 0.01);

  const getRa = (items: TradeCard[]) => {
    let r = parseFloat(avgStat(items, "rarity", ALL_UNITS));
    if (isNaN(r)) r = 10;
    return Math.max(r, 0.1); 
  };
  
  const ra = getRa(getItems) / getRa(giveItems);

  const score_st = ((0.8 * (vt_st - 1)) + (0.6 * (ld - 1)) + (0.1 * (ra - 1))) * 100;
  const score_lt = ((0.85 * (vt_lt - 1)) + (0.4 * (ld - 1)) + (0.25 * (ra - 1))) * 100;

  return { calculable: true, st: score_st, lt: score_lt };
};

export const getShareText = (giveItems: TradeCard[], getItems: TradeCard[], giveTotal: number, getTotal: number, ALL_UNITS: MasterUnit[]) => {
  const giveParts = giveItems.map((c) => `${c.qty}x ${c.name} (${fmtK(c.value * c.qty)})`).join("\n> ");
  const getParts  = getItems.map((c) => `${c.qty}x ${c.name} (${fmtK(c.value * c.qty)})`).join("\n> ");
  
  const valDiff = getTotal - giveTotal;
  const sign = valDiff > 0 ? "+" : "";
  const diffStr = (giveTotal > 0 && getTotal > 0) ? `${sign}${valDiff.toLocaleString()} (${sign}${((valDiff / giveTotal) * 100).toFixed(1)}%)` : "N/A";

  const rShift = `${avgStat(giveItems, "rarity", ALL_UNITS)} ➔ ${avgStat(getItems, "rarity", ALL_UNITS)}`;
  const sShift = `${avgStat(giveItems, "supply", ALL_UNITS)} ➔ ${avgStat(getItems, "supply", ALL_UNITS)}`;
  const dShift = `${avgStat(giveItems, "demand", ALL_UNITS)} ➔ ${avgStat(getItems, "demand", ALL_UNITS)}`;
  
  const forecast = getTradeForecast(giveItems, getItems, ALL_UNITS);
  const forecastStr = forecast.calculable 
      ? `Short Term: ${forecast.st > 0 ? '+' : ''}${forecast.st.toFixed(1)} | Long Term: ${forecast.lt > 0 ? '+' : ''}${forecast.lt.toFixed(1)}` 
      : "Unavailable (Missing or O/C units)";

  return `**[I GIVE]**\n> ${giveParts || "Nothing"}\n\n**[I GET]**\n> ${getParts || "Nothing"}\n\n**Raw Value Diff:** ${diffStr}\n**Market Forecast:** ${forecastStr}\n**Rarity, Supply, Demand shift:**\n> R: ${rShift} | S: ${sShift} | D: ${dShift}\n\nw/l`;
};