/**
 * Steam Market Price Service
 *
 * Fetches current lowest prices from Steam Community Market.
 * Uses caching to respect rate limits (~20 requests/minute).
 *
 * API: https://steamcommunity.com/market/priceoverview/
 * Parameters:
 * - appid: 730 (CS2)
 * - market_hash_name: Item name (URL encoded)
 * - currency: 1 (USD)
 *
 * Response format:
 * {
 *   "success": true,
 *   "lowest_price": "$1.23",
 *   "volume": "1234",
 *   "median_price": "$1.15"
 * }
 */

import { prisma } from '@/lib/prisma'

export interface SteamMarketPrice {
  lowestPrice: number | null
  medianPrice: number | null
  volume: number | null
  currency: string
  lastUpdated: Date
}

// In-memory cache for rate limiting (cleared on server restart)
const requestTimestamps: number[] = []
const MAX_REQUESTS_PER_MINUTE = 20
const CACHE_DURATION_MS = 15 * 60 * 1000 // 15 minutes

/**
 * Check if we can make another request without hitting rate limit
 */
function canMakeRequest(): boolean {
  const now = Date.now()
  const oneMinuteAgo = now - 60 * 1000

  // Remove timestamps older than 1 minute
  while (requestTimestamps.length > 0 && requestTimestamps[0] < oneMinuteAgo) {
    requestTimestamps.shift()
  }

  return requestTimestamps.length < MAX_REQUESTS_PER_MINUTE
}

/**
 * Record a request timestamp for rate limiting
 */
function recordRequest(): void {
  requestTimestamps.push(Date.now())
}

/**
 * Parse price string like "$1.23" or "€1,23" to number
 */
function parsePrice(priceStr: string | undefined): number | null {
  if (!priceStr) return null

  // Remove currency symbols and convert to number
  const cleaned = priceStr
    .replace(/[^0-9.,]/g, '') // Remove currency symbols
    .replace(',', '.') // Handle European decimal separator

  const price = parseFloat(cleaned)
  return isNaN(price) ? null : price
}

/**
 * Fetch price from Steam Market API for a single item
 */
export async function fetchSteamMarketPrice(marketHashName: string): Promise<SteamMarketPrice | null> {
  if (!canMakeRequest()) {
    console.log('[SteamMarket] Rate limited, skipping request for:', marketHashName)
    return null
  }

  const url = new URL('https://steamcommunity.com/market/priceoverview/')
  url.searchParams.set('appid', '730')
  url.searchParams.set('currency', '1') // USD
  url.searchParams.set('market_hash_name', marketHashName)

  try {
    recordRequest()

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      if (response.status === 429) {
        console.log('[SteamMarket] 429 Rate limited by Steam')
      }
      return null
    }

    const data = await response.json()

    if (!data.success) {
      return null
    }

    return {
      lowestPrice: parsePrice(data.lowest_price),
      medianPrice: parsePrice(data.median_price),
      volume: data.volume ? parseInt(data.volume.replace(',', ''), 10) : null,
      currency: 'USD',
      lastUpdated: new Date(),
    }
  } catch (error) {
    console.error('[SteamMarket] Error fetching price for', marketHashName, error)
    return null
  }
}

/**
 * Get cached price from database or fetch from Steam Market
 */
