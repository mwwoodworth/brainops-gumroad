/**
 * Core OS Memory Management
 * Persistent knowledge and insights storage
 */

import { createServiceClient } from '@/lib/supabase/service';
import { logger } from '@/lib/logger';

export interface Memory {
  id: string;
  tenant_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  kind: 'fact' | 'insight' | 'decision' | 'outcome' | 'learning' | 'context';
  content: string;
  source: string;
  created_by?: string | null;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface StoreMemoryInput {
  content: string;
  kind?: Memory['kind'];
  source?: string;
  tenant_id?: string;
  entity_type?: string;
  entity_id?: string;
  created_by?: string;
  metadata?: Record<string, any>;
}

/**
 * Store a memory
 */
export async function storeMemory(input: StoreMemoryInput): Promise<Memory | null> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('memories')
      .insert({
        content: input.content,
        kind: input.kind || 'fact',
        source: input.source || 'erp',
        tenant_id: input.tenant_id,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        created_by: input.created_by,
        metadata: input.metadata || {}
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to store memory', { error, input });
      return null;
    }

    logger.debug('Memory stored', {
      memory_id: data.id,
      kind: input.kind,
      entity: input.entity_type ? `${input.entity_type}:${input.entity_id}` : undefined
    });

    return data as Memory;
  } catch (error) {
    logger.error('Error storing memory', { error, input });
    return null;
  }
}

/**
 * Store a task outcome as memory
 */
export async function storeTaskOutcome(
  taskId: string,
  outcome: string,
  metadata?: Record<string, any>,
  tenantId?: string
): Promise<Memory | null> {
  return storeMemory({
    content: outcome,
    kind: 'outcome',
    source: 'task_completion',
    tenant_id: tenantId,
    entity_type: 'task',
    entity_id: taskId,
    metadata: {
      ...metadata,
      task_id: taskId,
      stored_at: new Date().toISOString()
    }
  });
}

/**
 * Store an insight from AI processing
 */
export async function storeAIInsight(
  content: string,
  entityType?: string,
  entityId?: string,
  aiSource?: string,
  confidence?: number,
  tenantId?: string
): Promise<Memory | null> {
  return storeMemory({
    content,
    kind: 'insight',
    source: `ai:${aiSource || 'analysis'}`,
    tenant_id: tenantId,
    entity_type: entityType,
    entity_id: entityId,
    metadata: {
      ai_source: aiSource,
      confidence,
      generated_at: new Date().toISOString()
    }
  });
}

/**
 * Store a business decision
 */
export async function storeDecision(
  decision: string,
  rationale: string,
  entityType?: string,
  entityId?: string,
  decidedBy?: string,
  tenantId?: string
): Promise<Memory | null> {
  return storeMemory({
    content: `${decision}\n\nRationale: ${rationale}`,
    kind: 'decision',
    source: 'business_decision',
    tenant_id: tenantId,
    entity_type: entityType,
    entity_id: entityId,
    created_by: decidedBy,
    metadata: {
      decision,
      rationale,
      decided_at: new Date().toISOString()
    }
  });
}

/**
 * List memories for an entity
 */
export async function listMemoriesForEntity(
  entityType: string,
  entityId: string,
  limit: number = 50
): Promise<Memory[]> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('memories')
      .select()
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to list memories for entity', { error, entityType, entityId });
      return [];
    }

    return (data as Memory[]) || [];
  } catch (error) {
    logger.error('Error listing memories for entity', { error, entityType, entityId });
    return [];
  }
}

/**
 * Get recent memories for a tenant
 */
export async function getRecentMemories(
  tenantId: string,
  limit: number = 50,
  filters?: {
    kind?: Memory['kind'];
    entity_type?: string;
    since?: Date;
  }
): Promise<Memory[]> {
  try {
    const supabase = createServiceClient();

    let query = supabase
      .from('memories')
      .select()
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filters?.kind) {
      query = query.eq('kind', filters.kind);
    }
    if (filters?.entity_type) {
      query = query.eq('entity_type', filters.entity_type);
    }
    if (filters?.since) {
      query = query.gte('created_at', filters.since.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to get recent memories', { error, tenantId, filters });
      return [];
    }

    return (data as Memory[]) || [];
  } catch (error) {
    logger.error('Error getting recent memories', { error, tenantId, filters });
    return [];
  }
}

