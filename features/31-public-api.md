# Feature 31: Public API

## Overview
RESTful public API enabling third-party developers to access CS2 market data, price history, patterns, stickers, and crafts. Includes authentication, rate limiting, documentation, and developer portal. Drives ecosystem growth and establishes platform as data authority.

## User Segments
- **Primary**: Developers, API Consumers, Third-Party Apps
- **Secondary**: Content Creators, Researchers
- **Tertiary**: Enterprise Clients

## User Stories

### As a Developer
- I want to fetch CS2 skin prices via API for my trading bot
- I want to access pattern database to build pattern recognition tool
- I want API documentation with examples and SDKs
- I want to test API in sandbox environment before going live
- I want webhooks to receive real-time price updates

### As a Third-Party App
- I want to integrate csloadout.gg data into my Discord bot
- I want to display craft gallery in my mobile app
- I want to show portfolio analytics in my dashboard
- I want rate limits sufficient for my user base

### As a Researcher
- I want to download historical price data for analysis
- I want to access pattern rarity data for machine learning
- I want bulk export APIs for datasets

### As the Platform
- I want to establish API as industry standard
- I want to monetize API usage (freemium model)
- I want to track API usage and analytics
- I want to prevent abuse with rate limiting

## Research & Context

### API Design Principles

1. **RESTful Architecture**
   - Resource-based URLs (`/api/v1/items`, `/api/v1/patterns`)
   - HTTP methods (GET, POST, PUT, DELETE)
   - JSON response format
   - Stateless requests

2. **Versioning**
   - URL versioning (`/api/v1`, `/api/v2`)
   - Deprecation policy (6-month notice)

3. **Authentication**
   - API keys (simple, good for server-to-server)
   - OAuth 2.0 (for user-specific data)
   - JWT tokens (for short-lived access)

4. **Rate Limiting**
   - **Free Tier**: 1,000 requests/day
   - **Pro Tier**: 50,000 requests/day ($49/month)
   - **Enterprise**: Custom limits

5. **Error Handling**
   - Standard HTTP status codes
   - Detailed error messages
   - Error codes for debugging

### Competitor APIs

- **Steam API**: Game data, inventory, market
- **CSFloat API**: Float database, pattern data
- **CSGOSKINS.GG API**: Price aggregation
- **Opportunity**: Most comprehensive CS2 data API with pattern/craft/analytics

## Technical Requirements

### Database Schema

```sql
-- API keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Key details
  api_key VARCHAR(100) UNIQUE NOT NULL, -- SHA-256 hash
  api_secret VARCHAR(100) NOT NULL, -- Encrypted
  key_name VARCHAR(255) NOT NULL, -- User-friendly name

  -- Permissions (scope)
  scopes VARCHAR(50)[], -- ['read:items', 'read:patterns', 'write:crafts']

  -- Rate limiting
  rate_limit_tier VARCHAR(50) DEFAULT 'free', -- 'free', 'pro', 'enterprise'
  requests_per_day INTEGER DEFAULT 1000,
  requests_today INTEGER DEFAULT 0,
  last_request_date DATE DEFAULT CURRENT_DATE,

  -- Status
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,

  INDEX idx_api_keys_user_id (user_id),
  INDEX idx_api_keys_api_key (api_key)
);

-- API usage logs
CREATE TABLE api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,

  -- Request details
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,

  -- Request metadata
  user_agent TEXT,
  ip_address VARCHAR(45),

  -- Timestamps
  request_timestamp TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_api_usage_logs_api_key_id (api_key_id, request_timestamp DESC),
  INDEX idx_api_usage_logs_endpoint (endpoint, request_timestamp DESC)
);

-- API rate limit tracking
CREATE TABLE api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,

  -- Rate limit window
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,

  -- Usage
  requests_count INTEGER DEFAULT 0,
  requests_limit INTEGER NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_api_rate_limits_api_key_window (api_key_id, window_end DESC)
);
```

### API Endpoints Specification

#### Authentication
- `POST /api/v1/auth/token` - Generate access token from API key

#### Items (Skins)
- `GET /api/v1/items` - List all items (paginated)
- `GET /api/v1/items/:id` - Get specific item
- `GET /api/v1/items/:id/price-history` - Get price history

