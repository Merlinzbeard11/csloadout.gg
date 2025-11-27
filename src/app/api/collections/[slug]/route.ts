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

    // Group items by base weapon name (without StatTrak/Souvenir prefix and wear condition)
    const groupedItems = new Map<string, {
      baseName: string;
      rarity: string | null;
      type: string;
      weaponType: string | null;
      imageUrl: string;
      imageUrlFallback: string | null;
      variants: Array<{
        id: string;
        name: string;
        displayName: string | null;
        variantType: 'normal' | 'stattrak' | 'souvenir';
        wear: string | null;
        imageUrl: string;
        imageUrlFallback: string | null;
      }>;
    }>();

    for (const item of collection.items) {
      const baseName = getBaseWeaponName(item.name);
      const variantType = getVariantType(item.name);
      const wear = getWearCondition(item.name);

      if (!groupedItems.has(baseName)) {
        // Use the first item's image as the representative image (prefer normal variant)
        groupedItems.set(baseName, {
          baseName,
          rarity: item.rarity,
          type: item.type,
          weaponType: item.weapon_type,
          imageUrl: item.image_url,
          imageUrlFallback: item.image_url_fallback,
          variants: [],
        });
      }

      const group = groupedItems.get(baseName)!;

      // Update image to prefer normal variant over StatTrak/Souvenir
      if (variantType === 'normal' && group.variants.length > 0) {
        group.imageUrl = item.image_url;
        group.imageUrlFallback = item.image_url_fallback;
      }

      group.variants.push({
        id: item.id,
        name: item.name,
        displayName: item.display_name,
        variantType,
        wear,
        imageUrl: item.image_url,
        imageUrlFallback: item.image_url_fallback,
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
    const WEAR_ORDER: Record<string, number> = {
      'Factory New': 1,
      'Minimal Wear': 2,
      'Field-Tested': 3,
      'Well-Worn': 4,
      'Battle-Scarred': 5,
    };

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
        baseName: item.baseName,
        slug: generateSlug(item.baseName),
        rarity: item.rarity,
        type: item.type,
        weaponType: item.weaponType,
        imageUrl: item.imageUrl,
        imageUrlFallback: item.imageUrlFallback,
        variantCount: item.variants.length,
        hasStatTrak: item.variants.some(v => v.variantType === 'stattrak'),
        hasSouvenir: item.variants.some(v => v.variantType === 'souvenir'),
        variants: item.variants,
      })),
      totalValue,
      itemCount: sortedItems.length,
      totalVariants: collection.items.length,
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
