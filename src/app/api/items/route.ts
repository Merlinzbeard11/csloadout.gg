/**
 * GET /api/items - Browse items with pagination and filters
 *
 * BDD Reference: features/01-item-database.feature:11-49
 *   - Browse all items with pagination (50 per page)
 *   - Filter by type, rarity, weapon_type
 *   - Return total count for pagination controls
 *
 * Query Parameters:
 *   - page: Page number (default: 1)
 *   - pageSize: Items per page (default: 50, max: 100)
 *   - type: Filter by item type (skin, sticker, case, etc.)
 *   - rarity: Filter by rarity (consumer, industrial, covert, etc.)
 *   - weapon_type: Filter by weapon (AK-47, AWP, etc.)
 *
 * Response:
 *   {
 *     items: Item[],
 *     total: number,
 *     page: number,
 *     pageSize: number
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const requestedPageSize = parseInt(searchParams.get('pageSize') || '50') || 50;
    const pageSize = Math.min(100, Math.max(1, requestedPageSize)); // Limit: 1-100

    // Parse filter parameters
    const type = searchParams.get('type') || undefined;
    const rarity = searchParams.get('rarity') || undefined;
    const weapon_type = searchParams.get('weapon_type') || undefined;

    // Build where clause for filters
    const where: any = {};
    if (type) where.type = type;
    if (rarity) where.rarity = rarity;
    if (weapon_type) where.weapon_type = weapon_type;

    // Calculate offset for pagination
    const offset = (page - 1) * pageSize;

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
    });
  } catch (error) {
    console.error('[API /items] Error:', error);

    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}
