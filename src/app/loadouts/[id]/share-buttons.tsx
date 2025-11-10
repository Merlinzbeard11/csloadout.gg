'use client'

/**
 * Share Buttons Component (Phase 7g)
 *
 * BDD: features/08-budget-loadout-builder-phase7.feature (lines 282-320)
 * Tests: __tests__/share-buttons.test.tsx
 *
 * Provides multiple sharing methods:
 * - Twitter share (opens Twitter intent)
 * - Copy URL to clipboard (modern API + fallback)
 * - Web Share API (mobile-first, optional)
 *
 * Handles gotchas:
 * - HTTPS requirement for Clipboard API
 * - User activation requirement for Web Share API
 * - Browser compatibility with feature detection
 * - Fallback for older browsers (document.execCommand)
 */

import { useState } from 'react'

interface ShareButtonsProps {
  loadoutId: string
  loadoutName: string
  loadoutSlug: string | null
  loadoutDescription: string | null
}

export function ShareButtons({
  loadoutId,
  loadoutName,
  loadoutSlug,
  loadoutDescription
}: ShareButtonsProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [showWebShare, setShowWebShare] = useState(false)

  // Generate share URL (prefer slug over UUID)
  const shareUrl = loadoutSlug
    ? `https://csloadout.gg/loadouts/${loadoutSlug}`
    : `https://csloadout.gg/loadouts/${loadoutId}`

  // Generate Twitter share text
  const twitterText = loadoutDescription
    ? `Check out my ${loadoutName}! ${loadoutDescription}`
    : `Check out my ${loadoutName} on CSLoadout.gg!`

  /**
   * Handle Twitter Share
   * Opens Twitter intent URL in popup window
   */
  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      twitterText
    )}&url=${encodeURIComponent(shareUrl)}&hashtags=CS2,CSLoadout`

    window.open(twitterUrl, '_blank', 'width=550,height=420')

    // Optional: Track share event
    // trackEvent('share', { method: 'twitter', content_type: 'loadout', item_id: loadoutId })
  }

  /**
   * Handle Copy URL to Clipboard
   * Uses modern Clipboard API with fallback for older browsers
   */
  const handleCopyUrl = async () => {
    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        setCopyStatus('success')

        // Reset status after 2 seconds
        setTimeout(() => setCopyStatus('idle'), 2000)

        // Optional: Track copy event
        // trackEvent('share', { method: 'copy_link', content_type: 'loadout' })
        return
      }

      // Fallback for older browsers
      const success = copyUrlFallback(shareUrl)
      if (success) {
        setCopyStatus('success')
        setTimeout(() => setCopyStatus('idle'), 2000)
      } else {
        setCopyStatus('error')
        setTimeout(() => setCopyStatus('idle'), 3000)
      }
    } catch (err) {
      console.error('Failed to copy URL:', err)
      setCopyStatus('error')
      setTimeout(() => setCopyStatus('idle'), 3000)

      // Try fallback as last resort
      const fallbackSuccess = copyUrlFallback(shareUrl)
      if (fallbackSuccess) {
        setCopyStatus('success')
        setTimeout(() => setCopyStatus('idle'), 2000)
      }
    }
  }

  /**
   * Fallback copy method using deprecated document.execCommand
   * Still works in most browsers for backward compatibility
   */
  const copyUrlFallback = (text: string): boolean => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()

    try {
      const successful = document.execCommand('copy')
      document.body.removeChild(textarea)
      return successful
    } catch (err) {
      document.body.removeChild(textarea)
      return false
    }
  }

  /**
   * Handle Web Share API (mobile-first)
   * Only available in secure contexts (HTTPS) with user activation
   */
  const handleWebShare = async () => {
    if (!navigator.share) {
      // Fallback: Show traditional share buttons
      setShowWebShare(false)
      return
    }

    try {
      await navigator.share({
        title: loadoutName,
        text: twitterText,
        url: shareUrl
      })

      // Optional: Track Web Share usage
      // trackEvent('share', { method: 'web_share', content_type: 'loadout' })
    } catch (err) {
      // User cancelled or error occurred
      if ((err as Error).name === 'AbortError') {
        // User cancelled - do nothing
        return
      }

      console.error('Web Share failed:', err)
      // Show fallback buttons
      setShowWebShare(false)
    }
  }

  // Check if Web Share API is available
  const hasWebShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-gray-700">Share this loadout</h3>

      <div className="flex flex-wrap gap-2">
        {/* Web Share Button (mobile-first, optional) */}
        {hasWebShare && (
          <button
            onClick={handleWebShare}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition-colors"
            aria-label="Share via Web Share API"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            <span>Share</span>
          </button>
        )}

        {/* Twitter Share Button */}
        <button
          onClick={handleTwitterShare}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white rounded-md font-medium transition-colors"
          aria-label="Share on Twitter"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span>Twitter</span>
        </button>

        {/* Copy URL Button */}
        <button
          onClick={handleCopyUrl}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
            copyStatus === 'success'
              ? 'bg-green-100 text-green-700'
              : copyStatus === 'error'
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
          aria-label="Copy link to clipboard"
        >
          {copyStatus === 'success' ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Copied!</span>
            </>
          ) : copyStatus === 'error' ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span>Failed</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span>Copy Link</span>
            </>
          )}
        </button>
      </div>

      {/* URL Display (read-only) */}
      <div className="mt-2">
        <input
          type="text"
          value={shareUrl}
          readOnly
          className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md text-gray-600 font-mono"
          onClick={(e) => e.currentTarget.select()}
        />
      </div>
    </div>
  )
}
