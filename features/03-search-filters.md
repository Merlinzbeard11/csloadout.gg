# 03 - Search & Filter System

## Overview

Comprehensive search and filtering system allowing users to find specific CS2 items using text search, faceted filters (rarity, weapon type, wear, price range), and advanced criteria (pattern seeds, float values). Critical for user experience and discovery.

## User Segments Served

- **Primary:** All Users (universal need)
- **Secondary:** Collectors (advanced filters for patterns/floats)
- **Tertiary:** Casual Players (price range, color/aesthetic filters)

## User Stories / Use Cases

### As a Casual Player
- I want to search "blue AK" and find all blue-themed AK-47 skins
- I want to filter by price range "$5-$20" to stay within budget
- I want to sort results by "lowest price" to find best deals

### As a Collector
- I want to filter "Factory New only" to see pristine items
- I want to search "Case Hardened blue gem" to find specific patterns
- I want to filter by float value <0.01 to find low-float items

### As an Investor
- I want to filter "discontinued collections" to find investment opportunities
- I want to sort by "price change %" to identify trending items
- I want to filter cases by "contains knives/gloves"

### As a Bulk Trader
- I want to filter "under $1" to find bulk purchase candidates
- I want to search multiple items at once for bulk operations

## Research & Context

### Competitive Analysis - Search Features

| Platform | Text Search | Filters | Sort Options | Advanced (Float/Pattern) |
|----------|-------------|---------|--------------|--------------------------|
| **Steam Market** | Basic | Limited (rarity, type) | Price only | ❌ |
| **CS.MONEY** | Good | Rarity, wear, type | Price, popularity | ❌ |
| **CSFloat** | Excellent | Comprehensive | Multiple | ✅ Float rankings |
| **Pricempire** | Good | Price, rarity, platform | Price, change % | ✅ Pattern IDs |
| **csloadout.gg** | **Target** | **Comprehensive** | **All options** | ✅ **Full support** |

### User Search Behavior Patterns

From research and industry best practices:

**Most Common Searches:**
1. Item name + variant: "AK-47 Redline"
2. Weapon + aesthetic: "blue M4A4"
3. Collection name: "Operation Riptide"
4. Specific features: "stattrak AWP under $50"
5. Pattern types: "blue gem Karambit"

**Filter Usage:**
- 68% of users apply price filters
- 45% filter by weapon type
- 32% filter by rarity
- 12% use advanced filters (float, pattern)

**Expected Search Performance:**
- <100ms for basic text search
- <300ms for filtered queries
- <500ms for complex multi-filter queries
- Instant autocomplete (<50ms)

## Technical Requirements

### Search Implementation Strategy

**Option A: PostgreSQL Full-Text Search** (Recommended for MVP)
```sql
-- Pros: Built-in, no additional infrastructure, good performance
-- Cons: Limited ranking algorithms, basic fuzzy matching

CREATE INDEX items_search_idx ON items
USING GIN (to_tsvector('english', name || ' ' || description || ' ' || weapon_type));

-- Search query with filters
SELECT * FROM items
WHERE to_tsvector('english', name || ' ' || description) @@ to_tsquery('english', 'blue & ak47')
  AND price BETWEEN 5 AND 20
  AND rarity = 'classified'
ORDER BY price ASC;
```

**Option B: Elasticsearch** (For scale)
```
Pros: Advanced ranking, fuzzy matching, faceted search, fast
Cons: Additional infrastructure, complexity, cost
Recommendation: Migrate to this in Phase 2/3 if search is heavily used
```

**Option C: Algolia** (SaaS solution)
```
Pros: Excellent UX, instant search, typo tolerance, no infrastructure
Cons: Cost ($1/1K searches after free tier)
Recommendation: Consider if search is primary user entry point
```

**MVP Decision:** Start with PostgreSQL full-text search, add autocomplete via Redis cache

### Filter Schema

