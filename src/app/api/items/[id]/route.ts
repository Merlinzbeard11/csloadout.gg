/**
 * GET /api/items/:id - Get single item detail
 *
 * BDD Reference: features/01-item-database.feature:51-58 (View item detail page)
 *
 * Requirements:
 * - Return complete item details
 * - Include: name, rarity, type, image, wear range, pattern count
 * - Handle optional fields (wear_min, wear_max, pattern_count for non-skins)
 * - Include image fallback URLs for reliability (Gotcha #1: Steam CDN)
 *
 * Parameters:
 *   - id: UUID of the item
 *
 * Response:
 *   - 200: Item object with all fields
 *   - 400: Invalid UUID format
 *   - 404: Item not found
 *   - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering (uses dynamic route parameters which require dynamic mode)
export const dynamic = 'force-dynamic';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate UUID format
    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid item ID format' },
        { status: 400 }
      );
    }

    // Fetch item from database
    const item = await prisma.item.findUnique({
      where: { id },
    });

    // Return 404 if not found
    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Return complete item details
    return NextResponse.json(item);
  } catch (error) {
    console.error('[API /items/:id] Error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
