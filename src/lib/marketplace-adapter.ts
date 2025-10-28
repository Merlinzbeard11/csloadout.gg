// MarketplaceAdapter interface for future real API integration
// This provides a clean abstraction layer for connecting to real marketplace APIs

export interface MarketPrice {
  market: string
  currency: string
  price: number
  fee_included: boolean
  last_updated: string
}

export interface PriceHistory {
  timestamp: string
  price: number
  volume?: number
}

export interface MarketplaceAdapter {
  // Fetch current prices for an item across all markets
  fetchItemPrices(itemId: string): Promise<MarketPrice[]>

  // Fetch historical price data
  fetchPriceHistory(itemId: string, timeRange: "7d" | "30d" | "1y"): Promise<PriceHistory[]>

  // Search items with filters
  searchItems(filters: Record<string, any>): Promise<any[]>

  // Get item details
  getItemDetails(itemId: string): Promise<any>
}

// Mock implementation for development
export class MockMarketplaceAdapter implements MarketplaceAdapter {
  async fetchItemPrices(itemId: string): Promise<MarketPrice[]> {
    // Return mock data from our mock-data.ts
    return []
  }

  async fetchPriceHistory(itemId: string, timeRange: "7d" | "30d" | "1y"): Promise<PriceHistory[]> {
    // Return mock historical data
    return []
  }

  async searchItems(filters: Record<string, any>): Promise<any[]> {
    // Return mock search results
    return []
  }

  async getItemDetails(itemId: string): Promise<any> {
    // Return mock item details
    return null
  }
}

// Future real implementations would look like:
// export class SteamMarketAdapter implements MarketplaceAdapter { ... }
// export class BuffMarketAdapter implements MarketplaceAdapter { ... }
// export class DMarketAdapter implements MarketplaceAdapter { ... }

// Factory function to get the appropriate adapter
export function getMarketplaceAdapter(): MarketplaceAdapter {
  // In production, this would check environment variables and return the appropriate adapter
  return new MockMarketplaceAdapter()
}
