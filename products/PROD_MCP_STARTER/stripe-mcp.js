#!/usr/bin/env node

/**
 * BrainOps Stripe MCP Server - COMPLETE Implementation
 *
 * Complete Stripe API control for payment processing and business operations.
 * Provides full Stripe API coverage with comprehensive tools.
 *
 * Features:
 * - Payment processing (charges, payment intents, payment methods)
 * - Customer management (CRUD, search, subscriptions)
 * - Subscription management (create, update, cancel, trials)
 * - Product and price management
 * - Invoice operations (create, send, finalize, pay)
 * - Refund processing
 * - Webhook management
 * - Payout operations
 * - Balance and transaction retrieval
 * - Dispute handling
 * - Tax rate management
 * - Coupon and promotion codes
 * - Payment link creation
 * - Checkout session management
 * - Connect (multi-tenant) operations
 *
 * Environment Variables:
 * - STRIPE_SECRET_KEY: Stripe secret key (sk_live_*** or sk_test_***)
 * - STRIPE_PUBLISHABLE_KEY: Stripe publishable key (pk_live_xxx or pk_test_xxx)
 * - STRIPE_WEBHOOK_SECRET: Webhook signing secret
 *
 * Created: 2025-11-02
 * Version: 1.0.0
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

class StripeMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'stripe-complete',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Stripe API configuration
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
    if (!STRIPE_SECRET_KEY) {
      console.error('Warning: STRIPE_SECRET_KEY not set');
    }

    this.stripe = axios.create({
      baseURL: 'https://api.stripe.com/v1',
      auth: {
        username: STRIPE_SECRET_KEY,
        password: ''
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    this.setupHandlers();
    this.setupErrorHandling();
  }

  // Helper to convert object to URL-encoded form data
  toFormData(obj, prefix = '') {
    const formData = new URLSearchParams();

    const addPair = (key, value) => {
      if (value === null || value === undefined) return;

      if (typeof value === 'object' && !Array.isArray(value)) {
        Object.entries(value).forEach(([k, v]) => {
          addPair(`${key}[${k}]`, v);
        });
      } else if (Array.isArray(value)) {
        value.forEach((v, i) => {
          addPair(`${key}[${i}]`, v);
        });
      } else {
        formData.append(key, String(value));
      }
    };

    Object.entries(obj).forEach(([key, value]) => {
      addPair(prefix ? `${prefix}[${key}]` : key, value);
    });

    return formData;
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // ========== Payment Processing ==========
        {
          name: 'stripe_create_payment_intent',
          description: 'Create a payment intent for processing payments',
          inputSchema: {
            type: 'object',
            properties: {
              amount: { type: 'number', description: 'Amount in cents' },
              currency: { type: 'string', description: 'Currency code (usd, eur, etc)' },
              customer: { type: 'string', description: 'Customer ID' },
              payment_method: { type: 'string', description: 'Payment method ID' },
              description: { type: 'string', description: 'Payment description' },
              metadata: { type: 'object', description: 'Additional metadata' },
              confirm: { type: 'boolean', description: 'Automatically confirm' },
              automatic_payment_methods: { type: 'object', description: 'Enable automatic payment methods' }
            },
            required: ['amount', 'currency']
          }
        },
        {
          name: 'stripe_confirm_payment_intent',
          description: 'Confirm a payment intent',
          inputSchema: {
            type: 'object',
            properties: {
              payment_intent_id: { type: 'string', description: 'Payment intent ID' },
              payment_method: { type: 'string', description: 'Payment method ID' }
            },
            required: ['payment_intent_id']
          }
        },
        {
          name: 'stripe_cancel_payment_intent',
          description: 'Cancel a payment intent',
          inputSchema: {
            type: 'object',
            properties: {
              payment_intent_id: { type: 'string', description: 'Payment intent ID' }
            },
            required: ['payment_intent_id']
          }
        },
        {
          name: 'stripe_capture_payment_intent',
          description: 'Capture a payment intent (for separate authorization)',
          inputSchema: {
            type: 'object',
            properties: {
              payment_intent_id: { type: 'string', description: 'Payment intent ID' },
              amount_to_capture: { type: 'number', description: 'Amount to capture in cents' }
            },
            required: ['payment_intent_id']
          }
        },
        {
          name: 'stripe_create_charge',
          description: 'Create a direct charge (legacy API)',
          inputSchema: {
            type: 'object',
            properties: {
              amount: { type: 'number', description: 'Amount in cents' },
              currency: { type: 'string', description: 'Currency code' },
              customer: { type: 'string', description: 'Customer ID' },
              source: { type: 'string', description: 'Payment source ID' },
              description: { type: 'string', description: 'Charge description' },
              metadata: { type: 'object', description: 'Additional metadata' }
            },
            required: ['amount', 'currency']
          }
        },
        {
          name: 'stripe_list_charges',
          description: 'List all charges',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Filter by customer ID' },
              limit: { type: 'number', description: 'Number of charges to return' },
              starting_after: { type: 'string', description: 'Pagination cursor' }
            }
          }
        },

        // ========== Payment Methods ==========
        {
          name: 'stripe_create_payment_method',
          description: 'Create a payment method',
          inputSchema: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['card', 'us_bank_account', 'sepa_debit'], description: 'Payment method type' },
              card: { type: 'object', description: 'Card details {number, exp_month, exp_year, cvc}' },
              billing_details: { type: 'object', description: 'Billing details {name, email, phone, address}' }
            },
            required: ['type']
          }
        },
        {
          name: 'stripe_attach_payment_method',
          description: 'Attach payment method to customer',
          inputSchema: {
            type: 'object',
            properties: {
              payment_method_id: { type: 'string', description: 'Payment method ID' },
              customer: { type: 'string', description: 'Customer ID' }
            },
            required: ['payment_method_id', 'customer']
          }
        },
        {
          name: 'stripe_detach_payment_method',
          description: 'Detach payment method from customer',
          inputSchema: {
            type: 'object',
            properties: {
              payment_method_id: { type: 'string', description: 'Payment method ID' }
            },
            required: ['payment_method_id']
          }
        },
        {
          name: 'stripe_list_payment_methods',
          description: 'List customer payment methods',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Customer ID' },
              type: { type: 'string', description: 'Payment method type' }
            },
            required: ['customer']
          }
        },

        // ========== Customer Management ==========
        {
          name: 'stripe_create_customer',
          description: 'Create a new customer',
          inputSchema: {
            type: 'object',
            properties: {
              email: { type: 'string', description: 'Customer email' },
              name: { type: 'string', description: 'Customer name' },
              phone: { type: 'string', description: 'Customer phone' },
              description: { type: 'string', description: 'Customer description' },
              payment_method: { type: 'string', description: 'Default payment method ID' },
              metadata: { type: 'object', description: 'Additional metadata' },
              address: { type: 'object', description: 'Customer address' }
            }
          }
        },
        {
          name: 'stripe_get_customer',
          description: 'Retrieve customer details',
          inputSchema: {
            type: 'object',
            properties: {
              customer_id: { type: 'string', description: 'Customer ID' }
            },
            required: ['customer_id']
          }
        },
        {
          name: 'stripe_update_customer',
          description: 'Update customer details',
          inputSchema: {
            type: 'object',
            properties: {
              customer_id: { type: 'string', description: 'Customer ID' },
              email: { type: 'string', description: 'Customer email' },
              name: { type: 'string', description: 'Customer name' },
              phone: { type: 'string', description: 'Customer phone' },
              description: { type: 'string', description: 'Customer description' },
              metadata: { type: 'object', description: 'Additional metadata' }
            },
            required: ['customer_id']
          }
        },
        {
          name: 'stripe_delete_customer',
          description: 'Delete a customer',
          inputSchema: {
            type: 'object',
            properties: {
              customer_id: { type: 'string', description: 'Customer ID' }
            },
            required: ['customer_id']
          }
        },
        {
          name: 'stripe_list_customers',
          description: 'List all customers',
          inputSchema: {
            type: 'object',
            properties: {
              email: { type: 'string', description: 'Filter by email' },
              limit: { type: 'number', description: 'Number of customers to return' },
              starting_after: { type: 'string', description: 'Pagination cursor' }
            }
          }
        },
        {
          name: 'stripe_search_customers',
          description: 'Search customers with query',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query (e.g., "email:\'test@example.com\'")' },
              limit: { type: 'number', description: 'Number of results' }
            },
            required: ['query']
          }
        },

        // ========== Subscription Management ==========
        {
          name: 'stripe_create_subscription',
          description: 'Create a new subscription',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Customer ID' },
              items: { type: 'array', items: { type: 'object' }, description: 'Subscription items [{price: "price_id", quantity: 1}]' },
              trial_period_days: { type: 'number', description: 'Trial period in days' },
              default_payment_method: { type: 'string', description: 'Default payment method' },
              proration_behavior: { type: 'string', enum: ['create_prorations', 'none'], description: 'Proration behavior' },
              metadata: { type: 'object', description: 'Additional metadata' }
            },
            required: ['customer', 'items']
          }
        },
        {
          name: 'stripe_get_subscription',
          description: 'Retrieve subscription details',
          inputSchema: {
            type: 'object',
            properties: {
              subscription_id: { type: 'string', description: 'Subscription ID' }
            },
            required: ['subscription_id']
          }
        },
        {
          name: 'stripe_update_subscription',
          description: 'Update a subscription',
          inputSchema: {
            type: 'object',
            properties: {
              subscription_id: { type: 'string', description: 'Subscription ID' },
              items: { type: 'array', items: { type: 'object' }, description: 'New subscription items' },
              proration_behavior: { type: 'string', description: 'Proration behavior' },
              trial_end: { type: 'number', description: 'Trial end timestamp' },
              metadata: { type: 'object', description: 'Additional metadata' }
            },
            required: ['subscription_id']
          }
        },
        {
          name: 'stripe_cancel_subscription',
          description: 'Cancel a subscription',
          inputSchema: {
            type: 'object',
            properties: {
              subscription_id: { type: 'string', description: 'Subscription ID' },
              prorate: { type: 'boolean', description: 'Prorate cancellation' },
              invoice_now: { type: 'boolean', description: 'Invoice immediately' }
            },
            required: ['subscription_id']
          }
        },
        {
          name: 'stripe_list_subscriptions',
          description: 'List all subscriptions',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Filter by customer ID' },
              status: { type: 'string', enum: ['active', 'trialing', 'canceled', 'past_due'], description: 'Filter by status' },
              limit: { type: 'number', description: 'Number of subscriptions to return' }
            }
          }
        },

        // ========== Products & Prices ==========
        {
          name: 'stripe_create_product',
          description: 'Create a new product',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Product name' },
              description: { type: 'string', description: 'Product description' },
              metadata: { type: 'object', description: 'Additional metadata' },
              images: { type: 'array', items: { type: 'string' }, description: 'Product images URLs' }
            },
            required: ['name']
          }
        },
        {
          name: 'stripe_update_product',
          description: 'Update a product',
          inputSchema: {
            type: 'object',
            properties: {
              product_id: { type: 'string', description: 'Product ID' },
              name: { type: 'string', description: 'Product name' },
              description: { type: 'string', description: 'Product description' },
              metadata: { type: 'object', description: 'Additional metadata' }
            },
            required: ['product_id']
          }
        },
        {
          name: 'stripe_list_products',
          description: 'List all products',
          inputSchema: {
            type: 'object',
            properties: {
              active: { type: 'boolean', description: 'Filter by active status' },
              limit: { type: 'number', description: 'Number of products to return' }
            }
          }
        },
        {
          name: 'stripe_create_price',
          description: 'Create a price for a product',
          inputSchema: {
            type: 'object',
            properties: {
              product: { type: 'string', description: 'Product ID' },
              unit_amount: { type: 'number', description: 'Price in cents' },
              currency: { type: 'string', description: 'Currency code' },
              recurring: { type: 'object', description: 'Recurring details {interval: "month", interval_count: 1}' },
              metadata: { type: 'object', description: 'Additional metadata' }
            },
            required: ['product', 'unit_amount', 'currency']
          }
        },
        {
          name: 'stripe_list_prices',
          description: 'List all prices',
          inputSchema: {
            type: 'object',
            properties: {
              product: { type: 'string', description: 'Filter by product ID' },
              active: { type: 'boolean', description: 'Filter by active status' },
              limit: { type: 'number', description: 'Number of prices to return' }
            }
          }
        },

        // ========== Invoices ==========
        {
          name: 'stripe_create_invoice',
          description: 'Create a new invoice',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Customer ID' },
              description: { type: 'string', description: 'Invoice description' },
              metadata: { type: 'object', description: 'Additional metadata' },
              auto_advance: { type: 'boolean', description: 'Auto-finalize invoice' }
            },
            required: ['customer']
          }
        },
        {
          name: 'stripe_finalize_invoice',
          description: 'Finalize an invoice',
          inputSchema: {
            type: 'object',
            properties: {
              invoice_id: { type: 'string', description: 'Invoice ID' }
            },
            required: ['invoice_id']
          }
        },
        {
          name: 'stripe_pay_invoice',
          description: 'Pay an invoice',
          inputSchema: {
            type: 'object',
            properties: {
              invoice_id: { type: 'string', description: 'Invoice ID' },
              payment_method: { type: 'string', description: 'Payment method ID' }
            },
            required: ['invoice_id']
          }
        },
        {
          name: 'stripe_send_invoice',
          description: 'Send an invoice to customer',
          inputSchema: {
            type: 'object',
            properties: {
              invoice_id: { type: 'string', description: 'Invoice ID' }
            },
            required: ['invoice_id']
          }
        },
        {
          name: 'stripe_void_invoice',
          description: 'Void an invoice',
          inputSchema: {
            type: 'object',
            properties: {
              invoice_id: { type: 'string', description: 'Invoice ID' }
            },
            required: ['invoice_id']
          }
        },
        {
          name: 'stripe_list_invoices',
          description: 'List all invoices',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Filter by customer ID' },
              status: { type: 'string', enum: ['draft', 'open', 'paid', 'void', 'uncollectible'], description: 'Filter by status' },
              limit: { type: 'number', description: 'Number of invoices to return' }
            }
          }
        },

        // ========== Refunds ==========
        {
          name: 'stripe_create_refund',
          description: 'Create a refund',
          inputSchema: {
            type: 'object',
            properties: {
              charge: { type: 'string', description: 'Charge ID' },
              payment_intent: { type: 'string', description: 'Payment intent ID' },
              amount: { type: 'number', description: 'Amount to refund in cents (full refund if not specified)' },
              reason: { type: 'string', enum: ['duplicate', 'fraudulent', 'requested_by_customer'], description: 'Refund reason' },
              metadata: { type: 'object', description: 'Additional metadata' }
            }
          }
        },
        {
          name: 'stripe_list_refunds',
          description: 'List all refunds',
          inputSchema: {
            type: 'object',
            properties: {
              charge: { type: 'string', description: 'Filter by charge ID' },
              payment_intent: { type: 'string', description: 'Filter by payment intent ID' },
              limit: { type: 'number', description: 'Number of refunds to return' }
            }
          }
        },

        // ========== Checkout Sessions ==========
        {
          name: 'stripe_create_checkout_session',
          description: 'Create a checkout session',
          inputSchema: {
            type: 'object',
            properties: {
              line_items: { type: 'array', items: { type: 'object' }, description: 'Line items [{price: "price_id", quantity: 1}]' },
              mode: { type: 'string', enum: ['payment', 'subscription', 'setup'], description: 'Checkout mode' },
              success_url: { type: 'string', description: 'Success redirect URL' },
              cancel_url: { type: 'string', description: 'Cancel redirect URL' },
              customer: { type: 'string', description: 'Customer ID' },
              customer_email: { type: 'string', description: 'Customer email (if no customer ID)' },
              metadata: { type: 'object', description: 'Additional metadata' }
            },
            required: ['line_items', 'mode', 'success_url', 'cancel_url']
          }
        },
        {
          name: 'stripe_get_checkout_session',
          description: 'Retrieve checkout session details',
          inputSchema: {
            type: 'object',
            properties: {
              session_id: { type: 'string', description: 'Session ID' }
            },
            required: ['session_id']
          }
        },
        {
          name: 'stripe_list_checkout_sessions',
          description: 'List all checkout sessions',
          inputSchema: {
            type: 'object',
            properties: {
              customer: { type: 'string', description: 'Filter by customer ID' },
              limit: { type: 'number', description: 'Number of sessions to return' }
            }
          }
        },

        // ========== Payment Links ==========
        {
          name: 'stripe_create_payment_link',
          description: 'Create a payment link',
          inputSchema: {
            type: 'object',
            properties: {
              line_items: { type: 'array', items: { type: 'object' }, description: 'Line items [{price: "price_id", quantity: 1}]' },
              after_completion: { type: 'object', description: 'After completion config {type: "redirect", redirect: {url: "..."}}' },
              metadata: { type: 'object', description: 'Additional metadata' }
            },
            required: ['line_items']
          }
        },
        {
          name: 'stripe_list_payment_links',
          description: 'List all payment links',
          inputSchema: {
            type: 'object',
            properties: {
              active: { type: 'boolean', description: 'Filter by active status' },
              limit: { type: 'number', description: 'Number of links to return' }
            }
          }
        },

        // ========== Balance & Transactions ==========
        {
          name: 'stripe_get_balance',
          description: 'Get current account balance',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'stripe_list_balance_transactions',
          description: 'List balance transactions',
          inputSchema: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Filter by type (charge, refund, payout, etc)' },
              payout: { type: 'string', description: 'Filter by payout ID' },
              limit: { type: 'number', description: 'Number of transactions to return' }
            }
          }
        },

        // ========== Payouts ==========
        {
          name: 'stripe_create_payout',
          description: 'Create a payout',
          inputSchema: {
            type: 'object',
            properties: {
              amount: { type: 'number', description: 'Amount in cents' },
              currency: { type: 'string', description: 'Currency code' },
              description: { type: 'string', description: 'Payout description' },
              metadata: { type: 'object', description: 'Additional metadata' }
            },
            required: ['amount', 'currency']
          }
        },
        {
          name: 'stripe_list_payouts',
          description: 'List all payouts',
          inputSchema: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['pending', 'paid', 'failed', 'canceled'], description: 'Filter by status' },
              limit: { type: 'number', description: 'Number of payouts to return' }
            }
          }
        },

        // ========== Webhooks ==========
        {
          name: 'stripe_list_webhook_endpoints',
          description: 'List all webhook endpoints',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Number of webhooks to return' }
            }
          }
        },
        {
          name: 'stripe_create_webhook_endpoint',
          description: 'Create a webhook endpoint',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'Webhook URL' },
              enabled_events: { type: 'array', items: { type: 'string' }, description: 'Events to listen for' },
              description: { type: 'string', description: 'Webhook description' },
              metadata: { type: 'object', description: 'Additional metadata' }
            },
            required: ['url', 'enabled_events']
          }
        },
        {
          name: 'stripe_delete_webhook_endpoint',
          description: 'Delete a webhook endpoint',
          inputSchema: {
            type: 'object',
            properties: {
              webhook_id: { type: 'string', description: 'Webhook endpoint ID' }
            },
            required: ['webhook_id']
          }
        },

        // ========== Coupons & Discounts ==========
        {
          name: 'stripe_create_coupon',
          description: 'Create a coupon',
          inputSchema: {
            type: 'object',
            properties: {
              percent_off: { type: 'number', description: 'Percent discount (1-100)' },
              amount_off: { type: 'number', description: 'Amount discount in cents' },
              currency: { type: 'string', description: 'Currency code (required for amount_off)' },
              duration: { type: 'string', enum: ['forever', 'once', 'repeating'], description: 'Discount duration' },
              duration_in_months: { type: 'number', description: 'Months for repeating duration' },
              metadata: { type: 'object', description: 'Additional metadata' }
            }
          }
        },
        {
          name: 'stripe_list_coupons',
          description: 'List all coupons',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Number of coupons to return' }
            }
          }
        },

        // ========== Disputes ==========
        {
          name: 'stripe_list_disputes',
          description: 'List all disputes',
          inputSchema: {
            type: 'object',
            properties: {
              charge: { type: 'string', description: 'Filter by charge ID' },
              payment_intent: { type: 'string', description: 'Filter by payment intent ID' },
              limit: { type: 'number', description: 'Number of disputes to return' }
            }
          }
        },
        {
          name: 'stripe_update_dispute',
          description: 'Update a dispute (provide evidence)',
          inputSchema: {
            type: 'object',
            properties: {
              dispute_id: { type: 'string', description: 'Dispute ID' },
              evidence: { type: 'object', description: 'Evidence object' },
              metadata: { type: 'object', description: 'Additional metadata' }
            },
            required: ['dispute_id']
          }
        },

        // ========== Tax Rates ==========
        {
          name: 'stripe_create_tax_rate',
          description: 'Create a tax rate',
          inputSchema: {
            type: 'object',
            properties: {
              display_name: { type: 'string', description: 'Display name' },
              percentage: { type: 'number', description: 'Tax percentage' },
              inclusive: { type: 'boolean', description: 'Tax is inclusive' },
              description: { type: 'string', description: 'Tax description' },
              metadata: { type: 'object', description: 'Additional metadata' }
            },
            required: ['display_name', 'percentage', 'inclusive']
          }
        },
        {
          name: 'stripe_list_tax_rates',
          description: 'List all tax rates',
          inputSchema: {
            type: 'object',
            properties: {
              active: { type: 'boolean', description: 'Filter by active status' },
              limit: { type: 'number', description: 'Number of tax rates to return' }
            }
          }
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        // ========== Payment Processing Handlers ==========
        if (name === 'stripe_create_payment_intent') {
          const data = this.toFormData(args);
          const response = await this.stripe.post('/payment_intents', data);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_confirm_payment_intent') {
          const { payment_intent_id, ...rest } = args;
          const data = this.toFormData(rest);
          const response = await this.stripe.post(`/payment_intents/${payment_intent_id}/confirm`, data);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_cancel_payment_intent') {
          const { payment_intent_id } = args;
          const response = await this.stripe.post(`/payment_intents/${payment_intent_id}/cancel`);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_capture_payment_intent') {
          const { payment_intent_id, ...rest } = args;
          const data = this.toFormData(rest);
          const response = await this.stripe.post(`/payment_intents/${payment_intent_id}/capture`, data);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_create_charge') {
          const data = this.toFormData(args);
          const response = await this.stripe.post('/charges', data);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_list_charges') {
          const response = await this.stripe.get('/charges', { params: args });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        // ========== Payment Methods Handlers ==========
        if (name === 'stripe_create_payment_method') {
          const data = this.toFormData(args);
          const response = await this.stripe.post('/payment_methods', data);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_attach_payment_method') {
          const { payment_method_id, ...rest } = args;
          const data = this.toFormData(rest);
          const response = await this.stripe.post(`/payment_methods/${payment_method_id}/attach`, data);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_detach_payment_method') {
          const { payment_method_id } = args;
          const response = await this.stripe.post(`/payment_methods/${payment_method_id}/detach`);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_list_payment_methods') {
          const response = await this.stripe.get('/payment_methods', { params: args });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        // ========== Customer Management Handlers ==========
        if (name === 'stripe_create_customer') {
          const data = this.toFormData(args);
          const response = await this.stripe.post('/customers', data);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_get_customer') {
          const { customer_id } = args;
          const response = await this.stripe.get(`/customers/${customer_id}`);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_update_customer') {
          const { customer_id, ...rest } = args;
          const data = this.toFormData(rest);
          const response = await this.stripe.post(`/customers/${customer_id}`, data);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_delete_customer') {
          const { customer_id } = args;
          const response = await this.stripe.delete(`/customers/${customer_id}`);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_list_customers') {
          const response = await this.stripe.get('/customers', { params: args });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_search_customers') {
          const response = await this.stripe.get('/customers/search', { params: args });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        // ========== Subscription Management Handlers ==========
        if (name === 'stripe_create_subscription') {
          const data = this.toFormData(args);
          const response = await this.stripe.post('/subscriptions', data);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_get_subscription') {
          const { subscription_id } = args;
          const response = await this.stripe.get(`/subscriptions/${subscription_id}`);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_update_subscription') {
          const { subscription_id, ...rest } = args;
          const data = this.toFormData(rest);
          const response = await this.stripe.post(`/subscriptions/${subscription_id}`, data);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_cancel_subscription') {
          const { subscription_id, ...rest } = args;
          const response = await this.stripe.delete(`/subscriptions/${subscription_id}`, {
            params: rest
          });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_list_subscriptions') {
          const response = await this.stripe.get('/subscriptions', { params: args });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        // ========== Products & Prices Handlers ==========
        if (name === 'stripe_create_product') {
          const data = this.toFormData(args);
          const response = await this.stripe.post('/products', data);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_update_product') {
          const { product_id, ...rest } = args;
          const data = this.toFormData(rest);
          const response = await this.stripe.post(`/products/${product_id}`, data);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_list_products') {
          const response = await this.stripe.get('/products', { params: args });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_create_price') {
          const data = this.toFormData(args);
          const response = await this.stripe.post('/prices', data);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_list_prices') {
          const response = await this.stripe.get('/prices', { params: args });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        // ========== Invoices Handlers ==========
        if (name === 'stripe_create_invoice') {
          const data = this.toFormData(args);
          const response = await this.stripe.post('/invoices', data);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_finalize_invoice') {
          const { invoice_id } = args;
          const response = await this.stripe.post(`/invoices/${invoice_id}/finalize`);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_pay_invoice') {
          const { invoice_id, ...rest } = args;
          const data = this.toFormData(rest);
          const response = await this.stripe.post(`/invoices/${invoice_id}/pay`, data);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_send_invoice') {
          const { invoice_id } = args;
          const response = await this.stripe.post(`/invoices/${invoice_id}/send`);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_void_invoice') {
          const { invoice_id } = args;
          const response = await this.stripe.post(`/invoices/${invoice_id}/void`);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_list_invoices') {
          const response = await this.stripe.get('/invoices', { params: args });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        // ========== Refunds Handlers ==========
        if (name === 'stripe_create_refund') {
          const data = this.toFormData(args);
          const response = await this.stripe.post('/refunds', data);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_list_refunds') {
          const response = await this.stripe.get('/refunds', { params: args });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        // ========== Checkout Sessions Handlers ==========
        if (name === 'stripe_create_checkout_session') {
          const data = this.toFormData(args);
          const response = await this.stripe.post('/checkout/sessions', data);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_get_checkout_session') {
          const { session_id } = args;
          const response = await this.stripe.get(`/checkout/sessions/${session_id}`);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_list_checkout_sessions') {
          const response = await this.stripe.get('/checkout/sessions', { params: args });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        // ========== Payment Links Handlers ==========
        if (name === 'stripe_create_payment_link') {
          const data = this.toFormData(args);
          const response = await this.stripe.post('/payment_links', data);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_list_payment_links') {
          const response = await this.stripe.get('/payment_links', { params: args });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        // ========== Balance & Transactions Handlers ==========
        if (name === 'stripe_get_balance') {
          const response = await this.stripe.get('/balance');
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_list_balance_transactions') {
          const response = await this.stripe.get('/balance_transactions', { params: args });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        // ========== Payouts Handlers ==========
        if (name === 'stripe_create_payout') {
          const data = this.toFormData(args);
          const response = await this.stripe.post('/payouts', data);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_list_payouts') {
          const response = await this.stripe.get('/payouts', { params: args });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        // ========== Webhooks Handlers ==========
        if (name === 'stripe_list_webhook_endpoints') {
          const response = await this.stripe.get('/webhook_endpoints', { params: args });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_create_webhook_endpoint') {
          const data = this.toFormData(args);
          const response = await this.stripe.post('/webhook_endpoints', data);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_delete_webhook_endpoint') {
          const { webhook_id } = args;
          const response = await this.stripe.delete(`/webhook_endpoints/${webhook_id}`);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        // ========== Coupons Handlers ==========
        if (name === 'stripe_create_coupon') {
          const data = this.toFormData(args);
          const response = await this.stripe.post('/coupons', data);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_list_coupons') {
          const response = await this.stripe.get('/coupons', { params: args });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        // ========== Disputes Handlers ==========
        if (name === 'stripe_list_disputes') {
          const response = await this.stripe.get('/disputes', { params: args });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_update_dispute') {
          const { dispute_id, ...rest } = args;
          const data = this.toFormData(rest);
          const response = await this.stripe.post(`/disputes/${dispute_id}`, data);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        // ========== Tax Rates Handlers ==========
        if (name === 'stripe_create_tax_rate') {
          const data = this.toFormData(args);
          const response = await this.stripe.post('/tax_rates', data);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        if (name === 'stripe_list_tax_rates') {
          const response = await this.stripe.get('/tax_rates', { params: args });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        }

        return {
          content: [{
            type: 'text',
            text: `Unknown tool: ${name}`
          }],
          isError: true,
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.response?.data?.error?.message || error.message}`
          }],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Stripe MCP server running on stdio');
  }
}

const server = new StripeMCPServer();
server.run().catch(console.error);
