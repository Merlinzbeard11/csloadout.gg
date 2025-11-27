/**
 * Feature 08 Phase 4: Loadouts API Tests
 *
 * BDD Reference: features/08-budget-loadout-builder-phase4.feature
 *
 * Tests REST API endpoints for loadout operations:
 * - GET /api/loadouts (list)
 * - POST /api/loadouts (create)
 * - GET /api/loadouts/:id (retrieve)
 * - PUT /api/loadouts/:id (update)
 * - DELETE /api/loadouts/:id (delete)
 * - POST /api/loadouts/:id/allocate (budget algorithm)
 *
 * Testing Approach:
 * - Direct function invocation (not HTTP requests)
 * - Mock getSessionFromRequest for authentication
 * - Real database operations against test database
 * - Validate HTTP status codes and response formats
 *
 * @jest-environment node
 */

import { PrismaClient } from '@prisma/client'
import { GET as getLoadouts, POST as createLoadout } from '../route'
import {
  GET as getLoadout,
  PUT as updateLoadout,
  DELETE as deleteLoadout,
} from '../[id]/route'
import { POST as allocateBudget } from '../[id]/allocate/route'
import * as sessionModule from '@/lib/auth/session'
import type { Session } from '@/lib/auth/session'

const prisma = new PrismaClient()

// Mock getSessionFromRequest
jest.mock('@/lib/auth/session', () => ({
  ...jest.requireActual('@/lib/auth/session'),
  getSessionFromRequest: jest.fn(),
}))

const mockGetSessionFromRequest = sessionModule.getSessionFromRequest as jest.MockedFunction<
  typeof sessionModule.getSessionFromRequest
>