/**
 * Search memories by content
 */
export async function searchMemories(
  searchTerm: string,
  tenantId?: string,
  limit: number = 50
): Promise<Memory[]> {
  try {
    const supabase = createServiceClient();

    let query = supabase
      .from('memories')
      .select()
      .ilike('content', `%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to search memories', { error, searchTerm, tenantId });
      return [];
    }

    return (data as Memory[]) || [];
  } catch (error) {
    logger.error('Error searching memories', { error, searchTerm, tenantId });
    return [];
  }
}

/**
 * Get memory statistics
 */
export async function getMemoryStats(tenantId?: string) {
  try {
    const supabase = createServiceClient();
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    let baseQuery = supabase.from('memories').select('kind', { count: 'exact' });

    if (tenantId) {
      baseQuery = baseQuery.eq('tenant_id', tenantId);
    }

    // Get total count
    const { count: totalCount } = await baseQuery;

    // Get last 24h count
    let last24hQuery = supabase
      .from('memories')
      .select('kind', { count: 'exact' })
      .gte('created_at', last24h.toISOString());

    if (tenantId) {
      last24hQuery = last24hQuery.eq('tenant_id', tenantId);
    }

    const { count: last24hCount } = await last24hQuery;

    // Get last 7d count
    let last7dQuery = supabase
      .from('memories')
      .select('kind', { count: 'exact' })
      .gte('created_at', last7d.toISOString());

    if (tenantId) {
      last7dQuery = last7dQuery.eq('tenant_id', tenantId);
    }

    const { count: last7dCount } = await last7dQuery;

    // Get kind breakdown
    let kindQuery = supabase.from('memories').select('kind');

    if (tenantId) {
      kindQuery = kindQuery.eq('tenant_id', tenantId);
    }

    const { data: kindData } = await kindQuery;

    const kindCounts = kindData?.reduce((acc: Record<string, number>, memory: any) => {
      acc[memory.kind] = (acc[memory.kind] || 0) + 1;
      return acc;
    }, {}) || {};

    return {
      total: totalCount || 0,
      last_24h: last24hCount || 0,
      last_7d: last7dCount || 0,
      by_kind: kindCounts
    };
  } catch (error) {
    logger.error('Error getting memory stats', { error, tenantId });
    return null;
  }
}

/**
 * Helper functions for common memory patterns
 */
export const erpMemories = {
  // Store job completion outcome
  jobCompleted: (jobId: string, outcome: string, metrics?: any, tenantId?: string) =>
    storeMemory({
      content: outcome,
      kind: 'outcome',
      source: 'job_completion',
      tenant_id: tenantId,
      entity_type: 'job',
      entity_id: jobId,
      metadata: {
        ...metrics,
        completed_at: new Date().toISOString()
      }
    }),

  // Store customer interaction insight
  customerInsight: (customerId: string, insight: string, source?: string, tenantId?: string) =>
    storeAIInsight(insight, 'customer', customerId, source, undefined, tenantId),

  // Store scheduling optimization result
  scheduleOptimized: (result: string, savedHours?: number, tenantId?: string) =>
    storeMemory({
      content: result,
      kind: 'outcome',
      source: 'schedule_optimization',
      tenant_id: tenantId,
      metadata: {
        saved_hours: savedHours,
        optimized_at: new Date().toISOString()
      }
    }),

  // Store safety learning
  safetyLearning: (learning: string, incidentId?: string, preventionSteps?: string[], tenantId?: string) =>
    storeMemory({
      content: learning,
      kind: 'learning',
      source: 'safety_analysis',
      tenant_id: tenantId,
      entity_type: incidentId ? 'incident' : undefined,
      entity_id: incidentId,
      metadata: {
        prevention_steps: preventionSteps,
        learned_at: new Date().toISOString()
      }
    }),

  // Store invoice collection outcome
  collectionResult: (invoiceId: string, result: string, method?: string, tenantId?: string) =>
    storeMemory({
      content: result,
      kind: 'outcome',
      source: 'collections',
      tenant_id: tenantId,
      entity_type: 'invoice',
      entity_id: invoiceId,
      metadata: {
        collection_method: method,
        collected_at: new Date().toISOString()
      }
    })
};
