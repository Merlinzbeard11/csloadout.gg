# Feature 23: Craft Simulator

## Overview
Interactive craft simulator that allows users to preview how skins will look with different sticker combinations, calculate craft costs, and save/share their dream crafts. Helps users visualize expensive crafts before committing thousands of dollars, and serves as inspiration for the crafting community.

## User Segments
- **Primary**: Hobbyists, Collectors
- **Secondary**: Investors, Content Creators
- **Tertiary**: Casual Traders, Bulk Traders

## User Stories

### As a Hobbyist/Collector
- I want to preview how a skin will look with specific stickers before spending $500+ on the craft
- I want to see the total cost of a craft (skin + stickers + scraping costs)
- I want to save my dream crafts for future reference
- I want to share my craft ideas with friends to get feedback
- I want to browse other users' crafts for inspiration
- I want to see which sticker positions look best on specific skins

### As an Investor
- I want to calculate craft ROI (cost vs resale value)
- I want to identify undervalued craft opportunities
- I want to see market demand for specific craft combinations
- I want to track craft trends (which sticker combos are popular)

### As a Content Creator
- I want to showcase my unique crafts on social media
- I want to create craft guides/tutorials with visual examples
- I want to generate thumbnails of crafts for YouTube videos
- I want to watermark my craft designs

### As the Platform
- I want to drive engagement through user-generated craft content
- I want to increase session time with interactive craft previews
- I want to create a community around CS2 crafting
- I want to capture craft data for investment insights

## Research & Context

### CS2 Crafting Fundamentals

1. **Sticker Application**
   - Each skin can have up to 4 stickers
   - Sticker positions vary by weapon type
   - Stickers cost $0.03 - $100,000+ (Katowice 2014 Titan Holo)

2. **Scraping Mechanics**
   - Stickers can be scraped to reduce opacity
   - Each scrape reduces sticker wear by ~7-15%
   - Scraping is irreversible
   - Popular for "low-float" sticker looks

3. **Craft Value Formula**
   - Craft Cost = Skin + Sticker 1 + Sticker 2 + Sticker 3 + Sticker 4
   - Resale Value = Skin + (Stickers × Sticker %)
   - Sticker % = 0.5% - 100% depending on demand/rarity
   - Expensive crafts (4x Katowice 2014) can have 50%+ sticker value

4. **Popular Craft Types**
   - **Themed Crafts**: All stickers match color/theme (e.g., 4x Crown Foil)
   - **Kato Crafts**: Katowice 2014 stickers (extremely expensive)
   - **Signature Crafts**: Pro player signatures
   - **Meme Crafts**: Funny/ironic combinations

### Existing Tools
- **CSFloat Craft Simulator**: Basic 2D preview, no cost calculator
- **CS.Money 3D Viewer**: 3D skin inspection, no craft simulation
- **Steam Inventory**: No craft preview at all
- **Opportunity**: Combine 3D preview + cost calculator + social sharing

### Community Pain Points
1. **Fear of Expensive Mistakes**: Users hesitate to spend $1,000+ without preview
2. **Sticker Position Uncertainty**: Not sure which positions look best
3. **Cost Transparency**: Hidden costs (skin + stickers + fees)
4. **Inspiration**: Hard to discover craft ideas
5. **Sharing**: No easy way to share craft screenshots

## Technical Requirements

### Database Schema

