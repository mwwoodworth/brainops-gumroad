#!/bin/bash

##############################################################################
# BRAINOPS REVENUE ENGINE - INTERACTIVE PRE-LAUNCH GUIDE
# Walks through all manual setup steps before launch day
##############################################################################

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║       BRAINOPS REVENUE ENGINE - PRE-LAUNCH PREPARATION GUIDE     ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "This interactive guide will help you complete the 5-7 hours of"
echo "manual setup required before your launch day."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Progress tracking
STEP=1
TOTAL_STEPS=4

show_step() {
  echo ""
  echo "═══════════════════════════════════════════════════════════════════"
  echo "  STEP $STEP OF $TOTAL_STEPS: $1"
  echo "═══════════════════════════════════════════════════════════════════"
  echo ""
  ((STEP++))
}

press_enter() {
  echo ""
  read -p "Press ENTER when ready to continue..."
  echo ""
}

# STEP 1: ConvertKit Email Sequence
show_step "CONVERTKIT EMAIL SEQUENCE SETUP (30 minutes)"

echo "📧 You'll create a 5-part email sequence in ConvertKit."
echo ""
echo "What you need:"
echo "  • ConvertKit account (free plan works)"
echo "  • Email content from: LAUNCH_EMAIL_SEQUENCE.md"
echo "  • 30 minutes of focused time"
echo ""
echo "Instructions:"
echo "  1. Go to: https://app.convertkit.com/sequences/new"
echo "  2. Name: \"BrainOps Product Launch\""
echo "  3. Create 5 emails with these delays:"
echo "     • Email 1: Day 0 (immediately)"
echo "     • Email 2: Wait 1 day"
echo "     • Email 3: Wait 1 day"
echo "     • Email 4: Wait 1 day"
echo "     • Email 5: Wait 1 day"
echo "  4. Copy content from LAUNCH_EMAIL_SEQUENCE.md for each email"
echo "  5. Activate the sequence"
echo ""
echo "💡 TIP: Use the exact subject lines - they're optimized for open rates"
echo ""

read -p "Have you completed the ConvertKit setup? (y/n): " convertkit_done
if [[ $convertkit_done == "y" ]]; then
  echo "✅ ConvertKit setup marked as complete!"
else
  echo "⏸️  ConvertKit setup pending - come back to this"
fi

press_enter

# STEP 2: Gumroad Product Uploads
show_step "GUMROAD PRODUCT UPLOADS (2-3 hours)"

echo "💰 You'll upload 13 products to Gumroad manually."
echo ""
echo "What you need:"
echo "  • Gumroad account (free)"
echo "  • Product files in: /home/matt-woodworth/dev/brainops-gumroad/build/"
echo "  • Product specs in: gumroad-products-import.json"
echo "  • 2-3 hours of time (can split across multiple days)"
echo ""
echo "Instructions:"
echo "  1. Go to: https://gumroad.com/products/new"
echo "  2. Follow step-by-step guide in: LAUNCH_DAY_CHECKLIST.md"
echo "  3. Upload products in this order (easiest first):"
echo "     a) Individual products (10 products)"
echo "     b) Bundles (3 bundles)"
echo "  4. Create discount codes:"
echo "     • LAUNCH20: 20% off, expires in 48 hours"
echo "     • TEST100: 100% off for testing (1 use only)"
echo ""
echo "💡 TIP: Do a test purchase with TEST100 before launch!"
echo ""
echo "Product pricing reference:"
echo "  • AI Prompt Packs: \$97-\$147"
echo "  • Automation Packs: \$297-\$497"
echo "  • Code Starter Kits: \$97-\$197"
echo "  • Core AI Prompts Bundle: \$297"
echo "  • Automation Pack Bundle: \$997"
echo "  • Ultimate All-Access: \$997 ⭐"
echo ""

read -p "Have you uploaded all products to Gumroad? (y/n): " gumroad_done
if [[ $gumroad_done == "y" ]]; then
  echo "✅ Gumroad uploads marked as complete!"
  echo ""
  read -p "Did you test purchase with TEST100 code? (y/n): " test_done
  if [[ $test_done == "y" ]]; then
    echo "✅ Test purchase verified!"
  else
    echo "⚠️  CRITICAL: Test purchase before launch day!"
  fi
else
  echo "⏸️  Gumroad uploads pending - this is required for launch"
fi

press_enter

# STEP 3: Social Media Scheduling
show_step "SOCIAL MEDIA SCHEDULING (1 hour)"

echo "📱 You'll schedule 9 posts across LinkedIn and Twitter."
echo ""
echo "What you need:"
echo "  • Buffer.com account (free) OR manual posting plan"
echo "  • Social content in: SOCIAL_MEDIA_POSTS.md"
echo "  • 1 hour for scheduling"
echo ""
echo "Posting schedule:"
echo "  Launch Day (Day 0):"
echo "    • Post 1: Problem/Solution (SaaS ERP)"
echo "    • Post 2: Problem/Solution (AI Orchestrator)"
echo "    • Post 3: Problem/Solution (UI Kit)"
echo ""
echo "  Day 1:"
echo "    • Post 4: Social Proof (SaaS ERP)"
echo "    • Post 5: Social Proof (AI Orchestrator)"
echo "    • Post 6: Social Proof (UI Kit)"
echo ""
echo "  Day 2:"
echo "    • Post 7: Storytelling (SaaS ERP)"
echo "    • Post 8: Storytelling (AI Orchestrator)"
echo "    • Post 9: Storytelling (UI Kit)"
echo ""
echo "💡 TIP: Best posting times - 9 AM, 12 PM, 3 PM (your timezone)"
echo ""

