/**
 * WEATHERCRAFT ERP - WEATHER SERVICE
 * OpenWeather API integration for roofing-specific weather tracking
 *
 * Features:
 * - Current weather conditions
 * - 5-day / 3-hour forecast
 * - Weather alerts
 * - Roofing work safety analysis
 * - Automatic caching (10-minute TTL)
 */

interface WeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

interface CurrentWeather {
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  pressure: number;
  humidity: number;
}

interface Wind {
  speed: number;
  deg: number;
  gust?: number;
}

interface Clouds {
  all: number;
}

interface Rain {
  '1h'?: number;
  '3h'?: number;
}

interface Snow {
  '1h'?: number;
  '3h'?: number;
}

export interface WeatherData {
  coord: { lat: number; lon: number };
  weather: WeatherCondition[];
  base: string;
  main: CurrentWeather;
  visibility: number;
  wind: Wind;
  clouds: Clouds;
  rain?: Rain;
  snow?: Snow;
  dt: number;
  sys: {
    country: string;
    sunrise: number;
    sunset: number;
  };
  timezone: number;
  id: number;
  name: string;
  cod: number;
}

export interface ForecastItem {
  dt: number;
  main: CurrentWeather;
  weather: WeatherCondition[];
  clouds: Clouds;
  wind: Wind;
  visibility: number;
  pop: number; // Probability of precipitation
  rain?: Rain;
  snow?: Snow;
  sys: { pod: string };
  dt_txt: string;
}

export interface ForecastData {
  cod: string;
  message: number;
  cnt: number;
  list: ForecastItem[];
  city: {
    id: number;
    name: string;
    coord: { lat: number; lon: number };
    country: string;
    population: number;
    timezone: number;
    sunrise: number;
    sunset: number;
  };
}

export interface WorkSafetyAnalysis {
  isSafe: boolean;
  riskLevel: 'safe' | 'caution' | 'unsafe' | 'dangerous';
  reasons: string[];
  recommendations: string[];
  conditions: {
    temperature: { value: number; safe: boolean };
    wind: { value: number; safe: boolean };
    precipitation: { value: number; safe: boolean };
    humidity: { value: number; safe: boolean };
    visibility: { value: number; safe: boolean };
  };
}

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Get cached data or null if expired/missing
 */
function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }

  return cached.data as T;
}

/**
 * Store data in cache
 */
function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Fetch current weather for a location
 */
