#!/usr/bin/env bash

# Import Gumroad sales aggregates from CSV to revenue_tracking.
#
# CSV format (header + rows):
# Date,Total_Sales,Revenue_USD,Top_Product,Avg_Order_Value,Email_Sales,Social_Sales,Direct_Sales,Other_Sales

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/brainops-lib.sh"

load_brainops_env
require_db_env

CSV_FILE="${CSV_FILE:-/home/matt-woodworth/dev/brainops-gumroad/logs/gumroad_daily_sales.csv}"

if [ ! -f "$CSV_FILE" ]; then
  echo "❌ CSV file not found: $CSV_FILE"
  exit 1
fi

echo "📥 Importing Gumroad sales from CSV..."

# Skip header, read each line
tail -n +2 "$CSV_FILE" | while IFS=',' read -r date total_sales revenue top_product avg_order email social direct other; do

  [ -z "${date:-}" ] && continue

  total_sales="${total_sales:-0}"
  revenue="${revenue:-0}"
  avg_order="${avg_order:-0}"
  email="${email:-0}"
  social="${social:-0}"
  direct="${direct:-0}"
  other="${other:-0}"

  tx_id="gumroad_daily_${date}"

  meta="$(
    python3 - <<'PY' "$email" "$social" "$direct" "$other" "$top_product" "$avg_order"
import json,sys
email=int(float(sys.argv[1] or 0))
social=int(float(sys.argv[2] or 0))
direct=int(float(sys.argv[3] or 0))
other=int(float(sys.argv[4] or 0))
top=(sys.argv[5] or "").strip()
avg=float(sys.argv[6] or 0)
print(json.dumps({
  "email_sales": email,
  "social_sales": social,
  "direct_sales": direct,
  "other_sales": other,
  "top_product": top,
  "avg_order_value": avg,
  "imported_via": "brainops-gumroad/scripts/import-gumroad-sales.sh",
}))
PY
  )"

  amount_cents="$(
    python3 - <<'PY' "$revenue"
import sys
try:
  v=float(sys.argv[1])
except Exception:
  v=0.0
print(int(round(v*100)))
PY
  )"

  # Insert daily aggregated data (idempotent via transaction_id).
  brainops_psql -X -v ON_ERROR_STOP=1 \
    -v d="$date" \
    -v r="$revenue" \
    -v t="$total_sales" \
    -v channel="gumroad" \
    -v meta="$meta" \
    -v product="$top_product" \
    -v amount_cents="$amount_cents" \
    -v tx_id="$tx_id" <<'SQL'
\set ON_ERROR_STOP on
INSERT INTO revenue_tracking (
  date,
  revenue,
  transactions,
  channel,
  meta_data,
  product_name,
  amount_cents,
  transaction_id,
  created_at
) VALUES (
  :'d'::date,
  :r::numeric,
  :t::int,
  :'channel',
  :'meta'::jsonb,
  nullif(:'product', ''),
  :amount_cents::bigint,
  :'tx_id',
  now()
)
ON CONFLICT (transaction_id) DO UPDATE SET
  revenue = EXCLUDED.revenue,
  transactions = EXCLUDED.transactions,
  channel = EXCLUDED.channel,
  meta_data = EXCLUDED.meta_data,
  product_name = EXCLUDED.product_name,
  amount_cents = EXCLUDED.amount_cents;
SQL

  echo "✅ Imported: $date - $total_sales sales, \$$revenue"
done

echo ""
echo "✅ Import complete!"
echo "📊 View dashboard: https://brainops-command-center.vercel.app/income"
