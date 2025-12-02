/**
 * Financial Transaction Engine
 * Automatically generates accounting transactions from business events
 * Ensures double-entry bookkeeping and proper audit trails
 */

import { supabase } from '@/lib/supabase';

// Chart of Accounts - Standard Account Numbers
export const ACCOUNTS = {
  // Assets (1000-1999)
  CASH: '1000',
  ACCOUNTS_RECEIVABLE: '1100',
  INVENTORY: '1200',
  PREPAID_EXPENSES: '1300',
  EQUIPMENT: '1500',
  VEHICLES: '1600',

  // Liabilities (2000-2999)
  ACCOUNTS_PAYABLE: '2000',
  ACCRUED_EXPENSES: '2100',
  SALES_TAX_PAYABLE: '2200',
  PAYROLL_LIABILITIES: '2300',
  NOTES_PAYABLE: '2500',

  // Equity (3000-3999)
  OWNER_EQUITY: '3000',
  RETAINED_EARNINGS: '3100',

  // Revenue (4000-4999)
  SALES_REVENUE: '4000',
  SERVICE_REVENUE: '4100',
  OTHER_REVENUE: '4200',
  MAINTENANCE_CONTRACTS: '4300',

  // Expenses (5000-5999)
  COST_OF_GOODS_SOLD: '5000',
  MATERIALS: '5100',
  LABOR: '5200',

  // Operating Expenses (6000-6999)
  OPERATING_EXPENSES: '6000',
  RENT: '6100',
  UTILITIES: '6200',
  INSURANCE: '6300',
  MARKETING: '6400',
  OFFICE_SUPPLIES: '6500',
};

export interface TransactionEntry {
  account_number: string;
  debit?: number;
  credit?: number;
  description: string;
}

export interface BusinessEvent {
  type: 'invoice_paid' | 'job_completed' | 'material_purchased' | 'payroll_processed' | 'inventory_purchased' | 'expense_recorded';
  tenant_id: string;
  entity_id: string; // invoice_id, job_id, etc.
  amount: number;
  date: string;
  description: string;
  metadata?: Record<string, any>;
}

/**
 * Create double-entry transaction in the general ledger
 */