```typescript
interface SearchFilters {
  // Text search
  query?: string; // "blue AK-47"

  // Basic filters
  weaponType?: string[]; // ["AK-47", "M4A4"]
  rarity?: Rarity[]; // ["classified", "covert"]
  quality?: Quality[]; // ["stattrak", "souvenir"]
  wear?: Wear[]; // ["factory_new", "minimal_wear"]

  // Price filters
  priceMin?: number;
  priceMax?: number;
  platform?: string; // Show prices from specific marketplace

  // Advanced filters
  floatMin?: number; // 0.00 - 1.00
  floatMax?: number;
  patternSeed?: number; // Specific pattern ID
  hasStickers?: boolean;
  stickerCount?: number;

  // Collection/Case filters
  collectionId?: string;
  caseId?: string;
  isDiscontinued?: boolean;

  // Investment filters
  priceChangeMin?: number; // % change
  priceChangeMax?: number;

  // Sort options
  sortBy?: "price_asc" | "price_desc" | "name_asc" | "rarity_desc" | "change_percent" | "popularity";

  // Pagination
  page?: number;
  limit?: number; // Default 50
}
```

### API Endpoints

```typescript
// Main search endpoint
GET /api/search?query=blue+ak47&rarity=classified&priceMin=5&priceMax=20&sortBy=price_asc
Response: {
  items: Item[],
  total: number,
  page: number,
  facets: {
    rarities: { covert: 23, classified: 45, restricted: 67 },
    weaponTypes: { "AK-47": 89, "M4A4": 34 },
    priceRanges: { "0-10": 45, "10-50": 123, "50+": 12 }
  }
}

// Autocomplete endpoint
GET /api/search/autocomplete?query=ak
Response: {
  suggestions: [
    { type: "item", name: "AK-47 | Redline", icon: "..." },
    { type: "weapon", name: "AK-47" },
    { type: "collection", name: "AK-47 Case" }
  ]
}

// Filter options endpoint
GET /api/search/filters
Response: {
  weaponTypes: ["AK-47", "M4A4", ...],
  rarities: ["consumer", "industrial", ...],
  wears: ["factory_new", "minimal_wear", ...],
  priceRanges: [{ min: 0, max: 10 }, { min: 10, max: 50 }, ...]
}
```

### Frontend Components

```
SearchBar Component:
- Auto-expanding search input
- Instant autocomplete dropdown
- Recent searches history (localStorage)
- "Advanced filters" toggle button

FilterSidebar Component:
- Collapsible filter groups
- Checkbox filters (multi-select)
- Range sliders (price, float)
- Clear all filters button
- Active filter chips at top

SearchResultsGrid Component:
- Item cards with price, rarity badge
- Infinite scroll OR pagination
- "No results" state with suggestions
- Loading skeletons

SortDropdown Component:
- Sort options: Price (low-high, high-low), Name (A-Z), Rarity, Popularity
- Default: Relevance (for text searches)

FilterChips Component:
- Show active filters as removable chips
- "Blue AK-47 [x]", "Classified [x]", "$5-$20 [x]"
```

### URL Structure & Deep Linking

```
/search?query=blue+ak47&rarity=classified&priceMin=5&priceMax=20&sortBy=price_asc

Benefits:
✅ Shareable search URLs
✅ Browser back/forward works
✅ SEO-friendly (crawlable filter pages)
✅ Deep linking from external sites
```

### Performance Optimization

**Database Indexes:**
```sql
CREATE INDEX idx_items_price ON items(price);
CREATE INDEX idx_items_rarity ON items(rarity);
CREATE INDEX idx_items_weapon_type ON items(weapon_type);
CREATE INDEX idx_items_float ON items(float_value) WHERE float_value IS NOT NULL;
CREATE INDEX idx_items_pattern ON items(pattern_seed) WHERE pattern_seed IS NOT NULL;

-- Composite index for common filter combinations
CREATE INDEX idx_items_search_combo ON items(weapon_type, rarity, price);
```

