# Feature 29: Loadout Sharing

## Overview
Create, save, and share complete CS2 weapon loadouts (all 10 weapon slots + knife + gloves) with community. Users can browse popular loadouts, save favorites, import loadouts to their inventory, and generate shareable links/images for social media. Essential for showcasing complete skin collections and discovering themed loadout ideas.

## User Segments
- **Primary**: Hobbyists, Collectors, Content Creators
- **Secondary**: Casual Traders, Investors
- **Tertiary**: Bulk Traders

## User Stories

### As a Hobbyist
- I want to create and save my current in-game loadout
- I want to browse popular loadouts for inspiration
- I want to save my favorite loadouts to a collection
- I want to share my loadout with friends via link
- I want to see loadout cost (total value of all skins)

### As a Collector
- I want to showcase my themed loadouts (e.g., "Blue Gem Collection", "Kato 2014 Loadout")
- I want to create wish list loadouts (skins I want to buy)
- I want to compare my loadout with others
- I want to generate a screenshot of my loadout for social media

### As a Content Creator
- I want to create loadouts for YouTube thumbnails
- I want my loadouts to go viral and gain followers
- I want loadout analytics (views, likes, saves)
- I want to watermark loadout screenshots

### As the Platform
- I want loadouts to drive engagement and sharing
- I want loadout images to rank in Google Images
- I want loadouts to drive traffic back to site
- I want to showcase user creativity

## Research & Context

### CS2 Loadout Structure

**10 Weapon Slots:**
1. Knife
2. Gloves
3. USP-S / P2000 (CT Pistol)
4. Glock-18 (T Pistol)
5. Five-SeveN / CZ75-Auto (CT Secondary)
6. Tec-9 / CZ75-Auto (T Secondary)
7. M4A4 / M4A1-S (CT Rifle)
8. AK-47 (T Rifle)
9. AWP (Sniper)
10. Additional slots: Desert Eagle, MAC-10, MP9, etc.

**Loadout Metadata:**
- Loadout name
- Description
- Theme/category (Blue Gem, Kato, Budget, etc.)
- Total cost
- Creation date
- Creator

### Competitor Analysis
- **Steam Loadout**: No sharing features
- **CS.Money**: 3D loadout viewer, no social sharing
- **CSGOStash**: No loadout feature
- **Opportunity**: First social loadout sharing platform for CS2

### Loadout Categories
- **Themed**: Blue gems, Kato 2014, Fade collection
- **Budget**: <$100, <$500, <$1000
- **Pro Player**: S1mple's loadout, NiKo's loadout
- **Color Coordinated**: All red, all blue, rainbow
- **Meme**: Funny/ironic loadouts

## Technical Requirements

### Database Schema

```sql
-- Loadouts
CREATE TABLE loadouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Loadout metadata
  loadout_name VARCHAR(255) NOT NULL,
  description TEXT,
  theme VARCHAR(100), -- 'blue_gem', 'kato_2014', 'budget', 'pro_player', 'color_coordinated'
  category VARCHAR(50), -- 'showcase', 'wishlist', 'budget_build'

  -- Weapon slots (market_hash_names or pattern-specific IDs)
  knife_slot VARCHAR(255),
  gloves_slot VARCHAR(255),
  ct_pistol_slot VARCHAR(255),
  t_pistol_slot VARCHAR(255),
  ct_secondary_slot VARCHAR(255),
  t_secondary_slot VARCHAR(255),
  ct_rifle_slot VARCHAR(255),
  t_rifle_slot VARCHAR(255),
  awp_slot VARCHAR(255),
  extra_slot_1 VARCHAR(255), -- Desert Eagle, etc.
  extra_slot_2 VARCHAR(255),
  extra_slot_3 VARCHAR(255),

  -- Specific item IDs (if user owns these exact items)
  knife_item_id UUID REFERENCES inventory_items(id),
  gloves_item_id UUID REFERENCES inventory_items(id),
  -- ... (repeat for all slots)

  -- Cost calculation
  total_cost DECIMAL(12,2),

  -- Social
  is_public BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,

  -- Screenshot
  screenshot_url TEXT, -- Generated loadout image
  screenshot_watermark BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_loadouts_user_id (user_id),
  INDEX idx_loadouts_public (is_public, created_at DESC),
  INDEX idx_loadouts_popular (like_count DESC, view_count DESC)
);

-- Loadout likes
CREATE TABLE loadout_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loadout_id UUID NOT NULL REFERENCES loadouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(loadout_id, user_id),
  INDEX idx_loadout_likes_user_id (user_id)
);

-- Loadout saves (bookmarks)
CREATE TABLE loadout_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loadout_id UUID NOT NULL REFERENCES loadouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collection_name VARCHAR(255), -- Optional: organize saved loadouts
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(loadout_id, user_id),
  INDEX idx_loadout_saves_user_id (user_id)
);

-- Loadout comments
CREATE TABLE loadout_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loadout_id UUID NOT NULL REFERENCES loadouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_loadout_comments_loadout_id (loadout_id, created_at DESC)
);

-- Loadout tags (for discovery)
CREATE TABLE loadout_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loadout_id UUID NOT NULL REFERENCES loadouts(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL, -- 'blue_gem', 'budget', 'kato', 'fade'
  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_loadout_tags_tag (tag),
  INDEX idx_loadout_tags_loadout_id (loadout_id)
);
```

