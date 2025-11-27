"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InventoryItemCard } from "@/components/inventory-item-card"
import { Download, Search, RefreshCw, AlertCircle, ExternalLink, Loader2 } from "lucide-react"
import type { InventoryItem, InventoryStats } from "@/lib/types"
import { startInventoryImport, retryInventoryImport } from "@/actions/inventory"

type ImportState = "idle" | "importing" | "imported" | "error-private" | "error-unknown" | "loading"

const ITEMS_PER_PAGE = 20

// Map API item to UI format
function mapItemToUI(item: any): InventoryItem {
  // Image priority:
  // 1. Item relation image_url (from database Item table)
  // 2. InventoryItem icon_url (Steam CDN path from sync)
  // 3. Placeholder
  let imageUrl = '/placeholder-skin.png'
  if (item.item?.image_url) {
    imageUrl = item.item.image_url
  } else if (item.icon_url) {
    imageUrl = `https://community.akamai.steamstatic.com/economy/image/${item.icon_url}`
  }

  const rarity = item.item?.rarity || 'milspec'

  return {
    assetId: item.steam_asset_id,
    item: {
      id: item.item_id || item.steam_asset_id,
      name: item.market_hash_name,
      image: imageUrl,
      rarity: rarity,
    },
    marketValue: parseFloat(item.current_value) || 0,
    valueChange: { amount: 0, percent: 0 },
    tradable: item.can_trade ?? true,
    marketable: true,
  }
}

export default function InventoryPage() {
  const [importState, setImportState] = useState<ImportState>("loading")
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalValue, setTotalValue] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("value-high")
  const [filterTradable, setFilterTradable] = useState(false)
  const [filterMarketable, setFilterMarketable] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [cooldownMinutes, setCooldownMinutes] = useState(0)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [pricesLoading, setPricesLoading] = useState(false)
  const [pricesUpdated, setPricesUpdated] = useState(0)

  // Pagination state
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)

  // Ref for intersection observer
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Load more items function
  const loadMoreItems = useCallback(async () => {
    if (loadingMore || !hasMore) return

    setLoadingMore(true)
    try {
      const response = await fetch(`/api/inventory?limit=${ITEMS_PER_PAGE}&offset=${offset}`)
      if (response.ok) {
        const data = await response.json()
        const newItems = (data.items || []).map(mapItemToUI)

        if (offset === 0) {
          // First load - replace items
          setInventory(newItems)
          setTotalItems(data.pagination?.total || data.total_items || newItems.length)
          setTotalValue(parseFloat(data.total_value) || 0)
          setLastSync(data.last_synced ? new Date(data.last_synced).toLocaleString() : null)
        } else {
          // Subsequent loads - append items
          setInventory(prev => [...prev, ...newItems])
        }

        setHasMore(data.pagination?.hasMore ?? false)
        setOffset(prev => prev + newItems.length)
        setImportState("imported")
      } else if (response.status === 404) {
        setImportState("idle")
        setHasMore(false)
      } else if (response.status === 401) {
        setImportState("idle")
        setHasMore(false)
      }
    } catch (error) {
      console.error('Failed to load inventory:', error)
      if (offset === 0) {
        setImportState("idle")
      }
    } finally {
      setLoadingMore(false)
    }
  }, [offset, loadingMore, hasMore])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (importState !== "imported") return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreItems()
        }
      },
      { threshold: 0.1 }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [importState, hasMore, loadingMore, loadMoreItems])

  // Initial fetch
  useEffect(() => {
    loadMoreItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  // Fetch prices for inventory items
  async function fetchPrices() {
    setPricesLoading(true)
    try {
      const response = await fetch('/api/inventory/prices', { method: 'POST' })
      if (response.ok) {
        const result = await response.json()
        setPricesUpdated(result.updated)
        // Reset and reload inventory with updated prices
        setOffset(0)
        setHasMore(true)
        setInventory([])

        // Fetch first page with updated prices
        const inventoryResponse = await fetch(`/api/inventory?limit=${ITEMS_PER_PAGE}&offset=0`)
        if (inventoryResponse.ok) {
          const data = await inventoryResponse.json()
          const items = (data.items || []).map(mapItemToUI)
          setInventory(items)
          setTotalValue(parseFloat(data.total_value) || 0)
          setHasMore(data.pagination?.hasMore ?? false)
          setOffset(items.length)
        }
      }
    } catch (error) {
      console.error('Failed to fetch prices:', error)
    } finally {
      setPricesLoading(false)
    }
  }

  const stats: InventoryStats = {
    totalValue: totalValue !== null ? totalValue : inventory.reduce((sum, item) => sum + item.marketValue, 0),
    itemCount: totalItems || inventory.length,
    mostValuable:
      inventory.length > 0 ? inventory.reduce((max, item) => (item.marketValue > max.marketValue ? item : max)) : null,
  }

  // Loading state
  if (importState === "loading") {
    return (
      <div className="min-h-screen bg-cs2-darker text-cs2-light p-4 md:p-8">
        <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-cs2-orange" />
            <p className="text-lg">Loading inventory...</p>
          </div>
        </div>
      </div>
    )
  }

  const handleImport = async () => {
    setImportState("importing")
    setImportProgress(0)

    const interval = setInterval(() => {
      setImportProgress((prev) => {
        if (prev >= 90) return 90
        return prev + 10
      })
    }, 500)

    try {
      const result = await startInventoryImport()
      clearInterval(interval)

      if (result.success) {
        setImportProgress(100)
        setImportState("imported")
        setLastSync("Just now")
        setCooldownMinutes(0)
        window.location.reload()
      } else if (result.message?.toLowerCase().includes('private')) {
        setImportState("error-private")
      } else {
        setImportState("error-unknown")
      }
    } catch (error) {
      clearInterval(interval)
      console.error('Import error:', error)
      setImportState("error-unknown")
    }
    setImportProgress(0)
  }

  const handleRefresh = () => {
    if (cooldownMinutes === 0) {
      handleImport()
      setCooldownMinutes(45)
    }
  }

  const handleRetry = async () => {
    setImportState("importing")
    try {
      const result = await retryInventoryImport()
      if (result.success) {
        setImportState("imported")
        window.location.reload()
      } else if (result.syncStatus === 'private') {
        setImportState("error-private")
      } else {
        setImportState("error-unknown")
      }
    } catch (error) {
      console.error('Retry error:', error)
      setImportState("error-unknown")
    }
  }

  // Filter and sort inventory (client-side for now)
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
            <div className="flex gap-2">
              <Button
                onClick={fetchPrices}
                disabled={pricesLoading}
                className="bg-cs2-orange hover:bg-cs2-orange/80 text-white"
              >
                {pricesLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Fetching Prices...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Fetch Prices
                  </>
                )}
              </Button>
              <Button
                onClick={handleRefresh}
                disabled={cooldownMinutes > 0}
                className="bg-cs2-blue hover:bg-cs2-blue/80 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {cooldownMinutes > 0 ? `Refresh (${cooldownMinutes}m)` : "Refresh Inventory"}
              </Button>
            </div>
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
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredInventory.map((item) => (
                    <InventoryItemCard key={item.assetId} item={item} />
                  ))}
                </div>

                {/* Load more trigger / Loading indicator */}
                <div ref={loadMoreRef} className="py-8 flex justify-center">
                  {loadingMore && (
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-cs2-orange" />
                      <span className="text-gray-400">Loading more items...</span>
                    </div>
                  )}
                  {!hasMore && inventory.length > 0 && (
                    <p className="text-gray-500 text-sm">
                      Showing all {inventory.length} items
                    </p>
                  )}
                </div>
              </>
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
