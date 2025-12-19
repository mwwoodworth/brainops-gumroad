#!/bin/bash
# Gumroad Revenue Report Script
# Generates daily/weekly revenue reports

DB_HOST="aws-0-us-east-2.pooler.supabase.com"
DB_PORT="6543"
DB_NAME="postgres"
DB_USER="postgres.yomagoqdmxszqtdwuhab"
DB_PASSWORD="REDACTED_SUPABASE_DB_PASSWORD"

echo "========================================"
echo "    GUMROAD REVENUE REPORT"
echo "    Generated: $(date)"
echo "========================================"
echo ""

# Total Revenue
echo "=== TOTAL REVENUE ==="
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t << EOF
SELECT 
  COALESCE(SUM(price_cents) / 100.0, 0) as total_revenue_usd,
  COUNT(*) as total_sales,
  COUNT(DISTINCT email) as unique_customers
FROM gumroad_sales
WHERE refunded = FALSE;
EOF

echo ""
echo "=== REVENUE BY PRODUCT ==="
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
SELECT 
  product_name,
  COUNT(*) as sales,
  SUM(price_cents) / 100.0 as revenue_usd
FROM gumroad_sales
WHERE refunded = FALSE
GROUP BY product_name
ORDER BY revenue_usd DESC;
EOF

echo ""
echo "=== LAST 7 DAYS ==="
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
SELECT 
  DATE(purchase_date) as sale_date,
  COUNT(*) as sales,
  SUM(price_cents) / 100.0 as revenue_usd
FROM gumroad_sales
WHERE refunded = FALSE
  AND purchase_date >= NOW() - INTERVAL '7 days'
GROUP BY DATE(purchase_date)
ORDER BY sale_date DESC;
EOF

echo ""
echo "=== RECENT SALES ==="
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
SELECT 
  purchase_date,
  product_name,
  full_name,
  price_cents / 100.0 as price_usd
FROM gumroad_sales
WHERE refunded = FALSE
ORDER BY purchase_date DESC
LIMIT 10;
EOF

echo ""
echo "========================================"
echo "    END OF REPORT"
echo "========================================"