#### Patterns
- `GET /api/v1/patterns` - List patterns (with filters)
- `GET /api/v1/patterns/:skin/:index` - Get specific pattern

#### Stickers
- `GET /api/v1/stickers` - List stickers
- `GET /api/v1/stickers/:id` - Get sticker details

#### Crafts
- `GET /api/v1/crafts` - List public crafts
- `GET /api/v1/crafts/:id` - Get craft details
- `POST /api/v1/crafts` - Create craft (requires auth)

#### Loadouts
- `GET /api/v1/loadouts` - List public loadouts
- `GET /api/v1/loadouts/:id` - Get loadout details

#### Analytics
- `GET /api/v1/analytics/market-summary` - Market overview
- `GET /api/v1/analytics/trending-items` - Trending items

### Services

#### `src/services/PublicAPIService.ts`

```typescript
import { db } from '@/lib/db';
import crypto from 'crypto';

export class PublicAPIService {
  /**
   * Generate API key
   */
  async generateAPIKey(userId: string, keyName: string, tier: string = 'free', scopes: string[] = []): Promise<{ apiKey: string; apiSecret: string }> {
    // Generate random API key and secret
    const apiKey = `csloadout_${crypto.randomBytes(32).toString('hex')}`;
    const apiSecret = crypto.randomBytes(32).toString('hex');

    // Hash API secret
    const apiSecretHash = crypto.createHash('sha256').update(apiSecret).digest('hex');

    // Determine rate limit based on tier
    const rateLimits: Record<string, number> = {
      free: 1000,
      pro: 50000,
      enterprise: 1000000,
    };

    const requestsPerDay = rateLimits[tier] || 1000;

    // Create API key record
    await db.api_keys.create({
      data: {
        user_id: userId,
        api_key: apiKey,
        api_secret: apiSecretHash,
        key_name: keyName,
        scopes,
        rate_limit_tier: tier,
        requests_per_day: requestsPerDay,
      },
    });

    return { apiKey, apiSecret };
  }

  /**
   * Validate API key
   */
  async validateAPIKey(apiKey: string): Promise<any> {
    const keyRecord = await db.api_keys.findUnique({
      where: { api_key: apiKey },
    });

    if (!keyRecord) {
      throw new Error('Invalid API key');
    }

    if (!keyRecord.is_active) {
      throw new Error('API key is inactive');
    }

    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      throw new Error('API key has expired');
    }

    // Update last used
    await db.api_keys.update({
      where: { id: keyRecord.id },
      data: { last_used_at: new Date() },
    });

    return keyRecord;
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(apiKeyId: string): Promise<boolean> {
    const apiKey = await db.api_keys.findUnique({
      where: { id: apiKeyId },
    });

    if (!apiKey) return false;

    const today = new Date().toISOString().split('T')[0];

    // Reset daily counter if new day
    if (apiKey.last_request_date?.toISOString().split('T')[0] !== today) {
      await db.api_keys.update({
        where: { id: apiKeyId },
        data: {
          requests_today: 0,
          last_request_date: new Date(today),
        },
      });

      return true; // Allowed
    }

    // Check if under limit
    if (apiKey.requests_today >= apiKey.requests_per_day) {
      return false; // Rate limit exceeded
    }

    return true; // Allowed
  }

  /**
   * Increment usage count
   */
  async incrementUsage(apiKeyId: string, endpoint: string, method: string, statusCode: number, responseTime: number): Promise<void> {
    // Increment daily counter
    await db.api_keys.update({
      where: { id: apiKeyId },
      data: { requests_today: { increment: 1 } },
    });

    // Log usage
    await db.api_usage_logs.create({
      data: {
        api_key_id: apiKeyId,
        endpoint,
        method,
        status_code: statusCode,
        response_time_ms: responseTime,
      },
    });
  }

  /**
   * Get API usage stats
   */
  async getUsageStats(apiKeyId: string, days: number = 30): Promise<any> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const logs = await db.api_usage_logs.findMany({
      where: {
        api_key_id: apiKeyId,
        request_timestamp: { gte: cutoffDate },
      },
    });

    // Aggregate stats
    const totalRequests = logs.length;
    const avgResponseTime = logs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / totalRequests;
    const errorCount = logs.filter((log) => log.status_code >= 400).length;
    const errorRate = (errorCount / totalRequests) * 100;

    return {
      totalRequests,
      avgResponseTime: Math.round(avgResponseTime),
      errorCount,
      errorRate: errorRate.toFixed(2),
    };
  }

  /**
   * Revoke API key
   */
  async revokeAPIKey(apiKeyId: string, userId: string): Promise<void> {
    await db.api_keys.updateMany({
      where: {
        id: apiKeyId,
        user_id: userId,
      },
      data: { is_active: false },
    });
  }
}

export const publicAPIService = new PublicAPIService();
```

