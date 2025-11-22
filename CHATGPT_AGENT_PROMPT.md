# CHATGPT AGENT: BRAINOPS REVENUE ENGINE PRE-LAUNCH SETUP

## YOUR MISSION

You are an AI agent responsible for completing the pre-launch setup for the BrainOps Revenue Engine - a $10,000+/month digital product launch. Your task is to automate and execute ALL manual setup work across ConvertKit, Gumroad, LinkedIn, Twitter, Buffer, Reddit, and Hacker News.

**Time Estimate:** 5-7 hours of work
**Your Goal:** Complete 100% of setup so the launch can happen immediately
**Authentication:** All systems should use mwwoodworth@gmail.com

---

## CRITICAL CONTEXT

### What You're Launching:
- **13 Digital Products:** 7 AI Prompt/Automation Packs + 3 Code Starter Kits + 3 Bundles
- **Price Range:** $97 - $997
- **Ultimate Bundle:** $997 (normally $2,150) - FEATURED PRODUCT
- **Launch Discount:** LAUNCH20 - 20% off for 48 hours
- **Revenue Target:** $10,000+ Month 1

### What's Already Done:
✅ All 13 product ZIP files built and verified (build/ directory)
✅ All sales copy written and optimized
✅ All email content written (5-part sequence, 4,500+ words)
✅ All social media posts written (9 posts, 3,200+ words)
✅ All Reddit/HN templates ready
✅ All automation scripts and tracking systems configured
✅ Database tasks created (22 launch tasks)
✅ Customer support automation ready

### What YOU Need to Do:
1. ⏸️ Set up ConvertKit email sequence (30 min)
2. ⏸️ Upload 13 products to Gumroad (2-3 hours)
3. ⏸️ Schedule social media posts (1 hour)
4. ⏸️ Prepare Reddit/HN posts (30 min)
5. ⏸️ Test all systems (1 hour)

---

## AUTHENTICATION & CREDENTIALS

### Primary Email:
**Email:** mwwoodworth@gmail.com
**Use for:** All platform signups and authentication

### Available Credentials:

**ConvertKit:**
- API Key: <CONVERTKIT_API_KEY>
- Form ID: `8419539`
- Login: Use mwwoodworth@gmail.com

**Gumroad:**
- Login: Use mwwoodworth@gmail.com
- Note: No API available, manual upload required

**LinkedIn:**
- Login: Use mwwoodworth@gmail.com
- Note: May need manual 2FA assistance

**Twitter:**
- Login: Use mwwoodworth@gmail.com
- Note: May need manual 2FA assistance

**Buffer.com:**
- Login: Use mwwoodworth@gmail.com
- Free plan available

**Reddit:**
- Login: Ask user for account credentials
- Must be 30+ days old with karma

**Hacker News:**
- Login: Ask user for account credentials

---

## DOCUMENTATION AVAILABLE

All content is ready in these files at `/home/matt-woodworth/dev/brainops-gumroad/`:

