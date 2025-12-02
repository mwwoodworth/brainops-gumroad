import { filterRecordsForTenant, type SeedDataset, type SeedRecord } from './seed-dataset';

export interface SeedDataDictionaryField {
  name: string;
  label: string;
  description: string;
  sample?: string;
}

export interface SeedDataDictionaryInsight {
  label: string;
  value: string;
}

export interface SeedDataDictionaryTable {
  name: string;
  label: string;
  description: string;
  primaryKey: string;
  rowCount: number;
  dashboards: string[];
  fields: SeedDataDictionaryField[];
  insights: SeedDataDictionaryInsight[];
}

export interface SeedDataDictionary {
  dataset: {
    name: string;
    version: string;
    path?: string;
    tenantId?: string;
    description?: string;
  };
  tables: SeedDataDictionaryTable[];
}

interface TableDefinitionField {
  name: string;
  label: string;
  description: string;
}

interface TableDefinition {
  label: string;
  description: string;
  primaryKey: string;
  dashboards: string[];
  fields: TableDefinitionField[];
}

type InsightBuilder = (records: SeedRecord[]) => SeedDataDictionaryInsight[];

const TABLE_DEFINITIONS: Record<string, TableDefinition> = {
  tenants: {
    label: 'Tenants',
    description: 'Root company profile used for multi-tenant isolation and feature flags.',
    primaryKey: 'id',
    dashboards: ['Command Center'],
    fields: [
      { name: 'name', label: 'Tenant Name', description: 'Display name surfaced in the command center and navigation.' },
      { name: 'slug', label: 'Slug', description: 'URL-safe slug bound to subdomain routing.' },
      { name: 'timezone', label: 'Timezone', description: 'Determines schedule/calendar rendering offsets.' },
      { name: 'primary_contact', label: 'Primary Contact', description: 'Primary email used for escalations and notifications.' }
    ]
  },
  customers: {
    label: 'Customers',
    description: 'Accounts and properties eligible for estimates, jobs, and service tickets.',
    primaryKey: 'id',
    dashboards: ['Sales', 'Dispatch', 'Finance'],
    fields: [
      { name: 'name', label: 'Customer Name', description: 'External facing customer or property name.' },
      { name: 'type', label: 'Type', description: 'Classification (commercial, residential, HOA) driving workflow filters.' },
      { name: 'status', label: 'Status', description: 'Lifecycle state tracked across CRM and automation.' },
      { name: 'owner_id', label: 'Owner', description: 'Employee owner responsible for follow-up cadence.' }
    ]
  },
  jobs: {
    label: 'Jobs',
    description: 'Production jobs that tie estimates, schedules, and invoicing together.',
    primaryKey: 'id',
    dashboards: ['Operations', 'Dispatch', 'Finance'],
    fields: [
      { name: 'title', label: 'Job Title', description: 'High level job description used across dashboards.' },
      { name: 'status', label: 'Status', description: 'Production stage powering burndown and SOP automation.' },
      { name: 'customer_id', label: 'Customer', description: 'Links to the owning customer for reporting joins.' },
      { name: 'scheduled_start', label: 'Scheduled Start', description: 'Calendar anchor for crew and dispatch planning.' }
    ]
  },
  estimates: {
    label: 'Estimates',
    description: 'Approved scopes of work that convert into jobs with pricing detail.',
    primaryKey: 'id',
    dashboards: ['Sales', 'Finance'],
    fields: [
      { name: 'estimate_number', label: 'Estimate Number', description: 'External identifier for customer-facing documents.' },
      { name: 'status', label: 'Status', description: 'Approval state (draft, sent, approved) informing conversion readiness.' },
      { name: 'project_name', label: 'Project Name', description: 'Project label appearing on packets and mobilization docs.' },
      { name: 'total_amount', label: 'Total Amount', description: 'Grand total used for forecasting and pipeline summaries.' }
    ]
  },
  schedule_events: {
    label: 'Schedule Events',
    description: 'Crew, service, and inspection calendar entries with SLA metadata.',
    primaryKey: 'id',
    dashboards: ['Dispatch', 'Calendar', 'Operations'],
    fields: [
      { name: 'type', label: 'Event Type', description: 'Categorizes service, production, or inspection appointments.' },
      { name: 'status', label: 'Status', description: 'Scheduled / in_progress / completed state for command center widgets.' },
      { name: 'assigned_to', label: 'Assigned Crew', description: 'Linked technicians or crews for dispatch routing.' },
      { name: 'start_date', label: 'Start Date', description: 'Beginning of the scheduled window shown on calendars.' }
    ]
  },
  employees: {
    label: 'Employees',
    description: 'Internal team directory used for assignments, approvals, and automations.',
    primaryKey: 'id',
    dashboards: ['Operations', 'Dispatch'],
    fields: [
      { name: 'first_name', label: 'First Name', description: 'Employee given name used in roster views.' },
      { name: 'last_name', label: 'Last Name', description: 'Employee surname paired with first name for display.' },
      { name: 'role', label: 'Role', description: 'Functional role such as Operations Manager, Crew Lead, or Service Tech.' },
      { name: 'hourly_rate', label: 'Hourly Rate', description: 'Loaded into payroll + job costing calculations.' }
    ]
  },
  timesheets: {
    label: 'Timesheets',
    description: 'Crew time tracking records that feed payroll and job costing.',
    primaryKey: 'id',
    dashboards: ['Finance', 'Operations'],
    fields: [
      { name: 'employee_id', label: 'Employee', description: 'References the employee who logged the time.' },
      { name: 'job_id', label: 'Job', description: 'Job or service ticket receiving the labor cost.' },
      { name: 'hours_worked', label: 'Hours Worked', description: 'Number of hours billed on the entry.' },
      { name: 'status', label: 'Status', description: 'Approval stage (submitted, approved) for payroll gating.' }
    ]
  },
  invoices: {
    label: 'Invoices',
    description: 'Accounts receivable ledger powering cash flow, collections, and financial reporting.',
    primaryKey: 'id',
    dashboards: ['Finance', 'Collections', 'Command Center'],
    fields: [
      { name: 'invoice_number', label: 'Invoice Number', description: 'External identifier matching exported documents.' },
      { name: 'status', label: 'Status', description: 'Draft/sent/paid state controlling AR aging views.' },
      { name: 'total_amount', label: 'Total Amount', description: 'Gross invoice value (USD).' },
      { name: 'balance_due', label: 'Balance Due', description: 'Remaining AR balance for collection tracking.' }
    ]
  },
  inventory_items: {
    label: 'Inventory Items',
    description: 'Warehouse stock levels used for procurement, usage, and reorder automation.',
    primaryKey: 'id',
    dashboards: ['Procurement', 'Operations'],
    fields: [
      { name: 'sku', label: 'SKU', description: 'Inventory SKU displayed across procurement workflows.' },
      { name: 'name', label: 'Item Name', description: 'Material or equipment name shown to buyers.' },
      { name: 'quantity_in_stock', label: 'Qty In Stock', description: 'Current available quantity for job reservation.' },
      { name: 'reorder_point', label: 'Reorder Point', description: 'Threshold that triggers procurement alerts.' }
    ]
  },
  equipment: {
    label: 'Equipment',
    description: 'Fleet and tool tracking, including maintenance cadence and assignments.',
    primaryKey: 'id',
    dashboards: ['Operations', 'Compliance'],
    fields: [
      { name: 'name', label: 'Equipment Name', description: 'Display name (vehicle, tool, or asset).' },
      { name: 'type', label: 'Type', description: 'Asset category for reporting and maintenance filters.' },
      { name: 'status', label: 'Status', description: 'Active / maintenance / retired state for availability planning.' },
      { name: 'last_service', label: 'Last Service', description: 'Date of last maintenance used for compliance alerts.' }
    ]
  }
};

