const cache = new Map<string, string | undefined>();

interface EnvOptions {
  required?: boolean;
  allowEmpty?: boolean;
}

const normalize = (value: string | undefined): string | undefined => {
  if (typeof value !== 'string') return value;
  return value.replace(/\r?\n/g, '').trim();
};

const directEnv: Record<string, string | undefined> = {
  NEXT_PUBLIC_SUPABASE_URL: normalize(process.env.NEXT_PUBLIC_SUPABASE_URL),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: normalize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  SUPABASE_URL: normalize(process.env.SUPABASE_URL),
  SUPABASE_ANON_KEY: normalize(process.env.SUPABASE_ANON_KEY),
  SUPABASE_SERVICE_ROLE_KEY: normalize(process.env.SUPABASE_SERVICE_ROLE_KEY),
  DATABASE_URL: normalize(process.env.DATABASE_URL),
  NODE_ENV: normalize(process.env.NODE_ENV),
};

const readRaw = (name: string): string | undefined => {
  if (Object.prototype.hasOwnProperty.call(directEnv, name)) {
    return directEnv[name];
  }
  return normalize(process.env[name]);
};

const setProcessEnv = (name: string, value: string) => {
  if (typeof process !== 'undefined' && process?.env) {
    try {
      process.env[name] = value;
    } catch {
      // noop in environments where process.env is read-only (e.g. browser bundles)
    }
  }
};

// Sanitize known variables immediately so that any direct read via process.env gets trimmed values.
for (const [key, rawValue] of Object.entries(directEnv)) {
  if (rawValue === undefined || rawValue === null) continue;
  const trimmed = rawValue.trim();
  directEnv[key] = trimmed;
  cache.set(key, trimmed);
  setProcessEnv(key, trimmed);
}

const NODE_ENV = (cache.get('NODE_ENV') || normalize(process.env.NODE_ENV) || 'development').trim();
cache.set('NODE_ENV', NODE_ENV);
setProcessEnv('NODE_ENV', NODE_ENV);

const isProductionEnvironment = NODE_ENV === 'production';

const resolveAiMode = () => {
  const rawMode = normalize(process.env.AI_PROVIDER_MODE)?.toLowerCase();
  const defaultMode = isProductionEnvironment ? 'live-openai' : 'mock';
  const allowedModes = new Set(['mock', 'live-openai']);
  const candidate = rawMode && allowedModes.has(rawMode) ? rawMode : defaultMode;

  if (isProductionEnvironment && candidate !== 'live-openai') {
    throw new Error('[Env] AI_PROVIDER_MODE=mock is not permitted in production. Configure AI_PROVIDER_MODE=live-openai with valid credentials.');
  }

  return candidate;
};

const resolvedAIProviderMode = resolveAiMode();
setProcessEnv('AI_PROVIDER_MODE', resolvedAIProviderMode);
cache.set('AI_PROVIDER_MODE', resolvedAIProviderMode);
setProcessEnv('NEXT_PUBLIC_AI_PROVIDER_MODE', resolvedAIProviderMode);
cache.set('NEXT_PUBLIC_AI_PROVIDER_MODE', resolvedAIProviderMode);

const resolveDemoMode = () => {
  const demoEnabled =
    normalize(process.env.DEMO_MODE)?.toLowerCase() === 'true' ||
    normalize(process.env.NEXT_PUBLIC_DEMO_MODE)?.toLowerCase() === 'true';

  if (isProductionEnvironment && demoEnabled) {
    console.warn('[Env] DEMO_MODE was set to true in production. Forcing DEMO_MODE=false.');
  }

  return !isProductionEnvironment && demoEnabled;
};

const demoModeEnabled = resolveDemoMode();
const demoModeValue = demoModeEnabled ? 'true' : 'false';
setProcessEnv('DEMO_MODE', demoModeValue);
cache.set('DEMO_MODE', demoModeValue);
setProcessEnv('NEXT_PUBLIC_DEMO_MODE', demoModeValue);
cache.set('NEXT_PUBLIC_DEMO_MODE', demoModeValue);

