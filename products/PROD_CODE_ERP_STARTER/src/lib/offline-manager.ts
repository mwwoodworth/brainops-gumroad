/**
 * Offline Manager for Weathercraft ERP
 * Handles offline data persistence and synchronization
 *
 * Research insights:
 * - Field crews need offline access (spotty coverage)
 * - Auto-save every 30s (research shows best practice)
 * - Background sync when connection restored
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_VERSION = 2;

interface WeathercraftDB extends DBSchema {
  pending_inspections: {
    key: string;
    value: OfflineFieldInspection;
  };
  pending_estimates: {
    key: string;
    value: OfflineEstimate;
  };
  pending_customers: {
    key: string;
    value: OfflineCustomer;
  };
  pending_jobs: {
    key: string;
    value: OfflineJob;
  };
  cached_jobs: {
    key: string;
    value: any;
  };
  cached_customers: {
    key: string;
    value: any;
  };
  cached_estimates: {
    key: string;
    value: any;
  };
}

interface OfflineFieldInspection {
  id: string;
  job_id: string;
  inspector_id: string;
  inspection_date: string;
  location: { lat: number; lng: number };
  photos: string[]; // Base64 encoded
  notes: string;
  weather_conditions?: string;
  roof_condition?: string;
  pending_sync: boolean;
  created_offline: boolean;
  timestamp: number;
}

interface OfflineEstimate {
  id: string;
  customer_id?: string;
  customer_name: string;
  address: string;
  roof_type: string;
  roof_squares: number;
  roof_pitch: number;
  materials_cost: number;
  labor_cost: number;
  total_cost: number;
  pending_sync: boolean;
  created_offline: boolean;
  timestamp: number;
}

interface OfflineCustomer {
  id: string;
  full_name: string;
  address: string;
  phone?: string;
  email?: string;
  pending_sync: boolean;
  created_offline: boolean;
  timestamp: number;
}

interface OfflineJob {
  id: string;
  tenant_id: string;
  customer_id: string;
  title: string;
  description?: string;
  status: string;
  property_address?: string;
  metadata?: Record<string, any>;
  pending_sync: boolean;
  created_offline: boolean;
  timestamp: number;
}

let db: IDBPDatabase<WeathercraftDB> | null = null;

/**
 * Initialize offline database
 */
export async function initOfflineDB(): Promise<IDBPDatabase<WeathercraftDB>> {
  if (db) return db;

  db = await openDB<WeathercraftDB>('weathercraft-offline', DB_VERSION, {
    upgrade(db) {
      // Pending sync stores
      if (!db.objectStoreNames.contains('pending_inspections')) {
        db.createObjectStore('pending_inspections', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pending_estimates')) {
        db.createObjectStore('pending_estimates', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pending_customers')) {
        db.createObjectStore('pending_customers', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pending_jobs')) {
        db.createObjectStore('pending_jobs', { keyPath: 'id' });
      }

      // Cached data stores
      if (!db.objectStoreNames.contains('cached_jobs')) {
        db.createObjectStore('cached_jobs', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cached_customers')) {
        db.createObjectStore('cached_customers', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cached_estimates')) {
        db.createObjectStore('cached_estimates', { keyPath: 'id' });
      }
    },
  });

  return db;
}

/**
 * Check if user is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Save field inspection offline
 */
export async function saveFieldInspectionOffline(
  inspection: Omit<OfflineFieldInspection, 'pending_sync' | 'created_offline' | 'timestamp'>
): Promise<void> {
  const db = await initOfflineDB();
  await db.put('pending_inspections', {
    ...inspection,
    pending_sync: true,
    created_offline: true,
    timestamp: Date.now(),
  });

  // Trigger background sync if supported
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register('sync-field-inspections');
  }
}

/**
 * Save estimate offline
 */
export async function saveEstimateOffline(
  estimate: Omit<OfflineEstimate, 'pending_sync' | 'created_offline' | 'timestamp'>
): Promise<void> {
  const db = await initOfflineDB();
  await db.put('pending_estimates', {
    ...estimate,
    pending_sync: true,
    created_offline: true,
    timestamp: Date.now(),
  });

  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register('sync-estimates');
  }
}

/**
 * Save customer offline
 */
export async function saveCustomerOffline(
  customer: Omit<OfflineCustomer, 'pending_sync' | 'created_offline' | 'timestamp'>
): Promise<void> {
  const db = await initOfflineDB();
  await db.put('pending_customers', {
    ...customer,
    pending_sync: true,
    created_offline: true,
    timestamp: Date.now(),
  });

  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register('sync-customers');
  }
}

export async function saveJobOffline(
  job: Omit<OfflineJob, 'pending_sync' | 'created_offline' | 'timestamp'>
): Promise<void> {
  const db = await initOfflineDB();
  await db.put('pending_jobs', {
    ...job,
    pending_sync: true,
    created_offline: true,
    timestamp: Date.now(),
  });

  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register('sync-jobs');
  }
}

/**
 * Get pending sync count
 */
export async function getPendingSyncCount(): Promise<{
  inspections: number;
  estimates: number;
  customers: number;
  jobs: number;
  total: number;
}> {
  const db = await initOfflineDB();

  const [inspections, estimates, customers, jobs] = await Promise.all([
    db.count('pending_inspections'),
    db.count('pending_estimates'),
    db.count('pending_customers'),
    db.count('pending_jobs'),
  ]);

  return {
    inspections,
    estimates,
    customers,
    jobs,
    total: inspections + estimates + customers + jobs,
  };
}

/**
 * Cache data for offline access
 */
export async function cacheForOffline(type: 'jobs' | 'customers' | 'estimates', data: any[]) {
  const db = await initOfflineDB();
  const storeName = `cached_${type}` as 'cached_jobs' | 'cached_customers' | 'cached_estimates';
  const tx = db.transaction(storeName, 'readwrite');

  for (const item of data) {
    await tx.store.put(item);
  }

  await tx.done;
}

/**
 * Get cached data
 */
export async function getCachedData(
  type: 'jobs' | 'customers' | 'estimates'
): Promise<any[]> {
  const db = await initOfflineDB();
  const storeName = `cached_${type}` as 'cached_jobs' | 'cached_customers' | 'cached_estimates';
  return db.getAll(storeName);
}

export async function getPendingJobs(): Promise<OfflineJob[]> {
  const db = await initOfflineDB();
  return db.getAll('pending_jobs');
}

/**
 * Clear all offline data
 */
export async function clearOfflineData(): Promise<void> {
  const db = await initOfflineDB();

  await Promise.all([
    db.clear('pending_inspections'),
    db.clear('pending_estimates'),
    db.clear('pending_customers'),
    db.clear('pending_jobs'),
    db.clear('cached_jobs'),
    db.clear('cached_customers'),
    db.clear('cached_estimates'),
  ]);
}

/**
 * Save inspection offline (for MobileInspectionApp)
 */
export async function saveInspectionOffline(inspection: any): Promise<void> {
  const db = await initOfflineDB();

  // Convert to OfflineFieldInspection format
  const offlineInspection: OfflineFieldInspection = {
    id: inspection.id,
    job_id: inspection.job_id || '',
    inspector_id: inspection.inspector_id || '',
    inspection_date: inspection.inspection_date,
    location: inspection.photos[0]?.location || { lat: 0, lng: 0 },
    photos: inspection.photos.map((p: any) => p.url),
    notes: inspection.notes || '',
    weather_conditions: inspection.weather_conditions?.conditions,
    roof_condition: inspection.damage_assessment?.severity || 'none',
    pending_sync: true,
    created_offline: true,
    timestamp: Date.now(),
  };

  await db.put('pending_inspections', offlineInspection);

  // Trigger background sync if supported
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register('sync-inspections');
  }
}

