import { supabaseAdmin } from '@/db/client';
import { DatabaseError } from '@/lib/errors';
import type {
  Assembly,
  AssemblyMaterial,
  DrawingSet,
  DxfLayer,
  Estimate,
  EstimateFlag,
  EstimateItem,
  HourlyForecastPoint,
  InstallabilityWindow,
  ItbDetail,
  ItbFile,
  ItbRequest,
  Material,
  MaterialConstraint,
  SchedulePlan,
  TakeoffQuantity,
  TenantSettings,
  UUID,
  WeatherHourlyCache,
} from './types';

const TABLES = {
  ITB: 'estimating_itb_requests',
  ITB_FILES: 'estimating_itb_files',
  ASSEMBLIES: 'estimating_assemblies',
  MATERIALS: 'estimating_materials',
  MATERIAL_CONSTRAINTS: 'estimating_material_constraints',
  ASSEMBLY_MATERIALS: 'estimating_assembly_materials',
  DRAWING_SETS: 'estimating_drawing_sets',
  DXF_LAYERS: 'estimating_dxf_layers',
  TAKEOFF: 'estimating_takeoff_quantities',
  ESTIMATES: 'estimating_estimates',
  ESTIMATE_ITEMS: 'estimating_estimate_items',
  INSTALLABILITY: 'estimating_installability_windows',
  FLAGS: 'estimating_estimate_flags',
  WEATHER_CACHE: 'estimating_weather_hourly_cache',
  SCHEDULE_PLANS: 'estimating_schedule_plans',
  TENANT_SETTINGS: 'tenant_settings',
} as const;

export interface CreateItbPayload {
  name: string;
  source: string;
  projectCode?: string | null;
  clientName?: string | null;
  address?: string | null;
  notes?: string | null;
  siteWalkAt?: string | null;
  rfiDueAt?: string | null;
  bidDueAt?: string | null;
  ntpTargetAt?: string | null;
  startWindowStart?: string | null;
  startWindowEnd?: string | null;
  location?: { lat: number; lng: number } | null;
  createdBy?: UUID | null;
}

export async function createItb(tenantId: UUID, payload: CreateItbPayload): Promise<ItbRequest> {
  const location = payload.location
    ? { lat: payload.location.lat, lng: payload.location.lng }
    : null;

  const { data, error } = await supabaseAdmin
    .from(TABLES.ITB)
    .insert({
      tenant_id: tenantId,
      name: payload.name,
      source: payload.source,
      project_code: payload.projectCode ?? null,
      client_name: payload.clientName ?? null,
      address: payload.address ?? null,
      notes: payload.notes ?? null,
      site_walk_at: payload.siteWalkAt ?? null,
      rfi_due_at: payload.rfiDueAt ?? null,
      bid_due_at: payload.bidDueAt ?? null,
      ntp_target_at: payload.ntpTargetAt ?? null,
      start_window_start: payload.startWindowStart ?? null,
      start_window_end: payload.startWindowEnd ?? null,
      location,
      status: 'NEW',
      created_by: payload.createdBy ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new DatabaseError('Failed to create ITB request', error);
  }

  return data;
}

export async function getItbById(tenantId: UUID, itbId: UUID): Promise<ItbRequest | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.ITB)
    .select()
    .eq('tenant_id', tenantId)
    .eq('id', itbId)
    .maybeSingle();

  if (error) {
    throw new DatabaseError('Failed to load ITB', error);
  }

  return data ?? null;
}

export async function listItbs(tenantId: UUID, limit = 100): Promise<ItbRequest[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.ITB)
    .select()
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    throw new DatabaseError('Failed to list ITBs', error);
  }

  return data;
}

export async function updateItbStatus(
  tenantId: UUID,
  itbId: UUID,
  status: ItbRequest['status']
): Promise<ItbRequest> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.ITB)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('id', itbId)
    .select()
    .single();

  if (error || !data) {
    throw new DatabaseError('Failed to update ITB status', error);
  }

  return data;
}

export interface UpsertItbFilePayload {
  kind: ItbFile['kind'];
  storageUri: string;
  fileName: string;
  pages?: number | null;
  uploadedBy?: UUID | null;
}

