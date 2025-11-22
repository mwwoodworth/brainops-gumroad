# Roofing Validator (GR-ROOFVAL) - Start Here

Automate the validation of roofing leads and data.

## Overview
This automation performs a structured audit on estimates flagged as “Ready for Audit,” generates a risk summary, creates a report, and notifies the team.

## Included
- `blueprints/roof-validator.json`: Main automation flow (Sheets -> AI audit -> Docs -> Email).
- `templates/`: CSV data structures for Sheets/Excel and a report template.
- `Roof-Validator-Setup.md` and `Roof-Validator-Troubleshooting.md`.

## Quick Start
1. Import `blueprints/roof-validator.json` to Make.com.
2. Set env vars: `SPREADSHEET_ID`, `OPENAI_API_KEY`, `TEAM_EMAIL`.
3. Use `templates/roof-validator-sheet.csv` in your “Estimates” sheet; set Status = “Ready for Audit” to trigger.
4. Review the generated audit summary and report link (sent to your email).
