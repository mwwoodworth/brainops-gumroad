import { getOptionalEnv } from '@/lib/env';

const FALLBACK_DOMAINS = ['weathercraft.net', 'weathercraft-test.local', 'weathercraft.test'] as const;
const allowAll = (getOptionalEnv('SIGNUP_ALLOW_ANY') || '').toLowerCase() === 'true';
const envDomains = getOptionalEnv('SIGNUP_ALLOWED_DOMAINS');
const isProd = process.env.NODE_ENV === 'production';

const parseDomains = (raw: string | undefined): string[] => {
  if (!raw) return [...FALLBACK_DOMAINS];
  return raw
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0);
};

const configuredDomains = parseDomains(envDomains);

export const SIGNUP_ALLOWED_DOMAINS = configuredDomains;

export function isSignupEmailAllowed(email: string): boolean {
  if (allowAll || SIGNUP_ALLOWED_DOMAINS.includes('*')) return true;
  if (!envDomains && isProd) {
    console.warn('[auth] SIGNUP_ALLOWED_DOMAINS not configured; using fallback domains in production.');
  }
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) return false;
  const domain = email.slice(atIndex + 1).toLowerCase();
  return SIGNUP_ALLOWED_DOMAINS.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`));
}