describe('Feature 08 Phase 4 - Loadouts API', () => {
  let testUser1: any
  let testUser2: any
  let mockSession1: Session
  let mockSession2: Session

  // Generate unique IDs for test data
  const uniqueId = () => `${Date.now()}-${Math.random().toString(36).substring(7)}`

  beforeAll(async () => {
    await prisma.$connect()

    // Create test users
    testUser1 = await prisma.user.upsert({
      where: { steam_id: `76561199000000001-${uniqueId()}` },
      update: {},
      create: {
        steam_id: `76561199000000001-${uniqueId()}`,
        persona_name: 'TestUser1_API',
        profile_url: 'https://steamcommunity.com/profiles/76561199000000001',
        avatar: 'https://example.com/avatar1.jpg',
        profile_state: 1,
        has_cs2_game: true,
      },
    })

    testUser2 = await prisma.user.upsert({
      where: { steam_id: `76561199000000002-${uniqueId()}` },
      update: {},
      create: {
        steam_id: `76561199000000002-${uniqueId()}`,
        persona_name: 'TestUser2_API',
        profile_url: 'https://steamcommunity.com/profiles/76561199000000002',
        avatar: 'https://example.com/avatar2.jpg',
        profile_state: 1,
        has_cs2_game: true,
      },
    })

    // Create mock sessions
    mockSession1 = {
      user: {
        id: testUser1.id,
        steamId: testUser1.steam_id,
        personaName: testUser1.persona_name,
        profileUrl: testUser1.profile_url,
        avatar: testUser1.avatar,
        hasCS2Game: testUser1.has_cs2_game,
        lastLogin: testUser1.last_login,
      },
      sessionToken: 'mock-token-1',
      expires: new Date(Date.now() + 86400000),
    }

    mockSession2 = {
      user: {
        id: testUser2.id,
        steamId: testUser2.steam_id,
        personaName: testUser2.persona_name,
        profileUrl: testUser2.profile_url,
        avatar: testUser2.avatar,
        hasCS2Game: testUser2.has_cs2_game,
        lastLogin: testUser2.last_login,
      },
      sessionToken: 'mock-token-2',
      expires: new Date(Date.now() + 86400000),
    }
  })

  beforeEach(async () => {
    await global.prismaTestHelper.startTransaction()
    jest.clearAllMocks()
  })

  afterEach(() => {
    global.prismaTestHelper.rollbackTransaction()
  })

  afterAll(async () => {
    // Cleanup
    await prisma.loadout.deleteMany({ where: { user_id: testUser1.id } })
    await prisma.loadout.deleteMany({ where: { user_id: testUser2.id } })
    await prisma.user.delete({ where: { id: testUser1.id } })
    await prisma.user.delete({ where: { id: testUser2.id } })
    await prisma.$disconnect()
  })

  // ============================================================================
  // GET /api/loadouts - List User Loadouts
  // ============================================================================

  describe('GET /api/loadouts', () => {
    it('should list all loadouts for authenticated user', async () => {
      // Mock authentication
      mockGetSessionFromRequest.mockResolvedValue(mockSession1)

      // Create test loadouts
      await prisma.loadout.createMany({
        data: [
          { user_id: testUser1.id, name: 'Loadout 1', budget: 100.0 },
          { user_id: testUser1.id, name: 'Loadout 2', budget: 200.0 },
        ],
      })

      const request = new Request('http://localhost/api/loadouts')
      const response = await getLoadouts(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(2)
      expect(body.data[0]).toHaveProperty('id')
      expect(body.data[0]).toHaveProperty('name')
      expect(body.data[0]).toHaveProperty('budget')
    })

    it('should return empty array for user with no loadouts', async () => {
      mockGetSessionFromRequest.mockResolvedValue(mockSession1)

      // Cleanup any existing loadouts
      await prisma.loadout.deleteMany({ where: { user_id: testUser1.id } })

      const request = new Request('http://localhost/api/loadouts')
      const response = await getLoadouts(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data).toHaveLength(0)
    })

    it('should require authentication', async () => {
      mockGetSessionFromRequest.mockResolvedValue(null)

      const request = new Request('http://localhost/api/loadouts')
      const response = await getLoadouts(request)
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.success).toBe(false)
      expect(body.error.message).toBe('Authentication required')
    })

    it('should only return current users loadouts (isolation)', async () => {
      mockGetSessionFromRequest.mockResolvedValue(mockSession1)

      // Create loadouts for both users
      await prisma.loadout.create({
        data: { user_id: testUser1.id, name: 'User1 Loadout', budget: 100.0 },
      })
      await prisma.loadout.create({
        data: { user_id: testUser2.id, name: 'User2 Loadout', budget: 200.0 },
      })

      const request = new Request('http://localhost/api/loadouts')
      const response = await getLoadouts(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data).toHaveLength(1)
      expect(body.data[0].name).toBe('User1 Loadout')
    })
  })

  // ============================================================================
  // POST /api/loadouts - Create New Loadout
  // ============================================================================

  describe('POST /api/loadouts', () => {
    it('should create new loadout with valid data', async () => {
      mockGetSessionFromRequest.mockResolvedValue(mockSession1)

      const requestBody = {
        name: 'Red Dragon Budget',
        description: 'Affordable red-themed loadout',
        budget: 150.0,
        theme: 'red',
      }

      const request = new Request('http://localhost/api/loadouts', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await createLoadout(request)
      const body = await response.json()

      expect(response.status).toBe(201)
      expect(body.success).toBe(true)
      expect(body.data.name).toBe('Red Dragon Budget')
      expect(body.data.budget).toBe(150.0)
      expect(body.data.actual_cost).toBe(0.0)
      expect(body.data.is_public).toBe(false)
      expect(body.data.slug).toMatch(/^red-dragon-budget(-\d+)?$/) // Handles -2, -3, etc
    })

    it('should create loadout with custom allocation', async () => {
      mockGetSessionFromRequest.mockResolvedValue(mockSession1)

      const requestBody = {
        name: 'Custom Allocation Test',
        budget: 100.0,
        custom_allocation: {
          weapon_skins: 50.0,
          knife: 30.0,
          gloves: 20.0,
          agents: 0.0,
          music_kit: 0.0,
          charms: 0.0,
        },
      }

      const request = new Request('http://localhost/api/loadouts', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await createLoadout(request)
      const body = await response.json()

      expect(response.status).toBe(201)
      expect(body.data.custom_allocation).toBeDefined()
      expect(body.data.custom_allocation.weapon_skins).toBe(50.0)
    })

    it('should validate custom allocation percentages', async () => {
      mockGetSessionFromRequest.mockResolvedValue(mockSession1)

      const requestBody = {
        name: 'Invalid Allocation',
        budget: 100.0,
        custom_allocation: {
          weapon_skins: 60.0,
          knife: 30.0,
          gloves: 5.0, // Total: 95%
          agents: 0.0,
          music_kit: 0.0,
          charms: 0.0,
        },
      }

      const request = new Request('http://localhost/api/loadouts', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await createLoadout(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.success).toBe(false)
      expect(body.error.message).toContain('100.00%')
    })

    it('should validate required fields', async () => {
      mockGetSessionFromRequest.mockResolvedValue(mockSession1)

      const requestBody = { budget: 100.0 } // Missing name

      const request = new Request('http://localhost/api/loadouts', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await createLoadout(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error.message).toBe('Name is required')
    })

    it('should validate budget is positive', async () => {
      mockGetSessionFromRequest.mockResolvedValue(mockSession1)

      const requestBody = {
        name: 'Invalid Budget',
        budget: -50.0,
      }

      const request = new Request('http://localhost/api/loadouts', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await createLoadout(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error.message).toBe('Budget must be positive')
    })
  })

  // ============================================================================
  // GET /api/loadouts/:id - Retrieve Single Loadout
  // ============================================================================

  describe('GET /api/loadouts/:id', () => {
    it('should retrieve loadout by ID', async () => {
      mockGetSessionFromRequest.mockResolvedValue(mockSession1)

      const loadout = await prisma.loadout.create({
        data: {
          user_id: testUser1.id,
          name: 'Test Loadout',
          budget: 150.0,
        },
      })

      const request = new Request(`http://localhost/api/loadouts/${loadout.id}`)
      const response = await getLoadout(request, { params: { id: loadout.id } })
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data.id).toBe(loadout.id)
      expect(body.data.name).toBe('Test Loadout')
    })

    it('should return 404 for non-existent loadout', async () => {
      mockGetSessionFromRequest.mockResolvedValue(mockSession1)

      const fakeId = '550e8400-e29b-41d4-a716-446655440000'
      const request = new Request(`http://localhost/api/loadouts/${fakeId}`)
      const response = await getLoadout(request, { params: { id: fakeId } })
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.error.message).toBe('Loadout not found')
    })

    it('should require ownership (authorization)', async () => {
      mockGetSessionFromRequest.mockResolvedValue(mockSession2) // User 2

      const loadout = await prisma.loadout.create({
        data: {
          user_id: testUser1.id, // Owned by User 1
          name: 'User1 Loadout',
          budget: 100.0,
        },
      })

      const request = new Request(`http://localhost/api/loadouts/${loadout.id}`)
      const response = await getLoadout(request, { params: { id: loadout.id } })
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.error.message).toBe('Forbidden - not your loadout')
    })
  })

  // ============================================================================
  // PUT /api/loadouts/:id - Update Loadout
  // ============================================================================

  describe('PUT /api/loadouts/:id', () => {
    it('should update loadout name and description', async () => {
      mockGetSessionFromRequest.mockResolvedValue(mockSession1)

      const loadout = await prisma.loadout.create({
        data: {
          user_id: testUser1.id,
          name: 'Old Name',
          budget: 100.0,
        },
      })

      const requestBody = {
        name: 'New Name',
        description: 'Updated description',
      }

      const request = new Request(`http://localhost/api/loadouts/${loadout.id}`, {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      })

      const response = await updateLoadout(request, { params: { id: loadout.id } })
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data.name).toBe('New Name')
      expect(body.data.description).toBe('Updated description')
    })

    it('should return 404 for non-existent loadout', async () => {
      mockGetSessionFromRequest.mockResolvedValue(mockSession1)

      const fakeId = '550e8400-e29b-41d4-a716-446655440000'
      const requestBody = { name: 'New Name' }

      const request = new Request(`http://localhost/api/loadouts/${fakeId}`, {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      })

      const response = await updateLoadout(request, { params: { id: fakeId } })
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.error.message).toBe('Loadout not found')
    })

    it('should require ownership', async () => {
      mockGetSessionFromRequest.mockResolvedValue(mockSession2) // User 2

      const loadout = await prisma.loadout.create({
        data: {
          user_id: testUser1.id, // Owned by User 1
          name: 'User1 Loadout',
          budget: 100.0,
        },
      })

      const requestBody = { name: 'Hacked Name' }

      const request = new Request(`http://localhost/api/loadouts/${loadout.id}`, {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      })

      const response = await updateLoadout(request, { params: { id: loadout.id } })
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.error.message).toBe('Forbidden - not your loadout')
    })
  })

  // ============================================================================
  // DELETE /api/loadouts/:id - Delete Loadout
  // ============================================================================

  describe('DELETE /api/loadouts/:id', () => {
    it('should delete loadout', async () => {
      mockGetSessionFromRequest.mockResolvedValue(mockSession1)

      const loadout = await prisma.loadout.create({
        data: {
          user_id: testUser1.id,
          name: 'To Be Deleted',
          budget: 100.0,
        },
      })

      const request = new Request(`http://localhost/api/loadouts/${loadout.id}`, {
        method: 'DELETE',
      })

      const response = await deleteLoadout(request, { params: { id: loadout.id } })

      expect(response.status).toBe(204)

      // Verify deletion
      const deleted = await prisma.loadout.findUnique({ where: { id: loadout.id } })
      expect(deleted).toBeNull()
    })

    it('should return 404 for non-existent loadout', async () => {
      mockGetSessionFromRequest.mockResolvedValue(mockSession1)

      const fakeId = '550e8400-e29b-41d4-a716-446655440000'
      const request = new Request(`http://localhost/api/loadouts/${fakeId}`, {
        method: 'DELETE',
      })

      const response = await deleteLoadout(request, { params: { id: fakeId } })
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.error.message).toBe('Loadout not found')
    })

    it('should require ownership', async () => {
      mockGetSessionFromRequest.mockResolvedValue(mockSession2) // User 2

      const loadout = await prisma.loadout.create({
        data: {
          user_id: testUser1.id, // Owned by User 1
          name: 'User1 Loadout',
          budget: 100.0,
        },
      })

      const request = new Request(`http://localhost/api/loadouts/${loadout.id}`, {
        method: 'DELETE',
      })

      const response = await deleteLoadout(request, { params: { id: loadout.id } })
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.error.message).toBe('Forbidden - not your loadout')
    })
  })

  // ============================================================================
  // POST /api/loadouts/:id/allocate - Run Budget Allocation Algorithm
  // ============================================================================

  describe('POST /api/loadouts/:id/allocate', () => {
    it('should run budget allocation for loadout', async () => {
      mockGetSessionFromRequest.mockResolvedValue(mockSession1)

      const loadout = await prisma.loadout.create({
        data: {
          user_id: testUser1.id,
          name: 'Test Allocation',
          budget: 150.0,
        },
      })

      const request = new Request(`http://localhost/api/loadouts/${loadout.id}/allocate`, {
        method: 'POST',
      })

      const response = await allocateBudget(request, { params: { id: loadout.id } })
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data.totalBudget).toBe(150.0)
      expect(body.data.categoryAllocations).toBeDefined()
      expect(body.data.weaponAllocations).toBeDefined()
      expect(body.data.allocationMode).toBe('preset:balance')
    })

    it('should run allocation with custom allocation', async () => {
      mockGetSessionFromRequest.mockResolvedValue(mockSession1)

      const loadout = await prisma.loadout.create({
        data: {
          user_id: testUser1.id,
          name: 'Custom Allocation',
          budget: 100.0,
          custom_allocation: {
            weapon_skins: 50.0,
            knife: 30.0,
            gloves: 20.0,
            agents: 0.0,
            music_kit: 0.0,
            charms: 0.0,
          },
        },
      })

      const request = new Request(`http://localhost/api/loadouts/${loadout.id}/allocate`, {
        method: 'POST',
      })

      const response = await allocateBudget(request, { params: { id: loadout.id } })
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data.allocationMode).toBe('custom')
    })
  })
})
