/**
 * Core OS Tasks Management
 * Unified task system shared across all BrainOps systems
 */

import { createServiceClient } from '@/lib/supabase/service';
import { logger } from '@/lib/logger';

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tenant_id?: string | null;
  domain: string;
  source_system: 'erp' | 'mrg' | 'brainops' | 'ai-agents' | 'cli' | 'manual';
  created_by?: string | null;
  assigned_to?: string | null;
  due_at?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TaskRun {
  id: string;
  task_id: string;
  tenant_id?: string | null;
  runner: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at?: string;
  finished_at?: string | null;
  log?: string | null;
  result?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  tenant_id?: string;
  domain?: string;
  source_system?: Task['source_system'];
  created_by?: string;
  assigned_to?: string;
  due_at?: Date;
  metadata?: Record<string, any>;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  assigned_to?: string;
  due_at?: Date;
  metadata?: Record<string, any>;
}

export interface CreateTaskRunInput {
  task_id: string;
  tenant_id?: string;
  runner: string;
  status?: TaskRun['status'];
  log?: string;
  result?: Record<string, any>;
}

/**
 * Create a new task
 */
export async function createTask(input: CreateTaskInput): Promise<Task | null> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: input.title,
        description: input.description,
        status: input.status || 'pending',
        priority: input.priority || 'normal',
        tenant_id: input.tenant_id,
        domain: input.domain || 'general',
        source_system: input.source_system || 'erp',
        created_by: input.created_by,
        assigned_to: input.assigned_to,
        due_at: input.due_at?.toISOString(),
        metadata: input.metadata || {}
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create task', { error, input });
      return null;
    }

    logger.info('Task created', { task_id: data.id, title: input.title });
    return data as Task;
  } catch (error) {
    logger.error('Error creating task', { error, input });
    return null;
  }
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  taskId: string,
  status: Task['status'],
  metadata?: Record<string, any>
): Promise<boolean> {
  try {
    const supabase = createServiceClient();

    const updateData: any = { status };
    if (metadata) {
      updateData.metadata = metadata;
    }

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId);

    if (error) {
      logger.error('Failed to update task status', { error, taskId, status });
      return false;
    }

    logger.info('Task status updated', { taskId, status });
    return true;
  } catch (error) {
    logger.error('Error updating task status', { error, taskId, status });
    return false;
  }
}

/**
 * Update a task
 */
export async function updateTask(
  taskId: string,
  input: UpdateTaskInput
): Promise<Task | null> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('tasks')
      .update({
        ...(input.title && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.status && { status: input.status }),
        ...(input.priority && { priority: input.priority }),
        ...(input.assigned_to !== undefined && { assigned_to: input.assigned_to }),
        ...(input.due_at && { due_at: input.due_at.toISOString() }),
        ...(input.metadata && { metadata: input.metadata })
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update task', { error, taskId, input });
      return null;
    }

    logger.info('Task updated', { taskId });
    return data as Task;
  } catch (error) {
    logger.error('Error updating task', { error, taskId, input });
    return null;
  }
}

/**
 * List tasks for a tenant
 */
export async function listTasksForTenant(
  tenantId: string,
  filters?: {
    status?: Task['status'];
    domain?: string;
    assigned_to?: string;
    limit?: number;
    offset?: number;
  }
): Promise<Task[]> {
  try {
    const supabase = createServiceClient();

    let query = supabase
      .from('tasks')
      .select()
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.domain) {
      query = query.eq('domain', filters.domain);
    }
    if (filters?.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to list tasks for tenant', { error, tenantId, filters });
      return [];
    }

    return (data as Task[]) || [];
  } catch (error) {
    logger.error('Error listing tasks for tenant', { error, tenantId, filters });
    return [];
  }
}

/**
 * Get a task by ID
 */
export async function getTask(taskId: string): Promise<Task | null> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('tasks')
      .select()
      .eq('id', taskId)
      .single();

    if (error) {
      logger.error('Failed to get task', { error, taskId });
      return null;
    }

    return data as Task;
  } catch (error) {
    logger.error('Error getting task', { error, taskId });
    return null;
  }
}

/**
 * Assign a task to a user
 */
export async function assignTask(
  taskId: string,
  assignedTo: string
): Promise<boolean> {
  try {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('tasks')
      .update({
        assigned_to: assignedTo,
        status: 'in_progress'
      })
      .eq('id', taskId);

    if (error) {
      logger.error('Failed to assign task', { error, taskId, assignedTo });
      return false;
    }

    logger.info('Task assigned', { taskId, assignedTo });
    return true;
  } catch (error) {
    logger.error('Error assigning task', { error, taskId, assignedTo });
    return false;
  }
}

/**
 * Create a task run (execution record)
 */
export async function createTaskRun(
  input: CreateTaskRunInput
): Promise<TaskRun | null> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('task_runs')
      .insert({
        task_id: input.task_id,
        tenant_id: input.tenant_id,
        runner: input.runner,
        status: input.status || 'queued',
        log: input.log,
        result: input.result
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create task run', { error, input });
      return null;
    }

    logger.info('Task run created', {
      task_run_id: data.id,
      task_id: input.task_id,
      runner: input.runner
    });

    return data as TaskRun;
  } catch (error) {
    logger.error('Error creating task run', { error, input });
    return null;
  }
}

/**
 * Mark task run as complete
 */
export async function markTaskRunComplete(
  taskRunId: string,
  result?: Record<string, any>,
  log?: string
): Promise<boolean> {
  try {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('task_runs')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        result,
        log
      })
      .eq('id', taskRunId);

    if (error) {
      logger.error('Failed to mark task run complete', { error, taskRunId });
      return false;
    }

    logger.info('Task run completed', { taskRunId });
    return true;
  } catch (error) {
    logger.error('Error marking task run complete', { error, taskRunId });
    return false;
  }
}

/**
 * Mark task run as failed
 */
export async function markTaskRunFailed(
  taskRunId: string,
  error: string,
  log?: string
): Promise<boolean> {
  try {
    const supabase = createServiceClient();

    const { error: updateError } = await supabase
      .from('task_runs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        result: { error },
        log
      })
      .eq('id', taskRunId);

    if (updateError) {
      logger.error('Failed to mark task run as failed', {
        error: updateError,
        taskRunId
      });
      return false;
    }

    logger.info('Task run marked as failed', { taskRunId, error });
    return true;
  } catch (err) {
    logger.error('Error marking task run as failed', { error: err, taskRunId });
    return false;
  }
}

/**
 * Get task runs for a task
 */
export async function getTaskRuns(
  taskId: string,
  limit: number = 10
): Promise<TaskRun[]> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('task_runs')
      .select()
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to get task runs', { error, taskId });
      return [];
    }

    return (data as TaskRun[]) || [];
  } catch (error) {
    logger.error('Error getting task runs', { error, taskId });
    return [];
  }
}

/**
 * Get task statistics for a tenant
 */
export async function getTaskStats(tenantId?: string) {
  try {
    const supabase = createServiceClient();

    let query = supabase.from('tasks').select('status', { count: 'exact' });

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to get task stats', { error, tenantId });
      return null;
    }

    // Count by status
    const statusCounts = data?.reduce((acc: Record<string, number>, task: any) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {}) || {};

    return {
      total: count || 0,
      by_status: statusCounts,
      pending: statusCounts.pending || 0,
      in_progress: statusCounts.in_progress || 0,
      completed: statusCounts.completed || 0,
      failed: statusCounts.failed || 0,
      cancelled: statusCounts.cancelled || 0
    };
  } catch (error) {
    logger.error('Error getting task stats', { error, tenantId });
    return null;
  }
}
