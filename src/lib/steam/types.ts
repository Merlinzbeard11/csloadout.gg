/**
 * Steam API Type Definitions
 *
 * Based on Steam Web API documentation:
 * https://steamcommunity.com/inventory/{steamid}/730/2
 *
 * Critical Gotchas:
 * - IEconItems_730 endpoint is PERMANENTLY DISABLED
 * - Use inventory endpoint instead (no API key required)
 * - Rate limit: 5 requests per minute (reality)
 * - Pagination: 2500 items max per request
 */

/**
 * Steam Inventory API Response
 * Endpoint: GET https://steamcommunity.com/inventory/{steamid}/730/2
 */
export interface SteamInventoryResponse {
  /** 1 = success, 0 = error */
  success: 0 | 1

  /** Total number of items in inventory */
  total_inventory_count?: number

  /** Array of item assets (instances in inventory) */
  assets?: SteamAsset[]

  /** Array of item descriptions (metadata for class IDs) */
  descriptions?: SteamDescription[]

  /** Pagination: 1 if more items available, 0 if this is last page */
  more_items?: 0 | 1

  /** Pagination: cursor for next page (use as start_assetid parameter) */
  last_assetid?: string

  /** Error message if success = 0 */
  error?: string
}

/**
 * Steam Asset (Individual Item Instance)
 */
export interface SteamAsset {
  /** Unique asset ID (specific item instance) */
  assetid: string

  /** Class ID (links to description) */
  classid: string

  /** Instance ID (usually "0" for CS2 items) */
  instanceid: string

  /** Quantity (usually "1" for CS2 items) */
  amount: string

  /** Context ID (730 = CS2) */
  contextid?: string
}

/**
 * Steam Item Description (Metadata)
 */
export interface SteamDescription {
  /** Class ID (matches asset.classid) */
  classid: string

  /** Instance ID (matches asset.instanceid) */
  instanceid: string

  /** Market hash name (unique identifier for trading) */
  market_hash_name: string

  /** Display name (may include custom name tag) */
  name?: string

  /** Item type (e.g., "Rifle", "Pistol", "Knife") */
  type?: string

  /** 1 = tradable, 0 = trade-locked */
  tradable?: 0 | 1

  /** 1 = marketable, 0 = not marketable */
  marketable?: 0 | 1

  /** ISO date when item becomes tradable */
  cache_expiration?: string

  /** Item descriptions (includes sticker info, float hints, etc.) */
  descriptions?: SteamDescriptionLine[]

  /** Inspect link actions */
  actions?: SteamAction[]

  /** Fraud warnings (includes custom name tag info) */
  fraudwarnings?: string[]

  /** Icon URL */
  icon_url?: string

  /** Rarity color (hex) */
  name_color?: string

  /** Background color (hex) */
  background_color?: string
}

/**
 * Description Line (Stickers, Float Info, etc.)
 */
export interface SteamDescriptionLine {
  /** Description text */
  value: string

  /** Text color (hex) */
  color?: string

  /** Label (e.g., "Exterior:", "Sticker:") */
  type?: string
}

/**
 * Steam Action (Inspect Link)
 */
export interface SteamAction {
  /** Action name */
  name: string

  /** Action link (contains inspect parameters) */
  link: string
}

/**
 * Parsed Steam Inventory Item
 * Internal representation after processing Steam API response
 */
export interface SteamInventoryItem {
  /** Steam asset ID */
  assetId: string

  /** Market hash name */
  marketHashName: string

  /** Custom name tag (if applied) */
  customName?: string

  /** Float value (extracted from inspect link via CSFloat API) */
  floatValue?: number

  /** Pattern seed */
  patternSeed?: number

  /** Wear condition */
  wear?: 'factory_new' | 'minimal_wear' | 'field_tested' | 'well_worn' | 'battle_scarred'

  /** Quality */
  quality?: 'normal' | 'stattrak' | 'souvenir'

  /** Sticker descriptions (raw text from Steam API) */
  stickerDescriptions?: string[]

  /** Trade status */
  isTradable: boolean

  /** Marketable status */
  isMarketable: boolean

  /** Trade hold expiration date */
  tradeHoldUntil?: Date

  /** Inspect link (for float extraction) */
  inspectLink?: string

  /** Icon URL */
  iconUrl?: string

  /** Rarity color */
  rarityColor?: string
}

/**
 * Inventory Fetch Result
 */
export interface InventoryFetchResult {
  /** Success status */
  success: boolean

  /** Parsed items */
  items: SteamInventoryItem[]

  /** Total count */
  totalCount: number

  /** Error code if failed */
  error?: 'PRIVATE_INVENTORY' | 'RATE_LIMITED' | 'NETWORK_ERROR' | 'INVALID_RESPONSE' | 'STEAM_API_ERROR'

  /** Error message */
  message?: string

  /** Pagination cursor for next fetch */
  nextCursor?: string
}

/**
 * Steam Inventory Client Configuration
 */
export interface SteamInventoryClientConfig {
  /** Base URL for Steam API (for testing) */
  baseUrl?: string

  /** Maximum retry attempts */
  maxRetries?: number

  /** Retry delay schedule (milliseconds) */
  retryDelays?: number[]

  /** Delay between pagination requests (milliseconds) */
  paginationDelay?: number
}
