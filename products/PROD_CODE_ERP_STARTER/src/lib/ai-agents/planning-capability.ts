/**
 * Planning Capability
 * Enables AI agents to decompose complex tasks and create execution plans
 *
 * This implements the Planning Pattern from agentic AI design patterns,
 * allowing agents to break down complex goals into manageable subtasks.
 */

import { aiOrchestrator } from '../ai-orchestrator';
import type { JsonValue } from '@/types/json';
import { ensureJsonObject, isJsonObject } from '@/types/json';

export interface Subtask {
  id: string;
  description: string;
  estimatedHours: number;
  dependencies: string[]; // IDs of subtasks that must complete first
  assignedAgent?: string;
  resources?: {
    crew?: string[];
    materials?: string[];
    equipment?: string[];
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
}

export interface ExecutionPlan {
  goal: string;
  subtasks: Subtask[];
  estimatedDuration: number; // Total hours
  criticalPath: string[]; // IDs of subtasks on critical path
  parallelizableGroups: string[][]; // Groups that can run in parallel
  resourceRequirements: {
    totalCrewHours: number;
    materials: string[];
    equipment: string[];
  };
}

export interface PlanningOptions {
  maxSubtasks?: number;
  considerResources?: boolean;
  optimizeForSpeed?: boolean;
  optimizeForCost?: boolean;
}

const toNumber = (value: JsonValue | undefined, fallback: number): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const toStringArray = (value: JsonValue | undefined): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
};

const mergeStringArrays = (existing?: string[], incoming?: string[]): string[] | undefined => {
  if (!incoming?.length && !existing?.length) {
    return undefined;
  }

  if (!incoming?.length) {
    return existing;
  }

  if (!existing?.length) {
    return incoming;
  }

  return Array.from(new Set([...existing, ...incoming]));
};

const isPriorityValue = (value: string | undefined): value is Subtask['priority'] => {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'critical';
};

const isStatusValue = (value: string | undefined): value is Subtask['status'] => {
  return value === 'pending' || value === 'in_progress' || value === 'completed' || value === 'blocked';
};

const getJsonValue = (object: Record<string, JsonValue>, key: string): JsonValue | undefined => {
  return key in object ? (object[key] as JsonValue) : undefined;
};

const normalizeResources = (value: JsonValue | undefined): Subtask['resources'] | undefined => {
  if (!isJsonObject(value)) {
    return undefined;
  }

  const crew = toStringArray(getJsonValue(value, 'crew'));
  const materials = toStringArray(getJsonValue(value, 'materials'));
  const equipment = toStringArray(getJsonValue(value, 'equipment'));

  if (!crew.length && !materials.length && !equipment.length) {
    return undefined;
  }

  return {
    crew: crew.length ? crew : undefined,
    materials: materials.length ? materials : undefined,
    equipment: equipment.length ? equipment : undefined
  };
};

export class PlanningCapability {
  /**
   * Decompose complex goal into structured execution plan
   */
  async decomposeAndPlan(
    goal: string,
    context: any,
    options: PlanningOptions = {}
  ): Promise<ExecutionPlan> {
    const {
      maxSubtasks = 20,
      considerResources = true,
      optimizeForSpeed = false,
      optimizeForCost = false
    } = options;

    try {
      // Use Victoria (planning expert) to decompose goal
      const decomposition = await this.decompose(goal, context, maxSubtasks);

      // Analyze dependencies
      const withDependencies = await this.analyzeDependencies(decomposition);

      // Estimate resources if requested
      const withResources = considerResources
        ? await this.estimateResources(withDependencies, context)
        : withDependencies;

      // Optimize execution order
      const optimized = await this.optimizeExecution(
        withResources,
        { optimizeForSpeed, optimizeForCost }
      );

      // Calculate critical path
      const criticalPath = this.findCriticalPath(optimized);

      // Find parallelizable groups
      const parallelizableGroups = this.findParallelizableGroups(optimized);

      // Calculate totals
      const estimatedDuration = this.calculateTotalDuration(optimized, criticalPath);
      const resourceRequirements = this.calculateResourceRequirements(optimized);

      return {
        goal,
        subtasks: optimized,
        estimatedDuration,
        criticalPath,
        parallelizableGroups,
        resourceRequirements
      };

    } catch (error) {
      console.error('Planning error:', error);

      // Fallback: simple decomposition
      return {
        goal,
        subtasks: [{
          id: '1',
          description: goal,
          estimatedHours: 8,
          dependencies: [],
          priority: 'high',
          status: 'pending'
        }],
        estimatedDuration: 8,
        criticalPath: ['1'],
        parallelizableGroups: [['1']],
        resourceRequirements: {
          totalCrewHours: 8,
          materials: [],
          equipment: []
        }
      };
    }
  }

