import React from "react";
import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { logger } from '../lib/logger';
import { get as getIdb, set as setIdb } from 'idb-keyval';
import { useToastStore } from "./useToastStore";

export type BannerStyleType =
  | "solid"
  | "gradient"
  | "grid"
  | "stripes"
  | "dots";

export type TradingStanceType =
  | "open"
  | "upgrading"
  | "downgrading"
  | "wishlist"
  | "afk";

export interface UserProfileData {
  id: string;
  discord_id: string;
  username: string;
  avatar_url: string;
  role: "user" | "mod" | "admin" | "master" | "banned";
  created_at: string;
  bio: string;
  banner_color: string;
  roblox_username: string;
  global_rep: number;
  status: "online" | "dnd" | "invisible" | "offline";
  // Unpacked extended profile customization & privacy fields
  accent_color?: string;
  banner_style?: BannerStyleType;
  trading_stance?: TradingStanceType;
  ad_history_public?: boolean;
  wishlist_public?: boolean;
  hide_discord_id?: boolean;
  private_ad_ids?: string[];
  master_rep_override?: number | null;
  join_number?: number;
}

export interface OgTierInfo {
  tier: "genesis" | "alpha" | "early" | "beta" | "veteran" | "member";
  label: string;
  badge: string;
  desc: string;
  color: string;
  bg: string;
  border: string;
}

const joinNumberCache: Record<string, number> = {};

