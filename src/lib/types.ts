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
