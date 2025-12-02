import { z } from 'zod';

export const numericLikeSchema = z.union([z.number(), z.string(), z.null(), z.undefined()]);
export type NumericLike = z.infer<typeof numericLikeSchema>;

const toNumber = (value: NumericLike): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const jobInvoiceRowSchema = z.object({
  id: z.string(),
  job_id: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  total: numericLikeSchema.optional(),
  total_amount: numericLikeSchema.optional(),
  total_cents: numericLikeSchema.optional(),
});

export const jobCostRowSchema = z.object({
  id: z.string(),
  job_id: z.string().nullable().optional(),
  amount: numericLikeSchema.optional(),
  type: z.string().nullable().optional(),
});

export const jobRowSchema = z.object({
  id: z.string(),
  tenant_id: z.string().nullable().optional(),
  job_number: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  customer_name: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  job_type: z.string().nullable().optional(),
  scheduled_end: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  estimated_revenue: numericLikeSchema.optional(),
  estimated_costs: numericLikeSchema.optional(),
  total_amount: numericLikeSchema.optional(),
  job_costs: z.array(jobCostRowSchema).nullable().optional(),
  invoices: z.array(jobInvoiceRowSchema).nullable().optional(),
});

export const jobRowsSchema = z.array(jobRowSchema);
export type JobProfitabilityJobRow = z.infer<typeof jobRowSchema>;

export interface JobCostBreakdown {
  material: number;
  labor: number;
  subcontractor: number;
  other: number;
}

export interface JobProfitabilityRow extends JobCostBreakdown {
  job_id: string;
  job_number: string | null | undefined;
  title: string | null | undefined;
  customer_name: string | null | undefined;
  status: string | null | undefined;
  total_revenue: number;
  outstanding_revenue: number;
  total_cost: number;
  profit: number;
  margin: number;
  estimated_revenue?: number | null | undefined;
  estimated_costs?: number | null | undefined;
}

export interface JobProfitabilitySummary {
  jobs: number;
  profitable: number;
  total_revenue: number;
  outstanding_revenue: number;
  total_cost: number;
  total_profit: number;
  average_margin: number;
}

const RECOGNIZED_STATUSES = new Set(['paid', 'completed', 'closed', 'received']);
const OUTSTANDING_STATUSES = new Set(['pending', 'sent', 'viewed', 'due', 'partial', 'open', 'in_progress']);

const extractInvoiceAmount = (invoice: z.infer<typeof jobInvoiceRowSchema>): number => {
  const sources: NumericLike[] = [invoice.total_amount, invoice.total, invoice.total_cents];
  for (const source of sources) {
    const numeric = toNumber(source);
    if (numeric > 0) {
      if (source === invoice.total_cents) {
        return numeric / 100;
      }
      return numeric;
    }
  }
  return 0;
};

const aggregateCosts = (costs?: Array<z.infer<typeof jobCostRowSchema>>): JobCostBreakdown => {
  if (!Array.isArray(costs) || costs.length === 0) {
    return { material: 0, labor: 0, subcontractor: 0, other: 0 };
  }

  return costs.reduce<JobCostBreakdown>(
    (acc, cost) => {
      const amount = toNumber(cost.amount);
      switch ((cost.type ?? '').toLowerCase()) {
        case 'material':
          acc.material += amount;
          break;
        case 'labor':
          acc.labor += amount * 1.52; // includes burden multiplier
          break;
        case 'subcontractor':
          acc.subcontractor += amount;
          break;
        case 'other':
        case 'equipment':
          acc.other += amount;
          break;
        default:
          acc.other += amount;
      }
      return acc;
    },
    { material: 0, labor: 0, subcontractor: 0, other: 0 }
  );
};

