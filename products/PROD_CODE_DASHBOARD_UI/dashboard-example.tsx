'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Brain,
  Activity,
  TrendingUp,
  CheckCircle,
  Clock,
  Zap,
  Target,
  Layers,
  Bot,
  Terminal,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Play,
  Square,
  User,
  Calendar,
  Database,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import TaskModal from '@/components/TaskModal';
import LlmConsole from '@/components/LlmConsole';
import AgentDispatchWidget from '@/components/AgentDispatchWidget';
import { BreezyCard, BreezyCardContent, BreezyCardHeader, BreezyCardTitle } from '@/components/ui/breezy-card';
import { BreezyGrid } from '@/components/ui/breezy-grid';
import { MetricTile } from '@/components/ui/metric-tile';
import { ActionChip } from '@/components/ui/action-chip';

import type {
  AgentPerformanceSummary,
  CommandCenterSnapshot,
  DashboardMetricSummary,
  ExecutionEvent,
  MetricTrendPoint,
  OrchestrationSummary,
  SystemHealthEntry,
} from '@/lib/command-center-snapshot';
import type { TaskPriority, UnifiedTask } from '@/lib/task-utils';

export const dynamic = 'force-dynamic';

interface Metrics {
  totalTasks: number;
  completedToday: number;
  inProgress: number;
  blocked: number;
  avgProgress: number;
  totalExecutions: number;
  executionsToday: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgLatencyMs: number;
  productivity: number;
}
type Task = UnifiedTask;

interface Agent {
  id: number;
  name: string;
  status: string;
  type: string;
}

interface Event {
  id: string;
  table: string;
  event: string;
  time: string;
}

interface FinancialMetrics {
  totalRevenue: number;
  mrr: number;
  revenueByChannel: Record<string, number>;
  revenueHistory: { date: string; amount: number }[];
}

interface RegistryEntity {
  id: string;
  type: string;
  name: string;
  status?: string;
  spec?: any;
}

