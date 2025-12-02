/**
 * WEATHERCRAFT ERP - ENTERPRISE-GRADE TASK MANAGEMENT ENGINE
 * Deep relationship awareness | AI-powered intelligence | Complete lifecycle tracking
 *
 * Features:
 * - Full entity relationship tracking (customers, jobs, invoices, etc.)
 * - AI-powered task generation and prioritization
 * - Smart dependencies and blocking detection
 * - Recurring tasks with intelligent scheduling
 * - Progress tracking and time estimation
 * - Team collaboration with assignment and notifications
 * - Deep integration with Memory System and AI Orchestrator
 */

import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '@/lib/env';
import { memoryService } from './memory-service';
import { aiOrchestrator } from './ai-orchestrator';
import { ensureJsonObject } from '@/types/json';
import type { JsonValue } from '@/types/json';

const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

// Task interfaces
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'blocked' | 'review' | 'completed' | 'cancelled';
  priority: 'critical' | 'high' | 'medium' | 'low';
  category?: string;

  // Relationships
  relatedEntityType?: string;
  relatedEntityId?: string;
  parentTaskId?: string;

  // Assignment
  assignedTo?: string;
  assignedBy?: string;
  ownerId?: string;

  // Time tracking
  estimatedHours?: number;
  actualHours?: number;
  dueDate?: string;
  startDate?: string;
  completedDate?: string;

  // Progress
  progressPercentage?: number;
  blockingReason?: string;

  // AI
  aiGenerated?: boolean;
  aiAgentName?: string;
  aiConfidence?: number;
  aiPriorityScore?: number;

  // Recurrence
  isRecurring?: boolean;
  recurrencePattern?: any;
  nextOccurrenceDate?: string;

  // Dependencies
  dependsOn?: string[];
  blocksTasks?: string[];

  // Notifications
  reminderEnabled?: boolean;
  reminderConfig?: any;

  // Metadata
  tags?: string[];
  customFields?: any;
  attachments?: any[];

  // Audit
  tenantId: string;
  orgId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  comment: string;
  commentType: 'comment' | 'status_change' | 'assignment' | 'completion';
  metadata?: any;
  createdAt: string;
}

export interface TaskFilter {
  status?: string[];
  priority?: string[];
  assignedTo?: string[];
  relatedEntityType?: string;
  relatedEntityId?: string;
  dueAfter?: string;
  dueBefore?: string;
  tags?: string[];
  aiGenerated?: boolean;
  category?: string;
}

export interface TaskStatistics {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  completedThisWeek: number;
  avgCompletionTime: number;
  avgEstimationAccuracy: number;
}

