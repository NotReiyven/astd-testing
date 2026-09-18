import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  discord_id: string;
  username: string;
  avatar_url: string;
  role: 'user' | 'mod' | 'admin' | 'master';
}

interface AuthState {
  session: any | null;
  profile: UserProfile | null;
  isLoading: boolean;
  initialize: () => void;
  loginWithDiscord: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  isLoading: true,

  initialize: () => {
    // Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session });
      if (session) fetchProfile(session.user.id);
      else set({ isLoading: false });
    });

    // Listen for auth changes (login/logout/refresh)
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
      if (session) {
        fetchProfile(session.user.id);
      } else {
        set({ profile: null, isLoading: false });
      }
    });

    const fetchProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (!error && data) {
        set({ profile: data as UserProfile, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    };
  },

  loginWithDiscord: async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: window.location.origin,
      },
    });
  },

  logout: async () => {
    await supabase.auth.signOut();
  }
}));