import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { TradeCard } from "../types";
import DOMPurify from "dompurify";
import { get as getIdb, set as setIdb } from "idb-keyval";
import { useToastStore } from "./useToastStore";
import { useProfileStore } from "./useProfileStore";
import { useAuthStore } from "./useAuthStore";

export interface TradingAd {
  id: string;
  user_id: string;
  ad_type: "standard" | "lf_offers" | "inventory";
  give_items: TradeCard[];
  get_items: TradeCard[];
  note: string;
  created_at: string;
  expires_at: string;
  profiles?: {
    username: string;
    avatar_url: string;
    role: string;
    discord_id: string;
    status: "online" | "dnd" | "invisible" | "offline";
  };
}

interface FetchHistoryOptions {
  isOwner: boolean;
  adHistoryPublic?: boolean;
  privateAdIds?: string[];
}

interface TradingAdsState {
  ads: TradingAd[];
  userAdHistory: TradingAd[];
  isLoading: boolean;
  isLoadingHistory: boolean;
  fetchAds: () => Promise<void>;
  fetchUserAdHistory: (
    userId: string,
    options: FetchHistoryOptions
  ) => Promise<void>;
  subscribeToAds: () => () => void;
  deleteAd: (id: string) => Promise<boolean>;
  repostAd: (ad: TradingAd) => Promise<boolean>;
  createAd: (adData: any) => Promise<{ error: any | null }>;
  fetchAdById: (id: string) => Promise<TradingAd | null>;
}

