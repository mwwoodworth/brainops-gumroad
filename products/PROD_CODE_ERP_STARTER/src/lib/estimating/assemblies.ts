/**
 * Roofing Assembly Library
 * Complete predefined assemblies with materials, labor, and waste factors
 * Based on industry standards and RS Means data
 */

export interface AssemblyComponent {
  material_id: string;
  material_name: string;
  quantity_per_unit: number;
  unit: string;
  waste_factor: number; // 1.10 = 10% waste
  unit_cost: number;
}

export interface RoofingAssembly {
  id: string;
  code: string;
  name: string;
  description: string;
  category: 'shingle' | 'tile' | 'metal' | 'flat' | 'slate' | 'wood';
  unit_type: 'square' | 'sqft' | 'lf'; // square = 100 sqft
  components: AssemblyComponent[];
  labor_hours_per_unit: number;
  labor_rate: number;
  equipment_cost_per_unit: number;
  overhead_percentage: number;
  profit_percentage: number;
  complexity_factors: {
    pitch: { [key: string]: number }; // 4/12: 1.0, 8/12: 1.2, 12/12: 1.5
    height: { [key: string]: number }; // 1story: 1.0, 2story: 1.1, 3story: 1.2
    access: { [key: string]: number }; // easy: 1.0, moderate: 1.1, difficult: 1.3
  };
}

/**
 * Standard Roofing Assemblies
 * Complete systems including all components
 */
