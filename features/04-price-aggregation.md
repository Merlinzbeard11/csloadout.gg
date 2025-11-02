# 04 - Multi-Marketplace Price Aggregation

## Overview

The core competitive advantage: aggregate prices from 26+ CS2 marketplaces to show users the absolute lowest price for any item. This single feature differentiates csloadout.gg from all competitors who operate in silos.

**Critical Value Prop:** "Save money - we find the cheapest price across all marketplaces"

## User Segments Served

- **Primary:** ALL Users (85%+ want lowest prices)
- **Secondary:** Deal Hunters (arbitrage opportunities)
- **Tertiary:** Investors (track price trends across platforms)

## User Stories / Use Cases

### As a Casual Player
- I want to see "AK-47 | Redline (FT) - $8.50 on CSFloat vs $11.20 on Steam" so I can save $2.70
- I want to click "Buy on CSFloat" and go directly to that marketplace listing
- I want to see total cost including fees so I know what I'll actually pay

### As a Deal Hunter
- I want to see "Buy on CSFloat $100, Sell on CS.MONEY $115" arbitrage opportunities
- I want price alerts when an item drops below average on any platform
- I want historical price charts to identify buy-low moments

### As an Investor
- I want to track price trends across platforms to identify manipulation
- I want to see which marketplace has most liquidity for an item
- I want 5-year historical data to identify seasonal patterns

### As a Bulk Trader
- I want to compare bulk pricing across platforms (e.g., 100x cases)
- I want to see which platform has inventory available for large orders

## Research & Context

### Aggregator API Options (from discovery research)

| Provider | Markets Covered | Update Frequency | Historical Data | Pricing | Decision |
|----------|----------------|------------------|-----------------|---------|----------|
| **Pricempire** | 59 marketplaces | 30s - 2min | 5 years | $$ (quote needed) | **Best** (if budget allows) |
| **CSGOSKINS.GG** | 26 markets | 5 minutes | Unknown | $ (all-inclusive) | **Good** (MVP option) |
| **vvTable** | 6 major platforms | Real-time | Unknown | $$ | Niche |
| **SteamWebAPI** | Steam only | Real-time | No | FREE | Fallback |

**MVP Recommendation:**
- Start with **CSGOSKINS.GG API** (26 markets, 5min updates, all-inclusive pricing)
- Add **Pricempire** in Phase 2 if budget allows (59 markets, better historical data)

### Marketplaces to Cover (Priority Order)

**Tier 1 (Must Have - MVP):**
1. **Steam Community Market** - 15% fees, baseline pricing
2. **CSFloat** - 2% fees, lowest for many items
3. **CS.MONEY** - 7% fees, largest inventory
4. **TradeIt.gg** - 2-60% fees, high volume
5. **Buff.163** - 2.5% fees (China-only but "BUFF Price" is industry standard)
6. **DMarket** - 2-10% fees, blockchain-based

**Tier 2 (Should Have - Phase 1):**
7. White.market
8. Skinport
9. Market.CSGO
10. BitSkins
11. LootFarm
12. SWAP.GG

**Tier 3 (Nice to Have - Phase 2+):**
13-26. Remaining platforms from CSGOSKINS.GG API

### Competitive Fee Analysis

From discovery research:

| Platform | Seller Fee | Buyer Fee | Effective Total | Transparency |
|----------|-----------|-----------|-----------------|---------------|
| **Steam** | 10% + 5% game | 0% | 15% | ❌ Confusing |
| **CSFloat** | 2% | 0% | 2% | ✅ Clear |
| **CS.MONEY** | 7% | 0% | 7% (+20% bot markup) | ❌ Hidden bot cut |
| **TradeIt** | 2-60% | 0% | Variable | ❌ Opaque |
| **DMarket** | 2-10% | 0% | Variable | ⚠️ Item-dependent |
| **Buff163** | 2.5% | 0% | 2.5% | ✅ Clear |

**csloadout.gg Advantage:** Show TOTAL cost including all fees (unlike competitors)

### Price Update Strategy

**Real-Time (Ideal but expensive):**
- WebSocket connections to each marketplace
- Sub-second price updates
- Cost: High infrastructure + API costs

**Near Real-Time (Target for Phase 2):**
- Polling every 30s - 2min
- Acceptable for most users
- Cost: Moderate

**Scheduled Updates (MVP):**
- Polling every 5 minutes (matches CSGOSKINS.GG)
- Cache results in Redis
- Cost: Low, scalable
- Trade-off: Prices may lag by up to 5 min

**MVP Decision:** 5-minute updates, clearly display "Updated X minutes ago"

