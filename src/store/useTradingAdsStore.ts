import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { TradeCard } from '../types';

export interface TradingAd {
  id: string;
  user_id: string;
  give_items: TradeCard[];
  get_items: TradeCard[];
  note?: string;
  expires_at: string;
  created_at: string;
  profiles?: {
    username: string;
    discord_id: string;
    avatar_url: string;
  };
}

interface TradingAdsState {
  ads: TradingAd[];
  isLoading: boolean;
  stagedGiveForAd: TradeCard[];
  setStagedGiveForAd: (items: TradeCard[]) => void;
  fetchAds: () => Promise<void>;
  subscribeToAds: () => () => void;
  createAd: (params: {
    userId: string;
    giveItems: TradeCard[];
    getItems: TradeCard[];
    note: string;
    ttlHours: number;
  }) => Promise<void>;
  deleteAd: (adId: string) => Promise<void>;
}

export const useTradingAdsStore = create<TradingAdsState>((set, get) => ({
  ads: [],
  isLoading: true,
  stagedGiveForAd: [],

  setStagedGiveForAd: (items) => set({ stagedGiveForAd: items }),

  fetchAds: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('trading_ads')
      .select('*, profiles(username, discord_id, avatar_url)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (!error && data) {
      set({ ads: data as TradingAd[], isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  subscribeToAds: () => {
    const channel = supabase
      .channel('trading_ads_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trading_ads' },
        () => {
          get().fetchAds();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  createAd: async ({ userId, giveItems, getItems, note, ttlHours }) => {
    const expiresAt = new Date(Date.now() + ttlHours * 3600000).toISOString();

    const { error } = await supabase.from('trading_ads').insert({
      user_id: userId,
      give_items: giveItems,
      get_items: getItems,
      note: note.trim() || null,
      expires_at: expiresAt,
    });

    if (error) throw error;
    await get().fetchAds();
  },

  deleteAd: async (adId: string) => {
    const { error } = await supabase
      .from('trading_ads')
      .delete()
      .eq('id', adId);

    if (error) throw error;
    set((state) => ({ ads: state.ads.filter((a) => a.id !== adId) }));
  },
}));