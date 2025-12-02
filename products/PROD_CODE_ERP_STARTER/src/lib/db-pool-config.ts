import { Pool } from 'pg';
import { DATABASE_CONFIG } from '@/lib/config/env';

let pool: Pool | null = null;

export function getOptimizedDbPool() {
  if (!DATABASE_CONFIG) {
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
      // Optimized for testing
      max: 10, // Increased from 4
      min: 2,  // Minimum connections
      idleTimeoutMillis: 60000, // Increased from 30000
      connectionTimeoutMillis: 10000, // Increased from 2000
      statement_timeout: 30000, // Query timeout in milliseconds
      query_timeout: 30000,
      allowExitOnIdle: true,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });

    console.log(`📊 Optimized database pool created for ${DATABASE_CONFIG.host}`);
  }
  return pool;
}

export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('📊 Database pool closed');
  }
}
