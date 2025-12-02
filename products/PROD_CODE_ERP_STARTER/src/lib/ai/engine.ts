/**
 * AI-Native Core Engine
 * Central orchestration for all AI operations
 * REAL AI - NO MOCKS - PRODUCTION ONLY
 */

import { brainopsAPI, AI_AGENTS, type AIAgentId } from '../api/brainops';
import { supabase, TABLES } from '../../db/client';

/**
 * AI Engine Configuration
 */
interface AIEngineConfig {
  enableAutonomousMode: boolean;
  enableRealTimeInsights: boolean;
  enableVoiceCommands: boolean;
  enablePredictiveAnalytics: boolean;
  confidenceThreshold: number;
  maxConcurrentOperations: number;
  learningEnabled: boolean;
}

/**
 * AI Operation Request
 */
export interface AIOperation {
  id: string;
  agentId: AIAgentId;
  operation: string;
  params: any;
  context?: any;
  priority: 'low' | 'normal' | 'high' | 'critical';
  requiresHumanApproval?: boolean;
  autonomousExecution?: boolean;
}

/**
 * AI Operation Result
 */
export interface AIOperationResult {
  operationId: string;
  success: boolean;
  data?: any;
  error?: string;
  confidence: number;
  executionTime: number;
  agent: string;
  insights?: string[];
  nextActions?: string[];
}

/**
 * Production AI Engine
 */
export class AIEngine {
  private config: AIEngineConfig;
  private activeOperations = new Set<string>();
  private agentConnections = new Map<AIAgentId, boolean>();
  private insights: any[] = [];
  private automationRules: Map<string, any> = new Map();
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(config?: Partial<AIEngineConfig>) {
    this.config = {
      enableAutonomousMode: true,
      enableRealTimeInsights: true,
      enableVoiceCommands: true,
      enablePredictiveAnalytics: true,
      confidenceThreshold: 0.85,
      maxConcurrentOperations: 10,
      learningEnabled: true,
      ...config,
    };

    // Don't initialize automatically - wait for first use
    // This prevents build-time initialization issues
  }

  /**
   * Ensure engine is initialized before use
   */
  private async ensureInitialized() {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.initialize();
    await this.initPromise;
  }

