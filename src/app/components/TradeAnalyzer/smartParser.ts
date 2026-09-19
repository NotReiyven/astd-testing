import { TradeCard, MasterUnit } from "../../../types";

const getEditDistance = (a: string, b: string): number => {
    const lenA = a.length;
    const lenB = b.length;
    if (lenA === 0) return lenB;
    if (lenB === 0) return lenA;
    if (lenA >= 50 || lenB >= 50) return 99;

    let prevRow = new Uint8Array(lenB + 1);
    let currRow = new Uint8Array(lenB + 1);

    for (let j = 0; j <= lenB; j++) prevRow[j] = j;

    for (let i = 1; i <= lenA; i++) {
        currRow[0] = i;
        for (let j = 1; j <= lenB; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            currRow[j] = Math.min(
                currRow[j - 1] + 1,       
                prevRow[j] + 1,           
                prevRow[j - 1] + cost     
            );
        }
        const temp = prevRow;
        prevRow = currRow;
        currRow = temp;
    }
    return prevRow[lenB];
};

type LexiconEntry = { key: string; units: MasterUnit[]; type: "exact" | "alias" | "acronym" };
let cachedUnits: MasterUnit[] = [];
let DICTIONARY: LexiconEntry[] = [];
const LEXICON_MAP = new Map<string, LexiconEntry>();

