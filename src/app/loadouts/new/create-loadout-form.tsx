'use client'

/**
 * CreateLoadoutForm Component
 *
 * Main form for creating budget loadouts with:
 * - Name, description, budget, theme inputs
 * - Preset/custom allocation mode toggle
 * - Real-time validation (on blur)
 * - Server Action submission with useTransition
 * - Loading states and error handling
 */

import React, { useState, useTransition } from 'react'
import { PresetModeSelector, type PresetMode } from './preset-mode-selector'
import { CustomAllocationSliders, type CustomAllocation } from './custom-allocation-sliders'
import { BudgetVisualization } from './budget-visualization'
import { getPresetAllocation } from '@/lib/budget-loadout/custom-allocation-validator'

interface CreateLoadoutFormProps {
  userId: string
  createLoadoutAction: (formData: FormData) => Promise<{ success: boolean; errors?: any; loadoutId?: string }>
}

interface FormErrors {
  name?: string
  description?: string
  budget?: string
  custom_allocation?: string
  _form?: string
}

const THEME_OPTIONS = [
  { value: '', label: 'No theme preference' },
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'purple', label: 'Purple' },
  { value: 'gold', label: 'Gold' }
]

export function CreateLoadoutForm({ userId, createLoadoutAction }: CreateLoadoutFormProps) {
  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')
  const [theme, setTheme] = useState('')
  const [useCustomAllocation, setUseCustomAllocation] = useState(false)
  const [presetMode, setPresetMode] = useState<PresetMode>('balance')
  const [customAllocation, setCustomAllocation] = useState<CustomAllocation>(
    getPresetAllocation('balance')
  )

  // Validation state
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Submission state
  const [isPending, startTransition] = useTransition()

  // Get current allocation (preset or custom)
  const currentAllocation = useCustomAllocation
    ? customAllocation
    : getPresetAllocation(presetMode)

  // Validation functions
  const validateName = (value: string): string | undefined => {
    if (!value.trim()) return 'Name is required'
    if (value.trim().length < 3) return 'Name must be at least 3 characters'
    if (value.trim().length > 100) return 'Name must be 100 characters or less'
    return undefined
  }

  const validateBudget = (value: string): string | undefined => {
    if (!value.trim()) return 'Budget is required'

    const budgetNum = parseFloat(value)
    if (isNaN(budgetNum)) return 'Budget must be a valid number'
    if (budgetNum <= 0) return 'Budget must be positive'
    if (budgetNum < 10) return 'Minimum budget is $10'
    if (budgetNum > 100000) return 'Maximum budget is $100,000'

    return undefined
  }

  // Handle field blur (validation)
  const handleBlur = (field: string, value: string) => {
    setTouched({ ...touched, [field]: true })

    let error: string | undefined
    if (field === 'name') error = validateName(value)
    if (field === 'budget') error = validateBudget(value)

    setErrors({ ...errors, [field]: error })
  }

  // Handle custom allocation error
  const handleAllocationError = (error: string | null) => {
    setErrors({ ...errors, custom_allocation: error || undefined })
  }

  // Form validation
  const isFormValid = () => {
    const nameError = validateName(name)
    const budgetError = validateBudget(budget)
    const allocationError = useCustomAllocation ? errors.custom_allocation : undefined

    return !nameError && !budgetError && !allocationError
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!isFormValid() || isPending) return

    const formData = new FormData(e.currentTarget)
    formData.append('userId', userId)
    formData.append('useCustomAllocation', useCustomAllocation.toString())
    formData.append('presetMode', presetMode)

    // Add custom allocation percentages if enabled
    if (useCustomAllocation) {
      Object.entries(customAllocation).forEach(([key, value]) => {
        formData.append(key, value.toString())
      })
    }

    startTransition(async () => {
      const result = await createLoadoutAction(formData)

      if (!result.success && result.errors) {
        setErrors(result.errors)
      }
    })
  }

  const budgetNum = parseFloat(budget) || 0

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Form-level error */}
      {errors._form && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{errors._form}</p>
        </div>
      )}

      {/* Name Input */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={(e) => handleBlur('name', e.target.value)}
          disabled={isPending}
          required
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          placeholder="e.g., Red Dragon Budget"
        />
        {touched.name && errors.name && (
          <p id="name-error" role="alert" className="mt-1 text-sm text-red-600">
            {errors.name}
          </p>
        )}
      </div>

      {/* Description Textarea */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-1">
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isPending}
          rows={3}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          placeholder="Describe your loadout theme or goals..."
        />
      </div>

      {/* Budget Input */}
      <div>
        <label htmlFor="budget" className="block text-sm font-medium text-gray-900 mb-1">
          Budget <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">$</span>
          </div>
          <input
            type="number"
            id="budget"
            name="budget"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            onBlur={(e) => handleBlur('budget', e.target.value)}
            disabled={isPending}
            required
            min={10}
            max={100000}
            step={0.01}
            aria-required="true"
            aria-invalid={!!errors.budget}
            aria-describedby={errors.budget ? 'budget-error' : undefined}
            className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            placeholder="150.00"
          />
        </div>
        {touched.budget && errors.budget && (
          <p id="budget-error" role="alert" className="mt-1 text-sm text-red-600">
            {errors.budget}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-500">Minimum: $10, Maximum: $100,000</p>
      </div>

      {/* Theme Selector */}
      <div>
        <label htmlFor="theme" className="block text-sm font-medium text-gray-900 mb-1">
          Theme (optional)
        </label>
        <select
          id="theme"
          name="theme"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          disabled={isPending}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
        >
          {THEME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Allocation Mode Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="useCustomAllocation"
          checked={useCustomAllocation}
          onChange={(e) => setUseCustomAllocation(e.target.checked)}
          disabled={isPending}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="useCustomAllocation" className="text-sm font-medium text-gray-900">
          Use custom allocation
        </label>
      </div>

      {/* Preset Mode Selector or Custom Allocation Sliders */}
      {!useCustomAllocation ? (
        <PresetModeSelector
          selectedMode={presetMode}
          onModeChange={setPresetMode}
          disabled={isPending}
        />
      ) : (
        <CustomAllocationSliders
          allocation={customAllocation}
          onAllocationChange={setCustomAllocation}
          onError={handleAllocationError}
          disabled={isPending}
        />
      )}

      {/* Budget Visualization */}
      {budgetNum > 0 && (
        <BudgetVisualization
          budget={budgetNum}
          allocation={currentAllocation}
        />
      )}

      {/* Submit Button */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={!isFormValid() || isPending}
          aria-busy={isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending && (
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          {isPending ? 'Creating...' : 'Create Loadout'}
        </button>
      </div>
    </form>
  )
}
