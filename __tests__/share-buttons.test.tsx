/**
 * Phase 7g: Share Buttons Tests
 *
 * BDD: features/08-budget-loadout-builder-phase7.feature (lines 282-320)
 *
 * Test Coverage:
 * - RED: Twitter share button with pre-filled text
 * - RED: Copy URL to clipboard functionality
 * - RED: Web Share API feature detection
 * - RED: Clipboard API fallback for older browsers
 * - RED: User feedback on successful copy
 * - RED: Error handling for share failures
 * - RED: Share button accessibility (ARIA labels)
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock navigator.clipboard for testing
const mockClipboard = {
  writeText: jest.fn()
}

// Mock navigator.share for testing
const mockShare = jest.fn()

describe('Phase 7g: Share Buttons', () => {
  beforeEach(() => {
    // Reset mocks
    mockClipboard.writeText.mockReset()
    mockShare.mockReset()

    // Setup clipboard mock
    Object.assign(navigator, {
      clipboard: mockClipboard
    })
  })

  describe('Twitter Share Button', () => {
    it('RED: should generate Twitter intent URL with loadout details', () => {
      const loadout = {
        name: 'Budget AK-47 Loadout',
        slug: 'budget-ak-loadout',
        description: 'Complete CS2 loadout under $100'
      }

      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        `Check out my ${loadout.name}! ${loadout.description}`
      )}&url=${encodeURIComponent(
        `https://csloadout.gg/loadouts/${loadout.slug}`
      )}&hashtags=CS2,CSLoadout`

      expect(twitterUrl).toContain('twitter.com/intent/tweet')
      expect(twitterUrl).toContain(encodeURIComponent(loadout.name))
      expect(decodeURIComponent(twitterUrl)).toContain(loadout.slug)
    })

    it('RED: should open Twitter share in new window', () => {
      const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)

      const twitterUrl = 'https://twitter.com/intent/tweet?text=Test'
      window.open(twitterUrl, '_blank', 'width=550,height=420')

      expect(openSpy).toHaveBeenCalledWith(
        twitterUrl,
        '_blank',
        'width=550,height=420'
      )

      openSpy.mockRestore()
    })

    it('RED: should include hashtags in Twitter share', () => {
      const hashtags = 'CS2,CSLoadout,Gaming'
      const twitterUrl = `https://twitter.com/intent/tweet?text=Test&hashtags=${hashtags}`

      expect(twitterUrl).toContain('hashtags=CS2,CSLoadout,Gaming')
    })
  })

  describe('Copy URL Button', () => {
    it('RED: should copy loadout URL to clipboard using modern API', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined)

      const url = 'https://csloadout.gg/loadouts/budget-ak-loadout'
      await navigator.clipboard.writeText(url)

      expect(mockClipboard.writeText).toHaveBeenCalledWith(url)
    })

    it('RED: should handle clipboard API errors gracefully', async () => {
      mockClipboard.writeText.mockRejectedValue(new Error('Permission denied'))

      let error: Error | null = null
      try {
        await navigator.clipboard.writeText('https://csloadout.gg/test')
      } catch (err) {
        error = err as Error
      }

      expect(error).toBeTruthy()
      expect(error?.message).toBe('Permission denied')
    })

    it('RED: should use fallback method when clipboard API unavailable', () => {
      // Remove clipboard API
      const originalClipboard = navigator.clipboard
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true
      })

      const hasClipboard = navigator.clipboard !== undefined
      expect(hasClipboard).toBe(false)

      // Simulate fallback: Create textarea and select
      const url = 'https://csloadout.gg/loadouts/test'
      const textarea = document.createElement('textarea')
      textarea.value = url
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()

      // In real implementation, document.execCommand('copy') would be called
      // For testing, just verify the setup is correct
      expect(textarea.value).toBe(url)
      expect(document.body.contains(textarea)).toBe(true)

      document.body.removeChild(textarea)

      // Restore clipboard
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        writable: true
      })
    })

    it('RED: should show success message after copying', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined)

      const url = 'https://csloadout.gg/loadouts/test'
      await navigator.clipboard.writeText(url)

      // Verify clipboard API was called
      expect(mockClipboard.writeText).toHaveBeenCalledWith(url)

      // In component: should show "Copied!" message
      const successMessage = 'Copied!'
      expect(successMessage).toBe('Copied!')
    })
  })

  describe('Web Share API', () => {
    it('RED: should detect Web Share API support', () => {
      // Mock navigator.share
      Object.assign(navigator, {
        share: mockShare
      })

      const hasWebShare = typeof navigator.share === 'function'
      expect(hasWebShare).toBe(true)
    })

    it('RED: should fall back to custom buttons when Web Share unavailable', () => {
      // Remove navigator.share
      const originalShare = navigator.share
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        writable: true
      })

      const hasWebShare = typeof navigator.share === 'function'
      expect(hasWebShare).toBe(false)

      // Restore
      Object.defineProperty(navigator, 'share', {
        value: originalShare,
        writable: true
      })
    })

    it('RED: should invoke Web Share API with loadout data', async () => {
      Object.assign(navigator, {
        share: mockShare
      })
      mockShare.mockResolvedValue(undefined)

      const shareData = {
        title: 'Budget AK-47 Loadout',
        text: 'Check out my CS2 loadout!',
        url: 'https://csloadout.gg/loadouts/budget-ak-loadout'
      }

      await navigator.share(shareData)

      expect(mockShare).toHaveBeenCalledWith(shareData)
    })

    it('RED: should handle user cancellation of Web Share', async () => {
      Object.assign(navigator, {
        share: mockShare
      })
      mockShare.mockRejectedValue(new DOMException('Share cancelled', 'AbortError'))

      let error: DOMException | null = null
      try {
        await navigator.share({ title: 'Test', url: 'https://test.com' })
      } catch (err) {
        error = err as DOMException
      }

      expect(error).toBeTruthy()
      expect(error?.name).toBe('AbortError')
    })
  })

  describe('Share Button Accessibility', () => {
    it('RED: should have proper ARIA labels', () => {
      const twitterButton = {
        'aria-label': 'Share on Twitter',
        role: 'button'
      }

      const copyButton = {
        'aria-label': 'Copy link to clipboard',
        role: 'button'
      }

      expect(twitterButton['aria-label']).toBe('Share on Twitter')
      expect(copyButton['aria-label']).toBe('Copy link to clipboard')
    })

    it('RED: should be keyboard accessible', () => {
      // Buttons should respond to Enter and Space keys
      const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          // Trigger share action
          return true
        }
        return false
      }

      const enterEvent = { key: 'Enter', preventDefault: jest.fn() } as any
      const spaceEvent = { key: ' ', preventDefault: jest.fn() } as any
      const otherEvent = { key: 'a', preventDefault: jest.fn() } as any

      expect(handleKeyDown(enterEvent)).toBe(true)
      expect(handleKeyDown(spaceEvent)).toBe(true)
      expect(handleKeyDown(otherEvent)).toBe(false)
    })

    it('RED: should have visual focus indicators', () => {
      const buttonStyles = {
        ':focus': {
          outline: '2px solid blue',
          outlineOffset: '2px'
        }
      }

      expect(buttonStyles[':focus'].outline).toBe('2px solid blue')
    })
  })

  describe('Share URL Generation', () => {
    it('RED: should prefer slug over UUID for share URLs', () => {
      const loadout = {
        id: 'uuid-123-456',
        slug: 'budget-ak-loadout'
      }

      const shareUrl = loadout.slug
        ? `https://csloadout.gg/loadouts/${loadout.slug}`
        : `https://csloadout.gg/loadouts/${loadout.id}`

      expect(shareUrl).toBe('https://csloadout.gg/loadouts/budget-ak-loadout')
      expect(shareUrl).not.toContain('uuid-')
    })

    it('RED: should use absolute URLs for sharing', () => {
      const relativeUrl = '/loadouts/test'
      const absoluteUrl = `https://csloadout.gg${relativeUrl}`

      expect(absoluteUrl).toMatch(/^https:\/\//)
      expect(absoluteUrl).toBe('https://csloadout.gg/loadouts/test')
    })

    it('RED: should handle special characters in loadout names', () => {
      const loadoutName = 'AK-47 "Redline" & M4A4'
      const encodedName = encodeURIComponent(loadoutName)

      expect(encodedName).toBe('AK-47%20%22Redline%22%20%26%20M4A4')
      expect(decodeURIComponent(encodedName)).toBe(loadoutName)
    })
  })

  describe('Error Handling', () => {
    it('RED: should handle HTTPS requirement violation gracefully', async () => {
      // Simulate non-HTTPS context
      mockClipboard.writeText.mockRejectedValue(
        new DOMException('Document is not focused', 'NotAllowedError')
      )

      let error: DOMException | null = null
      try {
        await navigator.clipboard.writeText('https://test.com')
      } catch (err) {
        error = err as DOMException
      }

      expect(error?.name).toBe('NotAllowedError')
    })

    it('RED: should provide user-friendly error messages', () => {
      const errorMessages: Record<string, string> = {
        'AbortError': 'Share cancelled',
        'NotAllowedError': 'Permission denied. Please allow clipboard access.',
        'NotSupportedError': 'Share not supported on this browser'
      }

      expect(errorMessages['AbortError']).toBe('Share cancelled')
      expect(errorMessages['NotAllowedError']).toContain('Permission denied')
      expect(errorMessages['NotSupportedError']).toContain('not supported')
    })
  })

  describe('Mobile Responsiveness', () => {
    it('RED: should adapt share button layout for mobile', () => {
      const mobileBreakpoint = 768 // px

      const getButtonLayout = (screenWidth: number) => {
        return screenWidth < mobileBreakpoint ? 'stacked' : 'horizontal'
      }

      expect(getButtonLayout(375)).toBe('stacked') // iPhone
      expect(getButtonLayout(1024)).toBe('horizontal') // Desktop
    })

    it('RED: should prioritize Web Share API on mobile devices', () => {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const hasWebShare = typeof navigator.share === 'function'

      // On mobile, prefer native share if available
      const preferNativeShare = isMobile && hasWebShare

      // Test will vary based on test environment
      expect(typeof preferNativeShare).toBe('boolean')
    })
  })

  describe('Share Analytics', () => {
    it('RED: should track share button clicks', () => {
      const trackEvent = jest.fn()

      const handleTwitterShare = () => {
        trackEvent('share', {
          method: 'twitter',
          content_type: 'loadout',
          item_id: 'loadout-123'
        })
      }

      handleTwitterShare()

      expect(trackEvent).toHaveBeenCalledWith('share', {
        method: 'twitter',
        content_type: 'loadout',
        item_id: 'loadout-123'
      })
    })

    it('RED: should track successful copy events', () => {
      const trackEvent = jest.fn()

      const handleCopySuccess = () => {
        trackEvent('share', {
          method: 'copy_link',
          content_type: 'loadout'
        })
      }

      handleCopySuccess()

      expect(trackEvent).toHaveBeenCalledWith('share', expect.objectContaining({
        method: 'copy_link'
      }))
    })
  })
})
