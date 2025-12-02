/**
 * WEATHERCRAFT ERP - SYSTEM MONITORING AGENT
 * AI-powered real-time system awareness and operational tracking
 *
 * This agent continuously monitors:
 * - All system components (frontend, backend, database, AI agents)
 * - Operational status across all modules
 * - Database relationship integrity
 * - AI agent activity and performance
 * - Task and reminder system health
 * - Calendar system operations
 *
 * Integrates with:
 * - Memory System (records all findings)
 * - AI Orchestrator (triggers responses to issues)
 * - Relationship-Aware API (tracks entity changes)
 */

import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '@/lib/env';
import { memoryService } from './memory-service';
import { BRAINOPS_BACKEND_URL, BRAINOPS_AI_AGENTS_URL } from '@/lib/brainops/env';

// Initialize Supabase client
const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

// Production URLs
const PROD_URLS = {
  frontend: 'https://weathercraft-erp.vercel.app',
  backend: BRAINOPS_BACKEND_URL,
  aiAgents: BRAINOPS_AI_AGENTS_URL,
};

interface SystemHealthCheck {
  component: string;
  status: 'operational' | 'degraded' | 'failed' | 'maintenance';
  healthScore: number;
  responseTimeMs: number;
  errorCount: number;
  details: any;
}

interface OperationalStatus {
  operationType: string;
  operationName: string;
  status: 'started' | 'completed' | 'failed' | 'timeout';
  entityType?: string;
  entityId?: string;
  durationMs?: number;
  errorMessage?: string;
  metadata?: any;
}

interface RelationshipIntegrityCheck {
  checkType: string;
  parentTable: string;
  childTable: string;
  constraintName?: string;
  orphanedCount: number;
  integrityScore: number;
  issuesFound?: any[];
  autoFixed?: boolean;
  fixDetails?: any;
}

export class SystemMonitorAgent {
  private isRunning: boolean = false;
  private checkInterval: number = 60000; // 1 minute
  private lastCheckTimestamp: Date | null = null;

  constructor() {
    console.log('🤖 System Monitor Agent initialized');
  }

  /**
   * Start continuous monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Monitoring already running');
      return;
    }

    this.isRunning = true;
    console.log('✅ System monitoring started');

    // Record to memory
    await memoryService.store(
      'agent_action',
      'System Monitor Agent started continuous monitoring',
      { agent: 'system_monitor', action: 'start' },
      0.8
    );

    // Run initial check immediately
    await this.runFullSystemCheck();

    // Schedule recurring checks
    setInterval(async () => {
      if (this.isRunning) {
        await this.runFullSystemCheck();
      }
    }, this.checkInterval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.isRunning = false;
    console.log('⏸️ System monitoring stopped');
  }

  /**
   * Run comprehensive system check
   */
  async runFullSystemCheck(): Promise<void> {
    const startTime = Date.now();
    console.log('\n🔍 Running full system check...');

    try {
      // Check all system components
      const frontendHealth = await this.checkFrontend();
      const backendHealth = await this.checkBackend();
      const aiAgentsHealth = await this.checkAIAgents();
      const databaseHealth = await this.checkDatabase();
      const memorySystemHealth = await this.checkMemorySystem();

      // Check relationship integrity
      const integrityChecks = await this.checkRelationshipIntegrity();

      // Calculate overall system health
      const overallHealth = await this.calculateOverallHealth([
        frontendHealth,
        backendHealth,
        aiAgentsHealth,
        databaseHealth,
        memorySystemHealth,
      ]);

      // Record to operational log
      await this.recordOperationalStatus({
        operationType: 'system_check',
        operationName: 'full_system_check',
        status: 'completed',
        durationMs: Date.now() - startTime,
        metadata: {
          overallHealth,
          componentChecks: 5,
          integrityChecks: integrityChecks.length,
          timestamp: new Date().toISOString(),
        },
      });

      // Record to memory for AI learning
      await memoryService.store(
        'agent_task',
        `System check completed: ${overallHealth.healthScore}/100 health score`,
        {
          agent: 'system_monitor',
          overallHealth,
          integrityChecks: integrityChecks.length,
          duration_ms: Date.now() - startTime,
        },
        0.7
      );

      this.lastCheckTimestamp = new Date();
      console.log(`✅ System check completed in ${Date.now() - startTime}ms`);
      console.log(`📊 Overall Health Score: ${overallHealth.healthScore}/100\n`);

    } catch (error) {
      console.error('❌ System check failed:', error);
      await this.recordOperationalStatus({
        operationType: 'system_check',
        operationName: 'full_system_check',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime,
      });
    }
  }