export class TaskManagementEngine {
  /**
   * Create a new task with full relationship awareness
   */
  async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; task?: Task; error?: string }> {
    try {
      // Validate task
      if (!task.title || task.title.trim().length === 0) {
        return { success: false, error: 'Task title is required' };
      }

      // Apply AI intelligence if requested
      if (task.aiGenerated && !task.aiPriorityScore) {
        const aiAnalysis = await this.analyzeTaskWithAI(task);
        task.aiPriorityScore = aiAnalysis.priorityScore;
        task.aiConfidence = aiAnalysis.confidence;
      }

      // Insert task
      const { data, error } = await supabase
        .from('tasks_enhanced')
        .insert([{
          title: task.title,
          description: task.description,
          status: task.status || 'pending',
          priority: task.priority || 'medium',
          category: task.category,
          related_entity_type: task.relatedEntityType,
          related_entity_id: task.relatedEntityId,
          parent_task_id: task.parentTaskId,
          assigned_to: task.assignedTo,
          assigned_by: task.assignedBy,
          owner_id: task.ownerId,
          estimated_hours: task.estimatedHours,
          actual_hours: task.actualHours,
          due_date: task.dueDate,
          start_date: task.startDate,
          progress_percentage: task.progressPercentage || 0,
          ai_generated: task.aiGenerated || false,
          ai_agent_name: task.aiAgentName,
          ai_confidence: task.aiConfidence,
          ai_priority_score: task.aiPriorityScore,
          is_recurring: task.isRecurring || false,
          recurrence_pattern: task.recurrencePattern,
          next_occurrence_date: task.nextOccurrenceDate,
          depends_on: task.dependsOn || [],
          blocks_tasks: task.blocksTasks || [],
          reminder_enabled: task.reminderEnabled !== false,
          reminder_config: task.reminderConfig,
          tags: task.tags || [],
          custom_fields: task.customFields,
          attachments: task.attachments || [],
          tenant_id: task.tenantId,
          org_id: task.orgId,
          created_by: task.createdBy,
        }])
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Record to memory
      await memoryService.store(
        'user_action',
        `Task created: ${task.title}`,
        {
          task_id: data.id,
          entity_type: task.relatedEntityType ?? null,
          entity_id: task.relatedEntityId ?? null,
          priority: task.priority ?? null,
          ai_generated: task.aiGenerated ?? false,
        },
        0.6
      );

      // Create automatic reminders if due date set
      if (task.dueDate && task.reminderEnabled !== false) {
        await this.createTaskReminders(data.id, task.dueDate, task.tenantId);
      }

      return { success: true, task: this.mapTaskFromDB(data) };

    } catch (error) {
      console.error('Failed to create task:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update an existing task
   */
  async updateTask(id: string, updates: Partial<Task>): Promise<{ success: boolean; task?: Task; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('tasks_enhanced')
        .update({
          title: updates.title,
          description: updates.description,
          status: updates.status,
          priority: updates.priority,
          category: updates.category,
          assigned_to: updates.assignedTo,
          estimated_hours: updates.estimatedHours,
          actual_hours: updates.actualHours,
          due_date: updates.dueDate,
          start_date: updates.startDate,
          completed_date: updates.completedDate,
          progress_percentage: updates.progressPercentage,
          blocking_reason: updates.blockingReason,
          depends_on: updates.dependsOn,
          blocks_tasks: updates.blocksTasks,
          tags: updates.tags,
          custom_fields: updates.customFields,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Record to memory
      await memoryService.store(
        'user_action',
        `Task updated: ${data.title}`,
        {
          task_id: id,
          changes: Object.keys(updates),
          status: updates.status ?? null,
        },
        0.5
      );

      // Auto-complete if progress is 100%
      if (updates.progressPercentage === 100 && updates.status !== 'completed') {
        await this.completeTask(id, updates.tenantId!);
      }

      return { success: true, task: this.mapTaskFromDB(data) };

    } catch (error) {
      console.error('Failed to update task:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Complete a task and handle dependencies
   */
  async completeTask(id: string, tenantId: string): Promise<{ success: boolean; unblocked?: string[]; error?: string }> {
    try {
      // Get task details
      const { data: task } = await supabase
        .from('tasks_enhanced')
        .select('*, blocks_tasks')
        .eq('id', id)
        .single();

      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      // Update task status
      const { error } = await supabase
        .from('tasks_enhanced')
        .update({
          status: 'completed',
          completed_date: new Date().toISOString(),
          progress_percentage: 100,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      // Check if this task was blocking others
      const unblocked: string[] = [];
      if (task.blocks_tasks && task.blocks_tasks.length > 0) {
        for (const blockedTaskId of task.blocks_tasks) {
          // Check if all dependencies are now complete
          const { data: blockedTask } = await supabase
            .from('tasks_enhanced')
            .select('depends_on')
            .eq('id', blockedTaskId)
            .single();

          if (blockedTask?.depends_on) {
            const { data: dependencies } = await supabase
              .from('tasks_enhanced')
              .select('id, status')
              .in('id', blockedTask.depends_on);

            const allComplete = dependencies?.every((dep) => dep.status === 'completed');

            if (allComplete) {
              // Unblock the task
              await supabase
                .from('tasks_enhanced')
                .update({
                  status: 'pending',
                  blocking_reason: null,
                })
                .eq('id', blockedTaskId);

              unblocked.push(blockedTaskId);
            }
          }
        }
      }

      // Add completion comment
      await this.addComment(id, task.assigned_to || 'system', {
        comment: `Task completed`,
        commentType: 'completion',
      });

      // Record to memory
      await memoryService.store(
        'workflow_event',
        `Task completed: ${task.title}`,
        {
          task_id: id,
          duration_hours: task.actual_hours,
          unblocked_tasks: unblocked.length,
        },
        0.7
      );

      // Handle recurring tasks
      if (task.is_recurring && task.recurrence_pattern) {
        await this.createNextRecurrence(task);
      }

      return { success: true, unblocked };

    } catch (error) {
      console.error('Failed to complete task:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get tasks with filtering and sorting
   */
  async getTasks(options: {
    tenantId: string;
    includeSubtasks?: boolean;
    relatedToType?: string;
    relatedToId?: string;
    assignedTo?: string;
    status?: string[];
    excludeStatus?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; tasks?: Task[]; total?: number; error?: string }> {
    try {
      const {
        tenantId,
        relatedToType,
        relatedToId,
        assignedTo,
        status,
        excludeStatus,
        limit = 50,
        offset = 0
      } = options;

      let query = supabase
        .from('tasks_enhanced')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      // Apply filters
      if (status && status.length > 0) {
        query = query.in('status', status);
      }
      if (excludeStatus && excludeStatus.length > 0) {
        query = query.not('status', 'in', `(${excludeStatus.join(',')})`);
      }
      if (assignedTo) {
        query = query.eq('assigned_to', assignedTo);
      }
      if (relatedToType) {
        query = query.eq('related_entity_type', relatedToType);
      }
      if (relatedToId) {
        query = query.eq('related_entity_id', relatedToId);
      }

      // Pagination and sorting
      query = query
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true, nullsFirst: false })
        .range(offset, offset + limit - 1);

      const { data, count, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      const tasks = data?.map((task) => this.mapTaskFromDB(task)) || [];

      return { success: true, tasks, total: count || 0 };

    } catch (error) {
      console.error('Failed to get tasks:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get task statistics and analytics
   */
  async getTaskStatistics(tenantId: string, userId?: string): Promise<TaskStatistics> {
    try {
      let query = supabase
        .from('tasks_enhanced')
        .select('status, priority, due_date, completed_date, estimated_hours, actual_hours')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      if (userId) {
        query = query.eq('assigned_to', userId);
      }

      const { data } = await query;

      if (!data) {
        return {
          total: 0,
          byStatus: {},
          byPriority: {},
          overdue: 0,
          dueToday: 0,
          dueThisWeek: 0,
          completedThisWeek: 0,
          avgCompletionTime: 0,
          avgEstimationAccuracy: 0,
        };
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const byStatus: Record<string, number> = {};
      const byPriority: Record<string, number> = {};
      let overdue = 0;
      let dueToday = 0;
      let dueThisWeek = 0;
      let completedThisWeek = 0;
      let totalCompletionTime = 0;
      let totalEstimationAccuracy = 0;
      let accuracyCount = 0;

      for (const task of data) {
        // Count by status
        byStatus[task.status] = (byStatus[task.status] || 0) + 1;

        // Count by priority
        byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;

        // Due date checks
        if (task.due_date) {
          const dueDate = new Date(task.due_date);
          if (dueDate < now && task.status !== 'completed') {
            overdue++;
          }
          if (dueDate >= today && dueDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)) {
            dueToday++;
          }
          if (dueDate >= today && dueDate < weekFromNow) {
            dueThisWeek++;
          }
        }

        // Completed this week
        if (task.completed_date) {
          const completedDate = new Date(task.completed_date);
          if (completedDate >= weekAgo) {
            completedThisWeek++;
          }
        }

        // Completion time
        if (task.actual_hours) {
          totalCompletionTime += task.actual_hours;
        }

        // Estimation accuracy
        if (task.estimated_hours && task.actual_hours) {
          const accuracy = 1 - Math.abs(task.estimated_hours - task.actual_hours) / task.estimated_hours;
          totalEstimationAccuracy += accuracy;
          accuracyCount++;
        }
      }

      return {
        total: data.length,
        byStatus,
        byPriority,
        overdue,
        dueToday,
        dueThisWeek,
        completedThisWeek,
        avgCompletionTime: data.length > 0 ? totalCompletionTime / data.length : 0,
        avgEstimationAccuracy: accuracyCount > 0 ? totalEstimationAccuracy / accuracyCount : 0,
      };

    } catch (error) {
      console.error('Failed to get task statistics:', error);
      return {
        total: 0,
        byStatus: {},
        byPriority: {},
        overdue: 0,
        dueToday: 0,
        dueThisWeek: 0,
        completedThisWeek: 0,
        avgCompletionTime: 0,
        avgEstimationAccuracy: 0,
      };
    }
  }

  /**
   * Add a comment to a task
   */
  async addComment(
    taskId: string,
    userId: string,
    comment: { comment: string; commentType?: string; metadata?: any }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('task_comments').insert([{
        task_id: taskId,
        user_id: userId,
        comment: comment.comment,
        comment_type: comment.commentType || 'comment',
        metadata: comment.metadata,
      }]);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error) {
      console.error('Failed to add comment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * AI-powered task analysis
   */
  private async analyzeTaskWithAI(task: Partial<Task>): Promise<{ priorityScore: number; confidence: number }> {
    try {
      // Use AI Orchestrator to analyze task importance
      const analysis = await aiOrchestrator.callAgent('marcus',
        `Analyze this task and rate its priority:\n` +
        `Title: ${task.title}\n` +
        `Description: ${task.description || 'None'}\n` +
        `Category: ${task.category || 'General'}\n` +
        `Related to: ${task.relatedEntityType} ${task.relatedEntityId || ''}`,
        {
          task,
          analysis_type: 'priority_scoring',
        }
      );

      // Extract priority score from AI response (0.0 to 1.0)
      const analysisObject = ensureJsonObject(analysis as JsonValue | undefined);
      const scoreValue =
        analysisObject.priority_score ??
        analysisObject.score ??
        analysisObject.importance ??
        analysisObject.confidence;
      const parsedScore =
        typeof scoreValue === 'number'
          ? scoreValue
          : typeof scoreValue === 'string'
            ? Number.parseFloat(scoreValue)
            : undefined;
      const priorityScore = parsedScore !== undefined && Number.isFinite(parsedScore)
        ? Math.min(Math.max(parsedScore, 0), 1)
        : 0.5;
      const confidence = 0.75; // Base confidence in AI analysis

      return { priorityScore, confidence };

    } catch (error) {
      console.error('AI task analysis failed:', error);
      // Fallback to rule-based scoring
      let priorityScore = 0.5;
      if (task.priority === 'critical') priorityScore = 1.0;
      else if (task.priority === 'high') priorityScore = 0.8;
      else if (task.priority === 'medium') priorityScore = 0.5;
      else if (task.priority === 'low') priorityScore = 0.3;

      return { priorityScore, confidence: 0.5 };
    }
  }

  /**
   * Create automatic reminders for a task
   */
  private async createTaskReminders(taskId: string, dueDate: string, tenantId: string): Promise<void> {
    try {
      const due = new Date(dueDate);
      const reminders = [
        { hours: 24, message: '1 day until task due' },
        { hours: 4, message: '4 hours until task due' },
        { hours: 1, message: '1 hour until task due' },
      ];

      for (const reminder of reminders) {
        const remindAt = new Date(due.getTime() - reminder.hours * 60 * 60 * 1000);
        if (remindAt > new Date()) {
          await supabase.from('reminders_enhanced').insert([{
            title: `Task Reminder: ${reminder.message}`,
            message: reminder.message,
            reminder_type: 'task_due',
            related_entity_type: 'task',
            related_entity_id: taskId,
            remind_at: remindAt.toISOString(),
            tenant_id: tenantId,
          }]);
        }
      }
    } catch (error) {
      console.error('Failed to create task reminders:', error);
    }
  }

  /**
   * Create next occurrence for recurring task
   */
  private async createNextRecurrence(task: any): Promise<void> {
    try {
      const pattern = task.recurrence_pattern;
      const nextDate = new Date();

      // Calculate next occurrence based on pattern
      if (pattern.frequency === 'daily') {
        nextDate.setDate(nextDate.getDate() + (pattern.interval || 1));
      } else if (pattern.frequency === 'weekly') {
        nextDate.setDate(nextDate.getDate() + 7 * (pattern.interval || 1));
      } else if (pattern.frequency === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + (pattern.interval || 1));
      }

      // Create new task instance
      await this.createTask({
        ...task,
        id: undefined,
        status: 'pending',
        progressPercentage: 0,
        startDate: undefined,
        completedDate: undefined,
        dueDate: nextDate.toISOString(),
        parentTaskId: task.id,
      });

    } catch (error) {
      console.error('Failed to create next recurrence:', error);
    }
  }

  /**
   * Map database record to Task interface
   */
  private mapTaskFromDB(data: any): Task {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      category: data.category,
      relatedEntityType: data.related_entity_type,
      relatedEntityId: data.related_entity_id,
      parentTaskId: data.parent_task_id,
      assignedTo: data.assigned_to,
      assignedBy: data.assigned_by,
      ownerId: data.owner_id,
      estimatedHours: data.estimated_hours,
      actualHours: data.actual_hours,
      dueDate: data.due_date,
      startDate: data.start_date,
      completedDate: data.completed_date,
      progressPercentage: data.progress_percentage,
      blockingReason: data.blocking_reason,
      aiGenerated: data.ai_generated,
      aiAgentName: data.ai_agent_name,
      aiConfidence: data.ai_confidence,
      aiPriorityScore: data.ai_priority_score,
      isRecurring: data.is_recurring,
      recurrencePattern: data.recurrence_pattern,
      nextOccurrenceDate: data.next_occurrence_date,
      dependsOn: data.depends_on,
      blocksTasks: data.blocks_tasks,
      reminderEnabled: data.reminder_enabled,
      reminderConfig: data.reminder_config,
      tags: data.tags,
      customFields: data.custom_fields,
      attachments: data.attachments,
      tenantId: data.tenant_id,
      orgId: data.org_id,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

// Export singleton instance
export const taskManagementEngine = new TaskManagementEngine();
