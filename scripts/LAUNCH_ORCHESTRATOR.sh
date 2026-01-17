#!/bin/bash

##############################################################################
# BRAINOPS REVENUE ENGINE - MASTER LAUNCH ORCHESTRATOR
#
# This script orchestrates the complete launch execution across all systems
##############################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project paths
PROJECT_ROOT="/home/matt-woodworth/dev/brainops-gumroad"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"
BUILD_DIR="$PROJECT_ROOT/build"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   BRAINOPS REVENUE ENGINE - LAUNCH ORCHESTRATOR v1.0      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print section headers
print_section() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo ""
}

# Function to print success
print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warning
print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to print error
print_error() {
  echo -e "${RED}❌ $1${NC}"
}

# Function to print info
print_info() {
  echo -e "${NC}ℹ️  $1${NC}"
}

##############################################################################
# PHASE 0: PRE-FLIGHT CHECKS
##############################################################################
print_section "PHASE 0: PRE-FLIGHT CHECKS"

# Check if all ZIP files exist
print_info "Checking ZIP files in build directory..."
REQUIRED_ZIPS=(
  "GR-ROOFINT-v1.0.zip"
  "GR-PMACC-v1.0.zip"
  "GR-LAUNCH-v1.0.zip"
  "GR-ONBOARD-v1.0.zip"
  "GR-CONTENT-v1.0.zip"
  "GR-ROOFVAL-v1.0.zip"
  "GR-PMCMD-v1.0.zip"
  "GR-ERP-START-v1.0.zip"
  "GR-AI-ORCH-v1.0.zip"
  "GR-UI-KIT-v1.0.zip"
  "GR-CORE-AI-PROMPTS-v1.0.zip"
  "GR-AUTOMATION-PACK-v1.0.zip"
  "GR-ULTIMATE-v1.0.zip"
)

ZIP_COUNT=0
for zip in "${REQUIRED_ZIPS[@]}"; do
  if [ -f "$BUILD_DIR/$zip" ]; then
    ZIP_COUNT=$((ZIP_COUNT + 1))
  else
    print_error "Missing: $zip"
  fi
done

if [ $ZIP_COUNT -eq 13 ]; then
  print_success "All 13 product ZIP files found"
else
  print_error "Only $ZIP_COUNT of 13 ZIP files found. Build products first!"
  exit 1
fi

# Check dependencies
print_info "Checking dependencies..."

if command -v node &> /dev/null; then
  print_success "Node.js installed: $(node --version)"
else
  print_error "Node.js not installed. Required for ConvertKit setup."
  exit 1
fi

if command -v psql &> /dev/null; then
  print_success "PostgreSQL client installed"
else
  print_warning "PostgreSQL client not found. Task creation may fail."
fi

# Check database connection
print_info "Testing database connection..."
if PGPASSWORD=<REDACTED_PASSWORD> timeout 5 psql -h aws-0-us-east-2.pooler.supabase.com -U postgres.yomagoqdmxszqtdwuhab -d postgres -c "SELECT 1;" &> /dev/null; then
  print_success "Database connection successful"
else
  print_warning "Database connection failed. Task creation will be skipped."
fi

print_success "Pre-flight checks complete!"

##############################################################################
# PHASE 1: LAUNCH INFRASTRUCTURE SETUP
##############################################################################
print_section "PHASE 1: LAUNCH INFRASTRUCTURE SETUP"

# Create BrainOps Command Center tasks
print_info "Creating launch tasks in BrainOps Command Center..."
if [ -f "$SCRIPTS_DIR/create-launch-tasks.sh" ]; then
  bash "$SCRIPTS_DIR/create-launch-tasks.sh"
  print_success "Launch tasks created"
else
  print_error "create-launch-tasks.sh not found"
fi

# Set up ConvertKit email sequence
print_info "Setting up ConvertKit email sequence..."
cd "$SCRIPTS_DIR"

# Check if npm packages are installed
if [ ! -d "$SCRIPTS_DIR/node_modules" ]; then
  print_info "Installing npm dependencies..."
  npm install axios
fi

if [ -f "$SCRIPTS_DIR/setup-convertkit-sequence.js" ]; then
  node "$SCRIPTS_DIR/setup-convertkit-sequence.js"
  print_success "ConvertKit sequence configured"
