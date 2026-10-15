import { MasterUnit } from "../types";
import { RARITY_SCALE } from "./config";
import {
  LOCAL_PREFERRED_UNIT_SLUGS,
  resolveUnitImageSlug,
  toUnitSlug,
} from "./unitSlug";

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

const ASSET_CDN_BASE_URL =
  import.meta.env.VITE_ASSET_CDN_BASE_URL?.replace(/\/+$/, "");

export function getUnitAssetUrl(unitId: string) {
  if (!unitId) return null;
  const resolvedSlug = resolveUnitImageSlug(unitId);
  if (!resolvedSlug) return null;
  if (
    ASSET_CDN_BASE_URL &&
    !LOCAL_PREFERRED_UNIT_SLUGS.has(resolvedSlug) &&
    !LOCAL_PREFERRED_UNIT_SLUGS.has(toUnitSlug(unitId))
  ) {
    return `${ASSET_CDN_BASE_URL}/units/${resolvedSlug}.webp`;
  }
  return `/units/${resolvedSlug}.webp`;
}

export function getProxyImage(unitId: string, _fallbackUrl?: string) {
  return getUnitAssetUrl(unitId);
}

/**
 * Handles image load errors with a single cache-busting retry before hiding the image.
 * Returns `true` if a retry was scheduled, or `false` if retries are exhausted.
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  id: string
): boolean {
  const target = e.currentTarget;
  const stage = target.getAttribute("data-fallback-stage");

  if (!stage) {
    target.setAttribute("data-fallback-stage", "1");
    const resolvedSlug = resolveUnitImageSlug(id);
    if (resolvedSlug) {
      target.src = `/units/${resolvedSlug}.webp?retry=1`;
      return true;
    }
  }

  target.setAttribute("data-fallback-stage", "2");
  target.src =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  target.style.opacity = "0";
  return false;
}

export function getObtainability(unit?: MasterUnit): "OBT" | "UNOB" {
  if (!unit) return "UNOB";

  const n = (unit.notice || "").toLowerCase();

  // Explicit notice in sheet is always source of truth
  if (
    n.includes("[unobtainable]") ||
    n.includes("(unobtainable)") ||
    n.includes("unobtainable")
  ) {
    return "UNOB";
  }
  if (
    n.includes("[obtainable]") ||
    n.includes("(obtainable)") ||
    n.includes("obtainable")
  ) {
    return "OBT";
  }

  // Directly respect metadata overrides
  if (unit.obtainability) return unit.obtainability;

  const cat = (unit.subCategory || "").toLowerCase();
  if (unit.tier === "Oddities" || cat.includes("gamepass")) return "OBT";
  if (n.includes("capsule") || n.includes("egg") || n.includes("firework")) return "OBT";
  if (getTier(unit) === "C" && n.includes("banner")) return "OBT";

  return "UNOB";
}

export async function copyTextWithFallback(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand fallback
    }
  }
  if (typeof document !== "undefined") {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
  return false;
}


