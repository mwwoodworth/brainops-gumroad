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
    new_customers,
    recurring_revenue
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
echo "📍 MARKETING CHANNELS"
echo "═════════════════════════════════════════════════════════"
PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
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
PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
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
