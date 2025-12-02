/**
 * SMS Service Integration
 * Supports Twilio for SMS messaging
 */

import { toast } from 'sonner';

const isProdEnv = process.env.NODE_ENV === 'production';

export interface SMSMessage {
  to: string;
  message: string;
  from?: string;
  mediaUrls?: string[];
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  status?: string;
}

/**
 * Twilio SMS Provider
 */
class TwilioProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.TWILIO_FROM_NUMBER || '';
  }

  validateConfig(): boolean {
    return !!this.accountSid && !!this.authToken && !!this.fromNumber;
  }

  async send(message: SMSMessage): Promise<SMSResult> {
    if (!this.validateConfig()) {
      return {
        success: false,
        error: 'Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER',
      };
    }

    try {
      // Create basic auth header
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

      // Build form data
      const formData = new URLSearchParams();
      formData.append('To', message.to);
      formData.append('From', message.from || this.fromNumber);
      formData.append('Body', message.message);

      // Add media URLs if present (MMS)
      if (message.mediaUrls && message.mediaUrls.length > 0) {
        message.mediaUrls.forEach(url => {
          formData.append('MediaUrl', url);
        });
      }

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Twilio error: ${error.message || JSON.stringify(error)}`);
      }

      const data = await response.json();

      return {
        success: true,
        messageId: data.sid,
        status: data.status,
      };
    } catch (error) {
      console.error('Twilio SMS error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getStatus(messageId: string): Promise<{
    status: string;
    errorCode?: number;
    errorMessage?: string;
  } | null> {
    if (!this.validateConfig()) {
      return null;
    }

    try {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages/${messageId}.json`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      return {
        status: data.status,
        errorCode: data.error_code,
        errorMessage: data.error_message,
      };
    } catch (error) {
      console.error('Twilio status check error:', error);
      return null;
    }
  }
}

/**
 * Mock SMS Provider for development
 */
class MockSMSProvider {
  validateConfig(): boolean {
    return true;
  }

  async send(message: SMSMessage): Promise<SMSResult> {
    console.log('📱 Mock SMS Sent:', {
      to: message.to,
      message: message.message.substring(0, 100),
      mediaCount: message.mediaUrls?.length || 0,
    });

    return {
      success: true,
      messageId: `mock-sms-${Date.now()}`,
      status: 'sent',
    };
  }

  async getStatus(messageId: string): Promise<{
    status: string;
    errorCode?: number;
    errorMessage?: string;
  } | null> {
    return {
      status: 'delivered',
    };
  }
}

/**
 * SMS Service - Automatic provider selection
 */
class SMSService {
  private provider: TwilioProvider | MockSMSProvider;
  private providerName: string;

  constructor() {
    const twilioProvider = new TwilioProvider();

    if (twilioProvider.validateConfig()) {
      this.provider = twilioProvider;
      this.providerName = 'Twilio';
      return;
    }

    if (isProdEnv) {
      throw new Error(
        '[SMSService] Production SMS provider is not configured. Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.'
      );
    }

    console.warn('[SMSService] Missing Twilio credentials. Using mock SMS provider for development/testing.');
    this.provider = new MockSMSProvider();
    this.providerName = 'Mock (Development)';
  }

  async send(message: SMSMessage): Promise<SMSResult> {
    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(message.to.replace(/[\s()-]/g, ''))) {
      return {
        success: false,
        error: 'Invalid phone number format. Use E.164 format (+1234567890)',
      };
    }

    const result = await this.provider.send(message);

    if (result.success) {
      toast.success('SMS sent successfully');
    } else {
      toast.error(`SMS failed: ${result.error}`);
    }

    return result;
  }

  async getStatus(messageId: string) {
    if (this.provider instanceof TwilioProvider) {
      return this.provider.getStatus(messageId);
    }
    return null;
  }

  validateConfig(): boolean {
    return this.provider.validateConfig();
  }

  getProviderName(): string {
    return this.providerName ?? (this.provider instanceof TwilioProvider ? 'Twilio' : 'Mock (Development)');
  }
}

// Export singleton instance
export const smsService = new SMSService();

/**
 * Convenience functions
 */
export async function sendSMS(to: string, message: string, mediaUrls?: string[]): Promise<SMSResult> {
  return smsService.send({ to, message, mediaUrls });
}

export function isSMSConfigured(): boolean {
  return smsService.validateConfig();
}

export function getSMSProvider(): string {
  return smsService.getProviderName();
}

/**
 * Helper function to format phone number to E.164
 */
export function formatPhoneE164(phone: string, defaultCountryCode = '+1'): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If it starts with country code, use as-is
  if (phone.startsWith('+')) {
    return '+' + digits;
  }

  // If it's 10 digits (US), add +1
  if (digits.length === 10) {
    return defaultCountryCode + digits;
  }

  // If it's 11 digits starting with 1, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return '+' + digits;
  }

  // Otherwise return as-is with + prefix
  return '+' + digits;
}
