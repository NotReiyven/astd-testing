import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { TradeCard } from "../types";
import DOMPurify from "dompurify";
import { get as getIdb, set as setIdb } from "idb-keyval";
import { useToastStore } from "./useToastStore";

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

interface TradingAdsState {
  ads: TradingAd[];
  isLoading: boolean;
  fetchAds: () => Promise<void>;
  subscribeToAds: () => () => void;
  deleteAd: (id: string) => Promise<void>;
  createAd: (adData: any) => Promise<{ error: any | null }>;
}

export const useTradingAdsStore = create<TradingAdsState>((set, get) => ({
  ads: [],
  isLoading: true,

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
      console.error("🚨 Error fetching ads:", error.message);
      set({ isLoading: false });
      return;
    }

    if (data) {
      set({ ads: data as TradingAd[], isLoading: false });
    }
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
                if (error) console.error("🚨 Realtime Fetch Error:", error);
                if (data) {
                  set((state) => ({ ads: [data as TradingAd, ...state.ads] }));
                }
              });
          } else if (eventType === "DELETE") {
            set((state) => ({
              ads: state.ads.filter((ad) => ad.id !== oldRecord.id),
            }));
          } else if (eventType === "UPDATE") {
            set((state) => ({
              ads: state.ads.map((ad) =>
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
          set((state) => ({
            ads: state.ads.map((ad) =>
              ad.user_id === payload.new.id
                ? {
                    ...ad,
                    profiles: { ...ad.profiles!, status: payload.new.status },
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
    const payload: any = {};
    payload.user_id = adData.user_id || adData.userId;
    if (!payload.user_id) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) payload.user_id = session.user.id;
    }

    payload.ad_type = adData.ad_type || adData.adType || "standard";
    payload.give_items = adData.give_items || adData.giveItems || [];
    payload.get_items = adData.get_items || adData.getItems || [];

    payload.note = DOMPurify.sanitize(adData.note || "", {
      ALLOWED_TAGS: [], // Strip all HTML tags entirely
      ALLOWED_ATTR: [],
    });

    const rawExpires = adData.expires_at || adData.expiresAt;
    if (rawExpires) {
      payload.expires_at = rawExpires;
    } else {
      const hours = Number(adData.ttlHours || adData.ttl || 24);
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
      console.error("🚨 Error posting ad:", error.message);
      return { error };
    }
    return { error: null };
  },

  deleteAd: async (id: string) => {
    const currentAds = get().ads;
    set({ ads: currentAds.filter((ad) => ad.id !== id) });
    const { error } = await supabase.from("trading_ads").delete().eq("id", id);
    if (error) {
      console.error("🚨 Error deleting ad:", error.message);
      set({ ads: currentAds });
      useToastStore
        .getState()
        .addToast("Failed to delete ad. Rate limit or DB error.", "error");
    }
  },
}));
