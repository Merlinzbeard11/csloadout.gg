"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, TrendingDown, Bookmark, Bell, GitCompare } from "lucide-react"
import Link from "next/link"
import type { SearchResult } from "@/lib/types"
import { SearchSkeleton } from "./search-skeleton"
import { useToast } from "@/hooks/use-toast"

interface SearchResultsProps {
  filters: any
}

export function SearchResults({ filters }: SearchResultsProps) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState("best_match")
  const [queryTime, setQueryTime] = useState(0)
  const { toast } = useToast()

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.query) params.append("q", filters.query)
      if (filters.type) params.append("type", filters.type)
      if (filters.rarity) params.append("rarity", filters.rarity)
      if (filters.weapon) params.append("weapon", filters.weapon)
      if (filters.weaponCategory) params.append("weapon_category", filters.weaponCategory)
      if (filters.containerType) params.append("container_type", filters.containerType)
      if (filters.minPrice) params.append("minPrice", filters.minPrice)
      if (filters.maxPrice) params.append("maxPrice", filters.maxPrice)

      const response = await fetch(`/api/items?${params.toString()}`)
      const data = await response.json()
      setResults(data.results)
      setQueryTime(data.query_time_ms)
      setLoading(false)
    }

    fetchResults()
  }, [filters])

  const handleAddToWatchlist = async (itemId: string, itemName: string) => {
    toast({
      title: "Added to Watchlist",
      description: `${itemName} has been added to your watchlist.`,
    })
  }

  const handleCreateAlert = async (itemId: string, itemName: string) => {
    toast({
      title: "Alert Created",
      description: `You'll be notified of price changes for ${itemName}.`,
    })
  }

  if (loading) {
    return <SearchSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Search Results</h1>
          <p className="text-muted-foreground">
            <span className="font-semibold">{results.length.toLocaleString()}</span> results •{" "}
            <span className="font-mono">{queryTime}ms</span>
          </p>
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="best_match">Best match</SelectItem>
            <SelectItem value="price_low">Lowest price</SelectItem>
            <SelectItem value="price_high">Highest price</SelectItem>
            <SelectItem value="rarest">Rarest</SelectItem>
            <SelectItem value="rising_7d">Rising 7d</SelectItem>
            <SelectItem value="rising_30d">Rising 30d</SelectItem>
            <SelectItem value="lowest_float">Lowest float</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Empty State */}
      {results.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-xl font-semibold mb-2">No results found</p>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Try adjusting your filters or search query. Remove rare pattern filters or widen your price range.
            </p>
            <Button variant="outline">Clear all filters</Button>
          </CardContent>
        </Card>
      )}

      {/* Results Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {results.map((item) => (
          <Card
            key={item.id}
            className="group hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10"
          >
            <CardHeader className="pb-4">
              <Link href={`/item/${item.id}`}>
                <div className="aspect-[2/1] rounded-md overflow-hidden bg-muted mb-4">
                  <img
                    src={item.images.thumb || "/placeholder.svg"}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              </Link>
              <div className="flex items-start justify-between gap-2">
                <Link href={`/item/${item.id}`}>
                  <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                    {item.name}
                  </CardTitle>
                </Link>
                <Badge variant="outline" className="shrink-0">
                  {item.rarity}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold font-mono">${item.best_price.price.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{item.best_price.market}</p>
                </div>
                <div className="text-right">
                  <div
                    className={`flex items-center gap-1 text-sm font-semibold ${item.delta_7d.startsWith("+") ? "text-primary" : "text-destructive"}`}
                  >
                    {item.delta_7d.startsWith("+") ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {item.delta_7d}
                  </div>
                  <p className="text-xs text-muted-foreground">7d change</p>
                </div>
              </div>

              {item.lowest_float && (
                <div className="pt-4 border-t border-border/40">
                  <p className="text-xs text-muted-foreground">
                    Lowest float: <span className="font-mono text-foreground">{item.lowest_float}</span>
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2 bg-transparent"
                  onClick={() => handleAddToWatchlist(item.id, item.name)}
                >
                  <Bookmark className="h-4 w-4" />
                  Watch
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2 bg-transparent"
                  onClick={() => handleCreateAlert(item.id, item.name)}
                >
                  <Bell className="h-4 w-4" />
                  Alert
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/compare?items=${item.id}`}>
                    <GitCompare className="h-4 w-4" />
                    <span className="sr-only">Compare</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
