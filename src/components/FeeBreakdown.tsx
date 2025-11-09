/**
 * FeeBreakdown Component
 *
 * BDD Reference: features/05-fee-transparency.feature:111-167
 * Tests: __tests__/FeeBreakdown.test.tsx (18 tests)
 *
 * Displays fee information with color-coded badge and tooltip breakdown.
 *
 * Features:
 * - Color-coded fee badges (green ≤2%, yellow 2-10%, red >10%)
 * - Tooltip on hover with detailed breakdown
 * - Warning icon for high fees
 * - Decimal precision (2 decimal places)
 * - Edge case handling (fees under $0.01)
 *
 * Critical Gotchas Addressed:
 * - Currency formatting to 2 decimal places
 * - Conditional rendering of warning icon
 * - Tooltip positioning and visibility
 */

'use client';

import React, { useState } from 'react';
import type { FeeBreakdown as FeeBreakdownType } from '@/types/fees';

interface FeeBreakdownProps {
  breakdown: FeeBreakdownType;
}

export default function FeeBreakdown({ breakdown }: FeeBreakdownProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  // Determine badge color and label based on fee percentage
  const getFeePercent = (): number => {
    const percentStr = breakdown.effectiveFeePercent.replace('%', '');
    return parseFloat(percentStr);
  };

  const feePercent = getFeePercent();

  // Color coding logic:
  // - Green: fees ≤ 2%
  // - Yellow: 2% < fees ≤ 10%
  // - Red: fees > 10%
  const getBadgeColor = (): string => {
    if (feePercent <= 2.0) {
      return 'bg-green-100 text-green-800 border-green-300';
    } else if (feePercent <= 10.0) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    } else {
      return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  const getBadgeLabel = (): string => {
    if (feePercent <= 2.0) {
      return `Low Fees: ${breakdown.effectiveFeePercent}`;
    } else if (feePercent > 10.0) {
      return `High Fees: ${breakdown.effectiveFeePercent}`;
    } else {
      return breakdown.effectiveFeePercent;
    }
  };

  return (
    <div className="relative inline-block">
      {/* Fee Badge */}
      <div
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getBadgeColor()} cursor-pointer`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Warning icon for high fees */}
        {breakdown.hasWarning && <span>⚠️</span>}

        <span>{getBadgeLabel()}</span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute left-0 top-full mt-2 w-80 p-4 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          <div className="space-y-2 text-sm">
            {/* Base Price */}
            <div className="flex justify-between">
              <span className="text-gray-600">Base Price:</span>
              <span className="font-medium">{formatCurrency(breakdown.basePrice)}</span>
            </div>

            {/* Platform Fee */}
            <div className="flex justify-between">
              <span className="text-gray-600">Platform Fee:</span>
              <span className="font-medium">
                {formatCurrency(breakdown.platformFee)} ({((breakdown.platformFee / breakdown.basePrice) * 100).toFixed(0)}%)
              </span>
            </div>

            {/* Hidden Markup (if applicable) */}
            {breakdown.hiddenMarkup > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Hidden Bot Markup:</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(breakdown.hiddenMarkup)} ({((breakdown.hiddenMarkup / breakdown.basePrice) * 100).toFixed(0)}%)
                </span>
              </div>
            )}

            {/* Total Cost */}
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-gray-900 font-semibold">Total You Pay:</span>
              <span className="font-semibold text-lg">{formatCurrency(breakdown.totalCost)}</span>
            </div>

            {/* Warning Message */}
            {breakdown.warningMessage && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-red-600 text-xs">{breakdown.warningMessage}</p>
              </div>
            )}

            {/* Fee Note */}
            {breakdown.feeNote && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-gray-500 text-xs">ℹ️ {breakdown.feeNote}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
