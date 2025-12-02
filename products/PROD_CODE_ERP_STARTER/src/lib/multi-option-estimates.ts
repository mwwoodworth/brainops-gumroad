/**
 * Multi-Option Estimate Generator
 * Creates Good/Better/Best pricing options like ServiceTitan
 * Enterprise-grade estimate presentation with multiple tiers
 */

export interface EstimateLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  unit: string;
  category: 'materials' | 'labor' | 'equipment' | 'other';
}

export interface EstimateOption {
  tier: 'good' | 'better' | 'best' | 'custom';
  name: string;
  description: string;
  line_items: EstimateLineItem[];
  subtotal: number;
  labor_total: number;
  material_total: number;
  equipment_total: number;
  warranty_years: number;
  warranty_description: string;
  features: string[];
  timeline_days: number;
  payment_terms: string;
  financing_available: boolean;
  monthly_payment_estimate?: number;
  roi_years?: number;
  energy_savings_annual?: number;
}

export interface MultiOptionEstimate {
  estimate_id: string;
  customer_id: string;
  customer_name: string;
  property_address: string;
  project_description: string;
  options: EstimateOption[];
  recommended_tier: 'good' | 'better' | 'best';
  created_at: string;
  expires_at: string;
  created_by: string;
}

/**
 * Material quality tiers for roofing
 */
const MATERIAL_TIERS = {
  good: {
    shingle_type: 'Architectural Shingles (25-year)',
    shingle_brand: 'Standard Grade',
    underlayment: 'Standard Felt',
    ventilation: 'Basic Ridge Vent',
    price_multiplier: 1.0,
  },
  better: {
    shingle_type: 'Premium Architectural (30-year)',
    shingle_brand: 'Mid-Grade Brand',
    underlayment: 'Synthetic Underlayment',
    ventilation: 'Enhanced Ridge & Soffit Vents',
    price_multiplier: 1.35,
  },
  best: {
    shingle_type: 'Designer Shingles (Lifetime)',
    shingle_brand: 'Premium Brand',
    underlayment: 'High-Performance Synthetic',
    ventilation: 'Premium Ventilation System',
    price_multiplier: 1.75,
  },
};

/**
 * Labor burden rate (52% per SOPs)
 */
const LABOR_BURDEN_RATE = 1.52;

/**
 * Calculate base pricing from project specifications
 */
function calculateBasePricing(squareFootage: number, complexity: 'low' | 'medium' | 'high' = 'medium'): {
  materials_base: number;
  labor_base: number;
  equipment_base: number;
} {
  // Convert square footage to roofing squares (100 sq ft = 1 square)
  const squares = squareFootage / 100;

  // Base material cost per square
  let material_per_square = 150; // Standard grade materials

  // Adjust for complexity
  const complexity_multipliers = {
    low: 0.9, // Simple gable roof
    medium: 1.0, // Standard hip/gable combo
    high: 1.3, // Complex with multiple valleys, dormers
  };
  material_per_square *= complexity_multipliers[complexity];

  // Labor hours per square (includes base rate + burden)
  const labor_hours_per_square = 1.5 * complexity_multipliers[complexity];
  const labor_rate_per_hour = 45; // Base rate before burden
  const labor_per_square = labor_hours_per_square * labor_rate_per_hour * LABOR_BURDEN_RATE;

  // Equipment (dumpster, scaffolding, etc.)
  const equipment_base = 800 + squares * 15;

  return {
    materials_base: squares * material_per_square,
    labor_base: squares * labor_per_square,
    equipment_base,
  };
}

/**
 * Generate "Good" tier option - Budget-friendly, quality materials
 */
function generateGoodOption(
  squareFootage: number,
  complexity: 'low' | 'medium' | 'high',
  basePricing: ReturnType<typeof calculateBasePricing>
): EstimateOption {
  const materials = basePricing.materials_base * MATERIAL_TIERS.good.price_multiplier;
  const labor = basePricing.labor_base;
  const equipment = basePricing.equipment_base;

  const line_items: EstimateLineItem[] = [
    {
      description: `${MATERIAL_TIERS.good.shingle_type} - ${MATERIAL_TIERS.good.shingle_brand}`,
      quantity: Math.ceil(squareFootage / 100),
      unit_price: (materials * 0.6) / Math.ceil(squareFootage / 100),
      unit: 'square',
      category: 'materials',
    },
    {
      description: `${MATERIAL_TIERS.good.underlayment}`,
      quantity: Math.ceil(squareFootage / 100),
      unit_price: (materials * 0.15) / Math.ceil(squareFootage / 100),
      unit: 'square',
      category: 'materials',
    },
    {
      description: `${MATERIAL_TIERS.good.ventilation}`,
      quantity: 1,
      unit_price: materials * 0.25,
      unit: 'system',
      category: 'materials',
    },
    {
      description: 'Roof Removal & Installation Labor (with 52% burden)',
      quantity: Math.ceil((squareFootage / 100) * 1.5),
      unit_price: 45 * LABOR_BURDEN_RATE,
      unit: 'hours',
      category: 'labor',
    },
    {
      description: 'Equipment & Disposal (dumpster, scaffolding)',
      quantity: 1,
      unit_price: equipment,
      unit: 'job',
      category: 'equipment',
    },
  ];

  return {
    tier: 'good',
    name: 'Quality Protection',
    description: 'Reliable roofing system with industry-standard materials and workmanship',
    line_items,
    subtotal: materials + labor + equipment,
    labor_total: labor,
    material_total: materials,
    equipment_total: equipment,
    warranty_years: 10,
    warranty_description: '10-year workmanship warranty, 25-year manufacturer material warranty',
    features: [
      '25-year architectural shingles',
      'Standard felt underlayment',
      'Basic ridge ventilation',
      'Professional installation',
      'Debris removal and cleanup',
      '10-year workmanship warranty',
    ],
    timeline_days: 2,
    payment_terms: 'Net 30',
    financing_available: false,
  };
}

