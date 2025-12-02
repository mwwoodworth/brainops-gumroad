"use client";

/**
 * SECURE Supabase Auth Integration (client-side only)
 * Centralizes creation so every consumer shares the same SSR-aware browser client.
 */

import { createClient } from '@/lib/supabase/client';
import { BRAINOPS_BACKEND_URL } from '@/lib/brainops/env';

export const supabase = createClient();

/**
 * Sign up with email and password
 * @param email User email
 * @param password User password
 * @param metadata Additional user metadata (tenant_id, name, etc.)
 */
export async function signUp(email: string, password: string, metadata: Record<string, any> = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Sign in with email and password
 * @param email User email
 * @param password User password
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Get the current user session
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

/**
 * Get the current user
 */
export async function getUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  return data.user;
}

/**
 * Update user metadata
 * @param metadata User metadata to update
 */
export async function updateUserMetadata(metadata: Record<string, any>) {
  const { data, error } = await supabase.auth.updateUser({
    data: metadata
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Send password reset email
 * @param email User email
 */
export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Update user password
 * @param newPassword New password
 */
export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Listen to auth state changes
 * @param callback Callback function to execute on auth state change
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

/**
 * Get access token for API calls
 * This token should be included in Authorization header for backend API calls
 */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token || null;
}

/**
 * Get tenant ID from user metadata
 * Required for all API calls that need tenant isolation
 */
export async function getTenantId(): Promise<string | null> {
  const user = await getUser();
  return user?.user_metadata?.tenant_id || null;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}

/**
 * Create authenticated API client
 * Returns fetch function pre-configured with auth headers
 */
export async function createAuthenticatedFetch() {
  const token = await getAccessToken();
  const tenantId = await getTenantId();

  return async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (tenantId) {
      headers.set('x-tenant-id', tenantId);
    }

    return fetch(url, {
      ...options,
      headers
    });
  };
}

/**
 * Make authenticated API call to backend
 * @param endpoint API endpoint (e.g., '/api/v1/customers')
 * @param options Fetch options
 */
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const backendUrl = BRAINOPS_BACKEND_URL;
  const token = await getAccessToken();
  const tenantId = await getTenantId();

  if (!token) {
    throw new Error('User not authenticated');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');

  if (tenantId) {
    headers.set('x-tenant-id', tenantId);
  }

  const response = await fetch(`${backendUrl}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || error.message || 'Request failed');
  }

  return response.json();
}
