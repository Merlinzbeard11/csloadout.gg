# 13 - Cross-Platform Listing Manager

## Overview

Unified interface to create, manage, and track listings across multiple CS2 marketplaces (CSFloat, Buff163, CS.MONEY, etc.). Bulk traders can list 500 items on 3 platforms without opening 3 different websites. Track listing status, price updates, and sales in one dashboard.

**Value Prop:** "List 500 items on 5 marketplaces in 10 minutes - manage everything from one place"

## User Segments Served

- **Primary:** Bulk Traders (managing hundreds of active listings)
- **Secondary:** Investors (selling high-value items on multiple platforms)
- **Tertiary:** Casual Players (comparing listing fees before selling)

## User Stories / Use Cases

### As a Bulk Trader
- I want to select 300 cases and list them on CSFloat, Buff163, and CS.MONEY simultaneously
- I want to see all my active listings across platforms in one view
- I want to update prices on all platforms when market shifts
- I want to cancel stale listings (30+ days old) across all marketplaces
- I want to track which platforms are selling fastest

### As an Investor
- I want to list my $500 AWP on 5 platforms to maximize visibility
- I want to see which platform offers best take-home value (after fees)
- I want alerts when listings sell
- I want to compare platform performance (sales volume, time to sell)

### As a Casual Player
- I want to list my skin on the platform with lowest fees
- I want to see estimated take-home amount before listing
- I want to track listing status without checking multiple sites

## Research & Context

### Cross-Platform Listing Challenges

**Current Pain Points:**
```
1. Manual Multi-Platform Listing:
   - User lists item on CSFloat (5 mins)
   - Then lists same item on Buff163 (5 mins)
   - Then lists on CS.MONEY (5 mins)
   - Total: 15 minutes for 1 item = 125 hours for 500 items

2. Price Synchronization:
   - Market price drops 10%
   - User must update price on 3 platforms manually
   - Often listings become stale (overpriced)

3. Listing Tracking:
   - "Did I already list this on CSFloat?"
   - No centralized view of active listings
   - Can't see which platforms are selling best

4. Fee Comparison:
   - Each platform has different fee structures
   - Hard to calculate true take-home amount
   - Users list on wrong platform (lose 5% to fees)
```

**Existing Solutions (Inadequate):**
- **None** - No platform offers cross-marketplace listing management
- **Buffer (CS:GO trading bots)** - Automated trading, not listing management
- **TradeIt.gg** - Trade bots, not marketplace integrations

**csloadout.gg Opportunity:**
✅ **First platform to offer unified listing management**
✅ Massive time savings for bulk traders (15 mins → 2 mins per item)
✅ Premium feature justifying $30-50/mo subscription

### Marketplace API Capabilities

**CSFloat:**
```
API: https://csfloat.com/api/v1/listings
Create Listing: POST /listings
  Body: { item_id, price, description }
  Requires: API key (user-specific)

Update Listing: PATCH /listings/:id
  Body: { price }

Cancel Listing: DELETE /listings/:id

Get User Listings: GET /listings/me
  Returns: [...] (all active listings)

Webhooks: ✅ Available (notify on sale)
  POST https://csloadout.gg/webhooks/csfloat/sales
```

**Buff163:**
```
API: https://buff.163.com/api/market/sell_order/create
Create Listing: POST /sell_order/create
  Body: { game: "csgo", goods_id, price }
  Requires: Session cookie (OAuth-like flow)

Update: PATCH /sell_order/:id
Cancel: DELETE /sell_order/:id

Get Listings: GET /sell_order/my_list
  Returns: [...] with status

Webhooks: ❌ Not available (must poll)
Rate Limit: 100 requests/minute
```

**CS.MONEY:**
```
API: https://cs.money/api/v2/user/listing/create
Create: POST /user/listing/create
  Body: { asset_id, price }
  Requires: OAuth token

Update: PATCH /user/listing/:id
Cancel: DELETE /user/listing/:id

Webhooks: ✅ Available
Rate Limit: 50 requests/minute
```