read -p "Have you scheduled social media posts? (y/n): " social_done
if [[ $social_done == "y" ]]; then
  echo "✅ Social media scheduling complete!"
else
  echo "⏸️  Social media scheduling pending - optional but recommended"
fi

press_enter

# STEP 4: Reddit & Hacker News Prep
show_step "REDDIT & HACKER NEWS PREPARATION (30 minutes)"

echo "🌐 Prepare (but don't post yet!) Reddit and Hacker News submissions."
echo ""
echo "What you need:"
echo "  • Reddit account (>30 days old, some karma)"
echo "  • Hacker News account"
echo "  • Templates in: STRATEGIC_ADVICE.md"
echo ""
echo "Launch Day posting plan:"
echo "  9:00 AM - Post to Hacker News (Show HN format)"
echo "  10:00 AM - Post to r/SaaS"
echo "  11:00 AM - Post to r/Entrepreneur"
echo "  12:00 PM - Post to r/webdev"
echo ""
echo "💡 CRITICAL TIPS:"
echo "  • Don't post all at once (looks spammy)"
echo "  • Engage with ALL comments within 1 hour"
echo "  • Be helpful, not salesy"
echo "  • Have post templates ready to copy-paste"
echo ""
echo "Subreddit rules to review:"
echo "  • r/SaaS: Self-promotion Saturdays only"
echo "  • r/Entrepreneur: Read sidebar rules"
echo "  • r/webdev: Show off Saturdays preferred"
echo ""

read -p "Have you prepared Reddit/HN posts? (y/n): " reddit_done
if [[ $reddit_done == "y" ]]; then
  echo "✅ Reddit/HN preparation complete!"
  echo "⚠️  Remember: Post on launch day, not before!"
else
  echo "⏸️  Reddit/HN prep pending - do this 1 day before launch"
fi

press_enter

# Final Summary
echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                   PRE-LAUNCH SETUP SUMMARY                       ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

COMPLETED=0
TOTAL=4

[[ $convertkit_done == "y" ]] && ((COMPLETED++))
[[ $gumroad_done == "y" ]] && ((COMPLETED++))
[[ $social_done == "y" ]] && ((COMPLETED++))
[[ $reddit_done == "y" ]] && ((COMPLETED++))

echo "Progress: $COMPLETED / $TOTAL steps completed"
echo ""

if [[ $convertkit_done == "y" ]]; then
  echo "✅ ConvertKit Email Sequence"
else
  echo "⏸️  ConvertKit Email Sequence - PENDING"
fi

if [[ $gumroad_done == "y" ]]; then
  echo "✅ Gumroad Product Uploads"
  if [[ $test_done == "y" ]]; then
    echo "   ✅ Test purchase verified"
  else
    echo "   ⚠️  Test purchase NOT verified"
  fi
else
  echo "⏸️  Gumroad Product Uploads - PENDING (CRITICAL)"
fi

if [[ $social_done == "y" ]]; then
  echo "✅ Social Media Scheduling"
else
  echo "⏸️  Social Media Scheduling - PENDING (optional)"
fi

if [[ $reddit_done == "y" ]]; then
  echo "✅ Reddit & Hacker News Prep"
else
  echo "⏸️  Reddit & Hacker News Prep - PENDING"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [[ $COMPLETED -eq $TOTAL ]]; then
  echo "🎉 ALL SETUP COMPLETE! YOU'RE READY TO LAUNCH! 🎉"
  echo ""
  echo "Next steps:"
  echo "  1. Pick your launch date (Tuesday or Wednesday recommended)"
  echo "  2. Read LAUNCH_EXECUTION_SUMMARY.md for launch day timeline"
  echo "  3. Set calendar reminders for posting times"
  echo "  4. Get a good night's sleep before launch day!"
  echo ""
  echo "Estimated revenue Week 1: \$2,000-\$5,000"
  echo "Estimated revenue Month 1: \$10,000+"
  echo ""
  echo "YOU'VE GOT THIS! 🚀"
else
  REMAINING=$((TOTAL - COMPLETED))
  echo "⏸️  $REMAINING step(s) remaining before launch ready"
  echo ""
  echo "Next actions:"

  if [[ $gumroad_done != "y" ]]; then
    echo "  🔴 CRITICAL: Complete Gumroad uploads (required for launch)"
  fi

  if [[ $convertkit_done != "y" ]]; then
    echo "  🟡 HIGH PRIORITY: Set up ConvertKit sequence (30 min)"
  fi

  if [[ $reddit_done != "y" ]]; then
    echo "  🟡 MEDIUM: Prepare Reddit/HN posts (30 min)"
  fi

  if [[ $social_done != "y" ]]; then
    echo "  🟢 OPTIONAL: Schedule social media (1 hour)"
  fi

  echo ""
  echo "Run this script again to track progress:"
  echo "  bash scripts/pre-launch-guide.sh"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📖 Documentation references:"
echo "  • Email content: LAUNCH_EMAIL_SEQUENCE.md"
echo "  • Gumroad guide: LAUNCH_DAY_CHECKLIST.md"
echo "  • Social posts: SOCIAL_MEDIA_POSTS.md"
echo "  • Marketing strategy: STRATEGIC_ADVICE.md"
echo "  • Full execution plan: LAUNCH_EXECUTION_SUMMARY.md"
echo ""
