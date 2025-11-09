/**
 * Inventory Sync API Route - Failing Tests (TDD RED Phase)
 *
 * POST /api/inventory/sync - Trigger inventory synchronization
 *
 * BDD Reference: features/07-inventory-import.feature
 *
 * @jest-environment node
 */

import { POST } from '../route'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    session: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('@/lib/inventory/inventory-sync-service', () => ({
  InventorySyncService: jest.fn().mockImplementation(() => ({
    syncInventory: jest.fn(),
  })),
}))

jest.mock('@/lib/steam/steam-inventory-client', () => ({
  SteamInventoryClient: jest.fn().mockImplementation(() => ({})),
}))

import { prisma } from '@/lib/prisma'
import { InventorySyncService } from '@/lib/inventory/inventory-sync-service'

describe('POST /api/inventory/sync', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // BDD: Scenario "First-time inventory import shows total value"
  it('should trigger inventory sync and return results', async () => {
    // Arrange
    const sessionToken = 'valid-session-token'
    const mockSession = {
      id: 'session-1',
      user_id: 'user-1',
      expires: new Date(Date.now() + 86400000),
    }
    const mockSyncResult = {
      success: true,
      itemsImported: 247,
      totalValue: 1532.45,
      cached: false,
    }

    ;(prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession)

    const mockSyncInventory = jest.fn().mockResolvedValue(mockSyncResult)
    ;(InventorySyncService as jest.Mock).mockImplementation(() => ({
      syncInventory: mockSyncInventory,
    }))

    const request = new NextRequest('http://localhost:3000/api/inventory/sync', {
      method: 'POST',
      headers: {
        cookie: `session_token=${sessionToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ consentGiven: true, force: false }),
    })

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.itemsImported).toBe(247)
    expect(data.totalValue).toBe(1532.45)
    expect(mockSyncInventory).toHaveBeenCalledWith('user-1', {
      consentGiven: true,
      force: false,
    })
  })

  // BDD: Scenario "Bypass cache with force refresh"
  it('should support force refresh parameter', async () => {
    // Arrange
    const sessionToken = 'valid-session-token'
    const mockSession = {
      id: 'session-1',
      user_id: 'user-1',
      expires: new Date(Date.now() + 86400000),
    }
    const mockSyncResult = {
      success: true,
      itemsImported: 247,
      totalValue: 1532.45,
      cached: false,
    }

    ;(prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession)

    const mockSyncInventory = jest.fn().mockResolvedValue(mockSyncResult)
    ;(InventorySyncService as jest.Mock).mockImplementation(() => ({
      syncInventory: mockSyncInventory,
    }))

    const request = new NextRequest('http://localhost:3000/api/inventory/sync', {
      method: 'POST',
      headers: {
        cookie: `session_token=${sessionToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ consentGiven: true, force: true }),
    })

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(mockSyncInventory).toHaveBeenCalledWith('user-1', {
      consentGiven: true,
      force: true,
    })
  })

  // BDD: Scenario "Handle rate limit during import"
  it('should return 429 if rate limited by Steam', async () => {
    // Arrange
    const sessionToken = 'valid-session-token'
    const mockSession = {
      id: 'session-1',
      user_id: 'user-1',
      expires: new Date(Date.now() + 86400000),
    }
    const mockSyncResult = {
      success: false,
      error: 'RATE_LIMITED',
      message: 'Rate limit exceeded. Please try again in a few minutes.',
    }

    ;(prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession)

    const mockSyncInventory = jest.fn().mockResolvedValue(mockSyncResult)
    ;(InventorySyncService as jest.Mock).mockImplementation(() => ({
      syncInventory: mockSyncInventory,
    }))

    const request = new NextRequest('http://localhost:3000/api/inventory/sync', {
      method: 'POST',
      headers: {
        cookie: `session_token=${sessionToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ consentGiven: true }),
    })

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(429)
    expect(data.error).toBe('RATE_LIMITED')
    expect(data.message).toContain('rate limit')
  })
})
