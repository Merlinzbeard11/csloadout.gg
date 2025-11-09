/**
 * Search & Filter Type Definitions
 * Feature 03: Search & Filter System
 * BDD Reference: features/03-search-filters.feature
 * Spec Reference: features/03-search-filters.md (lines 107-145)
 *
 * Type-safe interfaces for search queries, filters, and results
 */

// ============================================================================
// Enums & Constants
// ============================================================================

/**
 * Sort options for search results
 * BDD: "Sort search results by price ascending/descending/name/rarity"
 */
export type SearchSortBy =
  | 'relevance'      // Default for text searches (ts_rank score)
  | 'price_asc'      // Lowest price first
  | 'price_desc'     // Highest price first
  | 'name_asc'       // Alphabetical A-Z
  | 'name_desc'      // Alphabetical Z-A
  | 'rarity_desc'    // Rarest first (covert → consumer)
  | 'rarity_asc'     // Common first (consumer → covert)
  | 'popularity'     // Most viewed/searched
  | 'change_percent' // Price change % (for investors)
  | 'float_asc'      // Lowest float first (collectors)
  | 'float_desc';    // Highest float first

/**
 * Rarity levels in CS2
 * Ordered from common to rare
 */
export type Rarity =
  | 'consumer'
  | 'industrial'
  | 'milspec'
  | 'restricted'
  | 'classified'
  | 'covert'
  | 'contraband';

/**
 * Item quality types
 */
export type Quality =
  | 'normal'
  | 'stattrak'
  | 'souvenir';

/**
 * Wear conditions
 * Ordered from best to worst condition
 */
export type Wear =
  | 'factory_new'
  | 'minimal_wear'
  | 'field_tested'
  | 'well_worn'
  | 'battle_scarred'
  | 'none'; // For items without wear (cases, stickers, etc.)

// ============================================================================
// Search Filter Interface
// ============================================================================

/**
 * Search filters for item queries
 * BDD: "Combine text search with filters" (features/03-search-filters.feature)
 *
 * Usage:
 * ```typescript
 * const filters: SearchFilters = {
 *   query: "blue AK-47",
 *   rarity: ["classified", "covert"],
 *   priceMin: 5,
 *   priceMax: 20,
 *   sortBy: "price_asc",
 * };
 * ```
 */
export interface SearchFilters {
  // ========================================
  // Text Search
  // ========================================

  /**
   * Text search query (full-text search)
   * BDD: "Search for items by name" (features/03-search-filters.feature)
   *
   * Examples:
   * - "AK-47 Redline"
   * - "blue M4A4"
   * - "Operation Riptide"
   *
   * Implementation:
   * - Uses PostgreSQL ts_query with search_vector
   * - Converts to: "blue & m4a4" for AND matching
   * - Performance target: <100ms
   */
  query?: string;

  // ========================================
  // Basic Filters (Multi-Select)
  // ========================================

  /**
   * Filter by weapon type(s)
   * BDD: "Filter items by weapon type" (features/03-search-filters.feature)
   *
   * Examples: ["AK-47", "M4A4", "AWP"]
   * Logic: OR (show items matching ANY weapon type)
   */
  weaponType?: string[];

  /**
   * Filter by rarity level(s)
   * BDD: "Filter items by rarity" (features/03-search-filters.feature)
   *
   * Examples: ["classified", "covert"]
   * Logic: OR (show items matching ANY rarity)
   */
  rarity?: Rarity[];

  /**
   * Filter by quality type(s)
   *
   * Examples: ["stattrak", "souvenir"]
   * Logic: OR (show items matching ANY quality)
   */
  quality?: Quality[];

  /**
   * Filter by wear condition(s)
   * BDD: "Filter items by wear condition" (features/03-search-filters.feature)
   *
   * Examples: ["factory_new", "minimal_wear"]
   * Logic: OR (show items matching ANY wear)
   */
  wear?: Wear[];

  // ========================================
  // Price Filters (Range)
  // ========================================

  /**
   * Minimum price (inclusive)
   * BDD: "Filter items by price range $5-$20" (features/03-search-filters.feature)
   *
   * Example: 5.00 (show items >= $5.00)
   * Uses: MIN(marketplace_prices.total_cost)
   */
  priceMin?: number;

