'use client'

/**
 * Loadout-Specific Error Boundary (Phase 7h)
 *
 * BDD: features/08-budget-loadout-builder-phase7.feature (lines 321-355)
 * Tests: __tests__/error-handling.test.tsx
 *
 * Catches runtime errors specific to loadout detail pages.
 * Provides loadout-specific recovery options and helpful messaging.
 *
 * Gotchas handled:
 * - Must be Client Component ('use client' directive)
 * - Only catches errors in page.tsx and nested children
 * - Cannot catch errors in layout.tsx of same segment
 * - Async/event handler errors must be caught manually in components
 */

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function LoadoutError({ error, reset }: ErrorProps) {
  // Log error for monitoring
  console.error('Loadout page error:', error)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Error Loading Loadout
        </h1>

        <p className="text-gray-600 text-center mb-6">
          We couldn't load this loadout. This might be due to a temporary issue or the loadout may no longer be available.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900 font-medium mb-2">What you can do:</p>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Try refreshing the page</li>
            <li>Check if the loadout URL is correct</li>
            <li>Browse other public loadouts</li>
            <li>Create your own loadout</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
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
            <span>Try Again</span>
          </button>

          <a
            href="/loadouts"
            className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-center transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            <span>Browse Public Loadouts</span>
          </a>

          <a
            href="/loadouts/new"
            className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-center transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Create New Loadout</span>
          </a>
        </div>

        {/* Development mode - show error details */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 mb-2">
              Debug info (development only)
            </summary>
            <div className="bg-gray-50 rounded-lg p-4 mt-2 space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">Error Message:</p>
                <p className="text-xs text-red-600 font-mono">{error.message}</p>
              </div>

              {error.digest && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">Error Digest:</p>
                  <p className="text-xs text-gray-600 font-mono">{error.digest}</p>
                </div>
              )}

              {error.stack && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">Stack Trace:</p>
                  <pre className="text-xs text-gray-700 overflow-auto bg-white p-3 rounded border max-h-48">
                    {error.stack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
