# Feature 24: Craft Gallery

## Overview
Public gallery showcasing user-created craft designs from the Craft Simulator. Serves as inspiration hub, social discovery feed, and community showcase. Users can browse, like, comment, and filter crafts by skin type, sticker combinations, cost ranges, and popularity.

## User Segments
- **Primary**: Hobbyists, Collectors, Content Creators
- **Secondary**: Casual Traders, Investors
- **Tertiary**: Bulk Traders, Wholesalers

## User Stories

### As a Hobbyist
- I want to browse popular craft designs for inspiration
- I want to filter crafts by skin type (e.g., only AK-47 crafts)
- I want to see crafts within my budget (filter by cost)
- I want to save crafts I like to my favorites
- I want to follow creators whose craft style I like

### As a Collector
- I want to see the most expensive/rare crafts
- I want to discover unique craft combinations I haven't seen
- I want to see "craft of the day/week" features
- I want to compare similar crafts side-by-side

### As a Content Creator
- I want to showcase my crafts to gain followers
- I want my crafts to trend and get featured
- I want analytics on my craft views/likes
- I want to watermark my crafts when shared

### As the Platform
- I want to increase time on site through gallery browsing
- I want to drive user-generated content creation
- I want to build a community around crafting
- I want to surface trending crafts to homepage

## Research & Context

### Social Gallery Patterns

1. **Pinterest Model**
   - Masonry grid layout (variable height cards)
   - Infinite scroll
   - Save to boards
   - Visual-first design

2. **Instagram Explore**
   - Algorithm-driven discovery
   - Like/comment/share
   - Hashtag filtering
   - Trending content surfacing

3. **Behance (Adobe)**
   - High-quality project showcases
   - Creator profiles
   - Categories and collections
   - Curated featured sections

### Key Features from Research
- Visual-first design (large images)
- Quick actions (like, save, share)
- Robust filtering (skin, stickers, cost)
- Creator attribution
- Trending/featured sections
- Mobile-optimized

## Technical Requirements

### Database Schema
(Uses tables from Feature 23: crafts, craft_likes, craft_comments, craft_trends)

Additional tables:

```sql
-- Featured crafts (curated by admins)
CREATE TABLE featured_crafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  craft_id UUID NOT NULL REFERENCES crafts(id) ON DELETE CASCADE,
  feature_type VARCHAR(50) NOT NULL, -- 'craft_of_day', 'craft_of_week', 'editor_pick', 'trending'
  featured_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  priority INTEGER DEFAULT 0, -- Higher priority shows first

  INDEX idx_featured_crafts_active (feature_type, expires_at DESC) WHERE expires_at > NOW()
);

-- User craft collections (like Pinterest boards)
CREATE TABLE craft_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collection_name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_craft_collections_user_id (user_id)
);

-- Collection items
CREATE TABLE craft_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES craft_collections(id) ON DELETE CASCADE,
  craft_id UUID NOT NULL REFERENCES crafts(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(collection_id, craft_id),
  INDEX idx_collection_items_collection_id (collection_id, added_at DESC)
);

-- Creator follows
CREATE TABLE creator_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(follower_id, creator_id),
  INDEX idx_creator_follows_follower_id (follower_id),
  INDEX idx_creator_follows_creator_id (creator_id)
);

-- Gallery analytics
CREATE TABLE craft_gallery_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  craft_id UUID NOT NULL REFERENCES crafts(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'view', 'like', 'comment', 'share', 'save'
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB, -- Additional event data
  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_gallery_analytics_craft_id (craft_id, created_at DESC),
  INDEX idx_gallery_analytics_event_type (event_type, created_at DESC)
);
```

### Services

#### `src/services/CraftGalleryService.ts`

