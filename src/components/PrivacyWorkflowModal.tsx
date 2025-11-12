'use client'

/**
 * Interactive Privacy Workflow Modal Component
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Interactive workflow to change Steam privacy settings (lines 157-191)
 *
 * Tests: __tests__/inventory-privacy-workflow.test.tsx
 *
 * Responsibilities:
 * - Display comprehensive privacy workflow modal
 * - Show 7-step numbered instructions with visual guides
 * - Primary CTA: "Open Steam Settings" with Steam deep link detection
 * - Secondary CTA: "I've Changed My Settings - Retry Import"
 * - Expandable help section: "Why is my inventory private?"
 * - Track analytics events (privacy_settings_opened)
 * - Loading state during retry import
 * - Accessible: role="dialog", aria-modal="true", Esc to close
 */

import React, { useState, useEffect, useRef } from 'react'

export interface PrivacyWorkflowModalProps {
  isOpen: boolean
  onClose: () => void
  onRetry: () => void
  steamClientDetected?: boolean
  isRetrying?: boolean
}

export default function PrivacyWorkflowModal({
  isOpen,
  onClose,
  onRetry,
  steamClientDetected = true,
  isRetrying = false
}: PrivacyWorkflowModalProps) {
  const [showHelp, setShowHelp] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const handleRetry = () => {
    onRetry()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const toggleHelp = () => {
    setShowHelp(!showHelp)
  }

  // Determine Steam URL based on client detection
  const steamUrl = steamClientDetected
    ? 'steam://url/SteamIDEditPage'
    : 'https://steamcommunity.com/my/edit/settings'

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-workflow-heading"
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Warning Icon */}
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0" role="img" aria-label="Warning">
                <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2
                id="privacy-workflow-heading"
                className="text-2xl font-bold text-gray-900"
              >
                Your Steam Inventory is Private
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Problem Description */}
          <p className="text-gray-700">
            We can't import your inventory because it's set to private in Steam.
            Follow these steps to make it public:
          </p>

          {/* Step-by-Step Instructions */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-gray-900 mb-3">Step-by-Step Guide:</h3>

            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                <p className="text-sm text-gray-700">Click your Steam username in the top-right corner</p>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                <p className="text-sm text-gray-700">Select "Profile" from the dropdown menu</p>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                <p className="text-sm text-gray-700">Click "Edit Profile" button on your profile page</p>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                <p className="text-sm text-gray-700">Go to "Privacy Settings" tab</p>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
                <p className="text-sm text-gray-700">Find "Inventory" setting and change to "Public"</p>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">6</span>
                <p className="text-sm text-gray-700">Click "Save Changes" at the bottom</p>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">7</span>
                <p className="text-sm text-gray-700">Return to csloadout.gg and click "Retry Import"</p>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="border border-gray-200 rounded-lg">
            <button
              onClick={toggleHelp}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">Why is my inventory private?</span>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${showHelp ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showHelp && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-700">
                  Steam privacy settings control who can view your profile information, including your inventory.
                  By default, some Steam accounts have private inventories to protect user privacy.
                  Making your inventory public allows csloadout.gg to fetch your items and calculate their value.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer - CTAs */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 space-y-3">
          {/* Primary CTA - Open Steam Settings */}
          <a
            href={steamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span>Open Steam Settings</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

          {/* Secondary CTA - Retry Import */}
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRetrying ? 'Retrying...' : 'I\'ve Changed My Settings - Retry Import'}
          </button>
        </div>
      </div>
    </div>
  )
}
