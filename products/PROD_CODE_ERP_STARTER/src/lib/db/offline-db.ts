/**
 * OFFLINE DATABASE - IndexedDB Implementation
 * Enterprise-grade offline-first data layer using Dexie.js
 * Replaces localStorage with unlimited IndexedDB storage
 */

import Dexie, { Table } from 'dexie';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface OfflineInspection {
  id: string;
  jobId?: string;
  customerId?: string;
  address: string;
  status: 'draft' | 'pending' | 'synced' | 'completed';
  notes?: string;
  weatherConditions?: string;
  roofType?: string;
  roofAge?: string;
  signature?: string;
  gpsCoords?: { lat: number; lng: number; accuracy?: number };
  locationAddress?: string;
  deviceId: string;
  version: number;
  isSynced: boolean;
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;
  completedAt?: Date;
}

export interface OfflinePhoto {
  id: string;
  inspectionId: string;
  blob: Blob; // Store as Blob instead of base64 for efficiency
  thumbnailBlob?: Blob;
  caption?: string;
  location?: string;
  tags?: string[];
  gpsCoords?: { lat: number; lng: number; altitude?: number; accuracy?: number };
  gpsTimestamp?: Date;
  exifData?: any;
  aiAnalysis?: any;
  autoLinked: boolean;
  linkConfidence: number;
  synced: boolean;
  uploadError?: string;
  retryCount: number;
  capturedAt: Date;
  uploadedAt?: Date;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface OfflineMeasurement {
  id: string;
  inspectionId: string;
  type: string; // 'length', 'area', 'pitch', 'height', 'count'
  value: number;
  unit: string; // 'ft', 'sqft', 'degrees', 'inches'
  notes?: string;
  location?: string;
  photoId?: string;
  createdAt: Date;
}

export interface OfflineDamage {
  id: string;
  inspectionId: string;
  type: string;
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  location: string;
  estimatedCost?: number;
  photoIds?: string[];
  aiDetected: boolean;
  aiConfidence?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncQueueItem {
  id: string;
  type: 'inspection' | 'photo' | 'measurement' | 'damage';
  action: 'create' | 'update' | 'delete';
  entityId: string;
  data: any;
  priority: number; // 1=highest, 5=lowest
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
  error?: string;
  lastErrorAt?: Date;
  deviceId: string;
  createdAt: Date;
  processedAt?: Date;
}

export interface SyncConflict {
  id: string;
  entityType: 'inspection' | 'photo' | 'measurement' | 'damage';
  entityId: string;
  localVersion: any;
  remoteVersion: any;
  localTimestamp: Date;
  remoteTimestamp: Date;
  resolution?: 'local' | 'remote' | 'merged' | 'manual';
  mergedVersion?: any;
  aiConfidence?: number;
  aiSuggestion?: string;
  deviceId: string;
  createdAt: Date;
  resolvedAt?: Date;
  isResolved: boolean;
}

// =============================================================================
// DATABASE CLASS
// =============================================================================

export class OfflineDB extends Dexie {
  inspections!: Table<OfflineInspection, string>;
  photos!: Table<OfflinePhoto, string>;
  measurements!: Table<OfflineMeasurement, string>;
  damage!: Table<OfflineDamage, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  conflicts!: Table<SyncConflict, string>;

  constructor() {
    super('WeathercraftFieldOps');

    this.version(1).stores({
      inspections: 'id, jobId, customerId, status, deviceId, isSynced, createdAt, updatedAt',
      photos: 'id, inspectionId, synced, capturedAt, retryCount',
      measurements: 'id, inspectionId, type, createdAt',
      damage: 'id, inspectionId, severity, aiDetected, createdAt',
      syncQueue: 'id, type, status, priority, deviceId, createdAt',
      conflicts: 'id, entityType, entityId, isResolved, deviceId, createdAt'
    });
  }
}

// Singleton instance
export const offlineDB = new OfflineDB();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get device ID (persistent across sessions)
 */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem('weathercraft_device_id');

  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('weathercraft_device_id', deviceId);
  }

  return deviceId;
}

/**
 * Convert base64 to Blob
 */
export async function base64ToBlob(base64: string): Promise<Blob> {
  const response = await fetch(base64);
  return response.blob();
}

/**
 * Convert Blob to base64
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Get storage quota information
 */
export async function getStorageInfo() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      quota: estimate.quota || 0,
      usage: estimate.usage || 0,
      quotaGB: estimate.quota ? Math.round(estimate.quota / (1024 * 1024 * 1024) * 10) / 10 : 0,
      usageMB: estimate.usage ? Math.round(estimate.usage / (1024 * 1024) * 10) / 10 : 0,
      percentUsed: estimate.quota ? Math.round((estimate.usage! / estimate.quota) * 100) : 0
    };
  }
  return null;
}

/**
 * Request persistent storage (prevents browser from clearing data)
 */
export async function requestPersistentStorage() {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    const isPersisted = await navigator.storage.persisted();

    if (!isPersisted) {
      const granted = await navigator.storage.persist();
      console.log(`Persistent storage ${granted ? 'granted' : 'denied'}`);
      return granted;
    }

    return true;
  }
  return false;
}

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

