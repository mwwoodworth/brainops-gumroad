import {
  BRAINOPS_API_KEY,
  BRAINOPS_AI_AGENTS_URL,
  BRAINOPS_BACKEND_URL,
} from '@/lib/brainops/env';

// Production API Endpoints
const BRAINOPS_BACKEND = BRAINOPS_BACKEND_URL;
const BRAINOPS_AI_AGENTS = BRAINOPS_AI_AGENTS_URL;

// API Version
const API_VERSION = '/api/v1';

/**
 * 34 Real AI Agents Available in Production
 */
export const AI_AGENTS = {
  // Core Business Agents
  ELENA: 'intelligent-estimator',
  VICTORIA: 'predictive-scheduler',
  MARCUS: 'revenue-optimizer',
  ISABELLA: 'customer-intelligence',
  MAX: 'lead-generator',

  // Operational Agents
  FORECASTING: 'forecasting-engine',
  RISK_ASSESSOR: 'risk-assessor',
  PATTERN_DETECTOR: 'pattern-detector',
  PERFORMANCE_ANALYZER: 'performance-analyzer',
  INVOICE_VALIDATOR: 'invoice-validator',

  // Automation Agents
  WORKFLOW_ORCHESTRATOR: 'workflow-orchestrator',
  SELF_HEALING: 'self-healing-system',
  VOICE_COMMANDER: 'voice-commander',

  // Analytics Agents
  BUSINESS_INTELLIGENCE: 'bi-analyzer',
  MARKET_ANALYZER: 'market-analyzer',
  COMPETITOR_TRACKER: 'competitor-analyzer',

  // Customer Service Agents
  SUPPORT_AGENT: 'support-assistant',
  COMPLAINT_RESOLVER: 'complaint-handler',
  SATISFACTION_MONITOR: 'satisfaction-tracker',

  // Operations Agents
  INVENTORY_OPTIMIZER: 'inventory-manager',
  ROUTE_PLANNER: 'route-optimizer',
  CREW_SCHEDULER: 'crew-allocator',

  // Finance Agents
  PAYMENT_PROCESSOR: 'payment-handler',
  COLLECTIONS_AGENT: 'collections-manager',
  TAX_CALCULATOR: 'tax-processor',

  // Quality Agents
  QUALITY_INSPECTOR: 'quality-checker',
  COMPLIANCE_MONITOR: 'compliance-verifier',
  SAFETY_AUDITOR: 'safety-monitor',

  // Marketing Agents
  CAMPAIGN_OPTIMIZER: 'campaign-manager',
  SEO_ANALYZER: 'seo-optimizer',
  SOCIAL_MEDIA_MANAGER: 'social-handler',

  // Special Purpose Agents
  EMERGENCY_RESPONDER: 'emergency-handler',
  WEATHER_ANALYZER: 'weather-monitor',
} as const;

export type AIAgentId = typeof AI_AGENTS[keyof typeof AI_AGENTS];

/**
 * Get authentication headers
 */
function getAuthHeaders(): HeadersInit {
  // Server-side: use service credentials when available
  if (typeof window === 'undefined') {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client': 'weathercraft-erp-server',
      'X-Client-Version': '3.0.0',
      'X-Environment': process.env.NODE_ENV || 'development',
    };

    const apiKey = BRAINOPS_API_KEY;
    if (apiKey) {
      headers['Authorization'] = `ApiKey ${apiKey}`;
      headers['X-API-Key'] = apiKey;
    }

    return headers;
  }

  // Client-side: use the current user session token when present
  const token =
    localStorage?.getItem('auth_token') ||
    sessionStorage?.getItem('auth_token') ||
    '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client': 'weathercraft-erp',
    'X-Client-Version': '3.0.0',
    'X-Environment': process.env.NODE_ENV || 'development',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Make API call with retry logic
 */
