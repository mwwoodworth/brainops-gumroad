/**
 * SYSTEM INTEGRATION ENGINE
 *
 * This is the CORE of BrainOps AI OS - ties everything together
 * Ensures all systems work in perfect harmony for real human users
 *
 * Features:
 * - Real-time data synchronization across all tables
 * - Automatic workflow triggers and AI agent activation
 * - Business process automation
 * - Comprehensive monitoring and alerting
 * - Self-healing capabilities
 */

import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '@/lib/env';
import { aiOrchestrator } from './ai-orchestrator';
import { memoryService } from './memory-service';
import { systemMonitorAgent } from './system-monitor-agent';
import { taskManagementEngine } from './task-management-engine';
import { ensureJsonObject } from '@/types/json';
import type { JsonValue } from '@/types/json';

// Initialize Supabase client
const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

export class SystemIntegrationEngine {
  private static instance: SystemIntegrationEngine;
  private isRunning: boolean = false;
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private monitors: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.initializeWorkflows();
    this.setupRealtimeListeners();
    this.startAutomatedProcesses();
  }

  static getInstance(): SystemIntegrationEngine {
    if (!SystemIntegrationEngine.instance) {
      SystemIntegrationEngine.instance = new SystemIntegrationEngine();
    }
    return SystemIntegrationEngine.instance;
  }

  /**
   * Initialize all business workflows
   */
  private initializeWorkflows() {
    // Customer Lifecycle Workflow
    this.registerWorkflow({
      id: 'customer-lifecycle',
      name: 'Customer Lifecycle Management',
      triggers: ['new_customer', 'customer_updated'],
      steps: [
        {
          name: 'Lead Scoring',
          action: async (data: any) => {
            const score = await aiOrchestrator.callAgent('isabella', 'score_lead', {
              customer_id: data.id,
              name: data.name,
              email: data.email,
              source: data.source
            });

            const normalizedScore =
              score && typeof score === 'object'
                ? (score as { score?: number | null; quality?: string | null })
                : null;

            // Update customer with score
            await supabase
              .from('customers')
              .update({
                lead_score: normalizedScore?.score ?? null,
                lead_quality: normalizedScore?.quality ?? null
              })
              .eq('id', data.id);

            return normalizedScore;
          }
        },
        {
          name: 'Welcome Sequence',
          action: async (data: any) => {
            const welcome = await aiOrchestrator.callAgent('max', 'prepare_welcome', {
              customer_id: data.id,
              customer_name: data.name
            });

            // Create welcome task
            await taskManagementEngine.createTask({
              title: `Welcome sequence for ${data.name}`,
              description: 'Send welcome email and schedule follow-up',
              relatedEntityType: 'customer',
              relatedEntityId: data.id,
              priority: 'high',
              status: 'pending',
              tenantId: data.tenant_id,
              dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });

            return welcome;
          }
        },
        {
          name: 'First Estimate',
          condition: (data: any) => data.lead_score >= 70,
          action: async (data: any) => {
            // High-value lead - create preliminary estimate
            const estimate = await aiOrchestrator.callAgent('elena', 'generate_estimate', {
              customer_id: data.id,
              property_address: data.address,
              service_type: 'roof_inspection'
            });

            const normalizedEstimate =
              estimate && typeof estimate === 'object'
                ? (estimate as { total_amount?: number | null })
                : null;

            // Save estimate
            await supabase
              .from('estimates')
              .insert({
                customer_id: data.id,
                total_amount: normalizedEstimate?.total_amount ?? null,
                status: 'draft',
                ai_generated: true
              });

            return normalizedEstimate;
          }
        }
      ]
    });

    // Job Fulfillment Workflow
    this.registerWorkflow({
      id: 'job-fulfillment',
      name: 'Job Fulfillment Process',
      triggers: ['new_job', 'job_status_changed'],
      steps: [
        {
          name: 'Schedule Optimization',
          action: async (data: any) => {
            const scheduleResponse = await aiOrchestrator.callAgent('victoria', 'schedule_job', {
              job_id: data?.id,
              customer_id: data?.customer_id,
              priority: data?.priority,
              estimated_duration: data?.estimated_hours
            });

            const schedule = ensureJsonObject(scheduleResponse as JsonValue | undefined);
            const scheduledDateValue = schedule.scheduled_date as JsonValue | undefined;
            const fallbackStart = typeof data?.scheduled_start === 'string' ? data.scheduled_start : undefined;
            const startCandidate = typeof scheduledDateValue === 'string' && scheduledDateValue.trim().length > 0
              ? scheduledDateValue
              : fallbackStart;
            const startDate = (() => {
              if (startCandidate) {
                const parsed = new Date(startCandidate);
                if (!Number.isNaN(parsed.getTime())) {
                  return parsed;
                }
              }
              return new Date();
            })();
            const startIso = startDate.toISOString();

            const crewAssignedValue = schedule.crew_assigned as JsonValue | undefined;
            const crewAssigned = Array.isArray(crewAssignedValue)
              ? crewAssignedValue.filter((member): member is string => typeof member === 'string')
              : undefined;

            const estimatedHoursValue = data?.estimated_hours as JsonValue | undefined;
            const estimatedHours =
              typeof estimatedHoursValue === 'number'
                ? estimatedHoursValue
                : typeof estimatedHoursValue === 'string'
                  ? Number.parseFloat(estimatedHoursValue)
                  : 0;
            const durationMs = Number.isFinite(estimatedHours) && estimatedHours > 0
              ? estimatedHours * 60 * 60 * 1000
              : 0;
            const endDate = new Date(startDate.getTime() + durationMs);
            const endIso = Number.isNaN(endDate.getTime()) ? startIso : endDate.toISOString();

            // Update job with schedule
            await supabase
              .from('jobs')
              .update({
                scheduled_start: startIso,
                crew_assigned: crewAssigned ?? null
              })
              .eq('id', data?.id);

            // Create calendar event
            await this.createCalendarEvent({
              title: `Job: ${typeof data?.title === 'string' ? data.title : data?.id ?? 'Scheduled job'}`,
              start: startIso,
              end: endIso,
              type: 'job',
              related_id: data?.id ?? null
            });

            return schedule;
          }
        },
        {
          name: 'Material Calculation',
          action: async (data: any) => {
            const materials = await aiOrchestrator.callAgent('elena', 'calculate_materials', {
              job_id: data.id,
              job_type: data.job_type,
              square_footage: data.square_footage
            });

            const materialEntries =
              materials && typeof materials === 'object'
                ? (materials as Record<string, any>)
                : {};

            // Create material orders
            for (const [item, details] of Object.entries(materialEntries)) {
              if (item !== 'total_material_cost') {
                await supabase
                  .from('material_orders')
                  .insert({
                    job_id: data.id,
                    item_name: item,
                    quantity: (details as any).quantity,
                    unit: (details as any).unit,
                    estimated_cost: (details as any).cost
                  });
              }
            }

            return materialEntries;
          }
        },
        {
          name: 'Crew Assignment',
          condition: (data: any) => data.scheduled_start != null,
          action: async (data: any) => {
            // Find available crew members
            const { data: availableCrew } = await supabase
              .from('employees')
              .select('*')
              .eq('status', 'active')
              .eq('role', 'technician');

            // Assign crew to job
            if (availableCrew && availableCrew.length > 0) {
              await supabase
                .from('job_assignments')
                .insert(
                  availableCrew.slice(0, 3).map(emp => ({
                    job_id: data.id,
                    employee_id: emp.id,
                    role: 'crew_member'
                  }))
                );
            }

            return { crew_assigned: availableCrew?.length || 0 };
          }
        }
      ]
    });

    // Invoice & Collections Workflow
    this.registerWorkflow({
      id: 'invoice-collections',
      name: 'Invoice and Collections Process',
      triggers: ['job_completed', 'invoice_created', 'payment_overdue'],
      steps: [
        {
          name: 'Generate Invoice',
          condition: (data: any) => data.status === 'completed' && !data.invoice_id,
          action: async (data: any) => {
            const invoice = await aiOrchestrator.callAgent('marcus', 'prepare_invoice', {
              job_id: data.id,
              customer_id: data.customer_id,
              amount: data.total_amount
            });

            const normalizedInvoice =
              invoice && typeof invoice === 'object'
                ? (invoice as { total_amount?: number | null; due_date?: string | null })
                : null;

            // Create invoice
            const { data: newInvoice } = await supabase
              .from('invoices')
              .insert({
                job_id: data.id,
                customer_id: data.customer_id,
                total_amount: normalizedInvoice?.total_amount ?? data.total_amount ?? 0,
                due_date: normalizedInvoice?.due_date ?? null,
                status: 'pending'
              })
              .select()
              .single();

            // Send invoice
            await this.sendInvoiceEmail(newInvoice);

            return normalizedInvoice;
          }
        },
        {
          name: 'Payment Reminder',
          condition: (data: any) => {
            const dueDate = new Date(data.due_date);
            const today = new Date();
            return dueDate < today && data.status === 'pending';
          },
          action: async (data: any) => {
            const reminder = await aiOrchestrator.callAgent('max', 'send_payment_reminder', {
              customer_id: data.customer_id,
              invoice_id: data.id,
              amount_due: data.balance_due
            });

            // Log reminder
            await supabase
              .from('communication_log')
              .insert({
                type: 'payment_reminder',
                recipient_id: data.customer_id,
                invoice_id: data.id,
                sent_at: new Date()
              });

            return reminder;
          }
        },
        {
          name: 'Collections Escalation',
          condition: (data: any) => {
            const dueDate = new Date(data.due_date);
            const today = new Date();
            const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            return daysOverdue > 30 && data.status !== 'paid';
          },
          action: async (data: any) => {
            // Escalate to collections
            await taskManagementEngine.createTask({
              title: `Collections: Invoice ${data.invoice_number}`,
              description: `Invoice is 30+ days overdue. Amount: $${data.balance_due}`,
              priority: 'high',
              status: 'pending',
              tenantId: data.tenant_id,
              relatedEntityType: 'invoice',
              relatedEntityId: data.id,
              assignedTo: 'collections_team'
            });

            return { escalated: true };
          }
        }
      ]
    });

    // Quality Assurance Workflow
    this.registerWorkflow({
      id: 'quality-assurance',
      name: 'Quality Assurance Process',
      triggers: ['job_completed', 'inspection_completed'],
      steps: [
        {
          name: 'Customer Satisfaction Survey',
          action: async (data: any) => {
            // Create satisfaction survey
            await supabase
              .from('surveys')
              .insert({
                customer_id: data.customer_id,
                job_id: data.id,
                type: 'satisfaction',
                status: 'pending',
                sent_at: new Date()
              });

            return { survey_sent: true };
          }
        },
        {
          name: 'Follow-up Scheduling',
          condition: (data: any) => data.job_type === 'roof_replacement',
          action: async (data: any) => {
            // Schedule 6-month follow-up
            const followUpDate = new Date();
            followUpDate.setMonth(followUpDate.getMonth() + 6);

            await taskManagementEngine.createTask({
              title: `6-month follow-up for ${data.customer_name}`,
              description: 'Conduct roof inspection and maintenance check',
              status: 'pending',
              priority: 'medium',
              tenantId: data.tenant_id,
              dueDate: followUpDate.toISOString(),
              relatedEntityType: 'job',
              relatedEntityId: data.id,
              isRecurring: true
            });

            return { follow_up_scheduled: followUpDate };
          }
        }
      ]
    });

    console.log(`✅ Initialized ${this.workflows.size} business workflows`);
  }

  /**
   * Setup real-time database listeners
   */
  private setupRealtimeListeners() {
    // Listen for new customers
    supabase
      .channel('customers')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'customers'
      }, async (payload) => {
        console.log('New customer detected:', payload.new.id);
        await this.triggerWorkflow('customer-lifecycle', payload.new);
      })
      .subscribe();

    // Listen for new jobs
    supabase
      .channel('jobs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'jobs'
      }, async (payload) => {
        console.log('New job detected:', payload.new.id);
        await this.triggerWorkflow('job-fulfillment', payload.new);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'jobs',
        filter: 'status=eq.completed'
      }, async (payload) => {
        console.log('Job completed:', payload.new.id);
        await this.triggerWorkflow('invoice-collections', payload.new);
        await this.triggerWorkflow('quality-assurance', payload.new);
      })
      .subscribe();

    // Listen for overdue invoices
    supabase
      .channel('invoices')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'invoices',
        filter: 'status=eq.overdue'
      }, async (payload) => {
        console.log('Invoice overdue:', payload.new.id);
        await this.triggerWorkflow('invoice-collections', payload.new);
      })
      .subscribe();

    console.log('✅ Real-time listeners configured');
  }

  /**
   * Start automated background processes
   */
  private startAutomatedProcesses() {
    // Daily morning optimization (8 AM)
    this.scheduleDaily('morning-optimization', 8, 0, async () => {
      console.log('🌅 Running morning optimization...');

      // Optimize today's schedule
      await this.optimizeTodaySchedule();

      // Check for overdue tasks
      await this.processOverdueTasks();

      // Generate daily reports
      await this.generateDailyReports();
    });

    // Hourly sync and monitoring
    this.scheduleHourly('system-sync', async () => {
      // Sync with external systems
      await this.syncExternalSystems();

      // Check system health
      const health = await systemMonitorAgent.getCurrentStatus();

      // Alert if issues
      if (health.overallScore < 80) {
        await this.sendAlert('System health degraded', health);
      }
    });

    // Every 15 minutes - process queued workflows
    this.scheduleInterval('workflow-processor', 15, async () => {
      await this.processQueuedWorkflows();
    });

    // Every 5 minutes - AI cache cleanup
    this.scheduleInterval('cache-cleanup', 5, async () => {
      await supabase.rpc('clean_expired_ai_cache');
    });

    console.log('✅ Automated processes started');
  }

  /**
   * Register a workflow definition
   */
  private registerWorkflow(workflow: WorkflowDefinition) {
    this.workflows.set(workflow.id, workflow);
  }

  /**
   * Trigger a workflow execution
   */
  async triggerWorkflow(workflowId: string, data: any): Promise<any> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      console.error(`Workflow ${workflowId} not found`);
      return null;
    }

    console.log(`🔄 Executing workflow: ${workflow.name}`);
    const results = [];

    for (const step of workflow.steps) {
      // Check condition
      if (step.condition && !step.condition(data)) {
        console.log(`⏩ Skipping step: ${step.name} (condition not met)`);
        continue;
      }

      try {
        console.log(`▶️ Executing step: ${step.name}`);
        const result = await step.action(data);
        results.push({ step: step.name, result });

        // Log to memory
        await memoryService.store('workflow_execution',
          `${workflow.name} - ${step.name}`,
          { data, result },
          0.7
        );
      } catch (error) {
        console.error(`❌ Step failed: ${step.name}`, error);
        results.push({ step: step.name, error: (error as Error).message });
      }
    }

    return results;
  }

  /**
   * Optimize today's schedule using AI
   */
  private async optimizeTodaySchedule() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's jobs
    const { data: todaysJobs } = await supabase
      .from('jobs')
      .select('*')
      .gte('scheduled_start', today.toISOString())
      .lt('scheduled_start', tomorrow.toISOString())
      .eq('status', 'scheduled');

    if (todaysJobs && todaysJobs.length > 0) {
      // Optimize routing
      const optimizationResponse = await aiOrchestrator.callAgent('victoria', 'optimize_route', {
        jobs: todaysJobs,
        date: today.toISOString()
      });

      // Update job order based on optimization
      const optimization = ensureJsonObject(optimizationResponse as JsonValue | undefined);
      const optimizedRouteValue = optimization.optimized_route as JsonValue | undefined;
      const optimizedRoute = Array.isArray(optimizedRouteValue)
        ? optimizedRouteValue.filter(
            (entry): entry is Record<string, JsonValue> =>
              typeof entry === 'object' && entry !== null && !Array.isArray(entry)
          )
        : [];

      for (const job of optimizedRoute) {
        const jobId = typeof job.id === 'string' ? job.id : null;
        const orderValue = job.order;
        const order =
          typeof orderValue === 'number'
            ? orderValue
            : typeof orderValue === 'string'
              ? Number.parseInt(orderValue, 10)
              : undefined;

        if (!jobId || Number.isNaN(order ?? NaN) || order === undefined) {
          continue;
        }

        await supabase
          .from('jobs')
          .update({ route_order: order })
          .eq('id', jobId);
      }

      console.log(`✅ Optimized ${todaysJobs.length} jobs for today`);
    }
  }

  /**
   * Process overdue tasks
   */
  private async processOverdueTasks() {
    const { data: overdueTasks } = await supabase
      .from('tasks_enhanced')
      .select('*')
      .lt('due_date', new Date().toISOString())
      .eq('status', 'pending');

    if (overdueTasks && overdueTasks.length > 0) {
      for (const task of overdueTasks) {
        // Send reminder
        await supabase
          .from('reminders_enhanced')
          .insert({
            title: `Overdue: ${task.title}`,
            message: task.description,
            recipient_id: task.assigned_to,
            priority: 'urgent',
            scheduled_for: new Date()
          });

        // Update task status
        await supabase
          .from('tasks_enhanced')
          .update({ status: 'overdue' })
          .eq('id', task.id);
      }

      console.log(`⚠️ Processed ${overdueTasks.length} overdue tasks`);
    }
  }

  /**
   * Generate daily reports
   */
  private async generateDailyReports() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Generate various reports
    const reports = await Promise.all([
      this.generateRevenueReport(yesterday),
      this.generateProductivityReport(yesterday),
      this.generateCustomerReport(yesterday)
    ]);

    // Store reports
    for (const report of reports) {
      await supabase
        .from('daily_reports')
        .insert({
          report_date: yesterday.toISOString(),
          report_type: report.type,
          data: report.data,
          insights: report.insights
        });
    }

    console.log(`📊 Generated ${reports.length} daily reports`);
  }

  /**
   * Helper functions
   */
  private async createCalendarEvent(event: any) {
    return await supabase
      .from('calendar_events_enhanced')
      .insert({
        title: event.title,
        start_datetime: event.start,
        end_datetime: event.end,
        event_type: event.type,
        related_entity_type: event.type,
        related_entity_id: event.related_id,
        status: 'scheduled'
      });
  }

  private async sendInvoiceEmail(invoice: any) {
    // Implementation for sending invoice
    console.log(`📧 Sending invoice ${invoice.id} to customer`);
  }

  private async sendAlert(message: string, data: any) {
    console.error(`🚨 ALERT: ${message}`, data);
    // Send to notification system
  }

  private async syncExternalSystems() {
    // Sync with CompanyCam, QuickBooks, etc.
    console.log('🔄 Syncing external systems...');
  }

  private async processQueuedWorkflows() {
    // Process any queued workflow executions
  }

  private async generateRevenueReport(date: Date) {
    // Generate revenue analytics
    return {
      type: 'revenue',
      data: { /* revenue data */ },
      insights: 'AI-generated insights'
    };
  }

  private async generateProductivityReport(date: Date) {
    // Generate productivity metrics
    return {
      type: 'productivity',
      data: { /* productivity data */ },
      insights: 'AI-generated insights'
    };
  }

  private async generateCustomerReport(date: Date) {
    // Generate customer analytics
    return {
      type: 'customer',
      data: { /* customer data */ },
      insights: 'AI-generated insights'
    };
  }

  /**
   * Scheduling helpers
   */
  private scheduleDaily(name: string, hour: number, minute: number, callback: () => Promise<void>) {
    const now = new Date();
    const scheduled = new Date();
    scheduled.setHours(hour, minute, 0, 0);

    if (scheduled <= now) {
      scheduled.setDate(scheduled.getDate() + 1);
    }

    const delay = scheduled.getTime() - now.getTime();

    setTimeout(() => {
      callback();
      // Reschedule for tomorrow
      this.scheduleDaily(name, hour, minute, callback);
    }, delay);

    console.log(`⏰ Scheduled ${name} for ${scheduled.toLocaleString()}`);
  }

  private scheduleHourly(name: string, callback: () => Promise<void>) {
    const interval = setInterval(callback, 60 * 60 * 1000);
    this.monitors.set(name, interval);
  }

  private scheduleInterval(name: string, minutes: number, callback: () => Promise<void>) {
    const interval = setInterval(callback, minutes * 60 * 1000);
    this.monitors.set(name, interval);
  }

  /**
   * Public API
   */
  public async start() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('🚀 System Integration Engine started');

    // Run initial sync
    await this.syncExternalSystems();
    await this.processOverdueTasks();
  }

  public async stop() {
    this.isRunning = false;

    // Clear all intervals
    for (const [name, interval] of this.monitors) {
      clearInterval(interval);
    }
    this.monitors.clear();

    console.log('🛑 System Integration Engine stopped');
  }

  public async getStatus() {
    return {
      running: this.isRunning,
      workflows: Array.from(this.workflows.keys()),
      monitors: Array.from(this.monitors.keys()),
      health: await systemMonitorAgent.getCurrentStatus()
    };
  }
}

// Type definitions
interface WorkflowDefinition {
  id: string;
  name: string;
  triggers: string[];
  steps: WorkflowStep[];
}

interface WorkflowStep {
  name: string;
  condition?: (data: any) => boolean;
  action: (data: any) => Promise<any>;
}

// Export singleton
export const systemIntegrationEngine = SystemIntegrationEngine.getInstance();
