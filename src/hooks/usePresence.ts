import { useEffect, useMemo } from "react";
import { create } from "zustand";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";
import {
  useProfileStore,
  UserProfileData,
} from "../store/useProfileStore";
import { getUnitAssetUrl } from "../data/helpers";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const GUEST_STORAGE_KEY = "astd_guest_presence_id";

const ANONYMOUS_UNIT_POOL = [
  { slug: "demise", name: "Anonymous Demise", color: "#8b5cf6" },
  { slug: "slayer-mage", name: "Anonymous Slayer Mage", color: "#3b82f6" },
  { slug: "galaxy-girl", name: "Anonymous Galaxy Girl", color: "#ec4899" },
  { slug: "beardcutter", name: "Anonymous Beardcutter", color: "#ef4444" },
  { slug: "death", name: "Anonymous Death", color: "#6366f1" },
  { slug: "frost-moon", name: "Anonymous Frost Moon", color: "#06b6d4" },
  { slug: "kageni", name: "Anonymous Kageni", color: "#a855f7" },
  { slug: "two-hands", name: "Anonymous Two Hands", color: "#f97316" },
  { slug: "varaq", name: "Anonymous Varaq", color: "#eab308" },
  { slug: "bunny-girl", name: "Anonymous Bunny Girl", color: "#f43f5e" },
  { slug: "club-beast", name: "Anonymous Club Beast", color: "#14b8a6" },
  { slug: "spirit-knight", name: "Anonymous Spirit Knight", color: "#10b981" },
];

export interface GuestPresenceAvatar {
  id: string;
  username: string;
  avatar_url: string;
  accent_color: string;
  isGuest: true;
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function buildGuestAvatar(guestKey: string): GuestPresenceAvatar {
  const idx = hashSeed(guestKey) % ANONYMOUS_UNIT_POOL.length;
  const unit = ANONYMOUS_UNIT_POOL[idx];
  return {
    id: guestKey,
    username: unit.name,
    avatar_url: getUnitAssetUrl(unit.slug) || `/units/${unit.slug}.webp`,
    accent_color: unit.color,
    isGuest: true,
  };
}

function getGuestPresenceKey(): string {
  if (typeof window === "undefined") return "guest:ssr";
  try {
    sessionStorage.removeItem("astd_identity");
    let guestId = sessionStorage.getItem(GUEST_STORAGE_KEY);
    if (!guestId || !guestId.startsWith("guest:")) {
      const randomPart =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      guestId = `guest:${randomPart}`;
      sessionStorage.setItem(GUEST_STORAGE_KEY, guestId);
    }
    return guestId;
  } catch {
    return `guest:${Math.random().toString(36).slice(2, 10)}`;
  }
}

interface PresenceStoreState {
  onlineUserIds: string[];
  presentUserIds: Record<string, boolean>;
  guestKeys: string[];
  guestCount: number;
  setPresenceSnapshot: (userIds: string[], guestKeys: string[]) => void;
}

export const usePresenceStore = create<PresenceStoreState>((set) => ({
  onlineUserIds: [],
  presentUserIds: {},
  guestKeys: [],
  guestCount: 0,
  setPresenceSnapshot: (userIds, guestKeys) => {
    const map: Record<string, boolean> = {};
    for (const id of userIds) {
      map[id] = true;
    }
    set({
      onlineUserIds: userIds,
      presentUserIds: map,
      guestKeys,
      guestCount: guestKeys.length,
    });
  },
}));

let activePresenceChannel: RealtimeChannel | null = null;
let activePresenceKey: string | null = null;
let subscriberCount = 0;

function ensurePresenceChannel(presenceKey: string, userId: string | null) {
  if (activePresenceChannel && activePresenceKey === presenceKey) {
    return;
  }

  if (activePresenceChannel) {
    supabase.removeChannel(activePresenceChannel);
    activePresenceChannel = null;
    activePresenceKey = null;
  }

  activePresenceKey = presenceKey;
  const room = supabase.channel("astd-global", {
    config: { presence: { key: presenceKey } },
  });
  activePresenceChannel = room;

  room
    .on("presence", { event: "sync" }, () => {
      if (activePresenceChannel !== room) return;
      const state = room.presenceState();
      const userIdSet = new Set<string>();
      const guestKeyList: string[] = [];

      for (const [key, presences] of Object.entries(state)) {
        if (!Array.isArray(presences) || presences.length === 0) continue;
        const trimmedKey = key.trim();
        if (UUID_REGEX.test(trimmedKey)) {
          userIdSet.add(trimmedKey);
        } else {
          guestKeyList.push(trimmedKey);
        }
      }

      const uniqueUserIds = Array.from(userIdSet);
      usePresenceStore
        .getState()
        .setPresenceSnapshot(uniqueUserIds, guestKeyList);

      if (uniqueUserIds.length > 0) {
        void useProfileStore.getState().fetchProfiles(uniqueUserIds);
      }
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED" && activePresenceChannel === room) {
        const legacyUnit =
          ANONYMOUS_UNIT_POOL[
            hashSeed(presenceKey) % ANONYMOUS_UNIT_POOL.length
          ];
        await room.track({
          id: presenceKey,
          name: legacyUnit.name.replace(/^Anonymous\s+/i, ""),
          color: legacyUnit.color,
          unitId: legacyUnit.slug,
          user_id: userId,
          online_at: new Date().toISOString(),
        });
      }
    });
}

function releasePresenceChannel() {
  if (subscriberCount <= 0 && activePresenceChannel) {
    supabase.removeChannel(activePresenceChannel);
    activePresenceChannel = null;
    activePresenceKey = null;
  }
}

