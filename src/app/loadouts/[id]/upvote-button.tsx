'use client'

/**
 * UpvoteButton Client Component
 *
 * BDD Phase 7d: features/08-budget-loadout-builder-phase7.feature (lines 166-206)
 *
 * Displays upvote button with optimistic UI updates:
 * - Shows current upvote count
 * - Toggles between "Upvote" and "Upvoted" states
 * - Optimistic UI update (instant feedback)
 * - Handles loading and error states
 * - Disabled for unauthenticated users or own loadouts
 */

import { useState, useOptimistic, useTransition } from 'react'
import { toggleUpvoteAction } from './upvote-actions'

interface UpvoteButtonProps {
  loadoutId: string
  userId: string | null
  isOwner: boolean
  initialUpvoted: boolean
  initialCount: number
}

export function UpvoteButton({
  loadoutId,
  userId,
  isOwner,
  initialUpvoted,
  initialCount
}: UpvoteButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Optimistic state for instant UI updates
  const [optimisticState, setOptimisticState] = useOptimistic(
    { upvoted: initialUpvoted, count: initialCount },
    (state, newUpvoted: boolean) => ({
      upvoted: newUpvoted,
      count: newUpvoted ? state.count + 1 : state.count - 1
    })
  )

  const handleToggleUpvote = async () => {
    setError(null)

    // Redirect to sign in if not authenticated
    if (!userId) {
      window.location.href = '/auth/signin'
      return
    }

    // Optimistic update
    const newUpvoted = !optimisticState.upvoted
    setOptimisticState(newUpvoted)

    // Server action
    startTransition(async () => {
      const result = await toggleUpvoteAction(loadoutId, userId)

      if (!result.success) {
        // User-friendly error message (Phase 7h)
        setError('Unable to upvote. Please try again.')
        // Rollback optimistic update on error
        setOptimisticState(!newUpvoted)
      }
    })
  }

  // Disabled states
  const isDisabled = isOwner || isPending

  // Tooltip message
  let tooltipMessage = ''
  if (isOwner) {
    tooltipMessage = 'You cannot upvote your own loadout'
  } else if (!userId) {
    tooltipMessage = 'Sign in to upvote'
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleToggleUpvote}
        disabled={isDisabled}
        title={tooltipMessage}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors
          ${optimisticState.upvoted
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-label={optimisticState.upvoted ? 'Remove upvote' : 'Upvote loadout'}
      >
        {/* Thumb Up Icon */}
        <svg
          className="w-5 h-5"
          fill={optimisticState.upvoted ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"
          />
        </svg>

        {/* Button Text */}
        <span>
          {optimisticState.upvoted ? 'Upvoted' : 'Upvote'}
        </span>

        {/* Count */}
        <span className="font-bold">
          {optimisticState.count.toLocaleString()}
        </span>

        {/* Loading Spinner */}
        {isPending && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
      </button>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600" role="alert">
          {error}
        </div>
      )}
    </div>
  )
}
