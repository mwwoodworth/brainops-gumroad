#!/bin/bash
# Aggregate all metrics into a single report

LOG_DIR="/home/matt-woodworth/dev/brainops-gumroad/logs"
REPORT_FILE="$LOG_DIR/launch_report_$(date +%Y-%m-%d).md"

echo "# BrainOps Revenue Engine - Launch Report" > "$REPORT_FILE"
echo "**Generated:** $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Aggregate Gumroad sales
if [ -f "$LOG_DIR/gumroad_daily_sales.csv" ]; then
  echo "## 💰 Gumroad Sales Summary" >> "$REPORT_FILE"
  echo '```' >> "$REPORT_FILE"
  tail -n +2 "$LOG_DIR/gumroad_daily_sales.csv" | awk -F',' '
    BEGIN { total_sales=0; total_revenue=0; count=0 }
    {
      total_sales += $2
      total_revenue += $3
      count++
    }
    END {
      print "Total Transactions: " total_sales
      print "Total Revenue: $" total_revenue
      print "Average Order Value: $" (total_revenue/total_sales)
      print "Days Tracked: " count
    }
  ' >> "$REPORT_FILE"
  echo '```' >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
fi

# Latest social metrics
LATEST_SOCIAL=$(ls -t "$LOG_DIR"/social_metrics_*.json 2>/dev/null | head -1)
if [ -n "$LATEST_SOCIAL" ]; then
  echo "## 📱 Latest Social Media Metrics" >> "$REPORT_FILE"
  echo '```json' >> "$REPORT_FILE"
  cat "$LATEST_SOCIAL" >> "$REPORT_FILE"
  echo '```' >> "$REPORT_FILE"
fi

echo "✅ Report generated: $REPORT_FILE"
cat "$REPORT_FILE"
