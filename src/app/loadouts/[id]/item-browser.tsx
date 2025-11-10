'use client'

/**
 * ItemBrowser Client Component (Full Implementation - Iteration 4)
 *
 * BDD: features/08-budget-loadout-builder-phase6.feature (Scenarios 60, 86, 125+)
 * Tests: __tests__/ItemBrowser.test.tsx
 *
 * Displays items from database in filterable, paginated grid.
 * Items fetched in Server Component and passed as props.
 * Iteration 4: Loading states, error handling, optimistic UI
 */

import { useState, useTransition } from 'react'

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
  onItemSelect: (loadoutId: string, itemId: string, weaponType: string) => Promise<any>
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
  const [isPending, startTransition] = useTransition()
  const [pendingItemId, setPendingItemId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
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

  // Handle item selection with loading state and error handling
  const handleItemSelect = async (itemId: string, weaponType: string) => {
    setError(null)
    setPendingItemId(itemId)

    startTransition(async () => {
      try {
        const result = await onItemSelect(loadoutId, itemId, weaponType)

        if (result && !result.success) {
          setError(result.error || 'Failed to add item to loadout')
        }
      } catch (err) {
        console.error('Error selecting item:', err)
        setError('An unexpected error occurred. Please try again.')
      } finally {
        setPendingItemId(null)
      }
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Browse Items</h2>
      <p className="text-sm text-gray-600 mb-4">
        Budget: ${categoryBudget.toFixed(2)} | Remaining: ${remainingBudget.toFixed(2)}
      </p>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

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
                  onClick={() => handleItemSelect(item.id, item.weapon_type || '')}
                  disabled={isOverBudget || isSelected || bestPrice === 0 || pendingItemId === item.id}
                  className={`
                    w-full mt-2 px-3 py-1 text-xs font-medium rounded flex items-center justify-center gap-1
                    ${isOverBudget || bestPrice === 0
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : isSelected
                      ? 'bg-green-100 text-green-700'
                      : pendingItemId === item.id
                      ? 'bg-blue-400 text-white cursor-wait'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }
                  `}
                >
                  {pendingItemId === item.id && (
                    <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {pendingItemId === item.id
                    ? 'Adding...'
                    : bestPrice === 0
                    ? 'No Price'
                    : isOverBudget
                    ? 'Over Budget'
                    : isSelected
                    ? 'Selected'
                    : 'Add to Loadout'}
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
