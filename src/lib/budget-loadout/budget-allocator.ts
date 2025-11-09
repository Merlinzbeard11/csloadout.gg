/**
 * Budget Allocation Algorithm
 * BDD Reference: features/08-budget-loadout-builder-phase3.feature
 *
 * Distributes budget across cosmetic categories based on preset modes or custom percentages.
 * Within weapon_skins category, further distributes among 10 weapons based on usage priorities.
 *
 * Critical Requirements:
 * - Total allocations must equal input budget (±$0.01 tolerance)
 * - Support 4 preset modes: balance, price, quality, color_match
 * - Support custom allocation percentages from Loadout.custom_allocation
 * - Weapon budget weights must sum to 1.00
 * - Handle edge cases: small budgets ($10), large budgets ($10,000)
 * - Execute in <50ms without per-weapon database queries
 *
 * Float Optimization Gotcha:
 * - JavaScript floating point arithmetic can cause precision errors
 * - Solution: Round to 2 decimal places consistently
 * - Adjust final category to ensure exact total (distribute rounding error)
 */

import { PrismaClient } from '@prisma/client'
import { getPresetAllocation, type CustomAllocation } from './custom-allocation-validator'

const prisma = new PrismaClient()

// ============================================================================
// Type Definitions
// ============================================================================

export interface CategoryAllocation {
  category: string
  percentage: number
  allocatedBudget: number
}

export interface WeaponAllocation {
  weaponType: string
  budgetWeight: number
  allocatedBudget: number
  isEssential: boolean
}

export interface FloatGuidance {
  wear: string
  recommendedRange: { min: number; max: number }
  reasoning: string
}

export interface AllocationResult {
  totalBudget: number
  categoryAllocations: CategoryAllocation[]
  weaponAllocations: WeaponAllocation[]
  allocationMode: string // "preset:balance" or "custom"
  floatGuidance?: FloatGuidance
}

export type PrioritizeMode = 'balance' | 'price' | 'quality' | 'color_match'

// ============================================================================
// Budget Allocation Algorithm
// ============================================================================

/**
 * Main entry point: Allocate budget across cosmetic categories and weapons
 * BDD Scenarios: All scenarios in features/08-budget-loadout-builder-phase3.feature
 */
export async function allocateBudget(
  totalBudget: number,
  mode: PrioritizeMode | 'custom',
  customAllocation?: CustomAllocation | null,
  enableFloatOptimization?: boolean
): Promise<AllocationResult> {
  // Validate input
  if (totalBudget <= 0) {
    throw new Error('Budget must be positive')
  }

  // Determine allocation source (preset or custom)
  const allocation =
    mode === 'custom' && customAllocation
      ? customAllocation
      : getPresetAllocation(mode === 'custom' ? 'balance' : mode)

  const allocationMode = mode === 'custom' ? 'custom' : `preset:${mode}`

  // Calculate category allocations
  const categoryAllocations = calculateCategoryAllocations(totalBudget, allocation)

  // Calculate weapon allocations (within weapon_skins category)
  const weaponSkinsCategory = categoryAllocations.find((c) => c.category === 'weapon_skins')
  const weaponSkinsBudget = weaponSkinsCategory?.allocatedBudget || 0
  const weaponAllocations = await calculateWeaponAllocations(weaponSkinsBudget)

  // Generate float optimization guidance
  const floatGuidance = enableFloatOptimization
    ? generateFloatGuidance(totalBudget)
    : undefined

  return {
    totalBudget,
    categoryAllocations,
    weaponAllocations,
    allocationMode,
    floatGuidance,
  }
}

// ============================================================================
// Category Budget Distribution
// ============================================================================

/**
 * Calculate budget allocation per cosmetic category
 * BDD Scenarios: "Allocate budget using [preset]", "Custom allocation"
 */
function calculateCategoryAllocations(
  totalBudget: number,
  allocation: CustomAllocation
): CategoryAllocation[] {
  const categories = Object.entries(allocation)
  const allocations: CategoryAllocation[] = []

  let totalAllocated = 0

  // Calculate each category allocation
  for (const [category, percentage] of categories) {
    const allocatedBudget = roundToTwoDecimals((totalBudget * percentage) / 100.0)
    allocations.push({
      category,
      percentage,
      allocatedBudget,
    })
    totalAllocated += allocatedBudget
  }

  // Adjust final category to ensure exact total (distribute rounding error)
  // BDD Scenario: "Validate total allocations equal input budget"
  const roundingError = roundToTwoDecimals(totalBudget - totalAllocated)
  if (Math.abs(roundingError) > 0.01) {
    const lastAllocation = allocations[allocations.length - 1]
    lastAllocation.allocatedBudget = roundToTwoDecimals(
      lastAllocation.allocatedBudget + roundingError
    )
  }

  return allocations
}

