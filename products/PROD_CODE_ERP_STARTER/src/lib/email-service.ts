/**
 * Email Service Integration
 * Supports multiple email providers: SendGrid, AWS SES, Resend
 */

import { toast } from 'sonner';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProdEnv = NODE_ENV === 'production';

export interface EmailMessage {
  to: string | string[];
  from?: string;
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
  replyTo?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailResult>;
  validateConfig(): boolean;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * SendGrid Email Provider
 */
class SendGridProvider implements EmailProvider {
  private apiKey: string;
  private fromEmail: string;

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || '';
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@weathercraftroofingco.com';
  }

  validateConfig(): boolean {
    return !!this.apiKey && !!this.fromEmail;
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    if (!this.validateConfig()) {
      return {
        success: false,
        error: 'SendGrid not configured. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL',
      };
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: Array.isArray(message.to)
              ? message.to.map(email => ({ email }))
              : [{ email: message.to }],
            cc: message.cc ? (Array.isArray(message.cc)
              ? message.cc.map(email => ({ email }))
              : [{ email: message.cc }])
              : undefined,
            bcc: message.bcc ? (Array.isArray(message.bcc)
              ? message.bcc.map(email => ({ email }))
              : [{ email: message.bcc }])
              : undefined,
          }],
          from: { email: message.from || this.fromEmail },
          reply_to: message.replyTo ? { email: message.replyTo } : undefined,
          subject: message.subject,
          content: [
            message.html ? { type: 'text/html', value: message.html } : undefined,
            message.text ? { type: 'text/plain', value: message.text } : undefined,
          ].filter(Boolean),
          attachments: message.attachments?.map(att => ({
            filename: att.filename,
            content: typeof att.content === 'string'
              ? att.content
              : att.content.toString('base64'),
            type: att.contentType || 'application/octet-stream',
            disposition: 'attachment',
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`SendGrid error: ${error}`);
      }

      const messageId = response.headers.get('x-message-id') || undefined;

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      console.error('SendGrid email error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * AWS SES Email Provider
 */
class SESProvider implements EmailProvider {
  private region: string;
  private accessKeyId: string;
  private secretAccessKey: string;
  private fromEmail: string;
  private client: SESClient | null;

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
    this.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
    this.fromEmail = process.env.AWS_SES_FROM_EMAIL || 'noreply@weathercraftroofingco.com';
    this.client = null;
  }

  validateConfig(): boolean {
    return !!this.accessKeyId && !!this.secretAccessKey && !!this.fromEmail;
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    if (!this.validateConfig()) {
      return {
        success: false,
        error: 'AWS SES not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SES_FROM_EMAIL',
      };
    }

    if (message.attachments && message.attachments.length > 0) {
      return {
        success: false,
        error: 'AWS SES provider currently does not support attachments',
      };
    }

    if (!this.client) {
      this.client = new SESClient({
        region: this.region,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
      });
    }

    const toAddresses = Array.isArray(message.to) ? message.to : [message.to];
    const ccAddresses = message.cc
      ? Array.isArray(message.cc) ? message.cc : [message.cc]
      : undefined;
    const bccAddresses = message.bcc
      ? Array.isArray(message.bcc) ? message.bcc : [message.bcc]
      : undefined;

    const subject = message.subject || '(no subject)';
    const htmlBody = message.html || undefined;
    const textBody = message.text || (message.html ? stripHtml(message.html) : undefined);

    if (!htmlBody && !textBody) {
      return {
        success: false,
        error: 'AWS SES requires either html or text content',
      };
    }

    const command = new SendEmailCommand({
      Source: message.from || this.fromEmail,
      Destination: {
        ToAddresses: toAddresses,
        CcAddresses: ccAddresses,
        BccAddresses: bccAddresses,
      },
      ReplyToAddresses: message.replyTo ? [message.replyTo] : undefined,
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          ...(htmlBody ? { Html: { Data: htmlBody, Charset: 'UTF-8' } } : {}),
          ...(textBody ? { Text: { Data: textBody, Charset: 'UTF-8' } } : {}),
        },
      },
    });

    try {
      const response = await this.client.send(command);
      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error) {
      console.error('AWS SES email error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown AWS SES error',
      };
    }
  }
}

