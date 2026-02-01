#!/usr/bin/env bash
# Gumroad Revenue Report Script
# Generates daily/weekly revenue reports from the production gumroad_sales table.
#
# Security:
# - No hardcoded secrets.
# - Uses BrainOps env loader.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/../scripts/brainops-lib.sh"

load_brainops_env
require_db_env

echo "========================================"
echo "    GUMROAD REVENUE REPORT"
echo "    Generated: $(date)"
echo "========================================"
echo ""

# Total Revenue
echo "=== TOTAL REVENUE ==="
brainops_psql -t << 'EOF'
SELECT 
  COALESCE(SUM(price), 0) as total_revenue_usd,
  COUNT(*) as total_sales,
  COUNT(DISTINCT email) as unique_customers
FROM gumroad_sales
WHERE lower(coalesce(metadata->>'refunded', 'false')) NOT IN ('true', '1');
EOF

echo ""
echo "=== REVENUE BY PRODUCT ==="
brainops_psql << 'EOF'
SELECT 
  product_name,
  COUNT(*) as sales,
  SUM(price) as revenue_usd
FROM gumroad_sales
WHERE lower(coalesce(metadata->>'refunded', 'false')) NOT IN ('true', '1')
GROUP BY product_name
ORDER BY revenue_usd DESC;
EOF

echo ""
echo "=== LAST 7 DAYS ==="
brainops_psql << 'EOF'
SELECT 
  DATE(sale_timestamp) as sale_date,
  COUNT(*) as sales,
  SUM(price) as revenue_usd
FROM gumroad_sales
WHERE lower(coalesce(metadata->>'refunded', 'false')) NOT IN ('true', '1')
  AND sale_timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE(sale_timestamp)
ORDER BY sale_date DESC;
EOF

echo ""
echo "=== RECENT SALES ==="
brainops_psql << 'EOF'
SELECT 
  sale_timestamp,
  product_name,
  customer_name,
  email,
  price as price_usd
FROM gumroad_sales
WHERE lower(coalesce(metadata->>'refunded', 'false')) NOT IN ('true', '1')
ORDER BY sale_timestamp DESC
LIMIT 10;
EOF

echo ""
echo "========================================"
echo "    END OF REPORT"
echo "========================================"
