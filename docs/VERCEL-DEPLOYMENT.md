# Vercel Deployment Configuration

## Cron Jobs

### Current Configuration (Vercel Hobby Plan)

**Limitation**: Vercel Hobby (free) plan allows only **1 cron job per day** (2 max total, each limited to once daily).

**Active Cron Job**:
- **Daily Inventory Refresh**: Runs at 2:00 AM UTC
  - Path: `/api/cron/daily-refresh`
  - Schedule: `0 2 * * *` (daily at 2am)
  - Purpose: Auto-refresh Steam inventory for active users
  - BDD Reference: `features/07-inventory-import.feature:319`

### Removed Cron Jobs

**Price Alert Checker** (removed 2025-01-13):
- Previously ran every 5 minutes (`*/5 * * * *`)
- Violated Vercel Hobby plan limits (288 invocations/day vs 1/day allowed)
- Path: `/api/cron/check-price-alerts`
- BDD Reference: `features/09-price-alerts-phase1.feature`
- **Reason for removal**: Inventory refresh provides more immediate value
- **Future consideration**: Re-enable if upgrading to Vercel Pro plan ($20/mo)

### Decision Rationale

When forced to choose between two cron jobs due to Vercel Hobby plan limits:

1. **Inventory refresh** provides more value at current stage:
   - Maintains data freshness for active users automatically
   - Reduces manual refresh requests
   - Batches Steam API calls during low-traffic hours
   - Core functionality for inventory management features

2. **Price alerts** were deprioritized because:
   - Feature is less critical in early stage
   - Manual price checking still available
   - 5-minute interval was impossible on free tier anyway
   - Can be re-enabled when upgrading to paid plan

### Implementation Status

Both cron job implementations have known issues:

**Daily Inventory Refresh**:
- ⚠️ TODO: Fix `refreshInventoryData()` to support `steam_id` parameter
- Location: `src/app/api/cron/daily-refresh/route.ts:115-117`
- Currently returns hardcoded failure: `{ success: false, error: 'Not implemented' }`

**Price Alert Checker** (disabled):
- ⚠️ Implementation appears complete but untested in production
- Location: `src/app/api/cron/check-price-alerts/route.ts`
- Email/push notification services referenced but may need configuration

### Upgrading to Vercel Pro

If upgrading to Vercel Pro plan in the future:

**Benefits for Cron Jobs**:
- 40 cron jobs maximum (vs 2 on Hobby)
- Unlimited daily invocations (vs once per day on Hobby)
- Can restore price alerts to 5-minute interval
- Can add additional scheduled tasks

**Cost**: $20/month per member

**Re-enabling Price Alerts**:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-refresh",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/check-price-alerts",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Testing Cron Jobs Locally

Cron jobs cannot be tested via `npm run dev`. To test:

**Option 1**: Direct API call with auth header
```bash
curl -X GET http://localhost:3000/api/cron/daily-refresh \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

**Option 2**: Use Vercel CLI preview deployment
```bash
vercel --prod
# Cron jobs will execute on schedule in preview environment
```

### Security

All cron endpoints require `CRON_SECRET` environment variable:
- Set in Vercel project settings
- Passed as `Authorization: Bearer {CRON_SECRET}` header
- Vercel automatically includes this header when triggering cron jobs
- Returns 401 Unauthorized if missing or incorrect

### Monitoring

View cron job execution logs in Vercel dashboard:
1. Navigate to project
2. Click "Logs" tab
3. Filter by `/api/cron/*` paths
4. Check for errors, duration, and success/failure status

### Related Files

- Configuration: `vercel.json`
- Daily Refresh: `src/app/api/cron/daily-refresh/route.ts`
- Price Alerts (disabled): `src/app/api/cron/check-price-alerts/route.ts`
- Tests: `__tests__/daily-auto-refresh-cron.test.tsx`, `__tests__/alert-checker.test.ts`
- BDD: `features/07-inventory-import.feature`, `features/09-price-alerts-phase1.feature`
