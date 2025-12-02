/**
 * Enhanced AI Orchestrator
 * Integrates all agentic design patterns for ultra-powerful AI capabilities
 *
 * This combines:
 * - Reflection Pattern (self-improvement)
 * - Planning Pattern (task decomposition)
 * - Multi-Agent Collaboration Pattern (specialized expertise)
 * - Tool Use Pattern (external systems integration)
 * - Routing Pattern (intelligent agent selection)
 * - Global Context (system-wide awareness)
 */

import { aiOrchestrator } from '../ai-orchestrator';
import { reflectionCapability } from './reflection-capability';
import { planningCapability } from './planning-capability';
import { collaborationFramework, AgentName } from './collaboration-framework';
import { globalContextService } from '../global-context-service';
import type { JsonValue } from '@/types/json';
import { ensureJsonObject } from '@/types/json';

export interface EnhancedExecutionOptions {
  // Pattern selections
  useReflection?: boolean;
  usePlanning?: boolean;
  useMultiAgent?: boolean;
  useTools?: boolean;
  autoRoute?: boolean;

  // System awareness
  includeSystemContext?: boolean;
  tenantId?: string;

  // Optimization preferences
  optimizeForSpeed?: boolean;
  optimizeForCost?: boolean;
  optimizeForQuality?: boolean;

  // Quality controls
  reflectionCriteria?: string[];
  targetQualityScore?: number;
  maxReflectionIterations?: number;

  // Collaboration controls
  requiredExperts?: AgentName[];
  requireConsensus?: boolean;

  // Planning controls
  maxSubtasks?: number;
  considerResources?: boolean;

  // Metadata
  requestId?: string;
  userId?: string;
}

export interface EnhancedExecutionResult {
  finalOutput: any;
  executionPath: string[];
  patternsUsed: string[];
  systemContext?: any;
  plan?: any;
  collaborationDetails?: any;
  reflectionDetails?: any;
  metadata: {
    totalDuration: number;
    agentsInvolved: string[];
    qualityScore: number;
    confidence: number;
  };
}