## Technical Requirements

### API Integration Architecture

```typescript
// Marketplace Price Provider Interface
interface PriceProvider {
  name: string; // "CSFloat", "Steam", etc.
  getPrice(itemId: string): Promise<PriceData | null>;
  getBulkPrices(itemIds: string[]): Promise<Map<string, PriceData>>;
}

interface PriceData {
  platform: string;
  price: number; // In USD
  currency: string;
  fees: {
    seller: number; // Platform fee %
    buyer: number;
    total: number;
  };
  totalCost: number; // price + (price * fees.total)
  availableQuantity?: number; // For bulk traders
  listingUrl: string; // Direct link to buy
  lastUpdated: Date;
}

// Aggregated result for an item
interface AggregatedPrices {
  itemId: string;
  itemName: string;
  lowestPrice: PriceData; // Cheapest option
  allPrices: PriceData[]; // All platforms, sorted by totalCost
  savings: number; // lowestPrice vs highest
  updatedAt: Date;
}
```

### Database Schema

```sql
CREATE TABLE marketplace_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id),
  platform VARCHAR(50) NOT NULL, -- "csfloat", "steam", "csmoney"
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  seller_fee_percent DECIMAL(5,2),
  buyer_fee_percent DECIMAL(5,2),
  total_cost DECIMAL(10,2) NOT NULL, -- price * (1 + fees)
  quantity_available INTEGER DEFAULT 1,
  listing_url TEXT,
  last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Composite unique constraint (one price per item per platform)
  UNIQUE(item_id, platform)
);

-- Indexes for fast lookups
CREATE INDEX idx_prices_item ON marketplace_prices(item_id);
CREATE INDEX idx_prices_platform ON marketplace_prices(platform);
CREATE INDEX idx_prices_total_cost ON marketplace_prices(total_cost);
CREATE INDEX idx_prices_updated ON marketplace_prices(last_updated);

-- Composite index for "cheapest price for item" queries
CREATE INDEX idx_prices_item_cost ON marketplace_prices(item_id, total_cost);
```

### Price Sync Service (Background Job)

```typescript
// Cron job runs every 5 minutes
async function syncAllPrices() {
  const items = await db.items.findAll({ select: ['id', 'name'] });

  // Use CSGOSKINS.GG API (or Pricempire)
  const response = await fetch('https://api.csgoskins.gg/v1/prices', {
    headers: { 'Authorization': `Bearer ${process.env.CSGOSKINS_API_KEY}` }
  });

  const priceData = await response.json();

  // Update database in batches
  for (const itemPrices of priceData) {
    await db.marketplacePrices.upsert({
      where: { item_id_platform: { item_id: itemPrices.itemId, platform: itemPrices.platform } },
      update: {
        price: itemPrices.price,
        total_cost: itemPrices.totalCost,
        last_updated: new Date()
      },
      create: { /* full record */ }
    });
  }

  console.log(`Updated prices for ${items.length} items across ${platforms.length} platforms`);
}

// Schedule with cron
cron.schedule('*/5 * * * *', syncAllPrices); // Every 5 minutes
```

### API Endpoints

```typescript
// Get aggregated prices for a single item
GET /api/items/:itemId/prices
Response: {
  itemId: "...",
  itemName: "AK-47 | Redline (Field-Tested)",
  lowestPrice: {
    platform: "CSFloat",
    price: 8.50,
    fees: { seller: 2, buyer: 0, total: 2 },
    totalCost: 8.67,
    listingUrl: "https://csfloat.com/...",
    lastUpdated: "2025-11-02T14:23:00Z"
  },
  allPrices: [
    { platform: "CSFloat", totalCost: 8.67, ... },
    { platform: "Buff163", totalCost: 8.90, ... },
    { platform: "Steam", totalCost: 11.20, ... }
  ],
  savings: 2.53, // $11.20 (Steam) - $8.67 (CSFloat)
  updatedAt: "2025-11-02T14:23:00Z"
}

// Get bulk prices for loadout builder
POST /api/prices/bulk
Body: { itemIds: ["id1", "id2", "id3"] }
Response: {
  items: [
    { itemId: "id1", lowestPrice: {...}, allPrices: [...] },
    { itemId: "id2", lowestPrice: {...}, allPrices: [...] }
  ],
  totalLowestCost: 45.67,
  totalSavings: 12.30 // vs if all bought on Steam
}

// Get price history for charts
GET /api/items/:itemId/price-history?days=30&platform=csfloat
Response: {
  itemId: "...",
  platform: "csfloat",
  dataPoints: [
    { date: "2025-10-01", price: 8.20 },
    { date: "2025-10-02", price: 8.35 },
    ...
  ]
}
```

