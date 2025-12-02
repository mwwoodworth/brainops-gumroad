import { AnalyticsSnapshot, AnalyticsSummaryExport, AnalyticsSummaryRow } from '@/types/analytics';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const hourFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const sanitizeNumber = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'number') {
    return null;
  }
  if (!Number.isFinite(value)) {
    return null;
  }
  return value;
};

const defaultValueFormatter = (value: number | null | undefined): string => {
  const sanitized = sanitizeNumber(value);
  if (sanitized === null) {
    return '—';
  }
  return numberFormatter.format(sanitized);
};

const formatCurrency = (value: number | null | undefined): string => {
  const sanitized = sanitizeNumber(value);
  if (sanitized === null) {
    return '—';
  }
  return currencyFormatter.format(sanitized);
};

const formatPercent = (value: number | null | undefined): string => {
  const sanitized = sanitizeNumber(value);
  if (sanitized === null) {
    return '—';
  }
  return percentFormatter.format((sanitized ?? 0) / 100);
};

const formatHours = (value: number | null | undefined): string => {
  const sanitized = sanitizeNumber(value);
  if (sanitized === null) {
    return '—';
  }
  return `${hourFormatter.format(sanitized)} hrs`;
};

interface RowOptions {
  formatter?: (value: number | null | undefined) => string;
  change?: number | null | undefined;
  changeFormatter?: (value: number | null | undefined) => string;
  unit?: string;
  notes?: string;
}

const buildRow = (
  section: string,
  category: string,
  metric: string,
  value: number | null | undefined,
  options: RowOptions = {}
): AnalyticsSummaryRow => {
  const sanitizedValue = sanitizeNumber(value);
  const sanitizedChange = sanitizeNumber(options.change ?? null);

  const formatter = options.formatter ?? defaultValueFormatter;
  const changeFormatter = options.changeFormatter ?? formatPercent;

  return {
    section,
    category,
    metric,
    value: sanitizedValue,
    formattedValue: formatter(value),
    change: sanitizedChange,
    formattedChange: sanitizedChange !== null ? changeFormatter(options.change ?? null) : undefined,
    unit: options.unit,
    notes: options.notes,
  };
};