  /**
   * Decompose goal into subtasks using AI
   */
  private async decompose(
    goal: string,
    context: any,
    maxSubtasks: number
  ): Promise<Subtask[]> {
    try {
      const result = await aiOrchestrator.callAgent(
        'victoria', // Victoria for planning and scheduling
        'decompose_task',
        {
          goal,
          context,
          max_subtasks: maxSubtasks,
          analysis_type: 'task_decomposition'
        }
      );

      const data = ensureJsonObject(result.data as JsonValue | undefined);
      const subtasksValue = getJsonValue(data, 'subtasks');
      const subtasksArray = Array.isArray(subtasksValue) ? subtasksValue : [];

      return subtasksArray.map((taskValue, index) => {
        const taskData = isJsonObject(taskValue) ? taskValue : {};
        const descriptionValue = getJsonValue(taskData, 'description');
        const estimatedHoursValue =
          getJsonValue(taskData, 'estimated_hours') ?? getJsonValue(taskData, 'estimatedHours');
        const dependenciesValue = getJsonValue(taskData, 'dependencies');
        const priorityValueRaw = getJsonValue(taskData, 'priority');
        const statusValueRaw = getJsonValue(taskData, 'status');
        const assignedAgentValue =
          getJsonValue(taskData, 'assigned_agent') ?? getJsonValue(taskData, 'assignedAgent');
        const resourcesValue = getJsonValue(taskData, 'resources');

        const description =
          typeof descriptionValue === 'string' && descriptionValue.trim().length > 0
            ? descriptionValue
            : `Subtask ${index + 1}`;

        const estimatedHours = Math.max(0, toNumber(estimatedHoursValue, 1));
        const dependencies = toStringArray(dependenciesValue);

        const priorityCandidate =
          typeof priorityValueRaw === 'string' ? priorityValueRaw.toLowerCase() : undefined;
        const priority = isPriorityValue(priorityCandidate) ? priorityCandidate : 'medium';

        const statusCandidate =
          typeof statusValueRaw === 'string' ? statusValueRaw.toLowerCase() : undefined;
        const status = isStatusValue(statusCandidate) ? statusCandidate : 'pending';

        const assignedAgent =
          typeof assignedAgentValue === 'string' && assignedAgentValue.trim().length > 0
            ? assignedAgentValue
            : undefined;

        const resources = normalizeResources(resourcesValue);

        return {
          id: `task_${index + 1}`,
          description,
          estimatedHours,
          dependencies,
          priority,
          status,
          assignedAgent,
          resources
        };
      });

    } catch (error) {
      console.error('Decomposition error:', error);

      // Fallback: single task
      return [{
        id: 'task_1',
        description: goal,
        estimatedHours: 4,
        dependencies: [],
        priority: 'medium',
        status: 'pending'
      }];
    }
  }