```sql
-- User-created craft designs
CREATE TABLE crafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Craft details
  craft_name VARCHAR(255) NOT NULL,
  skin_market_hash_name VARCHAR(255) NOT NULL,
  skin_float DECIMAL(10,8), -- Optional specific float
  skin_pattern_index INTEGER, -- Optional specific pattern

  -- Sticker slots (4 max)
  sticker_slot_1 VARCHAR(255), -- Sticker market_hash_name
  sticker_slot_2 VARCHAR(255),
  sticker_slot_3 VARCHAR(255),
  sticker_slot_4 VARCHAR(255),

  -- Sticker wear (scraping %)
  sticker_wear_1 DECIMAL(5,2) DEFAULT 0.00, -- 0.00 = pristine, 100.00 = fully scraped
  sticker_wear_2 DECIMAL(5,2) DEFAULT 0.00,
  sticker_wear_3 DECIMAL(5,2) DEFAULT 0.00,
  sticker_wear_4 DECIMAL(5,2) DEFAULT 0.00,

  -- Cost calculations
  skin_cost DECIMAL(10,2),
  sticker_cost_total DECIMAL(10,2),
  craft_cost_total DECIMAL(10,2), -- Skin + stickers
  estimated_resale_value DECIMAL(10,2),
  estimated_roi_percentage DECIMAL(5,2),

  -- Metadata
  description TEXT,
  tags VARCHAR(255)[], -- e.g., ['themed', 'kato', 'crown']
  is_public BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,

  -- Screenshot/render
  screenshot_url TEXT, -- Cloudflare R2 or similar

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_crafts_user_id (user_id),
  INDEX idx_crafts_skin (skin_market_hash_name),
  INDEX idx_crafts_public (is_public, created_at DESC),
  INDEX idx_crafts_popular (like_count DESC, view_count DESC)
);

-- Craft likes (favorites)
CREATE TABLE craft_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  craft_id UUID NOT NULL REFERENCES crafts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(craft_id, user_id),
  INDEX idx_craft_likes_user_id (user_id, created_at DESC)
);

-- Craft comments
CREATE TABLE craft_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  craft_id UUID NOT NULL REFERENCES crafts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_craft_comments_craft_id (craft_id, created_at DESC)
);

-- Sticker position metadata (per weapon type)
CREATE TABLE sticker_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weapon_type VARCHAR(100) NOT NULL, -- 'ak47', 'awp', 'm4a4', etc.
  slot_number INTEGER NOT NULL, -- 1-4

  -- 3D position data (for rendering)
  position_x DECIMAL(8,4),
  position_y DECIMAL(8,4),
  position_z DECIMAL(8,4),
  rotation_x DECIMAL(8,4),
  rotation_y DECIMAL(8,4),
  rotation_z DECIMAL(8,4),
  scale DECIMAL(8,4) DEFAULT 1.0,

  -- Visual priority (which positions are most visible)
  visibility_score INTEGER DEFAULT 50, -- 0-100, higher = more visible

  UNIQUE(weapon_type, slot_number)
);

-- Craft trends (track popular combinations)
CREATE TABLE craft_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Trend identification
  skin_market_hash_name VARCHAR(255) NOT NULL,
  sticker_combination VARCHAR(500), -- JSON array of sticker names

  -- Trend metrics
  craft_count INTEGER DEFAULT 0, -- How many users created this combo
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  trend_score DECIMAL(8,2), -- Calculated popularity score

  -- Time period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_craft_trends_period (period_start, period_end),
  INDEX idx_craft_trends_score (trend_score DESC)
);
```

### Services

#### `src/services/CraftSimulatorService.ts`