const containsPhishingOrLink = (text: string) => {
  const normalized = text.normalize("NFKD").toLowerCase();
  const stripped = normalized
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, "")
    .replace(/(\s|\[|\]|\(|\)|\{|\}|\*|_|-|~|`|\||\\|\/)+/g, "")
    .replace(/[аа]/g, "a")
    .replace(/[оо]/g, "o")
    .replace(/[ее]/g, "e")
    .replace(/[сс]/g, "c")
    .replace(/dot/g, ".");

  const aggressivePattern =
    /(https?:|www\.|[a-z0-9]+\.(com|net|org|gg|ru|io|me|co|xyz|to|link|tk)|discord\.gg|discordgg|t\.me|bit\.ly)/i;

  return aggressivePattern.test(stripped);
};

export const useTradingAdsStore = create<TradingAdsState>((set, get) => ({
  ads: [],
  userAdHistory: [],
  isLoading: true,
  isLoadingHistory: false,

  fetchAds: async () => {
    set({ isLoading: true });
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("trading_ads")
      .select(
        `
        *,
        profiles!trading_ads_user_id_fkey(username, avatar_url, role, discord_id, status)
      `
      )
      .gt("expires_at", now)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[useTradingAdsStore] Error fetching ads:", error.message);
      set({ isLoading: false });
      return;
    }

    if (data) {
      set({ ads: data as TradingAd[], isLoading: false });
    }
  },

  fetchUserAdHistory: async (userId: string, options: FetchHistoryOptions) => {
    // SECURITY: Never fetch or expose ad history if viewer is not the owner and history is set to private
    if (!userId || (!options.isOwner && options.adHistoryPublic === false)) {
      set({ userAdHistory: [], isLoadingHistory: false });
      return;
    }

    set({ isLoadingHistory: true });

    const { data, error } = await supabase
      .from("trading_ads")
      .select(
        `
        *,
        profiles!trading_ads_user_id_fkey(username, avatar_url, role, discord_id, status)
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[useTradingAdsStore] Error fetching user ad history:", error.message);
      set({ userAdHistory: [], isLoadingHistory: false });
      return;
    }

    let records = (data || []) as TradingAd[];

    // SECURITY: Filter out individually hidden ads when viewed by visitors
    if (!options.isOwner && Array.isArray(options.privateAdIds) && options.privateAdIds.length > 0) {
      const hiddenSet = new Set(options.privateAdIds);
      records = records.filter((ad) => !hiddenSet.has(ad.id));
    }

    set({ userAdHistory: records, isLoadingHistory: false });
  },

  subscribeToAds: () => {
    const adsChannel = supabase
      .channel("public:trading_ads")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trading_ads" },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          if (eventType === "INSERT") {
            supabase
              .from("trading_ads")
              .select(
                `*, profiles!trading_ads_user_id_fkey(username, avatar_url, role, discord_id, status)`
              )
              .eq("id", newRecord.id)
              .single()
              .then(({ data, error }) => {
                if (error) console.error("[useTradingAdsStore] Realtime Fetch Error:", error);
                if (data) {
                  set((state) => ({ ads: [data as TradingAd, ...state.ads] }));
                }
              });
          } else if (eventType === "DELETE") {
            set((state) => ({
              ads: state.ads.filter((ad) => ad.id !== oldRecord.id),
              userAdHistory: state.userAdHistory.filter(
                (ad) => ad.id !== oldRecord.id
              ),
            }));
          } else if (eventType === "UPDATE") {
            set((state) => ({
              ads: state.ads.map((ad) =>
                ad.id === newRecord.id ? { ...ad, ...newRecord } : ad
              ),
              userAdHistory: state.userAdHistory.map((ad) =>
                ad.id === newRecord.id ? { ...ad, ...newRecord } : ad
              ),
            }));
          }
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel("public:profiles_status")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          if (payload.new?.id) {
            useProfileStore
              .getState()
              .updateLocalProfile(payload.new.id, {
                status: payload.new.status,
              });
          }
          set((state) => ({
            ads: state.ads.map((ad) =>
              ad.user_id === payload.new.id && ad.profiles
                ? {
                    ...ad,
                    profiles: { ...ad.profiles, status: payload.new.status },
                  }
                : ad
            ),
            userAdHistory: state.userAdHistory.map((ad) =>
              ad.user_id === payload.new.id && ad.profiles
                ? {
                    ...ad,
                    profiles: { ...ad.profiles, status: payload.new.status },
                  }
                : ad
            ),
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(adsChannel);
      supabase.removeChannel(profilesChannel);
    };
  },

  createAd: async (adData: any) => {
    const rawNote = String(adData.note || "").slice(0, 500);
    if (containsPhishingOrLink(rawNote)) {
      useToastStore
        .getState()
        .addToast(
          "External links and invite URLs are strictly prohibited in trade notes.",
          "error"
        );
      return { error: new Error("Phishing or external link detected in note.") };
    }

    const payload: any = {};
    const {
      data: { session },
    } = await supabase.auth.getSession();
    payload.user_id = session?.user?.id || adData.user_id || adData.userId;

    if (!payload.user_id) {
      useToastStore
        .getState()
        .addToast("Sign in with Discord to publish a trade listing.", "warning");
      return { error: new Error("Authentication required.") };
    }

    // Role check for staff bypass
    const callerProfile = useAuthStore.getState().profile;
    const isStaff = Boolean(
      callerProfile?.role &&
        ["mod", "admin", "master"].includes(callerProfile.role.toLowerCase())
    );

    // Regular users: Enforce max 3 active ads and 15-minute cooldown
    if (!isStaff) {
      const nowIso = new Date().toISOString();
      const { count: activeCount } = await supabase
        .from("trading_ads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", payload.user_id)
        .gt("expires_at", nowIso);

      if (typeof activeCount === "number" && activeCount >= 3) {
        useToastStore
          .getState()
          .addToast(
            "Listing limit reached: Regular users can have at most 3 active listings simultaneously.",
            "warning"
          );
        return {
          error: new Error(
            "Listing limit reached. Regular users can have at most 3 active listings at a time."
          ),
        };
      }

      const COOLDOWN_MS = 15 * 60 * 1000;
      let lastTime = 0;
      try {
        const localTime = Number(
          localStorage.getItem(`astd_last_ad_posted_${payload.user_id}`) || 0
        );
        if (!isNaN(localTime) && localTime > lastTime) {
          lastTime = localTime;
        }
      } catch {}

      const { data: recentAds } = await supabase
        .from("trading_ads")
        .select("created_at")
        .eq("user_id", payload.user_id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (recentAds && recentAds.length > 0) {
        const dbTime = new Date(recentAds[0].created_at).getTime();
        if (dbTime > lastTime) {
          lastTime = dbTime;
        }
      }

      if (lastTime > 0) {
        const timeDiff = Date.now() - lastTime;
        if (timeDiff < COOLDOWN_MS) {
          const remainingMs = COOLDOWN_MS - timeDiff;
          const totalSecs = Math.ceil(remainingMs / 1000);
          const mins = Math.floor(totalSecs / 60);
          const secs = totalSecs % 60;
          const timerStr = `${mins}m ${secs}s`;
          useToastStore
            .getState()
            .addToast(
              `Listing cooldown active. Please wait ${timerStr} before posting another ad.`,
              "warning"
            );
          return {
            error: new Error(
              `Listing cooldown active. Wait ${timerStr} before posting.`
            ),
          };
        }
      }
    }

    const validTypes = ["standard", "lf_offers", "inventory"];
    const requestedType = adData.ad_type || adData.adType || "standard";
    payload.ad_type = validTypes.includes(requestedType)
      ? requestedType
      : "standard";

    const rawGive = Array.isArray(adData.give_items || adData.giveItems)
      ? adData.give_items || adData.giveItems
      : [];
    const rawGet = Array.isArray(adData.get_items || adData.getItems)
      ? adData.get_items || adData.getItems
      : [];

    payload.give_items = rawGive.slice(0, 20);
    payload.get_items = rawGet.slice(0, 20);

    payload.note = DOMPurify.sanitize(rawNote, {
      ALLOWED_TAGS: [], // Strip all HTML tags entirely
      ALLOWED_ATTR: [],
    });

    const rawExpires = adData.expires_at || adData.expiresAt;
    if (rawExpires) {
      payload.expires_at = rawExpires;
    } else {
      const hours = Math.min(
        24,
        Math.max(1, Number(adData.ttlHours || adData.ttl || 24))
      );
      const exp = new Date();
      exp.setHours(exp.getHours() + hours);
      payload.expires_at = exp.toISOString();
    }

    // OFFLINE QUEUE INTERCEPTION
    if (!navigator.onLine) {
      const queue: any[] = (await getIdb("astd_offline_ads")) || [];
      queue.push(payload);
      await setIdb("astd_offline_ads", queue);
      useToastStore
        .getState()
        .addToast(
          "You're offline. Ad queued to post when connection is restored.",
          "warning"
        );
      return { error: null };
    }

    const { error } = await supabase.from("trading_ads").insert(payload);
    if (error) {
      console.error("[useTradingAdsStore] Error posting ad:", error.message);
      return { error };
    }

    try {
      localStorage.setItem(
        `astd_last_ad_posted_${payload.user_id}`,
        Date.now().toString()
      );
    } catch {}

    return { error: null };
  },

  fetchAdById: async (id: string) => {
    if (!id) return null;
    const inAds = get().ads.find((a) => a.id === id);
    if (inAds) return inAds;
    const inHistory = get().userAdHistory.find((a) => a.id === id);
    if (inHistory) return inHistory;

    const { data, error } = await supabase
      .from("trading_ads")
      .select(
        `
        *,
        profiles!trading_ads_user_id_fkey(username, avatar_url, role, discord_id, status)
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    return data as TradingAd;
  },

  deleteAd: async (id: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      useToastStore
        .getState()
        .addToast("You must be signed in to delete an ad.", "error");
      return false;
    }

    const currentAds = get().ads;
    const currentHistory = get().userAdHistory;
    set({
      ads: currentAds.filter((ad) => ad.id !== id),
      userAdHistory: currentHistory.filter((ad) => ad.id !== id),
    });

    const { error } = await supabase
      .from("trading_ads")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[useTradingAdsStore] Error deleting ad:", error.message);
      set({ ads: currentAds, userAdHistory: currentHistory });
      useToastStore
        .getState()
        .addToast("Unable to delete ad—please try again.", "error");
      return false;
    }
    return true;
  },

  repostAd: async (ad: TradingAd) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user || session.user.id !== ad.user_id) {
      useToastStore
        .getState()
        .addToast("You can only repost your own trade ads.", "error");
      return false;
    }

    const newExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error } = await get().createAd({
      user_id: session.user.id,
      ad_type: ad.ad_type,
      give_items: ad.give_items,
      get_items: ad.get_items,
      note: ad.note,
      expires_at: newExpires,
    });

    if (error) {
      useToastStore
        .getState()
        .addToast("Could not repost trade ad—check rate limits.", "error");
      return false;
    }

    // Delete old expired record so history stays clean
    await get().deleteAd(ad.id);
    await get().fetchAds();
    await get().fetchUserAdHistory(session.user.id, { isOwner: true });
    useToastStore
      .getState()
      .addToast("Trade ad reposted to the live board for 24h!", "success");
    return true;
  },
}));
