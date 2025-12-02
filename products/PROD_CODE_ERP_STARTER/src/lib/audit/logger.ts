/**
 * Audit Logging System
 * Week 12: Enterprise Polish & Launch
 * Comprehensive activity tracking for compliance and security
 */

import { createClient } from '@supabase/supabase-js';

const readEnv = (name: string): string | undefined => {
  const rawValue = typeof process !== 'undefined' ? process.env?.[name] : undefined;
  if (typeof rawValue !== 'string') {
    return undefined;
  }

  const trimmed = rawValue.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

// Singleton Supabase client for server-side operations
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = readEnv('NEXT_PUBLIC_SUPABASE_URL') ?? readEnv('SUPABASE_URL');
  const supabaseServiceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase credentials not configured - audit logging disabled');
    return null;
  }

  supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  return supabaseClient;
}

/**
 * Audit action types
 */
export enum AuditAction {
  // Authentication
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGIN_FAILED = 'login_failed',
  SESSION_EXPIRED = 'session_expired',

  // CRUD operations
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',

  // Business operations
  APPROVE = 'approve',
  REJECT = 'reject',
  SEND = 'send',
  VOID = 'void',
  COMPLETE = 'complete',
  ASSIGN = 'assign',

  // Permission operations
  PERMISSION_CHANGE = 'permission_change',
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_REMOVED = 'role_removed',
  ACCESS_GRANTED = 'access_granted',
  ACCESS_REVOKED = 'access_revoked',

  // AI operations
  AI_EXECUTION = 'ai_execution',
  AI_PREDICTION = 'ai_prediction',
  AI_TRAINING = 'ai_training',

  // System operations
  CONFIG_CHANGE = 'config_change',
  BACKUP_CREATED = 'backup_created',
  RESTORE_PERFORMED = 'restore_performed',
  MAINTENANCE_START = 'maintenance_start',
  MAINTENANCE_END = 'maintenance_end',
}

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  // User information
  user_id: string;
  user_email: string;
  user_role?: string;

  // Action details
  action: AuditAction;
  resource_type: string;
  resource_id?: string;

  // Change tracking
  changes?: Record<string, { old?: any; new?: any }>;
  metadata?: Record<string, any>;

  // Request information
  ip_address?: string;
  user_agent?: string;
  request_path?: string;
  request_method?: string;

  // Response information
  status_code?: number;
  response_time_ms?: number;
  error_message?: string;
}

/**
 * Log an audit event
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('Audit logging skipped - Supabase not configured');
      return;
    }

    const { error } = await supabase.from('audit_logs').insert({
      timestamp: new Date().toISOString(),
      ...entry,
    } as any);

    if (error) {
      console.error('Failed to log audit entry:', error);
    }
  } catch (error) {
    console.error('Audit logging error:', error);
  }
}

/**
 * Log user authentication
 */
export async function logAuthentication(
  userId: string,
  email: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    user_id: userId,
    user_email: email,
    action: success ? AuditAction.LOGIN : AuditAction.LOGIN_FAILED,
    resource_type: 'auth',
    ip_address: ipAddress,
    user_agent: userAgent,
    status_code: success ? 200 : 401,
  });
}

/**
 * Log data access
 */
export async function logDataAccess(
  userId: string,
  email: string,
  resourceType: string,
  resourceId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logAudit({
    user_id: userId,
    user_email: email,
    action: AuditAction.READ,
    resource_type: resourceType,
    resource_id: resourceId,
    metadata,
  });
}

/**
 * Log data creation
 */
export async function logDataCreation(
  userId: string,
  email: string,
  resourceType: string,
  resourceId: string,
  data: Record<string, any>
): Promise<void> {
  await logAudit({
    user_id: userId,
    user_email: email,
    action: AuditAction.CREATE,
    resource_type: resourceType,
    resource_id: resourceId,
    changes: Object.entries(data).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: { new: value },
      }),
      {}
    ),
  });
}

/**
 * Log data update
 */
export async function logDataUpdate(
  userId: string,
  email: string,
  resourceType: string,
  resourceId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>
): Promise<void> {
  const changes: Record<string, { old?: any; new?: any }> = {};

  // Track only changed fields
  Object.keys(newData).forEach((key) => {
    if (oldData[key] !== newData[key]) {
      changes[key] = {
        old: oldData[key],
        new: newData[key],
      };
    }
  });

  await logAudit({
    user_id: userId,
    user_email: email,
    action: AuditAction.UPDATE,
    resource_type: resourceType,
    resource_id: resourceId,
    changes,
  });
}

