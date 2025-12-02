/**
 * Roof Taper Design & Calculation Engine
 * Handles slope calculations, drainage analysis, material takeoffs
 */

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface RoofPlane {
  id: string;
  vertices: Point3D[];
  slope: number; // degrees
  drainage: 'positive' | 'negative' | 'flat';
  area: number; // sq ft
  material?: string;
}

export class RoofTaperEngine {
  /**
   * Calculate area of a polygon defined by 3D points
   */
  static calculateArea(vertices: Point3D[]): number {
    if (vertices.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      area += vertices[i].x * vertices[j].y;
      area -= vertices[j].x * vertices[i].y;
    }
    return Math.abs(area / 2);
  }

  /**
   * Calculate slope from three points
   */
  static calculateSlope(p1: Point3D, p2: Point3D, p3: Point3D): number {
    // Calculate normal vector
    const v1 = {
      x: p2.x - p1.x,
      y: p2.y - p1.y,
      z: p2.z - p1.z,
    };
    const v2 = {
      x: p3.x - p1.x,
      y: p3.y - p1.y,
      z: p3.z - p1.z,
    };

    // Cross product
    const normal = {
      x: v1.y * v2.z - v1.z * v2.y,
      y: v1.z * v2.x - v1.x * v2.z,
      z: v1.x * v2.y - v1.y * v2.x,
    };

    // Calculate angle with horizontal plane
    const magnitude = Math.sqrt(normal.x ** 2 + normal.y ** 2 + normal.z ** 2);
    const angle = Math.acos(Math.abs(normal.z) / magnitude);
    return (angle * 180) / Math.PI; // Convert to degrees
  }

  /**
   * Determine drainage direction
   */
  static analyzeDrainage(plane: RoofPlane): 'positive' | 'negative' | 'flat' {
    if (plane.slope < 0.5) return 'flat';

    // Analyze Z-coordinates of vertices
    const avgZ = plane.vertices.reduce((sum, v) => sum + v.z, 0) / plane.vertices.length;
    const highPoints = plane.vertices.filter(v => v.z > avgZ).length;

    return highPoints > plane.vertices.length / 2 ? 'negative' : 'positive';
  }

  /**
   * Calculate material takeoff quantities
   */
  static calculateMaterialTakeoff(plane: RoofPlane): {
    membrane: number;
    insulation: number;
    coverBoard: number;
    fasteners: number;
  } {
    const area = plane.area;
    const waste = 1.1; // 10% waste factor

    return {
      membrane: area * waste, // sq ft
      insulation: area * waste, // sq ft
      coverBoard: area * waste, // sq ft
      fasteners: Math.ceil((area / 2) * waste), // 1 per 2 sq ft
    };
  }

  /**
   * Generate taper plan from target slopes
   */
  static generateTaperPlan(
    boundary: Point3D[],
    drainPoints: Point3D[],
    targetSlope: number
  ): RoofPlane[] {
    const planes: RoofPlane[] = [];

    // Simple algorithm: divide roof into triangular planes toward drains
    for (let i = 0; i < drainPoints.length; i++) {
      const drain = drainPoints[i];

      // Create triangular plane from boundary to drain
      for (let j = 0; j < boundary.length; j++) {
        const k = (j + 1) % boundary.length;

        const vertices = [
          boundary[j],
          boundary[k],
          { ...drain, z: drain.z - 1 } // Lower drain point
        ];

        planes.push({
          id: `plane-${i}-${j}`,
          vertices,
          slope: targetSlope,
          drainage: 'positive',
          area: this.calculateArea(vertices),
        });
      }
    }

    return planes;
  }

  /**
   * Convert slope in degrees to slope ratio (rise:run)
   */
  static slopeToRatio(degrees: number): { rise: number; run: number } {
    const radians = (degrees * Math.PI) / 180;
    const rise = Math.tan(radians);
    return {
      rise: Math.round(rise * 12), // inches per foot
      run: 12,
    };
  }

  /**
   * Convert slope ratio to degrees
   */
  static ratioToSlope(rise: number, run: number): number {
    const radians = Math.atan(rise / run);
    return (radians * 180) / Math.PI;
  }

  /**
   * Calculate crickets for roof penetrations
   */
  static calculateCricket(
    penetrationWidth: number,
    roofSlope: number,
    heightAboveRoof: number
  ): {
    length: number;
    baseWidth: number;
    volume: number;
  } {
    const slopeRadians = (roofSlope * Math.PI) / 180;
    const length = heightAboveRoof / Math.tan(slopeRadians);
    const baseWidth = penetrationWidth;
    const volume = (length * baseWidth * heightAboveRoof) / 3; // Triangular prism

    return {
      length,
      baseWidth,
      volume,
    };
  }

  /**
   * Validate roof design for code compliance
   */
  static validateDesign(planes: RoofPlane[]): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const plane of planes) {
      // Check minimum slope (typically 1/4" per foot = 1.19 degrees)
      if (plane.slope < 1.19) {
        errors.push(`Plane ${plane.id}: Slope too shallow (${plane.slope.toFixed(2)}° < 1.19°)`);
      }

      // Check for negative drainage
      if (plane.drainage === 'negative') {
        errors.push(`Plane ${plane.id}: Negative drainage detected`);
      }

      // Warn about steep slopes
      if (plane.slope > 45) {
        warnings.push(`Plane ${plane.id}: Very steep slope (${plane.slope.toFixed(2)}°)`);
      }

      // Check for very small areas
      if (plane.area < 10) {
        warnings.push(`Plane ${plane.id}: Very small area (${plane.area.toFixed(2)} sq ft)`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
