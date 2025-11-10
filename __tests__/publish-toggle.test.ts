/**
 * TDD Tests for Phase 7a: Publish Toggle (Failing Tests - RED Phase)
 *
 * BDD Reference: features/08-budget-loadout-builder-phase7.feature
 *   Scenario: Make loadout public with slug generation (lines 18-26)
 *   Scenario: Generate unique slug from loadout name (lines 28-33)
 *   Scenario: Handle duplicate slugs with numeric suffix (lines 35-41)
 *   Scenario: Make public loadout private again (lines 43-50)
 *   Scenario: Only loadout owner can toggle publish status (lines 52-57)
 *
 * Server Action Responsibilities:
 * - Toggle loadout is_public field
 * - Generate URL-safe slug from loadout name
 * - Handle duplicate slugs with numeric suffix
 * - Preserve slug when making private (don't delete)
 * - Enforce authorization (only owner can toggle)
 * - Return success/error with updated loadout data
 *
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { prisma } from '@/lib/prisma'

// Server Action
import { togglePublishAction } from '@/app/loadouts/[id]/publish-actions'

describe('Phase 7a: Publish Toggle Server Action', () => {
  let testUserId: string
  let testLoadoutId: string
  let otherUserId: string

  beforeEach(async () => {
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        steam_id: `test-steam-${Date.now()}`,
        persona_name: 'Test User',
        profile_url: 'https://steamcommunity.com/profiles/test',
        avatar: 'https://example.com/avatar.jpg'
      }
    })
    testUserId = testUser.id

    // Create other user for authorization tests
    const otherUser = await prisma.user.create({
      data: {
        steam_id: `other-steam-${Date.now()}`,
        persona_name: 'Other User',
        profile_url: 'https://steamcommunity.com/profiles/other',
        avatar: 'https://example.com/avatar2.jpg'
      }
    })
    otherUserId = otherUser.id

    // Create test loadout
    const testLoadout = await prisma.loadout.create({
      data: {
        user_id: testUserId,
        name: 'Red Dragon Theme',
        budget: 150.00,
        actual_cost: 145.00,
        is_public: false,
        slug: null
      }
    })
    testLoadoutId = testLoadout.id
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.loadout.deleteMany({
      where: { user_id: { in: [testUserId, otherUserId] } }
    })
    await prisma.user.deleteMany({
      where: { id: { in: [testUserId, otherUserId] } }
    })
  })

  describe('Slug Generation', () => {
    it('RED: should generate URL-safe slug from loadout name', async () => {
      // BDD: features/08-budget-loadout-builder-phase7.feature:28-33

      const result = await togglePublishAction(testLoadoutId, testUserId)

      // Debug output
      if (!result.success) {
        console.log('Test failed with error:', result.error)
      }

      // Expected behavior:
      expect(result.success).toBe(true)
      expect(result.loadout?.slug).toBe('red-dragon-theme')
      expect(result.loadout?.is_public).toBe(true)

      // Verify slug is lowercase, hyphens, no special chars
      expect(result.loadout?.slug).toMatch(/^[a-z0-9-]+$/)
    })

    it('RED: should generate slug from loadout with special characters', async () => {
      // Create loadout with special chars
      const specialLoadout = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: 'My Awesome Loadout! (Budget Edition) #2025',
          budget: 100.00,
          actual_cost: 0,
          is_public: false,
          slug: null
        }
      })

      const result = await togglePublishAction(specialLoadout.id, testUserId)

      // Expected: special chars removed, spaces to hyphens
      expect(result.loadout?.slug).toBe('my-awesome-loadout-budget-edition-2025')

      await prisma.loadout.delete({ where: { id: specialLoadout.id } })
    })

    it('RED: should handle duplicate slugs with numeric suffix', async () => {
      // BDD: features/08-budget-loadout-builder-phase7.feature:35-41

      // Create first loadout and make it public
      const firstLoadout = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: 'Red Dragon Theme',
          budget: 150.00,
          actual_cost: 0,
          is_public: true,
          slug: 'red-dragon-theme'
        }
      })

      // Create second loadout with same name
      const secondLoadout = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: 'Red Dragon Theme',
          budget: 150.00,
          actual_cost: 0,
          is_public: false,
          slug: null
        }
      })

      const result = await togglePublishAction(secondLoadout.id, testUserId)

      // Expected: second loadout gets numeric suffix
      expect(result.loadout?.slug).toBe('red-dragon-theme-2')
      expect(result.loadout?.is_public).toBe(true)

      // Verify uniqueness in database
      const allSlugs = await prisma.loadout.findMany({
        where: { slug: { startsWith: 'red-dragon-theme' } },
        select: { slug: true }
      })
      expect(allSlugs).toHaveLength(2)

      await prisma.loadout.deleteMany({
        where: { id: { in: [firstLoadout.id, secondLoadout.id] } }
      })
    })

    it('RED: should handle multiple duplicate slugs with incrementing suffixes', async () => {
      // Create 3 loadouts with same name
      const loadout1 = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: 'Popular Theme',
          budget: 100.00,
          actual_cost: 0,
          is_public: true,
          slug: 'popular-theme'
        }
      })

      const loadout2 = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: 'Popular Theme',
          budget: 100.00,
          actual_cost: 0,
          is_public: true,
          slug: 'popular-theme-2'
        }
      })

      const loadout3 = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: 'Popular Theme',
          budget: 100.00,
          actual_cost: 0,
          is_public: false,
          slug: null
        }
      })

      // This test will FAIL until togglePublishAction is implemented
      const result = await togglePublishAction(loadout3.id, testUserId)

      // Expected: third loadout gets suffix -3
      expect(result.loadout?.slug).toBe('popular-theme-3')

      await prisma.loadout.deleteMany({
        where: { id: { in: [loadout1.id, loadout2.id, loadout3.id] } }
      })
      
    })
  })

  describe('Toggle Public/Private', () => {
    it('RED: should make private loadout public', async () => {
      // BDD: features/08-budget-loadout-builder-phase7.feature:18-26

      // Verify loadout starts private
      const beforeLoadout = await prisma.loadout.findUnique({
        where: { id: testLoadoutId },
        select: { is_public: true, slug: true }
      })
      expect(beforeLoadout?.is_public).toBe(false)
      expect(beforeLoadout?.slug).toBeNull()

      // This test will FAIL until togglePublishAction is implemented
      const result = await togglePublishAction(testLoadoutId, testUserId)

      // Expected behavior:
      expect(result.success).toBe(true)
      expect(result.message).toBe('Loadout is now public')
      expect(result.loadout?.is_public).toBe(true)
      expect(result.loadout?.slug).toBe('red-dragon-theme')

      // Verify database updated
      const afterLoadout = await prisma.loadout.findUnique({
        where: { id: testLoadoutId }
      })
      expect(afterLoadout?.is_public).toBe(true)
      expect(afterLoadout?.slug).toBe('red-dragon-theme')

    })

    it('RED: should make public loadout private', async () => {
      // BDD: features/08-budget-loadout-builder-phase7.feature:43-50

      // Make loadout public first
      await prisma.loadout.update({
        where: { id: testLoadoutId },
        data: {
          is_public: true,
          slug: 'red-dragon-theme'
        }
      })

      // This test will FAIL until togglePublishAction is implemented
      const result = await togglePublishAction(testLoadoutId, testUserId)

      // Expected: loadout made private, slug preserved
      expect(result.success).toBe(true)
      expect(result.message).toBe('Loadout is now private')
      expect(result.loadout?.is_public).toBe(false)
      expect(result.loadout?.slug).toBe('red-dragon-theme') // Preserved!

      // Verify database updated
      const afterLoadout = await prisma.loadout.findUnique({
        where: { id: testLoadoutId }
      })
      expect(afterLoadout?.is_public).toBe(false)
      expect(afterLoadout?.slug).toBe('red-dragon-theme') // NOT null

    })

    it('RED: should toggle public → private → public with same slug', async () => {
      // Make public
      const result1 = await togglePublishAction(testLoadoutId, testUserId)
      expect(result1.loadout?.is_public).toBe(true)
      expect(result1.loadout?.slug).toBe('red-dragon-theme')

      // Make private (slug preserved)
      const result2 = await togglePublishAction(testLoadoutId, testUserId)
      expect(result2.loadout?.is_public).toBe(false)
      expect(result2.loadout?.slug).toBe('red-dragon-theme')

      // Make public again (reuse same slug)
      const result3 = await togglePublishAction(testLoadoutId, testUserId)
      expect(result3.loadout?.is_public).toBe(true)
      expect(result3.loadout?.slug).toBe('red-dragon-theme') // Same slug!

      
    })
  })

  describe('Authorization', () => {
    it('RED: should reject toggle from non-owner', async () => {
      // BDD: features/08-budget-loadout-builder-phase7.feature:52-57

      // This test will FAIL until togglePublishAction is implemented
      const result = await togglePublishAction(testLoadoutId, otherUserId)

      // Expected: authorization error
      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized: You do not own this loadout')

      // Verify loadout unchanged
      const loadout = await prisma.loadout.findUnique({
        where: { id: testLoadoutId }
      })
      expect(loadout?.is_public).toBe(false)
      expect(loadout?.slug).toBeNull()

    })

    it('RED: should reject toggle for nonexistent loadout', async () => {
      const fakeLoadoutId = '00000000-0000-0000-0000-000000000000'

      // This test will FAIL until togglePublishAction is implemented
      const result = await togglePublishAction(fakeLoadoutId, testUserId)

      // Expected: not found error
      expect(result.success).toBe(false)
      expect(result.error).toBe('Loadout not found')

      
    })
  })

  describe('Edge Cases', () => {
    it('RED: should handle very long loadout names (truncate slug)', async () => {
      const longLoadout = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: 'This Is An Extremely Long Loadout Name That Should Be Truncated To Avoid Exceeding URL Length Limits And Database Constraints For Slug Fields',
          budget: 100.00,
          actual_cost: 0,
          is_public: false,
          slug: null
        }
      })

      // This test will FAIL until togglePublishAction is implemented
      const result = await togglePublishAction(longLoadout.id, testUserId)

      // Expected: slug truncated to reasonable length (e.g., 50-100 chars)
      expect(result.loadout?.slug?.length).toBeLessThanOrEqual(100)
      expect(result.loadout?.slug).toMatch(/^[a-z0-9-]+$/)

      await prisma.loadout.delete({ where: { id: longLoadout.id } })
      
    })

    it('RED: should handle loadout name with only special characters', async () => {
      const specialLoadout = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: '!@#$%^&*()',
          budget: 100.00,
          actual_cost: 0,
          is_public: false,
          slug: null
        }
      })

      // This test will FAIL until togglePublishAction is implemented
      const result = await togglePublishAction(specialLoadout.id, testUserId)

      // Expected: fallback to loadout ID or generic slug
      expect(result.loadout?.slug).toBeTruthy()
      expect(result.loadout?.slug).toMatch(/^[a-z0-9-]+$/)

      await prisma.loadout.delete({ where: { id: specialLoadout.id } })
      
    })

    it('RED: should handle concurrent toggle requests (race condition)', async () => {
      // Simulate concurrent requests
      const [result1, result2] = await Promise.all([
        togglePublishAction(testLoadoutId, testUserId),
        togglePublishAction(testLoadoutId, testUserId)
      ])

      // Expected: both succeed, final state is consistent
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)

      // Verify database is in valid state (either public or private, not undefined)
      const loadout = await prisma.loadout.findUnique({
        where: { id: testLoadoutId }
      })
      expect(typeof loadout?.is_public).toBe('boolean')
    })
  })
})
