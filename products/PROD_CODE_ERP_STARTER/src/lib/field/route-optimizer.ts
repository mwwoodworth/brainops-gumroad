export interface RouteOrigin {
  lat: number;
  lng: number;
  label?: string | null;
}

export interface RouteWaypointInput {
  id: string;
  lat: number;
  lng: number;
  address?: string | null;
  customer?: string | null;
  scheduledDate?: string | null;
  status?: string | null;
  priority?: string | null;
}

export interface RouteWaypointResult extends RouteWaypointInput {
  sequence: number;
  distanceFromPreviousMiles: number;
  travelTimeMinutes: number;
  eta?: string | null;
}

export interface RoutePlanResult {
  stops: RouteWaypointResult[];
  totals: {
    distanceMiles: number;
    durationMinutes: number;
  };
  generatedAt: string;
  source: 'brainops' | 'fallback';
}

interface SegmentOverride {
  distanceMiles?: number;
  travelMinutes?: number;
  eta?: string | null;
}

const EARTH_RADIUS_KM = 6371;
const MILES_PER_KM = 0.621371;
const DEFAULT_SPEED_MPH = 35;

const round = (value: number, precision = 2) =>
  Number.isFinite(value) ? Number(value.toFixed(precision)) : 0;

const toDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const deltaLat = toRad(b.lat - a.lat);
  const deltaLng = toRad(b.lng - a.lng);

  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);

  const hav =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));

  return EARTH_RADIUS_KM * c;
};

const distanceMiles = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  distanceKm(a, b) * MILES_PER_KM;

const computeStartTime = (stops: RouteWaypointInput[], explicit?: string | Date | null): Date | null => {
  if (explicit) {
    const date = explicit instanceof Date ? explicit : toDate(typeof explicit === 'string' ? explicit : null);
    if (date) return date;
  }

  const earliest = stops
    .map(stop => toDate(stop.scheduledDate ?? null))
    .filter((value): value is Date => value !== null)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  return earliest ?? null;
};

const nearestNeighborOrder = (
  stops: RouteWaypointInput[],
  origin?: RouteOrigin | null
): RouteWaypointInput[] => {
  const remaining = [...stops];
  const order: RouteWaypointInput[] = [];

  if (remaining.length === 0) {
    return order;
  }

  let current =
    origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng)
      ? { lat: origin.lat, lng: origin.lng }
      : { lat: remaining[0].lat, lng: remaining[0].lng };

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    remaining.forEach((stop, index) => {
      const distance = distanceMiles(current, stop);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    const [next] = remaining.splice(bestIndex, 1);
    order.push(next);
    current = { lat: next.lat, lng: next.lng };
  }

  return order;
};

interface MetricsOptions {
  origin?: RouteOrigin | null;
  overrides?: Map<string, SegmentOverride>;
  initialEta?: string | Date | null;
  averageSpeedMph?: number;
}

export function calculateRouteMetrics(
  orderedStops: RouteWaypointInput[],
  options: MetricsOptions = {}
): RoutePlanResult {
  const { origin, overrides, initialEta, averageSpeedMph = DEFAULT_SPEED_MPH } = options;

  if (orderedStops.length === 0) {
    return {
      stops: [],
      totals: { distanceMiles: 0, durationMinutes: 0 },
      generatedAt: new Date().toISOString(),
      source: 'brainops',
    };
  }

  const overridesMap = overrides ?? new Map<string, SegmentOverride>();
  const startTime = computeStartTime(orderedStops, initialEta);
  let currentTime = startTime ? new Date(startTime) : null;

  const results: RouteWaypointResult[] = [];
  let totalDistance = 0;
  let totalDuration = 0;

  let currentPoint =
    origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng)
      ? { lat: origin.lat, lng: origin.lng }
      : { lat: orderedStops[0].lat, lng: orderedStops[0].lng };

  orderedStops.forEach((stop, index) => {
    const fallbackDistance = distanceMiles(currentPoint, stop);
    const override = overridesMap.get(stop.id) ?? overridesMap.get(String(stop.id)) ?? undefined;

    const distance = override?.distanceMiles ?? fallbackDistance;
    const travelMinutes =
      override?.travelMinutes ??
      (distance > 0 ? (distance / averageSpeedMph) * 60 : 0);

    if (currentTime) {
      currentTime = new Date(currentTime.getTime() + travelMinutes * 60_000);
    }

    const eta = override?.eta ?? (currentTime ? currentTime.toISOString() : null);

    results.push({
      ...stop,
      sequence: index + 1,
      distanceFromPreviousMiles: round(distance),
      travelTimeMinutes: round(travelMinutes),
      eta: eta ?? null,
    });

    totalDistance += distance;
    totalDuration += travelMinutes;

    currentPoint = { lat: stop.lat, lng: stop.lng };
  });

  return {
    stops: results,
    totals: {
      distanceMiles: round(totalDistance),
      durationMinutes: round(totalDuration),
    },
    generatedAt: new Date().toISOString(),
    source: 'brainops',
  };
}

export function computeFallbackRoute(
  stops: RouteWaypointInput[],
  origin?: RouteOrigin | null
): RoutePlanResult {
  const ordered = nearestNeighborOrder(stops, origin);
  const plan = calculateRouteMetrics(ordered, {
    origin,
    averageSpeedMph: DEFAULT_SPEED_MPH,
  });

  return {
    ...plan,
    source: 'fallback',
  };
}
