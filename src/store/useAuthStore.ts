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
}

import { del as delIdb } from "idb-keyval";
import { useToastStore } from "./useToastStore";
import { useProfileStore } from "./useProfileStore";

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
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return;
    }

    if (data) {
      let legacyLocalPreference: string | null = null;
      try {
        legacyLocalPreference = localStorage.getItem("astd_manual_status");
        if (legacyLocalPreference) {
          localStorage.removeItem("astd_manual_status");
        }
      } catch {
        // Ignore storage errors
      }

      // Only migrate if the DB row has legacy "offline" (or invalid) status;
      // never overwrite a persisted "online", "dnd", or "invisible" preference.
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

      // Auto-sync fresh Discord avatar if user changed it on Discord
      const currentSession = get().session;
      if (currentSession?.user && currentSession.user.id === userId) {
        const metadataAvatar =
          currentSession.user.user_metadata?.avatar_url ||
          currentSession.user.user_metadata?.picture ||
          currentSession.user.identities?.[0]?.identity_data?.avatar_url;

        if (
          metadataAvatar &&
          typeof metadataAvatar === "string" &&
          metadataAvatar !== data.avatar_url
        ) {
          data.avatar_url = metadataAvatar;
          void supabase
            .from("profiles")
            .update({ avatar_url: metadataAvatar })
            .eq("id", userId);
        }
      }

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

  initialize: () => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) clearLocalAuthCache();
      
      const safeSession = sanitizeSession(session);
      set({ session: safeSession, isLoading: false });
      
      if (safeSession?.user) {
        get().fetchProfile(safeSession.user.id);
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      const safeSession = sanitizeSession(session);
      set({ session: safeSession, isLoading: false });
      
      if (safeSession?.user) {
        get().fetchProfile(safeSession.user.id);
      } else {
        if (activeProfileChannel) {
          supabase.removeChannel(activeProfileChannel);
          activeProfileChannel = null;
        }
        set({ profile: null });
      }
    });
  },
}));
