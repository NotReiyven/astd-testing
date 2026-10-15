import React from "react";
import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { logger } from '../lib/logger';
import { get as getIdb, set as setIdb } from 'idb-keyval';
import { useToastStore } from "./useToastStore";
import {
  formatRoleLabel,
  getStandardRoleColor,
  getStandardRoleRank,
} from "../app/components/shared/DiscordRolePill";

export type BannerStyleType =
  | "solid"
  | "gradient"
  | "carbon"
  | "mesh"
  | "waves"
  | "circuit"
  | "aurora"
  | "grid"
  | "stripes"
  | "dots"
  | "obsidian"
  | "topography"
  | "cyber"
  | "constellation";

export type TradingStanceType =
  | "open"
  | "upgrading"
  | "downgrading"
  | "wishlist"
  | "afk";

export interface EarlyRoleBadge {
  id: "founder" | "og" | "veteran";
  label: string;
  dotColor: string;
  bg: string;
  border: string;
  color: string;
  tooltip: string;
}

export function getEarlyUserRole(
  joinNumber?: number | null
): EarlyRoleBadge | null {
  if (typeof joinNumber !== "number" || joinNumber <= 0) return null;
  if (joinNumber <= 5) {
    return {
      id: "founder",
      label: "Founder",
      dotColor: "#000000",
      bg: "#f59e0b",
      border: "rgba(0, 0, 0, 0.25)",
      color: "#000000",
      tooltip: "Early Adopter: Top 5 Founding Member",
    };
  }
  if (joinNumber <= 25) {
    return {
      id: "og",
      label: "OG",
      dotColor: "#000000",
      bg: "#f97316",
      border: "rgba(0, 0, 0, 0.25)",
      color: "#000000",
      tooltip: "Early Adopter: Top 25 Community Member",
    };
  }
  if (joinNumber <= 100) {
    return {
      id: "veteran",
      label: "Veteran",
      dotColor: "#ffffff",
      bg: "#0284c7",
      border: "rgba(255, 255, 255, 0.25)",
      color: "#ffffff",
      tooltip: "Early Adopter: Top 100 Community Member",
    };
  }
  return null;
}

export interface UserRoleBadge {
  id: string;
  name: string;
  label: string;
  color: string;
  rank: number;
}

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
  banner_image_url?: string;
  trading_stance?: TradingStanceType;
  ad_history_public?: boolean;
  wishlist_public?: boolean;
  hide_discord_id?: boolean;
  private_ad_ids?: string[];
  master_rep_override?: number | null;
  join_number?: number;
  assigned_roles?: string[];
  role_details?: UserRoleBadge[];
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


