# Feature 28: User Profiles

## Overview
Public user profiles showcasing inventory, crafts, loadouts, achievements, and activity. Enables social discovery, community building, and showcasing collections. Profiles include customizable bio, favorite skins, statistics, and social features (follow, friend, message).

## User Segments
- **Primary**: Hobbyists, Collectors, Content Creators
- **Secondary**: Casual Traders, Investors
- **Tertiary**: Bulk Traders, Market Makers

## User Stories

### As a Collector
- I want to showcase my rare collection on my profile
- I want to display my favorite crafts and loadouts
- I want to show off my achievements (First #661 CH owner, Top 100 Collector, etc.)
- I want to customize my profile with banner, avatar, bio
- I want to see other collectors' profiles for inspiration

### As a Content Creator
- I want my profile to link to my YouTube/Twitter/Twitch
- I want to showcase my best crafts to attract followers
- I want analytics on profile views and engagement
- I want my profile to rank high in search (SEO)

### As a Hobbyist
- I want to follow other users whose taste I like
- I want to see my friends' inventories and loadouts
- I want to compare my collection with others
- I want to earn badges for milestones

### As the Platform
- I want to drive engagement through social features
- I want user profiles to rank in Google search
- I want to encourage user-generated content creation
- I want to build a community around CS2 skins

## Research & Context

### Profile Page Patterns

1. **Steam Profile**
   - Showcases: games owned, achievements, screenshots
   - Limited customization
   - Activity feed

2. **Twitter/X Profile**
   - Bio, banner, avatar
   - Follower/following counts
   - Post feed
   - Verified badge

3. **Behance (Adobe)**
   - Portfolio showcase
   - Projects gallery
   - Work experience
   - Social links

4. **Dribbble**
   - Design portfolio
   - Shots (designs)
   - Collections
   - Stats (views, likes)

### Key Features from Research
- Visual showcase (inventory, crafts, loadouts)
- Social stats (followers, following, likes)
- Achievements/badges
- Activity feed
- Customization (banner, bio, links)
- SEO-optimized URLs (username slugs)

## Technical Requirements

### Database Schema

```sql
-- User profiles (extends users table)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- Identity
  username VARCHAR(50) UNIQUE NOT NULL, -- URL slug: /u/username
  display_name VARCHAR(100),
  bio TEXT,

  -- Visual customization
  avatar_url TEXT,
  banner_url TEXT,
  theme_color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color

  -- Social links
  twitter_handle VARCHAR(100),
  youtube_channel VARCHAR(100),
  twitch_channel VARCHAR(100),
  discord_tag VARCHAR(100),
  website_url TEXT,

  -- Privacy settings
  is_public BOOLEAN DEFAULT true,
  show_inventory BOOLEAN DEFAULT true,
  show_crafts BOOLEAN DEFAULT true,
  show_loadouts BOOLEAN DEFAULT true,
  show_statistics BOOLEAN DEFAULT true,

  -- Statistics
  profile_views INTEGER DEFAULT 0,
  total_likes_received INTEGER DEFAULT 0,
  total_crafts INTEGER DEFAULT 0,
  total_loadouts INTEGER DEFAULT 0,

  -- Featured content (manually selected)
  featured_craft_ids UUID[],
  featured_loadout_ids UUID[],

  -- Badges/achievements
  badges JSONB DEFAULT '[]', -- Array of badge IDs

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_user_profiles_username (username),
  INDEX idx_user_profiles_user_id (user_id)
);

-- User follows
CREATE TABLE user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(follower_id, following_id),
  INDEX idx_user_follows_follower (follower_id),
  INDEX idx_user_follows_following (following_id)
);

-- Achievement badges
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_key VARCHAR(100) UNIQUE NOT NULL, -- 'first_661_ch_owner', 'top_100_collector'
  badge_name VARCHAR(255) NOT NULL,
  badge_description TEXT,
  badge_icon_url TEXT,
  badge_tier VARCHAR(50), -- 'bronze', 'silver', 'gold', 'platinum', 'diamond'
  is_secret BOOLEAN DEFAULT false, -- Hidden until earned
  requirements JSONB, -- Criteria for earning badge
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User badge ownership
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  progress DECIMAL(5,2) DEFAULT 100.00, -- % progress for in-progress badges

  UNIQUE(user_id, badge_id),
  INDEX idx_user_badges_user_id (user_id)
);

-- User activity feed
CREATE TABLE user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Activity details
  activity_type VARCHAR(50) NOT NULL, -- 'created_craft', 'shared_loadout', 'earned_badge', 'purchased_item'
  activity_data JSONB NOT NULL, -- Type-specific data
  activity_text TEXT, -- Human-readable description

  -- Visibility
  is_public BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_user_activity_user_id (user_id, created_at DESC),
  INDEX idx_user_activity_public (is_public, created_at DESC)
);

-- Profile analytics (for creators)
CREATE TABLE profile_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Daily metrics
  date DATE NOT NULL,
  profile_views INTEGER DEFAULT 0,
  followers_gained INTEGER DEFAULT 0,
  followers_lost INTEGER DEFAULT 0,
  crafts_liked INTEGER DEFAULT 0,
  loadouts_liked INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, date),
  INDEX idx_profile_analytics_user_date (user_id, date DESC)
);
```

### Services

#### `src/services/UserProfileService.ts`

```typescript
import { db } from '@/lib/db';
import { uploadToR2 } from '@/lib/cloudflare-r2';

interface ProfileUpdateData {
  displayName?: string;
  bio?: string;
  twitterHandle?: string;
  youtubeChannel?: string;
  twitchChannel?: string;
  discordTag?: string;
  websiteUrl?: string;
  themeColor?: string;
  isPublic?: boolean;
  showInventory?: boolean;
  showCrafts?: boolean;
  showLoadouts?: boolean;
  showStatistics?: boolean;
}

export class UserProfileService {
  /**
   * Get user profile by username or user ID
   */
  async getProfile(identifier: string, viewerId?: string): Promise<any> {
    const profile = await db.user_profiles.findFirst({
      where: {
        OR: [{ username: identifier }, { user_id: identifier }],
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    if (!profile) {
      throw new Error('Profile not found');
    }

    // Increment view count (unless viewing own profile)
    if (viewerId !== profile.user_id) {
      await db.user_profiles.update({
        where: { id: profile.id },
        data: { profile_views: { increment: 1 } },
      });

      // Track analytics
      await this.trackProfileView(profile.user_id);
    }

    // Check if viewer is following
    let isFollowing = false;
    if (viewerId) {
      const follow = await db.user_follows.findFirst({
        where: {
          follower_id: viewerId,
          following_id: profile.user_id,
        },
      });
      isFollowing = !!follow;
    }

    // Get follower/following counts
    const followerCount = await db.user_follows.count({
      where: { following_id: profile.user_id },
    });
    const followingCount = await db.user_follows.count({
      where: { follower_id: profile.user_id },
    });

    // Get badges
    const userBadges = await db.user_badges.findMany({
      where: { user_id: profile.user_id },
      include: { badge: true },
      orderBy: { earned_at: 'desc' },
    });

    return {
      ...profile,
      isFollowing,
      followerCount,
      followingCount,
      badges: userBadges.map((ub) => ub.badge),
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: ProfileUpdateData): Promise<void> {
    await db.user_profiles.update({
      where: { user_id: userId },
      data: {
        display_name: data.displayName,
        bio: data.bio,
        twitter_handle: data.twitterHandle,
        youtube_channel: data.youtubeChannel,
        twitch_channel: data.twitchChannel,
        discord_tag: data.discordTag,
        website_url: data.websiteUrl,
        theme_color: data.themeColor,
        is_public: data.isPublic,
        show_inventory: data.showInventory,
        show_crafts: data.showCrafts,
        show_loadouts: data.showLoadouts,
        show_statistics: data.showStatistics,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Upload profile banner
   */
  async uploadBanner(userId: string, imageFile: Buffer): Promise<string> {
    const bannerUrl = await uploadToR2(imageFile, `profile-banners/${userId}.jpg`);

    await db.user_profiles.update({
      where: { user_id: userId },
      data: { banner_url: bannerUrl },
    });

    return bannerUrl;
  }

  /**
   * Upload avatar
   */
  async uploadAvatar(userId: string, imageFile: Buffer): Promise<string> {
    const avatarUrl = await uploadToR2(imageFile, `profile-avatars/${userId}.jpg`);

    await db.user_profiles.update({
      where: { user_id: userId },
      data: { avatar_url: avatarUrl },
    });

    return avatarUrl;
  }

  /**
   * Follow a user
   */
  async followUser(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    await db.user_follows.create({
      data: {
        follower_id: followerId,
        following_id: followingId,
      },
    });

    // Create activity
    await this.addActivity(followerId, 'followed_user', { followingId }, `Started following user`);
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    await db.user_follows.deleteMany({
      where: {
        follower_id: followerId,
        following_id: followingId,
      },
    });
  }

  /**
   * Get followers
   */
  async getFollowers(userId: string): Promise<any[]> {
    const follows = await db.user_follows.findMany({
      where: { following_id: userId },
      include: {
        follower: {
          select: { id: true, name: true, image: true },
          include: { profile: { select: { username: true } } },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return follows.map((f) => f.follower);
  }

  /**
   * Get following
   */
  async getFollowing(userId: string): Promise<any[]> {
    const follows = await db.user_follows.findMany({
      where: { follower_id: userId },
      include: {
        following: {
          select: { id: true, name: true, image: true },
          include: { profile: { select: { username: true } } },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return follows.map((f) => f.following);
  }

  /**
   * Add activity to user's feed
   */
  async addActivity(userId: string, activityType: string, activityData: any, activityText: string, isPublic: boolean = true): Promise<void> {
    await db.user_activity.create({
      data: {
        user_id: userId,
        activity_type: activityType,
        activity_data: activityData,
        activity_text: activityText,
        is_public: isPublic,
      },
    });
  }

  /**
   * Get user's activity feed
   */
  async getActivityFeed(userId: string, limit: number = 50): Promise<any[]> {
    return await db.user_activity.findMany({
      where: { user_id: userId, is_public: true },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  /**
   * Get following feed (activity from users you follow)
   */
  async getFollowingFeed(userId: string, limit: number = 50): Promise<any[]> {
    // Get users being followed
    const following = await db.user_follows.findMany({
      where: { follower_id: userId },
      select: { following_id: true },
    });

    const followingIds = following.map((f) => f.following_id);

    // Get activity from followed users
    return await db.user_activity.findMany({
      where: {
        user_id: { in: followingIds },
        is_public: true,
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, image: true },
          include: { profile: { select: { username: true } } },
        },
      },
    });
  }

  /**
   * Award badge to user
   */
  async awardBadge(userId: string, badgeKey: string): Promise<void> {
    const badge = await db.badges.findUnique({
      where: { badge_key: badgeKey },
    });

    if (!badge) {
      throw new Error('Badge not found');
    }

    // Check if user already has badge
    const existing = await db.user_badges.findFirst({
      where: {
        user_id: userId,
        badge_id: badge.id,
      },
    });

    if (existing) {
      return; // Already has badge
    }

    // Award badge
    await db.user_badges.create({
      data: {
        user_id: userId,
        badge_id: badge.id,
      },
    });

    // Create activity
    await this.addActivity(userId, 'earned_badge', { badgeId: badge.id, badgeName: badge.badge_name }, `Earned badge: ${badge.badge_name}`);
  }

  /**
   * Check and award automatic badges
   */
  async checkAutomaticBadges(userId: string): Promise<void> {
    // Get user stats
    const profile = await db.user_profiles.findUnique({
      where: { user_id: userId },
    });

    if (!profile) return;

    // Badge: First Craft
    if (profile.total_crafts >= 1) {
      await this.awardBadge(userId, 'first_craft');
    }

    // Badge: 10 Crafts
    if (profile.total_crafts >= 10) {
      await this.awardBadge(userId, '10_crafts');
    }

    // Badge: 100 Followers
    const followerCount = await db.user_follows.count({
      where: { following_id: userId },
    });
    if (followerCount >= 100) {
      await this.awardBadge(userId, '100_followers');
    }

    // Badge: 1000 Profile Views
    if (profile.profile_views >= 1000) {
      await this.awardBadge(userId, '1000_views');
    }
  }

  /**
   * Track profile view for analytics
   */
  private async trackProfileView(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    await db.profile_analytics.upsert({
      where: {
        user_id_date: {
          user_id: userId,
          date: new Date(today),
        },
      },
      update: {
        profile_views: { increment: 1 },
      },
      create: {
        user_id: userId,
        date: new Date(today),
        profile_views: 1,
      },
    });
  }

  /**
   * Get profile analytics
   */
  async getProfileAnalytics(userId: string, days: number = 30): Promise<any[]> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return await db.profile_analytics.findMany({
      where: {
        user_id: userId,
        date: { gte: cutoffDate },
      },
      orderBy: { date: 'asc' },
    });
  }

  /**
   * Set featured crafts
   */
  async setFeaturedCrafts(userId: string, craftIds: string[]): Promise<void> {
    if (craftIds.length > 6) {
      throw new Error('Maximum 6 featured crafts allowed');
    }

    await db.user_profiles.update({
      where: { user_id: userId },
      data: { featured_craft_ids: craftIds },
    });
  }

  /**
   * Set featured loadouts
   */
  async setFeaturedLoadouts(userId: string, loadoutIds: string[]): Promise<void> {
    if (loadoutIds.length > 6) {
      throw new Error('Maximum 6 featured loadouts allowed');
    }

    await db.user_profiles.update({
      where: { user_id: userId },
      data: { featured_loadout_ids: loadoutIds },
    });
  }
}

export const userProfileService = new UserProfileService();
```

### API Endpoints

#### `src/app/api/profile/[username]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { userProfileService } from '@/services/UserProfileService';

// GET /api/profile/[username] - Get user profile
export async function GET(req: NextRequest, { params }: { params: { username: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const profile = await userProfileService.getProfile(params.username, session?.user?.id);
    return NextResponse.json(profile);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}
```

## Frontend Components

### `src/app/u/[username]/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { UserPlusIcon, CheckIcon } from '@heroicons/react/24/outline';

interface ProfilePageProps {
  params: { username: string };
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const res = await fetch(`/api/profile/${params.username}`);
    const data = await res.json();
    setProfile(data);
    setLoading(false);
  };

  const handleFollow = async () => {
    // Toggle follow
    const res = await fetch(`/api/profile/${params.username}/follow`, { method: 'POST' });
    if (res.ok) {
      setProfile({ ...profile, isFollowing: !profile.isFollowing });
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Banner */}
      <div className="relative h-64 bg-gradient-to-r from-blue-500 to-purple-600">
        {profile.banner_url && <Image src={profile.banner_url} alt="Banner" fill className="object-cover" />}
      </div>

      {/* Profile Header */}
      <div className="bg-white rounded-b-lg shadow p-6 -mt-12 relative z-10">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gray-300 border-4 border-white overflow-hidden">
              {profile.avatar_url && <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" />}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-3xl font-bold">{profile.display_name}</h1>
                <p className="text-gray-600">@{profile.username}</p>
              </div>
              <button onClick={handleFollow} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium ${profile.isFollowing ? 'bg-gray-200 text-gray-700' : 'bg-blue-600 text-white'}`}>
                {profile.isFollowing ? (
                  <>
                    <CheckIcon className="w-5 h-5" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlusIcon className="w-5 h-5" />
                    Follow
                  </>
                )}
              </button>
            </div>

            <p className="text-gray-700 mb-4">{profile.bio}</p>

            {/* Stats */}
            <div className="flex gap-6 text-sm">
              <div>
                <span className="font-bold">{profile.followerCount}</span> Followers
              </div>
              <div>
                <span className="font-bold">{profile.followingCount}</span> Following
              </div>
              <div>
                <span className="font-bold">{profile.total_crafts}</span> Crafts
              </div>
              <div>
                <span className="font-bold">{profile.total_loadouts}</span> Loadouts
              </div>
              <div>
                <span className="font-bold">{profile.profile_views}</span> Views
              </div>
            </div>

            {/* Badges */}
            {profile.badges && profile.badges.length > 0 && (
              <div className="flex gap-2 mt-4">
                {profile.badges.slice(0, 5).map((badge: any) => (
                  <div key={badge.id} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium" title={badge.badge_description}>
                    {badge.badge_name}
                  </div>
                ))}
              </div>
            )}

            {/* Social Links */}
            <div className="flex gap-4 mt-4 text-sm">
              {profile.twitter_handle && (
                <a href={`https://twitter.com/${profile.twitter_handle}`} target="_blank" className="text-blue-500 hover:underline">
                  Twitter
                </a>
              )}
              {profile.youtube_channel && (
                <a href={`https://youtube.com/${profile.youtube_channel}`} target="_blank" className="text-red-500 hover:underline">
                  YouTube
                </a>
              )}
              {profile.twitch_channel && (
                <a href={`https://twitch.tv/${profile.twitch_channel}`} target="_blank" className="text-purple-500 hover:underline">
                  Twitch
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Featured Crafts */}
        {profile.show_crafts && (
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Featured Crafts</h2>
            <div className="grid grid-cols-2 gap-4">{/* Craft cards here */}</div>
          </div>
        )}

        {/* Activity Feed */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
          <div className="space-y-3">{/* Activity items here */}</div>
        </div>
      </div>
    </div>
  );
}
```

## Success Metrics
1. **Profile Creation**: 80%+ of users create public profiles
2. **Engagement**: 40%+ of users follow at least 1 other user
3. **Customization**: 50%+ of users customize banner/bio
4. **Badge Earning**: Average 3+ badges per active user
5. **SEO Traffic**: User profiles drive 15%+ of organic traffic
6. **Return Visits**: 30%+ of users return to check profile updates

## Dependencies
- **Feature 10**: User Authentication (user accounts)
- **Feature 23**: Craft Simulator (featured crafts)
- **Feature 29**: Loadout Sharing (featured loadouts)

## Effort Estimate
- **Database Schema**: 6 hours
- **UserProfileService**: 16 hours
- **Badge System**: 8 hours
- **Activity Feed**: 6 hours
- **API Endpoints**: 4 hours
- **Profile Page**: 16 hours
- **Profile Settings Page**: 10 hours
- **Following/Followers Pages**: 6 hours
- **Testing**: 8 hours
- **Total**: ~80 hours (2 weeks)

## Implementation Notes
1. **Username Validation**: Alphanumeric + underscore, 3-50 chars, unique
2. **SEO**: Use meta tags for social sharing (Open Graph, Twitter Cards)
3. **Image Upload**: Compress and resize banner/avatar uploads
4. **Privacy**: Default to public, allow users to make profiles private
5. **Badge Icons**: Create badge icon assets (or use Font Awesome)

## Gotchas
1. **Username Changes**: Decide if usernames can be changed (impacts URLs/SEO)
2. **Inactive Profiles**: Clean up abandoned profiles after 1 year
3. **Badge Spam**: Prevent gaming badge system (e.g., fake follows)
4. **Large Follower Lists**: Paginate followers/following for users with 1000+
5. **Activity Feed Performance**: Denormalize feed for performance

## Status Checklist
- [ ] Database schema created and migrated
- [ ] UserProfileService implemented
- [ ] Badge system functional
- [ ] Activity feed working
- [ ] API endpoints created
- [ ] Profile page built
- [ ] Profile settings page completed
- [ ] Following/followers pages created
- [ ] Image upload working
- [ ] Badge award logic tested
- [ ] SEO meta tags configured
- [ ] Unit tests written (95% coverage)
- [ ] Integration tests written
- [ ] Documentation completed

## Related Features
- **Feature 23**: Craft Simulator (featured crafts)
- **Feature 24**: Craft Gallery (social features)
- **Feature 29**: Loadout Sharing (featured loadouts)
- **Feature 30**: Educational Content (content creator profiles)

## References
- [Steam Profile](https://steamcommunity.com/)
- [Twitter Profile](https://twitter.com/)
- [Behance Profile](https://www.behance.net/)
- [Badge Design Best Practices](https://uxplanet.org/gamification-best-practices-for-badge-design-5f2a7c3b3b3f)
