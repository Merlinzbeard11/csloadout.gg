/**
 * Inventory API Routes - Failing Tests (TDD RED Phase)
 *
 * BDD Reference: features/07-inventory-import.feature
 *
 * API Routes:
 * - GET /api/inventory - Get user's cached inventory
 * - POST /api/inventory/sync - Trigger inventory synchronization
 * - DELETE /api/inventory - Delete inventory data (GDPR)
 *
 * Authentication:
 * - All routes require valid session
 * - Session contains user_id for database queries
 *
 * @jest-environment node
 */

import { GET, POST, DELETE } from '../route'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    session: {
      findUnique: jest.fn(),
    },
    userInventory: {
      findUnique: jest.fn(),
      delete: jest.fn(),
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

describe('GET /api/inventory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // BDD: Scenario "Cache prevents redundant API calls"
  it('should return cached inventory for authenticated user', async () => {
    // Arrange
    const sessionToken = 'valid-session-token'
    const mockSession = {
      id: 'session-1',
      user_id: 'user-1',
      expires: new Date(Date.now() + 86400000), // Tomorrow
    }
    const mockInventory = {
      id: 'inventory-1',
      user_id: 'user-1',
      total_items: 247,
      total_value: 1532.45,
      last_synced: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      sync_status: 'success',
      is_public: true,
    }

    ;(prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.userInventory.findUnique as jest.Mock).mockResolvedValue(mockInventory)

    const request = new NextRequest('http://localhost:3000/api/inventory', {
      method: 'GET',
      headers: {
        cookie: `session_token=${sessionToken}`,
      },
    })

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.total_items).toBe(247)
    expect(data.total_value).toBe(1532.45)
    expect(data.sync_status).toBe('success')
  })

  it('should return 401 if no session token provided', async () => {
    // Arrange
    const request = new NextRequest('http://localhost:3000/api/inventory', {
      method: 'GET',
    })

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(data.error).toContain('Unauthorized')
  })

  it('should return 401 if session is expired', async () => {
    // Arrange
    const sessionToken = 'expired-session-token'
    const mockSession = {
      id: 'session-1',
      user_id: 'user-1',
      expires: new Date(Date.now() - 86400000), // Yesterday
    }

    ;(prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession)

    const request = new NextRequest('http://localhost:3000/api/inventory', {
      method: 'GET',
      headers: {
        cookie: `session_token=${sessionToken}`,
      },
    })

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(data.error).toContain('Session expired')
  })

  it('should return 404 if user has no inventory', async () => {
    // Arrange
    const sessionToken = 'valid-session-token'
    const mockSession = {
      id: 'session-1',
      user_id: 'user-1',
      expires: new Date(Date.now() + 86400000),
    }

    ;(prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.userInventory.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/inventory', {
      method: 'GET',
      headers: {
        cookie: `session_token=${sessionToken}`,
      },
    })

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(data.error).toContain('No inventory found')
  })
})

describe('POST /api/inventory/sync', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // BDD: Scenario "First-time inventory import shows total value"
  it('should trigger inventory sync for authenticated user', async () => {
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
      body: JSON.stringify({ consentGiven: true }),
    })

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.itemsImported).toBe(247)
    expect(data.totalValue).toBe(1532.45)
    expect(mockSyncInventory).toHaveBeenCalledWith('user-1', { consentGiven: true })
  })

  // BDD: Scenario "Handle private inventory gracefully"
  it('should return error if inventory is private', async () => {
    // Arrange
    const sessionToken = 'valid-session-token'
    const mockSession = {
      id: 'session-1',
      user_id: 'user-1',
      expires: new Date(Date.now() + 86400000),
    }
    const mockSyncResult = {
      success: false,
      error: 'PRIVATE_INVENTORY',
      message: 'This Steam inventory is private',
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
    expect(response.status).toBe(403)
    expect(data.error).toBe('PRIVATE_INVENTORY')
    expect(data.message).toContain('private')
  })

  // BDD: Scenario "Require consent before storing inventory"
  it('should require GDPR consent', async () => {
    // Arrange
    const sessionToken = 'valid-session-token'
    const mockSession = {
      id: 'session-1',
      user_id: 'user-1',
      expires: new Date(Date.now() + 86400000),
    }

    ;(prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession)

    const request = new NextRequest('http://localhost:3000/api/inventory/sync', {
      method: 'POST',
      headers: {
        cookie: `session_token=${sessionToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ consentGiven: false }),
    })

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(data.error).toContain('Consent required')
  })

  it('should return 401 if not authenticated', async () => {
    // Arrange
    const request = new NextRequest('http://localhost:3000/api/inventory/sync', {
      method: 'POST',
    })

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(data.error).toContain('Unauthorized')
  })
})

describe('DELETE /api/inventory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // BDD: Scenario "Delete inventory data (GDPR Article 17 - Right to be Forgotten)"
  it('should delete user inventory when requested', async () => {
    // Arrange
    const sessionToken = 'valid-session-token'
    const mockSession = {
      id: 'session-1',
      user_id: 'user-1',
      expires: new Date(Date.now() + 86400000),
    }

    ;(prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.userInventory.delete as jest.Mock).mockResolvedValue({ id: 'inventory-1' })

    const request = new NextRequest('http://localhost:3000/api/inventory', {
      method: 'DELETE',
      headers: {
        cookie: `session_token=${sessionToken}`,
      },
    })

    // Act
    const response = await DELETE(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toContain('deleted')
    expect(prisma.userInventory.delete).toHaveBeenCalledWith({
      where: { user_id: 'user-1' },
    })
  })

  it('should return 401 if not authenticated', async () => {
    // Arrange
    const request = new NextRequest('http://localhost:3000/api/inventory', {
      method: 'DELETE',
    })

    // Act
    const response = await DELETE(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(data.error).toContain('Unauthorized')
  })

  it('should handle non-existent inventory gracefully', async () => {
    // Arrange
    const sessionToken = 'valid-session-token'
    const mockSession = {
      id: 'session-1',
      user_id: 'user-1',
      expires: new Date(Date.now() + 86400000),
    }

    ;(prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.userInventory.delete as jest.Mock).mockRejectedValue({
      code: 'P2025', // Prisma "Record not found" error
    })

    const request = new NextRequest('http://localhost:3000/api/inventory', {
      method: 'DELETE',
      headers: {
        cookie: `session_token=${sessionToken}`,
      },
    })

    // Act
    const response = await DELETE(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(data.error).toContain('No inventory found')
  })
})
