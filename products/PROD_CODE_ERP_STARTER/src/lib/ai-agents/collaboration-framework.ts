/**
 * Multi-Agent Collaboration Framework
 * Enables specialized AI agents to work together on complex tasks
 *
 * This implements the Multi-Agent Collaboration Pattern from agentic AI design patterns,
 * allowing multiple specialized agents to contribute their expertise to solve complex problems.
 */

import { aiOrchestrator } from '../ai-orchestrator';
import type { JsonValue } from '@/types/json';
import { ensureJsonObject } from '@/types/json';

export type AgentName = 'elena' | 'victoria' | 'marcus' | 'isabella' | 'max' | 'tommy' | 'carlos' | 'rachel';

export interface AgentExpertise {
  name: AgentName;
  specialization: string;
  capabilities: string[];
  confidenceThreshold: number; // 0-1, minimum confidence to trust output
}

export interface AgentResponse {
  agent: AgentName;
  response: any;
  confidence: number;
  reasoning?: string;
  timestamp: Date;
}

export interface CollaborativeResult {
  finalRecommendation: any;
  agentResponses: AgentResponse[];
  consensus: {
    achieved: boolean;
    level: number; // 0-1, degree of agreement
    conflicts: string[];
  };
  synthesisProcess: string;
}

export interface CollaborationOptions {
  requireConsensus?: boolean;
  weightByConfidence?: boolean;
  includeReasoning?: boolean;
  timeout?: number; // milliseconds
}

export class CollaborationFramework {
  private agentExpertise: Map<AgentName, AgentExpertise> = new Map([
    ['elena', {
      name: 'elena',
      specialization: 'Estimating & Pricing',
      capabilities: ['cost_estimation', 'material_pricing', 'labor_calculation', 'proposal_generation'],
      confidenceThreshold: 0.8
    }],
    ['victoria', {
      name: 'victoria',
      specialization: 'Operations & Scheduling',
      capabilities: ['job_scheduling', 'resource_allocation', 'workflow_optimization', 'crew_management'],
      confidenceThreshold: 0.85
    }],
    ['marcus', {
      name: 'marcus',
      specialization: 'Financial Analysis',
      capabilities: ['financial_analysis', 'profitability_review', 'risk_assessment', 'budget_analysis'],
      confidenceThreshold: 0.9
    }],
    ['isabella', {
      name: 'isabella',
      specialization: 'Customer Intelligence',
      capabilities: ['customer_analysis', 'relationship_management', 'satisfaction_prediction', 'communication_strategy'],
      confidenceThreshold: 0.75
    }],
    ['max', {
      name: 'max',
      specialization: 'Sales & Lead Generation',
      capabilities: ['lead_qualification', 'sales_strategy', 'proposal_optimization', 'conversion_optimization'],
      confidenceThreshold: 0.8
    }],
    ['tommy', {
      name: 'tommy',
      specialization: 'Field Operations',
      capabilities: ['technical_assessment', 'installation_planning', 'quality_control', 'safety_compliance'],
      confidenceThreshold: 0.85
    }],
    ['carlos', {
      name: 'carlos',
      specialization: 'Service Management',
      capabilities: ['service_routing', 'emergency_response', 'repair_planning', 'warranty_management'],
      confidenceThreshold: 0.8
    }],
    ['rachel', {
      name: 'rachel',
      specialization: 'Project Coordination',
      capabilities: ['project_planning', 'stakeholder_communication', 'milestone_tracking', 'documentation'],
      confidenceThreshold: 0.75
    }]
  ]);

  /**
   * Orchestrate collaboration between multiple expert agents
   */
  async orchestrateCollaboration(
    task: string,
    context: any,
    requiredExperts: AgentName[],
    options: CollaborationOptions = {}
  ): Promise<CollaborativeResult> {
    const {
      requireConsensus = false,
      weightByConfidence = true,
      includeReasoning = true,
      timeout = 30000
    } = options;

    try {
      // Gather expert opinions in parallel
      const expertResponses = await this.gatherExpertOpinions(
        task,
        context,
        requiredExperts,
        timeout
      );

      // Analyze for consensus or conflicts
      const consensus = await this.analyzeConsensus(expertResponses);

      // If consensus required but not achieved, attempt resolution
      if (requireConsensus && !consensus.achieved) {
        return await this.resolveConflicts(
          task,
          context,
          expertResponses,
          consensus.conflicts
        );
      }

      // Synthesize final recommendation
      const finalRecommendation = await this.synthesizeRecommendation(
        expertResponses,
        consensus,
        weightByConfidence
      );

      return {
        finalRecommendation,
        agentResponses: expertResponses,
        consensus,
        synthesisProcess: this.describeSynthesisProcess(
          expertResponses,
          consensus,
          weightByConfidence
        )
      };

    } catch (error) {
      console.error('Collaboration error:', error);

      // Fallback: use single most appropriate agent
      const primaryAgent = this.selectPrimaryAgent(task, requiredExperts);
      const fallbackResponse = await this.getFallbackResponse(
        primaryAgent,
        task,
        context
      );

      return {
        finalRecommendation: fallbackResponse,
        agentResponses: [{
          agent: primaryAgent,
          response: fallbackResponse,
          confidence: 0.5,
          timestamp: new Date()
        }],
        consensus: {
          achieved: true,
          level: 1.0,
          conflicts: []
        },
        synthesisProcess: 'Fallback to single agent due to collaboration error'
      };
    }
  }

