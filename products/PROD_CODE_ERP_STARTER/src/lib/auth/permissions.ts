/**
 * Role-Based Access Control (RBAC) - Permissions System
 * Week 12: Enterprise Polish & Launch
 */

export enum Permission {
  // Customer permissions
  CUSTOMERS_VIEW = 'customers:view',
  CUSTOMERS_CREATE = 'customers:create',
  CUSTOMERS_EDIT = 'customers:edit',
  CUSTOMERS_DELETE = 'customers:delete',
  CUSTOMERS_EXPORT = 'customers:export',

  // Job permissions
  JOBS_VIEW = 'jobs:view',
  JOBS_CREATE = 'jobs:create',
  JOBS_EDIT = 'jobs:edit',
  JOBS_DELETE = 'jobs:delete',
  JOBS_ASSIGN = 'jobs:assign',
  JOBS_COMPLETE = 'jobs:complete',
  JOBS_EXPORT = 'jobs:export',

  // Estimate permissions
  ESTIMATES_VIEW = 'estimates:view',
  ESTIMATES_CREATE = 'estimates:create',
  ESTIMATES_EDIT = 'estimates:edit',
  ESTIMATES_DELETE = 'estimates:delete',
  ESTIMATES_APPROVE = 'estimates:approve',
  ESTIMATES_SEND = 'estimates:send',

  // Invoice permissions
  INVOICES_VIEW = 'invoices:view',
  INVOICES_CREATE = 'invoices:create',
  INVOICES_EDIT = 'invoices:edit',
  INVOICES_DELETE = 'invoices:delete',
  INVOICES_SEND = 'invoices:send',
  INVOICES_VOID = 'invoices:void',

  // Payment permissions
  PAYMENTS_VIEW = 'payments:view',
  PAYMENTS_PROCESS = 'payments:process',
  PAYMENTS_REFUND = 'payments:refund',
  PAYMENTS_EXPORT = 'payments:export',

  // Schedule permissions
  SCHEDULE_VIEW = 'schedule:view',
  SCHEDULE_CREATE = 'schedule:create',
  SCHEDULE_EDIT = 'schedule:edit',
  SCHEDULE_DELETE = 'schedule:delete',
  SCHEDULE_ASSIGN = 'schedule:assign',

  // Inventory permissions
  INVENTORY_VIEW = 'inventory:view',
  INVENTORY_EDIT = 'inventory:edit',
  INVENTORY_ORDER = 'inventory:order',
  INVENTORY_ADJUST = 'inventory:adjust',

  // Employee permissions
  EMPLOYEES_VIEW = 'employees:view',
  EMPLOYEES_CREATE = 'employees:create',
  EMPLOYEES_EDIT = 'employees:edit',
  EMPLOYEES_DELETE = 'employees:delete',

  // Report permissions
  REPORTS_VIEW = 'reports:view',
  REPORTS_FINANCIAL = 'reports:financial',
  REPORTS_OPERATIONS = 'reports:operations',
  REPORTS_EXPORT = 'reports:export',

  // Admin permissions
  ADMIN_VIEW = 'admin:view',
  ADMIN_USERS = 'admin:users',
  ADMIN_ROLES = 'admin:roles',
  ADMIN_SETTINGS = 'admin:settings',
  ADMIN_LOGS = 'admin:logs',
  ADMIN_HEALTH = 'admin:health',

  // AI permissions
  AI_VIEW = 'ai:view',
  AI_EXECUTE = 'ai:execute',
  AI_CONFIGURE = 'ai:configure',
  AI_TRAIN = 'ai:train',

  // System permissions
  SYSTEM_SETTINGS = 'system:settings',
  SYSTEM_BACKUP = 'system:backup',
  SYSTEM_RESTORE = 'system:restore',
  SYSTEM_MAINTENANCE = 'system:maintenance',
}

export enum Role {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  FIELD_TECH = 'field_tech',
  OFFICE_STAFF = 'office_staff',
  READ_ONLY = 'read_only',
}

