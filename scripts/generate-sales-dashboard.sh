#!/usr/bin/env bash

##############################################################################
# BRAINOPS REVENUE ENGINE - SALES DASHBOARD GENERATOR
# Ensures the revenue_tracking schema + views exist (no secrets, prod-aligned).
##############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/brainops-lib.sh"

load_brainops_env
require_db_env

echo "Creating BrainOps Sales Dashboard schema (revenue_tracking + views)..."
echo ""

brainops_psql -X -v ON_ERROR_STOP=1 <<'EOFDB'
-- Canonical schema (matches current production shape).
CREATE TABLE IF NOT EXISTS revenue_tracking (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  revenue NUMERIC(10,2) DEFAULT 0,
  transactions INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  recurring_revenue NUMERIC(10,2) DEFAULT 0,
  channel VARCHAR(50),
  meta_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  customer_email VARCHAR(255),
  customer_id VARCHAR(255),
  product_name VARCHAR(255),
  amount_cents BIGINT DEFAULT 0,
  transaction_id TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_revenue_date ON revenue_tracking(date);
CREATE INDEX IF NOT EXISTS idx_revenue_tracking_date ON revenue_tracking(date);
CREATE INDEX IF NOT EXISTS idx_revenue_tracking_customer_id ON revenue_tracking(customer_id);

CREATE OR REPLACE VIEW revenue_daily_summary AS
SELECT
  date,
  SUM(revenue) AS total_revenue,
  SUM(transactions) AS transaction_count,
  CASE WHEN SUM(transactions) > 0 THEN SUM(revenue) / SUM(transactions)::numeric ELSE 0 END AS avg_order_value,
  SUM(new_customers) AS new_customers,
  SUM(recurring_revenue) AS recurring_revenue
FROM revenue_tracking
GROUP BY date
ORDER BY date DESC;

CREATE OR REPLACE VIEW revenue_by_product AS
SELECT
  product_name,
  COUNT(*) AS sales_count,
  SUM(revenue) AS total_revenue,
  MAX(date) AS last_sale_date
FROM revenue_tracking
WHERE product_name IS NOT NULL
GROUP BY product_name
ORDER BY total_revenue DESC;

CREATE OR REPLACE VIEW revenue_by_channel AS
SELECT
  channel,
  COUNT(*) AS sales_count,
  SUM(revenue) AS total_revenue,
  CASE
    WHEN SUM(revenue) > 0 THEN round(COUNT(*)::numeric * 100.0 / SUM(COUNT(*)) OVER (), 2)
    ELSE 0
  END AS percent_of_sales
FROM revenue_tracking
WHERE channel IS NOT NULL
GROUP BY channel
ORDER BY total_revenue DESC;
EOFDB

echo "OK: revenue_tracking + views are present."
echo ""
echo "Next:"
echo "- Import aggregated CSV metrics: bash scripts/import-gumroad-sales.sh"
echo "- View CLI dashboard:            bash scripts/view-sales-dashboard.sh"
