/**
 * CSV Export Utility
 * Week 12: Enterprise Polish & Launch
 * Export data to CSV format with proper escaping
 */

/**
 * Convert array of objects to CSV format
 */
export function convertToCSV<T extends Record<string, any>>(
  data: T[],
  columns?: { key: keyof T; label: string }[]
): string {
  if (data.length === 0) {
    return '';
  }

  // Determine columns
  const cols = columns || Object.keys(data[0]).map((key) => ({ key, label: key }));

  // Create header row
  const header = cols.map((col) => escapeCSVValue(col.label)).join(',');

  // Create data rows
  const rows = data.map((row) =>
    cols
      .map((col) => {
        const value = row[col.key];
        return escapeCSVValue(formatValue(value));
      })
      .join(',')
  );

  return [header, ...rows].join('\n');
}

/**
 * Escape a value for CSV format
 */
function escapeCSVValue(value: string): string {
  if (value == null) return '';

  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Format value for CSV output
 */
function formatValue(value: any): string {
  if (value == null) return '';

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
}

/**
 * Export data to CSV file
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
): void {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const csv = convertToCSV(data, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.URL.revokeObjectURL(url);
}

/**
 * Export customers to CSV
 */
export function exportCustomersToCSV(customers: any[]): void {
  const columns = [
    { key: 'name', label: 'Customer Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
    { key: 'total_revenue', label: 'Total Revenue' },
    { key: 'total_jobs', label: 'Total Jobs' },
    { key: 'created_at', label: 'Created Date' },
  ];

  exportToCSV(customers, 'customers', columns);
}

/**
 * Export jobs to CSV
 */
export function exportJobsToCSV(jobs: any[]): void {
  const columns = [
    { key: 'job_number', label: 'Job Number' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'project_type', label: 'Project Type' },
    { key: 'status', label: 'Status' },
    { key: 'total_amount', label: 'Total Amount' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'completion_date', label: 'Completion Date' },
    { key: 'assigned_crew', label: 'Assigned Crew' },
  ];

  exportToCSV(jobs, 'jobs', columns);
}

/**
 * Export invoices to CSV
 */
export function exportInvoicesToCSV(invoices: any[]): void {
  const columns = [
    { key: 'invoice_number', label: 'Invoice Number' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'invoice_date', label: 'Invoice Date' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'total_amount', label: 'Total Amount' },
    { key: 'amount_paid', label: 'Amount Paid' },
    { key: 'balance', label: 'Balance' },
    { key: 'status', label: 'Status' },
  ];

  exportToCSV(invoices, 'invoices', columns);
}

/**
 * Export estimates to CSV
 */
export function exportEstimatesToCSV(estimates: any[]): void {
  const columns = [
    { key: 'estimate_number', label: 'Estimate Number' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'project_type', label: 'Project Type' },
    { key: 'total_amount', label: 'Total Amount' },
    { key: 'status', label: 'Status' },
    { key: 'created_date', label: 'Created Date' },
    { key: 'expiry_date', label: 'Expiry Date' },
  ];

  exportToCSV(estimates, 'estimates', columns);
}

/**
 * Export financial report to CSV
 */
export function exportFinancialReportToCSV(report: {
  revenue: any[];
  expenses: any[];
  summary: any;
}): void {
  // Revenue section
  const revenueCSV = convertToCSV(report.revenue, [
    { key: 'date', label: 'Date' },
    { key: 'description', label: 'Description' },
    { key: 'amount', label: 'Amount' },
  ]);

  // Expenses section
  const expensesCSV = convertToCSV(report.expenses, [
    { key: 'date', label: 'Date' },
    { key: 'description', label: 'Description' },
    { key: 'amount', label: 'Amount' },
  ]);

  // Summary section
  const summaryCSV = `
FINANCIAL SUMMARY
Total Revenue,${report.summary.total_revenue}
Total Expenses,${report.summary.total_expenses}
Net Profit,${report.summary.net_profit}
Profit Margin,${report.summary.profit_margin}%
`;

  // Combine all sections
  const fullReport = `
REVENUE
${revenueCSV}

EXPENSES
${expensesCSV}

${summaryCSV}
`.trim();

  const blob = new Blob([fullReport], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `financial_report_${new Date().toISOString().split('T')[0]}.csv`;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.URL.revokeObjectURL(url);
}