export async function getJoinNumber(createdAt: string): Promise<number | null> {
  if (!createdAt) return null;
  if (joinNumberCache[createdAt]) return joinNumberCache[createdAt];
  try {
    const { count, error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .lte("created_at", createdAt);
    if (!error && typeof count === "number") {
      joinNumberCache[createdAt] = count;
      return count;
    }
  } catch {
    // Fail silently
  }
  return null;
}

export function getOgTier(joinNumber?: number | null): OgTierInfo {
  const num = joinNumber || 0;
  if (num === 1) {
    return {
      tier: "genesis",
      label: "Genesis #1",
      badge: "USER #1 • FOUNDER",
      desc: "First registered trader in ASTD Value List history",
      color: "#FFD700",
      bg: "rgba(255, 215, 0, 0.14)",
      border: "rgba(255, 215, 0, 0.40)",
    };
  }
  if (num > 1 && num <= 10) {
    return {
      tier: "alpha",
      label: "Alpha Pioneer",
      badge: `USER #${num} • ALPHA OG`,
      desc: `Pioneer Trader #${num} (Top 10 First Users)`,
      color: "#FAA61A",
      bg: "rgba(250, 166, 26, 0.14)",
      border: "rgba(250, 166, 26, 0.40)",
    };
  }
  if (num > 10 && num <= 25) {
    return {
      tier: "early",
      label: "Early OG",
      badge: `USER #${num} • EARLY OG`,
      desc: `Early Pioneer Trader #${num} (Top 25 First Users)`,
      color: "#c084fc",
      bg: "rgba(168, 85, 247, 0.14)",
      border: "rgba(168, 85, 247, 0.40)",
    };
  }
  if (num > 25 && num <= 100) {
    return {
      tier: "beta",
      label: "Beta OG",
      badge: `USER #${num} • BETA OG`,
      desc: `Early Adopter Trader #${num} (Top 100 Users)`,
      color: "#34d399",
      bg: "rgba(52, 211, 153, 0.14)",
      border: "rgba(52, 211, 153, 0.40)",
    };
  }
  if (num > 100 && num <= 500) {
    return {
      tier: "veteran",
      label: "Veteran",
      badge: `USER #${num} • VETERAN`,
      desc: `Veteran Trader #${num} (Top 500 Users)`,
      color: "#38bdf8",
      bg: "rgba(56, 189, 248, 0.14)",
      border: "rgba(56, 189, 248, 0.40)",
    };
  }
  return {
    tier: "member",
    label: num > 0 ? `Member #${num}` : "Verified Member",
    badge: num > 0 ? `USER #${num}` : "VERIFIED TRADER",
    desc: num > 0 ? `Trader #${num} in ASTD Value List` : "Verified Community Member",
    color: "#94a3b8",
    bg: "rgba(148, 163, 184, 0.10)",
    border: "rgba(148, 163, 184, 0.25)",
  };
}

const VALID_HEX = /^#[0-9A-Fa-f]{6}$/;
const VALID_STYLES: BannerStyleType[] = [
  "solid",
  "gradient",
  "grid",
  "stripes",
  "dots",
];
const VALID_STANCES: TradingStanceType[] = [
  "open",
  "upgrading",
  "downgrading",
  "wishlist",
  "afk",
];

export function unpackProfileRow(raw: any): UserProfileData {
  const rawBanner =
    typeof raw?.banner_color === "string" ? raw.banner_color : "#121214";
  const [hexPart, metaPart] = rawBanner.split("|");
  const cleanHex = VALID_HEX.test(hexPart?.trim())
    ? hexPart.trim()
    : "#121214";

  let accent_color = "#7289da";
  let banner_style: BannerStyleType = "gradient";
  let trading_stance: TradingStanceType = "open";
  let ad_history_public = true;
  let wishlist_public = true;
  let hide_discord_id = false;
  let private_ad_ids: string[] = [];
  let master_rep_override: number | null = null;

  if (metaPart) {
    try {
      const params = new URLSearchParams(metaPart);
      const ac = params.get("ac");
      if (ac && VALID_HEX.test(ac)) accent_color = ac;

      const bs = params.get("bs") as BannerStyleType | null;
      if (bs && VALID_STYLES.includes(bs)) banner_style = bs;

      const ts = params.get("ts") as TradingStanceType | null;
      if (ts && VALID_STANCES.includes(ts)) trading_stance = ts;

      if (params.get("ahp") === "0") ad_history_public = false;
      if (params.get("wlp") === "0") wishlist_public = false;
      if (params.get("hdi") === "1") hide_discord_id = true;

      const pids = params.get("pids");
      if (pids) {
        private_ad_ids = pids
          .split(",")
          .map((s) => s.trim())
          .filter((s) => /^[0-9a-fA-F-]{8,36}$/.test(s))
          .slice(0, 100);
      }

      const mrep = params.get("mrepset");
      if (mrep !== null && /^-?\d+$/.test(mrep.trim())) {
        master_rep_override = parseInt(mrep.trim(), 10);
      }
    } catch {
      // Fallback to defaults if malformed
    }
  }

  const resolvedRep =
    master_rep_override !== null
      ? master_rep_override
      : typeof raw?.global_rep === "number"
      ? raw.global_rep
      : 0;

  return {
    ...raw,
    global_rep: resolvedRep,
    banner_color: cleanHex,
    accent_color,
    banner_style,
    trading_stance,
    ad_history_public,
    wishlist_public,
    hide_discord_id,
    private_ad_ids,
    master_rep_override,
    join_number:
      typeof raw?.join_number === "number" ? raw.join_number : undefined,
  };
}

export function packBannerConfig(profile: Partial<UserProfileData>): string {
  const cleanHex =
    profile.banner_color && VALID_HEX.test(profile.banner_color.trim())
      ? profile.banner_color.trim()
      : "#121214";

  const params = new URLSearchParams();
  if (profile.accent_color && VALID_HEX.test(profile.accent_color.trim())) {
    params.set("ac", profile.accent_color.trim());
  }
  if (profile.banner_style && VALID_STYLES.includes(profile.banner_style)) {
    params.set("bs", profile.banner_style);
  }
  if (profile.trading_stance && VALID_STANCES.includes(profile.trading_stance)) {
    params.set("ts", profile.trading_stance);
  }
  if (profile.ad_history_public === false) {
    params.set("ahp", "0");
  }
  if (profile.wishlist_public === false) {
    params.set("wlp", "0");
  }
  if (profile.hide_discord_id === true) {
    params.set("hdi", "1");
  }
  if (
    Array.isArray(profile.private_ad_ids) &&
    profile.private_ad_ids.length > 0
  ) {
    const validIds = profile.private_ad_ids
      .filter((s) => /^[0-9a-fA-F-]{8,36}$/.test(s))
      .slice(0, 100);
    if (validIds.length > 0) {
      params.set("pids", validIds.join(","));
    }
  }
  if (
    typeof profile.master_rep_override === "number" &&
    !Number.isNaN(profile.master_rep_override)
  ) {
    params.set("mrepset", String(Math.round(profile.master_rep_override)));
  }

  const qs = params.toString();
  return qs ? `${cleanHex}|${qs}` : cleanHex;
}

export function getBannerCssStyle(
  bannerColor = "#121214",
  accentColor = "#7289da",
  bannerStyle: BannerStyleType = "gradient"
): React.CSSProperties {
  const base = VALID_HEX.test(bannerColor) ? bannerColor : "#121214";
  const accent = VALID_HEX.test(accentColor) ? accentColor : "#7289da";

  switch (bannerStyle) {
    case "solid":
      return { backgroundColor: base };
    case "gradient":
      return {
        backgroundColor: base,
        backgroundImage: `linear-gradient(135deg, ${base} 0%, ${accent}55 100%)`,
      };
    case "grid":
      return {
        backgroundColor: base,
        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(135deg, ${base} 0%, ${accent}40 100%)`,
        backgroundSize: "24px 24px, 24px 24px, 100% 100%",
      };
    case "stripes":
      return {
        backgroundColor: base,
        backgroundImage: `repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 10px, transparent 10px, transparent 20px), linear-gradient(135deg, ${base} 0%, ${accent}45 100%)`,
      };
    case "dots":
      return {
        backgroundColor: base,
        backgroundImage: `radial-gradient(rgba(255,255,255,0.14) 1.25px, transparent 1.25px), linear-gradient(135deg, ${base} 0%, ${accent}45 100%)`,
        backgroundSize: "18px 18px, 100% 100%",
      };
    default:
      return { backgroundColor: base };
  }
}

interface CacheEntry {
  data: UserProfileData;
  timestamp: number;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ProfileState {
  cache: Record<string, CacheEntry>;
  notFoundCache: Record<string, number>;
  popoutUserId: string | null;
  popoutPosition: { x: number; y: number } | null;
  viewingProfileId: string | null;
  returnChannel: string | null;
  openPopout: (userId: string, x: number, y: number) => void;
  closePopout: () => void;
  setViewingProfile: (
    userId: string | null,
    returnChannel?: string | null
  ) => void;
  fetchProfile: (
    userId: string,
    force?: boolean
  ) => Promise<UserProfileData | null>;
  fetchProfiles: (userIds: string[]) => Promise<UserProfileData[]>;
  seedProfile: (rawRow: any) => void;
  updateLocalProfile: (
    userId: string,
    updates: Partial<UserProfileData>
  ) => void;
  saveProfileUpdates: (
    userId: string,
    updates: Partial<UserProfileData>
  ) => Promise<{ error: any }>;
}

const CACHE_TTL = 5 * 60 * 1000;
const NOT_FOUND_TTL = 60 * 1000;

export const useProfileStore = create<ProfileState>((set, get) => ({
  cache: {},
  notFoundCache: {},
  popoutUserId: null,
  popoutPosition: null,
  viewingProfileId: null,
  returnChannel: null,

  openPopout: (userId, x, y) => {
    const currentPopout = get().popoutUserId;
    if (currentPopout === userId) {
      get().closePopout();
      return;
    }
    set({ popoutUserId: userId, popoutPosition: { x, y } });
    get().fetchProfile(userId);
  },

  closePopout: () => set({ popoutUserId: null, popoutPosition: null }),

  setViewingProfile: (userId, returnChannel = null) =>
    set({ viewingProfileId: userId, returnChannel }),

  seedProfile: (rawRow) => {
    if (!rawRow?.id || !UUID_REGEX.test(String(rawRow.id))) return;
    const now = Date.now();
    const unpacked = unpackProfileRow(rawRow);
    set((state) => ({
      cache: {
        ...state.cache,
        [unpacked.id]: { data: unpacked, timestamp: now },
      },
    }));
  },

  fetchProfiles: async (userIds) => {
    const validIds = Array.from(
      new Set(
        userIds
          .map((id) => String(id || "").trim())
          .filter((id) => UUID_REGEX.test(id))
      )
    );
    if (validIds.length === 0) return [];

    const { cache, notFoundCache } = get();
    const now = Date.now();

    const missingIds = validIds.filter((id) => {
      if (cache[id] && now - cache[id].timestamp < CACHE_TTL) return false;
      if (notFoundCache[id] && now - notFoundCache[id] < NOT_FOUND_TTL)
        return false;
      return true;
    });

    if (missingIds.length > 0) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("id", missingIds);

      if (!error && Array.isArray(data)) {
        const foundIds = new Set<string>();
        const newEntries: Record<string, CacheEntry> = {};

        for (const row of data) {
          if (row?.id) {
            const unpacked = unpackProfileRow(row);
            foundIds.add(unpacked.id);
            newEntries[unpacked.id] = { data: unpacked, timestamp: now };
          }
        }

        const newNotFound: Record<string, number> = {};
        for (const id of missingIds) {
          if (!foundIds.has(id)) {
            newNotFound[id] = now;
          }
        }

        set((state) => ({
          cache: { ...state.cache, ...newEntries },
          notFoundCache: { ...state.notFoundCache, ...newNotFound },
        }));
      }
    }

    const latestCache = get().cache;
    return validIds
      .map((id) => latestCache[id]?.data)
      .filter((p): p is UserProfileData => Boolean(p));
  },

  fetchProfile: async (userId, force = false) => {
    if (!userId || !UUID_REGEX.test(userId)) {
      return null;
    }

    const { cache } = get();
    const now = Date.now();

    if (!force && cache[userId] && now - cache[userId].timestamp < CACHE_TTL) {
      return cache[userId].data;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) {
      logger.error('ASTD-UI-001', `Failed to fetch profile for ${userId}: ${error?.message ?? 'unknown'}`);
      set((state) => ({
        notFoundCache: { ...state.notFoundCache, [userId]: now },
      }));
      return null;
    }

    const profileData = unpackProfileRow(data);

    if (profileData.master_rep_override === null) {
      const { data: repLog } = await supabase
        .from("moderation_logs")
        .select("action_type")
        .eq("target_user_id", userId)
        .ilike("action_type", "MASTER REP OVERRIDE:%")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (repLog?.action_type) {
        const match = repLog.action_type.match(/MASTER REP OVERRIDE:\s*([+-]?\d+)/i);
        if (match) {
          const parsed = parseInt(match[1], 10);
          if (!Number.isNaN(parsed)) {
            profileData.global_rep = parsed;
            profileData.master_rep_override = parsed;
          }
        }
      }
    }

    if (profileData.created_at) {
      const jNum = await getJoinNumber(profileData.created_at);
      if (jNum !== null) {
        profileData.join_number = jNum;
      }
    }

    set((state) => ({
      cache: {
        ...state.cache,
        [userId]: { data: profileData, timestamp: now },
      },
    }));

    return profileData;
  },

  updateLocalProfile: (userId, updates) => {
    set((state) => {
      const existing = state.cache[userId];
      if (!existing) return state;
      return {
        cache: {
          ...state.cache,
          [userId]: {
            ...existing,
            data: { ...existing.data, ...updates },
          },
        },
      };
    });
  },

  saveProfileUpdates: async (userId, updates) => {
    // SECURITY: Verify active authenticated session matches target userId
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user || session.user.id !== userId) {
      return { error: new Error("Unauthorized profile update attempt.") };
    }

    const existing = get().cache[userId]?.data;
    const merged: Partial<UserProfileData> = {
      banner_color: updates.banner_color ?? existing?.banner_color ?? "#121214",
      accent_color: updates.accent_color ?? existing?.accent_color ?? "#7289da",
      banner_style: updates.banner_style ?? existing?.banner_style ?? "gradient",
      trading_stance:
        updates.trading_stance ?? existing?.trading_stance ?? "open",
      ad_history_public:
        updates.ad_history_public ?? existing?.ad_history_public ?? true,
      wishlist_public:
        updates.wishlist_public ?? existing?.wishlist_public ?? true,
      hide_discord_id:
        updates.hide_discord_id ?? existing?.hide_discord_id ?? false,
      private_ad_ids:
        updates.private_ad_ids ?? existing?.private_ad_ids ?? [],
      master_rep_override: existing?.master_rep_override ?? null,
    };

    const dbPayload: Record<string, any> = {
      banner_color: packBannerConfig(merged),
    };

    if (typeof updates.bio === "string") {
      dbPayload.bio = updates.bio.trim().substring(0, 190);
      merged.bio = dbPayload.bio;
    }
    if (typeof updates.roblox_username === "string") {
      dbPayload.roblox_username = updates.roblox_username
        .trim()
        .replace(/[^a-zA-Z0-9_]/g, "")
        .substring(0, 30);
      merged.roblox_username = dbPayload.roblox_username;
    }

    // Clean hex in local memory
    if (merged.banner_color && !VALID_HEX.test(merged.banner_color)) {
      merged.banner_color = "#121214";
    }

    // OFFLINE QUEUE INTERCEPTION
    if (!navigator.onLine) {
      const queue: any[] = (await getIdb("astd_offline_profile")) || [];
      queue.push({ userId, updates: dbPayload });
      await setIdb("astd_offline_profile", queue);

      get().updateLocalProfile(userId, merged);
      useToastStore
        .getState()
        .addToast("Offline. Profile changes queued locally.", "info");
      return { error: null };
    }

    const { error } = await supabase
      .from("profiles")
      .update(dbPayload)
      .eq("id", userId);
    if (!error) {
      get().updateLocalProfile(userId, merged);
    }
    return { error };
  },
}));