export const calculateJobProfitabilityRows = (jobs: JobProfitabilityJobRow[]): JobProfitabilityRow[] => {
  return jobs.map((job) => {
    const costs = aggregateCosts(job.job_costs ?? undefined);
    const totalCost = costs.material + costs.labor + costs.subcontractor + costs.other;

    const invoices = job.invoices ?? [];
    let recognizedRevenue = 0;
    let outstandingRevenue = 0;
    for (const invoice of invoices) {
      const amount = extractInvoiceAmount(invoice);
      const status = (invoice.status ?? '').toLowerCase();
      if (RECOGNIZED_STATUSES.has(status)) {
        recognizedRevenue += amount;
      } else if (OUTSTANDING_STATUSES.has(status)) {
        outstandingRevenue += amount;
      }
    }

    const profit = recognizedRevenue - totalCost;
    const margin = recognizedRevenue > 0 ? (profit / recognizedRevenue) * 100 : 0;

    return {
      job_id: job.id,
      job_number: job.job_number,
      title: job.title,
      customer_name: job.customer_name,
      status: job.status,
      material: costs.material,
      labor: costs.labor,
      subcontractor: costs.subcontractor,
      other: costs.other,
      total_cost: totalCost,
      profit,
      margin,
      total_revenue: recognizedRevenue,
      outstanding_revenue: outstandingRevenue,
      estimated_revenue: job.estimated_revenue ? toNumber(job.estimated_revenue) : job.total_amount ? toNumber(job.total_amount) : null,
      estimated_costs: job.estimated_costs ? toNumber(job.estimated_costs) : null,
    };
  });
};

export const summarizeJobProfitability = (rows: JobProfitabilityRow[]): JobProfitabilitySummary => {
  if (!rows.length) {
    return {
      jobs: 0,
      profitable: 0,
      total_revenue: 0,
      outstanding_revenue: 0,
      total_cost: 0,
      total_profit: 0,
      average_margin: 0,
    };
  }

  const totals = rows.reduce(
    (acc, row) => {
      acc.jobs += 1;
      acc.total_revenue += row.total_revenue;
      acc.total_cost += row.total_cost;
      acc.total_profit += row.profit;
      acc.outstanding_revenue += row.outstanding_revenue;
      if (row.margin > 0) {
        acc.profitable += 1;
      }
      acc.marginSum += row.margin;
      return acc;
    },
    {
      jobs: 0,
      profitable: 0,
      total_revenue: 0,
      outstanding_revenue: 0,
      total_cost: 0,
      total_profit: 0,
      marginSum: 0,
    }
  );

  return {
    jobs: totals.jobs,
    profitable: totals.profitable,
    total_revenue: totals.total_revenue,
    outstanding_revenue: totals.outstanding_revenue,
    total_cost: totals.total_cost,
    total_profit: totals.total_profit,
    average_margin: totals.jobs > 0 ? totals.marginSum / totals.jobs : 0,
  };
};

export const profitabilityRowsToCsv = (rows: JobProfitabilityRow[]): string => {
  const headers = [
    'Job ID',
    'Job Number',
    'Title',
    'Customer',
    'Status',
    'Recognized Revenue',
    'Outstanding Revenue',
    'Material Cost',
    'Labor Cost',
    'Subcontractor Cost',
    'Other Cost',
    'Total Cost',
    'Profit',
    'Margin %',
  ];

  const csvRows = rows.map((row) =>
    [
      row.job_id,
      row.job_number ?? '',
      row.title ?? '',
      row.customer_name ?? '',
      row.status ?? '',
      row.total_revenue.toFixed(2),
      row.outstanding_revenue.toFixed(2),
      row.material.toFixed(2),
      row.labor.toFixed(2),
      row.subcontractor.toFixed(2),
      row.other.toFixed(2),
      row.total_cost.toFixed(2),
      row.profit.toFixed(2),
      row.margin.toFixed(2),
    ]
      .map((value) => `"${value.replace(/"/g, '""')}"`)
      .join(',')
  );

  return [headers.join(','), ...csvRows].join('\n');
};

export { toNumber };
