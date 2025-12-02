import { getEnv } from '@/lib/env';

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

const OPTIONAL_ENV_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'AI_AGENTS_URL',
  'AI_AGENTS_API_KEY',
  'AI_AGENTS_TEST_KEY',
  'BRAINOPS_API_KEY',
  'BRAINOPS_MEMORY_API_KEY',
  'BRAINOPS_MEMORY_API_URL',
  'BRAINOPS_API_URL',
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
] as const;

const shouldSkipValidation = (): boolean =>
  process.env.SKIP_ENV_VALIDATION === 'true' || process.env.NODE_ENV === 'test';

export const validateEnvironment = (): void => {
  if (shouldSkipValidation()) {
    return;
  }

  const missing: string[] = [];
  const warnings: string[] = [];

  for (const variable of REQUIRED_ENV_VARS) {
    try {
      getEnv(variable, { required: true });
    } catch (error) {
      missing.push(variable);
    }
  }

  for (const variable of OPTIONAL_ENV_VARS) {
    try {
      getEnv(variable, { required: false });
    } catch {
      warnings.push(variable);
    }
  }

  if (warnings.length > 0) {
    console.warn(
      `[env-validation] Optional environment variables missing: ${warnings.join(', ')}`
    );
  }

  if (missing.length > 0) {
    throw new Error(
      `[env-validation] Missing required environment variables: ${missing.join(', ')}`
    );
  }
};

validateEnvironment();