  /**
   * Gather opinions from all expert agents in parallel
   */
  private async gatherExpertOpinions(
    task: string,
    context: any,
    experts: AgentName[],
    timeout: number
  ): Promise<AgentResponse[]> {
    const startTime = Date.now();

    const expertPromises = experts.map(async (agentName) => {
      try {
        const expertise = this.agentExpertise.get(agentName);
        if (!expertise) {
          throw new Error(`Unknown agent: ${agentName}`);
        }

        // Check if we're approaching timeout
        const elapsed = Date.now() - startTime;
        if (elapsed > timeout * 0.9) {
          throw new Error('Approaching timeout');
        }

        const result = await aiOrchestrator.callAgent(
          agentName,
          'provide_expert_opinion',
          {
            task,
            context,
            expertise: expertise.specialization,
            analysis_type: 'collaborative_analysis'
          }
        );

        const data = ensureJsonObject(result.data as JsonValue | undefined);

        const responseValue = data.recommendation ?? data.response ?? null;
        const confidenceValue = typeof data.confidence === 'number'
          ? data.confidence
          : Number(data.confidence ?? 0.7) || 0.7;
        const reasoningValue = typeof data.reasoning === 'string'
          ? data.reasoning
          : typeof data.explanation === 'string'
            ? data.explanation
            : undefined;

        return {
          agent: agentName,
          response: responseValue,
          confidence: confidenceValue,
          reasoning: reasoningValue as string | undefined,
          timestamp: new Date()
        };

      } catch (error) {
        console.error(`Error getting opinion from ${agentName}:`, error);

        return {
          agent: agentName,
          response: null,
          confidence: 0,
          reasoning: `Error: ${error}`,
          timestamp: new Date()
        };
      }
    });

    const responses = await Promise.all(expertPromises);

    // Filter out failed responses
    return responses.filter(r => r.confidence > 0);
  }

  /**
   * Analyze expert responses for consensus or conflicts
   */
  private async analyzeConsensus(
    responses: AgentResponse[]
  ): Promise<{ achieved: boolean; level: number; conflicts: string[] }> {
    if (responses.length === 0) {
      return { achieved: false, level: 0, conflicts: ['No responses received'] };
    }

    if (responses.length === 1) {
      return { achieved: true, level: 1.0, conflicts: [] };
    }

    try {
      // Use Marcus to analyze consensus
      const result = await aiOrchestrator.callAgent(
        'marcus',
        'analyze_consensus',
        {
          responses: responses.map(r => ({
            agent: r.agent,
            response: r.response,
            confidence: r.confidence,
            reasoning: r.reasoning ?? null
          })),
          analysis_type: 'consensus_analysis'
        }
      );

      const data = ensureJsonObject(result.data as JsonValue | undefined);

      const achieved = typeof data.consensus_achieved === 'boolean'
        ? data.consensus_achieved
        : String(data.consensus_achieved ?? '').toLowerCase() === 'true';

      const level = typeof data.consensus_level === 'number'
        ? data.consensus_level
        : Number(data.consensus_level ?? 0.5) || 0.5;

      const conflictsValue = Array.isArray(data.conflicts)
        ? (data.conflicts as unknown[]).map(item => String(item))
        : [];

      return {
        achieved,
        level,
        conflicts: conflictsValue,
      };

    } catch (error) {
      console.error('Consensus analysis error:', error);

      // Fallback: simple agreement check
      const avgConfidence = responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;

      return {
        achieved: avgConfidence >= 0.7,
        level: avgConfidence,
        conflicts: avgConfidence < 0.7 ? ['Low average confidence'] : []
      };
    }
  }

