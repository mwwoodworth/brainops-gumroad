import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { isE2ETestBypassEnabled } from '@/lib/env';

export async function getCurrentTenantId(): Promise<string | null> {
  // E2E Testing: Return default test tenant ID when bypass flags are enabled
  const truthy = (v?: string | null) => ['1', 'true', 'yes'].includes(String(v || '').toLowerCase());
  if (
    isE2ETestBypassEnabled() ||
    truthy(process.env.PLAYWRIGHT_BYPASS_AUTH) ||
    truthy(process.env.E2E_BYPASS_AUTH)
  ) {
    return (
      process.env.PLAYWRIGHT_TENANT_ID ||
      process.env.TEST_USER_TENANT_ID ||
      '51e728c5-94e8-4ae0-8a0a-6a08d1fb3457'
    );
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.email) {
    logger.warn('No authenticated user session found');
    return null;
  }

  // First check metadata (backwards compatibility)
  const metadataTenantId =
    session?.user?.user_metadata?.tenant_id ??
    session?.user?.app_metadata?.tenant_id ??
    null;

  if (metadataTenantId) {
    return metadataTenantId;
  }

  // Next look for membership entry via user_tenants
  try {
    const { data: membership, error: membershipError } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      logger.error('Failed to fetch user tenant mapping:', membershipError);
    } else if (membership?.tenant_id) {
      return membership.tenant_id;
    }
  } catch (membershipCatchError) {
    logger.error('Error retrieving user tenant mapping:', membershipCatchError);
  }

  // Look up tenant_id from employees table by email
  try {
    const { data: employee, error } = await supabase
      .from('employees')
      .select('tenant_id')
      .eq('email', session.user.email)
      .single();

    if (error) {
      logger.error('Failed to fetch tenant from employees table:', error);
      return null;
    }

    if (employee?.tenant_id) {
      logger.debug(`Found tenant ${employee.tenant_id} for user ${session.user.email}`);
      return employee.tenant_id;
    }

    logger.warn(`No employee record found for user ${session.user.email}`);
    return null;
  } catch (error) {
    logger.error('Error fetching tenant_id:', error);
    return null;
  }
}

export async function requireCurrentTenantId(): Promise<string> {
  const tenantId = await getCurrentTenantId();

  if (!tenantId) {
    throw new Error('Tenant context is required but missing in the current session.');
  }

  return tenantId;
}
