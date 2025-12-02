import { logger } from '@/lib/logger';
import { requireCurrentTenantId } from '@/lib/tenant/server';

function appendTenant(path: string, tenantId: string): string {
  try {
    const url = new URL(path, 'http://localhost');
    if (!url.searchParams.has('tenant_id')) {
      url.searchParams.set('tenant_id', tenantId);
    }
    return url.pathname + url.search + url.hash;
  } catch (error) {
    logger.warn('[tenantFetch] Failed to append tenant to path:', {
      error,
      path,
      tenantId,
    });
    return path;
  }
}

export async function tenantFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const tenantId = await requireCurrentTenantId();
  const headers = new Headers(init?.headers);
  headers.set('x-tenant-id', tenantId);

  const target = path.startsWith('/api/')
    ? appendTenant(path, tenantId)
    : path;

  return fetch(target, {
    ...init,
    headers,
  });
}
