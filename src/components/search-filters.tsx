"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Save, X } from "lucide-react"
import { useState } from "react"

interface SearchFiltersProps {
  filters: {
    query: string
    type: string
    rarity: string
    minPrice: string
    maxPrice: string
    minFloat: string
    maxFloat: string
    weapon: string
    weaponCategory: string
    containerType: string
    collection: string
  }
  onFiltersChange: (filters: any) => void
}

export function SearchFilters({ filters, onFiltersChange }: SearchFiltersProps) {
  const [wearRange, setWearRange] = useState([0, 100])
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(["Steam", "Buff", "DMarket"])

  const itemTypes = ["Weapon Skin", "Sticker", "Case", "Capsule", "Agent", "Patch", "Music Kit", "Graffiti", "Souvenir"]

  const rarities = [
    "Consumer",
    "Industrial",
    "Mil-Spec",
    "Restricted",
    "Classified",
    "Covert",
    "Extraordinary",
    "Contraband",
  ]

  const weapons = ["AK-47", "M4A4", "M4A1-S", "AWP", "Desert Eagle", "Glock-18", "USP-S", "Karambit", "Butterfly Knife"]

  const weaponCategories = ["Pistols", "SMGs", "Rifles", "Heavy", "Knives", "Gloves"]

  const containerTypes = ["Weapon Case", "Sticker Capsule"]

  const markets = ["Steam", "Buff", "DMarket", "Skinport", "CSFloat", "Bitskins", "Skinbid"]

  const handleClearFilters = () => {
    onFiltersChange({
      query: "",
      type: "",
      rarity: "",
      minPrice: "",
      maxPrice: "",
      minFloat: "",
      maxFloat: "",
      weapon: "",
      weaponCategory: "",
      containerType: "",
      collection: "",
    })
    setWearRange([0, 100])
    setSelectedMarkets(["Steam", "Buff", "DMarket"])
  }

  const activeFilterCount = Object.values(filters).filter((v) => v !== "").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Filters</h2>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              {activeFilterCount} active
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      <Button className="w-full gap-2 bg-transparent" variant="outline">
        <Save className="h-4 w-4" />
        Save Filter
      </Button>

      <Separator />

      {/* Item Type */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Item Type</Label>
        <Select value={filters.type} onValueChange={(value) => onFiltersChange({ ...filters, type: value })}>
          <SelectTrigger>
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_types">All types</SelectItem>
            {itemTypes.map((type) => (
              <SelectItem key={type} value={type.toLowerCase().replace(" ", "_")}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Weapon */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Weapon</Label>
        <Select value={filters.weapon} onValueChange={(value) => onFiltersChange({ ...filters, weapon: value })}>
          <SelectTrigger>
            <SelectValue placeholder="All weapons" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_weapons">All weapons</SelectItem>
            {weapons.map((weapon) => (
              <SelectItem key={weapon} value={weapon}>
                {weapon}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Weapon Category */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Weapon Category</Label>
        <Select
          value={filters.weaponCategory}
          onValueChange={(value) => onFiltersChange({ ...filters, weaponCategory: value === "all_categories" ? "" : value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_categories">All categories</SelectItem>
            {weaponCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Container Type - Only show when type is "case" */}
      {(filters.type === "case" || filters.type === "capsule") && (
        <div className="space-y-3">
          <Label className="text-base font-semibold">Container Type</Label>
          <Select
            value={filters.containerType}
            onValueChange={(value) => onFiltersChange({ ...filters, containerType: value === "all_containers" ? "" : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All containers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_containers">All containers</SelectItem>
              {containerTypes.map((containerType) => (
                <SelectItem key={containerType} value={containerType}>
                  {containerType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Rarity */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Rarity</Label>
        <div className="flex flex-wrap gap-2">
          {rarities.map((rarity) => (
            <Badge
              key={rarity}
              variant={filters.rarity === rarity ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => onFiltersChange({ ...filters, rarity: filters.rarity === rarity ? "" : rarity })}
            >
              {rarity}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* Price Range */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Price Range (USD)</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Min</Label>
            <Input
              type="number"
              placeholder="0"
              value={filters.minPrice}
              onChange={(e) => onFiltersChange({ ...filters, minPrice: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Max</Label>
            <Input
              type="number"
              placeholder="10000"
              value={filters.maxPrice}
              onChange={(e) => onFiltersChange({ ...filters, maxPrice: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Wear Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Wear</Label>
          <span className="text-sm text-muted-foreground font-mono">
            {(wearRange[0] / 100).toFixed(2)} - {(wearRange[1] / 100).toFixed(2)}
          </span>
        </div>
        <Slider value={wearRange} onValueChange={setWearRange} max={100} step={1} className="py-4" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Factory New</span>
          <span>Battle-Scarred</span>
        </div>
      </div>

      {/* Float Range */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Float Value</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Min</Label>
            <Input
              type="number"
              placeholder="0.00"
              step="0.01"
              value={filters.minFloat}
              onChange={(e) => onFiltersChange({ ...filters, minFloat: e.target.value })}
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Max</Label>
            <Input
              type="number"
              placeholder="1.00"
              step="0.01"
              value={filters.maxFloat}
              onChange={(e) => onFiltersChange({ ...filters, maxFloat: e.target.value })}
              className="mt-1 font-mono"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Marketplaces */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Marketplaces</Label>
        <div className="space-y-2">
          {markets.map((market) => (
            <div key={market} className="flex items-center space-x-2">
              <Checkbox
                id={market}
                checked={selectedMarkets.includes(market)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedMarkets([...selectedMarkets, market])
                  } else {
                    setSelectedMarkets(selectedMarkets.filter((m) => m !== market))
                  }
                }}
              />
              <label
                htmlFor={market}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {market}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
