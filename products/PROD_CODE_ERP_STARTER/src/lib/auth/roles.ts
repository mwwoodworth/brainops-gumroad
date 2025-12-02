import type { AuthenticatedRequest } from '@/lib/auth/api-auth';

const normalizeRole = (value?: string | null): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
};

export function resolveUserRole(auth: AuthenticatedRequest): string {
  return (
    normalizeRole(auth.role) ||
    normalizeRole(auth.user?.app_metadata?.role) ||
    normalizeRole(auth.user?.user_metadata?.role) ||
    'employee'
  );
}

export function roleIsAllowed(auth: AuthenticatedRequest, allowedRoles: string[]): boolean {
  const role = resolveUserRole(auth);
  return allowedRoles
    .map(role => role.toLowerCase())
    .includes(role);
}
