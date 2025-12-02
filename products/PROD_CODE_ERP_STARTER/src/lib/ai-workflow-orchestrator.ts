/**
 * WEATHERCRAFT ERP - AI WORKFLOW ORCHESTRATOR
 * Connects operational AI agents to end-to-end business workflows.
 */

import { aiOrchestrator } from './ai-orchestrator';
import { taskManagementEngine } from './task-management-engine';
import { memoryService } from './memory-service';
import type { JsonArray, JsonObject, JsonValue } from '@/types/json';

export interface WorkflowTrigger {
  event: string;
  entityType: string;
  entityId: string;
  data: JsonObject;
  tenantId: string;
}

export interface WorkflowActionResult {
  agent: string;
  action: string;
  result: JsonValue;
  confidence: number;
}

export interface WorkflowResult {
  success: boolean;
  actions: WorkflowActionResult[];
  tasksCreated?: string[];
  remindersCreated?: string[];
  error?: string;
}

interface LeadPayload {
  id: string;
  name?: string;
  source?: string;
  projectType?: string;
  estimatedBudget?: number;
  address?: string;
}

interface EstimateRequestPayload {
  id: string;
  customerId: string;
  customerName?: string;
  projectType?: string;
  scope?: string;
  materials?: string;
  squareFeet?: number;
  location?: string;
}

interface JobPayload {
  id: string;
  jobType?: string;
  location?: string;
  estimatedHours?: number;
  priority?: string;
  requiredSkills?: string[] | string | null;
  stage?: string;
  jobNumber?: string;
  customerName?: string;
  customerId?: string;
  servicesPerformed?: string;
  materialsUsed?: string;
  actualHours?: number;
}

interface QualityIssuePayload {
  description?: string;
  severity?: string;
  location?: string;
  recommendation?: string;
}

const FALLBACK_CONFIDENCE = 0.8;

class AIWorkflowOrchestrator {
  async processNewLead(leadInput: JsonObject, tenantId: string): Promise<WorkflowResult> {
    const lead = this.normalizeLead(leadInput);
    const actions: WorkflowActionResult[] = [];
    const tasksCreated: string[] = [];

    try {
      const scoringResultRaw = await aiOrchestrator.callAgent('isabella', 'score_lead', {
        lead_id: lead.id,
        name: lead.name ?? null,
        source: lead.source ?? null,
        project_type: lead.projectType ?? null,
        estimated_budget: lead.estimatedBudget ?? null,
        address: lead.address ?? null,
        analysis_type: 'lead_scoring',
      });

      const scoringResult = this.asObject(scoringResultRaw, 'lead scoring result');
      const confidence = this.asNumber(scoringResult.confidence) ?? FALLBACK_CONFIDENCE;

      actions.push({
        agent: 'isabella',
        action: 'score_lead',
        result: scoringResult,
        confidence,
      });

      const taskResult = await taskManagementEngine.createTask({
        title: `Follow up with ${lead.name ?? 'lead'} – ${this.formatPriority(scoringResult.priority)} priority`,
        description: this.buildLeadTaskDescription(scoringResult),
        priority: this.mapLeadPriority(scoringResult.priority),
        status: 'pending',
        category: 'Sales',
        relatedEntityType: 'lead',
        relatedEntityId: lead.id,
        dueDate: this.calculateDueDateHours(this.asNumber(scoringResult.urgency_hours) ?? 24),
        aiGenerated: true,
        aiAgentName: 'isabella',
        aiConfidence: confidence,
        tenantId,
      });

      if (taskResult.success && taskResult.task) {
        tasksCreated.push(taskResult.task.id);
      }

      await memoryService.store(
        'workflow_event',
        `New lead processed: ${lead.name ?? lead.id} – Score: ${this.asNumber(scoringResult.score) ?? 0}/100`,
        {
          lead_id: lead.id,
          score: this.asNumber(scoringResult.score) ?? null,
          priority: scoringResult.priority ?? null,
          tasks_created: tasksCreated.length,
        },
        0.7
      );

      return { success: true, actions, tasksCreated };
    } catch (error) {
      console.error('Lead processing workflow failed:', error);
      return { success: false, actions, error: this.errorMessage(error) };
    }
  }