**Tradeit.gg, Skinport, DMarket:**
- Similar API patterns
- Most require OAuth or API keys
- Few offer webhooks (must poll for status)

### Listing Management Best Practices

**From E-Commerce Platforms (eBay, Amazon, Shopify):**
```
1. Bulk Listing Creation:
   - CSV upload (item, price, description)
   - Template-based listing (reuse settings)
   - Auto-pricing rules ("10% below market average")

2. Centralized Dashboard:
   - See all listings across channels
   - Filter by platform, status, item type
   - Sort by price, date listed, views

3. Automatic Price Sync:
   - Update prices across platforms when market shifts
   - "Reprice all listings to match market average"

4. Performance Analytics:
   - Which platform sells fastest?
   - Average time to sell per platform
   - Total fees paid per platform
```

**Competitive Landscape Analysis:**
- **Shopify**: Multi-channel sales management (Facebook, Instagram, Amazon)
- **ChannelAdvisor**: Cross-marketplace listings for retailers
- **Sellbrite**: E-commerce multi-channel listing tool

**Key Features to Borrow:**
- Unified listing dashboard
- Bulk operations (create, update, cancel)
- Price sync automation
- Sales analytics per channel

## Technical Requirements

### Database Schema

```sql
-- User's connected marketplace accounts (OAuth tokens)
CREATE TABLE marketplace_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,         -- 'csfloat', 'buff163', 'csmoney'

  -- Authentication
  api_key TEXT,                          -- For API key auth (CSFloat)
  oauth_token TEXT,                      -- For OAuth (CS.MONEY)
  oauth_refresh_token TEXT,
  token_expires_at TIMESTAMP,

  -- Connection status
  is_active BOOLEAN DEFAULT TRUE,
  last_verified TIMESTAMP,               -- Last successful API call
  connection_error TEXT,                 -- Error message if connection failed

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, platform)              -- One connection per platform per user
);

CREATE INDEX idx_marketplace_connections_user ON marketplace_connections(user_id);

-- Active listings across all platforms
CREATE TABLE cross_platform_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id), -- Link to user's item
  platform VARCHAR(50) NOT NULL,

  -- Listing details
  external_listing_id VARCHAR(255),      -- Platform's listing ID
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  description TEXT,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'sold', 'cancelled', 'expired'
  listed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  sold_at TIMESTAMP,
  cancelled_at TIMESTAMP,

  -- Platform-specific data
  platform_data JSONB,                   -- Store platform-specific fields

  -- Performance tracking
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cross_platform_listings_user ON cross_platform_listings(user_id);
CREATE INDEX idx_cross_platform_listings_status ON cross_platform_listings(status);
CREATE INDEX idx_cross_platform_listings_platform ON cross_platform_listings(platform);

-- Listing sales history
CREATE TABLE listing_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES cross_platform_listings(id),
  user_id UUID NOT NULL REFERENCES users(id),

  -- Sale details
  sold_price DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  net_profit DECIMAL(10,2) NOT NULL,     -- sold_price - platform_fee
  sold_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Buyer info (if available)
  buyer_username VARCHAR(255),

  -- Performance metrics
  days_to_sell INTEGER,                  -- Date diff: listed_at → sold_at
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_listing_sales_user ON listing_sales(user_id);
CREATE INDEX idx_listing_sales_sold_at ON listing_sales(sold_at);

-- Listing price history (track repricing)
CREATE TABLE listing_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES cross_platform_listings(id),
  old_price DECIMAL(10,2) NOT NULL,
  new_price DECIMAL(10,2) NOT NULL,
  reason VARCHAR(255),                   -- 'manual', 'auto-reprice', 'market-shift'
  changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_listing_price_history_listing ON listing_price_history(listing_id);
```

### Cross-Platform Listing Service

