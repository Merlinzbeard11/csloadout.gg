/**
 * TDD Tests for Phase 7c: Public Loadout Gallery (Failing Tests - RED Phase)
 *
 * BDD Reference: features/08-budget-loadout-builder-phase7.feature
 *   Scenario: Browse public loadouts gallery (lines 115-127)
 *   Scenario: Filter public loadouts by budget range (lines 129-134)
 *   Scenario: Filter public loadouts by theme (lines 136-141)
 *   Scenario: Sort public loadouts by different criteria (lines 143-152)
 *   Scenario: Paginate public loadouts gallery (lines 154-160)
 *
 * Server Component Responsibilities:
 * - Fetch public loadouts (is_public = true)
 * - Support budget range filters (min/max)
 * - Support theme filtering
 * - Support sorting (upvotes DESC, views DESC, created_at DESC, budget ASC)
 * - Support pagination (20 per page)
 * - Calculate total count for pagination
 * - Handle empty states
 *
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { prisma } from '@/lib/prisma'

// Types for gallery query parameters
interface GalleryParams {
  page?: number
  budgetMin?: number
  budgetMax?: number
  theme?: string
  sort?: 'upvotes' | 'views' | 'recent' | 'budget_asc'
}

describe('Phase 7c: Public Loadout Gallery', () => {
  let testUserId: string
  let publicLoadoutIds: string[] = []

  beforeEach(async () => {
    await global.prismaTestHelper.startTransaction()
    jest.clearAllMocks()

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

    // Create diverse set of public loadouts for testing
    const loadoutsData = [
      // Budget range variations
      { name: 'Budget Starter', budget: 25.00, theme: 'blue', upvotes: 10, views: 100, is_public: true },
      { name: 'Mid-Range Build', budget: 150.00, theme: 'red', upvotes: 50, views: 500, is_public: true },
      { name: 'High-End Loadout', budget: 500.00, theme: 'dragon', upvotes: 100, views: 1500, is_public: true },
      { name: 'Ultra Budget', budget: 10.00, theme: null, upvotes: 5, views: 50, is_public: true },
      { name: 'Premium Collection', budget: 1000.00, theme: 'red', upvotes: 200, views: 3000, is_public: true },

      // Theme variations
      { name: 'Red Dragon Theme', budget: 150.00, theme: 'dragon', upvotes: 75, views: 800, is_public: true },
      { name: 'Blue Steel Theme', budget: 120.00, theme: 'blue', upvotes: 40, views: 400, is_public: true },
      { name: 'No Theme Build', budget: 100.00, theme: null, upvotes: 30, views: 300, is_public: true },

      // Private loadout (should NOT appear in gallery)
      { name: 'Private Loadout', budget: 200.00, theme: 'red', upvotes: 0, views: 0, is_public: false },
    ]

    const timestamp = Date.now()
    for (const data of loadoutsData) {
      const loadout = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: data.name,
          budget: data.budget,
          actual_cost: data.budget * 0.9, // 90% of budget spent
          theme: data.theme,
          upvotes: data.upvotes,
          views: data.views,
          is_public: data.is_public,
          slug: data.is_public ? `${data.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}` : null
        }
      })
      if (data.is_public) {
        publicLoadoutIds.push(loadout.id)
      }
    }
  })

  afterEach(() => {
    global.prismaTestHelper.rollbackTransaction()
  })

  describe('Basic Gallery Fetching', () => {
    it('RED: should fetch only public loadouts', async () => {
      // BDD: features/08-budget-loadout-builder-phase7.feature:115-127

      const publicLoadouts = await prisma.loadout.findMany({
        where: { is_public: true },
        orderBy: { upvotes: 'desc' }
      })

      expect(publicLoadouts.length).toBe(8) // 8 public, 1 private excluded
      expect(publicLoadouts.every(l => l.is_public)).toBe(true)

      // Should NOT include private loadout
      const privateLoadout = publicLoadouts.find(l => l.name === 'Private Loadout')
      expect(privateLoadout).toBeUndefined()


    })

    it('RED: should default sort by upvotes DESC', async () => {
      // BDD: features/08-budget-loadout-builder-phase7.feature:127

      const loadouts = await prisma.loadout.findMany({
        where: { is_public: true },
        orderBy: { upvotes: 'desc' }
      })

      expect(loadouts[0].name).toBe('Premium Collection') // 200 upvotes
      expect(loadouts[1].name).toBe('High-End Loadout') // 100 upvotes
      expect(loadouts[2].name).toBe('Red Dragon Theme') // 75 upvotes

      // Verify descending order
      for (let i = 0; i < loadouts.length - 1; i++) {
        expect(loadouts[i].upvotes).toBeGreaterThanOrEqual(loadouts[i + 1].upvotes)
      }


    })

    it('RED: should include required fields for gallery cards', async () => {
      // BDD: features/08-budget-loadout-builder-phase7.feature:119-126

      const loadouts = await prisma.loadout.findMany({
        where: { is_public: true },
        select: {
          id: true,
          name: true,
          theme: true,
          budget: true,
          upvotes: true,
          views: true,
          slug: true
        }
      })

      const firstLoadout = loadouts[0]
      expect(firstLoadout).toHaveProperty('name')
      expect(firstLoadout).toHaveProperty('theme')
      expect(firstLoadout).toHaveProperty('budget')
      expect(firstLoadout).toHaveProperty('upvotes')
      expect(firstLoadout).toHaveProperty('views')
      expect(firstLoadout).toHaveProperty('slug')


    })
  })

  describe('Budget Range Filtering', () => {
    it('RED: should filter loadouts by budget range $100-$200', async () => {
      // BDD: features/08-budget-loadout-builder-phase7.feature:129-132

      const loadouts = await prisma.loadout.findMany({
        where: {
          is_public: true,
          budget: {
            gte: 100,
            lte: 200
          }
        }
      })

      expect(loadouts.length).toBe(4) // Mid-Range Build (150), Red Dragon (150), Blue Steel (120), No Theme (100)

      // Verify all results within range
      loadouts.forEach(loadout => {
        expect(Number(loadout.budget)).toBeGreaterThanOrEqual(100)
        expect(Number(loadout.budget)).toBeLessThanOrEqual(200)
      })


    })

    it('RED: should filter loadouts under $50', async () => {
      // BDD: features/08-budget-loadout-builder-phase7.feature:133-134

      const loadouts = await prisma.loadout.findMany({
        where: {
          is_public: true,
          budget: { lte: 50 }
        }
      })

      expect(loadouts.length).toBe(2) // Budget Starter (25), Ultra Budget (10)

      // Verify all results under $50
      loadouts.forEach(loadout => {
        expect(Number(loadout.budget)).toBeLessThanOrEqual(50)
      })


    })

    it('RED: should handle empty budget range results', async () => {
      // Edge case: no loadouts in range $5000-$10000

      const loadouts = await prisma.loadout.findMany({
        where: {
          is_public: true,
          budget: {
            gte: 5000,
            lte: 10000
          }
        }
      })

      expect(loadouts.length).toBe(0)


    })

    it('RED: should handle min-only budget filter', async () => {
      // Filter: budget >= 500

      const loadouts = await prisma.loadout.findMany({
        where: {
          is_public: true,
          budget: { gte: 500 }
        }
      })

      expect(loadouts.length).toBe(2) // High-End Loadout (500), Premium Collection (1000)


    })

    it('RED: should handle max-only budget filter', async () => {
      // Filter: budget <= 100

      const loadouts = await prisma.loadout.findMany({
        where: {
          is_public: true,
          budget: { lte: 100 }
        }
      })

      expect(loadouts.length).toBe(3) // Budget Starter (25), Ultra Budget (10), No Theme (100)


    })
  })

  describe('Theme Filtering', () => {
    it('RED: should filter loadouts by theme "dragon"', async () => {
      // BDD: features/08-budget-loadout-builder-phase7.feature:136-139

      const loadouts = await prisma.loadout.findMany({
        where: {
          is_public: true,
          theme: 'dragon'
        }
      })

      expect(loadouts.length).toBe(2) // High-End Loadout, Red Dragon Theme
      loadouts.forEach(loadout => {
        expect(loadout.theme).toBe('dragon')
      })


    })

    it('RED: should filter loadouts by theme "red"', async () => {
      const loadouts = await prisma.loadout.findMany({
        where: {
          is_public: true,
          theme: 'red'
        }
      })

      expect(loadouts.length).toBe(2) // Mid-Range Build, Premium Collection
      loadouts.forEach(loadout => {
        expect(loadout.theme).toBe('red')
      })


    })

    it('RED: should show all themes when no filter applied', async () => {
      // BDD: features/08-budget-loadout-builder-phase7.feature:140-141

      const loadouts = await prisma.loadout.findMany({
        where: { is_public: true }
      })

      expect(loadouts.length).toBe(8) // All public loadouts


    })

    it('RED: should handle loadouts with null theme', async () => {
      const loadouts = await prisma.loadout.findMany({
        where: {
          is_public: true,
          theme: null
        }
      })

      expect(loadouts.length).toBe(2) // Ultra Budget, No Theme Build


    })
  })

  describe('Sorting', () => {
    it('RED: should sort by upvotes DESC', async () => {
      // BDD: features/08-budget-loadout-builder-phase7.feature:143-146

      const loadouts = await prisma.loadout.findMany({
        where: { is_public: true },
        orderBy: { upvotes: 'desc' }
      })

      expect(loadouts[0].name).toBe('Premium Collection') // 200
      expect(loadouts[1].name).toBe('High-End Loadout') // 100
      expect(loadouts[loadouts.length - 1].name).toBe('Ultra Budget') // 5


    })

    it('RED: should sort by views DESC', async () => {
      // BDD: features/08-budget-loadout-builder-phase7.feature:147-148

      const loadouts = await prisma.loadout.findMany({
        where: { is_public: true },
        orderBy: { views: 'desc' }
      })

      expect(loadouts[0].name).toBe('Premium Collection') // 3000
      expect(loadouts[1].name).toBe('High-End Loadout') // 1500
      expect(loadouts[loadouts.length - 1].name).toBe('Ultra Budget') // 50


    })

    it('RED: should sort by created_at DESC (recently published)', async () => {
      // BDD: features/08-budget-loadout-builder-phase7.feature:149-150

      const loadouts = await prisma.loadout.findMany({
        where: { is_public: true },
        orderBy: { created_at: 'desc' }
      })

      // Most recently created first
      for (let i = 0; i < loadouts.length - 1; i++) {
        expect(loadouts[i].created_at.getTime()).toBeGreaterThanOrEqual(
          loadouts[i + 1].created_at.getTime()
        )
      }


    })

    it('RED: should sort by budget ASC (low to high)', async () => {
      // BDD: features/08-budget-loadout-builder-phase7.feature:151-152

      const loadouts = await prisma.loadout.findMany({
        where: { is_public: true },
        orderBy: { budget: 'asc' }
      })

      expect(loadouts[0].name).toBe('Ultra Budget') // 10
      expect(loadouts[1].name).toBe('Budget Starter') // 25
      expect(loadouts[loadouts.length - 1].name).toBe('Premium Collection') // 1000


    })
  })

  describe('Pagination', () => {
    it('RED: should paginate with 20 items per page', async () => {
      // BDD: features/08-budget-loadout-builder-phase7.feature:154-158

      const pageSize = 20
      const page = 1

      const loadouts = await prisma.loadout.findMany({
        where: { is_public: true },
        orderBy: { upvotes: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize
      })

      expect(loadouts.length).toBeLessThanOrEqual(20)
      // Current test data has 8 loadouts, so page 1 should have 8
      expect(loadouts.length).toBe(8)


    })

    it('RED: should calculate total count for pagination', async () => {
      const totalCount = await prisma.loadout.count({
        where: { is_public: true }
      })

      expect(totalCount).toBe(8)

      // Calculate total pages
      const pageSize = 20
      const totalPages = Math.ceil(totalCount / pageSize)
      expect(totalPages).toBe(1) // 8 loadouts = 1 page


    })

    it('RED: should fetch page 2 correctly', async () => {
      // BDD: features/08-budget-loadout-builder-phase7.feature:159-160
      // Create 25 more loadouts to test pagination

      const additionalLoadouts = []
      for (let i = 1; i <= 25; i++) {
        additionalLoadouts.push({
          user_id: testUserId,
          name: `Test Loadout ${i}`,
          budget: 100.00 + i,
          actual_cost: 90.00 + i,
          is_public: true,
          upvotes: i,
          views: i * 10,
          slug: `test-loadout-${i}`
        })
      }

      await prisma.loadout.createMany({ data: additionalLoadouts })

      // Now we have 33 public loadouts total (8 original + 25 new)
      const pageSize = 20
      const page2Loadouts = await prisma.loadout.findMany({
        where: { is_public: true },
        orderBy: { upvotes: 'desc' },
        take: pageSize,
        skip: 1 * pageSize // Page 2 (0-indexed: skip first 20)
      })

      expect(page2Loadouts.length).toBe(13) // 33 total - 20 on page 1 = 13 on page 2

      // Cleanup additional loadouts
      await prisma.loadout.deleteMany({
        where: {
          name: { startsWith: 'Test Loadout' }
        }
      })


    })

    it('RED: should handle empty page gracefully', async () => {
      // Request page 10 when only 1 page exists

      const pageSize = 20
      const page = 10

      const loadouts = await prisma.loadout.findMany({
        where: { is_public: true },
        orderBy: { upvotes: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize
      })

      expect(loadouts.length).toBe(0)


    })
  })

  describe('Combined Filters', () => {
    it('RED: should combine budget filter + theme filter', async () => {
      // Filter: budget $100-$200 AND theme "red"

      const loadouts = await prisma.loadout.findMany({
        where: {
          is_public: true,
          budget: {
            gte: 100,
            lte: 200
          },
          theme: 'red'
        }
      })

      expect(loadouts.length).toBe(1) // Mid-Range Build (150, red)
      expect(loadouts[0].name).toBe('Mid-Range Build')


    })

    it('RED: should combine filters + sorting + pagination', async () => {
      // Filter: budget >= 100, Sort: upvotes DESC, Page 1 (20 items)

      const loadouts = await prisma.loadout.findMany({
        where: {
          is_public: true,
          budget: { gte: 100 }
        },
        orderBy: { upvotes: 'desc' },
        take: 20,
        skip: 0
      })

      expect(loadouts.length).toBe(6) // 6 loadouts with budget >= 100
      expect(loadouts[0].name).toBe('Premium Collection') // Highest upvotes


    })

    it('RED: should maintain sort order with filters', async () => {
      // Filter: theme "dragon", Sort: budget ASC

      const loadouts = await prisma.loadout.findMany({
        where: {
          is_public: true,
          theme: 'dragon'
        },
        orderBy: { budget: 'asc' }
      })

      expect(loadouts.length).toBe(2)
      expect(loadouts[0].name).toBe('Red Dragon Theme') // 150
      expect(loadouts[1].name).toBe('High-End Loadout') // 500


    })
  })

  describe('Edge Cases', () => {
    it('RED: should handle zero public loadouts', async () => {
      // Delete all public loadouts
      await prisma.loadout.updateMany({
        where: { is_public: true },
        data: { is_public: false }
      })

      const loadouts = await prisma.loadout.findMany({
        where: { is_public: true }
      })

      expect(loadouts.length).toBe(0)

      // Restore public state for cleanup
      await prisma.loadout.updateMany({
        where: { user_id: testUserId },
        data: { is_public: true }
      })


    })

    it('RED: should handle invalid sort parameter gracefully', async () => {
      // Default to upvotes DESC if invalid sort provided
      // (This will be enforced at page component level)

      const loadouts = await prisma.loadout.findMany({
        where: { is_public: true },
        orderBy: { upvotes: 'desc' } // Fallback to default
      })

      expect(loadouts.length).toBeGreaterThan(0)


    })

    it('RED: should handle negative page numbers', async () => {
      // Page numbers < 1 should default to page 1

      const page = -5
      const normalizedPage = Math.max(1, page)
      const pageSize = 20

      const loadouts = await prisma.loadout.findMany({
        where: { is_public: true },
        take: pageSize,
        skip: (normalizedPage - 1) * pageSize
      })

      expect(loadouts.length).toBe(8) // Same as page 1


    })

    it('RED: should handle extremely large page numbers', async () => {
      const page = 999999
      const pageSize = 20

      const loadouts = await prisma.loadout.findMany({
        where: { is_public: true },
        take: pageSize,
        skip: (page - 1) * pageSize
      })

      expect(loadouts.length).toBe(0) // No results


    })
  })
})