### Frontend Components

```typescript
// Price Comparison Table Component
<PriceComparisonTable item={item}>
  <thead>
    <tr>
      <th>Platform</th>
      <th>Price</th>
      <th>Fees</th>
      <th>Total Cost</th>
      <th>Action</th>
    </tr>
  </thead>
  <tbody>
    {prices.allPrices.map(price => (
      <tr key={price.platform} className={price === prices.lowestPrice ? 'bg-green-50' : ''}>
        <td>{price.platform}</td>
        <td>${price.price}</td>
        <td>{price.fees.total}%</td>
        <td className="font-bold">${price.totalCost}</td>
        <td>
          <a href={price.listingUrl} target="_blank" className="btn-primary">
            Buy on {price.platform}
          </a>
        </td>
      </tr>
    ))}
  </tbody>
  <tfoot>
    <tr>
      <td colspan="5">
        💰 Save ${prices.savings.toFixed(2)} by buying on {prices.lowestPrice.platform}
        <span className="text-gray-500">• Updated {formatRelative(prices.updatedAt)}</span>
      </td>
    </tr>
  </tfoot>
</PriceComparisonTable>

// Price Badge Component (shows on item cards)
<PriceBadge item={item}>
  <div className="price-badge">
    <span className="platform">{item.lowestPrice.platform}</span>
    <span className="price">${item.lowestPrice.totalCost}</span>
    <span className="savings">Save ${item.savings}</span>
  </div>
</PriceBadge>

// Price History Chart Component
<PriceHistoryChart itemId={itemId} days={30}>
  {/* Line chart showing price over time */}
  {/* Multiple lines if comparing platforms */}
</PriceHistoryChart>
```

### Caching Strategy

```typescript
// Cache hot items (frequently viewed) in Redis
// TTL: 5 minutes (matches update frequency)

async function getCachedPrices(itemId: string): Promise<AggregatedPrices | null> {
  const cacheKey = `prices:${itemId}`;

  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Query database
  const prices = await db.marketplacePrices.findMany({
    where: { item_id: itemId },
    orderBy: { total_cost: 'asc' }
  });

  const aggregated: AggregatedPrices = {
    itemId,
    lowestPrice: prices[0],
    allPrices: prices,
    savings: prices[prices.length - 1].total_cost - prices[0].total_cost,
    updatedAt: new Date()
  };

  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(aggregated));

  return aggregated;
}
```

## Success Metrics

- ✅ 95%+ price accuracy (matches source platforms)
- ✅ <5 minute data freshness (prices updated every 5min)
- ✅ <200ms API response time for price queries
- ✅ 26+ platforms covered (CSGOSKINS.GG API)
- ✅ 100% uptime for price sync service
- ✅ $X saved per user per month (track click-throughs to marketplaces)

## Dependencies

### Must Have Before Starting
- [01] Item Database (need item IDs to match with pricing APIs)
- API key from CSGOSKINS.GG (or Pricempire)
- Redis/Vercel KV for caching

### Blocks Other Features
- [05] Fee Transparency (extends price display)
- [09] Price Alerts (monitors price changes)
- [17] Advanced Deal Alerts (uses price data)
- [21] Inventory Optimization (tracks portfolio value)

## Effort Estimate

- **Development Time:** 3-4 weeks
- **Complexity:** High
- **Team Size:** 1 developer

**Breakdown:**
- Week 1: API integration, database schema, price sync service
- Week 2: Caching layer, API endpoints, error handling
- Week 3: Frontend price comparison UI, charts
- Week 4: Testing, monitoring, optimization

## Implementation Notes

### Item ID Mapping Challenge

**Problem:** Different platforms use different item identifiers
- Steam: market_hash_name ("AK-47 | Redline (Field-Tested)")
- CSFloat: Internal ID system
- Buff163: Different ID scheme

**Solution:** Create mapping table
```sql
CREATE TABLE item_platform_mappings (
  item_id UUID REFERENCES items(id),
  platform VARCHAR(50),
  external_id VARCHAR(255),
  external_name VARCHAR(255),
  PRIMARY KEY (item_id, platform)
);
```

### Currency Conversion

**Challenge:** Platforms use different currencies (USD, EUR, CNY, RUB)

**Solution:**
```typescript
// Use exchange rate API (e.g., exchangerate-api.com - free tier)
async function convertToUSD(amount: number, fromCurrency: string): Promise<number> {
  const rates = await getExchangeRates(); // Cached daily
  return amount * rates[fromCurrency].USD;
}

// All prices stored in USD in database for comparison
```

