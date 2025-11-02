# Feature 26: Pattern/Float Database

## Overview
Comprehensive database of CS2 skin patterns and float values with visual browser, rarity rankings, and price premiums for rare patterns (e.g., blue gems, max blue, blackiimov). Critical tool for collectors hunting specific patterns and investors identifying undervalued rare patterns.

## User Segments
- **Primary**: Collectors, Hobbyists, Investors
- **Secondary**: Casual Traders, Content Creators
- **Tertiary**: Bulk Traders, Market Makers

## User Stories

### As a Collector
- I want to browse all pattern variations for a specific skin (e.g., Case Hardened blue gems)
- I want to see rarity rankings for pattern indexes (which patterns are rare)
- I want visual comparison of different float values (0.00 vs 0.50 wear)
- I want to find the lowest float version of a skin (e.g., 0.0000X Factory New)
- I want to see price premiums for rare patterns

### As an Investor
- I want to identify undervalued rare patterns before they trend
- I want to track pattern price history (how much blue gems appreciated)
- I want alerts when rare patterns get listed below market value
- I want to see which patterns have highest ROI potential

### As a Trader
- I want to check if a skin I'm buying has a rare/desirable pattern
- I want to verify float value accuracy before purchasing
- I want to compare patterns side-by-side before trading
- I want to know fair market value for specific pattern + float combos

### As the Platform
- I want to provide authoritative pattern/float data
- I want to drive high-value collector traffic
- I want to capture rare pattern sales data for investment insights

## Research & Context

### CS2 Pattern System

1. **Pattern Index**
   - Each skin has 0-999 possible pattern variations
   - Pattern Index determines paint placement on skin
   - Some pattern indexes are objectively rarer/more valuable
   - **Example**: Case Hardened #661 "Scar Pattern" (most blue)

2. **Float Value (Wear)**
   - Range: 0.00 (Factory New) to 1.00 (Battle-Scarred)
   - Determines visible wear/scratches on skin
   - **Tiers**:
     - Factory New: 0.00 - 0.07
     - Minimal Wear: 0.07 - 0.15
     - Field-Tested: 0.15 - 0.38
     - Well-Worn: 0.38 - 0.45
     - Battle-Scarred: 0.45 - 1.00
   - Lower float = better condition = higher value

3. **Rare Patterns**
   - **Blue Gems**: Case Hardened skins with maximum blue
   - **Blackiimov**: AWP Asiimov with 0.99+ float (all black)
   - **Max Pink**: Doppler Phase 2 with maximum pink
   - **Full Fade**: Fade skins with complete spectrum
   - **Golden Koi**: Five-Seven Case Hardened full gold

