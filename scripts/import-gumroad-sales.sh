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
