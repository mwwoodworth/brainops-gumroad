import type { SupabaseClient } from '@supabase/supabase-js';
import { v5 as uuidv5, validate as uuidValidate } from 'uuid';
import { supabase as publicSupabase } from './supabase';
import { createServiceRoleClient } from './supabase/server';
import { aiOrchestrator } from './ai-orchestrator';
import { memoryService } from './memory-service';
import {
  filterRecordsForTenant,
  loadSeedDataset,
  type SeedDataset,
  type SeedRecord
} from './seed-dataset';

export interface SeedOptions {
  datasetPath?: string;
  tenantId?: string;
  dryRun?: boolean;
  truncateBeforeInsert?: boolean;
}

export interface SeedTableResult {
  table: string;
  attempted: number;
  seeded: number;
  skipped: number;
  dryRun?: boolean;
  error?: string;
}

export interface SeedVerificationCheck {
  id: string;
  table: string;
  description: string;
  status: 'pass' | 'fail' | 'warn';
  count: number;
  details?: string;
}

export interface SeedVerificationSummary {
  passed: number;
  failed: number;
  warnings: number;
  checks: SeedVerificationCheck[];
}

export interface SeedRunResults {
  dataset: {
    path: string;
    tenantId?: string;
    version: string;
  };
  tenants?: SeedTableResult;
  customers?: SeedTableResult;
  jobs?: SeedTableResult;
  estimates?: SeedTableResult;
  schedules?: SeedTableResult;
  schedule_assignments?: SeedTableResult;
  customer_contacts?: SeedTableResult;
  employees?: SeedTableResult;
  timesheets?: SeedTableResult;
  invoices?: SeedTableResult;
  inventory?: SeedTableResult;
  equipment?: SeedTableResult;
  compliance?: SeedTableResult;
  service_sop_recurring_jobs?: SeedTableResult;
  service_sop_events?: SeedTableResult;
  verification: SeedVerificationSummary;
}

interface SeedTableConfig {
  conflictTarget?: string[];
  mode?: 'upsert' | 'insert';
}

const DEFAULT_CONFLICT = ['id'];
const UUID_NAMESPACE = 'f5afb69f-72b9-4f26-81c3-0e9476bfd24c';

type Normalizer = (record: SeedRecord, options: { tenantId?: string }) => SeedRecord | null;

const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && uuidValidate(value);

const toUuid = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (isUuid(value)) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return uuidv5(String(value), UUID_NAMESPACE);
  }
  return undefined;
};

const toUuidArray = (value: unknown): string[] => {
  if (value === null || value === undefined) return [];
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item) => toUuid(item))
    .filter((item): item is string => Boolean(item));
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

const stripUndefined = <T extends Record<string, unknown>>(record: T): T =>
  Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)) as T;

const normalizeTenant: Normalizer = (record) => {
  const id = toUuid(record.id ?? record.slug ?? record.name);
  if (!id) return null;

  const slug = typeof record.slug === 'string' ? record.slug : record.name ? slugify(String(record.name)) : id;
  const schemaName =
    typeof record.schema_name === 'string'
      ? record.schema_name
      : `tenant_${slugify(slug).replace(/-/g, '_') || id.slice(0, 8)}`;

  return stripUndefined({
    id,
    company_name: record.company_name ?? record.name ?? 'Weathercraft Tenant',
    owner_email: record.owner_email ?? record.primary_contact ?? null,
    subscription_tier: record.subscription_tier ?? 'demo',
    subscription_status: record.subscription_status ?? 'active',
    stripe_customer_id: record.stripe_customer_id ?? null,
    stripe_subscription_id: record.stripe_subscription_id ?? null,
    trial_ends_at: record.trial_ends_at ?? null,
    activated_agents: Array.isArray(record.activated_agents) ? record.activated_agents : [],
    schema_name: schemaName,
    created_at: record.created_at ?? new Date().toISOString(),
    updated_at: record.updated_at ?? record.created_at ?? new Date().toISOString(),
    slug,
    subdomain: record.subdomain ?? slug,
    status: record.status ?? 'active',
  });
};

