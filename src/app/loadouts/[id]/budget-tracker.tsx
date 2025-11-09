'use client'

/**
 * BudgetTracker Client Component (Full Implementation - Iteration 2)
 *
 * BDD: features/08-budget-loadout-builder-phase6.feature
 * Tests: __tests__/BudgetTracker.test.tsx
 *
 * Responsibilities:
 * - Display total budget, spent, remaining
 * - Display category-level budgets with progress bars
 * - Real-time updates as items added/removed
 * - Visual indicators (green/yellow/red based on budget usage)
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

interface CategoryBudget {
  name: string
  displayName: string
  allocated: number
  spent: number
  percentage: number
}

export function BudgetTracker({
  totalBudget,
  allocation,
  selectedItems
}: BudgetTrackerProps) {
  const spent = selectedItems.reduce((sum, item) => sum + item.price, 0)
  const remaining = totalBudget - spent
  const spentPercentage = (spent / totalBudget) * 100

  // Calculate category budgets
  const categories: CategoryBudget[] = Object.entries(allocation)
    .filter(([_, percentage]) => percentage > 0)
    .map(([category, percentage]) => {
      const allocated = (totalBudget * percentage) / 100
      const categorySpent = selectedItems
        .filter(item => item.category === category)
        .reduce((sum, item) => sum + item.price, 0)

      return {
        name: category,
        displayName: formatCategoryName(category),
        allocated,
        spent: categorySpent,
        percentage
      }
    })

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Budget Tracker</h2>

      {/* Total Budget Summary */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Budget</span>
          <span className="text-sm font-bold">${totalBudget.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Spent</span>
          <span className={`text-sm font-bold ${getSpentColor(spentPercentage)}`}>
            ${spent.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Remaining</span>
          <span className={`text-sm font-bold ${getRemainingColor(spentPercentage)}`}>
            ${remaining.toFixed(2)}
          </span>
        </div>

        {/* Overall Progress Bar */}
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${getProgressBarColor(spentPercentage)}`}
              style={{ width: `${Math.min(spentPercentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 text-right">
            {spentPercentage.toFixed(1)}% used
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Category Breakdown</h3>
        <div className="space-y-4">
          {categories.map((category) => {
            const categoryPercentage = (category.spent / category.allocated) * 100
            const remaining = category.allocated - category.spent

            return (
              <div key={category.name} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">
                    {category.displayName}
                  </span>
                  <span className="text-xs text-gray-500">
                    {category.percentage.toFixed(0)}%
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className={getSpentColor(categoryPercentage)}>
                    ${category.spent.toFixed(2)} / ${category.allocated.toFixed(2)}
                  </span>
                  <span className={getRemainingColor(categoryPercentage)}>
                    ${remaining.toFixed(2)} left
                  </span>
                </div>

                {/* Category Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${getProgressBarColor(categoryPercentage)}`}
                    style={{ width: `${Math.min(categoryPercentage, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Budget Status Indicator */}
      {spentPercentage >= 90 && (
        <div className={`mt-4 p-3 rounded-lg ${
          spentPercentage >= 100
            ? 'bg-red-50 border border-red-200'
            : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <p className={`text-xs font-medium ${
            spentPercentage >= 100 ? 'text-red-800' : 'text-yellow-800'
          }`}>
            {spentPercentage >= 100
              ? 'Budget exceeded! Remove items to stay within budget.'
              : 'Approaching budget limit. Consider your remaining selections carefully.'}
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Helper: Format category name for display
 */
function formatCategoryName(category: string): string {
  const names: Record<string, string> = {
    weapon_skins: 'Weapon Skins',
    knife: 'Knife',
    gloves: 'Gloves',
    agents: 'Agents',
    music_kit: 'Music Kit',
    charms: 'Charms'
  }
  return names[category] || category
}

/**
 * Helper: Get color class for spent amount
 */
function getSpentColor(percentage: number): string {
  if (percentage >= 100) return 'text-red-600'
  if (percentage >= 90) return 'text-yellow-600'
  return 'text-blue-600'
}

/**
 * Helper: Get color class for remaining amount
 */
function getRemainingColor(percentage: number): string {
  if (percentage >= 100) return 'text-red-600'
  if (percentage >= 90) return 'text-yellow-600'
  return 'text-green-600'
}

/**
 * Helper: Get progress bar color
 */
function getProgressBarColor(percentage: number): string {
  if (percentage >= 100) return 'bg-red-500'
  if (percentage >= 90) return 'bg-yellow-500'
  if (percentage >= 75) return 'bg-blue-500'
  return 'bg-green-500'
}
