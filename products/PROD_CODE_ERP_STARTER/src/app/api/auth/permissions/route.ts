/**
 * User Permissions API
 * Checks user permissions for various system features
 * Used by calendar and other components for role-based access control
 */

import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { getErrorMessage } from '@/lib/errors';
import { resolveUserRole } from '@/lib/auth/roles';

// Permission roles configuration
const PERMISSION_ROLES = {
  // Calendar permissions - Allow most roles to edit for better workflow
  calendar_edit: ['admin', 'office_manager', 'scheduler', 'estimator', 'sales', 'crew_lead'],
  calendar_view: ['admin', 'office_manager', 'scheduler', 'estimator', 'crew_lead', 'technician', 'sales'],

  // Job permissions
  job_create: ['admin', 'office_manager', 'sales'],
  job_edit: ['admin', 'office_manager'],
  job_delete: ['admin'],

  // Financial permissions
  finance_view: ['admin', 'office_manager', 'accountant'],
  finance_edit: ['admin', 'accountant'],

  // Employee permissions
  employee_manage: ['admin', 'office_manager', 'hr_manager'],

  // Equipment permissions
  equipment_manage: ['admin', 'office_manager', 'equipment_manager'],

  // Proposal / estimating permissions
  proposal_generate: ['admin', 'owner', 'office_manager', 'estimator', 'sales'],
  proposal_email: ['admin', 'owner', 'office_manager', 'estimator', 'sales'],
  proposal_template_manage: ['admin', 'owner', 'marketing', 'office_manager'],
};

/**
 * GET /api/auth/permissions?check=permission_name
 * Check if current user has a specific permission
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const checkPermission = searchParams.get('check');

    if (!checkPermission) {
      // Return all permissions for current user
      const userRole = resolveUserRole(auth);
      const allPermissions = Object.entries(PERMISSION_ROLES).reduce((acc, [permission]) => {
        acc[permission] = hasPermission(userRole, permission);
        return acc;
      }, {} as Record<string, boolean>);

      return NextResponse.json({
        success: true,
        user_role: userRole,
        permissions: allPermissions
      });
    }

    // Check specific permission
    const userRole = resolveUserRole(auth);
    const hasAccess = hasPermission(userRole, checkPermission);

    return NextResponse.json({
      success: true,
      permission: checkPermission,
      has_permission: hasAccess,
      user_role: userRole
    });

  } catch (error: unknown) {
    logger.error('Permission check error:', getErrorMessage(error));
    return NextResponse.json(
      { error: 'Failed to check permissions' },
      { status: 500 }
    );
  }
}

/**
 * Check if role has permission
 */
function hasPermission(userRole: string, permission: string): boolean {
  const normalizedRole = userRole.trim().toLowerCase();
  const allowedRoles = PERMISSION_ROLES[permission as keyof typeof PERMISSION_ROLES];

  if (!allowedRoles) {
    // Unknown permission - default to denying access
    return false;
  }

  return allowedRoles.includes(normalizedRole);
}
