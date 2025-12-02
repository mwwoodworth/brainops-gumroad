/**
 * Enterprise Approval Workflow System
 * Multi-level approval chain for estimates, invoices, and other entities
 * Supports threshold-based auto-approval and role-based routing
 */

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved' | 'cancelled';
export type ApprovalLevel = 1 | 2 | 3; // Manager, Director, VP
export type ApprovableEntity = 'estimate' | 'invoice' | 'purchase_order' | 'change_order' | 'expense';

export interface ApprovalRule {
  id: string;
  tenant_id: string;
  entity_type: ApprovableEntity;
  threshold_amount: number;
  required_level: ApprovalLevel;
  approver_role: string; // 'manager', 'director', 'vp', 'cfo'
  approver_ids?: string[]; // Specific users who can approve
  auto_approve_below?: boolean; // Auto-approve if below threshold
  requires_all_approvers?: boolean; // Require all or just one
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ApprovalStep {
  id: string;
  approval_id: string;
  level: ApprovalLevel;
  approver_id?: string;
  approver_name?: string;
  approver_role: string;
  status: ApprovalStatus;
  approved_at?: Date;
  rejection_reason?: string;
  notes?: string;
  sequence: number; // Order in approval chain
}

export interface Approval {
  id: string;
  tenant_id: string;
  entity_type: ApprovableEntity;
  entity_id: string;
  entity_name: string; // "Estimate #EST-2024-001"
  requested_by: string;
  requested_by_name: string;
  amount: number;
  status: ApprovalStatus;
  current_level: ApprovalLevel;
  steps: ApprovalStep[];
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
  metadata?: {
    customer_name?: string;
    project_name?: string;
    urgency?: 'standard' | 'urgent' | 'emergency';
    reason?: string;
    [key: string]: any;
  };
}

export interface ApprovalRequest {
  entity_type: ApprovableEntity;
  entity_id: string;
  entity_name: string;
  amount: number;
  requested_by: string;
  requested_by_name: string;
  metadata?: Approval['metadata'];
}

/**
 * Approval Workflow Engine
 */
export class ApprovalWorkflowEngine {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * Get applicable approval rules for an entity
   */
  async getApplicableRules(
    entityType: ApprovableEntity,
    amount: number
  ): Promise<ApprovalRule[]> {
    try {
      const response = await fetch(
        `/api/approvals/rules?entity_type=${entityType}&amount=${amount}&tenant_id=${this.tenantId}`
      );

      if (!response.ok) return [];

      const data = await response.json();
      return data.rules || [];
    } catch (error) {
      console.error('Failed to fetch approval rules:', error);
      return [];
    }
  }

  /**
   * Check if entity requires approval
   */
  async requiresApproval(
    entityType: ApprovableEntity,
    amount: number
  ): Promise<{
    required: boolean;
    rules: ApprovalRule[];
    autoApprove: boolean;
    reason: string;
  }> {
    const rules = await this.getApplicableRules(entityType, amount);

    if (rules.length === 0) {
      return {
        required: false,
        rules: [],
        autoApprove: true,
        reason: 'No approval rules configured for this entity type',
      };
    }

    // Check for auto-approval
    const autoApproveRule = rules.find(
      (rule) => rule.auto_approve_below && amount < rule.threshold_amount
    );

    if (autoApproveRule) {
      return {
        required: false,
        rules: [autoApproveRule],
        autoApprove: true,
        reason: `Auto-approved: Amount $${amount} is below threshold $${autoApproveRule.threshold_amount}`,
      };
    }

    // Find applicable rules above threshold
    const applicableRules = rules.filter((rule) => amount >= rule.threshold_amount);

    if (applicableRules.length === 0) {
      return {
        required: false,
        rules: [],
        autoApprove: true,
        reason: 'Amount is below all approval thresholds',
      };
    }

    return {
      required: true,
      rules: applicableRules,
      autoApprove: false,
      reason: `Requires approval: Amount $${amount} exceeds threshold`,
    };
  }

