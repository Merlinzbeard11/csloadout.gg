"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ShareModal } from "./share-modal"
import { LoadoutSlotCard } from "./loadout-slot-card"
import { Heart, Share2, Edit, Eye, ChevronRight } from "lucide-react"
import Link from "next/link"
import type { LoadoutDetail } from "@/lib/types"

// Mock data - replace with actual data fetching
const mockLoadout: LoadoutDetail = {
  id: "1",
  name: "Elite Pro Kit",
  slug: "elite-pro-kit",
  budget: 100,
  totalCost: 87.5,
  items: [
    {
      slot: "Primary Weapon",
      item: {
        id: "1",
        name: "AK-47 | Redline",
        image: "/ak47-redline-cs2.jpg",
        rarity: "classified",
      },
      marketplace: "Available on CSFloat",
      price: 42.5,
    },
    {
      slot: "Secondary Weapon",
      item: {
        id: "2",
        name: "Glock-18 | Water Elemental",
        image: "/glock-water-elemental-cs2.jpg",
        rarity: "restricted",
      },
      marketplace: "Available on CSFloat",
      price: 15.0,
    },
    {
      slot: "Knife",
      item: {
        id: "3",
        name: "Bayonet | Doppler",
        image: "/bayonet-doppler-cs2.jpg",
        rarity: "covert",
      },
      marketplace: "Available on CSFloat",
      price: 25.0,
    },
    {
      slot: "Gloves",
      item: {
        id: "4",
        name: "Sport Gloves | Vice",
        image: "/sport-gloves-vice-cs2.jpg",
        rarity: "contraband",
      },
      marketplace: "Available on CSFloat",
      price: 5.0,
    },
  ],
  isPublic: true,
  upvotes: 34,
  views: 1247,
  author: {
    id: "1",
    username: "ProGamer2024",
  },
  createdAt: "2 days ago",
}

export default function LoadoutDetailPage() {
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [upvoted, setUpvoted] = useState(false)
  const [upvoteCount, setUpvoteCount] = useState(mockLoadout.upvotes)

  const loadout = mockLoadout
  const remaining = loadout.budget - loadout.totalCost
  const isOverBudget = remaining < 0

  const handleUpvote = () => {
    if (upvoted) {
      setUpvoteCount(upvoteCount - 1)
    } else {
      setUpvoteCount(upvoteCount + 1)
    }
    setUpvoted(!upvoted)
  }

  return (
    <div className="min-h-screen bg-cs2-darker">
      {/* Breadcrumb */}
      <div className="border-b border-cs2-blue/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Link href="/" className="hover:text-cs2-light transition-colors">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/loadouts" className="hover:text-cs2-light transition-colors">
              Loadouts
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-cs2-light">{loadout.name}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-cs2-light mb-2">{loadout.name}</h1>
              {loadout.isPublic && <p className="text-gray-400">Created by {loadout.author.username}</p>}
              <div className="flex items-center gap-3 mt-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-cs2-orange text-white">
                  ${loadout.budget} Budget
                </span>
                <span className="text-2xl font-bold text-cs2-light">${loadout.totalCost.toFixed(2)}</span>
                <span className={`text-sm font-medium ${isOverBudget ? "text-red-500" : "text-green-500"}`}>
                  {isOverBudget ? "Over" : "Under"} Budget: ${Math.abs(remaining).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setShareModalOpen(true)}
                variant="outline"
                className="border-cs2-blue/20 hover:border-cs2-blue/50 bg-cs2-dark text-cs2-light"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button
                onClick={handleUpvote}
                variant="outline"
                className={`border-cs2-blue/20 hover:border-cs2-blue/50 bg-cs2-dark ${
                  upvoted ? "text-red-500" : "text-cs2-light"
                }`}
              >
                <Heart className={`h-4 w-4 mr-2 ${upvoted ? "fill-current" : ""}`} />
                {upvoteCount}
              </Button>
              <Button className="bg-cs2-blue hover:bg-cs2-blue/80">
                <Edit className="h-4 w-4 mr-2" />
                Edit Loadout
              </Button>
            </div>
          </div>

          {/* Stats */}
          {loadout.isPublic && (
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>{loadout.views.toLocaleString()} views</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                <span>{upvoteCount} upvotes</span>
              </div>
              <span>Created {loadout.createdAt}</span>
            </div>
          )}
        </div>

        {/* Slots Breakdown */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-cs2-light mb-6">Loadout Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {["Primary Weapon", "Secondary Weapon", "Knife", "Gloves"].map((slot) => {
              const item = loadout.items.find((i) => i.slot === slot)
              return <LoadoutSlotCard key={slot} slot={slot} item={item || null} />
            })}
          </div>
        </div>

        {/* Total Cost Summary */}
        <div className="bg-cs2-dark border border-cs2-blue/20 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-cs2-light mb-6">Cost Summary</h2>
          <div className="space-y-3">
            {loadout.items.map((item) => (
              <div
                key={item.item.id}
                className="flex justify-between items-center text-cs2-light border-b border-cs2-blue/10 pb-2"
              >
                <span>{item.item.name}</span>
                <span className="font-medium">${item.price.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center text-lg font-bold text-cs2-light pt-3 border-t-2 border-cs2-blue/20">
              <span>Total Cost</span>
              <span>${loadout.totalCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold text-cs2-light">
              <span>Budget</span>
              <span>${loadout.budget.toFixed(2)}</span>
            </div>
            <div
              className={`flex justify-between items-center text-lg font-bold ${
                isOverBudget ? "text-red-500" : "text-green-500"
              }`}
            >
              <span>Remaining</span>
              <span>
                {isOverBudget ? "-" : ""}${Math.abs(remaining).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal open={shareModalOpen} onOpenChange={setShareModalOpen} loadoutSlug={loadout.slug} />
    </div>
  )
}
