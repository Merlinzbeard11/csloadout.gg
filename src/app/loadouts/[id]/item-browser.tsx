'use client'

/**
 * ItemBrowser Client Component (Full Implementation - Iteration 3)
 *
 * BDD: features/08-budget-loadout-builder-phase6.feature (Scenarios 60, 86, 125+)
 * Tests: __tests__/ItemBrowser.test.tsx
 *
 * Displays items from database in filterable, paginated grid.
 * Items fetched in Server Component and passed as props.
 */

import { useState } from 'react'

interface MarketplacePrice {
  id: string
  platform: string
  total_cost: number
}

interface Item {
  id: string
  name: string
  display_name: string
  weapon_type: string | null
  wear: string | null
  quality: string
  rarity: string | null
  image_url: string
  marketplace_prices: MarketplacePrice[]
}

export interface ItemBrowserProps {
  category: string
  categoryBudget: number
  remainingBudget: number
  selectedItems: string[]
  onItemSelect: (loadoutId: string, itemId: string) => Promise<any>
  items: Item[]
  loadoutId: string
}

export function ItemBrowser({
  category,
  categoryBudget,
  remainingBudget,
  selectedItems,
  onItemSelect,
  items,
  loadoutId
}: ItemBrowserProps) {
  const [weaponFilter, setWeaponFilter] = useState<string>('all')
  const [wearFilter, setWearFilter] = useState<string>('all')
  const [qualityFilter, setQualityFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Get unique weapon types from items
  const uniqueWeaponTypes = Array.from(
    new Set(items.map(item => item.weapon_type).filter((wt): wt is string => wt !== null))
  ).sort()

  // Filter items
  const filteredItems = items.filter(item => {
    if (weaponFilter !== 'all' && item.weapon_type !== weaponFilter) return false
    if (wearFilter !== 'all' && item.wear !== wearFilter) return false
    if (qualityFilter !== 'all' && item.quality !== qualityFilter) return false
    if (searchQuery && !item.display_name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Browse Items</h2>
      <p className="text-sm text-gray-600 mb-4">
        Budget: ${categoryBudget.toFixed(2)} | Remaining: ${remainingBudget.toFixed(2)}
      </p>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Search items..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Weapon Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Weapon</label>
          <select
            value={weaponFilter}
            onChange={(e) => {
              setWeaponFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Weapons</option>
            {uniqueWeaponTypes.map(weaponType => (
              <option key={weaponType} value={weaponType}>
                {weaponType}
              </option>
            ))}
          </select>
        </div>

        {/* Wear */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Wear</label>
          <select
            value={wearFilter}
            onChange={(e) => {
              setWearFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Any Wear</option>
            <option value="factory_new">Factory New</option>
            <option value="minimal_wear">Minimal Wear</option>
            <option value="field_tested">Field-Tested</option>
          </select>
        </div>

        {/* Quality */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quality</label>
          <select
            value={qualityFilter}
            onChange={(e) => {
              setQualityFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All</option>
            <option value="normal">Normal</option>
            <option value="stattrak">StatTrak™</option>
          </select>
        </div>
      </div>

      {/* Items Grid */}
      {paginatedItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No items found matching your filters</p>
          <button
            onClick={() => {
              setWeaponFilter('all')
              setWearFilter('all')
              setQualityFilter('all')
              setSearchQuery('')
            }}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {paginatedItems.map((item) => {
            const bestPrice = item.marketplace_prices.length > 0
              ? Math.min(...item.marketplace_prices.map(p => Number(p.total_cost)))
              : 0
            const isOverBudget = bestPrice > remainingBudget
            const isSelected = selectedItems.includes(item.id)

            return (
              <div
                key={item.id}
                className={`
                  border rounded-lg p-3 hover:shadow-md transition-shadow
                  ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                `}
              >
                <img
                  src={item.image_url}
                  alt={item.display_name}
                  className="w-full h-24 object-cover rounded mb-2"
                />
                <h3 className="text-sm font-medium text-gray-900 truncate">{item.display_name}</h3>
                {item.wear && (
                  <p className="text-xs text-gray-500">{formatWear(item.wear)}</p>
                )}
                {item.quality !== 'normal' && (
                  <p className="text-xs text-purple-600 font-medium">StatTrak™</p>
                )}
                {bestPrice > 0 ? (
                  <p className="text-sm font-bold text-green-600 mt-2">${bestPrice.toFixed(2)}</p>
                ) : (
                  <p className="text-sm font-bold text-gray-400 mt-2">No price</p>
                )}

                <button
                  onClick={() => onItemSelect(loadoutId, item.id)}
                  disabled={isOverBudget || isSelected || bestPrice === 0}
                  className={`
                    w-full mt-2 px-3 py-1 text-xs font-medium rounded
                    ${isOverBudget || bestPrice === 0
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : isSelected
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }
                  `}
                >
                  {bestPrice === 0 ? 'No Price' : isOverBudget ? 'Over Budget' : isSelected ? 'Selected' : 'Add to Loadout'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function formatWear(wear: string): string {
  return wear.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
