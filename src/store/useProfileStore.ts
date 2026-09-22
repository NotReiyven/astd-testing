// ================================================
// FILE: src/store/useProfileStore.ts
// ================================================

import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface UserProfileData {
  id: string;
  discord_id: string;
  username: string;
  avatar_url: string;
  role: 'user' | 'mod' | 'admin' | 'master' | 'banned';
  created_at: string;
  bio: string;
  banner_color: string;
  roblox_username: string;
  global_rep: number;
  status: 'online' | 'dnd' | 'invisible' | 'offline';
}

interface CacheEntry {
  data: UserProfileData;
  timestamp: number;
}

interface ProfileState {
  cache: Record<string, CacheEntry>;
  popoutUserId: string | null;
  popoutPosition: { x: number, y: number } | null;
  viewingProfileId: string | null;
  returnChannel: string | null;
  openPopout: (userId: string, x: number, y: number) => void;
  closePopout: () => void;
  setViewingProfile: (userId: string | null, returnChannel?: string | null) => void;
  fetchProfile: (userId: string, force?: boolean) => Promise<UserProfileData | null>;
  updateLocalProfile: (userId: string, updates: Partial<UserProfileData>) => void;
  saveProfileUpdates: (userId: string, updates: Partial<UserProfileData>) => Promise<{ error: any }>;
}

const CACHE_TTL = 5 * 60 * 1000; 

export const useProfileStore = create<ProfileState>((set, get) => ({
  cache: {},
  popoutUserId: null,
  popoutPosition: null,
  viewingProfileId: null,
  returnChannel: null,

  openPopout: (userId, x, y) => {
    set({ popoutUserId: userId, popoutPosition: { x, y } });
    get().fetchProfile(userId); 
  },

  closePopout: () => set({ popoutUserId: null, popoutPosition: null }),

  setViewingProfile: (userId, returnChannel = null) => set({ viewingProfileId: userId, returnChannel }),

  fetchProfile: async (userId, force = false) => {
    const { cache } = get();
    const now = Date.now();

    if (!force && cache[userId] && (now - cache[userId].timestamp < CACHE_TTL)) {
      return cache[userId].data;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error(`Failed to fetch profile for ${userId}:`, error?.message);
      return null;
    }

    const profileData = data as UserProfileData;

    set((state) => ({
      cache: {
        ...state.cache,
        [userId]: { data: profileData, timestamp: now }
      }
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
            data: { ...existing.data, ...updates }
          }
        }
      };
    });
  },

  saveProfileUpdates: async (userId, updates) => {
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (!error) {
      get().updateLocalProfile(userId, updates);
    }
    return { error };
  }
}));