/**
 * Permission sets for each role
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  // Super Admin - Full system access
  [Role.SUPER_ADMIN]: Object.values(Permission),

  // Admin - Company-wide access (no system maintenance)
  [Role.ADMIN]: [
    // Customers
    Permission.CUSTOMERS_VIEW,
    Permission.CUSTOMERS_CREATE,
    Permission.CUSTOMERS_EDIT,
    Permission.CUSTOMERS_DELETE,
    Permission.CUSTOMERS_EXPORT,

    // Jobs
    Permission.JOBS_VIEW,
    Permission.JOBS_CREATE,
    Permission.JOBS_EDIT,
    Permission.JOBS_DELETE,
    Permission.JOBS_ASSIGN,
    Permission.JOBS_COMPLETE,
    Permission.JOBS_EXPORT,

    // Estimates
    Permission.ESTIMATES_VIEW,
    Permission.ESTIMATES_CREATE,
    Permission.ESTIMATES_EDIT,
    Permission.ESTIMATES_DELETE,
    Permission.ESTIMATES_APPROVE,
    Permission.ESTIMATES_SEND,

    // Invoices
    Permission.INVOICES_VIEW,
    Permission.INVOICES_CREATE,
    Permission.INVOICES_EDIT,
    Permission.INVOICES_DELETE,
    Permission.INVOICES_SEND,
    Permission.INVOICES_VOID,

    // Payments
    Permission.PAYMENTS_VIEW,
    Permission.PAYMENTS_PROCESS,
    Permission.PAYMENTS_REFUND,
    Permission.PAYMENTS_EXPORT,

    // Schedule
    Permission.SCHEDULE_VIEW,
    Permission.SCHEDULE_CREATE,
    Permission.SCHEDULE_EDIT,
    Permission.SCHEDULE_DELETE,
    Permission.SCHEDULE_ASSIGN,

    // Inventory
    Permission.INVENTORY_VIEW,
    Permission.INVENTORY_EDIT,
    Permission.INVENTORY_ORDER,
    Permission.INVENTORY_ADJUST,

    // Employees
    Permission.EMPLOYEES_VIEW,
    Permission.EMPLOYEES_CREATE,
    Permission.EMPLOYEES_EDIT,
    Permission.EMPLOYEES_DELETE,

    // Reports
    Permission.REPORTS_VIEW,
    Permission.REPORTS_FINANCIAL,
    Permission.REPORTS_OPERATIONS,
    Permission.REPORTS_EXPORT,

    // Admin
    Permission.ADMIN_VIEW,
    Permission.ADMIN_USERS,
    Permission.ADMIN_ROLES,
    Permission.ADMIN_LOGS,
    Permission.ADMIN_HEALTH,

    // AI
    Permission.AI_VIEW,
    Permission.AI_EXECUTE,
    Permission.AI_CONFIGURE,
  ],

  // Manager - Team management and operations
  [Role.MANAGER]: [
    Permission.CUSTOMERS_VIEW,
    Permission.CUSTOMERS_CREATE,
    Permission.CUSTOMERS_EDIT,
    Permission.CUSTOMERS_EXPORT,
    Permission.JOBS_VIEW,
    Permission.JOBS_CREATE,
    Permission.JOBS_EDIT,
    Permission.JOBS_ASSIGN,
    Permission.JOBS_COMPLETE,
    Permission.JOBS_EXPORT,
    Permission.ESTIMATES_VIEW,
    Permission.ESTIMATES_CREATE,
    Permission.ESTIMATES_EDIT,
    Permission.ESTIMATES_APPROVE,
    Permission.ESTIMATES_SEND,
    Permission.INVOICES_VIEW,
    Permission.INVOICES_CREATE,
    Permission.INVOICES_EDIT,
    Permission.INVOICES_SEND,
    Permission.PAYMENTS_VIEW,
    Permission.SCHEDULE_VIEW,
    Permission.SCHEDULE_CREATE,
    Permission.SCHEDULE_EDIT,
    Permission.SCHEDULE_ASSIGN,
    Permission.INVENTORY_VIEW,
    Permission.INVENTORY_EDIT,
    Permission.EMPLOYEES_VIEW,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_OPERATIONS,
    Permission.AI_VIEW,
    Permission.AI_EXECUTE,
  ],

  // Field Tech - Field operations only
  [Role.FIELD_TECH]: [
    Permission.CUSTOMERS_VIEW,
    Permission.JOBS_VIEW,
    Permission.JOBS_EDIT,
    Permission.JOBS_COMPLETE,
    Permission.ESTIMATES_VIEW,
    Permission.SCHEDULE_VIEW,
    Permission.INVENTORY_VIEW,
  ],

  // Office Staff - Back office operations
  [Role.OFFICE_STAFF]: [
    Permission.CUSTOMERS_VIEW,
    Permission.CUSTOMERS_CREATE,
    Permission.CUSTOMERS_EDIT,
    Permission.CUSTOMERS_EXPORT,
    Permission.JOBS_VIEW,
    Permission.JOBS_CREATE,
    Permission.ESTIMATES_VIEW,
    Permission.ESTIMATES_CREATE,
    Permission.ESTIMATES_EDIT,
    Permission.ESTIMATES_SEND,
    Permission.INVOICES_VIEW,
    Permission.INVOICES_CREATE,
    Permission.INVOICES_EDIT,
    Permission.INVOICES_SEND,
    Permission.PAYMENTS_VIEW,
    Permission.SCHEDULE_VIEW,
    Permission.SCHEDULE_CREATE,
    Permission.SCHEDULE_EDIT,
    Permission.INVENTORY_VIEW,
    Permission.REPORTS_VIEW,
  ],

  // Read Only - View-only access
  [Role.READ_ONLY]: [
    Permission.CUSTOMERS_VIEW,
    Permission.JOBS_VIEW,
    Permission.ESTIMATES_VIEW,
    Permission.INVOICES_VIEW,
    Permission.PAYMENTS_VIEW,
    Permission.SCHEDULE_VIEW,
    Permission.INVENTORY_VIEW,
    Permission.EMPLOYEES_VIEW,
    Permission.REPORTS_VIEW,
  ],
};

/**
 * Role hierarchy for inheritance
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 100,
  [Role.ADMIN]: 80,
  [Role.MANAGER]: 60,
  [Role.OFFICE_STAFF]: 40,
  [Role.FIELD_TECH]: 30,
  [Role.READ_ONLY]: 10,
};

/**
 * Get human-readable role name
 */
