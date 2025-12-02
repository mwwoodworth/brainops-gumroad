/**
 * Date Utility Functions
 * Helper functions for date calculations and formatting
 */

/**
 * Get the start of the current month (00:00:00)
 * @returns ISO string representing the first moment of the current month
 */
export const startOfMonth = (): string => {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

/**
 * Get the start of the current year (00:00:00 on Jan 1)
 * @returns ISO string representing the first moment of the current year
 */
export const startOfYear = (): string => {
  const date = new Date();
  date.setMonth(0, 1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

/**
 * Get the start of the current week (Sunday at 00:00:00)
 * @returns ISO string representing the first moment of the current week
 */
export const startOfWeek = (): string => {
  const date = new Date();
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

/**
 * Get the start of the current quarter (00:00:00 on first day of quarter)
 * @returns ISO string representing the first moment of the current quarter
 */
export const startOfQuarter = (): string => {
  const date = new Date();
  const currentMonth = date.getMonth();
  const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
  date.setMonth(quarterStartMonth, 1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

/**
 * Get the start of today (00:00:00)
 * @returns ISO string representing the first moment of today
 */
export const startOfToday = (): string => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

/**
 * Get date range based on period string
 * @param period - 'day', 'week', 'month', 'quarter', 'year'
 * @returns Object with start and end ISO strings
 */
export const getDateRange = (period: string): { start: string; end: string } => {
  const end = new Date().toISOString();
  let start: string;

  switch (period) {
    case 'day':
      start = startOfToday();
      break;
    case 'week':
      start = startOfWeek();
      break;
    case 'month':
      start = startOfMonth();
      break;
    case 'quarter':
      start = startOfQuarter();
      break;
    case 'year':
      start = startOfYear();
      break;
    default:
      start = startOfMonth();
  }

  return { start, end };
};

/**
 * Format date for display
 * @param date - Date string or Date object
 * @returns Formatted date string (MM/DD/YYYY)
 */
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US');
};

/**
 * Format currency for display
 * @param value - Numeric value or string
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(numValue);
};

/**
 * Calculate days between two dates
 * @param start - Start date
 * @param end - End date (defaults to today)
 * @returns Number of days
 */
export const daysBetween = (start: string | Date, end?: string | Date): number => {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = end ? (typeof end === 'string' ? new Date(end) : end) : new Date();
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
