/**
 * WEATHERCRAFT ERP - DEEP INTEGRATION ENGINE
 * The connective tissue that makes everything work as ONE SYSTEM
 *
 * This is the BRAIN of the ERP - deeply aware of:
 * - Weather impact on jobs (real-time forecasts → schedule changes)
 * - Daily labor tracking (timesheets → job costs → profitability)
 * - Change orders (auto-aggregation → invoice updates → financial tracking)
 * - Financial flow (estimates → invoices → payments → accounting)
 * - Calendar intelligence (job phases → weather constraints → crew availability)
 *
 * EVERYTHING IS CONNECTED. EVERYTHING IS AWARE.
 */

import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '@/lib/env';
import { aiOrchestrator } from './ai-orchestrator';
import { taskManagementEngine } from './task-management-engine';
import { memoryService } from './memory-service';
import type { JsonObject } from '@/types/json';

const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

export type JobContext = JsonObject & {
  job_id: string;
  customer_id: string;
  status: string;
  scheduled_date?: string | null;
  actual_start?: string | null;
  actual_end?: string | null;

  // Weather awareness
  weather_risk?: string | null;
  weather_delay_probability?: number | null;
  alternative_dates?: string[] | null;

  // Labor tracking
  total_labor_hours?: number | null;
  labor_cost_actual?: number | null;
  labor_cost_estimated?: number | null;
  labor_variance?: number | null;
  crew_members?: string[] | null;

  // Financial
  original_estimate?: number | null;
  change_orders_total?: number | null;
  current_total?: number | null;
  invoiced_amount?: number | null;
  payment_received?: number | null;
  profit_margin?: number | null;

  // Phase tracking
  current_phase?: string | null;
  phases_completed?: number | null;
  phases_total?: number | null;
  completion_percentage?: number | null;
};

export interface WeatherImpact {
  job_id: string;
  forecast_date: string;
  conditions: string;
  temperature: number;
  precipitation_chance: number;
  wind_speed: number;
  work_safe: boolean;
  recommended_action: 'proceed' | 'delay' | 'reschedule';
  alternative_window?: {
    start: string;
    end: string;
  };
}

export interface LaborEntry {
  id: string;
  job_id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  hours: number;
  rate: number;
  total_cost: number;
  phase: string;
  notes?: string;
  approved: boolean;
}

export interface ChangeOrder {
  id: string;
  job_id: string;
  change_number: number;
  description: string;
  amount: number;
  approved: boolean;
  approved_by?: string;
  approved_date?: string;
  created_date: string;
  reason: string;
  impact_on_schedule?: number; // days
  invoice_id?: string; // linked invoice
  documentation: string[];
}

class DeepIntegrationEngine {
  /**
   * JOB CONTEXT AWARENESS
   * Get complete 360° view of a job including all integrations
   */
  async getJobContext(jobId: string, tenantId: string): Promise<JobContext> {
    try {
      // 1. Get job base data
      const { data: job } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .eq('tenant_id', tenantId)
        .single();

      if (!job) throw new Error('Job not found');

      // 2. Get weather impact
      const weather = await this.getWeatherImpact(jobId, job.scheduled_date);

      // 3. Get labor data
      const labor = await this.getLaborSummary(jobId);

      // 4. Get financial data
      const financial = await this.getFinancialSummary(jobId);

      // 5. Get change orders
      const changeOrders = await this.getChangeOrders(jobId);

      // 6. Get phase tracking
      const phases = await this.getPhaseProgress(jobId);

      // Build complete context
      const context: JobContext = {
        job_id: jobId,
        customer_id: job.customer_id,
        status: job.status,
        scheduled_date: job.scheduled_date,
        actual_start: job.actual_start,
        actual_end: job.actual_end,

        // Weather
        weather_risk: weather?.recommended_action === 'delay' ? 'high' : 'low',
        weather_delay_probability: weather?.precipitation_chance || 0,
        alternative_dates: weather?.alternative_window ? [weather.alternative_window.start] : [],

        // Labor
        total_labor_hours: labor.total_hours,
        labor_cost_actual: labor.actual_cost,
        labor_cost_estimated: labor.estimated_cost,
        labor_variance: labor.variance,
        crew_members: labor.crew_members,

        // Financial
        original_estimate: financial.original_amount,
        change_orders_total: changeOrders.reduce((sum, co) => sum + co.amount, 0),
        current_total: financial.current_total,
        invoiced_amount: financial.invoiced,
        payment_received: financial.paid,
        profit_margin: financial.profit_margin,

        // Phases
        current_phase: phases.current_phase,
        phases_completed: phases.completed,
        phases_total: phases.total,
        completion_percentage: phases.completion_percentage,
      };

      // Store in memory for AI agents
      await memoryService.store(
        'job_context',
        `Complete context for job ${jobId}`,
        context,
        0.9
      );

      return context;

    } catch (error) {
      console.error('Failed to get job context:', error);
      throw error;
    }
  }