// ============================================================================
// Weapon Budget Distribution (Within weapon_skins Category)
// ============================================================================

/**
 * Distribute weapon_skins budget among 10 weapons based on usage priorities
 * BDD Scenario: "Distribute weapon_skins budget among 10 weapons"
 */
async function calculateWeaponAllocations(
  weaponSkinsBudget: number
): Promise<WeaponAllocation[]> {
  // Fetch weapon priorities from database (cached via Prisma)
  const weaponPriorities = await prisma.weaponUsagePriority.findMany({
    orderBy: { budget_weight: 'desc' },
  })

  if (weaponPriorities.length === 0) {
    throw new Error('No weapon priorities found in database')
  }

  // Validate budget weights sum to 1.00
  const totalWeight = weaponPriorities.reduce(
    (sum, weapon) => sum + weapon.budget_weight.toNumber(),
    0
  )
  if (Math.abs(totalWeight - 1.0) > 0.001) {
    throw new Error(
      `Weapon budget weights must sum to 1.00, got ${totalWeight.toFixed(3)}`
    )
  }

  const allocations: WeaponAllocation[] = []
  let totalAllocated = 0

  // Calculate each weapon allocation
  for (const weapon of weaponPriorities) {
    const budgetWeight = weapon.budget_weight.toNumber()
    const allocatedBudget = roundToTwoDecimals(weaponSkinsBudget * budgetWeight)

    allocations.push({
      weaponType: weapon.weapon_type,
      budgetWeight,
      allocatedBudget,
      isEssential: weapon.is_essential,
    })

    totalAllocated += allocatedBudget
  }

  // Adjust final weapon to ensure exact total (distribute rounding error)
  const roundingError = roundToTwoDecimals(weaponSkinsBudget - totalAllocated)
  if (Math.abs(roundingError) > 0.01 && allocations.length > 0) {
    const lastAllocation = allocations[allocations.length - 1]
    lastAllocation.allocatedBudget = roundToTwoDecimals(
      lastAllocation.allocatedBudget + roundingError
    )
  }

  return allocations
}

// ============================================================================
// Float Optimization Guidance
// ============================================================================

/**
 * Generate float value optimization guidance based on budget level
 * BDD Scenarios: "Target higher float values for budget optimization"
 */
function generateFloatGuidance(totalBudget: number): FloatGuidance {
  // Budget-conscious: target higher floats for lower prices
  if (totalBudget < 100.0) {
    return {
      wear: 'Field-Tested',
      recommendedRange: { min: 0.15, max: 0.18 },
      reasoning: 'Target float 0.15-0.18 for best value (cheaper than 0.20-0.25)',
    }
  }

  // Quality builds: target lower floats for better appearance
  if (totalBudget >= 300.0) {
    return {
      wear: 'Minimal Wear',
      recommendedRange: { min: 0.07, max: 0.09 },
      reasoning: 'Target float 0.07-0.09 for best appearance (higher quality)',
    }
  }

  // Mid-range: balanced float targeting
  return {
    wear: 'Minimal Wear',
    recommendedRange: { min: 0.10, max: 0.12 },
    reasoning: 'Target float 0.10-0.12 for balanced quality and value',
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Round to 2 decimal places (handles floating point precision)
 * Gotcha: JavaScript 0.1 + 0.2 = 0.30000000000000004
 * Solution: Round consistently to avoid accumulation errors
 */
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Allocate budget for a saved loadout (re-use stored settings)
 * BDD Scenario: "Re-run algorithm after custom allocation change"
 */
export async function allocateBudgetForLoadout(loadoutId: string): Promise<AllocationResult> {
  const loadout = await prisma.loadout.findUnique({
    where: { id: loadoutId },
  })

  if (!loadout) {
    throw new Error(`Loadout not found: ${loadoutId}`)
  }

  const mode: PrioritizeMode | 'custom' =
    loadout.custom_allocation !== null ? 'custom' : 'balance'
  const customAllocation = loadout.custom_allocation as CustomAllocation | null

  return allocateBudget(
    loadout.budget.toNumber(),
    mode,
    customAllocation,
    true // Enable float optimization by default
  )
}
