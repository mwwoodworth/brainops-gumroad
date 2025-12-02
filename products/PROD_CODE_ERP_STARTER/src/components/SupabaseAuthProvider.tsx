"use client";

/**
 * Supabase Auth Provider for MyRoofGenius
 * Replaces NextAuth SessionProvider with Supabase Auth
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, onAuthStateChange } from '@/lib/auth-supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  error: null,
  signOut: async () => {}
});

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const syncSessionWithServer = async (event: string, nextSession: Session | null) => {
      const relevantEvents = ['SIGNED_IN', 'TOKEN_REFRESHED', 'SIGNED_OUT', 'USER_DELETED'];
      if (!relevantEvents.includes(event)) {
        return;
      }

      try {
        const response = await fetch('/api/auth/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          cache: 'no-store',
          body: JSON.stringify({
            event,
            session: nextSession
              ? {
                  access_token: nextSession.access_token,
                  refresh_token: nextSession.refresh_token,
                }
              : null,
          })
        });

        if (!response.ok) {
          let message = `[SupabaseAuthProvider] Failed to sync auth session (HTTP ${response.status})`;
          try {
            const body = await response.json();
            if (body && typeof body.error === 'string') {
              message = body.error;
            }
          } catch {
            // ignore JSON parsing issues
          }
          if (isMounted) {
            setError(
              `${message}. Check /api/system/auth-health and Supabase env configuration.`
            );
          }
        } else if (isMounted) {
          // Clear any previous sync errors on success
          setError(null);
        }
      } catch (error) {
        console.error('[SupabaseAuthProvider] Failed to sync auth session', error);
        if (isMounted) {
          setError(
            '[SupabaseAuthProvider] Unable to reach /api/auth/session. ' +
              'Check network, deployment configuration, and /api/system/auth-health.'
          );
        }
      }
    };

    const resolveSession = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (error) {
          console.error('[SupabaseAuthProvider] Failed to resolve session', error);
          setSession(null);
          setUser(null);
          setError(
            'Failed to resolve Supabase auth session. ' +
              'This usually indicates a configuration issue with Supabase env vars or cookies.'
          );
        } else {
          const currentSession = data?.session ?? null;
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setError(null);
          if (currentSession) {
            await syncSessionWithServer('SIGNED_IN', currentSession);
          }
        }
      } catch (err: any) {
        console.error('[SupabaseAuthProvider] Unexpected error during session resolution', err);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setError(
            'Unexpected error while contacting Supabase for auth. ' +
              'Verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY and review /api/system/auth-health.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void resolveSession();

    const {
      data: { subscription },
    } = onAuthStateChange(async (event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setLoading(false);
      await syncSessionWithServer(event, nextSession ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    error,
    signOut: handleSignOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}

export { AuthContext };