export async function upsertItbFile(
  tenantId: UUID,
  itbId: UUID,
  payload: UpsertItbFilePayload
): Promise<ItbFile> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.ITB_FILES)
    .insert({
      tenant_id: tenantId,
      itb_id: itbId,
      kind: payload.kind,
      storage_uri: payload.storageUri,
      file_name: payload.fileName,
      pages: payload.pages ?? null,
      uploaded_by: payload.uploadedBy ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new DatabaseError('Failed to store ITB file metadata', error);
  }

  return data;
}

export async function getItbDetail(tenantId: UUID, itbId: UUID): Promise<ItbDetail | null> {
  const itb = await getItbById(tenantId, itbId);
  if (!itb) return null;

  const [filesRes, drawingSetsRes, takeoffRes, estimateRes, estimateItemsRes, installabilityRes, scheduleRes] =
    await Promise.all([
      supabaseAdmin
        .from(TABLES.ITB_FILES)
        .select()
        .eq('tenant_id', tenantId)
        .eq('itb_id', itbId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from(TABLES.DRAWING_SETS)
        .select()
        .eq('tenant_id', tenantId)
        .eq('itb_id', itbId)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from(TABLES.TAKEOFF)
        .select()
        .eq('tenant_id', tenantId)
        .eq('itb_id', itbId)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from(TABLES.ESTIMATES)
        .select()
        .eq('tenant_id', tenantId)
        .eq('itb_id', itbId)
        .maybeSingle(),
      supabaseAdmin
        .from(TABLES.ESTIMATE_ITEMS)
        .select()
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from(TABLES.INSTALLABILITY)
        .select()
        .eq('tenant_id', tenantId)
        .eq('itb_id', itbId)
        .order('date', { ascending: true }),
      supabaseAdmin
        .from(TABLES.SCHEDULE_PLANS)
        .select()
        .eq('tenant_id', tenantId)
        .eq('itb_id', itbId)
        .maybeSingle(),
    ]);

  if (filesRes.error) throw new DatabaseError('Failed to load ITB files', filesRes.error);
  if (drawingSetsRes.error) throw new DatabaseError('Failed to load drawing sets', drawingSetsRes.error);
  if (takeoffRes.error) throw new DatabaseError('Failed to load takeoff quantities', takeoffRes.error);
  if (estimateRes.error) throw new DatabaseError('Failed to load estimate', estimateRes.error);
  if (estimateItemsRes.error) throw new DatabaseError('Failed to load estimate items', estimateItemsRes.error);
  if (installabilityRes.error) throw new DatabaseError('Failed to load installability', installabilityRes.error);
  if (scheduleRes.error) throw new DatabaseError('Failed to load schedule plan', scheduleRes.error);

  const estimate = estimateRes.data ?? null;
  const estimateItems =
    estimate && estimateItemsRes.data
      ? estimateItemsRes.data.filter(item => item.estimate_id === estimate.id)
      : [];

  return {
    itb,
    files: filesRes.data ?? [],
    drawingSets: drawingSetsRes.data ?? [],
    takeoff: takeoffRes.data ?? [],
    estimate,
    estimateItems,
    installability: installabilityRes.data ?? [],
    schedulePlan: scheduleRes.data ?? null,
  };
}

export async function listAssemblies(tenantId: UUID): Promise<Assembly[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.ASSEMBLIES)
    .select()
    .eq('tenant_id', tenantId)
    .order('name');

  if (error || !data) {
    throw new DatabaseError('Failed to fetch assemblies', error);
  }

  return data;
}

export async function listMaterials(tenantId: UUID): Promise<Material[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.MATERIALS)
    .select()
    .eq('tenant_id', tenantId)
    .order('name');

  if (error || !data) {
    throw new DatabaseError('Failed to fetch materials', error);
  }

  return data;
}

export async function getMaterialById(tenantId: UUID, materialId: UUID): Promise<Material | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.MATERIALS)
    .select()
    .eq('tenant_id', tenantId)
    .eq('id', materialId)
    .maybeSingle();

  if (error) {
    throw new DatabaseError('Failed to load material', error);
  }

  return data ?? null;
}

export async function getMaterialConstraint(
  tenantId: UUID,
  materialId: UUID
): Promise<MaterialConstraint | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.MATERIAL_CONSTRAINTS)
    .select()
    .eq('tenant_id', tenantId)
    .eq('material_id', materialId)
    .maybeSingle();

  if (error) {
    throw new DatabaseError('Failed to load material constraint', error);
  }

  return data ?? null;
}

