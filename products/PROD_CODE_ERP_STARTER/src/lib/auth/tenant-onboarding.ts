import { createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

interface RegisterTenantInput {
  companyName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface RegisterTenantResult {
  tenantId: string;
  tenantSubdomain: string;
  userId: string;
}

function slugifyCompanyName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return base.length > 0 ? base : `tenant-${Date.now()}`;
}

async function generateUniqueSubdomain(
  supabaseAdmin: ReturnType<typeof createServiceRoleClient>,
  companyName: string
): Promise<string> {
  let subdomain = slugifyCompanyName(companyName);
  let suffix = 1;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('subdomain', subdomain)
      .maybeSingle();

    if (error) {
      logger.error('[auth] Failed to validate tenant subdomain uniqueness', error);
      throw new Error('Unable to validate company identifier. Please try again.');
    }

    if (!data) {
      return subdomain;
    }

    subdomain = `${subdomain}-${suffix}`;
    suffix += 1;
  }
}

export async function registerTenantAndOwner(input: RegisterTenantInput): Promise<RegisterTenantResult> {
  const supabaseAdmin = createServiceRoleClient();

  let createdTenantId: string | null = null;
  let createdUserId: string | null = null;

  try {
    const subdomain = await generateUniqueSubdomain(supabaseAdmin, input.companyName);
    const schemaName = `tenant_${subdomain}`.replace(/[^a-z0-9_]/g, '_').slice(0, 60);

    // Create tenant record first
    const { data: tenantInsert, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        company_name: input.companyName.trim(),
        owner_email: input.email.trim().toLowerCase(),
        subdomain,
        schema_name: schemaName,
        subscription_tier: 'starter',
        subscription_status: 'trialing',
        activated_agents: [],
      })
      .select('id, subdomain, schema_name')
      .single();

    if (tenantError || !tenantInsert) {
      logger.error('[auth] Failed to create tenant record', tenantError);
      throw new Error('Unable to create company profile. Please try again.');
    }

    createdTenantId = tenantInsert.id;

    // Create auth user with metadata
    const { data: userResult, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      email_confirm: true, // allow immediate login; follow-up verification handled separately
      user_metadata: {
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        phone: input.phone?.trim() ?? null,
        tenant_id: tenantInsert.id,
        tenant_subdomain: tenantInsert.subdomain,
        role: 'owner',
      },
      app_metadata: {
        role: 'owner',
        tenant_id: tenantInsert.id,
      },
    });

    if (userError || !userResult.user) {
      logger.error('[auth] Failed to create Supabase auth user', userError);
      throw new Error(userError?.message ?? 'Unable to create user account. Please try again.');
    }

    createdUserId = userResult.user.id;

    // Link user to tenant with owner role
    const { error: membershipError } = await supabaseAdmin
      .from('user_tenants')
      .upsert(
        {
          user_id: userResult.user.id,
          tenant_id: tenantInsert.id,
          role: 'owner',
        },
        {
          onConflict: 'user_id,tenant_id',
          ignoreDuplicates: false,
        }
      );

    if (membershipError) {
      logger.error('[auth] Failed to create user_tenants link', membershipError);
      throw new Error('Unable to finalize user membership. Please contact support.');
    }

    return {
      tenantId: tenantInsert.id,
      tenantSubdomain: tenantInsert.subdomain,
      userId: userResult.user.id,
    };
  } catch (error) {
    logger.error('[auth] registerTenantAndOwner failed', error);

    const supabaseAdminForRollback = createServiceRoleClient();

    if (createdUserId) {
      try {
        await supabaseAdminForRollback.auth.admin.deleteUser(createdUserId);
      } catch (deleteError) {
        logger.error('[auth] Failed to rollback created auth user', deleteError);
      }
    }

    if (createdTenantId) {
      try {
        await supabaseAdminForRollback
          .from('tenants')
          .delete()
          .eq('id', createdTenantId);
      } catch (deleteError) {
        logger.error('[auth] Failed to rollback tenant record', deleteError);
      }
    }

    throw error instanceof Error ? error : new Error('Registration failed unexpectedly.');
  }
}
