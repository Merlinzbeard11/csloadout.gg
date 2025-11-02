# 10 - Daily Deal Feed

## Overview

Curated feed of best deals across all marketplaces, updated daily. Shows items priced significantly below average, recent price drops, and arbitrage opportunities. Designed to drive daily engagement and showcase csloadout.gg's value prop.

**Value Prop:** "Check daily for the best CS2 skin deals - items 10-30% below market average"

## User Segments Served

- **Primary:** Deal Hunters (daily bargain shoppers)
- **Secondary:** Investors (buy-low opportunities)
- **Tertiary:** Casual Players (impulse purchases on great deals)

## User Stories / Use Cases

### As a Deal Hunter
- I want to check the deal feed every morning to find bargains
- I want to see items "30% below average" with clear savings displayed
- I want to sort by "biggest discount %" to find best deals

### As an Investor
- I want to see items with sudden price drops (potential market shifts)
- I want deals on bulk items (100x cases at discount)
- I want to track deal history (which items frequently go on sale)

### As a Casual Player
- I want to discover items I didn't know I wanted (impulse buys)
- I want limited-time deals to create urgency

## Research & Context

### Deal Feed Best Practices

From research on deal aggregators (Slickdeals, Honey, CamelCamelCamel):

**Engagement Drivers:**
- Daily refresh creates habit (check every morning)
- Clear savings display ("Save $12.50 / 25% off")
- Urgency indicators ("Only at this price for 2 hours")
- Social proof ("47 people bought this today")
- One-click purchase from deal

**Deal Quality Metrics:**
- Minimum 10% below 30-day average
- Exclude items with low volume (may be fake deals)
- Prefer items with high absolute savings ($10+)
- Balance popular items vs niche opportunities

### Deal Detection Algorithms

**Simple Approach (MVP):**
```typescript
// Item is a "deal" if:
currentPrice < (30dayAverage * 0.90) // 10%+ below average
AND
priceDroppedInLast24Hours // Recent drop, not permanently cheap
```

**Advanced Approach (Phase 2):**
```typescript
// Machine learning based on:
- Historical price volatility
- Market sentiment (Reddit mentions, search trends)
- Seasonal patterns
- Marketplace-specific patterns
```

## Technical Requirements

### Database Schema

```sql
-- Daily deals cache
CREATE TABLE daily_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id),
  platform VARCHAR(50) NOT NULL,

  -- Pricing
  current_price DECIMAL(10,2) NOT NULL,
  average_price_30d DECIMAL(10,2) NOT NULL,
  discount_percent DECIMAL(5,2) NOT NULL,
  savings_amount DECIMAL(10,2) NOT NULL, -- absolute savings

  -- Deal quality score (0-100)
  deal_score INTEGER NOT NULL,          -- Composite score

  -- Urgency indicators
  price_drop_started_at TIMESTAMP,
  expected_duration_hours INTEGER,      -- Estimate how long deal will last

  -- Social proof
  views_today INTEGER DEFAULT 0,
  clicks_today INTEGER DEFAULT 0,
  purchases_today INTEGER DEFAULT 0,

  -- Deal feed metadata
  feed_date DATE NOT NULL,              -- Which day's feed this belongs to
  rank INTEGER,                         -- Position in feed
  is_featured BOOLEAN DEFAULT FALSE,    -- Highlight as "Deal of the Day"

  -- Listing info
  listing_url TEXT NOT NULL,
  stock_available INTEGER,              -- If known

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(feed_date, item_id, platform)
);

CREATE INDEX idx_daily_deals_date ON daily_deals(feed_date);
CREATE INDEX idx_daily_deals_score ON daily_deals(deal_score);
CREATE INDEX idx_daily_deals_featured ON daily_deals(is_featured);

-- Price history for deal detection
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id),
  platform VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_price_history_item ON price_history(item_id, platform, recorded_at);
```

### Deal Detection Service

