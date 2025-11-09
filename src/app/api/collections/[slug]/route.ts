/**
 * GET /api/collections/:slug - Get collection detail with items
 *
 * BDD Reference: features/02-relational-browsing.feature
 *   - View collection detail page with all items
 *   - Items sorted by rarity (highest first)
 *   - Calculate total collection value
 *   - Handle discontinued collections
 *   - Return 404 for empty/nonexistent collections
 *
 * Performance Requirements:
 *   - Single JOIN query (not N+1) - Gotcha #1
 *   - <50ms query time
 *
 * Gotcha #3: Empty collections return 404 (not 200)
 * Gotcha #7: Support previous_slugs for 301 redirects
 *
 * Response:
 *   {
 *     id, name, slug, description, imageUrl,
 *     releaseDate, isDiscontinued, discontinuedDate,
 *     items: Item[],
 *     totalValue: number
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

// Rarity sort order (highest to lowest)
const RARITY_ORDER: Record<string, number> = {
  contraband: 1,
  covert: 2,
  classified: 3,
  restricted: 4,
  milspec: 5,
  industrial: 6,
  consumer: 7,
};

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    if (!slug) {
      return NextResponse.json(
        { error: 'Collection slug is required' },
        { status: 400 }
      );
    }

    // Try to find by current slug first
    let collection = await prisma.collection.findUnique({
      where: { slug },
      include: {
        items: {
          select: {
            id: true,
            name: true,
            display_name: true,
            search_name: true,
            rarity: true,
            type: true,
            image_url: true,
            image_url_fallback: true,
            weapon_type: true,
          },
        },
      },
    });

    // If not found, check previous_slugs for 301 redirect
    if (!collection) {
      const collectionByOldSlug = await prisma.collection.findFirst({
        where: {
          previous_slugs: {
            has: slug,
          },
        },
      });

      if (collectionByOldSlug) {
        // Return 301 redirect to current slug
        return NextResponse.redirect(
          new URL(
            `/api/collections/${collectionByOldSlug.slug}`,
            request.url
          ),
          { status: 301 }
        );
      }

      // Collection doesn't exist
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Gotcha #3: Empty collections should return 404
    if (collection.items.length === 0) {
      return NextResponse.json(
        { error: 'Collection has no items' },
        { status: 404 }
      );
    }

    // Sort items by rarity (highest first)
    const sortedItems = collection.items.sort((a, b) => {
      const orderA = a.rarity ? RARITY_ORDER[a.rarity] || 999 : 999;
      const orderB = b.rarity ? RARITY_ORDER[b.rarity] || 999 : 999;
      return orderA - orderB;
    });

    // Calculate total collection value
    // Note: In production, this would use real price data
    // For now, using mock/placeholder value
    const totalValue = 0; // TODO: Sum of lowest prices when price data available

    // Format response
    const response = {
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      imageUrl: collection.image_url,
      releaseDate: collection.release_date.toISOString(),
      isDiscontinued: collection.is_discontinued,
      discontinuedDate: collection.discontinued_date?.toISOString() || null,
      items: sortedItems.map((item) => ({
        id: item.id,
        name: item.name,
        displayName: item.display_name,
        searchName: item.search_name,
        rarity: item.rarity,
        type: item.type,
        imageUrl: item.image_url,
        imageUrlFallback: item.image_url_fallback,
        weaponType: item.weapon_type,
      })),
      totalValue,
      itemCount: sortedItems.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API /collections/:slug] Error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
