/**
 * GET /api/items - Browse items with pagination, filters, and fuzzy search
 *
 * BDD Reference: features/01-item-database.feature:11-49
 *   - Browse all items with pagination (50 per page)
 *   - Filter by type, rarity, weapon_type
 *   - Search with fuzzy matching (PostgreSQL trigram)
 *   - Return total count for pagination controls
 *
 * Query Parameters:
 *   - q: Search query (fuzzy matching with pg_trgm)
 *   - page: Page number (default: 1)
 *   - pageSize: Items per page (default: 50, max: 100)
 *   - type: Filter by item type (skin, sticker, case, etc.)
 *   - rarity: Filter by rarity (consumer, industrial, covert, etc.)
 *   - weapon_type: Filter by weapon (AK-47, AWP, etc.)
 *
 * Search Implementation:
 *   - Uses PostgreSQL pg_trgm extension
 *   - similarity() function with 0.3 threshold
 *   - Sorts by rarity (highest first)
 *   - GIN index on search_name for performance
 *
 * Response:
 *   {
 *     items: Item[],
 *     total: number,
 *     page: number,
 *     pageSize: number,
 *     searchQuery?: string
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering (uses request.url which requires dynamic mode)
export const dynamic = 'force-dynamic';

// Rarity sort order mapping (highest to lowest)
const RARITY_SORT_ORDER: Record<string, number> = {
  contraband: 1,
  covert: 2,
  classified: 3,
  restricted: 4,
  milspec: 5,
  industrial: 6,
  consumer: 7,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const requestedPageSize = parseInt(searchParams.get('pageSize') || '50') || 50;
    const pageSize = Math.min(100, Math.max(1, requestedPageSize)); // Limit: 1-100

    // Parse search query
    const searchQuery = searchParams.get('q')?.trim() || undefined;

    // Parse filter parameters
    const type = searchParams.get('type') || undefined;
    const rarity = searchParams.get('rarity') || undefined;
    const weapon_type = searchParams.get('weapon_type') || undefined;

    // Calculate offset for pagination
    const offset = (page - 1) * pageSize;

    // If search query provided, use ILIKE pattern matching with smart relevance scoring
    if (searchQuery) {
      const normalizedQuery = searchQuery.toLowerCase();
      // Create ILIKE pattern for substring matching
      const likePattern = `%${normalizedQuery}%`;
      // Create pattern for word boundary matching (after | or space)
      const wordBoundaryPattern = `%| ${normalizedQuery}%`;
      // Create pattern for prefix matching (starts with query)
      const prefixPattern = `${normalizedQuery}%`;

      // Build SQL for search with smart relevance scoring:
      // - Prefix matches (name starts with query) get highest priority
      // - Word boundary matches (after | separator) get second priority
      // - Weapon type exact matches get bonus
      // - Similarity score for final tie-breaking
      const sqlQuery = `
        SELECT
          id, name, display_name, search_name, type, rarity, quality,
          wear, weapon_type, image_url, image_url_fallback, image_local_path,
          similarity(search_name, $1) as sim_score,
          -- Relevance score: prefix match (100) + word boundary (50) + weapon match (25) + similarity bonus
          (
            CASE WHEN search_name ILIKE $4 THEN 100 ELSE 0 END +
            CASE WHEN search_name ILIKE $3 THEN 50 ELSE 0 END +
            CASE WHEN LOWER(weapon_type) = $1 OR LOWER(weapon_type) LIKE $1 || '%' THEN 25 ELSE 0 END +
            (similarity(search_name, $1) * 20)
          ) as relevance_score
        FROM "Item"
        WHERE search_name ILIKE $2
        ${type ? `AND type = $5` : ''}
        ${rarity ? `AND rarity = $${type ? 6 : 5}` : ''}
        ${weapon_type ? `AND weapon_type = $${[type, rarity].filter(Boolean).length + 5}` : ''}
        ORDER BY
          relevance_score DESC,
          CASE rarity
            WHEN 'contraband' THEN 1
            WHEN 'covert' THEN 2
            WHEN 'classified' THEN 3
            WHEN 'restricted' THEN 4
            WHEN 'milspec' THEN 5
            WHEN 'industrial' THEN 6
            WHEN 'consumer' THEN 7
            ELSE 999
          END ASC,
          name ASC
        LIMIT $${[normalizedQuery, likePattern, wordBoundaryPattern, prefixPattern, type, rarity, weapon_type].filter(Boolean).length + 1}
        OFFSET $${[normalizedQuery, likePattern, wordBoundaryPattern, prefixPattern, type, rarity, weapon_type].filter(Boolean).length + 2}
      `;

      const countSql = `
        SELECT COUNT(*) as count
        FROM "Item"
        WHERE search_name ILIKE $1
        ${type ? `AND type = $2` : ''}
        ${rarity ? `AND rarity = $${type ? 3 : 2}` : ''}
        ${weapon_type ? `AND weapon_type = $${[type, rarity].filter(Boolean).length + 2}` : ''}
      `;

      // Build parameter arrays (mixed types for SQL params)
      // $1=normalizedQuery, $2=likePattern, $3=wordBoundaryPattern, $4=prefixPattern
      const queryParams: (string | number)[] = [normalizedQuery, likePattern, wordBoundaryPattern, prefixPattern];
      const countParams: string[] = [likePattern];

      if (type) {
        queryParams.push(type);
        countParams.push(type);
      }
      if (rarity) {
        queryParams.push(rarity);
        countParams.push(rarity);
      }
      if (weapon_type) {
        queryParams.push(weapon_type);
        countParams.push(weapon_type);
      }

      queryParams.push(pageSize, offset);

      // Execute search queries
      const [items, totalResult] = await Promise.all([
        prisma.$queryRawUnsafe(sqlQuery, ...queryParams),
        prisma.$queryRawUnsafe(countSql, ...countParams),
      ]);

      const total = Number((totalResult as any)[0]?.count || 0);

      return NextResponse.json({
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        searchQuery,
      });
    }

    // Standard browse without search (original logic)
    const where: any = {};
    if (type) where.type = type;
    if (rarity) where.rarity = rarity;
    if (weapon_type) where.weapon_type = weapon_type;

    // Execute queries in parallel
    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        select: {
          id: true,
          name: true,
          display_name: true,
          search_name: true,
          type: true,
          rarity: true,
          quality: true,
          wear: true,
          weapon_type: true,
          image_url: true,
          image_url_fallback: true,
          image_local_path: true,
        },
        orderBy: [
          { rarity: 'desc' }, // Highest rarity first
          { name: 'asc' },    // Then alphabetically
        ],
        skip: offset,
        take: pageSize,
      }),
      prisma.item.count({ where }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('[API /items] Error:', error);

    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}
