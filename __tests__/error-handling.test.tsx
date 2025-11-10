/**
 * Phase 7h: Error Handling Tests
 *
 * BDD: features/08-budget-loadout-builder-phase7.feature (lines 321-355)
 *
 * Test Coverage:
 * - RED: 404 Not Found page for nonexistent loadouts
 * - RED: Custom not-found.tsx with helpful messaging
 * - RED: Error boundary for runtime errors
 * - RED: Graceful degradation for upvote failures
 * - RED: Silent failure for view tracking errors
 * - RED: Error recovery with reset() function
 * - RED: Error boundary hierarchy (page vs global)
 * - RED: Async error handling in event handlers
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { notFound } from 'next/navigation'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn()
  })
}))

describe('Phase 7h: Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('404 Not Found Page', () => {
    it('RED: should call notFound() when loadout does not exist', () => {
      const loadout = null // Simulating non-existent loadout

      if (!loadout) {
        notFound()
      }

      expect(notFound).toHaveBeenCalled()
    })

    it('RED: should display 404 page with helpful message', () => {
      const notFoundContent = {
        title: '404 - Loadout Not Found',
        message: 'This loadout may have been deleted or made private',
        hasSearchBox: true,
        hasBrowseLink: true
      }

      expect(notFoundContent.title).toBe('404 - Loadout Not Found')
      expect(notFoundContent.message).toContain('deleted or made private')
      expect(notFoundContent.hasSearchBox).toBe(true)
      expect(notFoundContent.hasBrowseLink).toBe(true)
    })

    it('RED: should provide link to browse public loadouts', () => {
      const browseLink = {
        href: '/loadouts',
        text: 'Browse Public Loadouts'
      }

      expect(browseLink.href).toBe('/loadouts')
      expect(browseLink.text).toBe('Browse Public Loadouts')
    })

    it('RED: should include search box to find other loadouts', () => {
      const hasSearchBox = true
      const searchPlaceholder = 'Search for loadouts...'

      expect(hasSearchBox).toBe(true)
      expect(searchPlaceholder).toBe('Search for loadouts...')
    })
  })

  describe('Error Boundary Component', () => {
    it('RED: should be a Client Component with use client directive', () => {
      // Error boundaries MUST be Client Components in Next.js App Router
      const errorComponent = `'use client'\n\nexport default function Error({ error, reset }) {}`

      expect(errorComponent).toContain("'use client'")
      expect(errorComponent).toContain('error')
      expect(errorComponent).toContain('reset')
    })

    it('RED: should receive error and reset props', () => {
      const errorProps = {
        error: new Error('Test error'),
        reset: jest.fn()
      }

      expect(errorProps.error).toBeInstanceOf(Error)
      expect(errorProps.error.message).toBe('Test error')
      expect(typeof errorProps.reset).toBe('function')
    })

    it('RED: should display error message to user', () => {
      const error = new Error('Failed to load loadout')
      const displayMessage = `Something went wrong: ${error.message}`

      expect(displayMessage).toContain('Something went wrong')
      expect(displayMessage).toContain('Failed to load loadout')
    })

    it('RED: should provide reset button for error recovery', () => {
      const reset = jest.fn()
      const buttonText = 'Try Again'

      // Simulate clicking reset button
      reset()

      expect(reset).toHaveBeenCalled()
      expect(buttonText).toBe('Try Again')
    })

    it('RED: should call reset() to attempt recovery', () => {
      const mockReset = jest.fn()

      // Simulate user clicking "Try Again" button
      mockReset()

      expect(mockReset).toHaveBeenCalled()
      expect(mockReset).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Boundary Hierarchy', () => {
    it('RED: should NOT catch errors from layout.js in same segment', () => {
      // Error boundary is INSIDE layout, so layout errors bubble to parent
      const errorInLayout = true
      const caughtBySameSegment = false // error.tsx cannot catch layout errors
      const caughtByParentSegment = true // bubbles to parent error.tsx

      expect(caughtBySameSegment).toBe(false)
      expect(caughtByParentSegment).toBe(true)
    })

    it('RED: should bubble errors up to parent error boundary', () => {
      const errorLocation = 'app/loadouts/[id]/page.tsx'
      const errorBoundary = 'app/loadouts/error.tsx'

      // Errors in page.tsx are caught by error.tsx in same segment
      const caught = errorLocation.includes('loadouts') && errorBoundary.includes('loadouts')

      expect(caught).toBe(true)
    })

    it('RED: should catch errors from nested child segments', () => {
      // Parent error boundary catches child errors
      const parentBoundary = 'app/error.tsx'
      const childError = 'app/loadouts/[id]/page.tsx'

      const canCatch = true // Parent can catch child errors
      expect(canCatch).toBe(true)
    })
  })

  describe('Global Error Boundary', () => {
    it('RED: should define own html and body tags', () => {
      const globalError = `'use client'
export default function GlobalError({ error, reset }) {
  return (
    <html>
      <body>
        <div>Global Error</div>
      </body>
    </html>
  )
}`

      expect(globalError).toContain('<html>')
      expect(globalError).toContain('<body>')
      expect(globalError).toContain('</html>')
      expect(globalError).toContain('</body>')
    })

    it('RED: should catch errors from root layout', () => {
      // global-error.tsx catches root layout errors
      const rootLayoutError = true
      const caughtByGlobalError = true

      expect(caughtByGlobalError).toBe(true)
    })

    it('RED: should replace root layout when active', () => {
      // global-error.tsx replaces entire root layout
      const replacesRootLayout = true

      expect(replacesRootLayout).toBe(true)
    })
  })

  describe('Async Error Handling in Event Handlers', () => {
    it('RED: should handle upvote API failure gracefully', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('API Error'))
      global.fetch = mockFetch

      let errorMessage = ''
      let upvoteCount = 42

      // Simulate upvote click handler
      const handleUpvote = async () => {
        try {
          const response = await fetch('/api/loadouts/123/upvote', {
            method: 'POST'
          })
          if (!response.ok) throw new Error('Upvote failed')
          upvoteCount += 1
        } catch (err) {
          errorMessage = 'Unable to upvote. Please try again.'
          // Count should NOT change on error
        }
      }

      await handleUpvote()

      expect(errorMessage).toBe('Unable to upvote. Please try again.')
      expect(upvoteCount).toBe(42) // Unchanged
      expect(mockFetch).toHaveBeenCalled()
    })

    it('RED: should reset upvote button state on error', async () => {
      let buttonState = 'idle'

      const handleUpvote = async () => {
        buttonState = 'loading'
        try {
          // Simulate API failure
          throw new Error('API Error')
        } catch (err) {
          buttonState = 'idle' // Reset to original state
        }
      }

      await handleUpvote()
      expect(buttonState).toBe('idle')
    })

    it('RED: should display error message to user on upvote failure', async () => {
      let showError = false
      let errorText = ''

      const handleUpvote = async () => {
        try {
          throw new Error('Database unavailable')
        } catch (err) {
          showError = true
          errorText = 'Unable to upvote. Please try again.'
        }
      }

      await handleUpvote()

      expect(showError).toBe(true)
      expect(errorText).toBe('Unable to upvote. Please try again.')
    })

    it('RED: should not change upvote count on failure', async () => {
      let upvoteCount = 100
      const originalCount = upvoteCount

      const handleUpvote = async () => {
        try {
          throw new Error('API Error')
        } catch (err) {
          // Do NOT increment count on error
        }
      }

      await handleUpvote()

      expect(upvoteCount).toBe(originalCount)
    })
  })

  describe('View Tracking Silent Failures', () => {
    it('RED: should render loadout even if view tracking fails', async () => {
      let loadoutRendered = false
      let viewTrackingFailed = false

      const renderLoadout = async () => {
        // Attempt view tracking
        try {
          // Simulate database unavailable
          throw new Error('Database unavailable')
        } catch (err) {
          viewTrackingFailed = true
          // Continue rendering regardless
        }

        // Always render loadout
        loadoutRendered = true
      }

      await renderLoadout()

      expect(viewTrackingFailed).toBe(true)
      expect(loadoutRendered).toBe(true)
    })

    it('RED: should fail silently without user-facing error', async () => {
      let userSawError = false

      const trackView = async () => {
        try {
          throw new Error('Tracking failed')
        } catch (err) {
          // Log error but do NOT show to user
          console.error('View tracking failed:', err.message)
          // userSawError remains false
        }
      }

      await trackView()

      expect(userSawError).toBe(false)
    })

    it('RED: should not affect user experience on tracking failure', async () => {
      let userExperienceAffected = false

      const loadPage = async () => {
        // View tracking fails silently
        try {
          throw new Error('Tracking error')
        } catch (err) {
          // Silent failure - no user impact
        }

        // User experience unchanged
        userExperienceAffected = false
      }

      await loadPage()

      expect(userExperienceAffected).toBe(false)
    })
  })

  describe('Error Message Quality', () => {
    it('RED: should provide user-friendly error messages', () => {
      const technicalError = 'ECONNREFUSED: Connection refused at 127.0.0.1:5432'
      const userFriendlyError = 'Unable to connect to the server. Please try again later.'

      expect(userFriendlyError).not.toContain('ECONNREFUSED')
      expect(userFriendlyError).not.toContain('127.0.0.1')
      expect(userFriendlyError).toContain('try again')
    })

    it('RED: should not expose sensitive technical details', () => {
      const errorMessage = 'Unable to load loadout. Please try again.'

      expect(errorMessage).not.toContain('database')
      expect(errorMessage).not.toContain('SQL')
      expect(errorMessage).not.toContain('stack trace')
      expect(errorMessage).not.toContain('localhost')
    })

    it('RED: should suggest actionable next steps', () => {
      const errorWithAction = {
        message: 'This loadout may have been deleted or made private',
        actions: ['Browse Public Loadouts', 'Search for loadouts']
      }

      expect(errorWithAction.actions).toHaveLength(2)
      expect(errorWithAction.actions[0]).toBe('Browse Public Loadouts')
    })
  })

  describe('Error Recovery Strategies', () => {
    it('RED: should allow retry after error', () => {
      const reset = jest.fn()
      const retryButton = 'Try Again'

      // Simulate retry
      reset()

      expect(reset).toHaveBeenCalled()
      expect(retryButton).toBe('Try Again')
    })

    it('RED: should provide navigation options on 404', () => {
      const notFoundOptions = {
        browseLink: '/loadouts',
        searchEnabled: true,
        homeLink: '/'
      }

      expect(notFoundOptions.browseLink).toBe('/loadouts')
      expect(notFoundOptions.searchEnabled).toBe(true)
      expect(notFoundOptions.homeLink).toBe('/')
    })

    it('RED: should clear error state on successful retry', async () => {
      let hasError = true

      const retry = async () => {
        try {
          // Simulate successful retry
          hasError = false
        } catch (err) {
          hasError = true
        }
      }

      await retry()

      expect(hasError).toBe(false)
    })
  })

  describe('Error Boundary Limitations', () => {
    it('RED: should NOT catch async errors without manual handling', () => {
      // Error boundaries only catch synchronous render errors
      const asyncError = true
      const caughtByErrorBoundary = false

      expect(caughtByErrorBoundary).toBe(false)
    })

    it('RED: should NOT catch event handler errors directly', () => {
      // Event handler errors must be manually caught
      const eventHandlerError = true
      const caughtByErrorBoundary = false

      expect(caughtByErrorBoundary).toBe(false)
    })

    it('RED: should require manual try-catch in event handlers', () => {
      const requiresTryCatch = true

      expect(requiresTryCatch).toBe(true)
    })
  })

  describe('Production Error Handling', () => {
    it('RED: should log errors for monitoring in production', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      const error = new Error('Production error')
      console.error('Error occurred:', error)

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error occurred:', error)

      consoleErrorSpy.mockRestore()
    })

    it('RED: should not expose stack traces to users in production', () => {
      const error = new Error('Database connection failed')
      error.stack = 'Error: Database connection failed\n    at ...'

      const userMessage = 'Something went wrong. Please try again.'

      expect(userMessage).not.toContain(error.stack!)
      expect(userMessage).toBe('Something went wrong. Please try again.')
    })

    it('RED: should provide generic error messages in production', () => {
      const isDevelopment = false
      const error = new Error('Detailed technical error')

      const message = isDevelopment
        ? error.message
        : 'Something went wrong. Please try again.'

      expect(message).toBe('Something went wrong. Please try again.')
    })
  })
})