const normalizeKey = (value: string): string => {
    return value
        .toLowerCase()
        .replace(/[%]/g, " percent ")
        .replace(/[*]/g, "")
        .replace(/[’']/g, "")
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
};

const buildLexicon = (ALL_UNITS: MasterUnit[]) => {
    LEXICON_MAP.clear();

    const addLexicon = (key: string, unit: MasterUnit, type: "exact" | "alias" | "acronym") => {
        const cleanKey = normalizeKey(key);
        if (!cleanKey || cleanKey.length < 2) return;

        if (LEXICON_MAP.has(cleanKey)) {
            const entry = LEXICON_MAP.get(cleanKey)!;
            if (!entry.units.some(u => u.id === unit.id)) entry.units.push(unit);
        } else {
            LEXICON_MAP.set(cleanKey, { key: cleanKey, units: [unit], type });
        }
    };

    ALL_UNITS.forEach(u => {
        addLexicon(u.name, u, "exact");
        if (u.subtitle) addLexicon(u.subtitle, u, "exact");

        u.aliases?.forEach(a => {
            addLexicon(a, u, "alias");
        });

        const nameStr = `${u.name} ${u.subtitle} ${u.id}`.toLowerCase();
        
        if (nameStr.includes("3x") || nameStr.includes("speed")) {
            addLexicon("3x speed", u, "alias");
            addLexicon("3x", u, "alias");
            addLexicon("speed", u, "alias");
        }
        if (nameStr.includes("star pass") || nameStr.includes("starpass")) {
            addLexicon("starpass", u, "alias");
            addLexicon("star pass", u, "alias");
        }
        if (nameStr.includes("vip")) {
            addLexicon("vip", u, "alias");
        }
        
        // Egg aliases mapping safely
        const percentMatch = u.name.match(/(\d+)\s*%/);
        if (percentMatch && nameStr.includes("egg")) {
            const pct = percentMatch[1];
            addLexicon(`${pct}%`, u, "alias");
            addLexicon(`${pct}% egg`, u, "alias");
            addLexicon(`${pct}% egg ii`, u, "alias");
        }

        if (u.id === "l-borul-alt") addLexicon("dbz", u, "alias");
        if (u.id === "ul-borul-alt") addLexicon("udbz", u, "alias");
        if (u.id === "galaxy-girl") addLexicon("gg", u, "alias");
        if (u.id === "beardcutter") addLexicon("goblin", u, "alias");
        if (u.id === "yamato") {
            addLexicon("yamato 5", u, "alias");
            addLexicon("yamato 5*", u, "alias");
        }
        if (nameStr.includes("oni princess") && !nameStr.includes("5")) {
            addLexicon("yamato 6", u, "alias");
            addLexicon("yamato 6*", u, "alias");
        }

        const words = u.name.split(/[\s-]+/).filter(Boolean);
        if (words.length > 1) {
            const acronym = words.map(w => w[0]).join("").toLowerCase();
            if (acronym.length >= 2) addLexicon(acronym, u, "acronym");
        }
    });

    DICTIONARY = Array.from(LEXICON_MAP.values()).sort((a, b) => b.key.length - a.key.length);
    cachedUnits = ALL_UNITS;
};

export const learnSlang = (rawName: string, unitId: string) => {
    try {
        const cache = JSON.parse(localStorage.getItem("astd_slang_cache") || "{}");
        const cleanRaw = normalizeKey(rawName);
        if (!cleanRaw) return;
        cache[cleanRaw] = unitId;
        localStorage.setItem("astd_slang_cache", JSON.stringify(cache));
    } catch (e) { console.error("Failed to save slang", e); }
};

export const removeSlang = (rawName: string) => {
    try {
        const cache = JSON.parse(localStorage.getItem("astd_slang_cache") || "{}");
        const cleanRaw = normalizeKey(rawName);
        delete cache[cleanRaw];
        localStorage.setItem("astd_slang_cache", JSON.stringify(cache));
    } catch (e) { console.error("Failed to remove slang", e); }
};

export const getSlangCache = (): Record<string, string> => {
    try { return JSON.parse(localStorage.getItem("astd_slang_cache") || "{}"); } 
    catch { return {}; }
};

export type AmbiguousToken = { rawName: string; qty: number; col: "give" | "get"; options: MasterUnit[]; };
export type ParseResult = { giveCards: TradeCard[]; getCards: TradeCard[]; ambiguous: AmbiguousToken[]; error: string | null; };

type ParsedItem = { rawName: string; qty: number; options: MasterUnit[]; confidence: number; };

/* -------------------------------------------------------------------------- */
/* PHASE 1 & 2: CHOPPER & PURIFIER PIPELINE                                   */
/* -------------------------------------------------------------------------- */

const cleanTradeText = (input: string): string[] => {
    let text = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // 1. Line by line NLF (Not Looking For) truncation
    let lines = text.split("\n").map(line => {
        const nlfMatch = line.match(/\b(nlf|not looking for)\b/i);
        if (nlfMatch && nlfMatch.index !== undefined) {
            return line.substring(0, nlfMatch.index);
        }
        return line;
    });

    text = lines.join("\n");

    // 2. Formatting cleanup
    text = text
        .replace(/```/g, "")
        .replace(/[–—−~]/g, "-")
        .replace(/\s*\/\s*/g, " / ")
        .replace(/\s*\|\s*/g, " , ")
        .replace(/^\s*>\s?/gm, "")
        .replace(/^\s*-\s*/gm, "");

    // 3. Split by standard delimiters into an isolated token stream
    const rawTokens = text.split(/[\n,;&•]+/);
    
    return rawTokens.map(t => t.trim()).filter(Boolean);
};

const extractQuantityAndClean = (rawToken: string): { qty: number; cleanText: string } => {
    let text = rawToken;

    // Strip header words & conversational fluff
    text = text.replace(/\b(my|ur|your|his|hers|hes|he's|their|accept|taking|wanted|any good offers|good offers?|offers?|offer|traid|trade|trading|upgrading|downgrading|adds?|good|bad|idk|overpay|op|worth|nty|fair|any|s tier|a tier|b tier|c tier|pure tier|oddities|gamepasses|gamepass)\b/gi, " ");

    // Extract leading quantity (e.g., "9 3x Speed" or "6 P Leaf")
    let qty = 1;
    const frontMatch = text.match(/^(\d+)\s+(.+)$/);
    if (frontMatch && !frontMatch[2].startsWith("%")) {
        qty = parseInt(frontMatch[1], 10);
        text = frontMatch[2];
    } else {
        // Extract trailing quantity (e.g., "Leaf x6")
        const backMatch = text.match(/^(.+?)\s*[x×]\s*(\d+)$/i);
        if (backMatch) {
            qty = parseInt(backMatch[2], 10);
            text = backMatch[1];
        }
    }

    // Strip M/P prefixes (e.g., "M Kaido" -> "Kaido", "2P Choso" -> "Choso")
    text = text
        .replace(/\b(?:m|p)\s*\/\s*(?:m|p)\b/gi, "")
        .replace(/\b\d*[pm]\b/gi, "")
        .replace(/^\s*(?:m|p)\s+/i, "")
        .replace(/\s*\([^)]*\)/g, "") // Strip parenthesis notes
        .trim();

    return { qty, cleanText: text };
};

/* -------------------------------------------------------------------------- */
/* PHASE 3: MATCHER                                                           */
/* -------------------------------------------------------------------------- */

const matchTokenToUnit = (unitText: string, ALL_UNITS: MasterUnit[]): ParsedItem | null => {
    const normalized = normalizeKey(unitText);
    if (!normalized || normalized.length < 2) return null;

    // Check custom slang cache first
    const slangCache = getSlangCache();
    if (slangCache[normalized]) {
        const u = ALL_UNITS.find(x => x.id === slangCache[normalized]);
        if (u) return { rawName: unitText, qty: 1, options: [u], confidence: 100 };
    }

    // Check dictionary (Exact / Alias / Acronym)
    const exactEntry = DICTIONARY.find(e => e.key === normalized);
    if (exactEntry) {
        return {
            rawName: unitText,
            qty: 1,
            options: [...exactEntry.units],
            confidence: exactEntry.type === "exact" ? 100 : exactEntry.type === "alias" ? 95 : 85
        };
    }

    // Fallback: Fuzzy matching
    const threshold = Math.min(3, Math.max(1, Math.floor(normalized.length * 0.25)));
    const scored = ALL_UNITS.map(unit => {
        const candidates = [unit.name, ...(unit.aliases ?? []), unit.subtitle ?? ""].filter(Boolean).map(normalizeKey);
        const distance = Math.min(...candidates.map(c => getEditDistance(normalized, c)));
        return { unit, distance };
    }).filter(e => e.distance <= threshold).sort((a, b) => a.distance - b.distance);

    if (scored.length > 0) {
        const bestDist = scored[0].distance;
        const closeMatches = scored.filter(e => e.distance <= bestDist + 1).slice(0, 3);
        return {
            rawName: unitText,
            qty: 1,
            options: closeMatches.map(e => e.unit),
            confidence: 60
        };
    }

    return null;
};

export const parseSmartTrade = (smartInput: string, ALL_UNITS: MasterUnit[]): ParseResult => {
    if (!smartInput || !smartInput.trim()) {
        return { giveCards: [], getCards: [], ambiguous: [], error: "Input is empty." };
    }

    const needsRebuild = cachedUnits.length !== ALL_UNITS.length || (ALL_UNITS.length > 0 && cachedUnits[0]?.id !== ALL_UNITS[0]?.id);
    if (needsRebuild) {
        buildLexicon(ALL_UNITS);
    }

    // Split input into isolated chunks via Chopper
    const tokens = cleanTradeText(smartInput);
    const parsedItems: ParsedItem[] = [];

    for (const token of tokens) {
        // Check for 'for' or 'want' pivots within the token stream if needed, 
        // but for inventory import, everything is treated as a collected unit.
        const { qty, cleanText } = extractQuantityAndClean(token);
        if (!cleanText) continue;

        const matched = matchTokenToUnit(cleanText, ALL_UNITS);
        if (matched) {
            matched.qty = qty;
            parsedItems.push(matched);
        }
    }

    const cards: TradeCard[] = [];
    const ambiguous: AmbiguousToken[] = [];

    for (const item of parsedItems) {
        const uniqueOptions = Array.from(new Map(item.options.map(u => [u.id, u])).values());

        if (uniqueOptions.length === 1 && item.confidence >= 80) {
            const unit = uniqueOptions[0];
            const existing = cards.find(c => c.id === unit.id);
            if (existing) {
                existing.qty += item.qty;
            } else {
                cards.push({
                    id: unit.id,
                    name: unit.name,
                    subtitle: unit.subtitle,
                    value: typeof unit.value === "number" ? unit.value : 0,
                    qty: item.qty
                });
            }
        } else if (uniqueOptions.length > 0) {
            ambiguous.push({
                rawName: item.rawName,
                qty: item.qty,
                col: "give",
                options: uniqueOptions
            });
        }
    }

    return {
        giveCards: cards,
        getCards: [],
        ambiguous,
        error: cards.length === 0 && ambiguous.length === 0 ? "No matching units found. Check for typos." : null
    };
};