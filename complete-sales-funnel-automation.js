#!/usr/bin/env node

/**
 * Complete Sales Funnel Automation
 * Integrates Gumroad, ConvertKit, Stripe, SendGrid, and Supabase
 *
 * This is the master automation that handles the entire sales funnel
 */

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load environment variables (prefer canonical BrainOps env file).
require('dotenv').config({
  path: process.env.BRAINOPS_ENV_FILE || '/home/matt-woodworth/dev/_secure/BrainOps.env',
});

// Configuration
const config = {
  // ConvertKit
  CONVERTKIT_API_KEY: process.env.CONVERTKIT_API_KEY,
  CONVERTKIT_API_SECRET: process.env.CONVERTKIT_API_SECRET,
  CONVERTKIT_FORM_ID: process.env.CONVERTKIT_FORM_ID || '8419539',

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',

  // SendGrid
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',

  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://yomagoqdmxszqtdwuhab.supabase.co',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,

  // Gumroad
  GUMROAD_WEBHOOK_SECRET: process.env.GUMROAD_WEBHOOK_SECRET || '',

  // Server
  PORT: process.env.PORT || 3457
};

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Product mapping
const productMapping = {
  // AI Prompt Packs
  'GR-ROOFINT': {
    name: 'Commercial Roofing Intelligence Bundle',
    price: 97,
    type: 'prompt_pack',
    convertkit_tag: 'roofing-intelligence-buyer',
    stripe_product: 'prod_roofing_intel'
  },
  'GR-PMACC': {
    name: 'AI-Enhanced Project Management Accelerator',
    price: 127,
    type: 'prompt_pack',
    convertkit_tag: 'pm-accelerator-buyer',
    stripe_product: 'prod_pm_accel'
  },
  'GR-LAUNCH': {
    name: 'Digital Product Launch Optimizer',
    price: 147,
    type: 'prompt_pack',
    convertkit_tag: 'launch-optimizer-buyer',
    stripe_product: 'prod_launch_opt'
  },

  // Automation Packs
  'GR-ONBOARD': {
    name: 'Intelligent Client Onboarding System',
    price: 297,
    type: 'automation',
    convertkit_tag: 'onboarding-system-buyer',
    stripe_product: 'prod_onboard_auto'
  },
  'GR-CONTENT': {
    name: 'AI-Powered Content Production Pipeline',
    price: 347,
    type: 'automation',
    convertkit_tag: 'content-pipeline-buyer',
    stripe_product: 'prod_content_auto'
  },
  'GR-ROOFVAL': {
    name: 'Commercial Roofing Estimation Validator',
    price: 497,
    type: 'automation',
    convertkit_tag: 'roofing-validator-buyer',
    stripe_product: 'prod_roofval_auto'
  },

  // Code Starter Kits
  'GR-ERP-START': {
    name: 'SaaS ERP Starter Kit',
    price: 197,
    type: 'code_kit',
    convertkit_tag: 'erp-starter-buyer',
    stripe_product: 'prod_erp_starter'
  },
  'GR-AI-ORCH': {
    name: 'BrainOps AI Orchestrator Framework',
    price: 147,
    type: 'code_kit',
    convertkit_tag: 'ai-orchestrator-buyer',
    stripe_product: 'prod_ai_orch'
  },
  'GR-UI-KIT': {
    name: 'Modern Command Center UI Kit',
    price: 97,
    type: 'code_kit',
    convertkit_tag: 'ui-kit-buyer',
    stripe_product: 'prod_ui_kit'
  },

  // Ultimate Bundle
  'GR-ULTIMATE': {
    name: 'Ultimate All-Access Bundle',
    price: 997,
    type: 'bundle',
    convertkit_tag: 'ultimate-bundle-buyer',
    stripe_product: 'prod_ultimate_bundle'
  }
};

/**
 * Add customer to ConvertKit
 */
async function addToConvertKit(email, firstName, lastName, productCode, purchaseData) {
  try {
    const subscriberData = {
      api_key: config.CONVERTKIT_API_KEY,
      email: email,
      first_name: firstName,
      fields: {
        last_name: lastName,
        gumroad_customer: 'true',
        last_purchase: new Date().toISOString(),
        purchased_products: productCode,
        total_spent: purchaseData.price || 0,
        purchase_count: 1
      }
    };

    const response = await axios.post(
      `https://api.convertkit.com/v3/forms/${config.CONVERTKIT_FORM_ID}/subscribe`,
      subscriberData
    );

    // Add product-specific tag
    const product = productMapping[productCode];
    if (product && response.data.subscription?.subscriber?.id) {
      await axios.post(
        `https://api.convertkit.com/v3/tags/${product.convertkit_tag}/subscribe`,
        {
          api_key: config.CONVERTKIT_API_KEY,
          email: email
        }
      );
    }

    return response.data;
  } catch (error) {
    console.error('ConvertKit error:', error.message);
    throw error;
  }
}