const normalizeCustomer: Normalizer = (record, options) => {
  const id = toUuid(record.id ?? record.external_id ?? record.name);
  const tenantId = toUuid(record.tenant_id ?? options.tenantId);
  if (!id || !tenantId) return null;

  const address: Record<string, unknown> =
    typeof record.address === 'object' && record.address
      ? (record.address as Record<string, unknown>)
      : {};

  const billingAddress: Record<string, unknown> =
    typeof record.billing_address === 'object' && record.billing_address
      ? (record.billing_address as Record<string, unknown>)
      : {};

  const addressLine1 = address['line1'] as string | undefined;
  const addressCity = address['city'] as string | undefined;
  const addressState = address['state'] as string | undefined;
  const addressPostal = address['postal_code'] as string | undefined;
  const addressCountry = address['country'] as string | undefined;

  const billingLine1 = billingAddress['line1'] as string | undefined;
  const billingCity = billingAddress['city'] as string | undefined;
  const billingState = billingAddress['state'] as string | undefined;
  const billingPostal = billingAddress['postal_code'] as string | undefined;

  return stripUndefined({
    id,
    tenant_id: tenantId,
    name: record.name ?? record.company_name ?? 'Untitled Customer',
    company_name: record.company_name ?? record.name ?? null,
    email: record.email ?? null,
    phone: record.phone ?? null,
    address:
      typeof record.address === 'string'
        ? record.address
        : addressLine1 ?? null,
    city:
      addressCity ??
      (record.city as string | undefined) ??
      null,
    state:
      addressState ??
      (record.state as string | undefined) ??
      null,
    zip:
      addressPostal ??
      (record.zip as string | undefined) ??
      null,
    country:
      addressCountry ??
      (record.country as string | undefined) ??
      null,
    billing_address:
      typeof record.billing_address === 'string'
        ? record.billing_address
        : billingLine1 ?? null,
    billing_city:
      billingCity ??
      (record.billing_city as string | undefined) ??
      null,
    billing_state:
      billingState ??
      (record.billing_state as string | undefined) ??
      null,
    billing_zip:
      billingPostal ??
      (record.billing_zip as string | undefined) ??
      null,
    status: record.status ?? 'active',
    customer_type: record.type ?? record.customer_type ?? 'residential',
    lead_source: record.lead_source ?? null,
    notes: typeof record.notes === 'string' ? record.notes : null,
    tags: Array.isArray(record.tags) ? record.tags : [],
    created_at: record.created_at ?? new Date().toISOString(),
    updated_at: record.updated_at ?? record.created_at ?? new Date().toISOString(),
    preferred_contact_method: record.preferred_contact_method ?? null,
    last_contact_date: record.last_contact_date ?? null,
  });
};

const normalizeJob: Normalizer = (record, options) => {
  const id = toUuid(record.id);
  const tenantId = toUuid(record.tenant_id ?? options.tenantId);
  const customerId = toUuid(record.customer_id);
  if (!id || !tenantId || !customerId) return null;

  return stripUndefined({
    id,
    tenant_id: tenantId,
    customer_id: customerId,
    estimate_id: toUuid(record.estimate_id),
    job_number: record.job_number ?? null,
    title: record.title ?? record.name ?? 'Job',
    description: record.description ?? null,
    status: record.status ?? 'scheduled',
    scheduled_start: record.scheduled_start ?? null,
    scheduled_end: record.scheduled_end ?? null,
    start_at: record.start_at ?? record.scheduled_start ?? null,
    end_at: record.end_at ?? record.scheduled_end ?? null,
    estimated_revenue: record.estimated_revenue ?? null,
    total_revenue: record.total_amount ?? record.total_revenue ?? null,
    metadata: record.metadata ?? {},
    created_at: record.created_at ?? new Date().toISOString(),
    updated_at: record.updated_at ?? record.created_at ?? new Date().toISOString(),
    assigned_to: toUuidArray(record.assigned_to),
    tags: Array.isArray(record.tags) ? record.tags : [],
  });
};

const normalizeEstimate: Normalizer = (record, options) => {
  const id = toUuid(record.id);
  const tenantId = toUuid(record.tenant_id ?? options.tenantId);
  const customerId = toUuid(record.customer_id);
  if (!id || !tenantId || !customerId) return null;

  const lineItems = Array.isArray(record.items) ? record.items : record.line_items;

  return stripUndefined({
    id,
    tenant_id: tenantId,
    customer_id: customerId,
    job_id: toUuid(record.job_id),
    estimate_number: record.estimate_number ?? null,
    status: record.status ?? 'draft',
    title: record.project_name ?? record.title ?? null,
    project_name: record.project_name ?? null,
    project_address: record.project_address ?? null,
    subtotal_amount: record.subtotal ?? record.subtotal_amount ?? null,
    tax_amount: record.tax_amount ?? record.tax ?? null,
    total_amount: record.total_amount ?? record.total ?? null,
    subtotal_cents:
      record.subtotal_cents ??
      (record.subtotal ?? record.subtotal_amount ? Math.round(Number(record.subtotal ?? record.subtotal_amount)) : null),
    tax_cents:
      record.tax_cents ??
      (record.tax_amount ?? record.tax ? Math.round(Number(record.tax_amount ?? record.tax)) : null),
    total_cents:
      record.total_cents ??
      (record.total_amount ?? record.total ? Math.round(Number(record.total_amount ?? record.total)) : null),
    estimate_date: record.estimate_date ?? record.created_at ?? new Date().toISOString(),
    valid_until: record.valid_until ?? null,
    notes: record.notes ?? null,
    created_at: record.created_at ?? new Date().toISOString(),
    updated_at: record.updated_at ?? record.created_at ?? new Date().toISOString(),
    line_items: lineItems ?? [],
    metadata: record.metadata ?? {},
    ai_confidence: record.ai_confidence ?? null,
  });
};

