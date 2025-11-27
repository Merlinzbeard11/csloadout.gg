/**
 * GET /api/skins/:slug - Get skin detail with all variants
 *
 * BDD Reference: features/02-relational-browsing.feature
 *   - View skin detail with all variants (wears, StatTrak, Souvenir)
 *   - Price ranges for each variant
 *   - Source information (cases/collections)
 *
 * Slug Format: "awp-printstream" from "AWP | Printstream"
 *
 * Response:
 *   {
 *     baseName, slug, rarity, type, weaponType, imageUrl,
 *     hasStatTrak, hasSouvenir, description,
 *     variants: [ { id, name, wear, quality, priceRange, imageUrl } ],
 *     sources: { cases: [], collections: [] },
 *     priceRange: { min, max }
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Wear condition sort order (best to worst)
const WEAR_ORDER: Record<string, number> = {
  'Factory New': 1,
  'Minimal Wear': 2,
  'Field-Tested': 3,
  'Well-Worn': 4,
  'Battle-Scarred': 5,
};

// Convert quality from database format to display format
const QUALITY_DISPLAY: Record<string, string> = {
  'stattrak': 'StatTrak™',
  'souvenir': 'Souvenir',
  'normal': 'Normal',
};

// Convert wear from database format to display format
const WEAR_DISPLAY: Record<string, string> = {
  'factory_new': 'Factory New',
  'minimal_wear': 'Minimal Wear',
  'field_tested': 'Field-Tested',
  'well_worn': 'Well-Worn',
  'battle_scarred': 'Battle-Scarred',
  'none': null as unknown as string,
};

/**
 * Convert slug to base weapon name pattern for search
 * "awp-printstream" -> "%AWP | Printstream%"
 */
function slugToSearchPattern(slug: string): string {
  // Convert slug back to approximate weapon name
  // Replace hyphens with spaces, capitalize first letters
  const parts = slug.split('-');

  // Special handling for weapon names with pipes
  // e.g., "awp-printstream" could be "AWP | Printstream"
  // We'll search for items containing both parts
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('%');
}

/**
 * Generate slug from base weapon name
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
 * Extract base weapon name from full item name
 */
function getBaseWeaponName(name: string): string {
  let baseName = name;
  // Remove StatTrak™ prefix
  baseName = baseName.replace(/^StatTrak™\s+/i, '');
  // Remove Souvenir prefix
  baseName = baseName.replace(/^Souvenir\s+/i, '');
  // Remove wear condition in parentheses
  baseName = baseName.replace(/\s*\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)\s*$/i, '');
  return baseName.trim();
}

/**
 * Extract wear condition from item name or database field
 */
function getWearDisplay(item: { name: string; wear: string }): string | null {
  // First try to get from name
  const wearMatch = item.name.match(/\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)/i);
  if (wearMatch) {
    return wearMatch[1];
  }
  // Fall back to database field
  return WEAR_DISPLAY[item.wear] || null;
}

/**
 * Get quality/variant type from item
 */
