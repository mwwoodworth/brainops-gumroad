/**
 * WEATHERCRAFT ERP - CLICKUP-STYLE TASK MANAGEMENT SYSTEM
 * Hierarchical task system with dependencies, progress tracking, and automation
 *
 * Hierarchy:
 * Epic → Task → Subtask → Checklist Item
 *
 * Features:
 * - Parent-child relationships
 * - Dependencies (blocks/blocked by)
 * - Progress auto-calculation
 * - Priority levels
 * - Status tracking
 * - Assignees
 * - Due dates with reminders
 * - Tags/labels
 * - Time tracking
 * - Comments/activity log
 */

export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'completed' | 'cancelled';
export type TaskType = 'epic' | 'task' | 'subtask' | 'checklist';

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  description?: string;

  // Hierarchy
  parent_id?: string;
  children?: Task[];
  order: number; // For sorting within same parent

  // Status & Progress
  status: TaskStatus;
  priority: TaskPriority;
  progress: number; // 0-100, auto-calculated from children

  // Dependencies
  depends_on?: string[]; // Task IDs this task depends on
  blocks?: string[]; // Task IDs this task blocks

  // Assignment
  assignee_ids?: string[];
  assignees?: { id: string; name: string; avatar?: string }[];

  // Dates
  created_at: Date;
  updated_at: Date;
  due_date?: Date;
  start_date?: Date;
  completed_at?: Date;

  // Metadata
  tags?: string[];
  labels?: { id: string; name: string; color: string }[];

  // Time tracking
  estimated_hours?: number;
  actual_hours?: number;
  time_entries?: TimeEntry[];

  // Attachments
  attachments?: Attachment[];

  // Job/Customer linkage
  job_id?: string;
  customer_id?: string;

  // Automation
  auto_close_on_children?: boolean; // Auto-complete when all children done
  notify_on_status_change?: boolean;

  // Comments/Activity
  comments_count?: number;
  watchers?: string[]; // User IDs watching for updates
}

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  started_at: Date;
  ended_at?: Date;
  hours: number;
  description?: string;
  billable: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploaded_by: string;
  uploaded_at: Date;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  content: string;
  created_at: Date;
  updated_at?: Date;
  mentions?: string[]; // User IDs mentioned in comment
}

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_id: string;
  type: 'blocks' | 'blocked_by';
  created_at: Date;
}

/**
 * Calculate progress percentage from children tasks
 */
export function calculateProgress(task: Task, allTasks: Task[]): number {
  // If task has no children, progress based on status
  const children = allTasks.filter(t => t.parent_id === task.id);

  if (children.length === 0) {
    switch (task.status) {
      case 'completed':
        return 100;
      case 'in_review':
        return 90;
      case 'in_progress':
        return task.progress || 50;
      case 'todo':
        return 10;
      case 'backlog':
        return 0;
      case 'blocked':
        return task.progress || 0;
      case 'cancelled':
        return 0;
      default:
        return 0;
    }
  }

  // Calculate from children
  const totalProgress = children.reduce((sum, child) => {
    return sum + calculateProgress(child, allTasks);
  }, 0);

  return Math.round(totalProgress / children.length);
}

/**
 * Check if task can be started (all dependencies completed)
 */
export function canStartTask(task: Task, allTasks: Task[]): {
  canStart: boolean;
  blockingTasks: Task[];
} {
  if (!task.depends_on || task.depends_on.length === 0) {
    return { canStart: true, blockingTasks: [] };
  }

  const blockingTasks = task.depends_on
    .map(depId => allTasks.find(t => t.id === depId))
    .filter((t): t is Task => t !== undefined && t.status !== 'completed');

  return {
    canStart: blockingTasks.length === 0,
    blockingTasks,
  };
}

/**
 * Get all tasks that would be blocked if this task is not completed
 */
export function getBlockedTasks(taskId: string, allTasks: Task[]): Task[] {
  return allTasks.filter(t => t.depends_on?.includes(taskId) && t.status !== 'completed');
}

/**
 * Build task tree from flat list
 */
