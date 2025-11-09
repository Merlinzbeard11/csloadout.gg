/**
 * InventoryImportButton Component - Triggers Steam Inventory Sync
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: First-time inventory import shows total value
 *   Scenario: Show privacy consent modal before first import
 *   Scenario: Handle private inventory gracefully
 *   Scenario: Handle rate limit during import
 *
 * Tests: __tests__/InventoryImportButton.test.tsx (23 test scenarios)
 *
 * Component Responsibilities:
 * - Trigger inventory sync API call (POST /api/inventory/sync)
 * - Show GDPR consent modal on first import (if consent not given)
 * - Display loading state during sync ("Importing...")
 * - Show success message with total value
 * - Handle error states: private inventory (403), rate limits (429), other errors
 * - Support force refresh (bypass cache)
 * - Call onSuccess/onError callbacks for parent component integration
 */

'use client'

import React, { useState } from 'react'
import PrivacyConsentModal from './PrivacyConsentModal'

export interface InventoryImportButtonProps {
  /** User ID for sync operation */
  userId: string
  /** Has user previously given GDPR consent? */
  hasConsentGiven?: boolean
  /** Success callback with import data */
  onSuccess?: (data: { itemsImported: number; totalValue: number }) => void
  /** Error callback with error message */
  onError?: (error: string) => void
  /** Force refresh (bypass cache) */
  force?: boolean
}

export default function InventoryImportButton({
  userId,
  hasConsentGiven = false,
  onSuccess,
  onError,
  force = false,
}: InventoryImportButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  /**
   * Handles import button click
   * - If consent not given: show modal
   * - If consent given: trigger sync immediately
   */
  const handleImportClick = () => {
    if (!hasConsentGiven) {
      setShowConsentModal(true)
    } else {
      triggerSync(true)
    }
  }

  /**
   * Handles consent modal acceptance
   * - Close modal
   * - Trigger sync with consentGiven=true
   */
  const handleConsentAccept = () => {
    setShowConsentModal(false)
    triggerSync(true)
  }

  /**
   * Handles consent modal decline
   * - Close modal without triggering sync
   */
  const handleConsentDecline = () => {
    setShowConsentModal(false)
  }

  /**
   * Triggers inventory sync API call
   * @param consentGiven - GDPR consent status
   */
  const triggerSync = async (consentGiven: boolean) => {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/inventory/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consentGiven,
          force,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle error responses
        handleSyncError(response.status, data.error, data.message)
        return
      }

      // Handle success
      if (data.success) {
        const message = `Successfully imported ${data.itemsImported} items worth $${data.totalValue.toFixed(2)}`
        setSuccessMessage(message)

        if (onSuccess) {
          onSuccess({
            itemsImported: data.itemsImported,
            totalValue: data.totalValue,
          })
        }
      }
    } catch (err) {
      // Network error or other exception
      const errorMessage = 'Failed to connect to server. Please try again.'
      setError(errorMessage)

      if (onError) {
        onError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handles sync error responses with user-friendly messages
   */
  const handleSyncError = (status: number, errorCode: string, errorMessage: string) => {
    let userFriendlyMessage = errorMessage

    switch (errorCode) {
      case 'PRIVATE_INVENTORY':
        userFriendlyMessage =
          'Your Steam inventory is private. Please set it to public in your Steam privacy settings.'
        break

      case 'RATE_LIMITED':
        userFriendlyMessage = 'Rate limit exceeded. Please try again in a few minutes.'
        break

      case 'CONSENT_REQUIRED':
        userFriendlyMessage = 'You must accept the privacy consent to import your inventory.'
        break

      default:
        userFriendlyMessage = errorMessage || 'An error occurred during import. Please try again.'
    }

    setError(userFriendlyMessage)

    if (onError) {
      onError(userFriendlyMessage)
    }
  }

  return (
    <>
      {/* Import Button */}
      <div className="space-y-3">
        <button
          onClick={handleImportClick}
          disabled={isLoading}
          className={`
            px-6 py-3 rounded-lg font-medium transition-colors
            ${
              isLoading
                ? 'bg-cs2-blue/50 text-white/60 cursor-not-allowed'
                : 'bg-cs2-blue hover:bg-cs2-blue/80 text-white'
            }
          `}
          aria-label="Import Steam inventory"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline"
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
              Importing...
            </>
          ) : (
            'Import My Inventory'
          )}
        </button>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-500/10 border border-green-500/30 rounded p-3 text-green-400 text-sm">
            ✓ {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-red-400 text-sm">
            ⚠ {error}
          </div>
        )}
      </div>

      {/* GDPR Consent Modal */}
      <PrivacyConsentModal
        isOpen={showConsentModal}
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
      />
    </>
  )
}