export async function createGeneralLedgerTransaction(
  tenant_id: string,
  entries: TransactionEntry[],
  reference_id: string,
  reference_type: string,
  transaction_date: string
): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  try {
    // Validate double-entry: sum of debits must equal sum of credits
    const totalDebits = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredits = entries.reduce((sum, e) => sum + (e.credit || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return {
        success: false,
        error: `Double-entry validation failed: Debits (${totalDebits}) must equal Credits (${totalCredits})`
      };
    }

    // Get account IDs from chart of accounts
    const accountNumbers = entries.map(e => e.account_number);
    const { data: accounts, error: accountError } = await supabase
      .from('chart_of_accounts')
      .select('id, account_number, account_name, account_type')
      .in('account_number', accountNumbers);

    if (accountError || !accounts || accounts.length !== accountNumbers.length) {
      return {
        success: false,
        error: 'One or more account numbers not found in chart of accounts'
      };
    }

    // Create account lookup map
    const accountMap = new Map(accounts.map(a => [a.account_number, a]));

    // Insert into general ledger
    const ledgerEntries = entries.map(entry => {
      const account = accountMap.get(entry.account_number)!;
      return {
        tenant_id,
        account_id: account.id,
        transaction_date,
        debit_amount: entry.debit || 0,
        credit_amount: entry.credit || 0,
        description: entry.description,
        reference_id,
        reference_type
      };
    });

    const { data: ledger, error: ledgerError } = await supabase
      .from('general_ledger')
      .insert(ledgerEntries)
      .select('id')
      .single();

    if (ledgerError) throw ledgerError;

    // Also create in financial_transactions for simpler querying
    const { data: transaction, error: transactionError } = await supabase
      .from('financial_transactions')
      .insert({
        tenant_id,
        amount: totalDebits, // Use debit amount as transaction amount
        transaction_date,
        description: entries[0].description,
        transaction_type: reference_type,
        project_id: reference_type === 'job' ? reference_id : null,
        invoice_id: reference_type === 'invoice' ? reference_id : null,
        reconciled: false
      })
      .select('id')
      .single();

    if (transactionError) throw transactionError;

    return {
      success: true,
      transaction_id: transaction.id
    };

  } catch (error: any) {
    console.error('Error creating general ledger transaction:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Process business event and generate appropriate accounting transactions
 */
export async function processBusinessEvent(event: BusinessEvent): Promise<{
  success: boolean;
  transaction_id?: string;
  error?: string;
}> {
  let entries: TransactionEntry[] = [];

  switch (event.type) {
    case 'invoice_paid':
      // Customer payment received
      // Debit: Cash (increase asset)
      // Credit: Accounts Receivable (decrease asset)
      entries = [
        {
          account_number: ACCOUNTS.CASH,
          debit: event.amount,
          description: `Payment received - ${event.description}`
        },
        {
          account_number: ACCOUNTS.ACCOUNTS_RECEIVABLE,
          credit: event.amount,
          description: `Payment received - ${event.description}`
        }
      ];
      break;

    case 'job_completed':
      // Job completion - recognize revenue
      // Debit: Accounts Receivable (increase asset)
      // Credit: Service Revenue (increase revenue)
      entries = [
        {
          account_number: ACCOUNTS.ACCOUNTS_RECEIVABLE,
          debit: event.amount,
          description: `Job completed - ${event.description}`
        },
        {
          account_number: ACCOUNTS.SERVICE_REVENUE,
          credit: event.amount,
          description: `Job completed - ${event.description}`
        }
      ];
      break;

    case 'material_purchased':
      // Material purchase for job
      // Debit: Materials (increase expense)
      // Credit: Accounts Payable or Cash (increase liability or decrease asset)
      const isPaidImmediately = event.metadata?.paid_immediately || false;
      entries = [
        {
          account_number: ACCOUNTS.MATERIALS,
          debit: event.amount,
          description: `Materials purchased - ${event.description}`
        },
        {
          account_number: isPaidImmediately ? ACCOUNTS.CASH : ACCOUNTS.ACCOUNTS_PAYABLE,
          credit: event.amount,
          description: `Materials purchased - ${event.description}`
        }
      ];
      break;

    case 'payroll_processed':
      // Payroll payment
      // Debit: Labor (increase expense)
      // Credit: Cash (decrease asset)
      entries = [
        {
          account_number: ACCOUNTS.LABOR,
          debit: event.amount,
          description: `Payroll - ${event.description}`
        },
        {
          account_number: ACCOUNTS.CASH,
          credit: event.amount,
          description: `Payroll - ${event.description}`
        }
      ];
      break;

    case 'inventory_purchased':
      // Inventory purchase
      // Debit: Inventory (increase asset)
      // Credit: Accounts Payable (increase liability)
      entries = [
        {
          account_number: ACCOUNTS.INVENTORY,
          debit: event.amount,
          description: `Inventory purchased - ${event.description}`
        },
        {
          account_number: ACCOUNTS.ACCOUNTS_PAYABLE,
          credit: event.amount,
          description: `Inventory purchased - ${event.description}`
        }
      ];
      break;

    case 'expense_recorded':
      // General expense
      // Debit: Operating Expenses (increase expense)
      // Credit: Cash or Accounts Payable
      const expenseCategory = event.metadata?.category || ACCOUNTS.OPERATING_EXPENSES;
      const isPaid = event.metadata?.paid || false;
      entries = [
        {
          account_number: expenseCategory,
          debit: event.amount,
          description: event.description
        },
        {
          account_number: isPaid ? ACCOUNTS.CASH : ACCOUNTS.ACCOUNTS_PAYABLE,
          credit: event.amount,
          description: event.description
        }
      ];
      break;

    default:
      return {
        success: false,
        error: `Unknown business event type: ${event.type}`
      };
  }

  // Create the general ledger transaction
  return await createGeneralLedgerTransaction(
    event.tenant_id,
    entries,
    event.entity_id,
    event.type,
    event.date
  );
}

/**
 * Get account balance by summing debits and credits
 */
export async function getAccountBalance(
  tenant_id: string,
  account_number: string
): Promise<number> {
  try {
    // Get account ID
    const { data: account } = await supabase
      .from('chart_of_accounts')
      .select('id, normal_balance')
      .eq('account_number', account_number)
      .single();

    if (!account) return 0;

    // Sum debits and credits
    const { data: entries } = await supabase
      .from('general_ledger')
      .select('debit_amount, credit_amount')
      .eq('tenant_id', tenant_id)
      .eq('account_id', account.id);

    if (!entries) return 0;

    const totalDebits = entries.reduce((sum, e) => sum + (e.debit_amount || 0), 0);
    const totalCredits = entries.reduce((sum, e) => sum + (e.credit_amount || 0), 0);

    // For debit-normal accounts (assets, expenses): balance = debits - credits
    // For credit-normal accounts (liabilities, equity, revenue): balance = credits - debits
    if (account.normal_balance === 'debit') {
      return totalDebits - totalCredits;
    } else {
      return totalCredits - totalDebits;
    }
  } catch (error) {
    console.error('Error getting account balance:', error);
    return 0;
  }
}

/**
 * Get trial balance for all accounts
 */
export async function getTrialBalance(tenant_id: string): Promise<{
  accounts: Array<{
    account_number: string;
    account_name: string;
    account_type: string;
    debit_balance: number;
    credit_balance: number;
  }>;
  total_debits: number;
  total_credits: number;
  balanced: boolean;
}> {
  try {
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('id, account_number, account_name, account_type, normal_balance')
      .eq('is_active', true)
      .order('account_number');

    if (!accounts) return { accounts: [], total_debits: 0, total_credits: 0, balanced: true };

    const balances = await Promise.all(
      accounts.map(async (account) => {
        const balance = await getAccountBalance(tenant_id, account.account_number);
        return {
          account_number: account.account_number,
          account_name: account.account_name,
          account_type: account.account_type,
          debit_balance: account.normal_balance === 'debit' && balance > 0 ? balance : 0,
          credit_balance: account.normal_balance === 'credit' && balance > 0 ? balance : 0
        };
      })
    );

    const total_debits = balances.reduce((sum, b) => sum + b.debit_balance, 0);
    const total_credits = balances.reduce((sum, b) => sum + b.credit_balance, 0);

    return {
      accounts: balances,
      total_debits,
      total_credits,
      balanced: Math.abs(total_debits - total_credits) < 0.01
    };
  } catch (error) {
    console.error('Error getting trial balance:', error);
    return { accounts: [], total_debits: 0, total_credits: 0, balanced: true };
  }
}