### Price Outlier Detection

**Challenge:** API errors or scam listings can show incorrect prices

**Solution:**
```typescript
function isOutlier(price: number, historicalPrices: number[]): boolean {
  const mean = historicalPrices.reduce((a, b) => a + b) / historicalPrices.length;
  const stdDev = Math.sqrt(historicalPrices.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / historicalPrices.length);

  // Flag if price is >3 standard deviations from mean
  return Math.abs(price - mean) > (3 * stdDev);
}

// Don't display outlier prices, log for investigation
```

### Rate Limiting & API Quotas

**Challenge:** CSGOSKINS.GG likely has rate limits

**Solution:**
```typescript
// Implement exponential backoff
async function fetchWithRetry(url: string, maxRetries: number = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        // Rate limited, wait and retry
        await sleep(Math.pow(2, i) * 1000); // 1s, 2s, 4s
        continue;
      }
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000);
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Critical Gotchas (Research-Backed - 2025)

#### 🔴 CRITICAL SEVERITY

**1. Multi-Marketplace API Rate Limiting (Thundering Herd)**
- **Issue:** Connecting to multiple exchanges means juggling multiple authentication flows, key management systems, and rate limit policies. Mismanagement causes API bans or stalled updates.
- **Real-World Example:** PayPal/Braintree production incident - synchronized retries overwhelmed recovering services
- **Solution:**
  - Centralized API key management
  - Track rate limits per provider
  - Exponential backoff WITH jitter: `delay = min(cap, base * 2^attempt) * random(0,1)`
  - Monitor API health per marketplace
- **Code Example:**
```typescript
async function fetchWithBackoffAndJitter(url: string, attempt: number = 0): Promise<Response> {
  const MAX_DELAY = 32000; // 32 seconds cap
  const BASE_DELAY = 1000; // 1 second base

  try {
    const response = await fetch(url);
    if (response.status === 429) {
      // Add jitter to prevent thundering herd
      const delay = Math.min(MAX_DELAY, BASE_DELAY * Math.pow(2, attempt)) * Math.random();
      await sleep(delay);
      return fetchWithBackoffAndJitter(url, attempt + 1);
    }
    return response;
  } catch (error) {
    if (attempt >= 5) throw error;
    const delay = Math.min(MAX_DELAY, BASE_DELAY * Math.pow(2, attempt)) * Math.random();
    await sleep(delay);
    return fetchWithBackoffAndJitter(url, attempt + 1);
  }
}
```
- **Source:** AWS Architecture Blog, PayPal Engineering Blog, Atlassian Rate Limiting Docs

**2. Currency API Service Discontinuation Risk**
- **Issue:** Yahoo currency service shut down for ToS violations. Fixer.io deprecated forcing migrations. Free/cheap services have high discontinuation risk.
- **Solution:**
  - Use multiple currency providers (primary + fallback)
  - Abstract provider behind interface
  - Monitor provider health announcements
  - Enterprise SLA preferred over free tier
- **Code Example:**
```typescript
interface CurrencyProvider {
  getRate(from: string, to: string): Promise<number>;
}

class CurrencyService {
  private providers: CurrencyProvider[] = [
    new ExchangeRateAPI(), // Primary
    new CurrencyLayer(),   // Fallback 1
    new FreeCurrencyAPI()  // Fallback 2
  ];

  async getRate(from: string, to: string): Promise<number> {
    for (const provider of this.providers) {
      try {
        return await provider.getRate(from, to);
      } catch (error) {
        console.warn(`Provider ${provider.constructor.name} failed, trying next...`);
      }
    }
    throw new Error('All currency providers failed');
  }
}
```
- **Source:** Stack Overflow currency API threads, Fixer.io deprecation notices

**3. Redis Cache Stampede Without TTL Jitter**
- **Issue:** Without jitter, all cache entries expire simultaneously. Under heavy load, backend database must fulfill all requests at once, causing poor performance or crashes.
- **Solution:** Add random jitter to TTL: `TTL = base_ttl + random(0, jitter_range)`
- **Code Example:**
```typescript
const BASE_TTL = 300; // 5 minutes
const JITTER_RANGE = 60; // 1 minute spread

