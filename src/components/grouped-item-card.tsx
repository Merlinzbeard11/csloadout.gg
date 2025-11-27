"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"

interface Variant {
  id: string
  name: string
  displayName: string | null
  variantType: 'normal' | 'stattrak' | 'souvenir'
  wear: string | null
  imageUrl: string
  imageUrlFallback: string | null
  dropProbability?: number
}

interface PriceRange {
  min: number
  max: number
  currency: string
}

interface GroupedItemCardProps {
  item: {
    baseName: string
    slug?: string
    rarity: string | null
    type: string
    weaponType: string | null
    imageUrl: string
    imageUrlFallback: string | null
    variantCount: number
    hasStatTrak: boolean
    hasSouvenir: boolean
    variants: Variant[]
    isSpecialItem?: boolean
    dropProbability?: number
    // Price ranges (optional, added when price data available)
    priceRange?: PriceRange | null
    statTrakPriceRange?: PriceRange | null
  }
}

// CS2 rarity text colors
const rarityColors: Record<string, string> = {
  consumer: "text-gray-400",
  industrial: "text-blue-400",
  milspec: "text-blue-500",
  restricted: "text-purple-500",
  classified: "text-pink-500",
  covert: "text-red-500",
  contraband: "text-yellow-500",
  default: "text-gray-400",
}

// CS2 rarity border colors
const rarityBorderColors: Record<string, string> = {
  consumer: "border-gray-500/50 hover:border-gray-400",
  industrial: "border-blue-400/50 hover:border-blue-400",
  milspec: "border-blue-500/50 hover:border-blue-500",
  restricted: "border-purple-500/50 hover:border-purple-500",
  classified: "border-pink-500/50 hover:border-pink-500",
  covert: "border-red-500/50 hover:border-red-500",
  contraband: "border-yellow-500/50 hover:border-yellow-500",
  default: "border-cs2-blue/20 hover:border-cs2-blue/50",
}

/**
 * Generate URL-friendly slug from base weapon name
 * "AWP | Printstream" -> "awp-printstream"
 */
function generateSlug(baseName: string): string {
  return baseName
    .toLowerCase()
    .replace(/\s*\|\s*/g, '-') // Replace " | " with "-"
    .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

export function GroupedItemCard({ item }: GroupedItemCardProps) {
  const [imgSrc, setImgSrc] = useState(item.imageUrl)
  const [imgError, setImgError] = useState(false)

  const handleImageError = () => {
    if (!imgError && item.imageUrlFallback) {
      setImgSrc(item.imageUrlFallback)
      setImgError(true)
    } else {
      setImgSrc("/placeholder-item.png")
    }
  }

  const rarityKey = item.rarity || "default"
  const rarityColor = rarityColors[rarityKey] || rarityColors.default
  const borderColor = rarityBorderColors[rarityKey] || rarityBorderColors.default

  // Generate slug for link
  const slug = item.slug || generateSlug(item.baseName)

  return (
    <Link
      href={`/skins/${slug}`}
      className={`block bg-cs2-dark border rounded-lg overflow-hidden transition-all hover:scale-[1.02] ${borderColor}`}
    >
      {/* Special Item Badge */}
      {item.isSpecialItem && (
        <div className="absolute top-2 right-2 z-10 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">
          RARE
        </div>
      )}

      {/* Image Section */}
      <div className="relative aspect-square bg-cs2-darker/50">
        <Image
          src={imgSrc || "/placeholder.svg"}
          alt={item.baseName}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 20vw"
          loading="lazy"
          className="object-contain p-4"
          onError={handleImageError}
        />
      </div>

      {/* Content Section */}
      <div className="p-3">
        {/* Weapon Name */}
        <h3 className="text-sm font-semibold text-cs2-light truncate mb-1">
          {item.baseName}
        </h3>

        {/* Rarity + Weapon Type */}
        <div className="flex items-center gap-2 mb-2">
          {item.rarity && (
            <span className={`text-xs font-medium uppercase ${rarityColor}`}>
              {item.rarity} {item.weaponType || item.type}
            </span>
          )}
        </div>

        {/* StatTrak/Souvenir Badges */}
        <div className="flex flex-wrap gap-1 mb-2">
          {item.hasStatTrak && (
            <span className="text-xs px-1.5 py-0.5 rounded border bg-orange-500/20 text-orange-400 border-orange-500/50">
              StatTrak Available
            </span>
          )}
          {item.hasSouvenir && (
            <span className="text-xs px-1.5 py-0.5 rounded border bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
              Souvenir Available
            </span>
          )}
        </div>

        {/* Price Ranges */}
        {(item.priceRange || item.statTrakPriceRange) && (
          <div className="space-y-1 mb-2">
            {/* Normal Price Range */}
            {item.priceRange && (
              <div className="text-xs">
                <span className="text-green-500 font-semibold">
                  ${item.priceRange.min.toFixed(2)} - ${item.priceRange.max.toFixed(2)}
                </span>
              </div>
            )}
            {/* StatTrak Price Range */}
            {item.statTrakPriceRange && (
              <div className="text-xs">
                <span className="text-orange-400 font-semibold">
                  ${item.statTrakPriceRange.min.toFixed(2)} - ${item.statTrakPriceRange.max.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Drop Probability (for cases) */}
        {item.dropProbability !== undefined && (
          <div className="text-xs text-gray-400">
            Drop Rate: <span className="text-orange-500 font-semibold">{item.dropProbability.toFixed(4)}%</span>
          </div>
        )}

        {/* Variant Count / View Details */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-cs2-blue/10">
          <span className="text-xs text-gray-400">
            {item.variantCount} variant{item.variantCount !== 1 ? 's' : ''}
          </span>
          <span className="text-xs text-cs2-blue">
            View Details →
          </span>
        </div>
      </div>
    </Link>
  )
}
