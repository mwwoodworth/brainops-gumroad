/**
 * Color Coding System
 * Consistent colors for status, priority, and categories
 */

// Status Colors (Jobs, Invoices, Estimates)
export const STATUS_COLORS = {
  // Job Status
  pending: {
    bg: 'bg-gray-700/30',
    text: 'text-gray-300',
    border: 'border-gray-600',
    dot: 'bg-gray-400',
  },
  'in-progress': {
    bg: 'bg-gray-600/30',
    text: 'text-gray-200',
    border: 'border-gray-500',
    dot: 'bg-gray-300',
  },
  'in_progress': {
    bg: 'bg-gray-600/30',
    text: 'text-gray-200',
    border: 'border-gray-500',
    dot: 'bg-gray-300',
  },
  completed: {
    bg: 'bg-gray-400/30',
    text: 'text-gray-100',
    border: 'border-gray-400',
    dot: 'bg-gray-200',
  },
  cancelled: {
    bg: 'bg-gray-800/30',
    text: 'text-gray-400',
    border: 'border-gray-700',
    dot: 'bg-gray-500',
  },
  on_hold: {
    bg: 'bg-gray-700/30',
    text: 'text-gray-300',
    border: 'border-gray-600',
    dot: 'bg-gray-400',
  },
  'on-hold': {
    bg: 'bg-gray-700/30',
    text: 'text-gray-300',
    border: 'border-gray-600',
    dot: 'bg-gray-400',
  },

  // Invoice Status
  draft: {
    bg: 'bg-gray-700/30',
    text: 'text-gray-300',
    border: 'border-gray-600',
    dot: 'bg-gray-400',
  },
  sent: {
    bg: 'bg-gray-600/30',
    text: 'text-gray-200',
    border: 'border-gray-500',
    dot: 'bg-gray-300',
  },
  paid: {
    bg: 'bg-gray-400/30',
    text: 'text-gray-100',
    border: 'border-gray-400',
    dot: 'bg-gray-200',
  },
  overdue: {
    bg: 'bg-gray-300/30',
    text: 'text-gray-100',
    border: 'border-gray-300',
    dot: 'bg-gray-200',
  },
  partial: {
    bg: 'bg-gray-500/30',
    text: 'text-gray-200',
    border: 'border-gray-500',
    dot: 'bg-gray-300',
  },
} as const;

// Priority Colors
export const PRIORITY_COLORS = {
  low: {
    bg: 'bg-gray-700/30',
    text: 'text-gray-300',
    border: 'border-gray-600',
    dot: 'bg-gray-400',
  },
  normal: {
    bg: 'bg-gray-600/30',
    text: 'text-gray-200',
    border: 'border-gray-500',
    dot: 'bg-gray-300',
  },
  medium: {
    bg: 'bg-gray-600/30',
    text: 'text-gray-200',
    border: 'border-gray-500',
    dot: 'bg-gray-300',
  },
  high: {
    bg: 'bg-gray-500/30',
    text: 'text-gray-100',
    border: 'border-gray-400',
    dot: 'bg-gray-200',
  },
  urgent: {
    bg: 'bg-gray-300/30',
    text: 'text-white',
    border: 'border-gray-300',
    dot: 'bg-gray-100',
  },
  critical: {
    bg: 'bg-gray-300/30',
    text: 'text-white',
    border: 'border-gray-300',
    dot: 'bg-gray-100',
  },
} as const;

// Helper Functions
export function getStatusColor(status: string) {
  const normalized = status?.toLowerCase().replace(/ /g, '_') || 'pending';
  return STATUS_COLORS[normalized as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;
}

export function getPriorityColor(priority: string) {
  const normalized = priority?.toLowerCase() || 'normal';
  return PRIORITY_COLORS[normalized as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.normal;
}

// Badge Component Helper
export function getStatusBadgeClasses(status: string): string {
  const colors = getStatusColor(status);
  return `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} ${colors.border} border`;
}

export function getPriorityBadgeClasses(priority: string): string {
  const colors = getPriorityColor(priority);
  return `inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`;
}

// Status Dot Component Helper
export function getStatusDotClasses(status: string): string {
  const colors = getStatusColor(status);
  return `inline-block w-2 h-2 rounded-full ${colors.dot}`;
}

// Overdue Indicator
export function getOverdueClasses(daysOverdue: number): string {
  if (daysOverdue === 0) return '';
  if (daysOverdue <= 7) return 'bg-gray-600/30 text-gray-200 border border-gray-500';
  if (daysOverdue <= 30) return 'bg-gray-500/30 text-gray-100 border border-gray-400';
  return 'bg-gray-300/30 text-white border border-gray-300';
}

// Amount Colors (for financial displays)
export function getAmountColor(amount: number): string {
  if (amount >= 100000) return 'text-white font-bold';
  if (amount >= 50000) return 'text-gray-100 font-semibold';
  if (amount >= 10000) return 'text-gray-200 font-medium';
  return 'text-gray-300';
}

// Progress Bar Colors
export function getProgressColor(percentage: number): string {
  if (percentage >= 90) return 'bg-gray-300';
  if (percentage >= 70) return 'bg-gray-400';
  if (percentage >= 40) return 'bg-gray-500';
  return 'bg-gray-600';
}

// Chart Colors (matching system palette)
export const CHART_COLORS = [
  '#9CA3AF', // gray-400
  '#6B7280', // gray-500
  '#A3A3A3', // gray-400 lighter
  '#D4D4D4', // gray-300
  '#E5E5E5', // gray-200
  '#8B8B8B', // custom gray
  '#B8B8B8', // custom light gray
  '#7A7A7A', // custom dark gray
] as const;

// Category Colors (for grouping)
export const CATEGORY_COLORS = {
  residential: { bg: 'bg-gray-600/30', text: 'text-gray-200' },
  commercial: { bg: 'bg-gray-500/30', text: 'text-gray-100' },
  industrial: { bg: 'bg-gray-400/30', text: 'text-gray-100' },
  emergency: { bg: 'bg-gray-300/30', text: 'text-white' },
  maintenance: { bg: 'bg-gray-700/30', text: 'text-gray-300' },
  repair: { bg: 'bg-gray-600/30', text: 'text-gray-200' },
  installation: { bg: 'bg-gray-500/30', text: 'text-gray-100' },
} as const;

export function getCategoryColor(category: string) {
  const normalized = category?.toLowerCase() || 'residential';
  return CATEGORY_COLORS[normalized as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.residential;
}