  /**
   * Check frontend availability and performance
   */
  private async checkFrontend(): Promise<SystemHealthCheck> {
    const startTime = Date.now();

    try {
      const response = await fetch(PROD_URLS.frontend, { method: 'HEAD' });
      const responseTime = Date.now() - startTime;
      const isHealthy = response.status === 200;

      const healthCheck: SystemHealthCheck = {
        component: 'frontend',
        status: isHealthy ? 'operational' : 'degraded',
        healthScore: isHealthy ? 100 : 50,
        responseTimeMs: responseTime,
        errorCount: isHealthy ? 0 : 1,
        details: {
          status_code: response.status,
          url: PROD_URLS.frontend,
        },
      };

      await this.recordSystemHealth(healthCheck);
      return healthCheck;

    } catch (error) {
      const healthCheck: SystemHealthCheck = {
        component: 'frontend',
        status: 'failed',
        healthScore: 0,
        responseTimeMs: Date.now() - startTime,
        errorCount: 1,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };

      await this.recordSystemHealth(healthCheck);
      return healthCheck;
    }
  }

  /**
   * Check backend API health
   */
  private async checkBackend(): Promise<SystemHealthCheck> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${PROD_URLS.backend}/health`);
      const responseTime = Date.now() - startTime;
      const data = await response.json();
      const isHealthy = data.status === 'healthy';

      const healthCheck: SystemHealthCheck = {
        component: 'backend',
        status: isHealthy ? 'operational' : 'degraded',
        healthScore: isHealthy ? 100 : 50,
        responseTimeMs: responseTime,
        errorCount: isHealthy ? 0 : 1,
        details: {
          version: data.version,
          status: data.status,
        },
      };

      await this.recordSystemHealth(healthCheck);
      return healthCheck;

    } catch (error) {
      const healthCheck: SystemHealthCheck = {
        component: 'backend',
        status: 'failed',
        healthScore: 0,
        responseTimeMs: Date.now() - startTime,
        errorCount: 1,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };

      await this.recordSystemHealth(healthCheck);
      return healthCheck;
    }
  }

  /**
   * Check AI agents service
   */
  private async checkAIAgents(): Promise<SystemHealthCheck> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${PROD_URLS.aiAgents}/agents`);
      const responseTime = Date.now() - startTime;
      const data = await response.json();
      const agentCount = data.count || 0;
      const isHealthy = agentCount > 0;

      const healthCheck: SystemHealthCheck = {
        component: 'ai_agents',
        status: isHealthy ? 'operational' : 'degraded',
        healthScore: isHealthy ? 100 : 30,
        responseTimeMs: responseTime,
        errorCount: isHealthy ? 0 : 1,
        details: {
          agent_count: agentCount,
          agents: data.agents || [],
        },
      };

      await this.recordSystemHealth(healthCheck);
      return healthCheck;

    } catch (error) {
      const healthCheck: SystemHealthCheck = {
        component: 'ai_agents',
        status: 'failed',
        healthScore: 0,
        responseTimeMs: Date.now() - startTime,
        errorCount: 1,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };

      await this.recordSystemHealth(healthCheck);
      return healthCheck;
    }
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabase(): Promise<SystemHealthCheck> {
    const startTime = Date.now();

    try {
      // Test query - count customers
      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      const responseTime = Date.now() - startTime;
      const isHealthy = !error && count !== null;

      const healthCheck: SystemHealthCheck = {
        component: 'database',
        status: isHealthy ? 'operational' : 'degraded',
        healthScore: isHealthy ? 100 : 0,
        responseTimeMs: responseTime,
        errorCount: isHealthy ? 0 : 1,
        details: {
          customer_count: count,
          connection: 'supabase',
          error: error?.message,
        },
      };

      await this.recordSystemHealth(healthCheck);
      return healthCheck;

    } catch (error) {
      const healthCheck: SystemHealthCheck = {
        component: 'database',
        status: 'failed',
        healthScore: 0,
        responseTimeMs: Date.now() - startTime,
        errorCount: 1,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };

      await this.recordSystemHealth(healthCheck);
      return healthCheck;
    }
  }

  /**
   * Check memory system activity
   */
  private async checkMemorySystem(): Promise<SystemHealthCheck> {
    const startTime = Date.now();

    try {
      // Query memory activity in last 24 hours
      const { data, error } = await supabase
        .from('production_memory')
        .select('memory_type')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1000);

      const responseTime = Date.now() - startTime;
      const isHealthy = !error && data && data.length > 0;
      const memoryCount = data?.length || 0;

      const healthCheck: SystemHealthCheck = {
        component: 'memory_system',
        status: isHealthy ? 'operational' : (memoryCount === 0 ? 'degraded' : 'failed'),
        healthScore: isHealthy ? 100 : (memoryCount > 0 ? 50 : 0),
        responseTimeMs: responseTime,
        errorCount: isHealthy ? 0 : 1,
        details: {
          memories_24h: memoryCount,
          recording: isHealthy,
          error: error?.message,
        },
      };

      await this.recordSystemHealth(healthCheck);
      return healthCheck;

    } catch (error) {
      const healthCheck: SystemHealthCheck = {
        component: 'memory_system',
        status: 'failed',
        healthScore: 0,
        responseTimeMs: Date.now() - startTime,
        errorCount: 1,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };

      await this.recordSystemHealth(healthCheck);
      return healthCheck;
    }
  }

  /**
   * Check database relationship integrity
   */
  private async checkRelationshipIntegrity(): Promise<RelationshipIntegrityCheck[]> {
    const checks: RelationshipIntegrityCheck[] = [];

    try {
      // Check jobs -> customers
      const jobsCheck = await this.checkOrphanedRecords('jobs', 'customers', 'customer_id', 'id');
      checks.push(jobsCheck);

      // Check invoices -> customers
      const invoicesCustomerCheck = await this.checkOrphanedRecords('invoices', 'customers', 'customer_id', 'id');
      checks.push(invoicesCustomerCheck);

      // Check invoices -> jobs
      const invoicesJobCheck = await this.checkOrphanedRecords('invoices', 'jobs', 'job_id', 'id');
      checks.push(invoicesJobCheck);

      // Check estimates -> customers
      const estimatesCheck = await this.checkOrphanedRecords('estimates', 'customers', 'customer_id', 'id');
      checks.push(estimatesCheck);

      // Check tasks -> parent tasks
      const tasksCheck = await this.checkOrphanedRecords('tasks', 'tasks', 'parent_id', 'id');
      checks.push(tasksCheck);

      // Record all checks
      for (const check of checks) {
        await this.recordRelationshipIntegrityCheck(check);
      }

      console.log(`✅ Relationship integrity checks completed: ${checks.length} relationships verified`);

    } catch (error) {
      console.error('❌ Relationship integrity check failed:', error);
    }

    return checks;
  }

  /**
   * Check for orphaned records in a relationship
   */
  private async checkOrphanedRecords(
    childTable: string,
    parentTable: string,
    foreignKey: string,
    parentKey: string
  ): Promise<RelationshipIntegrityCheck> {
    try {
      // Count orphaned records using raw SQL for accuracy
      const { data, error } = await supabase.rpc('count_orphaned_records', {
        child_table: childTable,
        parent_table: parentTable,
        foreign_key: foreignKey,
        parent_key: parentKey,
      });

      const orphanedCount = error ? -1 : (data || 0);
      const integrityScore = orphanedCount === 0 ? 100 : (orphanedCount < 10 ? 70 : 30);

      return {
        checkType: 'foreign_key',
        parentTable,
        childTable,
        constraintName: `${childTable}_${foreignKey}_fkey`,
        orphanedCount: Math.max(0, orphanedCount),
        integrityScore,
        issuesFound: orphanedCount > 0 ? [`Found ${orphanedCount} orphaned records`] : [],
        autoFixed: false,
      };

    } catch (error) {
      return {
        checkType: 'foreign_key',
        parentTable,
        childTable,
        orphanedCount: -1,
        integrityScore: 0,
        issuesFound: [`Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  /**
   * Calculate overall system health
   */
  private async calculateOverallHealth(checks: SystemHealthCheck[]): Promise<{
    healthScore: number;
    status: string;
    details: any;
  }> {
    const avgHealthScore = Math.round(
      checks.reduce((sum, check) => sum + check.healthScore, 0) / checks.length
    );

    const status = avgHealthScore >= 90 ? 'operational' : avgHealthScore >= 70 ? 'degraded' : 'critical';

    return {
      healthScore: avgHealthScore,
      status,
      details: {
        components: checks.map((c) => ({
          component: c.component,
          status: c.status,
          score: c.healthScore,
        })),
      },
    };
  }

  /**
   * Record system health check to database
   */
  private async recordSystemHealth(check: SystemHealthCheck): Promise<void> {
    try {
      await supabase.from('system_health_monitoring').insert({
        component: check.component,
        status: check.status,
        health_score: check.healthScore,
        response_time_ms: check.responseTimeMs,
        error_count: check.errorCount,
        details: check.details,
        last_check_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Failed to record health check for ${check.component}:`, error);
    }
  }

  /**
   * Record operational status to database
   */
  private async recordOperationalStatus(status: OperationalStatus): Promise<void> {
    try {
      await supabase.from('operational_status_log').insert({
        operation_type: status.operationType,
        operation_name: status.operationName,
        status: status.status,
        entity_type: status.entityType,
        entity_id: status.entityId,
        duration_ms: status.durationMs,
        error_message: status.errorMessage,
        metadata: status.metadata,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to record operational status:', error);
    }
  }

  /**
   * Record relationship integrity check to database
   */
  private async recordRelationshipIntegrityCheck(check: RelationshipIntegrityCheck): Promise<void> {
    try {
      await supabase.from('relationship_integrity_checks').insert({
        check_type: check.checkType,
        parent_table: check.parentTable,
        child_table: check.childTable,
        constraint_name: check.constraintName,
        orphaned_count: check.orphanedCount,
        integrity_score: check.integrityScore,
        issues_found: check.issuesFound,
        auto_fixed: check.autoFixed,
        fix_details: check.fixDetails,
        checked_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to record integrity check:', error);
    }
  }

  /**
   * Get current system status
   */
  async getCurrentStatus(): Promise<any> {
    try {
      // Get latest health checks
      const { data: healthChecks } = await supabase
        .from('system_health_monitoring')
        .select('*')
        .order('last_check_at', { ascending: false })
        .limit(5);

      // Get latest integrity checks
      const { data: integrityChecks } = await supabase
        .from('relationship_integrity_checks')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(10);

      // Get recent operational logs
      const { data: recentOps } = await supabase
        .from('operational_status_log')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20);

      return {
        lastCheckTimestamp: this.lastCheckTimestamp,
        isMonitoring: this.isRunning,
        healthChecks,
        integrityChecks,
        recentOperations: recentOps,
      };

    } catch (error) {
      console.error('Failed to get current status:', error);
      return {
        error: 'Failed to retrieve system status',
      };
    }
  }
}

// Export singleton instance
export const systemMonitorAgent = new SystemMonitorAgent();

// Note: Auto-start is handled by /api/system/monitor route to avoid module initialization issues
