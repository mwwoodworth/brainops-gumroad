/**
 * Role-Based Access Control (RBAC) - Logic & Enforcement
 * Week 12: Enterprise Polish & Launch
 */

import { Permission, Role, ROLE_PERMISSIONS, ROLE_HIERARCHY } from './permissions';

/**
 * Check if a role has a specific permission
 */
export function hasPermission(userRole: Role, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(userRole: Role, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(userRole, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(userRole: Role, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(userRole, permission));
}

/**
 * Require a specific permission or throw error
 */
export function requirePermission(userRole: Role, permission: Permission): void {
  if (!hasPermission(userRole, permission)) {
    throw new PermissionError(`Insufficient permissions: requires ${permission}`);
  }
}

/**
 * Require any of the specified permissions or throw error
 */
export function requireAnyPermission(userRole: Role, permissions: Permission[]): void {
  if (!hasAnyPermission(userRole, permissions)) {
    throw new PermissionError(`Insufficient permissions: requires one of ${permissions.join(', ')}`);
  }
}

/**
 * Require all of the specified permissions or throw error
 */
export function requireAllPermissions(userRole: Role, permissions: Permission[]): void {
  if (!hasAllPermissions(userRole, permissions)) {
    throw new PermissionError(`Insufficient permissions: requires all of ${permissions.join(', ')}`);
  }
}

/**
 * Check if role A has higher hierarchy than role B
 */
export function isHigherRole(roleA: Role, roleB: Role): boolean {
  return ROLE_HIERARCHY[roleA] > ROLE_HIERARCHY[roleB];
}

/**
 * Check if role A has equal or higher hierarchy than role B
 */
export function isEqualOrHigherRole(roleA: Role, roleB: Role): boolean {
  return ROLE_HIERARCHY[roleA] >= ROLE_HIERARCHY[roleB];
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Custom error for permission violations
 */
export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * Validate role change (can only assign roles equal or lower)
 */
export function canAssignRole(assignerRole: Role, targetRole: Role): boolean {
  // Super admins can assign any role
  if (assignerRole === Role.SUPER_ADMIN) return true;

  // Admins can assign manager and below
  if (assignerRole === Role.ADMIN) {
    return [Role.MANAGER, Role.FIELD_TECH, Role.OFFICE_STAFF, Role.READ_ONLY].includes(targetRole);
  }

  // Managers can assign field tech, office staff, and read only
  if (assignerRole === Role.MANAGER) {
    return [Role.FIELD_TECH, Role.OFFICE_STAFF, Role.READ_ONLY].includes(targetRole);
  }

  // Other roles cannot assign roles
  return false;
}

/**
 * Filter list of items based on permissions
 */
export function filterByPermission<T>(
  items: T[],
  userRole: Role,
  permission: Permission
): T[] {
  if (hasPermission(userRole, permission)) {
    return items;
  }
  return [];
}

/**
 * Get accessible routes for a role
 */
export function getAccessibleRoutes(role: Role): string[] {
  const routes: string[] = ['/dashboard']; // Everyone gets dashboard

  if (hasPermission(role, Permission.CUSTOMERS_VIEW)) {
    routes.push('/customers');
  }

  if (hasPermission(role, Permission.JOBS_VIEW)) {
    routes.push('/jobs');
  }

  if (hasPermission(role, Permission.ESTIMATES_VIEW)) {
    routes.push('/estimates');
  }

  if (hasPermission(role, Permission.INVOICES_VIEW)) {
    routes.push('/invoices');
  }

  if (hasPermission(role, Permission.SCHEDULE_VIEW)) {
    routes.push('/schedule');
  }

  if (hasPermission(role, Permission.INVENTORY_VIEW)) {
    routes.push('/inventory');
  }

  if (hasPermission(role, Permission.EMPLOYEES_VIEW)) {
    routes.push('/employees');
  }

  if (hasPermission(role, Permission.REPORTS_VIEW)) {
    routes.push('/reports');
  }

  if (hasPermission(role, Permission.AI_VIEW)) {
    routes.push('/ai-insights');
  }

  if (hasPermission(role, Permission.ADMIN_VIEW)) {
    routes.push('/admin');
  }

  return routes;
}

/**
 * Check if route is accessible for role
 */
export function isRouteAccessible(route: string, role: Role): boolean {
  const accessibleRoutes = getAccessibleRoutes(role);
  return accessibleRoutes.some((accessible) => route.startsWith(accessible));
}

/**
 * Get permission requirement for a route
 */
export function getRoutePermission(route: string): Permission | null {
  const routeMap: Record<string, Permission> = {
    '/customers': Permission.CUSTOMERS_VIEW,
    '/jobs': Permission.JOBS_VIEW,
    '/estimates': Permission.ESTIMATES_VIEW,
    '/invoices': Permission.INVOICES_VIEW,
    '/payments': Permission.PAYMENTS_VIEW,
    '/schedule': Permission.SCHEDULE_VIEW,
    '/inventory': Permission.INVENTORY_VIEW,
    '/employees': Permission.EMPLOYEES_VIEW,
    '/reports': Permission.REPORTS_VIEW,
    '/admin': Permission.ADMIN_VIEW,
    '/ai-insights': Permission.AI_VIEW,
  };

  for (const [path, permission] of Object.entries(routeMap)) {
    if (route.startsWith(path)) {
      return permission;
    }
  }

  return null;
}

/**
 * Validate API action based on role and permission
 */
export function validateApiAction(
  role: Role,
  action: 'view' | 'create' | 'edit' | 'delete',
  resource: 'customers' | 'jobs' | 'estimates' | 'invoices' | 'payments' | 'employees'
): boolean {
  const permissionMap: Record<string, Permission> = {
    'customers-view': Permission.CUSTOMERS_VIEW,
    'customers-create': Permission.CUSTOMERS_CREATE,
    'customers-edit': Permission.CUSTOMERS_EDIT,
    'customers-delete': Permission.CUSTOMERS_DELETE,
    'jobs-view': Permission.JOBS_VIEW,
    'jobs-create': Permission.JOBS_CREATE,
    'jobs-edit': Permission.JOBS_EDIT,
    'jobs-delete': Permission.JOBS_DELETE,
    'estimates-view': Permission.ESTIMATES_VIEW,
    'estimates-create': Permission.ESTIMATES_CREATE,
    'estimates-edit': Permission.ESTIMATES_EDIT,
    'estimates-delete': Permission.ESTIMATES_DELETE,
    'invoices-view': Permission.INVOICES_VIEW,
    'invoices-create': Permission.INVOICES_CREATE,
    'invoices-edit': Permission.INVOICES_EDIT,
    'invoices-delete': Permission.INVOICES_DELETE,
    'payments-view': Permission.PAYMENTS_VIEW,
    'payments-create': Permission.PAYMENTS_PROCESS,
    'payments-edit': Permission.PAYMENTS_PROCESS,
    'payments-delete': Permission.PAYMENTS_REFUND,
    'employees-view': Permission.EMPLOYEES_VIEW,
    'employees-create': Permission.EMPLOYEES_CREATE,
    'employees-edit': Permission.EMPLOYEES_EDIT,
    'employees-delete': Permission.EMPLOYEES_DELETE,
  };

  const key = `${resource}-${action}`;
  const requiredPermission = permissionMap[key];

  if (!requiredPermission) return false;

  return hasPermission(role, requiredPermission);
}

/**
 * Get denied permission message
 */
export function getPermissionDeniedMessage(permission: Permission): string {
  return `Access denied: You don't have permission to perform this action (${permission})`;
}

/**
 * Get route denied message
 */
export function getRouteDeniedMessage(route: string): string {
  return `Access denied: You don't have permission to access ${route}`;
}
