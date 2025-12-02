/**
 * Automated Reminder System
 * Trigger-based reminders with multi-channel delivery
 * Supports estimates, invoices, tasks, jobs, and custom reminders
 */

export type ReminderTriggerType =
  | 'estimate_expiry'
  | 'invoice_due'
  | 'task_due'
  | 'job_start'
  | 'job_end'
  | 'payment_overdue'
  | 'follow_up'
  | 'anniversary'
  | 'custom';

export type ReminderChannel = 'in_app' | 'email' | 'sms' | 'push';
export type ReminderStatus = 'scheduled' | 'sent' | 'failed' | 'cancelled';
export type ReminderRecurrence = 'once' | 'daily' | 'weekly' | 'monthly';

export interface ReminderRule {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  trigger_type: ReminderTriggerType;
  entity_type: string; // 'estimate', 'invoice', 'task', 'job'
  trigger_condition: string; // "due_date - 3 days", "created_at + 7 days"
  notification_template: string;
  notification_title_template: string;
  channels: ReminderChannel[];
  recipient_roles: string[]; // 'customer', 'salesperson', 'manager', 'technician'
  recipient_ids?: string[]; // Specific users (optional)
  priority: 'low' | 'normal' | 'high' | 'urgent';
  recurrence?: ReminderRecurrence;
  active: boolean;
  created_at: Date;
  updated_at: Date;
  metadata?: {
    business_hours_only?: boolean;
    exclude_weekends?: boolean;
    timezone?: string;
    [key: string]: any;
  };
}

export interface ScheduledReminder {
  id: string;
  tenant_id: string;
  rule_id: string;
  rule_name: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  recipient_id: string;
  recipient_name: string;
  recipient_email?: string;
  recipient_phone?: string;
  channels: ReminderChannel[];
  notification_title: string;
  notification_message: string;
  priority: ReminderRule['priority'];
  status: ReminderStatus;
  scheduled_for: Date;
  sent_at?: Date;
  failed_reason?: string;
  retry_count: number;
  created_at: Date;
  metadata?: any;
}

export interface ReminderTemplate {
  trigger_type: ReminderTriggerType;
  title: string;
  message: string;
  variables: string[]; // Available template variables
}

/**
 * Reminder System Engine
 */
