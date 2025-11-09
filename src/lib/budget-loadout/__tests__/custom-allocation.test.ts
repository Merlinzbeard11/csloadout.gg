/**
 * Feature 08 Phase 2 Enhancement: Custom Budget Allocation Tests
 *
 * BDD Reference: features/08-budget-loadout-builder-phase2.feature:195-265
 *
 * Critical Gotchas:
 * - Percentages must sum to exactly 100.00 (with 0.01% tolerance)
 * - Each percentage must be 0.00-100.00
 * - Custom allocation overrides preset prioritize modes
 * - Zero percentages exclude categories from budget
 * - Support decimal percentages (33.33, 33.34)
 *
 * @jest-environment node
 */

import { PrismaClient } from '@prisma/client'
import {
  validateCustomAllocation,
  calculateDollarAllocation,
  hasCustomAllocation,
  getPresetAllocation,
  type CustomAllocation,
} from '../custom-allocation-validator'

const prisma = new PrismaClient()

describe('Feature 08 Phase 2 Enhancement - Custom Budget Allocation', () => {
  let testUserId: string

  beforeAll(async () => {
    await prisma.$connect()

    // Create test user
    const testUser = await prisma.user.upsert({
      where: { steam_id: '76561198888888888' },
      update: {},
      create: {
        steam_id: '76561198888888888',
        persona_name: 'TestUser_CustomAllocation',
        profile_url: 'https://steamcommunity.com/profiles/76561198888888888',
        avatar: 'https://example.com/avatar-custom.jpg',
        profile_state: 1,
        has_cs2_game: true,
      },
    })

    testUserId = testUser.id
  })

  afterAll(async () => {
    // Cleanup
    await prisma.loadout.deleteMany({ where: { user_id: testUserId } })
    await prisma.user.delete({ where: { id: testUserId } })
    await prisma.$disconnect()
  })

  // ============================================================================
  // Validation Logic Tests
  // BDD Reference: features/08-budget-loadout-builder-phase2.feature:212-220
  // ============================================================================

  describe('Validation Logic', () => {
    // BDD Scenario: "Custom allocation percentages must sum to 100%"
    it('should validate that percentages sum to 100.00', () => {
      const validAllocation: CustomAllocation = {
        weapon_skins: 50.0,
        knife: 30.0,
        gloves: 20.0,
        agents: 0.0,
        music_kit: 0.0,
        charms: 0.0,
      }

      const result = validateCustomAllocation(validAllocation)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject allocation that does not sum to 100%', () => {
      const invalidAllocation: CustomAllocation = {
        weapon_skins: 60.0,
        knife: 30.0,
        gloves: 5.0, // Total: 95%
        agents: 0.0,
        music_kit: 0.0,
        charms: 0.0,
      }

      const result = validateCustomAllocation(invalidAllocation)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Custom allocation must sum to 100.00%, got 95.00%')
    })

    // BDD Scenario: "Custom allocation validates percentage range (0-100)"
    it('should reject percentages above 100', () => {
      const invalidAllocation: CustomAllocation = {
        weapon_skins: 150.0, // Invalid: > 100
        knife: 0.0,
        gloves: 0.0,
        agents: 0.0,
        music_kit: 0.0,
        charms: 0.0,
      }

      const result = validateCustomAllocation(invalidAllocation)
      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('between 0.00 and 100.00'))).toBe(true)
    })

    it('should reject negative percentages', () => {
      const invalidAllocation: CustomAllocation = {
        weapon_skins: 110.0,
        knife: -10.0, // Invalid: < 0
        gloves: 0.0,
        agents: 0.0,
        music_kit: 0.0,
        charms: 0.0,
      }

      const result = validateCustomAllocation(invalidAllocation)
      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('knife'))).toBe(true)
    })

    // BDD Scenario: "Custom allocation percentages support decimals"
    it('should support decimal percentages that sum to 100', () => {
      const decimalAllocation: CustomAllocation = {
        weapon_skins: 33.33,
        knife: 33.33,
        gloves: 33.34,
        agents: 0.0,
        music_kit: 0.0,
        charms: 0.0,
      }

      const result = validateCustomAllocation(decimalAllocation)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    // BDD Scenario: "Custom allocation with zero percentages excludes categories"
    it('should allow zero percentages for excluded categories', () => {
      const weaponsOnlyAllocation: CustomAllocation = {
        weapon_skins: 100.0,
        knife: 0.0,
        gloves: 0.0,
        agents: 0.0,
        music_kit: 0.0,
        charms: 0.0,
      }

      const result = validateCustomAllocation(weaponsOnlyAllocation)
      expect(result.isValid).toBe(true)
    })
  })

  // ============================================================================
  // Dollar Allocation Calculation
  // BDD Reference: features/08-budget-loadout-builder-phase2.feature:242-252
  // ============================================================================

  describe('Dollar Allocation Calculation', () => {
    // BDD Scenario: "Custom allocation percentages support decimals"
    it('should calculate correct dollar amounts from percentages', () => {
      const allocation: CustomAllocation = {
        weapon_skins: 33.33,
        knife: 33.33,
        gloves: 33.34,
        agents: 0.0,
        music_kit: 0.0,
        charms: 0.0,
      }

      const dollarAllocation = calculateDollarAllocation(100.0, allocation)

      expect(dollarAllocation.weapon_skins).toBeCloseTo(33.33, 2)
      expect(dollarAllocation.knife).toBeCloseTo(33.33, 2)
      expect(dollarAllocation.gloves).toBeCloseTo(33.34, 2)
    })

    it('should handle 100% allocation to single category', () => {
      const allocation: CustomAllocation = {
        weapon_skins: 100.0,
        knife: 0.0,
        gloves: 0.0,
        agents: 0.0,
        music_kit: 0.0,
        charms: 0.0,
      }

      const dollarAllocation = calculateDollarAllocation(150.0, allocation)

      expect(dollarAllocation.weapon_skins).toBe(150.0)
      expect(dollarAllocation.knife).toBe(0.0)
      expect(dollarAllocation.gloves).toBe(0.0)
    })
  })

  // ============================================================================
  // Database Storage Tests
  // BDD Reference: features/08-budget-loadout-builder-phase2.feature:199-210
  // ============================================================================

  describe('Database Storage', () => {
    // BDD Scenario: "Set custom allocation percentages"
    it('should store custom allocation as JSONB', async () => {
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
          name: 'Custom Allocation Test',
          budget: 100.0,
          custom_allocation: customAllocation,
        },
      })

      expect(loadout.custom_allocation).toBeDefined()

      const stored = loadout.custom_allocation as CustomAllocation
      expect(stored.weapon_skins).toBe(50.0)
      expect(stored.knife).toBe(30.0)
      expect(stored.gloves).toBe(20.0)

      // Cleanup
      await prisma.loadout.delete({ where: { id: loadout.id } })
    })

    // BDD Scenario: "Clear custom allocation to use presets again"
    it('should allow clearing custom allocation (set to NULL)', async () => {
      const loadout = await prisma.loadout.create({
        data: {
          user_id: testUserId,
          name: 'Clear Allocation Test',
          budget: 100.0,
          custom_allocation: {
            weapon_skins: 50.0,
            knife: 50.0,
            gloves: 0.0,
            agents: 0.0,
            music_kit: 0.0,
            charms: 0.0,
          },
        },
      })

      // Clear custom allocation
      const updated = await prisma.loadout.update({
        where: { id: loadout.id },
        data: { custom_allocation: null },
      })

      expect(updated.custom_allocation).toBeNull()

      // Cleanup
      await prisma.loadout.delete({ where: { id: loadout.id } })
    })
  })

  // ============================================================================
  // Preset Allocation Fallback
  // BDD Reference: features/08-budget-loadout-builder-phase2.feature:222-226
  // ============================================================================

  describe('Preset Allocation Fallback', () => {
    it('should provide balance preset when custom_allocation is NULL', () => {
      const preset = getPresetAllocation('balance')

      expect(preset.weapon_skins).toBe(70.0)
      expect(preset.knife).toBe(15.0)
      expect(preset.gloves).toBe(10.0)
      expect(preset.agents).toBe(3.0)
      expect(preset.music_kit).toBe(2.0)

      // Verify sum = 100%
      const total = Object.values(preset).reduce((sum, val) => sum + val, 0)
      expect(total).toBe(100.0)
    })

    it('should provide price preset with different allocation', () => {
      const preset = getPresetAllocation('price')

      expect(preset.weapon_skins).toBe(80.0) // More focused on weapons
      expect(preset.knife).toBe(10.0)
      expect(preset.gloves).toBe(5.0)
    })

    it('should provide quality preset with different allocation', () => {
      const preset = getPresetAllocation('quality')

      expect(preset.weapon_skins).toBe(60.0) // More balanced
      expect(preset.knife).toBe(20.0)
      expect(preset.gloves).toBe(15.0)
    })

    it('should provide color_match preset', () => {
      const preset = getPresetAllocation('color_match')

      expect(preset.weapon_skins).toBe(65.0)
      expect(preset.knife).toBe(18.0)
      expect(preset.gloves).toBe(12.0)
    })
  })

  // ============================================================================
  // Helper Function Tests
  // ============================================================================

  describe('Helper Functions', () => {
    it('should detect valid custom allocation object', () => {
      const valid: CustomAllocation = {
        weapon_skins: 50.0,
        knife: 50.0,
        gloves: 0.0,
        agents: 0.0,
        music_kit: 0.0,
        charms: 0.0,
      }

      expect(hasCustomAllocation(valid)).toBe(true)
    })

    it('should reject null as custom allocation', () => {
      expect(hasCustomAllocation(null)).toBe(false)
    })

    it('should reject invalid structure', () => {
      const invalid = { weapon_skins: 50.0, knife: 50.0 } // Missing fields

      expect(hasCustomAllocation(invalid)).toBe(false)
    })
  })
})
