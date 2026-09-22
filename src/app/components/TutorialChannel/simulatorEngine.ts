// ================================================
// FILE: src/app/components/TutorialChannel/simulatorEngine.ts
// ================================================

import { MasterUnit, TradeCard } from "../../../types";
import { getTradeForecast } from "../TradeAnalyzer/summaryUtils";

export type Scenario = {
  id: number;
  title: string;
  desc: string;
  give: { unit: MasterUnit; qty: number };
  get: { unit: MasterUnit; qty: number };
  correct: "WIN" | "LOSS" | "SCAM";
  forecast: { st: number; lt: number };
  explanation: string;
};

export const buildScenariosList = (ALL_UNITS: MasterUnit[]): Scenario[] => {
  const valid = ALL_UNITS.filter(u => 
    typeof u.value === "number" && 
    u.value >= 10000 &&
    !(u.notice || "").toLowerCase().includes("leaderboard") &&
    !(u.subCategory || "").toLowerCase().includes("leaderboard")
  );
  
  if (valid.length < 20) return []; 

  const pickRandom = (arr: MasterUnit[]) => arr[Math.floor(Math.random() * arr.length)];
  
  const getByCondition = (cond: (u: MasterUnit) => boolean) => {
    let res = valid.filter(u => cond(u));
    if (res.length === 0) res = valid;
    return pickRandom(res);
  };

  const findPairedUnit = (g1: MasterUnit, q1: number, g2Cond: (u: MasterUnit) => boolean, ratioMin = 0.7, ratioMax = 1.3): { unit: MasterUnit; q2: number } | null => {
    const v1 = (g1.value as number) * q1;
    const candidates = valid.filter(u => u.id !== g1.id && g2Cond(u)).map(u => {
      const idealQ2 = v1 / (u.value as number);
      const q2 = Math.max(1, Math.min(4, Math.round(idealQ2))); 
      const v2 = (u.value as number) * q2;
      return { unit: u, q2, ratio: v2 / v1 };
    }).filter(x => x.ratio >= ratioMin && x.ratio <= ratioMax);
    
    if (candidates.length > 0) {
       const picked = candidates[Math.floor(Math.random() * candidates.length)];
       return { unit: picked.unit, q2: picked.q2 };
    }
    return null;
  };

  const newScenarios: Scenario[] = [];
  let attempts = 0;
  
  while (newScenarios.length < 10 && attempts < 500) {
    attempts++;
    const type = Math.floor(Math.random() * 5); 

    let g1: MasterUnit | null = null;
    let q1 = Math.floor(Math.random() * 2) + 1; 
    let match: { unit: MasterUnit; q2: number } | null = null;
    let title = ""; let desc = "";

    const getLiq = (u: MasterUnit) => (u.liquidity || "Average").toLowerCase();

    if (type === 0) {
      g1 = getByCondition(u => u.status === 'stable' && getLiq(u) === 'high');
      match = findPairedUnit(g1, q1, u => u.status === 'dropping' || getLiq(u) === 'low', 0.9, 1.4);
      title = "The Falling Knife"; desc = "They are overpaying with a dropping asset. Does the raw value justify the risk?";
    } else if (type === 1) {
      g1 = getByCondition(u => u.status === 'stable');
      match = findPairedUnit(g1, q1, u => u.status === 'inflated' || u.status === 'highballed', 0.9, 1.4);
      title = "The Inflated Bait"; desc = "A trader is using an inflated/highballed unit to overpay. Check the true value metrics.";
    } else if (type === 2) {
      g1 = getByCondition(u => u.status === 'gatekept' || getLiq(u) === 'low');
      match = findPairedUnit(g1, q1, u => u.status === 'rising' || getLiq(u) === 'high', 0.65, 0.95);
      title = "The Liquidity Flip"; desc = "Taking a raw value underpay to get rid of a hard-to-trade unit.";
    } else if (type === 3) {
      g1 = getByCondition(u => u.status === 'unstable' || u.status === 'hyped');
      match = findPairedUnit(g1, q1, u => u.status === 'stable' && u.rarity >= 13, 0.75, 1.1);
      title = "The Long-Term Play"; desc = "Trading down in raw value for extreme scarcity and stability.";
    } else {
      g1 = getByCondition(u => true);
      match = findPairedUnit(g1, q1, u => true, 0.8, 1.2);
      title = "The Standard Exchange"; desc = "Evaluate the raw stats, tags, and liquidity to determine if this trade is a win.";
    }

    if (!g1 || !match) continue;

    const g2 = match.unit;
    const q2 = match.q2;

    const giveCards: TradeCard[] = [{ id: g1.id, name: g1.name, subtitle: g1.subtitle, value: g1.value as number, qty: q1 }];
    const getCards: TradeCard[] = [{ id: g2.id, name: g2.name, subtitle: g2.subtitle, value: g2.value as number, qty: q2 }];
    
    const fc = getTradeForecast(giveCards, getCards, ALL_UNITS);
    if (!fc.calculable) continue;

    const isWin = fc.st >= 0 || fc.lt >= 0;
    
    const v1 = (g1.value as number) * q1;
    const v2 = (g2.value as number) * q2;
    const vw = v2 / v1;

    let correctAns: "WIN" | "LOSS" | "SCAM" = isWin ? "WIN" : "LOSS";
    if (isWin) {
       if (q2 >= 3 && q1 === 1 && vw < 0.85) correctAns = "SCAM";
       if (vw < 0.65) correctAns = "SCAM";
    } else {
       if (vw > 1.3 && q2 >= 4) correctAns = "SCAM";
    }

    newScenarios.push({
      id: newScenarios.length,
      title,
      desc,
      give: { unit: g1, qty: q1 },
      get: { unit: g2, qty: q2 },
      correct: correctAns,
      forecast: fc,
      explanation: `The algorithm evaluates this as a ${isWin ? 'WIN' : 'LOSS'} (ST: ${fc.st > 0 ? '+' : ''}${fc.st.toFixed(1)} | LT: ${fc.lt > 0 ? '+' : ''}${fc.lt.toFixed(1)}). ${correctAns === "SCAM" ? "However, no sane trader would accept this. It's a massive downgrade or completely unrealistic structure." : ""}`
    });
  }

  return newScenarios;
};