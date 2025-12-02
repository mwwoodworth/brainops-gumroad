/**
 * Role-Based Access Control (RBAC) System
 * Defines permissions for each role in Weathercraft ERP
 */

export enum UserRole {
  FULL_ADMIN = 'FULL_ADMIN',
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  SUPERINTENDENT = 'SUPERINTENDENT',
  ACCOUNTANT = 'ACCOUNTANT',
  HR_MANAGER = 'HR_MANAGER',
  ADMIN_STAFF = 'ADMIN_STAFF',
  PM_ESTIMATOR = 'PM_ESTIMATOR',
  SERVICE_PM = 'SERVICE_PM',
  FIELD_TECH = 'FIELD_TECH'
}

export interface Permission {
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface RolePermissions {
  role: UserRole;
  label: string;
  permissions: {
    // Core Business Modules
    dashboard: Permission;
    customers: Permission;
    jobs: Permission;
    estimates: Permission;
    invoices: Permission;
    payments: Permission;

    // Field Operations
    fieldInspections: Permission;
    schedule: Permission;
    timesheets: Permission;

    // Inventory & Equipment
    inventory: Permission;
    equipment: Permission;

    // People Management
    employees: Permission;
    payroll: Permission;

    // Financial
    reports: Permission;
    accounting: Permission;

    // System
    settings: Permission;
    users: Permission;
    audit: Permission;
  };
}

// Helper function to create permission object
const perm = (view: boolean, create: boolean, edit: boolean, del: boolean): Permission => ({
  module: '',
  canView: view,
  canCreate: create,
  canEdit: edit,
  canDelete: del
});

// Role Permissions Configuration
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  // Matthew - Founder/Full Admin (ALL ACCESS)
  [UserRole.FULL_ADMIN]: {
    role: UserRole.FULL_ADMIN,
    label: 'Full Administrator',
    permissions: {
      dashboard: perm(true, true, true, true),
      customers: perm(true, true, true, true),
      jobs: perm(true, true, true, true),
      estimates: perm(true, true, true, true),
      invoices: perm(true, true, true, true),
      payments: perm(true, true, true, true),
      fieldInspections: perm(true, true, true, true),
      schedule: perm(true, true, true, true),
      timesheets: perm(true, true, true, true),
      inventory: perm(true, true, true, true),
      equipment: perm(true, true, true, true),
      employees: perm(true, true, true, true),
      payroll: perm(true, true, true, true),
      reports: perm(true, true, true, true),
      accounting: perm(true, true, true, true),
      settings: perm(true, true, true, true),
      users: perm(true, true, true, true),
      audit: perm(true, false, false, false)
    }
  },

  // John - Owner (Business access, not system config)
  [UserRole.OWNER]: {
    role: UserRole.OWNER,
    label: 'Owner',
    permissions: {
      dashboard: perm(true, true, true, true),
      customers: perm(true, true, true, true),
      jobs: perm(true, true, true, true),
      estimates: perm(true, true, true, true),
      invoices: perm(true, true, true, true),
      payments: perm(true, true, true, true),
      fieldInspections: perm(true, false, true, false),
      schedule: perm(true, true, true, true),
      timesheets: perm(true, false, true, true),
      inventory: perm(true, true, true, true),
      equipment: perm(true, true, true, true),
      employees: perm(true, true, true, true),
      payroll: perm(true, true, true, true),
      reports: perm(true, true, true, true),
      accounting: perm(true, true, true, true),
      settings: perm(true, false, true, false), // Can view/edit but not delete
      users: perm(true, true, true, false), // Can't delete users
      audit: perm(true, false, false, false)
    }
  },

  // Brittaney - Service Manager
  [UserRole.MANAGER]: {
    role: UserRole.MANAGER,
    label: 'Manager',
    permissions: {
      dashboard: perm(true, false, false, false),
      customers: perm(true, true, true, true),
      jobs: perm(true, true, true, true),
      estimates: perm(true, true, true, true),
      invoices: perm(true, true, true, true),
      payments: perm(true, false, false, false),
      fieldInspections: perm(true, true, true, true),
      schedule: perm(true, true, true, true),
      timesheets: perm(true, false, true, true),
      inventory: perm(true, true, true, false),
      equipment: perm(true, true, true, false),
      employees: perm(true, false, true, false),
      payroll: perm(false, false, false, false),
      reports: perm(true, false, false, false),
      accounting: perm(false, false, false, false),
      settings: perm(false, false, false, false),
      users: perm(false, false, false, false),
      audit: perm(false, false, false, false)
    }
  },

