'use client'

/**
 * Global Error Boundary (Phase 7h)
 *
 * BDD: features/08-budget-loadout-builder-phase7.feature (lines 321-355)
 * Tests: __tests__/error-handling.test.tsx
 *
 * Catches errors that escape all nested error boundaries, replacing root layout.
 * MUST define own <html> and <body> tags since it replaces root layout.
 *
 * Gotchas handled:
 * - global-error.tsx must define html/body tags (Next.js 14 requirement)
 * - Errors in root layout bubble here
 * - Less frequently activated than nested error boundaries
 */

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  // Log error for monitoring in production
  console.error('Global error occurred:', error)

  return (
    <html>
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
            Something went wrong
          </h1>

          <p style={{ color: '#666', marginBottom: '24px', textAlign: 'center', maxWidth: '500px' }}>
            We encountered an unexpected error. Please try again or return to the homepage.
          </p>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={reset}
              style={{
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Try Again
            </button>

            <a
              href="/"
              style={{
                padding: '12px 24px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              Go Home
            </a>
          </div>

          {/* Development mode - show error details */}
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '32px', maxWidth: '700px' }}>
              <summary style={{ cursor: 'pointer', color: '#666', marginBottom: '8px' }}>
                Error details (development only)
              </summary>
              <pre style={{
                backgroundColor: '#f3f4f6',
                padding: '16px',
                borderRadius: '8px',
                overflow: 'auto',
                fontSize: '12px'
              }}>
                {error.message}
                {error.stack && `\n\n${error.stack}`}
                {error.digest && `\n\nDigest: ${error.digest}`}
              </pre>
            </details>
          )}
        </div>
      </body>
    </html>
  )
}
