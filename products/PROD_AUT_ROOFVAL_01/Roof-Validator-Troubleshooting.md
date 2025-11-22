# Troubleshooting

## Address Not Found
- Ensure the address format is standard (Street, City, State, Zip).
- The automation marks these as "Review Needed".

## AI Audit Fails
- Confirm `OPENAI_API_KEY` is set and not rate-limited.
- Reduce prompt size by trimming long Notes fields.

## API Quota Exceeded
- Check your Google Cloud Console billing and quotas.
- If skipping maps, remove the Maps module and rely on manual address review.
