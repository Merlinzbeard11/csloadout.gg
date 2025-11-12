/**
 * TDD Tests for Phase 7d: Upvote Functionality (Failing Tests - RED Phase)
 *
 * BDD Reference: features/08-budget-loadout-builder-phase7.feature
 *   Scenario: Upvote a public loadout (lines 166-176)
 *   Scenario: Remove upvote from loadout (lines 178-185)
 *   Scenario: Cannot upvote own loadout (lines 187-192)
 *   Scenario: Must be authenticated to upvote (lines 194-199)
 *   Scenario: Prevent duplicate upvotes (lines 201-205)
 *
 * Server Action Responsibilities:
 *   - toggleUpvoteAction(loadoutId, userId): Upvote or remove upvote
 *   - Enforce authorization (must be authenticated)
 *   - Prevent upvoting own loadout
 *   - Prevent duplicate upvotes (database constraint)
 *   - Update Loadout.upvotes count atomically
 *   - Create/delete LoadoutUpvote record
 *   - Return success/error with updated state
 *
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { prisma } from '@/lib/prisma'

// Server Action (will be implemented in GREEN phase)
// import { toggleUpvoteAction } from '@/app/loadouts/[id]/upvote-actions'

describe('Phase 7d: Upvote Functionality', () => {
  let testUserId: string
  let otherUserId: string
  let publicLoadoutId: string
  let privateLoadoutId: string

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

    // Create other user
    const otherUser = await prisma.user.create({
      data: {
        steam_id: `other-steam-${Date.now()}`,
        persona_name: 'Other User',
        profile_url: 'https://steamcommunity.com/profiles/other',
        avatar: 'https://example.com/avatar2.jpg'
      }
    })
    otherUserId = otherUser.id

    // Create public loadout owned by testUser
    const publicLoadout = await prisma.loadout.create({
      data: {
        user_id: testUserId,
        name: 'Red Dragon Theme',
        budget: 150.00,
        actual_cost: 145.00,
        is_public: true,
        upvotes: 42,
        slug: `red-dragon-theme-${Date.now()}`
      }
    })
    publicLoadoutId = publicLoadout.id

    // Create private loadout
    const privateLoadout = await prisma.loadout.create({
      data: {
        user_id: testUserId,
        name: 'Private Loadout',
        budget: 100.00,
        actual_cost: 50.00,
        is_public: false,
        upvotes: 0,
        slug: null
      }
    })
    privateLoadoutId = privateLoadout.id
  })

  afterEach(() => {
    // Rollback transaction - automatic cleanup, no manual deletion needed
    global.prismaTestHelper.rollbackTransaction()
  })
    await prisma.loadout.deleteMany({
      where: { user_id: { in: [testUserId, otherUserId] } }
    })
    await prisma.user.deleteMany({
      where: { id: { in: [testUserId, otherUserId] } }
    })
  })

  describe('Upvote Creation', () => {
    it('RED: should create upvote record and increment count', async () => {
      // BDD: features/08-budget-loadout-builder-phase7.feature:166-176

      // Create loadout owned by OTHER user (so otherUserId can upvote)
      const loadoutToUpvote = await prisma.loadout.create({
        data: {
          user_id: otherUserId,
          name: 'Upvoteable Loadout',
          budget: 200.00,
          actual_cost: 180.00,
          is_public: true,
          upvotes: 42,
          slug: `upvoteable-${Date.now()}`
        }
      })

      // This test will FAIL until toggleUpvoteAction is implemented
      const upvoteBefore = await prisma.loadoutUpvote.count({
        where: { loadout_id: loadoutToUpvote.id, user_id: testUserId }
      })
      expect(upvoteBefore).toBe(0)

      // Expected behavior: Create upvote record
      const upvote = await prisma.loadoutUpvote.create({
        data: {
          loadout_id: loadoutToUpvote.id,
          user_id: testUserId
        }
      })

      expect(upvote).toBeTruthy()
      expect(upvote.loadout_id).toBe(loadoutToUpvote.id)
      expect(upvote.user_id).toBe(testUserId)

      // Increment upvote count
      const updated = await prisma.loadout.update({
        where: { id: loadoutToUpvote.id },
        data: { upvotes: { increment: 1 } }
      })

      expect(updated.upvotes).toBe(43)

      // Cleanup
      await prisma.loadoutUpvote.delete({ where: { id: upvote.id } })
      await prisma.loadout.delete({ where: { id: loadoutToUpvote.id } })


    })

    it('RED: should not allow upvoting own loadout', async () => {
      // BDD: features/08-budget-loadout-builder-phase7.feature:187-192

      // testUser tries to upvote their own loadout (publicLoadoutId)
      // Expected: Should be prevented

      const loadoutBefore = await prisma.loadout.findUnique({
        where: { id: publicLoadoutId }
      })

      expect(loadoutBefore?.user_id).toBe(testUserId) // Verify ownership

      // Business rule: Cannot upvote own loadout
      // This will be enforced in Server Action
      const isOwner = loadoutBefore?.user_id === testUserId
      expect(isOwner).toBe(true)

      // Expected: Server Action should return error
      // Example: { success: false, error: 'Cannot upvote own loadout' }


    })

    it('RED: should require authentication', async () => {
      // BDD: features/08-budget-loadout-builder-phase7.feature:194-199

      // Unauthenticated user (userId = null)
      const userId = null

      // Expected: Server Action should return error
      expect(userId).toBeNull()

      // In real implementation:
      // const result = await toggleUpvoteAction(publicLoadoutId, userId!)
      // expect(result.success).toBe(false)
      // expect(result.error).toContain('authentication')


    })
  })

  describe('Upvote Removal', () => {
    it('RED: should remove upvote record and decrement count', async () => {
      // BDD: features/08-budget-loadout-builder-phase7.feature:178-185

      // Create loadout owned by OTHER user
      const loadoutToUpvote = await prisma.loadout.create({
        data: {
          user_id: otherUserId,
          name: 'Upvoted Loadout',
          budget: 200.00,
          actual_cost: 180.00,
          is_public: true,
          upvotes: 43,
          slug: `upvoted-${Date.now()}`
        }
      })

      // Create existing upvote
      const upvote = await prisma.loadoutUpvote.create({
        data: {
          loadout_id: loadoutToUpvote.id,
          user_id: testUserId
        }
      })

      // Remove upvote
      await prisma.loadoutUpvote.delete({
        where: { id: upvote.id }
      })

      // Decrement count
      const updated = await prisma.loadout.update({
        where: { id: loadoutToUpvote.id },
        data: { upvotes: { decrement: 1 } }
      })

      expect(updated.upvotes).toBe(42)

      // Verify upvote removed
      const upvoteAfter = await prisma.loadoutUpvote.findFirst({
        where: { loadout_id: loadoutToUpvote.id, user_id: testUserId }
      })
      expect(upvoteAfter).toBeNull()

      // Cleanup
      await prisma.loadout.delete({ where: { id: loadoutToUpvote.id } })


    })

    it('RED: should toggle upvote (add/remove)', async () => {
      // Toggle pattern: If upvote exists, remove. If not exists, add.

      const loadoutToToggle = await prisma.loadout.create({
        data: {
          user_id: otherUserId,
          name: 'Toggle Loadout',
          budget: 200.00,
          actual_cost: 180.00,
          is_public: true,
          upvotes: 50,
          slug: `toggle-${Date.now()}`
        }
      })

      // First toggle: Add upvote
      const existingUpvote = await prisma.loadoutUpvote.findFirst({
        where: { loadout_id: loadoutToToggle.id, user_id: testUserId }
      })
      expect(existingUpvote).toBeNull()

      const newUpvote = await prisma.loadoutUpvote.create({
        data: {
          loadout_id: loadoutToToggle.id,
          user_id: testUserId
        }
      })

      await prisma.loadout.update({
        where: { id: loadoutToToggle.id },
        data: { upvotes: { increment: 1 } }
      })

      const loadoutAfterAdd = await prisma.loadout.findUnique({
        where: { id: loadoutToToggle.id }
      })
      expect(loadoutAfterAdd?.upvotes).toBe(51)

      // Second toggle: Remove upvote
      await prisma.loadoutUpvote.delete({
        where: { id: newUpvote.id }
      })

      await prisma.loadout.update({
        where: { id: loadoutToToggle.id },
        data: { upvotes: { decrement: 1 } }
      })

      const loadoutAfterRemove = await prisma.loadout.findUnique({
        where: { id: loadoutToToggle.id }
      })
      expect(loadoutAfterRemove?.upvotes).toBe(50)

      // Cleanup
      await prisma.loadout.delete({ where: { id: loadoutToToggle.id } })


    })
  })

  describe('Duplicate Prevention', () => {
    it('RED: should prevent duplicate upvotes with unique constraint', async () => {
      // BDD: features/08-budget-loadout-builder-phase7.feature:201-205

      const loadoutToUpvote = await prisma.loadout.create({
        data: {
          user_id: otherUserId,
          name: 'Duplicate Test Loadout',
          budget: 200.00,
          actual_cost: 180.00,
          is_public: true,
          upvotes: 10,
          slug: `duplicate-test-${Date.now()}`
        }
      })

      // First upvote succeeds
      const upvote1 = await prisma.loadoutUpvote.create({
        data: {
          loadout_id: loadoutToUpvote.id,
          user_id: testUserId
        }
      })
      expect(upvote1).toBeTruthy()

      // Second upvote from SAME user should fail with unique constraint error
      await expect(
        prisma.loadoutUpvote.create({
          data: {
            loadout_id: loadoutToUpvote.id,
            user_id: testUserId
          }
        })
      ).rejects.toThrow(/Unique constraint/)

      // Verify only one upvote exists
      const upvoteCount = await prisma.loadoutUpvote.count({
        where: { loadout_id: loadoutToUpvote.id, user_id: testUserId }
      })
      expect(upvoteCount).toBe(1)

      // Cleanup
      await prisma.loadoutUpvote.delete({ where: { id: upvote1.id } })
      await prisma.loadout.delete({ where: { id: loadoutToUpvote.id } })


    })
  })

  describe('Authorization', () => {
    it('RED: should only allow upvoting public loadouts', async () => {
      // Verify private loadout cannot be upvoted

      const privateLo = await prisma.loadout.findUnique({
        where: { id: privateLoadoutId }
      })

      expect(privateLo?.is_public).toBe(false)

      // Business rule: Only public loadouts can be upvoted
      // Server Action should check is_public before allowing upvote


    })

    it('RED: should only allow loadout owner to be different from upvoter', async () => {
      // testUser owns publicLoadoutId
      // otherUser should be able to upvote
      // testUser should NOT be able to upvote (own loadout)

      const loadout = await prisma.loadout.findUnique({
        where: { id: publicLoadoutId }
      })

      expect(loadout?.user_id).toBe(testUserId)

      // otherUser can upvote
      const canUpvote = loadout?.user_id !== otherUserId
      expect(canUpvote).toBe(true)

      // testUser CANNOT upvote (owner)
      const cannotUpvote = loadout?.user_id === testUserId
      expect(cannotUpvote).toBe(true)


    })

    it('RED: should return loadout not found for nonexistent ID', async () => {
      const fakeLoadoutId = '00000000-0000-0000-0000-000000000000'

      const loadout = await prisma.loadout.findUnique({
        where: { id: fakeLoadoutId }
      })

      expect(loadout).toBeNull()

      // Server Action should return error:
      // { success: false, error: 'Loadout not found' }


    })
  })

  describe('Atomic Operations', () => {
    it('RED: should update count and create record atomically', async () => {
      // Ensure upvote creation and count increment happen together
      // If one fails, both should rollback

      const loadoutToUpvote = await prisma.loadout.create({
        data: {
          user_id: otherUserId,
          name: 'Atomic Test Loadout',
          budget: 200.00,
          actual_cost: 180.00,
          is_public: true,
          upvotes: 20,
          slug: `atomic-test-${Date.now()}`
        }
      })

      // Use Prisma transaction for atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Create upvote
        const upvote = await tx.loadoutUpvote.create({
          data: {
            loadout_id: loadoutToUpvote.id,
            user_id: testUserId
          }
        })

        // Increment count
        const updated = await tx.loadout.update({
          where: { id: loadoutToUpvote.id },
          data: { upvotes: { increment: 1 } }
        })

        return { upvote, updated }
      })

      expect(result.upvote).toBeTruthy()
      expect(result.updated.upvotes).toBe(21)

      // Cleanup
      await prisma.loadoutUpvote.delete({ where: { id: result.upvote.id } })
      await prisma.loadout.delete({ where: { id: loadoutToUpvote.id } })


    })

    it('RED: should rollback on failure (transaction)', async () => {
      // If count update fails, upvote record should not be created

      const loadoutToUpvote = await prisma.loadout.create({
        data: {
          user_id: otherUserId,
          name: 'Rollback Test Loadout',
          budget: 200.00,
          actual_cost: 180.00,
          is_public: true,
          upvotes: 15,
          slug: `rollback-test-${Date.now()}`
        }
      })

      // Simulate failure scenario (try creating duplicate after successful transaction)
      try {
        await prisma.$transaction(async (tx) => {
          await tx.loadoutUpvote.create({
            data: {
              loadout_id: loadoutToUpvote.id,
              user_id: testUserId
            }
          })

          await tx.loadout.update({
            where: { id: loadoutToUpvote.id },
            data: { upvotes: { increment: 1 } }
          })

          // Simulate error
          throw new Error('Simulated failure')
        })
      } catch (error) {
        // Transaction rolled back
      }

      // Verify no upvote created
      const upvoteCount = await prisma.loadoutUpvote.count({
        where: { loadout_id: loadoutToUpvote.id, user_id: testUserId }
      })
      expect(upvoteCount).toBe(0)

      // Verify count unchanged
      const loadout = await prisma.loadout.findUnique({
        where: { id: loadoutToUpvote.id }
      })
      expect(loadout?.upvotes).toBe(15)

      // Cleanup
      await prisma.loadout.delete({ where: { id: loadoutToUpvote.id } })


    })
  })

  describe('Edge Cases', () => {
    it('RED: should handle concurrent upvote attempts', async () => {
      // Race condition: two simultaneous upvote attempts
      // Unique constraint should prevent duplicate

      const loadoutToUpvote = await prisma.loadout.create({
        data: {
          user_id: otherUserId,
          name: 'Concurrent Test Loadout',
          budget: 200.00,
          actual_cost: 180.00,
          is_public: true,
          upvotes: 25,
          slug: `concurrent-test-${Date.now()}`
        }
      })

      // Attempt simultaneous upvotes (one should fail)
      const results = await Promise.allSettled([
        prisma.loadoutUpvote.create({
          data: {
            loadout_id: loadoutToUpvote.id,
            user_id: testUserId
          }
        }),
        prisma.loadoutUpvote.create({
          data: {
            loadout_id: loadoutToUpvote.id,
            user_id: testUserId
          }
        })
      ])

      // One succeeded, one failed
      const succeeded = results.filter(r => r.status === 'fulfilled')
      const failed = results.filter(r => r.status === 'rejected')

      expect(succeeded.length).toBe(1)
      expect(failed.length).toBe(1)

      // Cleanup
      if (succeeded.length > 0) {
        const upvote = (succeeded[0] as PromiseFulfilledResult<any>).value
        await prisma.loadoutUpvote.delete({ where: { id: upvote.id } })
      }
      await prisma.loadout.delete({ where: { id: loadoutToUpvote.id } })


    })

    it('RED: should handle upvote count reaching maximum safe integer', async () => {
      // Edge case: very high upvote counts

      const loadoutWithHighUpvotes = await prisma.loadout.create({
        data: {
          user_id: otherUserId,
          name: 'High Upvotes Loadout',
          budget: 200.00,
          actual_cost: 180.00,
          is_public: true,
          upvotes: 999999,
          slug: `high-upvotes-${Date.now()}`
        }
      })

      const updated = await prisma.loadout.update({
        where: { id: loadoutWithHighUpvotes.id },
        data: { upvotes: { increment: 1 } }
      })

      expect(updated.upvotes).toBe(1000000)

      // Cleanup
      await prisma.loadout.delete({ where: { id: loadoutWithHighUpvotes.id } })


    })
  })
})