```typescript
// Runs daily at 12:00 AM UTC
class DealDetectionService {
  async generateDailyDeals(feedDate: Date = new Date()) {
    console.log(`Generating deals for ${feedDate.toISOString()}`);

    // 1. Get all items with price history
    const items = await db.items.findMany({
      include: {
        prices: true,
        priceHistory: {
          where: {
            recorded_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        }
      }
    });

    // 2. Analyze each item for deals
    const deals: Deal[] = [];

    for (const item of items) {
      const itemDeals = await this.detectDeals(item);
      deals.push(...itemDeals);
    }

    // 3. Rank deals by quality score
    deals.sort((a, b) => b.dealScore - a.dealScore);

    // 4. Select top deals for feed (e.g., top 100)
    const topDeals = deals.slice(0, 100);

    // 5. Feature "Deal of the Day" (highest score)
    if (topDeals.length > 0) {
      topDeals[0].isFeatured = true;
    }

    // 6. Save to database
    for (const [index, deal] of topDeals.entries()) {
      await db.dailyDeals.create({
        data: {
          ...deal,
          feed_date: feedDate,
          rank: index + 1
        }
      });
    }

    console.log(`Generated ${topDeals.length} deals`);
  }

  async detectDeals(item: Item): Promise<Deal[]> {
    const deals: Deal[] = [];

    for (const currentPrice of item.prices) {
      // Calculate 30-day average
      const history = item.priceHistory.filter(h => h.platform === currentPrice.platform);
      if (history.length < 5) continue; // Need enough data

      const avg30d = history.reduce((sum, h) => sum + h.price, 0) / history.length;

      // Check if current price is a deal
      const discountPercent = ((avg30d - currentPrice.total_cost) / avg30d) * 100;

      if (discountPercent >= 10) { // 10%+ discount
        const savingsAmount = avg30d - currentPrice.total_cost;

        // Calculate deal score (0-100)
        const dealScore = this.calculateDealScore(
          discountPercent,
          savingsAmount,
          currentPrice.total_cost,
          history
        );

        deals.push({
          itemId: item.id,
          platform: currentPrice.platform,
          currentPrice: currentPrice.total_cost,
          averagePrice30d: avg30d,
          discountPercent,
          savingsAmount,
          dealScore,
          listingUrl: currentPrice.listing_url,
          stockAvailable: currentPrice.quantity_available
        });
      }
    }

    return deals;
  }

  calculateDealScore(
    discountPercent: number,
    savingsAmount: number,
    currentPrice: number,
    priceHistory: PriceHistory[]
  ): number {
    let score = 0;

    // Component 1: Discount percentage (0-40 points)
    score += Math.min(discountPercent * 2, 40); // 20% discount = 40 points

    // Component 2: Absolute savings (0-30 points)
    score += Math.min(savingsAmount * 3, 30); // $10 savings = 30 points

    // Component 3: Price affordability (0-20 points)
    // Favor items under $50 (more accessible)
    if (currentPrice <= 10) score += 20;
    else if (currentPrice <= 25) score += 15;
    else if (currentPrice <= 50) score += 10;
    else if (currentPrice <= 100) score += 5;

    // Component 4: Price stability (0-10 points)
    // Favor items with stable history (recent drop, not always cheap)
    const recentAvg = priceHistory.slice(-5).reduce((sum, h) => sum + h.price, 0) / 5;
    const olderAvg = priceHistory.slice(0, -5).reduce((sum, h) => sum + h.price, 0) / (priceHistory.length - 5);
    const dropRecently = recentAvg < olderAvg;
    if (dropRecently) score += 10;

    return Math.min(Math.round(score), 100);
  }
}

// Cron job
cron.schedule('0 0 * * *', async () => { // Daily at midnight UTC
  const service = new DealDetectionService();
  await service.generateDailyDeals();
});
```

### API Endpoints

```typescript
// Get today's deals
GET /api/deals
Query params:
  - sort: 'score' | 'discount' | 'savings' | 'price'
  - limit: 50 (default)
Response: {
  deals: [
    {
      id: "...",
      item: {
        id: "...",
        name: "AK-47 | Redline (Field-Tested)",
        iconUrl: "...",
        rarity: "classified"
      },
      currentPrice: 8.50,
      averagePrice: 12.00,
      discountPercent: 29.17,
      savingsAmount: 3.50,
      dealScore: 87,
      platform: "csfloat",
      listingUrl: "...",
      rank: 1,
      isFeatured: true,
      stats: {
        viewsToday: 234,
        clicksToday: 45,
        purchasesToday: 12
      }
    },
    // ...
  ],
  meta: {
    feedDate: "2025-11-02",
    totalDeals: 100,
    nextUpdateAt: "2025-11-03T00:00:00Z"
  }
}

// Track deal interaction
POST /api/deals/:id/track
Body: {
  action: 'view' | 'click' | 'purchase'
}
Response: { success: true }
```

### Frontend Components