```typescript
import { db } from '@/lib/db';
import { subDays } from 'date-fns';

interface GalleryFilters {
  skinName?: string;
  stickerName?: string;
  tags?: string[];
  minCost?: number;
  maxCost?: number;
  sortBy?: 'recent' | 'popular' | 'trending' | 'expensive';
  creatorId?: string;
}

export class CraftGalleryService {
  /**
   * Get crafts for gallery with filters
   */
  async getCrafts(page: number = 1, pageSize: number = 24, filters?: GalleryFilters) {
    const offset = (page - 1) * pageSize;

    // Build where clause
    const where: any = { is_public: true };

    if (filters?.skinName) {
      where.skin_market_hash_name = { contains: filters.skinName };
    }

    if (filters?.stickerName) {
      where.OR = [
        { sticker_slot_1: { contains: filters.stickerName } },
        { sticker_slot_2: { contains: filters.stickerName } },
        { sticker_slot_3: { contains: filters.stickerName } },
        { sticker_slot_4: { contains: filters.stickerName } },
      ];
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    if (filters?.minCost !== undefined) {
      where.craft_cost_total = { ...where.craft_cost_total, gte: filters.minCost };
    }

    if (filters?.maxCost !== undefined) {
      where.craft_cost_total = { ...where.craft_cost_total, lte: filters.maxCost };
    }

    if (filters?.creatorId) {
      where.user_id = filters.creatorId;
    }

    // Build order by
    let orderBy: any = { created_at: 'desc' }; // Default: recent

    if (filters?.sortBy === 'popular') {
      orderBy = [{ like_count: 'desc' }, { view_count: 'desc' }];
    } else if (filters?.sortBy === 'trending') {
      // Trending: Most likes in last 7 days
      const sevenDaysAgo = subDays(new Date(), 7);
      where.created_at = { gte: sevenDaysAgo };
      orderBy = [{ like_count: 'desc' }, { created_at: 'desc' }];
    } else if (filters?.sortBy === 'expensive') {
      orderBy = { craft_cost_total: 'desc' };
    }

    // Fetch crafts
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
   * Get featured crafts
   */
  async getFeaturedCrafts(featureType?: string): Promise<any[]> {
    const where: any = {
      expires_at: { gt: new Date() },
    };

    if (featureType) {
      where.feature_type = featureType;
    }

    const featured = await db.featured_crafts.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { featured_at: 'desc' }],
      take: 10,
      include: {
        craft: {
          include: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
        },
      },
    });

    return featured.map((f) => f.craft);
  }

  /**
   * Feature a craft (admin action)
   */
  async featureCraft(
    craftId: string,
    featureType: 'craft_of_day' | 'craft_of_week' | 'editor_pick' | 'trending',
    durationDays: number = 1,
    priority: number = 0
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    await db.featured_crafts.create({
      data: {
        craft_id: craftId,
        feature_type: featureType,
        expires_at: expiresAt,
        priority,
      },
    });
  }

  /**
   * Create a collection
   */
  async createCollection(userId: string, name: string, description?: string, isPublic: boolean = true): Promise<string> {
    const collection = await db.craft_collections.create({
      data: {
        user_id: userId,
        collection_name: name,
        description,
        is_public: isPublic,
      },
    });

    return collection.id;
  }

  /**
   * Add craft to collection
   */
  async addToCollection(collectionId: string, craftId: string): Promise<void> {
    await db.craft_collection_items.create({
      data: {
        collection_id: collectionId,
        craft_id: craftId,
      },
    });
  }

  /**
   * Get user's collections
   */
  async getUserCollections(userId: string): Promise<any[]> {
    return await db.craft_collections.findMany({
      where: { user_id: userId },
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get collection items
   */
  async getCollectionItems(collectionId: string): Promise<any[]> {
    const items = await db.craft_collection_items.findMany({
      where: { collection_id: collectionId },
      include: {
        craft: {
          include: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
        },
      },
      orderBy: { added_at: 'desc' },
    });

    return items.map((item) => item.craft);
  }

  /**
   * Follow a creator
   */
  async followCreator(followerId: string, creatorId: string): Promise<void> {
    if (followerId === creatorId) {
      throw new Error('Cannot follow yourself');
    }

    await db.creator_follows.create({
      data: {
        follower_id: followerId,
        creator_id: creatorId,
      },
    });
  }

  /**
   * Unfollow a creator
   */
  async unfollowCreator(followerId: string, creatorId: string): Promise<void> {
    await db.creator_follows.deleteMany({
      where: {
        follower_id: followerId,
        creator_id: creatorId,
      },
    });
  }

  /**
   * Get creator's followers
   */
  async getFollowers(creatorId: string): Promise<any[]> {
    const follows = await db.creator_follows.findMany({
      where: { creator_id: creatorId },
      include: {
        follower: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return follows.map((f) => f.follower);
  }

  /**
   * Get creator's stats
   */
  async getCreatorStats(creatorId: string): Promise<{
    totalCrafts: number;
    totalLikes: number;
    totalViews: number;
    followers: number;
    avgLikesPerCraft: number;
  }> {
    const crafts = await db.crafts.findMany({
      where: { user_id: creatorId },
      select: { like_count: true, view_count: true },
    });

    const followers = await db.creator_follows.count({
      where: { creator_id: creatorId },
    });

    const totalCrafts = crafts.length;
    const totalLikes = crafts.reduce((sum, c) => sum + c.like_count, 0);
    const totalViews = crafts.reduce((sum, c) => sum + c.view_count, 0);
    const avgLikesPerCraft = totalCrafts > 0 ? totalLikes / totalCrafts : 0;

    return {
      totalCrafts,
      totalLikes,
      totalViews,
      followers,
      avgLikesPerCraft,
    };
  }

  /**
   * Track gallery analytics
   */
  async trackEvent(craftId: string, eventType: string, userId?: string, metadata?: any): Promise<void> {
    await db.craft_gallery_analytics.create({
      data: {
        craft_id: craftId,
        event_type: eventType,
        user_id: userId,
        metadata,
      },
    });
  }

  /**
   * Get trending crafts (algorithm-driven)
   */
  async getTrendingCrafts(limit: number = 20): Promise<any[]> {
    // Algorithm: (likes_7d × 3) + (views_7d × 0.1) + (comments_7d × 5)
    const sevenDaysAgo = subDays(new Date(), 7);

    const crafts = await db.crafts.findMany({
      where: {
        is_public: true,
        created_at: { gte: sevenDaysAgo },
      },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // Calculate trend scores
    const craftsWithScores = await Promise.all(
      crafts.map(async (craft) => {
        const likes7d = await db.craft_likes.count({
          where: {
            craft_id: craft.id,
            created_at: { gte: sevenDaysAgo },
          },
        });

        const views7d = await db.craft_gallery_analytics.count({
          where: {
            craft_id: craft.id,
            event_type: 'view',
            created_at: { gte: sevenDaysAgo },
          },
        });

        const comments7d = await db.craft_comments.count({
          where: {
            craft_id: craft.id,
            created_at: { gte: sevenDaysAgo },
          },
        });

        const trendScore = likes7d * 3 + views7d * 0.1 + comments7d * 5;

        return { ...craft, trendScore };
      })
    );

    // Sort by trend score
    craftsWithScores.sort((a, b) => b.trendScore - a.trendScore);

    return craftsWithScores.slice(0, limit);
  }
}

export const craftGalleryService = new CraftGalleryService();
```

