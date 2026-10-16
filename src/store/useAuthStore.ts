import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { Session, RealtimeChannel } from "@supabase/supabase-js";

import { logger } from "../lib/logger";
export interface UserProfile {
  id: string;
  discord_id: string;
  username: string;
  avatar_url: string;
  role: "user" | "mod" | "admin" | "master" | "banned";
  created_at: string;
  status: "online" | "dnd" | "invisible" | "offline";
}

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  loginWithDiscord: () => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  initialize: () => void;
  updateStatus: (status: UserProfile["status"]) => Promise<void>;
  syncDiscordAvatar: () => Promise<boolean>;
  updateAvatarUrl: (url: string) => Promise<boolean>;
  deleteAccount: (
    confirmationPhrase: string
  ) => Promise<{ success: boolean; error?: string }>;
}

import { del as delIdb } from "idb-keyval";
import { useToastStore } from "./useToastStore";
import { useProfileStore } from "./useProfileStore";
import {
  sanitizeUsername,
  resolveSafeUsername,
  extractDiscordId,
  extractDiscordUsername,
  extractDiscordAvatar,
} from "../data/helpers";

const STATUS_DISPLAY_LABELS: Record<UserProfile["status"], string> = {
  online: "Online",
  dnd: "Do Not Disturb",
  invisible: "Invisible",
  offline: "Offline",
};

const OFFLINE_QUEUE_KEYS = [
  "astd_offline_profile",
  "astd_offline_wishlist",
  "astd_offline_inventory",
  "astd_offline_comments",
  "astd_offline_ads",
];

const clearLocalAuthCache = () => {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("sb-")) {
      localStorage.removeItem(key);
    }
  }
  for (const qKey of OFFLINE_QUEUE_KEYS) {
    void delIdb(qKey).catch(() => {});
  }
};

let activeProfileChannel: RealtimeChannel | null = null;

