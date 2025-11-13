"use client"

import { useState, useMemo } from "react"
import { mockLoadouts } from "@/lib/gallery-mock-data"
import type { PublicLoadout, BudgetRange, SortOption } from "@/lib/types"
import { LoadoutCard } from "./loadout-card-demo"
import { LoadoutSkeleton } from "./loadout-skeleton-demo"
import { Filters } from "./filters-demo"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function LoadoutsPage() {
  const [loadouts, setLoadouts] = useState<PublicLoadout[]>(mockLoadouts)
  const [isLoading, setIsLoading] = useState(false)
  const [budgetFilter, setBudgetFilter] = useState<BudgetRange>("all")
  const [sortBy, setSortBy] = useState<SortOption>("newest")

  // Filter and sort loadouts
  const filteredLoadouts = useMemo(() => {
    let filtered = [...loadouts]

    // Apply budget filter
    if (budgetFilter !== "all") {
      filtered = filtered.filter((loadout) => {
        switch (budgetFilter) {
          case "under-50":
            return loadout.budget < 50
          case "50-200":
            return loadout.budget >= 50 && loadout.budget <= 200
          case "200-500":
            return loadout.budget > 200 && loadout.budget <= 500
          case "500-plus":
            return loadout.budget > 500
          default:
            return true
        }
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "popular":
          return b.views - a.views
        case "upvotes":
          return b.upvotes - a.upvotes
        default:
          return 0
      }
    })

    return filtered
  }, [loadouts, budgetFilter, sortBy])

  const handleUpvote = (id: string) => {
    setLoadouts((prev) =>
      prev.map((loadout) =>
        loadout.id === id
          ? {
              ...loadout,
              upvotes: loadout.isUpvotedByUser ? loadout.upvotes - 1 : loadout.upvotes + 1,
              isUpvotedByUser: !loadout.isUpvotedByUser,
            }
          : loadout,
      ),
    )
  }

  return (
    <div className="min-h-screen bg-cs2-darker">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-cs2-light mb-2">Community Loadouts</h1>
              <p className="text-cs2-light/60">Discover budget-optimized weapon loadouts</p>
            </div>
            <Button className="bg-cs2-orange hover:bg-cs2-orange/80 text-white gap-2">
              <Plus className="w-4 h-4" />
              Create Loadout
            </Button>
          </div>

          {/* Filters */}
          <Filters
            budgetFilter={budgetFilter}
            sortBy={sortBy}
            onBudgetChange={setBudgetFilter}
            onSortChange={setSortBy}
          />
        </div>

        {/* View count */}
        <div className="mb-6">
          <p className="text-sm text-cs2-light/60">
            Showing {filteredLoadouts.length} loadout{filteredLoadouts.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <LoadoutSkeleton key={index} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredLoadouts.length === 0 && (
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-cs2-light mb-2">No loadouts found</h2>
            <p className="text-cs2-light/60 mb-6">Be the first to create one!</p>
            <Button className="bg-cs2-orange hover:bg-cs2-orange/80 text-white gap-2">
              <Plus className="w-4 h-4" />
              Create Loadout
            </Button>
          </div>
        )}

        {/* Loadouts Grid */}
        {!isLoading && filteredLoadouts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLoadouts.map((loadout) => (
              <LoadoutCard key={loadout.id} loadout={loadout} onUpvote={handleUpvote} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
