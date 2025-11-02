# Feature 27: Pattern Filters

## Overview
Advanced filtering system for searching CS2 skins by specific pattern characteristics - blue percentage, fade percentage, doppler phase, pattern tier, float range, and custom visual features. Enables collectors to find exact patterns they're hunting without manually browsing thousands of listings.

## User Segments
- **Primary**: Collectors, Hobbyists
- **Secondary**: Investors, Traders
- **Tertiary**: Casual Traders

## User Stories

### As a Collector
- I want to search for Case Hardened skins with >80% blue
- I want to filter Fade skins by fade percentage (0-100% fade)
- I want to find Doppler skins by phase (Phase 1, 2, 3, 4, Ruby, Sapphire)
- I want to filter by float range (e.g., 0.00-0.01 for low floats)
- I want to save filter presets for repeated searches (e.g., "Blue Gem Hunt")
- I want to combine multiple filters (blue + low float + specific pattern index range)

### As an Investor
- I want to find undervalued patterns (Tier 1-2 patterns listed below market)
- I want to filter by price premium multiplier
- I want to search across multiple marketplaces simultaneously
- I want alerts when new listings match my saved filters

### As a Trader
- I want to quickly verify if a skin meets specific pattern criteria
- I want to compare similar patterns side-by-side
- I want to filter out common patterns and only see rare ones

### As the Platform
- I want to provide most advanced pattern search tool in CS2 market
- I want to drive collector traffic with unique filtering capabilities
- I want to capture data on which patterns are most searched

## Research & Context

### Pattern Types Requiring Filters