export default function Dashboard() {
  // Initialize with zeros - will be populated from REAL database via API
  const [metrics, setMetrics] = useState<Metrics>({
    totalTasks: 0,
    completedToday: 0,
    inProgress: 0,
    blocked: 0,
    avgProgress: 0,
    totalExecutions: 0,
    executionsToday: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    avgLatencyMs: 0,
    productivity: 0,
  });

  const [financials, setFinancials] = useState<FinancialMetrics>({
    totalRevenue: 0,
    mrr: 0,
    revenueByChannel: {},
    revenueHistory: []
  });

  const [projects, setProjects] = useState<RegistryEntity[]>([]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [filterStatus, setFilterStatus] = useState<Task['status'] | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<Task['priority'] | 'all'>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof Task>('lastWorkedOn');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const buildTaskQueryString = useCallback(() => {
    const params = new URLSearchParams();
    if (filterStatus !== 'all') params.append('status', filterStatus);
    if (filterPriority !== 'all') params.append('priority', filterPriority);
    if (filterAgent !== 'all') params.append('assigned_agent', filterAgent);
    if (filterCategory !== 'all') params.append('category', filterCategory);
    params.append('sort_by', sortField as string);
    params.append('sort_order', sortOrder);
    return params.toString();
  }, [filterStatus, filterPriority, filterAgent, filterCategory, sortField, sortOrder]);

  const [agents, setAgents] = useState<Agent[]>([]);

  const [events, setEvents] = useState<Event[]>([]);

  const [taskSummary, setTaskSummary] = useState<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<TaskPriority, number>;
  }>({
    total: 0,
    byStatus: {},
    byPriority: {
      critical: 0,
      high: 0,
      important: 0,
      medium: 0,
      low: 0,
      enhancement: 0,
    },
  });

  const [agentPerformance, setAgentPerformance] = useState<AgentPerformanceSummary[]>([]);
  const [orchestrations, setOrchestrations] = useState<OrchestrationSummary[]>([]);
  const [executions, setExecutions] = useState<ExecutionEvent[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealthEntry[]>([]);
  const [responseTimeTrend, setResponseTimeTrend] = useState<MetricTrendPoint[]>([]);
  const [summaryMetrics, setSummaryMetrics] = useState<DashboardMetricSummary[]>([]);

  const statusEntries = useMemo(() => Object.entries(taskSummary.byStatus ?? {}), [taskSummary]);
  const priorityEntries = useMemo(
    () => Object.entries(taskSummary.byPriority ?? {}) as [TaskPriority, number][],
    [taskSummary]
  );
  const highlightedMetrics = useMemo(
    () => summaryMetrics.filter((metric) => metric.value !== null).slice(0, 6),
    [summaryMetrics]
  );

  const formatRelativeTime = useCallback((iso: string) => {
    const date = new Date(iso);
    const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return `${Math.floor(diffSeconds / 86400)}d ago`;
  }, []);

  const [loading, setLoading] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const queryString = buildTaskQueryString();
      const [snapshotResponse, tasksResponse, financeResponse, projectsResponse] = await Promise.all([
        fetch('/api/command-center').then(r => r.json()),
        fetch(`/api/tasks-db?${queryString}`).then(r => r.json()),
        fetch('/api/finance/summary').then(r => r.json()),
        fetch('/api/registry?type=Project').then(r => r.json())
      ]);

      const snapshot = snapshotResponse as CommandCenterSnapshot;
      const tasksPayload = tasksResponse as { tasks?: Task[] };
      const finData = financeResponse as FinancialMetrics;
      const projData = projectsResponse as RegistryEntity[];

      if (finData) setFinancials(finData);
      if (Array.isArray(projData)) setProjects(projData);

      if (snapshot?.metrics) {
        setMetrics({
          totalTasks: snapshot.metrics.totalTasks,
          completedToday: snapshot.metrics.completedToday,
          inProgress: snapshot.metrics.inProgress,
          blocked: snapshot.metrics.blocked,
          avgProgress: snapshot.metrics.avgProgress,
          totalExecutions: snapshot.metrics.totalExecutions,
          executionsToday: snapshot.metrics.executionsToday,
          successfulExecutions: snapshot.metrics.successfulExecutions,
          failedExecutions: snapshot.metrics.failedExecutions,
          avgLatencyMs: snapshot.metrics.avgLatencyMs,
          productivity: snapshot.metrics.productivity,
        });

        setTaskSummary(snapshot.taskSummary);
        setAgentPerformance(snapshot.agentPerformance);
        setOrchestrations(snapshot.orchestrations);
        setExecutions(snapshot.executions);
        setSystemHealth(snapshot.systemHealth);
        setResponseTimeTrend(snapshot.metrics.responseTimeTrend);
        setSummaryMetrics(snapshot.metrics.summaryMetrics);
        setEvents(snapshot.events);

        setAgents(
          snapshot.agentPerformance.map((agent, index) => ({
            id: index + 1,
            name: agent.agentName,
            status: agent.successRate >= 95 ? 'elite' : agent.successRate >= 85 ? 'active' : 'attention',
            type: 'AI Agent',
          }))
        );
      }

      setTasks(tasksPayload?.tasks ?? snapshot.tasks ?? []);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [buildTaskQueryString]);

  const handleSaveTask = async (task: Task) => {
    try {
      const devOpsTask = {
        id: task.id,
        task_name: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        progress_percentage: task.progress,
        ai_confidence: task.confidence,
        ai_generated: task.aiGenerated,
        revenue_impact: task.revenue,
        assigned_to: task.assignedTo,
        assigned_agent: task.assignedAgent,
        due_date: task.dueDate,
        session_notes: task.sessionNotes,
        last_worked_on: task.lastWorkedOn,
        category: task.category,
        started_at: task.startedAt,
        completed_at: task.completedAt,
        tags: task.tags,
      };

      const method = selectedTask ? 'PUT' : 'POST';
      const url = selectedTask ? `/api/tasks-db?id=${task.id}` : '/api/tasks-db';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(devOpsTask),
      });

      if (response.ok) {
        await refreshData();
      }
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/tasks-db?id=${taskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await refreshData();
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleCreateTask = () => {
    setSelectedTask(null);
    setIsTaskModalOpen(true);
  };

  const handleQuickStatusChange = async (taskId: string, newStatus: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      const devOpsTask = {
        id: task.id,
        task_name: task.title,
        description: task.description,
        status: newStatus as Task['status'], // Update status
        priority: task.priority,
        progress_percentage: task.progress,
        ai_confidence: task.confidence,
        ai_generated: task.aiGenerated,
        revenue_impact: task.revenue,
        assigned_to: task.assignedTo,
        assigned_agent: task.assignedAgent,
        due_date: task.dueDate,
        session_notes: task.sessionNotes,
        last_worked_on: task.lastWorkedOn,
        category: task.category,
        started_at: task.startedAt,
        completed_at: task.completedAt,
        tags: task.tags,
      };

      const response = await fetch(`/api/tasks-db?id=${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(devOpsTask),
      });

      if (response.ok) {
        await refreshData();
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleRestart = async (service: 'brainops-backend' | 'brainops-ai-agents') => {
    if (!confirm(`Are you sure you want to restart ${service}? This may interrupt active tasks.`)) return;
    
    try {
      const response = await fetch('/api/control/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service }),
      });
      
      if (response.ok) {
        alert(`Restart initiated for ${service}`);
      } else {
        alert('Failed to initiate restart');
      }
    } catch (error) {
      console.error('Restart failed:', error);
      alert('Error initiating restart');
    }
  };

  const handleDispatch = async (agent: string, taskDesc: string) => {
    try {
      await fetch('/api/tasks-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start', 
          task_name: taskDesc.slice(0, 50) + (taskDesc.length > 50 ? '...' : ''),
          description: taskDesc,
          priority: 'high',
          assigned_agent: agent,
          status: 'in_progress'
        })
      });
      await refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setLoading(true);
    refreshData().finally(() => setLoading(false));

    const interval = setInterval(() => {
      refreshData();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshData]);

  return (
    <div className="space-y-6">
      {/* EMPIRE OVERVIEW */}
      <BreezyGrid cols={2}>
        <BreezyCard variant="highlight">
          <BreezyCardHeader>
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 text-emerald-500" />
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Total Revenue</h3>
            </div>
            <p className="text-4xl font-bold text-gray-900 dark:text-white">${financials.totalRevenue.toLocaleString()}</p>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">+${financials.mrr.toLocaleString()} MRR</p>
          </BreezyCardHeader>
        </BreezyCard>
        
        <BreezyGrid cols={1} className="pb-0">
          {projects.slice(0, 3).map(proj => (
            <BreezyCard key={proj.id} className="p-4 flex flex-col justify-between hover:border-cyan-500/30 transition-colors h-full">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-900 dark:text-white truncate" title={proj.name}>{proj.name}</h4>
                  <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-semibold ${proj.status === 'active' || proj.status === 'prod' ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'}`}>
                    {proj.status || 'active'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{proj.spec?.description || 'Core System Project'}</p>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-cyan-500">
                <Activity className="w-3 h-3" />
                <span>System Active</span>
              </div>
            </BreezyCard>
          ))}
        </BreezyGrid>
      </BreezyGrid>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricTile 
          label="Total Tasks" 
          value={metrics.totalTasks} 
          icon={Layers} 
          color="text-cyan-500"
          trend={{ value: metrics.avgProgress, label: 'Progress', positive: true }}
        />
        <MetricTile 
          label="Completed" 
          value={metrics.completedToday} 
          icon={CheckCircle} 
          color="text-green-500"
          trend={{ value: metrics.successfulExecutions, label: 'Executions', positive: true }}
        />
        <MetricTile 
          label="In Progress" 
          value={metrics.inProgress} 
          icon={Clock} 
          color="text-yellow-500"
        />
        <MetricTile 
          label="Executions (24h)" 
          value={metrics.executionsToday} 
          icon={Activity} 
          color="text-blue-500"
        />
        <MetricTile 
          label="Success Rate" 
          value={`${metrics.productivity.toFixed(1)}%`} 
          icon={TrendingUp} 
          color="text-emerald-500"
        />
        <MetricTile 
          label="Avg Latency" 
          value={`${metrics.avgLatencyMs}ms`} 
          icon={Zap} 
          color="text-orange-500"
        />
      </div>

      {/* Quick Operations */}
      <BreezyCard>
        <BreezyCardContent className="flex flex-col md:flex-row items-center justify-between gap-4 p-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Operational Control</h3>
            <p className="text-sm text-gray-500">Direct system intervention</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <ActionChip 
              label="Restart AI Core" 
              icon={Zap} 
              variant="primary"
              onClick={() => handleRestart('brainops-ai-agents')}
            />
            <ActionChip 
              label="Restart Backend" 
              icon={Database} 
              variant="primary"
              onClick={() => handleRestart('brainops-backend')}
            />
            <ActionChip 
              label="New Task" 
              icon={Plus} 
              variant="default"
              className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 border-none"
              onClick={handleCreateTask}
            />
             <ActionChip 
              label="Refresh" 
              icon={RefreshCw} 
              variant="default"
              onClick={refreshData}
              disabled={isRefreshing}
              className={isRefreshing ? "opacity-50 cursor-not-allowed" : ""}
            />
          </div>
        </BreezyCardContent>
      </BreezyCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Intelligence Stream */}
        <div className="lg:col-span-2 space-y-6">
          <BreezyCard className="h-[600px] flex flex-col">
            <BreezyCardHeader className="border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <Target className="w-6 h-6 text-cyan-500" />
                  Active Intelligence Stream
                </h2>
                <div className="flex gap-2">
                   {/* Filter chips could go here */}
                </div>
              </div>
            </BreezyCardHeader>
            <BreezyCardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Target className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg mb-2">No tasks yet</p>
                  <p className="text-sm">Create your first task to get started</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="p-4 border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => handleEditTask(task)}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-cyan-500 transition-colors">{task.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{task.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${
                          task.priority === 'critical' ? 'bg-red-500/10 text-red-500' :
                          'bg-gray-100 dark:bg-white/10 text-gray-500'
                        }`}>
                          {task.priority}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
                      {task.assignedAgent && (
                        <span className="flex items-center gap-1 text-purple-500">
                          <Bot className="w-3 h-3" /> {task.assignedAgent}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      <div className="flex-1" />
                      <div className="flex items-center gap-2">
                        <span>{task.progress}%</span>
                        <div className="w-12 h-1 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500" style={{ width: `${task.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </BreezyCardContent>
          </BreezyCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* System Health */}
          <BreezyCard>
            <BreezyCardHeader className="border-b border-gray-100 dark:border-white/5 py-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                System Health
              </h2>
            </BreezyCardHeader>
            <BreezyCardContent className="p-0">
              <div className="divide-y divide-gray-100 dark:divide-white/5 max-h-[300px] overflow-y-auto">
                {systemHealth.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-6">No data</p>
                ) : (
                  systemHealth.slice(0, 5).map((entry) => (
                    <div key={`${entry.component}-${entry.lastCheckAt}`} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{entry.component}</p>
                        <p className="text-xs text-gray-500">{entry.responseTimeMs}ms • {entry.errorCount} err</p>
                      </div>
                      <div className={`w-2.5 h-2.5 rounded-full ${
                         entry.status === 'operational' ? 'bg-emerald-500' : 
                         entry.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                    </div>
                  ))
                )}
              </div>
            </BreezyCardContent>
          </BreezyCard>

          {/* AI Agents */}
          <BreezyCard>
            <BreezyCardHeader className="border-b border-gray-100 dark:border-white/5 py-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-500" />
                AI Agents
              </h2>
            </BreezyCardHeader>
             <BreezyCardContent className="p-0">
              <div className="divide-y divide-gray-100 dark:divide-white/5 max-h-[300px] overflow-y-auto">
                {agentPerformance.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-6">No agent data</p>
                ) : (
                  agentPerformance.slice(0, 6).map((agent) => (
                    <div key={agent.agentId} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                       <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{agent.agentName}</p>
                        <p className="text-xs text-gray-500">{agent.executionCount} runs</p>
                      </div>
                      <span className={`text-xs font-bold ${
                         agent.successRate >= 95 ? 'text-green-500' : 'text-yellow-500'
                      }`}>
                        {agent.successRate.toFixed(0)}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            </BreezyCardContent>
          </BreezyCard>
        </div>
      </div>
      
      <BreezyGrid cols={2}>
         <BreezyCard>
            <BreezyCardHeader className="py-4 border-b border-gray-100 dark:border-white/5">
               <h2 className="text-lg font-bold flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-gray-500" />
                  Recent Activity
               </h2>
            </BreezyCardHeader>
            <BreezyCardContent className="p-0">
               <div className="divide-y divide-gray-100 dark:divide-white/5 max-h-[200px] overflow-y-auto">
                  {executions.slice(0, 5).map((ex) => (
                     <div key={ex.id} className="p-4 text-sm flex justify-between hover:bg-gray-50 dark:hover:bg-white/5">
                        <span className="text-gray-700 dark:text-gray-300">{ex.agentType}</span>
                        <span className="text-gray-400 text-xs">{formatRelativeTime(ex.createdAt)}</span>
                     </div>
                  ))}
               </div>
            </BreezyCardContent>
         </BreezyCard>

         <BreezyCard>
            <BreezyCardHeader className="py-4 border-b border-gray-100 dark:border-white/5">
               <h2 className="text-lg font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-orange-500" />
                  Performance Trend
               </h2>
            </BreezyCardHeader>
            <BreezyCardContent className="h-[200px] p-4">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={responseTimeTrend}>
                     <defs>
                        <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                           <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                        </linearGradient>
                     </defs>
                     <Area type="monotone" dataKey="value" stroke="#38bdf8" fill="url(#colorLatency)" strokeWidth={2} />
                  </AreaChart>
               </ResponsiveContainer>
            </BreezyCardContent>
         </BreezyCard>
      </BreezyGrid>

      {/** LLM Consoles */}
      <div className="mt-8">
        <LlmConsole />
      </div>
      
      <AgentDispatchWidget onDispatch={handleDispatch} loading={isRefreshing} />
      
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        task={selectedTask}
        onSave={handleSaveTask}
      />
    </div>
  );
}