  // Rich - Field Superintendent
  [UserRole.SUPERINTENDENT]: {
    role: UserRole.SUPERINTENDENT,
    label: 'Superintendent',
    permissions: {
      dashboard: perm(true, false, false, false),
      customers: perm(true, false, true, false),
      jobs: perm(true, true, true, true),
      estimates: perm(true, false, false, false),
      invoices: perm(true, false, false, false),
      payments: perm(false, false, false, false),
      fieldInspections: perm(true, true, true, true),
      schedule: perm(true, true, true, true),
      timesheets: perm(true, true, true, true),
      inventory: perm(true, true, true, false),
      equipment: perm(true, true, true, true),
      employees: perm(true, false, false, false),
      payroll: perm(false, false, false, false),
      reports: perm(true, false, false, false),
      accounting: perm(false, false, false, false),
      settings: perm(false, false, false, false),
      users: perm(false, false, false, false),
      audit: perm(false, false, false, false)
    }
  },

  // Misty - Accountant
  [UserRole.ACCOUNTANT]: {
    role: UserRole.ACCOUNTANT,
    label: 'Accountant',
    permissions: {
      dashboard: perm(true, false, false, false),
      customers: perm(true, false, true, false),
      jobs: perm(true, false, true, false),
      estimates: perm(true, false, true, false),
      invoices: perm(true, true, true, true),
      payments: perm(true, true, true, true),
      fieldInspections: perm(false, false, false, false),
      schedule: perm(false, false, false, false),
      timesheets: perm(true, false, true, false),
      inventory: perm(true, false, true, false),
      equipment: perm(true, false, true, false),
      employees: perm(true, false, false, false),
      payroll: perm(true, true, true, true),
      reports: perm(true, true, true, false),
      accounting: perm(true, true, true, true),
      settings: perm(false, false, false, false),
      users: perm(false, false, false, false),
      audit: perm(true, false, false, false)
    }
  },

  // Destyne - HR Manager
  [UserRole.HR_MANAGER]: {
    role: UserRole.HR_MANAGER,
    label: 'HR Manager',
    permissions: {
      dashboard: perm(true, false, false, false),
      customers: perm(false, false, false, false),
      jobs: perm(false, false, false, false),
      estimates: perm(false, false, false, false),
      invoices: perm(false, false, false, false),
      payments: perm(false, false, false, false),
      fieldInspections: perm(false, false, false, false),
      schedule: perm(true, false, false, false),
      timesheets: perm(true, false, true, false),
      inventory: perm(false, false, false, false),
      equipment: perm(false, false, false, false),
      employees: perm(true, true, true, true),
      payroll: perm(true, true, true, true),
      reports: perm(true, false, false, false),
      accounting: perm(false, false, false, false),
      settings: perm(false, false, false, false),
      users: perm(true, true, true, false),
      audit: perm(true, false, false, false)
    }
  },

  // Heather - Admin Staff
  [UserRole.ADMIN_STAFF]: {
    role: UserRole.ADMIN_STAFF,
    label: 'Admin Staff',
    permissions: {
      dashboard: perm(true, false, false, false),
      customers: perm(true, true, true, false),
      jobs: perm(true, true, true, false),
      estimates: perm(true, true, true, false),
      invoices: perm(true, true, true, false),
      payments: perm(true, false, false, false),
      fieldInspections: perm(true, false, false, false),
      schedule: perm(true, true, true, false),
      timesheets: perm(true, false, true, false),
      inventory: perm(true, false, true, false),
      equipment: perm(true, false, true, false),
      employees: perm(true, false, false, false),
      payroll: perm(false, false, false, false),
      reports: perm(true, false, false, false),
      accounting: perm(false, false, false, false),
      settings: perm(false, false, false, false),
      users: perm(false, false, false, false),
      audit: perm(false, false, false, false)
    }
  },

  // Collin, Bill, Conner - PM/Estimators
  [UserRole.PM_ESTIMATOR]: {
    role: UserRole.PM_ESTIMATOR,
    label: 'PM / Estimator',
    permissions: {
      dashboard: perm(true, false, false, false),
      customers: perm(true, true, true, false),
      jobs: perm(true, true, true, true),
      estimates: perm(true, true, true, true),
      invoices: perm(true, true, true, false),
      payments: perm(true, false, false, false),
      fieldInspections: perm(true, true, true, false),
      schedule: perm(true, true, true, false),
      timesheets: perm(true, false, false, false),
      inventory: perm(true, false, true, false),
      equipment: perm(true, false, true, false),
      employees: perm(false, false, false, false),
      payroll: perm(false, false, false, false),
      reports: perm(true, false, false, false),
      accounting: perm(false, false, false, false),
      settings: perm(false, false, false, false),
      users: perm(false, false, false, false),
      audit: perm(false, false, false, false)
    }
  },