```typescript
// Daily Deals Page
<DailyDealsPage deals={deals}>
  <h1>Today's Best Deals</h1>
  <p className="subtitle">
    {deals.length} items priced 10-30% below market average
    <span className="next-update">Next update in {timeUntilMidnight()}</span>
  </p>

  {/* Featured Deal of the Day */}
  {deals[0].isFeatured && (
    <FeaturedDeal deal={deals[0]}>
      <div className="featured-badge">🔥 Deal of the Day</div>
      <img src={deals[0].item.iconUrl} alt={deals[0].item.name} />
      <h2>{deals[0].item.name}</h2>
      <div className="price-comparison">
        <div className="current-price">
          ${deals[0].currentPrice}
          <span className="platform">{deals[0].platform}</span>
        </div>
        <div className="original-price">
          <strike>${deals[0].averagePrice}</strike>
        </div>
        <div className="savings">
          Save ${deals[0].savingsAmount} ({deals[0].discountPercent}% off)
        </div>
      </div>
      <div className="social-proof">
        👁️ {deals[0].stats.viewsToday} views •
        🛒 {deals[0].stats.purchasesToday} purchased today
      </div>
      <a href={deals[0].listingUrl} className="btn-primary" onClick={() => trackClick(deals[0].id)}>
        Buy Now on {deals[0].platform}
      </a>
    </FeaturedDeal>
  )}

  {/* Filters/Sort */}
  <div className="deal-controls">
    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
      <option value="score">Best Deals</option>
      <option value="discount">Highest Discount %</option>
      <option value="savings">Biggest Savings $</option>
      <option value="price">Lowest Price</option>
    </select>
  </div>

  {/* Deals Grid */}
  <div className="deals-grid">
    {deals.map(deal => (
      <DealCard key={deal.id} deal={deal}>
        <div className="deal-badge">
          {deal.discountPercent}% OFF
        </div>
        <img src={deal.item.iconUrl} alt={deal.item.name} />
        <h3>{deal.item.name}</h3>
        <div className="price-info">
          <span className="current">${deal.currentPrice}</span>
          <span className="original"><strike>${deal.averagePrice}</strike></span>
        </div>
        <div className="savings">
          Save ${deal.savingsAmount}
        </div>
        <div className="deal-score">
          Deal Score: {deal.dealScore}/100
        </div>
        <a href={deal.listingUrl} className="btn-secondary" onClick={() => trackClick(deal.id)}>
          View on {deal.platform}
        </a>
      </DealCard>
    ))}
  </div>
</DailyDealsPage>

// Homepage "Today's Deals" Widget
<TodayDealsWidget deals={topDeals.slice(0, 5)}>
  <h2>🔥 Today's Hot Deals</h2>
  {topDeals.map(deal => (
    <DealListItem key={deal.id} deal={deal}>
      <img src={deal.item.iconUrl} />
      <div className="info">
        <span className="name">{deal.item.name}</span>
        <span className="savings">{deal.discountPercent}% off</span>
      </div>
      <span className="price">${deal.currentPrice}</span>
    </DealListItem>
  ))}
  <a href="/deals" className="view-all">View All Deals →</a>
</TodayDealsWidget>
```

## Success Metrics

- ✅ 40%+ users check deal feed weekly
- ✅ 10%+ click-through rate (deal view → marketplace click)
- ✅ 100+ deals generated daily
- ✅ Average deal score >70/100
- ✅ 5%+ purchase conversion (affiliate tracking)

## Dependencies

### Must Have Before Starting
- [04] Price Aggregation (current prices)
- Price history tracking (30-day average calculation)

### Blocks Other Features
None (self-contained feature)

## Effort Estimate

- **Development Time:** 1 week
- **Complexity:** Medium
- **Team Size:** 1 developer

**Breakdown:**
- Days 1-2: Price history tracking, deal detection algorithm
- Days 3-4: Daily cron job, deal scoring system
- Days 5-6: Frontend deal feed page, featured deal component
- Day 7: Testing, optimization

## Implementation Notes

### Price History Tracking

```typescript
// Add to price sync service (from feature 04)
async function recordPriceHistory() {
  const currentPrices = await db.marketplacePrices.findMany();

  for (const price of currentPrices) {
    await db.priceHistory.create({
      data: {
        item_id: price.item_id,
        platform: price.platform,
        price: price.total_cost,
        recorded_at: new Date()
      }
    });
  }

  // Cleanup old history (keep only 90 days)
  await db.priceHistory.deleteMany({
    where: {
      recorded_at: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
    }
  });
}

// Run daily after price sync
cron.schedule('10 0 * * *', recordPriceHistory); // 12:10 AM UTC
```

### Deal Feed SEO Optimization

```typescript
// Generate static page for SEO
// pages/deals/[date].tsx
export async function getStaticProps({ params }) {
  const deals = await db.dailyDeals.findMany({
    where: { feed_date: new Date(params.date) },
    orderBy: { rank: 'asc' }
  });

  return {
    props: { deals, date: params.date },
    revalidate: 3600 // Revalidate hourly
  };
}

// SEO metadata
<meta property="og:title" content="Best CS2 Skin Deals for November 2, 2025" />
<meta property="og:description" content="100 items priced 10-30% below market average" />
```

