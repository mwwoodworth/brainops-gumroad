/**
 * AI Transparency utilities
 * Ensures all AI endpoints expose mode, usage, and degradation information
 */

import { resolveAIProvider } from '@/lib/ai/providers';
import { logger } from '@/lib/logger';

export type AIMode =
  | 'live-openai'
  | 'live-claude'
  | 'live-gemini'
  | 'brainops-ai-agents'
  | 'heuristic-local'
  | 'mock'
  | 'fallback';

export interface AIMetadata {
  ai_mode: AIMode;
  ai_used: boolean;
  confidence?: number;
  degraded_sources?: string[];
  fallback_reason?: string;
  model_version?: string;
  processing_time_ms?: number;
}

/**
 * Determine the current AI mode based on environment and provider availability
 */
export async function determineAIMode(): Promise<{ mode: AIMode; available: boolean }> {
  try {
    const provider = await resolveAIProvider();

    if (!provider) {
      return { mode: 'heuristic-local', available: false };
    }

    // Check if we're using mock mode
    if (process.env.AI_PROVIDER_MODE === 'mock') {
      return { mode: 'mock', available: false };
    }

    // Check BrainOps availability
    if (process.env.BRAINOPS_API_KEY) {
      try {
        const baseUrl =
          (process.env.NEXT_PUBLIC_AI_AGENTS_URL || process.env.BRAINOPS_AI_AGENTS_URL || 'http://localhost:8001').replace(
            /\/$/,
            ''
          );
        const response = await fetch(`${baseUrl}/health`, {
          method: 'GET',
          headers: {
            Authorization: `ApiKey ${process.env.BRAINOPS_API_KEY}`,
            'X-API-Key': process.env.BRAINOPS_API_KEY,
          },
          signal: AbortSignal.timeout(2000), // 2 second timeout
        });

        if (response.ok) {
          return { mode: 'brainops-ai-agents', available: true };
        }
      } catch (error) {
        logger.warn('BrainOps AI agents unavailable', { error });
      }
    }

    // Check OpenAI availability
    if (process.env.OPENAI_API_KEY) {
      return { mode: 'live-openai', available: true };
    }

    // Check Claude availability
    if (process.env.ANTHROPIC_API_KEY) {
      return { mode: 'live-claude', available: true };
    }

    // Check Gemini availability
    if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) {
      return { mode: 'live-gemini', available: true };
    }

    // Default to heuristic
    return { mode: 'heuristic-local', available: false };
  } catch (error) {
    logger.error('Error determining AI mode', { error });
    return { mode: 'fallback', available: false };
  }
}

/**
 * Create AI metadata for responses
 */
export async function createAIMetadata(
  options: {
    actuallyUsedAI?: boolean;
    confidence?: number;
    degradedSources?: string[];
    fallbackReason?: string;
    modelVersion?: string;
    startTime?: number;
  } = {}
): Promise<AIMetadata> {
  const { mode, available } = await determineAIMode();

  const metadata: AIMetadata = {
    ai_mode: mode,
    ai_used: options.actuallyUsedAI ?? available,
    confidence: options.confidence,
    degraded_sources: options.degradedSources,
    fallback_reason: options.fallbackReason,
    model_version: options.modelVersion
  };

  if (options.startTime) {
    metadata.processing_time_ms = Date.now() - options.startTime;
  }

  // Log if we're in a degraded state
  if (mode === 'heuristic-local' || mode === 'mock' || mode === 'fallback') {
    logger.info('AI running in degraded mode', {
      mode,
      reason: options.fallbackReason || 'No AI provider available'
    });
  }

  return metadata;
}

/**
 * Wrap an AI response with transparency metadata
 */
export function wrapAIResponse<T>(
  data: T,
  metadata: AIMetadata
): { data: T; meta: AIMetadata } {
  return {
    data,
    meta: metadata
  };
}

/**
 * Check if AI is available and not in mock/fallback mode
 */
export async function isAIAvailable(): Promise<boolean> {
  const { mode, available } = await determineAIMode();
  return available && mode !== 'mock' && mode !== 'fallback';
}

/**
 * Get a user-friendly description of the current AI mode
 */
export function getAIModeDescription(mode: AIMode): string {
  switch (mode) {
    case 'live-openai':
      return 'OpenAI GPT (Live)';
    case 'live-claude':
      return 'Anthropic Claude (Live)';
    case 'live-gemini':
      return 'Google Gemini (Live)';
    case 'brainops-ai-agents':
      return 'BrainOps AI Agents';
    case 'heuristic-local':
      return 'Local Heuristics (No AI)';
    case 'mock':
      return 'Mock Mode (Testing)';
    case 'fallback':
      return 'Fallback Mode (Degraded)';
    default:
      return 'Unknown Mode';
  }
}

/**
 * Helper to standardize AI endpoint responses
 */
export async function createStandardAIResponse<T>(
  generateData: () => Promise<T>,
  options: {
    confidence?: number;
    fallbackData?: T;
    degradedSources?: string[];
  } = {}
): Promise<{ data: T; meta: AIMetadata }> {
  const startTime = Date.now();

  try {
    const data = await generateData();
    const metadata = await createAIMetadata({
      actuallyUsedAI: true,
      confidence: options.confidence,
      startTime
    });

    return wrapAIResponse(data, metadata);
  } catch (error) {
    logger.error('AI generation failed, using fallback', { error });

    const metadata = await createAIMetadata({
      actuallyUsedAI: false,
      fallbackReason: error instanceof Error ? error.message : 'Unknown error',
      degradedSources: options.degradedSources,
      startTime
    });

    if (options.fallbackData !== undefined) {
      return wrapAIResponse(options.fallbackData, metadata);
    }

    throw error;
  }
}