/**
 * Resend Email Provider (recommended)
 */
class ResendProvider implements EmailProvider {
  private apiKey: string;
  private fromEmail: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || '';
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@weathercraftroofingco.com';
  }

  validateConfig(): boolean {
    return !!this.apiKey && !!this.fromEmail;
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    if (!this.validateConfig()) {
      return {
        success: false,
        error: 'Resend not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL',
      };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: message.from || this.fromEmail,
          to: Array.isArray(message.to) ? message.to : [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          cc: message.cc,
          bcc: message.bcc,
          reply_to: message.replyTo,
          attachments: message.attachments,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Resend error: ${JSON.stringify(error)}`);
      }

      const data = await response.json();

      return {
        success: true,
        messageId: data.id,
      };
    } catch (error) {
      console.error('Resend email error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Email Service - Automatic provider selection
 */
class EmailService {
  private provider: EmailProvider;
  private providerName: string;

  constructor() {
    const { provider, name } = this.initializeProvider();
    this.provider = provider;
    this.providerName = name;
  }

  private initializeProvider(): { provider: EmailProvider; name: string } {
    const candidates: Array<{ name: string; factory: () => EmailProvider }> = [
      { name: 'Resend', factory: () => new ResendProvider() },
      { name: 'SendGrid', factory: () => new SendGridProvider() },
      { name: 'AWS SES', factory: () => new SESProvider() },
    ];

    for (const candidate of candidates) {
      const instance = candidate.factory();
      if (instance.validateConfig()) {
        return { provider: instance, name: candidate.name };
      }
    }

    // In non-production environments, fall back to a mock provider so that
    // local development and non-email-critical flows can proceed.
    if (!isProdEnv) {
      console.warn(
        '[EmailService] No email provider configured. Using mock provider for development. Configure RESEND_API_KEY, SENDGRID_API_KEY, or AWS SES credentials to enable real email delivery.'
      );
      return { provider: new MockEmailProvider(), name: 'Mock (Development)' };
    }

    // In production/CI, this is a hard failure – email is a critical service.
    throw new Error(
      '[EmailService] No email provider is configured in a production environment. Configure RESEND_API_KEY, SENDGRID_API_KEY, or AWS SES credentials.'
    );
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    const result = await this.provider.send(message);

    if (result.success) {
      toast.success('Email sent successfully');
    } else {
      toast.error(`Email failed: ${result.error}`);
    }

    return result;
  }

  validateConfig(): boolean {
    return this.provider.validateConfig();
  }

  getProviderName(): string {
    return this.providerName;
  }
}

/**
 * Mock Email Provider for development
 */
class MockEmailProvider implements EmailProvider {
  validateConfig(): boolean {
    return true;
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    console.log('📧 Mock Email Sent:', {
      to: message.to,
      subject: message.subject,
      preview: message.text?.substring(0, 100) || message.html?.substring(0, 100),
    });

    return {
      success: true,
      messageId: `mock-${Date.now()}`,
    };
  }
}

// Lazy singleton instance (only initialized when actually used, not at build time)
let emailServiceInstance: EmailService | null = null;

function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
}

/**
 * Convenience functions
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  return getEmailService().send(message);
}

export function isEmailConfigured(): boolean {
  return getEmailService().validateConfig();
}

export function getEmailProvider(): string {
  return getEmailService().getProviderName();
}

// Export lazy accessor for backwards compatibility
export const emailService = {
  get instance() {
    return getEmailService();
  },
  send: sendEmail,
  validateConfig: isEmailConfigured,
  getProviderName: getEmailProvider,
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
