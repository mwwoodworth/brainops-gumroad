import { MemoryClient } from './brainops-memory-client';

interface ServerMemoryClientConfig {
  tenantId: string;
  userId?: string;
}

export function createServerMemoryClient({ tenantId, userId }: ServerMemoryClientConfig): MemoryClient | null {
  const apiUrl =
    process.env.BRAINOPS_MEMORY_API_URL ||
    process.env.NEXT_PUBLIC_BRAINOPS_AI_AGENTS_URL ||
    process.env.BRAINOPS_API_URL;

  if (!apiUrl) {
    return null;
  }

  const apiKey =
    expandKey(process.env.BRAINOPS_MEMORY_API_KEY) ||
    expandKey(process.env.BRAINOPS_API_KEY) ||
    expandKey(process.env.AI_AGENTS_API_KEY) ||
    expandKey(process.env.AI_AGENTS_TEST_KEY) ||
    expandKey(process.env.API_KEYS ? process.env.API_KEYS.split(',')[0] : undefined) ||
    undefined;

  return new MemoryClient({
    apiUrl,
    tenantId,
    userId,
    apiKey,
  });
}

function expandKey(value?: string): string | undefined {
  if (!value) return undefined;
  const expanded = value
    .trim()
    .replace(/\$\{([^}]+)\}/g, (_, name) => process.env[name] ?? '');
  const normalized = expanded.trim();
  return normalized || undefined;
}