const normalizeScheduleEvent: Normalizer = (record, options) => {
  const id = toUuid(record.id);
  const tenantId = toUuid(record.tenant_id ?? options.tenantId);
  if (!id || !tenantId) return null;

  return stripUndefined({
    id,
    tenant_id: tenantId,
    org_id: toUuid(record.org_id ?? tenantId),
    event_type: record.event_type ?? record.type ?? 'job',
    title: record.title ?? 'Scheduled Event',
    description: record.description ?? null,
    job_id: toUuid(record.job_id),
    customer_id: toUuid(record.customer_id),
    start_time: record.start_time ?? record.start_at ?? null,
    end_time: record.end_time ?? record.end_at ?? null,
    all_day: record.all_day ?? false,
    duration_hours: record.duration_hours ?? null,
    crew_lead: toUuid(record.crew_lead),
    crew_members: toUuidArray(record.crew_members),
    equipment_ids: toUuidArray(record.equipment_ids),
    vehicle_ids: toUuidArray(record.vehicle_ids),
    location_address: record.location_address ?? record.location ?? null,
    location_lat: record.location_lat ?? null,
    location_lng: record.location_lng ?? null,
    travel_time_minutes: record.travel_time_minutes ?? null,
    status: record.status ?? 'scheduled',
    status_reason: record.status_reason ?? null,
    weather_dependent: record.weather_dependent ?? null,
    weather_status: record.weather_status ?? null,
    weather_data: record.weather_data ?? null,
    reminder_sent: record.reminder_sent ?? null,
    reminder_time: record.reminder_time ?? null,
    notes: record.notes ?? null,
    tags: Array.isArray(record.tags) ? record.tags : [],
    color: record.color ?? null,
    route_optimized: record.route_optimized ?? null,
    route_plan: record.route_plan ?? null,
    has_conflicts: record.has_conflicts ?? null,
    conflict_details: record.conflict_details ?? null,
    optimization_summary: record.optimization_summary ?? null,
    created_by: toUuid(record.created_by),
    updated_by: toUuid(record.updated_by),
    created_at: record.created_at ?? new Date().toISOString(),
    updated_at: record.updated_at ?? record.created_at ?? new Date().toISOString(),
  });
};

const normalizeScheduleAssignment: Normalizer = (record, options) => {
  const id = toUuid(record.id);
  const tenantId = toUuid(record.tenant_id ?? options.tenantId);
  const eventId = toUuid(record.schedule_event_id ?? record.event_id);
  if (!id || !tenantId || !eventId) return null;

  return stripUndefined({
    id,
    schedule_event_id: eventId,
    tenant_id: tenantId,
    assignment_type: record.assignment_type ?? 'crew_member',
    assigned_id: toUuid(record.assigned_id),
    assigned_reference: record.assigned_reference ?? null,
    role: record.role ?? null,
    is_primary: record.is_primary ?? false,
    status: record.status ?? 'planned',
    start_time: record.start_time ?? null,
    end_time: record.end_time ?? null,
    workload_percentage: record.workload_percentage ?? null,
    metadata: record.metadata ?? {},
    created_at: record.created_at ?? new Date().toISOString(),
    updated_at: record.updated_at ?? record.created_at ?? new Date().toISOString(),
  });
};

const normalizeCustomerContact: Normalizer = (record, options) => {
  const id = toUuid(record.id ?? record.email ?? record.phone ?? record.name);
  const tenantId = toUuid(record.tenant_id ?? options.tenantId);
  const customerId = toUuid(record.customer_id);
  if (!id || !tenantId || !customerId) return null;

  return stripUndefined({
    id,
    tenant_id: tenantId,
    customer_id: customerId,
    name: record.name ?? null,
    first_name: record.first_name ?? null,
    last_name: record.last_name ?? null,
    email: record.email ?? null,
    phone: record.phone ?? null,
    title: record.title ?? null,
    is_primary: record.is_primary ?? false,
    notes: record.notes ?? null,
    metadata: record.metadata ?? {},
    created_at: record.created_at ?? new Date().toISOString(),
    updated_at: record.updated_at ?? record.created_at ?? new Date().toISOString(),
  });
};

