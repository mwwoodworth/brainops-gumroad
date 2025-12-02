import { NextResponse } from 'next/server';
import type { AuthenticatedRequest } from '@/lib/auth/api-auth';

/**
 * Resolve the tenant scope for the current request.
 *
 * - Non-admin users are locked to their session tenant.
 * - Admin users may override via requestedTenantId; otherwise we fall back to the session tenant.
 *
 * Returns the tenant id string on success or a NextResponse on failure.
 */
export function enforceTenantScope(
  auth: AuthenticatedRequest,
  requestedTenantId?: string | null | URLSearchParams
): string | NextResponse {
  // Handle URLSearchParams by extracting tenant_id
  let requested: string | null = null;
  if (requestedTenantId instanceof URLSearchParams) {
    requested = requestedTenantId.get('tenant_id');
  } else {
    requested = requestedTenantId?.trim() || null;
  }

  const sessionTenant = auth.tenantId;

  if (auth.isAdmin) {
    const tenantId = requested || sessionTenant || null;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenant_id is required for this operation' },
        { status: 400 }
      );
    }
    return tenantId;
  }

  if (!sessionTenant) {
    return NextResponse.json(
      { error: 'Tenant assignment missing for user. Contact an administrator.' },
      { status: 403 }
    );
  }

  if (requested && requested !== sessionTenant) {
    return NextResponse.json(
      { error: 'Forbidden - Tenant scope mismatch' },
      { status: 403 }
    );
  }

  return sessionTenant;
}
