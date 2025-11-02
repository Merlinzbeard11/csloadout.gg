# Feature 25: Sticker Database

## Overview
Comprehensive searchable database of all CS2 stickers with prices, rarity tiers, tournament history, and visual previews. Essential reference tool for crafters, collectors, and investors tracking sticker values and discovering rare stickers.

## User Segments
- **Primary**: Hobbyists, Collectors, Investors
- **Secondary**: Casual Traders, Content Creators
- **Tertiary**: Bulk Traders, Wholesalers

## User Stories

### As a Hobbyist/Collector
- I want to browse all available stickers organized by collection/tournament
- I want to search for stickers by name, color, or team
- I want to see price history for expensive stickers (Katowice 2014, etc.)
- I want to filter stickers by rarity (common, holo, foil, gold)
- I want to see which stickers look best on specific skins

### As an Investor
- I want to track sticker price trends over time
- I want to identify undervalued stickers before they increase in price
- I want to see apply rates (how many stickers have been applied vs destroyed)
- I want to compare sticker ROI across different tournaments
- I want alerts when rare stickers drop in price

### As a Crafter
- I want to preview stickers on weapons before crafting
- I want to find stickers matching specific color themes (e.g., blue/purple)
- I want to see popular sticker combinations
- I want to filter by sticker type (team logos, graffiti, etc.)

### As the Platform
- I want to provide authoritative sticker data for craft simulator
- I want to drive SEO traffic with comprehensive sticker pages
- I want to capture sticker investment trends for insights

## Research & Context

### CS2 Sticker Categories

1. **Tournament Stickers**
   - **Katowice 2014**: Most valuable ($100 - $100,000+)
   - **Major Tournaments**: New majors every ~6 months
   - **Team Logos**: ESL One, DreamHack, etc.
   - **Player Signatures**: Autographs of pro players

2. **Regular Stickers**
   - **Community Capsules**: Community-designed stickers
   - **Operation Stickers**: Limited-time operations
   - **Graffiti**: Spray-style stickers

3. **Rarity Tiers**
   - **Normal**: Standard stickers
   - **Holo**: Holographic effect
   - **Foil**: Metallic foil finish
   - **Gold**: Gold-plated (rare)
   - **Contraband**: Removed from game (extremely rare - e.g., iBUYPOWER Holo)

### Data Points Needed
- Sticker name (market_hash_name)
- Collection/tournament
- Rarity tier
- Release date
- Current price + price history
- Total supply (how many exist)
- Apply count (how many applied to skins)
- Image URL (high-res preview)
- Color palette (for filtering by color)
- Popularity score

### Existing Tools
- **CS.Money**: Basic sticker catalog, no price history
- **CSGOStash**: Sticker database, limited filtering
- **CSFloat**: Sticker prices, no search/filter
- **Opportunity**: Build most comprehensive sticker database with advanced search/filter

## Technical Requirements

### Database Schema

