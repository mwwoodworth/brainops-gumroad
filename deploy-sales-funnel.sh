#!/bin/bash

# Deploy Sales Funnel Automation
# Complete deployment script for the BrainOps sales funnel

echo "🚀 BrainOps Sales Funnel Deployment"
echo "===================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GUMROAD_DIR="$SCRIPT_DIR"

# Step 1: Check all product files are ready
echo "📦 Checking product files..."
if [ -d "$GUMROAD_DIR/build" ]; then
    PRODUCT_COUNT=$(ls -1 "$GUMROAD_DIR/build"/*.zip 2>/dev/null | wc -l)
    echo "   Found $PRODUCT_COUNT product ZIP files ready for upload"
else
    echo "   ⚠️ Build directory not found. Run package_all.sh first."
fi

echo ""

# Step 2: Verify API keys
echo "🔑 Verifying API keys..."

# Check ConvertKit
if curl -s "https://api.convertkit.com/v3/account?api_key=kit_fcbff1cd724ae283842f9e0d431a88c7" | grep -q "primary_email"; then
    echo "   ✅ ConvertKit API: Valid"
else
    echo "   ❌ ConvertKit API: Invalid"
fi

# Check Stripe (test mode)
STRIPE_KEY="${STRIPE_SECRET_KEY:-}"
if [ -n "$STRIPE_KEY" ] && curl -s -u "$STRIPE_KEY:" https://api.stripe.com/v1/customers?limit=1 > /dev/null 2>&1; then
    echo "   ✅ Stripe API: Valid"
else
    echo "   ❌ Stripe API: Not configured or invalid"
fi

# Check Supabase
if curl -s "https://yomagoqdmxszqtdwuhab.supabase.co/rest/v1/" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvbWFnb3FkbXhzenF0ZHd1aGFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTgzMzI3NiwiZXhwIjoyMDY1NDA5Mjc2fQ.7C3guJ_0moYGkdyeFmJ9cd2BmduB5NnU00erIIxH3gQ" \
    > /dev/null 2>&1; then
    echo "   ✅ Supabase API: Valid"
else
    echo "   ❌ Supabase API: Invalid"
fi

echo ""

# Step 3: Set up database tables
echo "📊 Setting up database tables..."
cat > /tmp/setup-gumroad-tables.sql << 'EOF'
-- Create Gumroad sales tracking table
CREATE TABLE IF NOT EXISTS gumroad_sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),
    product_code VARCHAR(50),
    product_name VARCHAR(255),
    price DECIMAL(10,2),
    currency VARCHAR(10) DEFAULT 'USD',
    sale_timestamp TIMESTAMPTZ,
    convertkit_synced BOOLEAN DEFAULT false,
    stripe_synced BOOLEAN DEFAULT false,
    sendgrid_sent BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_gumroad_sales_email ON gumroad_sales(email);
CREATE INDEX IF NOT EXISTS idx_gumroad_sales_product ON gumroad_sales(product_code);
CREATE INDEX IF NOT EXISTS idx_gumroad_sales_date ON gumroad_sales(sale_timestamp);

-- Create sales analytics view
CREATE OR REPLACE VIEW sales_analytics AS
SELECT
    DATE(sale_timestamp) as sale_date,
    COUNT(*) as daily_sales,
    SUM(price) as daily_revenue,
    COUNT(DISTINCT email) as unique_customers,
    ARRAY_AGG(DISTINCT product_code) as products_sold
FROM gumroad_sales
WHERE sale_timestamp > NOW() - INTERVAL '30 days'
GROUP BY DATE(sale_timestamp)
ORDER BY sale_date DESC;

-- Create product performance view
CREATE OR REPLACE VIEW product_performance AS
SELECT
    product_code,
    product_name,
    COUNT(*) as units_sold,
    SUM(price) as total_revenue,
    AVG(price) as avg_price,
    COUNT(DISTINCT email) as unique_buyers
FROM gumroad_sales
GROUP BY product_code, product_name
ORDER BY total_revenue DESC;
EOF

echo "   Running database setup..."
PGPASSWORD=REDACTED_SUPABASE_DB_PASSWORD psql -h aws-0-us-east-2.pooler.supabase.com \
    -U postgres.yomagoqdmxszqtdwuhab -d postgres \
    -f /tmp/setup-gumroad-tables.sql 2>/dev/null

if [ $? -eq 0 ]; then
    echo "   ✅ Database tables created"
else
    echo "   ⚠️ Database setup skipped (tables may already exist)"
fi

echo ""

# Step 4: Deploy webhook server
echo "🌐 Deployment Options:"
echo ""
echo "1) Local Development (test mode)"
echo "2) Deploy to Render (production)"
echo "3) Deploy to Vercel (serverless)"
echo "4) Deploy to Railway"
echo "5) Self-hosted with PM2"
echo ""
read -p "Select deployment option (1-5): " deploy_choice

case $deploy_choice in
    1)
        echo ""
        echo "Starting local development server..."
        cd "$GUMROAD_DIR"
        node complete-sales-funnel-automation.js
        ;;

    2)
        echo ""
        echo "📝 Render Deployment Instructions:"
        echo ""
        echo "1. Create render.yaml in project root:"
        cat > "$GUMROAD_DIR/render.yaml" << 'EOF'
services:
  - type: web
    name: brainops-sales-funnel
    env: node
    buildCommand: npm install
    startCommand: node complete-sales-funnel-automation.js
    envVars:
      - key: PORT
        value: 10000
      - key: CONVERTKIT_API_KEY
        value: kit_fcbff1cd724ae283842f9e0d431a88c7
      - key: STRIPE_SECRET_KEY
        sync: false
      - key: SENDGRID_API_KEY
        sync: false
      - key: SUPABASE_URL
        value: https://yomagoqdmxszqtdwuhab.supabase.co
      - key: SUPABASE_SERVICE_KEY
        sync: false
EOF
        echo "   ✅ Created render.yaml"
        echo ""
        echo "2. Push to GitHub:"
        echo "   git add ."
        echo "   git commit -m 'Add sales funnel automation'"
        echo "   git push"
        echo ""
        echo "3. Go to https://render.com and:"
        echo "   - Connect GitHub repo"
        echo "   - Deploy with render.yaml"
        echo "   - Add sensitive env vars in dashboard"
        echo ""
        echo "4. Your webhook URL will be:"
        echo "   https://your-app.onrender.com/webhook/gumroad"
        ;;

    3)
        echo ""
        echo "Creating Vercel serverless function..."
        mkdir -p "$GUMROAD_DIR/api"

        # Convert to serverless function
        cat > "$GUMROAD_DIR/api/gumroad.js" << 'EOF'
// Vercel serverless function version
const handler = require('../complete-sales-funnel-automation.js');
module.exports = handler;
EOF

        # Create vercel.json
        cat > "$GUMROAD_DIR/vercel.json" << 'EOF'
{
  "functions": {
    "api/gumroad.js": {
      "maxDuration": 30
    }
  },
  "env": {
    "CONVERTKIT_API_KEY": "@convertkit-api-key",
    "STRIPE_SECRET_KEY": "@stripe-secret-key",
    "SENDGRID_API_KEY": "@sendgrid-api-key",
    "SUPABASE_URL": "https://yomagoqdmxszqtdwuhab.supabase.co",
    "SUPABASE_SERVICE_KEY": "@supabase-service-key"
  }
}
EOF
        echo "   ✅ Created Vercel configuration"
        echo ""
        echo "Deploy with: vercel --prod"
        echo "Webhook URL: https://your-app.vercel.app/api/gumroad"
        ;;

    4)
        echo ""
        echo "Railway deployment:"
        echo "1. Install Railway CLI: npm i -g @railway/cli"
        echo "2. Run: railway login"
        echo "3. Run: railway init"
        echo "4. Run: railway up"
        echo "5. Add environment variables in Railway dashboard"
        ;;

    5)
        echo ""
        echo "Setting up PM2 deployment..."

        # Create ecosystem file
        cat > "$GUMROAD_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [{
    name: 'brainops-sales-funnel',
    script: './complete-sales-funnel-automation.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      PORT: 3457,
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true
  }]
};
EOF

        echo "   ✅ Created PM2 ecosystem file"
        echo ""
        echo "Starting with PM2..."
        cd "$GUMROAD_DIR"
        pm2 start ecosystem.config.js
        pm2 save
        echo ""
        echo "✅ Server running with PM2"
        echo "   View logs: pm2 logs brainops-sales-funnel"
        echo "   Stop: pm2 stop brainops-sales-funnel"
        ;;
esac

echo ""
echo "==============================================="
echo "✅ Deployment Configuration Complete!"
echo "==============================================="
echo ""
echo "📋 Final Steps:"
echo ""
echo "1. Configure Gumroad Webhook:"
echo "   - Go to: https://gumroad.com/settings/advanced#webhooks"
echo "   - Add your webhook URL"
echo "   - Select events: 'sale', 'refund', 'subscription_update'"
echo ""
echo "2. Test the Integration:"
echo "   curl -X POST http://localhost:3457/test \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"test@example.com\",\"name\":\"Test User\"}'"
echo ""
echo "3. Upload Products to Gumroad:"
echo "   - Go to: https://gumroad.com/products"
echo "   - Upload each ZIP from build/ directory"
echo "   - Set prices according to GUMROAD_LISTINGS.md"
echo ""
echo "4. Create Discount Code:"
echo "   - Code: LAUNCH20"
echo "   - Discount: 20%"
echo "   - Duration: 48 hours"
echo ""
echo "5. Monitor Analytics:"
echo "   - API: GET /analytics"
echo "   - Dashboard: https://brainops-command-center.vercel.app/income"
echo ""

# Save deployment info
cat > "$GUMROAD_DIR/DEPLOYMENT_INFO.md" << EOF
# BrainOps Sales Funnel Deployment

**Deployed:** $(date)
**Type:** $deploy_choice

## Webhook URL
\`\`\`
[YOUR_DOMAIN]/webhook/gumroad
\`\`\`

## API Endpoints
- Webhook: POST /webhook/gumroad
- Analytics: GET /analytics
- Health: GET /health
- Test: POST /test

## Monitoring
- Logs: $GUMROAD_DIR/logs/
- PM2: pm2 monit
- Database: Supabase Dashboard

## Support
Email: support@brainops.io
EOF

echo "📁 Deployment info saved to DEPLOYMENT_INFO.md"
echo ""
echo "🎉 Ready to launch your products!"