async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BRAINOPS_BACKEND}${API_VERSION}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API call failed: ${endpoint}`, error);
    throw error;
  }
}

/**
 * BrainOps API Client
 */
export class BrainOpsAPI {
  /**
   * Health check - verify all systems operational
   */
  async healthCheck(): Promise<{
    backend: boolean;
    aiAgents: boolean;
    version: string;
    features: Record<string, boolean>;
  }> {
    try {
      // Check both endpoints
      const [backendHealth, aiHealth] = await Promise.all([
        fetch(`${BRAINOPS_BACKEND}/health`).then(r => r.json()),
        fetch(`${BRAINOPS_AI_AGENTS}/health`).then(r => r.json()),
      ]);

      return {
        backend: backendHealth.status === 'ok',
        aiAgents: aiHealth.status === 'healthy',
        version: aiHealth.version || 'unknown',
        features: aiHealth.features || {},
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        backend: false,
        aiAgents: false,
        version: 'error',
        features: {},
      };
    }
  }

  /**
   * Get real-time dashboard metrics
   */
  async getDashboardMetrics(): Promise<{
    revenue: number;
    customers: number;
    jobs: number;
    activeProjects: number;
    aiOperations: number;
    automationRate: number;
  }> {
    const data = await apiCall('/dashboard/metrics');

    return {
      revenue: data.metrics?.revenue?.total || 0,
      customers: data.metrics?.customers?.total || 0,
      jobs: data.metrics?.jobs?.total || 0,
      activeProjects: data.metrics?.jobs?.active || 0,
      aiOperations: data.ai?.operations_count || 0,
      automationRate: data.ai?.automation_rate || 0,
    };
  }

  /**
   * Invoke specific AI agent
   * Uses brainops-ai-agents service for reliable agent invocation
   */
  async invokeAgent(
    agentId: AIAgentId,
    action: string,
    params: any = {}
  ): Promise<any> {
    // Use brainops-ai-agents service which has working /ai/analyze endpoint
    try {
      const response = await fetch(`${BRAINOPS_AI_AGENTS}/ai/analyze`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          agent: agentId,
          action,
          data: params,
          context: {
            source: 'weathercraft-erp',
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Agent invocation failed (${response.status}): ${error}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to invoke agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Get AI-powered customer insights
   */
  async getCustomerInsights(customerId: string): Promise<{
    satisfaction: number;
    churnRisk: number;
    lifetimeValue: number;
    recommendations: string[];
    nextBestAction: string;
  }> {
    return this.invokeAgent(
      AI_AGENTS.ISABELLA,
      'analyze_customer',
      { customerId }
    );
  }

  /**
   * Generate AI-powered estimate
   */
  async generateEstimate(projectData: {
    customerId: string;
    address: string;
    sqft?: number;
    complexity?: string;
    urgency?: string;
  }): Promise<{
    total: number;
    breakdown: {
      materials: number;
      labor: number;
      overhead: number;
      profit: number;
    };
    timeline: string;
    confidence: number;
    recommendations: string[];
  }> {
    return this.invokeAgent(
      AI_AGENTS.ELENA,
      'generate_estimate',
      projectData
    );
  }

  /**
   * Optimize job schedule with AI
   */
  async optimizeSchedule(jobs: any[]): Promise<{
    optimizedSchedule: any[];
    efficiencyGain: number;
    recommendations: string[];
  }> {
    return this.invokeAgent(
      AI_AGENTS.VICTORIA,
      'optimize_schedule',
      { jobs }
    );
  }

  /**
   * Get revenue optimization insights
   */
  async getRevenueInsights(): Promise<{
    currentMRR: number;
    projectedMRR: number;
    opportunities: Array<{
      type: string;
      value: number;
      confidence: number;
      action: string;
    }>;
    recommendations: string[];
  }> {
    return this.invokeAgent(
      AI_AGENTS.MARCUS,
      'analyze_revenue',
      { period: 'current_quarter' }
    );
  }

  /**
   * Process voice command
   */
  async processVoiceCommand(audioData: Blob | string): Promise<{
    transcript: string;
    intent: string;
    confidence: number;
    action?: any;
    response: string;
  }> {
    return this.invokeAgent(
      AI_AGENTS.VOICE_COMMANDER,
      'process_voice',
      { audioData }
    );
  }

  /**
   * Run workflow automation
   */
  async runWorkflow(workflowName: string, context: any): Promise<{
    success: boolean;
    steps: Array<{
      name: string;
      status: string;
      result: any;
    }>;
    output: any;
  }> {
    return this.invokeAgent(
      AI_AGENTS.WORKFLOW_ORCHESTRATOR,
      'execute_workflow',
      { workflowName, context }
    );
  }

  /**
   * Get all available AI agents and their capabilities
   */
  async getAgentCapabilities(): Promise<Record<string, {
    name: string;
    status: 'online' | 'offline';
    capabilities: string[];
    lastActive: string;
  }>> {
    try {
      const response = await fetch(`${BRAINOPS_AI_AGENTS}/agents`);
      const data = await response.json();

      // Transform the array response into the expected format
      const agents: Record<string, any> = {};
      if (data.agents && Array.isArray(data.agents)) {
        data.agents.forEach((agent: any) => {
          agents[agent.name] = {
            name: agent.name,
            status: agent.status === 'active' ? 'online' : 'offline',
            capabilities: Object.keys(agent.capabilities || {}),
            lastActive: agent.created_at,
          };
        });
      }

      return agents;
    } catch (error) {
      console.error('Failed to get agent capabilities:', error);
      return {};
    }
  }

  /**
   * Subscribe to real-time AI insights
   */
  subscribeToInsights(callback: (insight: any) => void): () => void {
    // WebSocket connection for real-time updates
    const baseHttpUrl = BRAINOPS_BACKEND.replace(/\/$/, '');
    const wsBase = baseHttpUrl.replace(/^http(s?):\/\//, (_match, secure) =>
      secure ? 'wss://' : 'ws://'
    );
    const ws = new WebSocket(`${wsBase}/ws/insights`);

    ws.onmessage = (event) => {
      try {
        const insight = JSON.parse(event.data);
        callback(insight);
      } catch (error) {
        console.error('Failed to parse insight:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Return cleanup function
    return () => {
      ws.close();
    };
  }

  /**
   * Batch process multiple AI operations
   */
  async batchProcess(operations: Array<{
    agentId: AIAgentId;
    action: string;
    params: any;
  }>): Promise<any[]> {
    const results = await Promise.allSettled(
      operations.map(op =>
        this.invokeAgent(op.agentId, op.action, op.params)
      )
    );

    return results.map(result =>
      result.status === 'fulfilled' ? result.value : { error: result.reason }
    );
  }
}

// Export singleton instance
export const brainopsAPI = new BrainOpsAPI();

// Export for direct use
export default brainopsAPI;
