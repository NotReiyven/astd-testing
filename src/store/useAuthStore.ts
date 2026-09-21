// ================================================
// FILE: src/store/useAuthStore.ts
// ================================================

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Session, RealtimeChannel } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  discord_id: string;
  username: string;
  avatar_url: string;
  role: 'user' | 'mod' | 'admin' | 'master' | 'banned';
  created_at: string;
  status: 'online' | 'dnd' | 'invisible' | 'offline';
}

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  loginWithDiscord: () => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  initialize: () => void;
  updateStatus: (status: UserProfile['status']) => Promise<void>;
}

const clearLocalAuthCache = () => {
  for (let key in localStorage) {
    if (key.startsWith('sb-')) {
      localStorage.removeItem(key);
    }
  }
};

let activeProfileChannel: RealtimeChannel | null = null;

// Extracted for the beforeunload beacon
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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
    if (activeProfileChannel) {
      supabase.removeChannel(activeProfileChannel);
      activeProfileChannel = null;
    }
    
    // Ensure we mark them offline before destroying the session
    const { profile } = get();
    if (profile) {
      await supabase.from('profiles').update({ status: 'offline' }).eq('id', profile.id);
    }

    await supabase.auth.signOut();
    clearLocalAuthCache();
    set({ session: null, profile: null });
  },

  updateStatus: async (status) => {
    const { profile } = get();
    if (!profile || profile.status === status) return;

    // Save intent to local storage so auto-online respects their override
    if (status === 'dnd' || status === 'invisible') {
      localStorage.setItem('astd_manual_status', status);
    } else if (status === 'online') {
      localStorage.removeItem('astd_manual_status');
    }

    // Optimistic UI update
    set({ profile: { ...profile, status } });
    
    await supabase.from('profiles').update({ status }).eq('id', profile.id);
  },

  fetchProfile: async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    
    if (error) {
      console.error("Error fetching profile:", error);
      return;
    }

    if (data) {
      if (data.role === 'banned') {
        await get().logout();
        alert("This account has been permanently banned from the platform.");
        window.location.href = '/';
        return;
      }

      // Auto-Presence Injection
      const savedManualStatus = localStorage.getItem('astd_manual_status');
      let targetStatus = data.status;

      if (savedManualStatus === 'dnd' || savedManualStatus === 'invisible') {
        targetStatus = savedManualStatus;
      } else {
        targetStatus = 'online';
      }

      if (data.status !== targetStatus) {
        await supabase.from('profiles').update({ status: targetStatus }).eq('id', userId);
        data.status = targetStatus;
      }

      set({ profile: data as UserProfile });

      if (activeProfileChannel) {
        supabase.removeChannel(activeProfileChannel);
        activeProfileChannel = null;
      }

      activeProfileChannel = supabase.channel(`user-profile-${userId}`);
      activeProfileChannel
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
        if (activeProfileChannel) {
          supabase.removeChannel(activeProfileChannel);
          activeProfileChannel = null;
        }
        set({ profile: null });
      }
    });

    // The Auto-Offline killswitch
    window.addEventListener('beforeunload', () => {
      const { profile, session } = get();
      if (profile && session && profile.status !== 'invisible') {
        const url = `${supabaseUrl}/rest/v1/profiles?id=eq.${profile.id}`;
        fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': supabaseAnonKey
          },
          body: JSON.stringify({ status: 'offline' }),
          keepalive: true // Crucial: allows the request to finish after the tab closes
        });
      }
    });
  }
}));