  /**
   * Resolve conflicts between expert opinions
   */
  private async resolveConflicts(
    task: string,
    context: any,
    responses: AgentResponse[],
    conflicts: string[]
  ): Promise<CollaborativeResult> {
    try {
      // Use Victoria (coordination expert) to mediate
      const result = await aiOrchestrator.callAgent(
        'victoria',
        'mediate_conflict',
        {
          task,
          context,
          expert_opinions: responses.map(r => ({
            agent: r.agent,
            opinion: r.response,
            confidence: r.confidence,
            reasoning: r.reasoning ?? null
          })),
          conflicts,
          analysis_type: 'conflict_resolution'
        }
      );

      const data = ensureJsonObject(result.data as JsonValue | undefined);

      const mediatedRecommendation = data.resolution ?? data.recommendation ?? null;
      const mediatedConsensusLevel = typeof data.consensus_level === 'number'
        ? data.consensus_level
        : Number(data.consensus_level ?? 0.8) || 0.8;
      const resolutionProcess = typeof data.resolution_process === 'string'
        ? data.resolution_process
        : String(data.resolution_process ?? 'N/A');

      return {
        finalRecommendation: mediatedRecommendation,
        agentResponses: responses,
        consensus: {
          achieved: true, // Mediated resolution
          level: mediatedConsensusLevel,
          conflicts: []
        },
        synthesisProcess: `Conflicts resolved through mediation: ${resolutionProcess}`
      };

    } catch (error) {
      console.error('Conflict resolution error:', error);

      // Fallback: use highest confidence response
      const bestResponse = responses.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      );

      return {
        finalRecommendation: bestResponse.response,
        agentResponses: responses,
        consensus: {
          achieved: false,
          level: 0.5,
          conflicts
        },
        synthesisProcess: 'Fallback: Selected highest confidence response'
      };
    }
  }

  /**
   * Synthesize final recommendation from expert responses
   */
  private async synthesizeRecommendation(
    responses: AgentResponse[],
    consensus: any,
    weightByConfidence: boolean
  ): Promise<any> {
    if (responses.length === 0) {
      return null;
    }

    if (responses.length === 1) {
      return responses[0].response;
    }

    try {
      // Use Elena to synthesize (holistic view)
      const result = await aiOrchestrator.callAgent(
        'elena',
        'synthesize_recommendations',
        {
          responses: responses.map(r => ({
            agent: r.agent,
            recommendation: r.response,
            confidence: r.confidence,
            weight: weightByConfidence ? r.confidence : 1.0
          })),
          consensus_level: consensus.level,
          analysis_type: 'synthesis'
        }
      );

      const data = ensureJsonObject(result.data as JsonValue | undefined);
      return data.final_recommendation ?? data.synthesis ?? null;

    } catch (error) {
      console.error('Synthesis error:', error);

      // Fallback: weighted average based on confidence
      if (weightByConfidence) {
        const totalWeight = responses.reduce((sum, r) => sum + r.confidence, 0);
        const weighted = responses.reduce((acc, r) => {
          const weight = r.confidence / totalWeight;
          // Simple merge (works for objects and primitives)
          return typeof r.response === 'object'
            ? { ...acc, ...r.response, weight: ((acc as any).weight || 0) + weight }
            : r.response;
        }, {} as any);

        return weighted;
      }

      // Unweighted: return highest confidence
      return responses.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      ).response;
    }
  }

  /**
   * Describe how synthesis was performed
   */
  private describeSynthesisProcess(
    responses: AgentResponse[],
    consensus: any,
    weightByConfidence: boolean
  ): string {
    const agentNames = responses.map(r => r.agent).join(', ');
    const avgConfidence = responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;

    let process = `Collaborated with ${responses.length} experts: ${agentNames}. `;
    process += `Average confidence: ${(avgConfidence * 100).toFixed(0)}%. `;
    process += `Consensus level: ${(consensus.level * 100).toFixed(0)}%. `;

    if (weightByConfidence) {
      process += 'Recommendations weighted by confidence. ';
    }

    if (consensus.achieved) {
      process += 'Strong consensus achieved.';
    } else if (consensus.conflicts.length > 0) {
      process += `Conflicts: ${consensus.conflicts.join(', ')}.`;
    }

    return process;
  }

  /**
   * Select primary agent for fallback
   */
  private selectPrimaryAgent(task: string, candidates: AgentName[]): AgentName {
    // Simple heuristic: return first candidate
    return candidates[0] || 'victoria';
  }

  /**
   * Get fallback response from single agent
   */
  private async getFallbackResponse(
    agent: AgentName,
    task: string,
    context: any
  ): Promise<any> {
    try {
      const result = await aiOrchestrator.callAgent(
        agent,
        'execute_task',
        {
          task,
          context,
          analysis_type: 'fallback_execution'
        }
      );

      return result.data || result;

    } catch (error) {
      console.error('Fallback response error:', error);
      return null;
    }
  }

  /**
   * Quick collaboration (2-agent only, faster)
   */
  async quickCollaborate(
    task: string,
    context: any,
    agent1: AgentName,
    agent2: AgentName
  ): Promise<any> {
    const result = await this.orchestrateCollaboration(
      task,
      context,
      [agent1, agent2],
      {
        requireConsensus: false,
        weightByConfidence: true,
        includeReasoning: false,
        timeout: 10000
      }
    );

    return result.finalRecommendation;
  }

  /**
   * Get expert opinion from single agent
   */
  async getExpertOpinion(
    agent: AgentName,
    task: string,
    context: any
  ): Promise<AgentResponse> {
    const responses = await this.gatherExpertOpinions(
      task,
      context,
      [agent],
      10000
    );

    return responses[0] || {
      agent,
      response: null,
      confidence: 0,
      timestamp: new Date()
    };
  }
}

// Singleton instance
export const collaborationFramework = new CollaborationFramework();
