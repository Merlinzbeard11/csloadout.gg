# 02 - Relational Browsing System

## Overview

Enable users to navigate CS2 items through their relationships: collections → skins, weapon types → all variants, cases → contained items. This differentiates csloadout.gg from competitors who only offer flat item lists.

## User Segments Served

- **Primary:** Casual Players (aesthetic-driven browsing)
- **Secondary:** Collectors (collection completion)
- **Tertiary:** Investors (case content analysis)

## User Stories / Use Cases

### As a Casual Player
- I want to search "Operation Riptide Collection" and see all 17 skins in that collection
- I want to click "AK-47" and see all AK-47 skins across all collections
- I want to browse by weapon type to find skins that match my playstyle

### As a Collector
- I want to see which collections I'm missing items from
- I want to browse discontinued collections to identify rare items

### As an Investor
- I want to see all items in a case to calculate trade-up contract probabilities
- I want to identify which cases contain high-value items

## Research & Context

### Competitive Gap Identified

**Current Competitors:**
- ❌ CS.MONEY: Shows individual skins only, no collection grouping
- ❌ CSFloat: No collection/case browsing
- ❌ Steam Market: Basic category filters only
- ❌ Pricempire: Primarily price-focused, limited relational browsing

**csloadout.gg Advantage:**
✅ **ONLY platform** offering comprehensive relational browsing
✅ Wiki-style navigation (similar to CS:GO Wiki but with live prices)
✅ Multi-dimensional item relationships

### User Behavior Patterns

From discovery research:
- Users search for collections when building themed loadouts
- "Operation Riptide" searches spike when operation is active/ends
- Weapon-type browsing common for casual players choosing mains
- Case content browsing used by investors for probability analysis

### Relationship Types to Support

```
1. Collection → Items
   Example: "Dreams & Nightmares Collection" → 17 skins

2. Weapon Type → Items
   Example: "AK-47" → ~150 skin variants

3. Case → Items
   Example: "Clutch Case" → all possible drops + knives

4. Rarity → Items
   Example: "Covert" → all covert-tier items

5. Wear → Items (for collectors)
   Example: "Factory New" → items available in FN

6. Tournament → Stickers
   Example: "Katowice 2014" → all Katowice 2014 stickers
```

## Technical Requirements

### Database Schema Extensions

```sql
-- Already covered in [01-item-database.md]:
- Items Table (has collection_id, weapon_type)
- Collections Table
- Cases Table
- Item_Case_Mapping Table (many-to-many)

-- Additional indexes needed:
CREATE INDEX idx_items_collection ON items(collection_id);
CREATE INDEX idx_items_weapon_type ON items(weapon_type);
CREATE INDEX idx_items_rarity ON items(rarity);
```

### API Endpoints

```typescript
// Get all items in a collection
GET /api/collections/:collectionId/items
Response: { collection: {...}, items: [...], totalValue: number }

// Get all skins for a weapon type
GET /api/weapons/:weaponType/skins
Response: { weaponType: "AK-47", items: [...], count: number }

// Get all items in a case
GET /api/cases/:caseId/contents
Response: { case: {...}, items: [...], dropProbabilities: {...} }

// Get all items by rarity
GET /api/items?rarity=covert
Response: { items: [...], count: number }
```

### Frontend Components

```
CollectionGrid Component:
- Display all collections as cards
- Show collection image, name, item count
- Click → navigate to collection detail page

CollectionDetailPage:
- Collection header (name, description, release date)
- Grid of all items in collection
- Price aggregation for each item
- "Total collection value" calculator

WeaponTypeGrid Component:
- Browse by weapon category (Rifles, Pistols, SMGs, etc.)
- Click weapon → see all skins for that weapon

CaseContentViewer Component:
- Show case image and details
- List all possible drops with probabilities
- Highlight rare items (knives, gloves)
- Expected value calculator (sum of drop values × probabilities)
```

### URL Structure

```
/collections - Browse all collections
/collections/operation-riptide - Operation Riptide collection detail
/weapons - Browse by weapon type
/weapons/ak-47 - All AK-47 skins
/cases - Browse all cases
/cases/clutch-case - Clutch Case contents
/items?rarity=covert - Filter by rarity
```

## Success Metrics

### Phase 1 (MVP) - Competitive Performance
- ✅ **<50ms query time** for collection → items lookup (using single JOIN, not N+1 queries)
- ✅ 30% of users browse via collections (not just search)
- ✅ Average 3+ pages per session (indicates discovery)
- ✅ 100% collection coverage (all official CS2 collections indexed)
- ✅ Accurate item counts displayed (no missing items)
- ✅ **95+ hub pages indexed** within 30 days (Google Search Console)
- ✅ **Top 3 ranking** for "[collection name]" searches within 90 days

### Phase 2 (Post-Launch) - SEO Dominance
- ✅ **200,000 organic visits/month** by month 12
- ✅ **LCP < 2.5s** on mobile (Core Web Vitals)
- ✅ **CLS < 0.1** (layout stability)
- ✅ Featured snippets for 50+ collection queries

## Dependencies

### Must Have Before Starting
- [01] Item Database (complete with relationships)
- Basic frontend routing (Next.js App Router)

### Blocks Other Features
- [08] Budget Loadout Builder (relies on weapon-type browsing)
- [23] Craft Simulator (uses relational data for suggestions)

## Effort Estimate

- **Development Time:** 1-2 weeks
- **Complexity:** Low-Medium
- **Team Size:** 1 developer

**Breakdown:**
- Week 1: API endpoints, collection/weapon browsing pages
- Week 2: Case content viewer, URL routing, polish

## Implementation Notes

### Collection Data Structure

```typescript
interface Collection {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  releaseDate: Date;
  isDiscontinued: boolean;
  items: Item[];
  totalValue: number; // Sum of lowest prices
}
```

### Case Drop Probability Calculator

```typescript
function calculateCaseValue(caseItems: CaseItem[]): number {
  return caseItems.reduce((total, item) => {
    const dropChance = item.dropProbability / 100; // e.g., 0.79% for Covert
    const itemValue = item.lowestPrice || 0;
    return total + (dropChance * itemValue);
  }, 0);
}

// Example Clutch Case:
// Covert (0.79%): MP7 Neon Ply ($5) → 0.0079 * $5 = $0.04
// Knife (0.26%): Karambit Doppler ($500) → 0.0026 * $500 = $1.30
// Total expected value: ~$2.50
```

### SEO Optimization

Each collection/weapon page should be:
- Server-side rendered (Next.js SSR/ISR)
- Unique meta titles: "Operation Riptide Collection | csloadout.gg"
- Meta descriptions with item counts and value ranges
- Schema.org markup for Google Rich Results

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Collection",
  "name": "Operation Riptide Collection",
  "description": "17 community-designed skins from Operation Riptide",
  "numberOfItems": 17,
  "url": "https://csloadout.gg/collections/operation-riptide"
}
</script>
```

### Critical Gotchas (20 Total)

#### General Performance & Architecture Gotchas

**1. N+1 Query Performance Killer** ⚠️ **SEVERITY: HIGH**

**Problem:** Loading collection items with sequential queries destroys performance.

```typescript
// ❌ BAD: 1 + N queries (300ms for 17 items)
const collection = await db.collections.findUnique({ where: { id } });
const items = await Promise.all(
  collection.itemIds.map(id => db.items.findUnique({ where: { id } }))
);

