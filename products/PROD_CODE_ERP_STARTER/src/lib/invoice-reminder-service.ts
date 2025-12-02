import { createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { sendEmail, emailTemplates } from '@/lib/communications/email-service';

export interface ReminderRunOptions {
  tenantId?: string;
  dryRun?: boolean;
  maxPerTenant?: number;
}

export interface ReminderRunResult {
  processed: number;
  remindersSent: number;
  dryRun: boolean;
  tenants: Record<string, { processed: number; sent: number }>;
  warnings: string[];
  failures: Array<{ invoiceId: string; reason: string }>;
  preview?: Array<{ invoiceId: string; customerEmail?: string; daysOverdue: number; amountDue: number }>;
}

interface InvoiceReminderRow {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  invoice_number: string | null;
  title?: string | null;
  due_date: string | null;
  status: string | null;
  total_cents?: number | null;
  total_amount?: number | null;
  total?: number | null;
  amount_paid_cents?: number | null;
  paid_amount?: number | null;
  amount_paid?: number | null;
  balance_cents?: number | null;
  reminder_sent_count?: number | null;
  automated_reminders?: number | null;
  last_reminder_sent?: string | null;
  created_at?: string | null;
  customers?: {
    id: string;
    name?: string | null;
    email?: string | null;
    company_name?: string | null;
  } | null;
}

type EvaluationResult =
  | { shouldSend: false; reason: string; daysOverdue: number; amountDue: number }
  | { shouldSend: true; daysOverdue: number; amountDue: number; sentCount: number };

const MS_IN_DAY = 24 * 60 * 60 * 1000;
const MAX_LOOKBACK_DAYS = 45;
const REMINDER_SCHEDULE = [3, 7, 14];
const REMINDER_COOLDOWN_HOURS = 20;
const DEFAULT_MAX_PER_TENANT = 50;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://weathercraft-erp.vercel.app').replace(/\/$/, '');

const isMissingRelationError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const anyError = error as any;
  if (anyError.code === '42P01') return true;
  const messageValue = anyError.message ?? anyError.error ?? '';
  const message = typeof messageValue === 'string' ? messageValue : String(messageValue);
  return /relation .* does not exist/i.test(message);
};

class InvoiceReminderService {
  async run(options: ReminderRunOptions = {}): Promise<ReminderRunResult> {
    const supabase = createServiceRoleClient();
    const tenantFilter = options.tenantId;
    const dryRun = Boolean(options.dryRun);
    const maxPerTenant = options.maxPerTenant ?? DEFAULT_MAX_PER_TENANT;

    const invoices = await this.loadEligibleInvoices(supabase, tenantFilter, maxPerTenant);
    const tenants: Record<string, { processed: number; sent: number }> = {};
    const failures: ReminderRunResult['failures'] = [];
    const warnings: string[] = [];
    const preview: ReminderRunResult['preview'] = [];
    let remindersSent = 0;

    for (const invoice of invoices) {
      tenants[invoice.tenant_id] = tenants[invoice.tenant_id] || { processed: 0, sent: 0 };
      tenants[invoice.tenant_id].processed += 1;

      const evaluation = this.evaluateInvoice(invoice);
      if (!evaluation.shouldSend) {
        const reason =
          'reason' in evaluation && evaluation.reason ? evaluation.reason : 'Reminder skipped';
        warnings.push(`${invoice.id}: ${reason}`);
        continue;
      }

      preview.push({
        invoiceId: invoice.id,
        customerEmail: invoice.customers?.email ?? undefined,
        daysOverdue: evaluation.daysOverdue,
        amountDue: evaluation.amountDue,
      });

      if (dryRun) continue;

      try {
        const sent = await this.sendReminderForInvoice(supabase, invoice, evaluation);
        if (sent) {
          remindersSent += 1;
          tenants[invoice.tenant_id].sent += 1;
        }
      } catch (error: any) {
        failures.push({ invoiceId: invoice.id, reason: error?.message ?? 'Unknown reminder error' });
        logger.error('[InvoiceReminders] Failed to send reminder', { invoiceId: invoice.id, error });
      }
    }

    return {
      processed: invoices.length,
      remindersSent,
      dryRun,
      tenants,
      warnings,
      failures,
      preview: dryRun ? preview : undefined,
    };
  }

