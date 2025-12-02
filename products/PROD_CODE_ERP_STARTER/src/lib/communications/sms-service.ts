import twilio from 'twilio';

// Twilio configuration
const TWILIO_CONFIG = {
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  fromNumber: process.env.TWILIO_PHONE_NUMBER || '+12145550100',
  messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID
};

// Initialize Twilio client lazily
let twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient() {
  if (!twilioClient && TWILIO_CONFIG.accountSid && TWILIO_CONFIG.authToken) {
    try {
      twilioClient = twilio(TWILIO_CONFIG.accountSid, TWILIO_CONFIG.authToken);
    } catch (error) {
      console.error('Failed to initialize Twilio client:', error);
    }
  }
  return twilioClient;
}

interface SMSOptions {
  to: string | string[];
  body: string;
  mediaUrl?: string[];
  statusCallback?: string;
}

export async function sendSMS(options: SMSOptions): Promise<boolean> {
  const client = getTwilioClient();
  if (!client) {
    console.warn('Twilio not configured. Skipping SMS send.');
    return false;
  }

  try {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    for (const recipient of recipients) {
      // Format phone number (ensure it starts with +1 for US numbers)
      const formattedNumber = formatPhoneNumber(recipient);

      const message = await client.messages.create({
        body: options.body,
        from: TWILIO_CONFIG.messagingServiceSid || TWILIO_CONFIG.fromNumber,
        to: formattedNumber,
        ...(options.mediaUrl && { mediaUrl: options.mediaUrl }),
        ...(options.statusCallback && { statusCallback: options.statusCallback })
      });

      // console.log(`SMS sent to ${formattedNumber}: ${message.sid}`);
    }

    return true;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return false;
  }
}

function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // If it's a 10-digit US number, add +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  // If it's an 11-digit number starting with 1, add +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }

  // Otherwise, assume it's already formatted correctly
  return phone;
}

// SMS Templates
export const smsTemplates = {
  invoiceReminder: (invoice: any, paymentLink?: string) => {
    const message = `Weathercraft Roofing: Invoice #${invoice.invoice_number} for $${(invoice.total_amount || 0).toFixed(2)} is due ${new Date(invoice.due_date).toLocaleDateString()}.`;
    return paymentLink
      ? `${message} Pay online: ${paymentLink}`
      : `${message} Call (214) 555-0100 for payment options.`;
  },

  appointmentReminder: (appointment: any) => {
    return `Weathercraft Roofing: Reminder - Your appointment is scheduled for ${new Date(appointment.date).toLocaleDateString()} at ${appointment.time}. Reply CONFIRM to confirm or call (214) 555-0100 to reschedule.`;
  },

  estimateReady: (estimate: any, viewLink?: string) => {
    const message = `Weathercraft Roofing: Your estimate #${estimate.estimate_number} for $${(estimate.total_amount || 0).toFixed(2)} is ready!`;
    return viewLink
      ? `${message} View: ${viewLink}`
      : `${message} We'll email you the details shortly.`;
  },

  jobScheduled: (job: any, date: string, time: string) => {
    return `Weathercraft Roofing: Your roofing project #${job.job_number} is scheduled for ${date} at ${time}. Our crew will arrive on time. Questions? Call (214) 555-0100.`;
  },

  jobCompleted: (job: any) => {
    return `Weathercraft Roofing: Your roofing project #${job.job_number} is complete! Thank you for choosing us. Please leave a review: [review_link]`;
  },

  paymentReceived: (invoice: any, amount: number) => {
    return `Weathercraft Roofing: Payment of $${amount.toFixed(2)} received for invoice #${invoice.invoice_number}. Thank you!`;
  },

  weatherAlert: (customer: any, alertType: string) => {
    return `Weathercraft Roofing: Weather Alert - ${alertType} expected in your area. Ensure your roof is secure. Need emergency service? Call (214) 555-0100.`;
  }
};

// Batch SMS sending for campaigns
export async function sendBulkSMS(
  recipients: Array<{ phone: string; name?: string }>,
  messageTemplate: (recipient: any) => string
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const message = messageTemplate(recipient);
    const success = await sendSMS({
      to: recipient.phone,
      body: message
    });

    if (success) {
      sent++;
    } else {
      failed++;
    }

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return { sent, failed };
}
