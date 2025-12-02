/**
 * Global Context Service
 * Provides system-wide awareness to all operations
 *
 * This service makes EVERY operation aware of the ENTIRE system state,
 * enabling intelligent decision-making based on complete context.
 */

import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '@/lib/env';
import { BRAINOPS_BACKEND_URL, BRAINOPS_AI_AGENTS_URL } from '@/lib/brainops/env';

export interface SystemContext {
  // Real-time operational state
  activeJobs: any[];
  scheduledJobs: any[];
  pendingEstimates: any[];
  overdueInvoices: any[];

  // Resource availability
  availableCrews: any[];
  materialInventory: any[];
  equipmentAvailability: any[];

  // Business metrics
  revenueToday: number;
  revenueMTD: number;
  revenueYTD: number;
  jobBacklog: number;
  operations?: {
    efficiency: number | null;
    crewUtilization: number | null;
    avgJobTimeHours: number | null;
    dataWindow: string;
  };

  // System health
  systemHealth: {
    frontend: boolean;
    backend: boolean;
    database: boolean;
    aiAgents: boolean;
    backendLatencyMs?: number | null;
    aiLatencyMs?: number | null;
  };

  timestamp: Date;
}

export class GlobalContextService {
  private supabase: ReturnType<typeof createClient>;
  private cache: SystemContext | null = null;
  private cacheExpiry: number = 60000; // 1 minute cache
  private lastFetch: number = 0;

  constructor() {
    this.supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
  }

  /**
   * Get complete system context with caching
   */
  async getFullSystemContext(tenantId: string): Promise<SystemContext> {
    const now = Date.now();

    // Return cached context if still valid
    if (this.cache && (now - this.lastFetch) < this.cacheExpiry) {
      return this.cache;
    }

    // Fetch fresh context
    const context = await this.fetchSystemContext(tenantId);

    // Update cache
    this.cache = context;
    this.lastFetch = now;

    return context;
  }

  /**
   * Fetch fresh system context from database
   */
  private async fetchSystemContext(tenantId: string): Promise<SystemContext> {
    const [
      activeJobs,
      scheduledJobs,
      pendingEstimates,
      overdueInvoices,
      availableCrews,
      materialInventory,
      equipmentAvailability,
      metrics
    ] = await Promise.all([
      this.getActiveJobs(tenantId),
      this.getScheduledJobs(tenantId),
      this.getPendingEstimates(tenantId),
      this.getOverdueInvoices(tenantId),
      this.getAvailableCrews(tenantId),
      this.getMaterialInventory(tenantId),
      this.getEquipmentAvailability(tenantId),
      this.getBusinessMetrics(tenantId)
    ]);

    return {
      activeJobs,
      scheduledJobs,
      pendingEstimates,
      overdueInvoices,
      availableCrews,
      materialInventory,
      equipmentAvailability,
      ...metrics,
      systemHealth: await this.checkSystemHealth(),
      timestamp: new Date()
    };
  }

