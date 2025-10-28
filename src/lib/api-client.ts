/**
 * API Client for fetching CS2 item prices
 * Connects to /api/prices/[item] endpoint with PostgreSQL caching
 */

import type { Item, MarketPrice } from "./types"
import type { ItemMetadata } from "./items"

interface PriceAPIResponse {
  item: string
  prices: Array<{
    market: string
    price: number
    url: string
    floatValue?: number
    source?: "cache" | "fresh" | "stale_cache"
    cachedAt?: string
    warning?: string
  }>
}

/**
 * Fetch live prices for an item from our API
 */
export async function fetchItemPrices(itemName: string): Promise<MarketPrice[]> {
  try {
    const encodedName = encodeURIComponent(itemName)
    const response = await fetch(`/api/prices/${encodedName}`, {
      next: { revalidate: 300 } // 5 minute cache
    })

    if (!response.ok) {
      console.error(`Failed to fetch prices for ${itemName}:`, response.statusText)
      return []
    }

    const data: PriceAPIResponse = await response.json()

    // Convert API response to MarketPrice format
    return data.prices.map(price => ({
      name: price.market,
      currency: "USD",
      price: price.price,
      fee_incl: true,
      last_seen: price.cachedAt || new Date().toISOString(),
    }))
  } catch (error) {
    console.error(`Error fetching prices for ${itemName}:`, error)
    return []
  }
}

/**
 * Combine item metadata with live prices to create full Item object
 */
export async function getItemWithPrices(itemMetadata: ItemMetadata): Promise<Item> {
  const prices = await fetchItemPrices(itemMetadata.name)

  return {
    id: itemMetadata.id,
    name: itemMetadata.name,
    type: itemMetadata.type as Item['type'],
    weapon: itemMetadata.weapon,
    finish: itemMetadata.finish,
    paint_index: undefined,
    rarity: itemMetadata.rarity,
    collection: itemMetadata.collection,
    case: undefined,
    release_year: itemMetadata.release_year,
    float_min: itemMetadata.min_float,
    float_max: itemMetadata.max_float,
    color_hue: undefined,
    known_rare_patterns: undefined,
    images: itemMetadata.image ? {
      thumb: itemMetadata.image,
      hero: itemMetadata.image,
    } : {
      thumb: '',
      hero: '',
    },
    markets: prices.length > 0 ? prices : [
      // Fallback placeholder if API fails
      {
        name: "Steam",
        currency: "USD",
        price: 0,
        fee_incl: true,
        last_seen: new Date().toISOString(),
      }
    ],
    popularity: 0,
  }
}

/**
 * Client-side fetch for use in "use client" components
 */
export async function fetchItemPricesClient(itemName: string): Promise<MarketPrice[]> {
  try {
    const encodedName = encodeURIComponent(itemName)
    const response = await fetch(`/api/prices/${encodedName}`)

    if (!response.ok) {
      console.error(`Failed to fetch prices for ${itemName}:`, response.statusText)
      return []
    }

    const data: PriceAPIResponse = await response.json()

    return data.prices.map(price => ({
      name: price.market,
      currency: "USD",
      price: price.price,
      fee_incl: true,
      last_seen: price.cachedAt || new Date().toISOString(),
    }))
  } catch (error) {
    console.error(`Error fetching prices for ${itemName}:`, error)
    return []
  }
}