```sql
-- Sticker catalog
CREATE TABLE stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  market_hash_name VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  sticker_id INTEGER UNIQUE, -- Steam item def index

  -- Classification
  collection VARCHAR(255), -- e.g., 'Katowice 2014', 'Paris 2023'
  tournament VARCHAR(255), -- Tournament name
  team VARCHAR(255), -- Team name (if applicable)
  player_name VARCHAR(255), -- Player name (for signature stickers)
  sticker_type VARCHAR(50), -- 'team_logo', 'player_signature', 'community', 'graffiti'

  -- Rarity
  rarity_tier VARCHAR(50) NOT NULL, -- 'normal', 'holo', 'foil', 'gold', 'contraband'
  quality VARCHAR(50), -- 'tournament', 'community', 'operation'

  -- Visual
  image_url TEXT,
  image_url_large TEXT, -- High-res version
  color_palette JSONB, -- ['#FF5733', '#3498DB', ...] extracted dominant colors

  -- Market data
  current_price DECIMAL(12,2),
  price_24h_ago DECIMAL(12,2),
  price_7d_ago DECIMAL(12,2),
  price_30d_ago DECIMAL(12,2),
  lowest_price DECIMAL(12,2), -- All-time low
  highest_price DECIMAL(12,2), -- All-time high
  median_price DECIMAL(12,2),

  -- Supply/demand
  total_supply INTEGER, -- Estimated total supply
  applied_count INTEGER DEFAULT 0, -- How many have been applied to skins (destroyed)
  available_count INTEGER, -- How many still exist (supply - applied)
  listings_count INTEGER DEFAULT 0, -- Current marketplace listings

  -- Metadata
  release_date DATE,
  is_contraband BOOLEAN DEFAULT false, -- Removed from game
  is_discontinued BOOLEAN DEFAULT false, -- No longer dropping

  -- SEO
  description TEXT, -- Description for SEO
  keywords TEXT[], -- Searchable keywords

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_stickers_market_hash_name (market_hash_name),
  INDEX idx_stickers_collection (collection),
  INDEX idx_stickers_rarity (rarity_tier),
  INDEX idx_stickers_price (current_price DESC),
  INDEX idx_stickers_team (team),
  INDEX idx_stickers_player (player_name)
);

-- Sticker price history (daily snapshots)
CREATE TABLE sticker_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sticker_id UUID NOT NULL REFERENCES stickers(id) ON DELETE CASCADE,
  price DECIMAL(12,2) NOT NULL,
  volume INTEGER, -- Trading volume that day
  listings_count INTEGER,
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(sticker_id, snapshot_date),
  INDEX idx_sticker_price_history_sticker_date (sticker_id, snapshot_date DESC)
);

-- Popular sticker combinations (from crafts)
CREATE TABLE sticker_combinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Combination
  sticker_1_id UUID REFERENCES stickers(id) ON DELETE CASCADE,
  sticker_2_id UUID REFERENCES stickers(id) ON DELETE CASCADE,
  sticker_3_id UUID REFERENCES stickers(id) ON DELETE CASCADE,
  sticker_4_id UUID REFERENCES stickers(id) ON DELETE CASCADE,

  -- Popularity
  craft_count INTEGER DEFAULT 0, -- How many crafts use this combo
  like_count INTEGER DEFAULT 0,

  -- Common skin for this combo
  common_skin_name VARCHAR(255),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_sticker_combinations_popularity (craft_count DESC, like_count DESC)
);

-- Sticker watchlist (users tracking specific stickers)
CREATE TABLE sticker_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sticker_id UUID NOT NULL REFERENCES stickers(id) ON DELETE CASCADE,
  target_price DECIMAL(12,2), -- Alert when price drops below this
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, sticker_id),
  INDEX idx_sticker_watchlist_user_id (user_id)
);
```

### Services

#### `src/services/StickerDatabaseService.ts`