  /**
   * Create approval request
   */
  async createApprovalRequest(request: ApprovalRequest): Promise<Approval | null> {
    try {
      // Check if approval required
      const { required, autoApprove, rules } = await this.requiresApproval(
        request.entity_type,
        request.amount
      );

      // Create approval steps based on rules
      const steps: ApprovalStep[] = [];

      if (required && !autoApprove) {
        // Sort rules by level (ascending)
        const sortedRules = rules.sort((a, b) => a.required_level - b.required_level);

        sortedRules.forEach((rule, index) => {
          steps.push({
            id: `step-${index + 1}`,
            approval_id: '', // Will be set by backend
            level: rule.required_level,
            approver_role: rule.approver_role,
            status: index === 0 ? 'pending' : 'pending', // First step active
            sequence: index + 1,
          });
        });
      }

      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: this.tenantId,
          ...request,
          status: autoApprove ? 'auto_approved' : 'pending',
          current_level: autoApprove ? 0 : 1,
          steps: autoApprove ? [] : steps,
        }),
      });

      if (!response.ok) {
        console.error('Failed to create approval request');
        return null;
      }

      const data = await response.json();
      return data.approval;
    } catch (error) {
      console.error('Error creating approval request:', error);
      return null;
    }
  }

  /**
   * Approve step in approval chain
   */
  async approveStep(
    approvalId: string,
    stepId: string,
    approverId: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/approvals/${approvalId}/steps/${stepId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approver_id: approverId,
          notes,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error approving step:', error);
      return false;
    }
  }

  /**
   * Reject approval
   */
  async rejectApproval(
    approvalId: string,
    stepId: string,
    approverId: string,
    reason: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/approvals/${approvalId}/steps/${stepId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approver_id: approverId,
          rejection_reason: reason,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error rejecting approval:', error);
      return false;
    }
  }

  /**
   * Get approval status for entity
   */
  async getApprovalStatus(
    entityType: ApprovableEntity,
    entityId: string
  ): Promise<Approval | null> {
    try {
      const response = await fetch(
        `/api/approvals?entity_type=${entityType}&entity_id=${entityId}&tenant_id=${this.tenantId}`
      );

      if (!response.ok) return null;

      const data = await response.json();
      return data.approvals?.[0] || null;
    } catch (error) {
      console.error('Failed to get approval status:', error);
      return null;
    }
  }

  /**
   * Get pending approvals for user
   */
  async getPendingApprovals(userId: string, role: string): Promise<Approval[]> {
    try {
      const response = await fetch(
        `/api/approvals/pending?user_id=${userId}&role=${role}&tenant_id=${this.tenantId}`
      );

      if (!response.ok) return [];

      const data = await response.json();
      return data.approvals || [];
    } catch (error) {
      console.error('Failed to get pending approvals:', error);
      return [];
    }
  }

  /**
   * Cancel approval request
   */
  async cancelApproval(approvalId: string, reason: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/approvals/${approvalId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error cancelling approval:', error);
      return false;
    }
  }

  /**
   * Get approval history for entity
   */
  async getApprovalHistory(
    entityType: ApprovableEntity,
    entityId: string
  ): Promise<Approval[]> {
    try {
      const response = await fetch(
        `/api/approvals/history?entity_type=${entityType}&entity_id=${entityId}&tenant_id=${this.tenantId}`
      );

      if (!response.ok) return [];

      const data = await response.json();
      return data.approvals || [];
    } catch (error) {
      console.error('Failed to get approval history:', error);
      return [];
    }
  }
}

/**
 * Helper functions
 */

export function getApprovalLevelLabel(level: ApprovalLevel): string {
  switch (level) {
    case 1:
      return 'Manager';
    case 2:
      return 'Director';
    case 3:
      return 'VP / Executive';
    default:
      return 'Unknown';
  }
}

export function getApprovalStatusColor(status: ApprovalStatus): string {
  switch (status) {
    case 'approved':
    case 'auto_approved':
      return 'text-green-400 bg-green-500/10 border-green-500/20';
    case 'rejected':
    case 'cancelled':
      return 'text-red-400 bg-red-500/10 border-red-500/20';
    case 'pending':
      return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    default:
      return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
  }
}

export function getApprovalStatusLabel(status: ApprovalStatus): string {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'auto_approved':
      return 'Auto-Approved';
    case 'rejected':
      return 'Rejected';
    case 'pending':
      return 'Pending Approval';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}

/**
 * Export singleton instance for default tenant
 */
export function createApprovalEngine(tenantId: string): ApprovalWorkflowEngine {
  return new ApprovalWorkflowEngine(tenantId);
}