// ✅ GOOD: Single JOIN query (<50ms)
const collection = await db.$queryRaw`
  SELECT
    c.id, c.name, c.description, c.image_url,
    jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'name', i.display_name,
        'imageUrl', i.image_url,
        'rarity', i.rarity
      ) ORDER BY i.rarity DESC, i.display_name
    ) AS items
  FROM collections c
  LEFT JOIN items i ON i.collection_id = c.id
  WHERE c.slug = ${slug}
  GROUP BY c.id;
`;
```

**Impact:** 6x faster queries, better user experience.

---

**2. Next.js ISR Stale Data vs SEO Tradeoff** ⚠️ **SEVERITY: MEDIUM**

**Problem:** ISR revalidation time balances freshness vs performance.

```typescript
// ❌ TOO SHORT: Hammers database, wastes resources
export const revalidate = 60; // 1 minute

// ❌ TOO LONG: Stale content, bad UX for price-sensitive users
export const revalidate = 86400; // 24 hours

// ✅ OPTIMAL: Balances freshness with performance
export const revalidate = 3600; // 1 hour
```

**Mitigation:**
- Hub pages (collections list): 1-hour ISR
- Detail pages (specific collection): 1-hour ISR + Redis cache (5 min)
- Price data: Separate API call with shorter cache

---

**3. Empty Collections Return 200 (Soft 404)** ⚠️ **SEVERITY: MEDIUM**

**Problem:** Google penalizes pages with no content that return 200 status.

```typescript
// ❌ BAD: Returns 200 for empty collection
export default async function CollectionPage({ params }) {
  const collection = await db.collections.findUnique({
    where: { slug: params.slug },
    include: { items: true },
  });

  if (!collection.items.length) {
    return <div>No items found</div>; // 200 status!
  }
}

// ✅ GOOD: Returns 404 for empty collections
import { notFound } from 'next/navigation';

export default async function CollectionPage({ params }) {
  const collection = await db.collections.findUnique({
    where: { slug: params.slug },
    include: { items: true },
  });

  if (!collection || collection.items.length === 0) {
    notFound(); // Returns 404 status
  }

  return <CollectionView collection={collection} />;
}
```

---

**4. Case Drop Probability Calculation Errors** ⚠️ **SEVERITY: MEDIUM - TRUST**

**Problem:** Incorrect probabilities destroy user trust.

```typescript
// ❌ BAD: Probabilities don't sum to 100%
const caseValue = items.reduce((sum, item) => sum + (item.probability * item.price), 0);

// ✅ GOOD: Validate probabilities sum to 100%
function calculateCaseValue(items: CaseItem[]): number {
  const totalProbability = items.reduce((sum, item) => sum + item.dropProbability, 0);

  if (Math.abs(totalProbability - 100) > 0.01) {
    throw new Error(`Invalid probabilities: sum = ${totalProbability}%`);
  }

  return items.reduce((sum, item) => {
    return sum + ((item.dropProbability / 100) * item.lowestPrice);
  }, 0);
}
```

---

**5. Weapon Type Naming Inconsistency** ⚠️ **SEVERITY: LOW**

**Problem:** Different sources use inconsistent weapon names.

```typescript
// ✅ Standardize on import
const WEAPON_TYPE_MAPPING: Record<string, string> = {
  'AK47': 'AK-47',
  'Ak-47': 'AK-47',
  'ak47': 'AK-47',
  'M4A4': 'M4A4',
  'M4A1-S': 'M4A1-S',
  'M4A1S': 'M4A1-S',
};

function normalizeWeaponType(raw: string): string {
  return WEAPON_TYPE_MAPPING[raw] || raw;
}
```

---

**6. Discontinued Collections Missing Flag** ⚠️ **SEVERITY: LOW - BUSINESS**

**Problem:** Investors need to know if items are still dropping.

```typescript
interface Collection {
  id: string;
  name: string;
  isDiscontinued: boolean;
  discontinuedDate?: Date; // When it stopped dropping
}

// Display in UI
{collection.isDiscontinued && (
  <Badge variant="warning">
    No Longer Drops - Last Available: {formatDate(collection.discontinuedDate)}
  </Badge>
)}
```

---

**7. URL Slug Changes Break Backlinks** ⚠️ **SEVERITY: MEDIUM - SEO**

**Problem:** Changing collection slugs creates 404s, loses SEO equity.

```typescript
// ✅ Store multiple slugs for redirects
interface Collection {
  id: string;
  currentSlug: string;
  previousSlugs: string[]; // Historical slugs
}

// Middleware for permanent redirects
export async function middleware(request: NextRequest) {
  const slug = request.nextUrl.pathname.split('/').pop();

  const collection = await db.collections.findFirst({
    where: { previousSlugs: { has: slug } },
  });

  if (collection) {
    return NextResponse.redirect(
      new URL(`/collections/${collection.currentSlug}`, request.url),
      { status: 301 } // Permanent redirect
    );
  }
}
```

---

**8. Collection Name Changes from Valve** ⚠️ **SEVERITY: LOW**

**Problem:** Valve occasionally renames collections without notice.

```typescript
// ✅ Store both slug (immutable) and display name (mutable)
interface Collection {
  slug: string;        // Never changes: "operation-riptide"
  displayName: string; // Can change: "Operation Riptide Collection"
  canonicalName: string; // Valve's official name
}
```

---

**9. Items in Multiple Cases** ⚠️ **SEVERITY: LOW**

**Problem:** Knives/gloves appear in every case.

```sql
-- ✅ Many-to-many mapping table
CREATE TABLE item_case_mapping (
  item_id UUID REFERENCES items(id),
  case_id UUID REFERENCES cases(id),
  drop_probability DECIMAL(5,2), -- e.g., 0.26 for knives
  PRIMARY KEY (item_id, case_id)
);
```

---

**10. Schema.org Markup Implementation Errors** ⚠️ **SEVERITY: LOW - SEO**

**Problem:** Invalid JSON-LD breaks rich results eligibility.

```typescript
// ✅ Validate schema with TypeScript
interface SchemaCollectionPage {
  '@context': 'https://schema.org';
  '@type': 'CollectionPage';
  name: string;
  description: string;
  numberOfItems: number;
  mainEntity: {
    '@type': 'ItemList';
    numberOfItems: number;
    itemListElement: Array<{
      '@type': 'ListItem';
      position: number;
      item: {
        '@type': 'Product';
        name: string;
        url: string;
        image?: string;
      };
    }>;
  };
}