export function getRoleName(role: Role): string {
  const names: Record<Role, string> = {
    [Role.SUPER_ADMIN]: 'Super Administrator',
    [Role.ADMIN]: 'Administrator',
    [Role.MANAGER]: 'Manager',
    [Role.FIELD_TECH]: 'Field Technician',
    [Role.OFFICE_STAFF]: 'Office Staff',
    [Role.READ_ONLY]: 'Read Only',
  };
  return names[role];
}

/**
 * Get role description
 */
export function getRoleDescription(role: Role): string {
  const descriptions: Record<Role, string> = {
    [Role.SUPER_ADMIN]: 'Full system access including maintenance and configuration',
    [Role.ADMIN]: 'Company-wide access to all business operations',
    [Role.MANAGER]: 'Team management and operational oversight',
    [Role.FIELD_TECH]: 'Field operations and job completion',
    [Role.OFFICE_STAFF]: 'Back office operations and customer service',
    [Role.READ_ONLY]: 'View-only access to system data',
  };
  return descriptions[role];
}

/**
 * Get role color for UI display
 */
export function getRoleColor(role: Role): string {
  const colors: Record<Role, string> = {
    [Role.SUPER_ADMIN]: 'from-gray-800 to-gray-700',
    [Role.ADMIN]: 'from-gray-500 to-gray-500',
    [Role.MANAGER]: 'from-gray-500 to-gray-600',
    [Role.FIELD_TECH]: 'from-gray-700 to-gray-600',
    [Role.OFFICE_STAFF]: 'from-gray-600 to-gray-500',
    [Role.READ_ONLY]: 'from-gray-500 to-gray-600',
  };
  return colors[role];
}
