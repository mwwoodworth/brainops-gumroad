'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

type AgentDefinition = {
  agent_name: string;
  display_name?: string | null;
  description?: string | null;
  agent_type?: string | null;
  is_active?: boolean | null;
};

const supabase = createServiceRoleClient();

const buildAgentMap = (definitions: AgentDefinition[]) =>
  definitions.reduce<Record<string, AgentDefinition>>((acc, def) => {
    acc[def.agent_name] = def;
    return acc;
  }, {});

export async function isAgentEnabled(tenantId: string | null, agentId: string) {
  if (!tenantId) return true;

  const { data, error } = await supabase
    .from('tenant_ai_agent_settings')
    .select('enabled')
    .eq('tenant_id', tenantId)
    .eq('agent_id', agentId)
    .maybeSingle();

  if (error) {
    logger.warn('[AI Config] Failed to read toggle', { error, tenantId, agentId });
    return true;
  }

  if (data) {
    return data.enabled !== false;
  }

  const { data: definition, error: definitionError } = await supabase
    .from('ai_agent_configs')
    .select('is_active')
    .eq('agent_name', agentId)
    .maybeSingle();

  if (definitionError) {
    logger.warn('[AI Config] Failed to read definition', { definitionError, agentId });
    return true;
  }

  return definition?.is_active !== false;
}

export async function getTenantAgentConfig(tenantId: string) {
  const [{ data: definitions, error: definitionError }, { data: overrides, error: overrideError }] =
    await Promise.all([
      supabase
        .from('ai_agent_configs')
        .select('agent_name, display_name, description, agent_type, is_active')
        .order('agent_name', { ascending: true }),
      supabase
        .from('tenant_ai_agent_settings')
        .select('agent_id, enabled')
        .eq('tenant_id', tenantId),
    ]);

  if (definitionError) {
    logger.error('[AI Config] Failed to load agent definitions', definitionError);
    throw new Error('Unable to load AI agents');
  }

  if (overrideError) {
    logger.warn('[AI Config] Failed to load tenant overrides', overrideError);
  }

  const overrideMap = new Map<string, boolean>();
  overrides?.forEach((row) => {
    overrideMap.set(row.agent_id, row.enabled);
  });

  const definitionsMap = buildAgentMap(definitions ?? []);

  return (definitions ?? []).map((agent) => ({
    id: agent.agent_name,
    name: agent.display_name ?? agent.agent_name,
    description: agent.description ?? '',
    type: agent.agent_type ?? 'general',
    enabled: overrideMap.has(agent.agent_name)
      ? overrideMap.get(agent.agent_name)!
      : agent.is_active !== false,
  }));
}

export async function saveTenantAgentConfig(
  tenantId: string,
  config: Record<string, boolean>
) {
  const payload = Object.entries(config).map(([agentId, enabled]) => ({
    tenant_id: tenantId,
    agent_id: agentId,
    enabled,
  }));

  const { error } = await supabase
    .from('tenant_ai_agent_settings')
    .upsert(payload, { onConflict: 'tenant_id,agent_id' });

  if (error) {
    logger.error('[AI Config] Failed to persist overrides', { error, tenantId });
    throw new Error('Failed to update AI agent configuration');
  }
}
