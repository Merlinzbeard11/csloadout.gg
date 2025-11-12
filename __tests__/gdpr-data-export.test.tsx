/**
 * TDD Tests for GDPR Data Export (Iteration 27)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Export inventory data (GDPR Article 15) (lines 347-356)
 *
 * Requirements:
 * - User can request complete inventory data export
 * - Export includes: inventory metadata, all items, pricing data, sync history
 * - Format: JSON file
 * - Filename: inventory-export-{timestamp}.json
 * - Complies with GDPR Article 15 (Right of Access)
 * - Response within 30 days (immediate in this implementation)
 *
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/user/export-inventory/route'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'

// Mock session
const mockGetSession = jest.fn()
jest.mock('@/lib/auth/session', () => ({
  getSession: () => mockGetSession()
}))

describe('GDPR Data Export (TDD - Iteration 27)', () => {
  let testUserId: string
  let testItemId: string

  beforeEach(async () => {
    // Clean up test data
    await prisma.inventoryItem.deleteMany({})
    await prisma.marketplacePrice.deleteMany({})
    await prisma.item.deleteMany({ where: { name: { startsWith: 'test-export-' } } })
    await prisma.userInventory.deleteMany({})
    await prisma.user.deleteMany({ where: { steam_id: { startsWith: 'test-export-' } } })

    // Create test user
    const user = await prisma.user.create({
      data: {
        steam_id: 'test-export-76561198000000001',
        persona_name: 'Export Test User',
        profile_url: 'https://steamcommunity.com/id/exporttest',
        avatar: 'https://example.com/avatar.jpg'
      }
    })
    testUserId = user.id

    // Create test item
    const item = await prisma.item.create({
      data: {
        name: 'test-export-ak47-redline',
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
        steamId: 'test-export-76561198000000001'
      }
    })
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.inventoryItem.deleteMany({})
    await prisma.marketplacePrice.deleteMany({})
    await prisma.item.deleteMany({ where: { name: { startsWith: 'test-export-' } } })
    await prisma.userInventory.deleteMany({})
    await prisma.user.deleteMany({ where: { steam_id: { startsWith: 'test-export-' } } })
  })

  it('should require authentication', async () => {
    mockGetSession.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/user/export-inventory')
    const response = await GET(request)

    expect(response.status).toBe(401)
  })

  it('should return JSON file with inventory metadata', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-export-76561198000000001',
        total_items: 5,
        total_value: 250.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        consent_date: oneHourAgo
      }
    })

    const request = new NextRequest('http://localhost:3000/api/user/export-inventory')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')

    const data = await response.json()
    expect(data).toHaveProperty('metadata')
    expect(data.metadata).toHaveProperty('totalItems', 5)
    expect(data.metadata).toHaveProperty('totalValue')
    expect(data.metadata).toHaveProperty('lastSynced')
    expect(data.metadata).toHaveProperty('syncStatus', 'success')
  })

  it('should include all inventory items in export', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-export-76561198000000001',
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

    const request = new NextRequest('http://localhost:3000/api/user/export-inventory')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()

    expect(data).toHaveProperty('items')
    expect(Array.isArray(data.items)).toBe(true)
    expect(data.items).toHaveLength(2)
    expect(data.items[0]).toHaveProperty('marketHashName')
    expect(data.items[0]).toHaveProperty('currentValue')
    expect(data.items[0]).toHaveProperty('wear')
  })

  it('should include pricing data for each item', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-export-76561198000000001',
        total_items: 1,
        total_value: 50.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        items: {
          create: {
            item: { connect: { id: testItemId } },
            steam_asset_id: '12345678901',
            market_hash_name: 'AK-47 | Redline (Field-Tested)',
            current_value: 50.00,
            wear: 'field_tested',
            quality: 'normal',
            best_platform: 'buff163'
          }
        }
      }
    })

    // Add marketplace prices
    await prisma.marketplacePrice.create({
      data: {
        item_id: testItemId,
        platform: 'buff163',
        price: 50.00,
        total_cost: 50.00,
        currency: 'USD',
        last_updated: oneHourAgo
      }
    })

    await prisma.marketplacePrice.create({
      data: {
        item_id: testItemId,
        platform: 'steam',
        price: 75.00,
        total_cost: 75.00,
        currency: 'USD',
        last_updated: oneHourAgo
      }
    })

    const request = new NextRequest('http://localhost:3000/api/user/export-inventory')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()

    expect(data.items[0]).toHaveProperty('pricing')
    expect(Array.isArray(data.items[0].pricing)).toBe(true)
    expect(data.items[0].pricing.length).toBeGreaterThan(0)
  })

  it('should include sync history timestamps', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-export-76561198000000001',
        total_items: 1,
        total_value: 50.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        consent_date: oneHourAgo
      }
    })

    const request = new NextRequest('http://localhost:3000/api/user/export-inventory')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()

    expect(data).toHaveProperty('syncHistory')
    expect(data.syncHistory).toHaveProperty('lastSynced')
    expect(data.syncHistory).toHaveProperty('consentDate')
  })

  it('should set Content-Disposition header with timestamped filename', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-export-76561198000000001',
        total_items: 1,
        total_value: 50.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true
      }
    })

    const request = new NextRequest('http://localhost:3000/api/user/export-inventory')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const contentDisposition = response.headers.get('content-disposition')
    expect(contentDisposition).toContain('attachment')
    expect(contentDisposition).toMatch(/inventory-export-\d+\.json/)
  })

  it('should handle user with no inventory gracefully', async () => {
    const request = new NextRequest('http://localhost:3000/api/user/export-inventory')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()

    expect(data).toHaveProperty('metadata')
    expect(data.metadata.totalItems).toBe(0)
    expect(data.items).toHaveLength(0)
  })

  it('should include GDPR compliance statement in export', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-export-76561198000000001',
        total_items: 1,
        total_value: 50.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true
      }
    })

    const request = new NextRequest('http://localhost:3000/api/user/export-inventory')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()

    expect(data).toHaveProperty('gdprCompliance')
    expect(data.gdprCompliance).toContain('Article 15')
  })
})
