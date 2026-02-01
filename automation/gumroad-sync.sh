#!/usr/bin/env bash
# Gumroad Sales Sync Script
# Syncs sales data from Gumroad API to Supabase.
#
# Security:
# - No hardcoded secrets.
# - Avoids leaking tokens via process lists by passing headers via temp files.
#
# Reliability:
# - Uses GET (Gumroad expects query params for pagination).
# - Paginates until an empty page.
# - Uses psql variables (:'var') for safe quoting.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/../scripts/brainops-lib.sh"

load_brainops_env
require_db_env
require_gumroad_token

echo "$(date -u +%FT%TZ): Starting Gumroad sales sync..."

hdr_file="$(gumroad_header_file)"
cleanup() {
  rm -f "$hdr_file"
}
trap cleanup EXIT

page=1
per_page=100
total_processed=0

while true; do
  SALES_RESPONSE="$(
    curl -sS --max-time 30 \
      "https://api.gumroad.com/v2/sales?page=${page}&per_page=${per_page}" \
      -H @"$hdr_file"
  )"

  if ! echo "$SALES_RESPONSE" | jq -e '.success == true' >/dev/null 2>&1; then
    echo "$(date -u +%FT%TZ): ERROR - Failed to fetch sales from Gumroad (page=$page)" >&2
    echo "$SALES_RESPONSE" >&2
    exit 1
  fi

  SALE_COUNT="$(echo "$SALES_RESPONSE" | jq '.sales | length')"
  if [ "$SALE_COUNT" -eq 0 ]; then
    break
  fi

  echo "$(date -u +%FT%TZ): Page $page: Found $SALE_COUNT sale(s)"

  echo "$SALES_RESPONSE" | jq -c '.sales[]' | while read -r sale; do
    SALE_ID="$(echo "$sale" | jq -r '.id // empty')"
    EMAIL="$(echo "$sale" | jq -r '.email // empty')"
    FULL_NAME="$(echo "$sale" | jq -r '.full_name // empty')"
    PRODUCT_ID="$(echo "$sale" | jq -r '.product_id // empty')"
    PRODUCT_NAME="$(echo "$sale" | jq -r '.product_name // empty')"
    PRICE_CENTS="$(echo "$sale" | jq -r '.price // 0')"
    CURRENCY="$(echo "$sale" | jq -r '.currency // "usd"' | tr '[:lower:]' '[:upper:]')"
    SALE_TS="$(echo "$sale" | jq -r '.created_at // empty')"

    if [ -z "$SALE_ID" ]; then
      echo "$(date -u +%FT%TZ): WARN - Skipping sale with missing id" >&2
      continue
    fi

    # Upsert into the canonical gumroad_sales table used in production.
    brainops_psql -X -q -v ON_ERROR_STOP=1 \
      -v sale_id="$SALE_ID" \
      -v email="$EMAIL" \
      -v customer_name="$FULL_NAME" \
      -v product_code="$PRODUCT_ID" \
      -v product_name="$PRODUCT_NAME" \
      -v price_cents="$PRICE_CENTS" \
      -v currency="$CURRENCY" \
      -v sale_ts="$SALE_TS" \
      -v sale_json="$sale" <<'SQL'
\set ON_ERROR_STOP on
INSERT INTO gumroad_sales (
  sale_id,
  email,
  customer_name,
  product_code,
  product_name,
  price,
  currency,
  sale_timestamp,
  metadata,
  updated_at
) VALUES (
  :'sale_id',
  :'email',
  nullif(:'customer_name', ''),
  nullif(:'product_code', ''),
  nullif(:'product_name', ''),
  (:price_cents::numeric / 100.0),
  nullif(:'currency', ''),
  nullif(:'sale_ts', '')::timestamptz,
  (:'sale_json'::jsonb) || jsonb_build_object('imported_via', 'brainops-gumroad/automation/gumroad-sync.sh'),
  now()
)
ON CONFLICT (sale_id) DO UPDATE SET
  email = EXCLUDED.email,
  customer_name = EXCLUDED.customer_name,
  product_code = EXCLUDED.product_code,
  product_name = EXCLUDED.product_name,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  sale_timestamp = EXCLUDED.sale_timestamp,
  metadata = EXCLUDED.metadata,
  updated_at = now();
SQL

    total_processed=$((total_processed + 1))
    echo "$(date -u +%FT%TZ): Upserted sale $SALE_ID ($PRODUCT_NAME)"
  done

  page=$((page + 1))
done

echo "$(date -u +%FT%TZ): Sync complete (processed=$total_processed)"
