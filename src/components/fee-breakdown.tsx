"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

interface FeeBreakdownProps {
  basePrice: number
  platformFeePercent: number
  paymentFeePercent: number
  paymentFeeFixed: number
  marketplace: string
}

export function FeeBreakdown({
  basePrice,
  platformFeePercent,
  paymentFeePercent,
  paymentFeeFixed,
  marketplace,
}: FeeBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Calculate fees
  const platformFee = (basePrice * platformFeePercent) / 100
  const paymentFee = (basePrice * paymentFeePercent) / 100 + paymentFeeFixed
  const totalCost = basePrice + platformFee + paymentFee

  // Calculate percentages for visual breakdown
  const basePricePercent = (basePrice / totalCost) * 100
  const platformFeePercent2 = (platformFee / totalCost) * 100
  const paymentFeePercent2 = (paymentFee / totalCost) * 100

  return (
    <div className="bg-cs2-dark border border-cs2-blue/20 rounded-lg p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
      >
        <h3 className="text-lg font-semibold text-cs2-light">Fee Breakdown</h3>
        <ChevronDown className={`w-5 h-5 text-cs2-light transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </button>

      <div className={`transition-all overflow-hidden ${isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-cs2-light">Base Price</span>
            <span className="text-cs2-light font-medium">${basePrice.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-orange-400">Platform Fee ({platformFeePercent}%)</span>
            <span className="text-orange-400 font-medium">${platformFee.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-blue-400">
              Payment Fee ({paymentFeePercent}% + ${paymentFeeFixed.toFixed(2)})
            </span>
            <span className="text-blue-400 font-medium">${paymentFee.toFixed(2)}</span>
          </div>

          <div className="pt-3 border-t border-cs2-blue/20 flex items-center justify-between">
            <span className="text-cs2-light font-bold text-lg">Total Cost</span>
            <span className="text-cs2-light font-bold text-lg">${totalCost.toFixed(2)}</span>
          </div>
        </div>

        {/* Visual Breakdown Chart */}
        <div className="space-y-2">
          <p className="text-sm text-cs2-light/70">Visual Breakdown</p>
          <div className="flex w-full h-8 rounded-lg overflow-hidden">
            <div
              className="bg-gray-500 hover:bg-gray-400 transition-colors relative group"
              style={{ width: `${basePricePercent}%` }}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-white font-medium">${basePrice.toFixed(2)}</span>
              </div>
            </div>
            <div
              className="bg-orange-500 hover:bg-orange-400 transition-colors relative group"
              style={{ width: `${platformFeePercent2}%` }}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-white font-medium">${platformFee.toFixed(2)}</span>
              </div>
            </div>
            <div
              className="bg-blue-500 hover:bg-blue-400 transition-colors relative group"
              style={{ width: `${paymentFeePercent2}%` }}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-white font-medium">${paymentFee.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-500 rounded"></div>
              <span className="text-cs2-light/70">Base Price</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span className="text-cs2-light/70">Platform Fee</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-cs2-light/70">Payment Fee</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-cs2-light/50 mt-4">Marketplace: {marketplace}</p>
      </div>
    </div>
  )
}
