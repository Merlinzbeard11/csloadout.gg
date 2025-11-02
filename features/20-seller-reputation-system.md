# Feature 20: Seller Reputation System

## Overview
A comprehensive reputation and trust system that allows buyers to rate sellers, leave reviews, and view seller performance metrics. Critical for building trust in wholesale trading and bulk transactions where users are transacting thousands of dollars worth of items.

## User Segments
- **Primary**: Bulk Traders, Wholesalers, Market Makers
- **Secondary**: Casual Traders, Hobbyists
- **Tertiary**: Investors

## User Stories

### As a Buyer
- I want to see a seller's reputation score before making a large purchase so I can assess risk
- I want to read reviews from other buyers to learn about their experience with this seller
- I want to filter sellers by reputation score when browsing wholesale listings
- I want to see verification badges (e.g., "Verified Email", "ID Verified") to trust the seller more
- I want to report fraudulent sellers or bad experiences
- I want to see seller response time and completion rate metrics

### As a Seller
- I want to build my reputation by completing transactions successfully
- I want buyers to leave reviews after successful transactions
- I want to respond to negative reviews to provide my side of the story
- I want to verify my identity to earn trust badges
- I want to see my performance metrics (response time, completion rate, dispute rate)
- I want to be notified when I receive a new review

### As a Platform (csloadout.gg)
- I want to prevent fake reviews and reputation manipulation
- I want to identify and ban fraudulent sellers quickly
- I want to incentivize good behavior with badges and featured placement
- I want to automatically flag suspicious patterns (e.g., sudden influx of 5-star reviews)

## Research & Context

### Existing Reputation Systems
1. **eBay Feedback System**
   - Positive/Negative/Neutral ratings
   - Detailed Seller Ratings (DSRs): Item as described, Communication, Shipping time, Shipping cost
   - Feedback score = # of positive ratings - # of negative ratings
   - Percentage positive = (positive / total) * 100
   - Top Rated Seller badge for high performers

2. **Airbnb Reviews**
   - 5-star rating system across multiple categories
   - Both host and guest leave reviews
   - Reviews published simultaneously (prevents retaliation)
   - Hosts with 4.8+ stars get "Superhost" badge

3. **Steam Community Market**
   - No formal reputation system (major gap)
   - Users rely on Steam account age, badges, game hours
   - Third-party sites like SteamRep track scammers

4. **CS2 Trading Sites**
   - CSFloat: Seller rating based on completed trades
   - DMarket: Trust score algorithm (proprietary)
   - Skinport: No visible reputation system

### Key Insights
- **Verified Transactions Only**: Only allow reviews from actual completed transactions (prevents fake reviews)
- **Two-Way Reviews**: Both buyer and seller review each other (prevents retaliation)
- **Time Decay**: Recent reviews matter more than old reviews (sellers can improve)
- **Category Breakdown**: Overall score + detailed ratings (communication, item condition, speed)
- **Verification Badges**: Email, phone, ID verification builds trust
- **Dispute Weight**: Disputes that were resolved in buyer's favor heavily penalize seller score

## Technical Requirements

### Database Schema

