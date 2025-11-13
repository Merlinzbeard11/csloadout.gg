/**
 * GET /api/collections - List all collections
 *
 * BDD Reference: features/02-relational-browsing.feature
 *   - Browse all collections displayed as cards
 *   - Each collection shows: image, name, item count, release date
 *   - Collections sorted by release date (newest first)
 *
 * Performance:
 *   - Prevents N+1 queries by using aggregation
 *   - Returns item count without loading all items
 *
 * Response:
 *   {
 *     collections: Collection[],
 *     total: number
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering (uses request.url which requires dynamic mode)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Optional filter: show only active/discontinued
    const discontinued = searchParams.get('discontinued');
    const showDiscontinuedOnly =
      discontinued === 'true' ? true : discontinued === 'false' ? false : undefined;

    // Build where clause
    const where: any = {};
    if (showDiscontinuedOnly !== undefined) {
      where.is_discontinued = showDiscontinuedOnly;
    }

    // Fetch collections with item counts (prevent N+1 queries)
    const collections = await prisma.collection.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image_url: true,
        release_date: true,
        is_discontinued: true,
        discontinued_date: true,
        _count: {
          select: { items: true }, // Aggregated count, not loading all items
        },
      },
      orderBy: {
        release_date: 'desc', // Newest first
      },
    });

    // Transform response
    const formattedCollections = collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      imageUrl: collection.image_url,
      releaseDate: collection.release_date.toISOString(),
      isDiscontinued: collection.is_discontinued,
      discontinuedDate: collection.discontinued_date?.toISOString() || null,
      itemCount: collection._count.items,
    }));

    return NextResponse.json({
      collections: formattedCollections,
      total: formattedCollections.length,
    });
  } catch (error) {
    console.error('[API /collections] Error:', error);

    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    );
  }
}
