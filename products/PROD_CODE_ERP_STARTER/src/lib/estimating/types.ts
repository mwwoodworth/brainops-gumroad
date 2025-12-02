import type { JsonObject, JsonValue } from '@/types/json';

export type UUID = `${string}-${string}-${string}-${string}-${string}`;

export interface Tenant {
  id: UUID;
  name: string;
  slug: string | null;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface TenantSettings {
  tenant_id: UUID;
  default_timezone: string;
  weather_provider: string;
  forecast_horizon_days: number;
  minimum_install_hours_per_day: number;
  created_at: string;
  updated_at: string;
}

export type ItbStatus =
  | 'NEW'
  | 'QUALIFYING'
  | 'TAKEOFF_IN_PROGRESS'
  | 'ESTIMATING'
  | 'PRICED'
  | 'QA_REVIEW'
  | 'SUBMITTED'
  | 'AWARDED'
  | 'LOST'
  | 'HANDOFF';

export interface ItbRequest {
  id: UUID;
  tenant_id: UUID;
  project_code: string | null;
  name: string;
  source: string;
  client_name: string | null;
  location: JsonValue | null;
  address: string | null;
  status: ItbStatus;
  site_walk_at: string | null;
  rfi_due_at: string | null;
  bid_due_at: string | null;
  ntp_target_at: string | null;
  start_window_start: string | null;
  start_window_end: string | null;
  notes: string | null;
  created_by: UUID | null;
  created_at: string;
  updated_at: string;
}

export type ItbFileKind =
  | 'SPEC'
  | 'DRAWING_PDF'
  | 'DXF'
  | 'ADDENDUM'
  | 'PHOTO'
  | 'PRODUCT_DATA'
  | 'PROPOSAL_PDF';

export interface ItbFile {
  id: UUID;
  tenant_id: UUID;
  itb_id: UUID;
  kind: ItbFileKind;
  storage_uri: string;
  file_name: string;
  pages: number | null;
  uploaded_by: UUID | null;
  created_at: string;
}

export interface Assembly {
  id: UUID;
  tenant_id: UUID;
  name: string;
  code: string | null;
  manufacturer: string | null;
  system_type: string | null;
  base_productivity_sqft_per_hr: number | null;
  default_labor_rate_per_hr: number | null;
  equipment_cost_per_sq: number | null;
  default_overhead_pct: number | null;
  default_fee_pct: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: UUID;
  tenant_id: UUID;
  sku: string | null;
  name: string;
  unit: string;
  cost: number;
  lead_time_days: number;
  supplier: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaterialConstraint {
  id: UUID;
  tenant_id: UUID;
  material_id: UUID;
  min_temp_f: number | null;
  requires_rising: boolean;
  min_continuous_window_minutes: number;
  max_wind_mph: number | null;
  max_precip_prob: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaterialWithConstraint {
  material: Material;
  constraint: MaterialConstraint | null;
}

export interface AssemblyMaterial {
  tenant_id: UUID;
  assembly_id: UUID;
  material_id: UUID;
  usage_per_sq: number | null;
  usage_unit: string | null;
  waste_factor_pct: number | null;
  created_at: string;
  updated_at: string;
}

export interface DrawingSet {
  id: UUID;
  tenant_id: UUID;
  itb_id: UUID;
  title: string | null;
  created_at: string;
}

export interface DxfLayer {
  id: UUID;
  tenant_id: UUID;
  drawing_set_id: UUID;
  layer_name: string;
  mapped_assembly_id: UUID | null;
  color: string | null;
  notes: string | null;
  created_at: string;
}

export type TakeoffFeatureType = 'AREA' | 'LINEAR' | 'COUNT';

export interface TakeoffQuantity {
  id: UUID;
  tenant_id: UUID;
  itb_id: UUID;
  source: 'DXF' | 'PDF' | 'MANUAL';
  feature_type: TakeoffFeatureType;
  layer_name: string | null;
  mapped_assembly_id: UUID | null;
  qty_sqft: number | null;
  qty_lf: number | null;
  qty_count: number | null;
  notes: string | null;
  created_at: string;
}

export type EstimateStatus =
  | 'draft'
  | 'in_review'
  | 'finalized'
  | 'submitted'
  | 'awarded'
  | 'lost';

export interface Estimate {
  id: UUID;
  tenant_id: UUID;
  itb_id: UUID;
  status: EstimateStatus;
  subtotal: number;
  overhead: number;
  fee: number;
  total: number;
  labor_hours: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EstimateItem {
  id: UUID;
  tenant_id: UUID;
  estimate_id: UUID;
  assembly_id: UUID | null;
  description: string | null;
  qty_sq: number | null;
  material_cost: number;
  labor_cost: number;
  equipment_cost: number;
  extended_cost: number;
  alt_group: string | null;
  notes: string | null;
  created_at: string;
}

export interface InstallabilityWindow {
  id: UUID;
  tenant_id: UUID;
  itb_id: UUID;
  date: string;
  start_time: string;
  end_time: string;
  rule_summary: string | null;
  window_minutes: number;
  feasible: boolean;
  created_at: string;
}

export type EstimateFlagSeverity = 'INFO' | 'WARN' | 'CRITICAL';

export type EstimateFlagCode =
  | 'WEATHER_INFEASIBLE'
  | 'RISING_WINDOW_TOO_SHORT'
  | 'LEAD_TIME_RISK'
  | 'MISSING_SPEC_SECTION'
  | 'UNMAPPED_LAYERS'
  | 'FORECAST_DATA_GAP'
  | 'GENERAL';

export interface EstimateFlag {
  id: string;
  tenant_id: UUID;
  estimate_id: UUID;
  severity: EstimateFlagSeverity;
  code: EstimateFlagCode;
  message: string;
  created_at: string;
  resolved_at: string | null;
}

export interface WeatherHourlyCache {
  id: UUID;
  tenant_id: UUID;
  itb_id: UUID | null;
  provider: string;
  fetched_at: string;
  start_at: string;
  end_at: string;
  payload: JsonValue;
}

export interface SchedulePlan {
  id: UUID;
  tenant_id: UUID;
  itb_id: UUID;
  estimate_id: UUID | null;
  suggested_start: string;
  suggested_end: string;
  confidence: number;
  usable_hours_per_day: JsonObject;
  revenue_projection: JsonObject;
  created_at: string;
  updated_at: string;
}

export interface HourlyForecastPoint {
  ts: string;
  temp_f: number;
  wind_mph: number;
  precip_prob: number;
}

export interface InstallabilityComputationInput {
  tenantId: UUID;
  itbId: UUID;
  estimateId: UUID;
  constraints: MaterialConstraint[];
  requiredDailyHours: number;
  forecast: HourlyForecastPoint[];
}

export interface InstallabilityResult {
  windows: Array<{
    date: string;
    windows: Array<{
      start: string;
      end: string;
      minutes: number;
    }>;
    feasible: boolean;
    limitingFactors: string[];
  }>;
  totalFeasibleDays: number;
  flagged: EstimateFlagCode[];
}

export interface ItbDetail {
  itb: ItbRequest;
  files: ItbFile[];
  drawingSets: DrawingSet[];
  takeoff: TakeoffQuantity[];
  estimate: Estimate | null;
  estimateItems: EstimateItem[];
  installability: InstallabilityWindow[];
  schedulePlan: SchedulePlan | null;
}

export interface EstimateComputationTotals {
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  directCost: number;
  overhead: number;
  profit: number;
  fee: number;
  subtotal: number;
  total: number;
  laborHours: number;
}

export interface BuildEstimateResultPayload {
  estimate: Estimate;
  items: EstimateItem[];
  flags: EstimateFlag[];
  totals: EstimateComputationTotals;
  unmappedTakeoffCount: number;
}
