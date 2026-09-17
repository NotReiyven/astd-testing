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

const buildLexicon = (ALL_UNITS: MasterUnit[]) => {
    LEXICON_MAP.clear();

    const addLexicon = (key: string, unit: MasterUnit, type: "exact" | "alias" | "acronym") => {
        const cleanKey = key.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "");
        if (!cleanKey || cleanKey.length < 2) return;

        if (LEXICON_MAP.has(cleanKey)) {
            const entry = LEXICON_MAP.get(cleanKey)!;
            if (!entry.units.some(u => u.id === unit.id)) entry.units.push(unit);
        } else {
            LEXICON_MAP.set(cleanKey, { key: cleanKey, units: [unit], type });
        }

        if (type !== "acronym" && !cleanKey.endsWith("s") && !cleanKey.includes(" ")) {
            const pluralKey = cleanKey + "s";
            if (LEXICON_MAP.has(pluralKey)) {
                const pEntry = LEXICON_MAP.get(pluralKey)!;
                if (!pEntry.units.some(u => u.id === unit.id)) pEntry.units.push(unit);
            } else {
                LEXICON_MAP.set(pluralKey, { key: pluralKey, units: [unit], type: "alias" });
            }
        }
    };

    ALL_UNITS.forEach(u => {
        addLexicon(u.name, u, "exact");
        if (u.name.includes("*")) addLexicon(u.name.replace(/\*/g, ""), u, "exact");
        if (u.subtitle) addLexicon(u.subtitle, u, "exact");

        u.aliases?.forEach(a => {
            addLexicon(a, u, "alias");
            if (a.includes("*")) addLexicon(a.replace(/\*/g, ""), u, "alias");
        });

        // Robust hardcoded alias injections for notoriously misparsed units
        const nameStr = `${u.name} ${u.subtitle} ${u.id}`.toLowerCase();
        
        if (nameStr.includes("3x") || nameStr.includes("speed")) {
            addLexicon("x3", u, "alias");
            addLexicon("3x", u, "alias");
            addLexicon("speed", u, "alias");
            addLexicon("3x speed", u, "alias");
            addLexicon("speed gamepass", u, "alias");
        }
        if (nameStr.includes("star pass") || nameStr.includes("starpass")) {
            addLexicon("starpass", u, "alias");
            addLexicon("star pass", u, "alias");
        }
        if (nameStr.includes("vip") || nameStr.includes("v.i.p")) {
            addLexicon("vip", u, "alias");
        }
        if (nameStr.includes("egg ii") || nameStr.includes("ainz")) {
            addLexicon("100% egg", u, "alias");
            addLexicon("necro egg", u, "alias");
            addLexicon("ainz egg", u, "alias");
        }

        if (u.id === "l-borul-alt") addLexicon("dbz", u, "alias");
        if (u.id === "ul-borul-alt") addLexicon("udbz", u, "alias");
        if (u.id === "galaxy-girl") addLexicon("gg", u, "alias");
        if (u.id === "beardcutter") addLexicon("goblin", u, "alias");
        if (u.id === "yamato") {
            addLexicon("yamato 5*", u, "alias");
            addLexicon("yamato 5", u, "alias");
        }

        const words = u.name.split(/[\s-]+/).filter(Boolean);
        if (words.length > 1) {
            const acronym = words.map(w => w[0]).join("").toLowerCase();
            if (acronym.length > 1) addLexicon(acronym, u, "acronym");
        }
    });

    DICTIONARY = Array.from(LEXICON_MAP.values()).sort((a, b) => b.key.length - a.key.length);
    cachedUnits = ALL_UNITS;
};

export const learnSlang = (rawName: string, unitId: string) => {
    try {
        const cache = JSON.parse(localStorage.getItem("astd_slang_cache") || "{}");
        const cleanRaw = rawName.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim();
        cache[cleanRaw] = unitId;
        localStorage.setItem("astd_slang_cache", JSON.stringify(cache));
    } catch (e) { console.error("Failed to save slang", e); }
};

