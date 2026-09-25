import { TradeCard, MasterUnit } from "../../../types";

export type AmbiguousToken = {
  rawName: string;
  qty: number;
  col: "give" | "get";
  options: MasterUnit[];
};
export type ParseResult = {
  giveCards: TradeCard[];
  getCards: TradeCard[];
  ambiguous: AmbiguousToken[];
  error: string | null;
};

// Instantiate the Web Worker
const worker = new Worker(
  new URL("../../../workers/parser.worker.ts", import.meta.url),
  { type: "module" }
);

// We track pending promises so we can resolve them when the worker responds
const pendingParses = new Map<string, (result: ParseResult) => void>();

worker.onmessage = (e) => {
  const { id, result } = e.data;
  const resolve = pendingParses.get(id);
  if (resolve) {
    resolve(result);
    pendingParses.delete(id);
  }
};

const normalizeKey = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[*]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s-%]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const learnSlang = (rawName: string, unitId: string) => {
  try {
    const cache = JSON.parse(localStorage.getItem("astd_slang_cache") || "{}");
    const cleanRaw = normalizeKey(rawName);
    if (!cleanRaw) return;
    cache[cleanRaw] = unitId;
    localStorage.setItem("astd_slang_cache", JSON.stringify(cache));
  } catch (e) {
    console.error("Failed to save slang", e);
  }
};

export const removeSlang = (rawName: string) => {
  try {
    const cache = JSON.parse(localStorage.getItem("astd_slang_cache") || "{}");
    const cleanRaw = normalizeKey(rawName);
    delete cache[cleanRaw];
    localStorage.setItem("astd_slang_cache", JSON.stringify(cache));
  } catch (e) {
    console.error("Failed to remove slang", e);
  }
};

export const getSlangCache = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem("astd_slang_cache") || "{}");
  } catch {
    return {};
  }
};

// Asynchronous wrapper to send text to the Web Worker and wait for the reply
export const parseSmartTradeAsync = (
  smartInput: string,
  ALL_UNITS: MasterUnit[]
): Promise<ParseResult> => {
  return new Promise((resolve) => {
    if (!smartInput || !smartInput.trim()) {
      resolve({
        giveCards: [],
        getCards: [],
        ambiguous: [],
        error: "Input is empty.",
      });
      return;
    }

    if (ALL_UNITS.length === 0) {
      resolve({
        giveCards: [],
        getCards: [],
        ambiguous: [],
        error: "Units database is loading...",
      });
      return;
    }

    const id = Math.random().toString(36).substring(2);
    pendingParses.set(id, resolve);

    worker.postMessage({
      id,
      text: smartInput,
      units: ALL_UNITS,
      slangCache: getSlangCache(),
    });
  });
};
