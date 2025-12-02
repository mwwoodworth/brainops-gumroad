/**
 * Estimate Version Control System
 * Tracks all changes to estimates with full snapshot history
 * Provides diff view, rollback capability, and audit trail
 */

export interface EstimateVersion {
  id: string;
  estimate_id: string;
  version_number: number;
  revision_date: Date;
  revised_by: string;
  revised_by_name: string;
  changes_summary: string;
  change_reason?: string;
  previous_amount: number;
  new_amount: number;
  amount_change: number;
  amount_change_percent: number;
  snapshot: EstimateSnapshot;
  created_at: Date;
}

export interface EstimateSnapshot {
  estimate_id: string;
  estimate_number: string;
  customer_id: string;
  customer_name?: string;
  status: string;
  project_name?: string;
  project_address?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  line_items: LineItemSnapshot[];
  scope_of_work?: string;
  terms?: string;
  valid_until?: Date;
  metadata?: any;
}

export interface LineItemSnapshot {
  id?: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  category?: string;
}

export interface VersionDiff {
  field: string;
  label: string;
  old_value: any;
  new_value: any;
  change_type: 'added' | 'removed' | 'modified' | 'unchanged';
}

export interface VersionComparison {
  from_version: number;
  to_version: number;
  total_changes: number;
  amount_changed: boolean;
  amount_diff: number;
  amount_diff_percent: number;
  changes: VersionDiff[];
  line_items_added: number;
  line_items_removed: number;
  line_items_modified: number;
}

/**
 * Estimate Versioning Engine
 */
