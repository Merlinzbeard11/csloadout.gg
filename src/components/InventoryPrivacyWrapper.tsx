'use client'

/**
 * Inventory Privacy Wrapper - Client Component
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Handle private inventory gracefully (lines 117-130)
 *
 * Responsibilities:
 * - Manage PrivacyModal open/close state
 * - Automatically open modal if inventory is private
 * - Handle retry import server action
 * - Display success/error messages
 */

import React, { useState, useEffect } from 'react'
import PrivacyModal from './PrivacyModal'
import { retryInventoryImport, RetryImportResult } from '@/actions/inventory'
import { useRouter } from 'next/navigation'

export interface InventoryPrivacyWrapperProps {
  isPrivate: boolean
  children: React.ReactNode
}

export default function InventoryPrivacyWrapper({
  isPrivate,
  children
}: InventoryPrivacyWrapperProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()

  // Open modal automatically if inventory is private
  useEffect(() => {
    if (isPrivate) {
      setIsModalOpen(true)
    }
  }, [isPrivate])

  const handleRetry = async () => {
    setIsRetrying(true)
    setErrorMessage(null)

    try {
      const result: RetryImportResult = await retryInventoryImport()

      if (result.success) {
        // Success - close modal and refresh page
        setIsModalOpen(false)
        router.refresh()
      } else {
        // Failed - show error message
        setErrorMessage(result.message)

        // If still private, keep modal open
        if (result.syncStatus === 'private') {
          setIsModalOpen(true)
        }
      }
    } catch (error) {
      console.error('Retry error:', error)
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsRetrying(false)
    }
  }

  const handleClose = () => {
    setIsModalOpen(false)
    setErrorMessage(null)
  }

  return (
    <>
      {children}

      <PrivacyModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onRetry={handleRetry}
      />

      {/* Error Toast (if retry fails) */}
      {errorMessage && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg">
          <p className="font-semibold">Retry Failed</p>
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      {/* Loading indicator during retry */}
      {isRetrying && (
        <div className="fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded shadow-lg">
          <p className="text-sm">Retrying import...</p>
        </div>
      )}
    </>
  )
}