### Critical Gotchas & Production Issues

Based on comprehensive research of deal aggregation platforms, distributed systems at scale (Google SRE, Slack Engineering), and marketplace fraud detection, the following production issues must be addressed:

#### 1. **Fake Deals from Price Manipulation (CRITICAL)**

**Issue:** Research found **60% of Black Friday deals were manipulative** - advertised reference prices were not regularly offered for a substantial period before the discount. Common tactic: display list price $200, sale price $150 (25% off), when actual regular price is lower.

**Detection Challenge:** Business logic abuse cannot be detected by monitoring alone - requires manual audit process.

**Impact:** 72% of products showed discounted price was lowest in prior week only 28% of time (Black Friday study).

**Solution:**
```typescript
async function validateDealAuthenticity(
  item: Item,
  currentPrice: number,
  advertised Ref: number
): Promise<boolean> {
  // 1. Check if reference price was prevailing market price for 30+ days
  const priceHistory = await db.priceHistory.findMany({
    where: {
      item_id: item.id,
      recorded_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }
  });

  const daysAtRefPrice = priceHistory.filter(h =>
    Math.abs(h.price - advertisedRef) / advertisedRef < 0.05 // Within 5%
  ).length;

  // 2. Require reference price was actual price for substantial period
  if (daysAtRefPrice < 15) {
    console.log(`Fake deal detected: ref price only at $${advertisedRef} for ${daysAtRefPrice} days`);
    return false; // Reject deal - reference price not legitimate
  }

  // 3. Validate recent price drop (not permanently cheap)
  const recentPrices = priceHistory.slice(-7); // Last week
  const recentAvg = recentPrices.reduce((sum, h) => sum + h.price, 0) / recentPrices.length;

  if (currentPrice >= recentAvg * 0.95) {
    console.log('No recent drop - item always priced this low');
    return false; // Permanently cheap, not a real deal
  }

  // 4. Check price stability score
  const olderPrices = priceHistory.slice(0, -7);
  const olderAvg = olderPrices.reduce((sum, h) => sum + h.price, 0) / olderPrices.length;

  if (olderAvg < currentPrice * 1.1) {
    console.log('Price stability check failed - no sustained higher price');
    return false;
  }

  return true; // Legitimate deal
}

// Integrate into deal scoring
calculateDealScore(...) {
  // ... existing scoring logic ...

  // CRITICAL: Penalize items that were always priced low
  const priceStabilityPenalty = await this.checkPriceStability(priceHistory);
  score -= priceStabilityPenalty; // 0-20 point penalty for suspicious pricing

  return Math.max(0, Math.min(Math.round(score), 100));
}
```

**Source:** Oxylabs Research on Fake Discounts, TSE Research on Dynamic Pricing, Marketplace Fraud Detection Best Practices

---

#### 2. **PostgreSQL BRIN Index Missing on Time-Series Price Data (MAJOR - Database)**

**Issue:** B-tree indexes on `price_history.recorded_at` grow massive (10GB+ for 100M rows) and slow down inserts. BRIN (Block Range Index) designed specifically for time-ordered data provides **99% space reduction** with similar query performance.

**Impact:**
- B-tree index: 10GB storage, slower inserts
- BRIN index: 100MB storage (99% reduction), faster inserts, similar query speed

**Solution:**
```sql
-- ❌ WRONG: B-tree index on time-series column
CREATE INDEX idx_price_history_timestamp
ON price_history (recorded_at);
-- Result: 10GB for 100M rows, slow inserts

-- ✅ CORRECT: BRIN index for time-series data
CREATE INDEX idx_price_history_timestamp_brin
ON price_history USING BRIN (recorded_at)
WITH (pages_per_range = 128);
-- Result: 100MB for 100M rows (99% reduction), faster inserts

-- Verify index usage
EXPLAIN ANALYZE
SELECT * FROM price_history
WHERE recorded_at >= NOW() - INTERVAL '30 days'
  AND item_id = '123-abc';
-- BRIN: ~0.04ms, minimal storage
-- B-tree: ~0.05ms, 100x storage cost

-- Also apply to item_id for range queries
CREATE INDEX idx_price_history_item_brin
ON price_history USING BRIN (item_id, recorded_at)
WITH (pages_per_range = 128);
```

**Why BRIN Works:** Price history inserted in time order creates natural correlation with physical storage location. BRIN stores min/max value per block range instead of indexing every row.

**Source:** PostgreSQL Official Documentation, Crunchy Data BRIN Performance Analysis, Alibaba Cloud Time-Series Best Practices