  // Bob - Service PM
  [UserRole.SERVICE_PM]: {
    role: UserRole.SERVICE_PM,
    label: 'Service PM',
    permissions: {
      dashboard: perm(true, false, false, false),
      customers: perm(true, true, true, false),
      jobs: perm(true, true, true, true),
      estimates: perm(true, true, true, false),
      invoices: perm(true, true, true, false),
      payments: perm(true, false, false, false),
      fieldInspections: perm(true, true, true, false),
      schedule: perm(true, true, true, false),
      timesheets: perm(true, false, false, false),
      inventory: perm(true, false, true, false),
      equipment: perm(true, false, true, false),
      employees: perm(false, false, false, false),
      payroll: perm(false, false, false, false),
      reports: perm(true, false, false, false),
      accounting: perm(false, false, false, false),
      settings: perm(false, false, false, false),
      users: perm(false, false, false, false),
      audit: perm(false, false, false, false)
    }
  },

  // Rico, Dustin, Mike - Field Technicians
  [UserRole.FIELD_TECH]: {
    role: UserRole.FIELD_TECH,
    label: 'Field Technician',
    permissions: {
      dashboard: perm(true, false, false, false),
      customers: perm(true, false, false, false),
      jobs: perm(true, false, true, false),
      estimates: perm(false, false, false, false),
      invoices: perm(false, false, false, false),
      payments: perm(false, false, false, false),
      fieldInspections: perm(true, true, true, false),
      schedule: perm(true, false, false, false),
      timesheets: perm(true, true, true, false),
      inventory: perm(true, false, false, false),
      equipment: perm(true, false, true, false),
      employees: perm(false, false, false, false),
      payroll: perm(false, false, false, false),
      reports: perm(false, false, false, false),
      accounting: perm(false, false, false, false),
      settings: perm(false, false, false, false),
      users: perm(false, false, false, false),
      audit: perm(false, false, false, false)
    }
  }
};

/**
 * Check if a user has permission for a specific action
 */
export function hasPermission(
  role: UserRole | string,
  module: keyof RolePermissions['permissions'],
  action: 'view' | 'create' | 'edit' | 'delete'
): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role as UserRole];
  if (!rolePermissions) return false;

  const modulePermission = rolePermissions.permissions[module];
  if (!modulePermission) return false;

  switch (action) {
    case 'view':
      return modulePermission.canView;
    case 'create':
      return modulePermission.canCreate;
    case 'edit':
      return modulePermission.canEdit;
    case 'delete':
      return modulePermission.canDelete;
    default:
      return false;
  }
}

/**
 * Get all accessible modules for a role
 */
export function getAccessibleModules(role: UserRole | string): string[] {
  const rolePermissions = ROLE_PERMISSIONS[role as UserRole];
  if (!rolePermissions) return [];

  return Object.entries(rolePermissions.permissions)
    .filter(([_, perm]) => perm.canView)
    .map(([module, _]) => module);
}

/**
 * Check if route is allowed for role
 */
export function isRouteAllowed(role: UserRole | string, path: string): boolean {
  // Public routes always allowed
  const publicRoutes = ['/', '/auth/login', '/auth/signup'];
  if (publicRoutes.includes(path)) return true;

  // Map routes to modules
  const routeModuleMap: Record<string, keyof RolePermissions['permissions']> = {
    '/dashboard': 'dashboard',
    '/customers': 'customers',
    '/jobs': 'jobs',
    '/estimates': 'estimates',
    '/invoices': 'invoices',
    '/payments': 'payments',
    '/field-inspections': 'fieldInspections',
    '/schedule': 'schedule',
    '/timesheets': 'timesheets',
    '/inventory': 'inventory',
    '/equipment': 'equipment',
    '/employees': 'employees',
    '/payroll': 'payroll',
    '/reports': 'reports',
    '/accounting': 'accounting',
    '/settings': 'settings',
    '/users': 'users',
    '/audit': 'audit'
  };

  // Find matching module
  for (const [route, module] of Object.entries(routeModuleMap)) {
    if (path.startsWith(route)) {
      return hasPermission(role, module, 'view');
    }
  }

  // Default deny
  return false;
}
