/**
 * Feature 08 Phase 2: Budget Loadout Builder - Loadout Storage Tests
 *
 * BDD Reference: features/08-budget-loadout-builder-phase2.feature
 *
 * Critical Gotchas Applied:
 * - Cosmetic loadout vs in-game weapon loadout (DIFFERENT SYSTEMS)
 * - ONE weapon skin per weapon_type per loadout (UNIQUE constraint)
 * - Float value optimization (0.15-0.18 FT preferred)
 * - Stickers and charms stored as JSONB
 * - Slug uniqueness for SEO
 *
 * Test Strategy:
 * - Direct Prisma queries against test database
 * - Validate BDD scenarios with real data
 * - Test CRUD operations, relationships, constraints
 *
 * @jest-environment node
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Feature 08 Phase 2 - Loadout Storage', () => {
  let testUserId: string

  beforeAll(async () => {
    await prisma.$connect()

    // Create test user
    const testUser = await prisma.user.upsert({
      where: { steam_id: '76561198999999999' },
      update: {},
      create: {
        steam_id: '76561198999999999',
        persona_name: 'TestUser_LoadoutStorage',
        profile_url: 'https://steamcommunity.com/profiles/76561198999999999',
        avatar: 'https://example.com/avatar-test.jpg',
        profile_state: 1,
        has_cs2_game: true,
      },
    })

    testUserId = testUser.id
  })

  afterAll(async () => {
    // Cleanup: delete test loadouts and user
    await prisma.loadout.deleteMany({ where: { user_id: testUserId } })
    await prisma.user.delete({ where: { id: testUserId } })
    await prisma.$disconnect()
  })

  // ============================================================================
  // Loadout CRUD Operations
  // BDD Reference: features/08-budget-loadout-builder-phase2.feature:18-50
  // ============================================================================

  describe('Loadout CRUD Operations', () => {
    // BDD Scenario: "Create a new loadout"
    it('should create a new loadout with default values', async () => {
      const loadout = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: 'Test Loadout',
          description: 'Test description',
          budget: 150.0,
          theme: 'red',
        },
      })

      expect(loadout.id).toBeDefined()
      expect(loadout.name).toBe('Test Loadout')
      expect(loadout.user_id).toBe(testUserId)
      expect(loadout.actual_cost.toNumber()).toBe(0.0) // No items yet
      expect(loadout.is_public).toBe(false) // Default to private
      expect(loadout.created_at).toBeInstanceOf(Date)

      // Cleanup
      await prisma.loadout.delete({ where: { id: loadout.id } })
    })

    // BDD Scenario: "Update loadout name and description"
    it('should update loadout name and description', async () => {
      const loadout = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: 'Original Name',
          description: 'Original description',
          budget: 100.0,
        },
      })

      const originalUpdatedAt = loadout.updated_at

      // Wait a bit to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10))

      const updated = await prisma.loadout.update({
        where: { id: loadout.id },
        data: {
          name: 'Updated Name',
          description: 'Updated description',
        },
      })

      expect(updated.name).toBe('Updated Name')
      expect(updated.description).toBe('Updated description')
      expect(updated.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())

      // Cleanup
      await prisma.loadout.delete({ where: { id: loadout.id } })
    })

    // BDD Scenario: "Delete loadout cascades to weapon skins"
    it('should cascade delete weapon skins when loadout is deleted', async () => {
      // Create loadout
      const loadout = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: 'Cascade Test',
          budget: 100.0,
        },
      })

      // Create weapon skins
      await prisma.loadoutWeaponSkin.createMany({
        data: [
          {
            loadout_id: loadout.id,
            item_id: 'item-ak47-redline', // From seed
            weapon_type: 'AK-47',
            selected_platform: 'csfloat',
            price: 25.0,
          },
          {
            loadout_id: loadout.id,
            item_id: 'item-m4a4-asiimov',
            weapon_type: 'M4A4',
            selected_platform: 'steam',
            price: 45.0,
          },
        ],
      })

      // Verify skins exist
      const skinsBefore = await prisma.loadoutWeaponSkin.findMany({
        where: { loadout_id: loadout.id },
      })
      expect(skinsBefore).toHaveLength(2)

      // Delete loadout
      await prisma.loadout.delete({ where: { id: loadout.id } })

      // Verify skins were deleted (CASCADE)
      const skinsAfter = await prisma.loadoutWeaponSkin.findMany({
        where: { loadout_id: loadout.id },
      })
      expect(skinsAfter).toHaveLength(0)
    })
  })

  // ============================================================================
  // Weapon Skins in Loadouts
  // BDD Reference: features/08-budget-loadout-builder-phase2.feature:106-133
  // ============================================================================

  describe('Weapon Skins in Loadouts', () => {
    // BDD Scenario: "Add weapon skin to loadout"
    it('should add weapon skin to loadout and update actual_cost', async () => {
      const loadout = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: 'Weapon Skin Test',
          budget: 150.0,
        },
      })

      // Add weapon skin
      await prisma.loadoutWeaponSkin.create({
        data: {
          loadout_id: loadout.id,
          item_id: 'item-ak47-redline',
          weapon_type: 'AK-47',
          wear: 'Field-Tested',
          float_value: 0.16,
          quality: 'normal',
          selected_platform: 'csfloat',
          price: 25.5,
        },
      })

      // Update loadout actual_cost
      await prisma.loadout.update({
        where: { id: loadout.id },
        data: { actual_cost: 25.5 },
      })

      // Verify
      const updated = await prisma.loadout.findUnique({ where: { id: loadout.id } })
      expect(updated?.actual_cost.toNumber()).toBe(25.5)

      // Cleanup
      await prisma.loadout.delete({ where: { id: loadout.id } })
    })

    // BDD Scenario: "Prevent duplicate weapon types in same loadout"
    it('should prevent duplicate weapon types in same loadout', async () => {
      const loadout = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: 'Duplicate Test',
          budget: 100.0,
        },
      })

      // Add first AK-47 skin
      await prisma.loadoutWeaponSkin.create({
        data: {
          loadout_id: loadout.id,
          item_id: 'item-ak47-redline',
          weapon_type: 'AK-47',
          selected_platform: 'csfloat',
          price: 25.0,
        },
      })

      // Try to add second AK-47 skin (should fail UNIQUE constraint)
      await expect(
        prisma.loadoutWeaponSkin.create({
          data: {
            loadout_id: loadout.id,
            item_id: 'item-ak47-redline',
            weapon_type: 'AK-47', // Duplicate weapon_type
            selected_platform: 'steam',
            price: 30.0,
          },
        })
      ).rejects.toThrow()

      // Cleanup
      await prisma.loadout.delete({ where: { id: loadout.id } })
    })

    // BDD Scenario: "Calculate total loadout cost"
    it('should calculate total loadout cost correctly', async () => {
      const loadout = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: 'Cost Calculation Test',
          budget: 150.0,
        },
      })

      // Add multiple weapon skins
      const skins = [
        { weapon_type: 'AK-47', item_id: 'item-ak47-redline', price: 25.5 },
        { weapon_type: 'M4A4', item_id: 'item-m4a4-asiimov', price: 45.0 },
        { weapon_type: 'AWP', item_id: 'item-awp-redline', price: 18.0 },
        { weapon_type: 'Desert Eagle', item_id: 'item-deagle-blaze', price: 12.0 },
      ]

      for (const skin of skins) {
        await prisma.loadoutWeaponSkin.create({
          data: {
            loadout_id: loadout.id,
            item_id: skin.item_id,
            weapon_type: skin.weapon_type,
            selected_platform: 'csfloat',
            price: skin.price,
          },
        })
      }

      // Calculate total
      const totalCost = skins.reduce((sum, skin) => sum + skin.price, 0)

      // Update actual_cost
      await prisma.loadout.update({
        where: { id: loadout.id },
        data: { actual_cost: totalCost },
      })

      // Verify
      const updated = await prisma.loadout.findUnique({ where: { id: loadout.id } })
      expect(updated?.actual_cost.toNumber()).toBe(100.5)

      // Cleanup
      await prisma.loadout.delete({ where: { id: loadout.id } })
    })
  })

  // ============================================================================
  // Float Value Optimization
  // BDD Reference: features/08-budget-loadout-builder-phase2.feature:135-147
  // ============================================================================

  describe('Float Value Optimization', () => {
    // BDD Scenario: "Store optimal float values for budget builds"
    it('should store float values within target range', async () => {
      const loadout = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: 'Float Optimization Test',
          budget: 100.0,
        },
      })

      // Target FT float range: 0.15-0.18
      const weaponSkin = await prisma.loadoutWeaponSkin.create({
        data: {
          loadout_id: loadout.id,
          item_id: 'item-ak47-redline',
          weapon_type: 'AK-47',
          wear: 'Field-Tested',
          float_value: 0.16, // Within target range
          selected_platform: 'csfloat',
          price: 25.0,
        },
      })

      const floatValue = weaponSkin.float_value?.toNumber()
      expect(floatValue).toBeGreaterThanOrEqual(0.15)
      expect(floatValue).toBeLessThanOrEqual(0.18)

      // Cleanup
      await prisma.loadout.delete({ where: { id: loadout.id } })
    })
  })

  // ============================================================================
  // Stickers and Charms (JSONB)
  // BDD Reference: features/08-budget-loadout-builder-phase2.feature:149-167
  // ============================================================================

  describe('Stickers and Charms', () => {
    // BDD Scenario: "Store stickers on weapon skin"
    it('should store stickers as JSONB with position data', async () => {
      const loadout = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: 'Stickers Test',
          budget: 100.0,
        },
      })

      const stickersData = [
        { name: 'Natus Vincere (Holo)', position: 1 },
        { name: 'Cloud9 (Foil)', position: 2 },
      ]

      const weaponSkin = await prisma.loadoutWeaponSkin.create({
        data: {
          loadout_id: loadout.id,
          item_id: 'item-ak47-redline',
          weapon_type: 'AK-47',
          selected_platform: 'csfloat',
          price: 25.0,
          stickers: stickersData,
        },
      })

      const stickers = weaponSkin.stickers as Array<{ name: string; position: number }>
      expect(stickers).toHaveLength(2)
      expect(stickers[0].name).toBe('Natus Vincere (Holo)')
      expect(stickers[0].position).toBe(1)

      // Cleanup
      await prisma.loadout.delete({ where: { id: loadout.id } })
    })

    // BDD Scenario: "Store weapon charms (NEW - Oct 2025)"
    it('should store weapon charms as JSONB', async () => {
      const loadout = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: 'Charms Test',
          budget: 100.0,
        },
      })

      const charmsData = { charm_name: 'Golden Eagle', rarity: 'Legendary' }

      const weaponSkin = await prisma.loadoutWeaponSkin.create({
        data: {
          loadout_id: loadout.id,
          item_id: 'item-ak47-redline',
          weapon_type: 'AK-47',
          selected_platform: 'csfloat',
          price: 25.0,
          charms: charmsData,
        },
      })

      const charms = weaponSkin.charms as { charm_name: string; rarity: string }
      expect(charms.charm_name).toBe('Golden Eagle')
      expect(charms.rarity).toBe('Legendary')

      // Cleanup
      await prisma.loadout.delete({ where: { id: loadout.id } })
    })
  })

  // ============================================================================
  // Loadout Queries
  // BDD Reference: features/08-budget-loadout-builder-phase2.feature:52-76
  // ============================================================================

  describe('Loadout Queries', () => {
    // BDD Scenario: "List user's loadouts ordered by created_at"
    it('should return loadouts ordered by created_at DESC', async () => {
      // Create multiple loadouts with different timestamps
      const loadout1 = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: 'Oldest Loadout',
          budget: 100.0,
          created_at: new Date('2025-01-01T10:00:00Z'),
        },
      })

      const loadout2 = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: 'Middle Loadout',
          budget: 100.0,
          created_at: new Date('2025-01-02T10:00:00Z'),
        },
      })

      const loadout3 = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: 'Newest Loadout',
          budget: 100.0,
          created_at: new Date('2025-01-03T10:00:00Z'),
        },
      })

      // Query ordered by created_at DESC
      const loadouts = await prisma.loadout.findMany({
        where: { user_id: testUserId },
        orderBy: { created_at: 'desc' },
      })

      expect(loadouts[0].name).toBe('Newest Loadout')
      expect(loadouts[1].name).toBe('Middle Loadout')
      expect(loadouts[2].name).toBe('Oldest Loadout')

      // Cleanup
      await prisma.loadout.deleteMany({
        where: { id: { in: [loadout1.id, loadout2.id, loadout3.id] } },
      })
    })

    // BDD Scenario: "Filter loadouts by theme"
    it('should filter loadouts by theme', async () => {
      const redLoadout = await prisma.loadout.create({
        data: { user_id: testUserId, name: 'Red Theme', budget: 100.0, theme: 'red' },
      })

      const blueLoadout1 = await prisma.loadout.create({
        data: { user_id: testUserId, name: 'Blue Theme 1', budget: 100.0, theme: 'blue' },
      })

      const blueLoadout2 = await prisma.loadout.create({
        data: { user_id: testUserId, name: 'Blue Theme 2', budget: 100.0, theme: 'blue' },
      })

      // Filter by theme
      const blueLoadouts = await prisma.loadout.findMany({
        where: { user_id: testUserId, theme: 'blue' },
      })

      expect(blueLoadouts).toHaveLength(2)
      expect(blueLoadouts.map((l) => l.name)).toContain('Blue Theme 1')
      expect(blueLoadouts.map((l) => l.name)).toContain('Blue Theme 2')

      // Cleanup
      await prisma.loadout.deleteMany({
        where: { id: { in: [redLoadout.id, blueLoadout1.id, blueLoadout2.id] } },
      })
    })
  })

  // ============================================================================
  // Slug Generation
  // BDD Reference: features/08-budget-loadout-builder-phase2.feature:191-202
  // ============================================================================

  describe('Slug Generation', () => {
    // BDD Scenario: "Generate unique slug from loadout name"
    it('should support unique slug for SEO', async () => {
      const loadout = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: 'Red Dragon Budget',
          budget: 150.0,
          slug: 'red-dragon-budget-test',
        },
      })

      expect(loadout.slug).toBe('red-dragon-budget-test')

      // Verify uniqueness
      const found = await prisma.loadout.findUnique({ where: { slug: 'red-dragon-budget-test' } })
      expect(found?.id).toBe(loadout.id)

      // Cleanup
      await prisma.loadout.delete({ where: { id: loadout.id } })
    })

    // BDD Scenario: "Handle duplicate slug with counter"
    it('should enforce unique slug constraint', async () => {
      const loadout1 = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: 'Duplicate Slug Test',
          budget: 100.0,
          slug: 'duplicate-slug-test',
        },
      })

      // Try to create with same slug (should fail UNIQUE constraint)
      await expect(
        prisma.loadout.create({
          data: {
            user_id: testUserId,
            name: 'Duplicate Slug Test 2',
            budget: 100.0,
            slug: 'duplicate-slug-test', // Duplicate
          },
        })
      ).rejects.toThrow()

      // Cleanup
      await prisma.loadout.delete({ where: { id: loadout1.id } })
    })
  })
})
