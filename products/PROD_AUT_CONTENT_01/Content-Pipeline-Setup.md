# Content Pipeline Setup

## Concept
Watch a sheet of approved ideas, then auto-generate a blog draft, a newsletter version, and social snippets. Store drafts in Google Docs and update the Sheet with links.

## Steps
1. **Source**: Use `templates/content-calendar-sheet.csv` as the structure for your Ideas sheet. Set Status = `Approved` to trigger.
2. **Import Blueprint**: In Make.com, import `blueprints/content-pipeline-main.json`.
3. **Set Env Vars**: `SPREADSHEET_ID`, `OPENAI_API_KEY`.
4. **Destinations**: Connect Google Docs for blog/email drafts. Notion users: mirror via `content-calendar-notion.txt` structure.
5. **Run Once**: Test with one idea row; confirm blog/newsletter docs are created and Sheet updates with links + social copy.

## Customization
- Edit the system prompts in OpenAI modules (blog, newsletter, social) to match your brand voice.
- Adjust lengths: change blog word count or social token limits.
- Add a scheduler module if you want to auto-post (Buffer/Twitter/LinkedIn APIs).
