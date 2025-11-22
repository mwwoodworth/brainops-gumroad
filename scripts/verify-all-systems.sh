#!/bin/bash

##############################################################################
# BRAINOPS REVENUE ENGINE - COMPLETE SYSTEM VERIFICATION
# Checks all automated systems are operational and ready for launch
##############################################################################

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║     BRAINOPS REVENUE ENGINE - SYSTEM VERIFICATION CHECK          ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

PASSED=0
FAILED=0
WARNINGS=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_pass() {
  echo -e "${GREEN}✅ PASS${NC}: $1"
  ((PASSED++))
}

check_fail() {
  echo -e "${RED}❌ FAIL${NC}: $1"
  ((FAILED++))
}

check_warn() {
  echo -e "${YELLOW}⚠️  WARN${NC}: $1"
  ((WARNINGS++))
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. PRODUCT FILES VERIFICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check build directory
if [ -d "build" ]; then
  check_pass "Build directory exists"
else
  check_fail "Build directory not found"
fi

# Check ZIP files
ZIP_COUNT=$(ls -1 build/*.zip 2>/dev/null | wc -l)
if [ "$ZIP_COUNT" -eq 13 ]; then
  check_pass "All 13 product ZIP files present"
else
  check_fail "Expected 13 ZIP files, found $ZIP_COUNT"
fi

# Verify ZIP integrity
for zipfile in build/*.zip; do
  if unzip -t "$zipfile" &>/dev/null; then
    check_pass "$(basename $zipfile) - valid ZIP file"
  else
    check_fail "$(basename $zipfile) - corrupted ZIP file"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. DOCUMENTATION VERIFICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

REQUIRED_DOCS=(
  "README.md"
  "COMPLETE_EXECUTION_REPORT.md"
  "LAUNCH_EXECUTION_SUMMARY.md"
  "LAUNCH_DAY_CHECKLIST.md"
  "LAUNCH_EMAIL_SEQUENCE.md"
  "SOCIAL_MEDIA_POSTS.md"
  "STRATEGIC_ADVICE.md"
  "GUMROAD_LISTINGS.md"
  "gumroad-products-import.json"
)

for doc in "${REQUIRED_DOCS[@]}"; do
  if [ -f "$doc" ]; then
    WORD_COUNT=$(wc -w < "$doc" 2>/dev/null || echo 0)
    if [ "$WORD_COUNT" -gt 100 ]; then
      check_pass "$doc exists ($WORD_COUNT words)"
    else
      check_warn "$doc exists but seems short ($WORD_COUNT words)"
    fi
  else
    check_fail "$doc not found"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. AUTOMATION SCRIPTS VERIFICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

REQUIRED_SCRIPTS=(
  "scripts/LAUNCH_ORCHESTRATOR.sh"
  "scripts/create-launch-tasks.sh"
  "scripts/track-launch-analytics.sh"
  "scripts/customer-support-automation.sh"
  "scripts/generate-sales-dashboard.sh"
  "scripts/import-gumroad-sales.sh"
  "scripts/view-sales-dashboard.sh"
  "scripts/aggregate-metrics.sh"
  "scripts/weekly-report-automation.sh"
)

for script in "${REQUIRED_SCRIPTS[@]}"; do
  if [ -f "$script" ]; then
    if [ -x "$script" ]; then
      check_pass "$(basename $script) - exists and executable"
    else
      check_warn "$(basename $script) - exists but not executable"
      chmod +x "$script"
      check_pass "Made $(basename $script) executable"
    fi
  else
    check_fail "$script not found"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. DATABASE CONNECTIVITY & STRUCTURE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DB_HOST="aws-0-us-east-2.pooler.supabase.com"
DB_USER="postgres.yomagoqdmxszqtdwuhab"
DB_PASS="Brain0ps2O2S"
DB_NAME="postgres"

# Test database connection
if PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;" &>/dev/null; then
  check_pass "Database connection successful"
else
  check_fail "Cannot connect to database"
fi

# Check cc_tasks table
TASK_COUNT=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM cc_tasks WHERE metadata->>'project' = 'brainops-revenue-engine';" 2>/dev/null | xargs)
if [ "$TASK_COUNT" -eq 22 ]; then
  check_pass "All 22 launch tasks found in database"
elif [ "$TASK_COUNT" -gt 0 ]; then
  check_warn "Found $TASK_COUNT tasks (expected 22)"
else
  check_fail "No launch tasks found in database"
fi

# Check revenue_tracking table
if PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\d revenue_tracking" &>/dev/null; then
  check_pass "revenue_tracking table exists"
else
  check_fail "revenue_tracking table not found"
fi

# Check views
for view in revenue_daily_summary revenue_by_product revenue_by_channel; do
  if PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\d $view" &>/dev/null; then
    check_pass "$view view exists"
  else
    check_fail "$view view not found"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. SUPPORT SYSTEM VERIFICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SUPPORT_FILES=(
  "support/faq.md"
  "support/response_templates.json"
  "support/support_workflow.md"
  "support/support_tickets.csv"
)

for file in "${SUPPORT_FILES[@]}"; do
  if [ -f "$file" ]; then
    check_pass "$(basename $file) exists"
  else
    check_fail "$file not found"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. ANALYTICS & TRACKING VERIFICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check logs directory
if [ -d "logs" ]; then
  check_pass "Logs directory exists"
  LOG_COUNT=$(ls -1 logs/ 2>/dev/null | wc -l)
  if [ "$LOG_COUNT" -gt 0 ]; then
    check_pass "$LOG_COUNT tracking files in logs/"
  fi
else
  check_fail "Logs directory not found"
fi

# Check reports directory
if [ -d "reports" ]; then
  check_pass "Reports directory exists"
else
  check_fail "Reports directory not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. WEB DASHBOARDS CONNECTIVITY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check BrainOps Command Center (tasks)
if curl -s -o /dev/null -w "%{http_code}" "https://brainops-command-center.vercel.app/tasks-manager" | grep -q "200\|307"; then
  check_pass "BrainOps Tasks Manager accessible"
else
  check_warn "BrainOps Tasks Manager may be offline"
fi

# Check BrainOps Income Dashboard
if curl -s -o /dev/null -w "%{http_code}" "https://brainops-command-center.vercel.app/income" | grep -q "200\|307"; then
  check_pass "BrainOps Income Dashboard accessible"
else
  check_warn "BrainOps Income Dashboard may be offline"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "FINAL SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "✅ Passed: ${GREEN}$PASSED${NC}"
echo -e "⚠️  Warnings: ${YELLOW}$WARNINGS${NC}"
echo -e "❌ Failed: ${RED}$FAILED${NC}"
echo ""

if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║           🎉 ALL SYSTEMS OPERATIONAL - LAUNCH READY! 🎉          ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "✅ All automated systems verified and operational"
  echo "✅ Ready for manual setup (5-7 hours)"
  echo "✅ Ready to launch when you are!"
  echo ""
  echo "📖 Next steps: Read COMPLETE_EXECUTION_REPORT.md"
  exit 0
else
  echo -e "${RED}╔══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║              ⚠️  ISSUES DETECTED - REVIEW REQUIRED              ║${NC}"
  echo -e "${RED}╚══════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "❌ $FAILED critical issues detected"
  echo "📖 Review failures above and run script again"
  exit 1
fi