export async function getItemPrice(marketHashName: string): Promise<number | null> {
  // Check database cache first
  try {
    const cached = await prisma.marketplacePrice.findFirst({
      where: {
        item: {
          name: marketHashName,
        },
        platform: 'steam',
      },
      orderBy: {
        last_updated: 'desc',
      },
    })

    // If cached and fresh, return it
    if (cached && Date.now() - cached.last_updated.getTime() < CACHE_DURATION_MS) {
      return cached.price
    }
  } catch (error) {
    // Database might not have the table/item yet
    console.log('[SteamMarket] Cache lookup failed:', error)
  }

  // Fetch fresh price from Steam
  const price = await fetchSteamMarketPrice(marketHashName)

  if (price?.lowestPrice) {
    // Try to cache in database
    try {
      // Find the item by name
      const item = await prisma.item.findFirst({
        where: { name: marketHashName },
      })

      if (item) {
        await prisma.marketplacePrice.upsert({
          where: {
            item_id_platform: {
              item_id: item.id,
              platform: 'steam',
            },
          },
          update: {
            price: price.lowestPrice,
            total_cost: price.lowestPrice * 1.15, // Steam takes 15%
            last_updated: new Date(),
          },
          create: {
            item_id: item.id,
            platform: 'steam',
            price: price.lowestPrice,
            currency: 'USD',
            seller_fee_percent: 13,
            buyer_fee_percent: 2,
            total_cost: price.lowestPrice * 1.15,
            last_updated: new Date(),
          },
        })
      }
    } catch (error) {
      // Cache update failed, that's okay
      console.log('[SteamMarket] Cache update failed:', error)
    }

    return price.lowestPrice
  }

  return null
}

/**
 * Fetch prices for multiple items with rate limiting
 * Returns a map of market_hash_name -> price
 */
export async function getBulkPrices(marketHashNames: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>()

  // First, try to get all prices from cache
  try {
    const cachedPrices = await prisma.marketplacePrice.findMany({
      where: {
        item: {
          name: { in: marketHashNames },
        },
        platform: 'steam',
        // Only use prices updated in last 15 minutes
        last_updated: {
          gte: new Date(Date.now() - CACHE_DURATION_MS),
        },
      },
      include: {
        item: {
          select: { name: true },
        },
      },
    })

    for (const cached of cachedPrices) {
      prices.set(cached.item.name, cached.price)
    }
  } catch (error) {
    console.log('[SteamMarket] Bulk cache lookup failed:', error)
  }

  // Fetch missing prices (with rate limiting)
  const missingNames = marketHashNames.filter((name) => !prices.has(name))

  for (const name of missingNames) {
    if (!canMakeRequest()) {
      console.log('[SteamMarket] Rate limit reached, stopping bulk fetch')
      break
    }

    const price = await fetchSteamMarketPrice(name)
    if (price?.lowestPrice) {
      prices.set(name, price.lowestPrice)

      // Cache the price
      try {
        const item = await prisma.item.findFirst({
          where: { name },
        })

        if (item) {
          await prisma.marketplacePrice.upsert({
            where: {
              item_id_platform: {
                item_id: item.id,
                platform: 'steam',
              },
            },
            update: {
              price: price.lowestPrice,
              total_cost: price.lowestPrice * 1.15,
              last_updated: new Date(),
            },
            create: {
              item_id: item.id,
              platform: 'steam',
              price: price.lowestPrice,
              currency: 'USD',
              seller_fee_percent: 13,
              buyer_fee_percent: 2,
              total_cost: price.lowestPrice * 1.15,
              last_updated: new Date(),
            },
          })
        }
      } catch (error) {
        // Continue on cache errors
      }
    }

    // Small delay between requests to be nice to Steam
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return prices
}

/**
 * Update inventory items with current Steam Market prices
 */
export async function updateInventoryPrices(userId: string): Promise<{ updated: number; total: number }> {
  // Get user's inventory items
  const inventory = await prisma.userInventory.findUnique({
    where: { user_id: userId },
    include: {
      items: {
        select: {
          id: true,
          market_hash_name: true,
          current_value: true,
        },
      },
    },
  })

  if (!inventory) {
    return { updated: 0, total: 0 }
  }

  const itemNames = inventory.items.map((item) => item.market_hash_name)
  const prices = await getBulkPrices(itemNames)

  let updated = 0
  let totalValue = 0

  for (const item of inventory.items) {
    const price = prices.get(item.market_hash_name)
    if (price !== undefined) {
      await prisma.inventoryItem.update({
        where: { id: item.id },
        data: { current_value: price },
      })
      updated++
      totalValue += price
    } else if (item.current_value) {
      totalValue += Number(item.current_value)
    }
  }

  // Update total value on inventory
  await prisma.userInventory.update({
    where: { user_id: userId },
    data: { total_value: totalValue },
  })

  return { updated, total: inventory.items.length }
}