```sql
-- Seller profiles with aggregated reputation metrics
CREATE TABLE seller_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Reputation Metrics
  overall_rating DECIMAL(3,2) DEFAULT 0.00, -- 0.00 to 5.00
  total_reviews INTEGER DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,

  -- Detailed Ratings (averages)
  rating_communication DECIMAL(3,2) DEFAULT 0.00,
  rating_item_accuracy DECIMAL(3,2) DEFAULT 0.00,
  rating_speed DECIMAL(3,2) DEFAULT 0.00,
  rating_professionalism DECIMAL(3,2) DEFAULT 0.00,

  -- Performance Metrics
  completion_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage of completed transactions
  avg_response_time_hours INTEGER DEFAULT 0,
  dispute_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage of transactions with disputes

  -- Trust Badges
  verified_email BOOLEAN DEFAULT false,
  verified_phone BOOLEAN DEFAULT false,
  verified_id BOOLEAN DEFAULT false,
  top_seller BOOLEAN DEFAULT false, -- Earned at 4.5+ rating, 50+ transactions, <2% dispute rate

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Individual reviews
CREATE TABLE seller_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES escrow_transactions(id) ON DELETE CASCADE, -- Or wholesale_transactions
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Ratings
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  rating_communication INTEGER CHECK (rating_communication >= 1 AND rating_communication <= 5),
  rating_item_accuracy INTEGER CHECK (rating_item_accuracy >= 1 AND rating_item_accuracy <= 5),
  rating_speed INTEGER CHECK (rating_speed >= 1 AND rating_speed <= 5),
  rating_professionalism INTEGER CHECK (rating_professionalism >= 1 AND rating_professionalism <= 5),

  -- Review Content
  review_text TEXT,

  -- Seller Response
  seller_response TEXT,
  seller_response_date TIMESTAMPTZ,

  -- Verification
  verified_transaction BOOLEAN DEFAULT true, -- Only verified transactions can leave reviews

  -- Moderation
  is_flagged BOOLEAN DEFAULT false,
  flagged_reason TEXT,
  is_hidden BOOLEAN DEFAULT false, -- Hidden by moderators if violates guidelines

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(transaction_id, reviewer_id) -- One review per transaction per user
);

-- Review reports (users flagging inappropriate reviews)
CREATE TABLE review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES seller_reviews(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL, -- "Fake review", "Offensive language", "Spam", etc.
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'reviewed', 'action_taken', 'dismissed'
  moderator_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(review_id, reporter_id)
);

-- Trust verification records
CREATE TABLE trust_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verification_type VARCHAR(50) NOT NULL, -- 'email', 'phone', 'id', 'address'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
  verification_data JSONB, -- Store hashed data, metadata
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- ID verification expires after 1 year
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reputation history log (for analytics and fraud detection)
CREATE TABLE reputation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'review_received', 'dispute_resolved', 'badge_earned', 'badge_revoked'
  rating_before DECIMAL(3,2),
  rating_after DECIMAL(3,2),
  metadata JSONB, -- Store event-specific data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seller_profiles_user_id ON seller_profiles(user_id);
CREATE INDEX idx_seller_profiles_rating ON seller_profiles(overall_rating DESC);
CREATE INDEX idx_seller_profiles_top_seller ON seller_profiles(top_seller) WHERE top_seller = true;
CREATE INDEX idx_seller_reviews_seller_id ON seller_reviews(seller_id);
CREATE INDEX idx_seller_reviews_transaction_id ON seller_reviews(transaction_id);
CREATE INDEX idx_seller_reviews_created_at ON seller_reviews(created_at DESC);
CREATE INDEX idx_review_reports_status ON review_reports(status);
CREATE INDEX idx_trust_verifications_user_id ON trust_verifications(user_id);
CREATE INDEX idx_reputation_history_seller_id ON reputation_history(seller_id, created_at DESC);
```

### Services

#### `src/services/ReputationService.ts`

