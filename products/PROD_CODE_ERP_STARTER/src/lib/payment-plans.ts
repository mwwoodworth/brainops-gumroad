/**
 * Payment Plans & Subscription Management
 * Stripe integration for installment payments and recurring billing
 * Matches QuickBooks payment terms capabilities
 */

export interface PaymentPlan {
  id: string;
  invoice_id: string;
  customer_id: string;
  total_amount: number;
  down_payment: number;
  remaining_balance: number;
  number_of_payments: number;
  payment_frequency: 'weekly' | 'bi-weekly' | 'monthly';
  payment_amount: number;
  start_date: string;
  status: 'active' | 'completed' | 'defaulted' | 'cancelled';
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  created_at: string;
}

export interface PaymentSchedule {
  payment_number: number;
  due_date: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'failed';
  paid_date?: string;
  stripe_invoice_id?: string;
}

export interface PaymentPlanOption {
  name: string;
  description: string;
  down_payment_percent: number;
  number_of_payments: number;
  payment_frequency: 'weekly' | 'bi-weekly' | 'monthly';
  interest_rate: number; // Annual percentage rate
  total_cost: number;
  monthly_payment: number;
  total_interest: number;
  recommended: boolean;
}

/**
 * Standard payment plan templates
 */
export const PAYMENT_PLAN_TEMPLATES: Record<string, Omit<PaymentPlanOption, 'total_cost' | 'monthly_payment' | 'total_interest'>> = {
  no_interest_6_months: {
    name: '6-Month No Interest',
    description: 'Pay over 6 months with no interest (requires 20% down)',
    down_payment_percent: 20,
    number_of_payments: 6,
    payment_frequency: 'monthly',
    interest_rate: 0,
    recommended: true,
  },
  no_interest_12_months: {
    name: '12-Month No Interest',
    description: 'Pay over 12 months with no interest (requires 15% down)',
    down_payment_percent: 15,
    number_of_payments: 12,
    payment_frequency: 'monthly',
    interest_rate: 0,
    recommended: false,
  },
  standard_24_months: {
    name: '24-Month Standard',
    description: 'Extended payment plan over 24 months (6.99% APR, 10% down)',
    down_payment_percent: 10,
    number_of_payments: 24,
    payment_frequency: 'monthly',
    interest_rate: 6.99,
    recommended: false,
  },
  extended_36_months: {
    name: '36-Month Extended',
    description: 'Long-term financing over 36 months (8.99% APR, 5% down)',
    down_payment_percent: 5,
    number_of_payments: 36,
    payment_frequency: 'monthly',
    interest_rate: 8.99,
    recommended: false,
  },
  low_down_48_months: {
    name: '48-Month Low Down',
    description: 'Minimal upfront cost, extended term (9.99% APR, 0% down)',
    down_payment_percent: 0,
    number_of_payments: 48,
    payment_frequency: 'monthly',
    interest_rate: 9.99,
    recommended: false,
  },
};

/**
 * Calculate payment amount with interest
 */
function calculatePaymentWithInterest(
  principal: number,
  annual_rate: number,
  number_of_payments: number
): number {
  if (annual_rate === 0) {
    return principal / number_of_payments;
  }

  const monthly_rate = annual_rate / 100 / 12;
  const payment =
    (principal * monthly_rate * Math.pow(1 + monthly_rate, number_of_payments)) /
    (Math.pow(1 + monthly_rate, number_of_payments) - 1);

  return Math.round(payment * 100) / 100;
}

/**
 * Generate payment plan options for an invoice amount
 */
export function generatePaymentPlanOptions(invoiceAmount: number): PaymentPlanOption[] {
  const options: PaymentPlanOption[] = [];

  for (const [key, template] of Object.entries(PAYMENT_PLAN_TEMPLATES)) {
    const down_payment = invoiceAmount * (template.down_payment_percent / 100);
    const principal = invoiceAmount - down_payment;
    const payment_amount = calculatePaymentWithInterest(
      principal,
      template.interest_rate,
      template.number_of_payments
    );
    const total_paid = payment_amount * template.number_of_payments + down_payment;
    const total_interest = total_paid - invoiceAmount;

    options.push({
      ...template,
      total_cost: Math.round(total_paid * 100) / 100,
      monthly_payment: Math.round(payment_amount * 100) / 100,
      total_interest: Math.round(total_interest * 100) / 100,
    });
  }

  return options;
}

/**
 * Create payment schedule for a payment plan
 */
export function createPaymentSchedule(
  start_date: string,
  payment_amount: number,
  number_of_payments: number,
  frequency: 'weekly' | 'bi-weekly' | 'monthly'
): PaymentSchedule[] {
  const schedule: PaymentSchedule[] = [];
  const start = new Date(start_date);

  const increment_days = {
    weekly: 7,
    'bi-weekly': 14,
    monthly: 30, // Approximate, will adjust to actual month boundaries
  };

  for (let i = 0; i < number_of_payments; i++) {
    const due_date = new Date(start);

    if (frequency === 'monthly') {
      due_date.setMonth(start.getMonth() + i);
    } else {
      due_date.setDate(start.getDate() + i * increment_days[frequency]);
    }

    schedule.push({
      payment_number: i + 1,
      due_date: due_date.toISOString().split('T')[0],
      amount: payment_amount,
      status: 'pending',
    });
  }

  return schedule;
}

