import Link from "next/link"
import Image from "next/image"

interface Item {
  id: string
  name: string
  display_name: string
  rarity: string | null
  type: string
  image_url: string
  image_url_fallback?: string | null
}

interface ItemGridProps {
  items: Item[]
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

export function ItemGrid({ items }: ItemGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/items/${item.id}`}
          className="bg-cs2-dark border border-cs2-blue/20 rounded-lg overflow-hidden hover:border-cs2-blue/50 transition-colors group"
        >
          <div className="aspect-square relative bg-cs2-darker/50">
            <Image
              src={item.image_url || "/placeholder.svg"}
              alt={item.display_name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 20vw"
              className="object-contain p-4"
              loading="lazy"
            />
          </div>
          <div className="p-3">
            <h3 className="text-sm font-semibold text-cs2-light truncate mb-1 group-hover:text-white transition-colors">
              {item.display_name}
            </h3>
            {item.rarity && (
              <span className={`text-xs font-medium uppercase ${rarityColors[item.rarity] || "text-gray-400"}`}>
                {item.rarity}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
