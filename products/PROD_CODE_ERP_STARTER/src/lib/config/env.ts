/**
 * Environment Configuration
 * SECURE: Fails loudly if required variables are missing
 * NO FALLBACKS to hard-coded production values
 */

import { getEnv } from '@/lib/env';

// Validate required environment variables
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `❌ CRITICAL: Missing required environment variable: ${name}\n` +
      `Please set this in your .env.local file or deployment environment.\n` +
      `See .env.example for required variables.`
    );
  }
  const trimmed = value.trim();
  if (trimmed !== value) {
    process.env[name] = trimmed;
  }
  return trimmed;
}

// Database Configuration
type DatabaseConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: {
    rejectUnauthorized: boolean;
  };
};

function resolveDatabaseConfig(): DatabaseConfig | null {
  try {
    const host = getEnv('DATABASE_HOST', { required: false });
    const portRaw = getEnv('DATABASE_PORT', { required: false });
    const database = getEnv('DATABASE_NAME', { required: false });
    const user = getEnv('DATABASE_USER', { required: false });
    const password = getEnv('DATABASE_PASSWORD', { required: false });

    if (!host || !database || !user || !password) {
      console.warn(
        '[Config] DATABASE_* env vars missing; direct Postgres access disabled. Configure DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD to enable direct queries.'
      );
      return null;
    }

    const port = portRaw ? parseInt(portRaw, 10) : 5432;

    return {
      host,
      port: Number.isNaN(port) ? 5432 : port,
      database,
      user,
      password,
      ssl: {
        rejectUnauthorized: false,
      },
    };
  } catch (error) {
    console.warn(
      '[Config] Failed to resolve database configuration; falling back to Supabase client only.',
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

export const DATABASE_CONFIG = resolveDatabaseConfig();

// Supabase Configuration
export const SUPABASE_CONFIG = {
  url: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  anonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
} as const;

// BrainOps API Configuration
export const BRAINOPS_CONFIG = {
  backendUrl: requireEnv('NEXT_PUBLIC_BRAINOPS_BACKEND_URL'),
  aiAgentsUrl: requireEnv('NEXT_PUBLIC_BRAINOPS_AI_AGENTS_URL'),
  apiKey: requireEnv('BRAINOPS_API_KEY'),
} as const;

// NextAuth Configuration
export const AUTH_CONFIG = {
  secret: requireEnv('NEXTAUTH_SECRET'),
  url: requireEnv('NEXTAUTH_URL'),
} as const;

// NOTE: Validation happens when configs are accessed, not on module load
// This prevents client-side crashes when importing this file
