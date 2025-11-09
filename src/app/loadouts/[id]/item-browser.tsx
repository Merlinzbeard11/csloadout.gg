'use client'

/**
 * ItemBrowser Client Component (STUB - Iteration 1)
 *
 * BDD: features/08-budget-loadout-builder-phase6.feature
 * Tests: __tests__/ItemBrowser.test.tsx
 *
 * Responsibilities:
 * - Display items in responsive grid layout
 * - Filter by weapon_type, wear, quality, price range
 * - Paginate results (20 per page)
 * - Search by item name
 * - Show multi-platform pricing
 * - Highlight items within/over budget
 * - Disable "Add to Loadout" for over-budget items
 *
 * THIS IS A STUB - Full implementation in next iteration
 */

export interface ItemBrowserProps {
  category: string
  categoryBudget: number
  remainingBudget: number
  selectedItems: string[]
  onItemSelect: (loadoutId: string, itemId: string) => Promise<any>
}

export function ItemBrowser({
  category,
  categoryBudget,
  remainingBudget,
  selectedItems,
  onItemSelect
}: ItemBrowserProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Browse Items</h2>
      <p className="text-gray-600">
        Category: {category} | Budget: ${categoryBudget.toFixed(2)} | Remaining: ${remainingBudget.toFixed(2)}
      </p>
      <div className="mt-4 text-sm text-gray-500">
        Item browser implementation coming in next iteration...
      </div>
    </div>
  )
}
