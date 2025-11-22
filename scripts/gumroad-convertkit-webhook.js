#!/usr/bin/env node

/**
 * Gumroad to ConvertKit Webhook Integration
 * Automatically adds Gumroad customers to ConvertKit email sequence
 *
 * Deploy this as a webhook endpoint for Gumroad sales notifications
 */

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuration
const CONVERTKIT_API_KEY = 'kit_fcbff1cd724ae283842f9e0d431a88c7';
const GUMROAD_WEBHOOK_SECRET = process.env.GUMROAD_WEBHOOK_SECRET || '';
const PORT = process.env.PORT || 3456;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ConvertKit API base URL
const convertKitAPI = 'https://api.convertkit.com/v3';

// Product to tag mapping (customize based on your products)
const productTagMapping = {
  'GR-ROOFINT': 'roofing-intelligence-buyer',
  'GR-PMACC': 'pm-accelerator-buyer',
  'GR-LAUNCH': 'launch-optimizer-buyer',
  'GR-ONBOARD': 'onboarding-system-buyer',
  'GR-CONTENT': 'content-pipeline-buyer',
  'GR-ROOFVAL': 'roofing-validator-buyer',
  'GR-ERP-START': 'erp-starter-buyer',
  'GR-AI-ORCH': 'ai-orchestrator-buyer',
  'GR-UI-KIT': 'ui-kit-buyer',
  'GR-ULTIMATE': 'ultimate-bundle-buyer'
};

/**
 * Add subscriber to ConvertKit
 */
async function addToConvertKit(email, firstName, lastName, productCode) {
  try {
    // Get or create the subscriber
    const subscriberData = {
      api_key: CONVERTKIT_API_KEY,
      email: email,
      first_name: firstName,
      fields: {
        last_name: lastName,
        gumroad_customer: 'true',
        last_purchase: new Date().toISOString(),
        purchased_products: productCode
      }
    };

    const response = await axios.post(
      `${convertKitAPI}/forms/${process.env.CONVERTKIT_FORM_ID || 'bulk'}/subscribe`,
      subscriberData
    );

    // Add tag based on product purchased
    const tag = productTagMapping[productCode];
    if (tag && response.data.subscription?.subscriber?.id) {
      await axios.post(
        `${convertKitAPI}/tags/${tag}/subscribe`,
        {
          api_key: CONVERTKIT_API_KEY,
          email: email
        }
      );
    }

    return response.data;
  } catch (error) {
    console.error('ConvertKit API error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Process Gumroad webhook
 */
app.post('/webhook/gumroad', async (req, res) => {
  console.log('📦 Received Gumroad webhook');

  try {
    // Verify webhook signature if secret is configured
    if (GUMROAD_WEBHOOK_SECRET) {
      const signature = req.headers['x-gumroad-signature'];
      const expectedSig = crypto
        .createHmac('sha256', GUMROAD_WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== expectedSig) {
        console.error('❌ Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Extract customer data from Gumroad webhook
    const {
      email,
      full_name = '',
      product_name,
      product_permalink,
      sale_id,
      sale_timestamp
    } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Parse name
    const nameParts = full_name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Extract product code from permalink or name
    let productCode = product_permalink?.toUpperCase() || '';
    if (!productCode) {
      // Try to extract from product name
      for (const code of Object.keys(productTagMapping)) {
        if (product_name?.includes(code)) {
          productCode = code;
          break;
        }
      }
    }

    console.log(`📧 Adding ${email} to ConvertKit...`);
    console.log(`   Product: ${product_name} (${productCode})`);

    // Add to ConvertKit
    const result = await addToConvertKit(email, firstName, lastName, productCode);

    // Log the sale
    const logEntry = {
      timestamp: new Date().toISOString(),
      sale_id,
      email,
      product: product_name,
      product_code: productCode,
      convertkit_result: result.subscription ? 'success' : 'failed'
    };

    // Append to log file
    const logFile = path.join(__dirname, '../logs/webhook-log.json');
    const logs = fs.existsSync(logFile)
      ? JSON.parse(fs.readFileSync(logFile, 'utf8'))
      : [];
    logs.push(logEntry);
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));

    console.log('✅ Successfully processed webhook');
    res.json({
      success: true,
      message: 'Customer added to ConvertKit',
      convertkit_id: result.subscription?.subscriber?.id
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
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Gumroad-ConvertKit Integration',
    timestamp: new Date().toISOString()
  });
});

/**
 * Manual test endpoint
 */
app.post('/test', async (req, res) => {
  const testData = {
    email: req.body.email || 'test@example.com',
    full_name: req.body.name || 'Test User',
    product_name: 'Test Product (GR-ULTIMATE)',
    product_permalink: 'gr-ultimate',
    sale_id: 'TEST-' + Date.now(),
    sale_timestamp: new Date().toISOString()
  };

  console.log('🧪 Running test with:', testData);

  try {
    // Process as if it's a real webhook
    req.body = testData;
    await app._router.handle(req, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Gumroad-ConvertKit Webhook Server Running');
  console.log(`📍 Listening on port ${PORT}`);
  console.log(`🔗 Webhook URL: http://localhost:${PORT}/webhook/gumroad`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/test`);
  console.log('\n📝 Configuration:');
  console.log(`   ConvertKit API Key: ${CONVERTKIT_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   Gumroad Secret: ${GUMROAD_WEBHOOK_SECRET ? '✅ Configured' : '⚠️ Not set (webhooks unverified)'}`);
  console.log('\n💡 Next steps:');
  console.log('   1. Deploy this server to a public URL (e.g., Render, Railway)');
  console.log('   2. Add the webhook URL to Gumroad settings');
  console.log('   3. Set GUMROAD_WEBHOOK_SECRET environment variable');
  console.log('   4. Test with a real purchase or use /test endpoint');
});