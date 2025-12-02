import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getEnv, getOptionalEnv } from '@/lib/env';

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`
        }
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Create a Supabase client with service role key for admin operations
 * This bypasses Row Level Security (RLS) and should only be used in server-side code
 */
export function createServiceRoleClient() {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');

  // Service key from environment variable (required for privileged operations)
  const serviceKey = getOptionalEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!serviceKey) {
    throw new Error('[Supabase] Service role key (SUPABASE_SERVICE_ROLE_KEY) is not configured. Secure server-side operations require this key.');
  }

  return createSupabaseClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`
      }
    }
  });
}
