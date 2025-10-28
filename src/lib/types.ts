export interface Item {
  id: string
  name: string
  type: "weapon_skin" | "sticker" | "case" | "capsule" | "agent" | "patch" | "music_kit" | "graffiti" | "souvenir"
  weapon?: string
  finish?: string
  paint_index?: number
  rarity:
    | "Consumer"
    | "Industrial"
    | "Mil-Spec"
    | "Restricted"
    | "Classified"
    | "Covert"
    | "Extraordinary"
    | "Contraband"
  collection?: string
  case?: string
  release_year: number
  float_min?: number
  float_max?: number
  color_hue?: number
  known_rare_patterns?: number[]
  images: {
    thumb: string
    hero: string
  }
  markets: MarketPrice[]
  popularity: number
}

export interface MarketPrice {
  name: string
  currency: string
  price: number
  fee_incl: boolean
  last_seen: string
}

export interface SearchResult {
  id: string
  name: string
  type: string
  rarity: string
  release_year: number
  holo?: boolean
  images: {
    thumb: string
  }
  best_price: {
    market: string
    currency: string
    price: number
  }
  delta_7d: string
  delta_30d: string
  lowest_float?: number
}

export interface WatchlistItem {
  id: string
  item_id: string
  item_name: string
  item_image: string
  added_date: string
  current_price: number
  price_change_7d: string
  alerts_enabled: boolean
}

export interface Alert {
  id: string
  item_id: string
  item_name: string
  trigger_type: "price_below" | "price_drop" | "float_below" | "pattern_seed" | "rare_pattern"
  trigger_value: string
  market?: string
  channels: ("email" | "web_push" | "discord")[]
  enabled: boolean
  created_date: string
}

export interface PortfolioEntry {
  id: string
  item_id: string
  item_name: string
  item_image: string
  quantity: number
  buy_price: number
  buy_date: string
  marketplace: string
  current_price: number
}
