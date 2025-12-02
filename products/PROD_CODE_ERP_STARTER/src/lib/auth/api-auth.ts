/**
 * API Route Authentication Helper
 * Ensures all API routes require valid Supabase session
 * Includes demo mode for easy testing without real authentication
 */

import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient, type Session, type User } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { SUPABASE_CONFIG } from '@/lib/config/env';
import { IS_PRODUCTION_ENV, isE2ETestBypassEnabled } from '@/lib/env';
import { createServiceClient } from '@/lib/supabase/service';
import { isDemoMode, shouldUseDemoAuth, createDemoAuthRequest } from './demo-auth';
import { resolveUserRole } from '@/lib/auth/roles';
import { Permission, Role } from '@/lib/auth/permissions';
import { hasPermission } from '@/lib/auth/rbac';

export interface AuthenticatedRequest {
  user: User;
  session: Session;
  tenantId: string | null;
  isAdmin: boolean;
  role: string | null;
  customerId: string | null;
  requestedTenantId: string | null;
}

const trimOrNull = (value?: string | null) => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const extractBearerToken = (headerValue?: string | null): string | null => {
  if (!headerValue) return null;
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
};

const decodeBase64Url = (segment: string): string => {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  const padded = normalized.padEnd(normalized.length + padding, '=');

  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(padded);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(padded, 'base64').toString('utf8');
  }

  throw new Error('Base64 decoding is not supported in this runtime.');
};

const decodeJwtExpiry = (token: string): number | null => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    return typeof payload?.exp === 'number' ? payload.exp : null;
  } catch (error) {
    console.warn('[Auth] Failed to decode JWT payload for expiry determination:', error);
    return null;
  }
};

const buildSessionFromToken = (user: User, accessToken: string): Session => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAt = decodeJwtExpiry(accessToken) ?? nowSeconds + 3600;

  return {
    access_token: accessToken,
    refresh_token: '',
    token_type: 'bearer',
    expires_in: Math.max(0, expiresAt - nowSeconds),
    expires_at: expiresAt,
    provider_refresh_token: null,
    provider_token: null,
    user,
  } as Session;
};

/**
 * Require authentication for API routes
 * Returns authenticated session or 401 response
 *
 * Usage in API routes:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const auth = await requireAuth(request);
 *   if (auth instanceof NextResponse) return auth;
 *
 *   // Continue with authenticated logic
 *   const { user, session } = auth;
 * }
 * ```
 */