  /**
   * Maximum price (inclusive)
   * BDD: "Filter items under budget $10" (features/03-search-filters.feature)
   *
   * Example: 20.00 (show items <= $20.00)
   * Uses: MIN(marketplace_prices.total_cost)
   */
  priceMax?: number;

  /**
   * Filter by specific marketplace platform
   *
   * Example: "csfloat" (show prices only from CSFloat)
   * Affects which marketplace_prices are considered
   */
  platform?: string;

  // ========================================
  // Advanced Filters (Collectors)
  // ========================================

  /**
   * Minimum float value (0.00 - 1.00)
   * BDD: "Filter by float value range" (features/03-search-filters.feature)
   *
   * Example: 0.00 (show items with float >= 0.00)
   * For "low float" collector items
   */
  floatMin?: number;

  /**
   * Maximum float value (0.00 - 1.00)
   * BDD: "Filter by float value range" (features/03-search-filters.feature)
   *
   * Example: 0.01 (show items with float <= 0.01)
   * For "low float" collector items
   */
  floatMax?: number;

  /**
   * Specific pattern seed (exact match)
   * BDD: "Filter by pattern seed" (features/03-search-filters.feature)
   *
   * Example: 661 (famous "blue gem" Case Hardened pattern)
   * Used by pattern hunters
   */
  patternSeed?: number;

  /**
   * Filter items with stickers
   *
   * Example: true (only show items with stickers)
   */
  hasStickers?: boolean;

  /**
   * Minimum number of stickers
   *
   * Example: 4 (only show items with 4+ stickers)
   */
  stickerCount?: number;

  // ========================================
  // Collection/Case Filters
  // ========================================

  /**
   * Filter by collection ID
   *
   * Example: "uuid-of-collection" (show items from specific collection)
   */
  collectionId?: string;

  /**
   * Filter by case ID
   *
   * Example: "uuid-of-case" (show items from specific case)
   */
  caseId?: string;

  /**
   * Filter discontinued collections only
   *
   * Example: true (investment opportunity filter)
   */
  isDiscontinued?: boolean;

  // ========================================
  // Investment Filters
  // ========================================

  /**
   * Minimum price change percentage
   *
   * Example: 10 (show items with +10% or more price change)
   * For trending items
   */
  priceChangeMin?: number;

  /**
   * Maximum price change percentage
   *
   * Example: -5 (show items with -5% or less price change)
   * For declining items
   */
  priceChangeMax?: number;

  // ========================================
  // Sort & Pagination
  // ========================================

  /**
   * Sort order for results
   * BDD: "Sort search results by price/name/rarity" (features/03-search-filters.feature)
   *
   * Default: "relevance" for text searches, "price_asc" otherwise
   */
  sortBy?: SearchSortBy;

  /**
   * Page number (1-indexed)
   * BDD: "Paginate search results" (features/03-search-filters.feature)
   *
   * Default: 1
   */
  page?: number;

  /**
   * Results per page
   * BDD: "50 results per page (default)" (features/03-search-filters.feature)
   *
   * Default: 50
   * Max: 100 (prevent excessive queries)
   */
  limit?: number;
}

// ============================================================================
// Search Results Interface
// ============================================================================

/**
 * Facet counts for filter options
 * BDD: "Display available filter counts" (features/03-search-filters.feature)
 *
 * Shows how many items match each filter option
 * Used to gray out filters with 0 results
 */
export interface SearchFacets {
  /**
   * Item count per rarity
   * Example: { "classified": 12, "covert": 8 }
   */
  rarities: Record<Rarity, number>;

  /**
   * Item count per weapon type
   * Example: { "AK-47": 89, "M4A4": 34 }
   */
  weaponTypes: Record<string, number>;

  /**
   * Item count per price range
   * Example: { "0-10": 45, "10-50": 123, "50+": 12 }
   */
  priceRanges: Record<string, number>;

  /**
   * Item count per wear condition
   * Example: { "factory_new": 23, "minimal_wear": 45 }
   */
  wearConditions: Record<Wear, number>;
}

/**
 * Individual search result item
 */