/**
 * Calculate next payment date and amount
 */
export function getNextPayment(plan: PaymentPlan, schedule: PaymentSchedule[]): {
  next_payment: PaymentSchedule | null;
  days_until_due: number;
  is_overdue: boolean;
} {
  const pending_payments = schedule.filter((p) => p.status === 'pending');

  if (pending_payments.length === 0) {
    return { next_payment: null, days_until_due: 0, is_overdue: false };
  }

  const next_payment = pending_payments[0];
  const due_date = new Date(next_payment.due_date);
  const today = new Date();
  const days_until_due = Math.ceil((due_date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const is_overdue = days_until_due < 0;

  return {
    next_payment,
    days_until_due,
    is_overdue,
  };
}

/**
 * Calculate payment plan health metrics
 */
export function calculatePlanHealth(
  plan: PaymentPlan,
  schedule: PaymentSchedule[]
): {
  total_paid: number;
  remaining_balance: number;
  percent_complete: number;
  on_time_rate: number;
  missed_payments: number;
  health_score: 'excellent' | 'good' | 'at_risk' | 'delinquent';
} {
  const paid_payments = schedule.filter((p) => p.status === 'paid');
  const total_paid = paid_payments.reduce((sum, p) => sum + p.amount, 0) + plan.down_payment;
  const remaining_balance = plan.total_amount - total_paid;
  const percent_complete = (total_paid / plan.total_amount) * 100;

  // Calculate on-time payment rate
  const overdue_or_failed = schedule.filter((p) => ['overdue', 'failed'].includes(p.status)).length;
  const completed_payment_count = schedule.filter((p) => ['paid', 'overdue', 'failed'].includes(p.status)).length;
  const on_time_rate = completed_payment_count > 0
    ? ((completed_payment_count - overdue_or_failed) / completed_payment_count) * 100
    : 100;

  const missed_payments = overdue_or_failed;

  // Determine health score
  let health_score: 'excellent' | 'good' | 'at_risk' | 'delinquent' = 'excellent';
  if (missed_payments >= 3 || on_time_rate < 60) {
    health_score = 'delinquent';
  } else if (missed_payments >= 2 || on_time_rate < 80) {
    health_score = 'at_risk';
  } else if (missed_payments >= 1 || on_time_rate < 95) {
    health_score = 'good';
  }

  return {
    total_paid: Math.round(total_paid * 100) / 100,
    remaining_balance: Math.round(remaining_balance * 100) / 100,
    percent_complete: Math.round(percent_complete * 100) / 100,
    on_time_rate: Math.round(on_time_rate * 100) / 100,
    missed_payments,
    health_score,
  };
}

/**
 * Stripe subscription creation payload
 */
export interface StripeSubscriptionPayload {
  customer_email: string;
  customer_name: string;
  payment_method_id?: string;
  amount_per_payment: number;
  currency: 'usd';
  interval: 'week' | 'month';
  interval_count: number; // 1 for monthly, 2 for bi-weekly, etc.
  total_payments: number;
  invoice_id: string;
  metadata: {
    invoice_id: string;
    customer_id: string;
    payment_plan_id: string;
  };
}

/**
 * Generate Stripe subscription configuration
 */
export function generateStripeSubscriptionConfig(
  plan: PaymentPlan,
  customer_email: string,
  customer_name: string
): StripeSubscriptionPayload {
  const interval_map: Record<typeof plan.payment_frequency, { interval: 'week' | 'month'; interval_count: number }> = {
    weekly: { interval: 'week', interval_count: 1 },
    'bi-weekly': { interval: 'week', interval_count: 2 },
    monthly: { interval: 'month', interval_count: 1 },
  };

  const { interval, interval_count } = interval_map[plan.payment_frequency];

  return {
    customer_email,
    customer_name,
    amount_per_payment: plan.payment_amount * 100, // Stripe uses cents
    currency: 'usd',
    interval,
    interval_count,
    total_payments: plan.number_of_payments,
    invoice_id: plan.invoice_id,
    metadata: {
      invoice_id: plan.invoice_id,
      customer_id: plan.customer_id,
      payment_plan_id: plan.id,
    },
  };
}

/**
 * Calculate early payoff amount (with discount)
 */
export function calculateEarlyPayoff(
  plan: PaymentPlan,
  schedule: PaymentSchedule[],
  discount_percent: number = 2
): {
  remaining_balance: number;
  discount_amount: number;
  early_payoff_amount: number;
  savings: number;
} {
  const pending_payments = schedule.filter((p) => p.status === 'pending');
  const remaining_balance = pending_payments.reduce((sum, p) => sum + p.amount, 0);
  const discount_amount = remaining_balance * (discount_percent / 100);
  const early_payoff_amount = remaining_balance - discount_amount;

  // Calculate savings vs. continuing payments (including future interest)
  const savings = discount_amount;

  return {
    remaining_balance: Math.round(remaining_balance * 100) / 100,
    discount_amount: Math.round(discount_amount * 100) / 100,
    early_payoff_amount: Math.round(early_payoff_amount * 100) / 100,
    savings: Math.round(savings * 100) / 100,
  };
}