const normalizeEmployee: Normalizer = (record, options) => {
  const id = toUuid(record.id);
  const tenantId = toUuid(record.tenant_id ?? options.tenantId);
  if (!id || !tenantId) return null;

  return stripUndefined({
    id,
    tenant_id: tenantId,
    first_name: record.first_name ?? 'First',
    last_name: record.last_name ?? 'Last',
    email: record.email ?? null,
    phone: record.phone ?? null,
    role: record.role ?? record.position ?? null,
    department: record.department ?? null,
    hourly_rate: record.hourly_rate ?? null,
    employment_status: record.employment_status ?? 'active',
    hire_date: record.hire_date ?? null,
    is_active: record.is_active ?? true,
    org_id: toUuid(record.org_id ?? options.tenantId),
    organization_id: toUuid(record.organization_id ?? options.tenantId),
    created_at: record.created_at ?? new Date().toISOString(),
    updated_at: record.updated_at ?? record.created_at ?? new Date().toISOString(),
  });
};

const normalizeTimesheet: Normalizer = (record, options) => {
  const id = toUuid(record.id);
  const tenantId = toUuid(record.tenant_id ?? options.tenantId);
  const employeeId = toUuid(record.employee_id);
  if (!id || !tenantId || !employeeId) return null;

  return stripUndefined({
    id,
    tenant_id: tenantId,
    employee_id: employeeId,
    job_id: toUuid(record.job_id),
    clock_in: record.clock_in ?? null,
    clock_out: record.clock_out ?? null,
    total_break_minutes: record.total_break_minutes ?? record.break_minutes ?? 0,
    total_hours: record.total_hours ?? record.hours_worked ?? null,
    regular_hours: record.regular_hours ?? null,
    overtime_hours: record.overtime_hours ?? null,
    status: record.status ?? 'pending',
    work_performed: record.work_performed ?? record.notes ?? null,
    approval_notes: record.approval_notes ?? null,
    approved_by: toUuid(record.approved_by),
    approved_at: record.approved_at ?? null,
    created_at: record.created_at ?? new Date().toISOString(),
    updated_at: record.updated_at ?? record.created_at ?? new Date().toISOString(),
    metadata: record.metadata ?? {},
  });
};

const normalizeInvoice: Normalizer = (record, options) => {
  const id = toUuid(record.id);
  const tenantId = toUuid(record.tenant_id ?? options.tenantId);
  const customerId = toUuid(record.customer_id);
  if (!id || !tenantId || !customerId) return null;

  const subtotal = record.subtotal ?? record.subtotal_amount ?? null;
  const taxAmount = record.tax_amount ?? record.tax ?? null;
  const total = record.total_amount ?? record.total ?? null;
  const amountPaid = record.amount_paid ?? record.paid_amount ?? null;

  const subtotalCents =
    record.subtotal_cents ?? (subtotal != null ? Math.round(Number(subtotal)) : null);
  const taxCents =
    record.tax_cents ?? (taxAmount != null ? Math.round(Number(taxAmount)) : null);
  const totalCentsRaw =
    record.total_cents ?? (total != null ? Math.round(Number(total)) : null);
  const paidCentsRaw =
    record.amount_paid_cents ??
    record.paid_cents ??
    (amountPaid != null ? Math.round(Number(amountPaid)) : null);
  const totalCents = typeof totalCentsRaw === 'number' ? totalCentsRaw : null;
  const paidCents = typeof paidCentsRaw === 'number' ? paidCentsRaw : null;
  const computedBalance =
    typeof totalCents === 'number' ? totalCents - (paidCents ?? 0) : null;
  const balanceCents =
    typeof record.balance_cents === 'number' ? record.balance_cents : computedBalance;

  return stripUndefined({
    id,
    tenant_id: tenantId,
    customer_id: customerId,
    job_id: toUuid(record.job_id),
    estimate_id: toUuid(record.estimate_id),
    invoice_number: record.invoice_number ?? null,
    title: record.title ?? record.invoice_number ?? `Invoice ${id.slice(0, 8)}`,
    status: record.status ?? 'draft',
    invoice_date: record.invoice_date ?? record.created_at ?? new Date().toISOString(),
    due_date: record.due_date ?? record.invoice_date ?? record.created_at ?? new Date().toISOString(),
    subtotal_amount: subtotal,
    tax_amount: taxAmount,
    total_amount: total,
    subtotal_cents: subtotalCents,
    tax_cents: taxCents,
    total_cents: totalCents,
    amount_paid_cents: paidCents,
    balance_cents: balanceCents,
    paid_amount: amountPaid ?? null,
    line_items: record.items ?? record.line_items ?? [],
    notes: record.notes ?? null,
    created_at: record.created_at ?? new Date().toISOString(),
    updated_at: record.updated_at ?? record.created_at ?? new Date().toISOString(),
  });
};

