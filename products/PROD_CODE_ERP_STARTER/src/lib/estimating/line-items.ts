export interface LineItem {
  total?: number;
  quantity?: number;
  unit_price?: number;
  amount?: number;
  price?: number;
  category?: string;
  item_type?: string;
  type?: string;
  name?: string;
}

export interface LineItemSummary {
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  subcontractorCost: number;
  otherCost: number;
  totalCost: number;
}

const CATEGORY_MAP: Record<string, keyof LineItemSummary> = {
  material: 'materialCost',
  materials: 'materialCost',
  product: 'materialCost',
  products: 'materialCost',
  labor: 'laborCost',
  manpower: 'laborCost',
  crew: 'laborCost',
  equipment: 'equipmentCost',
  rental: 'equipmentCost',
  subcontractor: 'subcontractorCost',
  subcontract: 'subcontractorCost',
  subs: 'subcontractorCost',
};

function resolveAmount(item: LineItem): number {
  const candidates = [
    item.total,
    item.amount,
    item.price,
    (item.quantity ?? 0) * (item.unit_price ?? 0),
  ];

  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
      if (!Number.isNaN(rounded) && rounded > 0) {
        return rounded;
      }
    }
  }

  return 0;
}

function resolveCategoryKey(item: LineItem): keyof LineItemSummary {
  const raw = (
    item.category ??
    item.item_type ??
    item.type ??
    item.name ??
    ''
  )
    .toString()
    .trim()
    .toLowerCase();

  if (!raw) return 'otherCost';

  for (const [needle, mappedKey] of Object.entries(CATEGORY_MAP)) {
    if (raw.includes(needle)) {
      return mappedKey;
    }
  }

  return 'otherCost';
}

export function summarizeLineItems(lineItems: unknown): LineItemSummary {
  const summary: LineItemSummary = {
    materialCost: 0,
    laborCost: 0,
    equipmentCost: 0,
    subcontractorCost: 0,
    otherCost: 0,
    totalCost: 0,
  };

  if (!Array.isArray(lineItems)) {
    return summary;
  }

  for (const rawItem of lineItems) {
    if (!rawItem || typeof rawItem !== 'object') continue;

    const item = rawItem as LineItem;
    const amount = resolveAmount(item);
    if (amount <= 0) continue;

    const key = resolveCategoryKey(item);
    summary[key] += amount;
    summary.totalCost += amount;
  }

  (Object.keys(summary) as Array<keyof LineItemSummary>).forEach(key => {
    summary[key] = Math.round((summary[key] + Number.EPSILON) * 100) / 100;
  });

  return summary;
}