export class EnhancedAIOrchestrator {
  /**
   * Execute task with full agentic capabilities and system awareness
   */
  async executeIntelligent(
    task: string,
    context: any,
    options: EnhancedExecutionOptions = {}
  ): Promise<EnhancedExecutionResult> {
    const startTime = Date.now();
    const executionPath: string[] = [];
    const patternsUsed: string[] = [];
    const agentsInvolved = new Set<string>();

    try {
      // STEP 1: Gather system-wide context if requested
      let systemContext: any = null;
      if (options.includeSystemContext && options.tenantId) {
        executionPath.push('Gathering system-wide context');
        systemContext = await globalContextService.getFullSystemContext(options.tenantId);
        patternsUsed.push('Global Context Awareness');
      }

      // Merge system context with provided context
      const enrichedContext = {
        ...context,
        systemContext,
        optimizations: {
          speed: options.optimizeForSpeed,
          cost: options.optimizeForCost,
          quality: options.optimizeForQuality
        }
      };

      // STEP 2: Intelligent routing if enabled
      if (options.autoRoute) {
        executionPath.push('Routing to optimal agent');
        const routedAgent = await this.intelligentRoute(task, enrichedContext);
        agentsInvolved.add(routedAgent);
        patternsUsed.push('Intelligent Routing');

        // Execute with routed agent
        const result = await aiOrchestrator.callAgent(routedAgent, task, enrichedContext);
        executionPath.push(`Executed with ${routedAgent}`);

        // Apply reflection if requested
        if (options.useReflection) {
          return this.applyReflection(
            result.data,
            task,
            enrichedContext,
            options,
            executionPath,
            patternsUsed,
            agentsInvolved,
            startTime
          );
        }

        return this.buildResult(
          result.data,
          executionPath,
          patternsUsed,
          agentsInvolved,
          systemContext,
          startTime
        );
      }

      // STEP 3: Planning pattern for complex tasks
      if (options.usePlanning) {
        executionPath.push('Decomposing task into execution plan');
        patternsUsed.push('Planning Pattern');
        agentsInvolved.add('victoria'); // Victoria handles planning

        const plan = await planningCapability.decomposeAndPlan(
          task,
          enrichedContext,
          {
            maxSubtasks: options.maxSubtasks,
            considerResources: options.considerResources,
            optimizeForSpeed: options.optimizeForSpeed,
            optimizeForCost: options.optimizeForCost
          }
        );

        executionPath.push(`Created plan with ${plan.subtasks.length} subtasks`);

        // Execute plan
        const planResult = await this.executePlan(plan, enrichedContext);
        executionPath.push('Plan execution complete');

        // Apply reflection if requested
        if (options.useReflection) {
          return this.applyReflection(
            planResult,
            task,
            enrichedContext,
            options,
            executionPath,
            patternsUsed,
            agentsInvolved,
            startTime,
            plan
          );
        }

        return this.buildResult(
          planResult,
          executionPath,
          patternsUsed,
          agentsInvolved,
          systemContext,
          startTime,
          plan
        );
      }

      // STEP 4: Multi-agent collaboration for complex decisions
      if (options.useMultiAgent && options.requiredExperts) {
        executionPath.push('Initiating multi-agent collaboration');
        patternsUsed.push('Multi-Agent Collaboration');
        options.requiredExperts.forEach(agent => agentsInvolved.add(agent));

        const collaboration = await collaborationFramework.orchestrateCollaboration(
          task,
          enrichedContext,
          options.requiredExperts,
          {
            requireConsensus: options.requireConsensus,
            weightByConfidence: true,
            includeReasoning: options.useReflection
          }
        );

        executionPath.push(`Collaboration complete with ${options.requiredExperts.length} experts`);

        // Apply reflection to collaborative result if requested
        if (options.useReflection) {
          return this.applyReflection(
            collaboration.finalRecommendation,
            task,
            enrichedContext,
            options,
            executionPath,
            patternsUsed,
            agentsInvolved,
            startTime,
            undefined,
            collaboration
          );
        }

        return this.buildResult(
          collaboration.finalRecommendation,
          executionPath,
          patternsUsed,
          agentsInvolved,
          systemContext,
          startTime,
          undefined,
          collaboration
        );
      }

      // STEP 5: Single agent execution (fallback)
      executionPath.push('Executing with single agent');
      const primaryAgent = this.selectPrimaryAgent(task);
      agentsInvolved.add(primaryAgent);

      const result = await aiOrchestrator.callAgent(primaryAgent, task, enrichedContext);
      executionPath.push(`Executed with ${primaryAgent}`);

      // Apply reflection if requested
      if (options.useReflection) {
        return this.applyReflection(
          result.data,
          task,
          enrichedContext,
          options,
          executionPath,
          patternsUsed,
          agentsInvolved,
          startTime
        );
      }

      return this.buildResult(
        result.data,
        executionPath,
        patternsUsed,
        agentsInvolved,
        systemContext,
        startTime
      );

    } catch (error) {
      console.error('Enhanced orchestrator error:', error);

      return {
        finalOutput: null,
        executionPath: [...executionPath, `Error: ${error}`],
        patternsUsed,
        metadata: {
          totalDuration: Date.now() - startTime,
          agentsInvolved: Array.from(agentsInvolved),
          qualityScore: 0,
          confidence: 0
        }
      };
    }
  }

  /**
   * Apply reflection pattern to improve output
   */
  private async applyReflection(
    output: any,
    task: string,
    context: any,
    options: EnhancedExecutionOptions,
    executionPath: string[],
    patternsUsed: string[],
    agentsInvolved: Set<string>,
    startTime: number,
    plan?: any,
    collaboration?: any
  ): Promise<EnhancedExecutionResult> {
    executionPath.push('Applying reflection for quality improvement');
    patternsUsed.push('Reflection Pattern');
    agentsInvolved.add('marcus'); // Marcus handles critique
    agentsInvolved.add('elena'); // Elena handles improvement

    const reflectionResult = await reflectionCapability.reflectAndImprove(
      output,
      task,
      {
        maxIterations: options.maxReflectionIterations || 3,
        targetScore: options.targetQualityScore || 0.85,
        criteria: options.reflectionCriteria || ['accuracy', 'completeness', 'clarity', 'actionability']
      }
    );

    executionPath.push(`Reflection complete: ${reflectionResult.iterations} iterations`);

    return this.buildResult(
      reflectionResult.final,
      executionPath,
      patternsUsed,
      agentsInvolved,
      context.systemContext,
      startTime,
      plan,
      collaboration,
      reflectionResult
    );
  }

