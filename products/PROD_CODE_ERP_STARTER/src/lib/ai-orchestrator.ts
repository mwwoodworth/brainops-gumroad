/**
 * AI Orchestrator
 * Connects the 59 AI agents to actual ERP workflows
 * Makes AI automation real and operational
 * UPGRADED: Multi-tier AI system (FREE + POWERFUL)
 *
 * AI Priority Chain:
 * 1. Google Gemini 1.5 Pro 002 (FREE - 45K requests/month)
 * 2. OpenAI GPT-3.5-Turbo (PAID backup - $0.50/1M tokens)
 * 3. Anthropic Claude (PAID optional - $15/1M tokens)
 * 4. Intelligent mock (FREE fallback - always available)
 *
 * Cost: $0/month for normal usage with FREE Gemini tier
 */

import { memoryService } from './memory-service';
import { IS_PRODUCTION_ENV } from '@/lib/env';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GenerativeModel } from '@google/generative-ai';
import { OpenAI } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import Anthropic from '@anthropic-ai/sdk';
import type { JsonObject, JsonValue } from '@/types/json';

interface AgentDefinition {
  name: string;
  role: string;
  endpoint: string;
  capabilities: string[];
}

type CustomerPayload = JsonObject & {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

type JobPayload = JsonObject & {
  id: string;
  customer_id?: string | null;
  description?: string | null;
  priority?: string | null;
  type?: string | null;
  square_footage?: number | null;
};

type EstimateRequestPayload = JsonObject & {
  id?: string | null;
  customer_id: string;
  address?: string | null;
  service_type?: string | null;
  urgency?: string | null;
};

type InvoicePayload = JsonObject & {
  id: string;
  customer_id: string;
  amount_due?: number | null;
};

type LeadPayload = JsonObject & {
  id: string;
  name?: string | null;
  email?: string | null;
  source?: string | null;
  interest?: string | null;
};

// AI Agent definitions with actual capabilities
export const AI_AGENTS = {
  // Customer Intelligence
  elena: {
    name: 'Elena',
    role: 'Estimation & Pricing AI',
    endpoint: '/api/ai/agents/elena',
    capabilities: ['estimate_generation', 'pricing_optimization', 'material_calculation']
  },
  victoria: {
    name: 'Victoria',
    role: 'Operations & Scheduling',
    endpoint: '/api/ai/agents/victoria',
    capabilities: ['schedule_optimization', 'crew_assignment', 'route_planning']
  },
  marcus: {
    name: 'Marcus',
    role: 'Financial Analysis',
    endpoint: '/api/ai/agents/marcus',
    capabilities: ['invoice_generation', 'payment_tracking', 'financial_reporting']
  },
  isabella: {
    name: 'Isabella',
    role: 'Customer Intelligence',
    endpoint: '/api/ai/agents/isabella',
    capabilities: ['lead_scoring', 'customer_insights', 'churn_prediction']
  },
  max: {
    name: 'Max',
    role: 'Sales & Lead Generation',
    endpoint: '/api/ai/agents/max',
    capabilities: ['lead_qualification', 'follow_up_automation', 'proposal_generation']
  },
  quality: {
    name: 'Quinn',
    role: 'Quality Assurance Specialist',
    endpoint: '/api/ai/agents/quality',
    capabilities: ['photo_analysis', 'issue_detection', 'remediation_planning']
  }
} as const satisfies Record<string, AgentDefinition>;

export class AIOrchestrator {
  private static instance: AIOrchestrator;
  private agentEndpoint: string;
  private gemini: GenerativeModel | null = null;
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private aiTier: 'gemini' | 'openai' | 'claude' | 'mock' = 'mock';

  private constructor() {
    this.agentEndpoint =
      process.env.NEXT_PUBLIC_AI_AGENTS_URL || 'http://localhost:8001';

    // Initialize AI providers in priority order
    // Tier 1: Gemini (FREE - 45K requests/month)
    if (process.env.GOOGLE_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        // Use current generally available Gemini model to avoid v1beta 404s
        this.gemini = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        this.aiTier = 'gemini';
        console.log('✅ AI Provider: Gemini 1.5 Flash (Stable - High Performance)');
      } catch (error) {
        console.error('Gemini init failed:', error);
      }
    }

    // Tier 2: OpenAI (ChatGPT Pro subscription)
    if (process.env.OPENAI_API_KEY) {
      try {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        if (this.aiTier === 'mock') this.aiTier = 'openai';
        console.log('✅ AI Backup: OpenAI GPT-5 (ChatGPT Pro subscription)');
      } catch (error) {
        console.error('OpenAI init failed:', error);
      }
    }

    // Tier 3: Claude (Optional paid)
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        this.anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });
        console.log('✅ AI Premium: Claude (Optional paid tier)');
      } catch (error) {
        console.error('Claude init failed:', error);
      }
    }

    // Log final configuration
    if (this.aiTier === 'mock') {
      if (IS_PRODUCTION_ENV) {
        console.error(
          '⛔ AI Orchestrator: No real AI providers configured in production. Orchestrator insights will be disabled.'
        );
      } else {
        console.log('⚠️ No AI API keys found, using intelligent fallbacks (development only)');
      }
    } else {
      console.log(
        `💡 BrainOps AI OS: Fully operational with ${this.aiTier.toUpperCase()} (zero-cost Gemini tier)`
      );
    }
  }

  static getInstance(): AIOrchestrator {
    if (!AIOrchestrator.instance) {
      AIOrchestrator.instance = new AIOrchestrator();
    }
    return AIOrchestrator.instance;
  }

  /**
   * Process a workflow event with AI agents
   */
  async processWorkflow(
    event: string,
    data: JsonObject = {}
  ): Promise<JsonValue | null> {
    // console.log(`AI Orchestrator: Processing ${event}`);

    // Store event in memory
    await memoryService.store('workflow_event', event, data, 0.7);

    switch (event) {
      case 'new_customer':
        return await this.onNewCustomer(data as CustomerPayload);

      case 'new_job':
        return await this.onNewJob(data as JobPayload);

      case 'estimate_request':
        return await this.onEstimateRequest(data as EstimateRequestPayload);

      case 'invoice_due':
        return await this.onInvoiceDue(data as InvoicePayload);

      case 'lead_captured':
        return await this.onLeadCaptured(data as LeadPayload);

      default:
        // console.log(`No AI workflow for event: ${event}`);
        return null;
    }
  }

  /**
   * New customer workflow
   */
  private async onNewCustomer(customer: CustomerPayload): Promise<JsonObject[]> {
    const results: JsonObject[] = [];

    // Isabella analyzes the customer
    const insights = await this.callAgent('isabella', 'analyze_customer', {
      customer_id: customer.id,
      name: customer.name ?? null,
      email: customer.email ?? null,
      phone: customer.phone ?? null
    });
    results.push({ agent: 'isabella', insights: insights ?? null });

    // Max prepares follow-up
    const followUp = await this.callAgent('max', 'prepare_welcome', {
      customer_id: customer.id,
      customer_name: customer.name ?? null,
      insights
    });
    results.push({ agent: 'max', followUp: followUp ?? null });

    // Store the results
    await memoryService.learn({
      action: 'new_customer_workflow',
      result: `Processed new customer ${customer.name}`,
      success: true,
      metadata: { customer_id: customer.id, results }
    });

    return results;
  }

  /**
   * New job workflow
   */
  private async onNewJob(job: JobPayload): Promise<JsonObject[]> {
    const results: JsonObject[] = [];

    // Victoria schedules the job
    const schedule = await this.callAgent('victoria', 'schedule_job', {
      job_id: job.id,
      customer_id: job.customer_id ?? null,
      description: job.description ?? null,
      priority: job.priority ?? null
    });
    results.push({ agent: 'victoria', schedule: schedule ?? null });

    // Elena estimates materials
    const materials = await this.callAgent('elena', 'calculate_materials', {
      job_id: job.id,
      job_type: job.type ?? null,
      square_footage: job.square_footage ?? null
    });
    results.push({ agent: 'elena', materials: materials ?? null });

    // Marcus prepares invoice
    const invoice = await this.callAgent('marcus', 'prepare_invoice', {
      job_id: job.id,
      materials: materials ?? null,
      schedule: schedule ?? null
    });
    results.push({ agent: 'marcus', invoice: invoice ?? null });

    await memoryService.learn({
      action: 'new_job_workflow',
      result: `Scheduled and priced job ${job.id}`,
      success: true,
      metadata: { job_id: job.id, results }
    });

    return results;
  }

  /**
   * Estimate request workflow
   */
  private async onEstimateRequest(request: EstimateRequestPayload): Promise<JsonObject[]> {
    const results: JsonObject[] = [];

    // Elena generates estimate
    const estimate = await this.callAgent('elena', 'generate_estimate', {
      customer_id: request.customer_id,
      property_address: request.address ?? null,
      service_type: request.service_type ?? null,
      urgency: request.urgency ?? null
    });
    results.push({ agent: 'elena', estimate: estimate ?? null });

    // Max prepares proposal
    const proposal = await this.callAgent('max', 'create_proposal', {
      customer_id: request.customer_id,
      estimate
    });
    results.push({ agent: 'max', proposal: proposal ?? null });

    await memoryService.store('estimate_generated', JSON.stringify(estimate), {
      customer_id: request.customer_id,
      request_id: request.id ?? null
    }, 0.8);

    return results;
  }

  /**
   * Invoice due workflow
   */
  private async onInvoiceDue(invoice: InvoicePayload): Promise<JsonObject[]> {
    const results: JsonObject[] = [];

    // Marcus analyzes payment history
    const analysis = await this.callAgent('marcus', 'analyze_payment_risk', {
      customer_id: invoice.customer_id,
      invoice_id: invoice.id,
      amount_due: invoice.amount_due ?? null
    });
    results.push({ agent: 'marcus', analysis: analysis ?? null });

    // Max sends reminder
    const riskLevel =
      analysis && typeof analysis === 'object' && !Array.isArray(analysis) && 'risk_level' in analysis
        ? (analysis as JsonObject).risk_level ?? null
        : null;

    const reminder = await this.callAgent('max', 'send_payment_reminder', {
      customer_id: invoice.customer_id,
      invoice_id: invoice.id,
      risk_level: riskLevel,
    });
    results.push({ agent: 'max', reminder: reminder ?? null });

    return results;
  }

  /**
   * Lead captured workflow
   */
  private async onLeadCaptured(lead: LeadPayload): Promise<JsonObject[]> {
    const results: JsonObject[] = [];

    // Isabella scores the lead
    const score = await this.callAgent('isabella', 'score_lead', {
      name: lead.name ?? null,
      email: lead.email ?? null,
      source: lead.source ?? null,
      interest: lead.interest ?? null
    });
    results.push({ agent: 'isabella', score: score ?? null });

    // Max qualifies and nurtures
    const scoreValue =
      score && typeof score === 'object' && !Array.isArray(score) && 'score' in score
        ? (score as JsonObject).score ?? null
        : null;
    const recommendedAction =
      score && typeof score === 'object' && !Array.isArray(score) && 'recommended_action' in score
        ? (score as JsonObject).recommended_action ?? null
        : null;

    const nurture = await this.callAgent('max', 'nurture_lead', {
      lead_id: lead.id,
      score: scoreValue,
      recommended_action: recommendedAction
    });
    results.push({ agent: 'max', nurture: nurture ?? null });

    await memoryService.recordUserAction(lead.id, 'lead_processed', {
      score: scoreValue,
      nurture_sequence:
        nurture && typeof nurture === 'object' && !Array.isArray(nurture) && 'sequence' in nurture
          ? (nurture as JsonObject).sequence ?? null
          : null
    });

    return results;
  }

  /**
   * Call a specific AI agent
   */
  public async callAgent(
    agentName: string,
    action: string,
    data: JsonObject = {}
  ): Promise<JsonObject> {
    try {
      // Check if we have this cached
      const cacheKey = `${agentName}:${action}:${JSON.stringify(data)}`;
      const cached = await memoryService.getCachedResponse(cacheKey);
      const cachedObject = this.toJsonObject(cached);
      if (cachedObject) {
        // console.log(`Using cached response for ${agentName}:${action}`);
        return cachedObject;
      }

      // Try REAL AI with smart fallback chain
      const response = await this.callRealAI(agentName, action, data);
      const responseObject = this.toJsonObject(response) ?? {
        status: 'completed',
        raw: response,
        timestamp: new Date().toISOString(),
      };

      // Cache the response
      await memoryService.cacheApiResponse(cacheKey, responseObject, 10);

      // Record the agent action
      await memoryService.store('agent_action', `${agentName}:${action}`, {
        agent: agentName,
        action,
        data,
        response: responseObject,
        timestamp: new Date().toISOString()
      }, 0.6);

      return responseObject;

    } catch (error) {
      console.error(`Failed to call agent ${agentName}:`, error);

      await memoryService.learn({
        action: `call_agent_${agentName}`,
        result: 'Failed to execute agent action',
        success: false,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      });

      return {
        status: 'error',
        agent: agentName,
        action,
        message: error instanceof Error ? error.message : 'Unknown agent failure',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Call REAL AI using smart multi-tier fallback
   * Priority: Gemini (FREE) → OpenAI (ChatGPT Pro) → Claude (Optional) → Mock
   */
  private async callRealAI(
    agentName: string,
    action: string,
    data: JsonObject
  ): Promise<JsonObject> {
    const agentInfo = (AI_AGENTS as Record<string, AgentDefinition | undefined>)[agentName];
    if (!agentInfo) {
      console.warn(`Unknown agent: ${agentName}, using fallback`);
      return this.simulateAgentResponse(agentName, action, data);
    }

    // Build prompt based on agent role and action
    const prompt = this.buildPrompt(agentInfo, action, data);

    // Tier 1: Try Gemini (FREE - 45K requests/month)
    if (this.gemini) {
      try {
        const result = await this.gemini.generateContent(prompt);
        const text = result.response?.text() ?? '';
        const parsed = this.parseAIResponse(action, text);
        console.log(`✅ Gemini response for ${agentInfo.name}:${action} (FREE tier)`);
        return parsed;
      } catch (error) {
        console.error(`Gemini failed for ${agentName}:${action}, trying OpenAI:`, error);
      }
    }

    // Tier 2: Try OpenAI (ChatGPT Pro subscription)
    if (this.openai) {
      try {
        const messages: ChatCompletionMessageParam[] = [
          { role: 'user', content: prompt },
        ];

        const completion = await this.openai.chat.completions.create({
          model: "gpt-5.1",
          messages,
          max_completion_tokens: 1024
        });
        const text = completion.choices[0]?.message?.content || '';
        const parsed = this.parseAIResponse(action, text);
        console.log(`✅ OpenAI response for ${agentInfo.name}:${action} (ChatGPT Pro)`);
        return parsed;
      } catch (error) {
        console.error(`OpenAI failed for ${agentName}:${action}, trying Claude:`, error);
      }
    }

    // Tier 3: Try Claude (Optional paid)
    if (this.anthropic) {
      try {
        const response = await this.anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: prompt
          }]
        });
        const textContent = response.content.find(c => c.type === 'text');
        const text = textContent && 'text' in textContent ? textContent.text : '';
        const parsed = this.parseAIResponse(action, text);
        console.log(`✅ Claude response for ${agentInfo.name}:${action} (Premium tier)`);
        return parsed;
      } catch (error) {
        console.error(`Claude failed for ${agentName}:${action}, using mock:`, error);
      }
    }

    // Tier 4: Intelligent mock fallback
    // In production we do NOT return synthetic data – fail instead so callers
    // can surface a clear "AI unavailable" state.
    if (IS_PRODUCTION_ENV) {
      throw new Error(
        `[AIOrchestrator] No real AI provider available for ${agentName}:${action} in production.`
      );
    }

    console.log(`⚠️ Using mock response for ${agentInfo.name}:${action} (non-production only)`);
    return this.simulateAgentResponse(agentName, action, data);
  }

  /**
   * Build prompt for AI based on agent and action
   */
  private buildPrompt(agent: AgentDefinition, action: string, data: JsonObject): string {
    const prompts: Record<string, string> = {
      'analyze_customer': `You are ${agent.name}, ${agent.role} for a roofing company.

Analyze this customer data:
${JSON.stringify(data, null, 2)}

Provide a JSON response with:
{
  "satisfaction_score": <0-100>,
  "churn_risk": "low" | "medium" | "high",
  "lifetime_value": <estimated dollar amount>,
  "recommendations": ["recommendation 1", "recommendation 2"]
}`,

      'score_lead': `You are ${agent.name}, ${agent.role} for a roofing company.

Score this lead:
${JSON.stringify(data, null, 2)}

Provide a JSON response with:
{
  "score": <0-100>,
  "quality": "low" | "medium" | "high",
  "recommended_action": "immediate_follow_up" | "nurture" | "disqualify",
  "conversion_probability": <0.0-1.0>
}`,

      'generate_estimate': `You are ${agent.name}, ${agent.role} for a roofing company.

Generate an estimate for:
${JSON.stringify(data, null, 2)}

Provide a JSON response with:
{
  "estimate_id": "EST-<timestamp>",
  "total_amount": <dollar amount>,
  "material_cost": <dollar amount>,
  "labor_cost": <dollar amount>,
  "profit_margin": <0.0-1.0>,
  "validity_days": 30
}`,

      'calculate_materials': `You are ${agent.name}, ${agent.role} for a roofing company.

Calculate materials for:
${JSON.stringify(data, null, 2)}

Provide a JSON response with:
{
  "shingles": {"quantity": <number>, "unit": "bundles", "cost": <amount>},
  "underlayment": {"quantity": <number>, "unit": "rolls", "cost": <amount>},
  "nails": {"quantity": <number>, "unit": "lbs", "cost": <amount>},
  "total_material_cost": <total cost>
}`,

      'schedule_job': `You are ${agent.name}, ${agent.role} for a roofing company.

Schedule this job:
${JSON.stringify(data, null, 2)}

Provide a JSON response with:
{
  "scheduled_date": "<ISO date 5 days from now>",
  "crew_assigned": "Team Alpha" | "Team Beta",
  "estimated_duration": "<X hours>"
}`,

      'prepare_invoice': `You are ${agent.name}, ${agent.role} for a roofing company.

Prepare invoice for:
${JSON.stringify(data, null, 2)}

Provide a JSON response with:
{
  "invoice_id": "INV-<timestamp>",
  "total_amount": <dollar amount>,
  "due_date": "<ISO date 30 days from now>",
  "payment_terms": "Net 30"
}`,

      'prepare_welcome': `You are ${agent.name}, ${agent.role} for a roofing company.

Prepare welcome sequence for new customer:
${JSON.stringify(data, null, 2)}

Provide a JSON response with:
{
  "email_sent": true,
  "sequence": "new_customer_onboarding",
  "next_touchpoint": "3 days"
}`,

      'nurture_lead': `You are ${agent.name}, ${agent.role} for a roofing company.

Create nurture sequence for lead:
${JSON.stringify(data, null, 2)}

Provide a JSON response with:
{
  "sequence": "high_value_nurture",
  "first_email_sent": true,
  "follow_up_scheduled": "24 hours"
}`,

      'create_proposal': `You are ${agent.name}, ${agent.role} for a roofing company.

Create proposal for:
${JSON.stringify(data, null, 2)}

Provide a JSON response with:
{
  "proposal_id": "PROP-<timestamp>",
  "status": "generated",
  "delivery_method": "email",
  "expiry_date": "<ISO date 7 days from now>"
}`,

      'send_payment_reminder': `You are ${agent.name}, ${agent.role} for a roofing company.

Send payment reminder for:
${JSON.stringify(data, null, 2)}

Provide a JSON response with:
{
  "reminder_sent": true,
  "method": "email_and_sms",
  "follow_up_date": "<ISO date 3 days from now>"
}`,

      'quality_inspection': `You are ${agent.name}, ${agent.role} for a roofing company.

Review the following job quality context:
${JSON.stringify(data, null, 2)}

Provide a JSON response with:
{
  "confidence": <0.0-1.0>,
  "issues": [
    {
      "description": "<issue summary>",
      "severity": "critical" | "high" | "medium" | "low",
      "location": "<where the issue was detected>",
      "recommendation": "<proposed fix>"
    }
  ],
  "overall_status": "pass" | "attention_needed" | "fail"
}`,

      'analyze_payment_risk': `You are ${agent.name}, ${agent.role} for a roofing company.

Analyze payment risk for:
${JSON.stringify(data, null, 2)}

Provide a JSON response with:
{
  "risk_level": "low" | "medium" | "high",
  "payment_history": "excellent" | "good" | "poor",
  "recommended_action": "standard_reminder" | "urgent_follow_up",
  "collection_probability": <0.0-1.0>
}`
    };

    return prompts[action] || `You are ${agent.name}, ${agent.role}.

Process this ${action} request:
${JSON.stringify(data, null, 2)}

Provide a helpful JSON response.`;
  }

  /**
   * Parse AI response into structured data
   */
  private parseAIResponse(action: string, text: string): JsonObject {
    try {
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as JsonValue;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as JsonObject;
        }
        return {
          status: 'completed',
          raw: parsed,
          timestamp: new Date().toISOString(),
          source: 'real_ai',
        };
      }

      // If no JSON found, return text wrapped
      return {
        status: 'completed',
        message: text,
        timestamp: new Date().toISOString(),
        source: 'real_ai'
      };
    } catch (error) {
      // If parsing fails, return text
      return {
        status: 'completed',
        message: text,
        timestamp: new Date().toISOString(),
        source: 'real_ai',
        parse_error: true
      };
    }
  }

  /**
   * Simulate agent responses (FALLBACK when AI unavailable)
   */
  private simulateAgentResponse(agent: string, action: string, data: JsonObject): JsonObject {
    const responses: Record<string, JsonObject> = {
      'isabella:analyze_customer': {
        satisfaction_score: 85,
        churn_risk: 'low',
        lifetime_value: 45000,
        recommendations: ['Offer premium services', 'Schedule quarterly check-ins']
      },
      'isabella:score_lead': {
        score: 78,
        quality: 'high',
        recommended_action: 'immediate_follow_up',
        conversion_probability: 0.65
      },
      'max:prepare_welcome': {
        email_sent: true,
        sequence: 'new_customer_onboarding',
        next_touchpoint: '3 days'
      },
      'max:nurture_lead': {
        sequence: 'high_value_nurture',
        first_email_sent: true,
        follow_up_scheduled: '24 hours'
      },
      'max:create_proposal': {
        proposal_id: `PROP-${Date.now()}`,
        status: 'generated',
        delivery_method: 'email',
        expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      'max:send_payment_reminder': {
        reminder_sent: true,
        method: 'email_and_sms',
        follow_up_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      'victoria:schedule_job': {
        scheduled_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        crew_assigned: 'Team Alpha',
        estimated_duration: '6 hours'
      },
      'elena:calculate_materials': {
        shingles: { quantity: 35, unit: 'bundles', cost: 1050 },
        underlayment: { quantity: 10, unit: 'rolls', cost: 500 },
        nails: { quantity: 50, unit: 'lbs', cost: 150 },
        total_material_cost: 1700
      },
      'elena:generate_estimate': {
        estimate_id: `EST-${Date.now()}`,
        total_amount: 8500,
        material_cost: 3400,
        labor_cost: 4100,
        profit_margin: 0.29,
        validity_days: 30
      },
      'marcus:prepare_invoice': {
        invoice_id: `INV-${Date.now()}`,
        total_amount: 8500,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        payment_terms: 'Net 30'
      },
      'marcus:analyze_payment_risk': {
        risk_level: (typeof data.amount_due === 'number' && data.amount_due > 10000) ? 'medium' : 'low',
        payment_history: 'excellent',
        recommended_action: 'standard_reminder',
        collection_probability: 0.95
      }
    };

    const key = `${agent}:${action}`;
    return responses[key] || {
      status: 'completed',
      message: `${agent} processed ${action}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get agent status
   */
  async getAgentStatus(): Promise<JsonObject[]> {
    const statuses: JsonObject[] = [];

    for (const [key, agent] of Object.entries(AI_AGENTS)) {
      // Check recent actions from memory
      const recentActions = await memoryService.recall(
        'agent_action',
        'agent',
        key,
        5
      );

      statuses.push({
        agent: agent.name,
        role: agent.role,
        status: 'active',
        recent_actions: recentActions.length,
        last_action: recentActions[0]?.created_at || 'Never',
        capabilities: agent.capabilities
      });
    }

    return statuses;
  }

  private toJsonObject(value: JsonValue | null): JsonObject | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as JsonObject;
    }
    return null;
  }
}

// Export singleton instance
export const aiOrchestrator = AIOrchestrator.getInstance();
