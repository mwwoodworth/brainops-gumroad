/**
 * Logout API Route
 * Handles user logout by clearing Supabase session
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current session for logging
    const { data: { session } } = await supabase.auth.getSession();
    const userEmail = session?.user?.email;

    // Sign out
    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error('Logout error:', getErrorMessage(error));
      return NextResponse.json(
        { error: 'Failed to logout', details: getErrorMessage(error) },
        { status: 500 }
      );
    }

    logger.info(`User logged out: ${userEmail || 'unknown'}`);

    return NextResponse.json(
      { success: true, message: 'Successfully logged out' },
      { status: 200 }
    );
  } catch (error: unknown) {
    logger.error('Logout exception:', getErrorMessage(error));
    return NextResponse.json(
      { error: 'Logout failed', details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Allow GET requests to logout as well for convenience
  return POST(request);
}
