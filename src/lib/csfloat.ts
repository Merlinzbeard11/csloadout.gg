/**
 * CSFloat API Integration
 * Free tier available - provides float values, sticker pricing, and seller stats
 * Documentation: https://csfloat.com/api/v1
 */

const CSFLOAT_BASE_URL = 'https://csfloat.com/api/v1';
const CSFLOAT_API_KEY = process.env.NEXT_PUBLIC_CSFLOAT_API_KEY || '';

export interface CSFloatListing {
  id: string;
  price: number;
  float_value?: number;
  item_name: string;
  market_hash_name: string;
  seller?: {
    username: string;
    statistics?: {
      median_trade_time?: number;
      total_trades?: number;
    };
  };
  stickers?: Array<{
    name: string;
    price?: number;
  }>;
}

export interface CSFloatMarketItem {
  market: string;
  price: number;
  url: string;
  floatValue?: number;
  stickers?: Array<{ name: string; price?: number }>;
  currency: string;
}

/**
 * Fetch listings from CSFloat marketplace
 * @param itemName - Market hash name
 * @param limit - Maximum number of listings to return (default: 10)
 */
export async function getCSFloatListings(
  itemName: string,
  limit: number = 10
): Promise<CSFloatListing[]> {
  try {
    const params = new URLSearchParams({
      market_hash_name: itemName,
      limit: limit.toString(),
      sort_by: 'price',
      order: 'asc', // Lowest price first
    });

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add API key if available (optional for free tier)
    if (CSFLOAT_API_KEY) {
      headers['Authorization'] = CSFLOAT_API_KEY;
    }

    const response = await fetch(`${CSFLOAT_BASE_URL}/listings?${params}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`CSFloat API returned ${response.status}`);
    }

    const data = await response.json();
    return data.listings || [];
  } catch (error) {
    console.error('Error fetching CSFloat listings:', error);
    return [];
  }
}

/**
 * Get the cheapest listing from CSFloat for a specific item
 * @param itemName - Market hash name
 */
export async function getCSFloatMarketItem(itemName: string): Promise<CSFloatMarketItem | null> {
  const listings = await getCSFloatListings(itemName, 1);

  if (listings.length === 0) {
    return null;
  }

  const cheapest = listings[0];
  const listingUrl = `https://csfloat.com/search?market_hash_name=${encodeURIComponent(itemName)}`;

  return {
    market: 'CSFloat',
    price: cheapest.price,
    url: listingUrl,
    floatValue: cheapest.float_value,
    stickers: cheapest.stickers,
    currency: 'USD',
  };
}

/**
 * Get item float value information
 * @param itemName - Market hash name
 * @param floatMin - Minimum float value filter (optional)
 * @param floatMax - Maximum float value filter (optional)
 */
export async function getCSFloatByFloat(
  itemName: string,
  floatMin?: number,
  floatMax?: number
): Promise<CSFloatListing[]> {
  try {
    const params = new URLSearchParams({
      market_hash_name: itemName,
      sort_by: 'price',
      order: 'asc',
    });

    if (floatMin !== undefined) {
      params.append('min_float', floatMin.toString());
    }

    if (floatMax !== undefined) {
      params.append('max_float', floatMax.toString());
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (CSFLOAT_API_KEY) {
      headers['Authorization'] = CSFLOAT_API_KEY;
    }

    const response = await fetch(`${CSFLOAT_BASE_URL}/listings?${params}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`CSFloat API returned ${response.status}`);
    }

    const data = await response.json();
    return data.listings || [];
  } catch (error) {
    console.error('Error fetching CSFloat by float:', error);
    return [];
  }
}

/**
 * Calculate total sticker value for a listing
 */
export function calculateStickerValue(stickers?: Array<{ price?: number }>): number {
  if (!stickers || stickers.length === 0) return 0;
  return stickers.reduce((total, sticker) => total + (sticker.price || 0), 0);
}

/**
 * Get wear rating from float value
 * CS2 wear ranges:
 * Factory New: 0.00 - 0.07
 * Minimal Wear: 0.07 - 0.15
 * Field-Tested: 0.15 - 0.38
 * Well-Worn: 0.38 - 0.45
 * Battle-Scarred: 0.45 - 1.00
 */
export function getWearRating(floatValue: number): string {
  if (floatValue < 0.07) return 'Factory New';
  if (floatValue < 0.15) return 'Minimal Wear';
  if (floatValue < 0.38) return 'Field-Tested';
  if (floatValue < 0.45) return 'Well-Worn';
  return 'Battle-Scarred';
}

/**
 * Check if CSFloat API is configured
 */
export function isCSFloatConfigured(): boolean {
  return CSFLOAT_API_KEY.length > 0;
}