/**
 * Sync pending inspections
 */
export async function syncPendingInspections(): Promise<{
  success: boolean;
  synced: number;
  failed: number;
}> {
  if (!isOnline()) {
    return { success: false, synced: 0, failed: 0 };
  }

  const db = await initOfflineDB();
  let synced = 0;
  let failed = 0;

  const inspections = await db.getAll('pending_inspections');

  for (const inspection of inspections) {
    try {
      const response = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inspection),
      });

      if (response.ok) {
        await db.delete('pending_inspections', inspection.id);
        synced++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
    }
  }

  return { success: failed === 0, synced, failed };
}

export async function syncPendingJobs(): Promise<{
  success: boolean;
  synced: number;
  failed: number;
}> {
  if (!isOnline()) {
    return { success: false, synced: 0, failed: 0 };
  }

  const db = await initOfflineDB();
  let synced = 0;
  let failed = 0;

  const jobs = await db.getAll('pending_jobs');

  for (const job of jobs) {
    const { pending_sync: _pending, created_offline: _created, timestamp: _timestamp, ...payload } = job as any;
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': job.tenant_id },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await db.delete('pending_jobs', job.id);
        synced++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
    }
  }

  return { success: failed === 0, synced, failed };
}

/**
 * Manual sync attempt
 */
export async function attemptManualSync(): Promise<{
  success: boolean;
  synced: number;
  failed: number;
}> {
  if (!isOnline()) {
    return { success: false, synced: 0, failed: 0 };
  }

  const db = await initOfflineDB();
  let synced = 0;
  let failed = 0;

  // Sync inspections
  const inspections = await db.getAll('pending_inspections');
  for (const inspection of inspections) {
    try {
      const response = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inspection),
      });

      if (response.ok) {
        await db.delete('pending_inspections', inspection.id);
        synced++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
    }
  }

  // Sync estimates
  const estimates = await db.getAll('pending_estimates');
  for (const estimate of estimates) {
    try {
      const response = await fetch('/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estimate),
      });

      if (response.ok) {
        await db.delete('pending_estimates', estimate.id);
        synced++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
    }
  }

  // Sync jobs
  const jobs = await db.getAll('pending_jobs');
  for (const job of jobs) {
    const { pending_sync: _pending, created_offline: _created, timestamp: _timestamp, ...payload } = job as any;
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': job.tenant_id },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await db.delete('pending_jobs', job.id);
        synced++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
    }
  }

  // Sync customers
  const customers = await db.getAll('pending_customers');
  for (const customer of customers) {
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer),
      });

      if (response.ok) {
        await db.delete('pending_customers', customer.id);
        synced++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
    }
  }

  return { success: failed === 0, synced, failed };
}