```typescript
import { db } from '@/lib/db';

interface StickerFilters {
  searchQuery?: string;
  collection?: string;
  tournament?: string;
  raritytier?: string[];
  minPrice?: number;
  maxPrice?: number;
  colors?: string[]; // Filter by dominant colors
  team?: string;
  playerName?: string;
  sortBy?: 'name' | 'price_high' | 'price_low' | 'popular' | 'recent';
}

export class StickerDatabaseService {
  /**
   * Search stickers with filters
   */
  async searchStickers(page: number = 1, pageSize: number = 48, filters?: StickerFilters) {
    const offset = (page - 1) * pageSize;

    // Build where clause
    const where: any = {};

    if (filters?.searchQuery) {
      where.OR = [
        { display_name: { contains: filters.searchQuery, mode: 'insensitive' } },
        { market_hash_name: { contains: filters.searchQuery, mode: 'insensitive' } },
        { team: { contains: filters.searchQuery, mode: 'insensitive' } },
        { player_name: { contains: filters.searchQuery, mode: 'insensitive' } },
      ];
    }

    if (filters?.collection) {
      where.collection = filters.collection;
    }

    if (filters?.tournament) {
      where.tournament = filters.tournament;
    }

    if (filters?.raritytier && filters.raritytier.length > 0) {
      where.rarity_tier = { in: filters.raritytier };
    }

    if (filters?.minPrice !== undefined) {
      where.current_price = { ...where.current_price, gte: filters.minPrice };
    }

    if (filters?.maxPrice !== undefined) {
      where.current_price = { ...where.current_price, lte: filters.maxPrice };
    }

    if (filters?.team) {
      where.team = filters.team;
    }

    if (filters?.playerName) {
      where.player_name = { contains: filters.playerName, mode: 'insensitive' };
    }

    if (filters?.colors && filters.colors.length > 0) {
      // Filter by dominant colors (JSONB array overlap)
      where.color_palette = { array_contains: filters.colors };
    }

    // Build order by
    let orderBy: any = { display_name: 'asc' }; // Default: alphabetical

    if (filters?.sortBy === 'price_high') {
      orderBy = { current_price: 'desc' };
    } else if (filters?.sortBy === 'price_low') {
      orderBy = { current_price: 'asc' };
    } else if (filters?.sortBy === 'popular') {
      orderBy = { applied_count: 'desc' };
    } else if (filters?.sortBy === 'recent') {
      orderBy = { release_date: 'desc' };
    }

    // Fetch stickers
    const stickers = await db.stickers.findMany({
      where,
      orderBy,
      skip: offset,
      take: pageSize,
    });

    const total = await db.stickers.count({ where });

    return {
      stickers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get sticker by ID or market_hash_name
   */
  async getSticker(identifier: string): Promise<any> {
    const sticker = await db.stickers.findFirst({
      where: {
        OR: [{ id: identifier }, { market_hash_name: identifier }],
      },
    });

    if (!sticker) {
      throw new Error('Sticker not found');
    }

    return sticker;
  }

  /**
   * Get sticker price history
   */
  async getPriceHistory(stickerId: string, days: number = 30): Promise<any[]> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return await db.sticker_price_history.findMany({
      where: {
        sticker_id: stickerId,
        snapshot_date: { gte: cutoffDate },
      },
      orderBy: { snapshot_date: 'asc' },
    });
  }

  /**
   * Get all collections
   */
  async getCollections(): Promise<string[]> {
    const result = await db.stickers.findMany({
      select: { collection: true },
      distinct: ['collection'],
      orderBy: { collection: 'asc' },
    });

    return result.map((r) => r.collection).filter(Boolean) as string[];
  }

  /**
   * Get all tournaments
   */
  async getTournaments(): Promise<string[]> {
    const result = await db.stickers.findMany({
      select: { tournament: true },
      distinct: ['tournament'],
      orderBy: { tournament: 'desc' }, // Most recent first
    });

    return result.map((r) => r.tournament).filter(Boolean) as string[];
  }

  /**
   * Get all teams
   */
  async getTeams(): Promise<string[]> {
    const result = await db.stickers.findMany({
      select: { team: true },
      distinct: ['team'],
      orderBy: { team: 'asc' },
    });

    return result.map((r) => r.team).filter(Boolean) as string[];
  }

  /**
   * Add sticker to watchlist
   */
  async addToWatchlist(userId: string, stickerId: string, targetPrice?: number): Promise<void> {
    await db.sticker_watchlist.create({
      data: {
        user_id: userId,
        sticker_id: stickerId,
        target_price: targetPrice,
      },
    });
  }

  /**
   * Remove from watchlist
   */
  async removeFromWatchlist(userId: string, stickerId: string): Promise<void> {
    await db.sticker_watchlist.deleteMany({
      where: {
        user_id: userId,
        sticker_id: stickerId,
      },
    });
  }

  /**
   * Get user's watchlist
   */
  async getWatchlist(userId: string): Promise<any[]> {
    const watchlist = await db.sticker_watchlist.findMany({
      where: { user_id: userId },
      include: { sticker: true },
      orderBy: { created_at: 'desc' },
    });

    return watchlist.map((w) => ({ ...w.sticker, targetPrice: w.target_price }));
  }

  /**
   * Get trending stickers (most price increase in last 7 days)
   */
  async getTrendingStickers(limit: number = 20): Promise<any[]> {
    const stickers = await db.stickers.findMany({
      where: {
        price_7d_ago: { not: null },
        current_price: { not: null },
      },
      orderBy: { current_price: 'desc' },
      take: 100, // Get top 100 to calculate % change
    });

    // Calculate % change
    const stickersWithChange = stickers
      .map((sticker) => {
        const priceChange = ((sticker.current_price - (sticker.price_7d_ago || 0)) / (sticker.price_7d_ago || 1)) * 100;
        return { ...sticker, priceChange };
      })
      .sort((a, b) => b.priceChange - a.priceChange)
      .slice(0, limit);

    return stickersWithChange;
  }

  /**
   * Get most expensive stickers
   */
  async getMostExpensiveStickers(limit: number = 20): Promise<any[]> {
    return await db.stickers.findMany({
      orderBy: { current_price: 'desc' },
      take: limit,
    });
  }

  /**
   * Get contraband stickers (removed from game)
   */
  async getContrabandStickers(): Promise<any[]> {
    return await db.stickers.findMany({
      where: { is_contraband: true },
      orderBy: { current_price: 'desc' },
    });
  }

  /**
   * Extract dominant colors from sticker image
   */
  async extractColors(imageUrl: string): Promise<string[]> {
    // TODO: Use image processing library to extract dominant colors
    // Options:
    // 1. node-vibrant
    // 2. sharp + color-thief
    // 3. External API (Cloudinary, Imgix)

    // Placeholder implementation
    return ['#FF5733', '#3498DB', '#2ECC71'];
  }

  /**
   * Update sticker prices (cron job)
   */
  async updatePrices(): Promise<void> {
    // Fetch latest prices from Steam Market API or CSGOSKINS.GG API
    // Update stickers table + create price_history snapshot

    const stickers = await db.stickers.findMany();

    for (const sticker of stickers) {
      // Fetch current price from API
      // const newPrice = await fetchPriceFromAPI(sticker.market_hash_name);

      // Update sticker
      await db.stickers.update({
        where: { id: sticker.id },
        data: {
          price_24h_ago: sticker.current_price,
          // current_price: newPrice,
          updated_at: new Date(),
        },
      });

      // Create price history snapshot
      await db.sticker_price_history.create({
        data: {
          sticker_id: sticker.id,
          price: sticker.current_price,
          snapshot_date: new Date(),
        },
      });
    }
  }
}

export const stickerDatabaseService = new StickerDatabaseService();
```

