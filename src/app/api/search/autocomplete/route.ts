/**
 * GET /api/search/autocomplete - Instant Autocomplete Suggestions
 *
 * BDD Reference: features/03-search-filters.feature:47-74 (Autocomplete scenarios)
 * Type Reference: src/types/search.ts (AutocompleteResponse, AutocompleteSuggestion)
 * Spec Reference: features/03-search-filters.md:510-609 (Autocomplete gotchas)
 *
 * Performance Target: <50ms response time (CRITICAL)
 *
 * Critical Gotchas Addressed:
 * - Gotcha #4: Only 19% of sites get autocomplete right
 *   Solution: Limit to 8-10 suggestions, group by type
 *
 * - Gotcha #5: pg_trgm ORDER BY causes severe slowdown (10s → 113ms)
 *   Solution: Exact-match-first, NO ORDER BY similarity()
 *   Strategy:
 *     1. Query exact prefix matches FIRST (uses idx_items_name_prefix B-tree)
 *     2. If < limit, add fuzzy matches (pg_trgm, but NO ORDER BY similarity)
 *     3. Return results without sorting by similarity (prevents full scan)
 *
 * - Gotcha #6: pg_trgm doesn't work for <3 characters
 *   Solution: Use ILIKE prefix matching for short queries
 *
 * Implementation Strategy:
 * ```typescript
 * if (query.length < 3) {
 *   // Use prefix matching only (FAST - B-tree index)
 *   return exactPrefixMatches(query);
 * } else {
 *   // Exact-match-first, then fuzzy fallback
 *   const exact = exactPrefixMatches(query); // 5 results
 *   if (exact.length < limit) {
 *     const fuzzy = fuzzyMatches(query, limit - exact.length);
 *     return [...exact, ...fuzzy]; // NO ORDER BY similarity
 *   }
 *   return exact;
 * }
 * ```
 *
 * Query Parameters:
 *   - query: Search query (required)
 *   - limit: Max suggestions (default: 10, max: 10)
 *   - device: 'mobile' | 'desktop' (adjusts limit: 8 mobile, 10 desktop)
 *
 * Response Format (AutocompleteResponse):
 *   {
 *     suggestions: {
 *       items: AutocompleteSuggestion[],      // Specific items (e.g., "AK-47 | Redline")
 *       weapons: AutocompleteSuggestion[],    // Weapon categories (e.g., "AK-47")
 *       collections: AutocompleteSuggestion[] // Collections (e.g., "Operation Riptide")
 *     },
 *     meta?: {
 *       executionTime: number (ms),
 *       cached: boolean
 *     }
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { AutocompleteResponse, AutocompleteSuggestion } from '@/types/search';
import { SEARCH_DEFAULTS } from '@/types/search';

// Suggestion limits (Gotcha #4: Industry best practice)
const MAX_SUGGESTIONS = {
  desktop: 10,
  mobile: 8,
};

const MAX_QUERY_LENGTH = 50; // Truncate long queries for autocomplete

export async function GET(request: NextRequest) {
  const startTime = performance.now();

  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameter
    let query = searchParams.get('query')?.trim() || '';

    // Handle empty query
    if (!query) {
      return NextResponse.json<AutocompleteResponse>({
        suggestions: {
          items: [],
          weapons: [],
          collections: [],
        },
        meta: {
          executionTime: Math.round(performance.now() - startTime),
          cached: false,
        },
      });
    }

    // Truncate very long queries
    if (query.length > MAX_QUERY_LENGTH) {
      query = query.slice(0, MAX_QUERY_LENGTH);
    }

    // Parse limit parameter
    const device = searchParams.get('device') as 'mobile' | 'desktop' | null;
    const requestedLimit = parseInt(searchParams.get('limit') || '') || MAX_SUGGESTIONS.desktop;
    const limit = Math.min(
      requestedLimit,
      device === 'mobile' ? MAX_SUGGESTIONS.mobile : MAX_SUGGESTIONS.desktop
    );

    // Normalize query for matching
    const normalizedQuery = query.toLowerCase();

    // ========================================
    // Strategy: Exact-Match-First (Gotcha #5 Mitigation)
    // ========================================

    let itemSuggestions: AutocompleteSuggestion[] = [];
    let weaponSuggestions: AutocompleteSuggestion[] = [];
    let collectionSuggestions: AutocompleteSuggestion[] = [];

    // Gotcha #6: pg_trgm doesn't work for <3 characters
    if (query.length < 3) {
      // Use prefix matching only (FAST - B-tree index idx_items_name_prefix)
      const exactItems = await prisma.$queryRaw<any[]>`
        SELECT
          id,
          name,
          display_name,
          type,
          weapon_type,
          image_url
        FROM "Item"
        WHERE name ILIKE ${normalizedQuery + '%'}
        LIMIT ${limit}
      `;

      itemSuggestions = exactItems.map((item) => ({
        type: 'item',
        name: item.display_name || item.name,
        itemId: item.id,
        icon: item.image_url,
        score: 1.0, // Exact match
      }));
    } else {
      // Query >= 3 characters: Exact-match-first, then fuzzy fallback

      // STEP 1: Get exact prefix matches (FAST - B-tree index)
      const exactItems = await prisma.$queryRaw<any[]>`
        SELECT
          id,
          name,
          display_name,
          type,
          weapon_type,
          image_url,
          1.0 as score
        FROM "Item"
        WHERE name ILIKE ${normalizedQuery + '%'}
        LIMIT ${Math.min(limit, 5)}
      `;

      const exactCount = exactItems.length;

      // STEP 2: If we need more suggestions, add fuzzy matches
      let fuzzyItems: any[] = [];

      if (exactCount < limit) {
        const remainingLimit = limit - exactCount;

        // Fuzzy match with pg_trgm
        // Gotcha #5: NO ORDER BY similarity() - that causes 10s slowdown
        // Instead: Just filter by similarity threshold, return unsorted
        fuzzyItems = await prisma.$queryRaw<any[]>`
          SELECT
            id,
            name,
            display_name,
            type,
            weapon_type,
            image_url,
            similarity(name, ${normalizedQuery}) as score
          FROM "Item"
          WHERE name % ${normalizedQuery}
            AND similarity(name, ${normalizedQuery}) > ${SEARCH_DEFAULTS.trigram_similarity_threshold}
            AND name NOT ILIKE ${normalizedQuery + '%'} -- Exclude exact matches (already fetched)
          LIMIT ${remainingLimit}
        `;
      }

      // Combine exact + fuzzy (exact matches first, then fuzzy)
      itemSuggestions = [
        ...exactItems.map((item) => ({
          type: 'item' as const,
          name: item.display_name || item.name,
          itemId: item.id,
          icon: item.image_url,
          score: 1.0, // Exact match
        })),
        ...fuzzyItems.map((item) => ({
          type: 'item' as const,
          name: item.display_name || item.name,
          itemId: item.id,
          icon: item.image_url,
          score: Number(item.score) || 0.7, // Fuzzy match score
        })),
      ];
    }

    // ========================================
    // Weapon Type Suggestions (Aggregated)
    // ========================================

    // Get distinct weapon types that match the query
    const weaponTypes = await prisma.$queryRaw<any[]>`
      SELECT DISTINCT weapon_type
      FROM "Item"
      WHERE weapon_type IS NOT NULL
        AND weapon_type ILIKE ${normalizedQuery + '%'}
      LIMIT 3
    `;

    weaponSuggestions = weaponTypes.map((w) => ({
      type: 'weapon' as const,
      name: w.weapon_type,
      score: 1.0,
    }));

    // ========================================
    // Collection Suggestions
    // ========================================

    // Get collections that match the query
    const collections = await prisma.$queryRaw<any[]>`
      SELECT
        id,
        name,
        slug,
        image_url
      FROM "Collection"
      WHERE name ILIKE ${normalizedQuery + '%'}
      LIMIT 2
    `;

    collectionSuggestions = collections.map((c) => ({
      type: 'collection' as const,
      name: c.name,
      itemId: c.id, // Collection ID
      icon: c.image_url,
      score: 1.0,
    }));

    // ========================================
    // Enforce Total Limit (Gotcha #4)
    // ========================================

    // Prioritize: Items > Weapons > Collections
    const totalSuggestions = itemSuggestions.length + weaponSuggestions.length + collectionSuggestions.length;

    if (totalSuggestions > limit) {
      // Trim to fit limit, prioritizing items
      const itemLimit = Math.min(itemSuggestions.length, limit - 2); // Reserve 2 for weapons/collections
      const weaponLimit = Math.min(weaponSuggestions.length, Math.max(0, limit - itemLimit - 1));
      const collectionLimit = Math.min(collectionSuggestions.length, Math.max(0, limit - itemLimit - weaponLimit));

      itemSuggestions = itemSuggestions.slice(0, itemLimit);
      weaponSuggestions = weaponSuggestions.slice(0, weaponLimit);
      collectionSuggestions = collectionSuggestions.slice(0, collectionLimit);
    }

    // ========================================
    // Build Response
    // ========================================

    const executionTime = performance.now() - startTime;

    const response: AutocompleteResponse = {
      suggestions: {
        items: itemSuggestions,
        weapons: weaponSuggestions,
        collections: collectionSuggestions,
      },
      meta: {
        executionTime: Math.round(executionTime),
        cached: false, // TODO: Implement Redis caching for common queries
      },
    };

    // Performance warning if >50ms
    if (executionTime > 50) {
      console.warn(
        `[API /autocomplete] Slow query (${Math.round(executionTime)}ms): "${query}"`,
        {
          queryLength: query.length,
          exactMatches: itemSuggestions.filter((s) => s.score === 1.0).length,
          fuzzyMatches: itemSuggestions.filter((s) => s.score < 1.0).length,
        }
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API /autocomplete] Error:', error);

    return NextResponse.json<AutocompleteResponse>(
      {
        suggestions: {
          items: [],
          weapons: [],
          collections: [],
        },
        meta: {
          executionTime: Math.round(performance.now() - startTime),
          cached: false,
        },
      },
      { status: 200 } // Return empty suggestions instead of error for better UX
    );
  }
}
