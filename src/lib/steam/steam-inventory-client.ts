/**
 * Steam Inventory API Client
 *
 * Implements real HTTP client with exponential backoff for Steam's inventory endpoint.
 *
 * Critical Gotchas Applied:
 * - Endpoint: https://steamcommunity.com/inventory/{steamId}/730/2 (NOT IEconItems_730)
 * - IEconItems_730/GetPlayerItems PERMANENTLY DISABLED since late 2022
 * - Rate limiting: ~5 requests before 429 errors (reality, not documented 100K/day)
 * - Pagination: 2500 items max per request, use last_assetid cursor
 * - 403 errors trigger strict IP-based rate limits (avoid at all costs)
 * - Exponential backoff WITH JITTER to prevent thundering herd
 *
 * BDD Reference: features/07-inventory-import.feature
 */

import type {
  SteamInventoryResponse,
  SteamInventoryItem,
  InventoryFetchResult,
  SteamInventoryClientConfig,
  SteamAsset,
  SteamDescription,
} from './types'

export class SteamInventoryClient {
  private readonly baseUrl: string
  private readonly maxRetries: number
  private readonly retryDelays: number[]
  private readonly paginationDelay: number
  private readonly maxDelayMs: number = 30000 // 30 second cap

  constructor(config?: SteamInventoryClientConfig) {
    this.baseUrl = config?.baseUrl || 'https://steamcommunity.com'
    this.maxRetries = config?.maxRetries ?? 3
    this.retryDelays = config?.retryDelays ?? [2000, 4000, 8000] // 2s, 4s, 8s (BDD requirement)
    this.paginationDelay = config?.paginationDelay ?? 1000 // 1s between pagination requests
  }

  /**
   * Fetch Steam inventory with automatic pagination and retry logic
   *
   * BDD: Scenario "First-time inventory import shows total value"
   * BDD: Scenario "Import large inventory with pagination"
   */
  async fetchInventory(steamId: string): Promise<InventoryFetchResult> {
    const allItems: SteamInventoryItem[] = []
    let cursor: string | undefined
    let totalCount = 0
    let pageNumber = 0

    try {
      do {
        pageNumber++

        // Wait between pagination requests to avoid rate limits
        // BDD: "should wait between pagination requests to avoid rate limits"
        if (pageNumber > 1) {
          await this.delay(this.paginationDelay)
        }

        const url = this.buildInventoryUrl(steamId, cursor)
        const response = await this.fetchWithRetry(url)

        // Handle error responses
        if (!response.ok) {
          return this.handleErrorResponse(response)
        }

        let data: SteamInventoryResponse
      try {
        data = await response.json()
      } catch (error) {
        return {
          success: false,
          items: [],
          totalCount: 0,
          error: 'INVALID_RESPONSE',
          message: 'Failed to parse JSON response from Steam API',
        }
      }

        // Handle Steam API errors (success: 0)
        if (data.success === 0) {
          return {
            success: false,
            items: [],
            totalCount: 0,
            error: 'STEAM_API_ERROR',
            message: data.error || 'Steam API returned an error',
          }
        }

        // Parse items from response
        const pageItems = this.parseInventoryItems(data)
        allItems.push(...pageItems)

        totalCount = data.total_inventory_count ?? allItems.length
        cursor = data.more_items === 1 ? data.last_assetid : undefined

      } while (cursor)

      return {
        success: true,
        items: allItems,
        totalCount,
      }

    } catch (error) {
      return this.handleNetworkError(error)
    }
  }

