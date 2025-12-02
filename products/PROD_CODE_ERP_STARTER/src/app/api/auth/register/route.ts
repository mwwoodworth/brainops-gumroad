import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { registerTenantAndOwner } from '@/lib/auth/tenant-onboarding';
import { isSignupEmailAllowed } from '@/lib/auth/signup-policy';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const RegisterSchema = z.object({
  companyName: z.string().min(2).max(120),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email().max(160),
  password: z.string().min(8).max(128),
  phone: z.string().min(7).max(32).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  const parsed = RegisterSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid registration payload',
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { companyName, email, password, firstName, lastName, phone } = parsed.data;

  try {
    if (!isSignupEmailAllowed(email)) {
      return NextResponse.json(
        {
          error:
            'Sign-ups are restricted to approved Weathercraft staff email domains. Please contact an administrator to request access.',
        },
        { status: 400 }
      );
    }

    const result = await registerTenantAndOwner({
      companyName,
      email,
      password,
      firstName,
      lastName,
      phone,
    });

    // Attempt to sign the new user in immediately to establish session cookies
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      logger.warn('[auth/register] Created account but automatic sign-in failed', signInError);
    }

    return NextResponse.json(
      {
        success: true,
        tenantId: result.tenantId,
        tenantSubdomain: result.tenantSubdomain,
        userId: result.userId,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('[auth/register] Registration failed', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Registration failed',
      },
      { status: 400 }
    );
  }
}
