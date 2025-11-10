'use client'

/**
 * App-Level Error Boundary (Phase 7h)
 *
 * BDD: features/08-budget-loadout-builder-phase7.feature (lines 321-355)
 * Tests: __tests__/error-handling.test.tsx
 *
 * Catches runtime errors in app directory routes.
 * Inherits layout structure (unlike global-error.tsx).
 *
 * Gotchas handled:
 * - Must be Client Component ('use client' directive required)
 * - Cannot catch errors in layout.js of same segment
 * - Only catches synchronous render errors (not async or event handlers)
 * - reset() re-renders error boundary contents for recovery
 */

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  // Log error for monitoring
  console.error('App error occurred:', error)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Something went wrong
        </h1>

        <p className="text-gray-600 text-center mb-6">
          We encountered an unexpected error. Please try again or contact support if the problem persists.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Try Again
          </button>

          <a
            href="/"
            className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-center transition-colors"
          >
            Return Home
          </a>

          <a
            href="/loadouts"
            className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-center transition-colors"
          >
            Browse Loadouts
          </a>
        </div>

        {/* Development mode - show error details */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 mb-2">
              Error details (development only)
            </summary>
            <div className="bg-gray-50 rounded-lg p-4 mt-2">
              <p className="text-sm font-medium text-gray-900 mb-1">Message:</p>
              <p className="text-sm text-red-600 mb-3">{error.message}</p>

              {error.digest && (
                <>
                  <p className="text-sm font-medium text-gray-900 mb-1">Digest:</p>
                  <p className="text-sm text-gray-700 mb-3 font-mono">{error.digest}</p>
                </>
              )}

              {error.stack && (
                <>
                  <p className="text-sm font-medium text-gray-900 mb-1">Stack trace:</p>
                  <pre className="text-xs text-gray-700 overflow-auto bg-white p-3 rounded border">
                    {error.stack}
                  </pre>
                </>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