export type StatusPreference = "online" | "dnd" | "invisible";
export type EffectiveStatus = "online" | "dnd" | "invisible" | "offline";

export const STATUS_COLORS: Record<EffectiveStatus, string> = {
  online: "#23a559",
  dnd: "#ef4444",
  invisible: "#888888",
  offline: "#888888",
};

export function normalizeStatusPreference(
  rawStatus?: string | null
): StatusPreference {
  if (rawStatus === "dnd") return "dnd";
  if (rawStatus === "invisible") return "invisible";
  return "online";
}

export function getEffectiveStatus({
  userId,
  preferredStatus,
  presentUserIds,
  viewerUserId,
  includeInvisibleForSelf = false,
}: {
  userId: string | null | undefined;
  preferredStatus?: string | null;
  presentUserIds: Record<string, boolean>;
  viewerUserId?: string | null;
  includeInvisibleForSelf?: boolean;
}): EffectiveStatus {
  if (!userId || !presentUserIds[userId]) {
    return "offline";
  }

  const preference = normalizeStatusPreference(preferredStatus);

  if (preference === "invisible") {
    if (includeInvisibleForSelf && viewerUserId && userId === viewerUserId) {
      return "invisible";
    }
    return "offline";
  }

  if (preference === "dnd") {
    return "dnd";
  }

  return "online";
}

export function useStatusPreference(): StatusPreference {
  const rawStatus = useAuthStore((s) => s.profile?.status);
  return normalizeStatusPreference(rawStatus);
}

export function useEffectiveStatus(
  userId: string | null | undefined,
  fallbackPreferredStatus?: string | null,
  options?: { includeInvisibleForSelf?: boolean }
): EffectiveStatus {
  const isPresent = usePresenceStore((s) =>
    userId ? Boolean(s.presentUserIds[userId]) : false
  );
  const viewerUserId = useAuthStore((s) => s.profile?.id ?? null);
  const selfStatus = useAuthStore((s) =>
    userId && s.profile?.id === userId ? s.profile.status : undefined
  );
  const cachedStatus = useProfileStore((s) =>
    userId ? s.cache[userId]?.data?.status : undefined
  );

  const preferredStatus =
    selfStatus ?? cachedStatus ?? fallbackPreferredStatus ?? "online";

  if (!userId || !isPresent) {
    return "offline";
  }

  const preference = normalizeStatusPreference(preferredStatus);
  if (preference === "invisible") {
    if (
      options?.includeInvisibleForSelf &&
      viewerUserId &&
      userId === viewerUserId
    ) {
      return "invisible";
    }
    return "offline";
  }

  if (preference === "dnd") {
    return "dnd";
  }

  return "online";
}

export interface PresenceResult {
  users: UserProfileData[];
  guestUsers: GuestPresenceAvatar[];
  guestCount: number;
  totalCount: number;
  presentUserIds: Record<string, boolean>;
}

export function usePresence(): PresenceResult {
  const authProfile = useAuthStore((s) => s.profile);
  const authProfileId = authProfile?.id ?? null;
  const onlineUserIds = usePresenceStore((s) => s.onlineUserIds);
  const presentUserIds = usePresenceStore((s) => s.presentUserIds);
  const guestKeys = usePresenceStore((s) => s.guestKeys);
  const profileCache = useProfileStore((s) => s.cache);

  useEffect(() => {
    subscriberCount += 1;
    const presenceKey = authProfileId || getGuestPresenceKey();
    ensurePresenceChannel(presenceKey, authProfileId);

    return () => {
      subscriberCount = Math.max(0, subscriberCount - 1);
      releasePresenceChannel();
    };
  }, [authProfileId]);

  useEffect(() => {
    if (onlineUserIds.length > 0) {
      void useProfileStore.getState().fetchProfiles(onlineUserIds);
    }
  }, [onlineUserIds]);

  const { visibleOnlineUsers, guestAvatars } = useMemo(() => {
    const resolved: UserProfileData[] = [];
    const guests: GuestPresenceAvatar[] = [];
    const seen = new Set<string>();

    for (const id of onlineUserIds) {
      if (seen.has(id)) continue;
      seen.add(id);

      const entry: UserProfileData | null =
        profileCache[id]?.data ||
        (authProfile && authProfile.id === id
          ? {
              ...authProfile,
              avatar_url: authProfile.avatar_url || "",
              bio: "",
              banner_color: "#5865F2",
              roblox_username: "",
              global_rep: 0,
            }
          : null);

      if (!entry) {
        // Profile still loading: show as anonymous bubble until profile resolves
        guests.push(buildGuestAvatar(`pending:${id}`));
        continue;
      }

      if (entry.role === "banned") continue;

      if (normalizeStatusPreference(entry.status) === "invisible") {
        // Invisible signed-in users blend into anonymous visitors so their identity is hidden
        guests.push(buildGuestAvatar(`invisible:${hashSeed(id)}`));
      } else {
        resolved.push(entry);
      }
    }

    for (const gKey of guestKeys) {
      guests.push(buildGuestAvatar(gKey));
    }

    return { visibleOnlineUsers: resolved, guestAvatars: guests };
  }, [onlineUserIds, guestKeys, profileCache, authProfile]);

  const effectiveGuestCount = guestAvatars.length;
  const totalCount = visibleOnlineUsers.length + effectiveGuestCount;

  return {
    users: visibleOnlineUsers,
    guestUsers: guestAvatars,
    guestCount: effectiveGuestCount,
    totalCount,
    presentUserIds,
  };
}
