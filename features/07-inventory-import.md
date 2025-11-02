# 07 - Basic Inventory Import

## Overview

Import user's Steam CS2 inventory to display total value, identify items to sell, and enable personalized features like "Which items in my inventory are worth more on other marketplaces?"

**Value Prop:** "See what your inventory is worth across all marketplaces"

## User Segments Served

- **Primary:** Investors (portfolio tracking)
- **Secondary:** Casual Players (see inventory value)
- **Tertiary:** Bulk Traders (identify profitable items to sell)

## User Stories / Use Cases

### As an Investor
- I want to import my Steam inventory and see "$2,458 total value"
- I want to see which of my items have increased in value
- I want to identify underperforming items to sell

### As a Casual Player
- I want to see which platform offers the best price for my items
- I want to know "Sell your AK-47 Redline on CSFloat for $8.67 instead of Steam for $7.20"

### As a Bulk Trader
- I want to import inventory from multiple accounts
- I want to see which items to move between accounts for optimal storage

## Research & Context

### Steam Inventory API

**Steam Web API Endpoints:**
```
GET /IEconItems_730/GetPlayerItems/v1/
Parameters:
- key: Steam Web API key
- steamid: User's Steam ID 64-bit
- l: Language (default: english)

Returns: JSON with all CS2 items in inventory
```

**Example Response:**
```json
{
  "result": {
    "status": 1,
    "items": [
      {
        "id": "123456789",
        "original_id": "123456789",
        "def_index": 7,
        "level": 1,
        "quality": 4,
        "inventory": 2147483649,
        "quantity": 1,
        "origin": 8,
        "custom_name": "",
        "custom_desc": "",
        "attribute": [
          {
            "defindex": 6,
            "value": 0.123456,  // Float value!
            "float_value": 0.123456
          }
        ],
        "flag_cannot_trade": false,
        "flag_cannot_craft": false,
        "icon_url": "...",
        "icon_url_large": "...",
        "type": "Rifle",
        "name": "AK-47 | Redline"
      }
    ],
    "num_backpack_slots": 1000
  }
}
```

**Privacy Considerations:**
- User must have public inventory
- If inventory private → cannot import
- User can change privacy settings at any time

### Alternative: Steam Community Web Scraping

**If inventory is public but API fails:**
```
Scrape: https://steamcommunity.com/profiles/{steamId}/inventory/json/730/2
Note: Unofficial, may break, use as fallback
```

### Data to Extract

**Per Item:**
```typescript
interface InventoryItem {
  id: string;                  // Steam inventory ID
  assetId: string;             // Unique asset ID
  name: string;                // "AK-47 | Redline"
  type: string;                // "Rifle"
  rarity: string;              // "Classified"
  quality: string;             // "Normal", "StatTrak", "Souvenir"
  wear: string;                // "Field-Tested"
  floatValue?: number;         // 0.123456 (if available)
  patternSeed?: number;        // For Case Hardened, etc.
  stickers?: Sticker[];        // Applied stickers
  nameTag?: string;            // Custom name
  canTrade: boolean;           // Trade restrictions
  tradeHoldUntil?: Date;       // If on trade hold
  iconUrl: string;             // Steam CDN image
  marketHashName: string;      // For matching with pricing APIs
}
```

## Technical Requirements

### Database Schema

```sql
-- User inventory cache (refreshes every X hours)
CREATE TABLE user_inventories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  steam_id VARCHAR(20) NOT NULL,

  -- Inventory metadata
  total_items INTEGER NOT NULL DEFAULT 0,
  total_value DECIMAL(10,2),           -- Sum of all item values
  last_synced TIMESTAMP NOT NULL DEFAULT NOW(),
  sync_status VARCHAR(20) DEFAULT 'success', -- 'success', 'private', 'error'
  error_message TEXT,

  -- Inventory privacy
  is_public BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Individual inventory items
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES user_inventories(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id),  -- Link to our item database

  -- Steam-specific data
  steam_asset_id VARCHAR(50) NOT NULL,
  market_hash_name VARCHAR(255) NOT NULL,

  -- Item attributes
  float_value DECIMAL(10,8),
  pattern_seed INTEGER,
  wear VARCHAR(20),
  quality VARCHAR(20),              -- "StatTrak", "Souvenir"
  custom_name VARCHAR(255),
  stickers JSONB,                   -- Array of applied stickers

  -- Trade restrictions
  can_trade BOOLEAN DEFAULT TRUE,
  trade_hold_until TIMESTAMP,

  -- Pricing (cached from price aggregation)
  current_value DECIMAL(10,2),
  best_platform VARCHAR(50),         -- Where to sell for best price

  -- Metadata
  acquired_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(inventory_id, steam_asset_id)
);

CREATE INDEX idx_inventory_items_inventory ON inventory_items(inventory_id);
CREATE INDEX idx_inventory_items_item ON inventory_items(item_id);
CREATE INDEX idx_inventory_items_value ON inventory_items(current_value);
```

### Inventory Sync Service

