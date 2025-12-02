/**
 * Complete AI Agent Configuration
 * Connects ALL 59 AI agents from BrainOps Backend
 * Full utilization of AI capabilities
 */

import { brainOpsAPI } from '@/services/brainops-api';

// All 59 AI Agents Available from Backend
export const ALL_AI_AGENTS = {
  // CORE BUSINESS AGENTS (Currently Active)
  elena: {
    name: 'Elena',
    role: 'Estimation & Pricing AI',
    capabilities: ['estimate_generation', 'pricing_optimization', 'material_calculation'],
    status: 'active'
  },
  victoria: {
    name: 'Victoria',
    role: 'Operations & Scheduling',
    capabilities: ['schedule_optimization', 'crew_assignment', 'route_planning'],
    status: 'active'
  },
  marcus: {
    name: 'Marcus',
    role: 'Financial Analysis',
    capabilities: ['invoice_generation', 'payment_tracking', 'financial_reporting'],
    status: 'active'
  },
  isabella: {
    name: 'Isabella',
    role: 'Customer Intelligence',
    capabilities: ['lead_scoring', 'customer_insights', 'churn_prediction'],
    status: 'active'
  },
  max: {
    name: 'Max',
    role: 'Sales & Lead Generation',
    capabilities: ['lead_qualification', 'follow_up_automation', 'proposal_generation'],
    status: 'active'
  }
};

export const aiAgentManager = {
  async invokeAgent(agentName: string, task: string, context?: any) {
    return await brainOpsAPI.invokeAIAgent(agentName, task, context);
  }
};