### API Endpoints

#### `src/app/api/stickers/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stickerDatabaseService } from '@/services/StickerDatabaseService';

// GET /api/stickers - Search stickers
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const searchQuery = searchParams.get('q') || undefined;
    const collection = searchParams.get('collection') || undefined;
    const tournament = searchParams.get('tournament') || undefined;
    const raritytier = searchParams.get('rarity')?.split(',') || undefined;
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;
    const sortBy = searchParams.get('sortBy') as any;

    const result = await stickerDatabaseService.searchStickers(page, 48, {
      searchQuery,
      collection,
      tournament,
      raritytier,
      minPrice,
      maxPrice,
      sortBy,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### `src/app/api/stickers/[identifier]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stickerDatabaseService } from '@/services/StickerDatabaseService';

// GET /api/stickers/[identifier] - Get sticker details
export async function GET(req: NextRequest, { params }: { params: { identifier: string } }) {
  try {
    const sticker = await stickerDatabaseService.getSticker(params.identifier);
    return NextResponse.json(sticker);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}
```

## Frontend Components

### `src/app/stickers/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function StickerDatabasePage() {
  const [stickers, setStickers] = useState<any[]>([]);
  const [filters, setFilters] = useState({ searchQuery: '', collection: '', rarity: [], sortBy: 'name' });
  const [collections, setCollections] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollections();
  }, []);

  useEffect(() => {
    fetchStickers();
  }, [page, filters]);

  const fetchCollections = async () => {
    const res = await fetch('/api/stickers/collections');
    const data = await res.json();
    setCollections(data.collections || []);
  };

  const fetchStickers = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      ...(filters.searchQuery && { q: filters.searchQuery }),
      ...(filters.collection && { collection: filters.collection }),
      ...(filters.rarity.length && { rarity: filters.rarity.join(',') }),
      sortBy: filters.sortBy,
    });

    const res = await fetch(`/api/stickers?${params}`);
    const data = await res.json();
    setStickers(data.stickers || []);
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6">CS2 Sticker Database</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              placeholder="Sticker name, team, player..."
              className="w-full border rounded-lg p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Collection</label>
            <select
              value={filters.collection}
              onChange={(e) => setFilters({ ...filters, collection: e.target.value })}
              className="w-full border rounded-lg p-2"
            >
              <option value="">All Collections</option>
              {collections.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Rarity</label>
            <select className="w-full border rounded-lg p-2">
              <option value="">All Rarities</option>
              <option value="normal">Normal</option>
              <option value="holo">Holo</option>
              <option value="foil">Foil</option>
              <option value="gold">Gold</option>
              <option value="contraband">Contraband</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              className="w-full border rounded-lg p-2"
            >
              <option value="name">Name</option>
              <option value="price_high">Price: High to Low</option>
              <option value="price_low">Price: Low to High</option>
              <option value="popular">Most Popular</option>
              <option value="recent">Recently Added</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">Loading...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {stickers.map((sticker) => (
            <StickerCard key={sticker.id} sticker={sticker} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-2 mt-8">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 border rounded-lg disabled:opacity-50"
        >
          Previous
        </button>
        <button onClick={() => setPage((p) => p + 1)} className="px-4 py-2 border rounded-lg">
          Next
        </button>
      </div>
    </div>
  );
}