const normalizeInventoryItem: Normalizer = (record, options) => {
  const id = toUuid(record.id);
  const tenantId = toUuid(record.tenant_id ?? options.tenantId);
  if (!id || !tenantId) return null;

  return stripUndefined({
    id,
    tenant_id: tenantId,
    sku: record.sku ?? null,
    name: record.name ?? 'Inventory Item',
    category: record.category ?? null,
    quantity_on_hand: record.quantity_on_hand ?? record.quantity_in_stock ?? 0,
    allocated: record.allocated ?? record.quantity_reserved ?? 0,
    reorder_point: record.reorder_point ?? null,
    reorder_quantity: record.reorder_quantity ?? null,
    unit: record.unit ?? record.unit_of_measure ?? null,
    unit_cost: record.unit_cost ?? null,
    cost: record.cost ?? null,
    supplier: record.supplier ?? null,
    created_at: record.created_at ?? new Date().toISOString(),
    updated_at:
      record.updated_at ??
      record.last_restock ??
      record.created_at ??
      new Date().toISOString(),
  });
};

const normalizeEquipment: Normalizer = (record, options) => {
  const id = toUuid(record.id);
  const tenantId = toUuid(record.tenant_id ?? options.tenantId);
  if (!id || !tenantId) return null;

  return stripUndefined({
    id,
    tenant_id: tenantId,
    equipment_number: record.equipment_number ?? record.serial_number ?? record.id ?? `EQ-${id.slice(0, 8)}`,
    name: record.name ?? 'Equipment',
    type: record.type ?? null,
    status: record.status ?? 'active',
    serial_number: record.serial_number ?? null,
    purchase_date: record.purchase_date ?? null,
    purchase_price: record.purchase_price ?? null,
    last_service_date: record.last_service ?? null,
    next_service_date: record.next_service ?? null,
    assigned_to_user: null,
    current_location: record.location ?? null,
    created_at: record.created_at ?? new Date().toISOString(),
    updated_at: record.updated_at ?? record.created_at ?? new Date().toISOString(),
  });
};

const normalizeComplianceTask: Normalizer = (record, options) => {
  const id = toUuid(record.id);
  const tenantId = toUuid(record.tenant_id ?? options.tenantId);
  if (!id || !tenantId) return null;

  return stripUndefined({
    id,
    tenant_id: tenantId,
    job_id: toUuid(record.job_id),
    related_purchase_order_id: toUuid(record.related_purchase_order_id),
    task_type: record.task_type ?? null,
    jurisdiction: record.jurisdiction ?? null,
    status: record.status ?? null,
    priority: record.priority ?? null,
    submitted_date: record.submitted_date ?? null,
    issued_date: record.issued_date ?? null,
    due_date: record.due_date ?? null,
    completed_date: record.completed_date ?? null,
    reference_number: record.reference_number ?? null,
    assigned_to: toUuid(record.assigned_to),
    assigned_team: record.assigned_team ?? null,
    description: record.description ?? null,
    location: record.location ?? null,
    requirements: record.requirements ?? [],
    documents: record.documents ?? [],
    checklist: record.checklist ?? [],
    escalated: record.escalated ?? false,
    escalation_reason: record.escalation_reason ?? null,
    sla_minutes: record.sla_minutes ?? null,
    metadata: record.metadata ?? {},
    created_at: record.created_at ?? new Date().toISOString(),
    updated_at: record.updated_at ?? record.created_at ?? new Date().toISOString(),
  });
};

const TABLE_NORMALIZERS: Record<string, Normalizer> = {
  tenants: normalizeTenant,
  customers: normalizeCustomer,
  jobs: normalizeJob,
  estimates: normalizeEstimate,
  schedule_events: normalizeScheduleEvent,
  schedule_assignments: normalizeScheduleAssignment,
  customer_contacts: normalizeCustomerContact,
  employees: normalizeEmployee,
  timesheets: normalizeTimesheet,
  invoices: normalizeInvoice,
  inventory_items: normalizeInventoryItem,
  equipment: normalizeEquipment,
  compliance_tasks: normalizeComplianceTask,
};

const normalizeRecord = (
  table: string,
  record: SeedRecord,
  options: { tenantId?: string }
): SeedRecord | null => {
  const normalizer = TABLE_NORMALIZERS[table];
  if (!normalizer) {
    return stripUndefined({
      ...record,
      id: toUuid(record.id),
      tenant_id: toUuid(record.tenant_id ?? options.tenantId),
    });
  }

  return normalizer(record, options);
};

export class DatabaseSeeder {
  private static instance: DatabaseSeeder;
  private datasetCache?: SeedDataset;
  private datasetPath?: string;
  private supabaseClient?: SupabaseClient;

  private constructor() {}

