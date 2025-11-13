"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InventoryItemCard } from "@/components/inventory-item-card"
import { Download, Search, RefreshCw, AlertCircle, ExternalLink, Loader2 } from "lucide-react"
import type { InventoryItem, InventoryStats } from "@/lib/types"

// Mock data for demonstration
const mockInventory: InventoryItem[] = [
  {
    assetId: "1",
    item: {
      id: "ak47-redline",
      name: "AK-47 | Redline (Field-Tested)",
      image: "/ak47-redline-cs2-skin.jpg",
      rarity: "classified",
    },
    marketValue: 850.0,
    valueChange: { amount: 25.5, percent: 3.1 },
    tradable: true,
    marketable: true,
  },
  {
    assetId: "2",
    item: {
      id: "awp-asiimov",
      name: "AWP | Asiimov (Field-Tested)",
      image: "/awp-asiimov-cs2-skin.jpg",
      rarity: "covert",
    },
    marketValue: 145.75,
    valueChange: { amount: -5.25, percent: -3.5 },
    tradable: true,
    marketable: true,
  },
  {
    assetId: "3",
    item: {
      id: "m4a4-howl",
      name: "M4A4 | Howl (Factory New)",
      image: "/m4a4-howl-cs2.png",
      rarity: "contraband",
    },
    marketValue: 95.5,
    valueChange: { amount: 2.0, percent: 2.1 },
    tradable: false,
    marketable: false,
  },
  {
    assetId: "4",
    item: {
      id: "glock-fade",
      name: "Glock-18 | Fade (Factory New)",
      image: "/glock-fade-cs2-skin.jpg",
      rarity: "restricted",
    },
    marketValue: 67.25,
    valueChange: { amount: 1.5, percent: 2.3 },
    tradable: true,
    marketable: true,
  },
  {
    assetId: "5",
    item: {
      id: "usp-orion",
      name: "USP-S | Orion (Minimal Wear)",
      image: "/usp-orion-cs2-skin.jpg",
      rarity: "milspec",
    },
    marketValue: 34.9,
    valueChange: { amount: -1.1, percent: -3.1 },
    tradable: true,
    marketable: true,
  },
  {
    assetId: "6",
    item: {
      id: "p250-mehndi",
      name: "P250 | Mehndi (Field-Tested)",
      image: "/p250-mehndi-cs2-skin.jpg",
      rarity: "industrial",
    },
    marketValue: 18.4,
    valueChange: { amount: 0.4, percent: 2.2 },
    tradable: true,
    marketable: true,
  },
]

type ImportState = "idle" | "importing" | "imported" | "error-private" | "error-unknown"

