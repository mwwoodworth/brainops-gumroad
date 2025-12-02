export interface JobsConfig {
  backendUrl: string | null;
  apiKey: string | null;
  useProxy: boolean;
  requireProxy: boolean;
  enableCoordinateEnrichment: boolean;
}

const normalizeBool = (value: string | undefined | null): boolean => {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
};

const resolveBackendUrl = (): string | null => {
  const candidates = [
    process.env.NEXT_PUBLIC_BRAINOPS_BACKEND_URL,
    process.env.NEXT_PUBLIC_BACKEND_URL,
    process.env.BRAINOPS_BACKEND_URL,
  ];

  for (const raw of candidates) {
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return raw.trim().replace(/\/$/, '');
    }
  }

  return null;
};

export function getJobsConfig(apiKeyFromEnv: string | null | undefined): JobsConfig {
  const backendUrl = resolveBackendUrl();
  const useProxy =
    normalizeBool(process.env.USE_FASTAPI_PROXY) && !!backendUrl;
  const requireProxy =
    useProxy && normalizeBool(process.env.REQUIRE_FASTAPI_PROXY);

  const enableCoordinateEnrichment =
    normalizeBool(process.env.ENABLE_JOB_COORDINATE_ENRICHMENT) ||
    normalizeBool(process.env.CENTERPOINT_ENABLED);

  return {
    backendUrl,
    apiKey: apiKeyFromEnv || null,
    useProxy,
    requireProxy,
    enableCoordinateEnrichment,
  };
}

