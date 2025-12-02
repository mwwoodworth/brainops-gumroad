import type { AIClient, AIProviderResolvedMode } from './providers';
import { resolveAIProvider, resetAIProviderCache, type AIProviderResolution } from './providers';

let cachedResolution: AIProviderResolution | null = null;

const ensureResolution = (): AIProviderResolution => {
  if (!cachedResolution) {
    cachedResolution = resolveAIProvider();
  }
  return cachedResolution;
};

export const getAIProviderMode = (): AIProviderResolvedMode => ensureResolution().mode;

export const getAIFallbackReason = (): string | undefined => ensureResolution().reason;

export const getOptionalOpenAIClient = (): AIClient | null => ensureResolution().client;

export const requireOpenAIClient = (): AIClient => {
  const resolution = ensureResolution();
  if (!resolution.client) {
    const reason = resolution.mode === 'disabled'
      ? 'AI integrations are force disabled (AI_FORCE_DISABLE=true).'
      : 'No live AI provider available. Configure AI_PROVIDER_MODE and relevant credentials.';
    throw new Error(reason);
  }
  return resolution.client;
};

export const resetOpenAIClientCache = () => {
  cachedResolution = null;
  resetAIProviderCache();
};