export default function InventoryPage() {
  const [importState, setImportState] = useState<ImportState>("idle")
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("value-high")
  const [filterTradable, setFilterTradable] = useState(false)
  const [filterMarketable, setFilterMarketable] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [cooldownMinutes, setCooldownMinutes] = useState(0)
  const [lastSync, setLastSync] = useState<string | null>(null)

  const stats: InventoryStats = {
    totalValue: inventory.reduce((sum, item) => sum + item.marketValue, 0),
    itemCount: inventory.length,
    mostValuable:
      inventory.length > 0 ? inventory.reduce((max, item) => (item.marketValue > max.marketValue ? item : max)) : null,
  }

  const handleImport = async () => {
    setImportState("importing")
    setImportProgress(0)

    // Simulate import progress
    const interval = setInterval(() => {
      setImportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 10
      })
    }, 300)

    // Simulate API call
    setTimeout(() => {
      clearInterval(interval)
      // Randomly decide outcome for demo
      const random = Math.random()
      if (random < 0.7) {
        setInventory(mockInventory)
        setImportState("imported")
        setLastSync("2 minutes ago")
        setCooldownMinutes(0)
      } else if (random < 0.85) {
        setImportState("error-private")
      } else {
        setImportState("error-unknown")
      }
      setImportProgress(0)
    }, 3000)
  }

  const handleRefresh = () => {
    if (cooldownMinutes === 0) {
      handleImport()
      setCooldownMinutes(45)
    }
  }

  const handleRetry = () => {
    setImportState("idle")
  }

  // Filter and sort inventory
  let filteredInventory = inventory.filter((item) => {
    const matchesSearch = item.item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTradable = !filterTradable || item.tradable
    const matchesMarketable = !filterMarketable || item.marketable
    return matchesSearch && matchesTradable && matchesMarketable
  })

  filteredInventory = filteredInventory.sort((a, b) => {
    if (sortBy === "value-high") return b.marketValue - a.marketValue
    if (sortBy === "value-low") return a.marketValue - b.marketValue
    if (sortBy === "name") return a.item.name.localeCompare(b.item.name)
    return 0
  })

  return (
    <div className="min-h-screen bg-cs2-darker text-cs2-light p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-cs2-light">My CS2 Inventory</h1>
            {lastSync && <p className="text-sm text-gray-400 mt-1">Last synced {lastSync}</p>}
          </div>
          {importState === "imported" && (
            <Button
              onClick={handleRefresh}
              disabled={cooldownMinutes > 0}
              className="bg-cs2-blue hover:bg-cs2-blue/80 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {cooldownMinutes > 0 ? `Refresh (${cooldownMinutes}m)` : "Refresh Inventory"}
            </Button>
          )}
        </div>

        {/* Error States */}
        {importState === "error-private" && (
          <Alert className="bg-cs2-dark border-red-500/50 text-cs2-light">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="ml-2">
              <p className="font-semibold mb-2">Your inventory is private</p>
              <p className="text-sm text-gray-400 mb-3">
                Please set your Steam inventory to public in your privacy settings.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-cs2-blue/50 hover:bg-cs2-blue/10 bg-transparent"
                  asChild
                >
                  <a href="https://steamcommunity.com/my/edit/settings" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Steam Settings
                  </a>
                </Button>
                <Button size="sm" onClick={handleRetry} className="bg-cs2-orange hover:bg-cs2-orange/80">
                  Try Again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {importState === "error-unknown" && (
          <Alert className="bg-cs2-dark border-red-500/50 text-cs2-light">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="ml-2">
              <p className="font-semibold mb-2">Failed to import inventory</p>
              <p className="text-sm text-gray-400 mb-3">
                An error occurred while importing your inventory. Please try again.
              </p>
              <Button size="sm" onClick={handleRetry} className="bg-cs2-orange hover:bg-cs2-orange/80">
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        {importState === "imported" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-cs2-dark border-cs2-blue/20">
              <CardHeader className="pb-3">
                <CardDescription className="text-gray-400">Total Value</CardDescription>
                <CardTitle className="text-2xl md:text-3xl text-cs2-light">${stats.totalValue.toFixed(2)}</CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-cs2-dark border-cs2-blue/20">
              <CardHeader className="pb-3">
                <CardDescription className="text-gray-400">Item Count</CardDescription>
                <CardTitle className="text-2xl md:text-3xl text-cs2-light">{stats.itemCount}</CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-cs2-dark border-cs2-blue/20 col-span-2">
              <CardHeader className="pb-3">
                <CardDescription className="text-gray-400">Most Valuable</CardDescription>
                <CardTitle className="text-lg md:text-xl text-cs2-light line-clamp-1">
                  {stats.mostValuable?.item.name || "N/A"}
                </CardTitle>
                <p className="text-xl md:text-2xl font-bold text-cs2-orange">
                  ${stats.mostValuable?.marketValue.toFixed(2) || "0.00"}
                </p>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Import Loading State */}
        {importState === "importing" && (
          <Card className="bg-cs2-dark border-cs2-blue/20">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-cs2-orange" />
                <p className="text-lg font-medium">Importing your inventory...</p>
              </div>
              <div className="space-y-2">
                <div className="w-full bg-cs2-darker rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-cs2-orange h-full transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-400 text-center">
                  About {Math.ceil((100 - importProgress) / 33)} seconds remaining
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Button - Initial State */}
        {importState === "idle" && (
          <Card className="bg-cs2-dark border-cs2-blue/20">
            <CardContent className="pt-6 text-center space-y-4">
              <p className="text-gray-400">Import your Steam inventory to get started</p>
              <Button onClick={handleImport} className="bg-cs2-orange hover:bg-cs2-orange/80 text-white px-6" size="lg">
                <Download className="w-5 h-5 mr-2" />
                Import from Steam
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Filters and Search */}
        {importState === "imported" && inventory.length > 0 && (
          <Card className="bg-cs2-dark border-cs2-blue/20">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search your inventory..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-cs2-darker border-cs2-blue/20 text-cs2-light"
                  />
                </div>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full md:w-48 bg-cs2-darker border-cs2-blue/20 text-cs2-light">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="bg-cs2-dark border-cs2-blue/20">
                    <SelectItem value="value-high">Value: High → Low</SelectItem>
                    <SelectItem value="value-low">Value: Low → High</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Button
                    variant={filterTradable ? "default" : "outline"}
                    onClick={() => setFilterTradable(!filterTradable)}
                    className={
                      filterTradable ? "bg-cs2-blue hover:bg-cs2-blue/80" : "border-cs2-blue/20 hover:bg-cs2-blue/10"
                    }
                    size="sm"
                  >
                    Tradable
                  </Button>
                  <Button
                    variant={filterMarketable ? "default" : "outline"}
                    onClick={() => setFilterMarketable(!filterMarketable)}
                    className={
                      filterMarketable ? "bg-cs2-blue hover:bg-cs2-blue/80" : "border-cs2-blue/20 hover:bg-cs2-blue/10"
                    }
                    size="sm"
                  >
                    Marketable
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Grid */}
        {importState === "imported" && (
          <>
            {filteredInventory.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredInventory.map((item) => (
                  <InventoryItemCard key={item.assetId} item={item} />
                ))}
              </div>
            ) : (
              <Card className="bg-cs2-dark border-cs2-blue/20">
                <CardContent className="pt-6 text-center text-gray-400">
                  No items found matching your filters
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