```typescript
// Service to manage listings across multiple marketplaces
class CrossPlatformListingService {
  // Create listing on one or more platforms
  async createListings(
    userId: string,
    itemId: string,
    platforms: string[],
    price: number,
    description?: string
  ): Promise<CreateListingResult> {
    const results: PlatformListingResult[] = [];

    for (const platform of platforms) {
      try {
        const connection = await this.getConnection(userId, platform);
        if (!connection || !connection.is_active) {
          results.push({
            platform,
            success: false,
            error: 'Not connected to this platform'
          });
          continue;
        }

        // Create listing via platform API
        const listingId = await this.createPlatformListing(
          platform,
          connection,
          itemId,
          price,
          description
        );

        // Save to database
        await db.cross_platform_listings.create({
          data: {
            user_id: userId,
            inventory_item_id: itemId,
            platform,
            external_listing_id: listingId,
            price,
            description,
            status: 'active'
          }
        });

        results.push({
          platform,
          success: true,
          listingId
        });
      } catch (error) {
        console.error(`Failed to create listing on ${platform}:`, error);
        results.push({
          platform,
          success: false,
          error: error.message
        });
      }
    }

    return {
      itemId,
      price,
      results,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length
    };
  }

  // Create listing on specific platform via API
  private async createPlatformListing(
    platform: string,
    connection: MarketplaceConnection,
    itemId: string,
    price: number,
    description?: string
  ): Promise<string> {
    switch (platform) {
      case 'csfloat':
        return await this.createCSFloatListing(connection, itemId, price, description);
      case 'buff163':
        return await this.createBuff163Listing(connection, itemId, price);
      case 'csmoney':
        return await this.createCSMoneyListing(connection, itemId, price);
      default:
        throw new Error(`Platform ${platform} not supported`);
    }
  }

  private async createCSFloatListing(
    connection: MarketplaceConnection,
    itemId: string,
    price: number,
    description?: string
  ): Promise<string> {
    const response = await fetch('https://csfloat.com/api/v1/listings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${connection.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        item_id: itemId,
        price: price * 100, // Convert to cents
        description
      })
    });

    if (!response.ok) {
      throw new Error(`CSFloat API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.listing_id;
  }

  private async createBuff163Listing(
    connection: MarketplaceConnection,
    itemId: string,
    price: number
  ): Promise<string> {
    // Buff163 uses session cookies, not API keys
    const response = await fetch('https://buff.163.com/api/market/sell_order/create', {
      method: 'POST',
      headers: {
        'Cookie': connection.oauth_token, // Session cookie
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        game: 'csgo',
        goods_id: itemId,
        price: price
      })
    });

    if (!response.ok) {
      throw new Error(`Buff163 API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.id;
  }

  // Bulk create listings (efficient batch processing)
  async bulkCreateListings(
    userId: string,
    items: { itemId: string; price: number }[],
    platforms: string[]
  ): Promise<BulkListingResult> {
    const results: CreateListingResult[] = [];

    // Process in batches to avoid rate limits
    const BATCH_SIZE = 10;
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(item =>
          this.createListings(userId, item.itemId, platforms, item.price)
        )
      );

      results.push(...batchResults);

      // Rate limit: Wait 1 second between batches
      if (i + BATCH_SIZE < items.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      totalItems: items.length,
      totalPlatforms: platforms.length,
      successfulListings: results.reduce((sum, r) => sum + r.successCount, 0),
      failedListings: results.reduce((sum, r) => sum + r.failureCount, 0),
      results
    };
  }

  // Update listing price across platforms
  async updateListingPrice(
    listingId: string,
    newPrice: number
  ): Promise<UpdatePriceResult> {
    const listing = await db.cross_platform_listings.findUnique({
      where: { id: listingId }
    });

    if (!listing || listing.status !== 'active') {
      throw new Error('Listing not found or not active');
    }

    const connection = await this.getConnection(listing.user_id, listing.platform);

    // Update via platform API
    await this.updatePlatformListingPrice(
      listing.platform,
      connection,
      listing.external_listing_id,
      newPrice
    );

    // Record price change history
    await db.listing_price_history.create({
      data: {
        listing_id: listingId,
        old_price: listing.price,
        new_price: newPrice,
        reason: 'manual',
        changed_at: new Date()
      }
    });

    // Update database
    await db.cross_platform_listings.update({
      where: { id: listingId },
      data: { price: newPrice, updated_at: new Date() }
    });

    return {
      success: true,
      listingId,
      oldPrice: listing.price,
      newPrice
    };
  }

  // Bulk update prices (reprice all listings)
  async bulkUpdatePrices(
    userId: string,
    listingIds: string[],
    newPrice?: number,           // Fixed price, or...
    priceStrategy?: {            // Dynamic pricing strategy
      type: 'match-market' | 'below-market' | 'percentage-change';
      value?: number;            // e.g., 10% below market, or +5% increase
    }
  ): Promise<BulkUpdateResult> {
    const results: UpdatePriceResult[] = [];

    for (const listingId of listingIds) {
      try {
        const listing = await db.cross_platform_listings.findUnique({
          where: { id: listingId },
          include: { inventory_item: { include: { item: true } } }
        });

        // Calculate price based on strategy
        let calculatedPrice = newPrice;

        if (priceStrategy) {
          const marketPrice = await this.getMarketPrice(listing.inventory_item.item.id);

          switch (priceStrategy.type) {
            case 'match-market':
              calculatedPrice = marketPrice;
              break;
            case 'below-market':
              calculatedPrice = marketPrice * (1 - (priceStrategy.value || 10) / 100);
              break;
            case 'percentage-change':
              calculatedPrice = listing.price * (1 + (priceStrategy.value || 0) / 100);
              break;
          }
        }

        const result = await this.updateListingPrice(listingId, calculatedPrice);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          listingId,
          error: error.message
        });
      }

      // Rate limit: 100ms delay between updates
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      totalListings: listingIds.length,
      successfulUpdates: results.filter(r => r.success).length,
      failedUpdates: results.filter(r => !r.success).length,
      results
    };
  }

  // Get all user's active listings across platforms
  async getUserListings(
    userId: string,
    filters?: {
      platforms?: string[];
      status?: string[];
    }
  ): Promise<CrossPlatformListing[]> {
    return await db.cross_platform_listings.findMany({
      where: {
        user_id: userId,
        ...(filters?.platforms && { platform: { in: filters.platforms } }),
        ...(filters?.status && { status: { in: filters.status } })
      },
      include: {
        inventory_item: {
          include: {
            item: true,
            inventory: {
              include: {
                user_inventory: {
                  include: { linked_account: true }
                }
              }
            }
          }
        }
      },
      orderBy: { listed_at: 'desc' }
    });
  }

  // Sync listing status from platforms (poll for updates)
  async syncListingStatus(userId: string): Promise<SyncStatusResult> {
    const connections = await db.marketplace_connections.findMany({
      where: { user_id: userId, is_active: true }
    });

    let syncedCount = 0;
    let soldCount = 0;

    for (const connection of connections) {
      try {
        const platformListings = await this.fetchPlatformListings(connection);

        for (const platformListing of platformListings) {
          // Find matching listing in our database
          const ourListing = await db.cross_platform_listings.findFirst({
            where: {
              user_id: userId,
              platform: connection.platform,
              external_listing_id: platformListing.id
            }
          });

          if (!ourListing) continue;

          // Check if status changed
          if (platformListing.status === 'sold' && ourListing.status === 'active') {
            // Listing was sold!
            await db.cross_platform_listings.update({
              where: { id: ourListing.id },
              data: {
                status: 'sold',
                sold_at: new Date()
              }
            });

            // Record sale
            await db.listing_sales.create({
              data: {
                listing_id: ourListing.id,
                user_id: userId,
                sold_price: ourListing.price,
                platform_fee: this.calculatePlatformFee(connection.platform, ourListing.price),
                net_profit: ourListing.price - this.calculatePlatformFee(connection.platform, ourListing.price),
                sold_at: new Date(),
                days_to_sell: Math.floor((Date.now() - ourListing.listed_at.getTime()) / (1000 * 60 * 60 * 24))
              }
            });

            soldCount++;
          }

          syncedCount++;
        }
      } catch (error) {
        console.error(`Failed to sync ${connection.platform}:`, error);
      }
    }

    return {
      syncedListings: syncedCount,
      newSales: soldCount
    };
  }
}

// Cron job: Sync listing status every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  // Get all users with active listings
  const usersWithListings = await db.cross_platform_listings.findMany({
    where: { status: 'active' },
    select: { user_id: true },
    distinct: ['user_id']
  });

  const service = new CrossPlatformListingService();

  for (const { user_id } of usersWithListings) {
    await service.syncListingStatus(user_id);
  }
});
```

### API Endpoints

```typescript
// Create listing on multiple platforms
POST /api/listings/create
Body: {
  itemId: "...",
  platforms: ["csfloat", "buff163", "csmoney"],
  price: 8.50,
  description: "Clean float, no stickers"
}
Response: {
  results: [
    { platform: "csfloat", success: true, listingId: "..." },
    { platform: "buff163", success: true, listingId: "..." },
    { platform: "csmoney", success: false, error: "Not connected" }
  ],
  successCount: 2,
  failureCount: 1
}

// Bulk create listings
POST /api/listings/bulk-create
Body: {
  items: [
    { itemId: "...", price: 0.50 },
    { itemId: "...", price: 0.45 }
    // ... 298 more items
  ],
  platforms: ["csfloat", "buff163"]
}
Response: {
  totalItems: 300,
  totalPlatforms: 2,
  successfulListings: 590,  // 295 items * 2 platforms
  failedListings: 10
}

// Get user's active listings
GET /api/listings?platforms=csfloat,buff163&status=active
Response: {
  listings: [
    {
      id: "...",
      itemName: "AK-47 | Redline",
      platform: "csfloat",
      price: 8.50,
      status: "active",
      listedAt: "2025-11-01T10:00:00Z",
      views: 47
    },
    // ...
  ],
  totalCount: 247
}

// Update listing price
PATCH /api/listings/:id/price
Body: { newPrice: 8.00 }
Response: {
  success: true,
  oldPrice: 8.50,
  newPrice: 8.00
}

// Bulk update prices
POST /api/listings/bulk-update-price
Body: {
  listingIds: ["...", "..."],
  priceStrategy: {
    type: "below-market",
    value: 10  // 10% below market average
  }
}
Response: {
  totalListings: 50,
  successfulUpdates: 48,
  failedUpdates: 2
}

// Cancel listing
DELETE /api/listings/:id
Response: { success: true }

// Get listing performance analytics
GET /api/listings/analytics
Response: {
  platforms: [
    {
      platform: "csfloat",
      activeListings: 120,
      totalSales: 45,
      averageDaysToSell: 8.5,
      totalRevenue: 1234.56,
      totalFees: 24.69
    },
    // ...
  ]
}

// Connect marketplace account
POST /api/marketplace-connections/:platform/connect
Body: { apiKey: "..." } // or OAuth redirect
Response: {
  success: true,
  platform: "csfloat",
  isActive: true
}
```

### Frontend Components

```typescript
// Cross-Platform Listing Manager Page
// pages/listings/manager.tsx
export default function ListingManagerPage() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['csfloat'])
  const [price, setPrice] = useState<number>(0)

  const { data: listings } = useQuery({
    queryKey: ['listings', selectedPlatforms],
    queryFn: () => fetch(`/api/listings?platforms=${selectedPlatforms.join(',')}`).then(r => r.json())
  })

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Cross-Platform Listing Manager</h1>

      {/* Platform Connection Status */}
      <PlatformConnectionStatus />

      {/* Create Listing Panel */}
      <CreateListingPanel
        onSubmit={(itemId, platforms, price) => {
          createListingMutation.mutate({ itemId, platforms, price })
        }}
      />

      {/* Active Listings Table */}
      <ActiveListingsTable
        listings={listings?.listings || []}
        onUpdatePrice={handleUpdatePrice}
        onCancelListing={handleCancelListing}
      />

      {/* Performance Analytics */}
      <ListingAnalytics />
    </div>
  )
}

// Platform connection status widget
function PlatformConnectionStatus() {
  const { data: connections } = useQuery({
    queryKey: ['marketplace-connections'],
    queryFn: () => fetch('/api/marketplace-connections').then(r => r.json())
  })

  const platforms = ['csfloat', 'buff163', 'csmoney', 'skinport']

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Platform Connections</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {platforms.map(platform => {
          const connection = connections?.find(c => c.platform === platform)
          const isConnected = connection?.is_active

          return (
            <div
              key={platform}
              className={`p-4 rounded border-2 ${
                isConnected ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold capitalize">{platform}</span>
                <span className={`text-2xl ${isConnected ? 'text-green-500' : 'text-gray-400'}`}>
                  {isConnected ? '✓' : '○'}
                </span>
              </div>

              {isConnected ? (
                <div className="text-xs text-gray-600">
                  Connected
                  <br />
                  {connection.activeListings} active listings
                </div>
              ) : (
                <button
                  onClick={() => connectPlatform(platform)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Connect
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Active listings table
function ActiveListingsTable({ listings, onUpdatePrice, onCancelListing }) {
  const [sortBy, setSortBy] = useState<'price' | 'listedAt' | 'platform'>('listedAt')

  const sorted = [...listings].sort((a, b) => {
    switch (sortBy) {
      case 'price': return b.price - a.price
      case 'listedAt': return new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime()
      case 'platform': return a.platform.localeCompare(b.platform)
    }
  })

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">
        Active Listings ({listings.length})
      </h2>

      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Item</th>
            <th
              className="text-left py-2 cursor-pointer hover:bg-gray-50"
              onClick={() => setSortBy('platform')}
            >
              Platform {sortBy === 'platform' && '▼'}
            </th>
            <th
              className="text-right py-2 cursor-pointer hover:bg-gray-50"
              onClick={() => setSortBy('price')}
            >
              Price {sortBy === 'price' && '▼'}
            </th>
            <th
              className="text-left py-2 cursor-pointer hover:bg-gray-50"
              onClick={() => setSortBy('listedAt')}
            >
              Listed {sortBy === 'listedAt' && '▼'}
            </th>
            <th className="text-right py-2">Views</th>
            <th className="text-right py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(listing => (
            <tr key={listing.id} className="border-b hover:bg-gray-50">
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <img
                    src={listing.item.iconUrl}
                    alt={listing.itemName}
                    className="w-12 h-12 object-contain"
                  />
                  <div>
                    <div className="font-semibold">{listing.itemName}</div>
                    <div className="text-xs text-gray-500">{listing.wear}</div>
                  </div>
                </div>
              </td>
              <td>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                  {listing.platform}
                </span>
              </td>
              <td className="text-right font-semibold">${listing.price.toFixed(2)}</td>
              <td className="text-sm text-gray-600">
                {formatRelative(listing.listedAt)}
              </td>
              <td className="text-right text-sm text-gray-600">{listing.views}</td>
              <td className="text-right">
                <button
                  onClick={() => onUpdatePrice(listing.id)}
                  className="text-sm text-blue-600 hover:underline mr-2"
                >
                  Update Price
                </button>
                <button
                  onClick={() => onCancelListing(listing.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Cancel
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

## Success Metrics

- ✅ 60%+ bulk traders create cross-platform listings (of premium users)
- ✅ Average 5+ platforms connected per user
- ✅ 10x time savings (15 mins → 90 seconds per item)
- ✅ 80%+ listing sync accuracy (status updates within 5 minutes)
- ✅ 30%+ users reprice listings based on market data

## Dependencies

### Must Have Before Starting
- [04] Price Aggregation (for market price data)
- [07] Inventory Import (to have items to list)
- [12] Bulk Inventory Operations (for bulk listing)
- Marketplace API keys/OAuth integrations

### Blocks Other Features
None (self-contained premium feature)

## Effort Estimate

- **Development Time:** 3-4 weeks
- **Complexity:** High
- **Team Size:** 1-2 developers

**Breakdown:**
- Week 1: API research, OAuth integrations, database schema
- Week 2: Listing creation/update service, platform connectors
- Week 3: Frontend UI, bulk operations
- Week 4: Sync service, webhooks, analytics, testing

## Implementation Notes

### Platform API Rate Limits

```typescript
// Respect rate limits with queue-based processing
class RateLimitedQueue {
  private queue: Array<() => Promise<any>> = []
  private processing = false
  private readonly MAX_REQUESTS_PER_MINUTE: number

  constructor(maxRequestsPerMinute: number) {
    this.MAX_REQUESTS_PER_MINUTE = maxRequestsPerMinute
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      if (!this.processing) {
        this.process()
      }
    })
  }

  private async process() {
    this.processing = true

    while (this.queue.length > 0) {
      const fn = this.queue.shift()!
      await fn()

      // Wait to respect rate limit
      await new Promise(resolve => setTimeout(resolve, 60000 / this.MAX_REQUESTS_PER_MINUTE))
    }

    this.processing = false
  }
}

// Usage:
const csfloatQueue = new RateLimitedQueue(100) // 100 req/min
const buff163Queue = new RateLimitedQueue(60)  // 60 req/min
```

### Gotchas to Watch For

1. **Platform API Changes**
   - APIs can change without notice
   - Solution: Version API calls, monitor errors, alert on failures

2. **OAuth Token Expiry**
   - Tokens expire, users must re-authenticate
   - Solution: Refresh tokens automatically, notify user if manual re-auth needed

3. **Duplicate Listings**
   - User creates listing, then creates again (accidental double-list)
   - Solution: Check for existing active listing before creating

4. **Price Precision**
   - Different platforms use different precision (cents vs dollars)
   - Solution: Normalize to cents internally, convert per platform

5. **Listing Sync Lag**
   - Platform shows listing sold, but webhook delayed
   - Solution: Poll platforms every 5 minutes, don't rely solely on webhooks

6. **Item Identification**
   - How to match csloadout.gg item to platform item ID?
   - Solution: Store platform-specific IDs in inventory_item.platform_data JSONB

7. **Simultaneous Sales**
   - Item listed on 3 platforms, sells on 2 simultaneously
   - Solution: Cancel other listings immediately when one sells

## Status

- [ ] Research complete
- [ ] Platform API integrations built
- [ ] OAuth flows implemented
- [ ] Database schema created
- [ ] Listing creation service working
- [ ] Bulk operations functional
- [ ] Sync service deployed
- [ ] Frontend UI complete
- [ ] Testing complete
- [ ] Deployed to production

## Related Features

- **Depends On:**
  - [04] Price Aggregation
  - [07] Inventory Import
  - [12] Bulk Inventory Operations

- **Enhances:**
  - [14] Bulk Transaction History (track sales across platforms)
  - [20] Seller Reputation System (aggregate ratings)

## References

- CSFloat API Documentation: https://csfloat.com/api
- Buff163 API (unofficial): https://github.com/buff163-api
- CS.MONEY API: https://cs.money/docs/api
- OAuth 2.0 Spec: https://oauth.net/2/
