/**
 * Skinport API Integration
 * Free public API - No authentication required
 * Rate limit: 8 requests per 5 minutes
 * Documentation: https://docs.skinport.com/items
 *
 * IMPORTANT: Requires Brotli compression header
 * API is cached for 5 minutes on their end
 */

const SKINPORT_API_BASE = 'https://api.skinport.com/v1';
const CS2_APP_ID = 730;
const CURRENCY_USD = 'USD';

export interface SkinportItem {
  market_hash_name: string;
  currency: string;
  suggested_price: number | null;
  item_page: string;
  market_page: string;
  min_price: number | null;
  max_price: number | null;
  mean_price: number | null;
  median_price: number | null;
  quantity: number;
  created_at: number;
  updated_at: number;
}

export interface SkinportMarketItem {
  market: string;
  price: number;
  url: string;
  quantity?: number;
  currency: string;
}

/**
 * Fetch all CS2 items from Skinport
 * Note: This endpoint returns ALL items and is cached for 5 minutes
 * @param currency - Currency code (default: USD)
 */
export async function getSkinportItems(currency: string = CURRENCY_USD): Promise<SkinportItem[]> {
  try {
    const params = new URLSearchParams({
      app_id: CS2_APP_ID.toString(),
      currency: currency,
      tradable: 'true',
    });

    const response = await fetch(`${SKINPORT_API_BASE}/items?${params}`, {
      headers: {
        'Accept-Encoding': 'br', // Brotli compression mandatory
        'User-Agent': 'Mozilla/5.0 (compatible; csloadout.gg/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Skinport API returned ${response.status}`);
    }

    const data: SkinportItem[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Skinport items:', error);
    return [];
  }
}

/**
 * Find a specific item by market hash name from Skinport
 * @param itemName - Market hash name (e.g., "AWP | Dragon Lore (Factory New)")
 */
export async function getSkinportMarketItem(itemName: string): Promise<SkinportMarketItem | null> {
  try {
    const allItems = await getSkinportItems();

    if (allItems.length === 0) {
      return null;
    }

    // Find the specific item by market_hash_name
    const item = allItems.find(i => i.market_hash_name === itemName);

    if (!item) {
      return null;
    }

    // Use min_price if available, fallback to median, then mean
    const price = item.min_price ?? item.median_price ?? item.mean_price ?? 0;

    // If no price data available, return null
    if (price === 0 || price === null) {
      return null;
    }

    return {
      market: 'Skinport',
      price: price,
      url: item.market_page || item.item_page,
      quantity: item.quantity,
      currency: item.currency,
    };
  } catch (error) {
    console.error('Error fetching Skinport item:', error);
    return null;
  }
}

/**
 * Search for items by partial name match
 * Useful for autocomplete or fuzzy matching
 * @param searchTerm - Partial item name to search for
 * @param limit - Maximum number of results (default: 10)
 */
export async function searchSkinportItems(
  searchTerm: string,
  limit: number = 10
): Promise<SkinportItem[]> {
  try {
    const allItems = await getSkinportItems();

    const searchLower = searchTerm.toLowerCase();
    const matches = allItems
      .filter(item => item.market_hash_name.toLowerCase().includes(searchLower))
      .slice(0, limit);

    return matches;
  } catch (error) {
    console.error('Error searching Skinport items:', error);
    return [];
  }
}

/**
 * Get statistics for an item across all conditions
 * Useful for understanding price ranges
 * @param itemBaseName - Base item name without wear (e.g., "AWP | Dragon Lore")
 */
export async function getSkinportItemStats(itemBaseName: string): Promise<{
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  totalQuantity: number;
  variants: number;
}> {
  try {
    const allItems = await getSkinportItems();
    const baseLower = itemBaseName.toLowerCase();

    const variants = allItems.filter(item =>
      item.market_hash_name.toLowerCase().includes(baseLower)
    );

    if (variants.length === 0) {
      return {
        minPrice: 0,
        maxPrice: 0,
        avgPrice: 0,
        totalQuantity: 0,
        variants: 0,
      };
    }

    const prices = variants
      .map(v => v.min_price ?? v.median_price ?? 0)
      .filter(p => p > 0);

    return {
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
      totalQuantity: variants.reduce((sum, v) => sum + v.quantity, 0),
      variants: variants.length,
    };
  } catch (error) {
    console.error('Error getting Skinport stats:', error);
    return {
      minPrice: 0,
      maxPrice: 0,
      avgPrice: 0,
      totalQuantity: 0,
      variants: 0,
    };
  }
}

/**
 * Check if Skinport API is responding
 */
export async function isSkinportAvailable(): Promise<boolean> {
  try {
    const items = await getSkinportItems();
    return items.length > 0;
  } catch {
    return false;
  }
}
