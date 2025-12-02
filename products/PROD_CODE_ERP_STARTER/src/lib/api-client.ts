import { createClient as createSupabaseBrowserClient } from '@/lib/supabase/client';
import { showError, showWarning, showSessionExpired, showInfo } from '@/lib/toast';
import type { components } from '@/lib/sdk/brainops';
import type { Customer, Estimate, Invoice, Job, ListResponse } from '@/types/erp';
import { normalizeListResponse } from '@/types/erp';
import { BRAINOPS_AI_AGENTS_URL, BRAINOPS_API_KEY, BRAINOPS_BACKEND_URL, withBrainOpsAuthHeaders } from '@/lib/brainops/env';

/**
 * Centralized API Client for Weathercraft ERP
 * ALL data flows through BrainOps backend - NO direct database access
 * This ensures cross-system compatibility with MyRoofGenius
 */

const BACKEND_URL = BRAINOPS_BACKEND_URL;
const AI_AGENTS_URL = BRAINOPS_AI_AGENTS_URL;
const API_VERSION = '/api/v1';
const AI_AGENT_KEY =
  BRAINOPS_API_KEY ||
  (typeof process !== 'undefined'
    ? process.env.AI_AGENTS_TEST_KEY ||
      process.env.AI_AGENTS_API_KEY ||
      (process.env.API_KEYS ? process.env.API_KEYS.split(',')[0] : '')
    : '');

let browserSupabase: ReturnType<typeof createSupabaseBrowserClient> | null = null;

const getBrowserSupabase = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!browserSupabase) {
    browserSupabase = createSupabaseBrowserClient();
  }

  return browserSupabase;
};

async function getSupabaseAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const client = getBrowserSupabase();
    if (!client) {
      return null;
    }

    const {
      data: { session },
      error,
    } = await client.auth.getSession();

    if (error) {
      console.warn('[apiFetch] Failed to resolve Supabase session', error);
      return null;
    }

    return session?.access_token ?? null;
  } catch (error) {
    console.warn('[apiFetch] Unexpected error resolving Supabase access token', error);
    return null;
  }
}

/**
 * CRITICAL FIX: Authenticated fetch wrapper for same-origin API calls
 *
 * Next.js fetch() does NOT include cookies by default!
 * This wrapper ensures Supabase auth cookies are ALWAYS sent and also forwards
 * the current access token so API routes can authenticate via Authorization header.
 *
 * Use this for ANY client-side API calls to /api/* routes.
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers ?? undefined);
  // Attach a correlation ID for tracing
  try {
    const rid =
      headers.get('X-Request-ID') ||
      (
        (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
          ? (crypto as any).randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      );
    headers.set('X-Request-ID', rid);
    if (typeof window !== 'undefined') {
      (window as unknown as { [k: string]: unknown }).__WEATHERCRAFT_LAST_REQUEST_ID__ = rid;
    }
  } catch {}

  // Ensure tenant scoping is always present, even before TenantProvider's fetch patch runs.
  try {
    if (!headers.has('x-tenant-id') && typeof window !== 'undefined') {
      const TENANT_STORAGE_KEY = 'weathercraft:last_tenant_id';
      const stored = window.localStorage?.getItem(TENANT_STORAGE_KEY) || '';
      const forcedTenant = (window as any).__FORCE_TENANT_ID__ || '';
      const tenantId = (forcedTenant || stored || '').trim();
      if (tenantId) {
        headers.set('x-tenant-id', tenantId);
      }
      // Also append tenant_id query param if not present
      try {
        const u = new URL(url, window.location.origin);
        if (tenantId && !u.searchParams.get('tenant_id')) {
          u.searchParams.set('tenant_id', tenantId);
          url = u.toString();
        }
      } catch {}
    }
  } catch (e) {
    // Non-blocking safeguard
    console.warn('[apiFetch] Unable to inject tenant context early:', e);
  }

  const body = options.body;
  const isFormData =
    typeof FormData !== 'undefined' && body instanceof FormData;
  const isBlob = typeof Blob !== 'undefined' && body instanceof Blob;
  const isArrayBuffer =
    typeof ArrayBuffer !== 'undefined' &&
    (body instanceof ArrayBuffer ||
      ArrayBuffer.isView(body as ArrayBufferView));

  if (!headers.has('Content-Type') && !isFormData && !isBlob && !isArrayBuffer) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('Authorization')) {
    const token = await getSupabaseAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return fetch(url, {
    ...options,
    credentials: options.credentials ?? 'include', // Include Supabase cookies alongside bearer token
    headers,
  });
}

/**
 * Get authentication token for BrainOps backend
 * NOTE: This is a separate auth mechanism from Supabase, used for the legacy BrainOps API.
 */
function getAuthToken(): string {
  if (typeof window === 'undefined') {
    return process.env.BRAINOPS_API_KEY || '';
  }
  return localStorage?.getItem('auth_token') || sessionStorage?.getItem('auth_token') || '';
}

