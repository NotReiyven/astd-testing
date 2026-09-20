// FILE: src/store/useTradingAdsStore.ts

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { TradeCard } from '../types';

export interface TradingAd {
  id: string;
  user_id: string;
  ad_type: 'standard' | 'lf_offers' | 'inventory';
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
      .from('trading_ads')
      // FIX: We explicitly tell Supabase which foreign key to follow (!trading_ads_user_id_fkey)
      .select(`
        *,
        profiles!trading_ads_user_id_fkey(username, avatar_url, role, discord_id)
      `)
      .gt('expires_at', now) // Restored your expiration filter
      .order('created_at', { ascending: false });

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
    const channel = supabase.channel('public:trading_ads')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'trading_ads' // CRITICAL: Isolates listener from comments
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          if (eventType === 'INSERT') {
            supabase
              .from('trading_ads')
              // FIX: Apply the same strict foreign key definition here
              .select(`*, profiles!trading_ads_user_id_fkey(username, avatar_url, role, discord_id)`)
              .eq('id', newRecord.id)
              .single()
              .then(({ data, error }) => {
                if (error) console.error("🚨 Realtime Fetch Error:", error);
                if (data) {
                  set((state) => ({
                    ads: [data as TradingAd, ...state.ads]
                  }));
                }
              });
          } 
          else if (eventType === 'DELETE') {
            set((state) => ({
              ads: state.ads.filter(ad => ad.id !== oldRecord.id)
            }));
          }
          else if (eventType === 'UPDATE') {
             set((state) => ({
               ads: state.ads.map(ad => ad.id === newRecord.id ? { ...ad, ...newRecord } : ad)
             }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  createAd: async (adData: any) => {
    const { error } = await supabase.from('trading_ads').insert(adData);
    if (error) {
      console.error("🚨 Error posting ad:", error.message);
      return { error };
    }
    return { error: null };
  },

  deleteAd: async (id: string) => {
    const currentAds = get().ads;
    set({ ads: currentAds.filter(ad => ad.id !== id) });
    
    const { error } = await supabase.from('trading_ads').delete().eq('id', id);
    
    if (error) {
      console.error("🚨 Error deleting ad:", error.message);
      set({ ads: currentAds });
    }
  }
}));