export async function getCurrentWeather(
  lat: number = 38.8339, // Colorado Springs default
  lon: number = -104.8214
): Promise<WeatherData> {
  const cacheKey = `current_${lat}_${lon}`;
  const cached = getCached<WeatherData>(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.OPENWEATHER_API_KEY || process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new Error('OpenWeather API key not configured');
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;

  const response = await fetch(url, { next: { revalidate: 600 } }); // 10-minute cache
  if (!response.ok) {
    throw new Error(`OpenWeather API error: ${response.statusText}`);
  }

  const data: WeatherData = await response.json();
  setCache(cacheKey, data);

  return data;
}

/**
 * Fetch 5-day forecast
 */
export async function getForecast(
  lat: number = 38.8339,
  lon: number = -104.8214
): Promise<ForecastData> {
  const cacheKey = `forecast_${lat}_${lon}`;
  const cached = getCached<ForecastData>(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.OPENWEATHER_API_KEY || process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new Error('OpenWeather API key not configured');
  }

  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;

  const response = await fetch(url, { next: { revalidate: 600 } });
  if (!response.ok) {
    throw new Error(`OpenWeather API error: ${response.statusText}`);
  }

  const data: ForecastData = await response.json();
  setCache(cacheKey, data);

  return data;
}

/**
 * Analyze if current weather is safe for roofing work
 */
export function analyzeWorkSafety(weather: WeatherData): WorkSafetyAnalysis {
  const { main, wind, rain, snow, visibility, weather: conditions } = weather;
  const reasons: string[] = [];
  const recommendations: string[] = [];
  let riskLevel: WorkSafetyAnalysis['riskLevel'] = 'safe';

  // Temperature analysis
  const tempSafe = main.temp >= 40 && main.temp <= 95;
  if (main.temp < 40) {
    reasons.push('Temperature too cold - shingles become brittle');
    recommendations.push('Wait for temperatures above 40°F');
    riskLevel = 'unsafe';
  }
  if (main.temp > 95) {
    reasons.push('Temperature too hot - asphalt gets too soft');
    recommendations.push('Schedule work for early morning or wait for cooler weather');
    riskLevel = 'unsafe';
  }
  if (main.temp >= 85 && main.temp <= 95) {
    reasons.push('High temperature - take extra precautions');
    recommendations.push('Ensure adequate hydration and shade breaks');
    riskLevel = riskLevel === 'safe' ? 'caution' : riskLevel;
  }

  // Wind analysis
  const windSafe = wind.speed < 25;
  const gustSafe = !wind.gust || wind.gust < 35;
  if (wind.speed >= 25 || (wind.gust && wind.gust >= 35)) {
    reasons.push(`Wind speed unsafe (${Math.round(wind.speed)} mph${wind.gust ? `, gusts ${Math.round(wind.gust)} mph` : ''})`);
    recommendations.push('Stop work until wind subsides below 25 mph');
    riskLevel = 'dangerous';
  } else if (wind.speed >= 15) {
    reasons.push('Moderate winds - use extra caution');
    recommendations.push('Secure all materials, use extra tie-offs');
    riskLevel = riskLevel === 'safe' ? 'caution' : riskLevel;
  }

  // Precipitation analysis
  const hasPrecipitation = !!(rain || snow);
  if (rain) {
    reasons.push('Rain detected - work must stop');
    recommendations.push('Wait 24 hours after rain stops for roof to dry');
    riskLevel = 'dangerous';
  }
  if (snow) {
    reasons.push('Snow detected - work must stop');
    recommendations.push('Wait for snow to melt and roof to dry completely');
    riskLevel = 'dangerous';
  }

  // Check weather condition codes
  const hasThunderstorm = conditions.some(c => c.main === 'Thunderstorm');
  if (hasThunderstorm) {
    reasons.push('Thunderstorm in area - immediate evacuation required');
    recommendations.push('Evacuate job site immediately, do not resume until storm passes and area is safe');
    riskLevel = 'dangerous';
  }

  // Humidity analysis (affects adhesive curing)
  const humiditySafe = main.humidity >= 30 && main.humidity <= 85;
  if (main.humidity < 30) {
    reasons.push('Low humidity - adhesives may not cure properly');
    recommendations.push('Monitor adhesive application carefully');
    riskLevel = riskLevel === 'safe' ? 'caution' : riskLevel;
  }
  if (main.humidity > 85) {
    reasons.push('High humidity - extended curing time needed');
    recommendations.push('Allow extra time for materials to cure');
    riskLevel = riskLevel === 'safe' ? 'caution' : riskLevel;
  }

  // Visibility
  const visibilitySafe = visibility >= 5000; // meters
  if (visibility < 5000) {
    reasons.push('Low visibility conditions');
    recommendations.push('Use extra caution, ensure all crew members are visible');
    riskLevel = riskLevel === 'safe' ? 'caution' : riskLevel;
  }

  // Ice warning
  if (main.temp < 32 && main.humidity > 80) {
    reasons.push('Ice/frost conditions likely');
    recommendations.push('Check for ice before starting work, may need to delay');
    riskLevel = 'unsafe';
  }

  const isSafe = riskLevel === 'safe' || riskLevel === 'caution';

  return {
    isSafe,
    riskLevel,
    reasons: reasons.length > 0 ? reasons : ['All conditions within safe parameters'],
    recommendations: recommendations.length > 0 ? recommendations : ['Normal roofing operations can proceed'],
    conditions: {
      temperature: { value: main.temp, safe: tempSafe },
      wind: { value: wind.speed, safe: windSafe && gustSafe },
      precipitation: { value: (rain?.['1h'] || snow?.['1h'] || 0), safe: !hasPrecipitation },
      humidity: { value: main.humidity, safe: humiditySafe },
      visibility: { value: visibility, safe: visibilitySafe },
    },
  };
}

/**
 * Check if forecast shows rain in next N hours
 */
export function checkRainInForecast(forecast: ForecastData, hours: number = 24): {
  hasRain: boolean;
  probability: number;
  timing: string | null;
} {
  const now = Date.now() / 1000;
  const targetTime = now + (hours * 3600);

  const relevantForecasts = forecast.list.filter(item => item.dt >= now && item.dt <= targetTime);

  let maxProbability = 0;
  let rainTiming: string | null = null;

  for (const item of relevantForecasts) {
    if (item.pop > maxProbability) {
      maxProbability = item.pop;
      rainTiming = item.dt_txt;
    }
  }

  return {
    hasRain: maxProbability > 0.3, // 30% or higher
    probability: maxProbability,
    timing: rainTiming,
  };
}

/**
 * Get weather icon URL from OpenWeather
 */
export function getWeatherIconUrl(iconCode: string, size: '2x' | '4x' = '2x'): string {
  return `https://openweathermap.org/img/wn/${iconCode}@${size}.png`;
}

/**
 * Format temperature for display
 */
export function formatTemperature(temp: number): string {
  return `${Math.round(temp)}°F`;
}

/**
 * Get user-friendly weather description
 */
export function getWeatherDescription(weather: WeatherData): string {
  if (!weather.weather || weather.weather.length === 0) {
    return 'Unknown conditions';
  }
  return weather.weather[0].description
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
