/**
 * TDD Tests for Daily Auto-Refresh Cron Job (Iteration 26)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Daily auto-refresh for active users (lines 319-325)
 *
 * Requirements:
 * - Runs daily at 2:00 AM UTC via Vercel cron job
 * - Refreshes active users (logged in within last 7 days)
 * - Only refreshes stale inventory (last_synced > 24 hours)
 * - 5-second delay between users (rate limit protection)
 * - No user notifications sent
 * - Secured with CRON_SECRET authentication
 *
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/cron/daily-refresh/route'
import { prisma } from '@/lib/prisma'

// Mock the refresh action
const mockRefreshInventoryData = jest.fn()
jest.mock('@/actions/inventory', () => ({
  refreshInventoryData: (steamId: string) => mockRefreshInventoryData(steamId)
}))

describe('Daily Auto-Refresh Cron Job (TDD - Iteration 26)', () => {
  let testUsers: Array<{ id: string; steam_id: string }>

  beforeEach(async () => {
    // Clean up test data
    await prisma.userInventory.deleteMany({})
    await prisma.user.deleteMany({ where: { steam_id: { startsWith: 'test-cron-' } } })

    // Reset mock
    mockRefreshInventoryData.mockClear()
    mockRefreshInventoryData.mockResolvedValue({
      success: true,
      message: 'Inventory refreshed successfully'
    })

    testUsers = []
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.userInventory.deleteMany({})
    await prisma.user.deleteMany({ where: { steam_id: { startsWith: 'test-cron-' } } })
  })

  it('should require CRON_SECRET authentication', async () => {
    const request = new NextRequest('http://localhost:3000/api/cron/daily-refresh')

    const response = await GET(request)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toMatch(/unauthorized/i)
  })

  it('should accept valid CRON_SECRET in Authorization header', async () => {
    process.env.CRON_SECRET = 'test-secret-key'

    const request = new NextRequest('http://localhost:3000/api/cron/daily-refresh', {
      headers: {
        'Authorization': 'Bearer test-secret-key'
      }
    })

    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)

    delete process.env.CRON_SECRET
  })

  it('should refresh active users with stale inventory', async () => {
    process.env.CRON_SECRET = 'test-secret-key'

    // Create active user (logged in 3 days ago) with stale inventory (synced 25 hours ago)
    const user1 = await prisma.user.create({
      data: {
        steam_id: 'test-cron-76561198000000001',
        persona_name: 'Active User 1',
        profile_url: 'https://steamcommunity.com/id/user1',
        avatar: 'https://example.com/avatar1.jpg',
        last_login: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      }
    })

    await prisma.userInventory.create({
      data: {
        user_id: user1.id,
        steam_id: 'test-cron-76561198000000001',
        total_items: 5,
        total_value: 100.00,
        sync_status: 'success',
        is_public: true,
        last_synced: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago (stale)
        consent_given: true
      }
    })

    const request = new NextRequest('http://localhost:3000/api/cron/daily-refresh', {
      headers: {
        'Authorization': 'Bearer test-secret-key'
      }
    })

    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.usersProcessed).toBe(1)
    expect(mockRefreshInventoryData).toHaveBeenCalledWith('test-cron-76561198000000001')

    delete process.env.CRON_SECRET
  })

  it('should NOT refresh inactive users (logged in > 7 days ago)', async () => {
    process.env.CRON_SECRET = 'test-secret-key'

    // Create inactive user (logged in 10 days ago) with stale inventory
    const user1 = await prisma.user.create({
      data: {
        steam_id: 'test-cron-76561198000000002',
        persona_name: 'Inactive User',
        profile_url: 'https://steamcommunity.com/id/user2',
        avatar: 'https://example.com/avatar2.jpg',
        last_login: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago (inactive)
      }
    })

    await prisma.userInventory.create({
      data: {
        user_id: user1.id,
        steam_id: 'test-cron-76561198000000002',
        total_items: 5,
        total_value: 100.00,
        sync_status: 'success',
        is_public: true,
        last_synced: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago (stale)
        consent_given: true
      }
    })

    const request = new NextRequest('http://localhost:3000/api/cron/daily-refresh', {
      headers: {
        'Authorization': 'Bearer test-secret-key'
      }
    })

    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.usersProcessed).toBe(0)
    expect(mockRefreshInventoryData).not.toHaveBeenCalled()

    delete process.env.CRON_SECRET
  })

  it('should NOT refresh active users with fresh inventory (<24 hours)', async () => {
    process.env.CRON_SECRET = 'test-secret-key'

    // Create active user with fresh inventory (synced 5 hours ago)
    const user1 = await prisma.user.create({
      data: {
        steam_id: 'test-cron-76561198000000003',
        persona_name: 'Active User Fresh',
        profile_url: 'https://steamcommunity.com/id/user3',
        avatar: 'https://example.com/avatar3.jpg',
        last_login: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago (active)
      }
    })

    await prisma.userInventory.create({
      data: {
        user_id: user1.id,
        steam_id: 'test-cron-76561198000000003',
        total_items: 5,
        total_value: 100.00,
        sync_status: 'success',
        is_public: true,
        last_synced: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago (fresh)
        consent_given: true
      }
    })

    const request = new NextRequest('http://localhost:3000/api/cron/daily-refresh', {
      headers: {
        'Authorization': 'Bearer test-secret-key'
      }
    })

    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.usersProcessed).toBe(0)
    expect(mockRefreshInventoryData).not.toHaveBeenCalled()

    delete process.env.CRON_SECRET
  })

  it('should process multiple eligible users with 5-second delays', async () => {
    process.env.CRON_SECRET = 'test-secret-key'

    // Create 3 active users with stale inventory
    for (let i = 1; i <= 3; i++) {
      const user = await prisma.user.create({
        data: {
          steam_id: `test-cron-7656119800000000${i}`,
          persona_name: `Active User ${i}`,
          profile_url: `https://steamcommunity.com/id/user${i}`,
          avatar: `https://example.com/avatar${i}.jpg`,
          last_login: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        }
      })

      await prisma.userInventory.create({
        data: {
          user_id: user.id,
          steam_id: `test-cron-7656119800000000${i}`,
          total_items: 5,
          total_value: 100.00,
          sync_status: 'success',
          is_public: true,
          last_synced: new Date(Date.now() - 26 * 60 * 60 * 1000), // 26 hours ago
          consent_given: true
        }
      })
    }

    const request = new NextRequest('http://localhost:3000/api/cron/daily-refresh', {
      headers: {
        'Authorization': 'Bearer test-secret-key'
      }
    })

    const startTime = Date.now()
    const response = await GET(request)
    const duration = Date.now() - startTime

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.usersProcessed).toBe(3)
    expect(mockRefreshInventoryData).toHaveBeenCalledTimes(3)

    // Verify 5-second delays: 3 users = 2 delays = ~10 seconds minimum
    // Allow some variance for processing time
    expect(duration).toBeGreaterThanOrEqual(10000) // At least 10 seconds
    expect(duration).toBeLessThan(20000) // But not excessively long

    delete process.env.CRON_SECRET
  }, 30000) // 30-second timeout for this test

  it('should return detailed statistics in response', async () => {
    process.env.CRON_SECRET = 'test-secret-key'

    // Create 2 active users with stale inventory
    for (let i = 1; i <= 2; i++) {
      const user = await prisma.user.create({
        data: {
          steam_id: `test-cron-7656119800000000${i}`,
          persona_name: `Active User ${i}`,
          profile_url: `https://steamcommunity.com/id/user${i}`,
          avatar: `https://example.com/avatar${i}.jpg`,
          last_login: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        }
      })

      await prisma.userInventory.create({
        data: {
          user_id: user.id,
          steam_id: `test-cron-7656119800000000${i}`,
          total_items: 5,
          total_value: 100.00,
          sync_status: 'success',
          is_public: true,
          last_synced: new Date(Date.now() - 26 * 60 * 60 * 1000),
          consent_given: true
        }
      })
    }

    const request = new NextRequest('http://localhost:3000/api/cron/daily-refresh', {
      headers: {
        'Authorization': 'Bearer test-secret-key'
      }
    })

    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('success', true)
    expect(data).toHaveProperty('usersProcessed', 2)
    expect(data).toHaveProperty('totalEligible')
    expect(data).toHaveProperty('duration')
    expect(data).toHaveProperty('timestamp')

    delete process.env.CRON_SECRET
  }, 20000) // 20-second timeout
})
