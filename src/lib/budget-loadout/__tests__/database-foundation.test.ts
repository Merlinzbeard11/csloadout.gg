/**
 * Feature 08 Phase 1: Budget Loadout Builder - Database Foundation Tests
 *
 * BDD Reference: features/08-budget-loadout-builder-phase1.feature
 *
 * Critical Gotchas Applied:
 * - Cosmetic loadout vs in-game weapon loadout (DIFFERENT SYSTEMS)
 * - Budget weights MUST sum to exactly 1.00 (100%)
 * - Weapon charms added Oct 2025 (NEW category)
 * - Categories are cosmetic types, NOT weapon selection slots
 *
 * Test Strategy:
 * - Direct Prisma queries against test database
 * - Validate BDD scenarios with real data
 * - Test data integrity, schema, and performance
 *
 * @jest-environment node
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Feature 08 Phase 1 - Database Foundation', () => {
  beforeAll(async () => {
    // Ensure database is connected and seeded
    await prisma.$connect()
  })

  beforeEach(async () => {
    await global.prismaTestHelper.startTransaction()
  })

  afterEach(() => {
    global.prismaTestHelper.rollbackTransaction()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  // ============================================================================
  // Cosmetic Categories
  // BDD Reference: features/08-budget-loadout-builder-phase1.feature:19-63
  // ============================================================================

  describe('Cosmetic Categories', () => {
    // BDD Scenario: "Query all cosmetic categories"
    it('should return exactly 10 cosmetic categories', async () => {
      const categories = await prisma.cosmeticCategory.findMany()
      expect(categories).toHaveLength(10)
    })

    // BDD Scenario: "Query all cosmetic categories" - specific categories
    it('should include all required category IDs', async () => {
      const categoryIds = await prisma.cosmeticCategory.findMany({
        select: { id: true },
      })

      const ids = categoryIds.map((c) => c.id)

      expect(ids).toContain('weapon_skins')
      expect(ids).toContain('agent_ct')
      expect(ids).toContain('agent_t')
      expect(ids).toContain('knife')
      expect(ids).toContain('gloves')
      expect(ids).toContain('music_kit')
      expect(ids).toContain('stickers')
      expect(ids).toContain('patches')
      expect(ids).toContain('charms')
      expect(ids).toContain('graffiti')
    })

    // BDD Scenario: "Cosmetic categories have correct metadata"
    it('should have correct metadata for weapon_skins category', async () => {
      const weaponSkins = await prisma.cosmeticCategory.findUnique({
        where: { id: 'weapon_skins' },
      })

      expect(weaponSkins).not.toBeNull()
      expect(weaponSkins?.name).toBe('Weapon Skins')
      expect(weaponSkins?.category_type).toBe('weapon')
      expect(weaponSkins?.sort_order).toBe(1)
      expect(weaponSkins?.is_required).toBe(true)
      expect(weaponSkins?.release_date).toEqual(new Date('2013-08-13'))
    })

    // BDD Scenario: "Weapon charms are marked as new"
    it('should have correct metadata for charms category', async () => {
      const charms = await prisma.cosmeticCategory.findUnique({
        where: { id: 'charms' },
      })

      expect(charms).not.toBeNull()
      expect(charms?.name).toBe('Weapon Charms')
      expect(charms?.category_type).toBe('customization')
      expect(charms?.sort_order).toBe(9)
      expect(charms?.is_required).toBe(false)
      expect(charms?.release_date).toEqual(new Date('2025-10-01'))
      expect(charms?.description).toContain('NEW')
    })

    // BDD Scenario: "Categories are sorted by sort_order"
    it('should return categories ordered by sort_order', async () => {
      const categories = await prisma.cosmeticCategory.findMany({
        orderBy: { sort_order: 'asc' },
      })

      expect(categories[0].id).toBe('weapon_skins')
      expect(categories[1].id).toBe('agent_ct')
      expect(categories[2].id).toBe('agent_t')
      expect(categories[9].id).toBe('graffiti')
    })

    // BDD Scenario: "Identify required vs optional cosmetic categories"
    it('should identify required categories (weapon_skins only)', async () => {
      const requiredCategories = await prisma.cosmeticCategory.findMany({
        where: { is_required: true },
      })

      expect(requiredCategories).toHaveLength(1)
      expect(requiredCategories[0].id).toBe('weapon_skins')
    })

    it('should identify 9 optional categories', async () => {
      const optionalCategories = await prisma.cosmeticCategory.findMany({
        where: { is_required: false },
      })

      expect(optionalCategories).toHaveLength(9)

      const optionalIds = optionalCategories.map((c) => c.id)
      expect(optionalIds).toContain('knife')
      expect(optionalIds).toContain('gloves')
      expect(optionalIds).toContain('agent_ct')
      expect(optionalIds).toContain('agent_t')
    })
  })

  // ============================================================================
  // Weapon Usage Priorities
  // BDD Reference: features/08-budget-loadout-builder-phase1.feature:65-110
  // ============================================================================

  describe('Weapon Usage Priorities', () => {
    // BDD Scenario: "Query weapon usage priorities for budget allocation"
    it('should return at least 10 weapons', async () => {
      const weapons = await prisma.weaponUsagePriority.findMany()
      expect(weapons.length).toBeGreaterThanOrEqual(10)
    })

    it('should include essential weapons', async () => {
      const weaponTypes = await prisma.weaponUsagePriority.findMany({
        select: { weapon_type: true },
      })

      const types = weaponTypes.map((w) => w.weapon_type)

      expect(types).toContain('AK-47')
      expect(types).toContain('M4A4')
      expect(types).toContain('M4A1-S')
      expect(types).toContain('AWP')
      expect(types).toContain('Desert Eagle')
    })

    // BDD Scenario: "AK-47 has highest budget allocation weight"
    it('should have correct priority data for AK-47', async () => {
      const ak47 = await prisma.weaponUsagePriority.findUnique({
        where: { weapon_type: 'AK-47' },
      })

      expect(ak47).not.toBeNull()
      expect(ak47?.usage_percentage.toNumber()).toBe(95.0)
      expect(ak47?.budget_weight.toNumber()).toBe(0.25)
      expect(ak47?.is_essential).toBe(true)
    })

    // BDD Scenario: "Weapon priorities sum to 100% budget allocation"
    it('should have budget weights that sum to exactly 1.00', async () => {
      const weapons = await prisma.weaponUsagePriority.findMany()

      const totalWeight = weapons.reduce((sum, weapon) => {
        return sum + weapon.budget_weight.toNumber()
      }, 0)

      expect(totalWeight).toBeCloseTo(1.0, 2) // Within 0.01
    })

    // BDD Scenario: "Essential weapons are identified correctly"
    it('should identify essential weapons (AK-47, M4A4, M4A1-S, AWP)', async () => {
      const essentialWeapons = await prisma.weaponUsagePriority.findMany({
        where: { is_essential: true },
      })

      const essentialTypes = essentialWeapons.map((w) => w.weapon_type)

      expect(essentialTypes).toContain('AK-47')
      expect(essentialTypes).toContain('M4A4')
      expect(essentialTypes).toContain('M4A1-S')
      expect(essentialTypes).toContain('AWP')
      expect(essentialTypes).not.toContain('P250')
      expect(essentialTypes).not.toContain('Tec-9')
    })

    // BDD Scenario: "Weapon priorities ordered by usage percentage"
    it('should order weapons by usage percentage descending', async () => {
      const weapons = await prisma.weaponUsagePriority.findMany({
        orderBy: { usage_percentage: 'desc' },
        take: 4,
      })

      expect(weapons[0].weapon_type).toBe('AK-47')
      expect(weapons[0].usage_percentage.toNumber()).toBe(95.0)

      expect(weapons[1].weapon_type).toBe('M4A4')
      expect(weapons[1].usage_percentage.toNumber()).toBe(85.0)

      expect(weapons[2].weapon_type).toBe('M4A1-S')
      expect(weapons[2].usage_percentage.toNumber()).toBe(80.0)

      expect(weapons[3].weapon_type).toBe('AWP')
      expect(weapons[3].usage_percentage.toNumber()).toBe(70.0)
    })

    // BDD Scenario: "Budget weights align with weapon importance"
    it('should have highest budget weight for AK-47 (0.25)', async () => {
      const ak47 = await prisma.weaponUsagePriority.findUnique({
        where: { weapon_type: 'AK-47' },
      })

      expect(ak47?.budget_weight.toNumber()).toBe(0.25)
    })

    it('should have lowest budget weight for P250 (0.02)', async () => {
      const p250 = await prisma.weaponUsagePriority.findUnique({
        where: { weapon_type: 'P250' },
      })

      expect(p250?.budget_weight.toNumber()).toBe(0.02)
    })
  })

  // ============================================================================
  // Data Integrity
  // BDD Reference: features/08-budget-loadout-builder-phase1.feature:112-136
  // ============================================================================

  describe('Data Integrity', () => {
    // BDD Scenario: "All cosmetic categories have unique IDs"
    it('should have unique IDs for all cosmetic categories', async () => {
      const categories = await prisma.cosmeticCategory.findMany({
        select: { id: true },
      })

      const ids = categories.map((c) => c.id)
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(ids.length)
      expect(ids.every((id) => id !== null)).toBe(true)
    })

    // BDD Scenario: "All weapon priorities have unique weapon types"
    it('should have unique weapon types for all priorities', async () => {
      const weapons = await prisma.weaponUsagePriority.findMany({
        select: { weapon_type: true },
      })

      const types = weapons.map((w) => w.weapon_type)
      const uniqueTypes = new Set(types)

      expect(uniqueTypes.size).toBe(types.length)
      expect(types.every((type) => type !== null)).toBe(true)
    })

    // BDD Scenario: "Cosmetic category release dates are valid"
    it('should have valid release dates for all categories', async () => {
      const categories = await prisma.cosmeticCategory.findMany()

      for (const category of categories) {
        if (category.release_date) {
          const releaseDate = new Date(category.release_date)
          const minDate = new Date('2013-01-01')
          const maxDate = new Date('2026-01-01')

          expect(releaseDate.getTime()).toBeGreaterThanOrEqual(minDate.getTime())
          expect(releaseDate.getTime()).toBeLessThanOrEqual(maxDate.getTime())
        }
      }
    })

    it('should have weapon_skins as oldest category and charms as newest', async () => {
      const categories = await prisma.cosmeticCategory.findMany({
        where: {
          release_date: { not: null },
        },
        orderBy: [{ release_date: 'asc' }, { id: 'asc' }],
      })

      // weapon_skins and knife both have 2013-08-13, but weapon_skins should come first by ID
      const oldestIds = categories.slice(0, 2).map((c) => c.id)
      expect(oldestIds).toContain('weapon_skins')
      expect(oldestIds).toContain('knife')
      expect(categories[categories.length - 1].id).toBe('charms')
    })

    // BDD Scenario: "Weapon budget weights are valid percentages"
    it('should have budget weights between 0.00 and 1.00', async () => {
      const weapons = await prisma.weaponUsagePriority.findMany()

      for (const weapon of weapons) {
        const weight = weapon.budget_weight.toNumber()
        expect(weight).toBeGreaterThanOrEqual(0.0)
        expect(weight).toBeLessThanOrEqual(1.0)
        expect(weight).not.toBe(null)
      }
    })

    it('should not have negative budget weights', async () => {
      const weapons = await prisma.weaponUsagePriority.findMany()

      for (const weapon of weapons) {
        expect(weapon.budget_weight.toNumber()).toBeGreaterThanOrEqual(0)
      }
    })
  })

  // ============================================================================
  // Performance & Indexing
  // BDD Reference: features/08-budget-loadout-builder-phase1.feature:161-172
  // ============================================================================

  describe('Performance & Indexing', () => {
    // BDD Scenario: "Query cosmetic categories by category_type efficiently"
    it('should query categories by category_type in less than 10ms', async () => {
      const startTime = Date.now()

      const weaponCategories = await prisma.cosmeticCategory.findMany({
        where: { category_type: 'weapon' },
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(weaponCategories).toHaveLength(1)
      expect(weaponCategories[0].id).toBe('weapon_skins')
      expect(duration).toBeLessThan(10) // BDD requirement: < 10ms
    })

    // BDD Scenario: "Query essential weapons efficiently"
    it('should query essential weapons in less than 10ms', async () => {
      const startTime = Date.now()

      const essentialWeapons = await prisma.weaponUsagePriority.findMany({
        where: { is_essential: true },
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(essentialWeapons).toHaveLength(4) // AK-47, M4A4, M4A1-S, AWP
      expect(duration).toBeLessThan(10) // BDD requirement: < 10ms
    })
  })
})
