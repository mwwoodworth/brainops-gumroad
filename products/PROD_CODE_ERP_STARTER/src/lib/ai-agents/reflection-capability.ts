/**
 * Reflection Capability
 * Enables AI agents to review and improve their own outputs
 *
 * This implements the Reflection Pattern from agentic AI design patterns,
 * allowing agents to self-critique and iteratively improve their work.
 */

import { aiOrchestrator } from '../ai-orchestrator';
import type { JsonValue } from '@/types/json';
import { ensureJsonObject } from '@/types/json';

export interface CritiqueResult {
  meetsAllCriteria: boolean;
  score: number; // 0-1
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export interface ReflectionOptions {
  maxIterations?: number;
  targetScore?: number;
  criteria?: string[];
}

const getJsonValue = (object: Record<string, JsonValue>, key: string): JsonValue | undefined => {
  return key in object ? (object[key] as JsonValue) : undefined;
};

const toBoolean = (value: JsonValue | undefined, fallback: boolean): boolean => {
  return typeof value === 'boolean' ? value : fallback;
};

const toNumber = (value: JsonValue | undefined, fallback: number): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const toStringArray = (value: JsonValue | undefined): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

const toStringList = (value: JsonValue | undefined): string[] => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return [value];
  }

  return toStringArray(value);
};

export class ReflectionCapability {
  /**
   * Apply reflection pattern to improve output
   */
  async reflectAndImprove<T>(
    output: T,
    context: string,
    options: ReflectionOptions = {}
  ): Promise<{ final: T; iterations: number; improvements: string[] }> {
    const {
      maxIterations = 3,
      targetScore = 0.85,
      criteria = [
        'accuracy',
        'completeness',
        'clarity',
        'actionability'
      ]
    } = options;

    let current = output;
    const improvements: string[] = [];

    for (let i = 0; i < maxIterations; i++) {
      // Critique current output
      const critique = await this.critique(current, context, criteria);

      // If meets criteria, we're done
      if (critique.meetsAllCriteria || critique.score >= targetScore) {
        break;
      }

      // Improve based on critique
      const improved = await this.improve(current, critique, context);
      improvements.push(`Iteration ${i + 1}: ${critique.suggestions.join(', ')}`);
      current = improved;
    }

    return {
      final: current,
      iterations: improvements.length,
      improvements
    };
  }

  /**
   * Critique output against criteria
   */
  private async critique<T>(
    output: T,
    context: string,
    criteria: string[]
  ): Promise<CritiqueResult> {
    try {
      // Use AI to critique
      const result = await aiOrchestrator.callAgent(
        'marcus', // Marcus for analytical review
        'critique_output',
        {
          output: JSON.stringify(output, null, 2),
          context,
          criteria,
          analysis_type: 'quality_review'
        }
      );

      // Parse AI response
      const data = ensureJsonObject(result.data as JsonValue | undefined);
      const strengthsValue = getJsonValue(data, 'strengths');
      const weaknessesValue = getJsonValue(data, 'weaknesses');
      const suggestionsValue = getJsonValue(data, 'suggestions');

      return {
        meetsAllCriteria: toBoolean(getJsonValue(data, 'meets_criteria'), false),
        score: toNumber(getJsonValue(data, 'quality_score'), 0.5),
        strengths: toStringArray(strengthsValue),
        weaknesses: toStringArray(weaknessesValue),
        suggestions: toStringList(suggestionsValue)
      };
    } catch (error) {
      console.error('Reflection critique error:', error);

      // Fallback: assume needs improvement
      return {
        meetsAllCriteria: false,
        score: 0.5,
        strengths: [],
        weaknesses: ['Unable to perform detailed critique'],
        suggestions: ['Review output manually']
      };
    }
  }

  /**
   * Improve output based on critique
   */
  private async improve<T>(
    output: T,
    critique: CritiqueResult,
    context: string
  ): Promise<T> {
    try {
      // Use AI to improve
      const result = await aiOrchestrator.callAgent(
        'elena', // Elena for improvement suggestions
        'improve_output',
        {
          output: JSON.stringify(output, null, 2),
          context,
          weaknesses: critique.weaknesses,
          suggestions: critique.suggestions,
          analysis_type: 'improvement'
        }
      );

      // Parse improved output
      const data = ensureJsonObject(result.data as JsonValue | undefined);
      const improvedValue = getJsonValue(data, 'improved_output');

      if (improvedValue !== undefined) {
        if (typeof improvedValue === 'string') {
          try {
            return JSON.parse(improvedValue) as T;
          } catch {
            // Fall back to raw string if parsing fails
            return improvedValue as unknown as T;
          }
        }

        return improvedValue as unknown as T;
      }

      // If AI doesn't provide improvement, return original
      return output;
    } catch (error) {
      console.error('Reflection improvement error:', error);
      return output; // Return original if improvement fails
    }
  }

  /**
   * Quick self-check (single-pass reflection)
   */
  async quickCheck<T>(output: T, context: string): Promise<{ output: T; passed: boolean; notes: string[] }> {
    const critique = await this.critique(output, context, [
      'accuracy',
      'completeness'
    ]);

    if (!critique.meetsAllCriteria && critique.suggestions.length > 0) {
      const improved = await this.improve(output, critique, context);
      return {
        output: improved,
        passed: false,
        notes: critique.suggestions
      };
    }

    return {
      output,
      passed: true,
      notes: critique.strengths
    };
  }
}

// Singleton instance
export const reflectionCapability = new ReflectionCapability();