### Services

#### `src/services/LoadoutSharingService.ts`

```typescript
import { db } from '@/lib/db';
import { uploadToR2 } from '@/lib/cloudflare-r2';

interface LoadoutData {
  loadoutName: string;
  description?: string;
  theme?: string;
  category?: string;
  weapons: {
    knife?: string;
    gloves?: string;
    ctPistol?: string;
    tPistol?: string;
    ctSecondary?: string;
    tSecondary?: string;
    ctRifle?: string;
    tRifle?: string;
    awp?: string;
    extra1?: string;
    extra2?: string;
    extra3?: string;
  };
  isPublic?: boolean;
  tags?: string[];
}

export class LoadoutSharingService {
  /**
   * Create a new loadout
   */
  async createLoadout(userId: string, data: LoadoutData): Promise<string> {
    // Calculate total cost
    const totalCost = await this.calculateLoadoutCost(data.weapons);

    const loadout = await db.loadouts.create({
      data: {
        user_id: userId,
        loadout_name: data.loadoutName,
        description: data.description,
        theme: data.theme,
        category: data.category,
        knife_slot: data.weapons.knife,
        gloves_slot: data.weapons.gloves,
        ct_pistol_slot: data.weapons.ctPistol,
        t_pistol_slot: data.weapons.tPistol,
        ct_secondary_slot: data.weapons.ctSecondary,
        t_secondary_slot: data.weapons.tSecondary,
        ct_rifle_slot: data.weapons.ctRifle,
        t_rifle_slot: data.weapons.tRifle,
        awp_slot: data.weapons.awp,
        extra_slot_1: data.weapons.extra1,
        extra_slot_2: data.weapons.extra2,
        extra_slot_3: data.weapons.extra3,
        total_cost: totalCost,
        is_public: data.isPublic !== false,
      },
    });

    // Add tags
    if (data.tags && data.tags.length > 0) {
      for (const tag of data.tags) {
        await db.loadout_tags.create({
          data: {
            loadout_id: loadout.id,
            tag: tag.toLowerCase(),
          },
        });
      }
    }

    // Generate screenshot
    await this.generateScreenshot(loadout.id);

    return loadout.id;
  }

  /**
   * Calculate total cost of loadout
   */
  private async calculateLoadoutCost(weapons: any): Promise<number> {
    let totalCost = 0;

    for (const weaponName of Object.values(weapons)) {
      if (!weaponName) continue;

      const marketItem = await db.market_items.findFirst({
        where: { market_hash_name: weaponName as string },
      });

      if (marketItem) {
        totalCost += marketItem.median_price || 0;
      }
    }

    return totalCost;
  }

  /**
   * Get loadout by ID
   */
  async getLoadout(loadoutId: string, viewerId?: string): Promise<any> {
    const loadout = await db.loadouts.findUnique({
      where: { id: loadoutId },
      include: {
        user: {
          select: { id: true, name: true, image: true },
          include: { profile: { select: { username: true } } },
        },
      },
    });

    if (!loadout) {
      throw new Error('Loadout not found');
    }

    // Increment view count
    await db.loadouts.update({
      where: { id: loadoutId },
      data: { view_count: { increment: 1 } },
    });

    // Check if viewer liked/saved
    let isLiked = false;
    let isSaved = false;

    if (viewerId) {
      const like = await db.loadout_likes.findFirst({
        where: { loadout_id: loadoutId, user_id: viewerId },
      });
      isLiked = !!like;

      const save = await db.loadout_saves.findFirst({
        where: { loadout_id: loadoutId, user_id: viewerId },
      });
      isSaved = !!save;
    }

    // Get tags
    const tags = await db.loadout_tags.findMany({
      where: { loadout_id: loadoutId },
    });

    return {
      ...loadout,
      isLiked,
      isSaved,
      tags: tags.map((t) => t.tag),
    };
  }

  /**
   * Get public loadouts (gallery)
   */
  async getPublicLoadouts(
    page: number = 1,
    pageSize: number = 24,
    filters?: {
      theme?: string;
      tags?: string[];
      sortBy?: 'recent' | 'popular' | 'expensive';
      userId?: string;
    }
  ) {
    const offset = (page - 1) * pageSize;

    const where: any = { is_public: true };

    if (filters?.theme) {
      where.theme = filters.theme;
    }

    if (filters?.userId) {
      where.user_id = filters.userId;
    }

    if (filters?.tags && filters.tags.length > 0) {
      // Filter by tags (loadout must have at least one matching tag)
      const loadoutsWithTags = await db.loadout_tags.findMany({
        where: { tag: { in: filters.tags } },
        select: { loadout_id: true },
        distinct: ['loadout_id'],
      });

      const loadoutIds = loadoutsWithTags.map((lt) => lt.loadout_id);
      where.id = { in: loadoutIds };
    }

    let orderBy: any = { created_at: 'desc' }; // Default: recent

    if (filters?.sortBy === 'popular') {
      orderBy = [{ like_count: 'desc' }, { view_count: 'desc' }];
    } else if (filters?.sortBy === 'expensive') {
      orderBy = { total_cost: 'desc' };
    }

    const loadouts = await db.loadouts.findMany({
      where,
      orderBy,
      skip: offset,
      take: pageSize,
      include: {
        user: {
          select: { id: true, name: true, image: true },
          include: { profile: { select: { username: true } } },
        },
      },
    });

    const total = await db.loadouts.count({ where });

    return {
      loadouts,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Like/unlike loadout
   */
  async toggleLike(loadoutId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    const existing = await db.loadout_likes.findFirst({
      where: { loadout_id: loadoutId, user_id: userId },
    });

    if (existing) {
      // Unlike
      await db.loadout_likes.delete({ where: { id: existing.id } });
      await db.loadouts.update({
        where: { id: loadoutId },
        data: { like_count: { decrement: 1 } },
      });

      const loadout = await db.loadouts.findUnique({ where: { id: loadoutId } });
      return { liked: false, likeCount: loadout?.like_count || 0 };
    } else {
      // Like
      await db.loadout_likes.create({
        data: { loadout_id: loadoutId, user_id: userId },
      });
      await db.loadouts.update({
        where: { id: loadoutId },
        data: { like_count: { increment: 1 } },
      });

      const loadout = await db.loadouts.findUnique({ where: { id: loadoutId } });
      return { liked: true, likeCount: loadout?.like_count || 0 };
    }
  }

  /**
   * Save/unsave loadout
   */
  async toggleSave(loadoutId: string, userId: string, collectionName?: string): Promise<{ saved: boolean }> {
    const existing = await db.loadout_saves.findFirst({
      where: { loadout_id: loadoutId, user_id: userId },
    });

    if (existing) {
      // Unsave
      await db.loadout_saves.delete({ where: { id: existing.id } });
      await db.loadouts.update({
        where: { id: loadoutId },
        data: { save_count: { decrement: 1 } },
      });

      return { saved: false };
    } else {
      // Save
      await db.loadout_saves.create({
        data: {
          loadout_id: loadoutId,
          user_id: userId,
          collection_name: collectionName,
        },
      });
      await db.loadouts.update({
        where: { id: loadoutId },
        data: { save_count: { increment: 1 } },
      });

      return { saved: true };
    }
  }

  /**
   * Get user's saved loadouts
   */
  async getSavedLoadouts(userId: string): Promise<any[]> {
    const saves = await db.loadout_saves.findMany({
      where: { user_id: userId },
      include: {
        loadout: {
          include: {
            user: {
              select: { id: true, name: true, image: true },
              include: { profile: { select: { username: true } } },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return saves.map((s) => s.loadout);
  }

  /**
   * Generate loadout screenshot
   */
  async generateScreenshot(loadoutId: string, includeWatermark: boolean = false): Promise<string> {
    // TODO: Generate visual representation of loadout
    // Options:
    // 1. Puppeteer + HTML/CSS template
    // 2. Canvas API (node-canvas)
    // 3. External service (Cloudinary, Imgix)

    // Placeholder implementation
    const loadout = await db.loadouts.findUnique({ where: { id: loadoutId } });
    if (!loadout) throw new Error('Loadout not found');

    // For now, return placeholder URL
    const screenshotUrl = `https://placeholder.com/loadout/${loadoutId}.png`;

    // Update loadout
    await db.loadouts.update({
      where: { id: loadoutId },
      data: {
        screenshot_url: screenshotUrl,
        screenshot_watermark: includeWatermark,
      },
    });

    return screenshotUrl;
  }

  /**
   * Add comment to loadout
   */
  async addComment(loadoutId: string, userId: string, commentText: string): Promise<void> {
    await db.loadout_comments.create({
      data: {
        loadout_id: loadoutId,
        user_id: userId,
        comment_text: commentText,
      },
    });
  }

  /**
   * Get loadout comments
   */
  async getComments(loadoutId: string): Promise<any[]> {
    return await db.loadout_comments.findMany({
      where: { loadout_id: loadoutId },
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });
  }

  /**
   * Get trending loadouts
   */
  async getTrendingLoadouts(days: number = 7, limit: number = 20): Promise<any[]> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get loadouts with most likes in last X days
    const recentLikes = await db.loadout_likes.groupBy({
      by: ['loadout_id'],
      where: {
        created_at: { gte: cutoffDate },
      },
      _count: true,
      orderBy: {
        _count: {
          loadout_id: 'desc',
        },
      },
      take: limit,
    });

    const loadoutIds = recentLikes.map((rl) => rl.loadout_id);

    return await db.loadouts.findMany({
      where: { id: { in: loadoutIds } },
      include: {
        user: {
          select: { id: true, name: true, image: true },
          include: { profile: { select: { username: true } } },
        },
      },
    });
  }

  /**
   * Import user's current Steam inventory as loadout
   */
  async importFromInventory(userId: string, loadoutName: string): Promise<string> {
    // Get user's inventory
    const inventory = await db.inventory_items.findMany({
      where: { user_id: userId },
    });

    // Auto-select best items for each slot
    const weapons: any = {};

    // Find knife (most expensive)
    const knives = inventory.filter((item) => item.item_name.includes('Knife') || item.item_name.includes('Karambit'));
    if (knives.length > 0) {
      knives.sort((a, b) => (b.current_value || 0) - (a.current_value || 0));
      weapons.knife = knives[0].market_hash_name;
    }

    // Find gloves
    const gloves = inventory.filter((item) => item.item_name.includes('Gloves'));
    if (gloves.length > 0) {
      gloves.sort((a, b) => (b.current_value || 0) - (a.current_value || 0));
      weapons.gloves = gloves[0].market_hash_name;
    }

    // Find AK-47
    const ak47s = inventory.filter((item) => item.item_name.includes('AK-47'));
    if (ak47s.length > 0) {
      ak47s.sort((a, b) => (b.current_value || 0) - (a.current_value || 0));
      weapons.tRifle = ak47s[0].market_hash_name;
    }

    // Find M4A4 or M4A1-S
    const m4s = inventory.filter((item) => item.item_name.includes('M4A4') || item.item_name.includes('M4A1-S'));
    if (m4s.length > 0) {
      m4s.sort((a, b) => (b.current_value || 0) - (a.current_value || 0));
      weapons.ctRifle = m4s[0].market_hash_name;
    }

    // Find AWP
    const awps = inventory.filter((item) => item.item_name.includes('AWP'));
    if (awps.length > 0) {
      awps.sort((a, b) => (b.current_value || 0) - (a.current_value || 0));
      weapons.awp = awps[0].market_hash_name;
    }

    // Create loadout
    return await this.createLoadout(userId, {
      loadoutName,
      description: 'Imported from my inventory',
      category: 'showcase',
      weapons,
      isPublic: true,
    });
  }
}