export interface UpsertConstraintPayload {
  minTempF?: number | null;
  requiresRising?: boolean;
  minContinuousWindowMinutes?: number;
  maxWindMph?: number | null;
  maxPrecipProb?: number | null;
  notes?: string | null;
}

export async function upsertMaterialConstraint(
  tenantId: UUID,
  materialId: UUID,
  payload: UpsertConstraintPayload
): Promise<MaterialConstraint> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.MATERIAL_CONSTRAINTS)
    .upsert(
      {
        tenant_id: tenantId,
        material_id: materialId,
        min_temp_f: payload.minTempF ?? null,
        requires_rising: payload.requiresRising ?? false,
        min_continuous_window_minutes: payload.minContinuousWindowMinutes ?? 120,
        max_wind_mph: payload.maxWindMph ?? null,
        max_precip_prob: payload.maxPrecipProb ?? null,
        notes: payload.notes ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'material_id' }
    )
    .select()
    .single();

  if (error || !data) {
    throw new DatabaseError('Failed to upsert material constraint', error);
  }

  return data;
}

export async function insertTakeoffQuantities(
  tenantId: UUID,
  rows: Array<{
    tenant_id: UUID;
    itb_id: UUID;
    source: TakeoffQuantity['source'];
    feature_type: TakeoffQuantity['feature_type'];
    layer_name: string | null;
    mapped_assembly_id: UUID | null;
    qty_sqft: number | null;
    qty_lf: number | null;
    qty_count: number | null;
    notes: string | null;
  }>
): Promise<TakeoffQuantity[]> {
  if (rows.length === 0) return [];

  const prepared = rows.map(row => ({
    ...row,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabaseAdmin
    .from(TABLES.TAKEOFF)
    .insert(prepared)
    .select();

  if (error || !data) {
    throw new DatabaseError('Failed to persist takeoff quantities', error);
  }

  return data;
}

export async function clearTakeoffQuantities(
  tenantId: UUID,
  itbId: UUID,
  source: TakeoffQuantity['source']
): Promise<void> {
  const { error } = await supabaseAdmin
    .from(TABLES.TAKEOFF)
    .delete()
    .eq('tenant_id', tenantId)
    .eq('itb_id', itbId)
    .eq('source', source);

  if (error) {
    throw new DatabaseError('Failed to clear takeoff quantities', error);
  }
}

export async function listTakeoffQuantities(
  tenantId: UUID,
  itbId: UUID
): Promise<TakeoffQuantity[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.TAKEOFF)
    .select()
    .eq('tenant_id', tenantId)
    .eq('itb_id', itbId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new DatabaseError('Failed to load takeoff quantities', error);
  }

  return data ?? [];
}

export async function mapTakeoffLayerToAssembly(
  tenantId: UUID,
  itbId: UUID,
  layerName: string,
  assemblyId: UUID | null
): Promise<void> {
  const { error } = await supabaseAdmin
    .from(TABLES.TAKEOFF)
    .update({
      mapped_assembly_id: assemblyId,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('itb_id', itbId)
    .eq('layer_name', layerName);

  if (error) {
    throw new DatabaseError('Failed to map takeoff layer to assembly', error);
  }
}

export async function createEstimate(
  tenantId: UUID,
  itbId: UUID,
  payload: Partial<Estimate>
): Promise<Estimate> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.ESTIMATES)
    .insert({
      tenant_id: tenantId,
      itb_id: itbId,
      status: payload.status ?? 'draft',
      subtotal: payload.subtotal ?? 0,
      overhead: payload.overhead ?? 0,
      fee: payload.fee ?? 0,
      total: payload.total ?? 0,
      labor_hours: payload.labor_hours ?? 0,
      notes: payload.notes ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new DatabaseError('Failed to create estimate', error);
  }

  return data;
}

export async function getEstimateByItb(tenantId: UUID, itbId: UUID): Promise<Estimate | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.ESTIMATES)
    .select()
    .eq('tenant_id', tenantId)
    .eq('itb_id', itbId)
    .maybeSingle();

  if (error) {
    throw new DatabaseError('Failed to fetch estimate by ITB', error);
  }

  return data ?? null;
}

export async function getEstimateById(tenantId: UUID, estimateId: UUID): Promise<Estimate | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.ESTIMATES)
    .select()
    .eq('tenant_id', tenantId)
    .eq('id', estimateId)
    .maybeSingle();

  if (error) {
    throw new DatabaseError('Failed to fetch estimate', error);
  }

  return data ?? null;
}

