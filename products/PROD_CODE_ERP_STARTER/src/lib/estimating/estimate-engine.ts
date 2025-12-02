import { randomUUID } from 'node:crypto';
import { DatabaseError } from '@/lib/errors';
import {
  createEstimate,
  getAssembliesByIds,
  getAssemblyMaterials,
  getEstimateByItb,
  getMaterialsByIds,
  listEstimateItems,
  listTakeoffQuantities,
  replaceEstimateItems,
  updateEstimateTotals,
  upsertEstimateFlags,
} from './repository';
import type {
  Assembly,
  AssemblyMaterial,
  BuildEstimateResultPayload,
  Estimate,
  EstimateComputationTotals,
  EstimateFlag,
  Material,
  TakeoffQuantity,
  UUID,
} from './types';

export interface BuildEstimateOptions {
  tenantId: UUID;
  itbId: UUID;
  profitMarginPct: number;
  overheadPct: number;
  feePct: number;
}

const DEFAULT_LABOR_RATE = 65;
const DEFAULT_PRODUCTIVITY_SQFT_PER_HR = 45;

const toCurrency = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const toHours = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export async function buildEstimateFromTakeoff(
  options: BuildEstimateOptions
): Promise<BuildEstimateResultPayload> {
  const takeoff = await listTakeoffQuantities(options.tenantId, options.itbId);

  if (takeoff.length === 0) {
    throw new DatabaseError('No takeoff quantities recorded for this ITB');
  }

  const mapped = takeoff.filter(entry => Boolean(entry.mapped_assembly_id));
  const unmappedCount = takeoff.length - mapped.length;

  if (mapped.length === 0) {
    throw new DatabaseError('No assemblies are mapped to the captured takeoff data.');
  }

  const assemblyIds = Array.from(
    new Set(mapped.map(entry => entry.mapped_assembly_id as UUID))
  );

  const assemblies = await getAssembliesByIds(options.tenantId, assemblyIds);
  const assemblyMap = new Map<UUID, Assembly>(assemblies.map(item => [item.id, item]));

  const assemblyMaterials = await getAssemblyMaterials(options.tenantId, assemblyIds);
  const materialIds = Array.from(
    new Set(assemblyMaterials.map(item => item.material_id))
  );

  const materials = await getMaterialsByIds(options.tenantId, materialIds);
  const materialMap = new Map<UUID, Material>(materials.map(item => [item.id, item]));

  const assemblyMaterialMap = groupAssemblyMaterials(assemblyMaterials);

  const aggregation = new Map<
    UUID,
    {
      assembly: Assembly;
      totalSqft: number;
      totalSquares: number;
      materialCost: number;
      laborHours: number;
      laborCost: number;
      equipmentCost: number;
    }
  >();

  let maxLeadTime = 0;

  for (const entry of mapped) {
    const assemblyId = entry.mapped_assembly_id as UUID;
    const assembly = assemblyMap.get(assemblyId);
    if (!assembly) {
      continue;
    }

    const effectiveSqft = resolveSquareFeet(entry);
    const effectiveSquares = effectiveSqft / 100;

    const materialsForAssembly = assemblyMaterialMap.get(assemblyId) ?? [];
    let materialCost = 0;

    for (const component of materialsForAssembly) {
      const material = materialMap.get(component.material_id);
      if (!material) continue;

      const wasteFactor =
        component.waste_factor_pct !== null && component.waste_factor_pct !== undefined
          ? 1 + component.waste_factor_pct / 100
          : 1;
      const usagePerSq = component.usage_per_sq ?? 0;
      const quantityUnits = usagePerSq * effectiveSquares * wasteFactor;
      const componentCost = quantityUnits * (material.cost ?? 0);
      materialCost += componentCost;

      if (typeof material.lead_time_days === 'number') {
        maxLeadTime = Math.max(maxLeadTime, material.lead_time_days);
      }
    }

    const productivity =
      assembly.base_productivity_sqft_per_hr && assembly.base_productivity_sqft_per_hr > 0
        ? assembly.base_productivity_sqft_per_hr
        : DEFAULT_PRODUCTIVITY_SQFT_PER_HR;
    const laborHours = effectiveSqft / productivity;
    const laborRate = assembly.default_labor_rate_per_hr ?? DEFAULT_LABOR_RATE;
    const laborCost = laborHours * laborRate;

    const equipmentPerSq = assembly.equipment_cost_per_sq ?? 0;
    const equipmentCost = equipmentPerSq * effectiveSquares;

    const existing = aggregation.get(assemblyId);
    if (existing) {
      existing.totalSqft += effectiveSqft;
      existing.totalSquares += effectiveSquares;
      existing.materialCost += materialCost;
      existing.laborHours += laborHours;
      existing.laborCost += laborCost;
      existing.equipmentCost += equipmentCost;
    } else {
      aggregation.set(assemblyId, {
        assembly,
        totalSqft: effectiveSqft,
        totalSquares: effectiveSquares,
        materialCost,
        laborHours,
        laborCost,
        equipmentCost,
      });
    }
  }

  if (aggregation.size === 0) {
    throw new DatabaseError('Unable to compute estimate because no assemblies were resolved.');
  }

  const itemsForInsert = Array.from(aggregation.values()).map(entry => ({
    assembly_id: entry.assembly.id,
    description: entry.assembly.name,
    qty_sq: toHours(entry.totalSquares),
    material_cost: toCurrency(entry.materialCost),
    labor_cost: toCurrency(entry.laborCost),
    equipment_cost: toCurrency(entry.equipmentCost),
    extended_cost: toCurrency(entry.materialCost + entry.laborCost + entry.equipmentCost),
    alt_group: null,
    notes: null,
  }));

  const totals = computeTotals(Array.from(aggregation.values()), options);

  let estimate = await getEstimateByItb(options.tenantId, options.itbId);
  if (!estimate) {
    estimate = await createEstimate(options.tenantId, options.itbId, {
      status: 'draft',
      subtotal: totals.subtotal,
      overhead: totals.overhead,
      fee: totals.fee,
      total: totals.total,
      labor_hours: totals.laborHours,
      notes: null,
    });
  } else {
    estimate = await updateEstimateTotals(options.tenantId, estimate.id, {
      subtotal: totals.subtotal,
      overhead: totals.overhead,
      fee: totals.fee,
      total: totals.total,
      labor_hours: totals.laborHours,
    });
  }

  await replaceEstimateItems(options.tenantId, estimate.id, itemsForInsert);
  const persistedItems = await listEstimateItems(options.tenantId, estimate.id);

  const flags = buildFlags({
    estimate,
    unmappedCount,
    maxLeadTime,
  });

  await upsertEstimateFlags(options.tenantId, estimate.id, flags);

  return {
    estimate,
    items: persistedItems,
    flags,
    totals,
    unmappedTakeoffCount: unmappedCount,
  };
}