1. **Case Hardened**
   - Blue %: 0-100%
   - Gold %: 0-100%
   - Pattern Tier: 1-5
   - Specific Pattern Indexes (e.g., #661, #151, #670)

2. **Fade**
   - Fade %: 0-100%
   - Full Fade: Yes/No
   - Fade Pattern Index Range

3. **Doppler**
   - Phase: 1, 2, 3, 4, Ruby, Sapphire, Black Pearl
   - Pink %: 0-100% (for Phase 2)
   - Black %: 0-100% (for Phase 1)

4. **Marble Fade**
   - Fire & Ice: Yes/No
   - Max Fire & Ice (Tier 1-10)
   - Tri-Color Patterns

5. **Gamma Doppler**
   - Phase: 1, 2, 3, 4, Emerald

6. **Slaughter**
   - Patterns: Diamond, Angel, Dogbone, Butterfly

### Filter Complexity Levels

**Basic Filters** (easy to implement):
- Float range (0.00-1.00)
- Wear condition (FN, MW, FT, WW, BS)
- Price range
- Pattern tier (1-5)

**Advanced Filters** (require analysis):
- Blue %
- Fade %
- Doppler phase detection
- Specific pattern indexes
- Visual pattern matching

**Expert Filters** (complex):
- Combined criteria (blue + float + price)
- Saved search presets
- Alert triggers
- Marketplace aggregation

## Technical Requirements

### Database Schema

```sql
-- Pattern filter presets (saved searches)
CREATE TABLE pattern_filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preset_name VARCHAR(255) NOT NULL,

  -- Filter criteria (stored as JSONB)
  filter_criteria JSONB NOT NULL,
  /*
  Example filter_criteria:
  {
    "skinName": "AK-47 | Case Hardened",
    "minBluePercentage": 80,
    "maxBluePercentage": 100,
    "rarityTier": [1, 2],
    "minFloat": 0.00,
    "maxFloat": 0.10,
    "minPrice": null,
    "maxPrice": 5000,
    "patternIndexes": [661, 151, 670],
    "dopplerPhase": null,
    "fadePercentage": null
  }
  */

  -- Alert settings
  enable_alerts BOOLEAN DEFAULT false,
  alert_frequency VARCHAR(50) DEFAULT 'instant', -- 'instant', 'daily', 'weekly'

  -- Marketplace filters
  marketplaces VARCHAR(255)[], -- ['steam', 'csfloat', 'skinport']

  -- Metadata
  search_count INTEGER DEFAULT 0, -- How many times this preset was used
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_pattern_filter_presets_user_id (user_id),
  INDEX idx_pattern_filter_presets_last_used (last_used_at DESC)
);

-- Filter match alerts (new listings matching saved filters)
CREATE TABLE pattern_filter_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id UUID NOT NULL REFERENCES pattern_filter_presets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Match details
  item_id VARCHAR(255) NOT NULL, -- ID from marketplace
  marketplace VARCHAR(50) NOT NULL,
  skin_name VARCHAR(255) NOT NULL,
  pattern_index INTEGER,
  float_value DECIMAL(18,16),
  price DECIMAL(12,2),
  listing_url TEXT,

  -- Alert status
  is_viewed BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_pattern_filter_alerts_user_id (user_id, is_viewed),
  INDEX idx_pattern_filter_alerts_preset_id (preset_id)
);

-- Filter search analytics (track popular filters)
CREATE TABLE pattern_filter_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Filter used
  filter_type VARCHAR(50) NOT NULL, -- 'blue_percentage', 'doppler_phase', 'fade_percentage', etc.
  filter_value JSONB NOT NULL,

  -- Results
  results_count INTEGER NOT NULL,
  search_duration_ms INTEGER,

  -- User
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_pattern_filter_analytics_filter_type (filter_type, created_at DESC)
);
```

### Services

#### `src/services/PatternFilterService.ts`

```typescript
import { db } from '@/lib/db';

interface PatternFilterCriteria {
  skinName?: string;
  minBluePercentage?: number;
  maxBluePercentage?: number;
  minGoldPercentage?: number;
  maxGoldPercentage?: number;
  rarityTier?: number[];
  minFloat?: number;
  maxFloat?: number;
  minPrice?: number;
  maxPrice?: number;
  patternIndexes?: number[];
  dopplerPhase?: string[];
  fadePercentage?: { min?: number; max?: number };
  isFullFade?: boolean;
  isFireAndIce?: boolean;
  marketplaces?: string[];
}

export class PatternFilterService {
  /**
   * Advanced pattern search with complex filters
   */
  async searchWithFilters(criteria: PatternFilterCriteria, page: number = 1, pageSize: number = 48) {
    const startTime = Date.now();
    const offset = (page - 1) * pageSize;

    // Build where clause
    const where: any = {};

    if (criteria.skinName) {
      where.skin_market_hash_name = { contains: criteria.skinName, mode: 'insensitive' };
    }

    // Blue percentage filter
    if (criteria.minBluePercentage !== undefined || criteria.maxBluePercentage !== undefined) {
      where.blue_percentage = {};
      if (criteria.minBluePercentage !== undefined) {
        where.blue_percentage.gte = criteria.minBluePercentage;
      }
      if (criteria.maxBluePercentage !== undefined) {
        where.blue_percentage.lte = criteria.maxBluePercentage;
      }
    }

    // Gold percentage filter
    if (criteria.minGoldPercentage !== undefined || criteria.maxGoldPercentage !== undefined) {
      where.gold_percentage = {};
      if (criteria.minGoldPercentage !== undefined) {
        where.gold_percentage.gte = criteria.minGoldPercentage;
      }
      if (criteria.maxGoldPercentage !== undefined) {
        where.gold_percentage.lte = criteria.maxGoldPercentage;
      }
    }

    // Rarity tier filter
    if (criteria.rarityTier && criteria.rarityTier.length > 0) {
      where.rarity_tier = { in: criteria.rarityTier };
    }

    // Price filter
    if (criteria.minPrice !== undefined || criteria.maxPrice !== undefined) {
      where.average_price = {};
      if (criteria.minPrice !== undefined) {
        where.average_price.gte = criteria.minPrice;
      }
      if (criteria.maxPrice !== undefined) {
        where.average_price.lte = criteria.maxPrice;
      }
    }

    // Pattern index filter
    if (criteria.patternIndexes && criteria.patternIndexes.length > 0) {
      where.pattern_index = { in: criteria.patternIndexes };
    }

    // Doppler phase filter
    if (criteria.dopplerPhase && criteria.dopplerPhase.length > 0) {
      where.pattern_type = { in: criteria.dopplerPhase };
    }

    // Fade percentage filter
    if (criteria.fadePercentage) {
      // Assuming fade_percentage stored in pattern_type or metadata
      // Implementation depends on data structure
    }

    // Full fade filter
    if (criteria.isFullFade) {
      where.pattern_type = 'full_fade';
    }

    // Fire and Ice filter
    if (criteria.isFireAndIce) {
      where.pattern_type = { contains: 'fire_and_ice' };
    }

    // Fetch results
    const patterns = await db.skin_patterns.findMany({
      where,
      skip: offset,
      take: pageSize,
      orderBy: { rarity_tier: 'asc' },
    });

    const total = await db.skin_patterns.count({ where });

    const searchDuration = Date.now() - startTime;

    // Track analytics
    await this.trackFilterSearch(criteria, total, searchDuration);

    return {
      patterns,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      searchDuration,
    };
  }

  /**
   * Save filter preset
   */
  async savePreset(
    userId: string,
    presetName: string,
    criteria: PatternFilterCriteria,
    enableAlerts: boolean = false,
    alertFrequency: string = 'instant'
  ): Promise<string> {
    const preset = await db.pattern_filter_presets.create({
      data: {
        user_id: userId,
        preset_name: presetName,
        filter_criteria: criteria,
        enable_alerts: enableAlerts,
        alert_frequency: alertFrequency,
      },
    });

    return preset.id;
  }

  /**
   * Get user's saved presets
   */
  async getUserPresets(userId: string): Promise<any[]> {
    return await db.pattern_filter_presets.findMany({
      where: { user_id: userId },
      orderBy: { last_used_at: 'desc' },
    });
  }

  /**
   * Execute saved preset
   */
  async executePreset(presetId: string, page: number = 1): Promise<any> {
    const preset = await db.pattern_filter_presets.findUnique({
      where: { id: presetId },
    });

    if (!preset) {
      throw new Error('Preset not found');
    }

    // Update usage stats
    await db.pattern_filter_presets.update({
      where: { id: presetId },
      data: {
        search_count: { increment: 1 },
        last_used_at: new Date(),
      },
    });

    // Execute search with preset criteria
    return await this.searchWithFilters(preset.filter_criteria as PatternFilterCriteria, page);
  }

  /**
   * Delete preset
   */
  async deletePreset(presetId: string, userId: string): Promise<void> {
    await db.pattern_filter_presets.deleteMany({
      where: {
        id: presetId,
        user_id: userId,
      },
    });
  }

  /**
   * Check for new listings matching filter presets (cron job)
   */
  async checkFilterAlerts(): Promise<void> {
    const activePresets = await db.pattern_filter_presets.findMany({
      where: { enable_alerts: true },
    });

    for (const preset of activePresets) {
      // Search for new listings matching criteria
      // This would integrate with marketplace APIs (Steam, CSFloat, etc.)
      // For now, search local database

      const results = await this.searchWithFilters(preset.filter_criteria as PatternFilterCriteria, 1, 10);

      for (const pattern of results.patterns) {
        // Check if alert already exists for this item
        const existingAlert = await db.pattern_filter_alerts.findFirst({
          where: {
            preset_id: preset.id,
            pattern_index: pattern.pattern_index,
            skin_name: pattern.skin_market_hash_name,
          },
        });

        if (!existingAlert) {
          // Create new alert
          await db.pattern_filter_alerts.create({
            data: {
              preset_id: preset.id,
              user_id: preset.user_id,
              item_id: pattern.id,
              marketplace: 'local', // Or actual marketplace
              skin_name: pattern.skin_market_hash_name,
              pattern_index: pattern.pattern_index,
              price: pattern.average_price,
              listing_url: `/patterns/${pattern.id}`,
            },
          });

          // Send notification (email, push, etc.)
          await this.sendFilterAlert(preset.user_id, preset.preset_name, pattern);
        }
      }
    }
  }

  /**
   * Get user's unread alerts
   */
  async getUserAlerts(userId: string): Promise<any[]> {
    return await db.pattern_filter_alerts.findMany({
      where: {
        user_id: userId,
        is_viewed: false,
        is_dismissed: false,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Mark alert as viewed
   */
  async markAlertViewed(alertId: string): Promise<void> {
    await db.pattern_filter_alerts.update({
      where: { id: alertId },
      data: { is_viewed: true },
    });
  }

  /**
   * Dismiss alert
   */
  async dismissAlert(alertId: string): Promise<void> {
    await db.pattern_filter_alerts.update({
      where: { id: alertId },
      data: { is_dismissed: true },
    });
  }

  /**
   * Send filter alert notification
   */
  private async sendFilterAlert(userId: string, presetName: string, pattern: any): Promise<void> {
    // TODO: Integrate with notification service
    // - Email
    // - Push notification
    // - In-app notification

    console.log(`Alert: New listing matching "${presetName}" - ${pattern.skin_market_hash_name} #${pattern.pattern_index}`);
  }

  /**
   * Track filter search for analytics
   */
  private async trackFilterSearch(criteria: PatternFilterCriteria, resultsCount: number, duration: number): Promise<void> {
    // Determine primary filter type
    let filterType = 'general';
    if (criteria.minBluePercentage !== undefined) filterType = 'blue_percentage';
    else if (criteria.dopplerPhase) filterType = 'doppler_phase';
    else if (criteria.fadePercentage) filterType = 'fade_percentage';

    await db.pattern_filter_analytics.create({
      data: {
        filter_type: filterType,
        filter_value: criteria,
        results_count: resultsCount,
        search_duration_ms: duration,
      },
    });
  }

  /**
   * Get popular filter combinations (trending searches)
   */
  async getPopularFilters(days: number = 30, limit: number = 10): Promise<any[]> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const analytics = await db.pattern_filter_analytics.groupBy({
      by: ['filter_type'],
      where: {
        created_at: { gte: cutoffDate },
      },
      _count: true,
      orderBy: {
        _count: {
          filter_type: 'desc',
        },
      },
      take: limit,
    });

    return analytics;
  }

  /**
   * Validate filter criteria
   */
  validateCriteria(criteria: PatternFilterCriteria): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Blue percentage range
    if (criteria.minBluePercentage !== undefined && (criteria.minBluePercentage < 0 || criteria.minBluePercentage > 100)) {
      errors.push('Min blue percentage must be between 0 and 100');
    }
    if (criteria.maxBluePercentage !== undefined && (criteria.maxBluePercentage < 0 || criteria.maxBluePercentage > 100)) {
      errors.push('Max blue percentage must be between 0 and 100');
    }
    if (
      criteria.minBluePercentage !== undefined &&
      criteria.maxBluePercentage !== undefined &&
      criteria.minBluePercentage > criteria.maxBluePercentage
    ) {
      errors.push('Min blue percentage cannot be greater than max');
    }

    // Float range
    if (criteria.minFloat !== undefined && (criteria.minFloat < 0 || criteria.minFloat > 1)) {
      errors.push('Min float must be between 0 and 1');
    }
    if (criteria.maxFloat !== undefined && (criteria.maxFloat < 0 || criteria.maxFloat > 1)) {
      errors.push('Max float must be between 0 and 1');
    }
    if (criteria.minFloat !== undefined && criteria.maxFloat !== undefined && criteria.minFloat > criteria.maxFloat) {
      errors.push('Min float cannot be greater than max');
    }

    // Price range
    if (criteria.minPrice !== undefined && criteria.minPrice < 0) {
      errors.push('Min price cannot be negative');
    }
    if (criteria.maxPrice !== undefined && criteria.maxPrice < 0) {
      errors.push('Max price cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const patternFilterService = new PatternFilterService();
```

### API Endpoints

#### `src/app/api/patterns/search/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { patternFilterService } from '@/services/PatternFilterService';

// POST /api/patterns/search - Advanced pattern search
export async function POST(req: NextRequest) {
  try {
    const { criteria, page } = await req.json();

    // Validate criteria
    const validation = patternFilterService.validateCriteria(criteria);
    if (!validation.valid) {
      return NextResponse.json({ error: 'Invalid filter criteria', errors: validation.errors }, { status: 400 });
    }

    const result = await patternFilterService.searchWithFilters(criteria, page);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### `src/app/api/patterns/presets/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { patternFilterService } from '@/services/PatternFilterService';

// GET /api/patterns/presets - Get user's saved presets
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const presets = await patternFilterService.getUserPresets(session.user.id);
    return NextResponse.json({ presets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/patterns/presets - Save new preset
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { presetName, criteria, enableAlerts, alertFrequency } = await req.json();

    const presetId = await patternFilterService.savePreset(session.user.id, presetName, criteria, enableAlerts, alertFrequency);

    return NextResponse.json({ presetId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## Frontend Components

### `src/app/patterns/search/page.tsx`

```typescript
'use client';

import { useState } from 'react';

export default function PatternSearchPage() {
  const [criteria, setCriteria] = useState({
    skinName: '',
    minBluePercentage: '',
    maxBluePercentage: '',
    rarityTier: [],
    minFloat: '',
    maxFloat: '',
    minPrice: '',
    maxPrice: '',
    patternIndexes: '',
  });

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savePresetName, setSavePresetName] = useState('');

  const handleSearch = async () => {
    setLoading(true);

    const res = await fetch('/api/patterns/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        criteria: {
          ...criteria,
          minBluePercentage: criteria.minBluePercentage ? parseFloat(criteria.minBluePercentage) : undefined,
          maxBluePercentage: criteria.maxBluePercentage ? parseFloat(criteria.maxBluePercentage) : undefined,
          minFloat: criteria.minFloat ? parseFloat(criteria.minFloat) : undefined,
          maxFloat: criteria.maxFloat ? parseFloat(criteria.maxFloat) : undefined,
          minPrice: criteria.minPrice ? parseFloat(criteria.minPrice) : undefined,
          maxPrice: criteria.maxPrice ? parseFloat(criteria.maxPrice) : undefined,
          patternIndexes: criteria.patternIndexes ? criteria.patternIndexes.split(',').map((n) => parseInt(n.trim())) : undefined,
        },
        page: 1,
      }),
    });

    const data = await res.json();
    setResults(data.patterns || []);
    setLoading(false);
  };

  const handleSavePreset = async () => {
    if (!savePresetName) {
      alert('Please enter a preset name');
      return;
    }

    const res = await fetch('/api/patterns/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        presetName: savePresetName,
        criteria,
        enableAlerts: false,
      }),
    });

    if (res.ok) {
      alert('Preset saved!');
      setSavePresetName('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6">Advanced Pattern Search</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Search Filters</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Skin Name</label>
            <input
              type="text"
              value={criteria.skinName}
              onChange={(e) => setCriteria({ ...criteria, skinName: e.target.value })}
              placeholder="e.g., Case Hardened"
              className="w-full border rounded-lg p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Min Blue %</label>
            <input
              type="number"
              value={criteria.minBluePercentage}
              onChange={(e) => setCriteria({ ...criteria, minBluePercentage: e.target.value })}
              placeholder="0"
              className="w-full border rounded-lg p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Max Blue %</label>
            <input
              type="number"
              value={criteria.maxBluePercentage}
              onChange={(e) => setCriteria({ ...criteria, maxBluePercentage: e.target.value })}
              placeholder="100"
              className="w-full border rounded-lg p-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Min Float</label>
            <input
              type="number"
              step="0.01"
              value={criteria.minFloat}
              onChange={(e) => setCriteria({ ...criteria, minFloat: e.target.value })}
              placeholder="0.00"
              className="w-full border rounded-lg p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Max Float</label>
            <input
              type="number"
              step="0.01"
              value={criteria.maxFloat}
              onChange={(e) => setCriteria({ ...criteria, maxFloat: e.target.value })}
              placeholder="1.00"
              className="w-full border rounded-lg p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Pattern Indexes (comma-separated)</label>
            <input
              type="text"
              value={criteria.patternIndexes}
              onChange={(e) => setCriteria({ ...criteria, patternIndexes: e.target.value })}
              placeholder="e.g., 661, 151, 670"
              className="w-full border rounded-lg p-2"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={handleSearch} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Searching...' : 'Search'}
          </button>

          <div className="flex gap-2 ml-auto">
            <input
              type="text"
              value={savePresetName}
              onChange={(e) => setSavePresetName(e.target.value)}
              placeholder="Preset name..."
              className="border rounded-lg px-3 py-2"
            />
            <button onClick={handleSavePreset} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Save Preset
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Results ({results.length})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {results.map((pattern) => (
            <div key={pattern.id} className="border rounded-lg p-3">
              <div className="font-medium truncate">{pattern.skin_market_hash_name}</div>
              <div className="text-sm text-gray-600">Pattern #{pattern.pattern_index}</div>
              {pattern.blue_percentage && <div className="text-sm">Blue: {pattern.blue_percentage.toFixed(1)}%</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## Success Metrics
1. **Filter Adoption**: 50%+ of collectors use advanced filters
2. **Saved Presets**: 30%+ of users save filter presets
3. **Alert Usage**: 20%+ of users enable filter alerts
4. **Search Efficiency**: Average 80% reduction in search time vs manual browsing
5. **Conversion**: 15%+ of filtered searches result in purchases

## Dependencies
- **Feature 26**: Pattern/Float Database (provides filterable data)
- **Feature 03**: Price Tracking (price filter data)

## Effort Estimate
- **Database Schema**: 4 hours
- **PatternFilterService**: 16 hours
- **Alert System**: 8 hours
- **API Endpoints**: 4 hours
- **Advanced Search Page**: 14 hours
- **Preset Management UI**: 6 hours
- **Alert Dashboard**: 6 hours
- **Testing**: 6 hours
- **Total**: ~64 hours (1.6 weeks)

## Implementation Notes
1. **Performance**: Index all filterable columns for fast queries
2. **Alert Frequency**: Implement rate limiting to prevent spam
3. **Saved Presets**: Limit to 10 presets per user to prevent abuse
4. **Validation**: Validate all filter inputs client-side and server-side
5. **Cron Job**: Check alerts every 15 minutes for instant alerts

## Gotchas
1. **Complex Queries**: Combining many filters can be slow - optimize with caching
2. **Alert Spam**: Users may get too many alerts - implement smart throttling
3. **False Positives**: Pattern detection may not be 100% accurate - set expectations
4. **Marketplace Integration**: Real-time filtering requires API access to all marketplaces
5. **Mobile UX**: Advanced filter UI is complex - simplify for mobile

## Status Checklist
- [ ] Database schema created and migrated
- [ ] PatternFilterService implemented
- [ ] Filter validation working
- [ ] Alert system functional
- [ ] API endpoints created
- [ ] Advanced search page built
- [ ] Preset management UI completed
- [ ] Alert dashboard created
- [ ] Cron job for alerts configured
- [ ] Performance optimization completed
- [ ] Unit tests written (95% coverage)
- [ ] Integration tests written
- [ ] Documentation completed

## Related Features
- **Feature 26**: Pattern/Float Database (data source)
- **Feature 17**: Advanced Deal Alerts (alert infrastructure)
- **Feature 28**: User Profiles (saved preset profiles)

## References
- [Elasticsearch](https://www.elastic.co/) (if using for advanced search)
- [PostgreSQL JSONB Indexing](https://www.postgresql.org/docs/current/datatype-json.html)
- [Filter UI Patterns](https://www.nngroup.com/articles/filters-vs-facets/)
