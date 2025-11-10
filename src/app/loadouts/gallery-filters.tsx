'use client'

/**
 * GalleryFilters Client Component
 *
 * BDD Phase 7c: features/08-budget-loadout-builder-phase7.feature
 *   - Budget range filtering (lines 129-134)
 *   - Theme filtering (lines 136-141)
 *   - Sorting (lines 143-152)
 *
 * Client component for filter controls that update URL searchParams
 */

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'

interface GalleryFiltersProps {
  currentBudgetMin?: number
  currentBudgetMax?: number
  currentTheme?: string
  currentSort: string
}

export function GalleryFilters({
  currentBudgetMin,
  currentBudgetMax,
  currentTheme,
  currentSort
}: GalleryFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [budgetMin, setBudgetMin] = useState(currentBudgetMin?.toString() || '')
  const [budgetMax, setBudgetMax] = useState(currentBudgetMax?.toString() || '')
  const [theme, setTheme] = useState(currentTheme || 'all')
  const [sort, setSort] = useState(currentSort)

  const updateFilters = () => {
    const params = new URLSearchParams(searchParams.toString())

    // Budget filters
    if (budgetMin) {
      params.set('budgetMin', budgetMin)
    } else {
      params.delete('budgetMin')
    }

    if (budgetMax) {
      params.set('budgetMax', budgetMax)
    } else {
      params.delete('budgetMax')
    }

    // Theme filter
    if (theme && theme !== 'all') {
      params.set('theme', theme)
    } else {
      params.delete('theme')
    }

    // Sort
    if (sort && sort !== 'upvotes') {
      params.set('sort', sort)
    } else {
      params.delete('sort')
    }

    // Reset to page 1 when filters change
    params.delete('page')

    startTransition(() => {
      router.push(`/loadouts?${params.toString()}`)
    })
  }

  const clearFilters = () => {
    setBudgetMin('')
    setBudgetMax('')
    setTheme('all')
    setSort('upvotes')
    router.push('/loadouts')
  }

  // Preset budget ranges
  const setBudgetPreset = (min: number | null, max: number | null) => {
    setBudgetMin(min?.toString() || '')
    setBudgetMax(max?.toString() || '')
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Budget Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Budget Range
          </label>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="number"
              placeholder="Min"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              placeholder="Max"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setBudgetPreset(null, 50)}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              Under $50
            </button>
            <button
              onClick={() => setBudgetPreset(50, 150)}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              $50-$150
            </button>
            <button
              onClick={() => setBudgetPreset(150, 500)}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              $150-$500
            </button>
            <button
              onClick={() => setBudgetPreset(500, null)}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              $500+
            </button>
          </div>
        </div>

        {/* Theme Filter */}
        <div>
          <label htmlFor="theme-filter" className="block text-sm font-medium text-gray-700 mb-2">
            Theme
          </label>
          <select
            id="theme-filter"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Themes</option>
            <option value="red">Red</option>
            <option value="blue">Blue</option>
            <option value="dragon">Dragon</option>
            <option value="green">Green</option>
            <option value="purple">Purple</option>
            <option value="gold">Gold</option>
          </select>
        </div>

        {/* Sort */}
        <div>
          <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-2">
            Sort By
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="upvotes">Most Upvoted</option>
            <option value="views">Most Viewed</option>
            <option value="recent">Recently Published</option>
            <option value="budget_asc">Budget: Low to High</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Actions
          </label>
          <button
            onClick={updateFilters}
            disabled={isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {isPending ? 'Applying...' : 'Apply Filters'}
          </button>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  )
}