const VALID_HEX = /^#[0-9A-Fa-f]{6}$/;
const VALID_STYLES: BannerStyleType[] = [
  "solid",
  "gradient",
  "carbon",
  "mesh",
  "waves",
  "circuit",
  "aurora",
  "grid",
  "stripes",
  "dots",
  "obsidian",
  "topography",
  "cyber",
  "constellation",
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
  let banner_image_url: string | undefined = undefined;
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

      const burl = params.get("burl");
      if (burl) {
        let cleanBurl = burl;
        if (cleanBurl.includes("%25") || cleanBurl.includes("%3A") || cleanBurl.includes("%2F")) {
          try {
            cleanBurl = decodeURIComponent(cleanBurl);
          } catch {
            // Keep cleanBurl
          }
        }
        banner_image_url = cleanBurl;
      }

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

  // Unpack user roles from relational query or assigned array
  let assigned_roles: string[] = [];
  const roleDetailsMap = new Map<string, UserRoleBadge>();

  if (Array.isArray(raw?.user_roles)) {
    for (const ur of raw.user_roles) {
      const rName = ur?.roles?.name || ur?.role_name || (typeof ur === "string" ? ur : null);
      if (typeof rName === "string" && rName.trim()) {
        const cleanName = rName.trim();
        const roleRank = typeof ur?.roles?.rank === "number" ? ur.roles.rank : getStandardRoleRank(cleanName);
        const roleColor = ur?.roles?.color || getStandardRoleColor(cleanName);
        roleDetailsMap.set(cleanName.toLowerCase(), {
          id: cleanName.toLowerCase(),
          name: cleanName,
          label: formatRoleLabel(cleanName),
          color: roleColor,
          rank: roleRank,
        });
      }
    }
  }

  if (Array.isArray(raw?.assigned_roles)) {
    for (const rName of raw.assigned_roles) {
      if (typeof rName === "string" && rName.trim()) {
        const cleanName = rName.trim();
        if (!roleDetailsMap.has(cleanName.toLowerCase())) {
          roleDetailsMap.set(cleanName.toLowerCase(), {
            id: cleanName.toLowerCase(),
            name: cleanName,
            label: formatRoleLabel(cleanName),
            color: getStandardRoleColor(cleanName),
            rank: getStandardRoleRank(cleanName),
          });
        }
      }
    }
  }

  // Ensure base profile.role is included if special
  if (raw?.role && raw.role !== "user" && !roleDetailsMap.has(raw.role.toLowerCase())) {
    roleDetailsMap.set(raw.role.toLowerCase(), {
      id: raw.role.toLowerCase(),
      name: raw.role,
      label: formatRoleLabel(raw.role),
      color: getStandardRoleColor(raw.role),
      rank: getStandardRoleRank(raw.role),
    });
  }

  const role_details = Array.from(roleDetailsMap.values()).sort((a, b) => a.rank - b.rank);
  assigned_roles = role_details.map((r) => r.name);

  return {
    ...raw,
    global_rep: resolvedRep,
    banner_color: cleanHex,
    accent_color,
    banner_style,
    banner_image_url,
    trading_stance,
    ad_history_public,
    wishlist_public,
    hide_discord_id,
    private_ad_ids,
    master_rep_override,
    join_number:
      typeof raw?.join_number === "number" ? raw.join_number : undefined,
    assigned_roles,
    role_details,
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
  if (profile.banner_image_url && typeof profile.banner_image_url === "string" && profile.banner_image_url.trim()) {
    params.set("burl", profile.banner_image_url.trim());
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
  bannerStyle: BannerStyleType = "gradient",
  bannerImageUrl?: string
): React.CSSProperties {
  const base = VALID_HEX.test(bannerColor) ? bannerColor : "#121214";
  const accent = VALID_HEX.test(accentColor) ? accentColor : "#7289da";

  if (bannerImageUrl) {
    return {
      backgroundColor: base,
      backgroundImage: `url(${bannerImageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }

  switch (bannerStyle) {
    case "solid":
      return { backgroundColor: base };
    case "gradient":
      return {
        backgroundColor: base,
        backgroundImage: `linear-gradient(135deg, ${base} 0%, ${accent}55 100%)`,
      };
    case "carbon":
      return {
        backgroundColor: base,
        backgroundImage: `repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 4px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 4px), linear-gradient(135deg, ${base} 0%, ${accent}40 100%)`,
        backgroundSize: "8px 8px, 8px 8px, 100% 100%",
      };
    case "mesh":
      return {
        backgroundColor: base,
        backgroundImage: `radial-gradient(circle at 15% 25%, ${accent}55 0%, transparent 55%), radial-gradient(circle at 85% 75%, ${base} 0%, transparent 65%), linear-gradient(135deg, ${base} 0%, #060608 100%)`,
      };
    case "waves":
      return {
        backgroundColor: base,
        backgroundImage: `repeating-radial-gradient(ellipse at 50% -20%, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 14px), linear-gradient(135deg, ${base} 0%, ${accent}45 100%)`,
      };
    case "circuit":
      return {
        backgroundColor: base,
        backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.04) 1px, transparent 1px), radial-gradient(circle at 100% 0%, ${accent}50 0%, transparent 60%), linear-gradient(135deg, ${base} 0%, #0a0a0e 100%)`,
        backgroundSize: "28px 28px, 28px 28px, 100% 100%, 100% 100%",
      };
    case "aurora":
      return {
        backgroundColor: base,
        backgroundImage: `radial-gradient(ellipse at 20% 0%, ${accent}60 0%, transparent 70%), radial-gradient(ellipse at 80% 100%, ${accent}35 0%, transparent 60%), linear-gradient(135deg, ${base} 0%, #0b0c10 100%)`,
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
    case "obsidian":
      return {
        backgroundColor: base,
        backgroundImage: `linear-gradient(30deg, rgba(255,255,255,0.03) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.03) 87.5%, rgba(255,255,255,0.03)), linear-gradient(150deg, rgba(255,255,255,0.03) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.03) 87.5%, rgba(255,255,255,0.03)), linear-gradient(60deg, rgba(255,255,255,0.04) 25%, transparent 25.5%, transparent 75%, rgba(255,255,255,0.04) 75%, rgba(255,255,255,0.04)), linear-gradient(135deg, ${base} 0%, ${accent}35 100%)`,
        backgroundSize: "40px 70px, 40px 70px, 40px 70px, 100% 100%",
      };
    case "topography":
      return {
        backgroundColor: base,
        backgroundImage: `repeating-radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 2px, transparent 2px, transparent 18px), repeating-radial-gradient(ellipse at 15% 85%, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 22px), linear-gradient(135deg, ${base} 0%, ${accent}45 100%)`,
      };
    case "cyber":
      return {
        backgroundColor: base,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px), radial-gradient(circle at 50% 50%, ${accent}50 0%, transparent 60%), linear-gradient(135deg, ${base} 0%, #050608 100%)`,
        backgroundSize: "16px 16px, 16px 16px, 100% 100%, 100% 100%",
      };
    case "constellation":
      return {
        backgroundColor: base,
        backgroundImage: `radial-gradient(circle at 20% 30%, rgba(255,255,255,0.7) 1px, transparent 1.5px), radial-gradient(circle at 80% 25%, rgba(255,255,255,0.8) 1.5px, transparent 2px), radial-gradient(circle at 45% 65%, rgba(255,255,255,0.6) 1px, transparent 1.5px), radial-gradient(circle at 70% 80%, rgba(255,255,255,0.75) 1.2px, transparent 1.8px), radial-gradient(circle at 10% 85%, rgba(255,255,255,0.5) 1px, transparent 1.5px), linear-gradient(135deg, ${base} 0%, ${accent}50 100%)`,
        backgroundSize: "120px 120px, 160px 160px, 100px 100px, 140px 140px, 90px 90px, 100% 100%",
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
      let data: any[] | null = null;
      let error: any = null;

      try {
        const res = await supabase
          .from("profiles")
          .select("*, user_roles(roles(name, color, rank))")
          .in("id", missingIds);
        data = res.data;
        error = res.error;
      } catch (e) {
        error = e;
      }

      if (error || !data) {
        const fallbackRes = await supabase
          .from("profiles")
          .select("*")
          .in("id", missingIds);
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

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
    if (!userId) return null;
    const cleanId = userId.trim();
    const { cache } = get();
    const now = Date.now();

    if (!force) {
      if (cache[cleanId] && now - cache[cleanId].timestamp < CACHE_TTL) {
        return cache[cleanId].data;
      }
      const match = Object.values(cache).find(
        (c) =>
          c.data.id === cleanId ||
          c.data.discord_id === cleanId ||
          c.data.username?.toLowerCase() === cleanId.toLowerCase()
      );
      if (match && now - match.timestamp < CACHE_TTL) {
        return match.data;
      }
    }

    let query = supabase
      .from("profiles")
      .select("*, user_roles(roles(name, color, rank))");
    if (UUID_REGEX.test(cleanId)) {
      query = query.eq("id", cleanId);
    } else if (/^\d{17,21}$/.test(cleanId)) {
      query = query.eq("discord_id", cleanId);
    } else {
      query = query.ilike("username", cleanId);
    }

    let { data, error } = await query.maybeSingle();

    if (error || !data) {
      // Fallback query without relational join if restricted
      let fallbackQuery = supabase.from("profiles").select("*");
      if (UUID_REGEX.test(cleanId)) {
        fallbackQuery = fallbackQuery.eq("id", cleanId);
      } else if (/^\d{17,21}$/.test(cleanId)) {
        fallbackQuery = fallbackQuery.eq("discord_id", cleanId);
      } else {
        fallbackQuery = fallbackQuery.ilike("username", cleanId);
      }
      const fallbackRes = await fallbackQuery.maybeSingle();
      if (!fallbackRes.error && fallbackRes.data) {
        data = fallbackRes.data;
        error = null;
      }
    }

    if (error || !data) {
      logger.error('ASTD-UI-001', `Failed to fetch profile for ${cleanId}: ${error?.message ?? 'unknown'}`);
      set((state) => ({
        notFoundCache: { ...state.notFoundCache, [cleanId]: now },
      }));
      return null;
    }

    const profileData = unpackProfileRow(data);
    const resolvedId = profileData.id;

    if (profileData.master_rep_override === null) {
      const { data: repLog } = await supabase
        .from("moderation_logs")
        .select("action_type")
        .eq("target_user_id", resolvedId)
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
        [resolvedId]: { data: profileData, timestamp: now },
        ...(profileData.discord_id
          ? { [profileData.discord_id]: { data: profileData, timestamp: now } }
          : {}),
        [cleanId]: { data: profileData, timestamp: now },
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
      banner_image_url:
        "banner_image_url" in updates
          ? (updates.banner_image_url || undefined)
          : existing?.banner_image_url,
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
    if (typeof updates.avatar_url === "string") {
      dbPayload.avatar_url = updates.avatar_url.trim();
      merged.avatar_url = dbPayload.avatar_url;
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
