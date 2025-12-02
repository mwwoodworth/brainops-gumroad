/**
 * Core OS Events Management
 * Append-only event log for all significant system activities
 */

import { createServiceClient } from '@/lib/supabase/service';
import { logger } from '@/lib/logger';

export interface Event {
  id: string;
  tenant_id?: string | null;
  event_type: string;
  source_system: 'erp' | 'mrg' | 'brainops' | 'ai-agents' | 'cli' | 'manual';
  actor?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  payload?: Record<string, any>;
  occurred_at: string;
  created_at: string;
}

export interface LogEventInput {
  event_type: string;
  source_system?: Event['source_system'];
  tenant_id?: string;
  actor?: string;
  entity_type?: string;
  entity_id?: string;
  payload?: Record<string, any>;
  occurred_at?: Date;
}

/**
 * Log an event to the append-only event store
 */
export async function logEvent(input: LogEventInput): Promise<Event | null> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('os_events')
      .insert({
        event_type: input.event_type,
        source_system: input.source_system || 'erp',
        tenant_id: input.tenant_id,
        actor: input.actor,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        payload: input.payload || {},
        occurred_at: (input.occurred_at || new Date()).toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to log event', { error, input });
      return null;
    }

    logger.debug('Event logged', {
      event_id: data.id,
      event_type: input.event_type,
      entity: input.entity_type ? `${input.entity_type}:${input.entity_id}` : undefined
    });

    return data as Event;
  } catch (error) {
    logger.error('Error logging event', { error, input });
    return null;
  }
}

/**
 * Log a task-related event
 */
export async function logTaskEvent(
  taskId: string,
  eventType: string,
  actor?: string,
  metadata?: Record<string, any>,
  tenantId?: string
): Promise<Event | null> {
  return logEvent({
    event_type: `task.${eventType}`,
    source_system: 'erp',
    tenant_id: tenantId,
    actor,
    entity_type: 'task',
    entity_id: taskId,
    payload: metadata
  });
}

/**
 * Log a business entity event
 */
export async function logBusinessEvent(
  entityType: string,
  entityId: string,
  eventType: string,
  actor?: string,
  metadata?: Record<string, any>,
  tenantId?: string
): Promise<Event | null> {
  return logEvent({
    event_type: `${entityType}.${eventType}`,
    source_system: 'erp',
    tenant_id: tenantId,
    actor,
    entity_type: entityType,
    entity_id: entityId,
    payload: metadata
  });
}

/**
 * Get recent events for a tenant
 */
export async function getRecentEvents(
  tenantId: string,
  limit: number = 50,
  filters?: {
    event_type?: string;
    entity_type?: string;
    entity_id?: string;
    actor?: string;
    since?: Date;
  }
): Promise<Event[]> {
  try {
    const supabase = createServiceClient();

    let query = supabase
      .from('os_events')
      .select()
      .eq('tenant_id', tenantId)
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (filters?.event_type) {
      query = query.eq('event_type', filters.event_type);
    }
    if (filters?.entity_type) {
      query = query.eq('entity_type', filters.entity_type);
    }
    if (filters?.entity_id) {
      query = query.eq('entity_id', filters.entity_id);
    }
    if (filters?.actor) {
      query = query.eq('actor', filters.actor);
    }
    if (filters?.since) {
      query = query.gte('occurred_at', filters.since.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to get recent events', { error, tenantId, filters });
      return [];
    }

    return (data as Event[]) || [];
  } catch (error) {
    logger.error('Error getting recent events', { error, tenantId, filters });
    return [];
  }
}

/**
 * Get events for an entity
 */
export async function getEntityEvents(
  entityType: string,
  entityId: string,
  limit: number = 50
): Promise<Event[]> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('os_events')
      .select()
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to get entity events', { error, entityType, entityId });
      return [];
    }

    return (data as Event[]) || [];
  } catch (error) {
    logger.error('Error getting entity events', { error, entityType, entityId });
    return [];
  }
}

/**
 * Get event timeline for dashboard
 */
export async function getEventTimeline(
  tenantId?: string,
  hours: number = 24
): Promise<Event[]> {
  try {
    const supabase = createServiceClient();
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    let query = supabase
      .from('os_events')
      .select()
      .gte('occurred_at', since.toISOString())
      .order('occurred_at', { ascending: false })
      .limit(100);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to get event timeline', { error, tenantId, hours });
      return [];
    }

    return (data as Event[]) || [];
  } catch (error) {
    logger.error('Error getting event timeline', { error, tenantId, hours });
    return [];
  }
}

