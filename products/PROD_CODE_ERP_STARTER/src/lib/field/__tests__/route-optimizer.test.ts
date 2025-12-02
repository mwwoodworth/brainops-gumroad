import { describe, expect, it } from 'vitest';
import {
  calculateRouteMetrics,
  computeFallbackRoute,
  type RouteWaypointInput,
} from '@/lib/field/route-optimizer';

const sampleStops: RouteWaypointInput[] = [
  {
    id: 'job-1',
    lat: 39.7392,
    lng: -104.9903,
    customer: 'Alpha Corp',
    address: '123 Main St, Denver, CO',
    scheduledDate: '2025-11-01T08:00:00.000Z',
    status: 'scheduled',
  },
  {
    id: 'job-2',
    lat: 39.7805,
    lng: -105.0814,
    customer: 'Beta LLC',
    address: '456 Market St, Arvada, CO',
    scheduledDate: '2025-11-01T10:00:00.000Z',
    status: 'scheduled',
  },
  {
    id: 'job-3',
    lat: 39.6296,
    lng: -104.8968,
    customer: 'Gamma Industries',
    address: '789 Broadway, Aurora, CO',
    scheduledDate: '2025-11-01T13:00:00.000Z',
    status: 'scheduled',
  },
];

describe('route optimizer utilities', () => {
  it('computes fallback route using nearest-neighbor heuristic', () => {
    const plan = computeFallbackRoute(sampleStops);

    expect(plan.source).toBe('fallback');
    expect(plan.stops).toHaveLength(3);
    expect(plan.totals.distanceMiles).toBeGreaterThan(0);
    expect(plan.totals.durationMinutes).toBeGreaterThan(0);

    // Verify that each stop received a sequence value
    const sequences = plan.stops.map(stop => stop.sequence);
    expect(sequences).toEqual([1, 2, 3]);

    // Ensure IDs preserved
    const ids = plan.stops.map(stop => stop.id);
    expect(ids.sort()).toEqual(['job-1', 'job-2', 'job-3']);
  });

  it('calculates route metrics for a provided order and override data', () => {
    const overrides = new Map([
      [
        'job-1',
        {
          distanceMiles: 5,
          travelMinutes: 12,
          eta: '2025-11-01T08:12:00.000Z',
        },
      ],
      [
        'job-2',
        {
          distanceMiles: 8,
          travelMinutes: 18,
          eta: '2025-11-01T08:30:00.000Z',
        },
      ],
      [
        'job-3',
        {
          distanceMiles: 7,
          travelMinutes: 16,
          eta: '2025-11-01T08:46:00.000Z',
        },
      ],
    ]);

    const plan = calculateRouteMetrics(sampleStops, {
      origin: { lat: 39.6400, lng: -104.9870 },
      overrides,
      initialEta: '2025-11-01T08:00:00.000Z',
    });

    expect(plan.source).toBe('brainops');
    expect(plan.totals.distanceMiles).toBeCloseTo(20, 0);
    expect(plan.totals.durationMinutes).toBeCloseTo(46, 0);

    expect(plan.stops[0].sequence).toBe(1);
    expect(plan.stops[0].eta).toBe('2025-11-01T08:12:00.000Z');
    expect(plan.stops[1].eta).toBe('2025-11-01T08:30:00.000Z');
    expect(plan.stops[2].eta).toBe('2025-11-01T08:46:00.000Z');
  });

  it('returns empty plan when no stops provided', () => {
    const plan = calculateRouteMetrics([]);

    expect(plan.stops).toHaveLength(0);
    expect(plan.totals.distanceMiles).toBe(0);
    expect(plan.totals.durationMinutes).toBe(0);
  });
});
