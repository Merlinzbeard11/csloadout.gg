/**
 * GET /api/cases/:slug - Get case detail with contents
 *
 * BDD Reference: features/02-relational-browsing.feature
 *   - View case contents with drop probabilities
 *   - Items grouped by rarity
 *   - Special items (knives, gloves) highlighted
 *   - Calculate expected value
 *   - Validate probabilities sum to 100%
 *
 * Performance Requirements:
 *   - Single JOIN query (not N+1)
 *   - <50ms query time
 *
 * Gotcha #4: Case drop probabilities must sum to 100%
 * Gotcha #7: Support previous_slugs for 301 redirects
 *
 * Response:
 *   {
 *     id, name, slug, description, imageUrl, keyPrice, releaseDate,
 *     items: CaseItem[],
 *     expectedValue: number,
 *     probabilityValid: boolean
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering (uses dynamic route parameters which require dynamic mode)
export const dynamic = 'force-dynamic';

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
        { error: 'Case slug is required' },
        { status: 400 }
      );
    }

    // Try to find by current slug first
    let caseData = await prisma.case.findUnique({
      where: { slug },
      include: {
        case_items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                display_name: true,
                search_name: true,
                rarity: true,
                type: true,
                weapon_type: true,
                image_url: true,
                image_url_fallback: true,
              },
            },
          },
        },
      },
    });

    // If not found, check previous_slugs for 301 redirect
    if (!caseData) {
      const caseByOldSlug = await prisma.case.findFirst({
        where: {
          previous_slugs: {
            has: slug,
          },
        },
      });

      if (caseByOldSlug) {
        // Return 301 redirect to current slug
        return NextResponse.redirect(
          new URL(`/api/cases/${caseByOldSlug.slug}`, request.url),
          { status: 301 }
        );
      }

      // Case doesn't exist
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Empty case should return 404
    if (caseData.case_items.length === 0) {
      return NextResponse.json(
        { error: 'Case has no items' },
        { status: 404 }
      );
    }

    // Gotcha #4: Validate probabilities sum to 100%
    const totalProbability = caseData.case_items.reduce(
      (sum, caseItem) => sum + caseItem.drop_probability,
      0
    );
    const probabilityValid = Math.abs(totalProbability - 100) <= 0.01;

    // Group items by rarity
    const itemsByRarity = caseData.case_items.reduce((groups: any, caseItem) => {
      const rarity = caseItem.item.rarity || 'unknown';
      if (!groups[rarity]) groups[rarity] = [];
      groups[rarity].push(caseItem);
      return groups;
    }, {});

    // Sort rarities by order (highest first)
    const sortedRarities = Object.keys(itemsByRarity).sort((a, b) => {
      const orderA = RARITY_ORDER[a] || 999;
      const orderB = RARITY_ORDER[b] || 999;
      return orderA - orderB;
    });

    // Format items with rarity grouping
    const formattedItems = sortedRarities.flatMap((rarity) => {
      return itemsByRarity[rarity].map((caseItem: any) => ({
        id: caseItem.item.id,
        name: caseItem.item.name,
        displayName: caseItem.item.display_name,
        searchName: caseItem.item.search_name,
        rarity: caseItem.item.rarity,
        type: caseItem.item.type,
        weaponType: caseItem.item.weapon_type,
        imageUrl: caseItem.item.image_url,
        imageUrlFallback: caseItem.item.image_url_fallback,
        dropProbability: caseItem.drop_probability,
        isSpecialItem: caseItem.is_special_item,
      }));
    });

    // Calculate expected value (placeholder - requires price data)
    // Expected value = sum of (probability × price) for all items
    // For now, using 0 until price data is available
    const expectedValue = 0; // TODO: Calculate when price data available

    // Format response
    const response = {
      id: caseData.id,
      name: caseData.name,
      slug: caseData.slug,
      description: caseData.description,
      imageUrl: caseData.image_url,
      keyPrice: caseData.key_price,
      releaseDate: caseData.release_date.toISOString(),
      items: formattedItems,
      itemCount: formattedItems.length,
      expectedValue,
      probabilityValid,
      totalProbability,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API /cases/:slug] Error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
