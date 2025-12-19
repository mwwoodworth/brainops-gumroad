# Gumroad Automation Pipeline

## Scripts

### gumroad-sync.sh
Syncs sales from Gumroad API to Supabase database.
- Run manually or set up as cron job
- Handles upserts (won't duplicate existing sales)

### gumroad-report.sh
Generates revenue report showing:
- Total revenue and sales
- Revenue by product
- Last 7 days performance
- Recent sales list

## Setup Cron Jobs (Optional)

```bash
# Sync every hour
0 * * * * /home/matt-woodworth/dev/brainops-gumroad/automation/gumroad-sync.sh >> /var/log/gumroad-sync.log 2>&1

# Daily report at 9am
0 9 * * * /home/matt-woodworth/dev/brainops-gumroad/automation/gumroad-report.sh >> /var/log/gumroad-report.log 2>&1
```

## Database Tables

- `gumroad_sales` - Stores all sales data
- `gumroad_products` - Product catalog tracking

## API Credentials

Stored in:
- `/home/matt-woodworth/dev/_secure/gumroad/GUMROAD_CREDENTIALS.md`
- `/home/matt-woodworth/dev/.env`

Access Token: <GUMROAD_ACCESS_TOKEN> (DO NOT COMMIT)
