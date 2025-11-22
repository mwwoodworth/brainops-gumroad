# Roof Validator Setup

## Prerequisites
- Make.com account
- OpenAI API key
- Google Sheets (for estimates) and Google Docs (for reports)
- Optional: Google Maps API key if you enrich with geocoding

## Flow Description (matches `blueprints/roof-validator.json`)
1. **Trigger**: Google Sheet row in `Estimates` where Status = `Ready for Audit`.
2. **AI Audit**: OpenAI runs a 47-point audit (scope, compliance, hidden costs) using the row data.
3. **Report**: A Google Doc is created with the audit summary.
4. **Notify**: Status is updated to `Audited`, and an email is sent to `TEAM_EMAIL` with the report link.

## Sheet Structure (use templates/roof-validator-sheet.csv)
- Columns: ProjectName, Address, RoofType, SqFt, Layers, LaborRate, Materials, Region, Notes, Status
- Set Status to `Ready for Audit` to trigger the flow.

## API Key Security
- Store keys in Make variables, not inside modules.
- Limit OpenAI key usage with per-minute caps; restrict Google APIs by IP/referrer as applicable.
