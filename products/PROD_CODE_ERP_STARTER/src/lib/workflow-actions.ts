/**
 * Workflow Action Library
 * Reusable actions for workflow automation
 * Week 8: Workflow Automation
 */

import { supabase } from '@/db/client';

export interface WorkflowAction {
  type: string;
  config: Record<string, any>;
  on_error?: 'continue' | 'stop' | 'retry';
  retry_count?: number;
}

/**
 * Execute a workflow action
 */
export async function executeWorkflowAction(
  action: WorkflowAction,
  context: Record<string, any>
): Promise<any> {
  const { type, config } = action;

  // Replace template variables in config
  const processedConfig = replaceTemplateVariables(config, context);

  switch (type) {
    // Database actions
    case 'create_record':
      return await createRecord(processedConfig as { table: string; data: Record<string, any> });

    case 'update_record':
      return await updateRecord(processedConfig as { table: string; id: string; data: Record<string, any> });

    case 'delete_record':
      return await deleteRecord(processedConfig as { table: string; id: string });

    case 'query_records':
      return await queryRecords(processedConfig as { table: string; filters?: Record<string, any>; limit?: number; order?: { column: string; ascending: boolean } });

    // Notification actions
    case 'send_notification':
      return await sendNotification(processedConfig as { message: string; user_id?: string; type?: string; priority?: 'low' | 'medium' | 'high' });

    case 'send_email':
      return await sendEmailAction(processedConfig as { to: string; subject: string; body: string; from?: string });

    case 'send_sms':
      return await sendSMSAction(processedConfig as { to: string; message: string });

    // Integration actions
    case 'webhook':
      return await callWebhook(processedConfig as { url: string; method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; headers?: Record<string, string>; body?: any });

    case 'ai_agent':
      return await callAIAgent(processedConfig as { agent: string; task: string; data?: any });

    // Control flow actions
    case 'wait':
      return await wait(processedConfig.duration || 1000);

    case 'conditional':
      return await executeConditional(processedConfig as { condition: string; if_true: WorkflowAction[]; if_false?: WorkflowAction[] }, context);

    case 'loop':
      return await executeLoop(processedConfig as { items: any[]; actions: WorkflowAction[] }, context);

    // Utility actions
    case 'log':
      return await logMessage(processedConfig as { message: string; level?: 'info' | 'warning' | 'error'; metadata?: any });

    case 'set_variable':
      return setVariable(processedConfig as { name: string; value: any }, context);

    case 'calculate':
      return calculateExpression(processedConfig as { expression: string; context?: Record<string, any> });

    default:
      throw new Error(`Unknown action type: ${type}`);
  }
}

/**
 * Replace template variables like {{trigger.data.id}}
 */
function replaceTemplateVariables(
  config: Record<string, any>,
  context: Record<string, any>
): Record<string, any> {
  const configStr = JSON.stringify(config);
  const replaced = configStr.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const keys = path.trim().split('.');
    let value: any = context;

    for (const key of keys) {
      value = value?.[key];
    }

    return value !== undefined ? JSON.stringify(value).slice(1, -1) : match;
  });

  return JSON.parse(replaced);
}

// ============================================
// DATABASE ACTIONS
// ============================================

/**
 * Create a database record
 */
async function createRecord(config: {
  table: string;
  data: Record<string, any>;
}): Promise<any> {
  const { table, data } = config;

  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create record in ${table}: ${error.message}`);
  }

  return result;
}

/**
 * Update a database record
 */
async function updateRecord(config: {
  table: string;
  id: string;
  data: Record<string, any>;
}): Promise<any> {
  const { table, id, data } = config;

  const { data: result, error } = await supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update record in ${table}: ${error.message}`);
  }

  return result;
}

/**
 * Delete a database record
 */
async function deleteRecord(config: {
  table: string;
  id: string;
}): Promise<any> {
  const { table, id } = config;

  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete record in ${table}: ${error.message}`);
  }

  return { deleted: true, id };
}

/**
 * Query database records
 */
async function queryRecords(config: {
  table: string;
  filters?: Record<string, any>;
  limit?: number;
  order?: { column: string; ascending: boolean };
}): Promise<any[]> {
  const { table, filters, limit, order } = config;

  let query = supabase.from(table).select('*');

  // Apply filters
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  // Apply order
  if (order) {
    query = query.order(order.column, { ascending: order.ascending });
  }

  // Apply limit
  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to query records from ${table}: ${error.message}`);
  }

  return data || [];
}

// ============================================
// NOTIFICATION ACTIONS
// ============================================

/**
 * Send in-app notification
 */
async function sendNotification(config: {
  message: string;
  user_id?: string;
  type?: string;
  priority?: 'low' | 'medium' | 'high';
}): Promise<any> {
  const { message, user_id, type, priority } = config;

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        message,
        user_id,
        type: type || 'workflow',
        priority: priority || 'medium',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.log('Notification would be sent:', message);
      return { sent: true, message, fallback: true };
    }

    return data;
  } catch (error) {
    console.log('Notification would be sent:', message);
    return { sent: true, message, fallback: true };
  }
}

/**
 * Send email (integrates with email service)
 */
