import React from 'react'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'

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

  // Fetch user's inventory from database
  const inventory = await prisma.userInventory.findUnique({
    where: { user_id: userId }
  })

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

            <button
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Import Steam Inventory
            </button>

            <p className="text-xs text-gray-500 mt-4">
              We'll fetch your public Steam inventory and calculate total value
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Handle error states
  if (inventory.sync_status === 'private') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 mb-2">
              Inventory is Private
            </h2>
            <p className="text-red-700 mb-4">
              {inventory.error_message || 'Your Steam inventory is set to private. Please make it public to import.'}
            </p>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              Open Steam Privacy Settings
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (inventory.sync_status === 'rate_limited') {
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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Inventory</h1>

          {isStale && (
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
            <p className="text-sm text-gray-600 mb-1">Last Synced</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatLastSynced(inventory.last_synced)}
            </p>
          </div>
        </div>

        {/* TODO: Item grid will be added in Iteration 2 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-600">Item grid coming in next iteration</p>
        </div>
      </div>
    </div>
  )
}
