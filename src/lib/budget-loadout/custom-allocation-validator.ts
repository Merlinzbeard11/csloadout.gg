/**
 * Custom Budget Allocation Validator
 * BDD Reference: features/08-budget-loadout-builder-phase2.feature:195-265
 *
 * Validates user-defined budget allocation percentages for loadouts.
 *
 * Critical Requirements:
 * - All percentages must sum to exactly 100.00
 * - Each percentage must be between 0.00 and 100.00
 * - Supports decimal percentages (e.g., 33.33)
 * - Structure: { weapon_skins, knife, gloves, agents, music_kit, charms }
 */

export interface CustomAllocation {
  weapon_skins: number
  knife: number
  gloves: number
  agents: number
  music_kit: number
  charms: number
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * Validates custom allocation percentages
 * BDD Scenarios:
 * - "Custom allocation percentages must sum to 100%"
 * - "Custom allocation validates percentage range (0-100)"
 */
export function validateCustomAllocation(allocation: CustomAllocation): ValidationResult {
  const errors: string[] = []

  // Validate each category is within range (0-100)
  const categories = Object.entries(allocation)
  for (const [category, percentage] of categories) {
    if (percentage < 0.0 || percentage > 100.0) {
      errors.push(`${category}: Percentage must be between 0.00 and 100.00, got ${percentage}`)
    }

    // Validate is a number
    if (typeof percentage !== 'number' || isNaN(percentage)) {
      errors.push(`${category}: Percentage must be a valid number, got ${percentage}`)
    }
  }

  // Validate sum equals 100.00 (with tolerance for floating point)
  const total = categories.reduce((sum, [, percentage]) => sum + percentage, 0)
  const tolerance = 0.01 // Allow 0.01% tolerance for floating point arithmetic

  if (Math.abs(total - 100.0) > tolerance) {
    errors.push(
      `Custom allocation must sum to 100.00%, got ${total.toFixed(2)}%`
    )
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Calculate dollar allocation from percentages
 * BDD Scenario: "Custom allocation percentages support decimals"
 */
export function calculateDollarAllocation(
  budget: number,
  allocation: CustomAllocation
): Record<string, number> {
  const result: Record<string, number> = {}

  for (const [category, percentage] of Object.entries(allocation)) {
    result[category] = (budget * percentage) / 100.0
  }

  return result
}

/**
 * Check if custom allocation is set (not null, has valid structure)
 */
export function hasCustomAllocation(allocation: unknown): allocation is CustomAllocation {
  if (!allocation || typeof allocation !== 'object') {
    return false
  }

  const required = ['weapon_skins', 'knife', 'gloves', 'agents', 'music_kit', 'charms']
  const obj = allocation as Record<string, unknown>

  return required.every((key) => key in obj && typeof obj[key] === 'number')
}

/**
 * Get default preset allocation based on prioritize mode
 * Used when custom_allocation is NULL
 */
export function getPresetAllocation(
  prioritize: 'balance' | 'price' | 'quality' | 'color_match' = 'balance'
): CustomAllocation {
  const presets: Record<string, CustomAllocation> = {
    balance: {
      weapon_skins: 70.0,
      knife: 15.0,
      gloves: 10.0,
      agents: 3.0,
      music_kit: 2.0,
      charms: 0.0,
    },
    price: {
      weapon_skins: 80.0,
      knife: 10.0,
      gloves: 5.0,
      agents: 3.0,
      music_kit: 2.0,
      charms: 0.0,
    },
    quality: {
      weapon_skins: 60.0,
      knife: 20.0,
      gloves: 15.0,
      agents: 3.0,
      music_kit: 2.0,
      charms: 0.0,
    },
    color_match: {
      weapon_skins: 65.0,
      knife: 18.0,
      gloves: 12.0,
      agents: 3.0,
      music_kit: 2.0,
      charms: 0.0,
    },
  }

  return presets[prioritize] || presets.balance
}
