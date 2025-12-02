/**
 * Auth Session Sync API
 *
 * Keeps Supabase server-side session cookies aligned with client-side auth state.
 * Accepts Supabase auth events from the browser and persists the session so that
 * middleware and route handlers can access the user's credentials.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface AuthCallbackPayload {
  event?: string;
  session?: {
    access_token?: string;
    refresh_token?: string;
    [key: string]: unknown;
  };
}

async function syncSession(event: string, session: AuthCallbackPayload['session']) {
  const supabase = await createClient();

  if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(getErrorMessage(error));
    }
    return;
  }

  if (event !== 'SIGNED_IN' && event !== 'TOKEN_REFRESHED') {
    return;
  }

  if (!session?.access_token || !session?.refresh_token) {
    throw new Error('Missing session tokens for Supabase auth callback');
  }

  const { error } = await supabase.auth.setSession({
    access_token: String(session.access_token),
    refresh_token: String(session.refresh_token),
  });

  if (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as AuthCallbackPayload;
    const event = payload?.event;

    if (!event) {
      return NextResponse.json({ error: 'Missing auth event' }, { status: 400 });
    }

    await syncSession(event, payload.session);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    logger.error('Auth session sync failed', { message });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  return POST(request);
}
