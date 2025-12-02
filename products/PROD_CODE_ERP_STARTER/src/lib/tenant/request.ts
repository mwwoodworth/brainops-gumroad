import { NextResponse, type NextRequest } from 'next/server';
import type { AuthenticatedRequest } from '@/lib/auth/api-auth';

export interface ResolveTenantOptions {
  auth?: AuthenticatedRequest | null;
  bodyTenantId?: string | null;
}

export function resolveTenantIdFromRequest(
  request: NextRequest,
  options: ResolveTenantOptions = {}
): string | null {
  const { auth, bodyTenantId } = options;

  const normalize = (value?: string | null) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const authTenant = normalize(auth?.tenantId);
  const bodyTenant = normalize(bodyTenantId);
  const headerTenant = normalize(request.headers.get('x-tenant-id'));
  const queryTenant = normalize(request.nextUrl.searchParams.get('tenant_id'));

  if (authTenant) {
    const requestedTenant = bodyTenant ?? headerTenant ?? queryTenant;
    if (requestedTenant && requestedTenant !== authTenant) {
      console.warn(
        `[Tenant] Ignoring mismatched tenant override "${requestedTenant}" for user ${
          auth?.user?.id ?? 'unknown'
        }; enforcing authenticated tenant "${authTenant}".`
      );
    }
    return authTenant;
  }

  return bodyTenant ?? headerTenant ?? queryTenant ?? null;
}

export function assertTenantId(
  request: NextRequest,
  options: ResolveTenantOptions = {}
): string {
  const tenantId = resolveTenantIdFromRequest(request, options);
  if (!tenantId) {
    throw new Error('tenant_id is required for this operation');
  }
  return tenantId;
}

export function requireTenantIdResponse(
  request: NextRequest,
  options: ResolveTenantOptions = {},
  message = 'tenant_id is required for security'
): string | NextResponse {
  const tenantId = resolveTenantIdFromRequest(request, options);
  if (!tenantId) {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return tenantId;
}