export interface SearchResultItem {
  id: string;
  name: string;
  display_name: string;
  type: string;
  rarity: Rarity | null;
  quality: Quality;
  wear: Wear;
  weapon_type: string | null;
  image_url: string;

  // Price data (from lowest marketplace)
  lowestPrice?: number;
  lowestPricePlatform?: string;

  // Advanced attributes (collectors)
  float_value?: number;
  pattern_seed?: number;

  // Search relevance score (for sorting by relevance)
  _score?: number;
}

/**
 * Search API response
 * BDD: GET /api/search returns paginated results with facets
 */
export interface SearchResponse {
  /**
   * Matching items
   */
  items: SearchResultItem[];

  /**
   * Total count of matching items (for pagination)
   */
  total: number;

  /**
   * Current page number
   */
  page: number;

  /**
   * Results per page
   */
  limit: number;

  /**
   * Total pages available
   */
  totalPages: number;

  /**
   * Facet counts for filter UI
   * BDD: "Display filter counts"
   */
  facets: SearchFacets;

  /**
   * Query performance metadata
   */
  meta?: {
    /**
     * Query execution time (ms)
     * Target: <100ms for basic search, <300ms for filtered
     */
    executionTime: number;

    /**
     * Whether results came from cache
     */
    cached: boolean;
  };
}

// ============================================================================
// Autocomplete Interfaces
// ============================================================================

/**
 * Autocomplete suggestion types
 * BDD: "Autocomplete groups suggestions by type" (features/03-search-filters.feature)
 */
export type AutocompleteSuggestionType =
  | 'item'        // Specific item name
  | 'weapon'      // Weapon type category
  | 'collection'; // Collection name

/**
 * Single autocomplete suggestion
 * BDD: "Autocomplete suggestions appear instantly <50ms"
 */
export interface AutocompleteSuggestion {
  /**
   * Type of suggestion (for grouping)
   */
  type: AutocompleteSuggestionType;

  /**
   * Display name
   */
  name: string;

  /**
   * Optional icon URL
   */
  icon?: string;

  /**
   * Item ID (if type === 'item')
   */
  itemId?: string;

  /**
   * Match score (for sorting)
   */
  score?: number;
}

/**
 * Autocomplete API response
 * BDD: GET /api/search/autocomplete returns grouped suggestions
 */
export interface AutocompleteResponse {
  /**
   * Grouped suggestions
   * BDD: "Groups by type: items, weapons, collections"
   */
  suggestions: {
    items: AutocompleteSuggestion[];
    weapons: AutocompleteSuggestion[];
    collections: AutocompleteSuggestion[];
  };

  /**
   * Query performance
   * Target: <50ms
   */
  meta?: {
    executionTime: number;
    cached: boolean;
  };
}

// ============================================================================
// Validation & Constants
// ============================================================================

/**
 * Default search parameters
 */
export const SEARCH_DEFAULTS = {
  limit: 50,
  page: 1,
  sortBy: 'relevance' as SearchSortBy,
  autocompleteLimit: 10,
  trigram_similarity_threshold: 0.5, // Gotcha #7: Default 0.3 is too lax
} as const;

/**
 * Search parameter limits
 */
export const SEARCH_LIMITS = {
  maxLimit: 100,          // Max results per page
  maxQueryLength: 200,    // Max search query length (chars)
  maxPage: 1000,          // Max page number (prevent excessive pagination)
  minFloatValue: 0.0,     // Min float value
  maxFloatValue: 1.0,     // Max float value
} as const;

/**
 * Rarity display names
 */
export const RARITY_NAMES: Record<Rarity, string> = {
  consumer: 'Consumer Grade',
  industrial: 'Industrial Grade',
  milspec: 'Mil-Spec Grade',
  restricted: 'Restricted',
  classified: 'Classified',
  covert: 'Covert',
  contraband: 'Contraband',
};

/**
 * Wear display names
 */
export const WEAR_NAMES: Record<Wear, string> = {
  factory_new: 'Factory New',
  minimal_wear: 'Minimal Wear',
  field_tested: 'Field-Tested',
  well_worn: 'Well-Worn',
  battle_scarred: 'Battle-Scarred',
  none: 'None',
};