/**
 * Send transactional email via SendGrid
 */
async function sendPurchaseEmail(email, name, product, downloadUrl) {
  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(config.SENDGRID_API_KEY);

    const msg = {
      to: email,
      from: 'support@brainops.io',
      subject: `Your ${product.name} is ready!`,
      text: `Hi ${name},\n\nThank you for purchasing ${product.name}!\n\nDownload your product here: ${downloadUrl}\n\nBest,\nBrainOps Team`,
      html: `
        <h2>Hi ${name},</h2>
        <p>Thank you for purchasing <strong>${product.name}</strong>!</p>
        <p><a href="${downloadUrl}" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Download Your Product</a></p>
        <p>If you have any questions, reply to this email.</p>
        <p>Best,<br>BrainOps Team</p>
      `
    };

    await sgMail.send(msg);
    console.log(`✅ Purchase email sent to ${email}`);
  } catch (error) {
    console.error('SendGrid error:', error.message);
  }
}

/**
 * Record sale in Supabase
 */
async function recordSale(saleData) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

    const { data, error } = await supabase
      .from('gumroad_sales')
      .insert([{
        sale_id: saleData.sale_id,
        email: saleData.email,
        customer_name: saleData.full_name,
        product_code: saleData.product_code,
        product_name: saleData.product_name,
        price: saleData.price,
        currency: saleData.currency || 'USD',
        sale_timestamp: saleData.sale_timestamp,
        convertkit_synced: true,
        stripe_synced: false,
        metadata: saleData
      }]);

    if (error) throw error;
    console.log(`✅ Sale recorded in database: ${saleData.sale_id}`);
    return data;
  } catch (error) {
    console.error('Supabase error:', error.message);
  }
}

/**
 * Create Stripe customer and record purchase
 */
async function createStripeRecord(email, name, productCode, saleData) {
  try {
    const stripe = require('stripe')(config.STRIPE_SECRET_KEY);

    // Check if customer exists
    const customers = await stripe.customers.list({ email: email, limit: 1 });
    let customer;

    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      // Create new customer
      customer = await stripe.customers.create({
        email: email,
        name: name,
        metadata: {
          source: 'gumroad',
          first_purchase: productCode
        }
      });
    }

    // Record the purchase metadata
    await stripe.customers.update(customer.id, {
      metadata: {
        ...customer.metadata,
        last_purchase: productCode,
        last_purchase_date: new Date().toISOString(),
        gumroad_sale_id: saleData.sale_id
      }
    });

    console.log(`✅ Stripe customer updated: ${customer.id}`);
    return customer;
  } catch (error) {
    console.error('Stripe error:', error.message);
  }
}

/**
 * Main webhook handler for Gumroad
 */