```typescript
import { db } from '@/lib/db';
import { uploadToR2 } from '@/lib/cloudflare-r2';

interface CraftDetails {
  craftName: string;
  skinMarketHashName: string;
  skinFloat?: number;
  skinPatternIndex?: number;
  stickers: {
    slot1?: string;
    slot2?: string;
    slot3?: string;
    slot4?: string;
  };
  stickerWear: {
    slot1?: number;
    slot2?: number;
    slot3?: number;
    slot4?: number;
  };
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}

interface CraftCost {
  skinCost: number;
  stickerCosts: number[];
  totalStickerCost: number;
  totalCraftCost: number;
  estimatedResaleValue: number;
  estimatedRoi: number;
}

export class CraftSimulatorService {
  /**
   * Create a new craft design
   */
  async createCraft(userId: string, details: CraftDetails): Promise<string> {
    // Calculate costs
    const costs = await this.calculateCraftCost(details);

    // Create craft record
    const craft = await db.crafts.create({
      data: {
        user_id: userId,
        craft_name: details.craftName,
        skin_market_hash_name: details.skinMarketHashName,
        skin_float: details.skinFloat,
        skin_pattern_index: details.skinPatternIndex,
        sticker_slot_1: details.stickers.slot1,
        sticker_slot_2: details.stickers.slot2,
        sticker_slot_3: details.stickers.slot3,
        sticker_slot_4: details.stickers.slot4,
        sticker_wear_1: details.stickerWear.slot1 || 0,
        sticker_wear_2: details.stickerWear.slot2 || 0,
        sticker_wear_3: details.stickerWear.slot3 || 0,
        sticker_wear_4: details.stickerWear.slot4 || 0,
        skin_cost: costs.skinCost,
        sticker_cost_total: costs.totalStickerCost,
        craft_cost_total: costs.totalCraftCost,
        estimated_resale_value: costs.estimatedResaleValue,
        estimated_roi_percentage: costs.estimatedRoi,
        description: details.description,
        tags: details.tags,
        is_public: details.isPublic !== false, // Default true
      },
    });

    // Track trend
    await this.trackCraftTrend(details);

    return craft.id;
  }

  /**
   * Calculate craft cost and ROI
   */
  async calculateCraftCost(details: CraftDetails): Promise<CraftCost> {
    // Get skin price
    const skinData = await db.market_items.findFirst({
      where: { market_hash_name: details.skinMarketHashName },
    });
    const skinCost = skinData?.median_price || 0;

    // Get sticker prices
    const stickerNames = Object.values(details.stickers).filter(Boolean);
    const stickerCosts: number[] = [];

    for (const stickerName of stickerNames) {
      const stickerData = await db.market_items.findFirst({
        where: { market_hash_name: stickerName },
      });
      stickerCosts.push(stickerData?.median_price || 0);
    }

    const totalStickerCost = stickerCosts.reduce((sum, cost) => sum + cost, 0);
    const totalCraftCost = skinCost + totalStickerCost;

    // Estimate resale value
    // Rule: Skin price + (Sticker value × sticker %)
    // Sticker % depends on sticker tier:
    // - Katowice 2014: 50-80%
    // - Crown Foil: 30-50%
    // - Holo stickers: 10-30%
    // - Regular stickers: 0.5-5%

    const stickerPercentage = this.estimateStickerPercentage(stickerNames);
    const estimatedResaleValue = skinCost + (totalStickerCost * (stickerPercentage / 100));
    const estimatedRoi = ((estimatedResaleValue - totalCraftCost) / totalCraftCost) * 100;

    return {
      skinCost,
      stickerCosts,
      totalStickerCost,
      totalCraftCost,
      estimatedResaleValue,
      estimatedRoi,
    };
  }

  /**
   * Estimate sticker value retention percentage
   */
  private estimateStickerPercentage(stickerNames: string[]): number {
    // Check for high-value stickers
    const hasKato2014 = stickerNames.some((name) => name.includes('Katowice 2014'));
    const hasCrown = stickerNames.some((name) => name.includes('Crown (Foil)'));
    const hasHolo = stickerNames.some((name) => name.includes('Holo'));

    if (hasKato2014) return 60; // 60% average for Kato 2014
    if (hasCrown) return 40; // 40% for Crown Foil
    if (hasHolo) return 20; // 20% for holo stickers
    return 2; // 2% for regular stickers
  }

  /**
   * Get craft by ID
   */
  async getCraft(craftId: string, viewerId?: string): Promise<any> {
    const craft = await db.crafts.findUnique({
      where: { id: craftId },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    if (!craft) {
      throw new Error('Craft not found');
    }

    // Increment view count
    await db.crafts.update({
      where: { id: craftId },
      data: { view_count: { increment: 1 } },
    });

    // Check if viewer liked this craft
    let isLiked = false;
    if (viewerId) {
      const like = await db.craft_likes.findFirst({
        where: { craft_id: craftId, user_id: viewerId },
      });
      isLiked = !!like;
    }

    return { ...craft, isLiked };
  }

  /**
   * Get public crafts (gallery/feed)
   */
  async getPublicCrafts(page: number = 1, pageSize: number = 20, filters?: {
    skinName?: string;
    tags?: string[];
    sortBy?: 'recent' | 'popular' | 'trending';
  }) {
    const offset = (page - 1) * pageSize;

    let orderBy: any = { created_at: 'desc' }; // Default: recent

    if (filters?.sortBy === 'popular') {
      orderBy = { like_count: 'desc' };
    } else if (filters?.sortBy === 'trending') {
      orderBy = [{ like_count: 'desc' }, { created_at: 'desc' }];
    }

    const where: any = { is_public: true };

    if (filters?.skinName) {
      where.skin_market_hash_name = { contains: filters.skinName };
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    const crafts = await db.crafts.findMany({
      where,
      orderBy,
      skip: offset,
      take: pageSize,
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    const total = await db.crafts.count({ where });

    return {
      crafts,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Like/unlike a craft
   */
  async toggleLike(craftId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    const existing = await db.craft_likes.findFirst({
      where: { craft_id: craftId, user_id: userId },
    });

    if (existing) {
      // Unlike
      await db.craft_likes.delete({ where: { id: existing.id } });
      await db.crafts.update({
        where: { id: craftId },
        data: { like_count: { decrement: 1 } },
      });

      const craft = await db.crafts.findUnique({ where: { id: craftId } });
      return { liked: false, likeCount: craft?.like_count || 0 };
    } else {
      // Like
      await db.craft_likes.create({
        data: { craft_id: craftId, user_id: userId },
      });
      await db.crafts.update({
        where: { id: craftId },
        data: { like_count: { increment: 1 } },
      });

      const craft = await db.crafts.findUnique({ where: { id: craftId } });
      return { liked: true, likeCount: craft?.like_count || 0 };
    }
  }

  /**
   * Add comment to craft
   */
  async addComment(craftId: string, userId: string, commentText: string): Promise<void> {
    await db.craft_comments.create({
      data: {
        craft_id: craftId,
        user_id: userId,
        comment_text: commentText,
      },
    });
  }

  /**
   * Get comments for a craft
   */
  async getComments(craftId: string): Promise<any[]> {
    return await db.craft_comments.findMany({
      where: { craft_id: craftId },
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });
  }

  /**
   * Track craft trends
   */
  private async trackCraftTrend(details: CraftDetails): Promise<void> {
    const stickerCombination = JSON.stringify(Object.values(details.stickers).filter(Boolean).sort());

    const today = new Date();
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay())); // Start of week

    await db.craft_trends.upsert({
      where: {
        skin_market_hash_name_sticker_combination_period_start: {
          skin_market_hash_name: details.skinMarketHashName,
          sticker_combination: stickerCombination,
          period_start: weekStart,
        },
      },
      update: {
        craft_count: { increment: 1 },
      },
      create: {
        skin_market_hash_name: details.skinMarketHashName,
        sticker_combination: stickerCombination,
        craft_count: 1,
        period_start: weekStart,
        period_end: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000), // End of week
        trend_score: 1,
      },
    });
  }

  /**
   * Get trending crafts
   */
  async getTrendingCrafts(limit: number = 10): Promise<any[]> {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    return await db.craft_trends.findMany({
      where: {
        period_start: { gte: twoWeeksAgo },
      },
      orderBy: [
        { craft_count: 'desc' },
        { like_count: 'desc' },
      ],
      take: limit,
    });
  }

  /**
   * Generate craft screenshot (3D render)
   */
  async generateScreenshot(craftId: string): Promise<string> {
    // TODO: Integrate with 3D rendering service
    // Options:
    // 1. Three.js + headless Chrome (Puppeteer)
    // 2. Unity WebGL embed
    // 3. CS:GO API (if available)
    // 4. Third-party service like CSFloat API

    // For now, return placeholder
    const craft = await db.crafts.findUnique({ where: { id: craftId } });
    if (!craft) throw new Error('Craft not found');

    // Placeholder: Use CSFloat inspect link
    const inspectUrl = `https://s.cs.money/render/${craft.skin_market_hash_name}.png`;

    // Upload to Cloudflare R2
    const screenshotUrl = await uploadToR2(inspectUrl, `crafts/${craftId}.png`);

    // Update craft with screenshot URL
    await db.crafts.update({
      where: { id: craftId },
      data: { screenshot_url: screenshotUrl },
    });

    return screenshotUrl;
  }
}