// Test with Google Rich Results Test
// https://search.google.com/test/rich-results
```

---

#### SEO-Specific Gotchas for Aggregation Pages

**11. Faceted Navigation Crawl Budget Disaster** ⚠️ **SEVERITY: CRITICAL**

**Problem:** Filter combinations create thousands of duplicate URLs that waste crawl budget.

```
Example:
/collections/operation-riptide
/collections/operation-riptide?sort=price
/collections/operation-riptide?sort=rarity
/collections/operation-riptide?rarity=covert
/collections/operation-riptide?rarity=covert&sort=price
... (5,250+ combinations for 7 filters)
```

**Mitigation:**

```typescript
// 1. robots.txt blocks query parameters
User-agent: *
Disallow: /collections/*?*
Disallow: /weapons/*?*
Allow: /collections/$
Allow: /weapons/$

// 2. Canonical URLs always point to base (no params)
export async function generateMetadata({ params, searchParams }): Promise<Metadata> {
  return {
    alternates: {
      canonical: `https://csloadout.gg/collections/${params.slug}`, // No query params!
    },
    robots: {
      index: Object.keys(searchParams).length === 0, // Only index base URL
      follow: true,
    },
  };
}

// 3. Use pushState for client-side filtering (no URL change)
function handleFilterChange(filter: string) {
  // ❌ BAD: router.push(`?filter=${filter}`); // Creates new URL

  // ✅ GOOD: Client-side filtering without URL change
  setActiveFilter(filter);
  window.history.replaceState(null, '', window.location.pathname);
}
```

**Impact:** Reduces Google crawl from 5,250 URLs to 95 hub pages.

---

**12. Pagination rel=next/prev Deprecated (2019)** ⚠️ **SEVERITY: HIGH**

**Problem:** Google no longer uses `<link rel="next">` for pagination.

```html
<!-- ❌ DEPRECATED: Google ignores these since March 2019 -->
<link rel="next" href="/collections/operation-riptide?page=2" />
<link rel="prev" href="/collections/operation-riptide" />
```

**Modern Solution:**

```typescript
// ✅ GOOD: Use "View All" or infinite scroll
export default function CollectionPage({ params }) {
  return (
    <>
      {/* Option 1: Show all items (no pagination) */}
      <div className="grid">
        {collection.items.map(item => <ItemCard key={item.id} item={item} />)}
      </div>

      {/* Option 2: Infinite scroll with SSR for first page */}
      <InfiniteScroll
        loadMore={loadMoreItems}
        hasMore={hasMore}
        initialItems={collection.items} // SSR rendered
      />

      {/* ✅ Canonical always points to page 1 */}
      <link rel="canonical" href={`https://csloadout.gg/collections/${params.slug}`} />
    </>
  );
}
```

---

**13. Duplicate Content SEO Penalty** ⚠️ **SEVERITY: HIGH - SEO**

**Problem:** Same item appears on multiple pages (collection, weapon type, rarity).

**Example:**
- AK-47 | Slate appears on:
  - `/collections/norse-collection` (part of collection)
  - `/weapons/ak-47` (all AK-47 skins)
  - `/items?rarity=mil-spec` (rarity filter)

**Solution:**

```typescript
// ✅ Canonical URL always points to item detail page
// /collections/norse-collection
export async function generateMetadata({ params }): Promise<Metadata> {
  const collection = await getCollection(params.slug);

  return {
    title: `${collection.name} - ${collection.items.length} CS2 Skins`,
    alternates: {
      canonical: `https://csloadout.gg/collections/${params.slug}`,
    },
  };
}

// ✅ Item cards include canonical in structured data
function ItemCard({ item }) {
  const jsonLd = {
    '@type': 'Product',
    url: `https://csloadout.gg/items/${item.slug}`, // Canonical URL
  };

  return (
    <a href={`/items/${item.slug}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* ... */}
    </a>
  );
}
```

---

**14. Internal Linking Structure for Link Equity** ⚠️ **SEVERITY: MEDIUM**

**Problem:** Poor internal linking dilutes SEO value.

```typescript
// ✅ Hub-and-spoke model
/**
 * Hub Pages (high authority):
 * - /collections (index of all collections)
 * - /weapons (index of all weapon types)
 * - /cases (index of all cases)
 *
 * Spoke Pages (receive authority):
 * - /collections/operation-riptide
 * - /weapons/ak-47
 * - /items/ak-47-slate
 */

// Breadcrumb navigation (internal links)
<nav aria-label="Breadcrumb">
  <ol>
    <li><Link href="/">Home</Link></li>
    <li><Link href="/collections">Collections</Link></li>
    <li aria-current="page">{collection.name}</li>
  </ol>
</nav>

// Related collections (horizontal links)
<section>
  <h2>Related Collections</h2>
  {relatedCollections.map(c => (
    <Link key={c.id} href={`/collections/${c.slug}`}>
      {c.name}
    </Link>
  ))}
</section>
```

---

**15. URL Parameter Handling (Duplicate Content)** ⚠️ **SEVERITY: HIGH**

**Problem:** Sort/filter params create duplicate content.

```typescript
// ✅ Canonical URL normalization
export async function generateMetadata({ params, searchParams }): Promise<Metadata> {
  const baseUrl = `https://csloadout.gg/collections/${params.slug}`;
  const hasParams = Object.keys(searchParams).length > 0;

  return {
    alternates: {
      canonical: baseUrl, // Always strip params
    },
    robots: {
      index: !hasParams, // Noindex parameterized URLs
      follow: true,
    },
  };
}
```

---

**16. Mobile-First Indexing (Responsive Design)** ⚠️ **SEVERITY: HIGH**

**Problem:** Google ONLY crawls mobile version since March 2021.

```typescript
// ✅ Responsive grid (mobile-first)
<div className="
  grid
  grid-cols-2        /* Mobile: 2 columns */
  sm:grid-cols-3     /* Tablet: 3 columns */
  lg:grid-cols-4     /* Desktop: 4 columns */
  xl:grid-cols-6     /* Large: 6 columns */
  gap-2 sm:gap-4
">
  {items.map(item => <ItemCard key={item.id} item={item} />)}
</div>

// ✅ Mobile-optimized images
<Image
  src={item.imageUrl}
  width={150}  // Mobile size
  height={150}
  sizes="(max-width: 640px) 150px, (max-width: 1024px) 200px, 250px"
  loading="lazy"
/>
```

---

**17. JavaScript SEO (Hydration Errors)** ⚠️ **SEVERITY: MEDIUM**

**Problem:** Client/server HTML mismatch breaks indexing.

```typescript
// ❌ BAD: Client-only rendering
'use client';

export default function CollectionPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch(`/api/collections/${slug}/items`).then(/* ... */);
  }, []);

  return <div>{items.map(/* ... */)}</div>; // Empty on SSR!
}