  /**
   * WEATHER-CALENDAR INTEGRATION
   * Real-time weather impact on scheduling
   */
  async getWeatherImpact(jobId: string, scheduledDate: string): Promise<WeatherImpact | null> {
    try {
      // Get job location
      const { data: job } = await supabase
        .from('jobs')
        .select('property_address, job_type, tenant_id')
        .eq('id', jobId)
        .single();

      if (!job) return null;

      // Check weather forecast
      const { data: forecast } = await supabase
        .from('weather_forecast')
        .select('*')
        .eq('date', scheduledDate)
        .limit(1)
        .single();

      if (!forecast) {
        // No forecast data, assume safe
        return {
          job_id: jobId,
          forecast_date: scheduledDate,
          conditions: 'unknown',
          temperature: 70,
          precipitation_chance: 0,
          wind_speed: 5,
          work_safe: true,
          recommended_action: 'proceed',
        };
      }

      // Analyze work safety based on job type and conditions
      const workSafe = this.analyzeWorkSafety(job.job_type, forecast);
      const recommendedAction = workSafe ? 'proceed' :
                                forecast.precipitation_chance > 70 ? 'reschedule' : 'delay';

      // Find alternative window if needed
      let alternativeWindow;
      if (!workSafe) {
        alternativeWindow = await this.findAlternativeWeatherWindow(scheduledDate);
      }

      const impact: WeatherImpact = {
        job_id: jobId,
        forecast_date: scheduledDate,
        conditions: forecast.conditions,
        temperature: forecast.temperature,
        precipitation_chance: forecast.precipitation_chance,
        wind_speed: forecast.wind_speed,
        work_safe: workSafe,
        recommended_action: recommendedAction,
        alternative_window: alternativeWindow,
      };

      // If weather is bad, auto-create task
      if (!workSafe) {
        if (job.tenant_id) {
          await taskManagementEngine.createTask({
          title: `Weather Alert: Reschedule job ${jobId}`,
          description: `Weather conditions unsafe for work on ${scheduledDate}.\n` +
                      `Conditions: ${forecast.conditions}\n` +
                      `Precipitation: ${forecast.precipitation_chance}%\n` +
                      `Recommended action: ${recommendedAction}\n` +
                      `Alternative date: ${alternativeWindow?.start ?? 'Not yet scheduled'}`,
          priority: 'high',
          status: 'pending',
          category: 'Scheduling',
          relatedEntityType: 'job',
          relatedEntityId: jobId,
          dueDate: new Date().toISOString(),
          aiGenerated: true,
          aiAgentName: 'victoria',
          tenantId: job.tenant_id,
        });
        } else {
          console.warn('Job missing tenant_id; skipping weather alert task');
        }
      }

      return impact;

    } catch (error) {
      console.error('Failed to get weather impact:', error);
      return null;
    }
  }

