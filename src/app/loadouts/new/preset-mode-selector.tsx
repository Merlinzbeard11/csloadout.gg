'use client'

/**
 * PresetModeSelector Component
 *
 * Displays 4 preset allocation modes as radio buttons:
 * - Balance: 70% weapons, 15% knife, 10% gloves
 * - Price: 80% weapons (maximize weapon skins)
 * - Quality: 60% weapons, 20% knife (balanced high-end)
 * - Color Match: 65% weapons, 18% knife (visual cohesion)
 */

import React from 'react'

export type PresetMode = 'balance' | 'price' | 'quality' | 'color_match'

interface PresetModeSelectorProps {
  selectedMode: PresetMode
  onModeChange: (mode: PresetMode) => void
  disabled?: boolean
}

interface ModeOption {
  value: PresetMode
  label: string
  description: string
}

const PRESET_MODES: ModeOption[] = [
  {
    value: 'balance',
    label: 'Balance',
    description: '70% weapons, 15% knife, 10% gloves'
  },
  {
    value: 'price',
    label: 'Price',
    description: '80% weapons (maximize weapon skins)'
  },
  {
    value: 'quality',
    label: 'Quality',
    description: '60% weapons, 20% knife (balanced high-end)'
  },
  {
    value: 'color_match',
    label: 'Color Match',
    description: '65% weapons, 18% knife (visual cohesion)'
  }
]

export function PresetModeSelector({ selectedMode, onModeChange, disabled = false }: PresetModeSelectorProps) {
  return (
    <fieldset className="space-y-3" disabled={disabled} style={{ opacity: disabled ? 0.5 : 1.0 }}>
      <legend className="text-sm font-medium text-gray-900">Allocation Strategy</legend>

      <div className="space-y-2">
        {PRESET_MODES.map((mode) => {
          const isSelected = mode.value === selectedMode

          return (
            <div
              key={mode.value}
              className={`
                relative flex items-start p-3 border rounded-lg cursor-pointer transition-colors
                ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
              onClick={() => !disabled && onModeChange(mode.value)}
            >
              <div className="flex items-center h-5">
                <input
                  type="radio"
                  id={`preset-${mode.value}`}
                  name="presetMode"
                  value={mode.value}
                  checked={isSelected}
                  onChange={() => !disabled && onModeChange(mode.value)}
                  disabled={disabled}
                  aria-label={`${mode.label} preset mode`}
                  aria-describedby={`preset-${mode.value}-description`}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
              </div>

              <div className="ml-3 flex-1">
                <label
                  htmlFor={`preset-${mode.value}`}
                  className="block text-sm font-medium text-gray-900 cursor-pointer"
                >
                  {mode.label}
                </label>
                <p
                  id={`preset-${mode.value}-description`}
                  className="text-sm text-gray-500"
                >
                  {mode.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}
