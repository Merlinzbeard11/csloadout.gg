'use client'

/**
 * Import Button Component - Client Component
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: First-time inventory import shows total value (lines 17-27)
 *
 * Responsibilities:
 * - Trigger inventory import via server action
 * - Display progress states (idle, importing, complete, error)
 * - Show progress messages
 * - Refresh page on successful import
 */

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { startInventoryImport, type ImportResult } from '@/actions/inventory'

export interface ImportButtonProps {
  className?: string
}

export default function ImportButton({ className }: ImportButtonProps) {
  const [status, setStatus] = useState<'idle' | 'importing' | 'complete' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')
  const [itemsImported, setItemsImported] = useState<number>(0)
  const router = useRouter()

  const handleImport = async () => {
    setStatus('importing')
    setMessage('Fetching inventory from Steam...')

    try {
      const result: ImportResult = await startInventoryImport()

      if (result.success) {
        setStatus('complete')
        setMessage('Import Complete')
        setItemsImported(result.itemsImported || 0)

        // Refresh page to show imported inventory
        router.refresh()
      } else {
        setStatus('error')
        setMessage(result.message)
      }
    } catch (error) {
      console.error('Import error:', error)
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Failed to fetch inventory. Please try again.')
    }
  }

  const isImporting = status === 'importing'
  const isComplete = status === 'complete'
  const isError = status === 'error'

  return (
    <div className="space-y-4">
      <button
        onClick={handleImport}
        disabled={isImporting}
        className={`px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed ${className || ''}`}
      >
        Import Steam Inventory
      </button>

      {/* Progress Indicator */}
      {isImporting && (
        <div role="status" className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          {/* Loading spinner */}
          <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-blue-900 font-medium">{message}</p>
        </div>
      )}

      {/* Success Message */}
      {isComplete && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-900 font-semibold">{message}</p>
          <p className="text-green-700 text-sm mt-1">{itemsImported} items imported</p>
        </div>
      )}

      {/* Error Message */}
      {isError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-900 font-semibold">Import Failed</p>
          <p className="text-red-700 text-sm mt-1">{message}</p>
        </div>
      )}
    </div>
  )
}
