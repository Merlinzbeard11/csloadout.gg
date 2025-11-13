import { ItemCard } from "@/components/item-card"

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

export function ItemGrid({ items }: ItemGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}
