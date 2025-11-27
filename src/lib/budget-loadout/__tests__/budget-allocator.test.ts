/**
 * Feature 08 Phase 3: Budget Allocation Algorithm Tests
 *
 * BDD Reference: features/08-budget-loadout-builder-phase3.feature
 *
 * Tests the core budget distribution logic across:
 * - Preset allocation modes (balance, price, quality, color_match)
 * - Custom allocation percentages
 * - Weapon budget distribution
 * - Budget validation and edge cases
 * - Float optimization guidance
 * - Algorithm correctness and performance
 *
 * @jest-environment node
 */

import { PrismaClient } from '@prisma/client'
import {
  allocateBudget,
  allocateBudgetForLoadout,
  type AllocationResult,
  type PrioritizeMode,
} from '../budget-allocator'
import type { CustomAllocation } from '../custom-allocation-validator'

const prisma = new PrismaClient()

describe('Feature 08 Phase 3 - Budget Allocation Algorithm', () => {
  let testUserId: string

  // Generate unique IDs for test data
  const uniqueId = () => `${Date.now()}-${Math.random().toString(36).substring(7)}`

  beforeAll(async () => {
    await prisma.$connect()

    // Create test user
    const testUser = await prisma.user.upsert({
      where: { steam_id: `76561198999999999-${uniqueId()}` },
      update: {},
      create: {
        steam_id: `76561198999999999-${uniqueId()}`,
        persona_name: 'TestUser_BudgetAllocator',
        profile_url: 'https://steamcommunity.com/profiles/76561198999999999',
        avatar: 'https://example.com/avatar-allocator.jpg',
        profile_state: 1,
        has_cs2_game: true,
      },
    })

    testUserId = testUser.id

    // Verify weapon priorities exist (from Phase 1 seed)
    const weaponCount = await prisma.weaponUsagePriority.count()
    if (weaponCount === 0) {
      throw new Error('Weapon priorities not seeded - run Phase 1 seed first')
    }
  })

  beforeEach(async () => {
    await global.prismaTestHelper.startTransaction()
  })

  afterEach(() => {
    global.prismaTestHelper.rollbackTransaction()
  })

  afterAll(async () => {
    // Cleanup
    await prisma.loadout.deleteMany({ where: { user_id: testUserId } })
    await prisma.user.delete({ where: { id: testUserId } })
    await prisma.$disconnect()
  })

  // ============================================================================
  // Preset Allocation Modes
  // BDD Reference: features/08-budget-loadout-builder-phase3.feature:17-70
  // ============================================================================

  describe('Preset Allocation Modes', () => {
    // BDD Scenario: "Allocate budget using 'balance' preset"
    it('should allocate budget using balance preset', async () => {
      const result = await allocateBudget(150.0, 'balance')

      expect(result.totalBudget).toBe(150.0)
      expect(result.allocationMode).toBe('preset:balance')

      const categories = result.categoryAllocations
      expect(categories.find((c) => c.category === 'weapon_skins')?.allocatedBudget).toBe(105.0)
      expect(categories.find((c) => c.category === 'knife')?.allocatedBudget).toBe(22.5)
      expect(categories.find((c) => c.category === 'gloves')?.allocatedBudget).toBe(15.0)
      expect(categories.find((c) => c.category === 'agents')?.allocatedBudget).toBe(4.5)
      expect(categories.find((c) => c.category === 'music_kit')?.allocatedBudget).toBe(3.0)

      // Validate total
      const total = categories.reduce((sum, c) => sum + c.allocatedBudget, 0)
      expect(total).toBeCloseTo(150.0, 2)
    })

    // BDD Scenario: "Allocate budget using 'price' preset (maximize weapon skins)"
    it('should allocate budget using price preset', async () => {
      const result = await allocateBudget(100.0, 'price')

      expect(result.allocationMode).toBe('preset:price')

      const categories = result.categoryAllocations
      const weaponSkins = categories.find((c) => c.category === 'weapon_skins')
      expect(weaponSkins?.allocatedBudget).toBe(80.0)
      expect(weaponSkins?.percentage).toBe(80.0)

      // Verify weapon_skins is highest allocation
      const highestAllocation = Math.max(...categories.map((c) => c.allocatedBudget))
      expect(weaponSkins?.allocatedBudget).toBe(highestAllocation)
    })

    // BDD Scenario: "Allocate budget using 'quality' preset (balanced high-end)"
    it('should allocate budget using quality preset', async () => {
      const result = await allocateBudget(200.0, 'quality')

      expect(result.allocationMode).toBe('preset:quality')

      const categories = result.categoryAllocations
      expect(categories.find((c) => c.category === 'weapon_skins')?.allocatedBudget).toBe(120.0)
      expect(categories.find((c) => c.category === 'knife')?.allocatedBudget).toBe(40.0)
      expect(categories.find((c) => c.category === 'gloves')?.allocatedBudget).toBe(30.0)

      // Knife should be second highest
      const sorted = [...categories].sort((a, b) => b.allocatedBudget - a.allocatedBudget)
      expect(sorted[1].category).toBe('knife')
    })

    // BDD Scenario: "Allocate budget using 'color_match' preset"
    it('should allocate budget using color_match preset', async () => {
      const result = await allocateBudget(120.0, 'color_match')

      expect(result.allocationMode).toBe('preset:color_match')

      const categories = result.categoryAllocations
      expect(categories.find((c) => c.category === 'weapon_skins')?.allocatedBudget).toBe(78.0)
      expect(categories.find((c) => c.category === 'knife')?.allocatedBudget).toBe(21.6)
      expect(categories.find((c) => c.category === 'gloves')?.allocatedBudget).toBe(14.4)
    })
  })

  // ============================================================================
  // Custom Allocation Percentages
  // BDD Reference: features/08-budget-loadout-builder-phase3.feature:72-109
  // ============================================================================

  describe('Custom Allocation Percentages', () => {
    // BDD Scenario: "Allocate budget using custom percentages"
    it('should allocate budget using custom percentages', async () => {
      const customAllocation: CustomAllocation = {
        weapon_skins: 50.0,
        knife: 30.0,
        gloves: 20.0,
        agents: 0.0,
        music_kit: 0.0,
        charms: 0.0,
      }

      const result = await allocateBudget(150.0, 'custom', customAllocation)

      expect(result.allocationMode).toBe('custom')

      const categories = result.categoryAllocations
      expect(categories.find((c) => c.category === 'weapon_skins')?.allocatedBudget).toBe(75.0)
      expect(categories.find((c) => c.category === 'knife')?.allocatedBudget).toBe(45.0)
      expect(categories.find((c) => c.category === 'gloves')?.allocatedBudget).toBe(30.0)
      expect(categories.find((c) => c.category === 'agents')?.allocatedBudget).toBe(0.0)
    })

    // BDD Scenario: "Custom allocation with decimal percentages"
    it('should handle decimal percentages correctly', async () => {
      const customAllocation: CustomAllocation = {
        weapon_skins: 33.33,
        knife: 33.33,
        gloves: 33.34,
        agents: 0.0,
        music_kit: 0.0,
        charms: 0.0,
      }

      const result = await allocateBudget(100.0, 'custom', customAllocation)

      const categories = result.categoryAllocations
      expect(categories.find((c) => c.category === 'weapon_skins')?.allocatedBudget).toBe(33.33)
      expect(categories.find((c) => c.category === 'knife')?.allocatedBudget).toBe(33.33)
      expect(categories.find((c) => c.category === 'gloves')?.allocatedBudget).toBe(33.34)

      // Validate exact total
      const total = categories.reduce((sum, c) => sum + c.allocatedBudget, 0)
      expect(total).toBe(100.0)
    })

    // BDD Scenario: "Custom allocation with zero percentages excludes categories"
    it('should exclude categories with 0% allocation', async () => {
      const customAllocation: CustomAllocation = {
        weapon_skins: 100.0,
        knife: 0.0,
        gloves: 0.0,
        agents: 0.0,
        music_kit: 0.0,
        charms: 0.0,
      }

      const result = await allocateBudget(200.0, 'custom', customAllocation)

      const categories = result.categoryAllocations
      expect(categories.find((c) => c.category === 'weapon_skins')?.allocatedBudget).toBe(200.0)
      expect(categories.find((c) => c.category === 'knife')?.allocatedBudget).toBe(0.0)
      expect(categories.find((c) => c.category === 'gloves')?.allocatedBudget).toBe(0.0)
    })
  })

  // ============================================================================
  // Weapon Budget Distribution
  // BDD Reference: features/08-budget-loadout-builder-phase3.feature:111-146
  // ============================================================================

  describe('Weapon Budget Distribution', () => {
    // BDD Scenario: "Distribute weapon_skins budget among 10 weapons"
    it('should distribute weapon budget based on priorities', async () => {
      const result = await allocateBudget(150.0, 'balance') // weapon_skins gets $105

      const weapons = result.weaponAllocations
      expect(weapons).toHaveLength(10)

      // Verify AK-47 gets 25% of weapon budget
      const ak47 = weapons.find((w) => w.weaponType === 'AK-47')
      expect(ak47?.budgetWeight).toBe(0.25)
      expect(ak47?.allocatedBudget).toBe(26.25) // 25% of $105

      // Verify M4A4 gets 15% of weapon budget
      const m4a4 = weapons.find((w) => w.weaponType === 'M4A4')
      expect(m4a4?.budgetWeight).toBe(0.15)
      expect(m4a4?.allocatedBudget).toBe(15.75) // 15% of $105

      // Validate total weapon budget
      const totalWeaponBudget = weapons.reduce((sum, w) => sum + w.allocatedBudget, 0)
      expect(totalWeaponBudget).toBeCloseTo(105.0, 2)
    })

    // BDD Scenario: "Weapon budget weights must sum to 1.00"
    it('should have weapon weights summing to 1.00', async () => {
      const result = await allocateBudget(100.0, 'balance')

      const weapons = result.weaponAllocations
      const totalWeight = weapons.reduce((sum, w) => sum + w.budgetWeight, 0)

      expect(totalWeight).toBeCloseTo(1.0, 3)
    })

    // BDD Scenario: "Essential weapons receive guaranteed budget"
    it('should prioritize essential weapons', async () => {
      const result = await allocateBudget(10.0, 'price') // Very small budget

      const weapons = result.weaponAllocations
      const essentialWeapons = weapons.filter((w) => w.isEssential)

      expect(essentialWeapons.length).toBeGreaterThan(0)

      // AK-47 and M4A4 should be essential
      expect(weapons.find((w) => w.weaponType === 'AK-47')?.isEssential).toBe(true)
      expect(weapons.find((w) => w.weaponType === 'M4A4')?.isEssential).toBe(true)
    })
  })

  // ============================================================================
  // Budget Validation
  // BDD Reference: features/08-budget-loadout-builder-phase3.feature:148-189
  // ============================================================================

  describe('Budget Validation', () => {
    // BDD Scenario: "Validate total allocations equal input budget"
    it('should ensure total allocations equal input budget', async () => {
      const result = await allocateBudget(150.0, 'balance')

      const totalAllocated = result.categoryAllocations.reduce(
        (sum, c) => sum + c.allocatedBudget,
        0
      )

      expect(totalAllocated).toBeCloseTo(150.0, 2)
    })

    // BDD Scenario: "Reject negative budgets"
    it('should reject negative budgets', async () => {
      await expect(allocateBudget(-50.0, 'balance')).rejects.toThrow('Budget must be positive')
    })

    // BDD Scenario: "Handle very small budgets ($10)"
    it('should handle very small budgets correctly', async () => {
      const result = await allocateBudget(10.0, 'balance')

      const categories = result.categoryAllocations
      expect(categories.find((c) => c.category === 'weapon_skins')?.allocatedBudget).toBe(7.0)
      expect(categories.find((c) => c.category === 'knife')?.allocatedBudget).toBe(1.5)
      expect(categories.find((c) => c.category === 'gloves')?.allocatedBudget).toBe(1.0)

      // Validate total
      const total = categories.reduce((sum, c) => sum + c.allocatedBudget, 0)
      expect(total).toBeCloseTo(10.0, 2)
    })

    // BDD Scenario: "Handle very large budgets ($10,000)"
    it('should handle very large budgets without precision errors', async () => {
      const result = await allocateBudget(10000.0, 'quality')

      const categories = result.categoryAllocations
      expect(categories.find((c) => c.category === 'weapon_skins')?.allocatedBudget).toBe(6000.0)
      expect(categories.find((c) => c.category === 'knife')?.allocatedBudget).toBe(2000.0)
      expect(categories.find((c) => c.category === 'gloves')?.allocatedBudget).toBe(1500.0)

      // Validate total (no precision loss)
      const total = categories.reduce((sum, c) => sum + c.allocatedBudget, 0)
      expect(total).toBe(10000.0)
    })
  })

  // ============================================================================
  // Float Value Optimization
  // BDD Reference: features/08-budget-loadout-builder-phase3.feature:191-211
  // ============================================================================

  describe('Float Value Optimization', () => {
    // BDD Scenario: "Target higher float values for budget optimization"
    it('should recommend higher floats for budget builds', async () => {
      const result = await allocateBudget(50.0, 'balance', null, true)

      expect(result.floatGuidance).toBeDefined()
      expect(result.floatGuidance?.wear).toBe('Field-Tested')
      expect(result.floatGuidance?.recommendedRange.min).toBe(0.15)
      expect(result.floatGuidance?.recommendedRange.max).toBe(0.18)
      expect(result.floatGuidance?.reasoning).toContain('best value')
    })

    // BDD Scenario: "Target lower float values for quality builds"
    it('should recommend lower floats for quality builds', async () => {
      const result = await allocateBudget(500.0, 'quality', null, true)

      expect(result.floatGuidance).toBeDefined()
      expect(result.floatGuidance?.wear).toBe('Minimal Wear')
      expect(result.floatGuidance?.recommendedRange.min).toBe(0.07)
      expect(result.floatGuidance?.recommendedRange.max).toBe(0.09)
      expect(result.floatGuidance?.reasoning).toContain('best appearance')
    })

    it('should not provide float guidance when disabled', async () => {
      const result = await allocateBudget(100.0, 'balance', null, false)

      expect(result.floatGuidance).toBeUndefined()
    })
  })

  // ============================================================================
  // Algorithm Correctness
  // BDD Reference: features/08-budget-loadout-builder-phase3.feature:213-240
  // ============================================================================

  describe('Algorithm Correctness', () => {
    // BDD Scenario: "Category allocations preserve decimal precision"
    it('should preserve decimal precision to 2 places', async () => {
      const result = await allocateBudget(99.99, 'balance')

      const weaponSkins = result.categoryAllocations.find((c) => c.category === 'weapon_skins')
      expect(weaponSkins?.allocatedBudget).toBe(69.99) // 70% of $99.99

      // All allocations should have at most 2 decimal places
      result.categoryAllocations.forEach((c) => {
        const decimalPlaces = (c.allocatedBudget.toString().split('.')[1] || '').length
        expect(decimalPlaces).toBeLessThanOrEqual(2)
      })
    })

    // BDD Scenario: "Algorithm returns structured allocation result"
    it('should return properly structured result', async () => {
      const result = await allocateBudget(150.0, 'balance')

      expect(result).toHaveProperty('totalBudget')
      expect(result).toHaveProperty('categoryAllocations')
      expect(result).toHaveProperty('weaponAllocations')
      expect(result).toHaveProperty('allocationMode')

      expect(result.totalBudget).toBe(150.0)
      expect(Array.isArray(result.categoryAllocations)).toBe(true)
      expect(Array.isArray(result.weaponAllocations)).toBe(true)
      expect(result.allocationMode).toBe('preset:balance')
    })
  })

  // ============================================================================
  // Integration with Loadout Model
  // BDD Reference: features/08-budget-loadout-builder-phase3.feature:263-282
  // ============================================================================

  describe('Integration with Loadout Model', () => {
    // BDD Scenario: "Store allocation result with loadout"
    it('should allocate budget for saved loadout', async () => {
      const loadout = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: 'Test Loadout for Allocation',
          budget: 150.0,
          custom_allocation: null, // Use preset
        },
      })

      const result = await allocateBudgetForLoadout(loadout.id)

      expect(result.totalBudget).toBe(150.0)
      expect(result.allocationMode).toBe('preset:balance') // Default

      // Cleanup
      await prisma.loadout.delete({ where: { id: loadout.id } })
    })

    // BDD Scenario: "Re-run algorithm after custom allocation change"
    it('should use custom allocation when set', async () => {
      const customAllocation: CustomAllocation = {
        weapon_skins: 50.0,
        knife: 30.0,
        gloves: 20.0,
        agents: 0.0,
        music_kit: 0.0,
        charms: 0.0,
      }

      const loadout = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: 'Custom Allocation Loadout',
          budget: 100.0,
          custom_allocation: customAllocation,
        },
      })

      const result = await allocateBudgetForLoadout(loadout.id)

      expect(result.allocationMode).toBe('custom')
      expect(result.categoryAllocations.find((c) => c.category === 'weapon_skins')?.allocatedBudget).toBe(50.0)
      expect(result.categoryAllocations.find((c) => c.category === 'knife')?.allocatedBudget).toBe(30.0)

      // Cleanup
      await prisma.loadout.delete({ where: { id: loadout.id } })
    })
  })

  // ============================================================================
  // Performance Requirements
  // BDD Reference: features/08-budget-loadout-builder-phase3.feature:242-261
  // ============================================================================

  describe('Performance Requirements', () => {
    // BDD Scenario: "Algorithm executes in under 50ms"
    it('should execute in under 50ms', async () => {
      const start = Date.now()
      await allocateBudget(150.0, 'balance')
      const duration = Date.now() - start

      expect(duration).toBeLessThan(50)
    })

    // BDD Scenario: "Algorithm caches weapon priorities"
    it('should efficiently handle multiple allocations', async () => {
      const start = Date.now()

      // Run algorithm 10 times
      for (let i = 0; i < 10; i++) {
        await allocateBudget(150.0, 'balance')
      }

      const duration = Date.now() - start

      // Should complete 10 allocations in under 200ms (avg <20ms each)
      expect(duration).toBeLessThan(200)
    })
  })
})
