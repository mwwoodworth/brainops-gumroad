import { createServiceClient } from '@/lib/supabase/service';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function logAudit(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string | undefined,
  tenantId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entityType: string,
  entityId: string,
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null
) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      tenant_id: tenantId,
      action: action,
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue,
      new_value: newValue,
    });
  } catch (error) {
    logger.error('Failed to write audit log:', getErrorMessage(error));
  }
}