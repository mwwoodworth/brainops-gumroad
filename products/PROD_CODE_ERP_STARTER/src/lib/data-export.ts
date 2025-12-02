/**
 * Data Export Utilities
 * Export data to various formats (CSV, Excel, PDF, JSON)
 * Week 7: Advanced Data Visualization
 */

/**
 * Export data to CSV format
 */
export function exportToCSV(data: any[], filename: string, columns?: string[]) {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  // Determine columns
  const cols = columns || Object.keys(data[0]);

  // Build CSV content
  const headers = cols.join(',');
  const rows = data.map(row =>
    cols.map(col => {
      const value = row[col];
      // Handle values with commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    }).join(',')
  );

  const csv = [headers, ...rows].join('\n');

  // Download
  downloadFile(csv, `${filename}.csv`, 'text/csv');
}

/**
 * Export data to JSON format
 */
export function exportToJSON(data: any, filename: string, pretty = true) {
  const json = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  downloadFile(json, `${filename}.json`, 'application/json');
}

/**
 * Export data to Excel-compatible format (TSV)
 */
export function exportToExcel(data: any[], filename: string, columns?: string[]) {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const cols = columns || Object.keys(data[0]);

  // Build TSV content (Tab-Separated Values)
  const headers = cols.join('\t');
  const rows = data.map(row =>
    cols.map(col => {
      const value = row[col];
      // Handle values with tabs
      if (typeof value === 'string' && value.includes('\t')) {
        return `"${value}"`;
      }
      return value ?? '';
    }).join('\t')
  );

  const tsv = [headers, ...rows].join('\n');

  // Download
  downloadFile(tsv, `${filename}.xls`, 'application/vnd.ms-excel');
}

/**
 * Export chart data to CSV
 */
export function exportChartData(
  chartData: any[],
  chartType: 'line' | 'bar' | 'pie' | 'area',
  filename: string
) {
  let processedData = chartData;

  // Process data based on chart type
  if (chartType === 'pie') {
    processedData = chartData.map(item => ({
      name: item.name,
      value: item.value,
      percentage: item.percentage || ((item.value / chartData.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(2) + '%'
    }));
  }

  exportToCSV(processedData, filename);
}

/**
 * Download file helper
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Export table data with formatting
 */
export function exportTableData(
  data: any[],
  columns: { key: string; label: string; format?: (value: any) => string }[],
  filename: string,
  format: 'csv' | 'json' | 'excel' = 'csv'
) {
  // Apply column formatters
  const formatted = data.map(row => {
    const formattedRow: any = {};
    columns.forEach(col => {
      const value = row[col.key];
      formattedRow[col.label] = col.format ? col.format(value) : value;
    });
    return formattedRow;
  });

  // Export based on format
  switch (format) {
    case 'csv':
      exportToCSV(formatted, filename);
      break;
    case 'json':
      exportToJSON(formatted, filename);
      break;
    case 'excel':
      exportToExcel(formatted, filename);
      break;
  }
}

/**
 * Export dashboard summary
 */
export interface DashboardSummary {
  generatedAt: string;
  dateRange: {
    start: string;
    end: string;
  };
  metrics: {
    label: string;
    value: string | number;
    change?: number;
  }[];
  charts?: {
    title: string;
    data: any[];
  }[];
}

export function exportDashboardSummary(summary: DashboardSummary, filename: string) {
  // Create comprehensive summary document
  const doc = {
    ...summary,
    exportedAt: new Date().toISOString(),
  };

  exportToJSON(doc, filename);
}

/**
 * Export filtered dataset
 */
export function exportFilteredData(
  data: any[],
  filters: Record<string, any>,
  filename: string,
  format: 'csv' | 'json' | 'excel' = 'csv'
) {
  // Apply filters
  const filtered = data.filter(row => {
    return Object.entries(filters).every(([key, value]) => {
      if (value === null || value === undefined) return true;
      if (Array.isArray(value)) return value.includes(row[key]);
      return row[key] === value;
    });
  });

  // Add filter metadata
  const metadata = {
    exportedAt: new Date().toISOString(),
    totalRecords: data.length,
    filteredRecords: filtered.length,
    filters,
  };

  if (format === 'json') {
    exportToJSON({ metadata, data: filtered }, filename);
  } else if (format === 'csv') {
    exportToCSV(filtered, filename);
  } else if (format === 'excel') {
    exportToExcel(filtered, filename);
  }
}

/**
 * Export report with multiple sheets (for future Excel library integration)
 */
export interface ReportSheet {
  name: string;
  data: any[];
  columns?: string[];
}

export function exportMultiSheetReport(sheets: ReportSheet[], filename: string) {
  // For now, export each sheet as a separate CSV with sheet name in filename
  sheets.forEach(sheet => {
    const sheetFilename = `${filename}_${sheet.name.replace(/\s+/g, '_')}`;
    exportToCSV(sheet.data, sheetFilename, sheet.columns);
  });
}

/**
 * Batch export utility
 */
export function batchExport(exports: {
  data: any[];
  filename: string;
  format: 'csv' | 'json' | 'excel';
}[]) {
  exports.forEach(({ data, filename, format }) => {
    switch (format) {
      case 'csv':
        exportToCSV(data, filename);
        break;
      case 'json':
        exportToJSON(data, filename);
        break;
      case 'excel':
        exportToExcel(data, filename);
        break;
    }
  });
}

/**
 * Copy data to clipboard
 */
export async function copyToClipboard(data: any[], format: 'csv' | 'json' = 'csv') {
  let content: string;

  if (format === 'csv') {
    const cols = Object.keys(data[0]);
    const headers = cols.join(',');
    const rows = data.map(row => cols.map(col => row[col]).join(','));
    content = [headers, ...rows].join('\n');
  } else {
    content = JSON.stringify(data, null, 2);
  }

  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Print data as formatted table
 */
export function printData(data: any[], title: string, columns?: string[]) {
  const cols = columns || Object.keys(data[0]);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Failed to open print window');
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
        }
        h1 {
          color: #333;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #4B5563;
          color: white;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        @media print {
          button {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <button onClick="window.print()">Print</button>
      <table>
        <thead>
          <tr>
            ${cols.map(col => `<th>${col}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${cols.map(col => `<td>${row[col] ?? ''}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <script>
        window.onload = () => window.print();
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
