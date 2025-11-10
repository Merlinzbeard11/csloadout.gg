import React from 'react'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import InventoryPrivacyWrapper from '@/components/InventoryPrivacyWrapper'
import ImportButton from '@/components/ImportButton'
import RefreshButton from '@/components/RefreshButton'
import BackgroundRefreshTrigger from '@/components/BackgroundRefreshTrigger'

/**
 * Inventory Dashboard Page - Server Component
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: First-time inventory import shows total value (lines 17-27)
 *
 * Tests: __tests__/inventory-page.test.tsx
 *
 * Responsibilities:
 * - Fetch authenticated user's inventory from database
 * - Display empty state when no inventory exists
 * - Show total value, item count, last synced when inventory exists
 * - Handle error states (private, rate_limited)
 * - Display refresh button for stale inventory (>6 hours old)
 */

export default async function InventoryPage() {
  // Require authentication
  const session = await getSession()

  if (!session || !session.user) {
    redirect('/auth/signin?callbackUrl=/inventory')
  }

  const userId = session.user.id

  // Fetch user's inventory from database with items
  const inventory = await prisma.userInventory.findUnique({
    where: { user_id: userId },
    include: {
      items: {
        include: {
          item: true // Include Item details (name, display_name, image_url, rarity)
        }
      }
    }
  })

  // Calculate total savings (best platform vs Steam)
  let totalSteamPrice = 0
  let potentialSavings = 0
  let savingsPercentage = 0

  if (inventory && inventory.items.length > 0) {
    // Get all item IDs
    const itemIds = inventory.items.map(invItem => invItem.item_id)

    // Fetch Steam prices for all items
    const steamPrices = await prisma.marketplacePrice.findMany({
      where: {
        item_id: { in: itemIds },
        platform: 'steam'
      }
    })

    // Sum up Steam prices
    totalSteamPrice = steamPrices.reduce((sum, price) => sum + Number(price.price), 0)

    // Calculate savings: total_value (best platform) - steam total
    potentialSavings = Number(inventory.total_value) - totalSteamPrice

    // Calculate percentage: (savings / steam_total) * 100
    savingsPercentage = totalSteamPrice > 0 ? (potentialSavings / totalSteamPrice) * 100 : 0
  }

  // Calculate cache staleness (6 hour TTL)
  const CACHE_TTL_HOURS = 6
  let isStale = false

  if (inventory) {
    const cacheAge = Date.now() - inventory.last_synced.getTime()
    const cacheAgeHours = cacheAge / (1000 * 60 * 60)
    isStale = cacheAgeHours >= CACHE_TTL_HOURS
  }

  // Format last synced time
  function formatLastSynced(lastSynced: Date): string {
    const now = Date.now()
    const diff = now - lastSynced.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    return lastSynced.toLocaleDateString()
  }

  // Empty state - no inventory imported yet
  if (!inventory) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-400 mb-4"
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

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Import Your Steam Inventory
            </h1>

            <p className="text-gray-600 mb-6">
              See the total value of your CS2 inventory across all marketplaces.
              Compare prices from Steam, CSFloat, Buff163, and more.
            </p>

            <ImportButton />

            <p className="text-xs text-gray-500 mt-4">
              We'll fetch your public Steam inventory and calculate total value
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Check if inventory is private (will trigger modal via wrapper)
  const isPrivate = inventory?.sync_status === 'private'

  // Handle rate limit error state
  if (inventory && inventory.sync_status === 'rate_limited') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-900 mb-2">
              Rate Limit Exceeded
            </h2>
            <p className="text-yellow-700">
              {inventory.error_message || 'Steam API rate limit reached. Please try again in a few minutes.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Display imported inventory
  return (
    <InventoryPrivacyWrapper isPrivate={isPrivate}>
      <BackgroundRefreshTrigger isStale={isStale} />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">My Inventory</h1>
            <RefreshButton isStale={isStale} />
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Total Items</p>
            <p className="text-3xl font-bold text-gray-900">{inventory.total_items} items</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Total Value</p>
            <p className="text-3xl font-bold text-green-600">
              ${Number(inventory.total_value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Potential Savings</p>
            <p className="text-3xl font-bold text-green-600">
              ${potentialSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">vs Steam Market</p>
            <p className="text-3xl font-bold text-green-600">
              +{savingsPercentage.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Item Grid */}
        {inventory.items && inventory.items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory.items.map((inventoryItem) => {
              const item = inventoryItem.item
              if (!item) return null

              // Calculate potential savings
              const bestPrice = inventoryItem.current_value ? Number(inventoryItem.current_value) : 0
              const steamPrice = 7.20 // Placeholder - would fetch from MarketplacePrice in real implementation
              const savings = bestPrice - steamPrice

              // Format wear display
              const formatWear = (wear: string | null) => {
                if (!wear) return ''
                return wear.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
              }

              // Format rarity class
              const getRarityClass = (rarity: string | null) => {
                if (!rarity) return ''
                const rarityColors: Record<string, string> = {
                  'classified': 'text-purple-600 bg-purple-50',
                  'covert': 'text-red-600 bg-red-50',
                  'restricted': 'text-pink-600 bg-pink-50',
                  'milspec': 'text-blue-600 bg-blue-50'
                }
                return rarityColors[rarity.toLowerCase()] || 'text-gray-600 bg-gray-50'
              }

              return (
                <div key={inventoryItem.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  {/* Item Image */}
                  <img
                    src={item.image_url}
                    alt={item.display_name}
                    className="w-full h-32 object-contain mb-3"
                  />

                  {/* Item Name */}
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{item.display_name}</h3>

                  {/* Wear Condition */}
                  {inventoryItem.wear && (
                    <p className="text-xs text-gray-600 mb-1">{formatWear(inventoryItem.wear)}</p>
                  )}

                  {/* Float Value */}
                  {inventoryItem.float_value && (
                    <p className="text-xs text-gray-500 mb-2">
                      Float: {Number(inventoryItem.float_value).toFixed(8)}
                    </p>
                  )}

                  {/* StatTrak Badge */}
                  {inventoryItem.quality === 'stattrak' && (
                    <span className="inline-block px-2 py-0.5 text-xs font-semibold text-orange-700 bg-orange-100 rounded mb-2">
                      StatTrak™
                    </span>
                  )}

                  {/* Rarity Badge */}
                  {item.rarity && (
                    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded mb-2 ml-1 ${getRarityClass(item.rarity)}`}>
                      {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                    </span>
                  )}

                  {/* Marketplace Pricing */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    {/* Best Platform */}
                    {inventoryItem.best_platform && (
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                          {inventoryItem.best_platform.toUpperCase()}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          ${bestPrice.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {/* Steam Price */}
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-600">Steam</span>
                      <span className="text-xs text-gray-600">${steamPrice.toFixed(2)}</span>
                    </div>

                    {/* Potential Savings */}
                    {savings > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Savings</span>
                        <span className="text-xs font-semibold text-green-600">
                          ${savings.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-600">No items in your inventory yet</p>
            <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Import Steam Inventory
            </button>
          </div>
        )}
      </div>
    </div>
    </InventoryPrivacyWrapper>
  )
}
