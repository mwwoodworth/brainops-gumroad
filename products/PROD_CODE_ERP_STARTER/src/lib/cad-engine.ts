/**
 * CAD/GIS ENGINE - CORE DRAWING AND MEASUREMENT SYSTEM
 *
 * Professional-grade CAD engine for roof takeoff with:
 * - Point, Line, Polygon, Circle, Rectangle drawing tools
 * - Geospatial coordinate system (lat/long)
 * - Real-time area and perimeter calculations
 * - Scale calibration from known dimensions
 * - Layer management
 * - Snap-to-grid and snap-to-point
 * - Assembly integration
 * - Export to GeoJSON
 */

export interface Point {
  x: number; // Canvas coordinates
  y: number;
  lat?: number; // Geospatial coordinates
  lng?: number;
  elevation?: number;
}

export interface Vertex extends Point {
  id: string;
}

export interface DrawingShape {
  id: string;
  type: 'point' | 'line' | 'polygon' | 'polyline' | 'rectangle' | 'circle' | 'measurement';
  vertices: Vertex[];
  properties: {
    label: string;
    area?: number; // square feet
    perimeter?: number; // feet
    length?: number; // feet
    pitch?: number; // roof pitch (e.g., 6 for 6/12)
    slope_factor?: number; // calculated from pitch
    layer: string;
    color: string;
    assembly_code?: string; // linked assembly
    assembly_id?: string;
    notes?: string;
  };
  metadata: {
    created_at: Date;
    created_by: string;
    scale?: number; // pixels per foot
  };
}

export interface CADLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color: string;
  shapes: DrawingShape[];
}

export interface CADProject {
  id: string;
  name: string;
  property_address: string;
  background_image?: string; // PDF or aerial image
  background_scale?: number; // pixels per foot
  background_rotation?: number; // degrees
  center_lat?: number;
  center_lng?: number;
  zoom_level?: number;
  layers: CADLayer[];
  created_at: Date;
  updated_at: Date;
}

/**
 * Calculate distance between two points in feet
 */
export function calculateDistance(p1: Point, p2: Point, scale: number = 1): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const pixelDistance = Math.sqrt(dx * dx + dy * dy);
  return pixelDistance / scale; // Convert to feet
}

/**
 * Calculate area of polygon in square feet using Shoelace formula
 */
export function calculatePolygonArea(vertices: Point[], scale: number = 1): number {
  if (vertices.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }

  const pixelArea = Math.abs(area / 2);
  const feetArea = pixelArea / (scale * scale); // Convert to square feet
  return feetArea;
}

/**
 * Calculate perimeter of polygon in feet
 */
export function calculatePerimeter(vertices: Point[], scale: number = 1): number {
  if (vertices.length < 2) return 0;

  let perimeter = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    perimeter += calculateDistance(vertices[i], vertices[j], scale);
  }

  return perimeter;
}

/**
 * Calculate slope factor from pitch
 * Pitch is rise over 12 (e.g., 6/12 means 6 inches rise per 12 inches run)
 */
export function calculateSlopeFactor(pitch: number): number {
  return Math.sqrt(1 + Math.pow(pitch / 12, 2));
}

/**
 * Apply slope factor to horizontal area to get actual roof area
 */
export function applySlope(horizontalArea: number, pitch: number): number {
  const slopeFactor = calculateSlopeFactor(pitch);
  return horizontalArea * slopeFactor;
}

/**
 * Convert canvas coordinates to geospatial (lat/lng)
 * Uses simple Mercator projection
 */
export function canvasToGeo(
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number,
  centerLat: number,
  centerLng: number,
  zoomLevel: number
): { lat: number; lng: number } {
  // Simplified Mercator projection
  // In production, use a proper projection library like proj4js
  const scale = Math.pow(2, zoomLevel);
  const metersPerPixel = 156543.03392 / scale;

  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  const dx = (x - centerX) * metersPerPixel;
  const dy = (centerY - y) * metersPerPixel;

  const lat = centerLat + (dy / 111320); // 111320 meters per degree
  const lng = centerLng + (dx / (111320 * Math.cos(centerLat * Math.PI / 180)));

  return { lat, lng };
}

/**
 * Convert geospatial coordinates to canvas
 */
export function geoToCanvas(
  lat: number,
  lng: number,
  canvasWidth: number,
  canvasHeight: number,
  centerLat: number,
  centerLng: number,
  zoomLevel: number
): { x: number; y: number } {
  const scale = Math.pow(2, zoomLevel);
  const metersPerPixel = 156543.03392 / scale;

  const dy = (lat - centerLat) * 111320;
  const dx = (lng - centerLng) * (111320 * Math.cos(centerLat * Math.PI / 180));

  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  const x = centerX + (dx / metersPerPixel);
  const y = centerY - (dy / metersPerPixel);

  return { x, y };
}

/**
 * Snap point to grid
 */
export function snapToGrid(point: Point, gridSize: number): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  };
}

/**
 * Find nearest vertex for snapping
 */
