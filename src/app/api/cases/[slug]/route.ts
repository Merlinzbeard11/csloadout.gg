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

// Rarity sort order (highest to lowest) - CS2 standard names
const RARITY_ORDER: Record<string, number> = {
  contraband: 1,  // Gold - Knives, Gloves
  covert: 2,      // Red
  classified: 3,  // Pink
  restricted: 4,  // Purple
  milspec: 5,     // Blue
  industrial: 6,  // Light Blue
  consumer: 7,    // Gray
};

// Wear condition sort order (best to worst)
const WEAR_ORDER: Record<string, number> = {
  'Factory New': 1,
  'Minimal Wear': 2,
  'Field-Tested': 3,
  'Well-Worn': 4,
  'Battle-Scarred': 5,
};

/**
 * Extract base weapon name by removing prefixes (StatTrak™, Souvenir) and wear condition
 * "StatTrak™ AK-47 | Redline (Field-Tested)" -> "AK-47 | Redline"
 */
function getBaseWeaponName(name: string): string {
  let baseName = name;

  // Remove StatTrak™ prefix
  baseName = baseName.replace(/^StatTrak™\s+/i, '');
  // Remove Souvenir prefix
  baseName = baseName.replace(/^Souvenir\s+/i, '');
  // Remove wear condition in parentheses at the end
  baseName = baseName.replace(/\s*\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)\s*$/i, '');

  return baseName.trim();
}

/**
 * Generate URL-friendly slug from base weapon name
 * "AWP | Printstream" -> "awp-printstream"
 */
function generateSlug(baseName: string): string {
  return baseName
    .toLowerCase()
    .replace(/\s*\|\s*/g, '-') // Replace " | " with "-"
    .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Determine variant type from item name
 */
function getVariantType(name: string): 'normal' | 'stattrak' | 'souvenir' {
  if (name.startsWith('StatTrak™')) return 'stattrak';
  if (name.startsWith('Souvenir')) return 'souvenir';
  return 'normal';
}

/**
 * Extract wear condition from item name
 */
function getWearCondition(name: string): string | null {
  const wearMatch = name.match(/\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)/i);
  return wearMatch ? wearMatch[1] : null;
}

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

    // Group items by base weapon name (without StatTrak/Souvenir prefix and wear condition)
    const groupedItems = new Map<string, {
      baseName: string;
      rarity: string | null;
      type: string;
      weaponType: string | null;
      imageUrl: string;
      imageUrlFallback: string | null;
      isSpecialItem: boolean;
      totalDropProbability: number;
      variants: Array<{
        id: string;
        name: string;
        displayName: string | null;
        variantType: 'normal' | 'stattrak' | 'souvenir';
        wear: string | null;
        imageUrl: string;
        imageUrlFallback: string | null;
        dropProbability: number;
      }>;
    }>();

    for (const caseItem of caseData.case_items) {
      const item = caseItem.item;
      const baseName = getBaseWeaponName(item.name);
      const variantType = getVariantType(item.name);
      const wear = getWearCondition(item.name);

      if (!groupedItems.has(baseName)) {
        groupedItems.set(baseName, {
          baseName,
          rarity: item.rarity,
          type: item.type,
          weaponType: item.weapon_type,
          imageUrl: item.image_url,
          imageUrlFallback: item.image_url_fallback,
          isSpecialItem: caseItem.is_special_item,
          totalDropProbability: 0,
          variants: [],
        });
      }

      const group = groupedItems.get(baseName)!;

      // Update image to prefer normal variant over StatTrak/Souvenir
      if (variantType === 'normal' && group.variants.length > 0) {
        group.imageUrl = item.image_url;
        group.imageUrlFallback = item.image_url_fallback;
      }

      // Accumulate drop probability for the group
      group.totalDropProbability += caseItem.drop_probability;

      // Mark as special item if any variant is special
      if (caseItem.is_special_item) {
        group.isSpecialItem = true;
      }

      group.variants.push({
        id: item.id,
        name: item.name,
        displayName: item.display_name,
        variantType,
        wear,
        imageUrl: item.image_url,
        imageUrlFallback: item.image_url_fallback,
        dropProbability: caseItem.drop_probability,
      });
    }

    // Convert to array and sort by rarity (highest first), then alphabetically
    const sortedItems = Array.from(groupedItems.values()).sort((a, b) => {
      const orderA = a.rarity ? RARITY_ORDER[a.rarity] || 999 : 999;
      const orderB = b.rarity ? RARITY_ORDER[b.rarity] || 999 : 999;

      // Primary sort: rarity (highest first)
      if (orderA !== orderB) {
        return orderA - orderB;
      }

      // Secondary sort: alphabetically by base name
      return a.baseName.toLowerCase().localeCompare(b.baseName.toLowerCase());
    });

    // Sort variants within each group (normal first, then by wear quality)
    for (const item of sortedItems) {
      item.variants.sort((a, b) => {
        // Sort by variant type (normal > stattrak > souvenir)
        const typeOrder = { normal: 1, stattrak: 2, souvenir: 3 };
        if (typeOrder[a.variantType] !== typeOrder[b.variantType]) {
          return typeOrder[a.variantType] - typeOrder[b.variantType];
        }
        // Then by wear condition
        const wearA = a.wear ? WEAR_ORDER[a.wear] || 999 : 999;
        const wearB = b.wear ? WEAR_ORDER[b.wear] || 999 : 999;
        return wearA - wearB;
      });
    }

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
      items: sortedItems.map((item) => ({
        baseName: item.baseName,
        slug: generateSlug(item.baseName),
        rarity: item.rarity,
        type: item.type,
        weaponType: item.weaponType,
        imageUrl: item.imageUrl,
        imageUrlFallback: item.imageUrlFallback,
        isSpecialItem: item.isSpecialItem,
        dropProbability: item.totalDropProbability,
        variantCount: item.variants.length,
        hasStatTrak: item.variants.some(v => v.variantType === 'stattrak'),
        hasSouvenir: item.variants.some(v => v.variantType === 'souvenir'),
        variants: item.variants,
      })),
      itemCount: sortedItems.length,
      totalVariants: caseData.case_items.length,
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
