/**
 * Steam Inventory Client - Failing Tests (TDD Red Phase)
 *
 * BDD Reference: features/07-inventory-import.feature
 *
 * Critical Gotchas Applied:
 * - Steam endpoint: https://steamcommunity.com/inventory/{steamId}/730/2
 * - IEconItems_730 endpoint is PERMANENTLY DISABLED (don't use it)
 * - Rate limiting: 5 requests per minute (reality vs 100K/day documented)
 * - Pagination limit: 2500 items per request
 * - No API key required (public endpoint)
 *
 * Test Strategy:
 * - Use real HTTP client with test server (no mocks)
 * - InMemory rate limiter for testing
 * - Test data builders for Steam API responses
 * - Real retry logic with configurable delays
 *
 * @jest-environment node
 */

import { SteamInventoryClient } from '../steam-inventory-client'
import type { SteamInventoryResponse, SteamInventoryItem } from '../types'

describe('SteamInventoryClient', () => {
  let client: SteamInventoryClient
  let testServer: TestSteamAPIServer

  beforeEach(async () => {
    testServer = new TestSteamAPIServer()
    await testServer.start() // Wait for server to be ready
    client = new SteamInventoryClient({
      baseUrl: testServer.url,
      maxRetries: 3,
      retryDelays: [100, 200, 400], // Fast delays for testing (ms)
    })
  })

  afterEach(async () => {
    await testServer.stop()
  })

  describe('Successful Inventory Fetch', () => {
    // BDD: Scenario "First-time inventory import shows total value"
    it('should fetch Steam inventory successfully with 200 OK', async () => {
      // Arrange
      const steamId = '76561198000000001'
      const expectedItems = TestDataBuilder.createSteamInventory({
        itemCount: 247,
        includeDescriptions: true,
      })

      testServer.mockInventoryResponse(steamId, {
        success: 1,
        total_inventory_count: 247,
        assets: expectedItems.assets,
        descriptions: expectedItems.descriptions,
      })

      // Act
      const result = await client.fetchInventory(steamId)

      // Debug logging
      if (!result.success) {
        console.log('Test failed - result:', JSON.stringify(result, null, 2))
        console.log('Expected URL:', `${testServer.url}/inventory/${steamId}/730/2`)
        console.log('Server request count:', testServer.getRequestCount())
      }

      // Assert
      expect(result.success).toBe(true)
      expect(result.items).toHaveLength(247)
      expect(result.totalCount).toBe(247)
      expect(testServer.getRequestCount()).toBe(1)
    })

    it('should parse Steam API response format correctly', async () => {
      // Arrange
      const steamId = '76561198000000001'
      testServer.mockInventoryResponse(steamId, {
        success: 1,
        total_inventory_count: 1,
        assets: [
          {
            assetid: '12345678901',
            classid: '123456',
            instanceid: '0',
            amount: '1',
          },
        ],
        descriptions: [
          {
            classid: '123456',
            instanceid: '0',
            market_hash_name: 'AK-47 | Redline (Field-Tested)',
            type: 'Rifle',
            tradable: 1,
            marketable: 1,
          },
        ],
      })

      // Act
      const result = await client.fetchInventory(steamId)

      // Assert
      expect(result.items[0]).toMatchObject({
        assetId: '12345678901',
        marketHashName: 'AK-47 | Redline (Field-Tested)',
        isTradable: true,
        isMarketable: true,
      })
    })
  })

  describe('Private Inventory Handling', () => {
    // BDD: Scenario "Handle private inventory gracefully"
    it('should detect private inventory with 403 Forbidden', async () => {
      // Arrange
      const steamId = '76561198000000001'
      testServer.mockPrivateInventory(steamId)

      // Act
      const result = await client.fetchInventory(steamId)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('PRIVATE_INVENTORY')
      expect(result.message).toContain('inventory is private')
    })

    it('should not retry on 403 errors (permanent failure)', async () => {
      // Arrange
      const steamId = '76561198000000001'
      testServer.mockPrivateInventory(steamId)

      // Act
      await client.fetchInventory(steamId)

      // Assert - should only make 1 request, no retries
      expect(testServer.getRequestCount()).toBe(1)
    })
  })

  describe('Rate Limiting with Exponential Backoff', () => {
    // BDD: Scenario "Exponential backoff on 429 error"
    it('should retry with exponential backoff on 429 errors', async () => {
      // Arrange
      const steamId = '76561198000000001'
      testServer.mockRateLimitThenSuccess(steamId, {
        failureCount: 2, // 429, 429, then 200
        successResponse: TestDataBuilder.createSteamInventory({ itemCount: 10 }),
      })

      const startTime = Date.now()

      // Act
      const result = await client.fetchInventory(steamId)

      // Assert
      expect(result.success).toBe(true)
      expect(testServer.getRequestCount()).toBe(3) // Initial + 2 retries

      // Verify exponential backoff delays (100ms, 200ms)
      // With jitter (0.5-1.0 multiplier), minimum is 150ms (100*0.5 + 200*0.5)
      const elapsedTime = Date.now() - startTime
      expect(elapsedTime).toBeGreaterThanOrEqual(150) // Jitter-adjusted minimum
    })

    it('should fail after maximum retry attempts', async () => {
      // Arrange
      const steamId = '76561198000000001'
      testServer.mockPermanentRateLimit(steamId)

      // Act
      const result = await client.fetchInventory(steamId)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('RATE_LIMITED')
      expect(testServer.getRequestCount()).toBe(4) // Initial + 3 retries
    })

    it('should respect configured retry delays', async () => {
      // Arrange
      const customClient = new SteamInventoryClient({
        baseUrl: testServer.url,
        maxRetries: 2,
        retryDelays: [50, 100], // Custom delays
      })

      const steamId = '76561198999999999' // Unique ID for this test
      testServer.mockPermanentRateLimit(steamId)

      const startTime = Date.now()
      const requestCountBefore = testServer.getRequestCount()

      // Act
      await customClient.fetchInventory(steamId)

      // Assert
      // With jitter (0.5-1.0 multiplier), minimum is 75ms (50*0.5 + 100*0.5)
      const elapsedTime = Date.now() - startTime
      expect(elapsedTime).toBeGreaterThanOrEqual(75) // Jitter-adjusted minimum

      // Verify custom retry configuration was used
      // At minimum should make 2 requests (initial + 1 retry from custom maxRetries)
      const requestCountAfter = testServer.getRequestCount()
      const requestsMade = requestCountAfter - requestCountBefore
      expect(requestsMade).toBeGreaterThanOrEqual(2)
      expect(requestsMade).toBeLessThanOrEqual(3) // Should not exceed initial + maxRetries
    })
  })

  describe('Pagination for Large Inventories', () => {
    // BDD: Scenario "Import large inventory with pagination"
    it('should paginate inventory with >2500 items using start_assetid cursor', async () => {
      // Arrange
      const steamId = '76561198000000001'
      const totalItems = 4523

      // Page 1: items 1-2500 with cursor
      testServer.mockPaginatedResponse(steamId, {
        pageNumber: 1,
        items: TestDataBuilder.createSteamInventory({ itemCount: 2500 }),
        hasMore: true,
        lastAssetId: 'asset_2500',
      })

      // Page 2: items 2501-4523
      testServer.mockPaginatedResponse(steamId, {
        pageNumber: 2,
        startAssetId: 'asset_2500',
        items: TestDataBuilder.createSteamInventory({ itemCount: 2023 }),
        hasMore: false,
      })

      // Act
      const result = await client.fetchInventory(steamId)

      // Assert
      expect(result.success).toBe(true)
      expect(result.items).toHaveLength(totalItems)
      expect(testServer.getRequestCount()).toBe(2)
      expect(testServer.getLastRequest()).toContain('start_assetid=asset_2500')
    })

    it('should wait between pagination requests to avoid rate limits', async () => {
      // Arrange
      const steamId = '76561198000000001'
      testServer.mockPaginatedResponse(steamId, {
        pageNumber: 1,
        items: TestDataBuilder.createSteamInventory({ itemCount: 2500 }),
        hasMore: true,
        lastAssetId: 'asset_2500',
      })
      testServer.mockPaginatedResponse(steamId, {
        pageNumber: 2,
        startAssetId: 'asset_2500',
        items: TestDataBuilder.createSteamInventory({ itemCount: 1000 }),
        hasMore: false,
      })

      const startTime = Date.now()

      // Act
      await client.fetchInventory(steamId)

      // Assert - configured delay is 1000ms (from client constructor)
      const elapsedTime = Date.now() - startTime
      expect(elapsedTime).toBeGreaterThanOrEqual(1000)
    })
  })

  describe('Item Attribute Extraction', () => {
    // BDD: Scenario "Extract float value from Steam API response"
    it('should extract float value from inspect link', async () => {
      // Arrange
      const steamId = '76561198000000001'
      testServer.mockInventoryResponse(steamId, {
        success: 1,
        total_inventory_count: 1,
        assets: [{ assetid: '123', classid: '456', instanceid: '0', amount: '1' }],
        descriptions: [
          {
            classid: '456',
            instanceid: '0',
            market_hash_name: 'AK-47 | Redline (Field-Tested)',
            actions: [
              {
                name: 'Inspect in Game...',
                link: 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S%owner_steamid%A%assetid%D14569822983007703288',
              },
            ],
          },
        ],
      })

      // Act
      const result = await client.fetchInventory(steamId)

      // Assert
      expect(result.items[0].inspectLink).toBeDefined()
      // Float extraction happens in separate service
    })

    it('should extract sticker information from descriptions', async () => {
      // Arrange
      const steamId = '76561198000000001'
      testServer.mockInventoryResponse(steamId, {
        success: 1,
        total_inventory_count: 1,
        assets: [{ assetid: '123', classid: '456', instanceid: '0', amount: '1' }],
        descriptions: [
          {
            classid: '456',
            instanceid: '0',
            market_hash_name: 'AK-47 | Redline (Field-Tested)',
            descriptions: [
              {
                value: 'Sticker: Natus Vincere (Holo) | Katowice 2014',
                color: '9da1a9',
              },
            ],
          },
        ],
      })

      // Act
      const result = await client.fetchInventory(steamId)

      // Assert
      expect(result.items[0].stickerDescriptions).toBeDefined()
      expect(result.items[0].stickerDescriptions![0]).toBe('Natus Vincere (Holo) | Katowice 2014')
    })

    it('should extract custom name tags', async () => {
      // Arrange
      const steamId = '76561198000000001'
      testServer.mockInventoryResponse(steamId, {
        success: 1,
        total_inventory_count: 1,
        assets: [{ assetid: '123', classid: '456', instanceid: '0', amount: '1' }],
        descriptions: [
          {
            classid: '456',
            instanceid: '0',
            market_hash_name: 'AK-47 | Redline (Field-Tested)',
            name: 'The Red Death', // Custom name tag
            fraudwarnings: ['Name Tag: "The Red Death"'],
          },
        ],
      })

      // Act
      const result = await client.fetchInventory(steamId)

      // Assert
      expect(result.items[0].customName).toBe('The Red Death')
    })

    it('should detect trade-locked items', async () => {
      // Arrange
      const steamId = '76561198000000001'
      const tradeableDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

      testServer.mockInventoryResponse(steamId, {
        success: 1,
        total_inventory_count: 1,
        assets: [{ assetid: '123', classid: '456', instanceid: '0', amount: '1' }],
        descriptions: [
          {
            classid: '456',
            instanceid: '0',
            market_hash_name: 'AK-47 | Redline (Field-Tested)',
            tradable: 0,
            cache_expiration: tradeableDate.toISOString(),
          },
        ],
      })

      // Act
      const result = await client.fetchInventory(steamId)

      // Assert
      expect(result.items[0].isTradable).toBe(false)
      expect(result.items[0].tradeHoldUntil).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Arrange
      const steamId = '76561198000000001'
      testServer.mockNetworkError(steamId)

      // Act
      const result = await client.fetchInventory(steamId)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('NETWORK_ERROR')
    })

    it('should handle malformed JSON responses', async () => {
      // Arrange
      const steamId = '76561198000000001'
      testServer.mockMalformedResponse(steamId)

      // Act
      const result = await client.fetchInventory(steamId)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('INVALID_RESPONSE')
    })

    it('should handle Steam API errors (success: 0)', async () => {
      // Arrange
      const steamId = '76561198000000001'
      testServer.mockInventoryResponse(steamId, {
        success: 0,
        error: 'Internal Server Error',
      })

      // Act
      const result = await client.fetchInventory(steamId)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('STEAM_API_ERROR')
    })
  })
})