function getQualityDisplay(item: { name: string; quality: string }): string {
  if (item.name.startsWith('StatTrak™')) return 'StatTrak™';
  if (item.name.startsWith('Souvenir')) return 'Souvenir';
  if (item.quality === 'stattrak') return 'StatTrak™';
  if (item.quality === 'souvenir') return 'Souvenir';
  return 'Normal';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    if (!slug) {
      return NextResponse.json(
        { error: 'Skin slug is required' },
        { status: 400 }
      );
    }

    // Split slug into searchable parts
    // "m4a1-s-welcome-to-the-jungle" -> ["m4a1", "s", "welcome", "to", "the", "jungle"]
    const slugParts = slug.split('-').filter(p => p.length > 0);

    // Use the longest meaningful parts for search (skip short words like "to", "the")
    const searchTerms = slugParts
      .filter(p => p.length >= 3) // Only use parts with 3+ chars
      .slice(0, 4); // Limit to first 4 meaningful parts

    if (searchTerms.length === 0) {
      // Fallback: use all parts if all are short
      searchTerms.push(...slugParts.slice(0, 2));
    }

    // Build broad search query - items containing ANY of the key terms
    const items = await prisma.item.findMany({
      where: {
        type: 'skin',
        AND: searchTerms.map(term => ({
          name: { contains: term, mode: 'insensitive' as const },
        })),
      },
      include: {
        marketplace_prices: {
          orderBy: { total_cost: 'asc' },
        },
        collection: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        case_items: {
          include: {
            case: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    // Filter to exact slug matches by computing each item's slug
    const matchingItems: typeof items = [];

    for (const item of items) {
      const baseName = getBaseWeaponName(item.name);
      const itemSlug = generateSlug(baseName);

      if (itemSlug === slug) {
        matchingItems.push(item);
      }
    }

    if (matchingItems.length === 0) {
      // Debug: log what we searched for
      console.log(`[API /skins/${slug}] No matches found. Search terms: ${searchTerms.join(', ')}, Found ${items.length} candidates`);

      return NextResponse.json(
        { error: 'Skin not found' },
        { status: 404 }
      );
    }

    // Group by base name (should all be same base)
    const baseName = getBaseWeaponName(matchingItems[0].name);

    // Get reference item for metadata (prefer normal variant)
    const referenceItem = matchingItems.find(i => i.quality === 'normal') || matchingItems[0];

    // Build variants array
    const variants = matchingItems.map(item => {
      const wear = getWearDisplay(item);
      const quality = getQualityDisplay(item);

      // Get price range from marketplace prices
      const prices = item.marketplace_prices;
      const minPrice = prices.length > 0 ? Math.min(...prices.map(p => p.total_cost)) : null;
      const maxPrice = prices.length > 0 ? Math.max(...prices.map(p => p.total_cost)) : null;

      return {
        id: item.id,
        name: item.name,
        displayName: item.display_name,
        wear,
        quality,
        imageUrl: item.image_url,
        imageUrlFallback: item.image_url_fallback,
        wearMin: item.wear_min,
        wearMax: item.wear_max,
        priceRange: minPrice !== null ? {
          min: minPrice,
          max: maxPrice,
          currency: 'USD',
        } : null,
        prices: prices.map(p => ({
          platform: p.platform,
          price: p.price,
          totalCost: p.total_cost,
          currency: p.currency,
          listingUrl: p.listing_url,
          lastUpdated: p.last_updated.toISOString(),
        })),
      };
    });

    // Sort variants: Normal first, then StatTrak, then Souvenir
    // Within each quality, sort by wear (Factory New to Battle-Scarred)
    variants.sort((a, b) => {
      const qualityOrder = { 'Normal': 1, 'StatTrak™': 2, 'Souvenir': 3 };
      const qualityDiff = (qualityOrder[a.quality as keyof typeof qualityOrder] || 99) -
                          (qualityOrder[b.quality as keyof typeof qualityOrder] || 99);
      if (qualityDiff !== 0) return qualityDiff;

      const wearA = a.wear ? WEAR_ORDER[a.wear] || 99 : 99;
      const wearB = b.wear ? WEAR_ORDER[b.wear] || 99 : 99;
      return wearA - wearB;
    });

    // Collect unique sources
    const caseSources = new Map<string, { id: string; name: string; slug: string }>();
    const collectionSources = new Map<string, { id: string; name: string; slug: string }>();

    for (const item of matchingItems) {
      // Add cases
      for (const caseItem of item.case_items) {
        if (!caseSources.has(caseItem.case.id)) {
          caseSources.set(caseItem.case.id, {
            id: caseItem.case.id,
            name: caseItem.case.name,
            slug: caseItem.case.slug,
          });
        }
      }
      // Add collection
      if (item.collection && !collectionSources.has(item.collection.id)) {
        collectionSources.set(item.collection.id, {
          id: item.collection.id,
          name: item.collection.name,
          slug: item.collection.slug,
        });
      }
    }

    // Calculate overall price range
    const allPrices = variants.flatMap(v => v.priceRange ? [v.priceRange.min, v.priceRange.max] : []).filter(Boolean) as number[];
    const overallPriceRange = allPrices.length > 0 ? {
      min: Math.min(...allPrices),
      max: Math.max(...allPrices),
      currency: 'USD',
    } : null;

    // Determine availability flags
    const hasStatTrak = variants.some(v => v.quality === 'StatTrak™');
    const hasSouvenir = variants.some(v => v.quality === 'Souvenir');

    // Build response
    const response = {
      baseName,
      slug,
      rarity: referenceItem.rarity,
      type: referenceItem.type,
      weaponType: referenceItem.weapon_type,
      imageUrl: referenceItem.image_url,
      imageUrlFallback: referenceItem.image_url_fallback,
      description: referenceItem.description,
      hasStatTrak,
      hasSouvenir,
      variantCount: variants.length,
      variants,
      sources: {
        cases: Array.from(caseSources.values()),
        collections: Array.from(collectionSources.values()),
      },
      priceRange: overallPriceRange,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API /skins/:slug] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
