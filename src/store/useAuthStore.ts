// FILE: src/store/useAuthStore.ts

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  discord_id: string;
  username: string;
  avatar_url: string;
  role: 'user' | 'mod' | 'admin' | 'master' | 'banned';
  created_at: string;
}

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  loginWithDiscord: () => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  initialize: () => void;
}

// Utility to aggressively nuke local storage auth tokens to prevent login loops
const clearLocalAuthCache = () => {
  for (let key in localStorage) {
    if (key.startsWith('sb-')) {
      localStorage.removeItem(key);
    }
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  isLoading: true,

  loginWithDiscord: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: window.location.origin,
      }
    });
    if (error) {
      console.error("Discord Login Error:", error);
      alert("Failed to initialize login. Please clear your browser cache and try again.");
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    clearLocalAuthCache();
    set({ session: null, profile: null });
  },

  fetchProfile: async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    
    if (error) {
      console.error("Error fetching profile:", error);
      return;
    }

    if (data) {
      // 1. Initial login check
      if (data.role === 'banned') {
        await get().logout();
        alert("This account has been permanently banned from the platform.");
        window.location.href = '/';
        return;
      }

      set({ profile: data });

      // 2. REAL-TIME BAN HAMMER
      supabase.channel(`user-profile-${userId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
          async (payload) => {
            if (payload.new.role === 'banned') {
              await get().logout();
              alert("This account has been permanently banned from the platform.");
              window.location.href = '/'; 
            } else {
              set({ profile: payload.new as UserProfile });
            }
          }
        )
        .subscribe();
    }
  },

  initialize: () => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) clearLocalAuthCache();
      set({ session, isLoading: false });
      if (session?.user) {
        get().fetchProfile(session.user.id);
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, isLoading: false });
      if (session?.user) {
        get().fetchProfile(session.user.id);
      } else {
        set({ profile: null });
      }
    });
  }
}));