  private async loadEligibleInvoices(
    supabase: ReturnType<typeof createServiceRoleClient>,
    tenantId: string | undefined,
    maxPerTenant: number
  ) {
    const now = new Date();
    const lookback = new Date(now.getTime() - MAX_LOOKBACK_DAYS * MS_IN_DAY);

    let query = supabase
      .from('invoices')
      .select(
        `
        id,
        tenant_id,
        customer_id,
        invoice_number,
        title,
        due_date,
        status,
        total_cents,
        total_amount,
        total,
        amount_paid,
        amount_paid_cents,
        paid_amount,
        balance_cents,
        reminder_sent_count,
        automated_reminders,
        last_reminder_sent,
        created_at,
        customers:customers(id, name, email, company_name)
      `
      )
      .lt('due_date', now.toISOString())
      .gte('due_date', lookback.toISOString())
      .in('status', ['sent', 'partial', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(maxPerTenant * 5);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;
    if (error) {
      logger.error('[InvoiceReminders] Failed to load invoices', error);
      return [] as InvoiceReminderRow[];
    }

    if (!tenantId) {
      const perTenantBuckets = new Map<string, InvoiceReminderRow[]>();
      for (const row of data ?? []) {
        const bucket = perTenantBuckets.get(row.tenant_id) ?? [];
        if (bucket.length < maxPerTenant) {
          bucket.push(row as unknown as InvoiceReminderRow);
          perTenantBuckets.set(row.tenant_id, bucket);
        }
      }
      return Array.from(perTenantBuckets.values()).flat();
    }

    return (data ?? []) as unknown as InvoiceReminderRow[];
  }

  private evaluateInvoice(invoice: InvoiceReminderRow): EvaluationResult {
    const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
    if (!dueDate || Number.isNaN(dueDate.getTime())) {
      return { shouldSend: false, reason: 'Invalid due date', daysOverdue: 0, amountDue: 0 };
    }

    const now = new Date();
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / MS_IN_DAY);
    if (daysOverdue < 1) {
      return { shouldSend: false, reason: 'Not overdue yet', daysOverdue, amountDue: 0 };
    }

    const automatedReminders = invoice.automated_reminders ?? REMINDER_SCHEDULE.length;
    if (automatedReminders === 0) {
      return { shouldSend: false, reason: 'Automated reminders disabled', daysOverdue, amountDue: 0 };
    }

    const sentCount = invoice.reminder_sent_count ?? 0;
    if (sentCount >= automatedReminders) {
      return { shouldSend: false, reason: 'Maximum reminders already sent', daysOverdue, amountDue: 0 };
    }

    const nextThreshold = REMINDER_SCHEDULE[Math.min(sentCount, REMINDER_SCHEDULE.length - 1)] ?? 3;
    if (daysOverdue < nextThreshold) {
      return {
        shouldSend: false,
        reason: `Waiting until ${nextThreshold} days overdue`,
        daysOverdue,
        amountDue: 0,
      };
    }

    const lastReminder = invoice.last_reminder_sent ? new Date(invoice.last_reminder_sent) : null;
    if (lastReminder) {
      const hoursSince = (now.getTime() - lastReminder.getTime()) / (60 * 60 * 1000);
      if (hoursSince < REMINDER_COOLDOWN_HOURS) {
        return { shouldSend: false, reason: 'Cooldown period not elapsed', daysOverdue, amountDue: 0 };
      }
    }

    const amountDue = this.resolveAmountDue(invoice);
    if (amountDue <= 0) {
      return { shouldSend: false, reason: 'Invoice already paid', daysOverdue, amountDue };
    }

    if (!invoice.customers?.email) {
      return { shouldSend: false, reason: 'No customer email on file', daysOverdue, amountDue };
    }

    return { shouldSend: true, daysOverdue, amountDue, sentCount };
  }

  private resolveAmountDue(invoice: InvoiceReminderRow) {
    const total = this.coalesceMoney([
      { value: invoice.balance_cents, fromCents: true },
      { value: invoice.total_cents, fromCents: true },
      { value: invoice.total_amount },
      { value: invoice.total },
    ]);
    const paid = this.coalesceMoney([
      { value: invoice.amount_paid_cents, fromCents: true },
      { value: invoice.paid_amount },
      { value: invoice.amount_paid },
    ]);
    const amountDue = total - paid;
    return Math.max(0, Number.isFinite(amountDue) ? Number(amountDue.toFixed(2)) : 0);
  }

  private coalesceMoney(
    candidates: Array<{ value: number | null | undefined; fromCents?: boolean }>
  ) {
    for (const candidate of candidates) {
      const { value, fromCents } = candidate;
      if (typeof value === 'number' && Number.isFinite(value)) {
        return fromCents ? Math.round(value) / 100 : value;
      }
    }
    return 0;
  }

  private async sendReminderForInvoice(
    supabase: ReturnType<typeof createServiceRoleClient>,
    invoice: InvoiceReminderRow,
    context: { daysOverdue: number; amountDue: number; sentCount: number }
  ) {
    const customer = invoice.customers;
    if (!customer?.email) {
      return false;
    }

    const paymentUrl = `${appUrl}/portal/pay/${invoice.id}`;
    const template = emailTemplates.invoiceReminder(
      { ...invoice, amount_due: context.amountDue },
      customer,
      { daysOverdue: context.daysOverdue, paymentUrl }
    );

    const emailSent = await sendEmail({
      to: customer.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (!emailSent) {
      throw new Error('Email provider rejected reminder');
    }

    await supabase
      .from('invoices')
      .update({
        reminder_sent_count: context.sentCount + 1,
        last_reminder_sent: new Date().toISOString(),
        last_reminder_date: new Date().toISOString(),
        status: 'overdue',
      })
      .eq('id', invoice.id)
      .eq('tenant_id', invoice.tenant_id);

    await this.recordReminderHistory(supabase, invoice, context);

    return true;
  }

  private async recordReminderHistory(
    supabase: ReturnType<typeof createServiceRoleClient>,
    invoice: InvoiceReminderRow,
    context: { daysOverdue: number; amountDue: number }
  ) {
    const nowIso = new Date().toISOString();
    try {
      const title = `Invoice ${invoice.invoice_number || invoice.id} reminder`;
      const message = `Automated reminder sent to ${invoice.customers?.email || 'customer'} for ${currencyFormatter.format(context.amountDue)} (overdue ${context.daysOverdue} day(s)).`;

      const { data: reminder } = await supabase
        .from('reminders_enhanced')
        .insert({
          tenant_id: invoice.tenant_id,
          user_id: invoice.customer_id ?? undefined,
          title,
          message,
          reminder_type: 'invoice_due',
          related_entity_type: 'invoice',
          related_entity_id: invoice.id,
          delivery_method: ['email'],
          remind_at: nowIso,
          sent_at: nowIso,
          status: 'sent',
          priority_score: Math.min(100, context.daysOverdue * 5),
          custom_fields: {
            days_overdue: context.daysOverdue,
            amount_due: context.amountDue,
          },
        })
        .select('id')
        .maybeSingle();

      if (reminder?.id) {
        await supabase.from('reminder_delivery_log').insert({
          reminder_id: reminder.id,
          delivery_method: 'email',
          recipient_id: invoice.customer_id,
          delivery_status: 'sent',
          metadata: {
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            customer_email: invoice.customers?.email,
            days_overdue: context.daysOverdue,
          },
        });
      }
    } catch (error) {
      if (isMissingRelationError(error)) {
        logger.warn('[InvoiceReminders] Reminder history tables not provisioned');
        return;
      }
      logger.error('[InvoiceReminders] Failed to log reminder delivery', error);
    }
  }
}

export const invoiceReminderService = new InvoiceReminderService();
export default invoiceReminderService;