```typescript
// Service to import/refresh inventory
class InventoryImportService {
  async syncInventory(userId: string, steamId: string): Promise<SyncResult> {
    try {
      // 1. Check inventory privacy
      const privacy = await this.checkInventoryPrivacy(steamId);
      if (!privacy.isPublic) {
        return {
          status: 'private',
          message: 'Inventory is private. Please make it public in Steam settings.'
        };
      }

      // 2. Fetch inventory from Steam API
      const steamItems = await this.fetchSteamInventory(steamId);

      // 3. Match Steam items with our database
      const matchedItems = await this.matchItems(steamItems);

      // 4. Fetch prices for all items
      const pricedItems = await this.fetchPrices(matchedItems);

      // 5. Save to database
      await this.saveInventory(userId, pricedItems);

      // 6. Calculate total value
      const totalValue = pricedItems.reduce((sum, item) => sum + (item.currentValue || 0), 0);

      return {
        status: 'success',
        totalItems: pricedItems.length,
        totalValue,
        syncedAt: new Date()
      };

    } catch (error) {
      console.error('Inventory sync failed:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  private async fetchSteamInventory(steamId: string): Promise<SteamItem[]> {
    const url = `https://api.steampowered.com/IEconItems_730/GetPlayerItems/v1/?key=${process.env.STEAM_API_KEY}&steamid=${steamId}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.result.status !== 1) {
      throw new Error('Failed to fetch inventory from Steam');
    }

    return data.result.items;
  }

  private async matchItems(steamItems: SteamItem[]): Promise<MatchedItem[]> {
    // Match Steam market_hash_name with our items database
    const matched: MatchedItem[] = [];

    for (const steamItem of steamItems) {
      const ourItem = await db.items.findFirst({
        where: {
          name: { contains: this.extractBaseName(steamItem.name) },
          wear: this.extractWear(steamItem.name)
        }
      });

      matched.push({
        steamAssetId: steamItem.id,
        itemId: ourItem?.id,
        marketHashName: steamItem.market_hash_name || steamItem.name,
        floatValue: this.extractFloat(steamItem),
        patternSeed: this.extractPattern(steamItem),
        wear: this.extractWear(steamItem.name),
        quality: this.extractQuality(steamItem),
        stickers: this.extractStickers(steamItem),
        canTrade: !steamItem.flag_cannot_trade
      });
    }

    return matched;
  }

  private async fetchPrices(items: MatchedItem[]): Promise<PricedItem[]> {
    // Bulk fetch prices for all items
    const itemIds = items.map(i => i.itemId).filter(Boolean);
    const prices = await db.marketplacePrices.findMany({
      where: { item_id: { in: itemIds } },
      orderBy: { total_cost: 'asc' }
    });

    const priceMap = new Map();
    prices.forEach(price => {
      if (!priceMap.has(price.item_id)) {
        priceMap.set(price.item_id, price);
      }
    });

    return items.map(item => ({
      ...item,
      currentValue: priceMap.get(item.itemId)?.total_cost || 0,
      bestPlatform: priceMap.get(item.itemId)?.platform || 'steam'
    }));
  }
}
```

### API Endpoints

```typescript
// Trigger inventory sync
POST /api/inventory/sync
Body: { steamId: "76561198012345678" }
Response: {
  status: "success",
  totalItems: 247,
  totalValue: 2458.67,
  syncedAt: "2025-11-02T15:30:00Z"
}

// Get user inventory
GET /api/inventory
Response: {
  inventory: {
    totalItems: 247,
    totalValue: 2458.67,
    lastSynced: "2025-11-02T15:30:00Z",
    items: [
      {
        id: "...",
        name: "AK-47 | Redline",
        wear: "Field-Tested",
        floatValue: 0.234567,
        currentValue: 8.67,
        bestPlatform: "csfloat",
        steamMarketValue: 7.20,
        savings: 1.47
      },
      // ...
    ]
  }
}

// Get inventory value by platform
GET /api/inventory/value-comparison
Response: {
  platforms: [
    { platform: "csfloat", totalValue: 2458.67 },
    { platform: "buff163", totalValue: 2401.23 },
    { platform: "steam", totalValue: 2134.50 }
  ],
  maxSavings: 324.17  // CSFloat vs Steam
}
```

### Frontend Components

```typescript
// Inventory Import Button
<InventoryImportButton userId={userId} steamId={steamId}>
  {isLoading ? (
    <button disabled>Importing... {progress}%</button>
  ) : lastSync ? (
    <div>
      <span>Last synced: {formatRelative(lastSync)}</span>
      <button onClick={handleResync}>Refresh Inventory</button>
    </div>
  ) : (
    <button onClick={handleImport}>Import Steam Inventory</button>
  )}
</InventoryImportButton>

// Inventory Value Dashboard
<InventoryValueDashboard inventory={inventory}>
  <div className="inventory-summary">
    <div className="stat-card">
      <h3>Total Items</h3>
      <p className="text-3xl">{inventory.totalItems}</p>
    </div>

    <div className="stat-card">
      <h3>Total Value</h3>
      <p className="text-3xl text-green-600">${inventory.totalValue}</p>
      <small>Best prices across all platforms</small>
    </div>

    <div className="stat-card">
      <h3>Potential Savings</h3>
      <p className="text-3xl text-blue-600">${inventory.maxSavings}</p>
      <small>vs selling on Steam</small>
    </div>
  </div>

  <div className="inventory-grid">
    {inventory.items.map(item => (
      <ItemCard key={item.id} item={item}>
        <div className="item-value">
          <span className="platform-badge">{item.bestPlatform}</span>
          <span className="price">${item.currentValue}</span>
          {item.savings > 0 && (
            <span className="savings">Save ${item.savings}</span>
          )}
        </div>
      </ItemCard>
    ))}
  </div>
</InventoryValueDashboard>

// Privacy Warning Component
<PrivacyWarning inventoryPrivate={true}>
  <div className="alert alert-warning">
    <h4>⚠️ Inventory is Private</h4>
    <p>We can't import your inventory because it's set to private in Steam.</p>
    <p>To enable import:</p>
    <ol>
      <li>Go to Steam → Profile → Edit Profile → Privacy Settings</li>
      <li>Set "Inventory" to "Public"</li>
      <li>Come back and click "Refresh Inventory"</li>
    </ol>
    <a href="https://steamcommunity.com/my/edit/settings" target="_blank">
      Open Steam Privacy Settings
    </a>
  </div>
