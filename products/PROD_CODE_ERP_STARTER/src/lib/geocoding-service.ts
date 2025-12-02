/**
 * Geocoding Service for Address to Lat/Lng Conversion
 * Uses Mapbox Geocoding API (included with Mapbox GL)
 */

export interface GeocodedLocation {
  lat: number;
  lng: number;
  formattedAddress: string;
  confidence?: number;
}

export interface GeocodeRequest {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

/**
 * Geocode an address using Mapbox Geocoding API
 * Mapbox token is configured in environment variables
 */
export async function geocodeAddress(
  request: GeocodeRequest
): Promise<GeocodedLocation | null> {
  try {
    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    // Build address string
    const parts = [
      request.address,
      request.city,
      request.state,
      request.zip,
      request.country || 'USA'
    ].filter(Boolean);

    const addressString = parts.join(', ');

    if (!addressString || addressString.length < 5) {
      console.warn('Address too short for geocoding:', addressString);
      return null;
    }

    // Prefer Mapbox if a valid token is configured, otherwise fall back to OpenStreetMap Nominatim
    if (MAPBOX_TOKEN && MAPBOX_TOKEN.trim() !== '') {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addressString)}.json?access_token=${MAPBOX_TOKEN}&country=us&limit=1`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error('Geocoding API error:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        console.warn('No geocoding results for:', addressString);
        return null;
      }

      const feature = data.features[0];
      const [lng, lat] = feature.center;

      return {
        lat,
        lng,
        formattedAddress: feature.place_name,
        confidence: feature.relevance
      };
    }

    // OpenStreetMap Nominatim fallback (requires identifying User-Agent)
    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
    nominatimUrl.searchParams.set('q', addressString);
    nominatimUrl.searchParams.set('format', 'json');
    nominatimUrl.searchParams.set('limit', '1');
    nominatimUrl.searchParams.set('addressdetails', '0');

    const fallbackResponse = await fetch(nominatimUrl.toString(), {
      headers: {
        'User-Agent': 'Weathercraft-ERP/1.0 (support@weathercraft.net)',
        'Accept-Language': 'en',
      }
    });

    if (!fallbackResponse.ok) {
      console.error('Nominatim geocoding error:', fallbackResponse.status, fallbackResponse.statusText);
      return null;
    }

    const fallbackData = await fallbackResponse.json();

    if (!Array.isArray(fallbackData) || fallbackData.length === 0) {
      console.warn('No fallback geocoding results for:', addressString);
      return null;
    }

    const result = fallbackData[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      console.warn('Invalid fallback geocoding coordinates for:', addressString);
      return null;
    }

    return {
      lat,
      lng,
      formattedAddress: result.display_name,
      confidence: result.importance,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Batch geocode multiple addresses
 */
export async function geocodeBatch(
  requests: GeocodeRequest[]
): Promise<(GeocodedLocation | null)[]> {
  // Process in parallel but with rate limiting
  const BATCH_SIZE = 10;
  const results: (GeocodedLocation | null)[] = [];

  for (let i = 0; i < requests.length; i += BATCH_SIZE) {
    const batch = requests.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(req => geocodeAddress(req))
    );
    results.push(...batchResults);

    // Small delay to avoid rate limits
    if (i + BATCH_SIZE < requests.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Calculate distance between two points (Haversine formula)
 * Returns distance in miles
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get center point of multiple locations
 */
export function getCenterPoint(
  locations: { lat: number; lng: number }[]
): { lat: number; lng: number } | null {
  if (locations.length === 0) return null;

  const sum = locations.reduce(
    (acc, loc) => ({
      lat: acc.lat + loc.lat,
      lng: acc.lng + loc.lng
    }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: sum.lat / locations.length,
    lng: sum.lng / locations.length
  };
}

/**
 * Get bounding box for locations
 */
export function getBoundingBox(
  locations: { lat: number; lng: number }[]
): [[number, number], [number, number]] | null {
  if (locations.length === 0) return null;

  const lats = locations.map(l => l.lat);
  const lngs = locations.map(l => l.lng);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Add 10% padding
  const latPadding = (maxLat - minLat) * 0.1;
  const lngPadding = (maxLng - minLng) * 0.1;

  return [
    [minLng - lngPadding, minLat - latPadding],
    [maxLng + lngPadding, maxLat + latPadding]
  ];
}