  /**
   * Initialize AI Engine
   */
  private async initialize() {
    if (this.initialized) return;

    // console.log('🚀 Initializing AI-Native Core Engine...');

    try {
      // Verify backend connections with timeout
      const healthPromise = brainopsAPI.healthCheck();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), 5000)
      );

      try {
        const health = await Promise.race([healthPromise, timeoutPromise]) as any;

        if (health && health.backend) {
          // console.log(`✅ Connected to BrainOps v${health.version}`);
          // console.log('✅ Features:', Object.keys(health.features || {}).filter(f => health.features[f]));
        }
      } catch (healthError) {
        console.warn('⚠️ AI backend not available, running in limited mode');
      }

      // Test all agent connections (non-blocking) - DISABLED to prevent dashboard blocking
      // this.verifyAgentConnections().catch(console.error);

      // Load automation rules from database (non-blocking)
      this.loadAutomationRules().catch(console.error);

      // Start real-time monitoring if enabled (non-blocking) - DISABLED to prevent WebSocket 403 errors
      // if (this.config.enableRealTimeInsights) {
      //   this.startRealTimeMonitoring();
      // }

      // console.log('✅ AI Engine initialized (may be in limited mode)');
      this.initialized = true;
    } catch (error) {
      console.error('⚠️ AI Engine initialization error (non-critical):', error);
      this.initialized = true; // Mark as initialized even on error to prevent retry loops
    }
  }

  /**
   * Verify all agent connections
   */
  private async verifyAgentConnections() {
    const agents = Object.values(AI_AGENTS);
    const results = await Promise.allSettled(
      agents.map(agentId =>
        brainopsAPI.invokeAgent(agentId, 'health_check', {})
      )
    );

    results.forEach((result, index) => {
      const agentId = agents[index];
      const connected = result.status === 'fulfilled';
      this.agentConnections.set(agentId, connected);

      if (!connected) {
        console.warn(`⚠️  Agent ${agentId} is not responding`);
      }
    });

    const connectedCount = Array.from(this.agentConnections.values()).filter(Boolean).length;
    // console.log(`✅ Connected to ${connectedCount}/${agents.length} AI agents`);
  }

  /**
   * Load automation rules from database
   */
  private async loadAutomationRules() {
    const { data: rules, error } = await supabase
      .from(TABLES.AUTOMATION_RULES)
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Failed to load automation rules:', error);
      return;
    }

    rules?.forEach(rule => {
      this.automationRules.set(rule.name, rule);
    });

    // console.log(`✅ Loaded ${rules?.length || 0} automation rules`);
  }

  /**
   * Start real-time monitoring
   */
  private startRealTimeMonitoring() {
    // Subscribe to AI insights
    const unsubscribe = brainopsAPI.subscribeToInsights((insight) => {
      this.processInsight(insight);
    });

    // Subscribe to database changes
    supabase
      .channel('ai_insights')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: TABLES.AI_INSIGHTS,
        },
        (payload) => {
          this.processInsight(payload.new);
        }
      )
      .subscribe();

    // console.log('✅ Real-time monitoring activated');
  }

  /**
   * Process incoming insight
   */
  private processInsight(insight: any) {
    this.insights.push(insight);

    // Keep only last 100 insights
    if (this.insights.length > 100) {
      this.insights = this.insights.slice(-100);
    }

    // Check if insight triggers any automation
    this.checkAutomationTriggers(insight);

    // Emit event for UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ai-insight', { detail: insight })
      );
    }
  }

  /**
   * Check if insight triggers automation
   */
  private async checkAutomationTriggers(insight: any) {
    for (const [name, rule] of this.automationRules) {
      if (this.matchesTrigger(insight, rule.trigger)) {
        await this.executeAutomation(rule);
      }
    }
  }

  /**
   * Check if insight matches trigger
   */
  private matchesTrigger(insight: any, trigger: any): boolean {
    // Simple matching logic - can be expanded
    if (trigger.type === insight.type) {
      if (trigger.threshold && insight.value) {
        return insight.value >= trigger.threshold;
      }
      return true;
    }
    return false;
  }

  /**
   * Execute automation rule
   */
  private async executeAutomation(rule: any) {
    // console.log(`🤖 Executing automation: ${rule.name}`);

    try {
      const result = await brainopsAPI.runWorkflow(
        rule.workflow,
        rule.context
      );

      // Log execution
      await supabase.from(TABLES.AGENT_EXECUTIONS).insert({
        agent_id: AI_AGENTS.WORKFLOW_ORCHESTRATOR,
        action: rule.workflow,
        input: rule.context,
        output: result,
        success: result.success,
        created_at: new Date().toISOString(),
      });

      // console.log(`✅ Automation completed: ${rule.name}`);
    } catch (error) {
      console.error(`❌ Automation failed: ${rule.name}`, error);
    }
  }

  /**
   * Execute AI operation
   */
  async execute(operation: AIOperation): Promise<AIOperationResult> {
    await this.ensureInitialized();
    const startTime = Date.now();

    // Check concurrent operations limit
    if (this.activeOperations.size >= this.config.maxConcurrentOperations) {
      return {
        operationId: operation.id,
        success: false,
        error: 'Maximum concurrent operations reached',
        confidence: 0,
        executionTime: 0,
        agent: operation.agentId,
      };
    }

    // Check if agent is available
    if (!this.agentConnections.get(operation.agentId)) {
      return {
        operationId: operation.id,
        success: false,
        error: `Agent ${operation.agentId} is not available`,
        confidence: 0,
        executionTime: 0,
        agent: operation.agentId,
      };
    }

    this.activeOperations.add(operation.id);

    try {
      // Execute operation
      const result = await brainopsAPI.invokeAgent(
        operation.agentId,
        operation.operation,
        operation.params
      );

      // Extract insights
      const insights = this.extractInsights(result);

      // Generate next actions
      const nextActions = this.generateNextActions(operation, result);

      // Log to database
      await this.logOperation(operation, result, true);

      this.activeOperations.delete(operation.id);

      return {
        operationId: operation.id,
        success: true,
        data: result,
        confidence: result.confidence || 0.95,
        executionTime: Date.now() - startTime,
        agent: operation.agentId,
        insights,
        nextActions,
      };
    } catch (error) {
      await this.logOperation(operation, error, false);
      this.activeOperations.delete(operation.id);

      return {
        operationId: operation.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        confidence: 0,
        executionTime: Date.now() - startTime,
        agent: operation.agentId,
      };
    }
  }

  /**
   * Extract insights from result
   */
  private extractInsights(result: any): string[] {
    const insights: string[] = [];

    if (result.insights) {
      insights.push(...result.insights);
    }

    if (result.recommendations) {
      insights.push(...result.recommendations);
    }

    if (result.analysis) {
      insights.push(result.analysis);
    }

    return insights;
  }

  /**
   * Generate next actions based on result
   */
  private generateNextActions(operation: AIOperation, result: any): string[] {
    const actions: string[] = [];

    if (result.nextBestAction) {
      actions.push(result.nextBestAction);
    }

    if (result.suggestedActions) {
      actions.push(...result.suggestedActions);
    }

    // Agent-specific next actions
    switch (operation.agentId) {
      case AI_AGENTS.ELENA:
        if (result.total > 50000) {
          actions.push('Schedule executive review for high-value estimate');
        }
        break;

      case AI_AGENTS.ISABELLA:
        if (result.churnRisk > 0.7) {
          actions.push('Initiate customer retention protocol');
        }
        break;

      case AI_AGENTS.MARCUS:
        if (result.projectedMRR > result.currentMRR * 1.2) {
          actions.push('Review and approve revenue optimization strategy');
        }
        break;
    }

    return actions;
  }

  /**
   * Log operation to database
   */
  private async logOperation(operation: AIOperation, result: any, success: boolean) {
    try {
      await supabase.from(TABLES.AGENT_ACTIVITIES).insert({
        agent_id: operation.agentId,
        action: operation.operation,
        params: operation.params,
        result: success ? result : { error: result },
        success,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log operation:', error);
    }
  }

  /**
   * Get predictive insights
   */
  async getPredictiveInsights(): Promise<{
    revenue: any;
    operations: any;
    customers: any;
    risks: any;
  }> {
    const [revenue, operations, customers, risks] = await Promise.all([
      brainopsAPI.getRevenueInsights(),
      brainopsAPI.invokeAgent(AI_AGENTS.PERFORMANCE_ANALYZER, 'analyze_operations', {}),
      brainopsAPI.invokeAgent(AI_AGENTS.ISABELLA, 'predict_customer_behavior', {}),
      brainopsAPI.invokeAgent(AI_AGENTS.RISK_ASSESSOR, 'assess_risks', {}),
    ]);

    return { revenue, operations, customers, risks };
  }

  /**
   * Process natural language query
   */
  async processQuery(query: string, context?: any): Promise<any> {
    // Determine best agent for query
    const agent = this.selectAgentForQuery(query);

    const operation: AIOperation = {
      id: `query-${Date.now()}`,
      agentId: agent,
      operation: 'process_query',
      params: { query, context },
      priority: 'normal',
    };

    return this.execute(operation);
  }

  /**
   * Select best agent for query
   */
  private selectAgentForQuery(query: string): AIAgentId {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('estimate') || lowerQuery.includes('quote')) {
      return AI_AGENTS.ELENA;
    }
    if (lowerQuery.includes('schedule') || lowerQuery.includes('calendar')) {
      return AI_AGENTS.VICTORIA;
    }
    if (lowerQuery.includes('revenue') || lowerQuery.includes('finance')) {
      return AI_AGENTS.MARCUS;
    }
    if (lowerQuery.includes('customer')) {
      return AI_AGENTS.ISABELLA;
    }
    if (lowerQuery.includes('lead') || lowerQuery.includes('sales')) {
      return AI_AGENTS.MAX;
    }

    return AI_AGENTS.WORKFLOW_ORCHESTRATOR;
  }

  /**
   * Get system status
   */
  getStatus() {
    // Initialize in background if not already done (non-blocking)
    if (!this.initialized && !this.initPromise) {
      this.ensureInitialized().catch(console.error);
    }

    return {
      operational: this.initialized && this.agentConnections.size > 0,
      connectedAgents: Array.from(this.agentConnections.entries())
        .filter(([_, connected]) => connected)
        .map(([agentId]) => agentId),
      activeOperations: this.activeOperations.size,
      recentInsights: this.insights.slice(-10),
      automationRules: this.automationRules.size,
      config: this.config,
      initialized: this.initialized,
    };
  }
}

// Lazy singleton instance (only initialized when actually used, not at build time)
let aiEngineInstance: AIEngine | null = null;

function getAIEngine(): AIEngine {
  if (!aiEngineInstance) {
    aiEngineInstance = new AIEngine();
  }
  return aiEngineInstance;
}

// Export lazy accessor
export const aiEngine = {
  get instance() {
    return getAIEngine();
  },
  execute: (operation: AIOperation) => getAIEngine().execute(operation),
  getStatus: () => getAIEngine().getStatus(),
};

// Export for use throughout application
export default aiEngine;