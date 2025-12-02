import { promises as fs } from 'fs';
import { resolve } from 'path';

export interface SeedDatasetMeta {
  dataset: string;
  version: string;
  description?: string;
  tenant_id?: string;
}

export type SeedRecord = Record<string, unknown> & {
  tenant_id?: string | null;
};

export interface SeedDataset {
  meta: SeedDatasetMeta;
  tenants?: SeedRecord[];
  customers?: SeedRecord[];
  jobs?: SeedRecord[];
  estimates?: SeedRecord[];
  schedule_events?: SeedRecord[];
  employees?: SeedRecord[];
  timesheets?: SeedRecord[];
  invoices?: SeedRecord[];
  inventory_items?: SeedRecord[];
  equipment?: SeedRecord[];
  compliance_tasks?: SeedRecord[];
  purchase_orders?: SeedRecord[];
  service_sop_recurring_jobs?: SeedRecord[];
  service_sop_events?: SeedRecord[];
  [table: string]: unknown;
}

export interface LoadSeedDatasetOptions {
  datasetPath?: string;
}

const DEFAULT_DATASET_PATH = resolve(process.cwd(), 'supabase', 'seeds', 'weathercraft-dev.json');

export async function loadSeedDataset(
  options?: LoadSeedDatasetOptions
): Promise<SeedDataset> {
  const datasetPath = options?.datasetPath
    ? resolve(process.cwd(), options.datasetPath)
    : DEFAULT_DATASET_PATH;

  const raw = await fs.readFile(datasetPath, 'utf8');
  const parsed = JSON.parse(raw) as SeedDataset;

  if (!parsed.meta) {
    throw new Error(`Seed dataset at ${datasetPath} is missing required meta block.`);
  }

  return parsed;
}

export function filterRecordsForTenant<T extends SeedRecord>(
  records: T[] | undefined,
  tenantId?: string
): T[] {
  if (!records || records.length === 0) return [];
  if (!tenantId) return [...records];

  return records.filter((record) => {
    if (record.tenant_id == null) return true;
    return record.tenant_id === tenantId;
  });
}
