/**
 * Pricing utilities for search results
 * Fetches cached prices from database and finds lowest price
 */

import { getCachedPrices, type CachedPrice } from './db'

export interface LowestPrice {
  marketplace: string
  price: number
  url: string
}

/**
 * Generate marketplace URL for an item
 */
export function generateMarketplaceUrl(itemName: string, marketplace: string): string {
  const encodedName = encodeURIComponent(itemName)

  switch (marketplace) {
    case 'Steam':
      return `https://steamcommunity.com/market/listings/730/${encodedName}`
    case 'CSFloat':
      return `https://csfloat.com/search?name=${encodedName}`
    case 'Skinport':
      return `https://skinport.com/market?search=${encodedName}`
    default:
      return ''
  }
}

/**
 * Find the lowest price from cached marketplace prices
 */
export function findLowestPrice(prices: CachedPrice[]): LowestPrice | null {
  if (prices.length === 0) return null

  const lowest = prices.reduce((min, current) => {
    if (!min || current.price < min.price) {
      return current
    }
    return min
  })

  return {
    marketplace: lowest.marketplace,
    price: lowest.price,
    url: generateMarketplaceUrl('', lowest.marketplace) // URL will be generated with actual item name in API
  }
}

/**
 * Fetch lowest cached price for a single item
 */
export async function fetchLowestPriceForItem(itemName: string): Promise<LowestPrice | null> {
  try {
    const cachedPrices = await getCachedPrices(itemName)

    if (cachedPrices.length === 0) {
      return null
    }

    const lowest = cachedPrices.reduce((min, current) => {
      if (!min || current.price < min.price) {
        return current
      }
      return min
    })

    return {
      marketplace: lowest.marketplace,
      price: lowest.price,
      url: generateMarketplaceUrl(itemName, lowest.marketplace)
    }
  } catch (error) {
    console.error(`Error fetching price for ${itemName}:`, error)
    return null
  }
}

/**
 * Batch fetch lowest prices for multiple items
 * Returns a Map of itemName -> LowestPrice
 */
export async function fetchBatchLowestPrices(itemNames: string[]): Promise<Map<string, LowestPrice | null>> {
  const priceMap = new Map<string, LowestPrice | null>()

  // Fetch all prices in parallel
  const results = await Promise.allSettled(
    itemNames.map(itemName => fetchLowestPriceForItem(itemName))
  )

  // Build the map
  results.forEach((result, index) => {
    const itemName = itemNames[index]

    if (result.status === 'fulfilled') {
      priceMap.set(itemName, result.value)
    } else {
      // If fetch failed, set to null
      priceMap.set(itemName, null)
    }
  })

  return priceMap
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return `$${price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}
