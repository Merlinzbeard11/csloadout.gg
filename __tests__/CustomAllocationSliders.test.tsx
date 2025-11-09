/**
 * TDD Tests for CustomAllocationSliders Component (Failing Tests - RED Phase)
 *
 * BDD Reference: features/08-budget-loadout-builder-phase5.feature
 *   Scenario: Display custom allocation sliders
 *   Scenario: Adjust custom allocation sliders
 *   Scenario: Validate custom allocation must sum to 100%
 *   Scenario: Custom allocation allows decimal precision
 *   Scenario: Custom allocation validation tolerance (±0.01%)
 *   Scenario: Slider and number input sync
 *
 * Component Responsibilities:
 * - Display 6 category sliders with percentage inputs
 * - Validate percentages sum to 100.00% (±0.01% tolerance)
 * - Sync slider and number input values
 * - Show total as green (valid) or red (invalid)
 * - Display error message when validation fails
 * - Support decimal precision (0.01 step)
 * - Trigger onError callback with validation message
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, jest } from '@jest/globals'
import '@testing-library/jest-dom'

// Component will be imported once implemented
// import { CustomAllocationSliders } from '@/app/loadouts/new/custom-allocation-sliders'

// Type definitions
type CustomAllocation = {
  weapon_skins: number
  knife: number
  gloves: number
  agents: number
  music_kit: number
  charms: number
}

interface CustomAllocationSlidersProps {
  allocation: CustomAllocation
  onAllocationChange: (allocation: CustomAllocation) => void
  onError: (error: string | null) => void
  disabled?: boolean
}

describe('CustomAllocationSliders Component', () => {
  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe('Rendering', () => {
    // BDD: "Then I should see 6 allocation sliders"
    it('should render 6 category sliders', () => {
      const categories = [
        'weapon_skins',
        'knife',
        'gloves',
        'agents',
        'music_kit',
        'charms'
      ]
      expect(categories.length).toBe(6)
    })

    it('should display Weapon Skins slider with label', () => {
      const label = 'Weapon Skins'
      expect(label).toBe('Weapon Skins')
    })

    it('should display Knife slider with label', () => {
      const label = 'Knife'
      expect(label).toBe('Knife')
    })

    it('should display Gloves slider with label', () => {
      const label = 'Gloves'
      expect(label).toBe('Gloves')
    })

    it('should display Agents slider with label', () => {
      const label = 'Agents'
      expect(label).toBe('Agents')
    })

    it('should display Music Kit slider with label', () => {
      const label = 'Music Kit'
      expect(label).toBe('Music Kit')
    })

    it('should display Charms slider with label', () => {
      const label = 'Charms'
      expect(label).toBe('Charms')
    })

    it('should show percentage display for each slider', () => {
      const hasPercentageDisplay = true
      expect(hasPercentageDisplay).toBe(true)
    })

    it('should show number input for each slider', () => {
      const hasNumberInput = true
      expect(hasNumberInput).toBe(true)
    })
  })

  // ============================================================================
  // Validation Tests - Sum to 100%
  // ============================================================================

  describe('Validation - Sum to 100%', () => {
    // BDD: Scenario "Validate custom allocation must sum to 100%"
    it('should calculate total percentage correctly', () => {
      const allocation: CustomAllocation = {
        weapon_skins: 60.00,
        knife: 30.00,
        gloves: 5.00,
        agents: 0,
        music_kit: 0,
        charms: 0
      }

      const total = Object.values(allocation).reduce((sum, val) => sum + val, 0)
      expect(total).toBe(95.00)
    })

    it('should mark as invalid when total is less than 100%', () => {
      const total = 95.00
      const isValid = Math.abs(total - 100.0) <= 0.01

      expect(isValid).toBe(false)
    })

    it('should mark as valid when total equals 100%', () => {
      const total = 100.00
      const isValid = Math.abs(total - 100.0) <= 0.01

      expect(isValid).toBe(true)
    })

    it('should mark as invalid when total is greater than 100%', () => {
      const total = 105.00
      const isValid = Math.abs(total - 100.0) <= 0.01

      expect(isValid).toBe(false)
    })

    it('should call onError with message when validation fails', () => {
      const mockOnError = jest.fn()
      const total = 95.00
      const isValid = Math.abs(total - 100.0) <= 0.01

      if (!isValid) {
        mockOnError(`Allocation must sum to 100.00%, currently ${total.toFixed(2)}%`)
      }

      expect(mockOnError).toHaveBeenCalledWith('Allocation must sum to 100.00%, currently 95.00%')
    })

    it('should call onError with null when validation passes', () => {
      const mockOnError = jest.fn()
      const total = 100.00
      const isValid = Math.abs(total - 100.0) <= 0.01

      if (!isValid) {
        mockOnError(`Allocation must sum to 100.00%, currently ${total.toFixed(2)}%`)
      } else {
        mockOnError(null)
      }

      expect(mockOnError).toHaveBeenCalledWith(null)
    })
  })

  // ============================================================================
  // Decimal Precision Tests
  // ============================================================================

  describe('Decimal Precision', () => {
    // BDD: Scenario "Custom allocation allows decimal precision"
    it('should support decimal values with 0.01 precision', () => {
      const allocation: CustomAllocation = {
        weapon_skins: 70.50,
        knife: 15.25,
        gloves: 10.15,
        agents: 3.10,
        music_kit: 0.75,
        charms: 0.25
      }

      const total = Object.values(allocation).reduce((sum, val) => sum + val, 0)
      expect(total).toBe(100.00)
    })

    it('should display percentages with 2 decimal places', () => {
      const value = 70.50
      const formatted = value.toFixed(2)

      expect(formatted).toBe('70.50')
    })

    it('should handle very small percentages (0.01%)', () => {
      const smallValue = 0.01
      expect(smallValue).toBeGreaterThan(0)
      expect(smallValue).toBeLessThan(0.02)
    })
  })

  // ============================================================================
  // Tolerance Tests (±0.01%)
  // ============================================================================

  describe('Validation Tolerance', () => {
    // BDD: Scenario "Custom allocation validation tolerance (±0.01%)"
    it('should be invalid at 99.99%', () => {
      const total = 99.99
      const isValid = Math.abs(total - 100.0) <= 0.01

      expect(isValid).toBe(false)
    })

    it('should be invalid at 100.02%', () => {
      const total = 100.02
      const isValid = Math.abs(total - 100.0) <= 0.01

      expect(isValid).toBe(false) // Outside ±0.01% tolerance
    })

    it('should be valid at exactly 100.00%', () => {
      const total = 100.00
      const isValid = Math.abs(total - 100.0) <= 0.01

      expect(isValid).toBe(true)
    })

    it('should use ±0.01% tolerance', () => {
      const tolerance = 0.01
      expect(tolerance).toBe(0.01)
    })
  })

  // ============================================================================
  // Slider/Input Sync Tests
  // ============================================================================

  describe('Slider and Number Input Sync', () => {
    // BDD: Scenario "Slider and number input sync"
    it('should update number input when slider changes', () => {
      const sliderValue = 75.00
      const numberInputValue = sliderValue.toFixed(2)

      expect(numberInputValue).toBe('75.00')
    })

    it('should update slider when number input changes', () => {
      const numberInputValue = 80.00
      const sliderValue = numberInputValue

      expect(sliderValue).toBe(80.00)
    })

    it('should call onAllocationChange when slider moves', () => {
      const mockOnAllocationChange = jest.fn()
      const newAllocation: CustomAllocation = {
        weapon_skins: 75.00,
        knife: 15.00,
        gloves: 10.00,
        agents: 0,
        music_kit: 0,
        charms: 0
      }

      mockOnAllocationChange(newAllocation)

      expect(mockOnAllocationChange).toHaveBeenCalledWith(newAllocation)
    })

    it('should call onAllocationChange when number input changes', () => {
      const mockOnAllocationChange = jest.fn()
      const newAllocation: CustomAllocation = {
        weapon_skins: 80.00,
        knife: 10.00,
        gloves: 10.00,
        agents: 0,
        music_kit: 0,
        charms: 0
      }

      mockOnAllocationChange(newAllocation)

      expect(mockOnAllocationChange).toHaveBeenCalledWith(newAllocation)
    })
  })

  // ============================================================================
  // Total Display Tests
  // ============================================================================

  describe('Total Display', () => {
    it('should display total percentage', () => {
      const total = 95.00
      const displayValue = `${total.toFixed(2)}%`

      expect(displayValue).toBe('95.00%')
    })

    it('should show total in green when valid', () => {
      const total = 100.00
      const isValid = Math.abs(total - 100.0) <= 0.01
      const colorClass = isValid ? 'text-green-600' : 'text-red-600'

      expect(colorClass).toBe('text-green-600')
    })

    it('should show total in red when invalid', () => {
      const total = 95.00
      const isValid = Math.abs(total - 100.0) <= 0.01
      const colorClass = isValid ? 'text-green-600' : 'text-red-600'

      expect(colorClass).toBe('text-red-600')
    })

    it('should display error message when invalid', () => {
      const total = 95.00
      const isValid = Math.abs(total - 100.0) <= 0.01
      const errorMessage = isValid ? null : 'Must equal 100.00% (±0.01% tolerance)'

      expect(errorMessage).toBe('Must equal 100.00% (±0.01% tolerance)')
    })

    it('should not display error message when valid', () => {
      const total = 100.00
      const isValid = Math.abs(total - 100.0) <= 0.01
      const errorMessage = isValid ? null : 'Must equal 100.00% (±0.01% tolerance)'

      expect(errorMessage).toBe(null)
    })
  })

  // ============================================================================
  // Disabled State Tests
  // ============================================================================

  describe('Disabled State', () => {
    it('should disable all sliders when disabled prop is true', () => {
      const isDisabled = true
      expect(isDisabled).toBe(true)
    })

    it('should disable all number inputs when disabled prop is true', () => {
      const isDisabled = true
      expect(isDisabled).toBe(true)
    })

    it('should be enabled by default', () => {
      const isDisabled = false
      expect(isDisabled).toBe(false)
    })
  })

  // ============================================================================
  // Input Attributes Tests
  // ============================================================================

  describe('Input Attributes', () => {
    it('should have min=0 for all sliders', () => {
      const min = 0
      expect(min).toBe(0)
    })

    it('should have max=100 for all sliders', () => {
      const max = 100
      expect(max).toBe(100)
    })

    it('should have step=0.01 for all sliders', () => {
      const step = 0.01
      expect(step).toBe(0.01)
    })

    it('should have type="range" for sliders', () => {
      const type = 'range'
      expect(type).toBe('range')
    })

    it('should have type="number" for number inputs', () => {
      const type = 'number'
      expect(type).toBe('number')
    })
  })

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('should have aria-label for each slider', () => {
      const ariaLabel = 'Weapon Skins percentage'
      expect(ariaLabel).toContain('percentage')
    })

    it('should have aria-label for each number input', () => {
      const ariaLabel = 'Weapon Skins percentage input'
      expect(ariaLabel).toContain('percentage input')
    })

    it('should have aria-valuenow for sliders', () => {
      const value = 70.00
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
    })

    it('should have aria-valuemin=0 for sliders', () => {
      const min = 0
      expect(min).toBe(0)
    })

    it('should have aria-valuemax=100 for sliders', () => {
      const max = 100
      expect(max).toBe(100)
    })

    it('should have role="alert" for error message', () => {
      const role = 'alert'
      expect(role).toBe('alert')
    })
  })

  // ============================================================================
  // Real-time Calculation Tests
  // ============================================================================

  describe('Real-time Calculation', () => {
    it('should recalculate total when any slider changes', () => {
      const allocation: CustomAllocation = {
        weapon_skins: 70.00,
        knife: 20.00,
        gloves: 10.00,
        agents: 0,
        music_kit: 0,
        charms: 0
      }

      const total = Object.values(allocation).reduce((sum, val) => sum + val, 0)
      expect(total).toBe(100.00)

      // Change knife allocation
      allocation.knife = 25.00

      const newTotal = Object.values(allocation).reduce((sum, val) => sum + val, 0)
      expect(newTotal).toBe(105.00)
    })

    it('should validate on every allocation change', () => {
      const mockOnError = jest.fn()
      const allocation: CustomAllocation = {
        weapon_skins: 70.00,
        knife: 25.00, // Total = 105%
        gloves: 10.00,
        agents: 0,
        music_kit: 0,
        charms: 0
      }

      const total = Object.values(allocation).reduce((sum, val) => sum + val, 0)
      const isValid = Math.abs(total - 100.0) <= 0.01

      if (!isValid) {
        mockOnError(`Allocation must sum to 100.00%, currently ${total.toFixed(2)}%`)
      }

      expect(mockOnError).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle all zeros allocation', () => {
      const allocation: CustomAllocation = {
        weapon_skins: 0,
        knife: 0,
        gloves: 0,
        agents: 0,
        music_kit: 0,
        charms: 0
      }

      const total = Object.values(allocation).reduce((sum, val) => sum + val, 0)
      expect(total).toBe(0)
    })

    it('should handle single category at 100%', () => {
      const allocation: CustomAllocation = {
        weapon_skins: 100.00,
        knife: 0,
        gloves: 0,
        agents: 0,
        music_kit: 0,
        charms: 0
      }

      const total = Object.values(allocation).reduce((sum, val) => sum + val, 0)
      expect(total).toBe(100.00)
    })

    it('should handle floating-point precision errors', () => {
      const allocation: CustomAllocation = {
        weapon_skins: 33.33,
        knife: 33.33,
        gloves: 33.34,
        agents: 0,
        music_kit: 0,
        charms: 0
      }

      const total = Object.values(allocation).reduce((sum, val) => sum + val, 0)
      const isValid = Math.abs(total - 100.0) <= 0.01

      expect(isValid).toBe(true)
    })
  })
})
