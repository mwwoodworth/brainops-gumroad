#!/bin/bash
# Gumroad Sales Sync Script
# Syncs sales data from Gumroad API to Supabase

set -e

GUMROAD_TOKEN="REDACTED_GUMROAD_ACCESS_TOKEN"
DB_HOST="aws-0-us-east-2.pooler.supabase.com"
DB_PORT="6543"
DB_NAME="postgres"
DB_USER="postgres.yomagoqdmxszqtdwuhab"
DB_PASSWORD="REDACTED_SUPABASE_DB_PASSWORD"

echo "$(date): Starting Gumroad sales sync..."

# Fetch sales from Gumroad API
SALES_RESPONSE=$(curl -s "https://api.gumroad.com/v2/sales" \
  -H "Authorization: Bearer $GUMROAD_TOKEN" \
  -d "page=1" \
  -d "per_page=100")

# Check if successful
if echo "$SALES_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  SALE_COUNT=$(echo "$SALES_RESPONSE" | jq '.sales | length')
  echo "$(date): Found $SALE_COUNT sales"
  
  # Process each sale
  echo "$SALES_RESPONSE" | jq -c '.sales[]' | while read sale; do
    SALE_ID=$(echo "$sale" | jq -r '.id')
    PRODUCT_ID=$(echo "$sale" | jq -r '.product_id')
    PRODUCT_NAME=$(echo "$sale" | jq -r '.product_name')
    PRICE=$(echo "$sale" | jq -r '.price')
    EMAIL=$(echo "$sale" | jq -r '.email')
    FULL_NAME=$(echo "$sale" | jq -r '.full_name')
    PURCHASE_DATE=$(echo "$sale" | jq -r '.created_at')
    REFUNDED=$(echo "$sale" | jq -r '.refunded')
    
    echo "$(date): Processing sale $SALE_ID - $PRODUCT_NAME"
    
    # Insert into database (upsert)
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -q << EOF
INSERT INTO gumroad_sales (sale_id, product_id, product_name, price_cents, email, full_name, purchase_date, refunded, raw_data)
VALUES ('$SALE_ID', '$PRODUCT_ID', '$PRODUCT_NAME', $PRICE, '$EMAIL', '$FULL_NAME', '$PURCHASE_DATE', $REFUNDED, '$sale'::jsonb)
ON CONFLICT (sale_id) DO UPDATE SET
  refunded = EXCLUDED.refunded,
  raw_data = EXCLUDED.raw_data;
EOF
  done
  
  echo "$(date): Sync complete"
else
  echo "$(date): ERROR - Failed to fetch sales from Gumroad"
  echo "$SALES_RESPONSE"
  exit 1
fi
