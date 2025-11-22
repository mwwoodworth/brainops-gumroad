# Onboarding System Setup Guide

Use this flow to onboard a new client right after purchase (Stripe/PayPal/Gumroad). It creates a folder, copies a welcome packet, sends email, posts to Slack, and logs to Sheets.

## 1) Trigger (payment webhook)
- Module: `http:hook` (step 1). Set a secret in `WEBHOOK_SECRET`.
- Point your payment webhook to the generated Make URL.
- Expected payload keys: `customer_name`, `email`, `product_name`, `amount`.

## 2) Parse payload
- Module: `function:parsePayload` (step 2) maps name, email, product, amount.
- Adjust keys if your gateway differs.

## 3) Create client folder
- Module: `google-drive:createFolder` (step 3).
- Set `GOOGLE_DRIVE_PARENT_ID` to your client root folder.

## 4) Copy welcome packet
- Module: `google-docs:copyFile` (step 4).
- Set `WELCOME_PACKET_TEMPLATE_ID` to a Docs template you maintain.

## 5) Generate/send welcome email
- Module: `openai:createChatCompletion` (step 5) uses `OPENAI_API_KEY`.
- Module: `gmail:sendEmail` (step 6) sends to the client.
- Replace `CALENDLY_URL` with your real booking link.

## 6) Calendar + Slack
- Module: `google-calendar:createEvent` (step 7) creates an internal hold; Calendly handles the real booking via the link.
- Module: `slack:postMessage` (step 8) notifies the team; set `SLACK_CHANNEL_ID`.

## 7) CRM logging
- Module: `google-sheets:addRow` (step 9). Set `CRM_SHEET_ID` and ensure columns match the values block.

## Testing
1. In Make, click “Run once.”
2. Send a test webhook (Stripe/PayPal/Gumroad) with name/email/product/amount.
3. Confirm: Drive folder created, packet copied, email delivered, Slack message posted, Sheet row added.

## Troubleshooting
- 401 on webhook: check `WEBHOOK_SECRET` or payment gateway signature.
- Drive/Docs failures: ensure the service account/user has access to the parent folder + template.
- Email blocked: verify Gmail connection and sender limits.

## Go-live checklist
- Replace all placeholder environment variables in the modules.
- Swap in your real template IDs and calendar IDs.
- Turn the scenario on and send a live payment test.
