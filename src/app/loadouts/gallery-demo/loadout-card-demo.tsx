"use client"

import type React from "react"

import type { PublicLoadout } from "@/lib/types"
import { Heart, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface LoadoutCardProps {
  loadout: PublicLoadout
  onUpvote: (id: string) => void
}

export function LoadoutCard({ loadout, onUpvote }: LoadoutCardProps) {
  const handleUpvote = (e: React.MouseEvent) => {
    e.preventDefault()
    onUpvote(loadout.id)
  }

  return (
    <Link href={`/loadouts/${loadout.slug}`}>
      <div className="bg-cs2-dark border border-cs2-blue/20 rounded-lg p-4 hover:border-cs2-blue/50 transition-colors group">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-bold text-cs2-light group-hover:text-white transition-colors">
              {loadout.name}
            </h3>
            <span className="text-cs2-orange font-semibold">${loadout.budget}</span>
          </div>
          <p className="text-sm text-cs2-light/60">by {loadout.author.username}</p>
        </div>

        {/* Preview Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {loadout.items.slice(0, 4).map((item, index) => (
            <div key={index} className="aspect-video bg-cs2-darker rounded border border-cs2-blue/10 overflow-hidden">
              <img
                src={item.item.imageUrl || "/placeholder.svg"}
                alt={item.item.name}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          {Array.from({ length: Math.max(0, 4 - loadout.items.length) }).map((_, index) => (
            <div
              key={`empty-${index}`}
              className="aspect-video bg-cs2-darker rounded border border-cs2-blue/10 flex items-center justify-center"
            >
              <span className="text-cs2-light/30 text-xs">Empty Slot</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleUpvote}
              className={cn(
                "flex items-center gap-1.5 text-sm transition-colors",
                loadout.isUpvotedByUser ? "text-cs2-orange" : "text-cs2-light/60 hover:text-cs2-orange",
              )}
            >
              <Heart className={cn("w-4 h-4", loadout.isUpvotedByUser && "fill-current")} />
              <span>{loadout.upvotes}</span>
            </button>
            <div className="flex items-center gap-1.5 text-sm text-cs2-light/60">
              <Eye className="w-4 h-4" />
              <span>{loadout.views}</span>
            </div>
          </div>
          <div className="text-sm">
            <span className="text-cs2-light/60">Total: </span>
            <span className="text-cs2-light font-semibold">${loadout.totalCost.toFixed(2)}</span>
          </div>
        </div>

        {/* View Details Button */}
        <Button
          className="w-full mt-4 bg-cs2-blue hover:bg-cs2-blue/80 text-white"
          onClick={(e) => e.preventDefault()}
        >
          View Details
        </Button>
      </div>
    </Link>
  )
}