</PrivacyWarning>
```

## Success Metrics

- ✅ 40%+ users import inventory (of authenticated users)
- ✅ <10s inventory sync time (for 500 items)
- ✅ 99%+ item matching accuracy (Steam → our database)
- ✅ <5% failed imports (due to privacy/errors)
- ✅ Daily auto-refresh for active users

## Dependencies

### Must Have Before Starting
- [01] Item Database (to match Steam items)
- [04] Price Aggregation (to value inventory)
- [06] Steam Authentication (to get Steam ID)
- Steam Web API key

### Blocks Other Features
- [15] Portfolio Analytics (needs inventory data)
- [21] Inventory Optimization (analyzes inventory)

## Effort Estimate

- **Development Time:** 1-2 weeks
- **Complexity:** Medium-High
- **Team Size:** 1 developer

**Breakdown:**
- Days 1-3: Steam API integration, item matching logic
- Days 4-6: Database schema, sync service, pricing integration
- Days 7-9: Frontend UI, error handling
- Day 10: Testing, edge cases, optimization

## Implementation Notes

### Caching Strategy

```typescript
// Cache inventory for 6 hours (balance freshness vs API calls)
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

async function getInventory(userId: string): Promise<Inventory> {
  const cached = await db.userInventories.findUnique({
    where: { user_id: userId }
  });

  const age = Date.now() - cached.last_synced.getTime();

  if (age < CACHE_TTL) {
    // Return cached data
    return cached;
  } else {
    // Trigger background refresh
    syncInventoryInBackground(userId);
    return cached; // Return stale data while refreshing
  }
}
```

### Critical Gotchas & Production Issues

#### 1. **IEconItems_730 Endpoint Permanently Disabled** ⚠️ CRITICAL

**Problem:** The documented `IEconItems_730/GetPlayerItems/v1` endpoint is permanently disabled. The feature specification references this endpoint, but it no longer works.

**Impact:** Complete inability to import inventory using documented endpoint. All implementations using IEconItems will fail with 403 Forbidden or "Unsupported request" errors.

**Solution:**

```typescript
// ❌ WRONG: Using deprecated IEconItems endpoint (WILL FAIL)
const url = `https://api.steampowered.com/IEconItems_730/GetPlayerItems/v1/?key=${apiKey}&steamid=${steamId}`;
// Returns: {"success": false, "Error": "Unsupported request"}

// ✅ CORRECT: Use new inventory endpoint
const url = `https://steamcommunity.com/inventory/${steamId}/730/2`;
// Supports pagination with start_assetid and count parameters
```

**Alternative Approaches:**

**Option A: Use New Inventory Endpoint (Recommended)**
```typescript
async function fetchSteamInventory(steamId: string): Promise<InventoryItem[]> {
  const url = `https://steamcommunity.com/inventory/${steamId}/730/2`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; csloadout.gg/1.0)',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Inventory is private or requires authentication');
    }
    throw new Error(`Steam API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error('Failed to fetch inventory');
  }

  return data.assets.map(asset => ({
    assetId: asset.assetid,
    classId: asset.classid,
    instanceId: asset.instanceid,
    amount: asset.amount,
    ...data.descriptions.find(d => d.classid === asset.classid)
  }));
}
```

**Option B: Use Third-Party Proxy Services**
- steamwebapi.com - Provides pooled API keys and authentication handling
- Handles rate limiting and cookie management
- Paid service but solves authentication issues

**Option C: Implement Cookie-Based Authentication**
- Requires browser authentication cookies for Steam Community
- More complex but allows direct API access
- Not recommended for production (violates Steam ToS)

**References:**
- Stack Overflow: "Steam web API getting CS:GO inventory"
- McKay Development: "Best way to call steam API for Inventory"
- Steam Community: Inventory endpoint discussions

---

#### 2. **Extreme Rate Limiting - Reality vs Documentation** ⚠️ CRITICAL

**Problem:** Official documentation states 100,000 calls/day limit, but inventory endpoints return HTTP 429 (Too Many Requests) after just 4-6 requests. Practical limit is approximately 5 requests per minute.

**Impact:** Authentication fails during traffic spikes, inventory imports fail for multiple concurrent users, production service becomes unusable.

**Real-World Data:**
- Official limit: 100,000 requests/day
- Actual limit: 4-6 requests before 429 errors
- Rate increased restrictions: November 2022
- Community reports: "Less than 5 per minute" practical limit

**Solution:**

```typescript
// Aggressive caching strategy
const INVENTORY_CACHE_TTL = 6 * 60 * 60; // 6 hours (minimum recommended)

async function getCachedInventory(steamId: string): Promise<Inventory> {
  // 1. Check Redis cache first
  const cacheKey = `inventory:${steamId}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    const data = JSON.parse(cached);
    const age = Date.now() - data.cachedAt;

    if (age < INVENTORY_CACHE_TTL * 1000) {
      return data.inventory;
    }
  }

  // 2. Check if refresh already in progress
  const lockKey = `inventory:lock:${steamId}`;
  const isLocked = await redis.get(lockKey);

  if (isLocked) {
    // Return stale data while refresh in progress
    if (cached) {
      return JSON.parse(cached).inventory;
    }
    throw new Error('Inventory refresh in progress, try again soon');
  }

  // 3. Set lock and fetch fresh data
  await redis.setex(lockKey, 60, '1'); // 60 second lock

  try {
    const inventory = await fetchSteamInventory(steamId);

    // Cache for 6+ hours
    await redis.setex(cacheKey, INVENTORY_CACHE_TTL, JSON.stringify({
      inventory,
      cachedAt: Date.now()
    }));

    return inventory;
  } finally {
    await redis.del(lockKey);
  }
}

