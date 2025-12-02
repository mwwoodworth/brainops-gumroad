/**
 * Workflow Trigger System
 * Detects events and activates workflows automatically
 * Week 8: Workflow Automation
 */

import { supabase } from '@/db/client';
import { executeWorkflow } from './workflow-engine';

export interface TriggerSubscription {
  id: string;
  workflowId: string;
  unsubscribe: () => void;
}

interface ScheduledTrigger {
  workflowId: string;
  intervalId: NodeJS.Timeout;
}

const activeSubscriptions: TriggerSubscription[] = [];
const scheduledTriggers: ScheduledTrigger[] = [];

/**
 * Initialize all workflow triggers
 */
export async function initializeWorkflowTriggers(): Promise<void> {
  // Get all enabled workflows
  const { data: workflows, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('enabled', true);

  if (error || !workflows) {
    console.error('Failed to load workflows:', error);
    return;
  }

  // Set up triggers for each workflow
  for (const workflow of workflows) {
    await setupWorkflowTrigger(workflow);
  }

  console.log(`Initialized ${workflows.length} workflow triggers`);
}

/**
 * Set up trigger for a specific workflow
 */
export async function setupWorkflowTrigger(workflow: any): Promise<void> {
  const { id, trigger_type, trigger_config } = workflow;

  switch (trigger_type) {
    case 'database_event':
      await setupDatabaseEventTrigger(id, trigger_config);
      break;

    case 'scheduled':
      setupScheduledTrigger(id, trigger_config);
      break;

    case 'manual':
      // Manual triggers don't need setup
      break;

    case 'api_event':
      // API events are handled via webhook endpoints
      break;

    default:
      console.warn(`Unknown trigger type: ${trigger_type}`);
  }
}

/**
 * Set up database event trigger using Supabase Realtime
 */
async function setupDatabaseEventTrigger(
  workflowId: string,
  config: {
    table: string;
    event: 'insert' | 'update' | 'delete';
    condition?: string;
  }
): Promise<void> {
  const { table, event, condition } = config;

  // Subscribe to table changes
  const channel = supabase
    .channel(`workflow_${workflowId}`)
    .on(
      'postgres_changes' as any,
      {
        event: event === 'insert' ? 'INSERT' : event === 'update' ? 'UPDATE' : 'DELETE',
        schema: 'public',
        table,
      },
      async (payload: any) => {
        // Check condition if specified
        if (condition && !evaluateCondition(condition, payload.old, payload.new)) {
          return;
        }

        // Execute workflow with trigger data
        try {
          await executeWorkflow(workflowId, {
            event,
            table,
            old: payload.old,
            new: payload.new,
            ...payload.new,
          });
        } catch (error) {
          console.error(`Workflow ${workflowId} execution failed:`, error);
        }
      }
    )
    .subscribe();

  // Store subscription for cleanup
  activeSubscriptions.push({
    id: `${workflowId}_${table}_${event}`,
    workflowId,
    unsubscribe: () => channel.unsubscribe(),
  });
}

/**
 * Evaluate condition for database event
 */
function evaluateCondition(
  condition: string,
  oldRecord: any,
  newRecord: any
): boolean {
  try {
    // Replace OLD. and NEW. with actual values
    const processedCondition = condition
      .replace(/NEW\.(\w+)/g, (_, field) => {
        const value = newRecord?.[field];
        return typeof value === 'string' ? `"${value}"` : String(value);
      })
      .replace(/OLD\.(\w+)/g, (_, field) => {
        const value = oldRecord?.[field];
        return typeof value === 'string' ? `"${value}"` : String(value);
      });

    // Evaluate the condition
    // Note: In production, use a safe expression evaluator
    return eval(processedCondition);
  } catch (error) {
    console.error('Condition evaluation failed:', error);
    return false;
  }
}

/**
 * Set up scheduled trigger (cron-like)
 */
function setupScheduledTrigger(
  workflowId: string,
  config: {
    interval?: number; // milliseconds
    cron?: string; // cron expression (simplified)
    query?: string; // SQL query to fetch items
  }
): void {
  const { interval, cron, query } = config;

  let intervalMs: number = 60000; // Default: 1 minute

  if (interval) {
    intervalMs = interval;
  } else if (cron) {
    // Parse cron expression (simplified - only supports daily at specific time)
    // Format: "0 9 * * *" = every day at 9 AM
    const parts = cron.split(' ');
    if (parts.length >= 5) {
      const hour = parseInt(parts[1]);
      intervalMs = 24 * 60 * 60 * 1000; // Check daily

      // Schedule for specific time
      const now = new Date();
      const targetTime = new Date();
      targetTime.setHours(hour, parseInt(parts[0]), 0, 0);

      if (targetTime < now) {
        targetTime.setDate(targetTime.getDate() + 1);
      }

      const initialDelay = targetTime.getTime() - now.getTime();

      // Wait until target time, then repeat daily
      setTimeout(() => {
        executeScheduledWorkflow(workflowId, query);

        const intervalId = setInterval(() => {
          executeScheduledWorkflow(workflowId, query);
        }, intervalMs);

        scheduledTriggers.push({ workflowId, intervalId });
      }, initialDelay);

      return;
    }
  }

  // Set up interval
  const intervalId = setInterval(() => {
    executeScheduledWorkflow(workflowId, query);
  }, intervalMs);

  scheduledTriggers.push({ workflowId, intervalId });
}

/**
 * Execute scheduled workflow
 */
async function executeScheduledWorkflow(
  workflowId: string,
  query?: string
): Promise<void> {
  try {
    if (query) {
      // Execute query to get items
      const { data, error } = await supabase.rpc('execute_query', { query_text: query });

      if (error || !data) {
        console.error('Scheduled query failed:', error);
        return;
      }

      // Execute workflow for each item
      for (const item of data) {
        await executeWorkflow(workflowId, { item });
      }
    } else {
      // Execute workflow once
      await executeWorkflow(workflowId, {});
    }
  } catch (error) {
    console.error(`Scheduled workflow ${workflowId} failed:`, error);
  }
}

/**
 * Manually trigger a workflow
 */
export async function triggerWorkflowManually(
  workflowId: string,
  triggerData: Record<string, any> = {}
): Promise<any> {
  return await executeWorkflow(workflowId, triggerData);
}

/**
 * Stop all workflow triggers
 */
export function stopAllWorkflowTriggers(): void {
  // Unsubscribe from database events
  for (const sub of activeSubscriptions) {
    sub.unsubscribe();
  }
  activeSubscriptions.length = 0;

  // Clear scheduled triggers
  for (const trigger of scheduledTriggers) {
    clearInterval(trigger.intervalId);
  }
  scheduledTriggers.length = 0;

  console.log('All workflow triggers stopped');
}

/**
 * Stop trigger for specific workflow
 */
export function stopWorkflowTrigger(workflowId: string): void {
  // Remove database subscriptions
  const dbSubs = activeSubscriptions.filter((sub) => sub.workflowId === workflowId);
  for (const sub of dbSubs) {
    sub.unsubscribe();
  }

  const dbSubIndex = activeSubscriptions.findIndex((sub) => sub.workflowId === workflowId);
  if (dbSubIndex !== -1) {
    activeSubscriptions.splice(dbSubIndex, 1);
  }

  // Remove scheduled triggers
  const schedTrigger = scheduledTriggers.find((t) => t.workflowId === workflowId);
  if (schedTrigger) {
    clearInterval(schedTrigger.intervalId);
    const schedIndex = scheduledTriggers.findIndex((t) => t.workflowId === workflowId);
    if (schedIndex !== -1) {
      scheduledTriggers.splice(schedIndex, 1);
    }
  }
}

/**
 * Get active trigger statistics
 */
export function getActiveTriggerStats(): {
  databaseSubscriptions: number;
  scheduledTriggers: number;
  total: number;
} {
  return {
    databaseSubscriptions: activeSubscriptions.length,
    scheduledTriggers: scheduledTriggers.length,
    total: activeSubscriptions.length + scheduledTriggers.length,
  };
}