---

#### 3. **Stale Deal Cache with TTL-Only Expiration (MAJOR)**

**Issue:** Time-based cache expiration (TTL) results in stale deals served between refresh cycles. If deal feed caches with 1-hour TTL, price changes won't reflect for up to 60 minutes. Users see incorrect prices, click through, find different price, lose trust.

**Impact:** Real-time applications demand event-driven invalidation to minimize stale data. Trust erosion from bait-and-switch pricing.

**Solution:**
```typescript
// ❌ WRONG: TTL-only caching
await redis.setex(`deals:feed:${date}`, 3600, JSON.stringify(deals));
// Stale for up to 1 hour after price changes

// ✅ CORRECT: Event-driven invalidation + short TTL
class DealCacheManager {
  // 1. Hybrid approach: Short TTL + event-driven invalidation
  async cacheDealFeed(date: Date, deals: Deal[]) {
    const cacheKey = `deals:feed:${date.toISOString().split('T')[0]}`;

    // Short TTL (5 minutes) as safety net
    await redis.setex(cacheKey, 300, JSON.stringify(deals));

    // Track which items are in today's deals for event invalidation
    const itemIds = deals.map(d => d.itemId);
    await redis.sadd(`deals:items:${date}`, ...itemIds);
  }

  // 2. Event-driven invalidation when price updates detected
  async onPriceUpdate(itemId: string, platform: string, newPrice: number) {
    // Find all deal feed dates containing this item
    const keys = await redis.keys('deals:items:*');

    for (const key of keys) {
      const isMember = await redis.sismember(key, itemId);

      if (isMember) {
        // Item is in this deal feed - invalidate immediately
        const date = key.split(':')[2];
        await redis.del(`deals:feed:${date}`);

        console.log(`Invalidated deal feed for ${date} due to price update on item ${itemId}`);
      }
    }
  }

  // 3. Versioned cache keys prevent stale reuse
  async cacheWithVersion(deals: Deal[]) {
    const version = await this.getCurrentPriceVersion();
    const cacheKey = `deals:feed:v${version}:${date}`;

    await redis.setex(cacheKey, 300, JSON.stringify(deals));
  }

  // 4. Write-through caching updates cache when source changes
  async updateDealPrice(dealId: string, newPrice: number) {
    // Update database first
    await db.dailyDeals.update({
      where: { id: dealId },
      data: { current_price: newPrice }
    });

    // Immediately update cache (write-through)
    const cacheKey = `deal:${dealId}`;
    await redis.hset(cacheKey, 'current_price', newPrice);
  }
}

// Wire up event listener
eventBus.on('price.updated', async ({ itemId, platform, newPrice }) => {
  await dealCacheManager.onPriceUpdate(itemId, platform, newPrice);
});
```

**Source:** Materialize Blog on Redis Cache Invalidation, Daily.dev Cache Strategies, Stellate Caching Guide

---

#### 4. **Thundering Herd - All Cron Jobs at Midnight (CRITICAL - Distributed Systems)**

**Issue:** Scheduling all daily deal generation jobs at midnight causes **substantial spikes in datacenter usage**. Everyone configures `cron '0 0 * * *'` causing all jobs to start simultaneously. Database connections spike, CPU maxes out, memory pressure, potential crashes.

**Impact:** Google SRE identified this as major distributed systems anti-pattern. Slack processes 10B+ jobs/day with distributed scheduling.

**Solution:**
```typescript
// ❌ WRONG: All jobs at exact midnight
cron.schedule('0 0 * * *', generateDailyDeals);
// Result: CPU/memory/DB spike at 00:00, potential crash

// ✅ CORRECT: Randomized scheduling within time window
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Deterministic distribution based on job ID
const jobId = 'daily-deal-generation';
const minute = hashCode(jobId) % 30; // Spread across 0-29 minutes
const cronExpression = `${minute} 0 * * *`; // e.g., "17 0 * * *"

cron.schedule(cronExpression, async () => {
  await generateDailyDeals();
});
console.log(`Deal generation scheduled at 00:${minute} UTC`);

// Google's approach: Use ? in crontab for system-chosen value
// crontab: "? 0 * * *" - system hashes job config over time range

// Alternative: Randomize within larger window
const startMinute = Math.floor(Math.random() * 60); // 0-59
cron.schedule(`${startMinute} 0-1 * * *`, generateDailyDeals);
// Spreads jobs across 2-hour window (00:00-01:59)
```

**Load Distribution:**
- Before: All jobs at 00:00 → 10,000 concurrent jobs
- After: Spread 0-30 min → 333 jobs/minute (30x reduction in peak load)

