'use client'

/**
 * BudgetTracker Client Component (STUB - Iteration 1)
 *
 * BDD: features/08-budget-loadout-builder-phase6.feature
 * Tests: __tests__/BudgetTracker.test.tsx
 *
 * Responsibilities:
 * - Display total budget, spent, remaining
 * - Display category-level budgets
 * - Real-time updates
 * - Visual indicators (progress bars, colors)
 *
 * THIS IS A STUB - Full implementation in next iteration
 */

interface CustomAllocation {
  weapon_skins: number
  knife: number
  gloves: number
  agents: number
  music_kit: number
  charms: number
}

interface SelectedItem {
  id: string
  category: string
  price: number
}

export interface BudgetTrackerProps {
  totalBudget: number
  allocation: CustomAllocation
  selectedItems: SelectedItem[]
}

export function BudgetTracker({
  totalBudget,
  allocation,
  selectedItems
}: BudgetTrackerProps) {
  const spent = selectedItems.reduce((sum, item) => sum + item.price, 0)
  const remaining = totalBudget - spent

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Budget Tracker</h2>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Total:</span>
          <span className="text-sm font-bold">${totalBudget.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Spent:</span>
          <span className="text-sm font-bold text-blue-600">${spent.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Remaining:</span>
          <span className="text-sm font-bold text-green-600">${remaining.toFixed(2)}</span>
        </div>
      </div>
      <div className="mt-4 text-xs text-gray-500">
        Detailed breakdown coming in next iteration...
      </div>
    </div>
  )
}
