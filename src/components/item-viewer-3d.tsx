"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Eye, Microscope } from "lucide-react"
import type { Item } from "@/lib/types"

interface ItemViewer3DProps {
  item: Item
}

export function ItemViewer3D({ item }: ItemViewer3DProps) {
  const [viewMode, setViewMode] = useState<"inspect" | "analyze">("inspect")
  const [wearValue, setWearValue] = useState([item.float_min || 0])
  const [patternSeed, setPatternSeed] = useState("661")
  const [selectedSticker, setSelectedSticker] = useState<number | null>(null)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>3D Viewer</CardTitle>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "inspect" | "analyze")}>
            <TabsList>
              <TabsTrigger value="inspect" className="gap-2">
                <Eye className="h-4 w-4" />
                Inspect
              </TabsTrigger>
              <TabsTrigger value="analyze" className="gap-2">
                <Microscope className="h-4 w-4" />
                Analyze
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 3D Viewer Canvas */}
        <div className="aspect-video rounded-lg bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center relative overflow-hidden">
          <img src={item.images.hero || "/placeholder.svg"} alt={item.name} className="w-full h-full object-contain" />
          {viewMode === "analyze" && (
            <div className="absolute inset-0 bg-primary/5 pointer-events-none">
              <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 text-xs font-mono">
                <div>Wear: {wearValue[0].toFixed(4)}</div>
                <div>Pattern: #{patternSeed}</div>
              </div>
            </div>
          )}
          <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full">
            Drag to rotate • Scroll to zoom
          </div>
        </div>

        {/* Analyze Mode Controls */}
        {viewMode === "analyze" && (
          <div className="space-y-6 p-4 rounded-lg bg-muted/30 border border-border/40">
            {/* Wear Slider */}
            {item.float_min !== undefined && item.float_max !== undefined && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Wear Value</Label>
                  <span className="text-sm font-mono text-muted-foreground">{wearValue[0].toFixed(4)}</span>
                </div>
                <Slider
                  value={wearValue}
                  onValueChange={setWearValue}
                  min={item.float_min}
                  max={item.float_max}
                  step={0.0001}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Factory New ({item.float_min.toFixed(2)})</span>
                  <span>Battle-Scarred ({item.float_max.toFixed(2)})</span>
                </div>
              </div>
            )}

            {/* Pattern Seed */}
            {item.known_rare_patterns && item.known_rare_patterns.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Pattern Seed</Label>
                <Input
                  type="number"
                  value={patternSeed}
                  onChange={(e) => setPatternSeed(e.target.value)}
                  placeholder="Enter pattern seed (0-999)"
                  className="font-mono"
                />
                <div className="flex flex-wrap gap-2">
                  {item.known_rare_patterns.slice(0, 4).map((pattern) => (
                    <Button
                      key={pattern}
                      variant="outline"
                      size="sm"
                      onClick={() => setPatternSeed(pattern.toString())}
                      className="font-mono"
                    >
                      #{pattern}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Sticker Fit Preview */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Sticker Slots</Label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSticker(selectedSticker === slot ? null : slot)}
                    className={`aspect-square rounded-lg border-2 transition-all ${
                      selectedSticker === slot
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/50 hover:border-primary/50"
                    } flex items-center justify-center text-xs font-semibold`}
                  >
                    Slot {slot}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Click slots to preview sticker placement. ROI hint: Katowice 2014 holos add 10-30% value.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