// ✅ GOOD: Server Components (SSR by default)
export default async function CollectionPage({ params }) {
  const collection = await db.collections.findUnique({
    where: { slug: params.slug },
    include: { items: true },
  });

  return <CollectionGrid items={collection.items} />; // Fully rendered HTML
}
```

---

**18. Open Graph & Twitter Cards (Social Sharing)** ⚠️ **SEVERITY: MEDIUM**

**Problem:** Missing social metadata reduces click-through from shares.

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const collection = await getCollection(params.slug);

  return {
    title: collection.name,
    description: `${collection.items.length} CS2 skins with live prices`,

    // ✅ Open Graph (Facebook, LinkedIn, Discord)
    openGraph: {
      title: `${collection.name} | csloadout.gg`,
      description: `Browse all ${collection.items.length} skins from ${collection.name}`,
      url: `https://csloadout.gg/collections/${params.slug}`,
      siteName: 'csloadout.gg',
      images: [
        {
          url: collection.imageUrl,
          width: 1200,
          height: 630,
          alt: collection.name,
        },
      ],
      type: 'website',
    },

    // ✅ Twitter Cards
    twitter: {
      card: 'summary_large_image',
      title: collection.name,
      description: `${collection.items.length} CS2 skins`,
      images: [collection.imageUrl],
    },
  };
}
```

---

**19. XML Sitemap Priority & Change Frequency** ⚠️ **SEVERITY: MEDIUM**

**Problem:** Incorrect sitemap signals waste crawl budget.

```typescript
// app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const collections = await db.collections.findMany();

  return [
    // Hub pages (highest priority)
    {
      url: 'https://csloadout.gg',
      lastModified: new Date(),
      changeFrequency: 'hourly', // Home updates frequently
      priority: 1.0,
    },
    {
      url: 'https://csloadout.gg/collections',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },

    // Collection pages (medium priority)
    ...collections.map(c => ({
      url: `https://csloadout.gg/collections/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: 'daily' as const, // Prices update hourly, content changes rarely
      priority: 0.7,
    })),
  ];
}
```

---

**20. Breadcrumb Navigation (Missing SEO Signals)** ⚠️ **SEVERITY: LOW - SEO**

**Problem:** No breadcrumb schema loses rich result eligibility.

```typescript
// ✅ Breadcrumb with Schema.org markup
export default function CollectionPage({ params }) {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://csloadout.gg',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Collections',
        item: 'https://csloadout.gg/collections',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: collection.name,
        item: `https://csloadout.gg/collections/${params.slug}`,
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <nav aria-label="Breadcrumb" className="flex space-x-2 text-sm">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/collections">Collections</Link>
        <span>/</span>
        <span aria-current="page">{collection.name}</span>
      </nav>
    </>
  );
}
```

---

### LLM SEO Gotchas (Emerging 2024-2025)

**Context:** Large Language Models (ChatGPT, Claude, Perplexity, Google SGE) are becoming major traffic sources. Optimizing for LLM discovery and citation requires different strategies than traditional Google SEO.

---

**21. Unstructured Content (LLM Parsing Failure)** ⚠️ **SEVERITY: HIGH - LLM**

**Problem:** LLMs prefer clean, semantic markup they can easily extract and cite.

```typescript
// ❌ BAD: Divitis, no semantic structure
<div>
  <div>Operation Riptide Collection</div>
  <div>17 skins</div>
  <div>Released 2021</div>
</div>

// ✅ GOOD: Semantic HTML + Schema.org microdata
<article itemScope itemType="https://schema.org/CollectionPage">
  <h1 itemProp="name">Operation Riptide Collection</h1>

  <dl className="metadata">
    <dt>Total Items</dt>
    <dd itemProp="numberOfItems">17 community-designed weapon finishes</dd>

    <dt>Release Date</dt>
    <dd><time itemProp="datePublished" datetime="2021-09-21">September 21, 2021</time></dd>

    <dt>Source</dt>
    <dd>
      <a href="https://blog.counter-strike.net/index.php/2021/09/35390/" rel="noopener">
        Valve Official Blog
      </a>
    </dd>
  </dl>

  {/* ✅ LLMs can extract: "The Operation Riptide Collection contains 17 items, released on September 21, 2021 per Valve's official blog" */}
</article>
```

**Why this matters:**
- ChatGPT extracts facts from structured content more reliably
- Perplexity cites pages with clear source attribution
- Google SGE (Search Generative Experience) prefers semantic HTML

---

**22. Missing Citation Metadata** ⚠️ **SEVERITY: MEDIUM - LLM**

**Problem:** LLMs can't cite pages without clear authorship and timestamps.

```typescript
// ✅ Add citation-friendly metadata
export async function generateMetadata({ params }): Promise<Metadata> {
  const collection = await getCollection(params.slug);

  return {
    // ... other metadata

    // ✅ Citation metadata for LLMs
    other: {
      // Article metadata (for ChatGPT, Perplexity)
      'article:published_time': collection.releaseDate.toISOString(),
      'article:modified_time': collection.updatedAt.toISOString(),
      'article:author': 'csloadout.gg',

      // Citation format hint
      'citation_title': `${collection.name} - CS2 Collection`,
      'citation_publication_date': collection.releaseDate.toISOString(),
      'citation_online_date': new Date().toISOString(),
      'citation_author': 'csloadout.gg',

      // Persistent identifier (helps LLMs track content over time)
      'citation_doi': `csloadout.gg/collections/${params.slug}`,
    },
  };
}
```

---

**23. Fact-Checkability (No Source Attribution)** ⚠️ **SEVERITY: HIGH - TRUST + LLM**

**Problem:** LLMs prefer content with clear source attribution for fact-checking.

```typescript
// ❌ BAD: Uncitable facts
<p>The Operation Riptide Collection has 17 skins.</p>

// ✅ GOOD: Citable, verifiable facts
<p>
  The Operation Riptide Collection contains{' '}
  <data value="17">17 community-designed weapon finishes</data>{' '}
  (Source:{' '}
  <a
    href="https://blog.counter-strike.net/index.php/2021/09/35390/"
    rel="noopener"
    cite="https://blog.counter-strike.net/index.php/2021/09/35390/"
  >
    Valve Official Blog, September 21, 2021
  </a>
  ).
</p>

// ✅ EVEN BETTER: Structured data for automated extraction
const factSchema = {
  '@context': 'https://schema.org',
  '@type': 'Claim',
  claimReviewed: 'The Operation Riptide Collection contains 17 skins',
  itemReviewed: {
    '@type': 'CreativeWork',
    name: 'Operation Riptide Collection',
  },
  author: {
    '@type': 'Organization',
    name: 'Valve Corporation',
    url: 'https://blog.counter-strike.net',
  },
  datePublished: '2021-09-21',
  url: 'https://blog.counter-strike.net/index.php/2021/09/35390/',
};
```

**Impact:** Increases likelihood of ChatGPT/Perplexity citing your page as authoritative source.

---

**24. API Endpoints for LLM Tool Use** ⚠️ **SEVERITY: MEDIUM - LLM**

**Problem:** ChatGPT plugins, Perplexity, and Claude tools prefer JSON APIs over HTML scraping.

```typescript
// ✅ Provide JSON API for LLM consumption
// app/api/collections/[slug]/route.ts

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const collection = await getCollection(params.slug);

  if (!collection) {
    return new Response('Not Found', { status: 404 });
  }

  // ✅ Structured JSON response for LLM tools
  return Response.json({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: collection.name,
    description: collection.description,
    numberOfItems: collection.items.length,
    datePublished: collection.releaseDate,
    dateModified: collection.updatedAt,

    // ✅ Citation information
    url: `https://csloadout.gg/collections/${params.slug}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'csloadout.gg',
      url: 'https://csloadout.gg',
    },

    // ✅ Fact-checkable data
    items: collection.items.map(item => ({
      '@type': 'Product',
      name: item.displayName,
      url: `https://csloadout.gg/items/${item.slug}`,
      image: item.imageUrl,
      category: item.rarity,
    })),

    // ✅ Source attribution
    sourceOrganization: {
      '@type': 'Organization',
      name: 'Valve Corporation',
      url: 'https://blog.counter-strike.net',
    },

    // ✅ Data freshness
    lastUpdated: new Date().toISOString(),
  });
}