export function buildAnalyticsSummary(
  snapshot: AnalyticsSnapshot,
  options: { period: string; tenantId?: string | null; generatedAt?: string } = { period: 'month' }
): AnalyticsSummaryExport {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const rows: AnalyticsSummaryRow[] = [];

  const { revenue, customers, jobs, performance, financial, predictions } = snapshot;

  // Revenue summary
  rows.push(
    buildRow('Revenue', 'Summary', 'Total Revenue', revenue.total, { formatter: formatCurrency }),
    buildRow('Revenue', 'Summary', 'Revenue Growth', revenue.growth, {
      formatter: formatPercent,
      unit: 'percent',
    }),
    buildRow('Revenue', 'Summary', 'Projected Revenue (Next Month)', predictions.next_month_revenue, {
      formatter: formatCurrency,
    }),
  );

  revenue.byMonth.forEach((entry) => {
    rows.push(
      buildRow('Revenue', 'By Month', `Monthly Revenue – ${entry.month}`, entry.amount, {
        formatter: formatCurrency,
      })
    );
  });

  revenue.byService.forEach((service) => {
    rows.push(
      buildRow('Revenue', 'By Service', service.service ?? 'Unknown Service', service.amount, {
        formatter: formatCurrency,
        change: service.percentage,
        changeFormatter: (val) => formatPercent(val ?? null),
        unit: 'percent',
        notes: `Revenue mix: ${formatPercent(service.percentage ?? 0)}`,
      })
    );
  });

  revenue.topCustomers?.slice(0, 5).forEach((customer) => {
    rows.push(
      buildRow('Revenue', 'Top Customers', customer.name, customer.amount, {
        formatter: formatCurrency,
        notes: [
          customer.status ? `Status: ${customer.status}` : null,
          `Jobs: ${customer.jobs} (${customer.completed_jobs} completed)`,
          `Outstanding: ${formatCurrency(customer.outstanding)}`,
        ]
          .filter(Boolean)
          .join(' • '),
      })
    );
  });

  // Customer metrics
  rows.push(
    buildRow('Customers', 'Summary', 'Total Customers', customers.total, {
      formatter: (value) => defaultValueFormatter(value)?.replace(/\.0$/, ''),
    }),
    buildRow('Customers', 'Summary', 'New Customers', customers.new, {
      formatter: (value) => defaultValueFormatter(value)?.replace(/\.0$/, ''),
    }),
    buildRow('Customers', 'Summary', 'Retention Rate', customers.retention, {
      formatter: formatPercent,
      unit: 'percent',
    }),
    buildRow('Customers', 'Summary', 'Satisfaction Score', customers.satisfaction, {
      formatter: (value) => {
        const sanitized = sanitizeNumber(value);
        if (sanitized === null) return '—';
        return `${sanitized.toFixed(1)}/5.0`;
      },
    }),
    buildRow('Customers', 'Summary', 'Average Lifetime Value', customers.lifetime_value, {
      formatter: formatCurrency,
    }),
  );

  customers.byType.forEach((type) => {
    const percentage =
      customers.total > 0
        ? Math.round((type.count / customers.total) * 1000) / 10
        : 0;
    rows.push(
      buildRow('Customers', 'Segmentation', `${type.type} Customers`, type.count, {
        formatter: (value) => defaultValueFormatter(value)?.replace(/\.0$/, ''),
        notes: `Mix: ${formatPercent(percentage)}`,
      })
    );
  });

  // Operational metrics
  rows.push(
    buildRow('Operations', 'Summary', 'Jobs Completed', jobs.completed, {
      formatter: (value) => defaultValueFormatter(value)?.replace(/\.0$/, ''),
    }),
    buildRow('Operations', 'Summary', 'Jobs In Progress', jobs.in_progress, {
      formatter: (value) => defaultValueFormatter(value)?.replace(/\.0$/, ''),
    }),
    buildRow('Operations', 'Summary', 'Success Rate', jobs.success_rate, {
      formatter: formatPercent,
      unit: 'percent',
    }),
    buildRow('Operations', 'Summary', 'Average Duration', jobs.avg_duration, {
      formatter: formatHours,
      unit: 'hours',
    }),
  );

  jobs.byStatus.forEach((status) => {
    rows.push(
      buildRow('Operations', 'Status Mix', `${status.status}`, status.count, {
        formatter: (value) => defaultValueFormatter(value)?.replace(/\.0$/, ''),
      })
    );
  });

  // Performance metrics
  rows.push(
    buildRow('Performance', 'KPIs', 'Efficiency Score', performance.efficiency, {
      formatter: formatPercent,
      unit: 'percent',
    }),
    buildRow('Performance', 'KPIs', 'Productivity', performance.productivity, {
      formatter: formatPercent,
      unit: 'percent',
    }),
    buildRow('Performance', 'KPIs', 'Quality Score', performance.quality_score, {
      formatter: formatPercent,
      unit: 'percent',
    }),
    buildRow('Performance', 'KPIs', 'Average Response Time', performance.response_time, {
      formatter: formatHours,
      unit: 'hours',
    }),
    buildRow('Performance', 'KPIs', 'Average Completion Time', performance.completion_time, {
      formatter: formatHours,
      unit: 'hours',
    })
  );

  // Financial metrics
  rows.push(
    buildRow('Financial', 'Summary', 'Cash Flow', financial.cash_flow, { formatter: formatCurrency }),
    buildRow('Financial', 'Summary', 'Total Expenses', financial.expenses, { formatter: formatCurrency }),
    buildRow('Financial', 'Summary', 'Receivables', financial.receivables, { formatter: formatCurrency }),
    buildRow('Financial', 'Summary', 'Payables', financial.payables, { formatter: formatCurrency }),
    buildRow('Financial', 'Summary', 'Profit Margin', financial.profit_margin, {
      formatter: formatPercent,
      unit: 'percent',
    }),
    buildRow('Financial', 'Summary', 'Return on Investment', financial.roi, {
      formatter: formatPercent,
      unit: 'percent',
    }),
  );

  if (financial.payables_due_soon !== undefined) {
    rows.push(
      buildRow('Financial', 'Summary', 'Payables Due Soon', financial.payables_due_soon, {
        formatter: formatCurrency,
      })
    );
  }

  if (financial.receivables_aging) {
    Object.entries(financial.receivables_aging).forEach(([bucket, amount]) => {
      rows.push(
        buildRow('Financial', 'Receivables Aging', `${bucket} days`, amount, {
          formatter: formatCurrency,
        })
      );
    });
  }

  financial.expense_breakdown?.forEach((expense) => {
    rows.push(
      buildRow('Financial', 'Expense Breakdown', expense.category, expense.amount, {
        formatter: formatCurrency,
        notes: `Mix: ${formatPercent(expense.percentage)}`,
      })
    );
  });

  financial.expense_trend?.forEach((entry) => {
    rows.push(
      buildRow('Financial', 'Expense Trend', entry.month, entry.amount, {
        formatter: formatCurrency,
      })
    );
  });

  financial.recent_expenses?.slice(0, 5).forEach((expense) => {
    rows.push(
      buildRow('Financial', 'Recent Expenses', expense.description, expense.amount, {
        formatter: formatCurrency,
        notes: [
          expense.date ? `Date: ${new Date(expense.date).toLocaleDateString('en-US')}` : null,
          expense.vendor ? `Vendor: ${expense.vendor}` : null,
          expense.job_name ? `Job: ${expense.job_name}` : null,
          expense.category ? `Category: ${expense.category}` : null,
        ]
          .filter(Boolean)
          .join(' • '),
      })
    );
  });

  // Predictions
  rows.push(
    buildRow('Predictions', 'Summary', 'Growth Forecast', predictions.growth_forecast, {
      formatter: formatPercent,
      unit: 'percent',
    })
  );

  predictions.demand_forecast.forEach((forecast) => {
    rows.push(
      buildRow('Predictions', 'Demand Forecast', forecast.date, forecast.demand, {
        formatter: (value) => defaultValueFormatter(value)?.replace(/\.0$/, ''),
        notes: 'Projected jobs',
      })
    );
  });

  predictions.risk_indicators.forEach((risk) => {
    rows.push(
      buildRow('Predictions', 'Risk Indicators', risk.indicator, null, {
        formatter: () => risk.level,
        notes: risk.impact,
      })
    );
  });

  return {
    generatedAt,
    period: options.period,
    rows,
    tenantId: options.tenantId ?? null,
  };
}

const toCsvCell = (value: string): string => {
  if (value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  if (value.includes(',') || value.includes('\n')) {
    return `"${value}"`;
  }
  return value;
};

export function buildAnalyticsSummaryCsv(summary: AnalyticsSummaryExport): string {
  const headers = [
    'Section',
    'Category',
    'Metric',
    'Value',
    'Formatted Value',
    'Change',
    'Formatted Change',
    'Unit',
    'Notes',
  ];

  const rows = summary.rows.map((row) => {
    const cells = [
      row.section,
      row.category,
      row.metric,
      row.value !== null && row.value !== undefined ? String(row.value) : '',
      row.formattedValue ?? '',
      row.change !== null && row.change !== undefined ? String(row.change) : '',
      row.formattedChange ?? '',
      row.unit ?? '',
      row.notes ?? '',
    ];
    return cells.map(toCsvCell).join(',');
  });

  return [headers.map(toCsvCell).join(','), ...rows].join('\n');
}
