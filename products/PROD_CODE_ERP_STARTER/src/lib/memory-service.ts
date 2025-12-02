import { logger } from '@/lib/logger';
import { BRAINOPS_AI_AGENTS_URL, BRAINOPS_API_KEY } from '@/lib/brainops/env';
import type { JsonValue } from '@/types/json';

export interface OperationalEvent {
  content: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  source?: string;
  occurredAt?: string;
}

export type MemoryEntry = {
  id?: string;
  type?: string;
  content?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  score?: number;
  created_at?: string;
};

const MEMORY_ENDPOINT = `${BRAINOPS_AI_AGENTS_URL.replace(/\/$/, '')}/api/v1/knowledge/store`;

const normalizeKey = (key?: string | null) => (key ? key.trim() : '');

const resolveApiKey = (): string | null => {
  const envKey =
    normalizeKey(process.env.BRAINOPS_AGENTS_API_KEY) ||
    normalizeKey(process.env.BRAINOPS_API_KEY) ||
    normalizeKey(process.env.AI_AGENTS_API_KEY) ||
    normalizeKey(process.env.AI_AGENTS_TEST_KEY) ||
    normalizeKey(process.env.BRAINOPS_PROD_KEY);
  const fallback = 'brainops_prod_key_2025';
  return envKey || fallback;
};

/**
 * Fire-and-forget memory recording. Never throws; logs on failure.
 */
export async function storeOperationalMemory(event: OperationalEvent): Promise<void> {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    logger.debug?.('[MemoryService] Skipping memory store: missing API key');
    return;
  }

  const payload = {
    content: event.content,
    tags: event.tags,
    metadata: event.metadata ?? {},
    source: event.source ?? 'erp',
    occurred_at: event.occurredAt ?? new Date().toISOString(),
  };

  try {
    const response = await fetch(MEMORY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ApiKey ${apiKey}`,
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      logger.warn(`[MemoryService] Failed to store memory (${response.status}): ${text}`);
    }
  } catch (error) {
    logger.warn('[MemoryService] Error storing operational memory', error);
  }
}

/**
 * Legacy-compatible memory service facade.
 * Provides best-effort storage; recall/cache are stubbed to keep behavior non-breaking.
 */
export const memoryService = {
  async store(
    type: string,
    content: unknown,
    metadata?: Record<string, unknown>,
    weight?: number,
    tags?: string[]
  ): Promise<void> {
    const normalizedContent =
      typeof content === 'string' ? content : JSON.stringify(content ?? '');
    await storeOperationalMemory({
      content: normalizedContent,
      tags: tags ?? [type],
      metadata: { type, weight, ...(metadata ?? {}) },
      source: 'erp',
    });
  },

  async learn(entry: {
    action: string;
    result?: string;
    success?: boolean;
    metadata?: Record<string, unknown>;
    tags?: string[];
  }): Promise<void> {
    await storeOperationalMemory({
      content: entry.result ?? entry.action,
      tags: entry.tags ?? ['learning', entry.action],
      metadata: { success: entry.success, ...(entry.metadata ?? {}) },
      source: 'erp',
    });
  },

  async recall(..._args: unknown[]): Promise<MemoryEntry[]> {
    // No direct recall path; return empty to keep callers safe.
    return [];
  },

  async cacheApiResponse(
    _key: string,
    _value: JsonValue,
    _ttlSeconds?: number
  ): Promise<void> {
    // No-op cache stub
  },

  async getCachedResponse(_key: string): Promise<JsonValue | null> {
    return null;
  },

  async recordUserAction(
    userId: string,
    action: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await storeOperationalMemory({
      content: `User action: ${action}`,
      tags: ['user_action', action],
      metadata: { userId, ...(metadata ?? {}) },
      source: 'erp',
    });
  },
};
