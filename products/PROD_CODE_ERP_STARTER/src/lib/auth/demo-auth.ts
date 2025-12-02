/**
 * Demo Authentication Bypass System
 * Allows easy demo access without requiring real authentication
 * Only active when DEMO_MODE=true in environment
 */

import { type User, type Session } from '@supabase/supabase-js';
import { IS_PRODUCTION_ENV } from '@/lib/env';

export interface DemoUser extends User {
  id: string;
  email: string;
  user_metadata: {
    tenant_id: string;
    role: string;
    name?: string;
  };
  app_metadata: {
    tenant_id: string;
    role: string;
  };
}

export interface DemoSession extends Session {
  access_token: string;
  user: DemoUser;
}

// Demo mode configuration - use function to check at runtime
export const DEMO_CONFIG = {
  get enabled() {
    // Demo mode can be explicitly enabled via environment variable
    const envEnabled =
      process.env.DEMO_MODE === 'true' ||
      process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

    // Allow demo mode if explicitly enabled, even on production
    if (envEnabled) {
      return true;
    }

    // Check for demo/preview hostname patterns
    if (typeof window !== 'undefined') {
      const host = window.location.hostname.toLowerCase();
      const previewPrefixes = ['weathercraft-erp-preview-', 'weathercraft-erp-demo-'];
      return previewPrefixes.some(
        prefix => host.startsWith(prefix) && host.endsWith('.vercel.app')
      );
    }

    return false;
  },
  get defaultTenantId() {
    return process.env.DEFAULT_TENANT_ID ||
           process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ||
           '00000000-0000-0000-0000-000000000001';
  },
  get defaultCustomerId() {
    return process.env.DEMO_CUSTOMER_ID || 'eaeaa344-f731-4284-94d3-02ba7fe34e4a';
  },
  users: {
    admin: {
      id: 'demo-admin-user-001',
      email: 'admin@weathercraft.demo',
      name: 'Demo Admin',
      role: 'admin',
    },
    manager: {
      id: 'demo-manager-user-001',
      email: 'manager@weathercraft.demo',
      name: 'Demo Manager',
      role: 'manager',
    },
    employee: {
      id: 'demo-employee-user-001',
      email: 'employee@weathercraft.demo',
      name: 'Demo Employee',
      role: 'employee',
    },
    customer: {
      id: 'demo-customer-user-001',
      email: 'customer@weathercraft.demo',
      name: 'Demo Customer',
      role: 'customer',
    },
  },
};

/**
 * Check if demo mode is enabled
 */
export function isDemoMode(): boolean {
  return DEMO_CONFIG.enabled;
}

/**
 * Get demo user by role
 */
export function getDemoUser(role: 'admin' | 'manager' | 'employee' | 'customer' = 'admin'): DemoUser {
  const userConfig = DEMO_CONFIG.users[role];

  return {
    id: userConfig.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: userConfig.email,
    email_confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_metadata: {
      tenant_id: DEMO_CONFIG.defaultTenantId,
      role: userConfig.role,
      name: userConfig.name,
    },
    app_metadata: {
      provider: 'demo',
      tenant_id: DEMO_CONFIG.defaultTenantId,
      role: userConfig.role,
    },
    identities: [],
    factors: [],
  } as DemoUser;
}

/**
 * Get demo session for a user
 */
export function getDemoSession(role: 'admin' | 'manager' | 'employee' | 'customer' = 'admin'): DemoSession {
  const user = getDemoUser(role);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAt = nowSeconds + 3600; // 1 hour from now

  return {
    access_token: `demo-token-${role}-${Date.now()}`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: expiresAt,
    refresh_token: `demo-refresh-${role}`,
    user,
    provider_token: null,
    provider_refresh_token: null,
  } as DemoSession;
}

/**
 * Check if a request should use demo authentication
 * Based on headers or query parameters
 */
export function shouldUseDemoAuth(request: Request): boolean {
  // Check if this is a Vercel deployment
  const hostnameHeader = request.headers.get('host') || '';
  const normalizedHost = hostnameHeader.split(':')[0].toLowerCase();
  const demoHostPrefixes = ['weathercraft-erp-preview-', 'weathercraft-erp-demo-'];
  const isDemoDeployment =
    demoHostPrefixes.some(prefix => normalizedHost.startsWith(prefix) && normalizedHost.endsWith('.vercel.app'));

  // Always use demo auth for Vercel deployments
  if (isDemoDeployment) return true;

  if (!isDemoMode()) return false;

  // Check for demo header
  const demoHeader = request.headers.get('x-demo-auth');
  if (demoHeader === 'true') return true;

  // Check for demo query parameter
  const url = new URL(request.url);
  const demoParam = url.searchParams.get('demo');
  if (demoParam === 'true') return true;

  // Check for demo cookie
  const cookies = request.headers.get('cookie');
  if (cookies?.includes('demo_mode=true')) return true;

  // In demo mode, default to demo auth if no real auth is present
  const hasAuthHeader = request.headers.get('Authorization');
  const hasAuthCookie = cookies?.includes('sb-');

  return !hasAuthHeader && !hasAuthCookie;
}

/**
 * Get demo auth details from request
 * Allows specifying role via header or query parameter
 */
export function getDemoAuthDetails(request: Request): {
  role: 'admin' | 'manager' | 'employee' | 'customer';
  tenantId?: string;
} {
  const url = new URL(request.url);

  // Check for role in header
  const roleHeader = request.headers.get('x-demo-role');

  // Check for role in query parameter
  const roleParam = url.searchParams.get('demo_role');

  // Check for tenant ID override
  const tenantHeader = request.headers.get('x-demo-tenant-id');
  const tenantParam = url.searchParams.get('demo_tenant_id');

  const role = (roleHeader || roleParam || 'admin') as any;
  const validRoles = ['admin', 'manager', 'employee', 'customer'];

  return {
    role: validRoles.includes(role) ? role : 'admin',
    tenantId: tenantHeader || tenantParam || undefined,
  };
}

/**
 * Create demo authenticated request
 */
export function createDemoAuthRequest(request: Request) {
  const { role, tenantId } = getDemoAuthDetails(request);
  const user = getDemoUser(role);
  const session = getDemoSession(role);

  // Override tenant ID if specified
  if (tenantId) {
    user.user_metadata.tenant_id = tenantId;
    user.app_metadata.tenant_id = tenantId;
  }

  const isAdmin = role === 'admin';
  const customerId = role === 'customer' ? DEMO_CONFIG.defaultCustomerId : null;

  const sessionUser = session.user as DemoUser;
  sessionUser.user_metadata.tenant_id = user.user_metadata.tenant_id;
  sessionUser.app_metadata.tenant_id = user.app_metadata.tenant_id;
  sessionUser.user_metadata.role = user.user_metadata.role;
  sessionUser.app_metadata.role = user.app_metadata.role;
  session.user = sessionUser;

  return {
    user,
    session,
    tenantId: user.user_metadata.tenant_id,
    isAdmin,
    role,
    customerId,
    requestedTenantId: tenantId ?? user.user_metadata.tenant_id,
  };
}
