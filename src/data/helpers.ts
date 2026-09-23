// ================================================
// FILE: src/data/helpers.ts
// ================================================

import { MasterUnit } from "../types";
import { RARITY_SCALE } from "./config";
import { UNIT_IMAGES } from "./images";

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
          navigator.vibrate([30, 60, 30]);
          break;
      }
    } catch (e) {}
  }
}

export function getTier(u: MasterUnit): string {
  return u.tier || "S";
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
  return `/units/${unitId}.webp?v=2`;
}

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>, id: string) {
  const target = e.currentTarget;
  const stage = target.getAttribute('data-fallback-stage');

  if (!stage) {
    target.setAttribute('data-fallback-stage', '1');
    const rawUrl = UNIT_IMAGES[id];
    
    if (rawUrl && rawUrl !== "PLACEHOLDER_URL") {
      const cleanUrl = rawUrl.replace(/&amp;/g, '&').split("/revision/")[0];
      target.src = `${cleanUrl}/revision/latest/scale-to-width-down/150?cb=${Date.now()}`;
      return;
    }
  }

  target.style.opacity = '0';
}

export function getObtainability(unit?: MasterUnit): "OBT" | "UNOB" {
  if (!unit) return "UNOB";
  
  // Directly respect DB overrides
  if (unit.obtainability) return unit.obtainability;

  const n = (unit.notice || "").toLowerCase();
  const cat = (unit.subCategory || "").toLowerCase();

  // Strict structural matching based on notice/tier/category, avoiding loose string matches
  if (n.includes("[unobtainable]") || n.includes("(unobtainable)")) return "UNOB";
  if (n.includes("[obtainable]") || n.includes("(obtainable)")) return "OBT";

  if (unit.tier === "Oddities" || cat.includes("gamepass")) return "OBT";
  if (n.includes("capsule") || n.includes("egg") || n.includes("firework")) return "OBT";
  if (getTier(unit) === "C" && n.includes("banner")) return "OBT";

  return "UNOB";
}