  /**
   * DAILY LABOR TRACKING
   * Real-time labor cost tracking with variance analysis
   */
  async recordDailyLabor(entry: Omit<LaborEntry, 'id' | 'total_cost'>): Promise<LaborEntry> {
    try {
      const totalCost = entry.hours * entry.rate;

      // Insert labor entry (using actual database column names)
      const { data, error } = await supabase
        .from('job_labor_entries')
        .insert([{
          job_id: entry.job_id,
          employee_id: entry.employee_id,
          work_date: entry.date,
          hours_worked: entry.hours,
          hourly_rate: entry.rate,
          total_cost: totalCost,
          notes: entry.notes,
        }])
        .select()
        .single();

      if (error) throw error;

      // Update job cost tracking in real-time
      await this.updateJobCosts(entry.job_id);

      // Check for cost overruns (requires tenant context)
      const { data: jobTenant } = await supabase
        .from('jobs')
        .select('tenant_id')
        .eq('id', entry.job_id)
        .single();

      const jobTenantId = jobTenant?.tenant_id;
      if (jobTenantId) {
        const context = await this.getJobContext(entry.job_id, jobTenantId);
        if (context.labor_variance && context.labor_variance > 0.15) {
          // 15% over budget - create alert
          await taskManagementEngine.createTask({
            title: `Labor Cost Alert: Job ${entry.job_id} over budget`,
            description: `Labor costs are ${Math.round(context.labor_variance * 100)}% over estimate.\n` +
                        `Estimated: $${context.labor_cost_estimated}\n` +
                        `Actual: $${context.labor_cost_actual}\n` +
                        `Variance: $${context.labor_cost_actual! - context.labor_cost_estimated!}`,
            priority: context.labor_variance > 0.25 ? 'critical' : 'high',
            status: 'pending',
            category: 'Cost Control',
            relatedEntityType: 'job',
            relatedEntityId: entry.job_id,
            dueDate: new Date().toISOString(),
            aiGenerated: true,
            aiAgentName: 'marcus',
            tenantId: jobTenantId,
          });
        }
      } else {
        console.warn('Job tenant_id unavailable; skipping labor variance alert');
      }

      return {
        id: data.id,
        ...entry,
        total_cost: totalCost,
      };

    } catch (error) {
      console.error('Failed to record daily labor:', error);
      throw error;
    }
  }

  /**
   * CHANGE ORDER MANAGEMENT
   * Auto-aggregation and financial integration
   */
  async createChangeOrder(
    jobId: string,
    description: string,
    amount: number,
    reason: string,
    documentation: string[],
    tenantId: string
  ): Promise<ChangeOrder> {
    try {
      // Get existing change orders count
      const { count } = await supabase
        .from('change_orders')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', jobId);

      const changeNumber = (count || 0) + 1;

      // Create change order (using actual database column names)
      const { data, error } = await supabase
        .from('change_orders')
        .insert([{
          job_id: jobId,
          change_order_number: `CO-${String(changeNumber).padStart(4, '0')}`,
          description,
          amount,
          reason,
          status: 'pending',
        }])
        .select()
        .single();

      if (error) throw error;

      // Auto-update job total
      await this.updateJobTotal(jobId);

      // Create approval task
      await taskManagementEngine.createTask({
        title: `Approve Change Order #${changeNumber} - $${amount}`,
        description: `Change Order Details:\n` +
                    `Job: ${jobId}\n` +
                    `Amount: $${amount}\n` +
                    `Reason: ${reason}\n` +
                    `Description: ${description}\n` +
                    `Documentation: ${documentation.length} files`,
        priority: amount > 5000 ? 'high' : 'medium',
        status: 'pending',
        category: 'Change Orders',
        relatedEntityType: 'change_order',
        relatedEntityId: data.id,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        aiGenerated: false,
        tenantId,
      });

      // Log to memory
      await memoryService.store(
        'change_order_created',
        `Change order #${changeNumber} for job ${jobId}: $${amount}`,
        { job_id: jobId, amount, reason },
        0.8
      );

      return {
        id: data.id,
        job_id: jobId,
        change_number: changeNumber,
        description,
        amount,
        approved: false,
        created_date: data.created_at,
        reason,
        documentation,
      };

    } catch (error) {
      console.error('Failed to create change order:', error);
      throw error;
    }
  }

