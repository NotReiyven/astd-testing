// ================================================
// FILE: src/workers/parser.worker.ts
// ================================================

import { MasterUnit, TradeCard } from "../types";

export type AmbiguousToken = { rawName: string; qty: number; col: "give" | "get"; options: MasterUnit[]; };
export type ParseResult = { giveCards: TradeCard[]; getCards: TradeCard[]; ambiguous: AmbiguousToken[]; error: string | null; };
type ParsedItem = { rawName: string; qty: number; options: MasterUnit[]; confidence: number; };
type LexiconEntry = { key: string; units: MasterUnit[]; type: "exact" | "alias" | "acronym" };

let DICTIONARY: LexiconEntry[] = [];
let cachedUnitIds = "";

const getEditDistance = (a: string, b: string): number => {
    const lenA = a.length;
    const lenB = b.length;
    if (lenA === 0) return lenB;
    if (lenB === 0) return lenA;
    // Optimization: Circuit breaker for vast length differences to prevent CPU lockup
    if (Math.abs(lenA - lenB) > 15) return 99; 
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

const normalizeKey = (value: string): string => {
    return value.toLowerCase().replace(/[*]/g, "").replace(/[’']/g, "").replace(/[^a-z0-9\s-%]/g, " ").replace(/\s+/g, " ").trim();
};

const buildLexicon = (ALL_UNITS: MasterUnit[]) => {
    const LEXICON_MAP = new Map<string, LexiconEntry>();

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
        u.aliases?.forEach(a => addLexicon(a, u, "alias"));

        // Auto-generate percentage shorthand
        const percentMatch = u.name.match(/(\d+)\s*%/);
        if (percentMatch) {
            const pct = percentMatch[1];
            addLexicon(`${pct}%`, u, "alias");
            addLexicon(`${pct}% egg`, u, "alias");
        }

        // Auto-generate acronyms from multi-word names
        const words = u.name.split(/[\s-]+/).filter(Boolean);
        if (words.length > 1) {
            const acronym = words.map(w => w[0]).join("").toLowerCase();
            if (acronym.length >= 2) addLexicon(acronym, u, "acronym");
        }
    });

    DICTIONARY = Array.from(LEXICON_MAP.values()).sort((a, b) => b.key.length - a.key.length);
    cachedUnitIds = ALL_UNITS.map(u => u.id).join(",");
};

const cleanTradeText = (input: string): string[] => {
    let text = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    let lines = text.split("\n").map(line => {
        const nlfMatch = line.match(/\b(nlf|not looking for)\b/i);
        if (nlfMatch && nlfMatch.index !== undefined) return line.substring(0, nlfMatch.index);
        return line;
    });
    text = lines.join("\n").replace(/```/g, "").replace(/[–—−~]/g, "-").replace(/\s*\/\s*/g, " / ").replace(/\s*\|\s*/g, " , ").replace(/^\s*>\s?/gm, "").replace(/^\s*-\s*/gm, "");
    return text.split(/[\n;&•,+]|\band\b/i).map(t => t.trim()).filter(Boolean);
};

const extractQuantityAndClean = (rawToken: string): { qty: number; cleanText: string } => {
    let text = rawToken.replace(/\b(my|ur|your|his|hers|hes|he's|their|accept|taking|wanted|any good offers|good offers?|offers?|offer|traid|trade|trading|upgrading|downgrading|adds?|good|bad|idk|overpay|op|worth|nty|fair|any|s tier|a tier|b tier|c tier|oddities)\b/gi, " ");
    let qty = 1;
    
    const frontXMatch = text.match(/^(?:x\s*(\d+)|(\d+)\s*x)\s+(.+)$/i);
    if (frontXMatch) {
        qty = parseInt(frontXMatch[1] || frontXMatch[2], 10);
        text = frontXMatch[3];
    } else {
        const backXMatch = text.match(/^(.+?)\s+(?:x\s*(\d+)|(\d+)\s*x)$/i);
        if (backXMatch) {
            qty = parseInt(backXMatch[2] || backXMatch[3], 10);
            text = backXMatch[1];
        } else {
            const frontNumMatch = text.match(/^(\d+)\s+(.+)$/);
            if (frontNumMatch && !frontNumMatch[2].startsWith("%") && !frontNumMatch[2].startsWith("k")) {
                qty = parseInt(frontNumMatch[1], 10);
                text = frontNumMatch[2];
            }
        }
    }

    text = text.replace(/\s+\d+[kmb]\b/gi, "").replace(/\s*\([^)]*\)/g, "").trim();
    return { qty, cleanText: text };
};

const matchTokenToUnit = (unitText: string, ALL_UNITS: MasterUnit[], slangCache: Record<string, string>): ParsedItem | null => {
    const normalized = normalizeKey(unitText);
    if (!normalized || normalized.length < 2) return null;

    if (slangCache[normalized]) {
        const u = ALL_UNITS.find(x => x.id === slangCache[normalized]);
        if (u) return { rawName: unitText, qty: 1, options: [u], confidence: 100 };
    }

    const exactEntry = DICTIONARY.find(e => e.key === normalized);
    if (exactEntry) {
        return { rawName: unitText, qty: 1, options: [...exactEntry.units], confidence: exactEntry.type === "exact" ? 100 : exactEntry.type === "alias" ? 95 : 85 };
    }

    const inputWords = normalized.split(/\s+/);
    const scored = DICTIONARY.map(entry => {
        let score = getEditDistance(normalized, entry.key);
        const targetWords = entry.key.split(/\s+/);
        if (inputWords.every(w => targetWords.includes(w))) {
            const lengthPenalty = Math.abs(entry.key.length - normalized.length) * 0.1;
            score = Math.min(score, 1 + lengthPenalty);
        }
        return { entry, score };
    }).filter(e => e.score <= Math.max(2, normalized.length * 0.3)).sort((a, b) => a.score - b.score);

    if (scored.length > 0) {
        const bestDist = scored[0].score;
        const closeMatches = scored.filter(e => e.score <= bestDist + 0.5).flatMap(e => e.entry.units);
        const uniqueMatches = Array.from(new Map(closeMatches.map(u => [u.id, u])).values());
        return { rawName: unitText, qty: 1, options: uniqueMatches.slice(0, 4), confidence: 60 };
    }
    return null;
};

self.onmessage = (e) => {
    const { id, text, units, slangCache } = e.data;

    // --- HARD LIMITER / CIRCUIT BREAKER ---
    if (!text || text.length > 5000) {
        self.postMessage({
            id,
            result: {
                giveCards: [],
                getCards: [],
                ambiguous: [],
                error: "Input too large (max 5000 characters). Please paste a smaller trade block to prevent browser lockup."
            }
        });
        return;
    }

    const currentUnitIds = units.map((u: MasterUnit) => u.id).join(",");
    if (DICTIONARY.length === 0 || cachedUnitIds !== currentUnitIds) {
        buildLexicon(units);
    }

    let givePart = text;
    let getPart = "";

    const hwMatch = text.match(/\b(?:have|h|give|giving)\b\s*[:\-]?\s*(.*?)\s*\b(?:want|w|lf|looking for|get|getting)\b\s*[:\-]?\s*(.*)/i);
    if (hwMatch) {
        givePart = hwMatch[1];
        getPart = hwMatch[2];
    } else {
        const forMatch = text.match(/(.*?)\s+(?:for|want|wants|gets|looking for|lf|->|=>)\s+(.*)/i);
        if (forMatch) {
            givePart = forMatch[1];
            getPart = forMatch[2];
        }
    }

    const parseChunk = (chunkText: string, col: "give" | "get"): { cards: TradeCard[], ambiguous: AmbiguousToken[] } => {
        const tokens = cleanTradeText(chunkText);
        const parsedItems: ParsedItem[] = [];

        for (const token of tokens) {
            const { qty, cleanText } = extractQuantityAndClean(token);
            if (!cleanText) continue;
            const matched = matchTokenToUnit(cleanText, units, slangCache);
            if (matched) {
                matched.qty = qty;
                parsedItems.push(matched);
            }
        }

        const cards: TradeCard[] = [];
        const ambiguous: AmbiguousToken[] = [];
        
        for (const item of parsedItems) {
            const uniqueOptions = Array.from(new Map(item.options.map(u => [u.id, u])).values());
            if (uniqueOptions.length === 1 && item.confidence >= 60) {
                const unit = uniqueOptions[0];
                const numericValue = typeof unit.value === "number" ? unit.value : unit.valueMin || 0;
                const existing = cards.find(c => c.id === unit.id);
                if (existing) {
                    existing.qty += item.qty;
                } else {
                    cards.push({ id: unit.id, name: unit.name, subtitle: unit.subtitle, value: numericValue, qty: item.qty });
                }
            } else if (uniqueOptions.length > 1) {
                ambiguous.push({ rawName: item.rawName, qty: item.qty, col, options: uniqueOptions });
            }
        }
        return { cards, ambiguous };
    };

    const giveRes = parseChunk(givePart, "give");
    const getRes = getPart ? parseChunk(getPart, "get") : { cards: [], ambiguous: [] };

    const totalCount = giveRes.cards.length + getRes.cards.length;
    const totalAmbiguous = giveRes.ambiguous.length + getRes.ambiguous.length;
    
    self.postMessage({
        id,
        result: {
            giveCards: giveRes.cards,
            getCards: getRes.cards,
            ambiguous: [...giveRes.ambiguous, ...getRes.ambiguous],
            error: (totalCount === 0 && totalAmbiguous === 0) ? "No matching units found. Check for typos." : null
        }
    });
};