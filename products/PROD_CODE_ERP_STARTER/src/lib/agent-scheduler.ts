/**
 * AI Agent Scheduler
 * Manages continuous agent operations and task distribution
 */

import { aiOrchestrator } from './ai-orchestrator';
import { memoryService } from './memory-service';
import { supabase } from './supabase';
import type { JsonValue } from '@/types/json';

interface ScheduledTask {
  agent: string;
  action: string;
  data: any;
  priority: number;
  scheduled_for: Date;
  retry_count?: number;
}

class AgentScheduler {
  private static instance: AgentScheduler;
  private taskQueue: ScheduledTask[] = [];
  private isRunning: boolean = false;
  private processInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): AgentScheduler {
    if (!AgentScheduler.instance) {
      AgentScheduler.instance = new AgentScheduler();
    }
    return AgentScheduler.instance;
  }

  /**
   * Start the scheduler
   */
  async start() {
    if (this.isRunning) return;

    this.isRunning = true;
    // console.log('🤖 Agent Scheduler Started');

    // Load pending tasks
    await this.loadPendingTasks();

    // Schedule recurring tasks
    this.scheduleRecurringTasks();

    // Start processing loop
    this.processInterval = setInterval(() => {
      this.processTasks();
    }, 10000); // Process every 10 seconds

    // Record startup
    await memoryService.store('scheduler_event', 'Agent scheduler started', {
      timestamp: new Date().toISOString()
    }, 0.8);
  }

  /**
   * Stop the scheduler
   */
  async stop() {
    this.isRunning = false;
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    // console.log('🛑 Agent Scheduler Stopped');
  }

  /**
   * Schedule recurring tasks for agents
   */
  private scheduleRecurringTasks() {
    // Daily estimate generation for jobs without estimates
    this.scheduleTask({
      agent: 'elena',
      action: 'generate_missing_estimates',
      data: { batch_size: 50 },
      priority: 8,
      scheduled_for: this.getNextRunTime('daily')
    });

    // Hourly customer scoring
    this.scheduleTask({
      agent: 'isabella',
      action: 'score_customers',
      data: { segment: 'active' },
      priority: 7,
      scheduled_for: this.getNextRunTime('hourly')
    });

    // Daily schedule optimization
    this.scheduleTask({
      agent: 'victoria',
      action: 'optimize_schedules',
      data: { days_ahead: 7 },
      priority: 9,
      scheduled_for: this.getNextRunTime('daily', 6) // 6 AM
    });

    // Twice daily payment follow-ups
    this.scheduleTask({
      agent: 'marcus',
      action: 'check_overdue_invoices',
      data: { days_overdue: 3 },
      priority: 10,
      scheduled_for: this.getNextRunTime('twice_daily')
    });

    // Continuous lead nurturing
    this.scheduleTask({
      agent: 'max',
      action: 'nurture_leads',
      data: { batch_size: 20 },
      priority: 6,
      scheduled_for: this.getNextRunTime('hourly')
    });
  }

  /**
   * Add a task to the queue
   */
  scheduleTask(task: ScheduledTask) {
    this.taskQueue.push(task);
    this.taskQueue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Process tasks in the queue
   */
  private async processTasks() {
    const now = new Date();
    const dueTasks = this.taskQueue.filter(t => t.scheduled_for <= now);

    for (const task of dueTasks) {
      try {
        // console.log(`🎯 Processing task: ${task.agent}:${task.action}`);

        // Execute the task
        await this.executeTask(task);

        // Remove from queue
        this.taskQueue = this.taskQueue.filter(t => t !== task);

        // Reschedule if recurring
        if (this.isRecurringTask(task)) {
          this.rescheduleTask(task);
        }
      } catch (error) {
        console.error(`Error processing task ${task.agent}:${task.action}:`, error);
        await this.handleTaskError(task, error);
      }
    }
  }

  /**
   * Execute a specific task
   */
  private async executeTask(task: ScheduledTask) {
    const startTime = Date.now();

    // Record task start
    await memoryService.store('agent_task', `${task.agent}:${task.action}`, {
      status: 'started',
      data: task.data,
      timestamp: new Date().toISOString()
    }, 0.5);

    // Execute based on task type
    let result: any = null;

    switch (`${task.agent}:${task.action}`) {
      case 'elena:generate_missing_estimates':
        result = await this.generateMissingEstimates(task.data);
        break;

      case 'isabella:score_customers':
        result = await this.scoreCustomers(task.data);
        break;

      case 'victoria:optimize_schedules':
        result = await this.optimizeSchedules(task.data);
        break;

      case 'marcus:check_overdue_invoices':
        result = await this.checkOverdueInvoices(task.data);
        break;

      case 'max:nurture_leads':
        result = await this.nurtureLeads(task.data);
        break;

      default:
        // Generic workflow processing
        result = await aiOrchestrator.callAgent(task.agent, task.action, task.data);
    }

    const duration = Date.now() - startTime;

    // Record task completion
    await memoryService.store('agent_task', `${task.agent}:${task.action}`, {
      status: 'completed',
      result: result,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    }, 0.6);

    // Learn from the execution
    await memoryService.learn({
      action: `execute_task:${task.agent}:${task.action}`,
      result: `Completed in ${duration}ms`,
      success: true,
      metadata: { task_data: task.data, result_summary: result }
    });
  }

  /**
   * Generate estimates for jobs without them
   */
  private async generateMissingEstimates(data: any) {
    const { batch_size = 50 } = data;

    // Get jobs without estimates
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, customer_id, description, square_footage')
      .is('estimate_id', null)
      .limit(batch_size);

    if (error || !jobs) return { error: error?.message || 'No jobs found' };

    let generated = 0;
    for (const job of jobs) {
      const result = await aiOrchestrator.processWorkflow('estimate_request', {
        job_id: job.id,
        customer_id: job.customer_id,
        service_type: job.description,
        square_footage: job.square_footage || 1500,
        urgency: 'normal'
      });

      if (result) generated++;
    }

    return {
      jobs_processed: jobs.length,
      estimates_generated: generated,
      success_rate: (generated / jobs.length) * 100
    };
  }

  /**
   * Score customers for opportunities
   */
  private async scoreCustomers(data: any) {
    const { segment = 'active' } = data;

    // Get customers to score
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, name, email, lifetime_value, last_contact')
      .eq('status', segment)
      .limit(20);

    if (error || !customers) return { error: error?.message || 'No customers found' };

    const scores: Array<{
      customer_id: string;
      score: number;
      churn_risk: number;
      recommendations: JsonValue;
    }> = [];
    for (const customer of customers) {
      const analysis = await aiOrchestrator.callAgent('isabella', 'analyze_customer', customer);
      const satisfactionScore = Number(
        analysis?.satisfaction_score ?? (analysis as Record<string, unknown>)?.score ?? 0
      );
      const churnRisk = Number(analysis?.churn_risk ?? 0);
      scores.push({
        customer_id: customer.id,
        score: Number.isFinite(satisfactionScore) ? satisfactionScore : 0,
        churn_risk: Number.isFinite(churnRisk) ? churnRisk : 0,
        recommendations: Array.isArray(analysis?.recommendations) ? analysis.recommendations : [],
      });
    }

    const totalScore = scores.reduce((sum, entry) => sum + entry.score, 0);
    const averageScore = scores.length > 0 ? totalScore / scores.length : 0;

    return {
      customers_scored: scores.length,
      average_score: averageScore,
      high_value_opportunities: scores.filter((entry) => entry.score > 80).length
    };
  }

  /**
   * Optimize schedules for efficiency
   */
  private async optimizeSchedules(data: any) {
    const { days_ahead = 7 } = data;

    // Get upcoming jobs
    const { data: jobs, error } = await supabase
      .from('schedule_events')
      .select('*')
      .gte('start_date', new Date().toISOString())
      .lte('start_date', new Date(Date.now() + days_ahead * 24 * 60 * 60 * 1000).toISOString());

    if (error || !jobs) return { error: error?.message || 'No scheduled jobs found' };

    // Group by location for route optimization
    const optimized = await aiOrchestrator.callAgent('victoria', 'optimize_routes', {
      jobs: jobs,
      constraints: {
        max_hours_per_day: 8,
        crew_availability: true
      }
    });

    return {
      jobs_optimized: jobs.length,
      estimated_savings_hours: optimized?.savings || 0,
      route_efficiency: optimized?.efficiency || 0
    };
  }

  /**
   * Check and follow up on overdue invoices
   */
  private async checkOverdueInvoices(data: any) {
    const { days_overdue = 3 } = data;

    // Get overdue invoices
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - days_overdue);

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('id, customer_id, amount_due, due_date')
      .eq('status', 'sent')
      .lte('due_date', overdueDate.toISOString())
      .limit(10);

    if (error || !invoices) return { error: error?.message || 'No overdue invoices' };

    let reminders_sent = 0;
    for (const invoice of invoices) {
      const result = await aiOrchestrator.processWorkflow('invoice_due', {
        invoice_id: invoice.id,
        customer_id: invoice.customer_id,
        amount_due: invoice.amount_due,
        days_overdue: Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))
      });

      if (result) reminders_sent++;
    }

    return {
      invoices_checked: invoices.length,
      reminders_sent: reminders_sent,
      total_amount_overdue: invoices.reduce((sum, inv) => sum + (inv.amount_due || 0), 0)
    };
  }

  /**
   * Nurture leads with personalized content
   */
  private async nurtureLeads(data: any) {
    const { batch_size = 20 } = data;

    // Get leads to nurture
    const { data: leads, error } = await supabase
      .from('customers')
      .select('id, name, email, lead_score')
      .eq('lifecycle_stage', 'lead')
      .order('lead_score', { ascending: false })
      .limit(batch_size);

    if (error || !leads) return { error: error?.message || 'No leads found' };

    let nurtured = 0;
    for (const lead of leads) {
      const result = await aiOrchestrator.processWorkflow('lead_captured', {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        source: 'database',
        interest: 'roofing_services'
      });

      if (result) nurtured++;
    }

    return {
      leads_processed: leads.length,
      nurture_campaigns_sent: nurtured,
      conversion_potential: leads.filter(l => l.lead_score > 70).length
    };
  }

  /**
   * Load pending tasks from memory
   */
  private async loadPendingTasks() {
    const tasks = await memoryService.recall('scheduled_task', 'status', 'pending', 100);
    for (const task of tasks) {
      if (task.content) {
        try {
          const taskData = JSON.parse(task.content);
          this.taskQueue.push(taskData);
        } catch (e) {
          console.error('Failed to parse task:', e);
        }
      }
    }
  }

  /**
   * Get next run time based on frequency
   */
  private getNextRunTime(frequency: string, hour?: number): Date {
    const now = new Date();
    const next = new Date();

    switch (frequency) {
      case 'hourly':
        next.setHours(next.getHours() + 1);
        next.setMinutes(0);
        next.setSeconds(0);
        break;

      case 'twice_daily':
        next.setHours(now.getHours() < 12 ? 12 : 24);
        next.setMinutes(0);
        next.setSeconds(0);
        break;

      case 'daily':
        next.setDate(next.getDate() + 1);
        next.setHours(hour || 0);
        next.setMinutes(0);
        next.setSeconds(0);
        break;

      default:
        next.setMinutes(next.getMinutes() + 5); // Default to 5 minutes
    }

    return next;
  }

  /**
   * Check if task is recurring
   */
  private isRecurringTask(task: ScheduledTask): boolean {
    const recurringActions = [
      'generate_missing_estimates',
      'score_customers',
      'optimize_schedules',
      'check_overdue_invoices',
      'nurture_leads'
    ];
    return recurringActions.includes(task.action);
  }

  /**
   * Reschedule a recurring task
   */
  private rescheduleTask(task: ScheduledTask) {
    const frequency = this.getTaskFrequency(task.action);
    const newTask = {
      ...task,
      scheduled_for: this.getNextRunTime(frequency)
    };
    this.scheduleTask(newTask);
  }

  /**
   * Get task frequency
   */
  private getTaskFrequency(action: string): string {
    const frequencies: Record<string, string> = {
      'generate_missing_estimates': 'daily',
      'score_customers': 'hourly',
      'optimize_schedules': 'daily',
      'check_overdue_invoices': 'twice_daily',
      'nurture_leads': 'hourly'
    };
    return frequencies[action] || 'hourly';
  }

  /**
   * Handle task errors
   */
  private async handleTaskError(task: ScheduledTask, error: any) {
    task.retry_count = (task.retry_count || 0) + 1;

    if (task.retry_count < 3) {
      // Retry with exponential backoff
      task.scheduled_for = new Date(Date.now() + Math.pow(2, task.retry_count) * 60000);
      this.scheduleTask(task);
    } else {
      // Log failure and alert
      await memoryService.store('task_failure', `${task.agent}:${task.action}`, {
        error: error.message || error,
        task_data: task.data,
        retry_count: task.retry_count
      }, 0.9);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      is_running: this.isRunning,
      queue_size: this.taskQueue.length,
      next_task: this.taskQueue[0],
      tasks_by_agent: this.taskQueue.reduce((acc, task) => {
        acc[task.agent] = (acc[task.agent] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }
}

export const agentScheduler = AgentScheduler.getInstance();
