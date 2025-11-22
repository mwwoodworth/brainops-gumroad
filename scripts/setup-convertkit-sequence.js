#!/usr/bin/env node

/**
 * ConvertKit Email Sequence Setup
 * Programmatically creates the 5-part launch email sequence
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CONVERTKIT_API_KEY = 'kit_fcbff1cd724ae283842f9e0d431a88c7';
const CONVERTKIT_API_SECRET = process.env.CONVERTKIT_API_SECRET || ''; // To be updated
const CONVERTKIT_FORM_ID = process.env.CONVERTKIT_FORM_ID || ''; // To be determined

const baseURL = 'https://api.convertkit.com/v3';

// Email sequence from LAUNCH_EMAIL_SEQUENCE.md
const emailSequence = [
  {
    day: 0,
    subject: "We just launched 10 products in 24 hours (here's why)",
    name: "Email 1: Launch Announcement",
    delay_days: 0,
    body: `Hey {{first_name}},

Quick question: What could you build in 200 hours?

Because that's the time you're about to get back.

After 18 months building enterprise SaaS platforms (WeatherCraft ERP, MyRoofGenius), I extracted every reusable prompt, automation blueprint, and code pattern into a product library.

**Launching today:**
- 7 AI Prompt & Automation Packs ($97-$497)
- 3 Production Code Starter Kits ($97-$197)

The theme? **Time Compression.**

Every product is built to collapse weeks of work into hours—or hours into minutes.

**Special Launch Offer:**
Use code **LAUNCH20** for 20% off everything (expires in 48 hours).

👉 Browse the full catalog: https://gumroad.com/brainops

I'll break down each product over the next few days, but if you're a founder/dev in a hurry, start here:

- **SaaS ERP Starter Kit** - Skip 3 months of architectural hell ($197)
- **AI Orchestrator Framework** - Build production AI in 2 days, not 2 months ($147)
- **Modern UI Kit** - Ship a stunning dashboard in 4 hours ($97)

More details tomorrow.

—Matt
BrainOps

P.S. - All products have 30-day money-back guarantees. If it doesn't save you 10x its price in time, I don't want your money.`
  },
  {
    day: 1,
    subject: '"Just give me the code" - these 3 starter kits are for you',
    name: "Email 2: Code Products Deep Dive",
    delay_days: 1,
    body: `Hey {{first_name}},

If you're a developer or technical founder, this email is pure gold.

Yesterday I launched 10 products. Today I'm zooming in on the **3 Code Starter Kits**—because they solve the most expensive problem in SaaS: reinventing the wheel.

### **1. SaaS ERP Starter Kit ($197)**
**The Problem:** You're starting a new SaaS. You spend 3 months arguing about folder structure, authentication patterns, and database design before writing any business logic.

**The Solution:** Production-tested architecture handling $303M in transactions across 4,300+ tenants.

**What's Inside:**
- Multi-tenant Supabase schema (SQL)
- Service Layer pattern (the "secret sauce" for clean APIs)
- Row Level Security policies (pre-configured)
- Next.js folder structure that scales

**Time Saved:** 200-300 hours of architectural trial-and-error.

👉 Get the SaaS ERP Starter Kit: https://gumroad.com/l/GR-ERP-START

---

### **2. BrainOps AI Orchestrator Framework ($147)**
**The Problem:** You want to build AI agents, not a single chatbot. But orchestrating multiple agents with shared memory and tool execution? That's a research project.

**The Solution:** The exact Python framework managing 14 autonomous AI systems in production.

**What's Inside:**
- FastAPI boilerplate (async, high-performance)
- Agent Base Class (plug-and-play)
- Router logic (task → best agent)
- Vector memory architecture (Postgres/pgvector)

**Time Saved:** 150-200 hours of distributed systems architecture.

👉 Get the AI Orchestrator Framework: https://gumroad.com/l/GR-AI-ORCH

---

### **3. Modern Command Center UI Kit ($97)**
**The Problem:** You can build the backend, but your UI looks like a 2015 admin panel. Hiring a designer costs $10K+.

**The Solution:** Copy-paste glassmorphic components that look like sci-fi.

**What's Inside:**
- Dashboard shell (sidebar + header)
- Metric cards (beautiful KPI containers)
- Live task stream (real-time activity)
- Income Lab interface (complex data tables done right)

**Tech Stack:** React, Tailwind, Lucide Icons, Framer Motion.

**Time Saved:** 30-40 hours of CSS hell.

👉 Get the Modern UI Kit: https://gumroad.com/l/GR-UI-KIT

---

**Reminder:** Use code **LAUNCH20** for an additional 20% off (expires in 36 hours).

Ship faster,
—Matt

P.S. - Every kit includes support. If something doesn't work, I'll help you fix it.`
  },
  {
    day: 2,
    subject: "I automated my entire client pipeline with Make.com (steal my blueprints)",
    name: "Email 3: Automation Packs",
    delay_days: 2,
    body: `Hey {{first_name}},

Let me tell you about the day I stopped doing $15/hour work.

I was manually:
- Onboarding clients (5 hours per client)
- Repurposing blog posts into social content (2 hours per piece)
- Auditing roofing estimates (3 hours per project)

Then I discovered Make.com.

Now? Those same tasks take 5-10 minutes. The robots do the heavy lifting.

Today I'm sharing the **3 Automation Packs** that run my business on autopilot:

---

### **1. Intelligent Client Onboarding System ($297)**
**What it does:** Client pays → Auto setup in CRM → Welcome email → Calendly link → Kickoff doc generated → Done in 5 minutes.

**Before:** 5 hours per client.
**After:** 5 minutes.

👉 Get Client Onboarding Automation: https://gumroad.com/l/GR-ONBOARD

---

### **2. AI-Powered Content Production Pipeline ($347)**
**What it does:** One draft → 15+ platform-optimized posts (LinkedIn, Twitter, Facebook, Instagram) with SEO, hashtags, and visual asset notes.

**Before:** 2 hours to repurpose one article.
**After:** 10 minutes.

👉 Get Content Pipeline Automation: https://gumroad.com/l/GR-CONTENT

---

### **3. Commercial Roofing Estimation Validator ($497)**
**What it does:** Upload estimate → 47-point AI audit → Catch $15K-$50K errors → Client-ready report.

**Before:** 3 hours of manual validation.
**After:** 12 minutes.

👉 Get Roofing Validator Automation: https://gumroad.com/l/GR-ROOFVAL

---

**Reminder:** Code **LAUNCH20** still active for 24 more hours (20% off).

Stop doing robot work,
—Matt

P.S. - Every automation includes troubleshooting docs. If you get stuck, I'll help you debug it.`
  },
  {
    day: 3,
    subject: "ChatGPT is only as good as your prompts (here are my best ones)",
    name: "Email 4: AI Prompt Packs",
    delay_days: 3,
    body: `Hey {{first_name}},

Here's the dirty secret about AI:

Most people use it like Google. They ask a vague question and get a mediocre answer.

But the 1% who use **engineered prompts**? They're getting:
- Better bids (catching $50K+ hidden costs)
- Faster project delivery (15-minute daily status updates)
- Higher-converting launches ($5K+ in first-week revenue)

I've spent 18 months building AI-first businesses. Today I'm releasing my **3 Core AI Prompt Packs**:

---

### **1. Commercial Roofing Estimation Intelligence Bundle ($97)**
**For:** Roofing contractors, construction PMs.

**What it does:**
- Pre-bid risk analysis (catch deal-killers early)
- Cost calculation validation (don't leave money on the table)
- Margin protection (find hidden costs before they bite you)

👉 Get Roofing Intelligence: https://gumroad.com/l/GR-ROOFINT

---

### **2. AI-Enhanced Project Management Accelerator ($127)**
**For:** PMs, founders, agency owners.

**What it does:**
- Automate weekly status reports (15 minutes → done)
- Map task dependencies (see bottlenecks instantly)
- Flag risks before they blow up

👉 Get PM Accelerator: https://gumroad.com/l/GR-PMACC

---

### **3. Digital Product Launch Optimizer ($147)**
**For:** Creators, founders, course builders.

**What it does:**
- Validate your idea (before wasting 3 months)
- Optimize pricing (find the sweet spot)
- Run a high-converting launch sequence ($5K+ weeks)

👉 Get Launch Optimizer: https://gumroad.com/l/GR-LAUNCH

---

**Final hours:** Code **LAUNCH20** expires at midnight (20% off everything).

Use them well,
—Matt

P.S. - Works with ChatGPT, Claude, Gemini—any GPT-4-level model.`
  },
  {
    day: 4,
    subject: "Last call: The \"All-Access\" deal expires tonight",
    name: "Email 5: Final Call + Ultimate Bundle",
    delay_days: 4,
    body: `Hey {{first_name}},

This is it. The final email.

**LAUNCH20 expires at 11:59 PM tonight.**

Over the past 4 days, I've introduced:
- **7 AI Prompt & Automation Packs** (save 5-300 hours per month)
- **3 Production Code Kits** (save 200+ hours per project)

Individually, they're powerful. Together? They're a complete operating system for building and scaling digital products.

---

## **🚀 THE ULTIMATE ALL-ACCESS BUNDLE**

**Total Value:** $2,150
**Bundle Price:** **$997** (save $1,153)
**With LAUNCH20:** **$798** (save $1,352)

👉 Get the Ultimate All-Access Bundle: https://gumroad.com/l/GR-ULTIMATE

---

### **Who Is This For?**

You're a **builder**—whether that's:
- A solo founder shipping a SaaS
- A dev consultant building client projects
- An agency owner automating operations
- A PM juggling 5 projects at once

You don't have time to waste. You need systems that **work now**.

---

### **The Guarantee:**

Every product has a **30-day money-back guarantee.**

If any product doesn't save you 10x its price in time, email me. I'll refund you—no questions asked.

---

The launch is over. The work begins.

Ship faster,
—Matt Woodworth
BrainOps

P.S. - Support email: support@brainops.io. I personally answer every email within 24 hours.`
  }
];

async function createSequence() {
  console.log('🚀 Starting ConvertKit Email Sequence Setup...\n');

  try {
    // Step 1: Create a new sequence
    console.log('📧 Creating email sequence...');

    const sequenceResponse = await axios.post(
      `${baseURL}/sequences`,
      {
        api_secret: CONVERTKIT_API_SECRET,
        name: 'BrainOps Revenue Engine - Launch Sequence',
        description: '5-part launch sequence for Gumroad products'
      }
    );

    const sequenceId = sequenceResponse.data.id;
    console.log(`✅ Sequence created: ID ${sequenceId}\n`);

    // Step 2: Add emails to the sequence
    for (const email of emailSequence) {
      console.log(`📬 Adding ${email.name}...`);

      await axios.post(
        `${baseURL}/sequences/${sequenceId}/emails`,
        {
          api_secret: CONVERTKIT_API_SECRET,
          subject: email.subject,
          content: email.body,
          delay_days: email.delay_days
        }
      );

      console.log(`   ✅ ${email.name} added (Day ${email.day}, ${email.delay_days}d delay)`);
    }

    console.log('\n🎉 SUCCESS! Email sequence fully configured.');
    console.log(`\n📊 Sequence Details:`);
    console.log(`   - Sequence ID: ${sequenceId}`);
    console.log(`   - Total Emails: ${emailSequence.length}`);
    console.log(`   - Duration: 5 days`);
    console.log(`\n📝 Next Steps:`);
    console.log(`   1. Go to ConvertKit dashboard: https://app.convertkit.com/sequences/${sequenceId}`);
    console.log(`   2. Review the emails`);
    console.log(`   3. Add subscribers to the sequence manually or via form`);
    console.log(`   4. Set sequence to "Active"`);

    // Save sequence ID for future reference
    const sequenceData = {
      sequence_id: sequenceId,
      created_at: new Date().toISOString(),
      emails: emailSequence.map(e => ({ name: e.name, subject: e.subject, day: e.day }))
    };

    fs.writeFileSync(
      path.join(__dirname, '../convertkit-sequence.json'),
      JSON.stringify(sequenceData, null, 2)
    );

    console.log(`\n💾 Sequence data saved to: convertkit-sequence.json`);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the setup
createSequence();
