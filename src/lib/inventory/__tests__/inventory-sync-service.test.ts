/**
 * Inventory Sync Service - Failing Tests (TDD RED Phase)
 *
 * BDD Reference: features/07-inventory-import.feature
 *
 * Service Responsibilities:
 * - Orchestrate Steam inventory fetch via SteamInventoryClient
 * - Match Steam items to database items via market_hash_name
 * - Store/update UserInventory and InventoryItem records
 * - Calculate total inventory value
 * - Handle privacy errors (403), rate limits (429), GDPR compliance
 *
 * Critical Gotchas Applied:
 * - Prisma interactive transactions for atomicity
 * - Transaction timeout: 5s default (increase for large inventories)
 * - Use transaction prisma instance (not injected instance)
 * - Avoid network calls inside transactions (causes deadlocks)
 * - GDPR: 90-day retention, scheduled_delete timestamps
 *
 * @jest-environment node
 */

import { InventorySyncService } from '../inventory-sync-service'
import { SteamInventoryClient } from '../../steam/steam-inventory-client'
import { PrismaClient } from '@prisma/client'
import type { InventorySyncResult } from '../types'

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn(),
  }
})

describe('InventorySyncService', () => {
  let service: InventorySyncService
  let steamClient: SteamInventoryClient
  let prismaMock: any

  beforeEach(async () => {
    await global.prismaTestHelper.startTransaction()
    jest.clearAllMocks()

    // Create mock Prisma client with all necessary methods
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      item: {
        findMany: jest.fn(),
        createMany: jest.fn(),
      },
      marketplacePrice: {
        createMany: jest.fn(),
      },
      userInventory: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      inventoryItem: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prismaMock)),
      $disconnect: jest.fn(),
    }

    steamClient = new SteamInventoryClient()
    service = new InventorySyncService(steamClient, prismaMock)
  })

  afterEach(() => {
    global.prismaTestHelper.rollbackTransaction()
  })

  describe('First-time Inventory Import', () => {
    // BDD: Scenario "First-time inventory import shows total value"
    it('should import Steam inventory and calculate total value', async () => {
      // Arrange
      const mockUser = {
        id: 'user-1',
        steam_id: '76561198000000001',
        persona_name: 'TestUser',
        profile_url: 'https://steamcommunity.com/id/testuser',
        avatar: 'https://avatar.url',
        last_login: new Date(),
        inventory: null,
      }

      const mockItems = [
        {
          id: 'item-ak47-redline',
          display_name: 'AK-47 | Redline (Field-Tested)',
          marketplace_prices: [
            {
              platform: 'csfloat',
              total_cost: 8.67,
            },
          ],
        },
        {
          id: 'item-awp-asiimov',
          display_name: 'AWP | Asiimov (Battle-Scarred)',
          marketplace_prices: [
            {
              platform: 'csfloat',
              total_cost: 45.20,
            },
          ],
        },
      ]

      // Mock user.findUnique
      prismaMock.user.findUnique.mockResolvedValue(mockUser)

      // Mock item.findMany (for matching)
      prismaMock.item.findMany.mockResolvedValue(mockItems)

      // Mock Steam API response
      jest.spyOn(steamClient, 'fetchInventory').mockResolvedValue({
        success: true,
        items: [
          {
            assetId: 'asset-1',
            marketHashName: 'AK-47 | Redline (Field-Tested)',
            isTradable: true,
            isMarketable: true,
          },
          {
            assetId: 'asset-2',
            marketHashName: 'AWP | Asiimov (Battle-Scarred)',
            isTradable: true,
            isMarketable: true,
          },
        ],
        totalCount: 2,
      })

      // Mock transaction return value
      prismaMock.$transaction.mockImplementation((callback: any) => {
        return callback(prismaMock)
      })

      prismaMock.userInventory.upsert.mockResolvedValue({
        id: 'inventory-1',
        user_id: 'user-1',
        total_items: 2,
        total_value: 53.87,
        sync_status: 'success',
      })

      prismaMock.inventoryItem.deleteMany.mockResolvedValue({ count: 0 })
      prismaMock.inventoryItem.createMany.mockResolvedValue({ count: 2 })

      // Act
      const result = await service.syncInventory(mockUser.id, { consentGiven: true })

      // Assert
      expect(result.success).toBe(true)
      expect(result.itemsImported).toBe(2)
      expect(result.totalValue).toBeCloseTo(53.87) // 8.67 + 45.20
      expect(result.cached).toBe(false)

      // Verify mocks were called correctly
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: { inventory: true },
      })
      expect(steamClient.fetchInventory).toHaveBeenCalledWith('76561198000000001')
      expect(prismaMock.userInventory.upsert).toHaveBeenCalled()
      expect(prismaMock.inventoryItem.createMany).toHaveBeenCalled()
    })

    it('should handle items without database matches', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          id: 'user-1',
          steam_id: '76561198000000001',
          persona_name: 'TestUser',
          profile_url: 'https://steamcommunity.com/profile',
          avatar: 'https://avatar.url',
        },
      })

      // Mock Steam item that doesn't exist in database
      const mockSteamItems = [
        {
          assetId: 'asset-unknown',
          marketHashName: 'Some Unknown Skin',
          isTradable: true,
          isMarketable: true,
        },
      ]

      // Act
      const result = await service.syncInventory(user.id)

      // Assert
      expect(result.success).toBe(true)
      expect(result.itemsImported).toBe(1)
      expect(result.unmatchedItems).toBe(1)

      // Verify InventoryItem created with NULL item_id
      const inventory = await prisma.userInventory.findUnique({
        where: { user_id: user.id },
        include: { items: true },
      })

      expect(inventory!.items[0].item_id).toBeNull()
      expect(inventory!.items[0].market_hash_name).toBe('Some Unknown Skin')
      expect(inventory!.items[0].current_value).toBeNull() // No price data
    })
  })

  describe('Privacy Handling', () => {
    // BDD: Scenario "Handle private inventory gracefully"
    it('should detect private inventory and update sync_status', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          id: 'user-1',
          steam_id: '76561198000000001',
          persona_name: 'PrivateUser',
          profile_url: 'https://steamcommunity.com/profile',
          avatar: 'https://avatar.url',
        },
      })

      // Mock Steam client to return 403 error
      jest.spyOn(steamClient, 'fetchInventory').mockResolvedValue({
        success: false,
        items: [],
        totalCount: 0,
        error: 'PRIVATE_INVENTORY',
        message: 'This Steam inventory is private',
      })

      // Act
      const result = await service.syncInventory(user.id)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('PRIVATE_INVENTORY')

      // Verify UserInventory updated with privacy status
      const inventory = await prisma.userInventory.findUnique({
        where: { user_id: user.id },
      })

      expect(inventory).toBeDefined()
      expect(inventory!.sync_status).toBe('private')
      expect(inventory!.is_public).toBe(false)
      expect(inventory!.error_message).toContain('private')
    })

    it('should track privacy state changes', async () => {
      // Arrange - User with existing private inventory
      const user = await prisma.user.create({
        data: {
          id: 'user-1',
          steam_id: '76561198000000001',
          persona_name: 'User',
          profile_url: 'https://steamcommunity.com/profile',
          avatar: 'https://avatar.url',
          inventory: {
            create: {
              steam_id: '76561198000000001',
              sync_status: 'private',
              is_public: false,
            },
          },
        },
      })

      // Mock successful fetch (user made inventory public)
      const mockSteamItems = [
        {
          assetId: 'asset-1',
          marketHashName: 'AK-47 | Redline (Field-Tested)',
          isTradable: true,
          isMarketable: true,
        },
      ]

      // Act
      const result = await service.syncInventory(user.id)

      // Assert
      expect(result.success).toBe(true)

      const inventory = await prisma.userInventory.findUnique({
        where: { user_id: user.id },
      })

      expect(inventory!.is_public).toBe(true)
      expect(inventory!.sync_status).toBe('success')
    })
  })

  describe('Rate Limiting', () => {
    // BDD: Scenario "Handle rate limit during import"
    it('should handle rate limit errors from Steam API', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          id: 'user-1',
          steam_id: '76561198000000001',
          persona_name: 'User',
          profile_url: 'https://steamcommunity.com/profile',
          avatar: 'https://avatar.url',
        },
      })

      // Mock rate limit error
      jest.spyOn(steamClient, 'fetchInventory').mockResolvedValue({
        success: false,
        items: [],
        totalCount: 0,
        error: 'RATE_LIMITED',
        message: 'Rate limit exceeded',
      })

      // Act
      const result = await service.syncInventory(user.id)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('RATE_LIMITED')

      const inventory = await prisma.userInventory.findUnique({
        where: { user_id: user.id },
      })

      expect(inventory!.sync_status).toBe('rate_limited')
      expect(inventory!.error_message).toContain('rate limit')
    })
  })

  describe('GDPR Compliance', () => {
    // BDD: Scenario "Auto-delete stale inventories (90-day retention)"
    it('should set scheduled_delete timestamp for inactive users', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          id: 'user-1',
          steam_id: '76561198000000001',
          persona_name: 'User',
          profile_url: 'https://steamcommunity.com/profile',
          avatar: 'https://avatar.url',
          last_login: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
        },
      })

      // Act
      const result = await service.syncInventory(user.id)

      // Assert
      const inventory = await prisma.userInventory.findUnique({
        where: { user_id: user.id },
      })

      expect(inventory!.scheduled_delete).toBeDefined()
      // Should be scheduled for deletion (last_login + 90 days)
      const expectedDelete = new Date(user.last_login!.getTime() + 90 * 24 * 60 * 60 * 1000)
      expect(inventory!.scheduled_delete!.getTime()).toBeCloseTo(expectedDelete.getTime(), -4) // Within 10 seconds
    })

    it('should require consent before storing inventory', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          id: 'user-1',
          steam_id: '76561198000000001',
          persona_name: 'User',
          profile_url: 'https://steamcommunity.com/profile',
          avatar: 'https://avatar.url',
        },
      })

      // Act - sync without consent
      const result = await service.syncInventory(user.id, { consentGiven: false })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('CONSENT_REQUIRED')
    })

    it('should record consent timestamp', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          id: 'user-1',
          steam_id: '76561198000000001',
          persona_name: 'User',
          profile_url: 'https://steamcommunity.com/profile',
          avatar: 'https://avatar.url',
        },
      })

      // Act
      const result = await service.syncInventory(user.id, { consentGiven: true })

      // Assert
      const inventory = await prisma.userInventory.findUnique({
        where: { user_id: user.id },
      })

      expect(inventory!.consent_given).toBe(true)
      expect(inventory!.consent_date).toBeDefined()
    })
  })

  describe('Transaction Rollback', () => {
    // Critical: Ensure database consistency on errors
    it('should rollback transaction if item insertion fails', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          id: 'user-1',
          steam_id: '76561198000000001',
          persona_name: 'User',
          profile_url: 'https://steamcommunity.com/profile',
          avatar: 'https://avatar.url',
        },
      })

      // Mock Steam items
      const mockSteamItems = [
        { assetId: 'asset-1', marketHashName: 'Item 1', isTradable: true, isMarketable: true },
        { assetId: 'asset-2', marketHashName: 'Item 2', isTradable: true, isMarketable: true },
      ]

      // Force error during transaction (e.g., database constraint violation)
      jest.spyOn(prisma.inventoryItem, 'create').mockRejectedValueOnce(new Error('Database error'))

      // Act
      const result = await service.syncInventory(user.id, { consentGiven: true })

      // Assert - operation should fail
      expect(result.success).toBe(false)

      // Verify NO UserInventory created (transaction rolled back)
      const inventory = await prisma.userInventory.findUnique({
        where: { user_id: user.id },
      })

      expect(inventory).toBeNull() // Transaction rolled back completely
    })
  })

  describe('Cache Behavior', () => {
    // BDD: Scenario "Cache prevents redundant API calls"
    it('should respect 6-hour cache TTL', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          id: 'user-1',
          steam_id: '76561198000000001',
          persona_name: 'User',
          profile_url: 'https://steamcommunity.com/profile',
          avatar: 'https://avatar.url',
          inventory: {
            create: {
              steam_id: '76561198000000001',
              sync_status: 'success',
              last_synced: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
              total_items: 5,
              total_value: 100,
            },
          },
        },
      })

      const fetchSpy = jest.spyOn(steamClient, 'fetchInventory')

      // Act - sync again (should use cache)
      const result = await service.syncInventory(user.id, { consentGiven: true })

      // Assert - should NOT call Steam API (cache hit)
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(result.success).toBe(true)
      expect(result.cached).toBe(true)
    })

    it('should bypass cache if force=true', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: {
          id: 'user-1',
          steam_id: '76561198000000001',
          persona_name: 'User',
          profile_url: 'https://steamcommunity.com/profile',
          avatar: 'https://avatar.url',
          inventory: {
            create: {
              steam_id: '76561198000000001',
              sync_status: 'success',
              last_synced: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
              total_items: 5,
              total_value: 100,
            },
          },
        },
      })

      const fetchSpy = jest.spyOn(steamClient, 'fetchInventory').mockResolvedValue({
        success: true,
        items: [],
        totalCount: 0,
      })

      // Act - force refresh
      const result = await service.syncInventory(user.id, { consentGiven: true, force: true })

      // Assert - SHOULD call Steam API (cache bypass)
      expect(fetchSpy).toHaveBeenCalled()
      expect(result.cached).toBe(false)
    })
  })
})
