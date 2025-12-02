/**
 * Database Migration Utilities
 * Handles migration from localStorage to IndexedDB
 */

import { migrateFromLocalStorage, requestPersistentStorage } from './offline-db';

/**
 * Run all migrations
 */
export async function runMigrations() {
  console.log('🔄 Starting database migrations...');

  try {
    // 1. Request persistent storage
    const persisted = await requestPersistentStorage();
    console.log(`📦 Persistent storage: ${persisted ? 'GRANTED' : 'DENIED'}`);

    // 2. Migrate from localStorage
    const migrationResult = await migrateFromLocalStorage();

    console.log('✅ Migration complete:', {
      migrated: migrationResult.migrated,
      skipped: migrationResult.skipped,
      errors: migrationResult.errors
    });

    if (migrationResult.errors > 0) {
      console.warn('⚠️ Some migrations failed. Check console for details.');
    }

    return {
      success: true,
      ...migrationResult
    };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if migrations are needed
 */
export function needsMigration(): boolean {
  const oldData = localStorage.getItem('field_inspections');
  return oldData !== null;
}

/**
 * Get migration status
 */
export function getMigrationStatus() {
  const hasOldData = needsMigration();
  const migrationComplete = localStorage.getItem('migration_complete') === 'true';

  return {
    needed: hasOldData,
    complete: migrationComplete,
    status: !hasOldData ? 'not_needed' :
            migrationComplete ? 'complete' :
            'pending'
  };
}

/**
 * Mark migration as complete
 */
export function markMigrationComplete() {
  localStorage.setItem('migration_complete', 'true');
}