```typescript
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email';

interface CreateReviewParams {
  transactionId: string;
  sellerId: string;
  reviewerId: string;
  overallRating: number;
  ratingCommunication?: number;
  ratingItemAccuracy?: number;
  ratingSpeed?: number;
  ratingProfessionalism?: number;
  reviewText?: string;
}

interface ReputationMetrics {
  overallRating: number;
  totalReviews: number;
  totalTransactions: number;
  completionRate: number;
  disputeRate: number;
  avgResponseTimeHours: number;
  detailedRatings: {
    communication: number;
    itemAccuracy: number;
    speed: number;
    professionalism: number;
  };
  badges: {
    verifiedEmail: boolean;
    verifiedPhone: boolean;
    verifiedId: boolean;
    topSeller: boolean;
  };
}

export class ReputationService {
  /**
   * Create a new review for a seller
   */
  async createReview(params: CreateReviewParams): Promise<void> {
    // Validate transaction exists and reviewer is part of it
    const transaction = await db.escrow_transactions.findUnique({
      where: { id: params.transactionId },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.buyer_id !== params.reviewerId && transaction.seller_id !== params.reviewerId) {
      throw new Error('Reviewer is not part of this transaction');
    }

    if (transaction.status !== 'completed') {
      throw new Error('Can only review completed transactions');
    }

    // Check if review already exists
    const existingReview = await db.seller_reviews.findFirst({
      where: {
        transaction_id: params.transactionId,
        reviewer_id: params.reviewerId,
      },
    });

    if (existingReview) {
      throw new Error('Review already exists for this transaction');
    }

    // Create review
    await db.seller_reviews.create({
      data: {
        transaction_id: params.transactionId,
        seller_id: params.sellerId,
        reviewer_id: params.reviewerId,
        overall_rating: params.overallRating,
        rating_communication: params.ratingCommunication,
        rating_item_accuracy: params.ratingItemAccuracy,
        rating_speed: params.ratingSpeed,
        rating_professionalism: params.ratingProfessionalism,
        review_text: params.reviewText,
        verified_transaction: true,
      },
    });

    // Recalculate seller's reputation
    await this.recalculateReputation(params.sellerId);

    // Send notification to seller
    const seller = await db.users.findUnique({ where: { id: params.sellerId } });
    if (seller?.email) {
      await sendEmail({
        to: seller.email,
        subject: 'You received a new review',
        html: `<p>A buyer left you a ${params.overallRating}-star review. <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/reviews">View review</a></p>`,
      });
    }
  }

  /**
   * Recalculate seller's reputation metrics
   */
  async recalculateReputation(sellerId: string): Promise<void> {
    // Get all reviews for this seller
    const reviews = await db.seller_reviews.findMany({
      where: { seller_id: sellerId, is_hidden: false },
    });

    if (reviews.length === 0) {
      return; // No reviews yet
    }

    // Calculate averages
    const totalReviews = reviews.length;
    const sumOverall = reviews.reduce((sum, r) => sum + r.overall_rating, 0);
    const sumCommunication = reviews.reduce((sum, r) => sum + (r.rating_communication || 0), 0);
    const sumItemAccuracy = reviews.reduce((sum, r) => sum + (r.rating_item_accuracy || 0), 0);
    const sumSpeed = reviews.reduce((sum, r) => sum + (r.rating_speed || 0), 0);
    const sumProfessionalism = reviews.reduce((sum, r) => sum + (r.rating_professionalism || 0), 0);

    const overallRating = sumOverall / totalReviews;
    const ratingCommunication = sumCommunication / totalReviews;
    const ratingItemAccuracy = sumItemAccuracy / totalReviews;
    const ratingSpeed = sumSpeed / totalReviews;
    const ratingProfessionalism = sumProfessionalism / totalReviews;

    // Get total transactions count
    const totalTransactions = await db.escrow_transactions.count({
      where: { seller_id: sellerId },
    });

    // Calculate completion rate
    const completedTransactions = await db.escrow_transactions.count({
      where: { seller_id: sellerId, status: 'completed' },
    });
    const completionRate = totalTransactions > 0 ? (completedTransactions / totalTransactions) * 100 : 0;

    // Calculate dispute rate
    const disputedTransactions = await db.escrow_transactions.count({
      where: { seller_id: sellerId, status: 'disputed' },
    });
    const disputeRate = totalTransactions > 0 ? (disputedTransactions / totalTransactions) * 100 : 0;

    // Get average response time (from wholesale inquiries)
    const inquiries = await db.wholesale_inquiries.findMany({
      where: { seller_id: sellerId },
    });

    let totalResponseTime = 0;
    let responseCount = 0;

    inquiries.forEach((inquiry) => {
      if (inquiry.messages && inquiry.messages.length > 1) {
        const firstMessage = inquiry.messages[0];
        const sellerResponse = inquiry.messages.find((m: any) => m.sender_id === sellerId);
        if (sellerResponse) {
          const responseTime = new Date(sellerResponse.timestamp).getTime() - new Date(firstMessage.timestamp).getTime();
          totalResponseTime += responseTime;
          responseCount++;
        }
      }
    });

    const avgResponseTimeHours = responseCount > 0 ? Math.round(totalResponseTime / responseCount / (1000 * 60 * 60)) : 0;

    // Check if seller qualifies for Top Seller badge
    const topSeller = overallRating >= 4.5 && totalReviews >= 50 && disputeRate < 2;

    // Get existing profile
    let profile = await db.seller_profiles.findUnique({
      where: { user_id: sellerId },
    });

    const ratingBefore = profile?.overall_rating || 0;

    // Update or create profile
    profile = await db.seller_profiles.upsert({
      where: { user_id: sellerId },
      update: {
        overall_rating: overallRating,
        total_reviews: totalReviews,
        total_transactions: totalTransactions,
        rating_communication: ratingCommunication,
        rating_item_accuracy: ratingItemAccuracy,
        rating_speed: ratingSpeed,
        rating_professionalism: ratingProfessionalism,
        completion_rate: completionRate,
        avg_response_time_hours: avgResponseTimeHours,
        dispute_rate: disputeRate,
        top_seller: topSeller,
        updated_at: new Date(),
      },
      create: {
        user_id: sellerId,
        overall_rating: overallRating,
        total_reviews: totalReviews,
        total_transactions: totalTransactions,
        rating_communication: ratingCommunication,
        rating_item_accuracy: ratingItemAccuracy,
        rating_speed: ratingSpeed,
        rating_professionalism: ratingProfessionalism,
        completion_rate: completionRate,
        avg_response_time_hours: avgResponseTimeHours,
        dispute_rate: disputeRate,
        top_seller: topSeller,
      },
    });

    // Log reputation change
    await db.reputation_history.create({
      data: {
        seller_id: sellerId,
        event_type: 'review_received',
        rating_before: ratingBefore,
        rating_after: overallRating,
        metadata: { total_reviews: totalReviews },
      },
    });

    // If just earned Top Seller badge, notify
    if (topSeller && !profile.top_seller) {
      await this.awardBadge(sellerId, 'top_seller');
    }
  }

  /**
   * Award a badge to a seller
   */
  private async awardBadge(sellerId: string, badgeType: string): Promise<void> {
    await db.reputation_history.create({
      data: {
        seller_id: sellerId,
        event_type: 'badge_earned',
        metadata: { badge_type: badgeType },
      },
    });

    const seller = await db.users.findUnique({ where: { id: sellerId } });
    if (seller?.email) {
      await sendEmail({
        to: seller.email,
        subject: '🏆 You earned a new badge!',
        html: `<p>Congratulations! You've earned the <strong>${badgeType.replace('_', ' ').toUpperCase()}</strong> badge.</p>`,
      });
    }
  }

  /**
   * Get seller's reputation metrics
   */
  async getReputationMetrics(sellerId: string): Promise<ReputationMetrics | null> {
    const profile = await db.seller_profiles.findUnique({
      where: { user_id: sellerId },
    });

    if (!profile) {
      return null;
    }

    return {
      overallRating: profile.overall_rating,
      totalReviews: profile.total_reviews,
      totalTransactions: profile.total_transactions,
      completionRate: profile.completion_rate,
      disputeRate: profile.dispute_rate,
      avgResponseTimeHours: profile.avg_response_time_hours,
      detailedRatings: {
        communication: profile.rating_communication,
        itemAccuracy: profile.rating_item_accuracy,
        speed: profile.rating_speed,
        professionalism: profile.rating_professionalism,
      },
      badges: {
        verifiedEmail: profile.verified_email,
        verifiedPhone: profile.verified_phone,
        verifiedId: profile.verified_id,
        topSeller: profile.top_seller,
      },
    };
  }

  /**
   * Get seller's reviews
   */
  async getSellerReviews(sellerId: string, page: number = 1, pageSize: number = 20) {
    const offset = (page - 1) * pageSize;

    const reviews = await db.seller_reviews.findMany({
      where: { seller_id: sellerId, is_hidden: false },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: pageSize,
      include: {
        reviewer: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    const total = await db.seller_reviews.count({
      where: { seller_id: sellerId, is_hidden: false },
    });

    return {
      reviews,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Submit seller response to a review
   */
  async respondToReview(reviewId: string, sellerId: string, response: string): Promise<void> {
    const review = await db.seller_reviews.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    if (review.seller_id !== sellerId) {
      throw new Error('You can only respond to your own reviews');
    }

    if (review.seller_response) {
      throw new Error('You have already responded to this review');
    }

    await db.seller_reviews.update({
      where: { id: reviewId },
      data: {
        seller_response: response,
        seller_response_date: new Date(),
      },
    });
  }

  /**
   * Report a review as inappropriate
   */
  async reportReview(reviewId: string, reporterId: string, reason: string): Promise<void> {
    // Check if already reported by this user
    const existing = await db.review_reports.findFirst({
      where: { review_id: reviewId, reporter_id: reporterId },
    });

    if (existing) {
      throw new Error('You have already reported this review');
    }

    await db.review_reports.create({
      data: {
        review_id: reviewId,
        reporter_id: reporterId,
        reason,
        status: 'pending',
      },
    });

    // If review gets 3+ reports, automatically flag it for moderation
    const reportCount = await db.review_reports.count({
      where: { review_id: reviewId },
    });

    if (reportCount >= 3) {
      await db.seller_reviews.update({
        where: { id: reviewId },
        data: { is_flagged: true, flagged_reason: 'Multiple user reports' },
      });
    }
  }

  /**
   * Verify user's email (called after email confirmation)
   */
  async verifyEmail(userId: string): Promise<void> {
    await db.seller_profiles.upsert({
      where: { user_id: userId },
      update: { verified_email: true },
      create: { user_id: userId, verified_email: true },
    });

    await db.trust_verifications.create({
      data: {
        user_id: userId,
        verification_type: 'email',
        status: 'verified',
        verified_at: new Date(),
      },
    });
  }

  /**
   * Start ID verification process
   */
  async startIDVerification(userId: string, idData: { type: string; number: string; frontImage: string; backImage?: string }): Promise<void> {
    // In production, integrate with service like Stripe Identity, Onfido, or Jumio
    // For now, create pending verification record

    await db.trust_verifications.create({
      data: {
        user_id: userId,
        verification_type: 'id',
        status: 'pending',
        verification_data: {
          type: idData.type,
          number_hash: this.hashSensitiveData(idData.number), // Never store raw ID numbers
          images_uploaded: true,
        },
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
      },
    });

    // TODO: Send to verification service API
    // const result = await stripeIdentity.verifyDocument(...)
  }

  /**
   * Hash sensitive data (ID numbers, etc.)
   */
  private hashSensitiveData(data: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Detect reputation manipulation (fraud prevention)
   */
  async detectManipulation(sellerId: string): Promise<{ suspicious: boolean; reasons: string[] }> {
    const reasons: string[] = [];

    // Get recent reviews (last 7 days)
    const recentReviews = await db.seller_reviews.findMany({
      where: {
        seller_id: sellerId,
        created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    // Red flag 1: Sudden influx of 5-star reviews
    if (recentReviews.length >= 10) {
      const fiveStarCount = recentReviews.filter((r) => r.overall_rating === 5).length;
      if (fiveStarCount / recentReviews.length > 0.9) {
        reasons.push('Sudden influx of 5-star reviews (90%+ in last 7 days)');
      }
    }

    // Red flag 2: Reviews from new accounts
    const reviewerIds = recentReviews.map((r) => r.reviewer_id);
    const reviewers = await db.users.findMany({
      where: { id: { in: reviewerIds } },
    });

    const newAccountCount = reviewers.filter((u) => {
      const accountAge = Date.now() - new Date(u.created_at).getTime();
      return accountAge < 7 * 24 * 60 * 60 * 1000; // Account created in last 7 days
    }).length;

    if (newAccountCount / reviewers.length > 0.5) {
      reasons.push('More than 50% of recent reviews from accounts created in last 7 days');
    }

    // Red flag 3: Reviews without verified transactions
    const unverifiedCount = recentReviews.filter((r) => !r.verified_transaction).length;
    if (unverifiedCount > 0) {
      reasons.push(`${unverifiedCount} reviews without verified transactions`);
    }

    return {
      suspicious: reasons.length > 0,
      reasons,
    };
  }
}

export const reputationService = new ReputationService();
```

### API Endpoints

#### `src/app/api/reputation/reviews/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { reputationService } from '@/services/ReputationService';

// POST /api/reputation/reviews - Create a new review
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      transactionId,
      sellerId,
      overallRating,
      ratingCommunication,
      ratingItemAccuracy,
      ratingSpeed,
      ratingProfessionalism,
      reviewText,
    } = body;

    await reputationService.createReview({
      transactionId,
      sellerId,
      reviewerId: session.user.id,
      overallRating,
      ratingCommunication,
      ratingItemAccuracy,
      ratingSpeed,
      ratingProfessionalism,
      reviewText,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// GET /api/reputation/reviews?sellerId=xxx&page=1 - Get seller's reviews
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sellerId = searchParams.get('sellerId');
    const page = parseInt(searchParams.get('page') || '1');

    if (!sellerId) {
      return NextResponse.json({ error: 'sellerId is required' }, { status: 400 });
    }

    const result = await reputationService.getSellerReviews(sellerId, page);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### `src/app/api/reputation/metrics/[sellerId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { reputationService } from '@/services/ReputationService';

// GET /api/reputation/metrics/[sellerId] - Get seller's reputation metrics
export async function GET(req: NextRequest, { params }: { params: { sellerId: string } }) {
  try {
    const metrics = await reputationService.getReputationMetrics(params.sellerId);

    if (!metrics) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
    }

    return NextResponse.json(metrics);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### `src/app/api/reputation/respond/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { reputationService } from '@/services/ReputationService';

// POST /api/reputation/respond - Seller responds to a review
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reviewId, response } = await req.json();

    await reputationService.respondToReview(reviewId, session.user.id, response);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

#### `src/app/api/reputation/report/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { reputationService } from '@/services/ReputationService';

// POST /api/reputation/report - Report a review as inappropriate
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reviewId, reason } = await req.json();

    await reputationService.reportReview(reviewId, session.user.id, reason);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

## Frontend Components

### `src/app/seller/[sellerId]/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import { CheckBadgeIcon, ShieldCheckIcon, EnvelopeIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

interface SellerProfilePageProps {
  params: { sellerId: string };
}

export default function SellerProfilePage({ params }: SellerProfilePageProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    fetchReviews();
  }, [page]);

  const fetchMetrics = async () => {
    const res = await fetch(`/api/reputation/metrics/${params.sellerId}`);
    const data = await res.json();
    setMetrics(data);
    setLoading(false);
  };

  const fetchReviews = async () => {
    const res = await fetch(`/api/reputation/reviews?sellerId=${params.sellerId}&page=${page}`);
    const data = await res.json();
    setReviews(data.reviews);
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Seller Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Seller Profile</h1>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <StarIcon
                    key={i}
                    className={`w-6 h-6 ${i < Math.floor(metrics.overallRating) ? 'text-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
                <span className="ml-2 text-2xl font-semibold">{metrics.overallRating.toFixed(2)}</span>
              </div>
              <span className="text-gray-600">
                {metrics.totalReviews} reviews • {metrics.totalTransactions} transactions
              </span>
            </div>

            {/* Trust Badges */}
            <div className="flex gap-2 flex-wrap">
              {metrics.badges.topSeller && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                  <CheckBadgeIcon className="w-4 h-4" />
                  Top Seller
                </span>
              )}
              {metrics.badges.verifiedId && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  <ShieldCheckIcon className="w-4 h-4" />
                  ID Verified
                </span>
              )}
              {metrics.badges.verifiedEmail && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  <EnvelopeIcon className="w-4 h-4" />
                  Email Verified
                </span>
              )}
              {metrics.badges.verifiedPhone && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                  <DevicePhoneMobileIcon className="w-4 h-4" />
                  Phone Verified
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Completion Rate</div>
          <div className="text-2xl font-bold text-green-600">{metrics.completionRate.toFixed(1)}%</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Avg Response Time</div>
          <div className="text-2xl font-bold">{metrics.avgResponseTimeHours}h</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Dispute Rate</div>
          <div className={`text-2xl font-bold ${metrics.disputeRate < 2 ? 'text-green-600' : 'text-red-600'}`}>
            {metrics.disputeRate.toFixed(1)}%
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Total Transactions</div>
          <div className="text-2xl font-bold">{metrics.totalTransactions}</div>
        </div>
      </div>

      {/* Detailed Ratings */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Detailed Ratings</h2>
        <div className="space-y-3">
          {[
            { label: 'Communication', value: metrics.detailedRatings.communication },
            { label: 'Item Accuracy', value: metrics.detailedRatings.itemAccuracy },
            { label: 'Speed', value: metrics.detailedRatings.speed },
            { label: 'Professionalism', value: metrics.detailedRatings.professionalism },
          ].map((rating) => (
            <div key={rating.label}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">{rating.label}</span>
                <span className="text-sm text-gray-600">{rating.value.toFixed(2)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-400 h-2 rounded-full"
                  style={{ width: `${(rating.value / 5) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Customer Reviews</h2>
        <div className="space-y-6">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 border rounded"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: any }) {
  const [showReportModal, setShowReportModal] = useState(false);

  return (
    <div className="border-b pb-4 last:border-b-0">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">{review.reviewer.name}</span>
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <StarIcon
                  key={i}
                  className={`w-4 h-4 ${i < review.overall_rating ? 'text-yellow-400' : 'text-gray-300'}`}
                />
              ))}
            </div>
          </div>
          <div className="text-sm text-gray-500">{new Date(review.created_at).toLocaleDateString()}</div>
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Report
        </button>
      </div>

      <p className="text-gray-700 mb-3">{review.review_text}</p>

      {/* Detailed ratings */}
      <div className="flex gap-4 text-sm text-gray-600 mb-3">
        {review.rating_communication && <span>Communication: {review.rating_communication}⭐</span>}
        {review.rating_item_accuracy && <span>Item Accuracy: {review.rating_item_accuracy}⭐</span>}
        {review.rating_speed && <span>Speed: {review.rating_speed}⭐</span>}
        {review.rating_professionalism && <span>Professionalism: {review.rating_professionalism}⭐</span>}
      </div>

      {/* Seller response */}
      {review.seller_response && (
        <div className="bg-gray-50 rounded p-3 mt-3">
          <div className="text-sm font-medium mb-1">Seller Response:</div>
          <p className="text-sm text-gray-700">{review.seller_response}</p>
          <div className="text-xs text-gray-500 mt-1">
            {new Date(review.seller_response_date).toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  );
}
```

### `src/components/WriteReviewModal.tsx`

```typescript
'use client';

import { useState } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';

interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string;
  sellerId: string;
  onSuccess: () => void;
}

export default function WriteReviewModal({ isOpen, onClose, transactionId, sellerId, onSuccess }: WriteReviewModalProps) {
  const [overallRating, setOverallRating] = useState(5);
  const [ratingCommunication, setRatingCommunication] = useState(5);
  const [ratingItemAccuracy, setRatingItemAccuracy] = useState(5);
  const [ratingSpeed, setRatingSpeed] = useState(5);
  const [ratingProfessionalism, setRatingProfessionalism] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/reputation/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
          sellerId,
          overallRating,
          ratingCommunication,
          ratingItemAccuracy,
          ratingSpeed,
          ratingProfessionalism,
          reviewText,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Write a Review</h2>

        <form onSubmit={handleSubmit}>
          {/* Overall Rating */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Overall Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setOverallRating(rating)}
                >
                  {rating <= overallRating ? (
                    <StarIcon className="w-8 h-8 text-yellow-400" />
                  ) : (
                    <StarOutlineIcon className="w-8 h-8 text-gray-300" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Detailed Ratings */}
          {[
            { label: 'Communication', value: ratingCommunication, setter: setRatingCommunication },
            { label: 'Item Accuracy', value: ratingItemAccuracy, setter: setRatingItemAccuracy },
            { label: 'Speed', value: ratingSpeed, setter: setRatingSpeed },
            { label: 'Professionalism', value: ratingProfessionalism, setter: setRatingProfessionalism },
          ].map((rating) => (
            <div key={rating.label} className="mb-4">
              <label className="block text-sm font-medium mb-1">{rating.label}</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => rating.setter(r)}
                  >
                    {r <= rating.value ? (
                      <StarIcon className="w-6 h-6 text-yellow-400" />
                    ) : (
                      <StarOutlineIcon className="w-6 h-6 text-gray-300" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Review Text */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Your Review</label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={5}
              className="w-full border rounded-lg p-2"
              placeholder="Share your experience with this seller..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

## Success Metrics
1. **Trust Indicator**: 80%+ of wholesale buyers check seller reputation before purchasing
2. **Review Participation**: 60%+ of completed transactions result in a review
3. **Badge Achievement**: 10%+ of sellers earn Top Seller badge within 6 months
4. **Fraud Detection**: <1% of reviews flagged as fraudulent/fake
5. **Dispute Correlation**: Sellers with 4.5+ rating have 75% fewer disputes
6. **Transaction Value**: Sellers with verified badges complete 2x higher average transaction values

## Dependencies
- **Feature 18**: Wholesale Trading Board (reviews for wholesale transactions)
- **Feature 19**: Bulk Escrow (reviews after escrow completion)
- **Feature 10**: User Authentication (Steam account linking, user profiles)

## Effort Estimate
- **Database Schema**: 4 hours
- **ReputationService**: 12 hours
- **API Endpoints**: 4 hours
- **Seller Profile Page**: 8 hours
- **Write Review Modal**: 6 hours
- **Review Display Components**: 4 hours
- **ID Verification Integration**: 8 hours (if using third-party service)
- **Fraud Detection Algorithm**: 6 hours
- **Testing**: 8 hours
- **Total**: ~60 hours (1.5 weeks)

## Implementation Notes
1. **Two-Way Reviews**: Consider implementing buyer reviews as well (sellers rate buyers) to prevent retaliation
2. **Review Publishing**: Publish both reviews simultaneously after both parties have submitted (Airbnb model)
3. **Time Decay**: Weight recent reviews more heavily (e.g., reviews in last 90 days count 2x)
4. **Review Incentives**: Offer small rewards (badge, discount) for leaving detailed reviews
5. **Moderation Queue**: Build admin dashboard to review flagged reviews and disputes
6. **Anonymous Reviews**: Allow option for anonymous reviews to encourage honest feedback
7. **Verified Purchase Badge**: Show "Verified Purchase" badge on reviews from actual transactions

## Gotchas
1. **Fake Reviews**: Implement strong verification - only allow reviews from completed transactions
2. **Review Bombing**: Rate-limit reviews (max 1 review per transaction, max X reviews per day)
3. **Seller Response Abuse**: Limit seller responses to 1 per review, character limit (500)
4. **Badge Gaming**: Make Top Seller criteria strict enough to prevent gaming (50+ reviews, not 5)
5. **ID Verification Privacy**: Never store raw ID numbers - use hashing and third-party services
6. **GDPR Compliance**: Allow users to delete reviews/data (but maintain aggregated metrics)
7. **Defamation**: Implement review moderation to prevent false/defamatory claims
8. **Seller Retaliation**: Simultaneous review publishing prevents sellers from seeing buyer review before responding

## Status Checklist
- [ ] Database schema created and migrated
- [ ] ReputationService implemented
- [ ] API endpoints created
- [ ] Seller profile page built
- [ ] Write review modal implemented
- [ ] Review display components created
- [ ] Email notifications configured
- [ ] ID verification integration (if applicable)
- [ ] Fraud detection algorithm tested
- [ ] Admin moderation dashboard created
- [ ] Unit tests written (95% coverage)
- [ ] Integration tests written
- [ ] Documentation completed

## Related Features
- **Feature 18**: Wholesale Trading Board (reviews for sellers)
- **Feature 19**: Bulk Escrow (trigger reviews after completion)
- **Feature 10**: User Authentication (user profiles)
- **Feature 21**: Inventory Optimization (prioritize listings from top-rated sellers)

## References
- [eBay Feedback System](https://www.ebay.com/help/buying/resolving-issues-sellers/leaving-feedback-buyers?id=4022)
- [Airbnb Review System](https://www.airbnb.com/help/article/13)
- [Stripe Identity](https://stripe.com/docs/identity) (ID verification)
- [Trust & Safety Best Practices](https://www.marketplace-academy.com/trust-safety/)
- [SteamRep](https://steamrep.com/) (CS2 trader reputation)