/**
 * Inspection Operations
 */
export const inspectionOps = {
  async create(inspection: Omit<OfflineInspection, 'id' | 'version' | 'createdAt' | 'updatedAt'>) {
    const id = crypto.randomUUID();
    const now = new Date();

    const newInspection: OfflineInspection = {
      ...inspection,
      id,
      version: 1,
      deviceId: getDeviceId(),
      isSynced: false,
      createdAt: now,
      updatedAt: now
    };

    await offlineDB.inspections.add(newInspection);

    // Add to sync queue
    await syncQueueOps.add({
      type: 'inspection',
      action: 'create',
      entityId: id,
      data: newInspection,
      priority: 3
    });

    return newInspection;
  },

  async update(id: string, updates: Partial<OfflineInspection>) {
    const existing = await offlineDB.inspections.get(id);

    if (!existing) {
      throw new Error(`Inspection ${id} not found`);
    }

    const updated = {
      ...updates,
      version: existing.version + 1,
      updatedAt: new Date(),
      isSynced: false
    };

    await offlineDB.inspections.update(id, updated);

    // Add to sync queue
    await syncQueueOps.add({
      type: 'inspection',
      action: 'update',
      entityId: id,
      data: { ...existing, ...updated },
      priority: 3
    });

    return offlineDB.inspections.get(id);
  },

  async delete(id: string) {
    await offlineDB.inspections.delete(id);

    // Add to sync queue
    await syncQueueOps.add({
      type: 'inspection',
      action: 'delete',
      entityId: id,
      data: { id },
      priority: 4
    });
  },

  async getById(id: string) {
    return offlineDB.inspections.get(id);
  },

  async getAll(filters?: {
    status?: string;
    jobId?: string;
    unsynced?: boolean;
  }) {
    let query = offlineDB.inspections.toCollection();

    if (filters?.status) {
      query = offlineDB.inspections.where('status').equals(filters.status);
    }

    if (filters?.jobId) {
      query = offlineDB.inspections.where('jobId').equals(filters.jobId);
    }

    if (filters?.unsynced) {
      query = offlineDB.inspections.where('isSynced').equals(false as any);
    }

    return query.reverse().sortBy('createdAt');
  },

  async getWithRelations(id: string) {
    const inspection = await offlineDB.inspections.get(id);
    if (!inspection) return null;

    const photos = await offlineDB.photos.where('inspectionId').equals(id).toArray();
    const measurements = await offlineDB.measurements.where('inspectionId').equals(id).toArray();
    const damage = await offlineDB.damage.where('inspectionId').equals(id).toArray();

    return {
      ...inspection,
      photos,
      measurements,
      damage
    };
  }
};

/**
 * Photo Operations
 */
export const photoOps = {
  async add(photo: Omit<OfflinePhoto, 'id' | 'createdAt'>) {
    const id = crypto.randomUUID();

    const newPhoto: OfflinePhoto = {
      ...photo,
      id,
      synced: false,
      autoLinked: false,
      linkConfidence: 0,
      retryCount: 0,
      capturedAt: new Date()
    };

    await offlineDB.photos.add(newPhoto);

    // Add to sync queue with high priority
    await syncQueueOps.add({
      type: 'photo',
      action: 'create',
      entityId: id,
      data: newPhoto,
      priority: 1 // High priority for photos
    });

    return newPhoto;
  },

  async getByInspection(inspectionId: string) {
    return offlineDB.photos.where('inspectionId').equals(inspectionId).toArray();
  },

  async getUnsynced() {
    return offlineDB.photos.where('synced').equals(false as any).toArray();
  },

  async markSynced(id: string, uploadedUrl?: string) {
    await offlineDB.photos.update(id, {
      synced: true,
      uploadedAt: new Date()
    });
  },

  async incrementRetry(id: string, error: string) {
    const photo = await offlineDB.photos.get(id);
    if (photo) {
      await offlineDB.photos.update(id, {
        retryCount: photo.retryCount + 1,
        uploadError: error
      });
    }
  }
};

/**
 * Sync Queue Operations
 */
export const syncQueueOps = {
  async add(item: Omit<SyncQueueItem, 'id' | 'status' | 'retryCount' | 'maxRetries' | 'deviceId' | 'createdAt'>) {
    const id = crypto.randomUUID();

    const queueItem: SyncQueueItem = {
      ...item,
      id,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      deviceId: getDeviceId(),
      createdAt: new Date()
    };

    await offlineDB.syncQueue.add(queueItem);
    return queueItem;
  },

  async getPending() {
    return offlineDB.syncQueue
      .where('status')
      .anyOf(['pending', 'failed'])
      .filter(item => item.retryCount < item.maxRetries)
      .sortBy('priority');
  },

  async markProcessing(id: string) {
    await offlineDB.syncQueue.update(id, { status: 'processing' });
  },

  async markCompleted(id: string) {
    await offlineDB.syncQueue.update(id, {
      status: 'completed',
      processedAt: new Date()
    });
  },

  async markFailed(id: string, error: string) {
    const item = await offlineDB.syncQueue.get(id);
    if (item) {
      await offlineDB.syncQueue.update(id, {
        status: 'failed',
        retryCount: item.retryCount + 1,
        error,
        lastErrorAt: new Date()
      });
    }
  },

  async getQueueLength() {
    return offlineDB.syncQueue
      .where('status')
      .anyOf(['pending', 'failed'])
      .count();
  },

  async clearCompleted() {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await offlineDB.syncQueue
      .where('status')
      .equals('completed')
      .and(item => item.processedAt! < oneWeekAgo)
      .delete();
  }
};