export const ROOFING_ASSEMBLIES: RoofingAssembly[] = [
  {
    id: 'asm-001',
    code: 'ROOF-ASPH-30YR',
    name: '30-Year Architectural Shingles System',
    description: 'Complete asphalt shingle roof system with 30-year warranty',
    category: 'shingle',
    unit_type: 'square',
    components: [
      {
        material_id: 'mat-001',
        material_name: '30-Year Architectural Shingles',
        quantity_per_unit: 3.0, // 3 bundles per square
        unit: 'bundle',
        waste_factor: 1.10,
        unit_cost: 42.00
      },
      {
        material_id: 'mat-002',
        material_name: 'Synthetic Underlayment',
        quantity_per_unit: 1.0,
        unit: 'square',
        waste_factor: 1.15,
        unit_cost: 25.00
      },
      {
        material_id: 'mat-003',
        material_name: 'Ice & Water Shield',
        quantity_per_unit: 0.2, // 20% of roof area typically
        unit: 'square',
        waste_factor: 1.10,
        unit_cost: 95.00
      },
      {
        material_id: 'mat-004',
        material_name: 'Ridge Cap Shingles',
        quantity_per_unit: 0.35, // 35 lf per square average
        unit: 'lf',
        waste_factor: 1.05,
        unit_cost: 2.80
      },
      {
        material_id: 'mat-005',
        material_name: 'Roofing Nails (1.25")',
        quantity_per_unit: 2.5,
        unit: 'lb',
        waste_factor: 1.10,
        unit_cost: 2.20
      },
      {
        material_id: 'mat-006',
        material_name: 'Step Flashing',
        quantity_per_unit: 10,
        unit: 'piece',
        waste_factor: 1.05,
        unit_cost: 0.85
      },
      {
        material_id: 'mat-007',
        material_name: 'Pipe Boot Flashing',
        quantity_per_unit: 0.3,
        unit: 'each',
        waste_factor: 1.0,
        unit_cost: 18.00
      }
    ],
    labor_hours_per_unit: 2.5, // per square
    labor_rate: 65.00, // per hour
    equipment_cost_per_unit: 5.00,
    overhead_percentage: 10,
    profit_percentage: 15,
    complexity_factors: {
      pitch: {
        '0-4/12': 1.0,
        '5-8/12': 1.15,
        '9-12/12': 1.35,
        '>12/12': 1.60
      },
      height: {
        '1story': 1.0,
        '2story': 1.10,
        '3story': 1.25,
        '>3story': 1.40
      },
      access: {
        'easy': 1.0,
        'moderate': 1.10,
        'difficult': 1.25,
        'extreme': 1.50
      }
    }
  },
  {
    id: 'asm-002',
    code: 'ROOF-TILE-CLAY',
    name: 'Clay Tile Roofing System',
    description: 'Complete clay tile roof system with underlayment',
    category: 'tile',
    unit_type: 'square',
    components: [
      {
        material_id: 'mat-101',
        material_name: 'Clay Roof Tiles (Spanish S)',
        quantity_per_unit: 90, // pieces per square
        unit: 'piece',
        waste_factor: 1.12,
        unit_cost: 3.50
      },
      {
        material_id: 'mat-102',
        material_name: 'Tile Underlayment (40#)',
        quantity_per_unit: 1.0,
        unit: 'square',
        waste_factor: 1.15,
        unit_cost: 45.00
      },
      {
        material_id: 'mat-103',
        material_name: 'Battens (1x2)',
        quantity_per_unit: 100,
        unit: 'lf',
        waste_factor: 1.10,
        unit_cost: 0.45
      },
      {
        material_id: 'mat-104',
        material_name: 'Ridge/Hip Tiles',
        quantity_per_unit: 0.35,
        unit: 'lf',
        waste_factor: 1.08,
        unit_cost: 4.80
      },
      {
        material_id: 'mat-105',
        material_name: 'Tile Fasteners',
        quantity_per_unit: 90,
        unit: 'piece',
        waste_factor: 1.15,
        unit_cost: 0.12
      },
      {
        material_id: 'mat-106',
        material_name: 'Mortar Mix',
        quantity_per_unit: 1.5,
        unit: 'bag',
        waste_factor: 1.20,
        unit_cost: 12.00
      }
    ],
    labor_hours_per_unit: 4.5,
    labor_rate: 75.00,
    equipment_cost_per_unit: 15.00,
    overhead_percentage: 12,
    profit_percentage: 18,
    complexity_factors: {
      pitch: {
        '0-4/12': 1.0,
        '5-8/12': 1.20,
        '9-12/12': 1.45,
        '>12/12': 1.75
      },
      height: {
        '1story': 1.0,
        '2story': 1.15,
        '3story': 1.35,
        '>3story': 1.55
      },
      access: {
        'easy': 1.0,
        'moderate': 1.15,
        'difficult': 1.35,
        'extreme': 1.60
      }
    }
  },
  {
    id: 'asm-003',
    code: 'ROOF-METAL-STAND',
    name: 'Standing Seam Metal Roof System',
    description: 'Complete standing seam metal roof with clips and fasteners',
    category: 'metal',
    unit_type: 'square',
    components: [
      {
        material_id: 'mat-201',
        material_name: 'Standing Seam Panels (24 ga)',
        quantity_per_unit: 1.0,
        unit: 'square',
        waste_factor: 1.08,
        unit_cost: 385.00
      },
      {
        material_id: 'mat-202',
        material_name: 'Synthetic Underlayment',
        quantity_per_unit: 1.0,
        unit: 'square',
        waste_factor: 1.15,
        unit_cost: 28.00
      },
      {
        material_id: 'mat-203',
        material_name: 'Panel Clips',
        quantity_per_unit: 50,
        unit: 'piece',
        waste_factor: 1.05,
        unit_cost: 0.95
      },
      {
        material_id: 'mat-204',
        material_name: 'Ridge Cap',
        quantity_per_unit: 0.35,
        unit: 'lf',
        waste_factor: 1.05,
        unit_cost: 12.50
      },
      {
        material_id: 'mat-205',
        material_name: 'Eave Trim',
        quantity_per_unit: 0.40,
        unit: 'lf',
        waste_factor: 1.05,
        unit_cost: 8.50
      },
      {
        material_id: 'mat-206',
        material_name: 'Sealant/Closures',
        quantity_per_unit: 2,
        unit: 'unit',
        waste_factor: 1.10,
        unit_cost: 18.00
      }
    ],
    labor_hours_per_unit: 3.5,
    labor_rate: 85.00,
    equipment_cost_per_unit: 12.00,
    overhead_percentage: 12,
    profit_percentage: 20,
    complexity_factors: {
      pitch: {
        '0-4/12': 1.0,
        '5-8/12': 1.10,
        '9-12/12': 1.25,
        '>12/12': 1.45
      },
      height: {
        '1story': 1.0,
        '2story': 1.12,
        '3story': 1.28,
        '>3story': 1.45
      },
      access: {
        'easy': 1.0,
        'moderate': 1.12,
        'difficult': 1.30,
        'extreme': 1.55
      }
    }
  }
];

