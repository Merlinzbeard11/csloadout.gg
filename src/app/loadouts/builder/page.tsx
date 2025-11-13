"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { File as Rifle, Crosshair, Wrench, Hand, Search, Trash2, Plus, Check } from "lucide-react"
import { cn } from "@/lib/utils"

// Mock data for items
const MOCK_ITEMS = {
  primary: [
    {
      id: "ak47-redline",
      name: "AK-47 | Redline",
      price: 42.5,
      rarity: "classified",
      marketplace: "Steam",
      image: "/ak-47-redline-cs2-weapon-skin.jpg",
    },
    {
      id: "m4a4-howl",
      name: "M4A4 | Howl",
      price: 2500.0,
      rarity: "contraband",
      marketplace: "Steam",
      image: "/m4a4-howl-cs2-weapon-skin.jpg",
    },
    {
      id: "awp-asiimov",
      name: "AWP | Asiimov",
      price: 89.0,
      rarity: "covert",
      marketplace: "Buff",
      image: "/awp-asiimov-cs2-sniper-skin.jpg",
    },
    {
      id: "ak47-case",
      name: "AK-47 | Case Hardened",
      price: 150.0,
      rarity: "classified",
      marketplace: "Steam",
      image: "/ak-47-case-hardened-cs2.jpg",
    },
  ],
  secondary: [
    {
      id: "deagle-blaze",
      name: "Desert Eagle | Blaze",
      price: 425.0,
      rarity: "restricted",
      marketplace: "Steam",
      image: "/desert-eagle-blaze-cs2.jpg",
    },
    {
      id: "usp-orion",
      name: "USP-S | Orion",
      price: 8.5,
      rarity: "classified",
      marketplace: "Buff",
      image: "/usp-s-orion-cs2-pistol.jpg",
    },
    {
      id: "glock-fade",
      name: "Glock-18 | Fade",
      price: 320.0,
      rarity: "restricted",
      marketplace: "Steam",
      image: "/glock-18-fade-cs2.jpg",
    },
  ],
  knife: [
    {
      id: "karambit-fade",
      name: "Karambit | Fade",
      price: 1200.0,
      rarity: "covert",
      marketplace: "Steam",
      image: "/karambit-fade-cs2-knife.jpg",
    },
    {
      id: "butterfly-tiger",
      name: "Butterfly | Tiger Tooth",
      price: 850.0,
      rarity: "covert",
      marketplace: "Buff",
      image: "/butterfly-tiger-tooth-cs2.jpg",
    },
    {
      id: "bayonet-doppler",
      name: "Bayonet | Doppler",
      price: 350.0,
      rarity: "covert",
      marketplace: "Steam",
      image: "/bayonet-doppler-cs2.jpg",
    },
  ],
  gloves: [
    {
      id: "gloves-crimson",
      name: "Specialist Gloves | Crimson",
      price: 450.0,
      rarity: "covert",
      marketplace: "Steam",
      image: "/specialist-gloves-crimson-cs2.jpg",
    },
    {
      id: "gloves-fade",
      name: "Sport Gloves | Superconductor",
      price: 180.0,
      rarity: "covert",
      marketplace: "Buff",
      image: "/sport-gloves-superconductor-cs2.jpg",
    },
  ],
}

type SlotType = "primary" | "secondary" | "knife" | "gloves"

interface Item {
  id: string
  name: string
  price: number
  rarity: string
  marketplace: string
  image: string
}

