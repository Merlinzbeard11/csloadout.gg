# 01 - Complete Item Database

## 🔄 Updated After Industry Analysis

**Key Changes from Original Spec:**
1. ✅ Update frequency: **Daily → Hourly** (competitive necessity)
2. ✅ Search performance: **<500ms → <200ms** (industry standard)
3. ✅ PostgreSQL config: **'english' → 'simple'** (better for game items)
4. ✅ Added **10 critical gotchas** with mitigation strategies
5. ✅ Image strategy: **Multi-source fallback** (Steam CDN + Vercel Blob)
6. ✅ Legal: **Added ToS disclaimers** (Valve IP protection)
7. ✅ Business model: **Freemium with 1-hour delay** (was 24-hour)

**Competitive Positioning:** Matches Buff163/CSGOSKINS.GG on update frequency, beats on comprehensive coverage.

---

## Overview

A comprehensive database of all CS2 items including skins, stickers, cases, collections, agents, graffiti, patches, and music kits. This serves as the foundation for the wiki functionality and enables all search, browse, and price comparison features.

## User Segments Served

- **Primary:** All Users (100% - universal need)
- **Secondary:** N/A (foundational feature)

## User Stories / Use Cases

### As a Casual Player
- I want to browse all AK-47 skins so I can find one that matches my aesthetic
- I want to see all items in the Operation Riptide collection so I can complete my themed loadout
- I want to search for "blue" skins so I can find items matching my color preference

### As an Investor
- I want to see all items in a case so I can calculate potential trade-up contracts
- I want to browse collections to identify discontinued items with investment potential

### As a Collector
- I want to see all Case Hardened items so I can find pattern seeds I'm missing
- I want to browse by rarity to find specific tier items

## Research & Context

### Data Sources Identified

**Free Options (MVP):**
1. **ByMykel/CSGO-API (GitHub)**
   - URL: https://github.com/ByMykel/CSGO-API
   - Coverage: Skins, cases, stickers, collections, collectibles, agents, graffiti, keys, patches, music kits
   - Format: JSON API via GitHub raw content URLs
   - Languages: Multiple languages supported
   - Cost: FREE
   - Update frequency: Community-maintained
   - **Recommendation:** Primary data source for MVP

2. **Steam Web API**
   - URL: https://steamcommunity.com/dev/apikey
   - Coverage: Official Valve data
   - Cost: FREE (requires API key)
   - Limitations: Limited item metadata compared to community APIs

**Paid Options (Future):**
1. **Pricempire API**
   - Includes item database alongside pricing
   - 5 years historical data
   - Professional-grade data quality

2. **CSGOSKINS.GG API**
   - Item database with pricing from 26 markets
   - Updates every 5 minutes

### Database Schema Requirements

Based on ByMykel/CSGO-API structure:

```sql
-- Items Table (PostgreSQL schema)
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Names (dual storage for display + search)
  name VARCHAR(500) NOT NULL,                    -- Original name from API
  display_name VARCHAR(500) NOT NULL,            -- User-facing display name
  search_name VARCHAR(500) NOT NULL,             -- Normalized for search (lowercase, no special chars)
  description TEXT,

  -- Classification
  type VARCHAR(50) NOT NULL,                     -- skin, sticker, case, collection, agent, graffiti, patch, music_kit
  rarity VARCHAR(50),                            -- consumer, industrial, milspec, restricted, classified, covert, contraband
  quality VARCHAR(50) DEFAULT 'normal',          -- normal, stattrak, souvenir
  wear VARCHAR(50) DEFAULT 'none',               -- factory_new, minimal_wear, field_tested, well_worn, battle_scarred, none
  weapon_type VARCHAR(100),                      -- AK-47, M4A4, AWP, Knife, Gloves, etc.

  -- Relationships
  collection_id UUID REFERENCES collections(id),
  -- Note: case relationships via many-to-many table

  -- Images (multi-source fallback strategy)
  image_url TEXT NOT NULL,                       -- Primary image URL (Steam CDN)
  image_url_fallback TEXT,                       -- Backup URL (alternative source)
  image_local_path TEXT,                         -- Local cached copy (Vercel Blob path)

  -- Skin-specific attributes
  wear_min DECIMAL(10,8),                        -- Minimum float value (e.g., 0.00000000)
  wear_max DECIMAL(10,8),                        -- Maximum float value (e.g., 1.00000000)
  pattern_count INTEGER,                         -- Number of pattern variations (e.g., 1000 for Case Hardened)

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes
  CONSTRAINT items_name_quality_wear_unique UNIQUE (name, quality, wear), -- Prevent duplicates
  INDEX idx_items_search_name (search_name),
  INDEX idx_items_type_rarity (type, rarity),
  INDEX idx_items_weapon_type (weapon_type)
);

-- Full-text search index
CREATE INDEX items_search_idx ON items USING GIN (to_tsvector('simple', search_name || ' ' || description));

-- Trigram index for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX items_trigram_idx ON items USING GIN (search_name gin_trgm_ops);
```