/**
 * Get assembly by code
 */
export function getAssemblyByCode(code: string): RoofingAssembly | undefined {
  return ROOFING_ASSEMBLIES.find(a => a.code === code);
}

/**
 * Calculate assembly cost with complexity factors
 */
export function calculateAssemblyCost(
  assembly: RoofingAssembly,
  quantity: number,
  complexity: {
    pitch: string;
    height: string;
    access: string;
  }
): {
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  overheadCost: number;
  profitAmount: number;
  totalCost: number;
  breakdown: any[];
} {
  // Get complexity multipliers
  const pitchFactor = assembly.complexity_factors.pitch[complexity.pitch] || 1.0;
  const heightFactor = assembly.complexity_factors.height[complexity.height] || 1.0;
  const accessFactor = assembly.complexity_factors.access[complexity.access] || 1.0;
  const totalComplexityFactor = pitchFactor * heightFactor * accessFactor;

  // Calculate material costs
  let materialCost = 0;
  const breakdown = assembly.components.map(component => {
    const qty = component.quantity_per_unit * quantity * component.waste_factor;
    const cost = qty * component.unit_cost;
    materialCost += cost;
    return {
      material: component.material_name,
      quantity: qty,
      unit: component.unit,
      unitCost: component.unit_cost,
      totalCost: cost
    };
  });

  // Calculate labor cost with complexity
  const laborHours = assembly.labor_hours_per_unit * quantity * totalComplexityFactor;
  const laborCost = laborHours * assembly.labor_rate;

  // Equipment cost
  const equipmentCost = assembly.equipment_cost_per_unit * quantity;

  // Subtotal
  const subtotal = materialCost + laborCost + equipmentCost;

  // Overhead & Profit
  const overheadCost = subtotal * (assembly.overhead_percentage / 100);
  const profitAmount = (subtotal + overheadCost) * (assembly.profit_percentage / 100);

  // Total
  const totalCost = subtotal + overheadCost + profitAmount;

  return {
    materialCost,
    laborCost,
    equipmentCost,
    overheadCost,
    profitAmount,
    totalCost,
    breakdown
  };
}

/**
 * Get recommended assemblies based on project requirements
 */
export function getRecommendedAssemblies(
  roofType: string,
  budget: 'economy' | 'standard' | 'premium',
  climate: 'hot' | 'cold' | 'mixed' | 'coastal'
): RoofingAssembly[] {
  // Filter assemblies based on requirements
  let recommended = ROOFING_ASSEMBLIES;

  // Filter by roof type if specified
  if (roofType) {
    recommended = recommended.filter(a => a.category === roofType);
  }

  // Sort by budget preference
  recommended.sort((a, b) => {
    const costA = calculateAssemblyCost(a, 1, {
      pitch: '5-8/12',
      height: '2story',
      access: 'moderate'
    }).totalCost;
    const costB = calculateAssemblyCost(b, 1, {
      pitch: '5-8/12',
      height: '2story',
      access: 'moderate'
    }).totalCost;

    if (budget === 'economy') return costA - costB;
    if (budget === 'premium') return costB - costA;
    return 0;
  });

  return recommended.slice(0, 3);
}