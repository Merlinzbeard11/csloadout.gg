/**
 * TDD Tests for GDPR Data Deletion (Iteration 28)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Delete inventory data (GDPR Article 17) (lines 358-364)
 *
 * Requirements:
 * - User can request deletion of their inventory data
 * - All inventory records deleted (cascade to items)
 * - Audit log entry records the deletion
 * - Confirmation message shown
 * - Deletion is permanent
 * - Complies with GDPR Article 17 (Right to be Forgotten)
 *
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { DELETE } from '@/app/api/user/delete-inventory/route'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'

// Mock session
const mockGetSession = jest.fn()
jest.mock('@/lib/auth/session', () => ({
  getSession: () => mockGetSession()
}))

describe('GDPR Data Deletion (TDD - Iteration 28)', () => {
  let testUserId: string
  let testItemId: string

  beforeEach(async () => {
    // Start transaction for test isolation
    await global.prismaTestHelper.startTransaction()

    // Clear mock state
    jest.clearAllMocks()

    // Create test user
    const user = await prisma.user.create({
      data: {
        steam_id: 'test-delete-76561198000000001',
        persona_name: 'Delete Test User',
        profile_url: 'https://steamcommunity.com/id/deletetest',
        avatar: 'https://example.com/avatar.jpg'
      }
    })
    testUserId = user.id

    // Create test item
    const item = await prisma.item.create({
      data: {
        name: 'test-delete-ak47-redline',
        display_name: 'AK-47 | Redline',
        search_name: 'ak47 redline',
        type: 'weapon',
        rarity: 'classified',
        image_url: 'https://example.com/ak47-redline.png'
      }
    })
    testItemId = item.id

    // Mock session
    mockGetSession.mockResolvedValue({
      user: {
        id: testUserId,
        steamId: 'test-delete-76561198000000001'
      }
    })
  })

  afterEach(() => {
    // Rollback transaction - automatic cleanup, no manual deletion needed
    global.prismaTestHelper.rollbackTransaction()
  })

  it('should require authentication', async () => {
    mockGetSession.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/user/delete-inventory')
    const response = await DELETE(request)

    expect(response.status).toBe(401)
  })

  it('should delete all inventory records (cascade)', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    // Create inventory with items
    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-delete-76561198000000001',
        total_items: 2,
        total_value: 100.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        items: {
          create: [
            {
              item: { connect: { id: testItemId } },
              steam_asset_id: '12345678901',
              market_hash_name: 'AK-47 | Redline (Field-Tested)',
              current_value: 50.00,
              wear: 'field_tested',
              quality: 'normal',
              best_platform: 'buff163'
            },
            {
              item: { connect: { id: testItemId } },
              steam_asset_id: '12345678902',
              market_hash_name: 'AK-47 | Redline (Minimal Wear)',
              current_value: 50.00,
              wear: 'minimal_wear',
              quality: 'normal',
              best_platform: 'buff163'
            }
          ]
        }
      }
    })

    // Verify data exists before deletion
    const beforeInventory = await prisma.userInventory.findUnique({
      where: { user_id: testUserId },
      include: { items: true }
    })
    expect(beforeInventory).not.toBeNull()
    expect(beforeInventory?.items).toHaveLength(2)

    // Delete inventory
    const request = new NextRequest('http://localhost:3000/api/user/delete-inventory')
    const response = await DELETE(request)

    expect(response.status).toBe(200)

    // Verify inventory deleted
    const afterInventory = await prisma.userInventory.findUnique({
      where: { user_id: testUserId }
    })
    expect(afterInventory).toBeNull()

    // Verify items cascaded (deleted)
    const items = await prisma.inventoryItem.findMany({
      where: {
        inventory: {
          user_id: testUserId
        }
      }
    })
    expect(items).toHaveLength(0)
  })

  it('should return success message', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-delete-76561198000000001',
        total_items: 1,
        total_value: 50.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true
      }
    })

    const request = new NextRequest('http://localhost:3000/api/user/delete-inventory')
    const response = await DELETE(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.message).toMatch(/Inventory data deleted successfully/i)
  })

  it('should handle user with no inventory gracefully', async () => {
    const request = new NextRequest('http://localhost:3000/api/user/delete-inventory')
    const response = await DELETE(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.message).toContain('No inventory data found')
  })

  it('should deletion be permanent (cannot be recovered)', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-delete-76561198000000001',
        total_items: 1,
        total_value: 50.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true
      }
    })

    // Delete inventory
    const request = new NextRequest('http://localhost:3000/api/user/delete-inventory')
    await DELETE(request)

    // Try to fetch deleted inventory
    const inventory = await prisma.userInventory.findUnique({
      where: { user_id: testUserId }
    })

    expect(inventory).toBeNull()

    // Verify no soft-delete fields exist (true hard delete)
    const allInventories = await prisma.userInventory.findMany()
    const hasDeletedEntry = allInventories.some(inv => inv.user_id === testUserId)
    expect(hasDeletedEntry).toBe(false)
  })

  it('should include GDPR compliance information in response', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-delete-76561198000000001',
        total_items: 1,
        total_value: 50.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true
      }
    })

    const request = new NextRequest('http://localhost:3000/api/user/delete-inventory')
    const response = await DELETE(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('gdprCompliance')
    expect(data.gdprCompliance).toContain('Article 17')
  })

  it('should return statistics about deleted data', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-delete-76561198000000001',
        total_items: 3,
        total_value: 150.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        items: {
          create: [
            {
              item: { connect: { id: testItemId } },
              steam_asset_id: '12345678901',
              market_hash_name: 'AK-47 | Redline (Field-Tested)',
              current_value: 50.00,
              wear: 'field_tested',
              quality: 'normal',
              best_platform: 'buff163'
            },
            {
              item: { connect: { id: testItemId } },
              steam_asset_id: '12345678902',
              market_hash_name: 'AK-47 | Redline (Minimal Wear)',
              current_value: 50.00,
              wear: 'minimal_wear',
              quality: 'normal',
              best_platform: 'buff163'
            },
            {
              item: { connect: { id: testItemId } },
              steam_asset_id: '12345678903',
              market_hash_name: 'AK-47 | Redline (Factory New)',
              current_value: 50.00,
              wear: 'factory_new',
              quality: 'normal',
              best_platform: 'buff163'
            }
          ]
        }
      }
    })

    const request = new NextRequest('http://localhost:3000/api/user/delete-inventory')
    const response = await DELETE(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('deletedItems', 3)
    expect(data).toHaveProperty('deletedValue', 150.00)
  })
})
