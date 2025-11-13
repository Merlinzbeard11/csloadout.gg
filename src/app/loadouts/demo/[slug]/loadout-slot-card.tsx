import type { LoadoutItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface LoadoutSlotCardProps {
  slot: string
  item: LoadoutItem | null
}

export function LoadoutSlotCard({ slot, item }: LoadoutSlotCardProps) {
  const getRarityColor = (rarity: string) => {
    const colors = {
      consumer: "text-gray-400",
      industrial: "text-blue-400",
      milspec: "text-blue-500",
      restricted: "text-purple-500",
      classified: "text-pink-500",
      covert: "text-red-500",
      contraband: "text-yellow-500",
    }
    return colors[rarity as keyof typeof colors] || "text-gray-400"
  }

  if (!item) {
    return (
      <div className="bg-cs2-dark border-2 border-dashed border-cs2-blue/20 rounded-lg p-6 text-center">
        <div className="text-lg font-semibold text-cs2-light mb-2">{slot}</div>
        <div className="text-sm text-gray-400">No item selected</div>
      </div>
    )
  }

  return (
    <div className="bg-cs2-dark border border-cs2-blue/20 rounded-lg p-6 hover:border-cs2-blue/50 transition-colors">
      <div className="text-lg font-semibold text-cs2-light mb-4">{slot}</div>
      <div className="flex flex-col items-center gap-4">
        <div className="w-48 h-48 bg-cs2-darker rounded-lg flex items-center justify-center overflow-hidden">
          <img
            src={item.item.image || "/placeholder.svg"}
            alt={item.item.name}
            className="w-full h-full object-contain"
          />
        </div>
        <div className="text-center w-full">
          <div className={`text-lg font-medium ${getRarityColor(item.item.rarity)}`}>{item.item.name}</div>
          <div className="text-sm text-gray-400 mt-1">{item.marketplace}</div>
          <div className="text-2xl font-bold text-cs2-light mt-2">${item.price.toFixed(2)}</div>
        </div>
        <Button asChild className="w-full bg-cs2-blue hover:bg-cs2-blue/80">
          <Link href={`/items/${item.item.id}`}>View Markets</Link>
        </Button>
      </div>
    </div>
  )
}
