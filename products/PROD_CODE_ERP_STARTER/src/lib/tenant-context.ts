/**
 * Tenant Context Management
 * Sets session variables for Row Level Security (RLS) policies
 */

import { queryDirect } from '@/lib/db-direct';

/**
 * Set the current tenant context for the database session
 * This sets a session variable that RLS policies use to filter data
 *
 * @param tenantId - The tenant ID to set as current context
 */
export async function setTenantContext(tenantId: string): Promise<void> {
  try {
    await queryDirect(
      `SET LOCAL app.current_tenant_id = '${tenantId}'`,
      []
    );
  } catch (error) {
    console.error('Failed to set tenant context:', error);
    throw error;
  }
}

/**
 * Clear the tenant context (useful for testing or admin operations)
 */
export async function clearTenantContext(): Promise<void> {
  try {
    await queryDirect(
      `RESET app.current_tenant_id`,
      []
    );
  } catch (error) {
    console.error('Failed to clear tenant context:', error);
    throw error;
  }
}

/**
 * Get the current tenant context
 */
export async function getCurrentTenantContext(): Promise<string | null> {
  try {
    const { rows } = await queryDirect(
      `SELECT current_setting('app.current_tenant_id', true) as tenant_id`,
      []
    );
    return rows[0]?.tenant_id || null;
  } catch (error) {
    console.error('Failed to get tenant context:', error);
    return null;
  }
}

/**
 * Execute a query with a specific tenant context
 * This is useful for one-off queries that need to run as a specific tenant
 *
 * @param tenantId - The tenant ID to use for this query
 * @param callback - The function to execute with the tenant context set
 */
export async function withTenantContext<T>(
  tenantId: string,
  callback: () => Promise<T>
): Promise<T> {
  await setTenantContext(tenantId);
  try {
    return await callback();
  } finally {
    await clearTenantContext();
  }
}

/**
 * Default Weathercraft tenant ID
 * This is used when no tenant context is explicitly provided
 */
export const WEATHERCRAFT_TENANT_ID = '51e728c5-94e8-4ae0-8a0a-6a08d1fb3457';

/**
 * Set Weathercraft as the current tenant context
 * Convenience function for the default tenant
 */
export async function setWeatherCraftContext(): Promise<void> {
  await setTenantContext(WEATHERCRAFT_TENANT_ID);
}