const TABLE_INSIGHTS: Record<string, InsightBuilder> = {
  invoices: (records) => {
    if (!records.length) return [];

    const statusCounts = records.reduce<Record<string, number>>((acc, record) => {
      const status = String(record.status ?? 'unknown');
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {});

    const outstanding = records.reduce((sum, record) => {
      const value = typeof record.balance_due === 'number' ? record.balance_due : 0;
      return sum + value;
    }, 0);

    return [
      {
        label: 'Statuses',
        value: Object.entries(statusCounts)
          .map(([status, count]) => `${status}: ${count}`)
          .join(' • ')
      },
      {
        label: 'Outstanding Balance',
        value: outstanding ? formatCurrency(outstanding) : '$0'
      }
    ];
  },
  schedule_events: (records) => {
    if (!records.length) return [];

    const byStatus = records.reduce<Record<string, number>>((acc, record) => {
      const status = String(record.status ?? 'unspecified');
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {});

    const serviceEvents = records.filter((record) => record.type === 'service');

    return [
      {
        label: 'Status Mix',
        value: Object.entries(byStatus)
          .map(([status, count]) => `${status}: ${count}`)
          .join(' • ')
      },
      {
        label: 'Service Events',
        value: `${serviceEvents.length} with dispatch metadata`
      }
    ];
  },
  timesheets: (records) => {
    if (!records.length) return [];
    const totalHours = records.reduce((sum, record) => {
      const hours = typeof record.hours_worked === 'number' ? record.hours_worked : 0;
      return sum + hours;
    }, 0);
    return [
      {
        label: 'Total Hours',
        value: `${totalHours.toFixed(1)} hrs logged`
      }
    ];
  }
};

function startCase(input: string): string {
  return input
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatSample(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') {
    return value.length > 80 ? `${value.slice(0, 77)}…` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  try {
    const json = JSON.stringify(value);
    return json.length > 80 ? `${json.slice(0, 77)}…` : json;
  } catch {
    return String(value);
  }
}

function fallbackDefinition(tableName: string, sampleRecord?: SeedRecord): TableDefinition {
  const fields =
    sampleRecord && typeof sampleRecord === 'object'
      ? Object.keys(sampleRecord).map<TableDefinitionField>((key) => ({
          name: key,
          label: startCase(key),
          description: 'Field sourced from deterministic dataset'
        }))
      : [];

  return {
    label: startCase(tableName),
    description: 'Deterministic dataset table',
    primaryKey: 'id',
    dashboards: [],
    fields
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
}

export interface BuildSeedDataDictionaryOptions {
  tenantId?: string;
  datasetPath?: string;
}

export function buildSeedDataDictionary(
  dataset: SeedDataset,
  options?: BuildSeedDataDictionaryOptions
): SeedDataDictionary {
  const tenantId = options?.tenantId ?? dataset.meta.tenant_id;
  const datasetPath = options?.datasetPath;

  const tableNames = new Set<string>();
  Object.keys(TABLE_DEFINITIONS).forEach((name) => tableNames.add(name));
  Object.keys(dataset)
    .filter((key) => key !== 'meta')
    .forEach((key) => tableNames.add(key));

  const tables: SeedDataDictionaryTable[] = Array.from(tableNames).map((tableName) => {
    const rawRecords = (dataset as Record<string, SeedRecord[] | undefined>)[tableName];
    const filtered = filterRecordsForTenant(rawRecords, tenantId);
    const definition = TABLE_DEFINITIONS[tableName] ?? fallbackDefinition(tableName, rawRecords?.[0]);

    const fields = definition.fields.map<SeedDataDictionaryField>((field) => ({
      ...field,
      sample: formatSample(filtered[0]?.[field.name] ?? rawRecords?.[0]?.[field.name])
    }));

    const insightBuilder = TABLE_INSIGHTS[tableName];
    const insights = insightBuilder ? insightBuilder(filtered) : [];

    return {
      name: tableName,
      label: definition.label,
      description: definition.description,
      primaryKey: definition.primaryKey,
      rowCount: filtered.length,
      dashboards: definition.dashboards,
      fields,
      insights
    };
  });

  tables.sort((a, b) => a.label.localeCompare(b.label));

  return {
    dataset: {
      name: dataset.meta.dataset,
      version: dataset.meta.version,
      path: datasetPath,
      tenantId,
      description: dataset.meta.description
    },
    tables
  };
}
