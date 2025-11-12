'use client'

/**
 * GDPR Consent Modal Component - Client Component
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Request consent before first import (lines 331-345)
 *
 * GDPR Compliance (2025):
 * - Equal prominence for Accept/Decline (no dark patterns)
 * - Plain language explanations
 * - Granular data collection disclosure
 * - Processing purposes stated explicitly
 * - Easy to decline without penalties
 *
 * Responsibilities:
 * - Display privacy policy consent screen
 * - Show data collection table with purposes
 * - Provide Accept/Decline options with equal styling
 * - Call onAccept callback when user accepts
 * - Call onClose callback when user declines
 */

import React from 'react'

export interface ConsentModalProps {
  isOpen: boolean
  onClose: () => void
  onAccept: () => void
}

export default function ConsentModal({ isOpen, onClose, onAccept }: ConsentModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Privacy Policy Consent</h2>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Explanation */}
          <p className="text-gray-700">
            We will import your inventory data from Steam API to provide marketplace price comparisons
            and help you find the best deals for your CS2 items.
          </p>

          {/* Data Collection Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Field
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purpose
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-900">Asset ID</td>
                  <td className="px-4 py-3 text-sm text-gray-700">Identify unique items</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-900">Market Hash Name</td>
                  <td className="px-4 py-3 text-sm text-gray-700">Match items to our database</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-900">Float Value</td>
                  <td className="px-4 py-3 text-sm text-gray-700">Calculate collector value</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-900">Trade Status</td>
                  <td className="px-4 py-3 text-sm text-gray-700">Show trade restrictions</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Additional Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Your Rights</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• You can withdraw consent at any time</li>
              <li>• You can request data export or deletion</li>
              <li>• We store data securely and never sell it</li>
              <li>• Data is used only for price comparison services</li>
            </ul>
          </div>
        </div>

        {/* Footer - Equal Prominence Buttons */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-4 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            type="button"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            type="button"
          >
            Accept and Import
          </button>
        </div>
      </div>
    </div>
  )
}