export function findNearestVertex(
  point: Point,
  vertices: Vertex[],
  snapDistance: number = 10
): Vertex | null {
  let nearest: Vertex | null = null;
  let minDistance = snapDistance;

  for (const vertex of vertices) {
    const distance = Math.sqrt(
      Math.pow(point.x - vertex.x, 2) + Math.pow(point.y - vertex.y, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = vertex;
    }
  }

  return nearest;
}

/**
 * Export project to GeoJSON format
 */
export function exportToGeoJSON(project: CADProject): any {
  const features = project.layers.flatMap(layer =>
    layer.shapes.map(shape => ({
      type: 'Feature',
      geometry: {
        type: shape.type === 'polygon' ? 'Polygon' :
              shape.type === 'line' || shape.type === 'polyline' ? 'LineString' :
              'Point',
        coordinates: shape.type === 'polygon'
          ? [shape.vertices.map(v => [v.lng || 0, v.lat || 0])]
          : shape.type === 'point'
          ? [shape.vertices[0].lng || 0, shape.vertices[0].lat || 0]
          : shape.vertices.map(v => [v.lng || 0, v.lat || 0])
      },
      properties: {
        id: shape.id,
        ...shape.properties,
        created_at: shape.metadata.created_at,
        created_by: shape.metadata.created_by
      }
    }))
  );

  return {
    type: 'FeatureCollection',
    features
  };
}

/**
 * Import from GeoJSON
 */
export function importFromGeoJSON(geojson: any, projectId: string): CADLayer[] {
  const layers: Map<string, CADLayer> = new Map();

  for (const feature of geojson.features) {
    const layerName = feature.properties.layer || 'Imported';

    if (!layers.has(layerName)) {
      layers.set(layerName, {
        id: `layer-${Date.now()}-${layerName}`,
        name: layerName,
        visible: true,
        locked: false,
        color: feature.properties.color || '#3B82F6',
        shapes: []
      });
    }

    const layer = layers.get(layerName)!;

    const vertices: Vertex[] = [];
    if (feature.geometry.type === 'Polygon') {
      feature.geometry.coordinates[0].forEach((coord: number[], idx: number) => {
        vertices.push({
          id: `vertex-${Date.now()}-${idx}`,
          x: 0, // Will be calculated when rendering
          y: 0,
          lng: coord[0],
          lat: coord[1]
        });
      });
    }

    const shape: DrawingShape = {
      id: feature.properties.id || `shape-${Date.now()}`,
      type: feature.geometry.type === 'Polygon' ? 'polygon' :
            feature.geometry.type === 'LineString' ? 'polyline' :
            'point',
      vertices,
      properties: {
        label: feature.properties.label || 'Imported Shape',
        area: feature.properties.area,
        perimeter: feature.properties.perimeter,
        pitch: feature.properties.pitch,
        layer: layerName,
        color: feature.properties.color || '#3B82F6',
        assembly_code: feature.properties.assembly_code
      },
      metadata: {
        created_at: new Date(feature.properties.created_at || Date.now()),
        created_by: feature.properties.created_by || 'Import'
      }
    };

    layer.shapes.push(shape);
  }

  return Array.from(layers.values());
}

/**
 * Calculate total takeoff summary from all layers
 */
export function calculateTakeoffSummary(layers: CADLayer[]): {
  total_area: number;
  total_perimeter: number;
  ridge_length: number;
  valley_length: number;
  hip_length: number;
  eave_length: number;
  rake_length: number;
  shape_count: number;
} {
  const summary = {
    total_area: 0,
    total_perimeter: 0,
    ridge_length: 0,
    valley_length: 0,
    hip_length: 0,
    eave_length: 0,
    rake_length: 0,
    shape_count: 0
  };

  layers.forEach(layer => {
    if (!layer.visible) return;

    layer.shapes.forEach(shape => {
      summary.shape_count++;

      if (shape.properties.area) {
        summary.total_area += shape.properties.area;
      }

      if (shape.properties.perimeter) {
        summary.total_perimeter += shape.properties.perimeter;
      }

      // Categorize linear measurements by layer name
      if (shape.type === 'line' || shape.type === 'polyline') {
        const layerName = shape.properties.layer.toLowerCase();
        const length = shape.properties.length || 0;

        if (layerName.includes('ridge')) {
          summary.ridge_length += length;
        } else if (layerName.includes('valley')) {
          summary.valley_length += length;
        } else if (layerName.includes('hip')) {
          summary.hip_length += length;
        } else if (layerName.includes('eave')) {
          summary.eave_length += length;
        } else if (layerName.includes('rake')) {
          summary.rake_length += length;
        }
      }
    });
  });

  return summary;
}

/**
 * Validate drawing for completeness
 */
export function validateDrawing(project: CADProject): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (project.layers.length === 0) {
    errors.push('No layers defined');
  }

  const visibleShapes = project.layers
    .filter(l => l.visible)
    .flatMap(l => l.shapes);

  if (visibleShapes.length === 0) {
    errors.push('No shapes drawn');
  }

  const areaShapes = visibleShapes.filter(s => s.type === 'polygon' || s.type === 'rectangle');
  if (areaShapes.length === 0) {
    warnings.push('No area measurements defined');
  }

  // Check for unclosed polygons
  visibleShapes.forEach(shape => {
    if (shape.type === 'polygon' && shape.vertices.length < 3) {
      errors.push(`Polygon "${shape.properties.label}" has less than 3 vertices`);
    }
  });

  // Check for shapes without assemblies
  const shapesWithoutAssembly = visibleShapes.filter(s => !s.properties.assembly_code);
  if (shapesWithoutAssembly.length > 0) {
    warnings.push(`${shapesWithoutAssembly.length} shapes have no assembly assigned`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
