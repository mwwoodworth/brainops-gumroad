import { subHours } from 'date-fns';
import { fetchTenantSettings } from './repository';
import type { HourlyForecastPoint, UUID } from './types';

interface ForecastOptions {
  tenantId: UUID;
  lat: number;
  lon: number;
  start: Date;
  end: Date;
}

export async function resolveForecast(
  options: ForecastOptions
): Promise<HourlyForecastPoint[]> {
  const tenantSettings = await fetchTenantSettings(options.tenantId);
  const provider = tenantSettings?.weather_provider ?? 'open-meteo';

  switch (provider) {
    case 'open-meteo':
    default:
      return fetchOpenMeteo(options);
  }
}

async function fetchOpenMeteo(
  options: ForecastOptions
): Promise<HourlyForecastPoint[]> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', options.lat.toString());
  url.searchParams.set('longitude', options.lon.toString());
  url.searchParams.set('hourly', 'temperature_2m,precipitation_probability,wind_speed_10m');
  url.searchParams.set('temperature_unit', 'fahrenheit');
  url.searchParams.set('windspeed_unit', 'mph');
  url.searchParams.set('precipitation_unit', 'inch');
  url.searchParams.set('timezone', 'UTC');
  const hours = Math.ceil((options.end.getTime() - options.start.getTime()) / (60 * 60 * 1000));
  const start = subHours(options.start, 3); // buffer for rising calculation
  url.searchParams.set('start_hour', Math.floor(start.getTime() / 1000).toString());
  url.searchParams.set('forecast_days', Math.max(1, Math.ceil(hours / 24)).toString());

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Open-Meteo request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const timestamps: string[] = payload.hourly?.time ?? [];
  const temps: number[] = payload.hourly?.temperature_2m ?? [];
  const winds: number[] = payload.hourly?.wind_speed_10m ?? [];
  const precip: number[] = payload.hourly?.precipitation_probability ?? [];

  const points: HourlyForecastPoint[] = [];
  for (let index = 0; index < timestamps.length; index += 1) {
    const ts = timestamps[index];
    const date = new Date(ts);
    if (date >= options.start && date <= options.end) {
      points.push({
        ts: new Date(ts).toISOString(),
        temp_f: temps[index] ?? 0,
        wind_mph: winds[index] ?? 0,
        precip_prob: (precip[index] ?? 0) / 100,
      });
    }
  }

  if (points.length === 0) {
    throw new Error('Open-Meteo response did not include usable hourly data.');
  }

  return points;
}