interface FlagsInput {
  estimate: Estimate;
  unmappedCount: number;
  maxLeadTime: number;
}

const buildFlags = ({ estimate, unmappedCount, maxLeadTime }: FlagsInput): EstimateFlag[] => {
  const now = new Date().toISOString();
  const results: EstimateFlag[] = [];

  if (unmappedCount > 0) {
    results.push({
      id: randomUUID(),
      tenant_id: estimate.tenant_id,
      estimate_id: estimate.id,
      severity: 'WARN',
      code: 'UNMAPPED_LAYERS',
      message: `${unmappedCount} takeoff entries are not mapped to assemblies.`,
      created_at: now,
      resolved_at: null,
    });
  }

  if (maxLeadTime > 21) {
    results.push({
      id: randomUUID(),
      tenant_id: estimate.tenant_id,
      estimate_id: estimate.id,
      severity: 'WARN',
      code: 'LEAD_TIME_RISK',
      message: `One or more materials exceed ${maxLeadTime} days of lead time.`,
      created_at: now,
      resolved_at: null,
    });
  }

  if (results.length === 0) {
    results.push({
      id: randomUUID(),
      tenant_id: estimate.tenant_id,
      estimate_id: estimate.id,
      severity: 'INFO',
      code: 'GENERAL',
      message: 'Estimate generated successfully from takeoff quantities.',
      created_at: now,
      resolved_at: null,
    });
  }

  return results;
};

const groupAssemblyMaterials = (
  rows: AssemblyMaterial[]
): Map<UUID, AssemblyMaterial[]> => {
  const map = new Map<UUID, AssemblyMaterial[]>();
  rows.forEach(row => {
    const existing = map.get(row.assembly_id);
    if (existing) {
      existing.push(row);
    } else {
      map.set(row.assembly_id, [row]);
    }
  });
  return map;
};

const resolveSquareFeet = (takeoff: TakeoffQuantity): number => {
  if (typeof takeoff.qty_sqft === 'number' && !Number.isNaN(takeoff.qty_sqft)) {
    return takeoff.qty_sqft;
  }

  if (typeof takeoff.qty_lf === 'number' && !Number.isNaN(takeoff.qty_lf)) {
    return takeoff.qty_lf;
  }

  if (typeof takeoff.qty_count === 'number' && !Number.isNaN(takeoff.qty_count)) {
    return takeoff.qty_count * 10;
  }

  return 0;
};

const computeTotals = (
  rows: Array<{
    materialCost: number;
    laborCost: number;
    equipmentCost: number;
    laborHours: number;
  }>,
  options: BuildEstimateOptions
): EstimateComputationTotals => {
  const directMaterial = rows.reduce((sum, row) => sum + row.materialCost, 0);
  const directLabor = rows.reduce((sum, row) => sum + row.laborCost, 0);
  const directEquipment = rows.reduce((sum, row) => sum + row.equipmentCost, 0);
  const laborHours = rows.reduce((sum, row) => sum + row.laborHours, 0);

  const directCost = directMaterial + directLabor + directEquipment;
  const profit = directCost * (options.profitMarginPct / 100);
  const overhead = directCost * (options.overheadPct / 100);
  const fee = directCost * (options.feePct / 100);
  const subtotal = directCost + profit;
  const total = subtotal + overhead + fee;

  return {
    materialCost: toCurrency(directMaterial),
    laborCost: toCurrency(directLabor),
    equipmentCost: toCurrency(directEquipment),
    directCost: toCurrency(directCost),
    profit: toCurrency(profit),
    overhead: toCurrency(overhead),
    fee: toCurrency(fee),
    subtotal: toCurrency(subtotal),
    total: toCurrency(total),
    laborHours: toHours(laborHours),
  };
};
