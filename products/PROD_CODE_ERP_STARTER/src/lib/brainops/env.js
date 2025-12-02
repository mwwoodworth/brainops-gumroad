const DEFAULT_BACKEND_URL = 'http://localhost:8000';
const DEFAULT_AI_AGENTS_URL = 'http://localhost:8001';
const isProd = process.env.NODE_ENV === 'production';
const normalize = (value) => {
    if (typeof value !== 'string')
        return '';
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : '';
};
function resolvePublicUrl(envNames, fallback) {
    for (const envName of envNames) {
        const value = normalize(process.env[envName]);
        if (value) {
            return value;
        }
    }
    // Fall back to local default when env vars are not set
    return fallback;
}
const resolveApiKey = () => {
    const key = normalize(process.env.BRAINOPS_API_KEY) ||
        normalize(process.env.NEXT_PUBLIC_BRAINOPS_API_KEY);
    if (!key) {
        if (isProd && typeof window === 'undefined') {
            throw new Error('[BrainOpsConfig] Missing BRAINOPS_API_KEY for server-side BrainOps calls.');
        }
        return null;
    }
    return key;
};
export const BRAINOPS_BACKEND_URL = resolvePublicUrl([
    'NEXT_PUBLIC_BRAINOPS_CORE_URL',
    'NEXT_PUBLIC_BRAINOPS_BACKEND_URL',
    'NEXT_PUBLIC_BACKEND_URL',
    'BRAINOPS_CORE_URL',
    'BRAINOPS_BACKEND_URL',
], DEFAULT_BACKEND_URL);
export const BRAINOPS_AI_AGENTS_URL = resolvePublicUrl([
    'NEXT_PUBLIC_BRAINOPS_AI_AGENTS_URL',
    'NEXT_PUBLIC_BRAINOPS_CORE_URL',
], DEFAULT_AI_AGENTS_URL);
export const BRAINOPS_API_KEY = resolveApiKey();
export function withBrainOpsAuthHeaders(headers = {}) {
    const merged = new Headers(headers);
    if (BRAINOPS_API_KEY) {
        if (!merged.has('Authorization')) {
            merged.set('Authorization', `ApiKey ${BRAINOPS_API_KEY}`);
        }
        if (!merged.has('X-API-Key')) {
            merged.set('X-API-Key', BRAINOPS_API_KEY);
        }
    }
    return merged;
}
export function ensureBrainOpsConfigured() {
    return {
        backendUrl: BRAINOPS_BACKEND_URL,
        aiAgentsUrl: BRAINOPS_AI_AGENTS_URL,
        apiKey: BRAINOPS_API_KEY,
    };
}