const normalizeFlag = (value: string | undefined): string | undefined => normalize(value);

const e2eBypassFlags = [
  'E2E_BYPASS_AUTH',
  'NEXT_PUBLIC_E2E_BYPASS_AUTH',
] as const;

if (isProductionEnvironment) {
  for (const flag of e2eBypassFlags) {
    const raw = normalizeFlag(process.env[flag]);
    if (raw === 'true') {
      setProcessEnv(flag, 'false');
      cache.set(flag, 'false');
    }
  }
}

/**
 * Safely read environment variables with trimming to avoid hidden newline characters
 * introduced by secret managers. Values are cached to avoid reprocessing.
 */
export function getEnv(name: string): string;
export function getEnv(name: string, options: EnvOptions & { required?: true }): string;
export function getEnv(name: string, options: EnvOptions & { required: false }): string | undefined;
export function getEnv(name: string, options: EnvOptions = {}): string | undefined {
  const { required = true, allowEmpty = false } = options;

  if (cache.has(name)) {
    return cache.get(name);
  }

  const raw = readRaw(name);

  if (raw === undefined || raw === null) {
    if (required) {
      throw new Error(`Environment variable "${name}" is not set`);
    }
    cache.set(name, undefined);
    return undefined;
  }

  const value = raw.trim();

  if (!value && !allowEmpty) {
    if (required) {
      throw new Error(`Environment variable "${name}" is empty or whitespace`);
    }
    cache.set(name, undefined);
    return undefined;
  }

  cache.set(name, value);
  setProcessEnv(name, value);
  return value;
}

/**
 * Convenience helper for optional environment variables that should be trimmed.
 */
export function getOptionalEnv(name: string): string | undefined {
  return getEnv(name, { required: false });
}

// Shared constants for common environment variables
export const PUBLIC_SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL');
export const PUBLIC_SUPABASE_ANON_KEY = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
export const SERVICE_ROLE_KEY = getOptionalEnv('SUPABASE_SERVICE_ROLE_KEY');
export const DATABASE_CONNECTION_URL = getOptionalEnv('DATABASE_URL');

export const ENVIRONMENT = NODE_ENV;
export const IS_PRODUCTION_ENV = isProductionEnvironment;
export const AI_PROVIDER_MODE = resolvedAIProviderMode;
export const NEXT_PUBLIC_AI_PROVIDER_MODE_RESOLVED = resolvedAIProviderMode;

let warnedAboutBypass = false;

export const isE2ETestBypassEnabled = (): boolean => {
  if (IS_PRODUCTION_ENV) {
    return false;
  }

  const bypassFlag = normalizeFlag(process.env.E2E_BYPASS_AUTH);
  const playwrightFlag = normalizeFlag(process.env.PLAYWRIGHT_BYPASS_AUTH);
  const publicBypassFlag = normalizeFlag(process.env.NEXT_PUBLIC_E2E_BYPASS_AUTH);

  const privateEnabled = bypassFlag === 'true';
  const publicEnabled = publicBypassFlag === 'true';
  const playwrightEnabled = playwrightFlag === 'true';

  const enabled = playwrightEnabled || (privateEnabled && publicEnabled);

  if (enabled && !warnedAboutBypass) {
    warnedAboutBypass = true;
    console.warn(
      '[Security] E2E auth bypass enabled for this environment. Ensure this flag is not set in production.'
    );
  }

  return enabled;
};

export const PROCUREMENT_ALERT_WEBHOOK = getOptionalEnv('PROCUREMENT_ALERT_WEBHOOK');
export const COMPLIANCE_ALERT_WEBHOOK = getOptionalEnv('COMPLIANCE_ALERT_WEBHOOK');
export const OPERATIONS_ALERT_WEBHOOK = getOptionalEnv('OPERATIONS_ALERT_WEBHOOK');
export const SLACK_ALERT_WEBHOOK = getOptionalEnv('SLACK_ALERT_WEBHOOK');
export const SERVICE_ALERT_WEBHOOK = getOptionalEnv('SERVICE_ALERT_WEBHOOK');