export async function replaceEstimateItems(
  tenantId: UUID,
  estimateId: UUID,
  items: Array<{
    assembly_id: UUID | null;
    description: string | null;
    qty_sq: number | null;
    material_cost: number;
    labor_cost: number;
    equipment_cost: number;
    extended_cost: number;
    alt_group: string | null;
    notes: string | null;
  }>
): Promise<void> {
  await supabaseAdmin
    .from(TABLES.ESTIMATE_ITEMS)
    .delete()
    .eq('tenant_id', tenantId)
    .eq('estimate_id', estimateId);

  if (items.length === 0) return;

  const rows = items.map(item => ({
    ...item,
    tenant_id: tenantId,
    estimate_id: estimateId,
  }));

  const { error } = await supabaseAdmin
    .from(TABLES.ESTIMATE_ITEMS)
    .insert(rows);

  if (error) {
    throw new DatabaseError('Failed to insert estimate items', error);
  }
}

export async function updateEstimateTotals(
  tenantId: UUID,
  estimateId: UUID,
  totals: Pick<Estimate, 'subtotal' | 'overhead' | 'fee' | 'total' | 'labor_hours'>
): Promise<Estimate> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.ESTIMATES)
    .update({
      subtotal: totals.subtotal,
      overhead: totals.overhead,
      fee: totals.fee,
      total: totals.total,
      labor_hours: totals.labor_hours,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('id', estimateId)
    .select()
    .single();

  if (error || !data) {
    throw new DatabaseError('Failed to update estimate totals', error);
  }

  return data;
}

export async function insertInstallabilityWindows(
  tenantId: UUID,
  itbId: UUID,
  windows: Array<{
    date: string;
    start_time: string;
    end_time: string;
    rule_summary: string | null;
    window_minutes: number;
    feasible: boolean;
  }>
): Promise<InstallabilityWindow[]> {
  await supabaseAdmin
    .from(TABLES.INSTALLABILITY)
    .delete()
    .eq('tenant_id', tenantId)
    .eq('itb_id', itbId);

  if (windows.length === 0) return [];

  const rows = windows.map(window => ({
    tenant_id: tenantId,
    itb_id: itbId,
    date: window.date,
    start_time: window.start_time,
    end_time: window.end_time,
    rule_summary: window.rule_summary,
    window_minutes: window.window_minutes,
    feasible: window.feasible,
  }));

  const { data, error } = await supabaseAdmin
    .from(TABLES.INSTALLABILITY)
    .insert(rows)
    .select();

  if (error || !data) {
    throw new DatabaseError('Failed to store installability windows', error);
  }

  return data;
}

export async function listInstallabilityWindows(tenantId: UUID, itbId: UUID): Promise<InstallabilityWindow[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.INSTALLABILITY)
    .select()
    .eq('tenant_id', tenantId)
    .eq('itb_id', itbId)
    .order('date', { ascending: true });

  if (error || !data) {
    throw new DatabaseError('Failed to load installability windows', error);
  }

  return data;
}

export async function upsertEstimateFlags(
  tenantId: UUID,
  estimateId: UUID,
  flags: EstimateFlag[]
): Promise<void> {
  await supabaseAdmin
    .from(TABLES.FLAGS)
    .delete()
    .eq('tenant_id', tenantId)
    .eq('estimate_id', estimateId);

  if (flags.length === 0) return;

  const rows = flags.map(flag => ({
    ...flag,
    tenant_id: tenantId,
    estimate_id: estimateId,
  }));

  const { error } = await supabaseAdmin
    .from(TABLES.FLAGS)
    .insert(rows);

  if (error) {
    throw new DatabaseError('Failed to upsert estimate flags', error);
  }
}

export async function listEstimateFlags(tenantId: UUID, estimateId: UUID): Promise<EstimateFlag[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.FLAGS)
    .select()
    .eq('tenant_id', tenantId)
    .eq('estimate_id', estimateId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    throw new DatabaseError('Failed to load estimate flags', error);
  }

  return data;
}

