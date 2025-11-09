'use client'

/**
 * CustomAllocationSliders Component
 *
 * Displays 6 category sliders for custom budget allocation:
 * - Weapon Skins, Knife, Gloves, Agents, Music Kit, Charms
 * - Must sum to 100.00% (±0.01% tolerance)
 * - Dual input: slider + number input (synced)
 * - Real-time validation with visual feedback
 */

import React, { useEffect } from 'react'

export type CustomAllocation = {
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

interface CategoryConfig {
  key: keyof CustomAllocation
  label: string
}

const CATEGORIES: CategoryConfig[] = [
  { key: 'weapon_skins', label: 'Weapon Skins' },
  { key: 'knife', label: 'Knife' },
  { key: 'gloves', label: 'Gloves' },
  { key: 'agents', label: 'Agents' },
  { key: 'music_kit', label: 'Music Kit' },
  { key: 'charms', label: 'Charms' }
]

export function CustomAllocationSliders({
  allocation,
  onAllocationChange,
  onError,
  disabled = false
}: CustomAllocationSlidersProps) {
  // Calculate total percentage
  const total = Object.values(allocation).reduce((sum, val) => sum + val, 0)
  const isValid = Math.abs(total - 100.0) <= 0.01

  // Trigger error callback when validation changes
  useEffect(() => {
    if (!isValid) {
      onError(`Allocation must sum to 100.00%, currently ${total.toFixed(2)}%`)
    } else {
      onError(null)
    }
  }, [isValid, total, onError])

  const handleSliderChange = (key: keyof CustomAllocation, value: number) => {
    onAllocationChange({
      ...allocation,
      [key]: value
    })
  }

  const handleNumberInputChange = (key: keyof CustomAllocation, value: string) => {
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      onAllocationChange({
        ...allocation,
        [key]: numValue
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {CATEGORIES.map((category) => {
          const value = allocation[category.key]

          return (
            <div key={category.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`slider-${category.key}`}
                  className="text-sm font-medium text-gray-900"
                >
                  {category.label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    id={`input-${category.key}`}
                    value={value.toFixed(2)}
                    onChange={(e) => handleNumberInputChange(category.key, e.target.value)}
                    disabled={disabled}
                    min={0}
                    max={100}
                    step={0.01}
                    aria-label={`${category.label} percentage input`}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              </div>

              <input
                type="range"
                id={`slider-${category.key}`}
                value={value}
                onChange={(e) => handleSliderChange(category.key, parseFloat(e.target.value))}
                disabled={disabled}
                min={0}
                max={100}
                step={0.01}
                aria-label={`${category.label} percentage`}
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={100}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          )
        })}
      </div>

      {/* Total Display */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">Total:</span>
          <span
            className={`text-lg font-bold ${
              isValid ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {total.toFixed(2)}%
          </span>
        </div>

        {!isValid && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            Must equal 100.00% (±0.01% tolerance)
          </p>
        )}
      </div>
    </div>
  )
}
