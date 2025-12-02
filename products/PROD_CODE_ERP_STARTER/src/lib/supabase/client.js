"use client";
import { createBrowserClient } from '@supabase/ssr';
import { getEnv } from '@/lib/env';
const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
let browserClient = null;
export function createClient() {
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
    });
    return browserClient;
}
