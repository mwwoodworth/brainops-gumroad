#!/usr/bin/env bash

# Create BrainOps Command Center tasks for Gumroad launch
# This script uses the Supabase database to track launch progress

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/brainops-lib.sh"

load_brainops_env
require_db_env

echo "🚀 Creating BrainOps Revenue Engine launch tasks..."
echo ""

# Function to create a task
create_task() {
  local title="$1"
  local description="$2"
  local priority="$3"
  local category="$4"
  local estimated_hours="$5"

  brainops_psql -X -v ON_ERROR_STOP=1 \
    -v title="$title" \
    -v description="$description" \
    -v priority="$priority" \
    -v category="$category" \
    -v estimated_hours="$estimated_hours" \
    -v launch_date="$(date +%Y-%m-%d)" <<'SQL'
\set ON_ERROR_STOP on
INSERT INTO cc_tasks (
  title,
  description,
  priority,
  category,
  status,
  ai_priority_score,
  estimated_hours,
  metadata,
  created_at,
  updated_at
) VALUES (
  :'title',
  :'description',
  :'priority',
  :'category',
  'todo',
  0.95,
  :estimated_hours::numeric,
  jsonb_build_object('project', 'brainops-revenue-engine', 'launch_date', :'launch_date'),
  NOW(),
  NOW()
);
SQL
}

# Pre-Launch Tasks
echo "📋 Creating Pre-Launch tasks..."
create_task \
  "Upload 10 products to Gumroad" \
  "Upload all ZIP files to Gumroad with descriptions, pricing, and covers. Follow LAUNCH_DAY_CHECKLIST.md" \
  "high" \
  "product-launch" \
  "3"

create_task \
  "Create LAUNCH20 discount code" \
  "Set up 20% off discount code valid for 48 hours on all products" \
  "high" \
  "product-launch" \
  "0.5"

create_task \
  "Test purchase flow (all products)" \
  "Use TEST100 code to test downloads, emails, and file integrity" \
  "medium" \
  "product-launch" \
  "1"

create_task \
  "Set up ConvertKit email sequence" \
  "Run setup-convertkit-sequence.js to create 5-part email sequence" \
  "high" \
  "marketing" \
  "1"

# Launch Day Tasks
echo "📬 Creating Launch Day tasks..."
create_task \
  "Send Email 1: Launch Announcement (9 AM)" \
  "Deploy first email to ConvertKit list with LAUNCH20 code" \
  "critical" \
  "marketing" \
  "0.5"

create_task \
  "Post to Reddit r/SaaS (10 AM)" \
  "Post SaaS ERP Starter Kit to r/SaaS. Ask for feedback, not sales pitch." \
  "high" \
  "marketing" \
  "0.5"

create_task \
  "Post to Hacker News (Show HN) (11 AM)" \
  "Launch on HN: 'Show HN: I launched 10 digital products in 24 hours'" \
  "high" \
  "marketing" \
  "0.5"

create_task \
  "LinkedIn Post 1: SaaS ERP Kit (9 AM)" \
  "Problem/Solution post for SaaS ERP Starter Kit. Pin link in comments." \
  "medium" \
  "marketing" \
  "0.25"

create_task \
  "Twitter Post 1: SaaS ERP Kit (9:15 AM)" \
  "Same as LinkedIn but adapted for Twitter format" \
  "medium" \
  "marketing" \
  "0.25"

# Day 1 Tasks
echo "📆 Creating Day 1 tasks..."
create_task \
  "Send Email 2: Code Products (10 AM)" \
  "Deep dive into 3 code starter kits" \
  "high" \
  "marketing" \
  "0.5"

create_task \
  "Post to r/Entrepreneur (9 AM)" \
  "'I launched 10 products in 24 hours and made \$X' transparency post" \
  "high" \
  "marketing" \
  "0.5"

create_task \
  "DM 10 influencers on Twitter" \
  "Micro-influencers (5K-20K followers) - offer free access for feedback" \
  "medium" \
  "marketing" \
  "1"

create_task \
  "LinkedIn Post 2: AI Orchestrator (12 PM)" \
  "Social proof post for AI Orchestrator Framework" \
  "medium" \
  "marketing" \
  "0.25"

# Day 2 Tasks
echo "🔄 Creating Day 2 tasks..."
create_task \
  "Send Email 3: Automation Packs (10 AM)" \
  "Highlight Make.com automation blueprints" \
  "high" \
  "marketing" \
  "0.5"

create_task \
  "Post to r/webdev (9 AM)" \
  "Modern UI Kit - glassmorphic dashboard components" \
  "high" \
  "marketing" \
  "0.5"

create_task \
  "Post to IndieHackers (3 PM)" \
  "Milestone post: 'Launched 10 products, here's what I learned'" \
  "medium" \
  "marketing" \
  "0.5"

# Day 3 Tasks
echo "🎯 Creating Day 3 tasks..."
create_task \
  "Send Email 4: AI Prompt Packs (10 AM)" \
  "Final product highlight: AI prompt bundles" \
  "high" \
  "marketing" \
  "0.5"

create_task \
  "Respond to all Reddit/HN comments" \
  "Engage with community feedback on all posts from Days 0-2" \
  "high" \
  "community" \
  "2"

create_task \
  "Follow up with influencers (non-responders)" \
  "Ping influencers who didn't respond to initial DM" \
  "low" \
  "marketing" \
  "0.5"

# Day 4 Tasks (Final Call)
echo "🔔 Creating Day 4 tasks..."
create_task \
  "Send Email 5: Final Call + Ultimate Bundle (6 PM)" \
  "Last chance for LAUNCH20. Highlight Ultimate Bundle at \$997" \
  "critical" \
  "marketing" \
  "0.5"

create_task \
  "Post final reminder on LinkedIn/Twitter" \
  "LAUNCH20 expires at midnight - final push" \
  "high" \
  "marketing" \
  "0.25"

create_task \
  "Disable LAUNCH20 code (11:59 PM)" \
  "Turn off launch discount code in Gumroad" \
  "high" \
  "product-launch" \
  "0.1"

# Post-Launch Tasks
echo "📊 Creating Post-Launch tasks..."
create_task \
  "Analyze Week 1 sales data" \
  "Review Gumroad dashboard: revenue, best sellers, traffic sources" \
  "medium" \
  "analytics" \
  "2"

create_task \
  "Email 5 customers for testimonials" \
  "Offer \$20 credit for written review" \
  "medium" \
  "customer-success" \
  "1"

create_task \
  "Create customer support FAQ" \
  "Based on first week support emails, build FAQ document" \
  "low" \
  "customer-success" \
  "2"

create_task \
  "Set up affiliate program" \
  "Recruit 3-5 affiliates, provide swipe copy, track commissions" \
  "low" \
  "marketing" \
  "3"

echo ""
echo "✅ All launch tasks created successfully!"
echo ""
echo "📊 View tasks in BrainOps Command Center:"
echo "   https://brainops-command-center.vercel.app/tasks-manager"
echo ""
echo "💡 Tip: Tasks are sorted by AI priority score (0.95) for launch urgency"