/**
 * Get event statistics
 */
export async function getEventStats(tenantId?: string) {
  try {
    const supabase = createServiceClient();
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    let baseQuery = supabase.from('os_events').select('event_type', { count: 'exact' });

    if (tenantId) {
      baseQuery = baseQuery.eq('tenant_id', tenantId);
    }

    // Get total count
    const { count: totalCount } = await baseQuery;

    // Get last 24h count
    let last24hQuery = supabase
      .from('os_events')
      .select('event_type', { count: 'exact' })
      .gte('occurred_at', last24h.toISOString());

    if (tenantId) {
      last24hQuery = last24hQuery.eq('tenant_id', tenantId);
    }

    const { count: last24hCount } = await last24hQuery;

    // Get last 7d count
    let last7dQuery = supabase
      .from('os_events')
      .select('event_type', { count: 'exact' })
      .gte('occurred_at', last7d.toISOString());

    if (tenantId) {
      last7dQuery = last7dQuery.eq('tenant_id', tenantId);
    }

    const { count: last7dCount } = await last7dQuery;

    // Get event type breakdown for last 24h
    let typeQuery = supabase
      .from('os_events')
      .select('event_type')
      .gte('occurred_at', last24h.toISOString());

    if (tenantId) {
      typeQuery = typeQuery.eq('tenant_id', tenantId);
    }

    const { data: typeData } = await typeQuery;

    const typeCounts = typeData?.reduce((acc: Record<string, number>, event: any) => {
      const baseType = event.event_type.split('.')[0];
      acc[baseType] = (acc[baseType] || 0) + 1;
      return acc;
    }, {}) || {};

    return {
      total: totalCount || 0,
      last_24h: last24hCount || 0,
      last_7d: last7dCount || 0,
      by_type: typeCounts
    };
  } catch (error) {
    logger.error('Error getting event stats', { error, tenantId });
    return null;
  }
}

/**
 * Helper to log common ERP events
 */
export const erpEvents = {
  // Service dispatch events
  dispatchCreated: (dispatchId: string, actor?: string, metadata?: any, tenantId?: string) =>
    logBusinessEvent('dispatch', dispatchId, 'created', actor, metadata, tenantId),

  dispatchAssigned: (dispatchId: string, technicianId: string, actor?: string, tenantId?: string) =>
    logBusinessEvent('dispatch', dispatchId, 'assigned', actor, { technician_id: technicianId }, tenantId),

  dispatchCompleted: (dispatchId: string, actor?: string, metadata?: any, tenantId?: string) =>
    logBusinessEvent('dispatch', dispatchId, 'completed', actor, metadata, tenantId),

  // Invoice events
  invoiceCreated: (invoiceId: string, customerId: string, amount: number, actor?: string, tenantId?: string) =>
    logBusinessEvent('invoice', invoiceId, 'created', actor, { customer_id: customerId, amount }, tenantId),

  invoicePaid: (invoiceId: string, paymentMethod: string, amount: number, actor?: string, tenantId?: string) =>
    logBusinessEvent('invoice', invoiceId, 'paid', actor, { payment_method: paymentMethod, amount }, tenantId),

  // Job events
  jobCreated: (jobId: string, customerId: string, actor?: string, metadata?: any, tenantId?: string) =>
    logBusinessEvent('job', jobId, 'created', actor, { customer_id: customerId, ...metadata }, tenantId),

  jobScheduled: (jobId: string, scheduledDate: Date, actor?: string, tenantId?: string) =>
    logBusinessEvent('job', jobId, 'scheduled', actor, { scheduled_date: scheduledDate.toISOString() }, tenantId),

  jobCompleted: (jobId: string, actor?: string, metadata?: any, tenantId?: string) =>
    logBusinessEvent('job', jobId, 'completed', actor, metadata, tenantId),

  // Schedule events
  scheduleChanged: (scheduleId: string, changes: any, actor?: string, tenantId?: string) =>
    logBusinessEvent('schedule', scheduleId, 'changed', actor, changes, tenantId),

  // Safety/quality events
  safetyIncident: (incidentId: string, severity: string, actor?: string, metadata?: any, tenantId?: string) =>
    logBusinessEvent('safety', incidentId, 'incident_reported', actor, { severity, ...metadata }, tenantId),

  inspectionFailed: (inspectionId: string, reason: string, actor?: string, tenantId?: string) =>
    logBusinessEvent('inspection', inspectionId, 'failed', actor, { reason }, tenantId)
};