  async generateEstimate(requestInput: JsonObject, tenantId: string): Promise<WorkflowResult> {
    const request = this.normalizeEstimateRequest(requestInput);
    const actions: WorkflowActionResult[] = [];
    const tasksCreated: string[] = [];

    try {
      const estimateResultRaw = await aiOrchestrator.callAgent('elena', 'generate_estimate', {
        estimate_request_id: request.id,
        customer_id: request.customerId,
        project_type: request.projectType ?? null,
        scope: request.scope ?? null,
        materials: request.materials ?? null,
        square_feet: request.squareFeet ?? null,
        location: request.location ?? null,
      });

      const estimateResult = this.asObject(estimateResultRaw, 'estimate result');
      const totalAmount = this.asNumber(estimateResult.total_amount) ?? 0;
      const confidence = this.asNumber(estimateResult.confidence) ?? 0.85;

      actions.push({
        agent: 'elena',
        action: 'generate_estimate',
        result: estimateResult,
        confidence,
      });

      const reviewTask = await taskManagementEngine.createTask({
        title: `Review AI estimate for ${request.customerName ?? 'customer'}`,
        description: this.buildEstimateTaskDescription(estimateResult),
        priority: totalAmount > 10000 ? 'high' : 'medium',
        status: 'pending',
        category: 'Estimation',
        relatedEntityType: 'estimate',
        relatedEntityId: this.asString(estimateResult.estimate_id) ?? undefined,
        dueDate: this.calculateDueDateHours(24),
        aiGenerated: true,
        aiAgentName: 'elena',
        aiConfidence: confidence,
        tenantId,
      });

      if (reviewTask.success && reviewTask.task) {
        tasksCreated.push(reviewTask.task.id);
      }

      return { success: true, actions, tasksCreated };
    } catch (error) {
      console.error('Estimation workflow failed:', error);
      return { success: false, actions, error: this.errorMessage(error) };
    }
  }

  async scheduleJob(jobInput: JsonObject, _tenantId: string): Promise<WorkflowResult> {
    const job = this.normalizeJob(jobInput);
    const actions: WorkflowActionResult[] = [];

    try {
      const scheduleResultRaw = await aiOrchestrator.callAgent('victoria', 'schedule_job', {
        job_id: job.id,
        job_type: job.jobType ?? null,
        location: job.location ?? null,
        estimated_hours: job.estimatedHours ?? null,
        priority: job.priority ?? null,
        required_skills: job.requiredSkills ?? null,
      });

      const scheduleResult = this.asObject(scheduleResultRaw, 'schedule result');
      const confidence = this.asNumber(scheduleResult.confidence) ?? 0.75;

      actions.push({
        agent: 'victoria',
        action: 'schedule_job',
        result: scheduleResult,
        confidence,
      });

      return { success: true, actions };
    } catch (error) {
      console.error('Scheduling workflow failed:', error);
      return { success: false, actions, error: this.errorMessage(error) };
    }
  }

  async generateAndSendInvoice(jobInput: JsonObject, tenantId: string): Promise<WorkflowResult> {
    const job = this.normalizeJob(jobInput);
    const actions: WorkflowActionResult[] = [];
    const tasksCreated: string[] = [];

    try {
      const invoiceResultRaw = await aiOrchestrator.callAgent('marcus', 'prepare_invoice', {
        job_id: job.id,
        customer_id: job.customerId ?? null,
        job_number: job.jobNumber ?? null,
        services_performed: job.servicesPerformed ?? null,
        materials_used: job.materialsUsed ?? null,
        labor_hours: job.actualHours ?? null,
      });

      const invoiceResult = this.asObject(invoiceResultRaw, 'invoice result');
      const totalAmount = this.asNumber(invoiceResult.total_amount ?? invoiceResult.total) ?? 0;
      const confidence = this.asNumber(invoiceResult.confidence) ?? 0.9;

      actions.push({
        agent: 'marcus',
        action: 'prepare_invoice',
        result: invoiceResult,
        confidence,
      });

      const reminderTask = await taskManagementEngine.createTask({
        title: `Payment reminder: Invoice ${this.asString(invoiceResult.invoice_number) ?? ''}`.trim(),
        description: `Follow up on payment for ${job.customerName ?? 'customer'}\nAmount: $${totalAmount.toFixed(2)}`,
        priority: totalAmount > 5000 ? 'high' : 'medium',
        status: 'pending',
        category: 'Collections',
        relatedEntityType: 'invoice',
        relatedEntityId: this.asString(invoiceResult.invoice_id) ?? undefined,
        dueDate: this.calculateDueDateDays(30),
        aiGenerated: true,
        aiAgentName: 'marcus',
        aiConfidence: confidence,
        tenantId,
      });

      if (reminderTask.success && reminderTask.task) {
        tasksCreated.push(reminderTask.task.id);
      }

      return { success: true, actions, tasksCreated };
    } catch (error) {
      console.error('Invoice workflow failed:', error);
      return { success: false, actions, error: this.errorMessage(error) };
    }
  }