// Exponential backoff with jitter for 429 errors
async function fetchWithRetry(url: string, attempt: number = 0): Promise<Response> {
  const MAX_RETRIES = 3;
  const BASE_DELAY = 2000; // 2 seconds

  const response = await fetch(url);

  if (response.status === 429) {
    if (attempt >= MAX_RETRIES) {
      throw new Error('Rate limit exceeded, try again later');
    }

    // Exponential backoff: 2s, 4s, 8s + random jitter
    const delay = BASE_DELAY * Math.pow(2, attempt);
    const jitter = Math.random() * 1000; // 0-1s random

    await sleep(delay + jitter);
    return fetchWithRetry(url, attempt + 1);
  }

  return response;
}
```

**Best Practices:**
- **Minimum cache TTL:** 6 hours (balance freshness vs rate limits)
- **User-initiated refresh:** Allow manual refresh but show last sync time
- **Batch user requests:** Queue multiple user requests and fetch sequentially
- **Third-party proxies:** Consider steamwebapi.com for production (pools API keys)
- **Background jobs:** Refresh active user inventories during off-peak hours

**References:**
- Stack Overflow: "How am I exceeding steam api's rate limit?"
- Steam Community: "Steam Web API constantly rate-limited (Error 429)"
- McKay Development: "Rate limit on steamcommunity.com"

---

#### 3. **Large Inventory Pagination Complexity** ⚠️ MAJOR

**Problem:** Inventories larger than 2000 items require multiple API requests. Adding count parameter limited to 2000 may yield fewer 429 responses, but makes fetching large inventories complex. Each request counts toward brutal rate limit.

**Impact:** Users with large inventories (investors, traders) experience timeouts, incomplete imports, or rate limit exhaustion.

**Solution:**

```typescript
async function fetchLargeInventory(steamId: string): Promise<InventoryItem[]> {
  const allItems: InventoryItem[] = [];
  let startAssetId: string | null = null;
  let totalFetched = 0;
  let estimatedTotal = 0;

  do {
    // Build URL with pagination
    const url = new URL(`https://steamcommunity.com/inventory/${steamId}/730/2`);
    url.searchParams.set('count', '2000'); // Max items per request

    if (startAssetId) {
      url.searchParams.set('start_assetid', startAssetId);
    }

    // Show progress to user
    if (estimatedTotal > 0) {
      await updateProgress(steamId, {
        phase: 'fetching',
        current: totalFetched,
        total: estimatedTotal,
        percentage: Math.round((totalFetched / estimatedTotal) * 100)
      });
    }

    const response = await fetchWithRetry(url.toString());
    const data = await response.json();

    if (!data.success) {
      throw new Error('Failed to fetch inventory page');
    }

    // Process this batch
    const items = data.assets.map(asset => ({
      assetId: asset.assetid,
      classId: asset.classid,
      instanceId: asset.instanceid,
      ...data.descriptions.find(d => d.classid === asset.classid)
    }));

    allItems.push(...items);
    totalFetched += items.length;

    // Update pagination cursor
    startAssetId = data.last_assetid || null;
    estimatedTotal = data.total_inventory_count || totalFetched;

    // Add delay between requests to avoid 429
    if (startAssetId) {
      await sleep(2000); // 2 second delay between pages
    }

  } while (startAssetId); // Continue while more pages exist

  return allItems;
}

// Show progress in UI
async function updateProgress(steamId: string, progress: SyncProgress) {
  await redis.setex(`inventory:progress:${steamId}`, 300, JSON.stringify(progress));

  // Emit to WebSocket/SSE for real-time updates
  io.to(`user:${steamId}`).emit('inventory:progress', progress);
}
```

**UI Implementation:**

```typescript
// Frontend: Real-time progress display
export function InventoryImportProgress({ steamId }: { steamId: string }) {
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  useEffect(() => {
    const socket = io();

    socket.on('inventory:progress', (data: SyncProgress) => {
      setProgress(data);
    });

    return () => socket.disconnect();
  }, []);

  if (!progress) return <div>Starting import...</div>;

  return (
    <div className="progress-container">
      <div className="progress-bar" style={{ width: `${progress.percentage}%` }} />

      <div className="progress-info">
        {progress.phase === 'fetching' && (
          <span>Fetching inventory... {progress.current}/{progress.total} items ({progress.percentage}%)</span>
        )}
        {progress.phase === 'matching' && (
          <span>Matching items to database... {progress.current}/{progress.total}</span>
        )}
        {progress.phase === 'pricing' && (
          <span>Fetching prices... {progress.current}/{progress.total}</span>
        )}
      </div>
    </div>
  );
}
```

**Best Practices:**
- **Cursor-based pagination:** Use `start_assetid` (not offset-based)
- **Progress indicators:** Show "Importing... 2000/4523 items (44%)"
- **Incremental sync:** Only fetch new items using `last_assetid` marker
- **Cache partial results:** Save each batch in case of failure
- **User communication:** "Large inventory detected, this may take 2-3 minutes"

**References:**
- Steam Community: "Grabbing json data of inventory, what's the limit / best practice?"
- Stack Overflow: "Getting someone's Steam inventory"

---

#### 4. **GDPR Compliance for Third-Party API Data Import** ⚠️ CRITICAL

**Problem:** Importing user data via external APIs (Steam) requires verifying third-party GDPR compliance, implementing Data Processing Agreements (DPA), ensuring data encryption in transit, and supporting user rights (data portability, right to be forgotten).

**2025 Updates:**
- 48-hour breach notifications (healthcare/financial)
- Mandatory "data sovereignty" clauses in cloud contracts
- Updated Standard Contractual Clauses (SCCs) for cross-border transfers

**Penalties:** €20 million OR 4% of global annual revenue (whichever is higher)

**Solution:**

```typescript
// 1. Privacy Policy & Consent
async function initiateInventoryImport(userId: string, steamId: string) {
  // Check if user accepted privacy policy
  const user = await db.users.findUnique({ where: { id: userId } });

  if (!user.privacyPolicyAccepted) {
    return {
      requiresConsent: true,
      consentUrl: '/privacy/inventory-import'
    };
  }

  // Log data processing for GDPR audit trail
  await db.auditLog.create({
    data: {
      userId,
      action: 'INVENTORY_IMPORT_INITIATED',
      dataSource: 'Steam API',
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    }
  });

  return { success: true };
}

// 2. Data Minimization - Only collect necessary fields
interface MinimalInventoryData {
  assetId: string;           // Required for identification
  marketHashName: string;    // Required for pricing
  floatValue?: number;       // Optional, for collectors
  canTrade: boolean;         // Required for sell recommendations
  // DO NOT store: custom_name (PII), descriptions, icons (copyright)
}