  /**
   * FINANCIAL INTEGRATION
   * Deep connection between estimates, jobs, invoices, payments
   */
  async synchronizeFinancials(jobId: string): Promise<void> {
    try {
      // 1. Get all change orders
      const changeOrders = await this.getChangeOrders(jobId);
      const approvedChangeOrders = changeOrders.filter(co => co.approved);
      const changeOrderTotal = approvedChangeOrders.reduce((sum, co) => sum + co.amount, 0);

      // 2. Get original estimate
      const { data: estimate } = await supabase
        .from('estimates')
        .select('total_amount')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const originalAmount = estimate?.total_amount || 0;
      const currentTotal = originalAmount + changeOrderTotal;

      // 3. Update or create invoice
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('*')
        .eq('job_id', jobId)
        .limit(1)
        .single();

      if (existingInvoice) {
        // Update existing invoice
        await supabase
          .from('invoices')
          .update({
            total_amount: currentTotal,
            change_order_amount: changeOrderTotal,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingInvoice.id);
      } else {
        // Create new invoice
        await supabase
          .from('invoices')
          .insert([{
            job_id: jobId,
            total_amount: currentTotal,
            change_order_amount: changeOrderTotal,
            original_amount: originalAmount,
            status: 'draft',
            created_at: new Date().toISOString(),
          }]);
      }

      // 4. Update job financial totals
      await supabase
        .from('jobs')
        .update({
          current_total: currentTotal,
          change_orders_total: changeOrderTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      // 5. Log synchronization
      await memoryService.store(
        'financial_sync',
        `Synchronized financials for job ${jobId}`,
        {
          job_id: jobId,
          original_amount: originalAmount,
          change_orders: changeOrderTotal,
          current_total: currentTotal,
        },
        0.7
      );

    } catch (error) {
      console.error('Failed to synchronize financials:', error);
      throw error;
    }
  }

  /**
   * Helper: Analyze work safety based on weather
   */
  private analyzeWorkSafety(jobType: string, forecast: any): boolean {
    // Roofing work safety rules
    if (jobType.toLowerCase().includes('roof')) {
      if (forecast.precipitation_chance > 50) return false;
      if (forecast.wind_speed > 25) return false;
      if (forecast.temperature < 40 || forecast.temperature > 95) return false;
    }

    // Exterior work safety rules
    if (jobType.toLowerCase().includes('exterior') || jobType.toLowerCase().includes('siding')) {
      if (forecast.precipitation_chance > 70) return false;
      if (forecast.wind_speed > 30) return false;
    }

    return true;
  }

  /**
   * Helper: Find alternative weather window
   */
  private async findAlternativeWeatherWindow(originalDate: string): Promise<{ start: string; end: string } | undefined> {
    try {
      // Look 14 days ahead
      const endDate = new Date(new Date(originalDate).getTime() + 14 * 24 * 60 * 60 * 1000);

      const { data: forecasts } = await supabase
        .from('weather_forecast')
        .select('*')
        .gte('date', originalDate)
        .lte('date', endDate.toISOString())
        .order('date');

      if (!forecasts) return undefined;

      // Find first good weather day
      const goodDay = forecasts.find(f =>
        f.precipitation_chance < 30 &&
        f.wind_speed < 20 &&
        f.temperature > 45 &&
        f.temperature < 90
      );

      if (goodDay) {
        return {
          start: goodDay.date,
          end: goodDay.date,
        };
      }

      return undefined;

    } catch (error) {
      console.error('Failed to find alternative weather window:', error);
      return undefined;
    }
  }

  /**
   * Helper: Get labor summary
   */
  private async getLaborSummary(jobId: string) {
    const { data: entries } = await supabase
      .from('job_labor_entries')
      .select('*')
      .eq('job_id', jobId);

    const totalHours = entries?.reduce((sum, e) => sum + (e.hours_worked || 0), 0) || 0;
    const actualCost = entries?.reduce((sum, e) => sum + (e.total_cost || 0), 0) || 0;

    // Get estimated labor cost
    const { data: estimate } = await supabase
      .from('estimation_labor')
      .select('total_cost')
      .eq('job_id', jobId)
      .single();

    const estimatedCost = estimate?.total_cost || 0;
    const variance = estimatedCost > 0 ? (actualCost - estimatedCost) / estimatedCost : 0;

    const crewMembers = [...new Set(entries?.map(e => e.employee_id) || [])];

    return {
      total_hours: totalHours,
      actual_cost: actualCost,
      estimated_cost: estimatedCost,
      variance,
      crew_members: crewMembers,
    };
  }

  /**
   * Helper: Get financial summary
   */
  private async getFinancialSummary(jobId: string) {
    const { data: job } = await supabase
      .from('jobs')
      .select('current_total, change_orders_total')
      .eq('id', jobId)
      .single();

    const { data: invoice } = await supabase
      .from('invoices')
      .select('total_amount, amount_paid')
      .eq('job_id', jobId)
      .limit(1)
      .single();

    const { data: estimate } = await supabase
      .from('estimates')
      .select('total_amount')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const originalAmount = estimate?.total_amount || 0;
    const currentTotal = job?.current_total || originalAmount;
    const invoiced = invoice?.total_amount || 0;
    const paid = invoice?.amount_paid || 0;

    // Calculate profit margin
    const labor = await this.getLaborSummary(jobId);
    const { data: materials } = await supabase
      .from('job_material_usage')
      .select('total_cost')
      .eq('job_id', jobId);

    const materialCost = materials?.reduce((sum, m) => sum + (m.total_cost || 0), 0) || 0;
    const totalCost = labor.actual_cost + materialCost;
    const profitMargin = currentTotal > 0 ? (currentTotal - totalCost) / currentTotal : 0;

    return {
      original_amount: originalAmount,
      current_total: currentTotal,
      invoiced,
      paid,
      profit_margin: profitMargin,
    };
  }

  /**
   * Helper: Get change orders
   */
  private async getChangeOrders(jobId: string): Promise<ChangeOrder[]> {
    const { data } = await supabase
      .from('change_orders')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at');

    if (!data) return [];

    // Map database columns to our interface
    return data.map(co => ({
      id: co.id,
      job_id: co.job_id,
      change_number: parseInt(co.change_order_number?.replace('CO-', '') || '0'),
      description: co.description || '',
      amount: co.amount || 0,
      approved: co.status === 'approved',
      approved_by: co.approved_by,
      approved_date: co.approved_at,
      created_date: co.created_at,
      reason: co.reason || '',
      impact_on_schedule: co.impact_days,
      documentation: [],
    }));
  }

  /**
   * Helper: Get phase progress
   */
  private async getPhaseProgress(jobId: string) {
    const { data: phases } = await supabase
      .from('job_phases')
      .select('*')
      .eq('job_id', jobId)
      .order('sequence');

    const total = phases?.length || 0;
    const completed = phases?.filter(p => p.status === 'completed').length || 0;
    const current = phases?.find(p => p.status === 'in_progress')?.name || 'Not started';
    const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      current_phase: current,
      completion_percentage: completionPercentage,
    };
  }

  /**
   * Helper: Update job costs
   */
  private async updateJobCosts(jobId: string) {
    const labor = await this.getLaborSummary(jobId);
    const { data: materials } = await supabase
      .from('job_material_usage')
      .select('total_cost')
      .eq('job_id', jobId);

    const materialCost = materials?.reduce((sum, m) => sum + (m.total_cost || 0), 0) || 0;
    const totalCost = labor.actual_cost + materialCost;

    await supabase
      .from('job_costs')
      .upsert({
        job_id: jobId,
        labor_cost: labor.actual_cost,
        material_cost: materialCost,
        total_cost: totalCost,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'job_id'
      });
  }

  /**
   * Helper: Update job total
   */
  private async updateJobTotal(jobId: string) {
    await this.synchronizeFinancials(jobId);
  }
}

// Export singleton
export const deepIntegrationEngine = new DeepIntegrationEngine();