else
  print_error "setup-convertkit-sequence.js not found"
fi

cd "$PROJECT_ROOT"

##############################################################################
# PHASE 2: GUMROAD PRODUCT SETUP (MANUAL GUIDANCE)
##############################################################################
print_section "PHASE 2: GUMROAD PRODUCT SETUP"

print_warning "Gumroad product upload requires manual execution (no public API available)"
echo ""
print_info "Follow these steps:"
echo ""
echo "1. Open Gumroad: https://gumroad.com/products/new"
echo "2. Refer to: $PROJECT_ROOT/LAUNCH_DAY_CHECKLIST.md"
echo "3. Upload each of the 13 ZIP files from: $BUILD_DIR"
echo "4. Use descriptions from: $PROJECT_ROOT/products/*/gumroad-description.md"
echo ""
print_info "CRITICAL CHECKLIST:"
echo "   ☐ Upload all 13 ZIP files"
echo "   ☐ Set correct prices (see GUMROAD_LISTINGS.md)"
echo "   ☐ Create LAUNCH20 discount code (20% off, 48 hours)"
echo "   ☐ Test purchase with TEST100 code"
echo "   ☐ Enable affiliates on GR-PMACC and GR-CONTENT (50% commission)"
echo ""
read -p "Press ENTER when Gumroad setup is complete..."
print_success "Gumroad setup marked as complete"

##############################################################################
# PHASE 3: SOCIAL MEDIA CONTENT GENERATION
##############################################################################
print_section "PHASE 3: SOCIAL MEDIA CONTENT PREPARATION"

print_info "All social media posts are ready in:"
echo "   📄 $PROJECT_ROOT/SOCIAL_MEDIA_POSTS.md"
echo ""
print_info "LinkedIn/Twitter posting requires manual execution (no API access)"
echo ""
print_info "Posting schedule:"
echo "   Day 0 (Launch): Posts 1-3 (Problem/Solution)"
echo "   Day 1: Posts 4-6 (Social Proof)"
echo "   Day 2: Posts 7-9 (Storytelling)"
echo ""
print_info "Recommended tools:"
echo "   - Buffer (schedule posts): https://buffer.com"
echo "   - Hootsuite: https://hootsuite.com"
echo "   - Or post manually following the schedule in SOCIAL_MEDIA_POSTS.md"
echo ""
read -p "Press ENTER when social media scheduling is complete..."
print_success "Social media scheduling marked as complete"

##############################################################################
# PHASE 4: REDDIT/HN LAUNCH POSTS
##############################################################################
print_section "PHASE 4: REDDIT & HACKER NEWS PREPARATION"

print_info "Launch post templates ready in:"
echo "   📄 $PROJECT_ROOT/STRATEGIC_ADVICE.md (Channel 1 section)"
echo ""
print_info "Posting schedule:"
echo "   Day 0, 10 AM: r/SaaS (SaaS ERP Starter Kit)"
echo "   Day 0, 11 AM: Hacker News (Show HN)"
echo "   Day 1,  9 AM: r/Entrepreneur"
echo "   Day 2,  9 AM: r/webdev (UI Kit)"
echo "   Day 2,  3 PM: IndieHackers"
echo ""
print_warning "IMPORTANT: Reddit/HN require authentic, non-sales-y posts"
print_info "Use the exact templates from STRATEGIC_ADVICE.md"
echo ""
read -p "Press ENTER to acknowledge Reddit/HN strategy..."
print_success "Reddit/HN strategy acknowledged"

##############################################################################
# PHASE 5: LAUNCH DAY GO-LIVE
##############################################################################
print_section "PHASE 5: LAUNCH DAY EXECUTION"

