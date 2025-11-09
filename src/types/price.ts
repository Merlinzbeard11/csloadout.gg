/**
 * Price Aggregation Type Definitions
 * Feature 04: Multi-Marketplace Price Aggregation
 * BDD Reference: features/04-price-aggregation.feature
 *
 * Type-safe interfaces for price data from multiple marketplaces
 */

// ============================================================================
// Platform Identifiers
// ============================================================================

/**
 * Supported marketplace platforms
 * BDD: Tier 1 marketplaces (MVP)
 */
export type Platform =
  | 'steam' // Steam Community Market - 15% fees
  | 'csfloat' // CSFloat - 2% fees, lowest for many items
  | 'csmoney' // CS.MONEY - 7% fees, largest inventory
  | 'tradeit' // TradeIt.gg - 2-60% variable fees
  | 'buff163' // Buff163 - 2.5% fees, China market
  | 'dmarket'; // DMarket - 2-10% variable fees

/**
 * Platform display names for UI
 */
export const PLATFORM_NAMES: Record<Platform, string> = {
  steam: 'Steam Market',
  csfloat: 'CSFloat',
  csmoney: 'CS.MONEY',
  tradeit: 'TradeIt.gg',
  buff163: 'Buff163',
  dmarket: 'DMarket',
};

// ============================================================================
// Currency Types
// ============================================================================

/**
 * ISO 4217 currency codes
 * All prices stored in USD, others for conversion
 */
export type Currency = 'USD' | 'EUR' | 'CNY' | 'RUB' | 'GBP' | 'BRL';

/**
 * Currency conversion data
 */
export interface CurrencyConversion {
  from: Currency;
  to: Currency;
  rate: number; // Exchange rate
  amount: number; // Original amount
  converted: number; // Converted amount (amount * rate)
  timestamp: Date; // When rate was fetched
}

// ============================================================================
// Price Data Types
// ============================================================================

/**
 * Fee breakdown for a marketplace
 */
export interface PriceFees {
  seller: number; // Seller fee percentage (e.g., 2.0 for 2%)
  buyer: number; // Buyer fee percentage (e.g., 0.0 for no buyer fee)
  total: number; // Total fee percentage (seller + buyer)
}

/**
 * Individual price from a single marketplace
 * BDD: "View all marketplace prices for comparison"
 */
export interface PriceData {
  // Platform identification
  platform: Platform;

  // Pricing
  price: number; // Base price in specified currency
  currency: Currency; // Currency code (default USD)
  fees: PriceFees; // Fee breakdown
  totalCost: number; // Final cost user pays: price * (1 + fees.total/100)

  // Availability (optional)
  availableQuantity?: number; // For bulk traders - inventory count
  listingUrl?: string; // Direct link to marketplace listing

  // Data freshness
  lastUpdated: Date; // When this price was last synced
}

/**
 * Aggregated prices from all marketplaces for a single item
 * BDD: "View lowest price for an item"
 */
export interface AggregatedPrices {
  // Item identification
  itemId: string;
  itemName: string;

  // Price comparison
  lowestPrice: PriceData; // Cheapest option across all platforms
  allPrices: PriceData[]; // All platforms sorted by totalCost ascending
  savings: number; // Difference between lowest and highest totalCost

  // Metadata
  updatedAt: Date; // When prices were last aggregated
}

/**
 * Bulk pricing request
 * BDD: "Get bulk prices for loadout builder"
 */
export interface BulkPriceRequest {
  itemIds: string[]; // Array of item IDs to fetch prices for
  platform?: Platform; // Optional: filter to specific platform only
}

/**
 * Bulk pricing response
 */
export interface BulkPriceResponse {
  items: Array<{
    itemId: string;
    itemName?: string;
    lowestPrice: PriceData;
    allPrices?: PriceData[];
  }>;
  totalLowestCost: number; // Sum of all lowest prices
  totalSavings: number; // Total savings vs buying all from most expensive platform
}

// ============================================================================
// Data Freshness Types
// ============================================================================

/**
 * Data freshness status for UI indicators
 * BDD: "Display data freshness indicator"
 */
export type FreshnessStatus = 'Live' | 'Stale' | 'Paused';

/**
 * Data freshness information
 */
export interface DataFreshness {
  status: FreshnessStatus;
  lastUpdated: Date;
  minutesAgo: number;
  nextUpdateIn?: number; // Minutes until next sync (if known)
}

/**
 * Calculate freshness status from timestamp
 * BDD: "Live" (<5min), "Stale" (5-15min), "Paused" (>15min)
 */