async function cachePrice(itemId: string, price: PriceData): Promise<void> {
  const ttl = BASE_TTL + Math.floor(Math.random() * JITTER_RANGE);
  await redis.setex(`price:${itemId}`, ttl, JSON.stringify(price));
}
```
- **Source:** Redis Official Blog, AWS ElastiCache Documentation

**4. Currency Symbol Reversal (BTC/USD vs USD/BTC)**
- **Issue:** Some platforms reverse the base and quote (e.g., BTC/USD vs USD/BTC). Without proper handling, pricing logic errors or misleading chart data - off by orders of magnitude.
- **Solution:**
  - Normalize all pairs to single standard (always USD as quote)
  - Validate against sanity checks (BTC should be $30K-$100K range)
  - Log and alert on impossible prices
- **Code Example:**
```typescript
function normalizePrice(pair: string, price: number): number {
  const [base, quote] = pair.split('/');

  // If reversed (USD/BTC instead of BTC/USD), invert price
  if (quote !== 'USD') {
    return 1 / price;
  }

  // Sanity check
  if (base === 'BTC' && (price < 30000 || price > 100000)) {
    throw new Error(`Impossible BTC price: ${price}`);
  }

  return price;
}
```
- **Source:** Finage crypto price aggregator blog

#### 🟠 MAJOR SEVERITY

**5. Currency API Weekend Data Staleness**
- **Issue:** Forex trading markets close from 4pm EST Friday to 5pm EST Sunday. European Central Bank data stops in the weekend. Many data sources don't update on weekends.
- **Solution:**
  - Cache Friday rates for weekend use
  - Display "Last updated Friday 4pm EST" message
  - Use multiple data sources to cross-validate
- **Source:** ExchangeRate-API Documentation

**6. Currency API Timestamp Field Reliability**
- **Issue:** Currency APIs may return incorrect values for `last_modified` field. Use the `as_of` column instead to know the version of the exchange rate being returned.
- **Solution:** Always use `as_of` field for exchange rate timestamps, validate against known market hours, log discrepancies
- **Code Example:**
```typescript
interface ExchangeRateResponse {
  last_modified: string; // ❌ UNRELIABLE
  as_of: string;         // ✅ USE THIS
  rates: { [key: string]: number };
}

async function getExchangeRate(from: string, to: string): Promise<number> {
  const response = await fetch(`https://api.exchangerate.com/v1/latest?base=${from}`);
  const data: ExchangeRateResponse = await response.json();

  // ✅ CORRECT: Use as_of field
  const rateTimestamp = new Date(data.as_of);

  // Validate market hours (forex closed weekends)
  if (isWeekend(rateTimestamp)) {
    console.warn(`Forex market closed on ${rateTimestamp}, using Friday rates`);
  }

  return data.rates[to];
}
```
- **Source:** Microsoft Learn Currency Service API docs, Stack Overflow

**7. Z-Score Outlier Detection Fails With Extreme Outliers**
- **Issue:** Z-score uses mean and std dev, but extreme outliers skew the mean itself. One scam listing at $999,999 makes all real prices appear normal by comparison.
- **Solution:** Use IQR method for skewed distributions or Modified Z-score (MAD)
- **Code Example:**
```typescript
// ❌ BAD: Z-score sensitive to extreme outliers
function detectOutliersZScore(prices: number[]): boolean[] {
  const mean = prices.reduce((a, b) => a + b) / prices.length;
  const stdDev = Math.sqrt(prices.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / prices.length);
  return prices.map(price => Math.abs(price - mean) > 3 * stdDev);
}

// ✅ GOOD: IQR method robust to extreme outliers
function detectOutliersIQR(prices: number[]): boolean[] {
  const sorted = [...prices].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;

  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return prices.map(price => price < lowerBound || price > upperBound);
}