  static getInstance(): DatabaseSeeder {
    if (!DatabaseSeeder.instance) {
      DatabaseSeeder.instance = new DatabaseSeeder();
    }
    return DatabaseSeeder.instance;
  }

  private getSupabaseClient(): SupabaseClient {
    if (this.supabaseClient) return this.supabaseClient;

    try {
      this.supabaseClient = createServiceRoleClient();
    } catch (error) {
      console.warn(
        '[Seed] Falling back to public Supabase client; service role unavailable. RLS may block inserts.',
        error
      );
      this.supabaseClient = publicSupabase;
    }

    return this.supabaseClient;
  }

  private async countRecords(
    table: string,
    tenantId?: string,
    filter?: (query: any) => any
  ): Promise<{ count: number; error?: string; filterColumn?: string }> {
    const supabase = this.getSupabaseClient();
    const buildQuery = () => supabase.from(table).select('id', { count: 'exact', head: true });

    const runQuery = async (query: any) => {
      const { count, error } = await query;
      if (error) {
        return { count: 0, error: error.message ?? String(error) };
      }
      return { count: count ?? 0 };
    };

    if (!tenantId) {
      let query = buildQuery();
      if (filter) {
        query = filter(query);
      }
      return runQuery(query);
    }

    const tenantColumns = ['tenant_id', 'org_id'];
    for (const column of tenantColumns) {
      let query = buildQuery();
      if (filter) {
        query = filter(query);
      }
      query = query.eq(column as never, tenantId);
      const { count, error } = await query;
      if (!error) {
        return { count: count ?? 0, filterColumn: column };
      }
      const message = error?.message ?? String(error ?? '');
      if (!message.includes(`column ${column}`) && !message.includes(`Column "${column}" does not exist`)) {
        return { count: 0, error: message };
      }
    }

    let fallbackQuery = buildQuery();
    if (filter) {
      fallbackQuery = filter(fallbackQuery);
    }
    return runQuery(fallbackQuery);
  }

  private async verifySeedData(tenantId?: string): Promise<SeedVerificationSummary> {
    const checks: SeedVerificationCheck[] = [];

    const evaluateCount = async (config: {
      id: string;
      table: string;
      description: string;
      minCount: number;
      filter?: (query: any) => any;
    }) => {
      const { id, table, description, minCount, filter } = config;
      const result = await this.countRecords(table, tenantId, filter);
      if (result.error) {
        checks.push({
          id,
          table,
          description,
          status: 'fail',
          count: result.count,
          details: result.error
        });
        return;
      }

      const status = result.count >= minCount ? 'pass' : 'fail';
      const details =
        status === 'pass'
          ? undefined
          : `Expected at least ${minCount} record(s), found ${result.count}`;

      checks.push({
        id,
        table,
        description,
        status,
        count: result.count,
        details
      });
    };

    await evaluateCount({
      id: 'customers',
      table: 'customers',
      description: 'Customers seeded for demo workflows',
      minCount: 1
    });

    await evaluateCount({
      id: 'jobs',
      table: 'jobs',
      description: 'Jobs seeded with scheduling context',
      minCount: 1
    });

    await evaluateCount({
      id: 'estimates',
      table: 'estimates',
      description: 'Estimates available for estimating workflows',
      minCount: 1
    });

    await evaluateCount({
      id: 'invoices',
      table: 'invoices',
      description: 'Invoices populated for finance flows',
      minCount: 1
    });

    await evaluateCount({
      id: 'schedule_events',
      table: 'schedule_events',
      description: 'Schedule events seeded for crew planning',
      minCount: 1
    });

    await evaluateCount({
      id: 'weather_sensitive_events',
      table: 'schedule_events',
      description: 'Weather-dependent schedule coverage available',
      minCount: 1,
      filter: (query: any) =>
        query.eq('weather_dependent', true).neq('weather_status', 'clear')
    });

    const supabase = this.getSupabaseClient();
    let crewStatus: SeedVerificationCheck['status'] = 'fail';
    let crewCount = 0;
    let crewDetails: string | undefined;

    try {
      let query = supabase
        .from('schedule_events')
        .select('id, crew_members, tenant_id, org_id')
        .limit(20);

      if (tenantId) {
        query = query.or(`tenant_id.eq.${tenantId},org_id.eq.${tenantId}`);
      }

      const { data, error } = await query;
      if (error) {
        crewDetails = error.message;
      } else if (data && data.length > 0) {
        const eventsWithCrew = data.filter(
          (event) => Array.isArray((event as Record<string, unknown>).crew_members) &&
            ((event as Record<string, unknown>).crew_members as unknown[]).length > 0
        );
        crewCount = eventsWithCrew.length;
        crewStatus = crewCount > 0 ? 'pass' : 'fail';
        crewDetails = crewCount > 0
          ? `Crew assignments present on ${crewCount} sampled event(s)`
          : 'No crew assignments found on sampled schedule events';
      } else {
        crewDetails = 'No schedule events returned for crew verification';
      }
    } catch (error) {
      crewDetails = error instanceof Error ? error.message : String(error);
    }

    checks.push({
      id: 'crew_assignments',
      table: 'schedule_events',
      description: 'Crew assignments populated on schedule events',
      status: crewStatus,
      count: crewCount,
      details: crewDetails
    });

    const summary: SeedVerificationSummary = {
      passed: checks.filter((check) => check.status === 'pass').length,
      failed: checks.filter((check) => check.status === 'fail').length,
      warnings: checks.filter((check) => check.status === 'warn').length,
      checks
    };

    return summary;
  }