function StickerCard({ sticker }: { sticker: any }) {
  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      normal: 'border-gray-300',
      holo: 'border-blue-500',
      foil: 'border-purple-500',
      gold: 'border-yellow-500',
      contraband: 'border-red-600',
    };
    return colors[rarity] || 'border-gray-300';
  };

  return (
    <Link href={`/stickers/${sticker.id}`}>
      <div className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4 border-2 ${getRarityColor(sticker.rarity_tier)}`}>
        <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center">
          {sticker.image_url ? (
            <Image src={sticker.image_url} alt={sticker.display_name} width={100} height={100} />
          ) : (
            <div className="text-gray-400 text-xs">No Image</div>
          )}
        </div>
        <h3 className="font-medium text-sm truncate mb-1">{sticker.display_name}</h3>
        <p className="text-xs text-gray-500 mb-1">{sticker.rarity_tier}</p>
        <p className="font-bold text-sm text-blue-600">${sticker.current_price?.toFixed(2) || '0.00'}</p>
      </div>
    </Link>
  );
}
```

## Success Metrics
1. **Search Usage**: 60%+ of users search sticker database
2. **SEO Traffic**: Sticker pages drive 30%+ of organic search traffic
3. **Watchlist Adoption**: 20%+ of users add stickers to watchlist
4. **Data Accuracy**: 99%+ price accuracy vs Steam Market
5. **Engagement**: Average 4+ minutes browsing sticker database

## Dependencies
- **Feature 03**: Price Tracking (price data source)
- **Feature 23**: Craft Simulator (uses sticker data)

## Effort Estimate
- **Database Schema**: 5 hours
- **StickerDatabaseService**: 12 hours
- **Price Update Cron Job**: 6 hours
- **Color Extraction**: 4 hours
- **API Endpoints**: 4 hours
- **Sticker Database Page**: 12 hours
- **Sticker Detail Page**: 8 hours
- **Watchlist Feature**: 6 hours
- **Testing**: 6 hours
- **Total**: ~63 hours (1.6 weeks)

## Implementation Notes
1. **Data Source**: Use CSGOSKINS.GG API or Steam Market API for prices
2. **Cron Job**: Update prices daily at midnight
3. **Image Storage**: Cache sticker images on Cloudflare R2 for fast loading
4. **SEO**: Create individual pages for each sticker with meta tags
5. **Color Extraction**: Use node-vibrant for extracting dominant colors

## Gotchas
1. **Data Freshness**: Sticker prices fluctuate - ensure daily updates
2. **Missing Data**: Some old stickers may not have complete data
3. **Image Copyright**: Sticker images are Valve property - ensure legal use
4. **API Rate Limits**: Steam API has rate limits - implement backoff
5. **Contraband Stickers**: Rare contraband stickers may not have reliable data

## Status Checklist
- [ ] Database schema created and migrated
- [ ] StickerDatabaseService implemented
- [ ] Price update cron job configured
- [ ] Color extraction working
- [ ] API endpoints created
- [ ] Sticker database page built
- [ ] Sticker detail page created
- [ ] Search/filter functionality tested
- [ ] Watchlist feature implemented
- [ ] SEO meta tags configured
- [ ] Unit tests written (95% coverage)
- [ ] Integration tests written
- [ ] Documentation completed

## Related Features
- **Feature 23**: Craft Simulator (uses sticker database)
- **Feature 24**: Craft Gallery (sticker filtering)
- **Feature 16**: Investment Insights (sticker price trends)

## References
- [Steam Market API](https://developer.valvesoftware.com/wiki/Steam_Web_API)
- [CSGOSKINS.GG API](https://csgoskins.gg/)
- [node-vibrant](https://github.com/Vibrant-Colors/node-vibrant) (color extraction)
- [CSGOStash Sticker Database](https://csgostash.com/stickers)