// ✅ GOOD: Modified Z-score using MAD (Median Absolute Deviation)
function detectOutliersMAD(prices: number[]): boolean[] {
  const sorted = [...prices].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const mad = sorted.map(x => Math.abs(x - median)).sort((a, b) => a - b)[Math.floor(sorted.length / 2)];

  const modifiedZScores = prices.map(price => 0.6745 * (price - median) / mad);
  return modifiedZScores.map(z => Math.abs(z) > 3.5);
}
```
- **Source:** Towards Data Science, Analytics Vidhya, Penn State STAT 200

**8. No Freshness Indicators = Stale Data Decisions**
- **Issue:** Users see price, click buy, find different price on marketplace. Without "Updated X minutes ago" or "Live/Stale/Paused" status, users can't assess data reliability.
- **Solution:**
  - Display compact freshness indicator: "Live" (green), "Stale" (yellow), "Paused" (red)
  - Show timestamp: "Updated 2 minutes ago"
  - Add manual refresh button
  - Use micro-animations for live updates
- **Code Example:**
```typescript
function DataFreshnessIndicator({ lastUpdated }: { lastUpdated: Date }) {
  const minutesAgo = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);

  const status =
    minutesAgo < 5 ? 'Live' :
    minutesAgo < 15 ? 'Stale' :
    'Paused';

  const color =
    status === 'Live' ? 'green' :
    status === 'Stale' ? 'yellow' :
    'red';

  return (
    <div className="freshness-indicator">
      <span className={`status-dot ${color}`}>●</span>
      <span className="status-text">{status}</span>
      <span className="timestamp">Updated {minutesAgo}m ago</span>
      <button onClick={refreshPrices}>⟳</button>
    </div>
  );
}
```
- **Source:** Smashing Magazine Real-Time Dashboards, Metaplane Data Freshness Guide

**9. Data Synchronization Inconsistencies Across Platforms**
- **Issue:** Poor handling of marketplace data sync (taxonomy, product data, offers, pricing, availability, orders) leads to data inconsistencies across platforms and operational inefficiencies.
- **Solution:**
  - Implement message queue system (RabbitMQ/Kafka) for data surges and fail-safes
  - Use middleware for load balancing
  - API-driven strategy with well-defined endpoints for debugging
- **Source:** Mirakl Marketplace Integration Guide, API2Cart

#### 🟡 MEDIUM SEVERITY

**10. Platform Availability (Region-Locked Marketplaces)**
- **Issue:** Some platforms region-locked (Buff163 = China only)
- **Solution:** Detect user location, only show accessible platforms

**11. Item Wear Confusion**
- **Issue:** "AK-47 Redline" exists in multiple wears (FT, MW, FN)
- **Solution:** Always include wear in item ID matching, show lowest price per wear on item page

**12. Affiliate Link Tracking**
- **Issue:** Need to track which marketplace users buy from
- **Solution:** URL parameters + server-side tracking

**13. Price Manipulation**
- **Issue:** Fake listings to manipulate aggregated prices
- **Solution:** Require minimum volume, ignore single listings, use outlier detection

**14. API Changes**
- **Issue:** Pricing APIs change structure without notice
- **Solution:** Version API responses, implement schema validation

**15. Database Bloat**
- **Issue:** Storing every price update = millions of rows
- **Solution:** Only store latest + daily snapshots for history

## Status

- [ ] Research complete
- [ ] API integration implemented (CSGOSKINS.GG)
- [ ] Database schema created
- [ ] Price sync service deployed
- [ ] Caching layer implemented
- [ ] Frontend UI built
- [ ] Testing complete
- [ ] Monitoring configured
- [ ] Deployed to production

## Related Features

- **Depends On:**
  - [01] Item Database

- **Enables:**
  - [05] Fee Transparency
  - [09] Price Alerts
  - [10] Deal Feed
  - [15] Portfolio Analytics
  - [17] Advanced Deal Alerts

## Best Business Practices (2025 Industry Standards)

### Revenue Model Strategy

**Primary Revenue Streams for Price Aggregator Platforms:**

1. **Affiliate Commissions (Primary Revenue)**
   - Take 2-5% commission per transaction when users click through and purchase
   - Example: User clicks "Buy on CSFloat" → csloadout.gg earns commission
   - Industry Standard: Booking.com takes 15-20%, Uber 15-30%

2. **Marketplace Listing Fees**
   - Marketplaces pay to be included in price aggregation
   - Featured placement fees for priority positioning
   - Industry Standard: Zomato charges restaurants for visibility

3. **Sponsored Placements**
   - Marketplaces pay to show up first in price comparison
   - Clearly labeled "Sponsored" per FTC guidelines
   - Industry Standard: Trivago, Kayak use this model

**Recommended for csloadout.gg:**
- Start with affiliate commissions only (easiest to implement)
- Add listing fees after reaching 100K monthly users
- Sponsored placements only if marketplace demand warrants

### FTC Affiliate Disclosure Compliance (MANDATORY)

**Legal Requirement:** FTC mandates **clear and conspicuous** disclosures when earning affiliate commissions.

**Four Critical Elements:**

1. **Proximity:** Disclosure must be visible BEFORE affiliate links
2. **Prominence:** Font size must be easily readable
3. **Presentation:** Simple language - no jargon
4. **Placement:** Near affiliate links, not hidden in footer

**❌ WRONG - Inadequate Disclosure:**
```html
<!-- Footer hidden disclosure -->
<footer>
  <small>*Affiliate links used</small>
</footer>
```

**✅ CORRECT - FTC Compliant Disclosure:**
```html
<!-- Above price comparison table -->
<div className="affiliate-disclosure" style="background: #f3f4f6; padding: 1rem; margin-bottom: 1rem;">
  <p><strong>Disclosure:</strong> We earn a commission when you purchase through our links at no extra cost to you. This helps us keep csloadout.gg free for everyone.</p>