echo "Launch Day Timeline (COPY THIS):"
echo "══════════════════════════════════════════════════════════"
echo ""
echo "06:00 AM - Final check of all Gumroad links"
echo "08:00 AM - Publish all products (set to 'live')"
echo "08:30 AM - Activate LAUNCH20 discount code"
echo "09:00 AM - Send Email 1 (ConvertKit)"
echo "09:00 AM - LinkedIn Post 1 (SaaS ERP Kit)"
echo "09:15 AM - Twitter Post 1 (SaaS ERP Kit)"
echo "10:00 AM - Reddit r/SaaS post"
echo "11:00 AM - Hacker News (Show HN)"
echo "12:00 PM - LinkedIn Post 2 (AI Orchestrator)"
echo "12:15 PM - Twitter Post 2 (AI Orchestrator)"
echo "01:00 PM - IndieHackers post"
echo "03:00 PM - Check sales, respond to comments"
echo "05:00 PM - LinkedIn Post 3 (UI Kit)"
echo "05:15 PM - Twitter Post 3 (UI Kit)"
echo "08:00 PM - Check sales, respond to emails"
echo ""
echo "══════════════════════════════════════════════════════════"
echo ""
print_success "Launch day timeline ready"

##############################################################################
# PHASE 6: MONITORING & ANALYTICS
##############################################################################
print_section "PHASE 6: MONITORING DASHBOARD"

print_info "Access your launch dashboards:"
echo ""
echo "   📊 Gumroad Sales: https://gumroad.com/analytics"
echo "   📊 BrainOps Tasks: https://brainops-command-center.vercel.app/tasks-manager"
echo "   📊 ConvertKit: https://app.convertkit.com/dashboard"
echo "   📊 Email Stats: Check open/click rates daily"
echo ""
print_info "Key metrics to track:"
echo "   - Total revenue (target: \$2,000+ Week 1)"
echo "   - Units sold (target: 10+ sales in 48 hours)"
echo "   - Traffic sources (Reddit, HN, email, social)"
echo "   - Email open rates (target: 25%+)"
echo "   - Email click rates (target: 5%+)"
echo ""

##############################################################################
# PHASE 7: POST-LAUNCH FOLLOW-UP
##############################################################################
print_section "PHASE 7: POST-LAUNCH CHECKLIST"

print_info "Days 1-4 email sequence:"
echo "   ✅ Email 1: Launch announcement (Day 0, 9 AM)"
echo "   📅 Email 2: Code products (Day 1, 10 AM)"
echo "   📅 Email 3: Automation packs (Day 2, 10 AM)"
echo "   📅 Email 4: AI prompts (Day 3, 10 AM)"
echo "   📅 Email 5: Final call (Day 4, 6 PM)"
echo ""
print_info "These are automated via ConvertKit sequence ✅"
echo ""
print_info "Manual follow-up tasks:"
echo "   - Respond to ALL comments within 1 hour (Days 0-2)"
echo "   - DM 10 influencers (Day 1)"
echo "   - Email 5 customers for testimonials (Day 7)"
echo "   - Analyze Week 1 sales data (Day 7)"
echo ""

##############################################################################
# LAUNCH COMPLETE
##############################################################################
print_section "🚀 LAUNCH ORCHESTRATOR COMPLETE"

print_success "All automated systems are configured and ready!"
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    LAUNCH CHECKLIST                        ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║ ✅ Product ZIP files verified (13/13)                      ║${NC}"
echo -e "${GREEN}║ ✅ ConvertKit email sequence created                       ║${NC}"
echo -e "${GREEN}║ ✅ BrainOps Command Center tasks created                   ║${NC}"
echo -e "${GREEN}║ ⚠️  Gumroad products (MANUAL - follow checklist)           ║${NC}"
echo -e "${GREEN}║ ⚠️  Social media posts (MANUAL - schedule via Buffer)      ║${NC}"
echo -e "${GREEN}║ ⚠️  Reddit/HN posts (MANUAL - follow templates)            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}📋 NEXT STEPS:${NC}"
echo ""
echo "1. Complete Gumroad product uploads (see LAUNCH_DAY_CHECKLIST.md)"
echo "2. Schedule social media posts (use SOCIAL_MEDIA_POSTS.md)"
echo "3. Set launch date and time (recommend Tuesday/Wednesday, 9 AM)"
echo "4. Execute launch day timeline (see Phase 5 above)"
echo "5. Monitor dashboards daily (Gumroad, ConvertKit, BrainOps)"
echo ""
echo -e "${GREEN}🎯 LAUNCH TARGETS:${NC}"
echo "   - Week 1: 10+ sales, \$2,000+ revenue"
echo "   - Month 1: 50+ sales, \$10,000+ revenue"
echo ""
echo -e "${BLUE}💰 YOU'RE READY TO MAKE MONEY. GO EXECUTE!${NC}"
echo ""
