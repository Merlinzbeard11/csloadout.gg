/**
 * Steam Community Market API Integration
 * Free API - No authentication required for market price data
 * Rate limit: ~200 requests per 5 minutes
 */

const STEAM_MARKET_API = 'https://steamcommunity.com/market/priceoverview/';
const CS2_APP_ID = '730';
const CURRENCY_USD = '1';

export interface SteamPriceData {
  success: boolean;
  lowest_price?: string;
  median_price?: string;
  volume?: string;
}

export interface SteamMarketItem {
  market: string;
  price: number;
  url: string;
  volume?: number;
  currency: string;
}

/**
 * Fetch current market price for a CS2 item from Steam Community Market
 * @param itemName - Market hash name (e.g., "AWP | Dragon Lore (Factory New)")
 * @returns Price data from Steam Market
 */
export async function getSteamPrice(itemName: string): Promise<SteamPriceData> {
  try {
    const params = new URLSearchParams({
      appid: CS2_APP_ID,
      currency: CURRENCY_USD,
      market_hash_name: itemName,
    });

    const response = await fetch(`${STEAM_MARKET_API}?${params}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; csloadout.gg/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Steam API returned ${response.status}`);
    }

    const data: SteamPriceData = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Steam price:', error);
    return { success: false };
  }
}

/**
 * Parse Steam price string to number
 * Steam returns prices like "$8,450.00" - need to clean and convert
 */
function parseSteamPrice(priceStr: string): number {
  if (!priceStr) return 0;
  // Remove currency symbol and commas, then parse
  const cleaned = priceStr.replace(/[$,]/g, '');
  return parseFloat(cleaned);
}

/**
 * Get formatted Steam market data for display in price comparison
 * @param itemName - Market hash name
 * @returns Formatted market item data
 */
export async function getSteamMarketItem(itemName: string): Promise<SteamMarketItem | null> {
  const data = await getSteamPrice(itemName);

  if (!data.success || !data.lowest_price) {
    return null;
  }

  const price = parseSteamPrice(data.lowest_price);
  const volume = data.volume ? parseInt(data.volume.replace(/,/g, '')) : undefined;

  // Encode item name for Steam Market URL
  const encodedName = encodeURIComponent(itemName);
  const marketUrl = `https://steamcommunity.com/market/listings/${CS2_APP_ID}/${encodedName}`;

  return {
    market: 'Steam Market',
    price,
    url: marketUrl,
    volume,
    currency: 'USD',
  };
}

/**
 * Search for CS2 items (placeholder - Steam doesn't provide search API)
 * For MVP, we'll use a hardcoded list of popular items
 */
export const POPULAR_CS2_ITEMS = [
  // Legendary Skins
  'AWP | Dragon Lore (Factory New)',
  'AK-47 | Wild Lotus (Factory New)',
  'M4A4 | Howl (Factory New)',
  'AWP | Medusa (Factory New)',
  'AK-47 | Fire Serpent (Factory New)',

  // High-Tier Knives
  'Karambit | Fade (Factory New)',
  'Butterfly Knife | Doppler (Factory New)',
  'Karambit | Gamma Doppler (Factory New)',
  'M9 Bayonet | Crimson Web (Factory New)',
  'Butterfly Knife | Fade (Factory New)',

  // Gloves
  'Sport Gloves | Pandora\'s Box (Factory New)',
  'Driver Gloves | Crimson Weave (Factory New)',
  'Specialist Gloves | Crimson Kimono (Factory New)',

  // Popular Rifles
  'M4A1-S | Hot Rod (Factory New)',
  'AK-47 | Redline (Field-Tested)',
  'M4A4 | Asiimov (Field-Tested)',
  'AWP | Asiimov (Field-Tested)',
  'AK-47 | Vulcan (Factory New)',
  'M4A1-S | Hyper Beast (Factory New)',

  // Pistols
  'Desert Eagle | Blaze (Factory New)',
  'Desert Eagle | Printstream (Factory New)',
  'Glock-18 | Fade (Factory New)',
  'USP-S | Kill Confirmed (Factory New)',

  // Affordable Popular Skins
  'AK-47 | Phantom Disruptor (Factory New)',
  'AWP | Chromatic Aberration (Factory New)',
  'M4A4 | Temukau (Factory New)',
  'Desert Eagle | Ocean Drive (Factory New)',
];

/**
 * Get multiple item prices in batch (respects rate limits)
 * @param itemNames - Array of market hash names
 * @param delayMs - Delay between requests to respect rate limits (default: 1000ms)
 */
export async function getBatchSteamPrices(
  itemNames: string[],
  delayMs: number = 1000
): Promise<(SteamMarketItem | null)[]> {
  const results: (SteamMarketItem | null)[] = [];

  for (const itemName of itemNames) {
    const item = await getSteamMarketItem(itemName);
    results.push(item);

    // Delay to respect rate limits
    if (itemNames.indexOf(itemName) < itemNames.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