  async monitorJobQuality(eventInput: JsonObject, tenantId: string): Promise<WorkflowResult> {
    const job = this.normalizeJob(this.asObject(eventInput.job ?? {}, 'job'));
    const photos = this.asArray(eventInput.photos);
    const actions: WorkflowActionResult[] = [];
    const tasksCreated: string[] = [];

    try {
      const qualityResultRaw = await aiOrchestrator.callAgent('quality', 'quality_inspection', {
        job_id: job.id,
        job_type: job.jobType ?? null,
        stage: job.stage ?? null,
        photo_count: photos.length,
      });

      const qualityResult = this.asObject(qualityResultRaw, 'quality inspection result');
      const confidence = this.asNumber(qualityResult.confidence) ?? 0.7;

      actions.push({
        agent: 'quality',
        action: 'quality_inspection',
        result: qualityResult,
        confidence,
      });

      const issues = this.asArrayOfObjects(qualityResult.issues);
      if (issues.length > 0) {
        for (const issueRaw of issues) {
          const issue = this.normalizeQualityIssue(issueRaw);
          const issueTask = await taskManagementEngine.createTask({
            title: `Quality issue: ${issue.description ?? 'Review required'}`,
            description: this.buildQualityTaskDescription(issue),
            priority: this.mapQualityPriority(issue.severity),
            status: 'pending',
            category: 'Quality Control',
            relatedEntityType: 'job',
            relatedEntityId: job.id,
            dueDate: this.calculateDueDateHours(issue.severity === 'critical' ? 24 : 48),
            aiGenerated: true,
            aiAgentName: 'quality',
            tenantId,
          });

          if (issueTask.success && issueTask.task) {
            tasksCreated.push(issueTask.task.id);
          }
        }
      }

      return { success: true, actions, tasksCreated };
    } catch (error) {
      console.error('Quality monitoring workflow failed:', error);
      return { success: false, actions, error: this.errorMessage(error) };
    }
  }

  async trigger(event: WorkflowTrigger): Promise<WorkflowResult> {
    try {
      switch (event.event) {
        case 'lead.created':
          return await this.processNewLead(event.data, event.tenantId);
        case 'estimate.requested':
          return await this.generateEstimate(event.data, event.tenantId);
        case 'job.needs_scheduling':
          return await this.scheduleJob(event.data, event.tenantId);
        case 'job.completed':
          return await this.generateAndSendInvoice(event.data, event.tenantId);
        case 'photos.uploaded':
          return await this.monitorJobQuality(event.data, event.tenantId);
        default:
          return { success: false, actions: [], error: `Unknown workflow event: ${event.event}` };
      }
    } catch (error) {
      console.error('Workflow trigger failed:', error);
      return { success: false, actions: [], error: this.errorMessage(error) };
    }
  }

  private normalizeLead(input: JsonObject): LeadPayload {
    const id = this.asString(input.id) ?? this.asString(input.lead_id);
    if (!id) {
      throw new Error('Lead payload missing id');
    }

    return {
      id,
      name: this.asString(input.name),
      source: this.asString(input.source),
      projectType: this.asString(input.project_type ?? input.projectType),
      estimatedBudget: this.asNumber(input.estimated_budget ?? input.estimatedBudget),
      address: this.asString(input.address),
    };
  }

  private normalizeEstimateRequest(input: JsonObject): EstimateRequestPayload {
    const id = this.asString(input.id) ?? this.asString(input.estimate_request_id);
    const customerId = this.asString(input.customer_id);
    if (!id || !customerId) {
      throw new Error('Estimate request payload missing identifiers');
    }

    return {
      id,
      customerId,
      customerName: this.asString(input.customer_name),
      projectType: this.asString(input.project_type ?? input.projectType),
      scope: this.asString(input.scope),
      materials: this.asString(input.materials),
      squareFeet: this.asNumber(input.square_feet ?? input.squareFeet),
      location: this.asString(input.location),
    };
  }

  private normalizeJob(input: JsonObject): JobPayload {
    const id = this.asString(input.id) ?? this.asString(input.job_id);
    if (!id) {
      throw new Error('Job payload missing id');
    }

    return {
      id,
      jobType: this.asString(input.job_type ?? input.jobType),
      location: this.asString(input.location),
      estimatedHours: this.asNumber(input.estimated_hours ?? input.estimatedHours),
      priority: this.asString(input.priority),
      requiredSkills: this.extractRequiredSkills(input.required_skills ?? input.requiredSkills),
      stage: this.asString(input.stage),
      jobNumber: this.asString(input.job_number ?? input.jobNumber),
      customerName: this.asString(input.customer_name ?? input.customerName),
      customerId: this.asString(input.customer_id ?? input.customerId),
      servicesPerformed: this.asString(input.services_performed ?? input.servicesPerformed),
      materialsUsed: this.asString(input.materials ?? input.materials_used ?? input.materialsUsed),
      actualHours: this.asNumber(input.actual_hours ?? input.actualHours),
    };
  }

