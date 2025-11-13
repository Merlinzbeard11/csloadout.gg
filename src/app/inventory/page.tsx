import React from 'react'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import InventoryPrivacyWrapper from '@/components/InventoryPrivacyWrapper'
import ImportButton from '@/components/ImportButton'
import RefreshButton from '@/components/RefreshButton'
import BackgroundRefreshTrigger from '@/components/BackgroundRefreshTrigger'
import RetryImportButton from '@/components/RetryImportButton'

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
    // Get all item IDs, filtering out nulls
    const itemIds = inventory.items
      .map(invItem => invItem.item_id)
      .filter((id): id is string => id !== null)

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
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes} minutes ago`
    if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
    return `${days} ${days === 1 ? 'day' : 'days'} ago`
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

            <ImportButton consentGiven={false} />

            <p className="text-xs text-gray-500 mt-4">
              We'll fetch your public Steam inventory and calculate total value
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Check if inventory is private
  const isPrivate = inventory?.sync_status === 'private'

  // Check if we have cached data (inventory was previously imported)
  const hasCachedData = inventory && inventory.total_items > 0

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

  // Handle failed import state - show retry button
  if (inventory && inventory.import_status === 'failed') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-orange-900 mb-2">
              Import Failed
            </h2>
            <p className="text-orange-700 mb-4">
              {inventory.error_message || 'The inventory import did not complete successfully.'}
            </p>
            <p className="text-sm text-orange-600 mb-4">
              Progress: {inventory.items_imported_count?.toLocaleString() || 0} items imported before failure
            </p>
            <RetryImportButton
              lastAssetId={inventory.last_asset_id}
              itemsImported={inventory.items_imported_count || 0}
            />
          </div>
        </div>
      </div>
    )
  }

  // Display imported inventory
  return (
    <InventoryPrivacyWrapper isPrivate={isPrivate} hasCachedData={hasCachedData}>
      <BackgroundRefreshTrigger isStale={isStale} />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-3xl font-bold text-gray-900">My Inventory</h1>
            <RefreshButton isStale={isStale} />
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Last synced: {formatLastSynced(inventory.last_synced)}
            {isPrivate && <span className="text-orange-600 font-medium"> (inventory now private)</span>}
          </p>

          {/* Privacy Warning Banner */}
          {isPrivate && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-orange-900 font-semibold mb-1">Your inventory is now private</h3>
                  <p className="text-orange-800 text-sm mb-2">
                    We can't update your inventory while it's set to private in Steam.
                    The data shown below is from your last sync.
                  </p>
                  <p className="text-orange-700 text-xs">
                    To enable updates, make your inventory public in Steam privacy settings.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Unmatched Items Warning */}
          {inventory.items_unmatched_count && inventory.items_unmatched_count > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-yellow-900 font-semibold mb-2">
                    {inventory.total_items} items imported successfully
                  </h3>
                  <p className="text-yellow-800 text-sm font-medium mb-2">
                    ⚠️ {inventory.items_unmatched_count} items had issues
                  </p>
                  <p className="text-yellow-700 text-sm">
                    Some items from your Steam inventory could not be matched because they are not yet in our database,
                    or they are non-skin items we exclude (operation coins, music kits, stickers, etc.).
                  </p>
                </div>
              </div>
            </div>
          )}

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

              // Check if price data is missing (no best_platform indicates no marketplace data)
              const hasPriceData = inventoryItem.best_platform !== null

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

                  {/* Custom Name Tag */}
                  {inventoryItem.custom_name && (
                    <div className="mb-2 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded px-2 py-1" data-testid="custom-name-section">
                      <p className="text-xs font-semibold text-yellow-900">
                        Custom Name: <span className="text-orange-700">{inventoryItem.custom_name}</span>
                      </p>
                    </div>
                  )}

                  {/* Trade Lock Indicator */}
                  {!inventoryItem.can_trade && inventoryItem.trade_hold_until && (
                    <div className="mb-2 bg-red-50 border border-red-200 rounded px-2 py-2" data-testid="trade-lock-section">
                      <div className="flex items-start gap-2">
                        <span className="text-red-600">🔒</span>
                        <div className="flex-1">
                          {(() => {
                            const now = new Date()
                            const holdDate = new Date(inventoryItem.trade_hold_until)
                            const daysRemaining = Math.ceil((holdDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                            const formattedDate = holdDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })

                            return (
                              <>
                                <p className="text-xs font-semibold text-red-900">
                                  Tradeable in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                                </p>
                                <p className="text-xs text-red-700">
                                  Cannot sell until {formattedDate}
                                </p>
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

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

                  {/* Stickers Section */}
                  {inventoryItem.stickers && Array.isArray(inventoryItem.stickers) && inventoryItem.stickers.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200" data-testid="stickers-section">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Applied Stickers:</p>
                      <div className="space-y-1">
                        {(inventoryItem.stickers as Array<{name: string, position: number, wear?: number}>).map((sticker, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs">
                            <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-xs">
                              {sticker.position}
                            </span>
                            <span className="text-gray-700">{sticker.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Marketplace Pricing */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    {/* Missing Price Data Warning */}
                    {!hasPriceData && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded px-2 py-2 mb-2">
                        <div className="flex items-start gap-1">
                          <svg className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-yellow-900">Price data unavailable</p>
                            <p className="text-xs text-yellow-700 mt-0.5">
                              Item will be imported with $0 value
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Best Platform (if available) */}
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

                    {/* Price Display - Always show, even if $0 */}
                    {!inventoryItem.best_platform && (
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-600">Value</span>
                        <span className="text-sm font-bold text-gray-500">$0.00</span>
                      </div>
                    )}

                    {/* Steam Price (only show if we have price data) */}
                    {hasPriceData && (
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-600">Steam</span>
                        <span className="text-xs text-gray-600">${steamPrice.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Potential Savings (only show if we have price data) */}
                    {savings > 0 && hasPriceData && (
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