/**
 * Generate "Better" tier option - Enhanced durability and performance
 */
function generateBetterOption(
  squareFootage: number,
  complexity: 'low' | 'medium' | 'high',
  basePricing: ReturnType<typeof calculateBasePricing>
): EstimateOption {
  const materials = basePricing.materials_base * MATERIAL_TIERS.better.price_multiplier;
  const labor = basePricing.labor_base * 1.1; // 10% more labor for premium install
  const equipment = basePricing.equipment_base;

  const line_items: EstimateLineItem[] = [
    {
      description: `${MATERIAL_TIERS.better.shingle_type} - ${MATERIAL_TIERS.better.shingle_brand}`,
      quantity: Math.ceil(squareFootage / 100),
      unit_price: (materials * 0.55) / Math.ceil(squareFootage / 100),
      unit: 'square',
      category: 'materials',
    },
    {
      description: `${MATERIAL_TIERS.better.underlayment}`,
      quantity: Math.ceil(squareFootage / 100),
      unit_price: (materials * 0.2) / Math.ceil(squareFootage / 100),
      unit: 'square',
      category: 'materials',
    },
    {
      description: `${MATERIAL_TIERS.better.ventilation}`,
      quantity: 1,
      unit_price: materials * 0.25,
      unit: 'system',
      category: 'materials',
    },
    {
      description: 'Premium Installation Labor (with 52% burden)',
      quantity: Math.ceil((squareFootage / 100) * 1.65),
      unit_price: 45 * LABOR_BURDEN_RATE,
      unit: 'hours',
      category: 'labor',
    },
    {
      description: 'Equipment & Disposal',
      quantity: 1,
      unit_price: equipment,
      unit: 'job',
      category: 'equipment',
    },
  ];

  const subtotal = materials + labor + equipment;

  return {
    tier: 'better',
    name: 'Premium Performance',
    description: 'Enhanced roofing system with premium materials and extended protection',
    line_items,
    subtotal,
    labor_total: labor,
    material_total: materials,
    equipment_total: equipment,
    warranty_years: 20,
    warranty_description: '20-year workmanship warranty, 30-year manufacturer material warranty',
    features: [
      '30-year premium architectural shingles',
      'Synthetic underlayment for superior protection',
      'Enhanced ventilation system',
      'Premium installation techniques',
      'Ice & water shield in critical areas',
      'Debris removal and cleanup',
      '20-year workmanship warranty',
    ],
    timeline_days: 3,
    payment_terms: 'Net 30',
    financing_available: true,
    monthly_payment_estimate: subtotal / 60, // 5-year financing estimate
  };
}

/**
 * Generate "Best" tier option - Ultimate protection and aesthetics
 */