async function sendEmailAction(config: {
  to: string;
  subject: string;
  body: string;
  from?: string;
}): Promise<any> {
  const { to, subject, body, from } = config;

  // Import email service dynamically
  const { sendEmail } = await import('./email-service');

  try {
    const result = await sendEmail({
      to,
      subject,
      html: body,
      text: body.replace(/<[^>]*>/g, ''), // Strip HTML for plain text
      from,
    });

    if (result.success) {
      return {
        sent: true,
        messageId: result.messageId,
        to,
        subject,
      };
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Email send error:', error);
    // Fallback to notification
    return await sendNotification({
      message: `Failed to send email: ${subject} to ${to}`,
      type: 'email_failed',
      priority: 'high',
    });
  }
}

/**
 * Send SMS (integrates with SMS service)
 */
async function sendSMSAction(config: {
  to: string;
  message: string;
}): Promise<any> {
  const { to, message } = config;

  // Import SMS service dynamically
  const { sendSMS } = await import('./sms-service');

  try {
    const result = await sendSMS(to, message);

    if (result.success) {
      return {
        sent: true,
        messageId: result.messageId,
        to,
        status: result.status,
      };
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('SMS send error:', error);
    // Fallback to notification
    return await sendNotification({
      message: `Failed to send SMS to ${to}: ${message}`,
      type: 'sms_failed',
      priority: 'high',
    });
  }
}

// ============================================
// INTEGRATION ACTIONS
// ============================================

/**
 * Call external webhook
 */
async function callWebhook(config: {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
}): Promise<any> {
  const { url, method = 'POST', headers, body } = config;

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Webhook call failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Call AI agent
 */
async function callAIAgent(config: {
  agent: string;
  task: string;
  data?: any;
}): Promise<any> {
  const { agent, task, data } = config;

  // Call BrainOps AI Agents API
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_AI_AGENTS_URL}/api/v1/agents/${agent}/execute`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ task, data }),
    }
  );

  if (!response.ok) {
    throw new Error(`AI agent call failed: ${response.statusText}`);
  }

  return await response.json();
}

// ============================================
// CONTROL FLOW ACTIONS
// ============================================

/**
 * Wait for specified duration
 */
async function wait(duration: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

/**
 * Execute conditional action
 */
async function executeConditional(
  config: {
    condition: string;
    if_true: WorkflowAction[];
    if_false?: WorkflowAction[];
  },
  context: Record<string, any>
): Promise<any> {
  const { condition, if_true, if_false } = config;

  // Evaluate condition
  const result = evaluateCondition(condition, context);

  // Execute appropriate branch
  const actions = result ? if_true : if_false || [];
  const results = [];

  for (const action of actions) {
    const actionResult = await executeWorkflowAction(action, context);
    results.push(actionResult);
  }

  return { condition_result: result, results };
}

/**
 * Execute loop over items
 */
async function executeLoop(
  config: {
    items: any[];
    actions: WorkflowAction[];
  },
  context: Record<string, any>
): Promise<any> {
  const { items, actions } = config;
  const results = [];

  for (const item of items) {
    const itemContext = { ...context, item };
    const itemResults = [];

    for (const action of actions) {
      const actionResult = await executeWorkflowAction(action, itemContext);
      itemResults.push(actionResult);
    }

    results.push({ item, results: itemResults });
  }

  return { iterations: items.length, results };
}

/**
 * Evaluate condition expression
 */
function evaluateCondition(
  condition: string,
  context: Record<string, any>
): boolean {
  try {
    // Replace variable references
    const processedCondition = condition.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const keys = path.trim().split('.');
      let value: any = context;

      for (const key of keys) {
        value = value?.[key];
      }

      return typeof value === 'string' ? `"${value}"` : String(value);
    });

    // Evaluate (Note: In production, use a safe expression evaluator)
    return eval(processedCondition);
  } catch (error) {
    console.error('Condition evaluation failed:', error);
    return false;
  }
}

// ============================================
// UTILITY ACTIONS
// ============================================

/**
 * Log message
 */
async function logMessage(config: {
  message: string;
  level?: 'info' | 'warning' | 'error';
  metadata?: any;
}): Promise<any> {
  const { message, level = 'info', metadata } = config;

  console.log(`[${level.toUpperCase()}] ${message}`, metadata || '');

  return { logged: true, message, level };
}

/**
 * Set variable in context
 */
function setVariable(
  config: {
    name: string;
    value: any;
  },
  context: Record<string, any>
): any {
  const { name, value } = config;
  context[name] = value;
  return { set: true, name, value };
}

/**
 * Calculate expression
 */
function calculateExpression(config: {
  expression: string;
  context?: Record<string, any>;
}): any {
  const { expression, context = {} } = config;

  try {
    // Replace variables
    const processedExpression = expression.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const keys = path.trim().split('.');
      let value: any = context;

      for (const key of keys) {
        value = value?.[key];
      }

      return String(value);
    });

    // Evaluate (Note: In production, use a safe math evaluator)
    const result = eval(processedExpression);

    return { result, expression: processedExpression };
  } catch (error) {
    throw new Error(`Calculation failed: ${error}`);
  }
}

/**
 * Validate action configuration
 */
export function validateActionConfig(action: WorkflowAction): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!action.type) {
    errors.push('Action type is required');
  }

  if (!action.config || typeof action.config !== 'object') {
    errors.push('Action config must be an object');
  }

  // Type-specific validation
  switch (action.type) {
    case 'create_record':
    case 'update_record':
    case 'delete_record':
      if (!action.config.table) {
        errors.push('Table name is required for database actions');
      }
      break;

    case 'send_email':
      if (!action.config.to || !action.config.subject) {
        errors.push('Email action requires "to" and "subject"');
      }
      break;

    case 'webhook':
      if (!action.config.url) {
        errors.push('Webhook action requires "url"');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get all available action types
 */
export function getAvailableActionTypes(): string[] {
  return [
    'create_record',
    'update_record',
    'delete_record',
    'query_records',
    'send_notification',
    'send_email',
    'send_sms',
    'webhook',
    'ai_agent',
    'wait',
    'conditional',
    'loop',
    'log',
    'set_variable',
    'calculate',
  ];
}
