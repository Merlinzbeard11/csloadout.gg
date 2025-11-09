/**
 * InventoryValueDisplay Component - Shows Inventory Value & Sync Status
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: First-time inventory import shows total value
 *   Scenario: Display inventory value comparison across platforms
 *   Scenario: Show last sync time in user timezone
 *
 * Tests: __tests__/InventoryValueDisplay.test.tsx (17 test scenarios)
 *
 * Component Responsibilities:
 * - Display total inventory value in USD with thousands separators
 * - Show item count
 * - Display last sync timestamp in user's timezone
 * - Show sync status (success, private, rate_limited, error)
 * - Provide refresh button with 5-minute cooldown
 * - Empty state when no inventory
 * - Loading state with skeleton
 * - Privacy instructions with Steam settings link
 */

'use client'

import React, { useMemo } from 'react'

export type SyncStatus = 'success' | 'private' | 'rate_limited' | 'error'

export interface InventoryValueDisplayProps {
  /** Total inventory value in USD */
  totalValue?: number
  /** Number of items in inventory */
  itemCount?: number
  /** Last sync timestamp */
  lastSynced?: Date
  /** Sync status */
  syncStatus?: SyncStatus
  /** Loading state */
  isLoading?: boolean
  /** Refresh callback */
  onRefresh?: () => void
}

export default function InventoryValueDisplay({
  totalValue,
  itemCount,
  lastSynced,
  syncStatus = 'success',
  isLoading = false,
  onRefresh,
}: InventoryValueDisplayProps) {
  // Calculate if refresh button should be disabled (< 5 minutes since last sync)
  const { isRefreshDisabled, minutesRemaining } = useMemo(() => {
    if (!lastSynced) {
      return { isRefreshDisabled: false, minutesRemaining: 0 }
    }

    const minutesSinceSync = (Date.now() - lastSynced.getTime()) / (1000 * 60)
    const disabled = minutesSinceSync < 5
    const remaining = disabled ? Math.ceil(5 - minutesSinceSync) : 0

    return { isRefreshDisabled: disabled, minutesRemaining: remaining }
  }, [lastSynced])

  // Format total value with thousands separators
  const formattedValue = useMemo(() => {
    if (totalValue === undefined) return '$0.00'
    return `$${totalValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }, [totalValue])

  // Format last synced time in user's timezone
  const formattedLastSynced = useMemo(() => {
    if (!lastSynced) return 'Never'
    return lastSynced.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    })
  }, [lastSynced])

  // Get status icon and message
  const statusDisplay = useMemo(() => {
    switch (syncStatus) {
      case 'success':
        return { icon: '✓', message: 'Success', color: 'text-green-500' }
      case 'private':
        return { icon: '⚠', message: 'Inventory is private', color: 'text-cs2-orange' }
      case 'rate_limited':
        return { icon: '⚠', message: 'Rate limited - try again later', color: 'text-yellow-500' }
      case 'error':
        return { icon: '⚠', message: 'Sync failed', color: 'text-red-500' }
    }
  }, [syncStatus])

  // Loading state - skeleton loader
  if (isLoading) {
    return (
      <div className="bg-cs2-dark border border-cs2-blue/20 rounded-lg p-6 animate-pulse">
        <div className="h-8 bg-cs2-blue/10 rounded w-1/3 mb-4" />
        <div className="h-6 bg-cs2-blue/10 rounded w-1/2 mb-2" />
        <div className="h-4 bg-cs2-blue/10 rounded w-2/3" />
      </div>
    )
  }

  // Empty state - no inventory
  if (itemCount === undefined || itemCount === 0) {
    return (
      <div className="bg-cs2-dark border border-cs2-blue/20 rounded-lg p-6 text-center">
        <div className="text-cs2-light/60 mb-2">
          No inventory data. Import your Steam inventory to get started.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-cs2-dark border border-cs2-blue/20 rounded-lg p-6">
      {/* Total Value */}
      <div className="mb-4">
        <div className="text-sm text-cs2-light/60 mb-1">Total Inventory Value (USD)</div>
        <div className="text-4xl font-bold text-cs2-light">{formattedValue}</div>
        <div className="text-sm text-cs2-light/60 mt-1">{itemCount} items</div>
      </div>

      {/* Sync Status */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-cs2-blue/10">
        <div className="flex items-center gap-2">
          <span className={`text-lg ${statusDisplay.color}`}>{statusDisplay.icon}</span>
          <div>
            <div className={`text-sm font-medium ${statusDisplay.color}`}>
              {statusDisplay.message}
            </div>
            <div className="text-xs text-cs2-light/50">
              Last synced: {formattedLastSynced}
            </div>
          </div>
        </div>
      </div>

      {/* Private Inventory Help */}
      {syncStatus === 'private' && (
        <div className="bg-cs2-orange/10 border border-cs2-orange/30 rounded p-3 mb-4">
          <div className="text-sm text-cs2-light/90">
            <strong>How to fix:</strong> Go to{' '}
            <a
              href="https://steamcommunity.com/my/edit/settings"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cs2-blue hover:underline"
            >
              Steam Privacy Settings
            </a>
            {' '}→ Inventory → Public
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          disabled={isRefreshDisabled}
          className={`
            px-4 py-2 rounded font-medium transition-colors
            ${
              isRefreshDisabled
                ? 'bg-cs2-blue/20 text-cs2-light/40 cursor-not-allowed'
                : 'bg-cs2-blue hover:bg-cs2-blue/80 text-white'
            }
          `}
          aria-label="Refresh inventory data"
        >
          <svg
            className="w-4 h-4 inline mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>

        {/* Cooldown Message */}
        {isRefreshDisabled && (
          <span className="text-xs text-cs2-light/50">
            Please wait {minutesRemaining} minutes before refreshing
          </span>
        )}
      </div>
    </div>
  )
}