</div>

<PriceComparisonTable />
```

**FTC Warning:** Simply labeling a link "Affiliate Link" is NOT enough - users may not understand this means you're paid for purchases.

**Enforcement:** FTC can impose civil or criminal penalties for deceptive disclosures.

**Source:** Federal Trade Commission Affiliate Disclosure Guidelines, Termly FTC Compliance Guide

### MAP (Minimum Advertised Price) Compliance

**2025 Trend:** Brands now actively track MAP violations across marketplaces and delist violators.

**What is MAP:**
- Minimum Advertised Price = lowest price brands allow retailers to advertise
- Retailers can SELL below MAP but cannot ADVERTISE below MAP
- Violation = brand may suspend supply or terminate distribution agreement

**Impact on csloadout.gg:**
- We aggregate ADVERTISED prices from marketplaces
- If marketplace violates MAP, brand may force price removal
- We display prices marketplace already publicly advertises
- **Risk:** Minimal (we're not the advertiser, marketplaces are)

**Best Practice:**
- Include disclaimer: "Prices shown are as advertised by marketplaces"
- Monitor for sudden price removals (may indicate MAP enforcement)
- Don't cache prices longer than marketplace displays them

**Source:** Shopify MAP Pricing Guide 2025, Dealavo MAP Monitoring Software Guide

### Pricing Accuracy SLA (Service Level Agreement)

**Industry Standards for E-commerce:**

- **Uptime:** 99.5% minimum, 99.9% preferred (enterprise standard)
- **Critical Issue Resolution:** 4-6 hours
- **Data Freshness:** Varies by industry (financial: real-time, retail: hourly)

**Recommended SLA for csloadout.gg:**

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Price Accuracy** | 95%+ match source marketplace | Compare random sample of 100 items weekly |
| **Data Freshness** | <5 minutes stale | 95% of prices updated within 5 min |
| **Uptime** | 99.5% | Vercel infrastructure monitoring |
| **API Response Time** | <200ms p95 | 95th percentile under 200ms |
| **Price Sync Failures** | <1% | Failed API calls / total calls |

**Monitoring Implementation:**
```typescript
// Track pricing accuracy metrics
interface PricingMetrics {
  totalPricesChecked: number;
  accurateMatches: number;
  stalePrices: number; // >5 min old
  failedSyncs: number;
  avgResponseTime: number;
  p95ResponseTime: number;
}

async function trackPricingAccuracy() {
  // Random sample of 100 items
  const sample = await db.items.findMany({ take: 100, orderBy: { random: 'asc' } });

  for (const item of sample) {
    const ourPrice = await getCachedPrice(item.id);
    const actualPrice = await fetchMarketplacePrice(item.id);

    if (Math.abs(ourPrice - actualPrice) > 0.01) {
      metrics.inaccuratePrices++;
    }
  }

  const accuracy = (metrics.accurateMatches / metrics.totalPricesChecked) * 100;
  if (accuracy < 95) {
    alertOps('Price accuracy below SLA: ' + accuracy + '%');
  }
}
```

**Source:** IBM SLA Metrics, ShipBob Service Level Agreement Guide, E-commerce SLA research papers

### Data-Driven Pricing Strategy

**2025 Best Practice:** Real-time data analytics for optimal price positioning

**Key Metrics to Track:**
1. **Conversion Rate by Marketplace** - which marketplaces users actually buy from
2. **Average Savings Shown** - highlight "Save $X" messaging effectiveness
3. **Price Difference Threshold** - at what savings do users click through?
4. **Time-to-Purchase** - how stale can prices be before users abandon?

**Implementation:**
```typescript
// Track which marketplace users click through to
async function trackMarketplaceConversion(itemId: string, marketplace: string) {
  await analytics.track({
    event: 'marketplace_click',
    properties: {
      itemId,
      marketplace,
      priceDifference: lowestPrice.totalCost - marketplacePrice.totalCost,
      dataFreshness: Date.now() - lastUpdated.getTime(),
    }
  });
}