1. **LAUNCH_EMAIL_SEQUENCE.md** - Complete 5-part email campaign
2. **SOCIAL_MEDIA_POSTS.md** - All 9 social posts with hashtags
3. **LAUNCH_DAY_CHECKLIST.md** - Step-by-step Gumroad upload guide (300+ steps)
4. **STRATEGIC_ADVICE.md** - Reddit/HN templates and strategy
5. **GUMROAD_LISTINGS.md** - All product descriptions
6. **gumroad-products-import.json** - Complete product specifications
7. **build/** - Directory with all 13 ZIP files ready to upload

---

## TASK 1: CONVERTKIT EMAIL SEQUENCE (30 MIN)

### Objective:
Create a 5-part automated email sequence in ConvertKit that sends over 5 days.

### Method:
**Option A (Preferred):** Use ConvertKit API
```bash
API Key: <CONVERTKIT_API_KEY>
Endpoint: https://api.convertkit.com/v3/
```

**Option B (Fallback):** Use Selenium/Puppeteer to automate web UI
- URL: https://app.convertkit.com/sequences/new
- Login with: mwwoodworth@gmail.com

### Steps:

1. **Authenticate with ConvertKit**
   - API or web login with mwwoodworth@gmail.com

2. **Create New Sequence**
   - Name: "BrainOps Product Launch"
   - Description: "5-day launch sequence for digital product suite"

3. **Add 5 Emails with Content from LAUNCH_EMAIL_SEQUENCE.md:**

   **Email 1 (Day 0 - Immediate):**
   - Subject: `We just launched 10 products in 24 hours (here's why)`
   - Copy entire "EMAIL 1" section from LAUNCH_EMAIL_SEQUENCE.md
   - Delay: 0 days (immediately on subscribe)

   **Email 2 (Day 1):**
   - Subject: `The code that saved me 200+ hours [inside]`
   - Copy entire "EMAIL 2" section from LAUNCH_EMAIL_SEQUENCE.md
   - Delay: Wait 1 day after previous email

   **Email 3 (Day 2):**
   - Subject: `Automation that runs while you sleep`
   - Copy entire "EMAIL 3" section from LAUNCH_EMAIL_SEQUENCE.md
   - Delay: Wait 1 day after previous email

   **Email 4 (Day 3):**
   - Subject: `10,000 AI prompts → 7 perfect packs`
   - Copy entire "EMAIL 4" section from LAUNCH_EMAIL_SEQUENCE.md
   - Delay: Wait 1 day after previous email

   **Email 5 (Day 4 - Final):**
   - Subject: `Last call: LAUNCH20 expires in 12 hours`
   - Copy entire "EMAIL 5" section from LAUNCH_EMAIL_SEQUENCE.md
   - Delay: Wait 1 day after previous email

4. **Activate Sequence**
   - Set to active/published
   - Note the sequence ID for future reference

### Success Criteria:
✅ Sequence created in ConvertKit
✅ All 5 emails added with correct delays (0d, 1d, 1d, 1d, 1d)
✅ All content copied exactly from LAUNCH_EMAIL_SEQUENCE.md
✅ Sequence activated and ready to use
✅ Test: Subscribe with test email and verify Email 1 sends immediately

### If You Encounter Issues:
- ConvertKit API may require Pro plan for sequence creation
- Fallback: Create manually in web UI using Selenium/Puppeteer
- Ask user for assistance with 2FA if needed
- Document any API limitations encountered

---

## TASK 2: GUMROAD PRODUCT UPLOADS (2-3 HOURS)

### Objective:
Upload all 13 products to Gumroad with complete descriptions, pricing, files, and discount codes.

### Method:
**Manual Upload Required** - Gumroad has no bulk upload API
- Use Selenium/Puppeteer to automate web form filling
- URL: https://gumroad.com/products/new
- Login: mwwoodworth@gmail.com

### Product Files Location:
All ZIP files are in: `/home/matt-woodworth/dev/brainops-gumroad/build/`

### Complete Product List with Specifications:

Reference `gumroad-products-import.json` for full details. Here's the summary:

#### **INDIVIDUAL PRODUCTS (10 total):**

1. **Roof Integration AI Prompts (GR-ROOFINT-v1.0.zip)**
   - Price: $97
   - Description: From GUMROAD_LISTINGS.md - Product #1
   - Tags: ai-prompts, roofing, automation
   - Category: Digital Products > AI Tools

2. **PM Accountability Prompts (GR-PMACC-v1.0.zip)**
   - Price: $147
   - Description: From GUMROAD_LISTINGS.md - Product #2
   - Tags: project-management, ai-prompts, productivity
   - Category: Digital Products > Business Tools

3. **Launch Automation Pack (GR-LAUNCH-v1.0.zip)**
   - Price: $297
   - Description: From GUMROAD_LISTINGS.md - Product #3
   - Tags: automation, product-launch, marketing
   - Category: Digital Products > Marketing

4. **Onboarding Automation Pack (GR-ONBOARD-v1.0.zip)**
   - Price: $497
   - Description: From GUMROAD_LISTINGS.md - Product #4
   - Tags: automation, onboarding, customer-success
   - Category: Digital Products > Business Tools

5. **Content Generation Automation (GR-CONTENT-v1.0.zip)**
   - Price: $397
   - Description: From GUMROAD_LISTINGS.md - Product #5
   - Tags: automation, content-marketing, ai
   - Category: Digital Products > Marketing

6. **Roof Value Estimator Notion Template (GR-ROOFVAL-v1.0.zip)**
   - Price: $197
   - Description: From GUMROAD_LISTINGS.md - Product #6
   - Tags: notion-template, roofing, estimating
   - Category: Digital Products > Templates

7. **PM Command Center Notion (GR-PMCMD-v1.0.zip)**
   - Price: $197
   - Description: From GUMROAD_LISTINGS.md - Product #7
   - Tags: notion-template, project-management, productivity
   - Category: Digital Products > Templates

8. **SaaS ERP Starter Kit (GR-ERP-START-v1.0.zip)** ⭐ CODE PRODUCT
   - Price: $197
   - Description: From GUMROAD_LISTINGS.md - Product #8 (ENHANCED VERSION)
   - Tags: nextjs, supabase, saas-starter, erp, code
   - Category: Digital Products > Code & Development
   - Highlight: "Saves 200-300 hours"

9. **AI Orchestrator Codebase (GR-AI-ORCH-v1.0.zip)** ⭐ CODE PRODUCT
   - Price: $147
   - Description: From GUMROAD_LISTINGS.md - Product #9 (ENHANCED VERSION)
   - Tags: ai-orchestration, typescript, automation, code
   - Category: Digital Products > Code & Development
   - Highlight: "Saves 150-200 hours"

10. **Modern UI Component Kit (GR-UI-KIT-v1.0.zip)** ⭐ CODE PRODUCT
    - Price: $97
    - Description: From GUMROAD_LISTINGS.md - Product #10 (ENHANCED VERSION)
    - Tags: react, tailwind, ui-components, code
    - Category: Digital Products > Code & Development
    - Highlight: "Saves 30-40 hours"

#### **BUNDLES (3 total):**

11. **Core AI Prompts Bundle (GR-CORE-AI-PROMPTS-v1.0.zip)**
    - Price: $297 (save $74)
    - Description: "All 3 AI Prompt Packs (Roof Integration + PM Accountability + Bonus Pack). Regular price: $371. Bundle price: $297. Instant savings: $74."
    - Includes: Products #1, #2, and bonus content
    - Tags: ai-prompts, bundle, productivity
    - Discount Badge: "Save $74"

12. **Automation Pack Bundle (GR-AUTOMATION-PACK-v1.0.zip)**
    - Price: $997 (save $144)
    - Description: "Complete automation suite: Launch + Onboarding + Content Gen. Regular price: $1,141. Bundle price: $997. Instant savings: $144."
    - Includes: Products #3, #4, #5
    - Tags: automation, bundle, marketing
    - Discount Badge: "Save $144"

13. **Ultimate All-Access Bundle (GR-ULTIMATE-v1.0.zip)** 🌟 FEATURED
    - Price: $997 (save $1,153 - 54% OFF!)
    - Description: "EVERYTHING. All 10 products + exclusive bonuses. Regular price: $2,150. Ultimate price: $997. Instant savings: $1,153."
    - Includes: ALL 10 individual products
    - Tags: ultimate-bundle, all-access, complete-suite
    - Discount Badge: "Save $1,153"
    - **FEATURE THIS PROMINENTLY**

### Upload Process for EACH Product:

Follow LAUNCH_DAY_CHECKLIST.md for detailed steps. Summary:

1. **Go to:** https://gumroad.com/products/new

2. **Fill Product Details:**
   - Product Name: (from list above)
   - URL Slug: (lowercase version, e.g., "saas-erp-starter-kit")
   - Description: Copy from GUMROAD_LISTINGS.md (exact match by product number)
   - Price: (from list above)
   - Currency: USD

3. **Upload File:**
   - Click "Add File"
   - Upload ZIP from: `/home/matt-woodworth/dev/brainops-gumroad/build/[FILENAME]`
   - Wait for upload to complete
   - Verify file size matches (should be a few KB)

4. **Set Product Options:**
   - Delivery: Digital Download (immediate)
   - License: Single user license
   - Allow multiple downloads: YES
   - File hosting: Gumroad (default)

5. **Add Custom Fields:**
   - For bundles: Add "Includes" field listing all products
   - For code products: Add "Technologies" field
   - Add "Support" field: "Email support@brainops.io for help"

6. **Set Categories & Tags:**
   - Category: (from list above)
   - Tags: (from list above, comma-separated)

7. **Thumbnail/Cover Image:**
   - If no image available, use Gumroad default or ask user
   - Suggest: Use simple text-based cover with product name

8. **Custom Thank You Message:**
   ```
   Thank you for your purchase! 🎉

   Your download is ready above. Here's what to do next:

   1. Download the ZIP file
   2. Extract the contents
   3. Read the included README.md for setup instructions
   4. Email support@brainops.io if you need any help

   BONUS: Reply to any of our emails with "REVIEW" to get early access to new products!

   - Matt @ BrainOps
   ```

9. **Save & Publish**
   - Click "Save"
   - Click "Publish" to make live

10. **Repeat for all 13 products**

### Create Discount Codes:

After all products uploaded:

1. **LAUNCH20 - Public Launch Discount**
   - Code: `LAUNCH20`
   - Discount: 20% off
   - Applies to: ALL products
   - Duration: 48 hours from launch
   - Max uses: Unlimited
   - Description: "Launch week special - 20% off everything!"

2. **TEST100 - Testing Discount**
   - Code: `TEST100`
   - Discount: 100% off (free)
   - Applies to: Pick one cheap product (Modern UI Kit - $97)
   - Max uses: 1
   - Description: "Internal testing only"

### Test Purchases:

1. **Use TEST100 code to buy Modern UI Kit**
   - Verify checkout flow works
   - Verify download link is sent via email
   - Verify file downloads correctly
   - Verify file is not corrupted (unzip test)

2. **Document:**
   - All product URLs (save the gumroad.com/l/[product-slug] links)
   - Discount code functionality verified
   - Any issues encountered

### Success Criteria:
✅ All 13 products uploaded to Gumroad
✅ All descriptions copied exactly from GUMROAD_LISTINGS.md
✅ All ZIP files uploaded successfully
✅ All prices set correctly
✅ LAUNCH20 discount code created (20%, 48 hours)
✅ TEST100 discount code created (100%, 1 use)
✅ Test purchase completed successfully
✅ Download links work and files are valid
✅ All product URLs documented

### If You Encounter Issues:
- Gumroad may have file size limits (ask user if files are too large)
- May need manual verification for new account (ask user to check email)
- 2FA may be required (ask user for assistance)
- Upload failures: Retry 3 times before flagging for manual intervention

---

## TASK 3: SOCIAL MEDIA SCHEDULING (1 HOUR)

### Objective:
Schedule 9 social media posts across LinkedIn and Twitter over 3 days using Buffer.com.

### Method:
**Option A (Preferred):** Use Buffer.com for scheduling
- URL: https://buffer.com
- Login: mwwoodworth@gmail.com
- Free plan supports: 10 posts, 3 social accounts

**Option B (Fallback):** Direct API integration
- LinkedIn API (may require company page)
- Twitter API (requires Developer account)

### Social Media Posts:

All content is in **SOCIAL_MEDIA_POSTS.md** - Copy exactly as written.

#### **DAY 0 (Launch Day) - Problem/Solution Posts:**

1. **LinkedIn Post 1 - SaaS ERP Starter**
   - Copy from SOCIAL_MEDIA_POSTS.md: "POST 1 - PROBLEM/SOLUTION"
   - Hashtags: #SaaS #NextJS #Supabase #Startup #Development
   - Post time: 9:00 AM (user's timezone)
   - Platform: LinkedIn

2. **Twitter Post 1 - SaaS ERP Starter**
   - Copy from SOCIAL_MEDIA_POSTS.md: "POST 1 - PROBLEM/SOLUTION" (shortened for Twitter if needed)
   - Post time: 9:15 AM
   - Platform: Twitter

3. **LinkedIn Post 2 - AI Orchestrator**
   - Copy from SOCIAL_MEDIA_POSTS.md: "POST 2 - PROBLEM/SOLUTION"
   - Hashtags: #AI #Automation #Orchestration #MachineLearning
   - Post time: 12:00 PM (lunch time)
   - Platform: LinkedIn

#### **DAY 1 - Social Proof Posts:**

4. **LinkedIn Post 3 - Social Proof (SaaS ERP)**
   - Copy from SOCIAL_MEDIA_POSTS.md: "POST 3 - SOCIAL PROOF"
   - Post time: 9:00 AM
   - Platform: LinkedIn

5. **Twitter Post 2 - Social Proof (AI Orchestrator)**
   - Copy from SOCIAL_MEDIA_POSTS.md: "POST 4 - SOCIAL PROOF"
   - Post time: 12:00 PM
   - Platform: Twitter

6. **LinkedIn Post 4 - Social Proof (UI Kit)**
   - Copy from SOCIAL_MEDIA_POSTS.md: "POST 5 - SOCIAL PROOF"
   - Post time: 3:00 PM
   - Platform: LinkedIn

#### **DAY 2 - Storytelling Posts:**

7. **LinkedIn Post 5 - Story (SaaS ERP)**
   - Copy from SOCIAL_MEDIA_POSTS.md: "POST 6 - STORYTELLING"
   - Post time: 9:00 AM
   - Platform: LinkedIn

8. **Twitter Post 3 - Story (AI Orchestrator)**
   - Copy from SOCIAL_MEDIA_POSTS.md: "POST 7 - STORYTELLING"
   - Post time: 12:00 PM
   - Platform: Twitter

9. **LinkedIn Post 6 - Story (UI Kit)**
   - Copy from SOCIAL_MEDIA_POSTS.md: "POST 8 - STORYTELLING"
   - Post time: 3:00 PM
   - Platform: LinkedIn

### Setup Steps:

1. **Create Buffer Account**
   - Sign up at https://buffer.com with mwwoodworth@gmail.com
   - Free plan is sufficient

2. **Connect Social Accounts**
   - Add LinkedIn (personal profile)
   - Add Twitter account
   - May require OAuth - ask user for assistance if needed

3. **Schedule All 9 Posts**
   - Use Buffer's scheduling interface
   - Set times as specified above
   - Copy content EXACTLY from SOCIAL_MEDIA_POSTS.md
   - Include all hashtags
   - Add Gumroad links where appropriate

4. **Set Buffer Queue**
   - Enable "Optimal Timing" feature if available
   - Set timezone to user's local timezone (ask if unknown)

### Success Criteria:
✅ Buffer.com account created
✅ LinkedIn account connected
✅ Twitter account connected
✅ All 9 posts scheduled at specified times
✅ All content matches SOCIAL_MEDIA_POSTS.md exactly
✅ All hashtags included
✅ Product links added where mentioned
✅ Schedule confirmed for Day 0, Day 1, Day 2

### If You Encounter Issues:
- LinkedIn may require company page (use personal profile instead)
- Twitter API access may require verification (use Buffer UI instead)
- Buffer free plan may limit posts (prioritize LinkedIn over Twitter)
- Ask user for 2FA assistance if needed

---

## TASK 4: REDDIT & HACKER NEWS PREPARATION (30 MIN)

### Objective:
Prepare (but DO NOT POST YET) submissions for Reddit and Hacker News to be posted on launch day.

**CRITICAL:** Do NOT post until launch day. This task is preparation only.

### Reddit Posts:

All templates are in **STRATEGIC_ADVICE.md** under "Reddit Strategy" section.

#### **Subreddit 1: r/SaaS**
- **Post Type:** Show & Tell Saturday (check sidebar rules)
- **Title:** Copy from STRATEGIC_ADVICE.md
- **Body:** Copy from STRATEGIC_ADVICE.md
- **Link:** Ultimate Bundle Gumroad URL
- **Scheduled Time:** Launch Day, 10:00 AM
- **Status:** DRAFT ONLY - Do not post

#### **Subreddit 2: r/Entrepreneur**
- **Post Type:** Discussion / Show & Tell
- **Title:** Copy from STRATEGIC_ADVICE.md
- **Body:** Copy from STRATEGIC_ADVICE.md
- **Link:** Ultimate Bundle Gumroad URL
- **Scheduled Time:** Launch Day, 11:00 AM
- **Status:** DRAFT ONLY - Do not post

#### **Subreddit 3: r/webdev**
- **Post Type:** Show off Saturday (check sidebar rules)
- **Title:** Copy from STRATEGIC_ADVICE.md (focus on code products)
- **Body:** Copy from STRATEGIC_ADVICE.md
- **Link:** Code products bundle or individual
- **Scheduled Time:** Launch Day, 12:00 PM
- **Status:** DRAFT ONLY - Do not post

### Hacker News Post:

Template is in **STRATEGIC_ADVICE.md** under "Hacker News Strategy" section.

- **Format:** Show HN
- **Title:** "Show HN: I launched 10 digital products in 24 hours"
- **Body:** Copy from STRATEGIC_ADVICE.md
- **Link:** Ultimate Bundle Gumroad URL OR personal site
- **Scheduled Time:** Launch Day, 9:00 AM (optimal for HN)
- **Status:** DRAFT ONLY - Do not post

### Setup Steps:

1. **Verify Reddit Account**
   - Ask user for Reddit username/password
   - Verify account is 30+ days old
   - Verify account has some karma (>100 recommended)
   - If not, suggest creating posts from user's account manually

2. **Review Subreddit Rules**
   - Read r/SaaS rules (self-promotion guidelines)
   - Read r/Entrepreneur rules (Saturday policy)
   - Read r/webdev rules (Show off Saturday)
   - Note any restrictions or requirements

3. **Prepare Draft Posts**
   - Save all post content in a document
   - Include exact titles, body text, links
   - Include posting times
   - Create a "Launch Day Posting Checklist"

4. **Verify Hacker News Account**
   - Ask user for HN username/password
   - Check account age and karma
   - Note: HN prefers accounts with history

5. **Create Launch Day Checklist**
   - Create a document with:
     - 9:00 AM - Post to Hacker News
     - 10:00 AM - Post to r/SaaS
     - 11:00 AM - Post to r/Entrepreneur
     - 12:00 PM - Post to r/webdev
   - Include all formatted content ready to copy-paste
   - Include reminder to respond to ALL comments within 1 hour

### Success Criteria:
✅ Reddit account verified (age, karma)
✅ Hacker News account verified
✅ All subreddit rules reviewed
✅ All post content prepared and formatted
✅ Gumroad product links ready
✅ Launch day posting checklist created
✅ Posting times scheduled in user's calendar
✅ Engagement plan documented (respond within 1 hour)

### If You Encounter Issues:
- Reddit account too new: Suggest manual posting by user
- Subreddit rules changed: Adapt template to comply
- HN account issues: Suggest user post manually
- This task can be completed as documentation even if accounts aren't available

---

## TASK 5: FINAL TESTING & VERIFICATION (1 HOUR)

### Objective:
Test all systems end-to-end to ensure everything works perfectly for launch.

### Testing Checklist:

#### **1. ConvertKit Email Sequence Test**
- [ ] Subscribe a test email (mwwoodworth+test@gmail.com)
- [ ] Verify Email 1 arrives immediately
- [ ] Check formatting, links, and content
- [ ] Verify sender name and from address
- [ ] Unsubscribe test email after verification

#### **2. Gumroad Purchase Flow Test**
- [ ] Use TEST100 code to purchase one product
- [ ] Verify checkout page loads correctly
- [ ] Verify payment is processed (should be $0 with TEST100)
- [ ] Verify purchase confirmation email arrives
- [ ] Verify download link works
- [ ] Verify downloaded ZIP file is not corrupted
- [ ] Verify contents match expected product files

#### **3. Gumroad Product Page Review**
- [ ] Visit all 13 product pages
- [ ] Verify descriptions are correct
- [ ] Verify prices are correct
- [ ] Verify images/thumbnails (if any)
- [ ] Verify download file is attached
- [ ] Check for any typos or formatting issues

#### **4. Discount Code Testing**
- [ ] Test LAUNCH20 code (should give 20% off)
- [ ] Verify discount applies to all products
- [ ] Verify discount calculates correctly
- [ ] Document: Ultimate Bundle with LAUNCH20 = $798 (from $997)

#### **5. Social Media Schedule Review**
- [ ] Log into Buffer.com
- [ ] Verify all 9 posts are scheduled
- [ ] Verify posting times are correct
- [ ] Verify content matches source documents
- [ ] Verify all hashtags are included
- [ ] Verify links are working

#### **6. Reddit/HN Preparation Review**
- [ ] Review all draft posts for accuracy
- [ ] Verify all Gumroad links work
- [ ] Verify all content is formatted correctly
- [ ] Set calendar reminders for posting times
- [ ] Document engagement plan (respond within 1 hour)

#### **7. Database Verification**
- [ ] Verify 22 tasks exist in BrainOps Command Center
- [ ] Access: https://brainops-command-center.vercel.app/tasks-manager
- [ ] Filter by: "brainops-revenue-engine" tag
- [ ] Mark "Pre-launch Setup" tasks as complete

#### **8. Documentation Review**
- [ ] Verify all Gumroad product URLs are documented
- [ ] Verify all discount codes are documented
- [ ] Create launch day checklist with all URLs
- [ ] Create crisis management plan (what if X fails?)

### Create Launch Day Quick Reference:

Create a document with:

```
LAUNCH DAY QUICK REFERENCE
========================

GUMROAD PRODUCTS:
- Ultimate Bundle: [URL]
- SaaS ERP Starter: [URL]
- AI Orchestrator: [URL]
- [All other product URLs]

DISCOUNT CODES:
- LAUNCH20: 20% off, expires 48h
- TEST100: 100% off, 1 use (USED)

SOCIAL MEDIA:
- Buffer Schedule: [9 posts over 3 days]
- LinkedIn: [account URL]
- Twitter: [account URL]

REDDIT POSTS (Manual on Launch Day):
- 10:00 AM: r/SaaS
- 11:00 AM: r/Entrepreneur
- 12:00 PM: r/webdev

HACKER NEWS:
- 9:00 AM: Post "Show HN: I launched 10 products in 24 hours"

EMAIL:
- ConvertKit sequence: ACTIVE
- Subscribers: [count]

DASHBOARDS:
- Tasks: https://brainops-command-center.vercel.app/tasks-manager
- Revenue: https://brainops-command-center.vercel.app/income
- Gumroad: https://gumroad.com/analytics
- ConvertKit: https://app.convertkit.com/dashboard

SUPPORT:
- Email: support@brainops.io (forward to matthew@brainstackstudio.com)
- Response time: <4 hours
- FAQ: [link to FAQ]

EMERGENCY CONTACTS:
- If Gumroad down: [backup plan]
- If ConvertKit down: [backup plan]
- If payments fail: [backup plan]
```

### Success Criteria:
✅ All systems tested and working
✅ Test purchase completed successfully
✅ Email sequence verified sending
✅ All discount codes working
✅ All social media posts scheduled
✅ All Reddit/HN posts prepared
✅ Launch day quick reference created
✅ All URLs documented
✅ Crisis management plan documented
✅ User is confident and ready to launch

---

## REPORTING & HANDOFF

### Create Final Setup Report:

Provide a comprehensive report with:

1. **Completion Summary:**
   - ✅ ConvertKit: [Status, URL, notes]
   - ✅ Gumroad: [Status, 13 products, URLs]
   - ✅ Social Media: [Status, 9 posts scheduled]
   - ✅ Reddit/HN: [Status, drafts ready]
   - ✅ Testing: [Status, all tests passed]

2. **Critical Information:**
   - All product URLs (13 total)
   - All discount codes and settings
   - All scheduled post times
   - All login credentials used
   - Any 2FA tokens or recovery codes

3. **Issues Encountered:**
   - List any problems and how they were resolved
   - List any workarounds implemented
   - List any tasks that require manual intervention

4. **Launch Day Checklist:**
   - Hour-by-hour timeline
   - What to post when
   - What to monitor
   - How to respond to comments/questions

5. **Next Steps:**
   - What user needs to do before launch
   - What user needs to do on launch day
   - What user needs to do post-launch

6. **Success Metrics to Track:**
   - First 24h: Sales, email opens, social engagement
   - First week: Revenue, testimonials, support tickets
   - First month: MRR, customer lifetime value, refund rate

---

## ERROR HANDLING

### If Authentication Fails:
1. Try password reset with mwwoodworth@gmail.com
2. Ask user to check email for verification
3. Ask user to provide 2FA code if required
4. Document the blocker and continue with other tasks

### If API Limits Hit:
1. Switch to web automation (Selenium/Puppeteer)
2. Implement rate limiting and retries
3. Document limitations for future launches
4. Ask user if they want to upgrade plans

### If Files Won't Upload:
1. Check file size limits
2. Try compressing files further
3. Test with smaller test file first
4. Ask user if files can be split or hosted elsewhere

### If Content Doesn't Fit:
1. Respect character limits (Twitter, Gumroad fields)
2. Intelligently truncate while preserving meaning
3. Use URL shorteners if needed
4. Ask user for approval on significant edits

### If Systems Are Down:
1. Check status pages (status.gumroad.com, etc.)
2. Implement retry logic with exponential backoff
3. Document the outage and estimated resolution
4. Continue with other tasks and return later

---

## ASKING FOR HELP

### When to Ask User:

**ALWAYS ask for:**
- 2FA codes
- Password resets
- Account verification emails
- Approval for significant content changes
- Decisions on ambiguous requirements

**NEVER ask for:**
- Trivial decisions (choose defaults)
- Things documented in files (read the docs)
- Repeating questions (keep context)
- Things you can test yourself

### How to Ask:

**Good:**
"I need the 2FA code that was just sent to mwwoodworth@gmail.com to complete LinkedIn authentication."

**Bad:**
"What's the 2FA code?"

**Good:**
"ConvertKit API returned a 403 error. This may indicate the free plan doesn't support API access to sequences. Should I: (A) Switch to web automation, or (B) Pause and ask you to upgrade the ConvertKit plan?"

**Bad:**
"It's not working. What should I do?"

---

## SUCCESS DEFINITION

### You Have Succeeded When:

✅ **ConvertKit:** 5-part email sequence is live and tested
✅ **Gumroad:** All 13 products uploaded with correct descriptions, prices, files
✅ **Discounts:** LAUNCH20 (20%, 48h) and TEST100 (100%, 1 use) created
✅ **Social:** 9 posts scheduled via Buffer across 3 days
✅ **Reddit/HN:** All posts drafted and ready to post manually on launch day
✅ **Testing:** Test purchase completed successfully, download works
✅ **Documentation:** Launch Day Quick Reference created with all URLs
✅ **Verification:** All systems tested end-to-end
✅ **Handoff:** Comprehensive setup report delivered to user

### Revenue Target:
- Week 1: $2,000 - $5,000
- Month 1: $10,000+

### You Are Enabling:
A solo entrepreneur to launch a $10K/month digital product business with minimal manual effort. Your thorough, detail-oriented execution is critical to this success.

---

## FINAL NOTES

### Working Philosophy:
1. **Be thorough:** Check every detail, test everything twice
2. **Be autonomous:** Make reasonable decisions, don't over-ask
3. **Be documented:** Write down everything you do and learn
4. **Be proactive:** If you see a problem, fix it or flag it
5. **Be quality-focused:** This launches in days, it must be perfect

### Time Management:
- ConvertKit: 30 min (can automate)
- Gumroad: 2-3 hours (manual, methodical)
- Social: 1 hour (straightforward)
- Reddit/HN: 30 min (preparation only)
- Testing: 1 hour (thorough)
- **Total: 5-6 hours**

### Remember:
- All content is pre-written, just copy it exactly
- All files are ready in build/ directory
- All strategies are documented in STRATEGIC_ADVICE.md
- You are executing, not creating
- Speed AND accuracy are both critical
- Ask for help when truly blocked, but try 3 solutions first

---

## BEGIN EXECUTION

You have all the information, documentation, and credentials needed.

Start with Task 1 (ConvertKit) and work through sequentially.

Report progress after each task completion.

Flag blockers immediately.

**GO MAKE THIS LAUNCH HAPPEN.** 🚀