4. **Pattern Tier System**
   - **Tier 1**: Top 0.1% patterns (e.g., CH #661, #151)
   - **Tier 2**: Top 1% patterns
   - **Tier 3**: Top 5% patterns
   - **Tier 4**: Above average (Top 20%)
   - **Tier 5**: Average/common patterns

### Data Points Needed
- Skin name
- Pattern index (0-999)
- Float value (0.00-1.00)
- Rarity tier
- Visual screenshot
- Blue % (for Case Hardened)
- Price premium multiplier
- Historical sales data

### Competitor Gap
- **CSFloat**: Has float database, limited pattern data
- **CS.Money**: 3D viewer, no pattern rankings
- **CSGOExchange**: Pattern database (discontinued)
- **Opportunity**: Most comprehensive pattern + float database with rankings

## Technical Requirements

### Database Schema

```sql
-- Skin pattern catalog
CREATE TABLE skin_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  skin_market_hash_name VARCHAR(255) NOT NULL,
  pattern_index INTEGER NOT NULL CHECK (pattern_index >= 0 AND pattern_index <= 999),

  -- Pattern analysis
  rarity_tier INTEGER CHECK (rarity_tier >= 1 AND rarity_tier <= 5), -- 1=rarest, 5=common
  blue_percentage DECIMAL(5,2), -- For Case Hardened skins
  gold_percentage DECIMAL(5,2), -- For Case Hardened skins
  pattern_type VARCHAR(50), -- 'blue_gem', 'max_pink', 'full_fade', 'golden_koi', etc.

  -- Visual
  screenshot_url TEXT,
  screenshot_high_res_url TEXT,

  -- Pricing
  average_price DECIMAL(12,2),
  price_premium_multiplier DECIMAL(5,2) DEFAULT 1.00, -- 1.00 = no premium, 2.00 = 2x market price

  -- Popularity
  view_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(skin_market_hash_name, pattern_index),
  INDEX idx_skin_patterns_skin (skin_market_hash_name),
  INDEX idx_skin_patterns_rarity (rarity_tier),
  INDEX idx_skin_patterns_blue_percentage (blue_percentage DESC),
  INDEX idx_skin_patterns_pattern_type (pattern_type)
);

-- Float value registry (specific items)
CREATE TABLE float_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  skin_market_hash_name VARCHAR(255) NOT NULL,
  pattern_index INTEGER NOT NULL,
  float_value DECIMAL(18,16) NOT NULL, -- High precision (e.g., 0.0000123456789012)

  -- Item details
  inspect_link TEXT,
  owner_steam_id VARCHAR(255),
  screenshot_url TEXT,

  -- Rarity
  float_rank INTEGER, -- 1 = lowest float for this skin+pattern, 2 = 2nd lowest, etc.

  -- Metadata
  last_seen_date DATE,
  is_verified BOOLEAN DEFAULT false, -- Verified by inspect link

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_float_registry_skin_pattern (skin_market_hash_name, pattern_index, float_value),
  INDEX idx_float_registry_float_value (float_value ASC)
);

-- Pattern price history
CREATE TABLE pattern_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID NOT NULL REFERENCES skin_patterns(id) ON DELETE CASCADE,
  average_price DECIMAL(12,2) NOT NULL,
  sales_count INTEGER DEFAULT 0,
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(pattern_id, snapshot_date),
  INDEX idx_pattern_price_history_pattern_date (pattern_id, snapshot_date DESC)
);

-- User pattern bookmarks
CREATE TABLE pattern_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pattern_id UUID NOT NULL REFERENCES skin_patterns(id) ON DELETE CASCADE,
  max_price DECIMAL(12,2), -- Alert when pattern listed below this price
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, pattern_id),
  INDEX idx_pattern_bookmarks_user_id (user_id)
);

-- Pattern search presets (saved searches)
CREATE TABLE pattern_search_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preset_name VARCHAR(255) NOT NULL,
  search_filters JSONB NOT NULL, -- Saved filter state
  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_pattern_search_presets_user_id (user_id)
);
```

### Services

#### `src/services/PatternFloatDatabaseService.ts`

```typescript
import { db } from '@/lib/db';

interface PatternFilters {
  skinName?: string;
  patternIndex?: number;
  rarityTier?: number[];
  minBluePercentage?: number;
  patternType?: string;
  sortBy?: 'rarity' | 'blue_percentage' | 'price' | 'popular';
}

interface FloatFilters {
  skinName: string;
  patternIndex?: number;
  minFloat?: number;
  maxFloat?: number;
}

export class PatternFloatDatabaseService {
  /**
   * Search patterns with filters
   */
  async searchPatterns(page: number = 1, pageSize: number = 48, filters?: PatternFilters) {
    const offset = (page - 1) * pageSize;

    // Build where clause
    const where: any = {};

    if (filters?.skinName) {
      where.skin_market_hash_name = { contains: filters.skinName, mode: 'insensitive' };
    }

    if (filters?.patternIndex !== undefined) {
      where.pattern_index = filters.patternIndex;
    }

    if (filters?.rarityTier && filters.rarityTier.length > 0) {
      where.rarity_tier = { in: filters.rarityTier };
    }

    if (filters?.minBluePercentage !== undefined) {
      where.blue_percentage = { gte: filters.minBluePercentage };
    }

    if (filters?.patternType) {
      where.pattern_type = filters.patternType;
    }

    // Build order by
    let orderBy: any = { rarity_tier: 'asc' }; // Default: rarest first

    if (filters?.sortBy === 'blue_percentage') {
      orderBy = { blue_percentage: 'desc' };
    } else if (filters?.sortBy === 'price') {
      orderBy = { average_price: 'desc' };
    } else if (filters?.sortBy === 'popular') {
      orderBy = [{ bookmark_count: 'desc' }, { view_count: 'desc' }];
    }

    // Fetch patterns
    const patterns = await db.skin_patterns.findMany({
      where,
      orderBy,
      skip: offset,
      take: pageSize,
    });

    const total = await db.skin_patterns.count({ where });

    return {
      patterns,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get specific pattern
   */
  async getPattern(skinName: string, patternIndex: number): Promise<any> {
    const pattern = await db.skin_patterns.findUnique({
      where: {
        skin_market_hash_name_pattern_index: {
          skin_market_hash_name: skinName,
          pattern_index: patternIndex,
        },
      },
    });

    if (!pattern) {
      throw new Error('Pattern not found');
    }

    // Increment view count
    await db.skin_patterns.update({
      where: { id: pattern.id },
      data: { view_count: { increment: 1 } },
    });

    return pattern;
  }

  /**
   * Search float values
   */
  async searchFloatValues(page: number = 1, pageSize: number = 50, filters: FloatFilters) {
    const offset = (page - 1) * pageSize;

    const where: any = {
      skin_market_hash_name: filters.skinName,
    };

    if (filters.patternIndex !== undefined) {
      where.pattern_index = filters.patternIndex;
    }

    if (filters.minFloat !== undefined) {
      where.float_value = { ...where.float_value, gte: filters.minFloat };
    }

    if (filters.maxFloat !== undefined) {
      where.float_value = { ...where.float_value, lte: filters.maxFloat };
    }

    const floats = await db.float_registry.findMany({
      where,
      orderBy: { float_value: 'asc' }, // Lowest float first
      skip: offset,
      take: pageSize,
    });

    const total = await db.float_registry.count({ where });

    return {
      floats,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get top patterns for a skin (best blue gems, etc.)
   */
  async getTopPatterns(skinName: string, limit: number = 20): Promise<any[]> {
    return await db.skin_patterns.findMany({
      where: { skin_market_hash_name: skinName },
      orderBy: { rarity_tier: 'asc' },
      take: limit,
    });
  }

  /**
   * Get lowest floats for a skin
   */
  async getLowestFloats(skinName: string, limit: number = 100): Promise<any[]> {
    return await db.float_registry.findMany({
      where: {
        skin_market_hash_name: skinName,
        is_verified: true,
      },
      orderBy: { float_value: 'asc' },
      take: limit,
    });
  }

  /**
   * Bookmark a pattern
   */
  async bookmarkPattern(userId: string, patternId: string, maxPrice?: number, notes?: string): Promise<void> {
    await db.pattern_bookmarks.create({
      data: {
        user_id: userId,
        pattern_id: patternId,
        max_price: maxPrice,
        notes,
      },
    });

    // Increment bookmark count
    await db.skin_patterns.update({
      where: { id: patternId },
      data: { bookmark_count: { increment: 1 } },
    });
  }

  /**
   * Remove bookmark
   */
  async removeBookmark(userId: string, patternId: string): Promise<void> {
    await db.pattern_bookmarks.deleteMany({
      where: {
        user_id: userId,
        pattern_id: patternId,
      },
    });

    // Decrement bookmark count
    await db.skin_patterns.update({
      where: { id: patternId },
      data: { bookmark_count: { decrement: 1 } },
    });
  }

  /**
   * Get user's bookmarked patterns
   */
  async getUserBookmarks(userId: string): Promise<any[]> {
    const bookmarks = await db.pattern_bookmarks.findMany({
      where: { user_id: userId },
      include: { pattern: true },
      orderBy: { created_at: 'desc' },
    });

    return bookmarks.map((b) => ({ ...b.pattern, maxPrice: b.max_price, notes: b.notes }));
  }

  /**
   * Analyze pattern from inspect link
   */
  async analyzePattern(inspectLink: string): Promise<{
    skinName: string;
    patternIndex: number;
    floatValue: number;
    rarityTier?: number;
    bluePercentage?: number;
    patternType?: string;
    pricePremium?: number;
  }> {
    // TODO: Parse inspect link and extract pattern index + float value
    // Format: steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S...
    // Extract: defindex, paintindex, paintseed, paintwear

    // Placeholder implementation
    const patternIndex = 661; // Example: Scar Pattern
    const floatValue = 0.0123;
    const skinName = 'AK-47 | Case Hardened (Field-Tested)';

    // Look up pattern data
    const pattern = await db.skin_patterns.findFirst({
      where: {
        skin_market_hash_name: skinName,
        pattern_index: patternIndex,
      },
    });

    return {
      skinName,
      patternIndex,
      floatValue,
      rarityTier: pattern?.rarity_tier,
      bluePercentage: pattern?.blue_percentage,
      patternType: pattern?.pattern_type,
      pricePremium: pattern?.price_premium_multiplier,
    };
  }

  /**
   * Calculate blue percentage for Case Hardened pattern
   */
  async calculateBluePercentage(skinName: string, patternIndex: number): Promise<number> {
    // TODO: Image analysis to calculate % of skin that is blue
    // Options:
    // 1. Pre-computed values (crowdsourced)
    // 2. Image processing (OpenCV, sharp)
    // 3. API integration (CSFloat API)

    // Placeholder: Use pre-computed values
    const pattern = await db.skin_patterns.findFirst({
      where: {
        skin_market_hash_name: skinName,
        pattern_index: patternIndex,
      },
    });

    return pattern?.blue_percentage || 0;
  }

  /**
   * Get trending patterns (most viewed/bookmarked recently)
   */
  async getTrendingPatterns(days: number = 7, limit: number = 20): Promise<any[]> {
    // Get patterns with most bookmarks in last X days
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const recentBookmarks = await db.pattern_bookmarks.groupBy({
      by: ['pattern_id'],
      where: {
        created_at: { gte: cutoffDate },
      },
      _count: true,
      orderBy: {
        _count: {
          pattern_id: 'desc',
        },
      },
      take: limit,
    });

    // Fetch full pattern data
    const patternIds = recentBookmarks.map((rb) => rb.pattern_id);
    const patterns = await db.skin_patterns.findMany({
      where: { id: { in: patternIds } },
    });

    return patterns;
  }

  /**
   * Register new float value (from inspect link)
   */
  async registerFloat(
    skinName: string,
    patternIndex: number,
    floatValue: number,
    inspectLink: string,
    ownerSteamId?: string
  ): Promise<void> {
    // Check if this float already exists
    const existing = await db.float_registry.findFirst({
      where: {
        skin_market_hash_name: skinName,
        pattern_index: patternIndex,
        float_value: floatValue,
      },
    });

    if (existing) {
      // Update last seen date
      await db.float_registry.update({
        where: { id: existing.id },
        data: { last_seen_date: new Date() },
      });
      return;
    }

    // Create new entry
    await db.float_registry.create({
      data: {
        skin_market_hash_name: skinName,
        pattern_index: patternIndex,
        float_value: floatValue,
        inspect_link: inspectLink,
        owner_steam_id: ownerSteamId,
        last_seen_date: new Date(),
        is_verified: true,
      },
    });

    // Calculate float rank
    await this.updateFloatRanks(skinName, patternIndex);
  }

  /**
   * Update float ranks for a skin+pattern
   */
  private async updateFloatRanks(skinName: string, patternIndex: number): Promise<void> {
    const floats = await db.float_registry.findMany({
      where: {
        skin_market_hash_name: skinName,
        pattern_index: patternIndex,
      },
      orderBy: { float_value: 'asc' },
    });

    // Update ranks
    for (let i = 0; i < floats.length; i++) {
      await db.float_registry.update({
        where: { id: floats[i].id },
        data: { float_rank: i + 1 },
      });
    }
  }
}

export const patternFloatDatabaseService = new PatternFloatDatabaseService();
```

### API Endpoints

#### `src/app/api/patterns/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { patternFloatDatabaseService } from '@/services/PatternFloatDatabaseService';

// GET /api/patterns - Search patterns
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const skinName = searchParams.get('skinName') || undefined;
    const patternIndex = searchParams.get('patternIndex') ? parseInt(searchParams.get('patternIndex')!) : undefined;
    const minBluePercentage = searchParams.get('minBlue') ? parseFloat(searchParams.get('minBlue')!) : undefined;
    const sortBy = searchParams.get('sortBy') as any;

    const result = await patternFloatDatabaseService.searchPatterns(page, 48, {
      skinName,
      patternIndex,
      minBluePercentage,
      sortBy,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### `src/app/api/floats/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { patternFloatDatabaseService } from '@/services/PatternFloatDatabaseService';

// GET /api/floats - Search float values
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const skinName = searchParams.get('skinName');

    if (!skinName) {
      return NextResponse.json({ error: 'skinName is required' }, { status: 400 });
    }

    const result = await patternFloatDatabaseService.searchFloatValues(page, 50, { skinName });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## Frontend Components

### `src/app/patterns/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function PatternDatabasePage() {
  const [patterns, setPatterns] = useState<any[]>([]);
  const [filters, setFilters] = useState({ skinName: '', minBlue: '', sortBy: 'rarity' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatterns();
  }, [page, filters]);

  const fetchPatterns = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      ...(filters.skinName && { skinName: filters.skinName }),
      ...(filters.minBlue && { minBlue: filters.minBlue }),
      sortBy: filters.sortBy,
    });

    const res = await fetch(`/api/patterns?${params}`);
    const data = await res.json();
    setPatterns(data.patterns || []);
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6">CS2 Pattern Database</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Skin Name</label>
            <input
              type="text"
              value={filters.skinName}
              onChange={(e) => setFilters({ ...filters, skinName: e.target.value })}
              placeholder="e.g., Case Hardened"
              className="w-full border rounded-lg p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Min Blue %</label>
            <input
              type="number"
              value={filters.minBlue}
              onChange={(e) => setFilters({ ...filters, minBlue: e.target.value })}
              placeholder="0-100"
              className="w-full border rounded-lg p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              className="w-full border rounded-lg p-2"
            >
              <option value="rarity">Rarity (Rarest First)</option>
              <option value="blue_percentage">Blue %</option>
              <option value="price">Price</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {patterns.map((pattern) => (
            <PatternCard key={pattern.id} pattern={pattern} />
          ))}
        </div>
      )}
    </div>
  );
}