  /**
   * Get active jobs
   */
  private async getActiveJobs(tenantId: string) {
    const { data, error } = await this.supabase
      .from('jobs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'in_progress')
      .order('scheduled_start', { ascending: true });

    if (error) {
      console.error('Error fetching active jobs:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get scheduled jobs
   */
  private async getScheduledJobs(tenantId: string) {
    const { data, error } = await this.supabase
      .from('jobs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'scheduled')
      .order('scheduled_start', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Error fetching scheduled jobs:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get pending estimates
   */
  private async getPendingEstimates(tenantId: string) {
    const { data, error } = await this.supabase
      .from('estimates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching pending estimates:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get overdue invoices
   */
  private async getOverdueInvoices(tenantId: string) {
    const { data, error } = await this.supabase
      .from('invoices')
      .select('*')
      .eq('tenant_id', tenantId)
      .neq('status', 'paid')
      .lt('due_date', new Date().toISOString())
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching overdue invoices:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get available crews (employees not currently assigned)
   */
  private async getAvailableCrews(tenantId: string) {
    const { data, error } = await this.supabase
      .from('employees')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error fetching available crews:', error);
      return [];
    }

    return data || [];
  }

  private async getMaterialInventory(tenantId: string) {
    try {
      const { data, error } = await this.supabase
        .from('inventory_items')
        .select('id, name, sku, quantity_on_hand, reorder_point, unit_cost, category, last_used, updated_at')
        .eq('tenant_id', tenantId)
        .order('quantity_on_hand', { ascending: true })
        .limit(25);

      if (error) {
        console.error('Error fetching material inventory:', error);
        return [];
      }

      return (data || []).map((item: any) => {
        const quantity = Number(item.quantity_on_hand ?? 0);
        const reorderPoint = item.reorder_point !== null ? Number(item.reorder_point) : null;
        return {
          id: item.id,
          name: item.name,
          sku: item.sku,
          category: item.category,
          quantityOnHand: quantity,
          reorderPoint,
          unitCost: item.unit_cost !== null ? Number(item.unit_cost) : null,
          needsReorder: reorderPoint !== null ? quantity <= reorderPoint : false,
          lastUsedAt: item.last_used,
          updatedAt: item.updated_at
        };
      });
    } catch (error) {
      console.error('Error fetching material inventory:', error);
      return [];
    }
  }

  private async getEquipmentAvailability(tenantId: string) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [{ data: equipment, error }, { data: usageData }] = await Promise.all([
        this.supabase
          .from('equipment')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('status', { ascending: true })
          .limit(25),
        this.supabase
          .from('equipment_usage')
          .select('equipment_id, usage_hours')
          .eq('tenant_id', tenantId)
          .gte('date', thirtyDaysAgo)
      ]);

      if (error) {
        console.error('Error fetching equipment availability:', error);
        return [];
      }

      const usageByEquipment = new Map<string, number>();
      (usageData || []).forEach((entry: any) => {
        if (entry.equipment_id) {
          const current = usageByEquipment.get(entry.equipment_id) ?? 0;
          usageByEquipment.set(entry.equipment_id, current + Number(entry.usage_hours ?? 0));
        }
      });

      return (equipment || []).map((item: any) => {
        const status = (item.status || 'unknown').toLowerCase();
        const utilization = item.utilization_rate !== null && item.utilization_rate !== undefined
          ? Number(item.utilization_rate)
          : null;

        return {
          id: item.id,
          name: item.name || item.asset_name,
          status,
          isAvailable: !['in_use', 'maintenance', 'reserved'].includes(status),
          nextAvailableAt: item.available_from || item.next_available_date || null,
          location: item.location || item.current_location || null,
          lastServiceDate: item.last_service_date || item.last_maintenance_date || null,
          utilizationRate: utilization !== null ? Math.round(utilization * 100) / 100 : null,
          usageHoursLast30Days: Math.round((usageByEquipment.get(item.id) ?? 0) * 10) / 10
        };
      });
    } catch (error) {
      console.error('Error fetching equipment availability:', error);
      return [];
    }
  }

  /**
   * Calculate business metrics
   */
  private async getBusinessMetrics(tenantId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [revenueToday, revenueMTD, revenueYTD, jobBacklog, operations] = await Promise.all([
      this.calculateRevenue(tenantId, today),
      this.calculateRevenue(tenantId, monthStart),
      this.calculateRevenue(tenantId, yearStart),
      this.calculateJobBacklog(tenantId),
      this.calculateOperationsMetrics(tenantId)
    ]);

    return {
      revenueToday,
      revenueMTD,
      revenueYTD,
      jobBacklog,
      operations
    };
  }

  /**
   * Calculate revenue from date
   */
  private async calculateRevenue(tenantId: string, fromDate: Date): Promise<number> {
    const { data, error } = await this.supabase
      .from('invoices')
      .select('total_amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'paid')
      .gte('paid_date', fromDate.toISOString());

    if (error || !data) {
      return 0;
    }

    return (data as Array<{total_amount: number}>).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  }

  /**
   * Calculate job backlog (scheduled but not started)
   */
  private async calculateJobBacklog(tenantId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['scheduled', 'pending']);

    if (error) {
      return 0;
    }

    return count || 0;
  }

  private async calculateOperationsMetrics(tenantId: string) {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        { data: completedJobs },
        { data: timesheetEntries },
        { data: crews }
      ] = await Promise.all([
        this.supabase
          .from('jobs')
          .select('estimated_hours, actual_hours, completed_date')
          .eq('tenant_id', tenantId)
          .eq('status', 'completed')
          .gte('completed_date', thirtyDaysAgo.toISOString()),
        this.supabase
          .from('timesheet_entries')
          .select('hours, created_at, status')
          .eq('tenant_id', tenantId)
          .gte('created_at', sevenDaysAgo.toISOString()),
        this.supabase
          .from('crews')
          .select('id, status, capacity_hours, default_shift_hours')
          .eq('tenant_id', tenantId)
      ]);

      let efficiency: number | null = null;
      let avgJobTimeHours: number | null = null;

      if (completedJobs && completedJobs.length > 0) {
        const totals = completedJobs.reduce(
          (acc: { estimated: number; actual: number; count: number }, job: any) => {
            const estimated = Number(job.estimated_hours ?? 0);
            const actual = Number(job.actual_hours ?? estimated);
            if (actual > 0) {
              acc.estimated += estimated;
              acc.actual += actual;
              acc.count += 1;
            }
            return acc;
          },
          { estimated: 0, actual: 0, count: 0 }
        );

        if (totals.actual > 0) {
          efficiency = Math.max(0, Math.min(150, Math.round((totals.estimated / totals.actual) * 100)));
          avgJobTimeHours = Math.round((totals.actual / totals.count) * 10) / 10;
        }
      }

      const activeCrews = (crews || []).filter((crew: any) => {
        const status = (crew.status || '').toLowerCase();
        return status !== 'inactive' && status !== 'offline';
      });

      const totalCapacityHours = activeCrews.reduce((sum: number, crew: any) => {
        if (crew.capacity_hours !== null && crew.capacity_hours !== undefined) {
          return sum + Number(crew.capacity_hours);
        }
        if (crew.default_shift_hours !== null && crew.default_shift_hours !== undefined) {
          return sum + Number(crew.default_shift_hours);
        }
        return sum + 40; // Assume standard 40 hours per week if not specified
      }, 0);

      const approvedHours = (timesheetEntries || [])
        .filter((entry: any) => (entry.status || '').toLowerCase() === 'approved')
        .reduce((sum: number, entry: any) => sum + Number(entry.hours ?? 0), 0);

      let crewUtilization: number | null = null;
      if (totalCapacityHours > 0) {
        crewUtilization = Math.max(
          0,
          Math.min(150, Math.round((approvedHours / totalCapacityHours) * 100))
        );
      }

      return {
        efficiency,
        crewUtilization,
        avgJobTimeHours,
        dataWindow: 'last_30_days'
      };
    } catch (error) {
      console.error('Failed to calculate operations metrics:', error);
      return {
        efficiency: null,
        crewUtilization: null,
        avgJobTimeHours: null,
        dataWindow: 'last_30_days'
      };
    }
  }

  /**
   * Check system health
   */
  private async checkSystemHealth() {
    try {
      // Check database connectivity
      const { error: dbError } = await this.supabase
        .from('customers')
        .select('id')
        .limit(1);

      const [backendStatus, aiStatus] = await Promise.all([
        this.pingEndpoint(`${BRAINOPS_BACKEND_URL}/health`),
        this.pingEndpoint(`${BRAINOPS_AI_AGENTS_URL}/health`),
      ]);

      return {
        frontend: true, // If this code is running, frontend is up
        backend: backendStatus.ok,
        database: !dbError,
        aiAgents: aiStatus.ok,
        backendLatencyMs: backendStatus.latency,
        aiLatencyMs: aiStatus.latency
      };
    } catch (error) {
      return {
        frontend: true,
        backend: false,
        database: false,
        aiAgents: false
      };
    }
  }

  private async pingEndpoint(url: string): Promise<{ ok: boolean; latency: number | null }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const start = Date.now();

    try {
      const response = await fetch(url, { signal: controller.signal });
      const latency = Date.now() - start;
      return { ok: response.ok, latency };
    } catch (error) {
      console.warn(`Health check failed for ${url}:`, error);
      return { ok: false, latency: null };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Invalidate cache to force refresh
   */
  invalidateCache() {
    this.cache = null;
    this.lastFetch = 0;
  }
}

// Singleton instance
export const globalContextService = new GlobalContextService();