// 3. Data Portability (GDPR Article 15)
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const inventory = await db.userInventories.findUnique({
    where: { user_id: session.user.id },
    include: { items: true }
  });

  // Export in machine-readable format
  return new Response(JSON.stringify(inventory, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename=inventory-export-${Date.now()}.json`
    }
  });
}

// 4. Right to be Forgotten (GDPR Article 17)
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response('Unauthorized', { status: 401 });

  // Cascade delete inventory data
  await db.userInventories.delete({
    where: { user_id: session.user.id }
    // CASCADE deletes inventory_items automatically
  });

  // Log deletion for audit
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'INVENTORY_DATA_DELETED',
      timestamp: new Date()
    }
  });

  return new Response('Inventory data deleted', { status: 200 });
}

// 5. Data Retention Policy
async function cleanupStaleInventories() {
  const RETENTION_DAYS = 90; // Delete after 90 days of inactivity

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  await db.userInventories.deleteMany({
    where: {
      last_synced: { lt: cutoff },
      user: { last_login: { lt: cutoff } }
    }
  });
}
```

**GDPR Compliance Checklist:**

**Data Collection:**
- [ ] Privacy policy displayed before first import
- [ ] User consent recorded with timestamp
- [ ] Data minimization implemented (only necessary fields)
- [ ] Clear explanation of what data is stored

**Security:**
- [ ] HTTPS only for all API calls
- [ ] Data encrypted at rest (database)
- [ ] Data encrypted in transit (TLS 1.3)
- [ ] Role-based access controls (RBAC)
- [ ] Audit logging for all data access

**User Rights:**
- [ ] Data export endpoint (JSON format)
- [ ] Account deletion endpoint (cascade delete)
- [ ] Data retention policy documented (90 days)
- [ ] Audit trail for all operations

**Third-Party Verification:**
- [ ] Verify Steam API GDPR compliance
- [ ] Data Processing Agreement (if applicable)
- [ ] Monitor vendor compliance regularly
- [ ] Document data flow: User → csloadout.gg → Steam API

**Cross-Border Compliance:**
- [ ] Use 2025 Standard Contractual Clauses (SCCs)
- [ ] Data sovereignty clauses in contracts
- [ ] Multi-jurisdiction compliance (GDPR + US state laws)

**References:**
- GDPR Official Text: Articles 15, 17, 25, 32
- Nordic APIs: "What GDPR Means For API Developers"
- Cycode: "Understanding an API provider's privacy policy"
- ComplianceHub: "GDPR 2025 Updates"

---

#### 5. **Bulk Import Error Handling UX** ⚠️ MAJOR

**Problem:** Users expect row-level error indicators with tooltips, error summaries after upload, and ability to fix errors without re-uploading. Blocking users to re-open external tools creates friction.

**Impact:** Poor user experience leads to abandoned imports, frustration, support tickets.

**Solution:**

```typescript
// Error handling during import
interface ImportResult {
  success: boolean;
  summary: {
    totalItems: number;
    successCount: number;
    errorCount: number;
    skippedCount: number;
  };
  items: ImportedItem[];
  errors: ImportError[];
}

interface ImportError {
  itemIndex: number;
  assetId: string;
  itemName: string;
  errorType: 'NO_MATCH' | 'NO_PRICE' | 'INVALID_FLOAT' | 'TRADE_LOCKED';
  errorMessage: string;
  suggestedFix?: string;
}

async function importInventoryWithErrorHandling(
  steamId: string
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    summary: { totalItems: 0, successCount: 0, errorCount: 0, skippedCount: 0 },
    items: [],
    errors: []
  };

  try {
    const steamItems = await fetchSteamInventory(steamId);
    result.summary.totalItems = steamItems.length;

    for (let i = 0; i < steamItems.length; i++) {
      const steamItem = steamItems[i];

      try {
        // Attempt to match item
        const match = await matchSteamItem(steamItem);

        if (!match) {
          result.errors.push({
            itemIndex: i,
            assetId: steamItem.assetid,
            itemName: steamItem.market_hash_name,
            errorType: 'NO_MATCH',
            errorMessage: 'Item not found in database',
            suggestedFix: 'Skip this item or contact support to add it'
          });
          result.summary.errorCount++;
          continue;
        }

        // Attempt to fetch price
        const price = await fetchPrice(match.itemId);

        if (!price) {
          result.errors.push({
            itemIndex: i,
            assetId: steamItem.assetid,
            itemName: steamItem.market_hash_name,
            errorType: 'NO_PRICE',
            errorMessage: 'Price data unavailable',
            suggestedFix: 'Item will be imported with $0 value'
          });
          // Continue anyway with null price
        }

        // Validate float value if present
        if (steamItem.floatValue && (steamItem.floatValue < 0 || steamItem.floatValue > 1)) {
          result.errors.push({
            itemIndex: i,
            assetId: steamItem.assetid,
            itemName: steamItem.market_hash_name,
            errorType: 'INVALID_FLOAT',
            errorMessage: `Invalid float value: ${steamItem.floatValue}`,
            suggestedFix: 'Float value will be omitted'
          });
          steamItem.floatValue = null;
        }

        // Successfully processed
        result.items.push({
          ...match,
          currentValue: price?.total_cost || 0,
          bestPlatform: price?.platform || 'unknown'
        });
        result.summary.successCount++;

      } catch (error) {
        result.errors.push({
          itemIndex: i,
          assetId: steamItem.assetid,
          itemName: steamItem.market_hash_name || 'Unknown',
          errorType: 'NO_MATCH',
          errorMessage: error.message,
          suggestedFix: 'Skip this item'
        });
        result.summary.errorCount++;
      }
    }

    result.success = result.summary.errorCount < result.summary.totalItems;
    return result;

  } catch (error) {
    throw new Error(`Inventory import failed: ${error.message}`);
  }
}
```

**Frontend Error Display:**

```typescript
export function ImportResultsSummary({ result }: { result: ImportResult }) {
  const [showErrors, setShowErrors] = useState(false);

  return (
    <div className="import-results">
      {/* Success summary */}
      <div className="alert alert-success">
        <h4>✅ Import Complete</h4>
        <p>
          <strong>{result.summary.successCount}</strong> items imported successfully
        </p>
      </div>

      {/* Error summary */}
      {result.summary.errorCount > 0 && (
        <div className="alert alert-warning">
          <h4>⚠️ {result.summary.errorCount} Items Had Issues</h4>

          {/* Group errors by type */}
          <ul>
            {Object.entries(
              result.errors.reduce((acc, err) => {
                acc[err.errorType] = (acc[err.errorType] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([type, count]) => (
              <li key={type}>
                {count} item(s) - {getErrorTypeLabel(type)}
              </li>
            ))}
          </ul>

          <button onClick={() => setShowErrors(!showErrors)}>
            {showErrors ? 'Hide Details' : 'Show Details'}
          </button>

          <button onClick={() => downloadErrorReport(result.errors)}>
            📥 Download Error Report
          </button>
        </div>
      )}

      {/* Detailed error list */}
      {showErrors && (
        <div className="error-details">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Issue</th>
                <th>Suggested Fix</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {result.errors.map((error, idx) => (
                <tr key={idx}>
                  <td>
                    <span className="error-icon">❌</span>
                    {error.itemName}
                  </td>
                  <td>
                    <span className="error-type">{getErrorTypeLabel(error.errorType)}</span>
                    <div className="tooltip">{error.errorMessage}</div>
                  </td>
                  <td>{error.suggestedFix}</td>
                  <td>
                    <button onClick={() => skipItem(error.assetId)}>Skip</button>
                    <button onClick={() => retryItem(error.assetId)}>Retry</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function downloadErrorReport(errors: ImportError[]) {
  const csv = [
    ['Item Name', 'Error Type', 'Error Message', 'Suggested Fix'],
    ...errors.map(e => [e.itemName, e.errorType, e.errorMessage, e.suggestedFix || ''])
  ].map(row => row.join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inventory-import-errors-${Date.now()}.csv`;
  a.click();
}
```

**Best Practices:**
- **Error summary alert:** "15 items imported, 3 errors" at top of page
- **Row-level indicators:** ❌ icon for each failed item with tooltip
- **Grouped error types:** "12 items - No price data", "3 items - Invalid float"
- **Download error report:** CSV/JSON export for detailed review
- **In-app correction:** Allow retry/skip without re-import
- **Preview before commit:** Show what will be imported with ability to edit

**References:**
- Medium: "UX Case Study: Bulk Upload Feature"
- LogRocket: "UI best practices for loading, error, and empty states"
- Flatfile: "5 must-have features for a data importer"

---

#### 6. **Data Freshness vs Performance Balance** ⚠️ MAJOR

**Problem:** Inventory sync must balance data freshness with system performance. Stale data leads to decisions based on outdated information, but constant syncing overloads API rate limits.

**Impact:** Users see outdated inventory values, or system hits rate limits causing failures.

**Solution:**

```typescript
// Implement Change Data Capture (CDC) pattern
interface InventorySyncStrategy {
  fullSync: () => Promise<void>;      // Complete refresh (rare)
  incrementalSync: () => Promise<void>; // Only changes since last sync
  backgroundRefresh: () => Promise<void>; // Stale-while-revalidate
}

// Track modifications for incremental sync
CREATE TABLE inventory_sync_state (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  last_full_sync TIMESTAMP NOT NULL,
  last_incremental_sync TIMESTAMP,
  last_asset_id VARCHAR(50),  -- Cursor for pagination
  modified_on TIMESTAMP NOT NULL DEFAULT NOW(),
  sync_status VARCHAR(20) DEFAULT 'idle'
);

// Incremental sync implementation
async function incrementalInventorySync(userId: string, steamId: string) {
  const syncState = await db.inventorySyncState.findUnique({
    where: { user_id: userId }
  });

  // Fetch only new items since last sync
  const url = `https://steamcommunity.com/inventory/${steamId}/730/2`;
  const params = new URLSearchParams({
    count: '2000',
    start_assetid: syncState.last_asset_id || '0'
  });

  const response = await fetch(`${url}?${params}`);
  const data = await response.json();

  // Process only new/changed items
  const newItems = data.assets.filter(asset => {
    const existingItem = await db.inventoryItems.findFirst({
      where: { steam_asset_id: asset.assetid }
    });
    return !existingItem || existingItem.modified_on < syncState.last_incremental_sync;
  });

  // Update cursor for next incremental sync
  await db.inventorySyncState.update({
    where: { user_id: userId },
    data: {
      last_incremental_sync: new Date(),
      last_asset_id: data.last_assetid,
      modified_on: new Date()
    }
  });

  return newItems;
}

// Stale-while-revalidate pattern
async function getInventoryWithBackground Refresh(userId: string, steamId: string) {
  // 1. Return cached data immediately
  const cached = await db.userInventories.findUnique({
    where: { user_id: userId },
    include: { items: true }
  });

  if (cached) {
    const age = Date.now() - cached.last_synced.getTime();
    const FRESHNESS_THRESHOLD = 6 * 60 * 60 * 1000; // 6 hours

    if (age < FRESHNESS_THRESHOLD) {
      // Data is fresh, return immediately
      return cached;
    } else {
      // Data is stale, return it but trigger background refresh
      triggerBackgroundRefresh(userId, steamId);

      return {
        ...cached,
        _meta: {
          cached: true,
          lastSync: cached.last_synced,
          refreshing: true
        }
      };
    }
  }

  // No cache, fetch fresh data
  return await fullInventorySync(userId, steamId);
}

// Background job for active users
async function refreshActiveUserInventories() {
  // Define "active" as logged in within last 7 days
  const activeUsers = await db.users.findMany({
    where: {
      last_login: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      userInventory: { isNot: null }
    },
    include: { userInventory: true }
  });

  for (const user of activeUsers) {
    const age = Date.now() - user.userInventory.last_synced.getTime();

    // Refresh if older than 24 hours
    if (age > 24 * 60 * 60 * 1000) {
      await queue.add('inventory-refresh', {
        userId: user.id,
        steamId: user.steam_id,
        priority: 'low' // Background priority
      });

      // Add delay between users to avoid rate limits
      await sleep(5000); // 5 second delay
    }
  }
}
```

**Freshness Configuration:**

```typescript
// Configure acceptable staleness thresholds
const DATA_FRESHNESS_THRESHOLDS = {
  inventoryValue: 6 * 60 * 60,        // 6 hours (prices change)
  itemMetadata: 24 * 60 * 60,         // 24 hours (names/icons stable)
  userProfile: 7 * 24 * 60 * 60,      // 7 days (avatars rarely change)
  priceHistory: 1 * 60 * 60,          // 1 hour (volatile data)
};

// Show data age in UI
<div className="data-freshness">
  <span>Last updated: {formatRelative(inventory.last_synced)}</span>
  {isStale(inventory.last_synced, DATA_FRESHNESS_THRESHOLDS.inventoryValue) && (
    <button onClick={handleRefresh}>
      🔄 Refresh Now
    </button>
  )}
</div>
```

**Best Practices:**
- **Staleness thresholds:** 6 hours for inventory value, 24 hours for metadata
- **CDC implementation:** Track ModifiedOn timestamp, fetch only changes
- **Background refresh:** Show stale data while refreshing in background
- **Event-driven updates:** Emit "InventoryUpdated" events for real-time sync
- **User control:** Allow manual refresh with clear "last updated" indicator

**References:**
- Elementary Data: "Data Freshness: Best Practices & Key Metrics"
- Anomalo: "Data Freshness Metrics and Best Practices"
- AWS: "Building resilient applications: design patterns"

---

### Additional Gotchas (Lower Severity)

8. **Private Inventories**
   - ~30% of Steam users have private inventories
   - Solution: Clear messaging, instructions to make public

9. **Float Value Extraction**
   - Not all items return float in API response
   - Solution: Use CSFloat API as fallback

10. **Item Matching Ambiguity**
    - "AK-47 | Redline (Field-Tested)" vs "AK-47 | Redline"
    - Solution: Fuzzy matching + wear extraction

11. **Stickers Not Valued**
    - Stickers add value but hard to price
    - MVP: Show stickers but don't add to value
    - Phase 2: Estimate sticker value

12. **Trade-Locked Items**
    - Can't sell items on trade hold
    - Solution: Show "Available in X days"

13. **Name Tags**
    - Custom names obscure original item
    - Solution: Use market_hash_name, not display name

---

## Best Business Practices & Industry Standards

### Loading State Best Practices

**Industry Research:**
Loading states are opportunities to set user expectations by explaining what's happening or preparing them for what's coming next.

**Principles:**
1. **Show progress, not just spinners** - "Importing... 156/247 items (63%)"
2. **Explain current phase** - "Fetching inventory", "Matching items", "Calculating prices"
3. **Use skeleton screens** - Show layout before data loads
4. **Optimistic UI** - Show already-available data while re-fetching
5. **Allow navigation** - Don't block entire UI during background operations

**Implementation:**
```typescript
// Multi-phase progress indicator
<ProgressIndicator phases={[
  { name: 'Fetching', status: 'completed', duration: '2s' },
  { name: 'Matching', status: 'in_progress', current: 156, total: 247 },
  { name: 'Pricing', status: 'pending' },
  { name: 'Saving', status: 'pending' }
]} />
```

---

### Data Import Workflow Best Practices

**Industry Standard (from UX case studies):**

**Phase 1: Preview Before Commit**
- Show what will be imported with ability to review
- Allow column mapping (if applicable)
- Display warnings for potential issues
- Preserve system state until user confirms

**Phase 2: Validation & Error Detection**
- Validate data before processing
- Detect common errors (unmatched items, missing prices)
- Group errors by type for clarity
- Provide suggested fixes

**Phase 3: Import Execution**
- Show real-time progress
- Allow cancellation mid-import
- Cache partial results (resume on failure)
- Provide detailed logging

**Phase 4: Results & Error Recovery**
- Success summary: "247 items imported"
- Error summary: "3 items had issues" with details
- Download error report option
- In-app error correction (retry/skip)

**References:**
- Flatfile: "5 must-have features for a data importer"
- UX Stack Exchange: "User interface for uploading, verifying, and importing data"

---

### Cache Strategy Best Practices

**Industry Standards:**

**Stale-While-Revalidate (SWR) Pattern:**
- Immediately return cached data (fast UX)
- Fetch fresh data in background
- Update UI when fresh data arrives
- Pioneered by HTTP RFC 5861, adopted by Next.js, Vercel

**Cache Invalidation Strategies:**
```typescript
// Time-based invalidation (simplest)
TTL = 6 hours for inventory value
TTL = 24 hours for item metadata

// Event-based invalidation (most accurate)
Invalidate when: User buys/sells item, trades item, unboxes item

// User-initiated refresh (give control)
Manual "Refresh" button with last sync timestamp
```

**Multi-Layer Caching:**
1. **Client-side (React Query / SWR):** 5 minutes
2. **CDN Edge (Vercel):** 1 hour with stale-while-revalidate
3. **Redis:** 6 hours
4. **Database:** Permanent with timestamp

---

### Background Job Patterns

**Industry Best Practices:**

**Job Queue Architecture:**
- Use message queue (Redis Bull, BullMQ, AWS SQS)
- Priority levels: real-time (user-initiated), high (active users), low (background)
- Rate limiting: 5-second delay between jobs to avoid API limits
- Retry logic: Exponential backoff with max 3 retries
- Dead letter queue: Failed jobs for manual review

**Scheduling Strategies:**
```typescript
// Off-peak background refreshes
cron.schedule('0 2 * * *', async () => {
  // 2 AM daily - refresh active user inventories
  await refreshActiveUserInventories();
});

// Staggered execution (avoid thundering herd)
const users = await getActiveUsers();
for (const user of users) {
  await queue.add('inventory-refresh', { userId: user.id }, {
    delay: Math.random() * 60000 // 0-60 second random delay
  });
}
```

---

## Authoritative Documentation & Sources

### Official Documentation

**Steam API:**
- Steam Web API Documentation: https://developer.valvesoftware.com/wiki/Steam_Web_API
- Steam Community Developer Pages: https://steamcommunity.com/dev
- Steamworks Partner Documentation: https://partner.steamgames.com/doc/webapi/
- Better Steam Web API Docs (community): https://steamwebapi.azurewebsites.net/
- Steam API Tester (xPaw): https://steamapi.xpaw.me/

**GDPR Compliance:**
- GDPR Official Text: https://gdpr-info.eu/
- GDPR Article 15 (Right to Access): https://gdpr-info.eu/art-15-gdpr/
- GDPR Article 17 (Right to Erasure): https://gdpr-info.eu/art-17-gdpr/
- GDPR Article 25 (Data Protection by Design): https://gdpr-info.eu/art-25-gdpr/
- Nordic APIs: "What GDPR Means For API Developers"
- Cycode: "Understanding an API provider's privacy policy"

**Data Freshness & Sync:**
- Elementary Data: "Data Freshness: Best Practices & Key Metrics"
- Anomalo: "Data Freshness Metrics and Best Practices"
- AWS: "Building resilient applications: design patterns for handling database outages"
- Metaplane: "Data Freshness Definition and Examples"

---

### Community & Industry Resources

**Steam API Issues:**
- Stack Overflow: "Steam web API getting CS:GO inventory"
- Stack Overflow: "How am I exceeding steam api's rate limit?"
- Stack Overflow: "I'm getting 429 error working with SteamWebApi (CSGO Inventory)"
- McKay Development: "Best way to call steam API for Inventory"
- McKay Development: "Rate limit on steamcommunity.com"
- Steam Community: "Steam Web API constantly rate-limited (Error 429)"
- Steam Community: "Grabbing json data of inventory, what's the limit / best practice?"

**UX Best Practices:**
- Medium: "UX Case Study: Bulk Upload Feature"
- LogRocket: "UI design best practices for loading, error, and empty states in React"
- Flatfile: "5 must-have features for a data importer"
- UX Stack Exchange: "Best practices for data file upload error handling"
- UX Stack Exchange: "User interface for uploading, verifying, and importing data into database"
- Pencil & Paper: "Error Message UX, Handling & Feedback"
- Talebook: "Error States in UX: Best Practices & Guidelines"

**Data Synchronization:**
- Vanderbilt University: "Data Synchronization Patterns in Mobile Application Design"
- RTInsights: "Orchestrating Real-Time Fulfillment"
- Stepfinity: "Offline Data Sync Patterns: Best Practices"
- Intellisoft: "Data Synchronization in Logistics: Setting Offline Sync Up"

---

### Third-Party Services

**Steam API Proxies (Paid Services):**
- steamwebapi.com - All-in-one Steam API with pooled keys and authentication
- steam.supply - Steam API proxy with rate limit handling
- CSGOSKINS.GG API - CS2-specific API with inventory endpoints

**Float Value APIs:**
- CSFloat API: https://csfloat.com/api
- SteamAnalyst API: https://csgo.steamanalyst.com/api_info

---

### Research Sources (From Web Search)

**Endpoint Deprecation:**
1. "IEconItems_730/GetPlayerItems permanently disabled" - Stack Overflow, McKay Development
2. "/inventory/json endpoint shutting down globally" - Steam Community discussions
3. "New inventory endpoint /inventory/{steamid}/{appid}/{contextid}" - Stack Overflow implementation guides

**Rate Limiting Reality:**
4. "429 errors after 4-6 requests despite 100K daily limit" - Stack Overflow, Steam Community
5. "November 2022 inventory restrictions increased" - McKay Development, Steam Community
6. "Less than 5 requests per minute practical limit" - Community developer reports

**UX Patterns:**
7. "Row-level error indicators with tooltips" - Medium UX case studies
8. "Error summary: '15 items imported, 3 errors'" - Flatfile, LogRocket best practices
9. "Download error report functionality" - UX Stack Exchange recommendations
10. "In-app error correction (retry/skip)" - Flatfile data importer patterns

**Data Freshness:**
11. "Stale-while-revalidate pattern for inventory sync" - Elementary Data, AWS blog
12. "Change Data Capture (CDC) for incremental sync" - Anomalo, Prophecy.io
13. "6-hour cache TTL for inventory value" - Industry benchmarks

**GDPR Compliance:**
14. "Third-party API GDPR verification requirements" - Nordic APIs, Cycode
15. "2025 Standard Contractual Clauses (SCCs) for cross-border transfers" - ComplianceHub
16. "48-hour breach notifications for healthcare (2025 update)" - GDPR 2025 compliance guides
17. "Data minimization and RBAC for API imports" - GDPR Articles 25, 32

**Loading States:**
18. "Progressive loading: explain what's happening" - Pencil & Paper UX patterns
19. "Skeleton screens vs spinners" - LogRocket UI best practices
20. "Allow navigation during background operations" - Next.js Suspense documentation

---

## Status

- [ ] Research complete
- [ ] Steam API integration implemented
- [ ] Item matching logic built
- [ ] Database schema created
- [ ] Sync service deployed
- [ ] Frontend UI implemented
- [ ] Error handling complete
- [ ] Testing complete
- [ ] Deployed to production

## Related Features

- **Depends On:**
  - [01] Item Database
  - [04] Price Aggregation
  - [06] Steam Authentication

- **Enables:**
  - [15] Portfolio Analytics
  - [21] Inventory Optimization
  - [22] Duplicate Detection

## References

- Steam Web API Documentation: https://developer.valvesoftware.com/wiki/Steam_Web_API
- Steam Inventory API: https://steamcommunity.com/dev
- CSFloat API (for float values): https://csfloat.com/api
