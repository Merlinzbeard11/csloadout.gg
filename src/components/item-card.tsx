"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"

interface ItemCardProps {
  item: {
    id: string
    name: string
    display_name: string
    rarity: string | null
    type: string
    image_url: string
    image_url_fallback?: string | null
  }
}

const rarityColors: Record<string, string> = {
  consumer: "text-gray-400",
  industrial: "text-blue-400",
  milspec: "text-blue-500",
  restricted: "text-purple-500",
  classified: "text-pink-500",
  covert: "text-red-500",
  contraband: "text-yellow-500",
}

export function ItemCard({ item }: ItemCardProps) {
  const [imgSrc, setImgSrc] = useState(item.image_url)
  const [imgError, setImgError] = useState(false)

  const handleImageError = () => {
    if (!imgError && item.image_url_fallback) {
      // Try fallback URL first
      setImgSrc(item.image_url_fallback)
      setImgError(true)
    } else {
      // Use placeholder as final fallback
      setImgSrc("/placeholder-item.png")
    }
  }

  const rarityColor = item.rarity ? rarityColors[item.rarity.toLowerCase()] || "text-gray-400" : "text-gray-400"

  return (
    <Link
      href={`/items/${item.id}`}
      className="group block bg-cs2-dark border border-cs2-blue/20 rounded-lg overflow-hidden transition-colors hover:border-cs2-blue/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cs2-blue focus-visible:ring-offset-2 focus-visible:ring-offset-cs2-darker"
    >
      {/* Image Section */}
      <div className="relative aspect-square bg-cs2-darker/50">
        <Image
          src={imgSrc || "/placeholder.svg"}
          alt={item.display_name || item.name}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 20vw"
          loading="lazy"
          className="object-contain p-4"
          onError={handleImageError}
        />
      </div>

      {/* Content Section */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-cs2-light truncate mb-1 group-hover:text-white transition-colors">
          {item.display_name || item.name}
        </h3>
        {item.rarity && <span className={`text-xs font-medium uppercase ${rarityColor}`}>{item.rarity}</span>}
      </div>
    </Link>
  )
}
