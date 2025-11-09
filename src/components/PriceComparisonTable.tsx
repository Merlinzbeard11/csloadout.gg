/**
 * PriceComparisonTable Component
 *
 * Displays marketplace price comparison table with lowest price highlighting.
 * BDD Reference: features/04-price-aggregation.feature
 *   - Scenario: "View all marketplace prices for comparison"
 *   - Scenario: "Calculate total cost including fees"
 *   - Scenario: "Display data freshness indicator"
 *
 * Requirements:
 *   - Display all marketplace prices sorted by total cost
 *   - Columns: Platform, Price, Fees, Total Cost, Action
 *   - Highlight lowest price row in green
 *   - "Buy on {Platform}" links open in new tab
 *   - Show savings message
 *   - Display data freshness indicator
 */

'use client';

import React from 'react';
import type { AggregatedPrices } from '../types/price';
import { PLATFORM_NAMES } from '../types/price';
import FeeBreakdown from './FeeBreakdown';
import { transformPriceDataToFeeBreakdown } from '../lib/price-to-fee-breakdown';

export interface PriceComparisonTableProps {
  prices: AggregatedPrices;
}

/**
 * Format relative time from timestamp
 * BDD: "Updated X minutes ago"
 */
function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const updatedMs = date.getTime();
  const minutesAgo = Math.floor((now - updatedMs) / 60000);

  if (minutesAgo === 0) {
    return 'Updated just now';
  } else if (minutesAgo === 1) {
    return 'Updated 1 minute ago';
  } else if (minutesAgo < 60) {
    return `Updated ${minutesAgo} minutes ago`;
  } else if (minutesAgo < 120) {
    return 'Updated 1 hour ago';
  } else {
    const hoursAgo = Math.floor(minutesAgo / 60);
    return `Updated ${hoursAgo} hours ago`;
  }
}

export default function PriceComparisonTable({ prices }: PriceComparisonTableProps) {
  const { allPrices, lowestPrice, savings, updatedAt, itemName } = prices;

  // Empty state
  if (!allPrices || allPrices.length === 0) {
    return (
      <div className="overflow-x-auto">
        <table role="table" className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th role="columnheader" scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Platform
              </th>
              <th role="columnheader" scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th role="columnheader" scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fees
              </th>
              <th role="columnheader" scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Cost
              </th>
              <th role="columnheader" scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* No rows - empty state */}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Price Comparison Table */}
      <div className="overflow-x-auto">
        <table role="table" className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th role="columnheader" scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Platform
              </th>
              <th role="columnheader" scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th role="columnheader" scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fees
              </th>
              <th role="columnheader" scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Cost
              </th>
              <th role="columnheader" scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {allPrices.map((priceData) => {
              const isLowestPrice = priceData.totalCost === lowestPrice.totalCost;
              const platformDisplayName = PLATFORM_NAMES[priceData.platform] || priceData.platform;

              return (
                <tr
                  key={priceData.platform}
                  className={isLowestPrice ? 'bg-green-50' : ''}
                >
                  {/* Platform */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {platformDisplayName}
                  </td>

                  {/* Base Price */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${priceData.price.toFixed(2)}
                  </td>

                  {/* Fees - FeeBreakdown Component */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <FeeBreakdown breakdown={transformPriceDataToFeeBreakdown(priceData)} />
                  </td>

                  {/* Total Cost */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    ${priceData.totalCost.toFixed(2)}
                  </td>

                  {/* Action */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {priceData.listingUrl ? (
                      <a
                        href={priceData.listingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Buy on {platformDisplayName}
                      </a>
                    ) : (
                      <span className="text-gray-400">
                        Buy on {platformDisplayName}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Savings Message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Save ${savings.toFixed(2)}</span>
          {' '}by buying on {PLATFORM_NAMES[lowestPrice.platform]}
        </p>
      </div>

      {/* Data Freshness Indicator */}
      <div className="text-sm text-gray-500">
        {formatRelativeTime(updatedAt)}
      </div>
    </div>
  );
}
