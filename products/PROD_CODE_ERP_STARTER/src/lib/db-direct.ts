/**
 * SECURE Direct PostgreSQL Database Connection
 * Uses environment variables - NO HARD-CODED CREDENTIALS
 *
 * MIGRATION NOTE: This replaces the insecure version that had hard-coded passwords
 * All credentials are now loaded from environment variables
 */

import { Pool } from 'pg';
import { DATABASE_CONFIG } from '@/lib/config/env';
import { getOfflineRowsForTable } from '@/lib/db-offline-fixtures';
const truthy = (value?: string | null) => ['1', 'true', 'yes'].includes((value ?? '').toLowerCase());

const shouldForceFixtures = () => truthy(process.env.E2E_FORCE_DB_FIXTURES);
const isDirectDbDisabled = () => truthy(process.env.DIRECT_DB_DISABLE);
const resolveNumericEnv = (name: string, fallback: number) => {
  const raw = process.env[name];
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const CONNECTION_TIMEOUT_MS = resolveNumericEnv('DIRECT_DB_CONNECTION_TIMEOUT', 10000);
const IDLE_TIMEOUT_MS = resolveNumericEnv('DIRECT_DB_IDLE_TIMEOUT', 30000);
const MAX_POOL_CONNECTIONS = resolveNumericEnv('DIRECT_DB_MAX_CONNECTIONS', 8);

const mapToUnavailableError = (error: unknown): DirectDatabaseUnavailableError | null => {
  if (!error) return null;
  if (error instanceof DirectDatabaseUnavailableError) {
    return error;
  }
  const code = typeof error === 'object' && error ? (error as any).code : undefined;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : code
      ? String(code)
      : null;
  if (!message) {
    return null;
  }
  if (
    message.includes('Unable to check out process from the pool') ||
    message.includes('db_termination') ||
    message.includes('terminating connection due to administrator command') ||
    code === 'XX000' ||
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND'
  ) {
    return new DirectDatabaseUnavailableError(message);
  }
  return null;
};

export class DirectDatabaseUnavailableError extends Error {
  constructor(message = 'Direct database configuration is not available') {
    super(message);
    this.name = 'DirectDatabaseUnavailableError';
  }
}

let pool: Pool | null = null;

export function getDirectDbPool() {
  if (!DATABASE_CONFIG || isDirectDbDisabled() || shouldForceFixtures()) {
    return null;
  }
  if (!pool) {
    pool = new Pool({
      host: DATABASE_CONFIG.host,
      port: DATABASE_CONFIG.port,
      database: DATABASE_CONFIG.database,
      user: DATABASE_CONFIG.user,
      password: DATABASE_CONFIG.password,
      ssl: DATABASE_CONFIG.ssl,
      max: Math.max(2, Math.min(6, MAX_POOL_CONNECTIONS)),
      idleTimeoutMillis: IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    });

    // Prevent process crashes from pool-level errors
    pool.on('error', (err) => {
      const mapped = mapToUnavailableError(err);
      const message = mapped ? mapped.message : err instanceof Error ? err.message : String(err);
      console.warn(`📊 Direct DB pool error (continuing with fallbacks): ${message}`);
    });

    // Log connection attempt (without credentials)
    console.log(`📊 Database pool created for ${DATABASE_CONFIG.host}`);
  }
  return pool;
}

const fulfillFromFixtures = <T>(
  text: string,
  params?: any[]
): { rows: T[]; rowCount: number } | null => {
  const lower = text?.toLowerCase?.() ?? '';
  const tableMatch = /from\s+([a-z0-9_]+)/i.exec(text);
  const tableName = tableMatch?.[1] ?? null;
  const offlineRows = tableName ? getOfflineRowsForTable(tableName) : null;
  if (!offlineRows) return null;

  const isCountQuery = /select\s+count\(/i.test(lower);
  const tenantParam =
    Array.isArray(params) && params.find((value) => typeof value === 'string' && value.length > 0);
  const filteredRows =
    tenantParam && typeof tenantParam === 'string'
      ? offlineRows.filter((row) => !row?.tenant_id || row.tenant_id === tenantParam)
      : offlineRows;

  if (isCountQuery) {
    return {
      rows: [{ count: String(filteredRows.length) }] as T[],
      rowCount: 1,
    };
  }

  const numericParams = Array.isArray(params)
    ? params.filter((value): value is number => typeof value === 'number')
    : [];
  const limitCandidate =
    numericParams.length >= 2 ? numericParams[numericParams.length - 2] : undefined;
  const offsetCandidate =
    numericParams.length >= 1 ? numericParams[numericParams.length - 1] : undefined;

  const offset = typeof offsetCandidate === 'number' ? Math.max(offsetCandidate, 0) : 0;
  const limit =
    typeof limitCandidate === 'number' && limitCandidate > 0 ? limitCandidate : filteredRows.length;
  const sliced = filteredRows.slice(offset, offset + limit);
  return { rows: sliced as T[], rowCount: sliced.length };
};

export async function queryDirect<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  if (shouldForceFixtures()) {
    const forced = fulfillFromFixtures<T>(text, params);
    if (forced) {
      return forced;
    }
  }

  try {
    const pool = getDirectDbPool();
    if (!pool) {
      throw new DirectDatabaseUnavailableError();
    }
    const result = await pool.query(text, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0
    };
  } catch (error) {
    const unavailableError = mapToUnavailableError(error);
    const errorToReport = unavailableError ?? error;

    if (!(errorToReport instanceof DirectDatabaseUnavailableError)) {
      console.error('❌ Database query failed:', error);
    }

    if (shouldForceFixtures()) {
      console.warn('[DB] Fixture fallback enabled via E2E_FORCE_DB_FIXTURES – returning deterministic dataset.');
      const fallback = fulfillFromFixtures<T>(text, params);
      if (fallback) {
        return fallback;
      }
      return { rows: [] as T[], rowCount: 0 };
    }

    throw errorToReport;
  }
}

/**
 * Safely close the database pool
 */
export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('📊 Database pool closed');
  }
}