  /**
   * Analyze dependencies between subtasks
   */
  private async analyzeDependencies(subtasks: Subtask[]): Promise<Subtask[]> {
    try {
      const result = await aiOrchestrator.callAgent(
        'marcus', // Marcus for analytical review
        'analyze_dependencies',
        {
          subtasks: subtasks.map(t => ({
            id: t.id,
            description: t.description,
            current_dependencies: t.dependencies
          })),
          analysis_type: 'dependency_analysis'
        }
      );

      const data = ensureJsonObject(result.data as JsonValue | undefined);
      const dependencyMap = ensureJsonObject(getJsonValue(data, 'dependencies') as JsonValue | undefined);

      return subtasks.map(task => ({
        ...task,
        dependencies: (() => {
          const dependencyValue = getJsonValue(dependencyMap, task.id);
          const normalized = toStringArray(dependencyValue);
          return normalized.length ? normalized : task.dependencies || [];
        })()
      }));

    } catch (error) {
      console.error('Dependency analysis error:', error);
      return subtasks; // Return as-is if analysis fails
    }
  }

  /**
   * Estimate resource requirements for each subtask
   */
  private async estimateResources(
    subtasks: Subtask[],
    context: any
  ): Promise<Subtask[]> {
    try {
      const result = await aiOrchestrator.callAgent(
        'elena', // Elena for resource estimation
        'estimate_resources',
        {
          subtasks: subtasks.map(t => ({
            id: t.id,
            description: t.description,
            estimated_hours: t.estimatedHours
          })),
          context,
          analysis_type: 'resource_estimation'
        }
      );

      const data = ensureJsonObject(result.data as JsonValue | undefined);
      const resourceMap = ensureJsonObject(getJsonValue(data, 'resources') as JsonValue | undefined);

      return subtasks.map(task => ({
        ...task,
        resources: (() => {
          const normalized = normalizeResources(getJsonValue(resourceMap, task.id));
          if (!normalized) {
            return task.resources;
          }

          const crew = mergeStringArrays(task.resources?.crew, normalized.crew);
          const materials = mergeStringArrays(task.resources?.materials, normalized.materials);
          const equipment = mergeStringArrays(task.resources?.equipment, normalized.equipment);

          if (!crew && !materials && !equipment) {
            return task.resources;
          }

          return {
            crew,
            materials,
            equipment
          };
        })()
      }));

    } catch (error) {
      console.error('Resource estimation error:', error);
      return subtasks;
    }
  }

  /**
   * Optimize task execution order
   */
  private async optimizeExecution(
    subtasks: Subtask[],
    optimization: { optimizeForSpeed: boolean; optimizeForCost: boolean }
  ): Promise<Subtask[]> {
    const { optimizeForSpeed, optimizeForCost } = optimization;

    // Topological sort based on dependencies
    const sorted = this.topologicalSort(subtasks);

    // Adjust priorities based on optimization goal
    return sorted.map(task => ({
      ...task,
      priority: this.calculateOptimizedPriority(
        task,
        optimizeForSpeed,
        optimizeForCost
      )
    }));
  }

  /**
   * Topological sort for dependency ordering
   */
  private topologicalSort(subtasks: Subtask[]): Subtask[] {
    const taskMap = new Map(subtasks.map(t => [t.id, t]));
    const visited = new Set<string>();
    const result: Subtask[] = [];

    const visit = (taskId: string) => {
      if (visited.has(taskId)) return;

      visited.add(taskId);
      const task = taskMap.get(taskId);

      if (task) {
        // Visit dependencies first
        task.dependencies.forEach(depId => visit(depId));
        result.push(task);
      }
    };

    subtasks.forEach(task => visit(task.id));

    return result;
  }

  /**
   * Calculate optimized priority for task
   */
  private calculateOptimizedPriority(
    task: Subtask,
    optimizeForSpeed: boolean,
    optimizeForCost: boolean
  ): 'low' | 'medium' | 'high' | 'critical' {
    // If on critical path, always high priority
    if (task.dependencies.length === 0 && optimizeForSpeed) {
      return 'high';
    }

    // If optimizing for cost, prioritize low-resource tasks
    if (optimizeForCost && task.estimatedHours <= 2) {
      return 'medium';
    }

    return task.priority;
  }