function PatternCard({ pattern }: { pattern: any }) {
  const getTierColor = (tier: number) => {
    const colors = ['bg-red-600', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-gray-500'];
    return colors[tier - 1] || 'bg-gray-500';
  };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
      <div className="aspect-video bg-gray-900 relative">
        {pattern.screenshot_url && <Image src={pattern.screenshot_url} alt={`Pattern ${pattern.pattern_index}`} fill className="object-cover" />}
      </div>

      <div className="p-4">
        <h3 className="font-bold truncate mb-1">{pattern.skin_market_hash_name}</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Pattern #{pattern.pattern_index}</span>
          <span className={`px-2 py-1 rounded text-white text-xs font-medium ${getTierColor(pattern.rarity_tier)}`}>Tier {pattern.rarity_tier}</span>
        </div>

        {pattern.blue_percentage !== null && (
          <div className="mb-2">
            <div className="text-xs text-gray-600 mb-1">Blue: {pattern.blue_percentage.toFixed(1)}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${pattern.blue_percentage}%` }}></div>
            </div>
          </div>
        )}

        {pattern.price_premium_multiplier > 1 && (
          <div className="text-sm text-green-600 font-medium">{pattern.price_premium_multiplier.toFixed(1)}x Premium</div>
        )}
      </div>
    </div>
  );
}
```

## Success Metrics
1. **Collector Adoption**: 70%+ of collectors use pattern database
2. **Search Volume**: 10,000+ pattern searches per month
3. **Bookmark Usage**: 30%+ of users bookmark rare patterns
4. **Data Accuracy**: 99%+ accuracy for pattern tier rankings
5. **SEO Traffic**: Pattern pages drive 20%+ of organic traffic

## Dependencies
- **Feature 03**: Price Tracking (price premium data)
- **Feature 23**: Craft Simulator (uses pattern data)
- **Feature 27**: Pattern Filters (advanced pattern search)

## Effort Estimate
- **Database Schema**: 6 hours
- **PatternFloatDatabaseService**: 16 hours
- **Pattern Analysis Algorithm**: 12 hours
- **API Endpoints**: 4 hours
- **Pattern Database Page**: 14 hours
- **Float Registry Page**: 10 hours
- **Bookmark Feature**: 6 hours
- **Inspect Link Parser**: 8 hours
- **Testing**: 8 hours
- **Total**: ~84 hours (2.1 weeks)

## Implementation Notes
1. **Blue % Calculation**: Crowdsource blue percentages from community, verify with image analysis
2. **Float Precision**: Store floats with 16 decimal precision for accuracy
3. **Inspect Link Parsing**: Use CSFloat API or build custom parser
4. **Pattern Screenshots**: Cache screenshots on CDN for fast loading
5. **Tier Rankings**: Manually curate Tier 1-2 patterns, auto-rank Tier 3-5

## Gotchas
1. **Blue % Accuracy**: Calculating exact blue % is computationally expensive
2. **Pattern Subjectivity**: Some patterns are subjectively "better" - handle community disagreement
3. **Float Registry Spam**: Users may submit fake floats - require inspect link verification
4. **Data Volume**: 1000 patterns × 1000s of skins = millions of records - optimize queries
5. **Copyright**: Pattern screenshots use Valve assets - ensure legal compliance

## Status Checklist
- [ ] Database schema created and migrated
- [ ] PatternFloatDatabaseService implemented
- [ ] Pattern analysis algorithm completed
- [ ] API endpoints created
- [ ] Pattern database page built
- [ ] Float registry page created
- [ ] Bookmark feature implemented
- [ ] Inspect link parser working
- [ ] Blue % calculation accurate
- [ ] Tier rankings validated
- [ ] Unit tests written (95% coverage)
- [ ] Integration tests written
- [ ] Documentation completed

## Related Features
- **Feature 23**: Craft Simulator (pattern selection)
- **Feature 27**: Pattern Filters (advanced search)
- **Feature 16**: Investment Insights (rare pattern trends)

## References
- [CSFloat Database](https://csfloat.com/db)
- [CSGOExchange Pattern Database](https://csgoexchange.com/) (discontinued)
- [Case Hardened Blue Gem Guide](https://www.reddit.com/r/GlobalOffensiveTrade/wiki/bluegems)
- [Inspect Link Format](https://www.reddit.com/r/GlobalOffensiveTrade/comments/3gcy6o/psa_what_do_all_the_numbers_in_your_inspect_link/)