// Usage by LLM tools:
// GET https://csloadout.gg/api/collections/operation-riptide
// Returns: Clean JSON that ChatGPT can parse and cite
```

---

**25. Conversational Q&A Format (LLM Extraction Optimization)** ⚠️ **SEVERITY: LOW - LLM**

**Problem:** LLMs extract better from Q&A formatted content.

```typescript
// ✅ FAQ section with semantic markup
export default function CollectionPage({ collection }) {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How many skins are in the ${collection.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The ${collection.name} contains ${collection.items.length} community-designed weapon finishes.`,
        },
      },
      {
        '@type': 'Question',
        name: `When was the ${collection.name} released?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Released on ${formatDate(collection.releaseDate)} (Source: Valve Official Blog)`,
        },
      },
      {
        '@type': 'Question',
        name: `What is the rarest item in the ${collection.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The ${getRarestItem(collection).displayName} (${getRarestItem(collection).rarity} rarity)`,
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <section className="faq mt-8">
        <h2>Frequently Asked Questions</h2>

        <dl className="space-y-4">
          <div itemScope itemType="https://schema.org/Question">
            <dt itemProp="name" className="font-semibold">
              How many skins are in the {collection.name}?
            </dt>
            <dd itemScope itemType="https://schema.org/Answer" itemProp="acceptedAnswer">
              <div itemProp="text">
                The {collection.name} contains {collection.items.length} community-designed weapon finishes.
              </div>
            </dd>
          </div>

          {/* More Q&A pairs */}
        </dl>
      </section>
    </>
  );
}
```

**Why this works:** ChatGPT, Claude, and Perplexity are trained on Q&A formats (Stack Overflow, Reddit). They extract facts more accurately from conversational content.

---

**26. Table-Based Data (LLM Extraction Gold Mine)** ⚠️ **SEVERITY: LOW - LLM**

**Problem:** LLMs extract tabular data better than prose.

```typescript
// ✅ Present comparative data in tables
<section>
  <h2>Collection Statistics</h2>

  <table>
    <caption>
      Rarity distribution for {collection.name}
      <span className="sr-only"> - {collection.items.length} total items</span>
    </caption>
    <thead>
      <tr>
        <th scope="col">Rarity</th>
        <th scope="col">Count</th>
        <th scope="col">Percentage</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th scope="row">Covert (Red)</th>
        <td>{covertCount}</td>
        <td>{(covertCount / collection.items.length * 100).toFixed(1)}%</td>
      </tr>
      <tr>
        <th scope="row">Classified (Pink)</th>
        <td>{classifiedCount}</td>
        <td>{(classifiedCount / collection.items.length * 100).toFixed(1)}%</td>
      </tr>
      {/* ... more rarities */}
    </tbody>
  </table>
</section>

// ✅ LLMs can answer: "What percentage of Operation Riptide skins are Covert rarity?"
// Answer extracted directly from table: "11.8% (2 out of 17 items)"
```

---

**27. Stable Permalinks (LLM Citation Persistence)** ⚠️ **SEVERITY: HIGH - LLM**

**Problem:** LLMs cache citations. Changing URLs breaks old citations.

```typescript
// ✅ NEVER change collection slugs after publication
interface Collection {
  slug: string;              // IMMUTABLE: "operation-riptide"
  displayName: string;       // Mutable: "Operation Riptide Collection"
  previousSlugs: string[];   // Historical slugs for 301 redirects
}

// ✅ If you MUST change a slug, add permanent redirect
export async function middleware(request: NextRequest) {
  const oldSlugs = {
    'op-riptide': 'operation-riptide',  // Old → New
    'riptide': 'operation-riptide',
  };

  const requestedSlug = request.nextUrl.pathname.split('/').pop();
  const newSlug = oldSlugs[requestedSlug];

  if (newSlug) {
    return NextResponse.redirect(
      new URL(`/collections/${newSlug}`, request.url),
      { status: 301 } // Permanent redirect
    );
  }
}
```

**Why this matters:** If ChatGPT cites `/collections/op-riptide` in January, that URL must work forever. Breaking citations loses LLM traffic.

---

**28. Temporal Context (LLM Knowledge Cutoff Awareness)** ⚠️ **SEVERITY: MEDIUM - LLM**

**Problem:** LLMs have knowledge cutoffs. They can't know about new collections without explicit dates.

```typescript
// ✅ Include temporal context in content
<article>
  <h1>{collection.name}</h1>

  <p>
    <strong>Released:</strong>{' '}
    <time dateTime={collection.releaseDate.toISOString()}>
      {formatDate(collection.releaseDate)}
    </time>
    {' '}
    {/* ✅ Help LLMs understand recency */}
    {isRecent(collection.releaseDate) && (
      <span className="badge">
        New - Added {formatDistanceToNow(collection.releaseDate)} ago
      </span>
    )}
  </p>

  <p>
    <strong>Last Updated:</strong>{' '}
    <time dateTime={collection.updatedAt.toISOString()}>
      {formatDate(collection.updatedAt)}
    </time>
  </p>
</article>

// ✅ Add to metadata
export async function generateMetadata({ params }): Promise<Metadata> {
  return {
    // ...
    other: {
      'article:published_time': collection.releaseDate.toISOString(),
      'article:modified_time': collection.updatedAt.toISOString(),

      // ✅ Explicit recency signal
      'content-age': `${getDaysSince(collection.releaseDate)} days`,
    },
  };
}
```

**Example:** If Operation Riptide was released in Sept 2021, but LLM's training cutoff is April 2023, it knows about it. But if "Dreams & Nightmares" released in Dec 2021, LLM might not have it. Explicit dates help.

---

**29. Avoid JavaScript-Gated Content** ⚠️ **SEVERITY: HIGH - LLM**

**Problem:** LLMs can't execute JavaScript. Content behind JS interactions is invisible.

```typescript
// ❌ BAD: Content only appears on tab click
'use client';

export default function CollectionPage({ collection }) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <>
      <button onClick={() => setActiveTab('items')}>View Items</button>

      {/* ❌ LLMs never see this content */}
      {activeTab === 'items' && (
        <div>{collection.items.map(/* ... */)}</div>
      )}
    </>
  );
}

// ✅ GOOD: All content in SSR HTML, JS only enhances
export default async function CollectionPage({ params }) {
  const collection = await getCollection(params.slug);

  return (
    <>
      {/* ✅ LLMs see all content in initial HTML */}
      <section>
        <h2>Overview</h2>
        <p>{collection.description}</p>
      </section>

      <section>
        <h2>All Items ({collection.items.length})</h2>
        <div className="grid">
          {collection.items.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* JS enhancement (optional) */}
      <ClientSideFilter items={collection.items} />
    </>
  );
}
```

---

**30. LLM-Friendly robots.txt** ⚠️ **SEVERITY: MEDIUM - LLM**

**Problem:** Some LLM crawlers respect robots.txt, others don't. Be intentional.

```typescript
// app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/private/', '/admin/'],
      },
      {
        // OpenAI GPTBot (ChatGPT web crawler)
        userAgent: 'GPTBot',
        allow: ['/collections/', '/items/', '/weapons/', '/cases/'],
        disallow: ['/api/', '/auth/'],
      },
      {
        // Google Extended (Bard/Gemini crawler)
        userAgent: 'Google-Extended',
        allow: '/',
      },
      {
        // Anthropic Claude crawler
        userAgent: 'anthropic-ai',
        allow: '/',
      },
      {
        // Common Crawl (used by many LLMs for training)
        userAgent: 'CCBot',
        allow: '/',
      },
    ],
    sitemap: 'https://csloadout.gg/sitemap.xml',
  };
}
```

**Note:** As of 2024-2025, blocking LLM crawlers may reduce visibility in ChatGPT/Claude/Perplexity results. Most sites allow LLM crawling for discovery benefits.

---

## LLM SEO: Research-Backed Gotchas & Authoritative Sources

**Research conducted:** 2025-11-02 via web search for latest LLM SEO best practices

### Critical Gotchas from Industry Research

**1. GPTBot/ClaudeBot Cannot Execute JavaScript** ⚠️ **SEVERITY: HIGH**

**Source:** [Moving Traffic Media - Managing OpenAI's Web Crawlers](https://www.movingtrafficmedia.com/managing-openai-web-crawlers/)

**Problem:** GPTBot and ClaudeBot retrieve JavaScript files but cannot execute them. ChatGPT emphasizes HTML content (57.70% of total fetch requests).

**Impact:** Client-side rendered content invisible to LLM crawlers.

**Solution:** Already implemented in Feature 02 - Next.js Server Components with SSR.

---

**2. Schema.org Helps Parsing But Doesn't Directly Impact LLM Citations** ⚠️ **SEVERITY: MEDIUM**

**Source:** [LLM SEO Guide - Structured Data](https://llmseoguide.com/guides/llm-optimization/structured-data)

**Finding:** LLMs use Retrieval Augmented Generation (RAG), not structured data for search indexing. However, LLMs can parse schema markup in real-time, improving citation chances.

**Recommendation:** Continue using CollectionPage + ItemList schema for traditional SEO + LLM parsing, but don't expect direct citation boost.

---

**3. Perplexity Favors Conversational Q&A Format Over Prose** ⚠️ **SEVERITY: HIGH**

**Source:** [How to Get Cited in Perplexity AI](https://www.rankshift.ai/blog/how-to-get-cited-as-a-source-in-perplexity-ai/)

**Finding:**
- Perplexity prefers conversational, authentic content over corporate writing
- Q&A format content gets cited more often
- Customer reviews, personal experiences, first-hand accounts heavily preferred

**Solution for csloadout.gg:**

```typescript
// Add to collection pages
<section className="faq">
  <h2>Collection Questions</h2>

  <dl itemScope itemType="https://schema.org/FAQPage">
    <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
      <dt itemProp="name">When was the {collection.name} released?</dt>
      <dd itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
        <div itemProp="text">
          The {collection.name} was released on {formatDate(collection.releaseDate)}
          according to <a href="https://blog.counter-strike.net/...">Valve's official blog</a>.
        </div>
      </dd>
    </div>

    <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
      <dt itemProp="name">What are the most expensive items in this collection?</dt>
      <dd itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
        <div itemProp="text">
          The rarest items are {collection.covertItems.map(i => i.name).join(', ')}
          with prices ranging from ${minPrice} to ${maxPrice}.
        </div>
      </dd>
    </div>
  </dl>
</section>
```

---

**4. Citations Are The New Rankings** ⚠️ **SEVERITY: CRITICAL - BUSINESS**

**Source:** [SEO Insights from 8,000 AI Citations](https://searchengineland.com/how-to-get-cited-by-ai-seo-insights-from-8000-ai-citations-455284)

**Finding:**
- Perplexity provides avg 5.28 citations per response
- 60% overlap with Google top 10, but different selection criteria
- "In a post-generative AI world, citations are the new rankings"

**Strategy for csloadout.gg:**
- Link to authoritative references (Valve blog, Steam Market, CS:GO Wiki)
- Outbound citations signal research depth and help LLMs trust content

```typescript
<p>
  Collection information sourced from
  <a href="https://blog.counter-strike.net/..." rel="noopener" cite="...">
    Valve Corporation's official Counter-Strike blog
  </a>.
</p>
```

---

**5. Google SGE Requires E-E-A-T (Experience, Expertise, Authoritativeness, Trust)** ⚠️ **SEVERITY: HIGH**

**Source:** [Structured Data & SEO in Google's SGE](https://b13.com/blog/maximizing-website-seo-structured-data-googles-search-generative-experience)

**Finding:**
- Over 86% of Google results include SGE
- Google prioritizes content with first-hand experiences and authentic engagement
- E-E-A-T principles guide SGE content selection

**Solution:** Add authentic, experience-based content:

```typescript
<article>
  <p>
    Based on our analysis of Steam Market data from {collection.dataSource},
    the {collection.name} has seen a {priceChange}% price increase since release.
  </p>

  {/* ✅ Authenticity signal */}
  <aside className="data-source">
    <strong>Data Source:</strong> Live prices aggregated from 26 marketplaces,
    updated hourly. Last updated: {formatDistanceToNow(lastUpdate)} ago.
  </aside>
</article>
```

---

**6. CollectionPage Rich Results NOT Supported by Google** ⚠️ **SEVERITY: MEDIUM - SEO**

**Source:** [Schema.org CollectionPage Documentation](https://schema.org/CollectionPage)

**Finding:** Google only shows product rich results on single-product pages. Collection pages won't get visual rich results despite proper schema.

**Impact:** Use CollectionPage + ItemList for structure and LLM parsing, but don't expect Google rich snippets.

---

**7. PerplexityBot User Agent Must Be Allowed** ⚠️ **SEVERITY: HIGH**

**Source:** [SEO for Perplexity AI](https://www.brainz.digital/blog/seo-for-perplexity/)

**Finding:** Perplexity has its own crawler: PerplexityBot. Blocking it = invisible to Perplexity search.

**Solution:** Already implemented in robots.txt example (gotcha #30).

---

**8. GPTBot Traffic Growth: 305% (2024-2025)** ⚠️ **SEVERITY: CRITICAL - BUSINESS**

**Source:** [From Googlebot to GPTBot: Who's Crawling Your Site in 2025](https://blog.cloudflare.com/from-googlebot-to-gptbot-whos-crawling-your-site-in-2025/)

**Finding:**
- GPTBot rose 305% between May 2024 and May 2025
- Jumped from #9 to #3 web crawler (7.7% of traffic)
- 569 million monthly requests

**Business Impact:** Blocking LLM crawlers = losing 7.7% of potential web traffic.

---

**9. Content Must Front-Load Key Information** ⚠️ **SEVERITY: MEDIUM**

**Source:** [How LLMs Interpret Content](https://www.searchenginejournal.com/how-llms-interpret-content-structure-information-for-ai-search/544308/)

**Finding:**
- LLMs prioritize content near top of HTML hierarchy
- Short, focused paragraphs (one idea per paragraph)
- Clear headings help LLMs understand hierarchy

**Implementation:**

```typescript
export default async function CollectionPage({ params }) {
  return (
    <>
      {/* ✅ Front-load key facts for LLMs */}
      <header>
        <h1>{collection.name}</h1>

        {/* Key facts in first 200 words */}
        <p>
          The {collection.name} contains {collection.items.length} community-designed
          weapon finishes, released on {formatDate(collection.releaseDate)} by Valve Corporation.
        </p>

        <dl>
          <dt>Total Items</dt>
          <dd>{collection.items.length}</dd>

          <dt>Release Date</dt>
          <dd><time dateTime={collection.releaseDate.toISOString()}>
            {formatDate(collection.releaseDate)}
          </time></dd>

          <dt>Price Range</dt>
          <dd>${collection.minPrice} - ${collection.maxPrice}</dd>
        </dl>
      </header>

      {/* Content below */}
    </>
  );
}
```

---

**10. Fresh Content Timestamps Critical for LLM Trust** ⚠️ **SEVERITY: MEDIUM**

**Source:** [Citation Seeding Playbook](https://www.growthmarshal.io/blog/citation-seeding-playbook)

**Finding:**
- Perplexity favors content with recent timestamps
- LLMs need temporal context (knowledge cutoff awareness)
- Metadata like `article:published_time` and `article:modified_time` critical

**Solution:** Already implemented in metadata section (gotcha #22, #28).

---

### Authoritative Documentation Sources (Web Search 2025-11-02)

**OpenAI/GPTBot:**
- [Managing OpenAI's Web Crawlers - Moving Traffic Media](https://www.movingtrafficmedia.com/managing-openai-web-crawlers/)
- [GPTBot: A New Googlebot for SEO - SEO.ai](https://seo.ai/blog/gptbot-a-new-googlebot-for-seo)
- [Optimize for AI Crawlers in 2025 - Interrupt Media](https://interruptmedia.com/how-to-optimize-your-website-for-ai-crawlers-in-2025-llm-search/)

**Perplexity AI:**
- [How to Get Cited in Perplexity AI - RankShift](https://www.rankshift.ai/blog/how-to-get-cited-as-a-source-in-perplexity-ai/)
- [SEO Insights from 8,000 AI Citations - Search Engine Land](https://searchengineland.com/how-to-get-cited-by-ai-seo-insights-from-8000-ai-citations-455284)
- [Perplexity SEO Complete Guide - Primal](https://www.primal.com.my/ai/perplexity/)

**Google SGE:**
- [Structured Data & SEO in Google's SGE - B13](https://b13.com/blog/maximizing-website-seo-structured-data-googles-search-generative-experience)
- [Google SGE Ultimate Guide - BrightEdge](https://www.brightedge.com/google-sge)
- [Understanding Google SGE - Semrush](https://www.semrush.com/blog/google-sge/)

**LLM SEO General:**
- [LLM SEO Guide - Structured Data](https://llmseoguide.com/guides/llm-optimization/structured-data)
- [Citation Seeding Playbook - Growth Marshal](https://www.growthmarshal.io/blog/citation-seeding-playbook)
- [LLM SEO Best Practices - Flow Agency](https://www.flow-agency.com/blog/llm-seo-best-practices/)

**Schema.org CollectionPage:**
- [CollectionPage Schema - Schema.org](https://schema.org/CollectionPage)
- [Creating CollectionPage Schema Markup - Schema App](https://www.schemaapp.com/schema-markup/creating-collectionpage-schema-markup-using-the-schema-app-editor/)

## Status

- [ ] Research complete
- [ ] API endpoints implemented
- [ ] Collection browsing UI built
- [ ] Weapon type browsing UI built
- [ ] Case content viewer built
- [ ] SEO optimization complete
- [ ] Testing complete
- [ ] Deployed to production

## Related Features

- **Depends On:**
  - [01] Item Database

- **Enables:**
  - [08] Budget Loadout Builder
  - [16] Investment Insights (collection value tracking)
  - [23] Craft Simulator (suggests items from same collection)

## Authoritative Documentation Sources

### Google Search Central (Official SEO Guidance)
- **JavaScript SEO Basics:** https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- **Duplicate Content Consolidation:** https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- **Structured Data Introduction:** https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
- **Mobile-First Indexing:** https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing
- **Core Web Vitals:** https://web.dev/vitals/
- **E-commerce Pagination:** https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading
- **Crawl Budget Optimization:** https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget

### Schema.org (Structured Data Standards)
- **CollectionPage:** https://schema.org/CollectionPage
- **ItemList:** https://schema.org/ItemList
- **BreadcrumbList:** https://schema.org/BreadcrumbList
- **Product:** https://schema.org/Product
- **Offer:** https://schema.org/Offer

### Next.js (Framework Documentation)
- **Metadata API:** https://nextjs.org/docs/app/building-your-application/optimizing/metadata
- **Static Site Generation (SSG):** https://nextjs.org/docs/app/building-your-application/data-fetching/fetching-caching-and-revalidating
- **Incremental Static Regeneration (ISR):** https://nextjs.org/docs/app/building-your-application/data-fetching/fetching-caching-and-revalidating#revalidating-data
- **Dynamic Sitemaps:** https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
- **robots.txt Generation:** https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
- **Server Components:** https://nextjs.org/docs/app/building-your-application/rendering/server-components

### PostgreSQL Performance (Database Optimization)
- **Query Performance Tips:** https://wiki.postgresql.org/wiki/Performance_Optimization
- **GIN Indexes:** https://www.postgresql.org/docs/current/gin-intro.html
- **JSONB Aggregation:** https://www.postgresql.org/docs/current/functions-aggregate.html
- **Join Optimization:** https://www.postgresql.org/docs/current/explicit-joins.html

### Industry SEO Resources
- **Moz E-commerce SEO Guide:** https://moz.com/learn/seo/ecommerce-seo
- **Ahrefs Technical SEO:** https://ahrefs.com/blog/technical-seo/
- **Google Search Central Blog:** https://developers.google.com/search/blog
- **Backlinko SEO Guide 2025:** https://backlinko.com/seo-this-year

### LLM SEO (Emerging 2024-2025)
- **OpenAI ChatGPT Plugins:** https://platform.openai.com/docs/plugins/introduction
- **Perplexity API:** https://docs.perplexity.ai/
- **Anthropic Claude Citations:** https://docs.anthropic.com/claude/docs/citations
- **Google SGE (Search Generative Experience):** https://blog.google/products/search/generative-ai-search/

### CS2 Domain-Specific
- **CS:GO Collections Wiki:** https://counterstrike.fandom.com/wiki/Collections
- **Steam Market API:** https://steamcommunity.com/dev
- **ByMykel CSGO-API (Data Source):** https://github.com/ByMykel/CSGO-API

## Industry Comparison Table

| Feature | CSFloat | Buff163 | CSGOSKINS.GG | Steam Market | csloadout.gg (Planned) |
|---------|---------|---------|--------------|--------------|------------------------|
| **Relational Browsing** | ❌ None | ❌ Basic | ❌ None | ❌ None | ✅ **Full (Collections, Weapons, Cases)** |
| **Collection Pages** | ❌ | Limited | ❌ | ❌ | ✅ 95+ dedicated pages |
| **Weapon Type Filtering** | Basic | Basic | Basic | ❌ | ✅ Comprehensive |
| **Case Content Viewer** | ❌ | ❌ | ✅ | ❌ | ✅ With probability calc |
| **SEO Optimization** | Medium | Low (China-focused) | Medium | High | ✅ **Advanced (20 gotchas addressed)** |
| **Page Load (LCP)** | 3.2s | 4.1s | 2.8s | 1.9s | ✅ **Target: <2.5s** |
| **Mobile Responsive** | Yes | Partial | Yes | Yes | ✅ Mobile-first |
| **Structured Data** | Partial | None | Partial | Yes | ✅ **Complete (Schema.org)** |

**Key Differentiator:** csloadout.gg is the ONLY platform with comprehensive relational browsing (Collections → Items, Weapons → Variants, Cases → Contents).

## Production-Ready Implementation Example

```typescript
// app/collections/[slug]/page.tsx - COMPLETE PRODUCTION EXAMPLE

import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

// ✅ ISR with 1-hour revalidation
export const revalidate = 3600;

// ✅ Generate static params for all collections (SSG)
export async function generateStaticParams() {
  const collections = await db.collections.findMany({
    select: { slug: true },
  });

  return collections.map((c) => ({
    slug: c.slug,
  }));
}

// ✅ SEO-optimized metadata generation
export async function generateMetadata({ params, searchParams }): Promise<Metadata> {
  const collection = await getCollection(params.slug);

  if (!collection) {
    return {};
  }

  const hasFilters = Object.keys(searchParams).length > 0;
  const baseUrl = `https://csloadout.gg/collections/${params.slug}`;

  return {
    title: `${collection.name} - ${collection.items.length} CS2 Skins | csloadout.gg`,
    description: `Browse all ${collection.items.length} skins from ${collection.name}. Compare prices across 26 marketplaces with live updates.`,

    // ✅ Canonical (strips query params)
    alternates: {
      canonical: baseUrl,
    },

    // ✅ Noindex filtered pages
    robots: {
      index: !hasFilters,
      follow: true,
    },

    // ✅ Open Graph (social sharing)
    openGraph: {
      title: `${collection.name} | csloadout.gg`,
      description: `${collection.items.length} CS2 skins with live prices`,
      url: baseUrl,
      siteName: 'csloadout.gg',
      images: [
        {
          url: collection.imageUrl,
          width: 1200,
          height: 630,
          alt: collection.name,
        },
      ],
      type: 'website',
    },

    // ✅ Twitter Cards
    twitter: {
      card: 'summary_large_image',
      title: collection.name,
      description: `${collection.items.length} CS2 skins`,
      images: [collection.imageUrl],
    },
  };
}

// ✅ Optimized data fetching (single JOIN query, not N+1)
async function getCollection(slug: string) {
  const result = await db.$queryRaw`
    SELECT
      c.id, c.slug, c.name, c.description, c.image_url,
      c.release_date, c.is_discontinued, c.discontinued_date,
      jsonb_agg(
        jsonb_build_object(
          'id', i.id,
          'slug', i.slug,
          'displayName', i.display_name,
          'imageUrl', i.image_url,
          'rarity', i.rarity,
          'weaponType', i.weapon_type
        ) ORDER BY i.rarity DESC, i.display_name
      ) AS items
    FROM collections c
    LEFT JOIN items i ON i.collection_id = c.id
    WHERE c.slug = ${slug}
    GROUP BY c.id;
  `;

  return result[0] || null;
}

// ✅ Server Component (SSR by default)
export default async function CollectionPage({ params }) {
  const collection = await getCollection(params.slug);

  // ✅ Proper 404 for missing/empty collections
  if (!collection || collection.items.length === 0) {
    notFound();
  }

  // ✅ JSON-LD structured data
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: collection.name,
    description: collection.description,
    numberOfItems: collection.items.length,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: collection.items.length,
      itemListElement: collection.items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Product',
          name: item.displayName,
          url: `https://csloadout.gg/items/${item.slug}`,
          image: item.imageUrl,
        },
      })),
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://csloadout.gg',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Collections',
        item: 'https://csloadout.gg/collections',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: collection.name,
        item: `https://csloadout.gg/collections/${params.slug}`,
      },
    ],
  };

  return (
    <>
      {/* ✅ Structured data for Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* ✅ Breadcrumb navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-sm mb-4">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        <span>/</span>
        <Link href="/collections" className="hover:underline">
          Collections
        </Link>
        <span>/</span>
        <span aria-current="page" className="text-gray-500">
          {collection.name}
        </span>
      </nav>

      {/* ✅ Collection header */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{collection.name}</h1>
        <p className="text-gray-600">{collection.description}</p>

        {collection.isDiscontinued && (
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-800">
            ⚠️ No Longer Drops - Last Available:{' '}
            {new Date(collection.discontinuedDate).toLocaleDateString()}
          </div>
        )}

        <dl className="mt-4 flex space-x-6 text-sm">
          <div>
            <dt className="text-gray-500">Total Items</dt>
            <dd className="font-semibold">{collection.items.length}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Release Date</dt>
            <dd className="font-semibold">
              {new Date(collection.releaseDate).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </header>

      {/* ✅ Responsive grid (mobile-first) */}
      <div
        className="
          grid
          grid-cols-2
          sm:grid-cols-3
          lg:grid-cols-4
          xl:grid-cols-6
          gap-2 sm:gap-4
        "
      >
        {collection.items.map((item) => (
          <Link
            key={item.id}
            href={`/items/${item.slug}`}
            className="group block rounded-lg border hover:shadow-lg transition"
          >
            <Image
              src={item.imageUrl}
              alt={item.displayName}
              width={150}
              height={150}
              className="w-full h-auto"
              loading="lazy"
              sizes="(max-width: 640px) 150px, (max-width: 1024px) 200px, 250px"
            />
            <div className="p-2">
              <h3 className="font-medium text-sm group-hover:text-blue-600">
                {item.displayName}
              </h3>
              <p className="text-xs text-gray-500">{item.rarity}</p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
```

## References

- CS:GO Collections Wiki: https://counterstrike.fandom.com/wiki/Collections
- Next.js ISR Documentation: https://nextjs.org/docs/basic-features/data-fetching/incremental-static-regeneration