export const removeSlang = (rawName: string) => {
    try {
        const cache = JSON.parse(localStorage.getItem("astd_slang_cache") || "{}");
        const cleanRaw = rawName.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim();
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

type EntitySpan = {
    start: number; end: number; text: string; options: MasterUnit[]; 
    matchType: "slang" | "exact" | "alias" | "acronym" | "fuzzy"; confidence: number;
    qty: number; isPure: boolean; isShiny: boolean;
};

export const parseSmartTrade = (smartInput: string, ALL_UNITS: MasterUnit[]): ParseResult => {
    if (!smartInput || smartInput.trim().length === 0) {
        return { giveCards: [], getCards: [], ambiguous: [], error: "Input is empty." };
    }

    const needsRebuild = cachedUnits.length !== ALL_UNITS.length || (ALL_UNITS.length > 0 && cachedUnits[0]?.id !== ALL_UNITS[0]?.id);
    if (needsRebuild) {
        buildLexicon(ALL_UNITS);
    }

    if (smartInput.toUpperCase().includes("[I GIVE]")) {
        const gMatch = smartInput.match(/\[I GIVE\]([\s\S]*?)\[I GET\]/i);
        const tMatch = smartInput.match(/\[I GET\]([\s\S]*?)(?:📊|\bDiff:|\bw\/l\b|$)/i);
        if (gMatch && tMatch) {
            const forceStr = `${gMatch[1].replace(/\n/g, " , ")} for ${tMatch[1].replace(/\n/g, " , ")}`;
            return executeNERPipeline(forceStr, ALL_UNITS);
        }
        return { giveCards: [], getCards: [], ambiguous: [], error: "Malformed trade summary." };
    }

    return executeNERPipeline(smartInput, ALL_UNITS);
};

const executeNERPipeline = (rawInput: string, ALL_UNITS: MasterUnit[]): ParseResult => {
    let text = rawInput.toLowerCase().replace(/[–—~]/g, "-");
    text = text.replace(/\b100\s*eg[g]?s?\b/gi, "100% egg").replace(/\b(\d+0)\s*eg[g]?s?\b/gi, "$1% egg");
    text = text.replace(/\bg\s+(?=[a-z])/gi, "gold "); 
    text = text.replace(/\b(normal|regular|base)\b/gi, " "); 
    text = text.replace(/\b(\d)\s*stars?\b/gi, "$1*"); 
    text = text.replace(/\b(w\/l|w\s*\/\s*l|w\s+or\s+l|win\s*\/\s*loss|win\s*\/\s*lose|w\\l|w\s*l)\b/gi, " ");
    text = text.replace(/\b(my|ur|your|his|hers|hes|he's|their|will you accept|would you take|do you accept|hi|hello|yo|hiii|pls|please|ty|thanks|a|an|the)\b/gi, " ");
    text = text.replace(/\b(traid|trade|trading|offer|offers|adds?|good|bad|idk|overpay|op|worth|nty|fair|any)\b/gi, " ");
    text = text.replace(/\b(mlf|lf|lfing|looking for|wanting|wants)\b/gi, "want");
    text = text.replace(/\b(for|4)\s+my\b/gi, "for");
    text = text.replace(/\bnecro\s*eggs?\b/gi, "100% egg ii");
    text = text.replace(/\bold lb set\b/gi, "kaido, yamato 6, first wood bender");
    text = text.replace(/\bnew lb set\b/gi, "epic infinity, quincy ichigo, super saiyan bardock, mr random, mecha naruto, illumi zoldyck");
    text = text.replace(/\s+/g, " "); 

    const slangCache = getSlangCache();
    const consumed = new Array(text.length).fill(false);
    const spans: EntitySpan[] = [];

    const isFree = (s: number, e: number) => !consumed.slice(s, e).some(v => v);
    const markConsumed = (s: number, e: number) => consumed.fill(true, s, e);
    const isBoundary = (s: number, e: number) => {
        const left = s === 0 || /[^a-z0-9]/.test(text[s - 1]);
        const right = e === text.length || /[^a-z0-9]/.test(text[e]);
        return left && right;
    };

    for (const [slangKey, unitId] of Object.entries(slangCache)) {
        if (!slangKey) continue;
        let idx = text.indexOf(slangKey);
        let attempts = 0;
        while (idx !== -1 && attempts++ < 1000) {
            if (isBoundary(idx, idx + slangKey.length) && isFree(idx, idx + slangKey.length)) {
                const u = ALL_UNITS.find(x => x.id === unitId);
                if (u) {
                    spans.push({ start: idx, end: idx + slangKey.length, text: slangKey, options: [u], matchType: "slang", confidence: 100, qty: 1, isPure: false, isShiny: false });
                    markConsumed(idx, idx + slangKey.length);
                }
            }
            idx = text.indexOf(slangKey, idx + 1);
        }
    }

    for (const entry of DICTIONARY) {
        let idx = text.indexOf(entry.key);
        let attempts = 0;
        while (idx !== -1 && attempts++ < 1000) {
            if (isBoundary(idx, idx + entry.key.length) && isFree(idx, idx + entry.key.length)) {
                let conf = entry.type === "exact" ? 95 : entry.type === "alias" ? 90 : 70;
                spans.push({ start: idx, end: idx + entry.key.length, text: entry.key, options: [...entry.units], matchType: entry.type, confidence: conf, qty: 1, isPure: false, isShiny: false });
                markConsumed(idx, idx + entry.key.length);
            }
            idx = text.indexOf(entry.key, idx + 1);
        }
    }

    const pivots = Array.from(text.matchAll(/\b(for|want|lf|mlf)\b/gi));
    const validPivots: RegExpMatchArray[] = pivots.filter(p => isFree(p.index!, p.index! + p[0].length));
    validPivots.forEach(p => markConsumed(p.index!, p.index! + p[0].length));

    const delims = Array.from(text.matchAll(/[,+&]|\band\b/gi));
    delims.forEach(d => { if (isFree(d.index!, d.index! + d[0].length)) markConsumed(d.index!, d.index! + d[0].length); });

    const modifiers = Array.from(text.matchAll(/\b(pure|p|shiny|s)\b/gi));
    modifiers.forEach(m => { if (isFree(m.index!, m.index! + m[0].length)) markConsumed(m.index!, m.index! + m[0].length); });

    let currentChunkStart = -1;
    for (let i = 0; i <= text.length; i++) {
        if (i < text.length && !consumed[i]) {
            if (currentChunkStart === -1 && /[a-z0-9]/i.test(text[i])) currentChunkStart = i;
        } else {
            if (currentChunkStart !== -1) {
                let chunk = text.slice(currentChunkStart, i).trim();
                let chunkQty = 1;
                let chunkUnitText = chunk;

                // PREVENT QUANTITY STRIPPING if the entire chunk is already a known alias (e.g. "3x speed")
                const isExactLexicon = DICTIONARY.some(d => d.key === chunk);

                if (!isExactLexicon) {
                    const qFront = chunk.match(/^(\d+)\s*[xX]?\s+(.+)$/i) || chunk.match(/^[xX](\d+)\s+(.+)$/i);
                    if (qFront) { 
                        chunkQty = parseInt(qFront[1] || qFront[3], 10); 
                        chunkUnitText = (qFront[2] || qFront[4]).trim(); 
                    } else {
                        const qBack = chunk.match(/^(.*?)(?:\s*x(\d+)|\s*\(x(\d+)\))$/i);
                        if (qBack) { 
                            chunkQty = parseInt(qBack[2] || qBack[3], 10); 
                            chunkUnitText = qBack[1].trim(); 
                        }
                    }
                }

                if (chunkUnitText.length > 2) {
                    const tokens = chunkUnitText.split(/[\s-]+/).filter(t => t.length > 0);
                    const tokenMatches = ALL_UNITS.filter(u => {
                        const targetStr = `${u.name.toLowerCase()} ${u.subtitle?.toLowerCase() || ""} ${(u.aliases || []).join(" ")}`;
                        return tokens.every(t => {
                            const tSing = t.endsWith('s') && t.length > 3 ? t.slice(0, -1) : t;
                            return targetStr.includes(t) || targetStr.includes(tSing);
                        });
                    });

                    if (tokenMatches.length > 0) {
                        tokenMatches.sort((a, b) => a.name.length - b.name.length);
                        spans.push({ start: currentChunkStart, end: i, text: chunk, options: tokenMatches.slice(0, 5), matchType: "fuzzy", confidence: 40, qty: chunkQty, isPure: false, isShiny: false });
                        markConsumed(currentChunkStart, i);
                    } else {
                        const threshold = Math.min(3, Math.max(1, Math.floor(chunkUnitText.length * 0.25)));
                        const scored = ALL_UNITS.map(u => {
                            const nDist = getEditDistance(chunkUnitText, u.name.toLowerCase());
                            const aDist = u.aliases?.length ? Math.min(...u.aliases.map(a => getEditDistance(chunkUnitText, a.toLowerCase()))) : 99;
                            return { unit: u, dist: Math.min(nDist, aDist) };
                        }).filter(u => u.dist <= threshold).sort((a, b) => a.dist - b.dist);

                        if (scored.length > 0) {
                            spans.push({ start: currentChunkStart, end: i, text: chunk, options: scored.slice(0, 3).map(s => s.unit), matchType: "fuzzy", confidence: 40, qty: chunkQty, isPure: false, isShiny: false });
                            markConsumed(currentChunkStart, i);
                        }
                    }
                }
                currentChunkStart = -1;
            }
        }
    }

    const numberMatches = Array.from(text.matchAll(/\b(\d+)\b/g));
    for (const numMatch of numberMatches) {
        const numIdx = numMatch.index!;
        const numLen = numMatch[0].length;
        if (consumed.slice(numIdx, numIdx + numLen).some(v => v)) continue;

        let closestSpan: EntitySpan | null = null;
        let minDist = Infinity;

        for (const span of spans) {
            if (span.qty > 1) continue; 
            const distToStart = Math.abs(span.start - (numIdx + numLen));
            const distToEnd = Math.abs(span.end - numIdx);
            const dist = Math.min(distToStart, distToEnd);
            if (dist < minDist && dist <= 15) { minDist = dist; closestSpan = span; }
        }
        if (closestSpan) { closestSpan.qty = parseInt(numMatch[0], 10); markConsumed(numIdx, numIdx + numLen); }
    }

    spans.sort((a, b) => a.start - b.start);

    const assignModifier = (gapText: string, leftSpan: EntitySpan | null, rightSpan: EntitySpan | null) => {
        if (!gapText.trim()) return;
        const pureMatch = gapText.match(/\b(pure|p)\b/i);
        const shinyMatch = gapText.match(/\b(shiny|s)\b/i);

        if (pureMatch) {
            const mid = pureMatch.index! + (pureMatch[0].length / 2);
            const distLeft = leftSpan ? mid : Infinity;
            const distRight = rightSpan ? (gapText.length - mid) : Infinity;
            if (distLeft <= distRight && leftSpan) leftSpan.isPure = true;
            else if (rightSpan) rightSpan.isPure = true;
        }
        if (shinyMatch) {
            const mid = shinyMatch.index! + (shinyMatch[0].length / 2);
            const distLeft = leftSpan ? mid : Infinity;
            const distRight = rightSpan ? (gapText.length - mid) : Infinity;
            if (distLeft <= distRight && leftSpan) leftSpan.isShiny = true;
            else if (rightSpan) rightSpan.isShiny = true;
        }
    };

    for (let i = 0; i <= spans.length; i++) {
        const leftSpan = i > 0 ? spans[i - 1] : null;
        const rightSpan = i < spans.length ? spans[i] : null;
        const leftBound = leftSpan ? leftSpan.end : 0;
        const rightBound = rightSpan ? rightSpan.start : text.length;
        assignModifier(text.slice(leftBound, rightBound), leftSpan, rightSpan);
    }

    for (const span of spans) {
        if (span.options.length === 1) {
            const baseUnit = span.options[0];
            if (span.isPure) {
                const pureVariant = ALL_UNITS.find(u => u.name.toLowerCase() === `${baseUnit.name.toLowerCase()} (pure)` || u.name.toLowerCase() === `pure ${baseUnit.name.toLowerCase()}`);
                if (pureVariant) span.options = [pureVariant]; 
            }
            if (span.isShiny) {
                const shinyVariant = ALL_UNITS.find(u => u.name.toLowerCase() === `${baseUnit.name.toLowerCase()} (shiny)` || u.name.toLowerCase() === `shiny ${baseUnit.name.toLowerCase()}`);
                if (shinyVariant) span.options = [shinyVariant];
            }
        }
    }

    const giveCandidates: EntitySpan[] = [];
    const getCandidates: EntitySpan[] = [];
    let pivotIndex = -1;
    const lastFor = validPivots.slice().reverse().find((p: RegExpMatchArray) => p[0].toLowerCase() === "for");
    const lastWant = validPivots.slice().reverse().find((p: RegExpMatchArray) => ["want", "lf", "mlf"].includes(p[0].toLowerCase()));

    if (lastFor) pivotIndex = lastFor.index!;
    else if (lastWant) pivotIndex = lastWant.index!;

    spans.forEach(span => {
        if (pivotIndex !== -1) span.start < pivotIndex ? giveCandidates.push(span) : getCandidates.push(span);
        else giveCandidates.push(span);
    });

    const buildResult = (bucket: EntitySpan[], col: "give" | "get") => {
        const exact: TradeCard[] = [];
        const ambig: AmbiguousToken[] = [];

        bucket.forEach(span => {
            if (span.confidence >= 90 && span.options.length === 1) {
                const u = span.options[0];
                const existing = exact.find(e => e.id === u.id);
                if (existing) existing.qty += span.qty;
                else exact.push({ id: u.id, name: u.name, subtitle: u.subtitle, value: typeof u.value === 'number' ? u.value : 0, qty: span.qty });
            } else {
                const uniqueOptions = Array.from(new Map(span.options.map(u => [u.id, u])).values());
                ambig.push({ rawName: span.text, qty: span.qty, col, options: uniqueOptions });
            }
        });
        return { exact, ambig };
    };

    const gRes = buildResult(giveCandidates, "give");
    const tRes = buildResult(getCandidates, "get");

    return {
        giveCards: gRes.exact,
        getCards: tRes.exact,
        ambiguous: [...gRes.ambig, ...tRes.ambig],
        error: (gRes.exact.length === 0 && tRes.exact.length === 0 && gRes.ambig.length === 0 && tRes.ambig.length === 0) 
            ? "No matching units found. Check for typos." : null
    };
};