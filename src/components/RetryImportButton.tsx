'use client'

/**
 * Retry Import Button Component - Client Component
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Resume failed import for large inventory (lines 73-80)
 *
 * Responsibilities:
 * - Display "Retry Import" button when import has failed
 * - Show progress message "Resuming from X items..." during retry
 * - Call retryImport server action with cursor position
 * - Display success message with final count after completion
 * - Handle error states gracefully
 *
 * Design Decision:
 * - Client component for interactive button and loading states
 * - Uses server action for actual import logic
 * - Follows same pattern as RefreshButton component
 */

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { retryImport, type RetryResult } from '@/actions/inventory'

export interface RetryImportButtonProps {
  lastAssetId: string | null
  itemsImported: number
}

export default function RetryImportButton({ lastAssetId, itemsImported }: RetryImportButtonProps) {
  const [isRetrying, setIsRetrying] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{type: 'success' | 'error' | 'progress', message: string} | null>(null)
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

  // Auto-hide success/error feedback after 5 seconds
  useEffect(() => {
    if (feedback && feedback.type !== 'progress') {
      feedbackTimerRef.current = setTimeout(() => {
        setFeedback(null)
      }, 5000)

      return () => {
        if (feedbackTimerRef.current) {
          clearTimeout(feedbackTimerRef.current)
        }
      }
    }
  }, [feedback])

  const handleRetry = async () => {
    if (isRetrying) return

    setIsRetrying(true)
    setFeedback({
      type: 'progress',
      message: `Resuming from ${itemsImported.toLocaleString()} items...`
    })

    try {
      const result: RetryResult = await retryImport()

      if (result.success) {
        setFeedback({
          type: 'success',
          message: result.message || `${result.totalItems?.toLocaleString()} items imported`
        })

        // Refresh page to show updated inventory
        router.refresh()
      } else {
        setFeedback({
          type: 'error',
          message: result.message || 'Failed to retry import'
        })
      }
    } catch (error) {
      console.error('Retry import error:', error)
      setFeedback({
        type: 'error',
        message: 'Failed to retry import'
      })
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleRetry}
        disabled={isRetrying}
        className="px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:bg-orange-400 disabled:cursor-not-allowed"
        aria-label="Retry import"
      >
        {isRetrying ? 'Retrying...' : 'Retry Import'}
      </button>

      {/* Feedback Message */}
      {feedback && (
        <div className={`
          px-4 py-2 rounded-lg text-sm
          ${feedback.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : ''}
          ${feedback.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : ''}
          ${feedback.type === 'progress' ? 'bg-blue-50 text-blue-800 border border-blue-200' : ''}
        `}>
          {feedback.message}
        </div>
      )}
    </div>
  )
}