**Source:** Google SRE Book - Distributed Periodic Scheduling, Slack Engineering Blog on Distributed Cron

---

#### 5. **Race Conditions in Distributed Cron - Duplicate Deal Generation (CRITICAL)**

**Issue:** When horizontal scaling cron service, **multiple instances execute same job simultaneously**. Kubernetes runs 3 pods, all trigger deal generation at midnight, creates duplicate deals in database. Critical for deal feeds - users receive duplicate notifications, database bloat, incorrect deal counts.

**Impact:** Slack identified this as major scaling challenge. Database constraint violations, duplicate notifications, bloated storage.

**Solution:**
```typescript
import Redis from 'ioredis';
const redis = new Redis();

// ❌ WRONG: Multiple instances run same job
cron.schedule('0 0 * * *', async () => {
  await generateDailyDeals(); // All 3 pods execute simultaneously!
});

// ✅ CORRECT: Distributed lock prevents race conditions
async function generateDailyDealsWithLock() {
  const lockKey = 'cron:daily-deals:lock';
  const lockValue = `${process.env.HOSTNAME}-${Date.now()}`;
  const lockTTL = 600; // 10 minutes (max job duration)

  // Attempt to acquire distributed lock
  const lockAcquired = await redis.set(
    lockKey,
    lockValue,
    'EX', lockTTL,
    'NX' // Only set if not exists
  );

  if (!lockAcquired) {
    console.log('Another instance is running this job, skipping');
    return; // Lock held by another instance
  }

  console.log(`Lock acquired by ${process.env.HOSTNAME}`);

  try {
    await generateDailyDeals();
  } finally {
    // Release lock only if we still own it (prevent releasing another instance's lock)
    const currentValue = await redis.get(lockKey);

    if (currentValue === lockValue) {
      await redis.del(lockKey);
      console.log('Lock released');
    }
  }
}

cron.schedule('0 0 * * *', generateDailyDealsWithLock);

// Alternative: Leader-Follower Architecture (Slack's approach)
class LeaderElection {
  async electLeader() {
    const leaderId = await redis.set(
      'cron:leader',
      process.env.HOSTNAME,
      'EX', 30, // Leader lease 30 seconds
      'NX'
    );

    return leaderId !== null;
  }

  async startLeaderLoop() {
    setInterval(async () => {
      const isLeader = await this.electLeader();

      if (isLeader) {
        console.log('This instance is the leader');
        // Only leader schedules jobs
        cron.schedule('0 0 * * *', generateDailyDeals);
      }
    }, 10000); // Re-elect every 10 seconds
  }
}

// Alternative: Dedicated cron service + worker queue
import { Queue } from 'bullmq';

const dealQueue = new Queue('daily-deals', {
  connection: { host: 'redis', port: 6379 }
});

// Single cron instance adds job to queue
cron.schedule('0 0 * * *', async () => {
  await dealQueue.add('generate-deals', { date: new Date() }, {
    jobId: `deals-${new Date().toISOString().split('T')[0]}`, // Unique per day
    removeOnComplete: true
  });
});

// Multiple workers process from queue (no duplication)
const worker = new Worker('daily-deals', async (job) => {
  await generateDailyDeals();
});
```

**Source:** Slack Engineering - Distributed Cron at Scale, Temporal.io Distributed Scheduling, ACM Queue - Reliable Cron Across Planet

---

#### 6. **Low-Volume Items with Unrealistic Discounts (MAJOR - Fraud Detection)**

**Issue:** Obscure items show 50%+ discounts but no one wants them. Seller manipulates price to appear in deal feeds (list at $100, immediately drop to $50, looks like deal). Low transaction volume means no market validation. Detection difficult - business logic abuse cannot be detected by monitoring, requires manual audit.

**Impact:** Feed filled with "deals" users don't want. Reduces trust in deal quality. Manipulation gaming the system.

