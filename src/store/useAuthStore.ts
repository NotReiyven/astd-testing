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
  initialize: () => void; // Fixed name here
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  isLoading: true,

  loginWithDiscord: async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
    });
  },

  logout: async () => {
    await supabase.auth.signOut();
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
        get().logout();
        alert("This account has been permanently banned from the platform.");
        return;
      }

      set({ profile: data });

      // 2. REAL-TIME BAN HAMMER: Instantly kick the user if an Admin bans them while they are active
      supabase.channel(`user-profile-${userId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
          (payload) => {
            if (payload.new.role === 'banned') {
              get().logout();
              alert("This account has been permanently banned from the platform.");
              window.location.href = '/'; // Force them to the splash/login page
            } else {
              // Update state normally if their role changes to something else (e.g. promoted to mod)
              set({ profile: payload.new as UserProfile });
            }
          }
        )
        .subscribe();
    }
  },

  initialize: () => { // Fixed name here
    // Check active sessions and sets up the listener
    supabase.auth.getSession().then(({ data: { session } }) => {
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