  /**
   * Fetch with exponential backoff + jitter
   *
   * BDD: Scenario "Exponential backoff on 429 error"
   *
   * Gotcha Applied: Add jitter to prevent thundering herd problem
   * - Without jitter: all clients retry at exact same time after backoff
   * - With jitter: retries spread across time window
   * - Formula: delay = baseDelay * (2^retryCount) * (0.5 + random(0, 0.5))
   *
   * @param url URL to fetch
   * @param retryCount Number of retries attempted so far (starts at 0)
   */
  private async fetchWithRetry(url: string, retryCount = 0): Promise<Response> {
    try {
      const response = await fetch(url)

      // Don't retry on 403 (permanent failure, triggers strict IP rate limits)
      // BDD: "should not retry on 403 errors (permanent failure)"
      if (response.status === 403) {
        return response
      }

      // Retry on 429 (rate limit) with exponential backoff
      // BDD: "should retry with exponential backoff on 429 errors"
      // retryCount < maxRetries means: with maxRetries=2, allow retryCount 0,1,2 (3 total requests)
      if (response.status === 429 && retryCount < this.maxRetries) {
        const delay = this.calculateBackoffDelay(retryCount)
        await this.delay(delay)
        return this.fetchWithRetry(url, retryCount + 1)
      }

      // Retry on 5xx errors (server errors)
      if (response.status >= 500 && response.status < 600 && retryCount < this.maxRetries) {
        const delay = this.calculateBackoffDelay(retryCount)
        await this.delay(delay)
        return this.fetchWithRetry(url, retryCount + 1)
      }

      return response

    } catch (error) {
      // Retry on network errors
      if (retryCount < this.maxRetries) {
        const delay = this.calculateBackoffDelay(retryCount)
        await this.delay(delay)
        return this.fetchWithRetry(url, retryCount + 1)
      }
      throw error
    }
  }

  /**
   * Calculate exponential backoff delay with jitter
   *
   * Gotcha: Jitter prevents thundering herd (all clients retrying simultaneously)
   * Formula: delay = min(maxDelay, baseDelay * jitter)
   * Jitter: random multiplier between 0.5 and 1.0
   *
   * Example with retryDelays = [2000, 4000, 8000]:
   * - Retry 0: 2000 * [0.5-1.0] = 1000-2000ms
   * - Retry 1: 4000 * [0.5-1.0] = 2000-4000ms
   * - Retry 2: 8000 * [0.5-1.0] = 4000-8000ms
   */
  private calculateBackoffDelay(retryCount: number): number {
    const baseDelay = this.retryDelays[retryCount] ?? this.retryDelays[this.retryDelays.length - 1]
    const jitter = 0.5 + Math.random() * 0.5 // Random between 0.5 and 1.0
    const delay = baseDelay * jitter
    return Math.min(this.maxDelayMs, delay)
  }

  /**
   * Build inventory URL with optional pagination cursor
   *
   * Endpoint: https://steamcommunity.com/inventory/{steamId}/730/2
   * - 730 = CS2 app ID
   * - 2 = context ID (CS2 items)
   * - Optional: ?start_assetid={cursor} for pagination
   */
  private buildInventoryUrl(steamId: string, cursor?: string): string {
    const endpoint = `/inventory/${steamId}/730/2`
    const url = this.baseUrl + endpoint

    if (cursor) {
      return `${url}?start_assetid=${cursor}`
    }

    return url
  }

  /**
   * Parse Steam API response into internal item format
   *
   * BDD: "should parse Steam API response format correctly"
   *
   * Steam response structure:
   * - assets: Array of item instances (assetid, classid)
   * - descriptions: Array of item metadata (market_hash_name, tradable, etc.)
   * - Match by: asset.classid === description.classid
   */
  private parseInventoryItems(response: SteamInventoryResponse): SteamInventoryItem[] {
    if (!response.assets || !response.descriptions) {
      return []
    }

    // Create description lookup map by classid + instanceid
    const descriptionMap = new Map<string, SteamDescription>()
    for (const desc of response.descriptions) {
      const key = `${desc.classid}_${desc.instanceid}`
      descriptionMap.set(key, desc)
    }

    // Map assets to items with description data
    return response.assets.map((asset) => {
      const key = `${asset.classid}_${asset.instanceid}`
      const description = descriptionMap.get(key)

      return this.parseItem(asset, description)
    })
  }