export function buildTaskTree(tasks: Task[]): Task[] {
  const taskMap = new Map<string, Task>();
  const roots: Task[] = [];

  // Create map
  tasks.forEach(task => {
    taskMap.set(task.id, { ...task, children: [] });
  });

  // Build tree
  tasks.forEach(task => {
    const taskNode = taskMap.get(task.id)!;

    if (task.parent_id) {
      const parent = taskMap.get(task.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(taskNode);
      } else {
        roots.push(taskNode);
      }
    } else {
      roots.push(taskNode);
    }
  });

  // Sort children by order
  const sortChildren = (task: Task) => {
    if (task.children && task.children.length > 0) {
      task.children.sort((a, b) => a.order - b.order);
      task.children.forEach(sortChildren);
    }
  };

  roots.forEach(sortChildren);
  roots.sort((a, b) => a.order - b.order);

  return roots;
}

/**
 * Get all ancestor tasks (parent, grandparent, etc.)
 */
export function getAncestors(taskId: string, allTasks: Task[]): Task[] {
  const ancestors: Task[] = [];
  let currentTask = allTasks.find(t => t.id === taskId);

  while (currentTask?.parent_id) {
    const parent = allTasks.find(t => t.id === currentTask!.parent_id);
    if (!parent) break;
    ancestors.push(parent);
    currentTask = parent;
  }

  return ancestors;
}

/**
 * Get all descendant tasks (children, grandchildren, etc.)
 */
export function getDescendants(taskId: string, allTasks: Task[]): Task[] {
  const descendants: Task[] = [];
  const children = allTasks.filter(t => t.parent_id === taskId);

  children.forEach(child => {
    descendants.push(child);
    descendants.push(...getDescendants(child.id, allTasks));
  });

  return descendants;
}

/**
 * Get critical path (longest dependency chain)
 */
export function getCriticalPath(tasks: Task[]): Task[] {
  const visited = new Set<string>();
  const path: Task[] = [];
  let longestPath: Task[] = [];

  const dfs = (taskId: string, currentPath: Task[]) => {
    if (visited.has(taskId)) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    visited.add(taskId);
    currentPath.push(task);

    if (currentPath.length > longestPath.length) {
      longestPath = [...currentPath];
    }

    const blockedTasks = getBlockedTasks(taskId, tasks);
    blockedTasks.forEach(blocked => {
      dfs(blocked.id, currentPath);
    });

    currentPath.pop();
    visited.delete(taskId);
  };

  // Start from tasks with no dependencies
  tasks
    .filter(t => !t.depends_on || t.depends_on.length === 0)
    .forEach(t => dfs(t.id, []));

  return longestPath;
}

/**
 * Detect circular dependencies
 */
export function detectCircularDependencies(tasks: Task[]): {
  hasCircular: boolean;
  cycles: string[][];
} {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const dfs = (taskId: string, path: string[]): boolean => {
    visited.add(taskId);
    recursionStack.add(taskId);
    path.push(taskId);

    const task = tasks.find(t => t.id === taskId);
    if (!task?.depends_on) {
      recursionStack.delete(taskId);
      return false;
    }

    for (const depId of task.depends_on) {
      if (!visited.has(depId)) {
        if (dfs(depId, [...path])) {
          return true;
        }
      } else if (recursionStack.has(depId)) {
        // Found cycle
        const cycleStart = path.indexOf(depId);
        cycles.push(path.slice(cycleStart));
        return true;
      }
    }

    recursionStack.delete(taskId);
    return false;
  };

  tasks.forEach(task => {
    if (!visited.has(task.id)) {
      dfs(task.id, []);
    }
  });

  return {
    hasCircular: cycles.length > 0,
    cycles,
  };
}

/**
 * Get tasks by status (for Kanban board)
 */
export function groupTasksByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const groups: Record<TaskStatus, Task[]> = {
    backlog: [],
    todo: [],
    in_progress: [],
    in_review: [],
    blocked: [],
    completed: [],
    cancelled: [],
  };

  tasks.forEach(task => {
    groups[task.status].push(task);
  });

  return groups;
}

/**
 * Get overdue tasks
 */
export function getOverdueTasks(tasks: Task[]): Task[] {
  const now = new Date();
  return tasks.filter(t =>
    t.due_date &&
    new Date(t.due_date) < now &&
    t.status !== 'completed' &&
    t.status !== 'cancelled'
  );
}

