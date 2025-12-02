import nodemailer, { type Transporter } from 'nodemailer';

// Email configuration from environment
const EMAIL_CONFIG = {
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
  from: process.env.EMAIL_FROM,
};

const isProduction = (process.env.NODE_ENV || 'development') === 'production';

function ensureEmailConfig() {
  const missing: string[] = [];
  if (!EMAIL_CONFIG.host) missing.push('EMAIL_HOST');
  if (!EMAIL_CONFIG.auth.user) missing.push('EMAIL_USERNAME');
  if (!EMAIL_CONFIG.auth.pass) missing.push('EMAIL_PASSWORD');
  if (!EMAIL_CONFIG.from) missing.push('EMAIL_FROM');

  if (missing.length > 0) {
    const message = `Missing required email configuration env vars: ${missing.join(', ')}`;
    if (isProduction) {
      throw new Error(`[EmailService] ${message}`);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`[EmailService] ${message}`);
    }
  }
}

// Create transporter lazily when needed
let transporter: Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    try {
      ensureEmailConfig();
      if (!EMAIL_CONFIG.host || !EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass || !EMAIL_CONFIG.from) {
        return null;
      }

      transporter = nodemailer.createTransport({
        host: EMAIL_CONFIG.host,
        port: EMAIL_CONFIG.port,
        secure: EMAIL_CONFIG.secure,
        auth: EMAIL_CONFIG.auth,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize email transporter:', error);
      return null;
    }
  }
  return transporter;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
    contentType?: string;
  }>;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transport = getTransporter();
    if (!transport) {
      console.warn('Email transporter not available');
      return false;
    }

    const mailOptions = {
      from: `Weathercraft Roofing <${EMAIL_CONFIG.from}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
      bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
      replyTo: options.replyTo || EMAIL_CONFIG.from
    };

    const info = await transport.sendMail(mailOptions);
    // console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Email Templates
export const emailTemplates = {
  invoiceNotification: (invoice: any, customer: any, paymentLink?: string) => ({
    subject: `Invoice #${invoice.invoice_number} from Weathercraft Roofing`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #337ab7; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 30px; background: #337ab7; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .amount { font-size: 24px; font-weight: bold; color: #337ab7; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Weathercraft Roofing Co.</h1>
          </div>
          <div class="content">
            <h2>Hello ${customer.name},</h2>
            <p>Your invoice #${invoice.invoice_number} is ready for review.</p>

            <div style="background: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Invoice Details:</strong></p>
              <p>Invoice Number: ${invoice.invoice_number}</p>
              <p>Date: ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
              <p>Due Date: ${new Date(invoice.due_date).toLocaleDateString()}</p>
              <p class="amount">Total Amount: $${(invoice.total_amount || 0).toFixed(2)}</p>
            </div>

            ${paymentLink ? `
            <div style="text-align: center;">
              <a href="${paymentLink}" class="button">Pay Now</a>
            </div>
            ` : ''}

            <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>

            <p>Thank you for your business!</p>
          </div>
          <div class="footer">
            <p>Weathercraft Roofing Co.</p>
            <p>123 Main Street, Dallas, TX 75201</p>
            <p>Phone: (214) 555-0100 | Email: info@weathercraft.com</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Invoice #${invoice.invoice_number} from Weathercraft Roofing

      Hello ${customer.name},

      Your invoice #${invoice.invoice_number} is ready for review.

      Invoice Details:
      - Invoice Number: ${invoice.invoice_number}
      - Date: ${new Date(invoice.invoice_date).toLocaleDateString()}
      - Due Date: ${new Date(invoice.due_date).toLocaleDateString()}
      - Total Amount: $${(invoice.total_amount || 0).toFixed(2)}

      ${paymentLink ? `Pay online: ${paymentLink}` : ''}

      If you have any questions, please contact us at (214) 555-0100.

      Thank you for your business!

      Weathercraft Roofing Co.
    `
  }),

  paymentReceipt: (invoice: any, payment: any, customer: any) => ({
    subject: `Payment received for Invoice #${invoice.invoice_number}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #5cb85c; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .amount { font-size: 22px; font-weight: bold; color: #5cb85c; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Receipt</h1>
          </div>
          <div class="content">
            <h2>Hello ${customer?.name || 'Customer'},</h2>
            <p>We have received your payment for invoice <strong>#${invoice.invoice_number}</strong>.</p>

            <div style="background: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Payment Details:</strong></p>
              <p class="amount">Amount: $${Number(payment.amount || 0).toFixed(2)}</p>
              <p>Method: ${payment.payment_method || 'stripe'}</p>
              <p>Date: ${new Date(payment.payment_date || Date.now()).toLocaleString()}</p>
              <p>Reference: ${payment.reference_number || payment.external_id || 'N/A'}</p>
            </div>

            <p>Attached is a copy of the invoice for your records. Your current balance has been updated.</p>
            <p>Thank you for your prompt payment and for choosing Weathercraft Roofing.</p>
          </div>
          <div class="footer">
            <p>Weathercraft Roofing Co. • (214) 555-0100 • info@weathercraft.com</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Payment received for Invoice #${invoice.invoice_number}\n\nAmount: $${Number(payment.amount || 0).toFixed(2)}\nMethod: ${payment.payment_method || 'stripe'}\nDate: ${new Date(payment.payment_date || Date.now()).toLocaleString()}\nReference: ${payment.reference_number || payment.external_id || 'N/A'}\n\nA copy of the invoice is attached. Thank you!`
  }),

  invoiceReminder: (
    invoice: any,
    customer: any,
    context: { daysOverdue: number; paymentUrl: string }
  ) => {
    const amountDue = Number(invoice.amount_due ?? invoice.balance_cents ?? invoice.total_amount ?? 0);
    const formattedAmount = `$${amountDue.toFixed(2)}`;
    const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Due immediately';
    const overdueCopy =
      context.daysOverdue > 0
        ? `${context.daysOverdue} day${context.daysOverdue === 1 ? '' : 's'} overdue`
        : 'Past due';

    return {
      subject: `Reminder: Invoice #${invoice.invoice_number || invoice.id} ${overdueCopy}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 640px; margin: 0 auto; padding: 20px; }
            .header { background: #111827; color: white; padding: 20px; text-align: center; }
            .content { padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; }
            .button { display: inline-block; padding: 12px 28px; background: #0f172a; color: white; text-decoration: none; border-radius: 999px; margin: 24px 0; font-weight: 600; }
            .footer { padding: 12px; text-align: center; font-size: 12px; color: #64748b; }
            .badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 12px; background: #fef3c7; color: #92400e; font-weight: 600; margin-bottom: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Weathercraft Roofing Co.</h1>
            </div>
            <div class="content">
              <div class="badge">${overdueCopy}</div>
              <h2>Hello ${customer?.name || 'there'},</h2>
              <p>This is a friendly reminder that your invoice ${invoice.invoice_number ? `#${invoice.invoice_number}` : ''} is still outstanding.</p>
              <p><strong>Amount due:</strong> ${formattedAmount}<br/>
              <strong>Original due date:</strong> ${dueDate}</p>
              <a href="${context.paymentUrl}" class="button">Pay Invoice Securely</a>
              <p>If you have already sent payment or need assistance, please let us know so we can update our records.</p>
              <p>Thank you for your prompt attention!</p>
            </div>
            <div class="footer">
              Weathercraft Roofing Co. • (214) 555-0100 • billing@weathercraft.com
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hello ${customer?.name || 'there'},

This is a reminder that invoice ${invoice.invoice_number ? `#${invoice.invoice_number}` : ''} remains outstanding.

Amount due: ${formattedAmount}
Original due date: ${dueDate} (${overdueCopy})

Pay securely: ${context.paymentUrl}

If you have questions or recently paid, please reply to this email.

Thank you,
Weathercraft Roofing Co.
      `.trim(),
    };
  },

  estimateNotification: (estimate: any, customer: any, viewLink?: string) => ({
    subject: `Your Roofing Estimate from Weathercraft`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #5cb85c; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 30px; background: #5cb85c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .amount { font-size: 24px; font-weight: bold; color: #5cb85c; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Weathercraft Roofing Co.</h1>
          </div>
          <div class="content">
            <h2>Hello ${customer.name},</h2>
            <p>Thank you for considering Weathercraft Roofing for your roofing needs. Your personalized estimate is ready!</p>

            <div style="background: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Estimate Details:</strong></p>
              <p>Estimate Number: ${estimate.estimate_number}</p>
              <p>Date: ${new Date(estimate.created_at).toLocaleDateString()}</p>
              <p>Valid Until: ${new Date(estimate.valid_until || Date.now() + 30*24*60*60*1000).toLocaleDateString()}</p>
              <p class="amount">Total Estimate: $${(estimate.total_amount || 0).toFixed(2)}</p>
            </div>

            ${viewLink ? `
            <div style="text-align: center;">
              <a href="${viewLink}" class="button">View Full Estimate</a>
            </div>
            ` : ''}

            <p><strong>What's Next?</strong></p>
            <ul>
              <li>Review the detailed estimate</li>
              <li>Contact us with any questions</li>
              <li>Approve the estimate to schedule your project</li>
            </ul>

            <p>We're committed to providing you with the highest quality roofing services. This estimate is valid for 30 days.</p>
          </div>
          <div class="footer">
            <p>Weathercraft Roofing Co.</p>
            <p>123 Main Street, Dallas, TX 75201</p>
            <p>Phone: (214) 555-0100 | Email: info@weathercraft.com</p>
            <p>Licensed & Insured | BBB Accredited</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Your Roofing Estimate from Weathercraft

      Hello ${customer.name},

      Thank you for considering Weathercraft Roofing. Your personalized estimate is ready!

      Estimate Details:
      - Estimate Number: ${estimate.estimate_number}
      - Date: ${new Date(estimate.created_at).toLocaleDateString()}
      - Valid Until: ${new Date(estimate.valid_until || Date.now() + 30*24*60*60*1000).toLocaleDateString()}
      - Total Estimate: $${(estimate.total_amount || 0).toFixed(2)}

      ${viewLink ? `View full estimate: ${viewLink}` : ''}

      What's Next?
      1. Review the detailed estimate
      2. Contact us with any questions
      3. Approve the estimate to schedule your project

      This estimate is valid for 30 days.

      Weathercraft Roofing Co.
      Phone: (214) 555-0100
      Email: info@weathercraft.com
    `
  }),

  appointmentReminder: (appointment: any, customer: any) => ({
    subject: `Appointment Reminder - Weathercraft Roofing`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f0ad4e; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .appointment-box { background: white; padding: 20px; border-left: 4px solid #f0ad4e; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Appointment Reminder</h1>
          </div>
          <div class="content">
            <h2>Hello ${customer.name},</h2>
            <p>This is a friendly reminder about your upcoming appointment with Weathercraft Roofing.</p>

            <div class="appointment-box">
              <h3>Appointment Details:</h3>
              <p><strong>Date:</strong> ${new Date(appointment.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${appointment.time}</p>
              <p><strong>Type:</strong> ${appointment.type || 'Roofing Consultation'}</p>
              <p><strong>Location:</strong> ${appointment.address || customer.address}</p>
            </div>

            <p><strong>What to Expect:</strong></p>
            <ul>
              <li>Our technician will arrive within the scheduled time window</li>
              <li>They will conduct a thorough inspection</li>
              <li>You'll receive a detailed estimate</li>
              <li>All questions will be answered</li>
            </ul>

            <p>If you need to reschedule, please call us at (214) 555-0100.</p>
          </div>
          <div class="footer">
            <p>Weathercraft Roofing Co.</p>
            <p>Phone: (214) 555-0100 | Email: info@weathercraft.com</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Appointment Reminder - Weathercraft Roofing

      Hello ${customer.name},

      This is a reminder about your upcoming appointment.

      Date: ${new Date(appointment.date).toLocaleDateString()}
      Time: ${appointment.time}
      Type: ${appointment.type || 'Roofing Consultation'}
      Location: ${appointment.address || customer.address}

      Our technician will arrive within the scheduled time window.

      If you need to reschedule, please call (214) 555-0100.

      Weathercraft Roofing Co.
    `
  }),

  proposalNotification: (
    proposal: any,
    options: { viewLink?: string; totalFormatted?: string; customerName?: string }
  ) => {
    const total = options.totalFormatted ?? `$${Number(proposal.total_value || 0).toFixed(2)}`;
    const customerName = options.customerName || proposal.client_name || 'Valued Customer';
    const primaryCta = options.viewLink
      ? `<div style="text-align: center; margin: 20px 0;">
            <a href="${options.viewLink}" class="button" target="_blank" rel="noopener">View Proposal</a>
         </div>`
      : '';

    return {
      subject: `Proposal ready for review – ${proposal.title || 'Weathercraft Roofing'}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 640px; margin: 0 auto; padding: 20px; }
            .header { background: #111827; color: white; padding: 20px; text-align: center; }
            .content { padding: 24px; background: #f7fafc; }
            .button { display: inline-block; padding: 12px 28px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; }
            .footer { padding: 18px; text-align: center; font-size: 12px; color: #6b7280; }
            .card { background: white; border-radius: 8px; padding: 16px; margin: 18px 0; border: 1px solid #e5e7eb; }
            .total { font-size: 24px; font-weight: bold; color: #111827; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Weathercraft Roofing Co.</h1>
              <p>Comprehensive Roofing & Exterior Specialists</p>
            </div>
            <div class="content">
              <h2>Hello ${customerName},</h2>
              <p>Your project proposal is ready for review. Inside you'll find the recommended scope, investment summary, and next steps to move forward.</p>

              <div class="card">
                <p><strong>Proposal:</strong> ${proposal.title || 'Project Proposal'}</p>
                <p><strong>Total Investment:</strong></p>
                <p class="total">${total}</p>
                <p><strong>Status:</strong> ${proposal.status || 'draft'}</p>
              </div>

              ${primaryCta}

              <p>If you have any questions, reply to this email or call us at (214) 555-0100. We appreciate the opportunity to earn your business.</p>
              <p>— Weathercraft Roofing Sales Team</p>
            </div>
            <div class="footer">
              <p>Weathercraft Roofing Co. · 123 Main Street · Dallas, TX 75201</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hello ${customerName},

Your proposal "${proposal.title || 'Project Proposal'}" is ready for review.
Total investment: ${total}

${options.viewLink ? `View the proposal: ${options.viewLink}` : ''}

If you have any questions, reply to this email or call (214) 555-0100.

Weathercraft Roofing Co.
      `,
    };
  },
};
