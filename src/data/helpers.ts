import { MasterUnit } from "../types";
import { RARITY_SCALE } from "./config";

// --- HAPTIC FEEDBACK ENGINE ---
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success') {
  if (typeof window !== "undefined" && navigator.vibrate) {
    try {
      switch (type) {
        case 'light':
          navigator.vibrate(10);
          break;
        case 'medium':
          navigator.vibrate(25);
          break;
        case 'heavy':
          navigator.vibrate(40);
          break;
        case 'success':
          // Double tap
          navigator.vibrate([30, 60, 30]);
          break;
      }
    } catch (e) {
      // Ignore gracefully if the device restricts it
    }
  }
}

export function getTier(u: MasterUnit): "S" | "A" | "B" | "C" | "Pure" | "Oddities" | "Untiered" {
  return (u.tier as "S" | "A" | "B" | "C" | "Pure" | "Oddities" | "Untiered") || "S";
}

export function sortVal(u: MasterUnit): number {
  if (u.value === "owner") return 2_000_000_000;
  if (u.value === "range") return u.valueMin ?? 400_000;
  return u.value as number;
}

export function getRarityLabel(v: number) {
  const entry = RARITY_SCALE.find((r) => v >= r.min && v <= r.max);
  return entry ? entry.label : "Unknown";
}

export function getProxyImage(unitId: string, fallbackUrl?: string) {
  if (!unitId) return null;

  // Since UnitContext defaults to local paths, serve them directly
  if (fallbackUrl && fallbackUrl.startsWith('/units/')) {
    return fallbackUrl;
  }

  // Fallback for brand-new units added to the sheet with raw Wikia URLs
  if (!fallbackUrl || fallbackUrl === "PLACEHOLDER_URL") return null;
  if (fallbackUrl.includes("imgur.com")) return fallbackUrl;

  const cleanUrl = fallbackUrl.split("/revision/")[0];
  return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&output=webp&w=150&fit=cover`;
}

const UNOB_BLACKLIST = [
  "water-goddess", "aqua",
  "kageni", "cid",
  "challenger-flaming-tiger", "rengoku",
  "tuca-donka", "hakari", "kinji",
  "sound-o-sonic-demon", "tengen",
  "mercury-guardian", "sailor mercury",
  "garnet-spear", "violet", "evergarden",
  "veldora", "storm dragon",
  "gremmy", "visionary",
  "thragg", "freddie mercury",
  "water-boy", "suigetsu",
  "excellent-leader", "frost",
  "red-head", "shanks",
  "water-kakazu", "wind-kakazu", "fire-kakazu", "lightning-kakazu", "kakuzu",
  "second-hand", "doppio",
  "water-mage-c", "juvia",
  "smoker", "asuma",
  "afro-samurai",
  "guardian-of-aba", "pui pui",
  "zaruto-grr-iii", "grr iii"
];

export function getObtainability(unit?: MasterUnit): "OBT" | "UNOB" {
  if (!unit) return "UNOB";

  const note = (unit.notice || "").toLowerCase();
  const name = (unit.name || "").toLowerCase();
  const subtitle = (unit.subtitle || "").toLowerCase();
  const id = (unit.id || "").toLowerCase();
  const subCat = (unit.subCategory || "").toLowerCase();

  // 1. Explicit notice overrides
  if (note.includes("(unobtainable)") || note.includes("[unobtainable]") || note.includes("unobtainable") || note.includes("retired") || note.includes("unob")) return "UNOB";
  if (note.includes("(obtainable)") || note.includes("[obtainable]")) return "OBT";

  // 2. Gamepasses & Mounts (Exact match for "unit mount" prevents "Mountain" false positives)
  if (id.startsWith("gp-") || name.includes("gamepass") || name.includes("star pass") || name.includes("starpass") || name.includes("unit mount") || note.includes("gamepass") || name.includes("premium pass") || subCat.includes("gamepass")) {
    return "OBT";
  }

  // 3. Skins & Gifts
  const isSkin = subCat.includes("skin") || subtitle.includes("skin") || note.includes("skin") || note.includes("gift");
  if (isSkin) {
    if (note.includes("easter capsule")) return "OBT";
    return "UNOB";
  }

  // 4. Blacklisted Terms & PvP/Tournament/Leaderboard
  if (UNOB_BLACKLIST.some(item => id.includes(item) || name.includes(item) || subtitle.includes(item))) return "UNOB";
  if (note.includes("evolv") || note.includes("evolution")) return "UNOB";
  if (note.includes("pvp set") || note.includes("tournament") || note.includes("leaderboard") || note.includes("event") || note.includes("raid") || note.includes("dungeon") || note.includes("code")) {
    return "UNOB";
  }

  // 5. Banners
  if (getTier(unit) === "C" && note.includes("banner") && !name.includes("snowman")) {
    return "OBT";
  }

  // 6. Capsules
  if (note.includes("starpass capsule") || note.includes("star pass capsule")) return "UNOB";
  if (note.includes("lucky capsule") || note.includes("nested capsule")) return "OBT";
  if (note.includes("capsule") || note.includes("egg") || note.includes("firework")) return "OBT";

  // 7. Fallback regex
  if (/\bobtainable\b/.test(note.replace(/unobtainable/g, ''))) return "OBT";

  return "UNOB";
}