/**
 * Test Steam API Server
 * Real HTTP server using Node.js built-in http module
 * No mocks - actual HTTP requests for testing
 */
class TestSteamAPIServer {
  private server: any
  private requestCount = 0
  private lastRequest = ''
  private responses = new Map<string, any>()
  private port = 9999

  url = `http://localhost:${this.port}`

  constructor() {
    const http = require('http')

    this.server = http.createServer((req: any, res: any) => {
      this.requestCount++
      this.lastRequest = req.url || ''

      const responseConfig = this.responses.get(req.url)

      if (!responseConfig) {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Not Found' }))
        return
      }

      // Handle network error simulation
      if (responseConfig.networkError) {
        req.socket.destroy()
        return
      }

      // Handle malformed response simulation
      if (responseConfig.malformed) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end('invalid json {')
        return
      }

      // Handle retry sequence (array of responses)
      if (Array.isArray(responseConfig)) {
        const currentAttempt = this.requestCount - 1
        const response = responseConfig[currentAttempt] || responseConfig[responseConfig.length - 1]

        res.writeHead(response.status, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(response.body))
        return
      }

      // Handle single response with status
      if (responseConfig.status) {
        res.writeHead(responseConfig.status, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(responseConfig.body || {}))
        return
      }

      // Handle standard Steam API response
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(responseConfig))
    })
  }

  async start(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.server.listen(this.port, () => {
        resolve()
      })
    })
  }

  mockInventoryResponse(steamId: string, response: any) {
    this.responses.set(`/inventory/${steamId}/730/2`, response)
  }

  mockPrivateInventory(steamId: string) {
    this.responses.set(`/inventory/${steamId}/730/2`, {
      status: 403,
      body: { error: 'This profile is private' },
    })
  }

  mockRateLimitThenSuccess(steamId: string, config: {
    failureCount: number
    successResponse: any
  }) {
    const responses = []
    for (let i = 0; i < config.failureCount; i++) {
      responses.push({ status: 429, body: { error: 'Too Many Requests' } })
    }
    responses.push({ status: 200, body: config.successResponse })
    this.responses.set(`/inventory/${steamId}/730/2`, responses)

    // Reset request count for retry tests
    this.requestCount = 0
  }

  mockPermanentRateLimit(steamId: string) {
    this.responses.set(`/inventory/${steamId}/730/2`, {
      status: 429,
      body: { error: 'Too Many Requests' },
    })
    // Don't reset request count - tests use delta to verify retry count
  }

  mockPaginatedResponse(steamId: string, config: {
    pageNumber: number
    startAssetId?: string
    items: any
    hasMore: boolean
    lastAssetId?: string
  }) {
    const key = config.startAssetId
      ? `/inventory/${steamId}/730/2?start_assetid=${config.startAssetId}`
      : `/inventory/${steamId}/730/2`

    this.responses.set(key, {
      ...config.items,
      more_items: config.hasMore ? 1 : 0,
      last_assetid: config.lastAssetId,
    })
  }

  mockNetworkError(steamId: string) {
    this.responses.set(`/inventory/${steamId}/730/2`, { networkError: true })
  }

  mockMalformedResponse(steamId: string) {
    this.responses.set(`/inventory/${steamId}/730/2`, { malformed: true })
  }

  getRequestCount(): number {
    return this.requestCount
  }

  getLastRequest(): string {
    return this.lastRequest
  }

  async stop() {
    return new Promise<void>((resolve) => {
      this.server.close(() => {
        this.responses.clear()
        this.requestCount = 0
        resolve()
      })
    })
  }
}

/**
 * Test Data Builder for Steam API Responses
 * Creates realistic test data without mocks
 */
class TestDataBuilder {
  static createSteamInventory(config: {
    itemCount: number
    includeDescriptions?: boolean
  }): SteamInventoryResponse {
    const assets = []
    const descriptions = []

    for (let i = 0; i < config.itemCount; i++) {
      const assetId = `asset_${i + 1}`
      const classId = `class_${i % 100}` // Reuse class IDs for variety

      assets.push({
        assetid: assetId,
        classid: classId,
        instanceid: '0',
        amount: '1',
      })

      if (config.includeDescriptions && i % 100 === 0) {
        descriptions.push({
          classid: classId,
          instanceid: '0',
          market_hash_name: `Test Item ${i}`,
          type: 'Rifle',
          tradable: 1,
          marketable: 1,
        })
      }
    }

    return {
      success: 1,
      total_inventory_count: config.itemCount,
      assets,
      descriptions: config.includeDescriptions ? descriptions : [],
    }
  }
}