  /**
   * Find critical path (longest dependency chain)
   */
  private findCriticalPath(subtasks: Subtask[]): string[] {
    const taskMap = new Map(subtasks.map(t => [t.id, t]));
    const pathLengths = new Map<string, number>();

    const calculatePathLength = (taskId: string): number => {
      if (pathLengths.has(taskId)) {
        return pathLengths.get(taskId)!;
      }

      const task = taskMap.get(taskId);
      if (!task) return 0;

      if (task.dependencies.length === 0) {
        pathLengths.set(taskId, task.estimatedHours);
        return task.estimatedHours;
      }

      const maxDepLength = Math.max(
        ...task.dependencies.map(depId => calculatePathLength(depId))
      );

      const totalLength = maxDepLength + task.estimatedHours;
      pathLengths.set(taskId, totalLength);
      return totalLength;
    };

    // Calculate path lengths for all tasks
    subtasks.forEach(task => calculatePathLength(task.id));

    // Find longest path
    const sortedByLength = Array.from(pathLengths.entries())
      .sort((a, b) => b[1] - a[1]);

    // Return tasks on critical path
    const criticalPathIds: string[] = [];
    let currentTask = sortedByLength[0]?.[0];

    while (currentTask) {
      criticalPathIds.push(currentTask);
      const task = taskMap.get(currentTask);

      if (!task || task.dependencies.length === 0) break;

      // Find dependency with longest path
      currentTask = task.dependencies.reduce((longest, depId) => {
        const longestLength = pathLengths.get(longest) || 0;
        const depLength = pathLengths.get(depId) || 0;
        return depLength > longestLength ? depId : longest;
      });
    }

    return criticalPathIds.reverse();
  }

  /**
   * Find groups of tasks that can run in parallel
   */
  private findParallelizableGroups(subtasks: Subtask[]): string[][] {
    const groups: string[][] = [];
    const processed = new Set<string>();
    const taskMap = new Map(subtasks.map(t => [t.id, t]));

    const findParallelGroup = (startTaskId: string): string[] => {
      const group: string[] = [startTaskId];
      const startTask = taskMap.get(startTaskId);

      if (!startTask) return group;

      // Find tasks with same dependencies (can run in parallel)
      subtasks.forEach(task => {
        if (task.id === startTaskId || processed.has(task.id)) return;

        const sameDependencies =
          task.dependencies.length === startTask.dependencies.length &&
          task.dependencies.every(dep => startTask.dependencies.includes(dep));

        if (sameDependencies) {
          group.push(task.id);
        }
      });

      return group;
    };

    subtasks.forEach(task => {
      if (!processed.has(task.id)) {
        const group = findParallelGroup(task.id);
        group.forEach(id => processed.add(id));
        groups.push(group);
      }
    });

    return groups;
  }

  /**
   * Calculate total duration based on critical path
   */
  private calculateTotalDuration(
    subtasks: Subtask[],
    criticalPath: string[]
  ): number {
    const taskMap = new Map(subtasks.map(t => [t.id, t]));

    return criticalPath.reduce((total, taskId) => {
      const task = taskMap.get(taskId);
      return total + (task?.estimatedHours || 0);
    }, 0);
  }

  /**
   * Calculate total resource requirements
   */
  private calculateResourceRequirements(subtasks: Subtask[]) {
    const totalCrewHours = subtasks.reduce((sum, task) => sum + task.estimatedHours, 0);

    const allMaterials = new Set<string>();
    const allEquipment = new Set<string>();

    subtasks.forEach(task => {
      task.resources?.materials?.forEach(m => allMaterials.add(m));
      task.resources?.equipment?.forEach(e => allEquipment.add(e));
    });

    return {
      totalCrewHours,
      materials: Array.from(allMaterials),
      equipment: Array.from(allEquipment)
    };
  }

  /**
   * Quick plan (simplified, faster version)
   */
  async quickPlan(goal: string, context: any): Promise<ExecutionPlan> {
    return this.decomposeAndPlan(goal, context, {
      maxSubtasks: 5,
      considerResources: false,
      optimizeForSpeed: true
    });
  }
}

// Singleton instance
export const planningCapability = new PlanningCapability();
