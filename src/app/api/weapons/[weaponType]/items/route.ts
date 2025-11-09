/**
 * GET /api/weapons/:weaponType/items - Get all skins for specific weapon
 *
 * BDD Reference: features/02-relational-browsing.feature
 *   - View all skins for a specific weapon (e.g., AK-47)
 *   - Items sorted by rarity (highest first)
 *   - Include collection name for each variant
 *   - Weapon type normalization (AK47, Ak-47, ak47 → AK-47)
 *
 * Performance Requirements:
 *   - Single JOIN query with collection data
 *   - Use indexed weapon_type column
 *   - <50ms query time
 *
 * Gotcha #5: Weapon name inconsistencies across data sources
 * Gotcha #9: URL parameter validation required
 *
 * Response:
 *   {
 *     weaponType: string,
 *     items: Item[],
 *     total: number
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
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

/**
 * Normalize weapon type to standard format
 * Handles inconsistencies from different data sources
 *
 * Examples:
 *   - AK47, Ak-47, ak47 → AK-47
 *   - M4A1S → M4A1-S
 *   - USPS → USP-S
 */
function normalizeWeaponType(input: string): string {
  if (!input || input.trim() === '') return '';

  // Convert to uppercase
  let normalized = input.toUpperCase().trim();

  // Handle special cases first
  if (normalized === 'M4A1S') return 'M4A1-S';
  if (normalized === 'USPS') return 'USP-S';
  if (normalized === 'M4A4') return 'M4A4';

  // Add hyphen between weapon name and numbers (e.g., AK47 → AK-47)
  // Only if there's NOT already a hyphen and it's a simple pattern like AK47
  if (/^[A-Z]{2,}\d+$/.test(normalized)) {
    normalized = normalized.replace(/([A-Z]+)(\d+)/, '$1-$2');
  }

  return normalized;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { weaponType: string } }
) {
  try {
    const { weaponType } = params;

    // Validate weapon type parameter
    if (!weaponType || weaponType.trim() === '') {
      return NextResponse.json(
        { error: 'Weapon type is required' },
        { status: 400 }
      );
    }

    // Gotcha #9: Validate weapon type format (alphanumeric, spaces, hyphens only)
    const validPattern = /^[A-Za-z0-9\s-]+$/;
    if (!validPattern.test(weaponType)) {
      return NextResponse.json(
        { error: 'Invalid weapon type format' },
        { status: 400 }
      );
    }

    // Gotcha #5: Normalize weapon type to handle inconsistencies
    const normalizedWeaponType = normalizeWeaponType(weaponType);

    // Fetch all items for this weapon type with collection data
    // Using include to prevent N+1 queries
    const items = await prisma.item.findMany({
      where: {
        weapon_type: normalizedWeaponType,
        type: 'skin', // Only skins, not stickers/cases/etc
      },
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
        collection: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Return 404 if no items found for this weapon
    if (items.length === 0) {
      return NextResponse.json(
        { error: `No items found for weapon type: ${normalizedWeaponType}` },
        { status: 404 }
      );
    }

    // Sort items by rarity (highest first)
    const sortedItems = items.sort((a, b) => {
      const orderA = a.rarity ? RARITY_ORDER[a.rarity] || 999 : 999;
      const orderB = b.rarity ? RARITY_ORDER[b.rarity] || 999 : 999;
      return orderA - orderB;
    });

    // Format response
    const response = {
      weaponType: normalizedWeaponType,
      items: sortedItems.map((item) => ({
        id: item.id,
        name: item.name,
        displayName: item.display_name,
        searchName: item.search_name,
        rarity: item.rarity,
        type: item.type,
        weaponType: item.weapon_type,
        imageUrl: item.image_url,
        imageUrlFallback: item.image_url_fallback,
        collection: item.collection
          ? {
              id: item.collection.id,
              name: item.collection.name,
              slug: item.collection.slug,
            }
          : null,
      })),
      total: sortedItems.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API /weapons/:weaponType/items] Error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