export async function cacheForecast(
  tenantId: UUID,
  itbId: UUID,
  provider: string,
  startAt: string,
  endAt: string,
  payload: HourlyForecastPoint[]
): Promise<WeatherHourlyCache> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.WEATHER_CACHE)
    .insert({
      tenant_id: tenantId,
      itb_id: itbId,
      provider,
      fetched_at: new Date().toISOString(),
      start_at: startAt,
      end_at: endAt,
      payload,
    })
    .select()
    .single();

  if (error || !data) {
    throw new DatabaseError('Failed to cache forecast', error);
  }

  return data;
}

export async function getLatestForecast(tenantId: UUID, itbId: UUID): Promise<WeatherHourlyCache | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.WEATHER_CACHE)
    .select()
    .eq('tenant_id', tenantId)
    .eq('itb_id', itbId)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new DatabaseError('Failed to read forecast cache', error);
  }

  return data ?? null;
}

export async function upsertSchedulePlan(
  tenantId: UUID,
  itbId: UUID,
  payload: Omit<SchedulePlan, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
): Promise<SchedulePlan> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.SCHEDULE_PLANS)
    .upsert(
      {
        tenant_id: tenantId,
        itb_id: itbId,
        estimate_id: payload.estimate_id ?? null,
        suggested_start: payload.suggested_start,
        suggested_end: payload.suggested_end,
        confidence: payload.confidence,
        usable_hours_per_day: payload.usable_hours_per_day,
        revenue_projection: payload.revenue_projection,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'itb_id' }
    )
    .select()
    .single();

  if (error || !data) {
    throw new DatabaseError('Failed to upsert schedule plan', error);
  }

  return data;
}

export async function getSchedulePlan(tenantId: UUID, itbId: UUID): Promise<SchedulePlan | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.SCHEDULE_PLANS)
    .select()
    .eq('tenant_id', tenantId)
    .eq('itb_id', itbId)
    .maybeSingle();

  if (error) {
    throw new DatabaseError('Failed to load schedule plan', error);
  }

  return data ?? null;
}

export async function fetchTenantSettings(tenantId: UUID): Promise<TenantSettings | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.TENANT_SETTINGS)
    .select()
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    throw new DatabaseError('Failed to fetch tenant settings', error);
  }

  return data ?? null;
}

export async function getAssembliesByIds(tenantId: UUID, assemblyIds: UUID[]): Promise<Assembly[]> {
  if (assemblyIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from(TABLES.ASSEMBLIES)
    .select()
    .eq('tenant_id', tenantId)
    .in('id', assemblyIds);

  if (error || !data) {
    throw new DatabaseError('Failed to fetch assemblies', error);
  }

  return data;
}

export async function getAssemblyMaterials(tenantId: UUID, assemblyIds: UUID[]): Promise<AssemblyMaterial[]> {
  if (assemblyIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from(TABLES.ASSEMBLY_MATERIALS)
    .select()
    .eq('tenant_id', tenantId)
    .in('assembly_id', assemblyIds);

  if (error || !data) {
    throw new DatabaseError('Failed to load assembly materials', error);
  }

  return data;
}

export async function getMaterialsByIds(tenantId: UUID, materialIds: UUID[]): Promise<Material[]> {
  if (materialIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from(TABLES.MATERIALS)
    .select()
    .eq('tenant_id', tenantId)
    .in('id', materialIds);

  if (error || !data) {
    throw new DatabaseError('Failed to load materials', error);
  }

  return data;
}

export async function getMaterialConstraintsByMaterialIds(
  tenantId: UUID,
  materialIds: UUID[]
): Promise<MaterialConstraint[]> {
  if (materialIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from(TABLES.MATERIAL_CONSTRAINTS)
    .select()
    .eq('tenant_id', tenantId)
    .in('material_id', materialIds);

  if (error || !data) {
    throw new DatabaseError('Failed to load material constraints', error);
  }

  return data;
}

export async function listEstimateItems(tenantId: UUID, estimateId: UUID): Promise<EstimateItem[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.ESTIMATE_ITEMS)
    .select()
    .eq('tenant_id', tenantId)
    .eq('estimate_id', estimateId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    throw new DatabaseError('Failed to load estimate items', error);
  }

  return data;
}
