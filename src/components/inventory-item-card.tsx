import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"
import type { InventoryItem } from "@/lib/types"

interface InventoryItemCardProps {
  item: InventoryItem
}

const rarityColors = {
  consumer: "text-gray-400",
  industrial: "text-blue-400",
  milspec: "text-blue-500",
  restricted: "text-purple-500",
  classified: "text-pink-500",
  covert: "text-red-500",
  contraband: "text-yellow-500",
}

export function InventoryItemCard({ item }: InventoryItemCardProps) {
  const hasValueChange = item.valueChange && item.valueChange.amount !== 0
  const isPositive = hasValueChange && item.valueChange!.amount > 0

  return (
    <Card className="bg-cs2-dark border-cs2-blue/20 p-0 overflow-hidden hover:border-cs2-blue/50 transition-colors cursor-pointer">
      <div className="aspect-square bg-cs2-darker flex items-center justify-center p-4">
        <img
          src={item.item.image || "/placeholder.svg"}
          alt={item.item.name}
          className="w-full h-full object-contain"
        />
      </div>
      <div className="p-3 space-y-2">
        <h3 className={cn("text-sm font-medium line-clamp-2", rarityColors[item.item.rarity])}>{item.item.name}</h3>
        <div className="space-y-1">
          <p className="text-cs2-light text-lg font-bold">${item.marketValue.toFixed(2)}</p>
          {hasValueChange && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                isPositive ? "text-green-500" : "text-red-500",
              )}
            >
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>
                {isPositive ? "+" : ""}
                {item.valueChange!.amount.toFixed(2)} ({isPositive ? "+" : ""}
                {item.valueChange!.percent.toFixed(1)}%)
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