**Solution:**
```typescript
async function validateDealPopularity(
  item: Item,
  discountPercent: number
): Promise<{ valid: boolean; penalty: number }> {
  // 1. Check minimum transaction volume (30-day window)
  const salesHistory = await db.sales.count({
    where: {
      item_id: item.id,
      sold_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }
  });

  if (salesHistory < 10) {
    console.log(`Low volume item (${salesHistory} sales) - not qualified for deals`);
    return { valid: false, penalty: 50 }; // Reject or heavily penalize
  }

  // 2. Check marketplace listing count (multiple sellers = legitimate market)
  const listingCount = await db.marketplacePrices.count({
    where: { item_id: item.id }
  });

  if (listingCount < 5) {
    console.log(`Only ${listingCount} marketplace listings - possible manipulation`);
    return { valid: false, penalty: 30 };
  }

  // 3. Flag for manual review if discount >40% on low-volume item
  if (discountPercent > 40 && salesHistory < 50) {
    await db.dealAuditQueue.create({
      data: {
        item_id: item.id,
        discount_percent: discountPercent,
        sales_volume: salesHistory,
        reason: 'High discount on low-volume item - possible manipulation',
        flagged_at: new Date()
      }
    });

    return { valid: false, penalty: 40 }; // Hold for review
  }

  // 4. Weight deal score by popularity
  let popularityBonus = 0;

  if (salesHistory > 100) popularityBonus = 10;
  else if (salesHistory > 50) popularityBonus = 5;
  else if (salesHistory > 25) popularityBonus = 2;

  return { valid: true, penalty: -popularityBonus }; // Negative penalty = bonus
}

// Integrate into deal scoring
async calculateDealScore(
  discountPercent: number,
  savingsAmount: number,
  currentPrice: number,
  item: Item,
  priceHistory: PriceHistory[]
): Promise<number> {
  let score = 0;

  // ... existing scoring components ...

  // Component 5: Popularity validation (0-10 points bonus, or rejection)
  const { valid, penalty } = await this.validateDealPopularity(item, discountPercent);

  if (!valid) {
    return 0; // Invalid deal, score = 0 (filtered out)
  }

  score -= penalty; // Apply penalty/bonus

  return Math.max(0, Math.min(Math.round(score), 100));
}
```

**Source:** RST Software - Marketplace Fraud Detection, Darrow - Deceptive Pricing Practices, Sift - E-commerce Fraud Prevention 2025

---

### Best Business Practices & Industry Standards

#### 1. Deal Detection Methodology - CamelCamelCamel vs Slickdeals Approaches

**Two Distinct Methodologies:**

**CamelCamelCamel (Automated Tracking):**
- Comprehensive price tracking with 6+ months historical data
- Automated alerts when prices drop to user-specified threshold
- Tracks third-party sellers and Amazon fulfillment separately
- Charts show price trends over time for informed decisions

**Slickdeals (Community-Driven Curation):**
- Users submit deals, community votes, moderators curate front page
- Every deal is community-vetted for legitimacy
- Personalization algorithm shows deals based on viewing history
- Real-time social validation reduces fake deal risk

**Best Practice for csloadout.gg:** Hybrid approach
- Automated detection (CamelCamelCamel methodology)
- Community validation optional (upvote/downvote system Phase 2)
- Machine learning from user behavior (personalization)

#### 2. Deal Scoring Methodology - Composite Metrics

**Industry Standard:** Multi-factor weighted scoring (0-100 scale)

**Component Breakdown:**
1. **Discount Percentage** (0-40 points)
   - 10% discount = 20 points
   - 20% discount = 40 points (max)
   - Emphasizes relative savings

2. **Absolute Savings** (0-30 points)
   - $10 savings = 30 points (max)
   - Favors high-value deals even if lower %

3. **Price Affordability** (0-20 points)
   - <$10 = 20 points (most accessible)
   - $10-25 = 15 points
   - $25-50 = 10 points
   - $50-100 = 5 points
   - Democratizes deals for all budgets

4. **Price Stability** (0-10 points)
   - Recent drop from sustained higher price = 10 points
   - Filters out permanently cheap items

5. **Popularity Bonus** (0-10 points)
   - High transaction volume = confidence boost
   - Prevents manipulation with obscure items

**Source:** Lead Scoring Methodologies, Dynamic Deal Scoring with ML, RFM Analysis

#### 3. Cache Invalidation Strategy for Real-Time Accuracy

**Industry Best Practice:** Event-driven invalidation + short TTL safety net

**Hybrid Approach:**
- **Primary:** Event-driven invalidation when source data changes
- **Safety Net:** Short TTL (5 min) in case events missed
- **Versioning:** Cache keys include version number to prevent stale reuse
- **Write-Through:** Update cache immediately when database updated

**Why This Matters:**
- Real-time applications can't tolerate stale pricing
- Users lose trust when prices don't match marketplace
- Affiliate commissions lost when users bounce due to price mismatch

**Source:** Materialize, Daily.dev, Stellate, Stack Overflow consensus

#### 4. Distributed Cron Best Practices - Google SRE & Slack Engineering

**Thundering Herd Prevention:**
- Randomize job start times within time window
- Use deterministic hashing for reproducible distribution
- Spread load across 30-60 minute window

**Race Condition Prevention:**
- Distributed locks (Redis SETNX) before job execution
- Leader-follower architecture (only leader schedules)
- Dedicated cron service + worker queue pattern