### API Middleware

#### `src/middleware/apiAuth.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { publicAPIService } from '@/services/PublicAPIService';

export async function apiAuth(req: NextRequest) {
  const apiKey = req.headers.get('X-API-Key');

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
  }

  try {
    // Validate API key
    const keyRecord = await publicAPIService.validateAPIKey(apiKey);

    // Check rate limit
    const withinLimit = await publicAPIService.checkRateLimit(keyRecord.id);

    if (!withinLimit) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Attach key info to request (for logging)
    (req as any).apiKey = keyRecord;

    return null; // Proceed
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
```

### API Route Example

#### `src/app/api/v1/items/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { apiAuth } from '@/middleware/apiAuth';
import { publicAPIService } from '@/services/PublicAPIService';

// GET /api/v1/items - List items
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  // Authenticate
  const authError = await apiAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    // Fetch items (simplified example)
    const items = await db.market_items.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const total = await db.market_items.count();

    // Log usage
    const responseTime = Date.now() - startTime;
    await publicAPIService.incrementUsage((req as any).apiKey.id, '/api/v1/items', 'GET', 200, responseTime);

    return NextResponse.json({
      data: items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## Success Metrics
1. **API Adoption**: 500+ registered API keys within 6 months
2. **Daily Requests**: 100,000+ API requests per day
3. **Developer Satisfaction**: 90%+ positive feedback
4. **Revenue**: $5,000+ monthly recurring revenue from Pro/Enterprise tiers
5. **Third-Party Apps**: 20+ apps built on API

## Dependencies
- **Feature 03**: Price Tracking (price data)
- **Feature 26**: Pattern/Float Database (pattern data)
- **Feature 25**: Sticker Database (sticker data)

## Effort Estimate
- **Database Schema**: 4 hours
- **PublicAPIService**: 12 hours
- **API Middleware**: 6 hours
- **API Routes**: 20 hours (10+ endpoints)
- **Documentation**: 12 hours
- **Developer Portal**: 16 hours
- **Rate Limiting**: 6 hours
- **Testing**: 10 hours
- **Total**: ~86 hours (2.15 weeks)

## Implementation Notes
1. **API Versioning**: Start with v1, plan for v2 when breaking changes needed
2. **Documentation**: Use OpenAPI/Swagger for auto-generated docs
3. **SDKs**: Provide JavaScript/Python SDKs for easier integration
4. **Sandbox**: Provide test environment with sample data
5. **Webhooks**: Implement webhooks for real-time updates (Feature 32)

## Gotchas
1. **Rate Limiting**: Ensure fair usage - prevent abuse
2. **Data Privacy**: Don't expose user-specific data without permission
3. **Breaking Changes**: Maintain backwards compatibility for 6 months
4. **Performance**: Cache frequently accessed data (prices, patterns)
5. **Security**: Validate all inputs, prevent SQL injection

## Status Checklist
- [ ] Database schema created and migrated
- [ ] PublicAPIService implemented
- [ ] API middleware created
- [ ] 10+ API endpoints built
- [ ] Rate limiting functional
- [ ] API documentation written (OpenAPI spec)
- [ ] Developer portal built
- [ ] JavaScript SDK created
- [ ] Python SDK created
- [ ] Sandbox environment set up
- [ ] Unit tests written (95% coverage)
- [ ] Integration tests written
- [ ] Documentation completed

## Related Features
- **Feature 32**: Webhooks (real-time updates)
- **Feature 03**: Price Tracking (data source)
- **Feature 26**: Pattern/Float Database (data source)

## References
- [REST API Best Practices](https://restfulapi.net/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Stripe API](https://stripe.com/docs/api) (gold standard)
- [API Rate Limiting Patterns](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