export function calculateFreshness(lastUpdated: Date): DataFreshness {
  const now = Date.now();
  const updatedMs = lastUpdated.getTime();
  const minutesAgo = Math.floor((now - updatedMs) / 60000);

  let status: FreshnessStatus;
  if (minutesAgo < 5) {
    status = 'Live';
  } else if (minutesAgo < 15) {
    status = 'Stale';
  } else {
    status = 'Paused';
  }

  return {
    status,
    lastUpdated,
    minutesAgo,
  };
}

// ============================================================================
// Price History Types
// ============================================================================

/**
 * Single price data point for historical charts
 */
export interface PriceHistoryPoint {
  date: string; // ISO date string (YYYY-MM-DD)
  price: number; // Price on that date
}

/**
 * Price history data for charts
 * BDD: "View 30-day price history chart"
 */
export interface PriceHistory {
  itemId: string;
  platform: Platform;
  dataPoints: PriceHistoryPoint[]; // Chronologically sorted
  days: number; // Number of days covered (30, 90, 365)
}

// ============================================================================
// Marketplace Integration Interface
// ============================================================================

/**
 * Interface for marketplace API integrations
 * Implementations: CSGOSkinsGG, Pricempire, SteamAPI, etc.
 */
export interface PriceProvider {
  name: string; // "CSGOSKINS.GG API", "Steam Market API"
  platform: Platform; // Which marketplace this provider serves

  /**
   * Fetch price for a single item
   * Returns null if item not found on this platform
   */
  getPrice(itemId: string): Promise<PriceData | null>;

  /**
   * Fetch prices for multiple items (bulk operation)
   * Returns Map of itemId → PriceData
   * Missing items are omitted from result
   */
  getBulkPrices(itemIds: string[]): Promise<Map<string, PriceData>>;

  /**
   * Fetch price history for charts
   * Returns null if history not available
   */
  getPriceHistory?(itemId: string, days: number): Promise<PriceHistory | null>;
}

// ============================================================================
// Database Types (matching Prisma schema)
// ============================================================================

/**
 * MarketplacePrice as stored in database
 * Matches prisma/schema.prisma MarketplacePrice model
 */
export interface MarketplacePriceDB {
  id: string;
  item_id: string;
  platform: string; // Lowercase platform identifier
  price: number;
  currency: string;
  seller_fee_percent: number | null;
  buyer_fee_percent: number | null;
  total_cost: number;
  quantity_available: number | null;
  listing_url: string | null;
  last_updated: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Convert database record to PriceData interface
 */
export function fromDatabase(db: MarketplacePriceDB): PriceData {
  return {
    platform: db.platform as Platform,
    price: db.price,
    currency: db.currency as Currency,
    fees: {
      seller: db.seller_fee_percent || 0,
      buyer: db.buyer_fee_percent || 0,
      total: (db.seller_fee_percent || 0) + (db.buyer_fee_percent || 0),
    },
    totalCost: db.total_cost,
    availableQuantity: db.quantity_available || undefined,
    listingUrl: db.listing_url || undefined,
    lastUpdated: db.last_updated,
  };
}

/**
 * Convert PriceData to database insert/update format
 */
export function toDatabase(
  itemId: string,
  priceData: PriceData
): Omit<MarketplacePriceDB, 'id' | 'created_at' | 'updated_at'> {
  return {
    item_id: itemId,
    platform: priceData.platform,
    price: priceData.price,
    currency: priceData.currency,
    seller_fee_percent: priceData.fees.seller,
    buyer_fee_percent: priceData.fees.buyer,
    total_cost: priceData.totalCost,
    quantity_available: priceData.availableQuantity || null,
    listing_url: priceData.listingUrl || null,
    last_updated: priceData.lastUpdated,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate total cost from price and fees
 * BDD: "Calculate total cost including fees"
 */
export function calculateTotalCost(price: number, fees: PriceFees): number {
  return parseFloat((price * (1 + fees.total / 100)).toFixed(2));
}

/**
 * Calculate savings between lowest and highest price
 * BDD: "Save $X by buying on {platform}"
 */
export function calculateSavings(prices: PriceData[]): number {
  if (prices.length === 0) return 0;

  const sorted = [...prices].sort((a, b) => a.totalCost - b.totalCost);
  const lowest = sorted[0].totalCost;
  const highest = sorted[sorted.length - 1].totalCost;

  return parseFloat((highest - lowest).toFixed(2));
}

/**
 * Find lowest price from array
 */
export function findLowestPrice(prices: PriceData[]): PriceData | null {
  if (prices.length === 0) return null;
  return [...prices].sort((a, b) => a.totalCost - b.totalCost)[0];
}

/**
 * Sort prices by total cost ascending (cheapest first)
 */
export function sortByTotalCost(prices: PriceData[]): PriceData[] {
  return [...prices].sort((a, b) => a.totalCost - b.totalCost);
}