export async function requireAuth(
  request: NextRequest
): Promise<AuthenticatedRequest | NextResponse> {
  try {
    const requestedTenantHeader =
      trimOrNull(request.headers.get('x-tenant-id')) ??
      trimOrNull(request.headers.get('x-playwright-tenant-id')) ??
      trimOrNull(request.headers.get('x-tenant'));
    const requestedTenantQuery = trimOrNull(request.nextUrl?.searchParams?.get('tenant_id'));
    const requestedTenantId = requestedTenantHeader ?? requestedTenantQuery ?? null;

    const expectedTestApiKey =
      trimOrNull(process.env.PLAYWRIGHT_TEST_API_KEY) ??
      trimOrNull(process.env.E2E_TEST_API_KEY);
    const receivedTestApiKey =
      trimOrNull(request.headers.get('x-test-api-key')) ??
      trimOrNull(request.headers.get('x-playwright-api-key'));

    const allowProdSmokeTests = (trimOrNull(process.env.ALLOW_PROD_SMOKE_TESTS) || 'false') === 'true';

    if (
      expectedTestApiKey &&
      receivedTestApiKey === expectedTestApiKey &&
      (!IS_PRODUCTION_ENV || allowProdSmokeTests)
    ) {
      const tenantHeader =
        trimOrNull(request.headers.get('x-tenant-id')) ??
        trimOrNull(request.headers.get('x-playwright-tenant-id')) ??
        trimOrNull(process.env.PLAYWRIGHT_TENANT_ID) ??
        trimOrNull(process.env.TEST_USER_TENANT_ID) ??
        '00000000-0000-0000-0000-000000000001';

      return {
        user: {
          id: 'bf4c5eda-034f-4f6e-afd3-321f34755cd3',
          email: 'playwright.service@weathercraft.test',
          user_metadata: {
            tenant_id: tenantHeader,
            role: 'admin',
          },
          app_metadata: {
            tenant_id: tenantHeader,
            role: 'admin',
          },
        } as unknown as User,
        session: {} as Session,
        tenantId: tenantHeader,
        isAdmin: true,
        role: 'admin',
        customerId: null,
        requestedTenantId: requestedTenantId ?? tenantHeader,
      };
    }

    // Check if this is a demo deployment on Vercel
    const hostnameHeader = request.headers.get('host') || '';
    const normalizedHost = hostnameHeader.split(':')[0].toLowerCase();
    const demoHostPrefixes = ['weathercraft-erp-preview-', 'weathercraft-erp-demo-'];
    const isDemoDeployment =
      !IS_PRODUCTION_ENV &&
      demoHostPrefixes.some(prefix => normalizedHost.startsWith(prefix) && normalizedHost.endsWith('.vercel.app'));

    // Demo Mode: Return demo user without real authentication
    if (isDemoDeployment || (isDemoMode() && shouldUseDemoAuth(request))) {
      return createDemoAuthRequest(request);
    }

    // E2E Testing: Bypass authentication and return mock user
    const bypassEnabled = isE2ETestBypassEnabled();

    if (bypassEnabled) {
      const expectedBypassToken =
        trimOrNull(process.env.PLAYWRIGHT_E2E_BYPASS_TOKEN) ??
        trimOrNull(process.env.E2E_BYPASS_TOKEN);
      const requestBypassToken =
        trimOrNull(request.headers.get('x-e2e-bypass-token')) ??
        trimOrNull(request.cookies.get('e2e-bypass-token')?.value) ??
        trimOrNull((request.headers.get('cookie') ?? '').match(/e2e-bypass-token=([^;]+)/)?.[1]);

      if (requestBypassToken !== expectedBypassToken) {
        console.warn(
          '[Auth] E2E bypass flag enabled but request missing valid bypass token. Falling back to standard auth.'
        );
      } else {
        const tenantFromHeader =
          trimOrNull(request.headers.get('x-tenant-id')) ??
          trimOrNull(request.headers.get('x-playwright-tenant-id')) ??
          trimOrNull(process.env.PLAYWRIGHT_TENANT_ID) ??
          trimOrNull(process.env.TEST_USER_TENANT_ID) ??
          '00000000-0000-0000-0000-000000000001';

        return {
          user: {
            id: 'bf4c5eda-034f-4f6e-afd3-321f34755cd3',
            email: 'e2e.test@weathercraft.test',
            user_metadata: {
              tenant_id: tenantFromHeader,
              role: 'admin'
            },
            app_metadata: {
              tenant_id: tenantFromHeader,
              role: 'admin'
            }
          } as unknown as User,
          session: {} as Session,
          tenantId: tenantFromHeader,
          isAdmin: true,
          role: 'admin',
          customerId: null,
          requestedTenantId: requestedTenantId ?? tenantFromHeader,
        };
      }
    }

    const authorizationHeader =
      request.headers.get('Authorization') ?? request.headers.get('authorization');
    const bearerToken = extractBearerToken(authorizationHeader);

    const requestCookies = request.cookies;
    const bypassCookie = trimOrNull(requestCookies.get('e2e-bypass-token')?.value);
    if (
      bypassCookie &&
      trimOrNull(process.env.PLAYWRIGHT_E2E_BYPASS_TOKEN) === bypassCookie &&
      !IS_PRODUCTION_ENV
    ) {
      return {
        user: {
          id: 'bf4c5eda-034f-4f6e-afd3-321f34755cd3',
          email: 'e2e.test@weathercraft.test',
          user_metadata: {
            tenant_id: '00000000-0000-0000-0000-000000000001',
            role: 'admin'
          },
          app_metadata: {
            tenant_id: '00000000-0000-0000-0000-000000000001',
            role: 'admin'
          }
        } as unknown as User,
        session: {} as Session,
        tenantId: '00000000-0000-0000-0000-000000000001',
        isAdmin: true,
        role: 'admin',
        customerId: null,
        requestedTenantId: requestedTenantId ?? '00000000-0000-0000-0000-000000000001',
      };
    }

    // Create Supabase client for server-side
    const supabase = createServerClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {}, // Read-only for API routes
          remove() {}, // Read-only for API routes
        },
      }
    );

    // Get session
    let session: Session | null = null;
    let sessionSource: 'cookie' | 'header' | null = null;

    const {
      data: { session: cookieSession },
      error: cookieError,
    } = await supabase.auth.getSession();

    if (!cookieError && cookieSession?.user) {
      session = cookieSession;
      sessionSource = 'cookie';
    }

    if ((!session || !session.user) && bearerToken) {
      try {
        const supabaseTokenClient = createSupabaseClient(
          SUPABASE_CONFIG.url,
          SUPABASE_CONFIG.anonKey,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
            global: {
              headers: {
                apikey: SUPABASE_CONFIG.anonKey,
              },
            },
          }
        );

        const { data: tokenData, error: tokenError } = await supabaseTokenClient.auth.getUser(
          bearerToken
        );

        if (tokenError || !tokenData?.user) {
          return NextResponse.json(
            { error: 'Unauthorized - Invalid access token' },
            { status: 401 }
          );
        }

        session = buildSessionFromToken(tokenData.user, bearerToken);
        sessionSource = 'header';
      } catch (tokenResolutionError) {
        console.error('[Auth] Failed to resolve session from bearer token:', tokenResolutionError);
        return NextResponse.json(
          { error: 'Unauthorized - Authentication required' },
          { status: 401 }
        );
      }
    }

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const sessionUser = session.user;

    let tenantId =
      trimOrNull(sessionUser?.user_metadata?.tenant_id) ??
      trimOrNull(sessionUser?.app_metadata?.tenant_id) ??
      null;

    let derivedRole =
      trimOrNull(sessionUser.user_metadata?.role) ??
      trimOrNull(sessionUser.app_metadata?.role) ??
      null;

    let supabaseService: ReturnType<typeof createServiceClient> | null = null;
    const ensureServiceClient = () => {
      if (supabaseService) {
        return supabaseService;
      }

      try {
        supabaseService = createServiceClient();
      } catch (serviceClientError) {
        console.error('[Auth] Unable to initialize Supabase service role client:', serviceClientError);
        supabaseService = null;
      }

      return supabaseService;
    };

    if (!tenantId && sessionSource === 'cookie') {
      try {
        const { data: membershipRows, error: membershipError } = await supabase
          .from('user_tenants')
          .select('tenant_id, role')
          .eq('user_id', sessionUser.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (membershipError) {
          console.error('❌ Failed to resolve tenant via user_tenants:', membershipError);
        } else if (membershipRows && membershipRows.length > 0) {
          tenantId = trimOrNull(membershipRows[0]?.tenant_id) ?? tenantId;
          derivedRole = derivedRole ?? trimOrNull(membershipRows[0]?.role) ?? null;
        }
      } catch (membershipException) {
        console.error('❌ Exception while resolving tenant membership:', membershipException);
      }
    }

    if (!tenantId) {
      try {
        const serviceClient = ensureServiceClient();
        if (!serviceClient) {
          console.error('[Auth] Service client unavailable for tenant lookup.');
        } else {
          const { data: fallbackMembership, error: fallbackError } = await serviceClient
            .from('user_tenants')
            .select('tenant_id, role')
            .eq('user_id', sessionUser.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (fallbackError) {
            console.error('[Auth] Service-level tenant lookup failed:', fallbackError);
          } else if (fallbackMembership) {
            tenantId = trimOrNull(fallbackMembership.tenant_id) ?? tenantId;
            derivedRole = derivedRole ?? trimOrNull(fallbackMembership.role) ?? null;
          }
        }
      } catch (serviceError) {
        console.error('[Auth] Exception during service tenant lookup:', serviceError);
      }
    }

    if (!tenantId) {
      try {
        const serviceClient = ensureServiceClient();
        if (!serviceClient) {
          console.warn('[Auth] Service client unavailable for employee tenant lookup.');
        } else if (sessionUser.email) {
          const { data: employeeRecord, error: employeeError } = await serviceClient
            .from('employees')
            .select('tenant_id, role')
            .eq('email', sessionUser.email.toLowerCase())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (employeeError) {
            console.error('[Auth] Failed to resolve tenant via employees table:', employeeError);
          } else if (employeeRecord?.tenant_id) {
            tenantId = trimOrNull(employeeRecord.tenant_id) ?? tenantId;
            derivedRole = derivedRole ?? trimOrNull(employeeRecord.role) ?? null;
          }
        }
      } catch (employeeLookupError) {
        console.error('[Auth] Exception during employee tenant lookup:', employeeLookupError);
      }
    }

    if (!tenantId) {
      const defaultTenant =
        trimOrNull(process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID) ?? null;
      const e2eTenant =
        trimOrNull(process.env.NEXT_PUBLIC_E2E_TENANT_ID) ?? null;
      const fallbackTenant = defaultTenant ?? e2eTenant ?? null;

      const allowFallback =
        !!fallbackTenant &&
        (process.env.NODE_ENV !== 'production' || !!defaultTenant);

      if (allowFallback && fallbackTenant) {
        console.warn(
          `[Auth] Falling back to tenant ${fallbackTenant} for user ${sessionUser.id}.` +
          ' Provision user_tenants for proper tenant isolation.'
        );
        tenantId = fallbackTenant;
        derivedRole = derivedRole ?? 'employee';
      }
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context missing for this account' },
        { status: 403 }
      );
    }

    const normalizedRole = derivedRole ? String(derivedRole).toLowerCase() : 'employee';

    const isAdmin =
      normalizedRole === 'admin' ||
      normalizedRole === 'owner' ||
      normalizedRole === 'full_admin';

    const resolvedRequestedTenantId = requestedTenantId ?? tenantId;

    if (request.nextUrl.pathname.startsWith('/api') && !isAdmin && !resolvedRequestedTenantId) {
      return NextResponse.json(
        { error: 'tenant_id header or query parameter is required for tenant-scoped APIs' },
        { status: 400 }
      );
    }

    if (!isAdmin && requestedTenantId && requestedTenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Forbidden - Tenant scope mismatch' },
        { status: 403 }
      );
    }

    const serviceClientForProvision = ensureServiceClient();
    if (serviceClientForProvision && tenantId) {
      try {
        await serviceClientForProvision
          .from('user_tenants')
          .upsert(
            {
              user_id: sessionUser.id,
              tenant_id: tenantId,
              role: normalizedRole,
            },
            { onConflict: 'user_id,tenant_id', ignoreDuplicates: true }
          );
      } catch (provisionError) {
        console.error('[Auth] Failed to provision user_tenants mapping:', provisionError);
      }
    }

    let customerId: string | null = null;

    if (
      tenantId &&
      normalizedRole &&
      ['customer', 'homeowner'].includes(normalizedRole)
    ) {
      const email = sessionUser.email?.toLowerCase();
      if (email) {
        const serviceClient = ensureServiceClient();
        if (!serviceClient) {
          console.error(
            '[Auth] Missing Supabase service credentials for portal customer resolution.'
          );
          return NextResponse.json(
            { error: 'Server misconfiguration: missing Supabase service credentials' },
            { status: 500 }
          );
        }

        try {
          const { data, error } = await serviceClient
            .from('customers')
            .select('id, email')
            .eq('tenant_id', tenantId)
            .ilike('email', email)
            .maybeSingle();

          if (error) {
            console.error('[Auth] Failed to resolve portal customer:', error);
          } else if (data?.id) {
            customerId = data.id;
          }
        } catch (customerResolveError) {
          console.error('[Auth] Exception resolving portal customer:', customerResolveError);
        }
      }
    }

    return {
      user: sessionUser,
      session,
      tenantId,
      isAdmin,
      role: normalizedRole,
      customerId,
      requestedTenantId: resolvedRequestedTenantId,
    };
  } catch (error) {
    console.error('❌ Authentication error:', error);
    return NextResponse.json(
      {
        error: 'Authentication failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Require admin role for API routes
 * Returns authenticated admin session or 403 response
 */
export async function requireAdmin(
  request: NextRequest
): Promise<AuthenticatedRequest | NextResponse> {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  if (!auth.isAdmin) {
    return NextResponse.json(
      { error: 'Forbidden - Admin access required' },
      { status: 403 }
    );
  }

  return auth;
}

/**
 * Optional authentication - doesn't fail if not authenticated
 * Useful for public endpoints that may have different behavior for auth users
 */
export async function optionalAuth(
  request: NextRequest
): Promise<AuthenticatedRequest | null> {
  const auth = await requireAuth(request);
  return auth instanceof NextResponse ? null : auth;
}

/**
 * Require that the authenticated user has one of the allowed roles.
 * Admin users are always allowed.
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<AuthenticatedRequest | NextResponse> {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.isAdmin) {
    return auth;
  }

  const userRole = resolveUserRole(auth);
  const normalizedAllowed = allowedRoles.map((role) => role.toLowerCase());

  if (!normalizedAllowed.includes(userRole)) {
    return NextResponse.json(
      { error: 'Forbidden - Insufficient role' },
      { status: 403 }
    );
  }

  return auth;
}

/**
 * Require that the authenticated user has a specific permission.
 * Super admins and admins are always allowed.
 */
export async function requirePermissionAuth(
  request: NextRequest,
  permission: Permission
): Promise<AuthenticatedRequest | NextResponse> {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.isAdmin) {
    return auth;
  }

  const roleKey = resolveUserRole(auth);
  const elevatedRoles: string[] = ['super_admin', 'admin', 'owner', 'full_admin'];
  if (elevatedRoles.includes(roleKey)) {
    return auth;
  }

  let mappedRole: Role | null = null;
  switch (roleKey) {
    case Role.SUPER_ADMIN:
      mappedRole = Role.SUPER_ADMIN;
      break;
    case Role.ADMIN:
      mappedRole = Role.ADMIN;
      break;
    case Role.MANAGER:
      mappedRole = Role.MANAGER;
      break;
    case Role.FIELD_TECH:
      mappedRole = Role.FIELD_TECH;
      break;
    case Role.OFFICE_STAFF:
      mappedRole = Role.OFFICE_STAFF;
      break;
    case Role.READ_ONLY:
      mappedRole = Role.READ_ONLY;
      break;
    default:
      mappedRole = null;
  }

  if (!mappedRole || !hasPermission(mappedRole, permission)) {
    return NextResponse.json(
      { error: 'Forbidden - Insufficient permissions' },
      { status: 403 }
    );
  }

  return auth;
}
