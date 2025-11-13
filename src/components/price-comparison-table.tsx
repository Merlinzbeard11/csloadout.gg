"use client"

import { useState } from "react"
import { ArrowUpDown, ArrowUp, ArrowDown, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"

interface MarketplacePrice {
  marketplace: string
  marketplaceLogo?: string
  basePrice: number
  fees: number
  totalCost: number
  stock: number
  listingUrl: string
  feeBreakdown?: {
    platformFee: number
    paymentFee: number
  }
}

interface PriceComparisonTableProps {
  prices: MarketplacePrice[]
  itemName: string
}

type SortField = "marketplace" | "basePrice" | "fees" | "totalCost" | "stock"
type SortDirection = "asc" | "desc"

export function PriceComparisonTable({ prices, itemName }: PriceComparisonTableProps) {
  const [sortField, setSortField] = useState<SortField>("totalCost")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const sortedPrices = [...prices].sort((a, b) => {
    const aValue: number | string = a[sortField]
    const bValue: number | string = b[sortField]

    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  const bestDealIndex = sortedPrices.findIndex(
    (price) =>
      price.stock > 0 &&
      price.totalCost === Math.min(...sortedPrices.filter((p) => p.stock > 0).map((p) => p.totalCost)),
  )

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
    }
    return sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
  }

  return (
    <TooltipProvider>
      <div className="w-full">
        <h2 className="text-2xl font-bold text-cs2-light mb-4">Price Comparison: {itemName}</h2>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-cs2-blue/20 bg-cs2-dark">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cs2-blue/20">
                <th className="text-left p-4">
                  <button
                    onClick={() => handleSort("marketplace")}
                    className="flex items-center text-cs2-light hover:text-cs2-blue transition-colors text-sm font-semibold"
                  >
                    Marketplace
                    <SortIcon field="marketplace" />
                  </button>
                </th>
                <th className="text-right p-4">
                  <button
                    onClick={() => handleSort("basePrice")}
                    className="flex items-center justify-end w-full text-cs2-light hover:text-cs2-blue transition-colors text-sm font-semibold"
                  >
                    Base Price
                    <SortIcon field="basePrice" />
                  </button>
                </th>
                <th className="text-right p-4">
                  <button
                    onClick={() => handleSort("fees")}
                    className="flex items-center justify-end w-full text-cs2-light hover:text-cs2-blue transition-colors text-sm font-semibold"
                  >
                    Fees
                    <SortIcon field="fees" />
                  </button>
                </th>
                <th className="text-right p-4">
                  <button
                    onClick={() => handleSort("totalCost")}
                    className="flex items-center justify-end w-full text-cs2-light hover:text-cs2-blue transition-colors text-sm font-semibold"
                  >
                    Total Cost
                    <SortIcon field="totalCost" />
                  </button>
                </th>
                <th className="text-right p-4">
                  <button
                    onClick={() => handleSort("stock")}
                    className="flex items-center justify-end w-full text-cs2-light hover:text-cs2-blue transition-colors text-sm font-semibold"
                  >
                    Stock
                    <SortIcon field="stock" />
                  </button>
                </th>
                <th className="text-right p-4">
                  <span className="text-cs2-light text-sm font-semibold">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPrices.map((price, index) => {
                const isBestDeal = index === bestDealIndex && price.stock > 0
                const isOutOfStock = price.stock === 0

                return (
                  <tr
                    key={`${price.marketplace}-${index}`}
                    className={`border-b border-cs2-blue/10 hover:bg-cs2-blue/5 transition-colors ${
                      isBestDeal ? "bg-green-500/10" : ""
                    } ${isOutOfStock ? "opacity-50" : ""}`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {price.marketplaceLogo ? (
                          <img
                            src={price.marketplaceLogo || "/placeholder.svg"}
                            alt={price.marketplace}
                            className="w-5 h-5 object-contain"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded bg-cs2-blue/20 flex items-center justify-center text-xs text-cs2-blue">
                            {price.marketplace[0]}
                          </div>
                        )}
                        <span className="text-sm text-cs2-light">{price.marketplace}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-mono text-cs2-light">${price.basePrice.toFixed(2)}</span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="font-mono text-cs2-light">${price.fees.toFixed(2)}</span>
                        {price.feeBreakdown && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-cs2-blue cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-cs2-dark border border-cs2-blue/20 text-cs2-light">
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between gap-4">
                                  <span>Platform fee:</span>
                                  <span className="font-mono">${price.feeBreakdown.platformFee.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span>Payment processing:</span>
                                  <span className="font-mono">${price.feeBreakdown.paymentFee.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between gap-4 pt-1 border-t border-cs2-blue/20 font-semibold">
                                  <span>Total fees:</span>
                                  <span className="font-mono">${price.fees.toFixed(2)}</span>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span
                        className={`font-mono text-lg font-bold ${isBestDeal ? "text-green-500" : "text-cs2-light"}`}
                      >
                        ${price.totalCost.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm text-cs2-light">
                        {price.stock > 0 ? `${price.stock} available` : "Out of stock"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        asChild
                        disabled={isOutOfStock}
                        className="bg-cs2-blue hover:bg-cs2-blue/80 text-white px-3 py-1 text-sm h-auto"
                      >
                        <a href={price.listingUrl} target="_blank" rel="noopener noreferrer">
                          Buy Now
                        </a>
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {sortedPrices.map((price, index) => {
            const isBestDeal = index === bestDealIndex && price.stock > 0
            const isOutOfStock = price.stock === 0

            return (
              <div
                key={`${price.marketplace}-${index}-mobile`}
                className={`bg-cs2-dark rounded-lg p-4 border ${
                  isBestDeal ? "border-green-500" : "border-cs2-blue/20"
                } ${isOutOfStock ? "opacity-50" : ""}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {price.marketplaceLogo ? (
                      <img
                        src={price.marketplaceLogo || "/placeholder.svg"}
                        alt={price.marketplace}
                        className="w-5 h-5 object-contain"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded bg-cs2-blue/20 flex items-center justify-center text-xs text-cs2-blue">
                        {price.marketplace[0]}
                      </div>
                    )}
                    <span className="text-sm font-semibold text-cs2-light">{price.marketplace}</span>
                  </div>
                  {isBestDeal && (
                    <span className="text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded">Best Deal</span>
                  )}
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-cs2-light/70">Base Price:</span>
                    <span className="font-mono text-cs2-light">${price.basePrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-cs2-light/70 flex items-center gap-1">
                      Fees:
                      {price.feeBreakdown && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-cs2-blue cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-cs2-dark border border-cs2-blue/20 text-cs2-light">
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between gap-4">
                                <span>Platform fee:</span>
                                <span className="font-mono">${price.feeBreakdown.platformFee.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span>Payment processing:</span>
                                <span className="font-mono">${price.feeBreakdown.paymentFee.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between gap-4 pt-1 border-t border-cs2-blue/20 font-semibold">
                                <span>Total fees:</span>
                                <span className="font-mono">${price.fees.toFixed(2)}</span>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </span>
                    <span className="font-mono text-cs2-light">${price.fees.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-cs2-light/70">Stock:</span>
                    <span className="text-cs2-light">
                      {price.stock > 0 ? `${price.stock} available` : "Out of stock"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-cs2-blue/20">
                  <div>
                    <div className="text-xs text-cs2-light/70 mb-1">Total Cost</div>
                    <div className={`font-mono text-xl font-bold ${isBestDeal ? "text-green-500" : "text-cs2-light"}`}>
                      ${price.totalCost.toFixed(2)}
                    </div>
                  </div>
                  <Button
                    asChild
                    disabled={isOutOfStock}
                    className="bg-cs2-blue hover:bg-cs2-blue/80 text-white px-4 py-2"
                  >
                    <a href={price.listingUrl} target="_blank" rel="noopener noreferrer">
                      Buy Now
                    </a>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}
