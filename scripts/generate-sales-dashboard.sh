#!/bin/bash

##############################################################################
# BRAINOPS REVENUE ENGINE - SALES DASHBOARD GENERATOR
# Creates a real-time sales monitoring dashboard in BrainOps Command Center
##############################################################################

DB_HOST="aws-0-us-east-2.pooler.supabase.com"
DB_USER="postgres.yomagoqdmxszqtdwuhab"
DB_PASS="REDACTED_SUPABASE_DB_PASSWORD"
DB_NAME="postgres"

echo "📊 Creating BrainOps Sales Dashboard..."
echo "════════════════════════════════════════"
echo ""

# Create sales tracking table
echo "Creating revenue_tracking table..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME << 'EOFDB'
-- Create revenue tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS revenue_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  source VARCHAR(50) NOT NULL, -- 'gumroad', 'stripe', 'paypal', etc.
  product_sku VARCHAR(50),
  product_name VARCHAR(255),
  quantity INTEGER DEFAULT 1,
  revenue_usd DECIMAL(10,2) NOT NULL,
  fees_usd DECIMAL(10,2) DEFAULT 0,
  net_revenue_usd DECIMAL(10,2) NOT NULL,
  customer_email VARCHAR(255),
  order_id VARCHAR(100),
  traffic_source VARCHAR(100), -- 'email', 'social', 'reddit', 'direct', etc.
  discount_code VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_revenue_date ON revenue_tracking(date);
CREATE INDEX IF NOT EXISTS idx_revenue_source ON revenue_tracking(source);
CREATE INDEX IF NOT EXISTS idx_revenue_product ON revenue_tracking(product_sku);

-- Create view for daily summary
CREATE OR REPLACE VIEW revenue_daily_summary AS
SELECT
  date,
  SUM(revenue_usd) as total_revenue,
  SUM(net_revenue_usd) as total_net_revenue,
  SUM(fees_usd) as total_fees,
  COUNT(*) as transaction_count,
  AVG(revenue_usd) as avg_order_value,
  COUNT(DISTINCT product_sku) as products_sold
FROM revenue_tracking
GROUP BY date
ORDER BY date DESC;

-- Create view for product performance
CREATE OR REPLACE VIEW revenue_by_product AS
SELECT
  product_sku,
  product_name,
  COUNT(*) as sales_count,
  SUM(quantity) as units_sold,
  SUM(revenue_usd) as total_revenue,
  AVG(revenue_usd) as avg_price,
  MAX(date) as last_sale_date
FROM revenue_tracking
GROUP BY product_sku, product_name
ORDER BY total_revenue DESC;

-- Create view for traffic source performance
CREATE OR REPLACE VIEW revenue_by_traffic_source AS
SELECT
  traffic_source,
  COUNT(*) as sales_count,
  SUM(revenue_usd) as total_revenue,
  AVG(revenue_usd) as avg_order_value,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percent_of_sales
FROM revenue_tracking
WHERE traffic_source IS NOT NULL
GROUP BY traffic_source
ORDER BY total_revenue DESC;

EOFDB

echo "✅ Database tables and views created"
echo ""

# Create import script for Gumroad sales
cat > /home/matt-woodworth/dev/brainops-gumroad/scripts/import-gumroad-sales.sh << 'EOFIMPORT'
#!/bin/bash

# Import Gumroad sales from CSV to database
CSV_FILE="/home/matt-woodworth/dev/brainops-gumroad/logs/gumroad_daily_sales.csv"
DB_HOST="aws-0-us-east-2.pooler.supabase.com"
DB_USER="postgres.yomagoqdmxszqtdwuhab"
DB_PASS="REDACTED_SUPABASE_DB_PASSWORD"
DB_NAME="postgres"

if [ ! -f "$CSV_FILE" ]; then
  echo "❌ CSV file not found: $CSV_FILE"
  exit 1
fi

echo "📥 Importing Gumroad sales from CSV..."

# Skip header, read each line
tail -n +2 "$CSV_FILE" | while IFS=',' read -r date total_sales revenue top_product avg_order email social direct other; do

  # Insert daily aggregated data
  PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
    INSERT INTO revenue_tracking (
      date, source, product_name, quantity, revenue_usd, net_revenue_usd, traffic_source, metadata
    ) VALUES (
      '$date', 'gumroad', 'Daily Aggregate', $total_sales, $revenue, $revenue * 0.91, 'mixed',
      '{\"email_sales\": $email, \"social_sales\": $social, \"direct_sales\": $direct, \"other_sales\": $other, \"top_product\": \"$top_product\", \"avg_order_value\": $avg_order}'::jsonb
    );
  "

  echo "✅ Imported: $date - $total_sales sales, \$$revenue"
done

echo ""
echo "✅ Import complete!"
echo "📊 View dashboard: https://brainops-command-center.vercel.app/income"
EOFIMPORT

chmod +x /home/matt-woodworth/dev/brainops-gumroad/scripts/import-gumroad-sales.sh

echo "✅ Import script created: scripts/import-gumroad-sales.sh"
echo ""

# Create dashboard query script
cat > /home/matt-woodworth/dev/brainops-gumroad/scripts/view-sales-dashboard.sh << 'EOFDASH'
#!/bin/bash

DB_HOST="aws-0-us-east-2.pooler.supabase.com"
DB_USER="postgres.yomagoqdmxszqtdwuhab"
DB_PASS="REDACTED_SUPABASE_DB_PASSWORD"
DB_NAME="postgres"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         BRAINOPS REVENUE ENGINE - SALES DASHBOARD             ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

echo "📊 DAILY SUMMARY (Last 7 Days)"
echo "═════════════════════════════════════════════════════════"
PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT
    date,
    total_revenue as revenue,
    transaction_count as sales,
    avg_order_value as aov,
    products_sold
  FROM revenue_daily_summary
  LIMIT 7;
"

echo ""
echo "🏆 TOP PRODUCTS"
echo "═════════════════════════════════════════════════════════"
PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT
    product_name,
    sales_count,
    total_revenue,
    last_sale_date
  FROM revenue_by_product
  LIMIT 5;
"

echo ""
echo "📍 TRAFFIC SOURCES"
echo "═════════════════════════════════════════════════════════"
PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT
    traffic_source,
    sales_count,
    total_revenue,
    percent_of_sales || '%' as percent
  FROM revenue_by_traffic_source;
"

echo ""
echo "💰 ALL-TIME TOTALS"
echo "═════════════════════════════════════════════════════════"
PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT
    COUNT(*) as total_sales,
    SUM(revenue_usd) as total_revenue,
    SUM(net_revenue_usd) as net_revenue,
    AVG(revenue_usd) as avg_order_value
  FROM revenue_tracking;
"

echo ""
echo "🔗 View full dashboard: https://brainops-command-center.vercel.app/income"
echo ""
EOFDASH

chmod +x /home/matt-woodworth/dev/brainops-gumroad/scripts/view-sales-dashboard.sh

echo "✅ Dashboard script created: scripts/view-sales-dashboard.sh"
echo ""

echo "✅ Sales Dashboard Setup Complete!"
echo ""
echo "📊 Usage:"
echo "   1. Update logs/gumroad_daily_sales.csv with actual sales data"
echo "   2. Run: bash scripts/import-gumroad-sales.sh"
echo "   3. View: bash scripts/view-sales-dashboard.sh"
echo ""
echo "🔗 Web Dashboard: https://brainops-command-center.vercel.app/income"
echo ""