/**
 * Get tasks due soon (within next N days)
 */
export function getTasksDueSoon(tasks: Task[], days: number = 7): Task[] {
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  return tasks.filter(t =>
    t.due_date &&
    new Date(t.due_date) >= now &&
    new Date(t.due_date) <= futureDate &&
    t.status !== 'completed' &&
    t.status !== 'cancelled'
  );
}

/**
 * Calculate estimated completion date based on dependencies and estimated hours
 */
export function calculateEstimatedCompletion(
  task: Task,
  allTasks: Task[],
  hoursPerDay: number = 8
): Date | null {
  if (!task.estimated_hours) return null;

  // Check dependencies
  const { canStart, blockingTasks } = canStartTask(task, allTasks);

  let startDate = new Date();

  // If blocked, start after latest blocking task completes
  if (!canStart && blockingTasks.length > 0) {
    const latestBlocker = blockingTasks.reduce((latest, blocker) => {
      const blockerCompletion = calculateEstimatedCompletion(blocker, allTasks, hoursPerDay);
      if (!blockerCompletion) return latest;
      return blockerCompletion > latest ? blockerCompletion : latest;
    }, startDate);

    startDate = latestBlocker;
  }

  // Add estimated hours
  const daysNeeded = Math.ceil(task.estimated_hours / hoursPerDay);
  const completionDate = new Date(startDate);
  completionDate.setDate(completionDate.getDate() + daysNeeded);

  return completionDate;
}

/**
 * Auto-update parent task when children change
 */
export function updateParentProgress(taskId: string, allTasks: Task[]): Task[] {
  const task = allTasks.find(t => t.id === taskId);
  if (!task?.parent_id) return allTasks;

  const parent = allTasks.find(t => t.id === task.parent_id);
  if (!parent) return allTasks;

  // Calculate new progress
  const newProgress = calculateProgress(parent, allTasks);

  // Check if all children are completed
  const children = allTasks.filter(t => t.parent_id === parent.id);
  const allCompleted = children.every(c => c.status === 'completed');

  // Update parent
  const updatedTasks = allTasks.map(t => {
    if (t.id === parent.id) {
      return {
        ...t,
        progress: newProgress,
        status: allCompleted && parent.auto_close_on_children ? 'completed' : t.status,
        updated_at: new Date(),
        completed_at: allCompleted && parent.auto_close_on_children ? new Date() : t.completed_at,
      };
    }
    return t;
  });

  // Recursively update grandparent
  return updateParentProgress(parent.id, updatedTasks);
}

/**
 * Get task statistics for a list of tasks
 */
export function getTaskStatistics(tasks: Task[]): {
  total: number;
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;
  byType: Record<TaskType, number>;
  completed: number;
  overdue: number;
  dueSoon: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  averageProgress: number;
} {
  const stats = {
    total: tasks.length,
    byStatus: {
      backlog: 0,
      todo: 0,
      in_progress: 0,
      in_review: 0,
      blocked: 0,
      completed: 0,
      cancelled: 0,
    } as Record<TaskStatus, number>,
    byPriority: {
      urgent: 0,
      high: 0,
      normal: 0,
      low: 0,
    } as Record<TaskPriority, number>,
    byType: {
      epic: 0,
      task: 0,
      subtask: 0,
      checklist: 0,
    } as Record<TaskType, number>,
    completed: 0,
    overdue: 0,
    dueSoon: 0,
    totalEstimatedHours: 0,
    totalActualHours: 0,
    averageProgress: 0,
  };

  tasks.forEach(task => {
    stats.byStatus[task.status]++;
    stats.byPriority[task.priority]++;
    stats.byType[task.type]++;

    if (task.status === 'completed') stats.completed++;
    if (task.estimated_hours) stats.totalEstimatedHours += task.estimated_hours;
    if (task.actual_hours) stats.totalActualHours += task.actual_hours;
  });

  stats.overdue = getOverdueTasks(tasks).length;
  stats.dueSoon = getTasksDueSoon(tasks).length;
  stats.averageProgress = tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length;

  return stats;
}
