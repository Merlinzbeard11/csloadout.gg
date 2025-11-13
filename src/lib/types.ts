export interface Item {
  id: string
  name: string
  image: string
  rarity: "consumer" | "industrial" | "milspec" | "restricted" | "classified" | "covert" | "contraband"
}

export interface InventoryItem {
  assetId: string
  item: Item
  marketValue: number
  valueChange?: {
    amount: number
    percent: number
  }
  tradable: boolean
  marketable: boolean
}

export interface InventoryStats {
  totalValue: number
  itemCount: number
  mostValuable: InventoryItem | null
}

// Gallery types
export interface PublicLoadout {
  id: string
  name: string
  slug: string
  budget: number
  totalCost: number
  items: Array<{
    slot: string
    item: {
      id: string
      name: string
      imageUrl: string
      rarity: "consumer" | "industrial" | "milspec" | "restricted" | "classified" | "covert" | "contraband"
      price: number
    }
    price: number
  }>
  upvotes: number
  views: number
  isUpvotedByUser?: boolean
  author: {
    id: string
    username: string
  }
  createdAt: string
}

export type BudgetRange = "all" | "under-50" | "50-200" | "200-500" | "500-plus"
export type SortOption = "newest" | "popular" | "upvotes"