/**
 * Conflict Operations
 */
export const conflictOps = {
  async create(conflict: Omit<SyncConflict, 'id' | 'deviceId' | 'createdAt' | 'isResolved'>) {
    const id = crypto.randomUUID();

    const newConflict: SyncConflict = {
      ...conflict,
      id,
      deviceId: getDeviceId(),
      createdAt: new Date(),
      isResolved: false
    };

    await offlineDB.conflicts.add(newConflict);
    return newConflict;
  },

  async getUnresolved() {
    return offlineDB.conflicts
      .where('isResolved')
      .equals(false as any)
      .reverse()
      .sortBy('createdAt');
  },

  async resolve(id: string, resolution: 'local' | 'remote' | 'merged' | 'manual', mergedVersion?: any) {
    await offlineDB.conflicts.update(id, {
      resolution,
      mergedVersion,
      isResolved: true,
      resolvedAt: new Date()
    });
  }
};

// =============================================================================
// MIGRATION FROM LOCALSTORAGE
// =============================================================================

export async function migrateFromLocalStorage() {
  const localStorageKey = 'field_inspections';
  const oldData = localStorage.getItem(localStorageKey);

  if (!oldData) {
    console.log('No localStorage data to migrate');
    return { migrated: 0, skipped: 0, errors: 0 };
  }

  try {
    const inspections = JSON.parse(oldData);
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    console.log(`Starting migration of ${inspections.length} inspections...`);

    for (const inspection of inspections) {
      try {
        // Check if already exists
        const existing = await offlineDB.inspections.get(inspection.id);
        if (existing) {
          skipped++;
          continue;
        }

        // Migrate inspection
        await offlineDB.inspections.add({
          id: inspection.id,
          jobId: inspection.jobId,
          customerId: inspection.customerId,
          address: inspection.address,
          status: inspection.status || 'draft',
          notes: inspection.notes,
          weatherConditions: inspection.weatherConditions,
          roofType: inspection.roofType,
          roofAge: inspection.roofAge,
          signature: inspection.signature,
          deviceId: inspection.deviceId || getDeviceId(),
          version: 1,
          isSynced: inspection.status === 'synced',
          createdAt: new Date(inspection.createdAt || Date.now()),
          updatedAt: new Date(inspection.createdAt || Date.now()),
          syncedAt: inspection.syncedAt ? new Date(inspection.syncedAt) : undefined
        });

        // Migrate photos (convert base64 to Blob)
        if (inspection.photos?.length > 0) {
          for (const photo of inspection.photos) {
            try {
              const blob = await base64ToBlob(photo.dataUrl);

              await offlineDB.photos.add({
                id: photo.id,
                inspectionId: inspection.id,
                blob,
                caption: photo.caption,
                location: photo.location,
                tags: photo.tags,
                synced: false,
                autoLinked: false,
                linkConfidence: 0,
                retryCount: 0,
                capturedAt: new Date(photo.timestamp || Date.now()),
                fileSize: blob.size,
                mimeType: blob.type || 'image/jpeg'
              });
            } catch (photoError) {
              console.error('Photo migration error:', photoError);
            }
          }
        }

        // Migrate measurements
        if (inspection.measurements?.length > 0) {
          for (const measurement of inspection.measurements) {
            await offlineDB.measurements.add({
              id: crypto.randomUUID(),
              inspectionId: inspection.id,
              type: measurement.type,
              value: measurement.value,
              unit: measurement.unit,
              notes: measurement.notes,
              createdAt: new Date()
            });
          }
        }

        // Migrate damage
        if (inspection.damageAssessment?.length > 0) {
          for (const damage of inspection.damageAssessment) {
            await offlineDB.damage.add({
              id: crypto.randomUUID(),
              inspectionId: inspection.id,
              type: damage.type,
              severity: damage.severity,
              location: damage.location,
              estimatedCost: damage.estimatedCost,
              photoIds: damage.photoIds,
              aiDetected: false,
              notes: damage.notes,
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        }

        migrated++;
      } catch (error) {
        console.error('Inspection migration error:', error);
        errors++;
      }
    }

    // Clear localStorage after successful migration
    if (migrated > 0 && errors === 0) {
      localStorage.removeItem(localStorageKey);
      console.log(`✅ Migration complete: ${migrated} inspections migrated`);
    }

    return { migrated, skipped, errors };

  } catch (error) {
    console.error('Migration failed:', error);
    return { migrated: 0, skipped: 0, errors: 1 };
  }
}

// =============================================================================
// EXPORT ALL
// =============================================================================

export default offlineDB;
