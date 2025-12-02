/**
 * Relationship Awareness Client Library
 * Integrates with BrainOps Backend Relationship Awareness API
 */

import { BRAINOPS_BACKEND_URL, withBrainOpsAuthHeaders } from '@/lib/brainops/env';

const BACKEND_URL = (BRAINOPS_BACKEND_URL || '').replace(/\/$/, '');
const RELATIONSHIP_API_BASE = BACKEND_URL ? `${BACKEND_URL}/api/v1/aware` : '';
const isProdEnv = process.env.NODE_ENV === 'production';
const isLocalPlaceholder = /:\/\/(localhost|127\.0\.0\.1)/i.test(BACKEND_URL);

const isRelationshipBackendAvailable = () => {
  if (!RELATIONSHIP_API_BASE) {
    return false;
  }

  if (isProdEnv && isLocalPlaceholder) {
    return false;
  }

  return true;
};

const assertRelationshipBackend = () => {
  if (!isRelationshipBackendAvailable()) {
    throw new Error('Relationship awareness backend is not configured for this environment.');
  }
};

const awareFetch = async (path: string, init: RequestInit = {}) => {
  assertRelationshipBackend();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${RELATIONSHIP_API_BASE}${path}`, {
    ...init,
    headers: withBrainOpsAuthHeaders(headers),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error && (error.detail || error.message)) ||
        `Relationship awareness request failed (${response.status})`
    );
  }

  return response.json();
};

export interface RelationshipConnection {
  type: string;
  table: string;
  relationship: string;
}

export interface RelationshipCollection<T> {
  count?: number;
  data?: T[];
}

export interface RelationshipGraph {
  entity_type: string;
  entity_id: string;
  connections: RelationshipConnection[];
}

export interface RelationshipEntity<T extends Record<string, unknown> = Record<string, unknown>> {
  entity: T;
  relationships: Record<string, RelationshipCollection<unknown>>;
  computed_fields: Record<string, unknown>;
  relationship_graph: RelationshipGraph;
}

export interface RelationshipResponse<T extends Record<string, unknown> = Record<string, unknown>> {
  success: boolean;
  customer?: RelationshipEntity<T>;
  job?: RelationshipEntity<T>;
  employee?: RelationshipEntity<T>;
  customer_complete_view?: RelationshipEntity<T>;
  job_complete_view?: RelationshipEntity<T>;
  employee_complete_view?: RelationshipEntity<T>;
  message?: string;
}

/**
 * Create customer with automatic relationship tracking
 */
export async function createCustomerWithAwareness(customerData: {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  tenant_id: string;
  org_id?: string;
}): Promise<RelationshipResponse> {
  return awareFetch('/customers', {
    method: 'POST',
    body: JSON.stringify(customerData),
  });
}

/**
 * Create job with automatic linking to employees, equipment, materials
 */
export async function createJobWithAwareness(jobData: {
  customer_id: string;
  job_number: string;
  title: string;
  description?: string;
  property_address?: string;
  scheduled_start?: string;
  tenant_id: string;
  org_id?: string;
  employee_ids?: string[];
  equipment_ids?: string[];
  materials?: Array<{
    inventory_item_id: string;
    quantity: number;
    unit_cost?: number;
  }>;
}): Promise<RelationshipResponse> {
  return awareFetch('/jobs', {
    method: 'POST',
    body: JSON.stringify(jobData),
  });
}

/**
 * Get complete 360° customer view with all relationships
 */
export async function getCompleteCustomerView(customerId: string): Promise<RelationshipResponse> {
  return awareFetch(`/customers/${customerId}/complete`, { method: 'GET' });
}

/**
 * Get complete job view with all relationships
 */
export async function getCompleteJobView(jobId: string): Promise<RelationshipResponse> {
  return awareFetch(`/jobs/${jobId}/complete`, { method: 'GET' });
}

/**
 * Get complete employee view with all relationships
 */
export async function getCompleteEmployeeView(employeeId: string): Promise<RelationshipResponse> {
  return awareFetch(`/employees/${employeeId}/complete`, { method: 'GET' });
}

/**
 * Check relationship awareness system health
 */
export async function checkRelationshipHealth(): Promise<{
  status: string;
  system: string;
  version: string;
  features: string[];
}> {
  return awareFetch('/health', { method: 'GET' });
}

/**
 * Format relationship data for display
 */
export function formatRelationshipData<T extends Record<string, unknown>>(entity?: RelationshipEntity<T> | null) {
  if (!entity) return null;

  return {
    ...(entity.entity as T),
    _relationships: entity.relationships,
    _computed: entity.computed_fields,
    _graph: entity.relationship_graph,
  };
}

/**
 * Get relationship statistics
 */
export function getRelationshipStats(entity?: RelationshipEntity | null): Record<string, number> {
  if (!entity || !entity.relationships) {
    return {};
  }

  return Object.entries(entity.relationships).reduce<Record<string, number>>((acc, [key, value]) => {
    if (typeof value.count === 'number') {
      acc[key] = value.count;
    } else if (Array.isArray(value.data)) {
      acc[key] = value.data.length;
    } else {
      acc[key] = 0;
    }
    return acc;
  }, {});
}

export const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';
