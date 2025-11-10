'use client'

/**
 * Background Refresh Trigger Component - Client Component
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Background refresh for stale data (lines 309-317)
 *
 * Responsibilities:
 * - Automatically trigger background refresh when inventory is stale
 * - Show toast notification during refresh
 * - Show success notification with "Updated: Just now"
 * - Auto-hide notifications after 5 seconds
 * - Trigger router.refresh() to update UI with new data
 *
 * Design Decision:
 * - This is a headless component (no UI, just side effects)
 * - Keeps inventory page as Server Component (better performance)
 * - Small client component for background refresh logic only
 */

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { refreshInventoryData, type RefreshResult } from '@/actions/inventory'

export interface BackgroundRefreshTriggerProps {
  isStale: boolean
}

export default function BackgroundRefreshTrigger({ isStale }: BackgroundRefreshTriggerProps) {
  const [notification, setNotification] = useState<string | null>(null)
  const notificationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hasTriggeredRef = useRef<boolean>(false)
  const router = useRouter()

  // Cleanup notification timer on unmount
  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current)
      }
    }
  }, [])

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification) {
      notificationTimerRef.current = setTimeout(() => {
        setNotification(null)
      }, 5000)

      return () => {
        if (notificationTimerRef.current) {
          clearTimeout(notificationTimerRef.current)
        }
      }
    }
  }, [notification])

  // Trigger background refresh when stale
  useEffect(() => {
    // Only trigger once per component mount
    if (!isStale || hasTriggeredRef.current) {
      return
    }

    hasTriggeredRef.current = true

    const triggerBackgroundRefresh = async () => {
      setNotification('Refreshing in background...')

      try {
        const result: RefreshResult = await refreshInventoryData()

        if (result.success) {
          setNotification('Updated: Just now')

          // Refresh page to show updated data
          router.refresh()
        } else {
          // Silent failure - don't show error notification
          setNotification(null)
        }
      } catch (error) {
        console.error('Background refresh error:', error)
        setNotification(null)
      }
    }

    triggerBackgroundRefresh()
  }, [isStale, router])

  // Render toast notification if present
  if (!notification) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
        {notification === 'Refreshing in background...' ? (
          <>
            {/* Loading spinner */}
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{notification}</span>
          </>
        ) : (
          <>
            {/* Success checkmark */}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{notification}</span>
          </>
        )}
      </div>
    </div>
  )
}