Collections Table:
- id (UUID primary key)
- name (string)
- description (text)
- image_url (string)
- release_date (date)
- is_discontinued (boolean)

Cases Table:
- id (UUID primary key)
- name (string)
- description (text)
- image_url (string)
- release_date (date)
- price_current (decimal - cached from pricing API)
- contains_knives (boolean)
- contains_gloves (boolean)

Stickers Table:
- id (UUID primary key)
- name (string)
- tournament (string nullable - e.g., "Katowice 2014")
- team (string nullable)
- category (enum: normal, holo, foil, gold, glitter)
- image_url (string)
- capsule_id (foreign key to Cases/Capsules)

Item_Case_Mapping Table (many-to-many):
- item_id (foreign key)
- case_id (foreign key)
- drop_chance (decimal percentage)
```

### Content Requirements

**Total Items to Index:**
- **Skins:** ~1,500+ weapon skins
- **Stickers:** ~5,000+ stickers (including tournament stickers)
- **Cases:** ~50+ cases/capsules
- **Collections:** ~30+ collections
- **Agents:** ~20+ agents
- **Other:** Graffiti, patches, music kits (~500+ combined)

**Total Database Size:** Approximately 7,000+ items

### Image Storage

**Options:**
1. **Hotlink to Steam CDN** (MVP approach)
   - Pros: Free, no storage costs, high availability
   - Cons: Dependent on Steam, URLs may change

2. **Self-hosted on Vercel Blob Storage**
   - Pros: Full control, optimized delivery
   - Cons: Storage costs (~$0.15/GB/month)

3. **Cloudflare Images**
   - Pros: CDN optimization, image transformations
   - Cons: Cost at scale

**Recommendation:** Start with Steam CDN hotlinking for MVP, migrate to Vercel Blob if needed

## Technical Requirements

### APIs/Integrations
- ByMykel/CSGO-API (primary data source)
- Steam Web API (supplementary official data)

### Database
- PostgreSQL (Vercel Postgres recommended)
- Full-text search indexes on item names
- Composite indexes on (type, rarity, weapon_type)

### Frontend Components
- Item card component (reusable across browse/search)
- Collection view component
- Case content viewer
- Search autocomplete
- Filter sidebar

### Backend Services
- Data import/sync service (daily cron job to update from ByMykel API)
- Search API endpoint with filters
- Item detail API endpoint
- Collection/Case content API

### Performance Considerations
- Cache item data in Redis/Vercel KV (reduce database queries)
- Lazy load images (intersection observer)
- Paginate browse results (50 items per page)
- Pre-generate static pages for popular items (Next.js ISR)

## Success Metrics

### Phase 1 (MVP) - Competitive Targets
- ✅ 100% item coverage (all 7,000+ items from ByMykel API)
- ✅ <200ms search response time (95th percentile) - *Industry standard*
- ✅ <1s LCP (Largest Contentful Paint) for item pages - *Core Web Vitals*
- ✅ 99.95% uptime for database queries
- ✅ **Hourly data sync** from source APIs (max 1hr stale data) - *Competitive necessity*

### Phase 2 (Post-Launch) - Industry Leader
- ✅ 5-minute price update frequency (matches Buff163, CSGOSKINS.GG)
- ✅ Real-time on-demand updates for premium users
- ✅ <100ms search with advanced filters
- ✅ WebP image optimization (30-50% bandwidth savings)

## Dependencies

### Must Have Before Starting
- PostgreSQL database provisioned (Vercel Postgres)
- Next.js project initialized
- Decision on image storage approach

### Blocks Other Features
This feature MUST be completed before:
- [02] Relational Browsing (requires item data)
- [03] Search & Filters (requires item data)
- [04] Price Aggregation (requires item IDs to match with pricing APIs)
- [08] Budget Loadout Builder (requires item catalog)

## Effort Estimate

- **Development Time:** 2-3 weeks
- **Complexity:** Medium
- **Team Size:** 1 developer

**Breakdown:**
- Week 1: Database schema, data import scripts, basic API endpoints
- Week 2: Frontend item cards, detail pages, image optimization
- Week 3: Testing, data validation, polish

## Implementation Notes

### Data Import Strategy

```typescript
// Production-ready implementation with retry, caching, and proper error handling
import pRetry from 'p-retry';

