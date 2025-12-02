import { createClient } from '@supabase/supabase-js';
import { getEnv, getOptionalEnv } from '@/lib/env';

/**
 * Service Role Client for Supabase
 * Bypasses RLS - use only in secure API routes
 * DO NOT use in client-side code
 */
export function createServiceClient() {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = getOptionalEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!serviceKey) {
    throw new Error(
      '[Supabase] Service role key (SUPABASE_SERVICE_ROLE_KEY) is not configured. ' +
        'Secure server-side operations require a service role key.'
    );
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
