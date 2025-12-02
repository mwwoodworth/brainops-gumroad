/**
 * Weathercraft ERP - Unified Theme System
 *
 * Standardized theming for consistent glass morphism design throughout the application.
 * All components should use these theme classes instead of manual Tailwind classes.
 *
 * Created: October 10, 2025
 * Purpose: Eliminate 7+ different theming patterns and enforce consistency
 */

export const theme = {
  /**
   * Cards & Containers
   * Use these for all card-like components, panels, and containers
   */
  card: {
    // Primary card with full glass effect (most common)
    primary: 'glass-card',

    // Secondary card with lighter background
    secondary: 'bg-white/12 backdrop-blur border border-white/10 rounded-lg',

    // Hover state for interactive cards
    hover: 'hover:bg-white/15 transition-colors duration-200',

    // Active/selected state
    active: 'bg-white/18 border-white/20',

    // Darker variant for nested elements
    dark: 'bg-white/[0.08] backdrop-blur border border-white/5 rounded-lg',

    // Gradient variants for data displays and stats
    gradientSubtle: 'p-4 bg-gradient-to-r from-gray-500/10 via-gray-500/10 to-gray-500/10 border border-white/10 rounded-lg',
    gradientPanel: 'p-4 bg-gradient-to-br from-gray-500/10 to-gray-400/10 rounded-lg border border-white/10',
    gradientDark: 'p-4 bg-gradient-to-br from-gray-700/10 to-gray-500/10 rounded-lg border border-white/10',
    gradientMedium: 'p-4 bg-gradient-to-r from-gray-600/10 to-gray-400/10 rounded-lg border border-white/10',
  },

  /**
   * Buttons
   * Use these for all button components
   */
  button: {
    // Primary action button (brand gradient)
    primary: 'btn-primary',

    // Secondary action button
    secondary: 'btn-secondary',

    // Danger/destructive action
    danger: 'px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl',

    // Ghost/subtle button
    ghost: 'px-4 py-2 bg-white/8 hover:bg-white/15 text-gray-300 hover:text-white rounded-lg transition-all duration-200',

    // Success button
    success: 'px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl',

    // Icon-only button
    icon: 'p-2 bg-white/8 hover:bg-white/15 rounded-lg transition-colors duration-200',
  },

  /**
   * Inputs & Form Elements
   * Use these for all form inputs, selects, textareas
   */
  input: {
    // Base input field
    base: 'w-full px-4 py-2.5 bg-white/10 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-400 focus:bg-white/15 transition-all duration-200',

    // Select dropdown
    select: 'w-full px-4 py-2.5 bg-white/10 border border-white/10 rounded-lg text-white focus:outline-none focus:border-gray-400 focus:bg-white/15 transition-all duration-200 appearance-none',

    // Textarea
    textarea: 'w-full px-4 py-2.5 bg-white/10 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-400 focus:bg-white/15 transition-all duration-200 resize-none',

    // Checkbox/Radio
    checkbox: 'w-4 h-4 bg-white/10 border border-white/10 rounded text-gray-400 focus:ring-2 focus:ring-gray-500 focus:ring-offset-0',

    // Input with error
    error: 'w-full px-4 py-2.5 bg-white/10 border border-red-500/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-400 focus:bg-white/15 transition-all duration-200',

    // Input label
    label: 'block text-sm font-medium text-gray-300 mb-2',

    // Helper text
    helper: 'mt-1 text-xs text-gray-400',

    // Error message
    errorMessage: 'mt-1 text-xs text-red-400',
  },

  /**
   * Modals & Dialogs
   * Use these for all modal/dialog components
   */
  modal: {
    // Modal overlay/backdrop
    overlay: 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4',

    // Modal container
    container: 'glass-card rounded-xl p-6 max-w-2xl w-full shadow-2xl',

    // Small modal
    containerSm: 'glass-card rounded-xl p-6 max-w-md w-full shadow-2xl',

    // Large modal
    containerLg: 'glass-card rounded-xl p-6 max-w-4xl w-full shadow-2xl',

    // Modal header
    header: 'flex items-center justify-between mb-6 pb-4 border-b border-white/10',

    // Modal title
    title: 'text-2xl font-bold text-white',

    // Modal body
    body: 'space-y-4',

    // Modal footer
    footer: 'flex gap-3 pt-6 mt-6 border-t border-white/10 justify-end',

    // Close button
    closeButton: 'p-2 hover:bg-white/10 rounded-lg transition-colors duration-200 text-gray-400 hover:text-white',
  },

  /**
   * Text Styles
   * Use these for consistent text styling
   */
  text: {
    // Page heading
    heading: 'text-3xl font-bold text-white',

    // Section heading
    subheading: 'text-xl font-semibold text-white',

    // Body text
    body: 'text-gray-300',

    // Small text
    small: 'text-sm text-gray-400',

    // Muted/secondary text
    muted: 'text-gray-500',

    // Success text
    success: 'text-green-400',

    // Error text
    error: 'text-red-400',

    // Warning text
    warning: 'text-yellow-400',

    // Info text
    info: 'text-blue-400',

    // Link
    link: 'text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer',
  },

  /**
   * Tables
   * Use these for all table components
   */
  table: {
    // Table container
    container: 'glass-card rounded-lg overflow-hidden',

    // Table element
    table: 'w-full',

    // Table header
    header: 'bg-white/10 border-b border-white/10',

    // Table header cell
    th: 'px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider',

    // Table row
    row: 'border-b border-white/5 hover:bg-white/8 transition-colors duration-150',

    // Table cell
    td: 'px-6 py-4 text-sm text-gray-300',
  },

  /**
   * Badges & Pills
   * Use these for status indicators, tags, etc.
   */
  badge: {
    // Base badge
    base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',

    // Success badge
    success: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30',

    // Error badge
    error: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30',

    // Warning badge
    warning: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',

    // Info badge
    info: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30',

    // Neutral badge
    neutral: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30',
  },

  /**
   * Alerts & Notifications
   * Use these for alert boxes and notifications
   */
  alert: {
    // Success alert
    success: 'glass-card border-l-4 border-green-500 p-4 rounded-lg',

    // Error alert
    error: 'glass-card border-l-4 border-red-500 p-4 rounded-lg',

    // Warning alert
    warning: 'glass-card border-l-4 border-yellow-500 p-4 rounded-lg',

    // Info alert
    info: 'glass-card border-l-4 border-blue-500 p-4 rounded-lg',
  },

  /**
   * Dividers
   * Use these for visual separation
   */
  divider: {
    // Horizontal divider
    horizontal: 'border-t border-white/10 my-6',

    // Vertical divider
    vertical: 'border-l border-white/10 mx-4',
  },

  /**
   * Dropdowns & Menus
   * Use these for dropdown menus
   */
  dropdown: {
    // Dropdown container
    container: 'glass-card rounded-lg shadow-xl border border-white/10 py-2 min-w-[200px]',

    // Dropdown item
    item: 'px-4 py-2 text-sm text-gray-300 hover:bg-white/15 hover:text-white transition-colors duration-150 cursor-pointer flex items-center gap-3',

    // Dropdown divider
    divider: 'my-2 border-t border-white/10',
  },

  /**
   * Loading States
   * Use these for loading indicators
   */
  loading: {
    // Spinner
    spinner: 'animate-spin rounded-full border-2 border-gray-600 border-t-white',

    // Skeleton (for content placeholders)
    skeleton: 'animate-pulse bg-white/10 rounded',
  },

  /**
   * Grid & Layout
   * Use these for consistent grid layouts
   */
  grid: {
    // 2-column grid
    cols2: 'grid grid-cols-1 md:grid-cols-2 gap-6',

    // 3-column grid
    cols3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',

    // 4-column grid
    cols4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6',
  },
};

/**
 * Helper function to combine theme classes with custom classes
 * @param themeClass - The theme class to use
 * @param customClass - Additional custom classes (optional)
 * @returns Combined class string
 */
export function cn(themeClass: string, customClass?: string): string {
  return customClass ? `${themeClass} ${customClass}` : themeClass;
}

/**
 * Status color mapping
 * Use this for dynamic status-based coloring
 */
export const statusColors = {
  // Job statuses
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  in_progress: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',

  // Invoice statuses
  draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  sent: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  viewed: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  partial: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  paid: 'bg-green-500/20 text-green-400 border-green-500/30',
  overdue: 'bg-red-500/20 text-red-400 border-red-500/30',

  // Estimate statuses (Leads)
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  expired: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  accepted: 'bg-green-500/20 text-green-400 border-green-500/30',

  // Priority levels
  low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  normal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
  emergency: 'bg-red-600/30 text-red-300 border-red-600/40',
};

export default theme;