  async seedAll(options?: SeedOptions): Promise<SeedRunResults> {
    const dataset = await this.loadDataset(options?.datasetPath);
    const tenantId = options?.tenantId ?? dataset.meta.tenant_id;
    const seedOptions: SeedOptions = { ...options, tenantId };

    const tenants = await this.seedTable('tenants', dataset.tenants, seedOptions, {
      conflictTarget: DEFAULT_CONFLICT
    });
    const customers = await this.seedTable('customers', dataset.customers, seedOptions, {
      conflictTarget: DEFAULT_CONFLICT
    });
    const jobs = await this.seedTable('jobs', dataset.jobs, seedOptions, {
      conflictTarget: DEFAULT_CONFLICT
    });
    const estimates = await this.seedTable('estimates', dataset.estimates, seedOptions, {
      conflictTarget: DEFAULT_CONFLICT
    });
    const schedules = await this.seedTable(
      'schedule_events',
      dataset.schedule_events,
      seedOptions,
      {
        conflictTarget: DEFAULT_CONFLICT
      }
    );
    const employees = await this.seedTable('employees', dataset.employees, seedOptions, {
      conflictTarget: DEFAULT_CONFLICT
    });
    const timesheets = await this.seedTable('timesheets', dataset.timesheets, seedOptions, {
      conflictTarget: DEFAULT_CONFLICT
    });
    const invoices = await this.seedTable('invoices', dataset.invoices, seedOptions, {
      conflictTarget: DEFAULT_CONFLICT
    });
    const inventory = await this.seedTable(
      'inventory_items',
      dataset.inventory_items,
      seedOptions,
      { conflictTarget: DEFAULT_CONFLICT }
    );
    const equipment = await this.seedTable('equipment', dataset.equipment, seedOptions, {
      conflictTarget: DEFAULT_CONFLICT
    });
    const compliance = await this.seedTable(
      'compliance_tasks',
      dataset.compliance_tasks,
      seedOptions,
      {
        conflictTarget: DEFAULT_CONFLICT
      }
    );
    const service_sop_recurring_jobs = await this.seedTable(
      'service_sop_recurring_jobs',
      dataset.service_sop_recurring_jobs,
      seedOptions,
      { conflictTarget: DEFAULT_CONFLICT }
    );
    const service_sop_events = await this.seedTable(
      'service_sop_events',
      dataset.service_sop_events,
      seedOptions,
      { conflictTarget: DEFAULT_CONFLICT }
    );

    // Optional tables (ignore if undefined in dataset)
    const schedule_assignments = await this.seedTable(
      'schedule_assignments',
      (dataset as any).schedule_assignments,
      seedOptions,
      { conflictTarget: DEFAULT_CONFLICT }
    );
    const customer_contacts = await this.seedTable(
      'customer_contacts',
      (dataset as any).customer_contacts,
      seedOptions,
      { conflictTarget: DEFAULT_CONFLICT }
    );

    await this.handlePostSeed(
      dataset,
      {
        tenants,
        customers,
        jobs,
        estimates,
        schedules,
        schedule_assignments,
        customer_contacts,
        employees,
        timesheets,
        invoices,
        inventory,
        equipment,
        compliance,
        service_sop_recurring_jobs,
        service_sop_events
      },
      seedOptions
    );

    const verification = seedOptions.dryRun
      ? { passed: 0, failed: 0, warnings: 0, checks: [] }
      : await this.verifySeedData(tenantId);

    return {
      dataset: {
        path: this.datasetPath ?? 'supabase/seeds/weathercraft-dev.json',
        tenantId,
        version: dataset.meta.version
      },
      tenants,
      customers,
      jobs,
      estimates,
      schedules,
      schedule_assignments,
      customer_contacts,
      employees,
      timesheets,
      invoices,
      inventory,
      equipment,
      compliance,
      service_sop_recurring_jobs,
      service_sop_events,
      verification
    };
  }

