/**
 * Roofing Calculation Utilities
 * Industry-standard calculations for roofing contractors
 * Week 9: Roofing-Specific Features
 */

export interface RoofDimensions {
  length: number; // feet
  width: number; // feet
  pitch: number; // rise over 12 (e.g., 6/12 = 6)
}

export interface Pitch {
  rise: number;
  run: number;
  degrees: number;
  percentage: number;
  multiplier: number;
  walkable: boolean;
  safetyRating: 'low' | 'medium' | 'high' | 'extreme';
}

export interface MaterialEstimate {
  squares: number;
  shingleBundles: number;
  underlaymentRolls: number;
  ridgeCapBundles: number;
  starterBundles: number;
  nailsPounds: number;
  dripEdgeFeet: number;
  iceWaterShieldRolls: number;
  estimatedCost: number;
  estimatedLaborHours: number;
  wasteFactor: number;
}

export interface RoofComplexity {
  type: 'simple' | 'moderate' | 'complex';
  wasteFactor: number;
  description: string;
}

/**
 * Calculate roof area in squares (1 square = 100 sq ft)
 */
export function calculateRoofSquares(
  length: number,
  width: number,
  pitch: number
): number {
  // Base area
  const baseArea = length * width;

  // Apply pitch factor to get true surface area
  const pitchFactor = calculatePitchMultiplier(pitch);
  const slopeArea = baseArea * pitchFactor;

  // Convert to squares
  const squares = slopeArea / 100;

  return Math.round(squares * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate pitch multiplier from rise/12 ratio
 */
export function calculatePitchMultiplier(rise: number, run: number = 12): number {
  // Using Pythagorean theorem: √(rise² + run²) / run
  const multiplier = Math.sqrt(Math.pow(rise, 2) + Math.pow(run, 2)) / run;
  return Math.round(multiplier * 1000) / 1000; // Round to 3 decimals
}

/**
 * Calculate pitch degrees from rise/run
 */
export function calculatePitchDegrees(rise: number, run: number = 12): number {
  const radians = Math.atan(rise / run);
  const degrees = radians * (180 / Math.PI);
  return Math.round(degrees * 10) / 10; // Round to 1 decimal
}

/**
 * Calculate rise from degrees
 */
export function calculateRiseFromDegrees(degrees: number, run: number = 12): number {
  const radians = degrees * (Math.PI / 180);
  const rise = Math.tan(radians) * run;
  return Math.round(rise * 10) / 10;
}

/**
 * Get complete pitch information
 */
export function analyzePitch(rise: number, run: number = 12): Pitch {
  const degrees = calculatePitchDegrees(rise, run);
  const percentage = (rise / run) * 100;
  const multiplier = calculatePitchMultiplier(rise, run);
  const walkable = rise < 7;

  let safetyRating: 'low' | 'medium' | 'high' | 'extreme';
  if (rise <= 3) safetyRating = 'low';
  else if (rise <= 6) safetyRating = 'medium';
  else if (rise <= 9) safetyRating = 'high';
  else safetyRating = 'extreme';

  return {
    rise,
    run,
    degrees,
    percentage: Math.round(percentage * 10) / 10,
    multiplier,
    walkable,
    safetyRating,
  };
}

/**
 * Get waste factor based on roof complexity
 */
export function getWasteFactor(complexity: 'simple' | 'moderate' | 'complex'): number {
  const factors = {
    simple: 1.10, // 10% waste
    moderate: 1.15, // 15% waste
    complex: 1.20, // 20% waste
  };
  return factors[complexity];
}

/**
 * Get roof complexity options
 */
export function getRoofComplexities(): RoofComplexity[] {
  return [
    {
      type: 'simple',
      wasteFactor: 1.10,
      description: 'Simple gable or hip roof, few penetrations, straight cuts',
    },
    {
      type: 'moderate',
      wasteFactor: 1.15,
      description: 'Multiple facets, valleys, dormers, moderate complexity',
    },
    {
      type: 'complex',
      wasteFactor: 1.20,
      description: 'Complex design, many valleys, turrets, intricate cuts',
    },
  ];
}

/**
 * Calculate complete material needs
 */
export function calculateMaterialNeeds(
  dimensions: RoofDimensions,
  complexity: 'simple' | 'moderate' | 'complex',
  ridgeFeet: number = 0,
  eaveFeet: number = 0,
  materialCostPerSquare: number = 150
): MaterialEstimate {
  // Calculate base squares
  const baseSquares = calculateRoofSquares(
    dimensions.length,
    dimensions.width,
    dimensions.pitch
  );

  // Apply waste factor
  const wasteFactor = getWasteFactor(complexity);
  const adjustedSquares = baseSquares * wasteFactor;

  // Calculate materials (industry standard coverage)
  const shingleBundles = Math.ceil(adjustedSquares * 3); // 3 bundles per square
  const underlaymentRolls = Math.ceil(adjustedSquares / 4); // 4 squares per roll

  // Ridge cap and starter (if dimensions provided, otherwise estimate)
  const estimatedRidge = ridgeFeet || dimensions.length * 1.5;
  const estimatedEave = eaveFeet || (dimensions.length + dimensions.width) * 2;

  const ridgeCapBundles = Math.ceil(estimatedRidge / 35); // 35 linear feet per bundle
  const starterBundles = Math.ceil(estimatedEave / 105); // 105 linear feet per bundle

  // Fasteners
  const nailsPounds = Math.ceil(adjustedSquares * 2); // 2 lbs per square

  // Drip edge (perimeter)
  const perimeterFeet = (dimensions.length + dimensions.width) * 2;
  const dripEdgeFeet = perimeterFeet;

  // Ice & water shield (typically 2 rows at eaves = 6 feet wide)
  const iceWaterShieldRolls = Math.ceil((estimatedEave * 6) / 200); // 200 sq ft per roll

  // Cost estimation
  const materialCost = adjustedSquares * materialCostPerSquare;
  const laborCost = adjustedSquares * 200; // $200 per square labor
  const estimatedCost = materialCost + laborCost;

  // Labor hours (industry average: 8 hours per square)
  const estimatedLaborHours = Math.ceil(adjustedSquares * 8);

  return {
    squares: Math.round(adjustedSquares * 100) / 100,
    shingleBundles,
    underlaymentRolls,
    ridgeCapBundles,
    starterBundles,
    nailsPounds,
    dripEdgeFeet: Math.ceil(dripEdgeFeet),
    iceWaterShieldRolls,
    estimatedCost: Math.round(estimatedCost),
    estimatedLaborHours,
    wasteFactor,
  };
}

/**
 * Industry standard pitch factors lookup table
 */
export const PITCH_FACTORS: Record<number, { degrees: number; multiplier: number }> = {
  1: { degrees: 4.8, multiplier: 1.003 },
  2: { degrees: 9.5, multiplier: 1.014 },
  3: { degrees: 14.0, multiplier: 1.031 },
  4: { degrees: 18.4, multiplier: 1.054 },
  5: { degrees: 22.6, multiplier: 1.083 },
  6: { degrees: 26.6, multiplier: 1.118 },
  7: { degrees: 30.3, multiplier: 1.158 },
  8: { degrees: 33.7, multiplier: 1.202 },
  9: { degrees: 36.9, multiplier: 1.250 },
  10: { degrees: 39.8, multiplier: 1.302 },
  11: { degrees: 42.5, multiplier: 1.357 },
  12: { degrees: 45.0, multiplier: 1.414 },
  15: { degrees: 51.3, multiplier: 1.601 },
  18: { degrees: 56.3, multiplier: 1.803 },
  21: { degrees: 60.3, multiplier: 2.016 },
  24: { degrees: 63.4, multiplier: 2.236 },
};

/**
 * Validate roof dimensions
 */
export function validateRoofDimensions(dimensions: RoofDimensions): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (dimensions.length <= 0) {
    errors.push('Length must be greater than 0');
  }
  if (dimensions.width <= 0) {
    errors.push('Width must be greater than 0');
  }
  if (dimensions.pitch < 0 || dimensions.pitch > 24) {
    errors.push('Pitch must be between 0 and 24');
  }
  if (dimensions.length > 500) {
    errors.push('Length seems unusually large (>500 feet)');
  }
  if (dimensions.width > 500) {
    errors.push('Width seems unusually large (>500 feet)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format material estimate for display
 */
export function formatMaterialList(estimate: MaterialEstimate): string {
  return `
Material List:
─────────────────────────────────
Roof Area: ${estimate.squares} squares
Waste Factor: ${((estimate.wasteFactor - 1) * 100).toFixed(0)}%

Shingles: ${estimate.shingleBundles} bundles
Underlayment: ${estimate.underlaymentRolls} rolls
Ridge Cap: ${estimate.ridgeCapBundles} bundles
Starter Strip: ${estimate.starterBundles} bundles
Roofing Nails: ${estimate.nailsPounds} lbs
Drip Edge: ${estimate.dripEdgeFeet} feet
Ice & Water Shield: ${estimate.iceWaterShieldRolls} rolls

Estimated Cost: $${estimate.estimatedCost.toLocaleString()}
Estimated Labor: ${estimate.estimatedLaborHours} hours
─────────────────────────────────
  `.trim();
}

/**
 * =============================================================================
 * CRITICAL VALIDATION FUNCTIONS
 * Based on Perplexity Research - Prevents 2400% cost impact errors
 * =============================================================================
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
  suggestedFix?: number | string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Validates roofing squares input
 * CRITICAL: Prevents 2400% cost impact from sq ft vs squares confusion
 *
 * Common error: User enters 2500 (sq ft) instead of 25 (squares)
 */
export function validateSquares(input: number): ValidationResult {
  // Check if user entered square footage instead of roofing squares
  if (input > 100 && input % 100 === 0) {
    return {
      valid: false,
      error: `Did you mean ${input / 100} squares? You entered ${input} which looks like square footage (${input} sq ft = ${input / 100} squares).`,
      suggestedFix: input / 100,
      severity: 'critical',
    };
  }

  // Check for unusually large values
  if (input > 1000) {
    return {
      valid: false,
      warning: `Unusually large: ${input} squares = ${input * 100} sq ft (${(input * 100 / 43560).toFixed(2)} acres). Please verify this is correct.`,
      severity: 'high',
    };
  }

  // Check for impossibly small values
  if (input < 0.1 && input > 0) {
    return {
      valid: false,
      error: `Too small: ${input} squares = ${input * 100} sq ft. Minimum is typically 1 square (100 sq ft).`,
      severity: 'high',
    };
  }

  // Check for negative values
  if (input < 0) {
    return {
      valid: false,
      error: `Negative value not allowed: ${input} squares`,
      severity: 'critical',
    };
  }

  return { valid: true };
}

/**
 * Validates pitch multiplier matches the pitch
 * CRITICAL: Prevents 20% material over-ordering
 *
 * Common error: Using 1.414 for 8/12 pitch instead of correct 1.202
 */
export function validatePitchMultiplier(pitch: number, multiplier: number): ValidationResult {
  const expected = PITCH_FACTORS[pitch]?.multiplier;

  if (!expected) {
    return {
      valid: false,
      error: `Invalid pitch: ${pitch}/12. Supported pitches: 1-12, 15, 18, 21, 24`,
      severity: 'critical',
    };
  }

  // Allow 1% tolerance for rounding
  const tolerance = 0.01;
  if (Math.abs(multiplier - expected) > tolerance) {
    return {
      valid: false,
      error: `Incorrect multiplier for ${pitch}/12 pitch. Should be ${expected}, not ${multiplier}. This will cause ${((multiplier / expected - 1) * 100).toFixed(1)}% material ${multiplier > expected ? 'over' : 'under'}-ordering.`,
      suggestedFix: expected,
      severity: 'critical',
    };
  }

  return { valid: true };
}

/**
 * Validates waste factor is reasonable
 * CRITICAL: Prevents 900% impact errors
 *
 * Common error: Entering 10 (percentage) instead of 1.10 (multiplier)
 */
export function validateWasteFactor(wasteFactor: number, complexity: 'simple' | 'moderate' | 'complex'): ValidationResult {
  const expected = getWasteFactor(complexity);

  // Check if user entered percentage (10) instead of multiplier (1.10)
  if (wasteFactor > 2.0) {
    return {
      valid: false,
      error: `Waste factor ${wasteFactor} is too high. Did you mean ${1 + wasteFactor / 100}? (Waste factor should be 1.10 for 10% waste, not 10)`,
      suggestedFix: 1 + wasteFactor / 100,
      severity: 'critical',
    };
  }

  // Check if waste factor is reasonable
  if (wasteFactor < 1.0 || wasteFactor > 1.5) {
    return {
      valid: false,
      error: `Waste factor ${wasteFactor} is outside normal range (1.05-1.30). Typical: Simple 1.10, Moderate 1.15, Complex 1.20`,
      severity: 'high',
    };
  }

  // Warn if significantly different from expected
  const variance = Math.abs(wasteFactor - expected);
  if (variance > 0.05) {
    return {
      valid: true,
      warning: `Waste factor ${wasteFactor} differs from typical ${expected} for ${complexity} roof (${((expected - 1) * 100).toFixed(0)}% waste). Please verify.`,
      severity: 'medium',
    };
  }

  return { valid: true };
}

/**
 * Validates decimal placement in costs/measurements
 * CRITICAL: Prevents 1000% impact from decimal errors
 *
 * Common error: Entering 2255 instead of 225.5 or 22.55
 */
export function validateDecimalPlacement(
  value: number,
  expectedRange: { min: number; max: number },
  fieldName: string
): ValidationResult {
  if (value < expectedRange.min || value > expectedRange.max) {
    // Check if decimal moved one place
    const onePlace = value / 10;
    if (onePlace >= expectedRange.min && onePlace <= expectedRange.max) {
      return {
        valid: false,
        error: `${fieldName} value $${value.toLocaleString()} is out of range. Did you mean $${onePlace.toLocaleString()}? (Decimal may be misplaced)`,
        suggestedFix: onePlace,
        severity: 'critical',
      };
    }

    // Check if decimal moved two places
    const twoPlaces = value / 100;
    if (twoPlaces >= expectedRange.min && twoPlaces <= expectedRange.max) {
      return {
        valid: false,
        error: `${fieldName} value $${value.toLocaleString()} is out of range. Did you mean $${twoPlaces.toLocaleString()}? (Decimal may be misplaced)`,
        suggestedFix: twoPlaces,
        severity: 'critical',
      };
    }

    return {
      valid: false,
      warning: `${fieldName} value $${value.toLocaleString()} is outside expected range ($${expectedRange.min.toLocaleString()}-$${expectedRange.max.toLocaleString()})`,
      severity: 'high',
    };
  }

  return { valid: true };
}

/**
 * Validates labor calculation
 * CRITICAL: Prevents 87% underestimate from confusing rate vs total
 *
 * Common error: Entering hourly rate ($45) in total cost field
 */
export function validateLaborCost(
  laborHours: number,
  laborRate: number,
  laborTotal: number
): ValidationResult {
  const calculated = laborHours * laborRate;
  const tolerance = 10; // $10 tolerance

  // Check if they entered the rate instead of total
  if (Math.abs(laborTotal - laborRate) < tolerance && laborHours > 1) {
    return {
      valid: false,
      error: `Labor cost $${laborTotal} looks like hourly rate. For ${laborHours} hours at $${laborRate}/hr, total should be $${calculated.toLocaleString()}`,
      suggestedFix: calculated,
      severity: 'critical',
    };
  }

  // Check if calculation is correct
  if (Math.abs(laborTotal - calculated) > tolerance) {
    return {
      valid: false,
      error: `Labor cost mismatch: ${laborHours} hours × $${laborRate}/hr = $${calculated.toLocaleString()}, but entered $${laborTotal.toLocaleString()}`,
      suggestedFix: calculated,
      severity: 'high',
    };
  }

  return { valid: true };
}

/**
 * Comprehensive estimate validation
 * Runs all critical checks before saving estimate
 */
export interface EstimateValidation {
  squares: number;
  pitch: number;
  pitchMultiplier: number;
  wasteFactor: number;
  complexity: 'simple' | 'moderate' | 'complex';
  materialCost: number;
  laborHours: number;
  laborRate: number;
  laborTotal: number;
  totalCost: number;
}

export function validateFullEstimate(estimate: EstimateValidation): {
  valid: boolean;
  issues: ValidationResult[];
  criticalIssues: ValidationResult[];
} {
  const issues: ValidationResult[] = [];

  // 1. Validate squares (CRITICAL - prevents 2400% errors)
  const squaresCheck = validateSquares(estimate.squares);
  if (!squaresCheck.valid || squaresCheck.warning) {
    issues.push(squaresCheck);
  }

  // 2. Validate pitch multiplier (CRITICAL - prevents 20% over-ordering)
  const pitchCheck = validatePitchMultiplier(estimate.pitch, estimate.pitchMultiplier);
  if (!pitchCheck.valid) {
    issues.push(pitchCheck);
  }

  // 3. Validate waste factor (CRITICAL - prevents 900% errors)
  const wasteCheck = validateWasteFactor(estimate.wasteFactor, estimate.complexity);
  if (!wasteCheck.valid || wasteCheck.warning) {
    issues.push(wasteCheck);
  }

  // 4. Validate labor calculation (CRITICAL - prevents 87% underestimate)
  const laborCheck = validateLaborCost(estimate.laborHours, estimate.laborRate, estimate.laborTotal);
  if (!laborCheck.valid) {
    issues.push(laborCheck);
  }

  // 5. Validate material cost per square
  const costPerSquare = estimate.materialCost / estimate.squares;
  const materialCostCheck = validateDecimalPlacement(
    costPerSquare,
    { min: 50, max: 500 },
    'Material cost per square'
  );
  if (!materialCostCheck.valid || materialCostCheck.warning) {
    issues.push({
      ...materialCostCheck,
      warning: `Material cost per square: $${costPerSquare.toFixed(2)}. Typical range: $100-$300/square for asphalt shingles.`,
    });
  }

  // 6. Validate total cost
  const calculatedTotal = estimate.materialCost + estimate.laborTotal;
  if (Math.abs(estimate.totalCost - calculatedTotal) > 100) {
    issues.push({
      valid: false,
      error: `Total cost mismatch: Materials ($${estimate.materialCost.toLocaleString()}) + Labor ($${estimate.laborTotal.toLocaleString()}) = $${calculatedTotal.toLocaleString()}, but total shows $${estimate.totalCost.toLocaleString()}`,
      suggestedFix: calculatedTotal,
      severity: 'high',
    });
  }

  const criticalIssues = issues.filter(i => i.severity === 'critical');

  return {
    valid: criticalIssues.length === 0,
    issues,
    criticalIssues,
  };
}

/**
 * Helper: Convert square feet to squares with validation
 */
export function squareFeetToSquares(sqFt: number): number {
  const squares = sqFt / 100;
  const validation = validateSquares(squares);

  if (!validation.valid && validation.severity === 'critical') {
    console.warn(`Conversion warning: ${sqFt} sq ft = ${squares} squares -`, validation.error);
  }

  return Math.ceil(squares * 100) / 100; // Round up to nearest 0.01
}

/**
 * Helper: Convert squares to square feet
 */
export function squaresToSquareFeet(squares: number): number {
  return squares * 100;
}

/**
 * Calculate complete roofing estimate
 * Used by Quick Estimate workflow
 */
export interface RoofingEstimateInput {
  area: number; // in squares
  pitch: number; // rise over 12
  materialType: 'asphalt' | 'tile' | 'metal' | 'TPO';
  complexity: 'simple' | 'moderate' | 'complex';
  weatherConditions?: 'standard' | 'winter' | 'hurricane' | 'emergency';
}

export interface RoofingEstimateOutput {
  materialsCost: number;
  laborCost: number;
  laborHours: number;
  totalCost: number;
  pitchMultiplier: number;
  wasteFactor: number;
}

export function calculateRoofingEstimate(input: RoofingEstimateInput): RoofingEstimateOutput {
  const { area, pitch, materialType, complexity, weatherConditions = 'standard' } = input;

  // Get pitch multiplier
  const pitchMultiplier = PITCH_FACTORS[pitch]?.multiplier || 1.0;

  // Get waste factor based on complexity
  const wasteFactors = {
    simple: 1.10,
    moderate: 1.15,
    complex: 1.20,
  };
  const wasteFactor = wasteFactors[complexity];

  // Material costs per square (industry averages as of 2025)
  const materialCosts = {
    asphalt: 150, // $150/square
    tile: 400,    // $400/square
    metal: 350,   // $350/square
    TPO: 300,     // $300/square
  };
  const baseMaterialCost = materialCosts[materialType];

  // Calculate actual material needed
  const adjustedSquares = area * pitchMultiplier * wasteFactor;
  const materialsCost = Math.round(adjustedSquares * baseMaterialCost);

  // Labor calculation (industry standard: $75/hr, varies by pitch)
  const laborRate = 75;
  const baseHoursPerSquare = 2.5; // Hours per square for standard pitch
  const pitchLaborMultiplier = pitch <= 4 ? 1.0 : pitch <= 6 ? 1.2 : pitch <= 8 ? 1.5 : 2.0;

  // Weather conditions impact
  const weatherMultipliers = {
    standard: 1.0,
    winter: 1.25,
    hurricane: 1.15,
    emergency: 1.50,
  };
  const weatherMultiplier = weatherMultipliers[weatherConditions];

  const laborHours = Math.round(
    area * baseHoursPerSquare * pitchLaborMultiplier * weatherMultiplier * 10
  ) / 10;
  const laborCost = Math.round(laborHours * laborRate);

  const totalCost = materialsCost + laborCost;

  return {
    materialsCost,
    laborCost,
    laborHours,
    totalCost,
    pitchMultiplier,
    wasteFactor,
  };
}