async function importItemDatabase() {
  // 1. Fetch with retry logic (handles rate limits)
  const items = await pRetry(
    async () => {
      const response = await fetch('https://raw.githubusercontent.com/ByMykel/CSGO-API/main/items.json', {
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`, // 5000 req/hr vs 60 req/hr
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    { retries: 3, factor: 2, minTimeout: 1000 } // Exponential backoff: 1s, 2s, 4s
  );

  // 2. Normalize item names for cross-platform matching
  function normalizeItemName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[|()]/g, '')     // Remove pipes, parentheses
      .replace(/[-_]/g, ' ')     // Hyphens/underscores to spaces
      .replace(/\s+/g, ' ')      // Collapse multiple spaces
      .trim();
  }

  // 3. Upsert with composite unique key (prevents duplicates)
  for (const item of items) {
    await db.items.upsert({
      where: {
        name_quality_wear: {  // Composite unique constraint
          name: item.name,
          quality: item.quality || 'normal',
          wear: item.wear || 'none',
        },
      },
      update: {
        display_name: item.name,
        search_name: normalizeItemName(item.name),
        image_url: item.image,
        image_url_fallback: item.image_alternative, // Backup URL for reliability
        rarity: item.rarity,
        updated_at: new Date(),
      },
      create: {
        name: item.name,
        display_name: item.name,
        search_name: normalizeItemName(item.name),
        quality: item.quality || 'normal',
        wear: item.wear || 'none',
        image_url: item.image,
        image_url_fallback: item.image_alternative,
        rarity: item.rarity,
      },
    });
  }
}

// ✅ UPDATED: Run as cron job every hour (not daily)
// Competitive necessity: Industry standard is 5-15 minute updates
cron.schedule('0 * * * *', importItemDatabase); // Every hour on the hour
```

### Search Implementation

Use PostgreSQL full-text search with 'simple' config (no stemming for game terms):
```sql
-- ✅ UPDATED: Use 'simple' instead of 'english' for better game item name handling
-- 'simple' preserves "AK-47", "Case Hardened" without stemming
CREATE INDEX items_search_idx ON items USING GIN (to_tsvector('simple', search_name || ' ' || description));

-- Add trigram index for fuzzy matching (handles typos)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX items_trigram_idx ON items USING GIN (search_name gin_trgm_ops);

-- Search query with fallback to fuzzy matching
SELECT * FROM items
WHERE
  to_tsvector('simple', search_name || ' ' || description) @@ plainto_tsquery('simple', 'blue ak47')
  OR search_name % 'blue ak47' -- Fuzzy match if exact fails
ORDER BY rarity DESC, name ASC
LIMIT 50;

-- Expected performance: <200ms for 95th percentile (7,000 items)
```

### ⚠️ Critical Gotchas to Watch For

#### 1. **Steam CDN Image URL Expiration** (SEVERITY: HIGH)
**Problem:** Steam CDN URLs can change without notice, breaking all image references.
```typescript
// ❌ BAD: Direct hotlinking with no fallback
<img src="https://steamcdn-a.akamaihd.net/.../weapon_ak47.png" />

// ✅ GOOD: Multi-source fallback strategy
const [imgSrc, setImgSrc] = useState(item.image_url);
<img
  src={imgSrc}
  onError={() => setImgSrc(item.image_url_fallback || '/fallback-item.png')}
  loading="lazy"
/>
```
**Mitigation:**
- Store primary + fallback URLs in database
- Monitor 404 errors and auto-update broken URLs
- Budget for Vercel Blob migration: $0.21/month (7,000 images × 200KB avg)

#### 2. **PostgreSQL Full-Text Search - Language Configuration** (SEVERITY: MEDIUM)
**Problem:** Item names contain special characters (AK-47, M4A4) that 'english' config handles poorly.
```sql
-- ❌ BAD: 'english' stems "Hardened" → "Harden", loses hyphen
to_tsvector('english', 'AK-47 | Case Hardened')
-- Returns: 'ak':1 '47':2 'case':3 'harden':4

-- ✅ GOOD: 'simple' preserves game terminology
to_tsvector('simple', 'AK-47 | Case Hardened')
-- Returns: 'ak-47':1 'case':2 'hardened':3
```

#### 3. **GitHub API Rate Limiting** (SEVERITY: MEDIUM)
**Problem:** GitHub raw content URLs = 60 requests/hour (unauthenticated).
```typescript
// ✅ Solution: Use personal access token + caching
const response = await fetch(url, {
  headers: { 'Authorization': `token ${process.env.GITHUB_TOKEN}` } // 5000 req/hr
});
await redis.set('bymykel_cache', data, { ex: 3600 }); // 1-hour cache
```

#### 4. **Item Name Normalization** (SEVERITY: MEDIUM)
**Problem:** Different platforms use different name formats.
| Source | Format |
|--------|--------|
| Steam | `AK-47 \| Case Hardened (Field-Tested)` |
| ByMykel | `AK-47 Case Hardened` |
| CSFloat | `ak47_case_hardened` |

**Solution:** Store both display_name and normalized search_name.

#### 5. **Upsert Conflicts - Duplicate Detection** (SEVERITY: LOW)
**Problem:** Same item can exist with different wear conditions.
```typescript
// ✅ Use composite unique key to prevent duplicates
await db.items.upsert({
  where: {
    name_quality_wear: { name, quality, wear } // Compound unique index
  },
  // ...
});
```

#### 6. **Data Licensing & Legal Risk** (SEVERITY: HIGH - LEGAL)
**Problem:** Valve's ToS regarding data usage are unclear.
**Solution:**
- Add disclaimer: "Not affiliated with or endorsed by Valve Corporation"
- Use only public APIs (no scraping)
- Consult lawyer before monetization

#### 7. **Image Copyright & Bandwidth** (SEVERITY: MEDIUM - LEGAL/COST)
**Industry Practice:**
| Platform | Strategy | Cost/Month |
|----------|----------|------------|
| CSFloat | Self-hosted (Cloudflare) | ~$50 |
| CSGOSKINS.GG | Steam CDN hotlink | $0 (risky) |
| **csloadout.gg** | **Vercel Blob** | **$0.21** |

#### 8. **Search Performance at Scale** (SEVERITY: LOW)
**Current Scale:** 7,000 items = PostgreSQL FTS is sufficient (<200ms)
**Migration Trigger:** Query latency >200ms or item count >100,000
**Future Option:** Typesense ($5/month) or Algolia (free tier)

#### 9. **Data Staleness - Competitive Disadvantage** (SEVERITY: HIGH - BUSINESS)
**Problem:** Daily updates = 23 hours stale data = non-competitive.
**Industry Standards:**
- CSFloat: Real-time (on-demand)
- Buff163: 5 minutes
- CSGOSKINS.GG: 5 minutes
- **Recommendation:** Hourly updates (MVP) → 5 minutes (post-launch)

#### 10. **Sticker Tournament Editions & Discontinued Collections**
- Same sticker name can have multiple editions (normal, holo, foil, gold)
- Flag discontinued collections for investor features (scarcity = value)
- Validate data integrity on each sync

## 🏆 Industry Comparison & Best Practices

### Competitive Landscape

| Feature | CSFloat | Buff163 | CSGOSKINS.GG | csloadout.gg (Plan) |
|---------|---------|---------|--------------|---------------------|
| **Item Coverage** | Skins only | All items | All items | ✅ All items (7,000+) |
| **Update Frequency** | Real-time | 5 minutes | 5 minutes | ✅ Hourly (MVP) → 5min |
| **Search Speed** | <100ms | <50ms | <200ms | ✅ <200ms (MVP) |
| **Image Strategy** | Self-hosted | Self-hosted CDN | Steam hotlink | ✅ Vercel Blob + fallback |
| **Unique Data** | ✅ Pattern rarity | ✅ CN market | Multi-platform | ✅ Pattern + multi-platform |
| **API Access** | Limited | No | Yes (paid) | ✅ Yes (freemium) |

### Business Model Recommendations

**Freemium Strategy:**
```typescript
// ✅ Free Tier (build trust, drive adoption)
{
  itemDatabase: 'Full access (7,000+ items)',
  search: 'Unlimited searches',
  priceUpdates: '1-hour delay', // Still competitive for casual users
  alerts: 'Maximum 3 alerts',
  historicalData: '7 days',
  apiAccess: '1,000 requests/day',
}

// ✅ Premium Tier $9.99/month (clear value proposition)
{
  itemDatabase: 'Same as free',
  search: 'Advanced filters (pattern, float, sticker)',
  priceUpdates: 'Real-time (5-second delay)', // Key differentiator
  alerts: 'Unlimited alerts',
  historicalData: '5 years + charts',
  apiAccess: '50,000 requests/day',
  export: 'CSV/Excel export',
}
```

**Key Insight:** Free tier must be genuinely useful (1-hour delay, not 24-hour) to build trust and drive premium conversions.

### Technical Best Practices from Industry Leaders

1. **Data Accuracy > Feature Count** (CSFloat)
   - Users trust platforms that never show wrong prices
   - Single data error = lost credibility
   - Validate all data before storing

2. **Performance is Table Stakes** (Buff163)
   - Users expect <200ms search
   - Image optimization mandatory (WebP, lazy loading)
   - Cache aggressively (Redis for hot data)

3. **API-First Architecture** (CSGOSKINS.GG)
   - Public API drove developer ecosystem
   - Third-party apps = network effects
   - API users become premium subscribers

### Legal & Compliance

**Required Disclaimers:**
```html
<!-- Add to footer on every page -->
<div class="legal-disclaimer">
  csloadout.gg is not affiliated with, endorsed by, or connected to Valve Corporation.
  CS2, Counter-Strike, Steam, and related trademarks are property of Valve Corporation.
  Item data sourced from public APIs and community contributions.
  Prices are estimates and may not reflect actual market values.
</div>
```

**robots.txt:**
```
User-agent: *
Allow: /
Disallow: /api/internal/
Disallow: /admin/

# Allow public API documentation
Allow: /api/docs/
```

## Status

- [ ] Research complete
- [ ] Database schema designed
- [ ] Data import scripts written
- [ ] API endpoints implemented
- [ ] Frontend components built
- [ ] Testing complete
- [ ] Deployed to production

## Related Features

- **Depends On:** None (foundational feature)
- **Enables:**
  - [02] Relational Browsing
  - [03] Search & Filters
  - [04] Price Aggregation
  - [08] Budget Loadout Builder
  - [23] Craft Simulator
  - [26] Pattern Database

## References

- ByMykel/CSGO-API: https://github.com/ByMykel/CSGO-API
- Steam Web API Docs: https://steamcommunity.com/dev
- PostgreSQL Full-Text Search: https://www.postgresql.org/docs/current/textsearch.html
