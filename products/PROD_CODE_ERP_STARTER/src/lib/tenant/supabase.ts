import type { PostgrestError } from '@supabase/supabase-js';
import type { createServiceClient } from '@/lib/supabase/service';

export type TenantColumn = 'tenant_id' | 'organization_id';

export const TENANT_COLUMNS: TenantColumn[] = ['tenant_id', 'organization_id'];

type SupabaseClient = ReturnType<typeof createServiceClient>;

const tenantColumnCache = new Map<string, TenantColumn>();

const normalizeErrorField = (value: unknown): string => {
  if (!value) return '';
  return String(value).toLowerCase();
};

export function isMissingTenantColumnError(
  error: PostgrestError | null,
  column: TenantColumn
): boolean {
  if (!error) return false;
  const message = normalizeErrorField(error.message);
  const details = normalizeErrorField(error.details);

  return (
    (message.includes('column') && message.includes(column)) ||
    (details.includes('column') && details.includes(column))
  );
}

export async function resolveTenantColumn(
  supabase: SupabaseClient,
  table: string,
  tenantId: string
): Promise<TenantColumn> {
  const cacheKey = table;
  const cached = tenantColumnCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  let lastError: PostgrestError | null = null;

  for (const column of TENANT_COLUMNS) {
    const { error } = await supabase
      .from(table)
      .select('id')
      .eq(column, tenantId)
      .limit(1);

    if (!error) {
      tenantColumnCache.set(cacheKey, column);
      return column;
    }

    if (isMissingTenantColumnError(error, column)) {
      lastError = error;
      continue;
    }

    throw error;
  }

  throw lastError ?? new Error(`Unable to resolve tenant column for table "${table}"`);
}

export async function runTenantQuery<T>(
  supabase: SupabaseClient,
  table: string,
  tenantId: string,
  executor: (column: TenantColumn) => Promise<{
    data: T[] | null;
    error: PostgrestError | null;
    count?: number | null;
  }>
): Promise<{ data: T[]; count: number; tenantColumn: TenantColumn }> {
  let lastError: PostgrestError | null = null;

  for (const column of TENANT_COLUMNS) {
    const { data, error, count } = await executor(column);

    if (!error) {
      tenantColumnCache.set(table, column);
      return {
        data: data ?? [],
        count: count ?? (data?.length ?? 0),
        tenantColumn: column,
      };
    }

    if (isMissingTenantColumnError(error, column)) {
      lastError = error;
      continue;
    }

    throw error;
  }

  throw lastError ?? new Error(`Unable to resolve tenant column for table "${table}"`);
}

export async function insertWithTenant<
  TPayload extends Record<string, unknown>,
  TResult extends Record<string, unknown> = Record<string, unknown>
>(
  supabase: SupabaseClient,
  table: string,
  tenantId: string,
  payload: TPayload
): Promise<{ data: TResult | null; tenantColumn: TenantColumn }> {
  let lastError: PostgrestError | null = null;

  for (const column of TENANT_COLUMNS) {
    const insertPayload = { ...payload, [column]: tenantId };

    const { data, error } = await supabase
      .from(table)
      .insert(insertPayload)
      .select()
      .maybeSingle();

    if (!error) {
      tenantColumnCache.set(table, column);
      return { data: (data ?? null) as TResult | null, tenantColumn: column };
    }

    if (isMissingTenantColumnError(error, column)) {
      lastError = error;
      continue;
    }

    throw error;
  }

  throw lastError ?? new Error(`Unable to insert into ${table}; tenant column missing`);
}

export async function updateWithTenant<
  TPayload extends Record<string, unknown>,
  TResult extends Record<string, unknown> = Record<string, unknown>
>(
  supabase: SupabaseClient,
  table: string,
  tenantId: string,
  id: string,
  payload: TPayload
): Promise<{ data: TResult | null; tenantColumn: TenantColumn }> {
  let lastError: PostgrestError | null = null;

  for (const column of TENANT_COLUMNS) {
    const { data, error } = await supabase
      .from(table)
      .update(payload)
      .eq('id', id)
      .eq(column, tenantId)
      .select()
      .maybeSingle();

    if (!error) {
      tenantColumnCache.set(table, column);
      return { data: (data ?? null) as TResult | null, tenantColumn: column };
    }

    if (isMissingTenantColumnError(error, column)) {
      lastError = error;
      continue;
    }

    throw error;
  }

  throw lastError ?? new Error(`Unable to update ${table}; tenant column missing`);
}

export async function deleteWithTenant(
  supabase: SupabaseClient,
  table: string,
  tenantId: string,
  id: string
): Promise<{ tenantColumn: TenantColumn; deleted: boolean }> {
  let lastError: PostgrestError | null = null;

  for (const column of TENANT_COLUMNS) {
    const { data, error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq(column, tenantId)
      .select('id')
      .maybeSingle();

    if (!error) {
      tenantColumnCache.set(table, column);
      return { tenantColumn: column, deleted: Boolean(data?.id) };
    }

    if (isMissingTenantColumnError(error, column)) {
      lastError = error;
      continue;
    }

    throw error;
  }

  throw lastError ?? new Error(`Unable to delete from ${table}; tenant column missing`);
}
