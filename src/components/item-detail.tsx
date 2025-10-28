"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bookmark, Bell, GitCompare, ExternalLink } from "lucide-react"
import type { Item } from "@/lib/types"
import { ItemViewer3D } from "./item-viewer-3d"
import { PriceHistoryChart } from "./price-history-chart"
import { MarketPriceTable } from "./market-price-table"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface ItemDetailProps {
  item: Item
}

export function ItemDetail({ item }: ItemDetailProps) {
  const { toast } = useToast()
  const [isInWatchlist, setIsInWatchlist] = useState(false)

  const handleAddToWatchlist = () => {
    setIsInWatchlist(!isInWatchlist)
    toast({
      title: isInWatchlist ? "Removed from Watchlist" : "Added to Watchlist",
      description: isInWatchlist
        ? `${item.name} has been removed from your watchlist.`
        : `${item.name} has been added to your watchlist.`,
    })
  }

  const handleCreateAlert = () => {
    toast({
      title: "Alert Created",
      description: `You'll be notified of price changes for ${item.name}.`,
    })
  }

  const bestPrice = item.markets.reduce((min, market) => (market.price < min.price ? market : min), item.markets[0])
  const priceChange7d = "+2.3%"

  return (
    <div className="container px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold">{item.name}</h1>
              <Badge variant="outline" className="text-base">
                {item.rarity}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {item.collection && (
                <Link
                  href={`/search?collection=${item.collection}`}
                  className="hover:text-foreground transition-colors"
                >
                  {item.collection}
                </Link>
              )}
              {item.case && (
                <>
                  <span>•</span>
                  <Link href={`/search?case=${item.case}`} className="hover:text-foreground transition-colors">
                    {item.case}
                  </Link>
                </>
              )}
              <span>•</span>
              <span>Released {item.release_year}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant={isInWatchlist ? "default" : "outline"} onClick={handleAddToWatchlist} className="gap-2">
              <Bookmark className={`h-4 w-4 ${isInWatchlist ? "fill-current" : ""}`} />
              {isInWatchlist ? "Watching" : "Watch"}
            </Button>
            <Button variant="outline" onClick={handleCreateAlert} className="gap-2 bg-transparent">
              <Bell className="h-4 w-4" />
              Alert
            </Button>
            <Button variant="outline" asChild className="gap-2 bg-transparent">
              <Link href={`/compare?items=${item.id}`}>
                <GitCompare className="h-4 w-4" />
                Compare
              </Link>
            </Button>
          </div>
        </div>

        {/* Price Summary */}
        <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Best Price</p>
                <p className="text-4xl font-bold font-mono">${bestPrice.price.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">on {bestPrice.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">7d Change</p>
                <p
                  className={`text-2xl font-bold ${priceChange7d.startsWith("+") ? "text-primary" : "text-destructive"}`}
                >
                  {priceChange7d}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* 3D Viewer */}
          <ItemViewer3D item={item} />

          {/* Price History */}
          <Card>
            <CardHeader>
              <CardTitle>Price History</CardTitle>
            </CardHeader>
            <CardContent>
              <PriceHistoryChart itemId={item.id} />
            </CardContent>
          </Card>

          {/* Market Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Cross-Market Prices</CardTitle>
            </CardHeader>
            <CardContent>
              <MarketPriceTable markets={item.markets} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Attributes */}
          <Card>
            <CardHeader>
              <CardTitle>Attributes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {item.weapon && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Weapon</span>
                  <span className="font-semibold">{item.weapon}</span>
                </div>
              )}
              {item.finish && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Finish</span>
                  <span className="font-semibold">{item.finish}</span>
                </div>
              )}
              {item.paint_index && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paint Index</span>
                  <span className="font-mono">{item.paint_index}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rarity</span>
                <Badge variant="outline">{item.rarity}</Badge>
              </div>
              {item.float_min !== undefined && item.float_max !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Float Range</span>
                  <span className="font-mono">
                    {item.float_min.toFixed(2)} - {item.float_max.toFixed(2)}
                  </span>
                </div>
              )}
              {item.color_hue && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Color Hue</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded-full border border-border"
                      style={{ backgroundColor: `hsl(${item.color_hue}, 70%, 50%)` }}
                    />
                    <span className="font-mono">{item.color_hue}°</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rare Patterns */}
          {item.known_rare_patterns && item.known_rare_patterns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Known Rare Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {item.known_rare_patterns.map((pattern) => (
                    <Badge key={pattern} variant="secondary" className="font-mono">
                      #{pattern}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  These pattern seeds are known for exceptional blue gem coverage or rare doppler phases.
                </p>
              </CardContent>
            </Card>
          )}

          {/* External Links */}
          <Card>
            <CardHeader>
              <CardTitle>External Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-between bg-transparent" asChild>
                <a href="#" target="_blank" rel="noopener noreferrer">
                  View on Steam Market
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-between bg-transparent" asChild>
                <a href="#" target="_blank" rel="noopener noreferrer">
                  CSFloat Database
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-between bg-transparent" asChild>
                <a href="#" target="_blank" rel="noopener noreferrer">
                  Pattern Database
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
