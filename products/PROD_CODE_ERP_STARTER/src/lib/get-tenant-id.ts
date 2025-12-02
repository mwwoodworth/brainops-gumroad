/**
 * Tenant ID Resolution Helper
 * Extracts tenant_id from various sources with fallback logic
 */

import { headers } from 'next/headers';

/**
 * Get tenant ID from NextRequest (App Router)
 * SECURITY: Always returns tenant_id for proper data isolation
 */
export function getTenantIdFromNextRequest(request: { headers: Headers; url?: string }): string | null {
  // Check header
  const tenantFromHeader = request.headers.get('x-tenant-id');
  if (tenantFromHeader?.trim()) return tenantFromHeader.trim();

  // Check query parameter
  if (request.url) {
    try {
      const { searchParams } = new URL(request.url);
      const tenantFromQuery = searchParams.get('tenant_id');
      if (tenantFromQuery?.trim()) return tenantFromQuery.trim();
    } catch (error) {
      // URL parsing failed
    }
  }

  return null;
}

/**
 * Get tenant ID asynchronously from headers or session
 */
export async function getTenantId(request?: Request | { headers: Headers; url?: string }): Promise<string | null> {
  // Try 1: Get from header
  try {
    const headersList = request?.headers || await headers();
    const tenantFromHeader = headersList.get('x-tenant-id');
    if (tenantFromHeader?.trim()) {
      return tenantFromHeader.trim();
    }
  } catch (error) {
    // Headers not available in this context
  }

  // Try 2: Get from query parameter
  if (request?.url) {
    try {
      const url = new URL(request.url);
      const tenantFromQuery = url.searchParams.get('tenant_id');
      if (tenantFromQuery?.trim()) {
        return tenantFromQuery.trim();
      }
    } catch (error) {
      // URL parsing failed
    }
  }

  return null;
}

/**
 * Validate tenant ID format (UUID v4)
 */
export function isValidTenantId(tenantId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(tenantId);
}