export class ReminderSystemEngine {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * Create reminder rule
   */
  async createRule(rule: Partial<ReminderRule>): Promise<ReminderRule | null> {
    try {
      const response = await fetch('/api/reminders/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: this.tenantId,
          ...rule,
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.rule;
    } catch (error) {
      console.error('Error creating reminder rule:', error);
      return null;
    }
  }

  /**
   * Get all reminder rules
   */
  async getRules(active_only = true): Promise<ReminderRule[]> {
    try {
      const response = await fetch(
        `/api/reminders/rules?tenant_id=${this.tenantId}&active=${active_only}`
      );

      if (!response.ok) return [];

      const data = await response.json();
      return data.rules || [];
    } catch (error) {
      console.error('Failed to get reminder rules:', error);
      return [];
    }
  }

  /**
   * Update reminder rule
   */
  async updateRule(ruleId: string, updates: Partial<ReminderRule>): Promise<boolean> {
    try {
      const response = await fetch(`/api/reminders/rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      return response.ok;
    } catch (error) {
      console.error('Error updating reminder rule:', error);
      return false;
    }
  }

  /**
   * Delete reminder rule
   */
  async deleteRule(ruleId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/reminders/rules/${ruleId}`, {
        method: 'DELETE',
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting reminder rule:', error);
      return false;
    }
  }

  /**
   * Schedule reminder for entity
   */
  async scheduleReminder(
    ruleId: string,
    entityType: string,
    entityId: string,
    entityName: string,
    scheduledFor: Date,
    recipientId: string,
    recipientName: string,
    recipientEmail?: string,
    recipientPhone?: string
  ): Promise<ScheduledReminder | null> {
    try {
      const response = await fetch('/api/reminders/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: this.tenantId,
          rule_id: ruleId,
          entity_type: entityType,
          entity_id: entityId,
          entity_name: entityName,
          recipient_id: recipientId,
          recipient_name: recipientName,
          recipient_email: recipientEmail,
          recipient_phone: recipientPhone,
          scheduled_for: scheduledFor.toISOString(),
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.reminder;
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      return null;
    }
  }

  /**
   * Get scheduled reminders for entity
   */
  async getScheduledReminders(entityType: string, entityId: string): Promise<ScheduledReminder[]> {
    try {
      const response = await fetch(
        `/api/reminders/scheduled?entity_type=${entityType}&entity_id=${entityId}&tenant_id=${this.tenantId}`
      );

      if (!response.ok) return [];

      const data = await response.json();
      return data.reminders || [];
    } catch (error) {
      console.error('Failed to get scheduled reminders:', error);
      return [];
    }
  }

  /**
   * Cancel scheduled reminder
   */
  async cancelReminder(reminderId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/reminders/${reminderId}/cancel`, {
        method: 'POST',
      });

      return response.ok;
    } catch (error) {
      console.error('Error cancelling reminder:', error);
      return false;
    }
  }

  /**
   * Test reminder rule (send immediately)
   */
  async testRule(
    ruleId: string,
    testRecipientId: string,
    testRecipientEmail?: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/reminders/rules/${ruleId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: testRecipientId,
          recipient_email: testRecipientEmail,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error testing reminder rule:', error);
      return false;
    }
  }

  /**
   * Get reminder analytics
   */
  async getAnalytics(days = 30): Promise<{
    total_sent: number;
    total_failed: number;
    success_rate: number;
    by_channel: { channel: ReminderChannel; count: number }[];
    by_trigger: { trigger: ReminderTriggerType; count: number }[];
  }> {
    try {
      const response = await fetch(
        `/api/reminders/analytics?tenant_id=${this.tenantId}&days=${days}`
      );

      if (!response.ok) {
        return {
          total_sent: 0,
          total_failed: 0,
          success_rate: 0,
          by_channel: [],
          by_trigger: [],
        };
      }

      const data = await response.json();
      return data.analytics;
    } catch (error) {
      console.error('Failed to get reminder analytics:', error);
      return {
        total_sent: 0,
        total_failed: 0,
        success_rate: 0,
        by_channel: [],
        by_trigger: [],
      };
    }
  }

  /**
   * Evaluate trigger condition
   */
  evaluateTriggerCondition(
    condition: string,
    entityData: {
      due_date?: Date;
      created_at?: Date;
      start_date?: Date;
      end_date?: Date;
      [key: string]: any;
    }
  ): Date | null {
    try {
      // Parse condition (e.g., "due_date - 3 days")
      const conditionRegex = /^(\w+)\s*([+-])\s*(\d+)\s*(day|hour|week|month)s?$/i;
      const match = condition.match(conditionRegex);

      if (!match) return null;

      const [, field, operator, amount, unit] = match;
      const baseDate = entityData[field];

      if (!baseDate) return null;

      const date = new Date(baseDate);
      const multiplier = operator === '+' ? 1 : -1;
      const value = parseInt(amount) * multiplier;

      switch (unit.toLowerCase()) {
        case 'day':
          date.setDate(date.getDate() + value);
          break;
        case 'hour':
          date.setHours(date.getHours() + value);
          break;
        case 'week':
          date.setDate(date.getDate() + value * 7);
          break;
        case 'month':
          date.setMonth(date.getMonth() + value);
          break;
      }

      return date;
    } catch (error) {
      console.error('Error evaluating trigger condition:', error);
      return null;
    }
  }

  /**
   * Process template with variables
   */
  processTemplate(
    template: string,
    variables: {
      customer_name?: string;
      entity_name?: string;
      amount?: number;
      due_date?: Date;
      [key: string]: any;
    }
  ): string {
    let processed = template;

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      let replacement = '';

      if (value instanceof Date) {
        replacement = value.toLocaleDateString();
      } else if (typeof value === 'number') {
        replacement = value.toLocaleString();
      } else {
        replacement = String(value || '');
      }

      processed = processed.replace(new RegExp(placeholder, 'g'), replacement);
    });

    return processed;
  }
}

/**
 * Default reminder templates
 */
export const DEFAULT_REMINDER_TEMPLATES: ReminderTemplate[] = [
  {
    trigger_type: 'estimate_expiry',
    title: 'Estimate Expiring Soon',
    message:
      'Hi {{customer_name}}, your estimate {{entity_name}} for ${{amount}} expires on {{due_date}}. Contact us to proceed!',
    variables: ['customer_name', 'entity_name', 'amount', 'due_date'],
  },
  {
    trigger_type: 'invoice_due',
    title: 'Invoice Due Soon',
    message:
      'Hi {{customer_name}}, invoice {{entity_name}} for ${{amount}} is due on {{due_date}}. Please process payment at your earliest convenience.',
    variables: ['customer_name', 'entity_name', 'amount', 'due_date'],
  },
  {
    trigger_type: 'task_due',
    title: 'Task Due Reminder',
    message:
      'Task "{{entity_name}}" is due on {{due_date}}. Please complete it before the deadline.',
    variables: ['entity_name', 'due_date'],
  },
  {
    trigger_type: 'job_start',
    title: 'Job Starting Soon',
    message:
      'Hi {{customer_name}}, your roofing project "{{entity_name}}" is scheduled to start on {{start_date}}. Our crew will arrive at 8:00 AM.',
    variables: ['customer_name', 'entity_name', 'start_date'],
  },
  {
    trigger_type: 'payment_overdue',
    title: 'Payment Overdue',
    message:
      'Hi {{customer_name}}, payment for invoice {{entity_name}} (${{amount}}) is now overdue. Please contact us to arrange payment.',
    variables: ['customer_name', 'entity_name', 'amount'],
  },
  {
    trigger_type: 'follow_up',
    title: 'Follow-Up Reminder',
    message:
      'Hi {{customer_name}}, following up on {{entity_name}}. Do you have any questions or need additional information?',
    variables: ['customer_name', 'entity_name'],
  },
];

/**
 * Helper functions
 */

export function getReminderChannelIcon(channel: ReminderChannel): string {
  switch (channel) {
    case 'in_app':
      return '🔔';
    case 'email':
      return '📧';
    case 'sms':
      return '💬';
    case 'push':
      return '📱';
    default:
      return '🔔';
  }
}

export function getReminderStatusColor(status: ReminderStatus): string {
  switch (status) {
    case 'sent':
      return 'text-green-400 bg-green-500/10 border-green-500/20';
    case 'failed':
      return 'text-red-400 bg-red-500/10 border-red-500/20';
    case 'scheduled':
      return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    case 'cancelled':
      return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    default:
      return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
  }
}

export function formatTriggerCondition(condition: string): string {
  const conditionRegex = /^(\w+)\s*([+-])\s*(\d+)\s*(day|hour|week|month)s?$/i;
  const match = condition.match(conditionRegex);

  if (!match) return condition;

  const [, field, operator, amount, unit] = match;
  const action = operator === '+' ? 'after' : 'before';
  const fieldLabel = field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  return `${amount} ${unit}${parseInt(amount) > 1 ? 's' : ''} ${action} ${fieldLabel}`;
}

/**
 * Export singleton creator
 */
export function createReminderEngine(tenantId: string): ReminderSystemEngine {
  return new ReminderSystemEngine(tenantId);
}
