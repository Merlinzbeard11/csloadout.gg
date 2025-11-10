'use client'

/**
 * Privacy Workflow Modal Component
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Handle private inventory gracefully (lines 117-130)
 *   Scenario: Minimal-friction workflow with direct Steam link (lines 132-146)
 *
 * Tests: __tests__/privacy-modal.test.tsx
 *
 * Responsibilities:
 * - Display modal when user's Steam inventory is private
 * - Show streamlined privacy message with clear CTAs
 * - Open Steam privacy settings (steam:// protocol or browser fallback)
 * - Retry import after user changes privacy settings
 * - Accessible: role="dialog", aria-modal="true", focus trap, Esc to close
 */

import React, { useEffect, useRef } from 'react'

export interface PrivacyModalProps {
  isOpen: boolean
  onClose: () => void
  onRetry: () => void
  steamClientDetected?: boolean
}

export default function PrivacyModal({
  isOpen,
  onClose,
  onRetry,
  steamClientDetected = true
}: PrivacyModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Focus first element when modal opens
      closeButtonRef.current?.focus()
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Focus trap implementation
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return

    const dialog = dialogRef.current
    const focusableElements = dialog.querySelectorAll(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab: going backwards
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        // Tab: going forwards
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    dialog.addEventListener('keydown', handleTabKey as EventListener)
    return () => {
      dialog.removeEventListener('keydown', handleTabKey as EventListener)
    }
  }, [isOpen])

  const handleRetry = () => {
    onRetry()
    onClose()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Determine Steam URL based on client detection
  const steamUrl = steamClientDetected
    ? 'steam://url/SteamIDEditPage'
    : 'https://steamcommunity.com/my/edit/settings'

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-modal-heading"
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
      >
        {/* Close Button (X in corner) */}
        <div className="flex justify-end mb-2">
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Warning Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h2
          id="privacy-modal-heading"
          className="text-2xl font-bold text-gray-900 text-center mb-3"
        >
          Your Inventory is Private
        </h2>

        {/* Message */}
        <p className="text-gray-600 text-center mb-6">
          We need permission to view your inventory.
        </p>

        {/* Quick Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 text-center">
            <strong>Quick Steps:</strong> Click the button → Set Inventory to Public → Come back
          </p>
        </div>

        {/* Primary CTA - Open Steam Privacy Settings */}
        <a
          href={steamUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-center mb-3"
        >
          Open Steam Privacy Settings
        </a>

        {/* Secondary CTA - Retry Import */}
        <button
          onClick={handleRetry}
          className="w-full px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          I've Changed It - Retry Import
        </button>
      </div>
    </div>
  )
}
