#!/bin/bash

##############################################################################
# BRAINOPS REVENUE ENGINE - LAUNCH ANALYTICS TRACKER
# Automated tracking of launch metrics across all platforms
##############################################################################

DB_HOST="aws-0-us-east-2.pooler.supabase.com"
DB_USER="postgres.yomagoqdmxszqtdwuhab"
DB_PASS="REDACTED_SUPABASE_DB_PASSWORD"
DB_NAME="postgres"

TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
LOG_DIR="/home/matt-woodworth/dev/brainops-gumroad/logs"
mkdir -p "$LOG_DIR"

echo "🚀 BrainOps Revenue Engine - Analytics Tracker"
echo "═══════════════════════════════════════════════"
echo "Timestamp: $TIMESTAMP"
echo ""

# Function to log metrics to database
log_metric() {
  local metric_name="$1"
  local metric_value="$2"
  local source="$3"

  PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
    INSERT INTO system_events (
      event_type,
      source_system,
      payload,
      created_at
    ) VALUES (
      'brainops_launch_metric',
      '$source',
      '{\"metric\": \"$metric_name\", \"value\": $metric_value, \"timestamp\": \"$TIMESTAMP\"}',
      NOW()
    );
  " > /dev/null 2>&1
}

# Function to track social media engagement
track_social_engagement() {
  echo "📱 Tracking Social Media Engagement..."

  # Create placeholder for manual entry
  cat > "$LOG_DIR/social_metrics_$TIMESTAMP.json" << 'EOF'
{
  "timestamp": "TIMESTAMP_PLACEHOLDER",
  "platforms": {
    "linkedin": {
      "posts": 0,
      "likes": 0,
      "comments": 0,
      "shares": 0,
      "profile_views": 0
    },
    "twitter": {
      "posts": 0,
      "likes": 0,
      "retweets": 0,
      "replies": 0,
      "impressions": 0
    },
    "reddit": {
      "posts": 0,
      "upvotes": 0,
      "comments": 0,
      "subreddits": ["r/SaaS", "r/Entrepreneur", "r/webdev"]
    },
    "hackernews": {
      "posts": 0,
      "points": 0,
      "comments": 0
    },
    "indiehackers": {
      "posts": 0,
      "upvotes": 0,
      "comments": 0
    }
  },
  "notes": "Update this file daily with actual metrics from each platform"
}
EOF

  sed -i "s/TIMESTAMP_PLACEHOLDER/$TIMESTAMP/g" "$LOG_DIR/social_metrics_$TIMESTAMP.json"
  echo "✅ Social metrics template created: $LOG_DIR/social_metrics_$TIMESTAMP.json"
}

# Function to create Gumroad sales tracking query
track_gumroad_sales() {
  echo "💰 Setting up Gumroad Sales Tracking..."

  cat > "$LOG_DIR/gumroad_sales_query.txt" << 'EOF'
GUMROAD SALES TRACKING - MANUAL PROCESS
========================================

Since Gumroad doesn't have a public API, track sales manually:

1. Go to: https://gumroad.com/analytics
2. Note the following metrics daily:
   - Total Sales (count)
   - Total Revenue (USD)
   - Top Selling Product
   - Average Order Value
   - Traffic Sources (email, social, direct, etc.)

3. Update the tracking file: gumroad_daily_sales.csv

Format:
Date,Total_Sales,Revenue_USD,Top_Product,Avg_Order_Value,Email_Sales,Social_Sales,Direct_Sales,Other_Sales

Example:
2025-11-22,15,3750.00,GR-ULTIMATE,250.00,8,4,2,1

4. Run analytics script to import into database:
   ./import-gumroad-sales.sh
EOF

  # Create CSV template
  cat > "$LOG_DIR/gumroad_daily_sales.csv" << 'EOF'
Date,Total_Sales,Revenue_USD,Top_Product,Avg_Order_Value,Email_Sales,Social_Sales,Direct_Sales,Other_Sales
EOF

  echo "✅ Gumroad tracking template created"
}

