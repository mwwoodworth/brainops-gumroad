#!/bin/bash

##############################################################################
# BRAINOPS REVENUE ENGINE - CUSTOMER SUPPORT AUTOMATION
# Automated responses, FAQ generation, and support ticket tracking
##############################################################################

SUPPORT_DIR="/home/matt-woodworth/dev/brainops-gumroad/support"
mkdir -p "$SUPPORT_DIR"

echo "🛟 BrainOps Customer Support Automation Setup"
echo "═══════════════════════════════════════════════"
echo ""

# Create FAQ Database
cat > "$SUPPORT_DIR/faq.md" << 'EOF'
# BrainOps Revenue Engine - Frequently Asked Questions

## 📦 Product & Delivery

**Q: How do I download my purchase?**
A: After purchase, you'll receive an email with a download link. The link is also available on your Gumroad Library: https://app.gumroad.com/library

**Q: The download link isn't working. What should I do?**
A: 1. Check your spam folder for the purchase email
   2. Try a different browser
   3. Email support@brainops.io with your order number

**Q: Are the products updated?**
A: Yes! All products receive free updates. You'll be notified via email when new versions are available.

**Q: Can I get a refund?**
A: Absolutely. We offer a 30-day money-back guarantee, no questions asked. Email support@brainops.io with your order number.

## 💻 Technical Support

**Q: What's included in the Code Starter Kits?**
A: Each kit includes:
- Production-ready code files
- Architecture documentation
- Setup guides
- Real-world examples
- Support via email

**Q: Do I need specific software to use these products?**
A: Requirements vary by product:
- **Code Kits**: Node.js, basic programming knowledge
- **AI Prompts**: Access to ChatGPT, Claude, or Gemini
- **Automation Packs**: Make.com account (free tier available)

**Q: I'm getting errors when running the code. Help?**
A: Email support@brainops.io with:
1. Your order number
2. Screenshot of the error
3. What you were trying to do
We respond within 24 hours (usually much faster).

## 🔐 Licensing & Usage

**Q: Can I use these products for client work?**
A: Yes! You can use the code and templates for unlimited client projects.

**Q: Can I resell these products?**
A: No. The products are for personal/client use only. You cannot resell them as standalone products.

**Q: Can I share my purchase with my team?**
A: Each license is for one person. For team licenses, email support@brainops.io for volume pricing.

## 🚀 Getting Started

**Q: Which product should I buy first?**
A: Depends on your goal:
- **Building SaaS?** → SaaS ERP Starter Kit
- **Managing AI agents?** → AI Orchestrator Framework
- **Need better UI?** → Modern UI Kit
- **Want everything?** → Ultimate Bundle (best value)

**Q: I'm new to [X]. Will this work for me?**
A: Each product includes a "Getting Started" guide for beginners. However, basic knowledge is recommended:
- Code Kits: Basic programming
- AI Prompts: Familiarity with AI tools
- Automation: Basic no-code tools experience

**Q: How long does setup take?**
A: Varies by product:
- AI Prompts: 5-10 minutes
- Automation Packs: 30-60 minutes
- Code Kits: 1-3 hours

## 💳 Billing & Payment

**Q: What payment methods do you accept?**
A: Via Gumroad: Credit cards, PayPal, Apple Pay, Google Pay

**Q: Will this charge recur monthly?**
A: No! All products are one-time purchases. Pay once, use forever.

**Q: Can I get an invoice?**
A: Yes. Gumroad automatically sends an invoice to your email. For a company invoice, email support@brainops.io

## 📧 Contact & Support

**Q: How do I contact support?**
A: Email: support@brainops.io
Response time: Within 24 hours (usually 2-4 hours)

**Q: Do you offer 1-on-1 setup calls?**
A: For Ultimate Bundle customers, we offer one free 30-minute setup call. Email support@brainops.io to schedule.

**Q: Can you customize a product for my specific needs?**
A: We offer custom consulting at $200/hour. Email support@brainops.io for availability.

---

**Didn't find your answer?**
Email: support@brainops.io
Include your order number for faster support.
EOF

echo "✅ FAQ database created: $SUPPORT_DIR/faq.md"