function generateBestOption(
  squareFootage: number,
  complexity: 'low' | 'medium' | 'high',
  basePricing: ReturnType<typeof calculateBasePricing>
): EstimateOption {
  const materials = basePricing.materials_base * MATERIAL_TIERS.best.price_multiplier;
  const labor = basePricing.labor_base * 1.25; // 25% more labor for luxury install
  const equipment = basePricing.equipment_base * 1.1;

  const line_items: EstimateLineItem[] = [
    {
      description: `${MATERIAL_TIERS.best.shingle_type} - ${MATERIAL_TIERS.best.shingle_brand}`,
      quantity: Math.ceil(squareFootage / 100),
      unit_price: (materials * 0.5) / Math.ceil(squareFootage / 100),
      unit: 'square',
      category: 'materials',
    },
    {
      description: `${MATERIAL_TIERS.best.underlayment}`,
      quantity: Math.ceil(squareFootage / 100),
      unit_price: (materials * 0.25) / Math.ceil(squareFootage / 100),
      unit: 'square',
      category: 'materials',
    },
    {
      description: `${MATERIAL_TIERS.best.ventilation}`,
      quantity: 1,
      unit_price: materials * 0.25,
      unit: 'system',
      category: 'materials',
    },
    {
      description: 'Elite Installation Labor (with 52% burden)',
      quantity: Math.ceil((squareFootage / 100) * 1.875),
      unit_price: 45 * LABOR_BURDEN_RATE,
      unit: 'hours',
      category: 'labor',
    },
    {
      description: 'Premium Equipment & Disposal',
      quantity: 1,
      unit_price: equipment,
      unit: 'job',
      category: 'equipment',
    },
  ];

  const subtotal = materials + labor + equipment;
  const annual_energy_savings = 300; // Estimated from better insulation/ventilation

  return {
    tier: 'best',
    name: 'Ultimate Protection',
    description: 'Premier roofing system with designer materials, lifetime warranty, and maximum energy efficiency',
    line_items,
    subtotal,
    labor_total: labor,
    material_total: materials,
    equipment_total: equipment,
    warranty_years: 50,
    warranty_description: 'Lifetime workmanship warranty, Lifetime manufacturer material warranty',
    features: [
      'Designer lifetime shingles with architectural beauty',
      'High-performance synthetic underlayment',
      'Premium ventilation system for maximum efficiency',
      'Elite craftsman installation',
      'Full ice & water shield coverage',
      'Enhanced attic insulation upgrade',
      'Debris removal with premium cleanup',
      'Lifetime workmanship warranty',
      'Energy Star certified materials',
    ],
    timeline_days: 4,
    payment_terms: 'Net 30',
    financing_available: true,
    monthly_payment_estimate: subtotal / 84, // 7-year financing estimate
    roi_years: Math.ceil(subtotal / annual_energy_savings),
    energy_savings_annual: annual_energy_savings,
  };
}

/**
 * Main function: Generate multi-option estimate
 */
export function generateMultiOptionEstimate(params: {
  customer_id: string;
  customer_name: string;
  property_address: string;
  project_description: string;
  square_footage: number;
  complexity?: 'low' | 'medium' | 'high';
  created_by: string;
}): MultiOptionEstimate {
  const {
    customer_id,
    customer_name,
    property_address,
    project_description,
    square_footage,
    complexity = 'medium',
    created_by,
  } = params;

  const basePricing = calculateBasePricing(square_footage, complexity);

  const good = generateGoodOption(square_footage, complexity, basePricing);
  const better = generateBetterOption(square_footage, complexity, basePricing);
  const best = generateBestOption(square_footage, complexity, basePricing);

  // Recommend tier based on property value/customer profile
  // For now, default to "better" as the balanced option
  const recommended_tier = 'better';

  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  return {
    estimate_id: `EST-${Date.now()}`,
    customer_id,
    customer_name,
    property_address,
    project_description,
    options: [good, better, best],
    recommended_tier,
    created_at: now.toISOString(),
    expires_at: expires.toISOString(),
    created_by,
  };
}

/**
 * Calculate financing options for an estimate
 */
export function calculateFinancingOptions(
  amount: number,
  apr: number = 6.99
): {
  months: number;
  monthly_payment: number;
  total_interest: number;
  total_paid: number;
}[] {
  const terms = [12, 24, 36, 48, 60, 84]; // Common financing terms
  const monthly_rate = apr / 100 / 12;

  return terms.map((months) => {
    const monthly_payment =
      (amount * monthly_rate * Math.pow(1 + monthly_rate, months)) /
      (Math.pow(1 + monthly_rate, months) - 1);
    const total_paid = monthly_payment * months;
    const total_interest = total_paid - amount;

    return {
      months,
      monthly_payment: Math.round(monthly_payment * 100) / 100,
      total_interest: Math.round(total_interest * 100) / 100,
      total_paid: Math.round(total_paid * 100) / 100,
    };
  });
}

/**
 * Compare two estimate options side-by-side
 */
export function compareOptions(option1: EstimateOption, option2: EstimateOption): {
  price_difference: number;
  price_difference_percent: number;
  warranty_difference_years: number;
  feature_differences: {
    only_in_option1: string[];
    only_in_option2: string[];
    common: string[];
  };
  value_analysis: string;
} {
  const price_diff = option2.subtotal - option1.subtotal;
  const price_diff_pct = (price_diff / option1.subtotal) * 100;
  const warranty_diff = option2.warranty_years - option1.warranty_years;

  const features1 = new Set(option1.features);
  const features2 = new Set(option2.features);

  const only_in_option1 = option1.features.filter((f) => !features2.has(f));
  const only_in_option2 = option2.features.filter((f) => !features1.has(f));
  const common = option1.features.filter((f) => features2.has(f));

  let value_analysis = '';
  if (price_diff_pct <= 20 && warranty_diff >= 5) {
    value_analysis = 'Excellent value upgrade with significantly extended warranty for modest price increase';
  } else if (price_diff_pct <= 35 && warranty_diff >= 10) {
    value_analysis = 'Strong value upgrade with premium materials and extended protection';
  } else {
    value_analysis = 'Premium upgrade with luxury materials and maximum warranty coverage';
  }

  return {
    price_difference: price_diff,
    price_difference_percent: price_diff_pct,
    warranty_difference_years: warranty_diff,
    feature_differences: {
      only_in_option1,
      only_in_option2,
      common,
    },
    value_analysis,
  };
}