// A/B test: Does showing "Save $X" increase conversions?
const variant = Math.random() > 0.5 ? 'show-savings' : 'price-only';
```

**Source:** Vendavo Pricing Strategy Guide 2025, PROS Price Optimization Best Practices

## Authoritative Documentation & Sources

### API Integration & Rate Limiting
- [AWS Architecture Blog - Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [Atlassian - Rate Limiting](https://developer.atlassian.com/cloud/jira/platform/rate-limiting/)
- [PayPal Engineering - Thundering Herd Problem](https://medium.com/paypal-engineering)
- [Better Stack - Exponential Backoff in Distributed Systems](https://betterstack.com/community/guides/monitoring/exponential-backoff/)

### Currency Exchange Rate APIs
- [ExchangeRate-API Documentation](https://exchangeratesapi.io/documentation/)
- [Microsoft Learn - Currency Service API](https://learn.microsoft.com/en-us/xandr/digital-platform-api/currency-service)
- [Stack Overflow - Currency Exchange Rate APIs](https://stackoverflow.com/questions/3139879/how-do-i-get-currency-exchange-rates-via-an-api-such-as-google-finance)

### Redis Caching Strategies
- [Redis Official Blog - Caching Strategies](https://redis.io/blog/why-your-caching-strategies-might-be-holding-you-back-and-what-to-consider-next/)
- [AWS ElastiCache - Caching Strategies](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Strategies.html)
- [AWS Whitepaper - Database Caching Strategies Using Redis](https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/cache-validity.html)

### Price Outlier Detection
- [Towards Data Science - Outlier Detection Methods](https://towardsdatascience.com/outlier-detection-part1-821d714524c/)
- [Analytics Vidhya - Outliers Detection Using IQR, Z-score, LOF and DBSCAN](https://www.analyticsvidhya.com/blog/2022/10/outliers-detection-using-iqr-z-score-lof-and-dbscan/)
- [Penn State STAT 200 - Identifying Outliers: IQR Method](https://online.stat.psu.edu/stat200/lesson/3/3.2)

### Real-Time Data UX
- [Smashing Magazine - UX Strategies For Real-Time Dashboards](https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/)
- [Metaplane - Data Freshness Definition and Best Practices](https://www.metaplane.dev/blog/data-freshness-definition-examples)

### Multi-Marketplace Integration
- [Finage - Building a Multi-Exchange Crypto Price Aggregator](https://finage.co.uk/blog/building-a-multiexchange-crypto-price-aggregator-key-data-challenges--687d2c6f2c14c1dfb91bb7cc)
- [Mirakl - Common Marketplace Integration Challenges](https://www.mirakl.com/blog/common-marketplace-integration-challenges-how-to-avoid)
- [API2Cart - Best Marketplace APIs to Integrate](https://api2cart.com/api-technology/top-10-best-marketplace-apis/)

### Business Model & Revenue Strategy
- [Feedough - Aggregator Business Model](https://www.feedough.com/aggregator-business-model/)
- [Business Model Analyst - Aggregator Business Model](https://businessmodelanalyst.com/aggregator-business-model/)
- [Price2Spy - Top Pricing Trends for 2025](https://www.price2spy.com/blog/pricing-trends/)

### FTC Compliance & Affiliate Disclosure
- [Federal Trade Commission - Affiliate Marketing Rules](https://www.ftc.gov/legal-library/browse/rules/fair-credit-reporting-act-affiliate-marketing)
- [Termly - FTC Affiliate Disclosure](https://termly.io/resources/articles/ftc-affiliate-disclosure/)
- [ReferralCandy - FTC Affiliate Disclosure: Rules, Examples, and 2025 Checklist](https://www.referralcandy.com/blog/ftc-affiliate-disclosure)

### MAP Pricing Compliance
- [Shopify - MAP Pricing: How a Minimum Advertised Price Works (2025)](https://www.shopify.com/blog/map-pricing)
- [Dealavo - Best MAP Monitoring Software: The Ultimate Guide for 2025](https://dealavo.com/en/best-map-monitoring-software-the-ultimate-guide-for-2025/)
- [Omnia Retail - A Guide to MAP Pricing: Benefits, Challenges, and Strategies](https://www.omniaretail.com/blog/what-is-map-pricing)

### Service Level Agreements
- [IBM - Types of Service Level Agreement (SLA) Metrics](https://www.ibm.com/think/topics/sla-metrics)
- [ShipBob - What is a Service Level Agreement (SLA)?](https://www.shipbob.com/blog/sla-service-level-agreement/)
- [CIO - SLA Definitions and Solutions](https://www.cio.com/article/274740/outsourcing-sla-definitions-and-solutions.html)

## References

- CSGOSKINS.GG API Docs: https://csgoskins.gg/docs/
- Pricempire API Docs: https://pricempire.com/api
- Exchange Rate API: https://exchangerate-api.com/
- Outlier Detection: https://en.wikipedia.org/wiki/68%E2%80%9395%E2%80%9399.7_rule
