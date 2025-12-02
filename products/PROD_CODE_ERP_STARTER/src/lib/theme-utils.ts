/**
 * Theme Utilities
 * Centralized theme colors and utility functions for consistent UI
 * ALL colors must be in the grey/silver/black spectrum
 */

export const themeColors = {
  // Status colors (all grey variants with different opacities)
  status: {
    success: 'bg-gray-700/20 text-gray-300 border-gray-600/30', // Light grey for positive
    error: 'bg-gray-900/30 text-gray-100 border-gray-500/30',   // Bright white for critical
    warning: 'bg-gray-800/20 text-gray-200 border-gray-500/30', // Medium grey for caution
    info: 'bg-gray-700/10 text-gray-400 border-gray-600/30',    // Darker grey for info
    default: 'bg-gray-800/10 text-gray-500 border-gray-700/30', // Default grey
  },

  // Priority levels (using intensity of grey/white)
  priority: {
    emergency: 'text-white font-bold',           // Pure white for highest priority
    urgent: 'text-gray-100 font-semibold',      // Near white
    high: 'text-gray-200',                      // Light grey
    normal: 'text-gray-400',                    // Standard grey
    low: 'text-gray-500',                       // Dark grey
  },

  // Field status (all grey variants)
  fieldStatus: {
    available: 'bg-gray-700/20 text-gray-300 border-gray-600/30',
    en_route: 'bg-gray-800/20 text-gray-400 border-gray-700/30',
    on_site: 'bg-gray-600/20 text-gray-200 border-gray-500/30',
    break: 'bg-gray-900/10 text-gray-500 border-gray-800/30',
    offline: 'bg-gray-950/30 text-gray-600 border-gray-800/30',
  },

  // Metrics indicators (positive/negative using light/dark)
  metrics: {
    positive: 'text-gray-300',  // Lighter grey for positive
    negative: 'text-gray-600',  // Darker grey for negative
    neutral: 'text-gray-500',   // Medium grey for neutral
  },

  // Icon colors (all grey shades)
  icons: {
    primary: 'text-gray-400',
    secondary: 'text-gray-500',
    accent: 'text-gray-300',
    muted: 'text-gray-600',
  },

  // Gradients (grey spectrum only)
  gradients: {
    primary: 'bg-gradient-to-r from-gray-800 to-gray-900',
    secondary: 'bg-gradient-to-r from-gray-700 to-gray-800',
    subtle: 'bg-gradient-to-r from-gray-900 to-black',
    card: 'bg-gradient-to-br from-gray-800/40 to-gray-900/20',
  },
};

// Status helper functions
export const getStatusColor = (status: string): string => {
  const normalizedStatus = status.toLowerCase().replace(/_/g, '');

  // Map various status strings to theme colors
  const statusMap: Record<string, string> = {
    active: themeColors.status.success,
    completed: themeColors.status.success,
    success: themeColors.status.success,
    available: themeColors.fieldStatus.available,

    pending: themeColors.status.warning,
    inprogress: themeColors.status.warning,
    enroute: themeColors.fieldStatus.en_route,
    onsite: themeColors.fieldStatus.on_site,

    failed: themeColors.status.error,
    error: themeColors.status.error,
    offline: themeColors.fieldStatus.offline,
    cancelled: themeColors.status.error,

    draft: themeColors.status.info,
    scheduled: themeColors.status.info,
    break: themeColors.fieldStatus.break,

    default: themeColors.status.default,
  };

  return statusMap[normalizedStatus] || themeColors.status.default;
};

export const getPriorityColor = (priority: string): string => {
  const normalizedPriority = priority.toLowerCase();
  return themeColors.priority[normalizedPriority as keyof typeof themeColors.priority] || themeColors.priority.normal;
};

export const getMetricChangeColor = (value: number): string => {
  if (value > 0) return themeColors.metrics.positive;
  if (value < 0) return themeColors.metrics.negative;
  return themeColors.metrics.neutral;
};

// Chart colors (grayscale for consistency)
export const chartColors = [
  '#e5e7eb', // gray-200
  '#9ca3af', // gray-400
  '#6b7280', // gray-500
  '#4b5563', // gray-600
  '#374151', // gray-700
  '#1f2937', // gray-800
];

// Consistent component classes
export const componentClasses = {
  card: 'glass-card',
  input: 'glass-input',
  badge: 'glass-badge',
  panel: 'glass-panel',

  // Specific button variants (all grey-based)
  buttonPrimary: 'bg-gray-700 hover:bg-gray-600 text-white',
  buttonSecondary: 'bg-gray-800 hover:bg-gray-700 text-gray-200',
  buttonGhost: 'bg-gray-900/20 hover:bg-gray-800/30 text-gray-400',

  // Status badges
  statusBadge: 'px-2 py-1 rounded-lg text-xs font-medium',
};