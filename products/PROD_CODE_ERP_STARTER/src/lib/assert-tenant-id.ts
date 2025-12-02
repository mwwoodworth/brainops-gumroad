/**
 * Tenant ID Validation Helper
 *
 * Validates and ensures tenant_id is present for all multi-tenant operations.
 * Throws an error if tenant_id is missing, null, or empty.
 *
 * @param value - The tenant_id value to validate
 * @param operationType - Optional operation type for error message (default: "this operation")
 * @returns The validated tenant_id string
 * @throws Error if tenant_id is missing or invalid
 */
export function assertTenantId(value?: string | null, operationType: string = 'this operation'): string {
  const tenantId = typeof value === 'string' ? value.trim() : null;
  if (!tenantId) {
    throw new Error(`tenant_id is required for ${operationType}`);
  }
  return tenantId;
}
