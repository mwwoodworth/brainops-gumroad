/**
 * Example Workflows for Week 8
 * Pre-configured workflows to demonstrate automation capabilities
 */

export const exampleWorkflows = [
  {
    name: 'Job Completion → Invoice Generation',
    description: 'Automatically create invoice when job is marked as completed',
    trigger_type: 'database_event',
    trigger_config: {
      table: 'jobs',
      event: 'update',
      condition: 'NEW.status = \'completed\' AND OLD.status != \'completed\'',
    },
    actions: [
      {
        type: 'create_record',
        config: {
          table: 'invoices',
          data: {
            job_id: '{{trigger.data.id}}',
            customer_id: '{{trigger.data.customer_id}}',
            total_amount: '{{trigger.data.total_amount}}',
            status: 'draft',
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
        on_error: 'stop',
      },
      {
        type: 'send_notification',
        config: {
          message: 'Invoice automatically created for completed job #{{trigger.data.job_number}}',
          priority: 'medium',
        },
        on_error: 'continue',
      },
      {
        type: 'log',
        config: {
          message: 'Auto-invoice workflow completed for job {{trigger.data.id}}',
          level: 'info',
        },
        on_error: 'continue',
      },
    ],
    enabled: true,
  },
  {
    name: 'Estimate Approval → Job Creation',
    description: 'Create job automatically when estimate is approved',
    trigger_type: 'database_event',
    trigger_config: {
      table: 'estimates',
      event: 'update',
      condition: 'NEW.status = \'approved\' AND OLD.status != \'approved\'',
    },
    actions: [
      {
        type: 'create_record',
        config: {
          table: 'jobs',
          data: {
            estimate_id: '{{trigger.data.id}}',
            customer_id: '{{trigger.data.customer_id}}',
            job_number: 'AUTO-{{trigger.data.id}}',
            title: '{{trigger.data.title}}',
            description: 'Created from approved estimate',
            status: 'pending',
            total_amount: '{{trigger.data.total_amount}}',
            start_date: new Date().toISOString(),
          },
        },
        on_error: 'stop',
      },
      {
        type: 'update_record',
        config: {
          table: 'estimates',
          id: '{{trigger.data.id}}',
          data: {
            job_created: true,
            job_created_at: new Date().toISOString(),
          },
        },
        on_error: 'continue',
      },
      {
        type: 'send_notification',
        config: {
          message: 'Job created for approved estimate: {{trigger.data.title}}',
          priority: 'high',
        },
        on_error: 'continue',
      },
      {
        type: 'send_email',
        config: {
          to: '{{trigger.data.customer_email}}',
          subject: 'Your Estimate Has Been Approved!',
          body: 'We\'ve received your approval and created a job for: {{trigger.data.title}}. Our team will be in touch soon.',
        },
        on_error: 'continue',
      },
    ],
    enabled: true,
  },
  {
    name: 'Overdue Invoice Follow-up',
    description: 'Send reminders for overdue invoices daily at 9 AM',
    trigger_type: 'scheduled',
    trigger_config: {
      cron: '0 9 * * *', // Every day at 9 AM
      query: 'SELECT * FROM invoices WHERE due_date < NOW() AND status != \'paid\' LIMIT 10',
    },
    actions: [
      {
        type: 'send_email',
        config: {
          to: '{{item.customer_email}}',
          subject: 'Invoice Overdue - {{item.invoice_number}}',
          body: 'This is a reminder that invoice {{item.invoice_number}} for ${{item.total_amount}} is overdue. Please arrange payment at your earliest convenience.',
        },
        on_error: 'continue',
      },
      {
        type: 'send_notification',
        config: {
          message: 'Follow-up needed: Invoice {{item.invoice_number}} is overdue',
          priority: 'high',
        },
        on_error: 'continue',
      },
      {
        type: 'create_record',
        config: {
          table: 'activity_log',
          data: {
            type: 'invoice_reminder',
            invoice_id: '{{item.id}}',
            customer_id: '{{item.customer_id}}',
            details: 'Automated overdue reminder sent',
            created_at: new Date().toISOString(),
          },
        },
        on_error: 'continue',
      },
      {
        type: 'log',
        config: {
          message: 'Overdue invoice reminder sent for {{item.invoice_number}}',
          level: 'info',
          metadata: {
            invoice_id: '{{item.id}}',
            days_overdue: '{{item.days_overdue}}',
          },
        },
        on_error: 'continue',
      },
    ],
    enabled: false, // Disabled by default to avoid spam during testing
  },
];
