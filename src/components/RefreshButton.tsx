'use client'

/**
 * Refresh Button Component - Client Component
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Manual refresh when cache is stale (lines 298-307)
 *
 * Responsibilities:
 * - Trigger inventory refresh via server action
 * - Display loading state during refresh
 * - Show success/error feedback
 * - Auto-hide feedback after 3 seconds
 * - Prevent multiple simultaneous refresh requests
 * - Trigger router.refresh() to update UI
 */

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { refreshInventoryData, type RefreshResult } from '@/actions/inventory'

export interface RefreshButtonProps {
  isStale: boolean
}

export default function RefreshButton({ isStale }: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null)
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  // Cleanup feedback timer on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current)
      }
    }
  }, [])

  // Auto-hide feedback after 3 seconds
  useEffect(() => {
    if (feedback) {
      feedbackTimerRef.current = setTimeout(() => {
        setFeedback(null)
      }, 3000)

      return () => {
        if (feedbackTimerRef.current) {
          clearTimeout(feedbackTimerRef.current)
        }
      }
    }
  }, [feedback])

  const handleRefresh = async () => {
    // Prevent multiple simultaneous requests
    if (isRefreshing) return

    setIsRefreshing(true)
    setFeedback(null)

    try {
      const result: RefreshResult = await refreshInventoryData()

      if (result.success) {
        setFeedback({
          type: 'success',
          message: result.message
        })

        // Refresh page to show updated data
        router.refresh()
      } else {
        setFeedback({
          type: 'error',
          message: result.message
        })
      }
    } catch (error) {
      console.error('Refresh error:', error)
      setFeedback({
        type: 'error',
        message: 'Failed to refresh inventory'
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Don't render if inventory is fresh
  if (!isStale) {
    return null
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
      >
        {isRefreshing ? (
          <>
            {/* Loading spinner */}
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Refreshing...</span>
          </>
        ) : (
          <>
            {/* Refresh icon */}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </>
        )}
      </button>

      {/* Success/Error Feedback */}
      {feedback && (
        <div className={`p-3 rounded-lg text-sm ${
          feedback.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-900'
            : 'bg-red-50 border border-red-200 text-red-900'
        }`}>
          {feedback.message}
        </div>
      )}
    </div>
  )
}
