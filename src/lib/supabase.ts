import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Show a visible error in the DOM instead of crashing the entire app silently
  const msg = 'LiftLoop: Missing Supabase configuration. Please check environment variables.';
  console.warn(msg);
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      const el = document.getElementById('root');
      if (el) {
        el.innerHTML = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F6F7F2;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;padding:24px"><div style="text-align:center;max-width:400px"><h1 style="font-size:24px;font-weight:700;color:#18392F;margin-bottom:12px">Configuration Error</h1><p style="color:#647268;font-size:14px;line-height:1.6">Unable to connect to the server. Please try refreshing the page or contact support.</p><button onclick="location.reload()" style="margin-top:20px;padding:12px 28px;border-radius:12px;border:none;background:linear-gradient(135deg,#173F35,#285D4B);color:white;font-weight:600;cursor:pointer;font-size:14px">Retry</button></div></div>`;
      }
    });
  }
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);
