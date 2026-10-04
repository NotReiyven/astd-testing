import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Sessions are stored in localStorage (not cookies), so no Secure flag is
    // needed here. However we enforce HTTPS at the network layer via HSTS and
    // CSP upgrade-insecure-requests so tokens always travel over TLS.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      // Prevents MIME-type sniffing for any fetch Supabase makes
      'X-Content-Type-Options': 'nosniff',
    },
  },
});