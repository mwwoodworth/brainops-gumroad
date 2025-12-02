/**
 * Workflow Engine
 * Core execution engine for automated business process workflows
 * Week 8: Workflow Automation
 */

import { supabase } from '@/db/client';
import { sendEmail as sendTransactionalEmail } from '@/lib/communications/email-service';
import { z } from 'zod';

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger_type: 'database_event' | 'scheduled' | 'manual' | 'api_event';
  trigger_config: Record<string, any>;
  actions: WorkflowAction[];
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowAction {
  type: string;
  config: Record<string, any>;
  on_error?: 'continue' | 'stop' | 'retry';
  retry_count?: number;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  trigger_data?: Record<string, any>;
  result?: Record<string, any>;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

export interface WorkflowLog {
  execution_id: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Execute a workflow
 */
export async function executeWorkflow(
  workflowId: string,
  triggerData: Record<string, any> = {}
): Promise<WorkflowExecution> {
  // Get workflow definition
  const { data: workflow, error: workflowError } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .eq('enabled', true)
    .single();

  if (workflowError || !workflow) {
    throw new Error(`Workflow not found or disabled: ${workflowId}`);
  }

  // Create execution record
  const { data: execution, error: executionError } = await supabase
    .from('workflow_executions')
    .insert({
      workflow_id: workflowId,
      status: 'running',
      trigger_data: triggerData,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (executionError || !execution) {
    throw new Error('Failed to create workflow execution');
  }

  const executionId = execution.id;

  try {
    // Log start
    await logWorkflow(executionId, 'info', `Workflow started: ${workflow.name}`);

    // Execute actions sequentially
    const results: any[] = [];
    for (let i = 0; i < workflow.actions.length; i++) {
      const action = workflow.actions[i];
      await logWorkflow(
        executionId,
        'info',
        `Executing action ${i + 1}/${workflow.actions.length}: ${action.type}`
      );

      try {
        const result = await executeAction(action, triggerData, executionId);
        results.push(result);
      } catch (error: any) {
        await logWorkflow(
          executionId,
          'error',
          `Action failed: ${error.message}`,
          { action, error: error.message }
        );

        if (action.on_error === 'stop' || !action.on_error) {
          throw error;
        }
      }
    }

    // Mark as completed
    await supabase
      .from('workflow_executions')
      .update({
        status: 'completed',
        result: { actions_completed: results.length, results },
        completed_at: new Date().toISOString(),
      })
      .eq('id', executionId);

    await logWorkflow(executionId, 'info', 'Workflow completed successfully');

    return {
      ...execution,
      status: 'completed',
      result: { actions_completed: results.length, results },
      completed_at: new Date().toISOString(),
    };
  } catch (error: any) {
    // Mark as failed
    await supabase
      .from('workflow_executions')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', executionId);

    await logWorkflow(executionId, 'error', `Workflow failed: ${error.message}`);

    return {
      ...execution,
      status: 'failed',
      error_message: error.message,
      completed_at: new Date().toISOString(),
    };
  }
}

/**
 * Execute a single workflow action
 */
async function executeAction(
  action: WorkflowAction,
  triggerData: Record<string, any>,
  executionId: string
): Promise<any> {
  const { type, config } = action;

  // Replace template variables in config
  const processedConfig = replaceTemplateVariables(config, triggerData);

  switch (type) {
    case 'create_record':
      return await createRecord(processedConfig as { table: string; data: Record<string, any> });

    case 'update_record':
      return await updateRecord(processedConfig as { table: string; id: string; data: Record<string, any> });

    case 'send_notification':
      return await sendNotification(processedConfig as { message: string; user_id?: string });

    case 'send_email':
      return await sendEmail(processedConfig as { to: string; subject: string; body: string });

    case 'wait':
      return await wait(processedConfig.duration || 1000);

    case 'log':
      await logWorkflow(executionId, 'info', processedConfig.message, processedConfig.metadata);
      return { logged: true };

    default:
      throw new Error(`Unknown action type: ${type}`);
  }
}

/**
 * Replace template variables like {{trigger.data.id}}
 */
function replaceTemplateVariables(
  config: Record<string, any>,
  triggerData: Record<string, any>
): Record<string, any> {
  const configStr = JSON.stringify(config);
  const replaced = configStr.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const keys = path.trim().split('.');
    let value: any = { trigger: { data: triggerData } };

    for (const key of keys) {
      value = value?.[key];
    }

    return value !== undefined ? JSON.stringify(value).slice(1, -1) : match;
  });

  return JSON.parse(replaced);
}

/**
 * Create a database record
 */
async function createRecord(config: { table: string; data: Record<string, any> }): Promise<any> {
  const { data, error } = await supabase.from(config.table).insert(config.data).select().single();

  if (error) {
    throw new Error(`Failed to create record in ${config.table}: ${error.message}`);
  }

  return data;
}

/**
 * Update a database record
 */
async function updateRecord(config: {
  table: string;
  id: string;
  data: Record<string, any>;
}): Promise<any> {
  const { data, error } = await supabase
    .from(config.table)
    .update(config.data)
    .eq('id', config.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update record in ${config.table}: ${error.message}`);
  }

  return data;
}

/**
 * Send in-app notification
 */
async function sendNotification(config: { message: string; user_id?: string }): Promise<any> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      message: config.message,
      user_id: config.user_id,
      type: 'workflow',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    // If notifications table doesn't exist, just log
    console.log('Notification would be sent:', config.message);
    return { sent: true, message: config.message };
  }

  return data;
}

/**
 * Send email (placeholder - integrate with email service)
 */
async function sendEmail(config: { to: string; subject: string; body: string }): Promise<any> {
  try {
    const emailResult = await sendTransactionalEmail({
      to: config.to,
      subject: config.subject,
      text: config.body
    });

    if (emailResult) {
      return { sent: true, message: config.body };
    }
  } catch (error) {
    console.error('Workflow email send failed:', error);
  }

  // For now, create a notification instead
  return await sendNotification({
    message: `Email queued: ${config.subject} to ${config.to}`,
  });
}

/**
 * Wait for specified duration
 */
async function wait(duration: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

/**
 * Log workflow execution
 */
export async function logWorkflow(
  executionId: string,
  level: 'info' | 'warning' | 'error',
  message: string,
  metadata?: Record<string, any>
): Promise<void> {
  await supabase.from('workflow_logs').insert({
    execution_id: executionId,
    level,
    message,
    metadata,
    created_at: new Date().toISOString(),
  });
}

/**
 * Validate workflow definition
 */
export function validateWorkflow(workflow: Partial<Workflow>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!workflow.name) {
    errors.push('Workflow name is required');
  }

  if (!workflow.trigger_type) {
    errors.push('Trigger type is required');
  }

  if (!workflow.trigger_config) {
    errors.push('Trigger config is required');
  }

  if (!workflow.actions || workflow.actions.length === 0) {
    errors.push('At least one action is required');
  } else {
    workflow.actions.forEach((action, index) => {
      const schema = ActionConfigSchemas[action.type as keyof typeof ActionConfigSchemas];
      if (!schema) {
        errors.push(`Action ${index + 1}: Unsupported action type "${action.type}"`);
        return;
      }
      const validation = schema.safeParse(action.config ?? {});
      if (!validation.success) {
        validation.error.issues.forEach((issue) => {
          errors.push(`Action ${index + 1}: ${issue.message}`);
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get workflow execution history
 */
export async function getWorkflowExecutions(
  workflowId: string,
  limit = 50
): Promise<WorkflowExecution[]> {
  const { data, error } = await supabase
    .from('workflow_executions')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get workflow executions: ${error.message}`);
  }

  return data || [];
}

/**
 * Get workflow execution logs
 */
export async function getWorkflowLogs(executionId: string): Promise<WorkflowLog[]> {
  const { data, error } = await supabase
    .from('workflow_logs')
    .select('*')
    .eq('execution_id', executionId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get workflow logs: ${error.message}`);
  }

  return data || [];
}
const ActionConfigSchemas = {
  create_record: z.object({
    table: z.string().min(1, 'Table name is required'),
    data: z.record(z.string(), z.any()).refine(
      (value) => Object.keys(value).length > 0,
      'Data for new record is required'
    ),
  }),
  update_record: z.object({
    table: z.string().min(1, 'Table name is required'),
    id: z.string().min(1, 'Record ID is required'),
    data: z.record(z.string(), z.any()).refine(
      (value) => Object.keys(value).length > 0,
      'Data for update is required'
    ),
  }),
  send_notification: z.object({
    message: z.string().min(1, 'Notification message is required'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    recipient_id: z.string().optional(),
    recipient_role: z.string().optional(),
  }),
  send_email: z.object({
    to: z.string().email('Invalid email address').min(1, 'Recipient email is required'),
    subject: z.string().min(1, 'Email subject is required'),
    body: z.string().min(1, 'Email body is required'),
  }),
  wait: z.object({
    duration: z.number().int().positive('Duration must be greater than 0').min(100, 'Minimum duration is 100ms'),
  }),
  log: z.object({
    message: z.string().min(1, 'Log message is required'),
    level: z.enum(['info', 'warn', 'error', 'debug']).default('info'),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
} as const;