export const craftSimulatorService = new CraftSimulatorService();
```

### API Endpoints

#### `src/app/api/crafts/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { craftSimulatorService } from '@/services/CraftSimulatorService';

// POST /api/crafts - Create a new craft
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const details = await req.json();
    const craftId = await craftSimulatorService.createCraft(session.user.id, details);

    return NextResponse.json({ craftId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/crafts - Get public crafts
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const sortBy = searchParams.get('sortBy') as 'recent' | 'popular' | 'trending' || 'recent';
    const skinName = searchParams.get('skinName') || undefined;
    const tags = searchParams.get('tags')?.split(',') || undefined;

    const result = await craftSimulatorService.getPublicCrafts(page, 20, { skinName, tags, sortBy });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### `src/app/api/crafts/[craftId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { craftSimulatorService } from '@/services/CraftSimulatorService';

// GET /api/crafts/[craftId] - Get craft details
export async function GET(req: NextRequest, { params }: { params: { craftId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const craft = await craftSimulatorService.getCraft(params.craftId, session?.user?.id);
    return NextResponse.json(craft);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## Frontend Components

### `src/app/craft-simulator/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { HeartIcon, ShareIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

export default function CraftSimulatorPage() {
  const [skinName, setSkinName] = useState('');
  const [stickers, setStickers] = useState({ slot1: '', slot2: '', slot3: '', slot4: '' });
  const [stickerWear, setStickerWear] = useState({ slot1: 0, slot2: 0, slot3: 0, slot4: 0 });
  const [cost, setCost] = useState<any>(null);

  const handleCalculateCost = async () => {
    const res = await fetch('/api/crafts/calculate-cost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skinMarketHashName: skinName, stickers, stickerWear }),
    });
    const data = await res.json();
    setCost(data);
  };

  const handleSaveCraft = async () => {
    const res = await fetch('/api/crafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        craftName: `${skinName} Craft`,
        skinMarketHashName: skinName,
        stickers,
        stickerWear,
        isPublic: true,
      }),
    });
    const data = await res.json();
    alert(`Craft saved! ID: ${data.craftId}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Craft Simulator</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Design Your Craft</h2>

          {/* Skin Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Skin</label>
            <input
              type="text"
              value={skinName}
              onChange={(e) => setSkinName(e.target.value)}
              placeholder="e.g., AK-47 | Redline (Field-Tested)"
              className="w-full border rounded-lg p-2"
            />
          </div>

          {/* Sticker Slots */}
          {[1, 2, 3, 4].map((slot) => (
            <div key={slot} className="mb-4">
              <label className="block text-sm font-medium mb-2">Sticker Slot {slot}</label>
              <input
                type="text"
                value={stickers[`slot${slot}` as keyof typeof stickers]}
                onChange={(e) => setStickers({ ...stickers, [`slot${slot}`]: e.target.value })}
                placeholder="e.g., Sticker | Crown (Foil)"
                className="w-full border rounded-lg p-2 mb-2"
              />
              <div className="flex items-center gap-2">
                <label className="text-sm">Wear: {stickerWear[`slot${slot}` as keyof typeof stickerWear]}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={stickerWear[`slot${slot}` as keyof typeof stickerWear]}
                  onChange={(e) => setStickerWear({ ...stickerWear, [`slot${slot}`]: parseInt(e.target.value) })}
                  className="flex-1"
                />
              </div>
            </div>
          ))}

          {/* Calculate Button */}
          <button
            onClick={handleCalculateCost}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 mb-2"
          >
            Calculate Cost
          </button>

          <button
            onClick={handleSaveCraft}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
          >
            Save Craft
          </button>
        </div>

        {/* Right: Preview + Cost */}
        <div className="space-y-6">
          {/* 3D Preview */}
          <div className="bg-gray-900 rounded-lg aspect-video flex items-center justify-center">
            <p className="text-white text-lg">3D Preview (Coming Soon)</p>
          </div>

          {/* Cost Breakdown */}
          {cost && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-4">Cost Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Skin Cost:</span>
                  <span className="font-medium">${cost.skinCost.toFixed(2)}</span>
                </div>
                {cost.stickerCosts.map((stickerCost: number, index: number) => (
                  <div key={index} className="flex justify-between">
                    <span>Sticker {index + 1}:</span>
                    <span className="font-medium">${stickerCost.toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                  <span>Total Craft Cost:</span>
                  <span className="text-blue-600">${cost.totalCraftCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Resale:</span>
                  <span className="font-medium text-green-600">${cost.estimatedResaleValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated ROI:</span>
                  <span className={`font-medium ${cost.estimatedRoi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {cost.estimatedRoi.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

## Success Metrics
1. **Adoption**: 40%+ of hobbyists use craft simulator before crafting
2. **Engagement**: Average session 8+ minutes (high engagement)
3. **Saves**: 30%+ of simulations result in saved crafts
4. **Sharing**: 15%+ of saved crafts are shared externally
5. **Gallery Traffic**: Craft gallery drives 20%+ of site traffic
6. **Craft Execution**: 10%+ of simulated crafts are actually crafted (conversion to action)

## Dependencies
- **Feature 03**: Price Tracking (sticker and skin prices)
- **Feature 25**: Sticker Database (sticker metadata)
- **Feature 26**: Pattern/Float Database (skin float/pattern data)

## Effort Estimate
- **Database Schema**: 5 hours
- **CraftSimulatorService**: 12 hours
- **Cost Calculator**: 6 hours
- **API Endpoints**: 4 hours
- **Craft Simulator Page**: 16 hours
- **3D Preview Integration**: 24 hours (complex - may require third-party)
- **Craft Gallery Page**: 10 hours
- **Social Features (likes, comments)**: 8 hours
- **Testing**: 8 hours
- **Total**: ~93 hours (2.3 weeks)

## Implementation Notes
1. **3D Rendering**: Consider using CSFloat API or CS.Money API for weapon renders
2. **Performance**: Cache rendered screenshots, don't re-render on every view
3. **Sticker Positions**: Manually map sticker positions for each weapon type (tedious but necessary)
4. **Scraping Accuracy**: Sticker wear percentage is approximate - warn users
5. **ROI Accuracy**: Sticker percentage estimates are rough - include disclaimer

## Gotchas
1. **3D Complexity**: Rendering CS2 skins with stickers in 3D is technically challenging
2. **Sticker Positioning**: Each weapon has different sticker positions - requires manual mapping
3. **Price Volatility**: Sticker prices fluctuate - costs can be outdated quickly
4. **Copyright**: Using CS2 assets may require Valve's permission
5. **Performance**: High-res 3D renders are slow - optimize with caching
6. **Mobile**: 3D viewer may not work well on mobile - provide fallback

## Status Checklist
- [ ] Database schema created and migrated
- [ ] CraftSimulatorService implemented
- [ ] Cost calculator tested
- [ ] API endpoints created
- [ ] Craft simulator page built
- [ ] 3D preview integration completed
- [ ] Craft gallery page created
- [ ] Social features (likes, comments) implemented
- [ ] Screenshot generation working
- [ ] Trending crafts algorithm tested
- [ ] Unit tests written (95% coverage)
- [ ] Integration tests written
- [ ] Documentation completed

## Related Features
- **Feature 24**: Craft Gallery (public gallery of crafts)
- **Feature 25**: Sticker Database (sticker catalog)
- **Feature 26**: Pattern/Float Database (skin patterns)
- **Feature 29**: Loadout Sharing (share crafts as part of loadouts)

## References
- [CSFloat Craft Simulator](https://csfloat.com/craft)
- [CS.Money 3D Viewer](https://cs.money/3d-viewer)
- [Three.js](https://threejs.org/) (3D rendering library)
- [Sticker % Calculation Guide](https://www.reddit.com/r/GlobalOffensiveTrade/comments/abc123/) (community)
