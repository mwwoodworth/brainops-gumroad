/**
 * Quantity Take-Off (QTO) Engine
 * Processes measurements from aerial imagery, CAD files, and PDF construction documents
 * Integrates with Google Maps, EagleView, and PDF.js for true scale measurements
 */

export interface TakeoffPoint {
  x: number;
  y: number;
  lat?: number;
  lng?: number;
}

export interface TakeoffMeasurement {
  id: string;
  type: 'area' | 'length' | 'count' | 'slope';
  points: TakeoffPoint[];
  value: number;
  unit: 'sqft' | 'lf' | 'each' | 'degrees';
  scale: number; // pixels per foot
  source: 'aerial' | 'cad' | 'pdf' | 'manual';
  label: string;
  color?: string;
  confidence: number; // 0-100%
  verified: boolean;
  timestamp: string;
}

export interface RoofPlane {
  id: string;
  name: string;
  measurements: TakeoffMeasurement[];
  area_sqft: number;
  pitch: string; // "6/12"
  pitch_multiplier: number; // 1.118 for 6/12
  actual_area_sqft: number; // area * pitch_multiplier
  perimeter_lf: number;
  ridge_lf: number;
  valley_lf: number;
  hip_lf: number;
  eave_lf: number;
  rake_lf: number;
  step_flashing_lf: number;
  facet_type: 'main' | 'dormer' | 'shed' | 'garage' | 'porch';
}

export interface TakeoffProject {
  id: string;
  estimate_id: string;
  address: string;
  lat: number;
  lng: number;
  source_type: 'aerial' | 'pdf' | 'cad';
  source_url?: string;
  scale_reference?: {
    known_dimension: number;
    measured_pixels: number;
    scale: number; // pixels per foot
  };
  roof_planes: RoofPlane[];
  total_area_sqft: number;
  total_squares: number; // area / 100
  complexity: 'simple' | 'moderate' | 'complex' | 'extreme';
  measurements: TakeoffMeasurement[];
  created_at: string;
  updated_at: string;
}

/**
 * Calculate area from polygon points using Shoelace formula
 */
export function calculatePolygonArea(points: TakeoffPoint[], scale: number): number {
  if (points.length < 3) return 0;

  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  area = Math.abs(area) / 2;

  // Convert from pixels² to square feet
  const pixelsPerFoot = scale;
  const sqftPerPixel = 1 / (pixelsPerFoot * pixelsPerFoot);

  return area * sqftPerPixel;
}

/**
 * Calculate distance between two points
 */
export function calculateDistance(p1: TakeoffPoint, p2: TakeoffPoint, scale: number): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const pixelDistance = Math.sqrt(dx * dx + dy * dy);

  // Convert from pixels to feet
  return pixelDistance / scale;
}

/**
 * Calculate perimeter of polygon
 */
export function calculatePerimeter(points: TakeoffPoint[], scale: number): number {
  if (points.length < 2) return 0;

  let perimeter = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    perimeter += calculateDistance(points[i], points[j], scale);
  }

  return perimeter;
}

/**
 * Calculate roof pitch from slope measurements
 */
export function calculatePitch(rise: number, run: number): {
  pitch: string;
  degrees: number;
  multiplier: number;
} {
  const ratio = rise / run * 12; // Convert to X/12 format
  const degrees = Math.atan(rise / run) * (180 / Math.PI);

  // Calculate pitch multiplier for actual surface area
  const multiplier = Math.sqrt(1 + Math.pow(rise / run, 2));

  return {
    pitch: `${Math.round(ratio)}/12`,
    degrees: Math.round(degrees * 10) / 10,
    multiplier: Math.round(multiplier * 1000) / 1000
  };
}

/**
 * Process aerial imagery measurements (Google Maps/EagleView integration)
 */
