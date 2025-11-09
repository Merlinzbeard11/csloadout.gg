/**
 * PrivacyConsentModal Component - GDPR-Compliant Consent Dialog
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Show privacy consent modal before first import
 *   Scenario: Privacy modal explains data usage clearly
 *   Scenario: Consent timestamp is recorded
 *
 * Tests: __tests__/PrivacyConsentModal.test.tsx (15 test scenarios)
 *
 * Component Responsibilities:
 * - Display GDPR-compliant consent information
 * - Explain data usage (inventory items, pricing, storage duration)
 * - Provide Accept/Decline buttons with callbacks
 * - Link to full privacy policy
 * - Accessibility (focus trap, ESC key, aria-label)
 *
 * GDPR Compliance:
 * - Clear, plain language (no legal jargon)
 * - 90-day data retention policy explained
 * - Right to be forgotten explained
 * - Dismissible without forced acceptance
 * - Consent timestamp recorded on acceptance
 */

'use client'

import React, { useEffect, useRef } from 'react'

export interface PrivacyConsentModalProps {
  /** Controls modal visibility */
  isOpen: boolean
  /** Callback when user accepts consent */
  onAccept: () => void
  /** Callback when user declines consent */
  onDecline: () => void
}

export default function PrivacyConsentModal({
  isOpen,
  onAccept,
  onDecline,
}: PrivacyConsentModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const acceptButtonRef = useRef<HTMLButtonElement>(null)

  // Focus trap - focus first interactive element when modal opens
  useEffect(() => {
    if (isOpen && acceptButtonRef.current) {
      acceptButtonRef.current.focus()
    }
  }, [isOpen])

  // ESC key handler - decline and close
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onDecline()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onDecline])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* Overlay - prevents interaction with page */}
      <div
        className="fixed inset-0 bg-black/60 z-40 transition-opacity"
        onClick={onDecline}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        ref={modalRef}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        role="dialog"
        aria-modal="true"
        aria-label="Privacy consent dialog"
      >
        <div
          className="bg-cs2-dark border border-cs2-blue/30 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-cs2-blue/20">
            <h2
              id="modal-title"
              className="text-2xl font-bold text-cs2-light"
            >
              Privacy Consent
            </h2>
          </div>

          {/* Modal Content */}
          <div id="modal-description" className="px-6 py-4 space-y-4 text-cs2-light/90">
            {/* Introduction - Plain Language */}
            <p className="text-base leading-relaxed">
              We collect your CS2 inventory items to show you their value across marketplaces.
            </p>

            {/* What Data We Collect */}
            <div>
              <h3 className="font-semibold text-cs2-light mb-2">What we collect:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-cs2-light/80">
                <li>Your CS2 inventory items</li>
                <li>Steam asset IDs for each item</li>
                <li>Current market values for pricing comparison</li>
                <li>Last sync timestamp</li>
              </ul>
            </div>

            {/* Storage Duration - 90 days */}
            <div className="bg-cs2-blue/10 border border-cs2-blue/20 rounded p-3">
              <p className="text-sm">
                <strong className="text-cs2-light">Data Storage:</strong>{' '}
                We will store your inventory data for 90 days. After this period, your data is
                automatically deleted unless you sync again.
              </p>
            </div>

            {/* Right to be Forgotten - GDPR */}
            <div className="bg-cs2-blue/10 border border-cs2-blue/20 rounded p-3">
              <p className="text-sm">
                <strong className="text-cs2-light">Your Rights:</strong>{' '}
                You can delete your inventory data at any time from your account settings. This is
                your right under GDPR and we respect it fully.
              </p>
            </div>

            {/* Steam Privacy Requirement */}
            <div className="bg-cs2-orange/10 border border-cs2-orange/30 rounded p-3">
              <p className="text-sm">
                <strong className="text-cs2-orange">Important:</strong>{' '}
                Your Steam inventory must be set to public for us to access it. You can change this
                in your{' '}
                <a
                  href="https://steamcommunity.com/my/edit/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cs2-blue hover:underline"
                >
                  Steam Privacy Settings
                </a>
                {' '}→ Inventory → Public.
              </p>
            </div>

            {/* Privacy Policy Link */}
            <p className="text-xs text-cs2-light/60">
              For full details, read our{' '}
              <a
                href="/privacy-policy"
                className="text-cs2-blue hover:underline"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>

          {/* Modal Footer - Action Buttons */}
          <div className="px-6 py-4 border-t border-cs2-blue/20 flex gap-3 justify-end">
            {/* Decline Button */}
            <button
              onClick={onDecline}
              className="px-6 py-2 bg-cs2-dark border border-cs2-blue/30 rounded text-cs2-light hover:bg-cs2-blue/10 transition-colors"
              aria-label="Decline and close modal"
            >
              Decline
            </button>

            {/* Accept Button */}
            <button
              ref={acceptButtonRef}
              onClick={onAccept}
              className="px-6 py-2 bg-cs2-blue hover:bg-cs2-blue/80 text-white rounded font-medium transition-colors"
              aria-label="Accept privacy consent"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
