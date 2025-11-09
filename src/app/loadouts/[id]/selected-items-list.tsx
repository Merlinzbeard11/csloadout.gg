'use client'

/**
 * SelectedItemsList Client Component (Full Implementation - Iteration 2)
 *
 * BDD: features/08-budget-loadout-builder-phase6.feature
 * Tests: __tests__/SelectedItemsList.test.tsx
 *
 * Responsibilities:
 * - Display list of selected items
 * - Group by category
 * - Show Remove/Change buttons
 * - Real-time updates with optimistic UI
 */

import { useState } from 'react'

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
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Group items by category
  const groupedItems = selectedItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, SelectedItem[]>)

  // Calculate total cost
  const totalCost = selectedItems.reduce((sum, item) => sum + item.price, 0)

  const handleRemove = async (id: string) => {
    setRemovingId(id)
    try {
      await onRemove(id)
    } catch (error) {
      console.error('Failed to remove item:', error)
    } finally {
      setRemovingId(null)
    }
  }

  if (selectedItems.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Selected Items</h2>
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No items selected yet</p>
          <p className="text-xs text-gray-400 mt-1">Browse items by category to build your loadout</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Selected Items ({selectedItems.length})
        </h2>
        <span className="text-sm font-bold text-blue-600">
          ${totalCost.toFixed(2)}
        </span>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category}>
            {/* Category Header */}
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              {formatCategoryName(category)}
            </h3>

            {/* Items in Category */}
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`
                    border rounded-lg p-3 transition-opacity
                    ${removingId === item.id ? 'opacity-50' : 'opacity-100'}
                  `}
                >
                  <div className="flex gap-3">
                    {/* Item Image */}
                    <img
                      src={item.item.image_url}
                      alt={item.item.display_name}
                      className="w-16 h-16 object-cover rounded"
                    />

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {item.item.display_name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatWear(item.item.wear)}
                      </p>
                      {item.item.quality !== 'normal' && (
                        <p className="text-xs text-purple-600 font-medium mt-0.5">
                          StatTrak™
                        </p>
                      )}
                      {item.item.rarity && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatRarity(item.item.rarity)}
                        </p>
                      )}
                      <p className="text-sm font-bold text-green-600 mt-1">
                        ${item.price.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleRemove(item.id)}
                      disabled={removingId === item.id}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {removingId === item.id ? 'Removing...' : 'Remove'}
                    </button>
                    <button
                      onClick={() => {
                        // NOTE: Change functionality requires item browser integration
                        // For now, just a placeholder
                        console.log('Change item:', item.id)
                      }}
                      disabled={removingId === item.id}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="mt-6 pt-4 border-t">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Total</span>
          <span className="text-lg font-bold text-gray-900">${totalCost.toFixed(2)}</span>
        </div>
      </div>
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
 * Helper: Format wear for display
 */
function formatWear(wear: string): string {
  return wear.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

/**
 * Helper: Format rarity for display
 */
function formatRarity(rarity: string): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1)
}
