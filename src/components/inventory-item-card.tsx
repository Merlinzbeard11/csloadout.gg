import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"
import type { InventoryItem } from "@/lib/types"

interface InventoryItemCardProps {
  item: InventoryItem
}

// CS2 rarity text colors - using standard CS2 rarity names
const rarityColors: Record<string, string> = {
  consumer: "text-gray-400",      // Consumer Grade (Gray)
  industrial: "text-blue-400",    // Industrial Grade (Light Blue)
  milspec: "text-blue-500",       // Mil-Spec (Blue)
  restricted: "text-purple-500",  // Restricted (Purple)
  classified: "text-pink-500",    // Classified (Pink)
  covert: "text-red-500",         // Covert (Red)
  contraband: "text-yellow-500",  // Contraband (Gold)
  default: "text-gray-400",
}

// CS2 rarity border colors - using standard CS2 rarity names
const rarityBorderColors: Record<string, string> = {
  consumer: "border-gray-500/50 hover:border-gray-400",      // Consumer Grade (Gray)
  industrial: "border-blue-400/50 hover:border-blue-400",    // Industrial Grade (Light Blue)
  milspec: "border-blue-500/50 hover:border-blue-500",       // Mil-Spec (Blue)
  restricted: "border-purple-500/50 hover:border-purple-500", // Restricted (Purple)
  classified: "border-pink-500/50 hover:border-pink-500",    // Classified (Pink)
  covert: "border-red-500/50 hover:border-red-500",          // Covert (Red)
  contraband: "border-yellow-500/50 hover:border-yellow-500", // Contraband (Gold)
  default: "border-cs2-blue/20 hover:border-cs2-blue/50",
}

// Parse item name to extract wear condition (e.g., "Field-Tested" from "AK-47 | Redline (Field-Tested)")
function parseItemName(fullName: string): { name: string; wear: string | null } {
  const wearMatch = fullName.match(/\s*\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)\s*$/i)
  if (wearMatch) {
    return {
      name: fullName.replace(wearMatch[0], '').trim(),
      wear: wearMatch[1]
    }
  }
  return { name: fullName, wear: null }
}

export function InventoryItemCard({ item }: InventoryItemCardProps) {
  const hasValueChange = item.valueChange && item.valueChange.amount !== 0
  const isPositive = hasValueChange && item.valueChange!.amount > 0
  const { name, wear } = parseItemName(item.item.name)
  const borderColor = rarityBorderColors[item.item.rarity] || rarityBorderColors.default

  return (
    <Card className={cn("bg-cs2-dark p-0 overflow-hidden transition-colors cursor-pointer", borderColor)}>
      <div className="aspect-square bg-cs2-darker flex items-center justify-center p-4">
        <img
          src={item.item.image || "/placeholder.svg"}
          alt={item.item.name}
          className="max-w-full max-h-full object-contain"
        />
      </div>
      <div className="p-3 space-y-2">
        <div className="space-y-0.5">
          <h3 className={cn("text-sm font-medium line-clamp-2", rarityColors[item.item.rarity] || rarityColors.default)}>{name}</h3>
          {wear && <p className="text-xs text-gray-400">{wear}</p>}
        </div>
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