app.post('/webhook/gumroad', async (req, res) => {
  console.log('🎯 Received Gumroad sale notification');

  try {
    // Verify webhook signature if configured
    if (config.GUMROAD_WEBHOOK_SECRET) {
      const signature = req.headers['x-gumroad-signature'];
      const expectedSig = crypto
        .createHmac('sha256', config.GUMROAD_WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== expectedSig) {
        console.error('❌ Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Extract sale data
    const {
      email,
      full_name = '',
      product_name,
      product_permalink,
      sale_id,
      sale_timestamp,
      price,
      currency,
      download_url
    } = req.body;

    if (!email || !product_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Parse customer name
    const nameParts = full_name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Identify product
    let productCode = product_permalink?.toUpperCase() || '';
    if (!productCode) {
      for (const code of Object.keys(productMapping)) {
        if (product_name.includes(code)) {
          productCode = code;
          break;
        }
      }
    }

    const product = productMapping[productCode] || {
      name: product_name,
      type: 'unknown',
      convertkit_tag: 'gumroad-buyer'
    };

    console.log(`
    📦 Sale Details:
    - Customer: ${full_name} (${email})
    - Product: ${product.name} (${productCode})
    - Price: ${price} ${currency || 'USD'}
    - Sale ID: ${sale_id}
    `);

    // Process the sale through all systems
    const results = await Promise.allSettled([
      // 1. Add to ConvertKit email sequence
      addToConvertKit(email, firstName, lastName, productCode, { price }),

      // 2. Send purchase confirmation email
      sendPurchaseEmail(email, firstName, product, download_url || 'https://gumroad.com/library'),

      // 3. Record in database
      recordSale({
        sale_id,
        email,
        full_name,
        product_code: productCode,
        product_name: product.name,
        price,
        currency,
        sale_timestamp
      }),

      // 4. Create/update Stripe customer
      createStripeRecord(email, full_name, productCode, { sale_id })
    ]);

    // Log results
    const [convertkit, sendgrid, database, stripe] = results;

    console.log(`
    ✅ Automation Results:
    - ConvertKit: ${convertkit.status === 'fulfilled' ? '✅' : '❌'}
    - Email: ${sendgrid.status === 'fulfilled' ? '✅' : '❌'}
    - Database: ${database.status === 'fulfilled' ? '✅' : '❌'}
    - Stripe: ${stripe.status === 'fulfilled' ? '✅' : '❌'}
    `);

    // Log to file for audit
    const logEntry = {
      timestamp: new Date().toISOString(),
      sale_id,
      email,
      product: productCode,
      price,
      results: {
        convertkit: convertkit.status,
        email: sendgrid.status,
        database: database.status,
        stripe: stripe.status
      }
    };

    const logFile = path.join(__dirname, 'logs', 'sales-funnel.log');
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');

    res.json({
      success: true,
      message: 'Sale processed through all systems',
      sale_id,
      results: {
        convertkit: convertkit.status === 'fulfilled',
        email: sendgrid.status === 'fulfilled',
        database: database.status === 'fulfilled',
        stripe: stripe.status === 'fulfilled'
      }
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({
      error: 'Failed to process webhook',
      message: error.message
    });
  }
});

/**
 * Analytics endpoint
 */
app.get('/analytics', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

    // Get sales data
    const { data: sales } = await supabase
      .from('gumroad_sales')
      .select('*')
      .order('sale_timestamp', { ascending: false })
      .limit(100);

    // Calculate metrics
    const metrics = {
      total_sales: sales?.length || 0,
      total_revenue: sales?.reduce((sum, sale) => sum + (parseFloat(sale.price) || 0), 0) || 0,
      products_sold: {},
      conversion_rate: 0,
      top_products: []
    };

    // Count products
    sales?.forEach(sale => {
      const code = sale.product_code || 'unknown';
      metrics.products_sold[code] = (metrics.products_sold[code] || 0) + 1;
    });

    // Get top products
    metrics.top_products = Object.entries(metrics.products_sold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, count]) => ({ code, count, name: productMapping[code]?.name || code }));

    res.json({
      success: true,
      metrics,
      recent_sales: sales?.slice(0, 10)
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'BrainOps Sales Funnel Automation',
    timestamp: new Date().toISOString(),
    integrations: {
      convertkit: !!config.CONVERTKIT_API_KEY,
      stripe: !!config.STRIPE_SECRET_KEY,
      sendgrid: !!config.SENDGRID_API_KEY,
      supabase: !!config.SUPABASE_URL
    }
  });
});

/**
 * Test endpoint
 */
app.post('/test', async (req, res) => {
  const testData = {
    email: req.body.email || 'test@example.com',
    full_name: req.body.name || 'Test User',
    product_name: req.body.product || 'Ultimate All-Access Bundle (GR-ULTIMATE)',
    product_permalink: 'gr-ultimate',
    sale_id: `TEST-${Date.now()}`,
    sale_timestamp: new Date().toISOString(),
    price: '997.00',
    currency: 'USD',
    download_url: 'https://gumroad.com/library'
  };

  console.log('🧪 Running test sale:', testData);

  try {
    // Process as real webhook
    req.body = testData;
    await app._router.handle(req, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create logs directory
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Start server
app.listen(config.PORT, () => {
  console.log(`
  🚀 BrainOps Sales Funnel Automation Server
  ==========================================

  📍 Server: http://localhost:${config.PORT}

  🔗 Endpoints:
  - Webhook: POST /webhook/gumroad
  - Analytics: GET /analytics
  - Health: GET /health
  - Test: POST /test

  ✅ Integrations:
  - ConvertKit: ${config.CONVERTKIT_API_KEY ? 'Connected' : 'Missing'}
  - Stripe: ${config.STRIPE_SECRET_KEY ? 'Connected' : 'Missing'}
  - SendGrid: ${config.SENDGRID_API_KEY ? 'Connected' : 'Missing'}
  - Supabase: ${config.SUPABASE_URL ? 'Connected' : 'Missing'}

  📊 Products Configured: ${Object.keys(productMapping).length}

  💡 Next Steps:
  1. Deploy to production (Render/Railway/Vercel)
  2. Add webhook URL to Gumroad settings
  3. Test with real purchase
  4. Monitor analytics dashboard
  `);
});
