# Module Reference (Onboarding Main)

- **http:hook** — Receives Stripe/PayPal/Gumroad webhooks; secured with `WEBHOOK_SECRET`.
- **function:parsePayload** — Maps payload to `clientName`, `clientEmail`, `product`, `amount`.
- **google-drive:createFolder** — Creates the client folder under `GOOGLE_DRIVE_PARENT_ID`.
- **google-docs:copyFile** — Copies your welcome packet template into the client folder.
- **openai:createChatCompletion** — Generates the personalized welcome email; uses `OPENAI_API_KEY`.
- **gmail:sendEmail** — Sends the welcome email to the client.
- **google-calendar:createEvent** — Places an internal hold for kickoff; invite handled via Calendly link in email.
- **slack:postMessage** — Notifies the team in `SLACK_CHANNEL_ID`.
- **google-sheets:addRow** — Logs the client in `CRM_SHEET_ID`, sheet “Clients”.