  /**
   * Execute a decomposed plan
   */
  private async executePlan(plan: any, context: any): Promise<any> {
    const results: any = {};

    // Execute subtasks in dependency order
    for (const subtask of plan.subtasks) {
      // Wait for dependencies
      const dependencyResults = subtask.dependencies.map((depId: string) => results[depId]);

      // Execute subtask
      const agent = subtask.assignedAgent || 'victoria';
      const result = await aiOrchestrator.callAgent(
        agent,
        subtask.description,
        {
          ...context,
          dependencies: dependencyResults,
          subtask
        }
      );

      results[subtask.id] = result.data;
    }

    return {
      plan,
      results,
      completedAt: new Date()
    };
  }

  /**
   * Intelligent routing to best agent
   */
  private async intelligentRoute(task: string, context: any): Promise<AgentName> {
    try {
      // Use Victoria to classify and route
      const result = await aiOrchestrator.callAgent(
        'victoria',
        'classify_and_route',
        {
          task,
          context,
          analysis_type: 'routing'
        }
      );

      const data = ensureJsonObject(result.data as JsonValue | undefined);
      const recommended = data.recommended_agent;
      if (typeof recommended === 'string') {
        return recommended as AgentName;
      }
      return 'victoria';

    } catch (error) {
      console.error('Routing error:', error);
      return this.selectPrimaryAgent(task);
    }
  }

  /**
   * Select primary agent based on task keywords
   */
  private selectPrimaryAgent(task: string): AgentName {
    const taskLower = task.toLowerCase();

    if (taskLower.includes('estimate') || taskLower.includes('pricing') || taskLower.includes('cost')) {
      return 'elena';
    }

    if (taskLower.includes('schedule') || taskLower.includes('plan') || taskLower.includes('crew')) {
      return 'victoria';
    }

    if (taskLower.includes('financial') || taskLower.includes('profit') || taskLower.includes('budget')) {
      return 'marcus';
    }

    if (taskLower.includes('customer') || taskLower.includes('satisfaction') || taskLower.includes('relationship')) {
      return 'isabella';
    }

    if (taskLower.includes('sales') || taskLower.includes('lead') || taskLower.includes('proposal')) {
      return 'max';
    }

    // Default: Victoria (operations coordinator)
    return 'victoria';
  }

  /**
   * Build execution result
   */
  private buildResult(
    output: any,
    executionPath: string[],
    patternsUsed: string[],
    agentsInvolved: Set<string>,
    systemContext: any,
    startTime: number,
    plan?: any,
    collaboration?: any,
    reflection?: any
  ): EnhancedExecutionResult {
    const totalDuration = Date.now() - startTime;

    // Calculate quality score
    const qualityScore = reflection
      ? (reflection.final?.quality_score || 0.8)
      : (collaboration?.consensus.level || 0.7);

    // Calculate confidence
    const confidence = reflection
      ? (reflection.final?.confidence || 0.8)
      : (collaboration?.consensus.level || 0.7);

    return {
      finalOutput: output,
      executionPath,
      patternsUsed,
      systemContext,
      plan,
      collaborationDetails: collaboration,
      reflectionDetails: reflection,
      metadata: {
        totalDuration,
        agentsInvolved: Array.from(agentsInvolved),
        qualityScore,
        confidence
      }
    };
  }

  /**
   * Quick execution (optimized for speed, minimal patterns)
   */
  async quickExecute(task: string, context: any, tenantId: string): Promise<any> {
    const result = await this.executeIntelligent(task, context, {
      autoRoute: true,
      includeSystemContext: false,
      useReflection: false,
      usePlanning: false,
      useMultiAgent: false,
      tenantId
    });

    return result.finalOutput;
  }

  /**
   * Premium execution (all patterns, maximum quality)
   */
  async premiumExecute(
    task: string,
    context: any,
    tenantId: string,
    requiredExperts: AgentName[]
  ): Promise<EnhancedExecutionResult> {
    return this.executeIntelligent(task, context, {
      autoRoute: false,
      includeSystemContext: true,
      useReflection: true,
      usePlanning: true,
      useMultiAgent: true,
      tenantId,
      requiredExperts,
      requireConsensus: true,
      optimizeForQuality: true,
      targetQualityScore: 0.9,
      maxReflectionIterations: 3
    });
  }
}

// Singleton instance
export const enhancedOrchestrator = new EnhancedAIOrchestrator();