  private normalizeQualityIssue(input: JsonObject): QualityIssuePayload {
    return {
      description: this.asString(input.description),
      severity: this.asString(input.severity),
      location: this.asString(input.location),
      recommendation: this.asString(input.recommendation),
    };
  }

  private buildLeadTaskDescription(result: JsonObject): string {
    const summary = this.asString(result.summary) ?? 'AI analysis completed.';
    const recommendations = this.formatRecommendations(result.recommendations);
    return `AI Analysis: ${summary}\n\nRecommended Actions:\n${recommendations}`;
  }

  private buildEstimateTaskDescription(result: JsonObject): string {
    const total = this.asNumber(result.total_amount);
    const confidence = this.asNumber(result.confidence);
    const summary = this.asString(result.summary) ?? 'Review the generated estimate for accuracy.';

    const lines = [
      `AI-generated estimate ready for review.`,
      total !== undefined ? `Total: $${total.toFixed(2)}` : undefined,
      confidence !== undefined ? `Confidence: ${Math.round(confidence * 100)}%` : undefined,
      '',
      'Key Items:',
      summary,
    ].filter(Boolean);

    return lines.join('\n');
  }

  private buildQualityTaskDescription(issue: QualityIssuePayload): string {
    const parts = [
      'Issue identified by AI quality inspection:',
      '',
      issue.severity ? `Severity: ${issue.severity}` : undefined,
      issue.location ? `Location: ${issue.location}` : undefined,
      issue.recommendation ? `Recommended Fix: ${issue.recommendation}` : undefined,
    ].filter(Boolean);

    return parts.join('\n');
  }

  private formatRecommendations(value: JsonValue | undefined): string {
    if (Array.isArray(value)) {
      return value.map(rec => (typeof rec === 'string' ? `- ${rec}` : `- ${JSON.stringify(rec)}`)).join('\n');
    }
    if (typeof value === 'string') {
      return value;
    }
    if (value && typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return 'No recommendations provided.';
  }

  private formatPriority(priority: JsonValue | undefined): string {
    if (typeof priority === 'string' && priority.trim().length > 0) {
      return priority.trim();
    }
    return 'Medium';
  }

  private mapLeadPriority(priority: JsonValue | undefined): 'critical' | 'high' | 'medium' | 'low' {
    if (typeof priority !== 'string') return 'medium';
    const normalized = priority.trim().toLowerCase();
    if (['critical', 'urgent'].includes(normalized)) return 'critical';
    if (['high', 'hot'].includes(normalized)) return 'high';
    if (['medium', 'warm'].includes(normalized)) return 'medium';
    if (['low', 'cold'].includes(normalized)) return 'low';
    return 'medium';
  }

  private mapQualityPriority(severity?: string): 'critical' | 'high' | 'medium' | 'low' {
    const normalized = (severity ?? '').toLowerCase();
    if (normalized === 'critical') return 'critical';
    if (normalized === 'high') return 'high';
    if (normalized === 'medium') return 'medium';
    if (normalized === 'low') return 'low';
    return 'high';
  }

  private extractRequiredSkills(value: JsonValue | undefined): string[] | string | null {
    if (Array.isArray(value)) {
      return value.filter(item => typeof item === 'string');
    }
    if (typeof value === 'string') {
      return value;
    }
    return null;
  }

  private calculateDueDateHours(hours: number): string {
    const millis = Math.max(1, Math.round(hours)) * 60 * 60 * 1000;
    return new Date(Date.now() + millis).toISOString();
  }

  private calculateDueDateDays(days: number): string {
    const millis = Math.max(1, Math.round(days)) * 24 * 60 * 60 * 1000;
    return new Date(Date.now() + millis).toISOString();
  }

  private asObject(value: JsonValue | null | undefined, label: string): JsonObject {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as JsonObject;
    }
    throw new Error(`${label} must be an object`);
  }

  private asArray(value: JsonValue | undefined): JsonArray {
    return Array.isArray(value) ? (value as JsonArray) : [];
  }

  private asArrayOfObjects(value: JsonValue | undefined): JsonObject[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter(item => item && typeof item === 'object' && !Array.isArray(item))
      .map(item => item as JsonObject);
  }

  private asString(value: JsonValue | undefined): string | undefined {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    return undefined;
  }

  private asNumber(value: JsonValue | undefined): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}

export const aiWorkflowOrchestrator = new AIWorkflowOrchestrator();
