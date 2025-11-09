'use client'

/**
 * BudgetVisualization Component
 *
 * Displays budget breakdown with:
 * - Horizontal bar chart showing allocation percentages
 * - Dollar amounts for each category
 * - Table view with detailed breakdown
 * - Real-time updates as budget/allocation changes
 * - Filters out categories with 0% allocation
 */

import React from 'react'

export type CustomAllocation = {
  weapon_skins: number
  knife: number
  gloves: number
  agents: number
  music_kit: number
  charms: number
}

interface BudgetVisualizationProps {
  budget: number
  allocation: CustomAllocation
}

interface CategoryDisplay {
  key: keyof CustomAllocation
  label: string
  color: string
}

const CATEGORY_CONFIG: CategoryDisplay[] = [
  { key: 'weapon_skins', label: 'Weapon Skins', color: 'bg-blue-500' },
  { key: 'knife', label: 'Knife', color: 'bg-red-500' },
  { key: 'gloves', label: 'Gloves', color: 'bg-green-500' },
  { key: 'agents', label: 'Agents', color: 'bg-yellow-500' },
  { key: 'music_kit', label: 'Music Kit', color: 'bg-purple-500' },
  { key: 'charms', label: 'Charms', color: 'bg-pink-500' }
]

export function BudgetVisualization({ budget, allocation }: BudgetVisualizationProps) {
  // Calculate amounts for each category
  const categories = CATEGORY_CONFIG
    .map((config) => {
      const percentage = allocation[config.key]
      const amount = (budget * percentage) / 100

      return {
        ...config,
        percentage,
        amount
      }
    })
    .filter((cat) => cat.percentage > 0) // Only show categories with allocation

  const total = categories.reduce((sum, cat) => sum + cat.amount, 0)
  const totalPercentage = categories.reduce((sum, cat) => sum + cat.percentage, 0)

  // Check for rounding differences
  const roundingDifference = Math.abs(total - budget)
  const hasRoundingIssue = roundingDifference > 0.01

  return (
    <div className="space-y-6">
      {/* Horizontal Bar Chart */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Budget Breakdown</h3>
        <div className="space-y-3">
          {categories.map((category) => (
            <div key={category.key}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">{category.label}</span>
                <span className="text-gray-600">
                  ${category.amount.toFixed(2)} ({category.percentage.toFixed(2)}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  role="progressbar"
                  aria-valuenow={category.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${category.label} allocation`}
                  className={`${category.color} h-3 rounded-full transition-all duration-300`}
                  style={{ width: `${category.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table Breakdown */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Detailed Breakdown</h3>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  %
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((category) => (
                <tr key={category.key}>
                  <td className="px-4 py-2 text-sm text-gray-900">{category.label}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 text-right">
                    {category.percentage.toFixed(2)}%
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600 text-right">
                    ${category.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-4 py-2 text-sm font-bold text-gray-900">Total Budget:</td>
                <td className="px-4 py-2 text-sm font-bold text-gray-900 text-right">
                  {totalPercentage.toFixed(2)}%
                </td>
                <td className="px-4 py-2 text-sm font-bold text-gray-900 text-right">
                  ${budget.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Rounding Warning */}
      {hasRoundingIssue && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800">
            Note: Minor rounding differences may occur due to percentage calculations.
            Difference: ${roundingDifference.toFixed(2)}
          </p>
        </div>
      )}

      {/* Total Summary */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">Total Budget:</span>
          <span className="text-xl font-bold text-gray-900">
            ${budget.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}