export class EstimateVersioningEngine {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * Create version snapshot before modification
   */
  async createVersion(
    estimateId: string,
    currentData: Partial<EstimateSnapshot>,
    revisedBy: string,
    revisedByName: string,
    changeReason?: string
  ): Promise<EstimateVersion | null> {
    try {
      // Get current version number
      const versions = await this.getVersionHistory(estimateId);
      const versionNumber = versions.length + 1;

      // Calculate previous amount
      const previousAmount = versions.length > 0
        ? versions[versions.length - 1].new_amount
        : currentData.total_amount || 0;

      const newAmount = currentData.total_amount || 0;
      const amountChange = newAmount - previousAmount;
      const amountChangePercent = previousAmount > 0
        ? (amountChange / previousAmount) * 100
        : 0;

      // Generate changes summary
      const changesSummary = this.generateChangesSummary(
        versions.length > 0 ? versions[versions.length - 1].snapshot : null,
        currentData
      );

      const versionData: Partial<EstimateVersion> = {
        estimate_id: estimateId,
        version_number: versionNumber,
        revision_date: new Date(),
        revised_by: revisedBy,
        revised_by_name: revisedByName,
        changes_summary: changesSummary,
        change_reason: changeReason,
        previous_amount: previousAmount,
        new_amount: newAmount,
        amount_change: amountChange,
        amount_change_percent: amountChangePercent,
        snapshot: currentData as EstimateSnapshot,
      };

      const response = await fetch('/api/estimates/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: this.tenantId,
          ...versionData,
        }),
      });

      if (!response.ok) {
        console.error('Failed to create estimate version');
        return null;
      }

      const data = await response.json();
      return data.version;
    } catch (error) {
      console.error('Error creating estimate version:', error);
      return null;
    }
  }

  /**
   * Get version history for estimate
   */
  async getVersionHistory(estimateId: string): Promise<EstimateVersion[]> {
    try {
      const response = await fetch(
        `/api/estimates/${estimateId}/versions?tenant_id=${this.tenantId}`
      );

      if (!response.ok) return [];

      const data = await response.json();
      return data.versions || [];
    } catch (error) {
      console.error('Failed to get version history:', error);
      return [];
    }
  }

  /**
   * Get specific version
   */
  async getVersion(estimateId: string, versionNumber: number): Promise<EstimateVersion | null> {
    try {
      const response = await fetch(
        `/api/estimates/${estimateId}/versions/${versionNumber}?tenant_id=${this.tenantId}`
      );

      if (!response.ok) return null;

      const data = await response.json();
      return data.version;
    } catch (error) {
      console.error('Failed to get version:', error);
      return null;
    }
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    estimateId: string,
    fromVersion: number,
    toVersion: number
  ): Promise<VersionComparison | null> {
    try {
      const [v1, v2] = await Promise.all([
        this.getVersion(estimateId, fromVersion),
        this.getVersion(estimateId, toVersion),
      ]);

      if (!v1 || !v2) return null;

      return this.generateComparison(v1, v2);
    } catch (error) {
      console.error('Error comparing versions:', error);
      return null;
    }
  }

  /**
   * Rollback to previous version
   */
  async rollbackToVersion(
    estimateId: string,
    versionNumber: number,
    rolledBackBy: string,
    rolledBackByName: string,
    reason: string
  ): Promise<boolean> {
    try {
      const version = await this.getVersion(estimateId, versionNumber);
      if (!version) return false;

      // Create new version with rolled-back data
      await this.createVersion(
        estimateId,
        version.snapshot,
        rolledBackBy,
        rolledBackByName,
        `Rolled back to version ${versionNumber}: ${reason}`
      );

      // Update estimate with rolled-back data
      const response = await fetch(`/api/estimates/${estimateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...version.snapshot,
          rollback_version: versionNumber,
          rollback_reason: reason,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error rolling back version:', error);
      return false;
    }
  }

  /**
   * Generate changes summary
   */
  private generateChangesSummary(
    previousSnapshot: EstimateSnapshot | null,
    currentSnapshot: Partial<EstimateSnapshot>
  ): string {
    const changes: string[] = [];

    if (!previousSnapshot) {
      return 'Initial version created';
    }

    // Check amount changes
    if (currentSnapshot.total_amount !== previousSnapshot.total_amount) {
      const diff = (currentSnapshot.total_amount || 0) - previousSnapshot.total_amount;
      changes.push(
        `Amount ${diff > 0 ? 'increased' : 'decreased'} by $${Math.abs(diff).toLocaleString()}`
      );
    }

    // Check status changes
    if (currentSnapshot.status !== previousSnapshot.status) {
      changes.push(`Status changed from ${previousSnapshot.status} to ${currentSnapshot.status}`);
    }

    // Check line items changes
    if (currentSnapshot.line_items) {
      const oldItems = previousSnapshot.line_items?.length || 0;
      const newItems = currentSnapshot.line_items.length;

      if (newItems !== oldItems) {
        changes.push(`Line items changed from ${oldItems} to ${newItems}`);
      }
    }

    // Check scope changes
    if (
      currentSnapshot.scope_of_work &&
      currentSnapshot.scope_of_work !== previousSnapshot.scope_of_work
    ) {
      changes.push('Scope of work updated');
    }

    // Check validity changes
    if (currentSnapshot.valid_until !== previousSnapshot.valid_until) {
      changes.push('Expiration date updated');
    }

    return changes.length > 0 ? changes.join('; ') : 'Minor updates';
  }

  /**
   * Generate detailed comparison
   */
  private generateComparison(v1: EstimateVersion, v2: EstimateVersion): VersionComparison {
    const changes: VersionDiff[] = [];
    let lineItemsAdded = 0;
    let lineItemsRemoved = 0;
    let lineItemsModified = 0;

    // Compare basic fields
    const fieldsToCompare = [
      { field: 'total_amount', label: 'Total Amount' },
      { field: 'subtotal', label: 'Subtotal' },
      { field: 'tax_amount', label: 'Tax Amount' },
      { field: 'discount_amount', label: 'Discount Amount' },
      { field: 'status', label: 'Status' },
      { field: 'project_name', label: 'Project Name' },
      { field: 'project_address', label: 'Project Address' },
      { field: 'scope_of_work', label: 'Scope of Work' },
      { field: 'valid_until', label: 'Valid Until' },
    ];

    fieldsToCompare.forEach(({ field, label }) => {
      const oldValue = (v1.snapshot as any)[field];
      const newValue = (v2.snapshot as any)[field];

      if (oldValue !== newValue) {
        changes.push({
          field,
          label,
          old_value: oldValue,
          new_value: newValue,
          change_type: !oldValue ? 'added' : !newValue ? 'removed' : 'modified',
        });
      }
    });

    // Compare line items
    const oldItems = v1.snapshot.line_items || [];
    const newItems = v2.snapshot.line_items || [];

    // Find added items
    lineItemsAdded = newItems.filter(
      (ni) => !oldItems.some((oi) => oi.name === ni.name && oi.unit_price === ni.unit_price)
    ).length;

    // Find removed items
    lineItemsRemoved = oldItems.filter(
      (oi) => !newItems.some((ni) => ni.name === oi.name && ni.unit_price === oi.unit_price)
    ).length;

    // Find modified items
    lineItemsModified = newItems.filter((ni) => {
      const oldItem = oldItems.find((oi) => oi.name === ni.name);
      if (!oldItem) return false;
      return (
        oldItem.quantity !== ni.quantity ||
        oldItem.unit_price !== ni.unit_price ||
        oldItem.total !== ni.total
      );
    }).length;

    const amountDiff = v2.new_amount - v1.new_amount;
    const amountDiffPercent = v1.new_amount > 0 ? (amountDiff / v1.new_amount) * 100 : 0;

    return {
      from_version: v1.version_number,
      to_version: v2.version_number,
      total_changes: changes.length,
      amount_changed: v1.new_amount !== v2.new_amount,
      amount_diff: amountDiff,
      amount_diff_percent: amountDiffPercent,
      changes,
      line_items_added: lineItemsAdded,
      line_items_removed: lineItemsRemoved,
      line_items_modified: lineItemsModified,
    };
  }

  /**
   * Get latest version number
   */
  async getLatestVersionNumber(estimateId: string): Promise<number> {
    const versions = await this.getVersionHistory(estimateId);
    return versions.length;
  }

  /**
   * Check if estimate has been modified
   */
  async hasBeenModified(estimateId: string): Promise<boolean> {
    const versions = await this.getVersionHistory(estimateId);
    return versions.length > 1;
  }

  /**
   * Get version changelog (summary of all changes)
   */
  async getChangelog(estimateId: string): Promise<{
    version: number;
    date: Date;
    by: string;
    summary: string;
  }[]> {
    const versions = await this.getVersionHistory(estimateId);

    return versions.map(v => ({
      version: v.version_number,
      date: v.revision_date,
      by: v.revised_by_name,
      summary: v.changes_summary,
    }));
  }
}

/**
 * Helper functions
 */

export function formatVersionNumber(version: number): string {
  return `v${version}`;
}

export function formatAmountChange(amount: number): string {
  const sign = amount >= 0 ? '+' : '';
  return `${sign}$${amount.toLocaleString()}`;
}

export function formatPercentChange(percent: number): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(1)}%`;
}

export function getChangeTypeColor(changeType: VersionDiff['change_type']): string {
  switch (changeType) {
    case 'added':
      return 'text-green-400 bg-green-500/10';
    case 'removed':
      return 'text-red-400 bg-red-500/10';
    case 'modified':
      return 'text-yellow-400 bg-yellow-500/10';
    default:
      return 'text-gray-400 bg-gray-500/10';
  }
}

/**
 * Export singleton creator
 */
export function createVersioningEngine(tenantId: string): EstimateVersioningEngine {
  return new EstimateVersioningEngine(tenantId);
}