  /**
   * Parse individual item from asset + description
   *
   * Extracts:
   * - Basic info: market_hash_name, tradable, marketable
   * - Custom name tags (from fraudwarnings or name field)
   * - Sticker descriptions (from descriptions array)
   * - Trade hold info (from cache_expiration)
   * - Inspect link (for float extraction in separate service)
   */
  private parseItem(asset: SteamAsset, description?: SteamDescription): SteamInventoryItem {
    // BDD: "should extract custom name tags"
    const customName = this.extractCustomName(description)

    // BDD: "should extract sticker information from descriptions"
    const stickerDescriptions = this.extractStickerDescriptions(description)

    // BDD: "should detect trade-locked items"
    const tradeHoldUntil = this.extractTradeHoldDate(description)

    // BDD: "should extract float value from inspect link"
    const inspectLink = this.extractInspectLink(description)

    return {
      assetId: asset.assetid,
      marketHashName: description?.market_hash_name ?? 'Unknown Item',
      customName,
      stickerDescriptions,
      isTradable: description?.tradable === 1,
      isMarketable: description?.marketable === 1,
      tradeHoldUntil,
      inspectLink,
      iconUrl: description?.icon_url,
      rarityColor: description?.name_color,
    }
  }

  /**
   * Extract custom name tag from item
   *
   * Steam stores custom names in two places:
   * 1. fraudwarnings array: ['Name Tag: "The Red Death"']
   * 2. name field: "The Red Death" (if different from market_hash_name)
   */
  private extractCustomName(description?: SteamDescription): string | undefined {
    if (!description) return undefined

    // Check fraudwarnings first
    if (description.fraudwarnings) {
      for (const warning of description.fraudwarnings) {
        const match = warning.match(/Name Tag:\s*"(.+)"/)
        if (match) {
          return match[1]
        }
      }
    }

    // Check if name field differs from market_hash_name
    if (description.name && description.name !== description.market_hash_name) {
      return description.name
    }

    return undefined
  }

  /**
   * Extract sticker descriptions from item
   *
   * Stickers appear in descriptions array with format:
   * { value: "Sticker: Natus Vincere (Holo) | Katowice 2014", color: "9da1a9" }
   */
  private extractStickerDescriptions(description?: SteamDescription): string[] | undefined {
    if (!description?.descriptions) return undefined

    const stickers: string[] = []

    for (const desc of description.descriptions) {
      if (desc.value.startsWith('Sticker:')) {
        stickers.push(desc.value.replace('Sticker: ', ''))
      }
    }

    return stickers.length > 0 ? stickers : undefined
  }

  /**
   * Extract trade hold expiration date
   *
   * Trade-locked items have:
   * - tradable: 0
   * - cache_expiration: ISO date when tradable
   */
  private extractTradeHoldDate(description?: SteamDescription): Date | undefined {
    if (!description) return undefined

    if (description.tradable === 0 && description.cache_expiration) {
      return new Date(description.cache_expiration)
    }

    return undefined
  }

  /**
   * Extract inspect link for float value extraction
   *
   * Inspect link format:
   * steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S%owner_steamid%A%assetid%D{floatid}
   *
   * Float extraction happens in separate service (CSFloat API)
   */
  private extractInspectLink(description?: SteamDescription): string | undefined {
    if (!description?.actions) return undefined

    for (const action of description.actions) {
      if (action.name === 'Inspect in Game...') {
        return action.link
      }
    }

    return undefined
  }

  /**
   * Handle HTTP error responses
   *
   * BDD: "should detect private inventory with 403 Forbidden"
   * BDD: "should fail after maximum retry attempts" (429)
   */
  private handleErrorResponse(response: Response): InventoryFetchResult {
    if (response.status === 403) {
      return {
        success: false,
        items: [],
        totalCount: 0,
        error: 'PRIVATE_INVENTORY',
        message: 'This Steam inventory is private. Please set it to public.',
      }
    }

    if (response.status === 429) {
      return {
        success: false,
        items: [],
        totalCount: 0,
        error: 'RATE_LIMITED',
        message: 'Rate limit exceeded. Please try again in a few minutes.',
      }
    }

    return {
      success: false,
      items: [],
      totalCount: 0,
      error: 'STEAM_API_ERROR',
      message: `Steam API returned status ${response.status}`,
    }
  }

  /**
   * Handle network errors
   *
   * BDD: "should handle network errors gracefully"
   */
  private handleNetworkError(error: unknown): InventoryFetchResult {
    const message = error instanceof Error ? error.message : 'Unknown network error'

    return {
      success: false,
      items: [],
      totalCount: 0,
      error: 'NETWORK_ERROR',
      message: `Network error: ${message}`,
    }
  }

  /**
   * Utility: Promise-based delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
