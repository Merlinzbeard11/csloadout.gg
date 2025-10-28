# Database Setup Guide - csloadout.gg

## Overview

This guide walks through setting up the PostgreSQL price caching database for csloadout.gg.

**Business Value:** Eliminates Skinport API rate limiting (8 req/5min) and reduces page load time from 8-10 seconds to <500ms.

---

## Option 1: Neon PostgreSQL (Recommended Free Tier)

### Why Neon?
- ✅ **512MB free storage** (vs Vercel's 256MB)
- ✅ **Serverless** - auto-scales to $0 when idle
- ✅ **10GB data transfer/month**
- ✅ **Built-in connection pooling**
- ✅ **Instant provisioning**

### Setup Steps

1. **Create Neon Account**
   ```bash
   # Visit: https://neon.tech
   # Sign up with GitHub (instant provisioning)
   ```

2. **Create Project**
   ```
   Project name: csloadout-production
   Region: US East (Ohio) - closest to Vercel default
   Postgres version: 16
   ```

3. **Get Connection String**
   ```bash
   # Neon Dashboard → Connection Details → Connection string
   # Copy the "Pooled connection" string (NOT direct connection)

   Example:
   postgresql://user:pass@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

4. **Add to Environment Variables**

   **Local Development (.env.local):**
   ```bash
   DATABASE_URL="postgresql://user:pass@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```

   **Vercel Production:**
   ```bash
   # Vercel Dashboard → Project Settings → Environment Variables
   # Add: DATABASE_URL = <your-neon-connection-string>
   # Scope: Production, Preview, Development
   ```

5. **Run Migration**
   ```bash
   # Install psql client (if not already installed)
   brew install postgresql  # macOS
   # or
   sudo apt-get install postgresql-client  # Linux

   # Run migration script
   psql "$DATABASE_URL" -f migrations/001_create_price_cache.sql

   # Verify table created
   psql "$DATABASE_URL" -c "SELECT * FROM get_cache_stats();"
   ```

6. **Verify Connection from Next.js**
   ```bash
   npm run dev

   # Test database health endpoint (create this):
   curl http://localhost:3000/api/health/db

   # Expected response:
   # {"healthy": true, "timestamp": "2025-10-24T05:00:00Z"}
   ```

---

## Option 2: Supabase (Alternative with Built-in Auth)

### Why Supabase?
- ✅ **500MB database free tier**
- ✅ **Built-in authentication** (good for Phase 3: user features)
- ✅ **Real-time subscriptions**
- ✅ **Row-level security**

### Setup Steps

1. **Create Supabase Project**
   ```bash
   # Visit: https://supabase.com
   # New Project → csloadout-production
   # Region: US East (closest to Vercel)
   # Strong database password (save securely)
   ```

2. **Get Connection String**
   ```bash
   # Supabase Dashboard → Project Settings → Database
   # Copy "Connection pooling" string (session mode)

   Example:
   postgresql://postgres.xxxxxxxxxxxx:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```

3. **Run Migration**
   ```bash
   # Supabase Dashboard → SQL Editor → New Query
   # Paste contents of migrations/001_create_price_cache.sql
   # Click "Run"

   # Or via psql:
   psql "$DATABASE_URL" -f migrations/001_create_price_cache.sql
   ```

4. **Add Environment Variables**
   ```bash
   # .env.local
   DATABASE_URL="postgresql://postgres.xxx:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

   # Vercel (same as Neon instructions above)
   ```

---

## Option 3: Local PostgreSQL (Development Only)

### Setup Steps

1. **Install PostgreSQL**
   ```bash
   # macOS
   brew install postgresql@16
   brew services start postgresql@16

   # Linux
   sudo apt-get install postgresql-16
   sudo systemctl start postgresql
   ```

2. **Create Database**
   ```bash
   createdb csloadout_dev
   ```

3. **Run Migration**
   ```bash
   psql csloadout_dev -f migrations/001_create_price_cache.sql
   ```

4. **Environment Variable**
   ```bash
   # .env.local
   DATABASE_URL="postgresql://localhost:5432/csloadout_dev"
   ```

---

## Verification Tests

### Test 1: Database Connection

```bash
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()', (err, res) => {
  console.log(err ? 'ERROR: ' + err : 'Connected! Server time: ' + res.rows[0].now);
  pool.end();
});
"
```

**Expected:** `Connected! Server time: 2025-10-24...`

### Test 2: Cache Table Exists

```bash
psql "$DATABASE_URL" -c "
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'price_cache'
ORDER BY ordinal_position;
"
```

**Expected:** 8 columns listed (id, item_name, marketplace, etc.)

### Test 3: Insert and Query

```bash
psql "$DATABASE_URL" -c "
INSERT INTO price_cache (item_name, marketplace, price, expires_at)
VALUES ('Test Item', 'Steam', 100.00, NOW() + INTERVAL '5 minutes');

SELECT * FROM price_cache WHERE item_name = 'Test Item';
"
```

**Expected:** 1 row returned with price 100.00

### Test 4: Cache Hit Rate Function

```bash
psql "$DATABASE_URL" -c "SELECT * FROM get_cache_stats();"
```

**Expected:**
```
total_entries | valid_entries | expired_entries | cache_hit_rate
--------------+---------------+-----------------+----------------
     1        |       1       |        0        |    100.00
```

---

## Monitoring and Maintenance

### View Current Cache Contents

```sql
SELECT
  item_name,
  marketplace,
  price,
  CASE
    WHEN expires_at > NOW() THEN 'VALID'
    ELSE 'EXPIRED'
  END AS status,
  expires_at - NOW() AS time_remaining
FROM price_cache
ORDER BY expires_at DESC
LIMIT 10;
```

### Clear Expired Entries (Cron Job)

```sql
-- Run this every 30 minutes via cron or Vercel Cron
SELECT cleanup_expired_cache();
```

**Vercel Cron Configuration (vercel.json):**
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-cache",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

### Monitor Cache Performance

```sql
-- Cache hit rate over time
SELECT * FROM get_cache_stats();

-- Most cached items
SELECT item_name, COUNT(*) as market_count
FROM price_cache
GROUP BY item_name
ORDER BY market_count DESC
LIMIT 10;

-- Average cache age
SELECT
  AVG(EXTRACT(EPOCH FROM (NOW() - cached_at))) / 60 AS avg_age_minutes
FROM price_cache
WHERE expires_at > NOW();
```

---

## Next Steps

After database is set up:

1. ✅ Database schema created and verified
2. 🔄 Modify `/src/app/api/prices/[item]/route.ts` to use caching (next step)
3. ⏳ Test with real marketplace API calls
4. ⏳ Deploy to Vercel and verify production performance
5. ⏳ Monitor cache hit rate and API call reduction

---

## Troubleshooting

### Error: "no pg_hba.conf entry for host"

**Solution:** Ensure you're using the **pooled connection** string (not direct connection). Neon and Supabase provide separate pooled strings.

### Error: "too many clients already"

**Solution:** Connection pool misconfigured. Check `max: 10` in `/src/lib/db.ts`.

### Error: "SSL connection required"

**Solution:** Add `?sslmode=require` to connection string.

### Slow Queries (>100ms)

**Solution:** Verify indexes exist:
```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'price_cache';
```

Expected indexes:
- `idx_price_cache_expiry`
- `idx_price_cache_item`
- `idx_price_cache_item_expiry`
- `idx_price_cache_marketplace`

---

## Cost Analysis

### Neon Free Tier Limits

- **Storage:** 512MB (enough for ~100,000 cache entries)
- **Compute:** Always free (with auto-suspend)
- **Data transfer:** 10GB/month (sufficient for most traffic)

### When to Upgrade?

If you exceed:
- **100K cached items** → Upgrade to Neon Pro ($19/mo for 10GB storage)
- **100K requests/month** → Upgrade for higher compute limits
- **Need 99.95% uptime SLA** → Enterprise plan

### Estimated Cache Storage

- Each cache entry: ~200 bytes
- 28 items × 3 marketplaces = 84 entries
- 84 entries × 200 bytes = ~17KB
- **With 10,000 unique items:** ~600KB (still within free tier)

---

## Security Best Practices

1. **Never commit `.env.local`** - Already in `.gitignore`
2. **Use environment variables** - Never hardcode credentials
3. **Rotate database passwords** - Quarterly rotation recommended
4. **Enable SSL** - Always use `sslmode=require`
5. **Restrict IP access** - Neon/Supabase allow IP whitelisting (optional)

---

## Questions?

- **Neon Docs:** https://neon.tech/docs
- **Supabase Docs:** https://supabase.com/docs
- **pg (node-postgres) Docs:** https://node-postgres.com
