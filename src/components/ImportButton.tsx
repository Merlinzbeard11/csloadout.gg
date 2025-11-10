'use client'

/**
 * Import Button Component - Client Component
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: First-time inventory import shows total value (lines 17-27)
 *
 * Responsibilities:
 * - Trigger inventory import via server action
 * - Display progress states (idle, importing, complete, error)
 * - Show progress messages
 * - Refresh page on successful import
 */

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { startInventoryImport, type ImportResult, type ImportProgress } from '@/actions/inventory'

export interface ImportButtonProps {
  className?: string
}

export default function ImportButton({ className }: ImportButtonProps) {
  const [status, setStatus] = useState<'idle' | 'importing' | 'complete' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')
  const [itemsImported, setItemsImported] = useState<number>(0)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [remainingTime, setRemainingTime] = useState<number>(0)
  const router = useRouter()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // Countdown timer effect
  useEffect(() => {
    if (remainingTime > 0) {
      timerRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current)
            }
            // Reset to idle state when countdown completes
            setStatus('idle')
            setMessage('')
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
      }
    }
  }, [remainingTime])

  const handleImport = async () => {
    setStatus('importing')
    setMessage('Fetching inventory from Steam...')
    setProgress(null)

    // Polling function for multi-page simulation
    const pollProgress = async () => {
      try {
        const result: ImportResult = await startInventoryImport()

        if (result.success) {
          // Update progress if provided
          if (result.progress) {
            setProgress(result.progress)
          }

          if (result.status === 'complete') {
            setStatus('complete')
            setMessage('Import Complete')
            setItemsImported(result.itemsImported || 0)

            // Refresh page to show imported inventory
            router.refresh()
          } else {
            // Still importing - poll again after 2 seconds
            setStatus('importing')
            setTimeout(pollProgress, 2000)
          }
        } else {
          setStatus('error')
          setMessage(result.message)

          // Handle rate limit with countdown
          if (result.retryAfter) {
            setRemainingTime(result.retryAfter)
          }
        }
      } catch (error) {
        console.error('Import error:', error)
        setStatus('error')
        setMessage(error instanceof Error ? error.message : 'Failed to fetch inventory. Please try again.')
      }
    }

    // Start polling
    pollProgress()
  }

  const isImporting = status === 'importing'
  const isComplete = status === 'complete'
  const isError = status === 'error'
  const isRateLimited = remainingTime > 0

  // Calculate progress percentage
  const progressPercentage = progress && progress.total
    ? Math.round((progress.current / progress.total) * 100)
    : null

  // Format numbers with commas
  const formatNumber = (num: number) => num.toLocaleString('en-US')

  // Format countdown time
  const formatCountdown = (seconds: number): string => {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      if (remainingSeconds > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ${remainingSeconds} seconds`
      }
      return `${minutes} minute${minutes > 1 ? 's' : ''}`
    }
    return `${seconds} second${seconds !== 1 ? 's' : ''}`
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleImport}
        disabled={isImporting || isRateLimited}
        className={`px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed ${className || ''}`}
      >
        Import Steam Inventory
      </button>

      {/* Rate Limit Countdown */}
      {isRateLimited && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-900 font-semibold">Rate limit reached</p>
          <p className="text-yellow-700 text-sm mt-1">Retry in {formatCountdown(remainingTime)}</p>
        </div>
      )}

      {/* Progress Indicator */}
      {isImporting && (
        <div role="status" className="space-y-3">
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            {/* Loading spinner */}
            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>

            <div className="flex-1">
              {/* Progress text */}
              {progress && progress.total ? (
                <p className="text-blue-900 font-medium">
                  Fetching... {formatNumber(progress.current)}/{formatNumber(progress.total)} items ({progressPercentage}%)
                </p>
              ) : progress && !progress.total ? (
                <p className="text-blue-900 font-medium">
                  Fetching... {formatNumber(progress.current)} items
                </p>
              ) : (
                <p className="text-blue-900 font-medium">{message}</p>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {progress && progress.total && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                role="progressbar"
                aria-valuenow={progressPercentage || 0}
                aria-valuemin={0}
                aria-valuemax={100}
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Success Message */}
      {isComplete && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-900 font-semibold">{message}</p>
          <p className="text-green-700 text-sm mt-1">{formatNumber(itemsImported)} items imported</p>
        </div>
      )}

      {/* Error Message (only show if not rate limited - rate limit has its own UI) */}
      {isError && !isRateLimited && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-900 font-semibold">Import Failed</p>
          <p className="text-red-700 text-sm mt-1">{message}</p>
        </div>
      )}
    </div>
  )
}
