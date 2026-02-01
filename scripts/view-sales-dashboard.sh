#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/brainops-lib.sh"

load_brainops_env
require_db_env

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         BRAINOPS REVENUE ENGINE - SALES DASHBOARD             ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

echo "📊 DAILY SUMMARY (Last 7 Days)"
echo "═════════════════════════════════════════════════════════"
brainops_psql -c "
  SELECT
    date,
    total_revenue as revenue,
    transaction_count as sales,
    avg_order_value as aov,
    new_customers,
    recurring_revenue
  FROM revenue_daily_summary
  LIMIT 7;
"

echo ""
echo "🏆 TOP PRODUCTS"
echo "═════════════════════════════════════════════════════════"
brainops_psql -c "
  SELECT
    product_name,
    sales_count,
    total_revenue,
    last_sale_date
  FROM revenue_by_product
  LIMIT 5;
"

echo ""
echo "📍 MARKETING CHANNELS"
echo "═════════════════════════════════════════════════════════"
brainops_psql -c "
  SELECT
    channel,
    sales_count,
    total_revenue,
    percent_of_sales || '%' as percent
  FROM revenue_by_channel;
"

echo ""
echo "💰 ALL-TIME TOTALS"
echo "═════════════════════════════════════════════════════════"
brainops_psql -c "
  SELECT
    SUM(transactions) as total_sales,
    SUM(revenue) as total_revenue,
    SUM(recurring_revenue) as recurring_revenue,
    CASE WHEN SUM(transactions) > 0 THEN SUM(revenue) / SUM(transactions) ELSE 0 END as avg_order_value
  FROM revenue_tracking;
"

echo ""
echo "🔗 View full dashboard: https://brainops-command-center.vercel.app/income"
echo ""