interface LoadoutItem {
  slot: SlotType
  item: Item
  marketplace: string
  price: number
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

const slotIcons = {
  primary: Rifle,
  secondary: Crosshair,
  knife: Wrench,
  gloves: Hand,
}

const slotLabels = {
  primary: "Primary Weapon",
  secondary: "Secondary Weapon",
  knife: "Knife",
  gloves: "Gloves",
}

export default function LoadoutBuilder() {
  const [budget, setBudget] = useState(100.0)
  const [loadoutItems, setLoadoutItems] = useState<LoadoutItem[]>([])
  const [selectedSlot, setSelectedSlot] = useState<SlotType | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [loadoutName, setLoadoutName] = useState("")

  const totalCost = loadoutItems.reduce((sum, item) => sum + item.price, 0)
  const remaining = budget - totalCost
  const percentSpent = (totalCost / budget) * 100

  const addItem = (slot: SlotType, item: Item) => {
    setLoadoutItems((prev) => {
      const filtered = prev.filter((li) => li.slot !== slot)
      return [...filtered, { slot, item, marketplace: item.marketplace, price: item.price }]
    })
    setSelectedSlot(null)
    setSearchQuery("")
  }

  const removeItem = (slot: SlotType) => {
    setLoadoutItems((prev) => prev.filter((li) => li.slot !== slot))
  }

  const getSlotItem = (slot: SlotType) => {
    return loadoutItems.find((li) => li.slot === slot)
  }

  const filteredItems = selectedSlot
    ? MOCK_ITEMS[selectedSlot].filter(
        (item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()) && item.price <= remaining,
      )
    : []

  const presets = [
    { name: "Budget Starter", amount: 50 },
    { name: "Competitive Pro", amount: 500 },
    { name: "Collector's Dream", amount: 5000 },
  ]

  return (
    <div className="min-h-screen bg-cs2-darker text-cs2-light">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-cs2-dark border-b border-cs2-blue/20 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-6 flex-1">
              <div>
                <label className="text-sm text-cs2-light/60 mb-1 block">Total Budget</label>
                <div className="flex items-center gap-2">
                  <span className="text-cs2-light/80">$</span>
                  <Input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-32 bg-cs2-darker border-cs2-blue/30 text-cs2-light"
                    min="0"
                    step="10"
                  />
                </div>
              </div>

              <div className="flex-1 max-w-md">
                <div className="flex items-end justify-between mb-2 text-sm">
                  <div>
                    <span className="text-cs2-light/60">Spent: </span>
                    <span className="text-cs2-orange font-semibold">${totalCost.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-cs2-light/60">Remaining: </span>
                    <span className={cn("font-semibold", remaining >= 0 ? "text-green-400" : "text-red-400")}>
                      ${Math.abs(remaining).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="h-3 bg-cs2-darker rounded-full overflow-hidden border border-cs2-blue/20">
                  <div
                    className={cn("h-full transition-all duration-300", remaining >= 0 ? "bg-cs2-blue" : "bg-red-500")}
                    style={{ width: `${Math.min(percentSpent, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={() => setSaveDialogOpen(true)}
              className="bg-cs2-orange hover:bg-cs2-orange/80 text-white font-semibold"
            >
              Save Loadout
            </Button>
          </div>

          {/* Budget Presets */}
          <div className="flex gap-2 mt-4">
            {presets.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                onClick={() => setBudget(preset.amount)}
                className="border-cs2-blue/30 hover:border-cs2-blue/50 hover:bg-cs2-blue/10 text-cs2-light/80 text-xs"
              >
                {preset.name} (${preset.amount})
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-cs2-light mb-2">Budget Loadout Builder</h1>
          <p className="text-cs2-light/60">Create your perfect CS2 loadout within your budget</p>
        </div>

        {/* Weapon Slots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {(Object.keys(slotLabels) as SlotType[]).map((slot) => {
            const slotItem = getSlotItem(slot)
            const Icon = slotIcons[slot]

            return (
              <div key={slot}>
                {slotItem ? (
                  // Filled State
                  <div className="bg-cs2-dark border border-cs2-blue/20 rounded-lg p-4 hover:border-cs2-blue/50 transition-colors group">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-cs2-light/60">{slotLabels[slot]}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(slot)}
                        className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="aspect-square bg-cs2-darker rounded-lg mb-3 overflow-hidden flex items-center justify-center">
                      <img
                        src={slotItem.item.image || "/placeholder.svg"}
                        alt={slotItem.item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="space-y-2">
                      <h3 className={cn("font-semibold text-sm", rarityColors[slotItem.item.rarity])}>
                        {slotItem.item.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-cs2-light/50">{slotItem.marketplace}</span>
                        <span className="text-cs2-orange font-bold">${slotItem.price.toFixed(2)}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSlot(slot)}
                        className="w-full border-cs2-blue/30 hover:border-cs2-blue hover:bg-cs2-blue/10"
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Empty State
                  <button
                    onClick={() => setSelectedSlot(slot)}
                    className="bg-cs2-dark border-2 border-dashed border-cs2-blue/40 rounded-lg p-8 hover:border-cs2-blue/70 hover:bg-cs2-dark/80 transition-all group h-full min-h-[320px] flex flex-col items-center justify-center"
                  >
                    <Icon className="h-12 w-12 text-cs2-blue/40 mb-4 group-hover:text-cs2-blue/70 transition-colors" />
                    <span className="text-cs2-light/60 group-hover:text-cs2-light transition-colors">
                      + Add {slotLabels[slot]}
                    </span>
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <div className="bg-cs2-dark border border-cs2-blue/20 rounded-lg p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-2xl font-bold text-cs2-light mb-1">
                Total Cost: <span className="text-cs2-orange">${totalCost.toFixed(2)}</span>
              </h3>
              <p className="text-cs2-light/60">Slots Filled: {loadoutItems.length} of 4</p>
            </div>
            {remaining < 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
                <span className="text-red-400 font-semibold">Over Budget: ${Math.abs(remaining).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Item Picker Modal */}
      <Dialog open={selectedSlot !== null} onOpenChange={() => setSelectedSlot(null)}>
        <DialogContent className="bg-cs2-dark border-cs2-blue/30 text-cs2-light max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl">Select {selectedSlot && slotLabels[selectedSlot]}</DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cs2-light/40" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-cs2-darker border-cs2-blue/30 text-cs2-light"
            />
          </div>

          {/* Items Grid */}
          <div className="overflow-y-auto flex-1 -mx-6 px-6">
            {remaining < 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                <p className="text-red-400 text-sm">You're over budget. Remove some items to add more.</p>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const canAfford = item.price <= remaining
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "bg-cs2-darker border border-cs2-blue/20 rounded-lg p-3 transition-all",
                      canAfford ? "hover:border-cs2-blue/50" : "opacity-40",
                    )}
                  >
                    <div className="aspect-square bg-cs2-dark rounded-lg mb-2 overflow-hidden flex items-center justify-center">
                      <img
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <h4 className={cn("text-sm font-semibold mb-1 truncate", rarityColors[item.rarity])}>
                      {item.name}
                    </h4>

                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-cs2-light/50">{item.marketplace}</span>
                      <span className="text-cs2-orange font-bold text-sm">${item.price.toFixed(2)}</span>
                    </div>

                    <Button
                      onClick={() => addItem(selectedSlot!, item)}
                      disabled={!canAfford}
                      className="w-full bg-cs2-blue hover:bg-cs2-blue/80 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Loadout Modal */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="bg-cs2-dark border-cs2-blue/30 text-cs2-light">
          <DialogHeader>
            <DialogTitle className="text-2xl">Save Loadout</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-cs2-light/80 mb-2 block">Loadout Name</label>
              <Input
                placeholder="My Awesome Loadout"
                value={loadoutName}
                onChange={(e) => setLoadoutName(e.target.value)}
                className="bg-cs2-darker border-cs2-blue/30 text-cs2-light"
              />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="public" className="rounded" />
              <label htmlFor="public" className="text-sm text-cs2-light/80">
                Make public (share in gallery)
              </label>
            </div>

            <div className="bg-cs2-darker border border-cs2-blue/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-cs2-light/60">Total Cost</span>
                <span className="text-cs2-orange font-bold">${totalCost.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-cs2-light/60">Items</span>
                <span className="text-cs2-light">{loadoutItems.length} selected</span>
              </div>
            </div>

            <Button
              className="w-full bg-cs2-orange hover:bg-cs2-orange/80 text-white font-semibold"
              onClick={() => {
                // Save logic would go here
                setSaveDialogOpen(false)
                setLoadoutName("")
              }}
            >
              <Check className="h-4 w-4 mr-2" />
              Save Loadout
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