// SECURITY FIX: Sanitize the Supabase session object in both memory AND localStorage
// to prevent Discord provider_token / provider_refresh_token leakage via XSS.
const sanitizeSession = (rawSession: Session | null): Session | null => {
  if (!rawSession) return null;
  const safeSession = { ...rawSession };

  // Strip dangerous OAuth tokens from memory state
  delete safeSession.provider_token;
  delete safeSession.provider_refresh_token;

  // Also scrub any persisted sb-* session token in localStorage
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const raw = localStorage.getItem(key);
        if (raw && (raw.includes("provider_token") || raw.includes("provider_refresh_token"))) {
          const parsed = JSON.parse(raw);
          delete parsed.provider_token;
          delete parsed.provider_refresh_token;
          localStorage.setItem(key, JSON.stringify(parsed));
        }
      }
    }
  } catch {
    // Ignore storage parse errors
  }

  return safeSession;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  isLoading: true,

  loginWithDiscord: async () => {
    const { addToast, updateToast } = useToastStore.getState();
    const toastId = addToast("Redirecting to Discord…", "loading", {
      id: "discord-auth-login",
    });

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      logger.error('ASTD-UI-005', 'Discord OAuth login failed', { error });
      updateToast(toastId, {
        message:
          "Could not start Discord login. Clear your browser cache or try again.",
        type: "error",
        action: {
          label: "Retry",
          onClick: () => {
            void get().loginWithDiscord();
          },
        },
      });
    }
  },

  logout: async () => {
    const { addToast, updateToast } = useToastStore.getState();
    const toastId = addToast("Signing out…", "loading", {
      id: "discord-auth-logout",
    });

    if (activeProfileChannel) {
      supabase.removeChannel(activeProfileChannel);
      activeProfileChannel = null;
    }

    await supabase.auth.signOut();
    clearLocalAuthCache();
    set({ session: null, profile: null });
    updateToast(toastId, {
      message: "Signed out. Continuing in Guest mode.",
      type: "info",
    });
  },

  updateStatus: async (status) => {
    const { profile } = get();
    if (!profile || profile.status === status) return;

    const previousStatus = profile.status;

    try {
      localStorage.removeItem("astd_manual_status");
    } catch {
      // Ignore storage errors
    }

    set({ profile: { ...profile, status } });
    useProfileStore.getState().updateLocalProfile(profile.id, { status });

    const { error } = await supabase
      .from("profiles")
      .update({ status })
      .eq("id", profile.id);

    if (error) {
      set({ profile: { ...profile, status: previousStatus } });
      useProfileStore
        .getState()
        .updateLocalProfile(profile.id, { status: previousStatus });
      useToastStore.getState().addToast(
        "Could not update your status. Try again.",
        "error",
        {
          action: {
            label: "Retry",
            onClick: () => {
              void get().updateStatus(status);
            },
          },
        }
      );
      return;
    }

    useToastStore
      .getState()
      .addToast(
        `Status set to ${STATUS_DISPLAY_LABELS[status] || status}.`,
        "success"
      );
  },

  fetchProfile: async (userId: string) => {
    let { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    const currentSession = get().session;
    const sessionUser =
      currentSession?.user && currentSession.user.id === userId
        ? currentSession.user
        : null;

    // Auto-heal missing profile row (e.g. trigger failure or first-time login)
    if (!data && sessionUser) {
      const extractedDiscordId = extractDiscordId(sessionUser) || "";
      const extractedName = extractDiscordUsername(sessionUser);
      const safeUsername = resolveSafeUsername(extractedName, {
        discordId: extractedDiscordId,
        userId,
      });
      const extractedAvatar = extractDiscordAvatar(sessionUser) || "";

      const defaultRow = {
        id: userId,
        discord_id: extractedDiscordId,
        username: safeUsername,
        avatar_url: extractedAvatar,
        role: "user" as const,
        status: "online" as const,
        global_rep: 0,
        bio: "",
        banner_color: "#121214",
        roblox_username: "",
      };

      try {
        const { data: upserted, error: upsertError } = await supabase
          .from("profiles")
          .upsert(defaultRow, { onConflict: "id" })
          .select("*")
          .maybeSingle();

        if (!upsertError && upserted) {
          data = upserted;
          error = null;
        } else {
          // If RLS blocked upsert or select, use safe in-memory profile
          data = { ...defaultRow, created_at: new Date().toISOString() };
          error = null;
        }
      } catch {
        data = { ...defaultRow, created_at: new Date().toISOString() };
        error = null;
      }
    }

    if (error && !data) {
      logger.error("ASTD-UI-001", `Error fetching profile for ${userId}: ${error.message}`);
      return;
    }

    if (data) {
      // 1. Auto-heal missing or invalid discord_id from current Discord session
      if (
        sessionUser &&
        (!data.discord_id || !/^\d{17,21}$/.test(String(data.discord_id).trim()))
      ) {
        const extractedId = extractDiscordId(sessionUser);
        if (extractedId && extractedId !== data.discord_id) {
          data.discord_id = extractedId;
          void supabase
            .from("profiles")
            .update({ discord_id: extractedId })
            .eq("id", userId);
        }
      }

      // 2. Auto-heal empty, invisible, or missing username
      const sanitizedCurrentUsername = sanitizeUsername(data.username);
      if (!sanitizedCurrentUsername) {
        const extractedName = sessionUser ? extractDiscordUsername(sessionUser) : null;
        const resolvedName = resolveSafeUsername(extractedName, {
          joinNumber: data.join_number,
          discordId: data.discord_id,
          userId,
        });
        data.username = resolvedName;
        void supabase
          .from("profiles")
          .update({ username: resolvedName })
          .eq("id", userId);
      } else {
        data.username = sanitizedCurrentUsername;
      }

      // 3. Auto-sync fresh Discord avatar if changed on Discord
      if (sessionUser) {
        const freshAvatar = extractDiscordAvatar(sessionUser);
        if (
          freshAvatar &&
          typeof freshAvatar === "string" &&
          freshAvatar !== data.avatar_url
        ) {
          data.avatar_url = freshAvatar;
          void supabase
            .from("profiles")
            .update({ avatar_url: freshAvatar })
            .eq("id", userId);
        }
      }

      // 4. Status migration for legacy local preferences
      let legacyLocalPreference: string | null = null;
      try {
        legacyLocalPreference = localStorage.getItem("astd_manual_status");
        if (legacyLocalPreference) {
          localStorage.removeItem("astd_manual_status");
        }
      } catch {
        // Ignore storage errors
      }

      const isValidPreference =
        data.status === "online" ||
        data.status === "dnd" ||
        data.status === "invisible";

      if (!isValidPreference && data.role !== "banned") {
        const migratedPreference: UserProfile["status"] =
          legacyLocalPreference === "dnd" || legacyLocalPreference === "invisible"
            ? legacyLocalPreference
            : "online";
        const { error: migrateError } = await supabase
          .from("profiles")
          .update({ status: migratedPreference })
          .eq("id", userId);
        if (!migrateError) {
          data.status = migratedPreference;
        } else {
          data.status = migratedPreference;
        }
      }

      // Final guarantee: username is always safe and readable
      data.username = resolveSafeUsername(data.username, {
        joinNumber: data.join_number,
        discordId: data.discord_id,
        userId: data.id,
      });

      set({ profile: data as UserProfile });
      useProfileStore.getState().seedProfile(data);

      if (activeProfileChannel) {
        supabase.removeChannel(activeProfileChannel);
        activeProfileChannel = null;
      }

      activeProfileChannel = supabase.channel(`user-profile-${userId}`);
      activeProfileChannel
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${userId}`,
          },
          async (payload) => {
            const updatedProfile = payload.new as UserProfile;
            if (updatedProfile.role === "banned") {
              get().logout();
            } else {
              updatedProfile.username = resolveSafeUsername(updatedProfile.username, {
                joinNumber: (updatedProfile as any).join_number,
                discordId: updatedProfile.discord_id,
                userId: updatedProfile.id,
              });
              set({ profile: updatedProfile });
              useProfileStore.getState().seedProfile(payload.new);
            }
          }
        )
        .subscribe();
    }
  },

  syncDiscordAvatar: async () => {
    const { session, profile } = get();
    if (!session?.user || !profile) return false;

    try {
      // 1. Force refresh session to pull down fresh Discord claims if token permits
      try {
        await supabase.auth.refreshSession();
      } catch {
        // Continue if offline or network throttle
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const freshAvatar =
        user?.user_metadata?.avatar_url ||
        user?.user_metadata?.picture ||
        user?.identities?.[0]?.identity_data?.avatar_url;

      if (freshAvatar && typeof freshAvatar === "string") {
        const { error } = await supabase
          .from("profiles")
          .update({ avatar_url: freshAvatar })
          .eq("id", profile.id);

        if (!error) {
          set({ profile: { ...profile, avatar_url: freshAvatar } });
          useProfileStore
            .getState()
            .updateLocalProfile(profile.id, { avatar_url: freshAvatar });
          useToastStore
            .getState()
            .addToast("Avatar synced with Discord successfully!", "success");
          return true;
        }
      }
      useToastStore
        .getState()
        .addToast("Avatar is already up to date with Discord.", "info");
      return false;
    } catch {
      useToastStore
        .getState()
        .addToast("Could not sync Discord avatar. Try again.", "error");
      return false;
    }
  },

  updateAvatarUrl: async (newAvatarUrl: string) => {
    const { profile } = get();
    if (!profile) return false;

    const trimmed = (newAvatarUrl || "").trim();
    if (trimmed && !trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("data:image/")) {
      useToastStore.getState().addToast("Avatar URL must be a valid http(s) link or data URI.", "error");
      return false;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: trimmed })
        .eq("id", profile.id);

      if (!error) {
        set({ profile: { ...profile, avatar_url: trimmed } });
        useProfileStore
          .getState()
          .updateLocalProfile(profile.id, { avatar_url: trimmed });
        useToastStore
          .getState()
          .addToast("Avatar updated successfully!", "success");
        return true;
      }
      useToastStore.getState().addToast("Failed to update avatar in database.", "error");
      return false;
    } catch {
      useToastStore.getState().addToast("Error updating avatar.", "error");
      return false;
    }
  },

  deleteAccount: async (confirmationPhrase: string) => {
    const { session, profile } = get();
    if (!session?.access_token || !profile) {
      return { success: false, error: "Authentication required." };
    }

    try {
      const res = await fetch("/api/deleteAccount", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          confirmation: confirmationPhrase,
          targetUserId: profile.id,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          success: false,
          error: data.error || "Failed to delete account. Please try again.",
        };
      }

      if (activeProfileChannel) {
        supabase.removeChannel(activeProfileChannel);
        activeProfileChannel = null;
      }

      clearLocalAuthCache();
      await supabase.auth.signOut().catch(() => {});
      useProfileStore.setState({ cache: {}, notFoundCache: {} });
      set({ session: null, profile: null });

      useToastStore
        .getState()
        .addToast("Your account and data have been permanently deleted.", "info");

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "An unexpected network error occurred.",
      };
    }
  },

  initialize: () => {
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) clearLocalAuthCache();

      const safeSession = sanitizeSession(session);
      if (safeSession?.user) {
        set({ session: safeSession });
        try {
          await get().fetchProfile(safeSession.user.id);
        } finally {
          set({ isLoading: false });
        }
      } else {
        set({ session: null, profile: null, isLoading: false });
      }
    });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const safeSession = sanitizeSession(session);
      if (safeSession?.user) {
        set({ session: safeSession });
        try {
          await get().fetchProfile(safeSession.user.id);
        } finally {
          set({ isLoading: false });
        }
      } else {
        if (activeProfileChannel) {
          supabase.removeChannel(activeProfileChannel);
          activeProfileChannel = null;
        }
        set({ session: null, profile: null, isLoading: false });
      }
    });
  },
}));
