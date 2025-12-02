import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '@/lib/config/env';

/**
 * SECURE Server-side Supabase Client
 * Uses environment variables - NO HARD-CODED CREDENTIALS
 */
export function createClient() {
  return createSupabaseClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    auth: {
      persistSession: false
    }
  });
}