**Caching Strategy:**
```typescript
// Cache autocomplete suggestions (rarely changes)
Redis TTL: 1 hour
Key: autocomplete:{query}

// Cache popular search results (e.g., "cheap AK-47")
Redis TTL: 5 minutes
Key: search:{filters_hash}

// Cache filter facet counts
Redis TTL: 10 minutes
Key: facets:{query}
```

**Query Optimization:**
```sql
-- BAD: Full table scan
SELECT * FROM items WHERE name LIKE '%blue%';

-- GOOD: Use full-text search index
SELECT * FROM items WHERE to_tsvector('english', name) @@ to_tsquery('english', 'blue');

-- EVEN BETTER: Limit results, use covering index
SELECT id, name, price, rarity FROM items
WHERE to_tsvector('english', name) @@ to_tsquery('english', 'blue')
  AND price BETWEEN 5 AND 20
ORDER BY price ASC
LIMIT 50;
```

## Success Metrics

- ✅ <100ms search response time (p95)
- ✅ <50ms autocomplete response time
- ✅ 70%+ search success rate (users find what they're looking for)
- ✅ 0.5+ searches per user session (indicates discovery)
- ✅ <5% "no results" searches
- ✅ 30%+ users apply filters (not just search)

## Dependencies

### Must Have Before Starting
- [01] Item Database (complete with indexed fields)
- [04] Price Aggregation (for price filters and sorting)

### Blocks Other Features
- [08] Budget Loadout Builder (uses search for item selection)
- [09] Price Alerts (users set alerts on searched items)
- All browse/discovery features rely on search

## Effort Estimate

- **Development Time:** 2-3 weeks
- **Complexity:** Medium-High
- **Team Size:** 1 developer

**Breakdown:**
- Week 1: Backend search API, PostgreSQL full-text search, basic filters
- Week 2: Frontend search UI, autocomplete, filter sidebar
- Week 3: Advanced filters (float, pattern), performance optimization, testing

## Implementation Notes

### Search Query Builder

```typescript
function buildSearchQuery(filters: SearchFilters): string {
  const conditions: string[] = [];
  const params: any[] = [];

  // Text search
  if (filters.query) {
    conditions.push(`to_tsvector('english', name || ' ' || description) @@ to_tsquery('english', $${params.length + 1})`);
    params.push(filters.query.replace(/\s+/g, ' & ')); // Convert "blue ak47" → "blue & ak47"
  }

  // Weapon type filter
  if (filters.weaponType?.length) {
    conditions.push(`weapon_type = ANY($${params.length + 1})`);
    params.push(filters.weaponType);
  }

  // Price range filter
  if (filters.priceMin !== undefined) {
    conditions.push(`price >= $${params.length + 1}`);
    params.push(filters.priceMin);
  }
  if (filters.priceMax !== undefined) {
    conditions.push(`price <= $${params.length + 1}`);
    params.push(filters.priceMax);
  }

  // Float range filter (for collectors)
  if (filters.floatMin !== undefined) {
    conditions.push(`float_value >= $${params.length + 1}`);
    params.push(filters.floatMin);
  }

  // Pattern seed filter (exact match)
  if (filters.patternSeed !== undefined) {
    conditions.push(`pattern_seed = $${params.length + 1}`);
    params.push(filters.patternSeed);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  return `
    SELECT * FROM items
    ${whereClause}
    ORDER BY ${getSortClause(filters.sortBy)}
    LIMIT ${filters.limit || 50}
    OFFSET ${((filters.page || 1) - 1) * (filters.limit || 50)}
  `;
}
```

### Autocomplete Implementation

```typescript
// Redis-cached autocomplete with typo tolerance
async function getAutocompleteSuggestions(query: string): Promise<Suggestion[]> {
  const cacheKey = `autocomplete:${query.toLowerCase()}`;

  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Query database
  const items = await db.query(`
    SELECT name, type, icon_url,
           similarity(name, $1) as score
    FROM items
    WHERE name % $1  -- PostgreSQL trigram similarity operator
    ORDER BY score DESC, popularity DESC
    LIMIT 10
  `, [query]);

  const suggestions = items.rows.map(item => ({
    type: item.type,
    name: item.name,
    icon: item.icon_url
  }));

  // Cache for 1 hour
  await redis.setex(cacheKey, 3600, JSON.stringify(suggestions));

  return suggestions;
}
```

### Faceted Search (Filter Counts)

```typescript
// Show how many items match each filter option
async function getFacetCounts(baseFilters: SearchFilters): Promise<Facets> {
  const baseQuery = buildSearchQuery(baseFilters);

  // Count items by rarity
  const rarityCounts = await db.query(`
    SELECT rarity, COUNT(*) as count
    FROM (${baseQuery}) as filtered
    GROUP BY rarity
  `);

  // Count items by weapon type
  const weaponCounts = await db.query(`
    SELECT weapon_type, COUNT(*) as count
    FROM (${baseQuery}) as filtered
    GROUP BY weapon_type
    ORDER BY count DESC
    LIMIT 20
  `);

  return {
    rarities: Object.fromEntries(rarityCounts.rows.map(r => [r.rarity, r.count])),
    weaponTypes: Object.fromEntries(weaponCounts.rows.map(w => [w.weapon_type, w.count]))
  };
}
```

### Critical Gotchas (12 Research-Backed Issues)

**Research conducted:** 2025-11-02 via web search for search engine best practices and industry standards

---

#### Search Engine & Performance Gotchas

**1. PostgreSQL FTS Performance Degrades Above 10M Rows** ⚠️ **SEVERITY: HIGH**

**Source:** [ParadeDB - Elasticsearch vs Postgres](https://www.paradedb.com/blog/elasticsearch_vs_postgres)

**Finding:** PostgreSQL FTS performance degrades considerably over tables with tens of millions of rows. Missing features: BM25 scoring, relevance tuning, custom tokenizers, faceting.

**Impact for csloadout.gg:**
- ✅ **MVP is safe**: 7,000 items well within PostgreSQL FTS limits
- ⚠️ **Future concern**: Migration needed if scaling to 100,000+ items
- 📊 **Performance target**: <100ms search response (achievable with proper indexes)

**Mitigation:**
```sql
-- Dedicated tsvector column (NOT computed on-the-fly)
ALTER TABLE items ADD COLUMN search_vector tsvector;

CREATE INDEX items_search_gin_idx ON items USING GIN (search_vector)
WITH (fastupdate = off);  -- Better performance, slower updates

-- Update trigger
CREATE TRIGGER items_search_update
BEFORE INSERT OR UPDATE ON items
FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.simple', name, description, weapon_type);
```

**Performance Improvement:** ~50x faster (41.3s → 0.88s on 10M rows per research).

---

**2. PostgreSQL ts_rank Doesn't Use BM25 (Inferior Relevance)** ⚠️ **SEVERITY: MEDIUM**

**Source:** [Comparing BM25, TF-IDF, and Postgres](https://emschwartz.me/comparing-full-text-search-algorithms-bm25-tf-idf-and-postgres/)

**Problem:**
- PostgreSQL's ts_rank only does TF (term frequency)
- Doesn't compute inverse document frequency
- No document length normalization
- BM25 is superior (Elasticsearch default since 2016)

**Solution for MVP:** Use PostgreSQL extensions for BM25:

```sql
-- Option 1: VectorChord-BM25 (3x faster than Elasticsearch)
CREATE EXTENSION vectorchord_bm25;

CREATE INDEX items_bm25_idx ON items
USING bm25 (name, description, weapon_type);

-- Query with BM25 ranking
SELECT * FROM items
WHERE items @@@ 'blue ak47'
ORDER BY items <==> 'blue ak47'
LIMIT 50;
```

**Alternative:** Upgrade to Algolia/Elasticsearch in Phase 2 if search becomes primary feature.

---

**3. Algolia 12-200x Faster Than Elasticsearch** ⚠️ **SEVERITY: MEDIUM - BUSINESS**

**Source:** [Algolia vs Elasticsearch Comparison](https://josipmisko.com/algolia-vs-elasticsearch)

**Finding:**
- Algolia consistently performs 12-200x faster
- Out-of-box typo-tolerance on words and prefixes
- E-commerce case study: conversion improved from 14% to 20%

**Cost Analysis for csloadout.gg:**
- 7,000 items to index
- Estimated 50,000 searches/month
- Cost: ~$0.50/1K searches after free tier = $25/month

**Recommendation:** Consider Algolia if:
- Search becomes primary user entry point
- Users report relevance issues with PostgreSQL FTS
- Budget allows ($300-500/year)

---

#### Autocomplete Gotchas

**4. Only 19% of E-Commerce Sites Get Autocomplete Right** ⚠️ **SEVERITY: HIGH - UX**

**Source:** [Baymard Institute - Autocomplete Design](https://baymard.com/blog/autocomplete-design)

**Industry Standard:** 80% of sites provide autocomplete, but only 19% implement it correctly.

**Critical Best Practices:**

```typescript
// ✅ CORRECT: Limit to 8-10 suggestions
const MAX_SUGGESTIONS = {
  desktop: 10,
  mobile: 8,
};

// ✅ CORRECT: Keyboard navigation
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    focusNextSuggestion();
  } else if (e.key === 'ArrowUp') {
    focusPreviousSuggestion();
  } else if (e.key === 'Enter') {
    submitFocusedSuggestion();
  }
}

// ✅ CORRECT: Group suggestions by type
{
  items: [
    { name: 'AK-47 | Redline', type: 'item' },
    { name: 'AK-47 | Asiimov', type: 'item' },
  ],
  weapons: [
    { name: 'AK-47', type: 'weapon' },
  ],
  collections: [
    { name: 'Operation Riptide Collection', type: 'collection' },
  ],
}
```

**Research Finding:** True value comes from guiding users toward better search queries, not just fast typing.

---

**5. pg_trgm Similarity ORDER BY Causes Severe Slowdown** ⚠️ **SEVERITY: CRITICAL**

**Source:** [Optimizing Postgres Trigram Search](https://alexklibisz.com/2022/02/18/optimizing-postgres-trigram-search)

**Problem:** ORDER BY with trigram match distance forces calculation for EVERY match in index - can devolve into full table scan.

**Real-World Impact:** 10s → 113ms after optimization.

**Solution:**

```sql
-- ❌ BAD: Sorts ALL results by similarity (SLOW - 10 seconds)
SELECT * FROM items
WHERE name % 'blue ak'
ORDER BY similarity(name, 'blue ak') DESC
LIMIT 10;

-- ✅ GOOD: Exact match first, trigram as fallback (FAST - 113ms)
SELECT * FROM items
WHERE name ILIKE 'blue ak%'  -- Exact prefix match (2ms)
LIMIT 10

UNION ALL

SELECT * FROM items
WHERE name % 'blue ak'  -- Trigram fallback for typos (100ms)
  AND name NOT ILIKE 'blue ak%'
LIMIT 10;
```

**Implementation for csloadout.gg:**

```typescript
async function getAutocompleteSuggestions(query: string): Promise<Suggestion[]> {
  // Try exact match first (fast)
  const exactMatches = await db.query(`
    SELECT id, name, weapon_type, image_url, 'exact' as match_type
    FROM items
    WHERE name ILIKE $1 || '%'
    LIMIT 5
  `, [query]);

  // If we have enough exact matches, return them
  if (exactMatches.rows.length >= 5) {
    return exactMatches.rows;
  }

  // Otherwise, add fuzzy matches
  const fuzzyMatches = await db.query(`
    SELECT id, name, weapon_type, image_url, 'fuzzy' as match_type
    FROM items
    WHERE name % $1
      AND name NOT ILIKE $1 || '%'
    ORDER BY similarity(name, $1) DESC
    LIMIT $2
  `, [query, 10 - exactMatches.rows.length]);

  return [...exactMatches.rows, ...fuzzyMatches.rows];
}
```

---

**6. pg_trgm Doesn't Work for Searches <3 Characters** ⚠️ **SEVERITY: MEDIUM**

**Source:** [PostgreSQL pg_trgm Documentation](https://www.postgresql.org/docs/current/pgtrgm.html)

**Problem:** Can't form trigrams from 1-2 character strings.

**Impact:** Searches for "AK" or "M4" won't use trigram index.

**Solution:**

```sql
-- Add B-tree index for short weapon names
CREATE INDEX idx_items_name_prefix ON items(name text_pattern_ops);

-- Handle short queries differently
CREATE OR REPLACE FUNCTION search_items(query TEXT)
RETURNS TABLE (id UUID, name TEXT, weapon_type TEXT) AS $$
BEGIN
  IF LENGTH(query) < 3 THEN
    -- Use prefix matching for short queries
    RETURN QUERY
    SELECT i.id, i.name, i.weapon_type
    FROM items i
    WHERE i.name ILIKE query || '%'
       OR i.weapon_type ILIKE query || '%'
    LIMIT 50;
  ELSE
    -- Use trigram similarity for longer queries
    RETURN QUERY
    SELECT i.id, i.name, i.weapon_type
    FROM items i
    WHERE i.name % query
    ORDER BY similarity(i.name, query) DESC
    LIMIT 50;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

---

**7. Similarity Threshold Default (0.3) Too Lax** ⚠️ **SEVERITY: MEDIUM**

**Source:** [Stack Overflow - Postgres Trigram Slow](https://stackoverflow.com/questions/70012592/postgres-trigram-search-is-slow)

**Problem:** Default 0.3 allows many weak matches, scanning thousands of rows unnecessarily.

**Solution:**

```sql
-- Increase threshold for stricter matching
SET pg_trgm.similarity_threshold = 0.5;

-- Or set per-query
SELECT set_limit(0.5);

SELECT * FROM items
WHERE name % 'blue ak'
ORDER BY similarity(name, 'blue ak') DESC
LIMIT 10;
```

---

#### Faceted Search & SEO Gotchas

**8. Faceted Navigation Creates Crawl Budget Disaster** ⚠️ **SEVERITY: CRITICAL - SEO**

**Source:** [Faceted Navigation SEO 2025](https://gautamseo.com/blog/faceted-navigation-seo-2025/)

**Problem:** Filter combinations create hundreds/thousands of duplicate URLs:

```
/search?weapon=ak47
/search?weapon=ak47&rarity=covert
/search?weapon=ak47&rarity=covert&price_min=5
/search?weapon=ak47&rarity=covert&price_min=5&sort=price_asc
... (exponential growth)
```

**Impact:**
- Duplicate content penalties
- Wasted crawl budget
- Index bloat

**Google's Official Guidance:** [Crawl Budget Management](https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget)

**Solution:**

```typescript
// robots.txt
User-agent: *
Disallow: /search?*
Allow: /search$

// app/search/page.tsx
export async function generateMetadata({ searchParams }): Promise<Metadata> {
  const hasFilters = Object.keys(searchParams).length > 0;

  return {
    // ✅ All filtered pages point to base URL
    alternates: {
      canonical: 'https://csloadout.gg/search',
    },

    // ✅ Only index base search page
    robots: {
      index: !hasFilters,
      follow: true,
    },
  };
}

// Alternative: Client-side filtering (no URL parameters)
function applyFilters(filters: SearchFilters) {
  // Update UI without changing URL
  setActiveFilters(filters);
  fetchResults(filters);

  // Don't create new URLs
  window.history.replaceState(null, '', '/search');
}
```

---

**9. Google: Don't Use Noindex for Faceted URLs** ⚠️ **SEVERITY: HIGH - SEO**

**Source:** [Google Search Central - Crawl Budget](https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget)

**Finding:** Google will still request noindex pages, then drop them after seeing the tag - **wasting crawl time**.

**Correct Approach:**
- ✅ robots.txt: Block pages you don't want crawled at all
- ✅ canonical: Consolidate duplicate content
- ✅ 404/410: For permanently removed content
- ❌ noindex: Wastes crawl budget

---

#### Performance & Business Impact

**10. 1-Second Load Delay = 7% Conversion Loss** ⚠️ **SEVERITY: CRITICAL - BUSINESS**

**Source:** [E-Commerce Conversion Rates 2025](https://www.convertcart.com/blog/ecommerce-conversion-rate-by-industry)

**Industry Benchmarks:**
- Average e-commerce conversion: 2-4%
- 1-second page load delay = **7% conversion reduction**
- Products with 50+ reviews convert **4.6x better**

**Search Performance Targets:**
- **<100ms** search response time (p95)
- **<50ms** autocomplete response
- **<1s** total page load (including search results)

**Traffic Source Performance:**
- Email marketing: 10.3% conversion
- Organic search: ~4%
- Paid search: 2-3% (but 56.7% of total conversions)

**csloadout.gg Target:** 3-4% conversion (similar to electronics category)

---

**11. SQL Injection Risk** ⚠️ **SEVERITY: CRITICAL - SECURITY**

**Problem:** Never concatenate user input directly into SQL.

**Solution:**

```typescript
// ❌ DANGEROUS: SQL injection vulnerability
const query = `SELECT * FROM items WHERE name LIKE '%${userInput}%'`;

// ✅ SAFE: Parameterized queries
const query = `SELECT * FROM items WHERE name LIKE $1`;
const results = await db.query(query, [`%${userInput}%`]);

// ✅ SAFE: Use query builder
const results = await db.items.findMany({
  where: {
    name: {
      contains: userInput,
    },
  },
});
```

---

**12. Mobile Filter UX Failure** ⚠️ **SEVERITY: HIGH - UX**

**Source:** [Baymard Institute - E-Commerce Search](https://baymard.com/research/ecommerce-search)

**Problem:** Filter sidebar doesn't fit on mobile (73% of traffic).

**Solution:**

```typescript
// Desktop: Sidebar
<aside className="hidden lg:block w-64">
  <FilterSidebar />
</aside>

// Mobile: Bottom sheet drawer
<Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
  <SheetTrigger asChild>
    <Button className="lg:hidden">
      Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
    </Button>
  </SheetTrigger>

  <SheetContent side="bottom" className="h-[80vh]">
    <FilterSidebar />
  </SheetContent>
</Sheet>
```

---

### Industry Standards & Best Practices (Baymard Institute Research)

**Source:** [Baymard - E-Commerce Search Usability](https://baymard.com/research/ecommerce-search)

**Research Database:** 5,000+ search elements reviewed by UX researchers.

**Key Standards:**

1. **Search Field Design:**
   - Minimum width: 27 characters on desktop
   - Prominently visible (top-right or top-center)
   - Magnifying glass icon universally recognized
   - Placeholder text: "Search for skins, cases, collections..."

2. **Recent Search History:**
   - Store in localStorage (no server needed)
   - Show last 5 searches
   - Clear option

3. **"No Results" State:**
   - Never dead-end users
   - Suggest spelling corrections
   - Show related searches
   - Display popular items

4. **Filter Result Counts:**
   - Show how many items match each filter
   - Gray out filters with 0 results
   - Update counts dynamically as filters applied

---

### E-Commerce Conversion Benchmarks (2025)

**Source:** [E-Commerce Benchmarks 2025](https://www.statsig.com/perspectives/ecommerce-conversion-rate-industry)

**Industry Baselines:**
- Personal Care: 6.8% (highest)
- Food & Beverage: ~6%
- Electronics: 3.6%
- Home Furnishings: 2.55%
- Luxury Goods: 1.33% (lowest)

**csloadout.gg Target:** 3-4% (similar to electronics)

**Mobile vs Desktop:**
- Mobile: 73% of traffic, but converts 70% worse than desktop
- Desktop: 27% of traffic, but higher conversion rate

**Key Takeaway:** Optimize search for mobile-first (most traffic), but ensure desktop experience converts well.

---

### Authoritative Documentation Sources (Web Search 2025-11-02)

**PostgreSQL Search:**
- [PostgreSQL Full-Text Search Documentation](https://www.postgresql.org/docs/current/textsearch.html)
- [pg_trgm Official Documentation](https://www.postgresql.org/docs/current/pgtrgm.html)
- [VectorChord-BM25 for PostgreSQL](https://blog.vectorchord.ai/vectorchord-bm25-revolutionize-postgresql-search-with-bm25-ranking-3x-faster-than-elasticsearch)
- [Optimizing Postgres Trigram Search - Alex Klibisz](https://alexklibisz.com/2022/02/18/optimizing-postgres-trigram-search)

**Search Engine Comparisons:**
- [ParadeDB: Elasticsearch vs Postgres](https://www.paradedb.com/blog/elasticsearch_vs_postgres)
- [Lantern: Postgres vs Elasticsearch vs Algolia](https://lantern.dev/blog/search)
- [Comparing BM25, TF-IDF, and Postgres - Evan Schwartz](https://emschwartz.me/comparing-full-text-search-algorithms-bm25-tf-idf-and-postgres/)

**UX & Best Practices:**
- [Baymard Institute - Autocomplete Design (9 Best Practices)](https://baymard.com/blog/autocomplete-design)
- [Baymard - E-Commerce Search Usability Research](https://baymard.com/research/ecommerce-search)
- [Baymard - 2023 On-Site Search UX Benchmark](https://baymard.com/blog/onsite-search-benchmark-2023)

**Faceted Search & SEO:**
- [Google: Large Site Crawl Budget Management](https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget)
- [Faceted Navigation SEO 2025 - Gautam SEO](https://gautamseo.com/blog/faceted-navigation-seo-2025/)
- [Faceted Search Best Practices - Fact-Finder](https://www.fact-finder.com/blog/faceted-search/)
- [Faceted Filtering Ultimate Guide - Prefixbox](https://www.prefixbox.com/blog/faceted-filtering/)

**Conversion & Performance:**
- [E-Commerce Conversion Rates 2025 - ConvertCart](https://www.convertcart.com/blog/ecommerce-conversion-rate-by-industry)
- [E-Commerce Benchmarks by Industry - Statsig](https://www.statsig.com/perspectives/ecommerce-conversion-rate-industry)
- [E-Commerce Conversion Rates 2025 - Smart Insights](https://www.smartinsights.com/ecommerce/ecommerce-analytics/ecommerce-conversion-rates/)

## Status

- [ ] Research complete
- [ ] Database indexes created
- [ ] Backend search API implemented
- [ ] Autocomplete endpoint built
- [ ] Frontend search UI built
- [ ] Filter sidebar implemented
- [ ] Performance optimization complete
- [ ] Testing complete
- [ ] Deployed to production

## Related Features

- **Depends On:**
  - [01] Item Database
  - [04] Price Aggregation (for price filters)

- **Enables:**
  - [08] Budget Loadout Builder
  - [09] Price Alerts
  - [26] Pattern Database (advanced filters)
  - [27] Pattern/Float Filters

## References

- PostgreSQL Full-Text Search: https://www.postgresql.org/docs/current/textsearch.html
- PostgreSQL Trigram Similarity: https://www.postgresql.org/docs/current/pgtrgm.html
- Algolia Search Best Practices: https://www.algolia.com/doc/guides/building-search-ui/going-further/best-practices/
- Elasticsearch Relevance: https://www.elastic.co/guide/en/elasticsearch/guide/current/relevance-intro.html