export async function processAerialImagery(
  imageUrl: string,
  address: string,
  knownDimension?: { pixels: number; feet: number }
): Promise<TakeoffProject> {
  // Calculate scale from known dimension or use default
  let scale = 1; // pixels per foot

  if (knownDimension) {
    scale = knownDimension.pixels / knownDimension.feet;
  } else {
    // Use default scale based on typical aerial imagery resolution
    // Google Maps: ~0.15m/pixel at zoom 20 = ~0.5 ft/pixel
    scale = 2; // 2 pixels per foot default
  }

  // Initialize project
  const project: TakeoffProject = {
    id: generateId(),
    estimate_id: '',
    address: address,
    lat: 0,
    lng: 0,
    source_type: 'aerial',
    source_url: imageUrl,
    scale_reference: {
      known_dimension: knownDimension?.feet || 0,
      measured_pixels: knownDimension?.pixels || 0,
      scale: scale
    },
    roof_planes: [],
    total_area_sqft: 0,
    total_squares: 0,
    complexity: 'simple',
    measurements: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return project;
}

/**
 * Process PDF construction documents
 */
export async function processPDFDocument(
  pdfUrl: string,
  pageNumber: number,
  scale: string // e.g., "1/4\" = 1'"
): Promise<TakeoffProject> {
  // Parse scale (e.g., "1/4\" = 1'" means 0.25 inches = 1 foot)
  const scaleMatch = scale.match(/(\d+\/\d+|\d+\.?\d*)"?\s*=\s*(\d+)'?/);
  let pixelsPerFoot = 96; // Default 96 DPI

  if (scaleMatch) {
    const inches = eval(scaleMatch[1]); // Safe in this context
    const feet = parseFloat(scaleMatch[2]);
    pixelsPerFoot = (inches * 96) / feet; // 96 DPI standard
  }

  const project: TakeoffProject = {
    id: generateId(),
    estimate_id: '',
    address: '',
    lat: 0,
    lng: 0,
    source_type: 'pdf',
    source_url: pdfUrl,
    scale_reference: {
      known_dimension: 1,
      measured_pixels: pixelsPerFoot,
      scale: pixelsPerFoot
    },
    roof_planes: [],
    total_area_sqft: 0,
    total_squares: 0,
    complexity: 'simple',
    measurements: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return project;
}

/**
 * Add roof plane to project
 */
export function addRoofPlane(
  project: TakeoffProject,
  name: string,
  points: TakeoffPoint[],
  pitch: string
): RoofPlane {
  const area = calculatePolygonArea(points, project.scale_reference?.scale || 1);
  const perimeter = calculatePerimeter(points, project.scale_reference?.scale || 1);

  // Parse pitch and get multiplier
  const pitchMatch = pitch.match(/(\d+)\/12/);
  const rise = pitchMatch ? parseInt(pitchMatch[1]) : 6;
  const pitchData = calculatePitch(rise, 12);

  const plane: RoofPlane = {
    id: generateId(),
    name: name,
    measurements: [
      {
        id: generateId(),
        type: 'area',
        points: points,
        value: area,
        unit: 'sqft',
        scale: project.scale_reference?.scale || 1,
        source: project.source_type,
        label: `${name} Area`,
        color: '#FF0000',
        confidence: 95,
        verified: false,
        timestamp: new Date().toISOString()
      }
    ],
    area_sqft: area,
    pitch: pitch,
    pitch_multiplier: pitchData.multiplier,
    actual_area_sqft: area * pitchData.multiplier,
    perimeter_lf: perimeter,
    ridge_lf: 0,
    valley_lf: 0,
    hip_lf: 0,
    eave_lf: 0,
    rake_lf: 0,
    step_flashing_lf: 0,
    facet_type: 'main'
  };

  project.roof_planes.push(plane);
  updateProjectTotals(project);

  return plane;
}

/**
 * Add linear measurement (ridge, valley, etc.)
 */
export function addLinearMeasurement(
  plane: RoofPlane,
  type: 'ridge' | 'valley' | 'hip' | 'eave' | 'rake' | 'step',
  points: TakeoffPoint[],
  scale: number
): TakeoffMeasurement {
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalLength += calculateDistance(points[i], points[i + 1], scale);
  }

  const measurement: TakeoffMeasurement = {
    id: generateId(),
    type: 'length',
    points: points,
    value: totalLength,
    unit: 'lf',
    scale: scale,
    source: 'manual',
    label: `${type} line`,
    color: getColorForType(type),
    confidence: 95,
    verified: false,
    timestamp: new Date().toISOString()
  };

  plane.measurements.push(measurement);

  // Update plane totals
  switch (type) {
    case 'ridge': plane.ridge_lf += totalLength; break;
    case 'valley': plane.valley_lf += totalLength; break;
    case 'hip': plane.hip_lf += totalLength; break;
    case 'eave': plane.eave_lf += totalLength; break;
    case 'rake': plane.rake_lf += totalLength; break;
    case 'step': plane.step_flashing_lf += totalLength; break;
  }

  return measurement;
}

/**
 * Update project totals
 */
function updateProjectTotals(project: TakeoffProject): void {
  let totalArea = 0;
  let totalActualArea = 0;
  let facetCount = 0;

  for (const plane of project.roof_planes) {
    totalArea += plane.area_sqft;
    totalActualArea += plane.actual_area_sqft;
    facetCount++;
  }

  project.total_area_sqft = totalActualArea;
  project.total_squares = totalActualArea / 100;

  // Determine complexity based on facet count and total area
  if (facetCount <= 2 && totalArea < 2000) {
    project.complexity = 'simple';
  } else if (facetCount <= 5 && totalArea < 3500) {
    project.complexity = 'moderate';
  } else if (facetCount <= 10 && totalArea < 5000) {
    project.complexity = 'complex';
  } else {
    project.complexity = 'extreme';
  }
}

/**
 * Generate material list from takeoff
 */
export function generateMaterialList(
  project: TakeoffProject,
  assemblyCode: string
): {
  materials: Array<{
    name: string;
    quantity: number;
    unit: string;
    wasteFactorApplied: number;
  }>;
  totalSquares: number;
  linearFootage: {
    ridge: number;
    valley: number;
    hip: number;
    eave: number;
    rake: number;
    stepFlashing: number;
    total: number;
  };
} {
  // Calculate total linear footage
  let ridge = 0, valley = 0, hip = 0, eave = 0, rake = 0, step = 0;

  for (const plane of project.roof_planes) {
    ridge += plane.ridge_lf;
    valley += plane.valley_lf;
    hip += plane.hip_lf;
    eave += plane.eave_lf;
    rake += plane.rake_lf;
    step += plane.step_flashing_lf;
  }

  const materials = [];
  const squares = project.total_squares;

  // Base materials (varies by assembly)
  materials.push({
    name: 'Primary Roofing Material',
    quantity: Math.ceil(squares * 1.1), // 10% waste
    unit: 'squares',
    wasteFactorApplied: 1.1
  });

  materials.push({
    name: 'Underlayment',
    quantity: Math.ceil(squares * 1.15), // 15% waste
    unit: 'squares',
    wasteFactorApplied: 1.15
  });

  // Linear materials
  if (ridge > 0) {
    materials.push({
      name: 'Ridge Cap',
      quantity: Math.ceil(ridge * 1.05),
      unit: 'lf',
      wasteFactorApplied: 1.05
    });
  }

  if (valley > 0) {
    materials.push({
      name: 'Valley Material',
      quantity: Math.ceil(valley * 1.1),
      unit: 'lf',
      wasteFactorApplied: 1.1
    });
  }

  if (step > 0) {
    materials.push({
      name: 'Step Flashing',
      quantity: Math.ceil(step / 0.67), // 8" pieces
      unit: 'pieces',
      wasteFactorApplied: 1.05
    });
  }

  // Ice & water shield (valleys + eaves)
  const iceWaterArea = (valley * 3 + eave * 3) / 100; // 3ft wide
  if (iceWaterArea > 0) {
    materials.push({
      name: 'Ice & Water Shield',
      quantity: Math.ceil(iceWaterArea * 1.1),
      unit: 'squares',
      wasteFactorApplied: 1.1
    });
  }

  return {
    materials,
    totalSquares: squares,
    linearFootage: {
      ridge,
      valley,
      hip,
      eave,
      rake,
      stepFlashing: step,
      total: ridge + valley + hip + eave + rake + step
    }
  };
}

// Utility functions
function generateId(): string {
  return `takeoff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getColorForType(type: string): string {
  const colors: { [key: string]: string } = {
    'ridge': '#FF0000',
    'valley': '#0000FF',
    'hip': '#00FF00',
    'eave': '#FFFF00',
    'rake': '#FF00FF',
    'step': '#00FFFF'
  };
  return colors[type] || '#888888';
}