# Create automated response templates
cat > "$SUPPORT_DIR/response_templates.json" << 'EOF'
{
  "templates": {
    "download_issue": {
      "subject": "Re: Download Issue - Order #{{order_id}}",
      "body": "Hi {{customer_name}},\n\nSorry to hear you're having trouble downloading your purchase!\n\nHere are a few quick fixes:\n\n1. **Check your Gumroad Library**: https://app.gumroad.com/library\n   Your purchase should appear there with a fresh download link.\n\n2. **Try a different browser**: Sometimes browser extensions block downloads.\n\n3. **Check spam folder**: The download email might have landed there.\n\nIf none of these work, please reply with:\n- Your order number\n- What happens when you click the download link\n- What browser you're using\n\nI'll get this sorted for you ASAP!\n\nBest,\nMatt\nBrainOps Support"
    },
    "refund_request": {
      "subject": "Re: Refund Request - Order #{{order_id}}",
      "body": "Hi {{customer_name}},\n\nNo problem at all! We have a 30-day money-back guarantee.\n\nI've processed your refund for Order #{{order_id}}. You should see it back in your account within 5-7 business days (usually faster).\n\nBefore you go, would you mind sharing what didn't work for you? Your feedback helps us improve.\n\nIf you ever want to give it another shot, you're always welcome back.\n\nBest,\nMatt\nBrainOps Support"
    },
    "technical_help": {
      "subject": "Re: Technical Issue - {{product_name}}",
      "body": "Hi {{customer_name}},\n\nThanks for reaching out! I'd be happy to help you get this working.\n\nTo troubleshoot effectively, could you please send me:\n\n1. **Screenshot of the error** (if any)\n2. **What you were trying to do** when it happened\n3. **Your environment**:\n   - Operating system (Windows/Mac/Linux)\n   - Node version (run: node --version)\n   - Any other relevant details\n\nOnce I have this info, I'll send you step-by-step instructions to fix it.\n\nUsually, these issues are quick to resolve!\n\nBest,\nMatt\nBrainOps Support"
    },
    "customization_request": {
      "subject": "Re: Customization Request",
      "body": "Hi {{customer_name}},\n\nThanks for your interest in custom work!\n\nI offer consulting at $200/hour for customizations.\n\nCould you share more details about what you need?\n- What product are you working with?\n- What specific customization do you need?\n- What's your timeline?\n\nOnce I understand the scope, I'll send you an estimate.\n\nAlternatively, many customizations can be done yourself using the documentation. Happy to point you in the right direction if that's your preference!\n\nBest,\nMatt\nBrainOps Support"
    },
    "general_thanks": {
      "subject": "Re: {{original_subject}}",
      "body": "Hi {{customer_name}},\n\nYou're very welcome! Glad I could help.\n\nIf you have any other questions, don't hesitate to reach out.\n\nAnd if you're happy with your purchase, I'd love a testimonial! Reply to this email with a few sentences about your experience, and I'll send you a $20 credit for future purchases.\n\nBest,\nMatt\nBrainOps Support"
    },
    "testimonial_request": {
      "subject": "Quick favor? (+ $20 credit)",
      "body": "Hi {{customer_name}},\n\nI noticed you purchased {{product_name}} a few days ago. Hope it's been helpful!\n\nQuick favor: Would you mind sharing a short testimonial about your experience?\n\nJust reply with:\n- What problem you were trying to solve\n- How the product helped\n- Your results (if any)\n\nIn return, I'll send you a $20 credit for any future purchase.\n\nNo pressure if you're too busy—I totally get it!\n\nBest,\nMatt\nBrainOps"
    }
  }
}
EOF

echo "✅ Response templates created: $SUPPORT_DIR/response_templates.json"

# Create support ticket tracker CSV
cat > "$SUPPORT_DIR/support_tickets.csv" << 'EOF'
Date,Order_ID,Customer_Email,Issue_Type,Status,Response_Time_Hours,Resolved
EOF

echo "✅ Support ticket tracker created: $SUPPORT_DIR/support_tickets.csv"

# Create support workflow guide
cat > "$SUPPORT_DIR/support_workflow.md" << 'EOF'
# Customer Support Workflow

## 📧 Email: support@brainops.io

### Daily Support Routine

**Morning (9 AM):**
1. Check support@brainops.io inbox
2. Categorize emails by type:
   - Download issues
   - Refund requests
   - Technical help
   - General questions
   - Testimonials

**Process Each Email:**
1. Respond within 2-4 hours (target)
2. Use templates from `response_templates.json`
3. Log in `support_tickets.csv`
4. Update FAQ if it's a new question

**Evening (6 PM):**
1. Follow up on unresolved tickets
2. Check for replies
3. Update ticket tracker

### Response Time Targets

- **Critical (download issues, refunds):** < 2 hours
- **Technical support:** < 4 hours
- **General questions:** < 24 hours

### Escalation

If you can't solve an issue within 24 hours:
1. Offer a full refund immediately
2. Optionally: Offer free 30-min call to debug
3. Log the issue for product improvement

### Testimonial Collection

**Timing:** 3-5 days after purchase

**Incentive:** $20 Gumroad credit

**Process:**
1. Send testimonial request email
2. If they respond, send credit code
3. Add testimonial to marketing assets
4. Thank them!

### Common Issues & Solutions

**Issue: "I can't download the product"**
→ Direct to Gumroad Library: https://app.gumroad.com/library

**Issue: "The ZIP file won't extract"**
→ Suggest 7-Zip (Windows) or The Unarchiver (Mac)

**Issue: "I'm getting errors in the code"**
→ Ask for: Screenshot, environment details, what they were doing

**Issue: "This isn't what I expected"**
→ Refund immediately, ask for feedback

**Issue: "Can I use this for client work?"**
→ Yes! Unlimited client use, just can't resell as a product

### Automated Responses (Future)

When you receive 10+ support emails, consider:
1. Creating a Zendesk account
2. Setting up auto-responses for common issues
3. Creating a knowledge base
4. Hiring a VA for $10/hour to triage

For now, manual = personal = better customer experience.
EOF

echo "✅ Support workflow guide created: $SUPPORT_DIR/support_workflow.md"

echo ""
echo "✅ Customer Support Automation Complete!"
echo ""
echo "📁 Files created in $SUPPORT_DIR:"
echo "   • faq.md (comprehensive FAQ)"
echo "   • response_templates.json (email templates)"
echo "   • support_tickets.csv (ticket tracker)"
echo "   • support_workflow.md (process guide)"
echo ""
echo "📧 Support Email: support@brainops.io"
echo "   (Set up forwarding: matthew@brainstackstudio.com → support@brainops.io)"
echo ""