### API Endpoints

#### `src/app/api/gallery/crafts/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { craftGalleryService } from '@/services/CraftGalleryService';

// GET /api/gallery/crafts - Get crafts with filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const sortBy = searchParams.get('sortBy') as any;
    const skinName = searchParams.get('skinName') || undefined;
    const stickerName = searchParams.get('stickerName') || undefined;
    const tags = searchParams.get('tags')?.split(',') || undefined;
    const minCost = searchParams.get('minCost') ? parseFloat(searchParams.get('minCost')!) : undefined;
    const maxCost = searchParams.get('maxCost') ? parseFloat(searchParams.get('maxCost')!) : undefined;

    const result = await craftGalleryService.getCrafts(page, 24, {
      skinName,
      stickerName,
      tags,
      minCost,
      maxCost,
      sortBy,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### `src/app/api/gallery/featured/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { craftGalleryService } from '@/services/CraftGalleryService';

// GET /api/gallery/featured - Get featured crafts
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const featureType = searchParams.get('featureType') || undefined;

    const crafts = await craftGalleryService.getFeaturedCrafts(featureType);
    return NextResponse.json({ crafts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## Frontend Components

### `src/app/gallery/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { HeartIcon, ChatBubbleLeftIcon, EyeIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';

export default function CraftGalleryPage() {
  const [crafts, setCrafts] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const [filters, setFilters] = useState({ sortBy: 'recent', skinName: '', minCost: '', maxCost: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeatured();
    fetchCrafts();
  }, [page, filters]);

  const fetchFeatured = async () => {
    const res = await fetch('/api/gallery/featured');
    const data = await res.json();
    setFeatured(data.crafts || []);
  };

  const fetchCrafts = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      sortBy: filters.sortBy,
      ...(filters.skinName && { skinName: filters.skinName }),
      ...(filters.minCost && { minCost: filters.minCost }),
      ...(filters.maxCost && { maxCost: filters.maxCost }),
    });

    const res = await fetch(`/api/gallery/crafts?${params}`);
    const data = await res.json();
    setCrafts(data.crafts || []);
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6">Craft Gallery</h1>

      {/* Featured Section */}
      {featured.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Featured Crafts</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featured.slice(0, 3).map((craft) => (
              <FeaturedCraftCard key={craft.id} craft={craft} />
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              className="w-full border rounded-lg p-2"
            >
              <option value="recent">Recent</option>
              <option value="popular">Most Popular</option>
              <option value="trending">Trending</option>
              <option value="expensive">Most Expensive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Skin Name</label>
            <input
              type="text"
              value={filters.skinName}
              onChange={(e) => setFilters({ ...filters, skinName: e.target.value })}
              placeholder="e.g., AK-47"
              className="w-full border rounded-lg p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Min Cost ($)</label>
            <input
              type="number"
              value={filters.minCost}
              onChange={(e) => setFilters({ ...filters, minCost: e.target.value })}
              placeholder="0"
              className="w-full border rounded-lg p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Max Cost ($)</label>
            <input
              type="number"
              value={filters.maxCost}
              onChange={(e) => setFilters({ ...filters, maxCost: e.target.value })}
              placeholder="10000"
              className="w-full border rounded-lg p-2"
            />
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div className="flex justify-center py-12">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {crafts.map((craft) => (
            <CraftCard key={craft.id} craft={craft} />
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

function FeaturedCraftCard({ craft }: { craft: any }) {
  return (
    <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg p-1">
      <div className="bg-white rounded-lg p-4">
        <div className="aspect-video bg-gray-900 rounded-lg mb-2"></div>
        <h3 className="font-bold truncate">{craft.craft_name}</h3>
        <p className="text-sm text-gray-600">${craft.craft_cost_total.toFixed(2)}</p>
      </div>
    </div>
  );
}

function CraftCard({ craft }: { craft: any }) {
  const [liked, setLiked] = useState(false);

  const handleLike = async () => {
    // TODO: API call to toggle like
    setLiked(!liked);
  };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
      {/* Screenshot */}
      <div className="aspect-video bg-gray-900 relative">
        {craft.screenshot_url ? (
          <Image src={craft.screenshot_url} alt={craft.craft_name} fill className="object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-white">No Preview</div>
        )}
      </div>

      {/* Details */}
      <div className="p-4">
        <h3 className="font-bold truncate mb-1">{craft.craft_name}</h3>
        <p className="text-sm text-gray-600 mb-2">{craft.skin_market_hash_name}</p>

        <div className="flex items-center justify-between text-sm mb-3">
          <span className="font-medium text-blue-600">${craft.craft_cost_total.toFixed(2)}</span>
          <div className="flex items-center gap-3 text-gray-500">
            <span className="flex items-center gap-1">
              <EyeIcon className="w-4 h-4" />
              {craft.view_count}
            </span>
            <span className="flex items-center gap-1">
              <HeartIcon className="w-4 h-4" />
              {craft.like_count}
            </span>
          </div>
        </div>

        {/* Creator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
            <span className="text-xs text-gray-600">{craft.user.name}</span>
          </div>

          <button onClick={handleLike} className="text-red-500">
            {liked ? <HeartSolidIcon className="w-5 h-5" /> : <HeartIcon className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Success Metrics
1. **Engagement**: Average 6+ minutes browsing gallery per session
2. **User-Generated Content**: 100+ new crafts uploaded per week
3. **Social Interactions**: 500+ likes and comments per day
4. **Traffic**: Gallery drives 25%+ of total site traffic
5. **Return Visits**: 40%+ of gallery visitors return within 7 days
6. **Creator Growth**: 50+ active creators (10+ crafts each)

## Dependencies
- **Feature 23**: Craft Simulator (creates crafts for gallery)
- **Feature 10**: User Authentication (user profiles, follows)

## Effort Estimate
- **Database Schema**: 4 hours
- **CraftGalleryService**: 14 hours
- **Trending Algorithm**: 6 hours
- **API Endpoints**: 4 hours
- **Gallery Page**: 16 hours
- **Featured Section**: 4 hours
- **Collections Feature**: 8 hours
- **Follow System**: 6 hours
- **Testing**: 6 hours
- **Total**: ~68 hours (1.7 weeks)

## Implementation Notes
1. **Infinite Scroll**: Implement lazy loading for better UX
2. **Image CDN**: Use Cloudflare R2 or similar for fast image loading
3. **Caching**: Cache popular crafts and featured sections
4. **Moderation**: Implement report system for inappropriate content
5. **SEO**: Add meta tags for social sharing (Open Graph, Twitter Cards)

## Gotchas
1. **Image Load Performance**: Large galleries with 100+ images can be slow - optimize with lazy loading
2. **Content Moderation**: Need moderation queue for inappropriate crafts
3. **Copyright**: Users may upload copyrighted images - add DMCA takedown process
4. **Spam**: Prevent spam uploads with rate limiting
5. **Mobile Layout**: Masonry grid can be tricky on mobile - test thoroughly

## Status Checklist
- [ ] Database schema created and migrated
- [ ] CraftGalleryService implemented
- [ ] Trending algorithm tested
- [ ] API endpoints created
- [ ] Gallery page built with masonry grid
- [ ] Featured section implemented
- [ ] Collections feature completed
- [ ] Follow system working
- [ ] Moderation tools added
- [ ] SEO meta tags configured
- [ ] Unit tests written (95% coverage)
- [ ] Integration tests written
- [ ] Documentation completed

## Related Features
- **Feature 23**: Craft Simulator (creates crafts)
- **Feature 28**: User Profiles (creator profiles)
- **Feature 29**: Loadout Sharing (share entire loadouts)
- **Feature 30**: Educational Content (craft guides)

## References
- [Pinterest Masonry Grid](https://www.pinterest.com/)
- [Instagram Explore](https://www.instagram.com/explore/)
- [React Masonry CSS](https://github.com/paulcollett/react-masonry-css)
- [Infinite Scroll Best Practices](https://web.dev/infinite-scroll/)
