/**
 * Search Results Pricing Tests
 * Tests for displaying real marketplace prices from database cache
 */

import { getCachedPrices } from '@/lib/db'

// Mock the database module
jest.mock('@/lib/db', () => ({
  getCachedPrices: jest.fn(),
}))

describe('Search Results Pricing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Lowest price calculation', () => {
    it('should select CSFloat when it has the lowest price', async () => {
      const mockPrices = [
        { marketplace: 'Steam', price: 12.50, cachedAt: new Date() },
        { marketplace: 'CSFloat', price: 11.25, cachedAt: new Date() },
        { marketplace: 'Skinport', price: 11.80, cachedAt: new Date() },
      ]

      ;(getCachedPrices as jest.Mock).mockResolvedValue(mockPrices)

      const lowestPrice = findLowestPrice(mockPrices)

      expect(lowestPrice).toEqual({
        marketplace: 'CSFloat',
        price: 11.25,
      })
    })

    it('should select Steam when it has the lowest price', async () => {
      const mockPrices = [
        { marketplace: 'Steam', price: 45.00, cachedAt: new Date() },
        { marketplace: 'CSFloat', price: 48.50, cachedAt: new Date() },
        { marketplace: 'Skinport', price: 47.25, cachedAt: new Date() },
      ]

      const lowestPrice = findLowestPrice(mockPrices)

      expect(lowestPrice).toEqual({
        marketplace: 'Steam',
        price: 45.00,
      })
    })

    it('should handle single cached marketplace', async () => {
      const mockPrices = [
        { marketplace: 'CSFloat', price: 3250.00, cachedAt: new Date() },
      ]

      const lowestPrice = findLowestPrice(mockPrices)

      expect(lowestPrice).toEqual({
        marketplace: 'CSFloat',
        price: 3250.00,
      })
    })

    it('should return null when no cached prices exist', async () => {
      const mockPrices: any[] = []

      const lowestPrice = findLowestPrice(mockPrices)

      expect(lowestPrice).toBeNull()
    })
  })

  describe('Cache expiry handling', () => {
    it('should exclude expired prices (> 5 minutes old)', () => {
      const now = new Date()
      const sixMinutesAgo = new Date(now.getTime() - 6 * 60 * 1000)
      const fourMinutesAgo = new Date(now.getTime() - 4 * 60 * 1000)

      const mockPrices = [
        { marketplace: 'Steam', price: 420.00, cachedAt: sixMinutesAgo },
        { marketplace: 'CSFloat', price: 415.00, cachedAt: fourMinutesAgo },
      ]

      const validPrices = filterValidPrices(mockPrices, 5)

      expect(validPrices).toHaveLength(1)
      expect(validPrices[0].marketplace).toBe('CSFloat')
    })

    it('should include prices within TTL', () => {
      const now = new Date()
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000)

      const mockPrices = [
        { marketplace: 'Steam', price: 12.50, cachedAt: twoMinutesAgo },
        { marketplace: 'CSFloat', price: 11.25, cachedAt: now },
      ]

      const validPrices = filterValidPrices(mockPrices, 5)

      expect(validPrices).toHaveLength(2)
    })
  })

  describe('Marketplace URL generation', () => {
    it('should generate correct Steam URL', () => {
      const itemName = 'AK-47 | Redline (Field-Tested)'
      const url = generateMarketplaceUrl(itemName, 'Steam')

      expect(url).toBe('https://steamcommunity.com/market/listings/730/AK-47%20%7C%20Redline%20(Field-Tested)')
    })

    it('should generate correct CSFloat URL', () => {
      const itemName = 'AWP | Asiimov (Field-Tested)'
      const url = generateMarketplaceUrl(itemName, 'CSFloat')

      expect(url).toBe('https://csfloat.com/search?name=AWP%20%7C%20Asiimov%20(Field-Tested)')
    })

    it('should generate correct Skinport URL', () => {
      const itemName = 'M4A4 | Howl (Factory New)'
      const url = generateMarketplaceUrl(itemName, 'Skinport')

      expect(url).toBe('https://skinport.com/market?search=M4A4%20%7C%20Howl%20(Factory%20New)')
    })

    it('should handle special characters in item names', () => {
      const itemName = "StatTrak™ Desert Eagle | Blaze (Factory New)"
      const url = generateMarketplaceUrl(itemName, 'Steam')

      expect(url).toContain('StatTrak%E2%84%A2')
      expect(url).toContain('Desert%20Eagle')
    })
  })

  describe('Price formatting', () => {
    it('should format large numbers with comma separators', () => {
      expect(formatPrice(1850.50)).toBe('$1,850.50')
    })

    it('should format small numbers without commas', () => {
      expect(formatPrice(12.50)).toBe('$12.50')
    })

    it('should always show 2 decimal places', () => {
      expect(formatPrice(100)).toBe('$100.00')
      expect(formatPrice(0.5)).toBe('$0.50')
    })

    it('should handle very large prices', () => {
      expect(formatPrice(50000.99)).toBe('$50,000.99')
    })
  })

  describe('Batch price lookup for search results', () => {
    it('should fetch prices for multiple items efficiently', async () => {
      const itemNames = [
        'AK-47 | Redline (FT)',
        'AWP | Asiimov (FT)',
        'M4A4 | Howl (FN)',
      ]

      const mockPricesMap = {
        'AK-47 | Redline (FT)': [
          { marketplace: 'CSFloat', price: 11.25, cachedAt: new Date() },
        ],
        'AWP | Asiimov (FT)': [
          { marketplace: 'Steam', price: 45.00, cachedAt: new Date() },
        ],
        'M4A4 | Howl (FN)': [],
      }

      ;(getCachedPrices as jest.Mock).mockImplementation((itemName) =>
        Promise.resolve(mockPricesMap[itemName] || [])
      )

      const results = await fetchBatchPrices(itemNames)

      expect(results).toHaveLength(3)
      expect(results[0]).toEqual({
        itemName: 'AK-47 | Redline (FT)',
        lowestPrice: { marketplace: 'CSFloat', price: 11.25 },
      })
      expect(results[1]).toEqual({
        itemName: 'AWP | Asiimov (FT)',
        lowestPrice: { marketplace: 'Steam', price: 45.00 },
      })
      expect(results[2]).toEqual({
        itemName: 'M4A4 | Howl (FN)',
        lowestPrice: null,
      })
    })
  })
})

// Helper functions to be implemented
function findLowestPrice(prices: any[]): { marketplace: string; price: number } | null {
  if (prices.length === 0) return null

  return prices.reduce((lowest, current) => {
    if (!lowest || current.price < lowest.price) {
      return { marketplace: current.marketplace, price: current.price }
    }
    return lowest
  }, null as { marketplace: string; price: number } | null)
}

function filterValidPrices(prices: any[], ttlMinutes: number): any[] {
  const now = new Date()
  const ttlMs = ttlMinutes * 60 * 1000

  return prices.filter((price) => {
    const age = now.getTime() - new Date(price.cachedAt).getTime()
    return age <= ttlMs
  })
}

function generateMarketplaceUrl(itemName: string, marketplace: string): string {
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

function formatPrice(price: number): string {
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

async function fetchBatchPrices(itemNames: string[]): Promise<any[]> {
  const results = await Promise.all(
    itemNames.map(async (itemName) => {
      const prices = await getCachedPrices(itemName)
      const validPrices = filterValidPrices(prices, 5)
      const lowestPrice = findLowestPrice(validPrices)

      return {
        itemName,
        lowestPrice,
      }
    })
  )

  return results
}
