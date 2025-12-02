/**
 * Feature flag configuration helper.
 * Allows temporarily disabling integrations or modules while keeping UI responsive.
 */

export interface FeatureFlags {
  // Data integrations
  centerpointEtl: boolean;
  realTimeSync: boolean;

  // External services
  twilioSms: boolean;
  aiInsights: boolean;
  aiScheduling: boolean;

  // Core features
  projectsModule: boolean;
  adminActivity: boolean;
  dashboardStats: boolean;
  serviceDispatch: boolean;

  // Monitoring & telemetry
  sentryTracking: boolean;
  performanceMonitoring: boolean;
}

function envFlag(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (value === undefined) {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export function getFeatureFlags(overrides?: Partial<FeatureFlags>): FeatureFlags {
  const flags: FeatureFlags = {
    centerpointEtl: envFlag('FEATURE_CENTERPOINT_ETL', false),
    realTimeSync: envFlag('FEATURE_REAL_TIME_SYNC', false),

    twilioSms: Boolean(process.env.TWILIO_ACCOUNT_SID),
    aiInsights: Boolean(process.env.OPENAI_API_KEY ?? process.env.NEXT_PUBLIC_OPENAI_API_KEY),
    aiScheduling: Boolean(process.env.BRAINOPS_API_URL ?? process.env.NEXT_PUBLIC_BRAINOPS_API_URL),

    projectsModule: envFlag('FEATURE_PROJECTS', true),
    adminActivity: envFlag('FEATURE_ADMIN_ACTIVITY', true),
    dashboardStats: envFlag('FEATURE_DASHBOARD_STATS', true),
    serviceDispatch: envFlag('FEATURE_SERVICE_DISPATCH', false),

    sentryTracking: Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),
    performanceMonitoring: envFlag('FEATURE_PERFORMANCE_MONITORING', false),
  };

  return {
    ...flags,
    ...overrides,
  };
}

export function isFeatureEnabled(flag: keyof FeatureFlags, overrides?: Partial<FeatureFlags>): boolean {
  const flags = getFeatureFlags(overrides);
  return Boolean(flags[flag]);
}