/**
 * Make API request with error handling
 */
type QueryParams = Record<string, string | number | boolean | null | undefined>;

function buildQueryString(params?: QueryParams): string {
  if (!params) {
    return '';
  }

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    searchParams.append(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

type BrainOpsCustomer = components['schemas']['routes__customers_full_crud__CustomerResponse'];
type BrainOpsCustomerList = components['schemas']['routes__customers_full_crud__CustomerListResponse'];
type BrainOpsCustomerCreate = components['schemas']['routes__customers_full_crud__CustomerCreate'];
type BrainOpsCustomerUpdate = components['schemas']['routes__customers_full_crud__CustomerUpdate'];
type BrainOpsJobCreate = components['schemas']['JobCreate'];
type BrainOpsJobStatus = components['schemas']['routes__job_lifecycle__JobStatus'];
type BrainOpsJobPriority = components['schemas']['JobPriority'];
type CustomerStatus = components['schemas']['CustomerStatus'];
type BrainOpsJobUpdate = Partial<BrainOpsJobCreate> & {
  status?: BrainOpsJobStatus | string | null;
  priority?: BrainOpsJobPriority | string | null;
};

type CustomerListParams = {
  limit?: number;
  offset?: number;
  search?: string | null;
  status?: CustomerStatus | string | null;
  type?: string | null;
  city?: string | null;
  state?: string | null;
  tenant_id?: string | null;
};

type JobListParams = {
  limit?: number;
  offset?: number;
  status?: BrainOpsJobStatus | string | null;
  customer_id?: string | null;
  assigned_to?: string | null;
  search?: string | null;
  tenant_id?: string | null;
};

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BACKEND_URL}${API_VERSION}${endpoint}`;
  const token = getAuthToken();

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? (crypto as any).randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Client': 'weathercraft-erp',
        'X-Client-Version': '3.0.0',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const requestId = response.headers.get('X-Request-ID') || '';
      const limitHdr = response.headers.get('X-RateLimit-Limit') || '';
      const remainingHdr = response.headers.get('X-RateLimit-Remaining') || '';
      let errorText = '';
      try { errorText = await response.text(); } catch {}

      switch (response.status) {
        case 401:
          showSessionExpired();
          break;
        case 403:
          showWarning('Permission denied', 'You are not allowed to perform this action.');
          break;
        case 429:
          showWarning('Too many requests', remainingHdr ? `${remainingHdr} remaining this minute.` : 'Please try again shortly.');
          break;
        default:
          if (response.status >= 500) {
            showError('Service unavailable', 'Please try again in a moment.');
          } else if (response.status >= 400) {
            showWarning('Request error', 'Please review and try again.');
          }
      }

      const err = new Error(`API Error (${response.status}): ${errorText || response.statusText}${requestId ? ` [${requestId}]` : ''}`);
      (err as any).status = response.status;
      (err as any).requestId = requestId;
      throw err;
    }

    const payload = (await response.json()) as T;
    const rem = Number(response.headers.get('X-RateLimit-Remaining') || '0');
    const lim = Number(response.headers.get('X-RateLimit-Limit') || '0');
    if (lim && rem && rem <= Math.ceil(lim * 0.1)) {
      showInfo('Approaching rate limit', `Remaining ${rem} requests this minute.`);
    }
    return payload;
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error);
    throw error;
  }
}

/**
 * Centralized API Client
 * Use this INSTEAD of direct Supabase calls
 */
export const apiClient = {
  // ==================== CUSTOMERS ====================
  customers: {
    async list(params?: CustomerListParams) {
      const query = buildQueryString(params);
      return apiRequest<ListResponse<BrainOpsCustomer> | BrainOpsCustomerList>(`/customers${query}`);
    },

    async get(id: string) {
      return apiRequest<BrainOpsCustomer>(`/customers/${id}`);
    },

    async create(data: BrainOpsCustomerCreate) {
      return apiRequest<BrainOpsCustomer | { customer: BrainOpsCustomer }>('/customers', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(id: string, data: BrainOpsCustomerUpdate) {
      return apiRequest<BrainOpsCustomer | { customer: BrainOpsCustomer }>(`/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    async delete(id: string) {
      return apiRequest<void>(`/customers/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // ==================== JOBS ====================
  jobs: {
    async list(params?: JobListParams, init?: RequestInit) {
      const query = buildQueryString(params);
      return apiRequest<ListResponse<Job>>(`/jobs${query}`, init);
    },

    async get(id: string) {
      return apiRequest<Job>(`/jobs/${id}`);
    },

    async create(data: BrainOpsJobCreate) {
      return apiRequest<Job | { job: Job }>('/jobs', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(id: string, data: BrainOpsJobUpdate) {
      return apiRequest<Job | { job: Job }>(`/jobs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    async delete(id: string) {
      return apiRequest<void>(`/jobs/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // ==================== ESTIMATES ====================
  estimates: {
    async list(params?: { limit?: number; offset?: number; customer_id?: string; status?: string; search?: string }) {
      const query = buildQueryString(params);
      return apiRequest<ListResponse<Estimate>>(`/estimates${query}`);
    },

    async get(id: string) {
      return apiRequest<Estimate>(`/estimates/${id}`);
    },

    async create(data: Partial<Estimate>) {
      return apiRequest<Estimate | { estimate: Estimate }>('/estimates', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(id: string, data: Partial<Estimate>) {
      return apiRequest<Estimate | { estimate: Estimate }>(`/estimates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    async delete(id: string) {
      return apiRequest<void>(`/estimates/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // ==================== INVOICES ====================
  invoices: {
    async list(params?: { limit?: number; offset?: number; customer_id?: string; status?: string; search?: string }) {
      const query = buildQueryString(params);
      return apiRequest<ListResponse<Invoice>>(`/invoices${query}`);
    },

    async get(id: string) {
      return apiRequest<Invoice>(`/invoices/${id}`);
    },

    async create(data: Partial<Invoice>) {
      return apiRequest<Invoice | { invoice: Invoice }>('/invoices', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(id: string, data: Partial<Invoice>) {
      return apiRequest<Invoice | { invoice: Invoice }>(`/invoices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    async delete(id: string) {
      return apiRequest<void>(`/invoices/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // ==================== EMPLOYEES ====================
  employees: {
    async list(params?: { limit?: number; offset?: number }) {
      const query = buildQueryString(params);
      return apiRequest(`/employees${query}`);
    },

    async get(id: string) {
      return apiRequest(`/employees/${id}`);
    },

    async create(data: Record<string, unknown>) {
      return apiRequest('/employees', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(id: string, data: Record<string, unknown>) {
      return apiRequest(`/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  },

  // ==================== EQUIPMENT ====================
  equipment: {
    async list(params?: { limit?: number; offset?: number }) {
      const query = buildQueryString(params);
      return apiRequest(`/equipment${query}`);
    },

    async get(id: string) {
      return apiRequest(`/equipment/${id}`);
    },

    async create(data: Record<string, unknown>) {
      return apiRequest('/equipment', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(id: string, data: Record<string, unknown>) {
      return apiRequest(`/equipment/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  },

  // ==================== INVENTORY ====================
  inventory: {
    async list(params?: { limit?: number; offset?: number }) {
      const query = buildQueryString(params);
      return apiRequest(`/inventory${query}`);
    },

    async get(id: string) {
      return apiRequest(`/inventory/${id}`);
    },

    async create(data: Record<string, unknown>) {
      return apiRequest('/inventory', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(id: string, data: Record<string, unknown>) {
      return apiRequest(`/inventory/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  },

  // ==================== AI AGENTS ====================
  ai: {
    buildAgentUrl(path: string) {
      if (!AI_AGENT_KEY) return path;
      try {
        const url = new URL(path, AI_AGENTS_URL);
        if (!url.searchParams.get('api_key')) {
          url.searchParams.set('api_key', AI_AGENT_KEY);
        }
        return url.toString();
      } catch {
        const sep = path.includes('?') ? '&' : '?';
        return `${path}${sep}api_key=${AI_AGENT_KEY}`;
      }
    },

    async getAgents() {
      const response = await fetch(this.buildAgentUrl(`${AI_AGENTS_URL}/agents`), {
        headers: {
          ...Object.fromEntries(withBrainOpsAuthHeaders()),
        },
      });
      return response.json();
    },

    async executeAgent(agentId: string, task: Record<string, unknown>) {
      const response = await fetch(this.buildAgentUrl(`${AI_AGENTS_URL}/agents/execute`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(withBrainOpsAuthHeaders()),
        },
        body: JSON.stringify({ agent_id: agentId, task }),
      });
      return response.json();
    },

    async getAgentStatus(agentId: string) {
      const response = await fetch(this.buildAgentUrl(`${AI_AGENTS_URL}/agents/${agentId}/status`), {
        headers: {
          ...Object.fromEntries(withBrainOpsAuthHeaders()),
        },
      });
      return response.json();
    },
  },

  // ==================== ANALYTICS ====================
  analytics: {
    async getDashboardStats() {
      return apiRequest('/analytics/dashboard');
    },

    async getRevenueMetrics(params?: { start_date?: string; end_date?: string }) {
      const query = buildQueryString(params);
      return apiRequest(`/analytics/revenue${query}`);
    },

    async getCustomerMetrics() {
      return apiRequest('/analytics/customers');
    },
  },

  // ==================== HEALTH CHECK ====================
  async health() {
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      return response.json();
    } catch (error) {
      console.error('Backend health check failed:', error);
      return { status: 'error', message: 'Backend unavailable' };
    }
  },
};

/**
 * Export for backward compatibility
 */
export default apiClient;