**Scalability:**
- Google's approach: Hash job config over time range
- Slack's approach: Leader election with standby followers
- Temporal.io: Built-in distributed scheduler with deduplication

**Performance at Scale:**
- Slack: 10 billion jobs/day
- Average load: 34,722 tasks/minute
- Zero duplicate executions

**Source:** Google SRE Book, Slack Engineering Blog, ACM Queue, Temporal.io docs

#### 5. PostgreSQL Time-Series Optimization

**BRIN Index for Price History:**
- **Use Case:** Time-ordered data with natural correlation to physical storage
- **Benefits:** 99% space reduction (10GB → 100MB), faster inserts
- **Configuration:** `pages_per_range = 128` starting point
- **Perfect For:** `recorded_at` columns in price tracking

**When NOT to use BRIN:**
- Random data order (use B-tree)
- Low correlation with physical storage
- Frequent updates to old rows

**Source:** PostgreSQL Official Docs, Crunchy Data, Alibaba Cloud Time-Series Best Practices

---

### Authoritative Documentation & Sources

#### Official Documentation
1. **PostgreSQL BRIN Indexes:** https://www.postgresql.org/docs/current/brin.html
2. **Redis Distributed Locking:** https://redis.io/docs/manual/patterns/distributed-locks/
3. **Google SRE - Distributed Periodic Scheduling:** https://sre.google/sre-book/distributed-periodic-scheduling/

#### Industry Best Practices
4. **Crunchy Data - BRIN Performance:** https://www.crunchydata.com/blog/postgresql-brin-indexes-big-data-performance-with-minimal-storage
5. **Alibaba Cloud - PostgreSQL Time-Series:** https://alibaba-cloud.medium.com/postgresql-time-series-best-practices-stock-exchange-system-database-50d5c9bed8bd
6. **Slack Engineering - Distributed Cron:** https://blog.bytebytego.com/p/how-slack-built-a-distributed-cron
7. **Materialize - Redis Cache Invalidation:** https://materialize.com/blog/redis-cache-invalidation/
8. **Daily.dev - Cache Best Practices:** https://daily.dev/blog/cache-invalidation-vs-expiration-best-practices

#### Deal Aggregation Research
9. **CamelCamelCamel Methodology:** https://www.commercecaffeine.com/tools/camelcamelcamel
10. **Slickdeals Community Curation:** https://daily.slickdeals.net/tech/set-a-deal-alert-on-slickdeals/
11. **Shopify - Price Comparison Apps:** https://www.shopify.com/blog/7068398-10-best-comparison-shopping-engines-to-increase-ecommerce-sales

#### Fraud Detection & Price Manipulation
12. **Oxylabs - Fake Discounts Research:** https://oxylabs.io/blog/oxylabs-research-on-fake-discounts-are-shopping-events-worth-the-deal
13. **TSE - Fake Sales Research (PDF):** https://www.tse-fr.eu/sites/default/files/TSE/documents/doc/wp/2019/wp_tse_1037.pdf
14. **RST Software - Marketplace Fraud:** https://www.rst.software/blog/marketplace-fraud-detection-and-prevention-best-practices
15. **Sift - E-commerce Fraud 2025:** https://sift.com/blog/how-to-prevent-e-commerce-fraud-with-intelligent-automation/

#### Distributed Systems
16. **ACM Queue - Reliable Cron Across Planet:** https://queue.acm.org/detail.cfm?id=2745840
17. **Temporal.io - Distributed Scheduling:** https://temporal.io/
18. **BullMQ - Job Queue Documentation:** https://docs.bullmq.io/

## Status

- [x] Research complete (gotchas, best practices, authoritative sources documented)
- [x] Gotchas documented (6 critical issues: fake deals, BRIN indexing, cache staleness, thundering herd, race conditions, low-volume manipulation)
- [x] Best practices captured (5 industry standards: deal detection methodology, composite scoring, cache invalidation, distributed cron, PostgreSQL optimization)
- [x] Authoritative sources documented (18 official/industry sources)
- [ ] Price history tracking implemented
- [ ] Deal detection algorithm built
- [ ] Daily cron job configured
- [ ] Frontend deal feed page created
- [ ] Featured deal widget built
- [ ] SEO optimization complete
- [ ] Testing complete
- [ ] Deployed to production

## Related Features

- **Depends On:**
  - [04] Price Aggregation

- **Enhances:**
  - [09] Price Alerts (users can alert on deal feed items)

## References

- Slickdeals Algorithm: https://slickdeals.net/forums/showthread.php?t=6108604
- Price Drop Detection: https://camelcamelcamel.com/about
