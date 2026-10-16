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

  // Directly respect metadata overrides if set to OBT
  if (unit.obtainability === "OBT") return "OBT";

  const cat = (unit.subCategory || "").toLowerCase();
  if (unit.tier === "Oddities" || cat.includes("gamepass")) return "OBT";
  if (n.includes("capsule") || n.includes("egg") || n.includes("firework")) return "OBT";
  if (getTier(unit) === "C" && n.includes("banner")) return "OBT";

  return unit.obtainability || "UNOB";
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

const INVISIBLE_UNICODE_REGEX =
  /[\u0000-\u001F\u007F-\u009F\u00AD\u1680\u180E\u2000-\u200F\u2028-\u202F\u205F-\u206F\u2800\u3000\u3164\uFFA0\uFEFF]/g;

/**
 * Strips zero-width, non-printing, invisible, format, and control characters
 * including Braille Pattern Blank (\u2800) and Hangul Filler (\u3164),
 * collapses redundant whitespace, and trims the result.
 * Returns null if the result contains no visible printable characters.
 */
export function sanitizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  const cleaned = raw
    .replace(INVISIBLE_UNICODE_REGEX, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length === 0) return null;
  return cleaned.slice(0, 32);
}

/**
 * Resolves a safe, non-empty display username from any raw profile/user data.
 * Guarantees a clean, human-readable string is always returned.
 */
export function resolveSafeUsername(
  rawUsername: unknown,
  fallbackOpts?: {
    joinNumber?: number | null;
    discordId?: string | null;
    userId?: string | null;
  }
): string {
  const clean = sanitizeUsername(rawUsername);
  if (clean) return clean;

  if (typeof fallbackOpts?.joinNumber === "number" && fallbackOpts.joinNumber > 0) {
    return `User #${fallbackOpts.joinNumber}`;
  }

  const cleanDiscordId = typeof fallbackOpts?.discordId === "string" ? fallbackOpts.discordId.trim() : "";
  if (/^\d{17,21}$/.test(cleanDiscordId)) {
    return `Discord User #${cleanDiscordId.slice(-4)}`;
  }

  const cleanUserId = typeof fallbackOpts?.userId === "string" ? fallbackOpts.userId.trim() : "";
  if (cleanUserId) {
    const compact = cleanUserId.replace(/[^a-zA-Z0-9]/g, "");
    if (compact) return `Trader #${compact.slice(0, 5)}`;
  }

  return "Trader";
}

/**
 * Extracts a valid Discord snowflake ID (17-21 digits) from Supabase User or Session claims.
 */
export function extractDiscordId(user: any): string | null {
  if (!user) return null;

  const SNOWFLAKE_REGEX = /^\d{17,21}$/;

  if (Array.isArray(user.identities)) {
    const discordIdentity = user.identities.find(
      (i: any) => i?.provider === "discord"
    );
    if (discordIdentity) {
      if (typeof discordIdentity.id === "string" && SNOWFLAKE_REGEX.test(discordIdentity.id.trim())) {
        return discordIdentity.id.trim();
      }
      const sub = discordIdentity.identity_data?.sub;
      if (typeof sub === "string" && SNOWFLAKE_REGEX.test(sub.trim())) {
        return sub.trim();
      }
      const providerId = discordIdentity.identity_data?.provider_id;
      if (typeof providerId === "string" && SNOWFLAKE_REGEX.test(providerId.trim())) {
        return providerId.trim();
      }
    }
  }

  const metaProviderId = user.user_metadata?.provider_id;
  if (typeof metaProviderId === "string" && SNOWFLAKE_REGEX.test(metaProviderId.trim())) {
    return metaProviderId.trim();
  }

  const metaSub = user.user_metadata?.sub;
  if (typeof metaSub === "string" && SNOWFLAKE_REGEX.test(metaSub.trim())) {
    return metaSub.trim();
  }

  return null;
}

/**
 * Extracts and sanitizes the best available username from Discord OAuth metadata.
 * Evaluates global_name first, but strictly falls back to the mandatory unique
 * Discord username if global_name is absent, null, empty, or consists of invisible Unicode filler.
 */
export function extractDiscordUsername(user: any): string | null {
  if (!user) return null;

  const discordIdentity = Array.isArray(user.identities)
    ? user.identities.find((i: any) => i?.provider === "discord")
    : null;

  // 1. First, evaluate global_name (optional display name).
  // Must be strictly non-empty after stripping invisible Unicode chars.
  const globalNameCandidates: unknown[] = [
    user.user_metadata?.custom_claims?.global_name,
    discordIdentity?.identity_data?.custom_claims?.global_name,
    user.user_metadata?.global_name,
    discordIdentity?.identity_data?.global_name,
  ];

  for (const candidate of globalNameCandidates) {
    const sanitized = sanitizeUsername(candidate);
    if (sanitized) return sanitized;
  }

  // 2. If global_name is absent, null, empty, or invisible filler,
  // fall back directly to the mandatory unique Discord username.
  const usernameCandidates: unknown[] = [
    user.user_metadata?.username,
    discordIdentity?.identity_data?.username,
    user.user_metadata?.user_name,
    discordIdentity?.identity_data?.user_name,
    user.user_metadata?.preferred_username,
    discordIdentity?.identity_data?.preferred_username,
    user.user_metadata?.full_name,
    discordIdentity?.identity_data?.full_name,
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name.replace(/#0$/, "")
      : null,
    typeof discordIdentity?.identity_data?.name === "string"
      ? discordIdentity.identity_data.name.replace(/#0$/, "")
      : null,
    user.email ? user.email.split("@")[0] : null,
  ];

  for (const candidate of usernameCandidates) {
    const sanitized = sanitizeUsername(candidate);
    if (sanitized) return sanitized;
  }

  // 3. Failsafe snowflake fallback
  const dId = extractDiscordId(user);
  if (dId) return `discord_${dId.slice(-6)}`;

  return null;
}

/**
 * Extracts the best available avatar URL from Discord OAuth metadata.
 */
export function extractDiscordAvatar(user: any): string | null {
  if (!user) return null;

  const discordIdentity = Array.isArray(user.identities)
    ? user.identities.find((i: any) => i?.provider === "discord")
    : null;

  const candidates: unknown[] = [
    user.user_metadata?.avatar_url,
    user.user_metadata?.picture,
    discordIdentity?.identity_data?.avatar_url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && (candidate.startsWith("http://") || candidate.startsWith("https://"))) {
      return candidate.trim();
    }
  }

  return null;
}
