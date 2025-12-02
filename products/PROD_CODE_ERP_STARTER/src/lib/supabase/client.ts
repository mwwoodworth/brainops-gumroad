"use client";

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from '@/lib/env';

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

type BrowserClient = SupabaseClient<any, any, any, any, any>;

let browserClient: BrowserClient | null = null;

export function createClient(): BrowserClient {
  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    },
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      autoRefreshToken: true,
    },
  }) as BrowserClient;

  return browserClient;
}
