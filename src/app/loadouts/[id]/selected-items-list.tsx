'use client'

/**
 * SelectedItemsList Client Component (STUB - Iteration 1)
 *
 * BDD: features/08-budget-loadout-builder-phase6.feature
 * Tests: __tests__/SelectedItemsList.test.tsx
 *
 * Responsibilities:
 * - Display list of selected items
 * - Group by category
 * - Show Remove/Change buttons
 * - Real-time updates
 *
 * THIS IS A STUB - Full implementation in next iteration
 */

interface SelectedItem {
  id: string
  item_id: string
  weapon_type: string
  category: string
  item: {
    name: string
    display_name: string
    image_url: string
    quality: string
    wear: string
    rarity: string | null
  }
  price: number
}

export interface SelectedItemsListProps {
  selectedItems: SelectedItem[]
  onRemove: (id: string) => Promise<any>
  onChange: (oldId: string, newItemId: string) => Promise<any>
}

export function SelectedItemsList({
  selectedItems,
  onRemove,
  onChange
}: SelectedItemsListProps) {
  if (selectedItems.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Selected Items</h2>
        <p className="text-sm text-gray-500">No items selected yet</p>
        <p className="text-xs text-gray-400 mt-2">Browse items by category to build your loadout</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Selected Items ({selectedItems.length})
      </h2>
      <div className="space-y-2">
        {selectedItems.map(item => (
          <div key={item.id} className="text-sm border-b border-gray-100 pb-2">
            <div className="font-medium">{item.weapon_type}</div>
            <div className="text-gray-600 text-xs">${item.price.toFixed(2)}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-xs text-gray-500">
        Detailed list with Remove/Change buttons coming in next iteration...
      </div>
    </div>
  )
}