export const loadoutSharingService = new LoadoutSharingService();
```

### API Endpoints

#### `src/app/api/loadouts/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadoutSharingService } from '@/services/LoadoutSharingService';

// POST /api/loadouts - Create loadout
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const loadoutId = await loadoutSharingService.createLoadout(session.user.id, data);

    return NextResponse.json({ loadoutId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/loadouts - Get public loadouts
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const sortBy = searchParams.get('sortBy') as any;
    const theme = searchParams.get('theme') || undefined;
    const tags = searchParams.get('tags')?.split(',') || undefined;

    const result = await loadoutSharingService.getPublicLoadouts(page, 24, { sortBy, theme, tags });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## Frontend Components

### `src/app/loadouts/create/page.tsx`

```typescript
'use client';

import { useState } from 'react';

export default function CreateLoadoutPage() {
  const [loadout, setLoadout] = useState({
    loadoutName: '',
    description: '',
    theme: '',
    weapons: {
      knife: '',
      gloves: '',
      ctPistol: '',
      tPistol: '',
      ctRifle: '',
      tRifle: '',
      awp: '',
    },
  });

  const handleSubmit = async () => {
    const res = await fetch('/api/loadouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loadout),
    });

    const data = await res.json();
    if (data.loadoutId) {
      alert('Loadout created!');
      window.location.href = `/loadouts/${data.loadoutId}`;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6">Create Loadout</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Loadout Name</label>
          <input
            type="text"
            value={loadout.loadoutName}
            onChange={(e) => setLoadout({ ...loadout, loadoutName: e.target.value })}
            placeholder="e.g., Blue Gem Collection"
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={loadout.description}
            onChange={(e) => setLoadout({ ...loadout, description: e.target.value })}
            rows={3}
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {[
            { label: 'Knife', key: 'knife' },
            { label: 'Gloves', key: 'gloves' },
            { label: 'CT Pistol', key: 'ctPistol' },
            { label: 'T Pistol', key: 'tPistol' },
            { label: 'CT Rifle', key: 'ctRifle' },
            { label: 'T Rifle', key: 'tRifle' },
            { label: 'AWP', key: 'awp' },
          ].map((slot) => (
            <div key={slot.key}>
              <label className="block text-sm font-medium mb-1">{slot.label}</label>
              <input
                type="text"
                value={loadout.weapons[slot.key as keyof typeof loadout.weapons]}
                onChange={(e) =>
                  setLoadout({
                    ...loadout,
                    weapons: { ...loadout.weapons, [slot.key]: e.target.value },
                  })
                }
                placeholder="e.g., AK-47 | Case Hardened (FT)"
                className="w-full border rounded-lg p-2"
              />
            </div>
          ))}
        </div>

        <button onClick={handleSubmit} className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700">
          Create Loadout
        </button>
      </div>
    </div>
  );
}
```

## Success Metrics
1. **Creation Rate**: 30%+ of users create at least 1 loadout
2. **Sharing**: 40%+ of loadouts are shared externally
3. **Social Engagement**: 500+ likes/saves per day across all loadouts
4. **Viral Potential**: 10+ loadouts with 1,000+ likes
5. **Traffic**: Loadout pages drive 20%+ of site traffic
6. **SEO**: Loadout images rank in Google Images

## Dependencies
- **Feature 03**: Price Tracking (cost calculation)
- **Feature 11**: Multi-Account Dashboard (inventory import)
- **Feature 28**: User Profiles (featured loadouts)

## Effort Estimate
- **Database Schema**: 5 hours
- **LoadoutSharingService**: 14 hours
- **Screenshot Generation**: 12 hours
- **API Endpoints**: 4 hours
- **Create Loadout Page**: 12 hours
- **Loadout Gallery Page**: 10 hours
- **Loadout Detail Page**: 10 hours
- **Social Features**: 6 hours
- **Testing**: 6 hours
- **Total**: ~79 hours (~2 weeks)

## Implementation Notes
1. **Screenshot Generation**: Use Puppeteer to render HTML template as image
2. **Image Optimization**: Compress screenshots to <500KB for fast sharing
3. **Social Meta Tags**: Add Open Graph tags for rich previews on Twitter/Facebook
4. **Loadout Templates**: Provide pre-made templates (Blue Gem, Kato, etc.)
5. **Import from Inventory**: Auto-populate loadout from user's inventory

## Gotchas
1. **Screenshot Quality**: Generating high-quality weapon renders is challenging
2. **Copyright**: CS2 weapon models are Valve property - check legal use
3. **Performance**: Screenshot generation can be slow - queue async jobs
4. **Mobile UX**: Loadout creation is complex on mobile - simplify UI
5. **Incomplete Loadouts**: Allow saving incomplete loadouts (not all slots filled)

## Status Checklist
- [ ] Database schema created and migrated
- [ ] LoadoutSharingService implemented
- [ ] Cost calculation working
- [ ] Screenshot generation functional
- [ ] API endpoints created
- [ ] Create loadout page built
- [ ] Loadout gallery page created
- [ ] Loadout detail page completed
- [ ] Social features (likes, saves, comments) working
- [ ] Import from inventory functional
- [ ] SEO meta tags configured
- [ ] Unit tests written (95% coverage)
- [ ] Integration tests written
- [ ] Documentation completed

## Related Features
- **Feature 23**: Craft Simulator (loadout weapons can be crafts)
- **Feature 28**: User Profiles (featured loadouts)
- **Feature 30**: Educational Content (loadout guides)

## References
- [CS.Money 3D Viewer](https://cs.money/3d-viewer)
- [Puppeteer](https://pptr.dev/) (screenshot generation)
- [Open Graph Protocol](https://ogp.me/) (social sharing)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) (image generation)