# Function to track email performance
track_email_metrics() {
  echo "📧 Setting up Email Performance Tracking..."

  cat > "$LOG_DIR/email_metrics_template.json" << 'EOF'
{
  "source": "convertkit",
  "sequence": "BrainOps Revenue Engine Launch",
  "emails": [
    {
      "email_number": 1,
      "name": "Launch Announcement",
      "send_date": "",
      "total_sent": 0,
      "opened": 0,
      "clicked": 0,
      "unsubscribed": 0,
      "open_rate": 0.0,
      "click_rate": 0.0
    },
    {
      "email_number": 2,
      "name": "Code Products Deep Dive",
      "send_date": "",
      "total_sent": 0,
      "opened": 0,
      "clicked": 0,
      "unsubscribed": 0,
      "open_rate": 0.0,
      "click_rate": 0.0
    },
    {
      "email_number": 3,
      "name": "Automation Packs",
      "send_date": "",
      "total_sent": 0,
      "opened": 0,
      "clicked": 0,
      "unsubscribed": 0,
      "open_rate": 0.0,
      "click_rate": 0.0
    },
    {
      "email_number": 4,
      "name": "AI Prompt Packs",
      "send_date": "",
      "total_sent": 0,
      "opened": 0,
      "clicked": 0,
      "unsubscribed": 0,
      "open_rate": 0.0,
      "click_rate": 0.0
    },
    {
      "email_number": 5,
      "name": "Final Call",
      "send_date": "",
      "total_sent": 0,
      "opened": 0,
      "clicked": 0,
      "unsubscribed": 0,
      "open_rate": 0.0,
      "click_rate": 0.0
    }
  ],
  "instructions": "Get these metrics from ConvertKit dashboard: https://app.convertkit.com/sequences"
}
EOF

  echo "✅ Email metrics template created"
}

# Function to create daily snapshot
create_daily_snapshot() {
  echo "📊 Creating Daily Snapshot Template..."

  cat > "$LOG_DIR/daily_snapshot_template.md" << 'EOF'
# BrainOps Revenue Engine - Daily Snapshot

**Date:** YYYY-MM-DD
**Day:** X of Launch

## 💰 Revenue Metrics
- Total Sales Today: $XXX
- Total Sales to Date: $XXX
- Number of Transactions: XX
- Average Order Value: $XXX
- Best Selling Product: PRODUCT_NAME

## 📧 Email Performance
- Email X Sent: XXX subscribers
- Open Rate: XX%
- Click Rate: XX%
- Conversions: XX sales

## 📱 Social Media
- LinkedIn Engagement: XX likes, XX comments
- Twitter Engagement: XX likes, XX retweets
- Reddit: XX upvotes, XX comments
- HN: XX points, XX comments

## 🎯 Traffic Sources
- Email: XX%
- Social: XX%
- Direct: XX%
- Reddit/HN: XX%
- Other: XX%

## 📝 Key Insights
- What worked today?
- What didn't work?
- What to test tomorrow?

## 🚀 Actions for Tomorrow
- [ ] Action item 1
- [ ] Action item 2
- [ ] Action item 3

## 💬 Customer Feedback
- Support emails received: XX
- Common questions:
- Feature requests:
- Testimonials:
EOF

  echo "✅ Daily snapshot template created"
}

# Execute all tracking setups
track_social_engagement
track_gumroad_sales
track_email_metrics
create_daily_snapshot

# Create aggregation script
cat > "$LOG_DIR/../scripts/aggregate-metrics.sh" << 'EOFSCRIPT'
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
EOFSCRIPT

chmod +x "$LOG_DIR/../scripts/aggregate-metrics.sh"

echo ""
echo "✅ Analytics Tracking System Setup Complete!"
echo ""
echo "📁 Files created:"
echo "   • $LOG_DIR/social_metrics_$TIMESTAMP.json"
echo "   • $LOG_DIR/gumroad_sales_query.txt"
echo "   • $LOG_DIR/gumroad_daily_sales.csv"
echo "   • $LOG_DIR/email_metrics_template.json"
echo "   • $LOG_DIR/daily_snapshot_template.md"
echo "   • scripts/aggregate-metrics.sh"
echo ""
echo "🚀 Usage:"
echo "   1. Update CSV files daily with actual metrics"
echo "   2. Run: bash scripts/aggregate-metrics.sh"
echo "   3. View aggregated report in logs/"
echo ""