/**
 * Log data deletion
 */
export async function logDataDeletion(
  userId: string,
  email: string,
  resourceType: string,
  resourceId: string,
  data: Record<string, any>
): Promise<void> {
  await logAudit({
    user_id: userId,
    user_email: email,
    action: AuditAction.DELETE,
    resource_type: resourceType,
    resource_id: resourceId,
    changes: Object.entries(data).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: { old: value },
      }),
      {}
    ),
  });
}

/**
 * Log permission change
 */
export async function logPermissionChange(
  changedBy: { userId: string; email: string },
  targetUser: { userId: string; email: string },
  changeType: 'role_assigned' | 'role_removed' | 'permission_granted' | 'permission_revoked',
  details: Record<string, any>
): Promise<void> {
  await logAudit({
    user_id: changedBy.userId,
    user_email: changedBy.email,
    action: AuditAction.PERMISSION_CHANGE,
    resource_type: 'user',
    resource_id: targetUser.userId,
    metadata: {
      target_email: targetUser.email,
      change_type: changeType,
      ...details,
    },
  });
}

/**
 * Log AI execution
 */
export async function logAIExecution(
  userId: string,
  email: string,
  agentName: string,
  operation: string,
  result: 'success' | 'failure',
  metadata?: Record<string, any>
): Promise<void> {
  await logAudit({
    user_id: userId,
    user_email: email,
    action: AuditAction.AI_EXECUTION,
    resource_type: 'ai_agent',
    resource_id: agentName,
    metadata: {
      operation,
      result,
      ...metadata,
    },
    status_code: result === 'success' ? 200 : 500,
  });
}

/**
 * Log data export
 */
export async function logDataExport(
  userId: string,
  email: string,
  resourceType: string,
  exportFormat: string,
  rowCount: number,
  filters?: Record<string, any>
): Promise<void> {
  await logAudit({
    user_id: userId,
    user_email: email,
    action: AuditAction.EXPORT,
    resource_type: resourceType,
    metadata: {
      export_format: exportFormat,
      row_count: rowCount,
      filters,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log system configuration change
 */
export async function logConfigChange(
  userId: string,
  email: string,
  configKey: string,
  oldValue: any,
  newValue: any
): Promise<void> {
  await logAudit({
    user_id: userId,
    user_email: email,
    action: AuditAction.CONFIG_CHANGE,
    resource_type: 'system_config',
    resource_id: configKey,
    changes: {
      [configKey]: {
        old: oldValue,
        new: newValue,
      },
    },
  });
}

/**
 * Query audit logs
 */
export async function queryAuditLogs(filters: {
  user_id?: string;
  action?: AuditAction;
  resource_type?: string;
  start_date?: Date;
  end_date?: Date;
  limit?: number;
}): Promise<any[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  let query = supabase.from('audit_logs').select('*');

  if (filters.user_id) {
    query = query.eq('user_id', filters.user_id);
  }

  if (filters.action) {
    query = query.eq('action', filters.action);
  }

  if (filters.resource_type) {
    query = query.eq('resource_type', filters.resource_type);
  }

  if (filters.start_date) {
    query = query.gte('timestamp', filters.start_date.toISOString());
  }

  if (filters.end_date) {
    query = query.lte('timestamp', filters.end_date.toISOString());
  }

  query = query.order('timestamp', { ascending: false });

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to query audit logs:', error);
    return [];
  }

  return data || [];
}

/**
 * Get audit log statistics
 */
export async function getAuditStats(filters: {
  start_date?: Date;
  end_date?: Date;
}): Promise<{
  total_events: number;
  by_action: Record<string, number>;
  by_user: Record<string, number>;
  by_resource: Record<string, number>;
}> {
  const logs = await queryAuditLogs({
    start_date: filters.start_date,
    end_date: filters.end_date,
    limit: 10000, // Limit for performance
  });

  const stats = {
    total_events: logs.length,
    by_action: {} as Record<string, number>,
    by_user: {} as Record<string, number>,
    by_resource: {} as Record<string, number>,
  };

  logs.forEach((log) => {
    // Count by action
    stats.by_action[log.action] = (stats.by_action[log.action] || 0) + 1;

    // Count by user
    stats.by_user[log.user_email] = (stats.by_user[log.user_email] || 0) + 1;

    // Count by resource
    stats.by_resource[log.resource_type] = (stats.by_resource[log.resource_type] || 0) + 1;
  });

  return stats;
}