  private async loadDataset(datasetPath?: string): Promise<SeedDataset> {
    const resolvedPath = datasetPath ?? this.datasetPath;
    if (this.datasetCache && resolvedPath === this.datasetPath) {
      return this.datasetCache;
    }

    const dataset = await loadSeedDataset({ datasetPath: resolvedPath });
    this.datasetCache = dataset;
    this.datasetPath = datasetPath ?? this.datasetPath ?? 'supabase/seeds/weathercraft-dev.json';
    return dataset;
  }

  private async seedTable(
    table: string,
    records: SeedRecord[] | undefined,
    options: SeedOptions,
    config: SeedTableConfig
  ): Promise<SeedTableResult> {
    const filtered = filterRecordsForTenant(records, options.tenantId);
    const attempted = filtered.length;

    if (!filtered.length) {
      return {
        table,
        attempted,
        seeded: 0,
        skipped: attempted
      };
    }

    if (options.dryRun) {
      const normalizedDryRun = filtered
        .map((record) => normalizeRecord(table, record, { tenantId: options.tenantId }))
        .filter((value): value is SeedRecord => Boolean(value));

      return {
        table,
        attempted,
        seeded: normalizedDryRun.length,
        skipped: attempted - normalizedDryRun.length,
        dryRun: true
      };
    }

    if (options.truncateBeforeInsert) {
      await this.truncateTable(table, toUuid(options.tenantId));
    }

    const normalized = filtered
      .map((record) => normalizeRecord(table, record, { tenantId: options.tenantId }))
      .filter((value): value is SeedRecord => Boolean(value));

    if (!normalized.length) {
      return {
        table,
        attempted,
        seeded: 0,
        skipped: attempted,
      };
    }

    try {
      const supabase = this.getSupabaseClient();
      const conflictTarget = config.conflictTarget?.length
        ? { onConflict: config.conflictTarget.join(',') }
        : undefined;

      if (config.mode === 'insert') {
        const { error } = await supabase.from(table).insert(normalized);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).upsert(normalized, conflictTarget);
        if (error) throw error;
      }

      return {
        table,
        attempted,
        seeded: normalized.length,
        skipped: attempted - normalized.length
      };
    } catch (error) {
      const serialized =
        error && typeof error === 'object'
          ? JSON.stringify(
              error,
              Object.getOwnPropertyNames(error as Record<string, unknown>)
            )
          : String(error);
      const message =
        typeof (error as { message?: unknown })?.message === 'string'
          ? (error as { message: string }).message
          : serialized;
      console.error(`Failed to seed ${table}:`, message);

      await memoryService.store(
        'seed_error',
        `Seed failed for ${table}`,
        {
          table,
          attempted,
          tenant_id: toUuid(options.tenantId) ?? null,
          error: message,
          timestamp: new Date().toISOString()
        },
        0.8
      );

      return {
        table,
        attempted,
        seeded: 0,
        skipped: attempted,
        error: message
      };
    }
  }

  private async truncateTable(table: string, tenantId?: string) {
    try {
      const supabase = this.getSupabaseClient();
      const query = supabase.from(table).delete();
      if (tenantId) {
        await query.eq('tenant_id', tenantId);
      } else {
        await query;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Unable to truncate ${table}: ${message}`);
    }
  }

  private async handlePostSeed(
    dataset: SeedDataset,
    results: Record<string, SeedTableResult | undefined>,
    options: SeedOptions
  ) {
    if (options.dryRun) return;

    const datasetMeta = {
      dataset: dataset.meta.dataset,
      version: dataset.meta.version,
      description: dataset.meta.description ?? null,
      tenant_id: dataset.meta.tenant_id ?? null,
    } satisfies Record<string, unknown>;

    const serializedResults = Object.fromEntries(
      Object.entries(results).map(([key, value]) => [
        key,
        value
          ? {
              table: value.table,
              attempted: value.attempted,
              seeded: value.seeded,
              skipped: value.skipped,
              dryRun: value.dryRun ?? false,
              error: value.error ?? null,
            }
          : null,
      ])
    ) satisfies Record<string, unknown>;

    await aiOrchestrator.processWorkflow('data_seeded', {
      timestamp: new Date().toISOString(),
      dataset: datasetMeta,
      tenant_id: options.tenantId ?? dataset.meta.tenant_id ?? null,
      results: serializedResults,
    });

    await memoryService.store(
      'system_event',
      'Deterministic database seeding completed',
      {
        dataset: datasetMeta,
        tenant_id: options.tenantId ?? dataset.meta.tenant_id ?? null,
        results: serializedResults,
        timestamp: new Date().toISOString(),
      },
      0.9
    );
  }
}

export const databaseSeeder = DatabaseSeeder.getInstance();
