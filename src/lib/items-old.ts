/**
 * CS2 Items Database
 * Real CS2 skin names for marketplace integration
 */

export interface ItemMetadata {
  id: string
  name: string
  type: "weapon_skin" | "knife" | "gloves" | "sticker" | "case"
  weapon?: string
  finish?: string
  paint_index?: number
  rarity: "Consumer" | "Industrial" | "Mil-Spec" | "Restricted" | "Classified" | "Covert" | "Extraordinary" | "Contraband"
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
  popularity: number
}

/**
 * Top CS2 Items - Real market data sources
 * These names match Steam Community Market naming
 */
export const ITEMS: ItemMetadata[] = [
  {
    id: "ak-47-case-hardened",
    name: "AK-47 | Case Hardened",
    type: "weapon_skin",
    weapon: "AK-47",
    finish: "Case Hardened",
    paint_index: 44,
    rarity: "Classified",
    collection: "The Arms Deal Collection",
    case: "CS:GO Weapon Case",
    release_year: 2013,
    float_min: 0.0,
    float_max: 1.0,
    color_hue: 210,
    known_rare_patterns: [661, 670, 321, 168],
    images: {
      thumb: "/ak-47-case-hardened-blue-gem.jpg",
      hero: "/ak-47-case-hardened-detailed-view.jpg",
    },
    popularity: 0.95,
  },
  {
    id: "awp-dragon-lore",
    name: "AWP | Dragon Lore",
    type: "weapon_skin",
    weapon: "AWP",
    finish: "Dragon Lore",
    paint_index: 344,
    rarity: "Covert",
    collection: "The Cobblestone Collection",
    case: "Cobblestone Souvenir Package",
    release_year: 2014,
    float_min: 0.0,
    float_max: 0.7,
    color_hue: 45,
    images: {
      thumb: "/awp-dragon-lore.jpg",
      hero: "/awp-dragon-lore-detailed-view.jpg",
    },
    popularity: 0.98,
  },
  {
    id: "m4a4-howl",
    name: "M4A4 | Howl",
    type: "weapon_skin",
    weapon: "M4A4",
    finish: "Howl",
    paint_index: 309,
    rarity: "Contraband",
    collection: "The Huntsman Collection",
    case: "Huntsman Weapon Case",
    release_year: 2014,
    float_min: 0.0,
    float_max: 0.7,
    color_hue: 25,
    images: {
      thumb: "/m4a4-howl-contraband.jpg",
      hero: "/m4a4-howl-detailed-view.jpg",
    },
    popularity: 0.92,
  },
  {
    id: "karambit-fade",
    name: "★ Karambit | Fade",
    type: "knife",
    weapon: "Karambit",
    finish: "Fade",
    rarity: "Covert",
    collection: "Knife Collection",
    release_year: 2013,
    float_min: 0.0,
    float_max: 0.08,
    color_hue: 320,
    images: {
      thumb: "/karambit-fade-knife.jpg",
      hero: "/karambit-fade-knife.jpg",
    },
    popularity: 0.94,
  },
  {
    id: "glock-18-fade",
    name: "Glock-18 | Fade",
    type: "weapon_skin",
    weapon: "Glock-18",
    finish: "Fade",
    paint_index: 38,
    rarity: "Covert",
    collection: "The Arms Deal Collection",
    case: "CS:GO Weapon Case",
    release_year: 2013,
    float_min: 0.0,
    float_max: 0.08,
    color_hue: 280,
    images: {
      thumb: "/glock-18-fade.jpg",
      hero: "/glock-18-fade.jpg",
    },
    popularity: 0.88,
  },
  {
    id: "ak-47-fire-serpent",
    name: "AK-47 | Fire Serpent",
    type: "weapon_skin",
    weapon: "AK-47",
    finish: "Fire Serpent",
    paint_index: 180,
    rarity: "Covert",
    collection: "The Bravo Collection",
    case: "Operation Bravo Case",
    release_year: 2013,
    float_min: 0.06,
    float_max: 0.76,
    color_hue: 15,
    images: {
      thumb: "/ak-47-case-hardened-blue-gem.jpg", // fallback
      hero: "/ak-47-case-hardened-detailed-view.jpg",
    },
    popularity: 0.91,
  },
  {
    id: "ak-47-redline",
    name: "AK-47 | Redline",
    type: "weapon_skin",
    weapon: "AK-47",
    finish: "Redline",
    paint_index: 282,
    rarity: "Classified",
    collection: "The Phoenix Collection",
    case: "Operation Phoenix Weapon Case",
    release_year: 2014,
    float_min: 0.1,
    float_max: 0.7,
    color_hue: 0,
    images: {
      thumb: "/ak-47-case-hardened-blue-gem.jpg", // fallback
      hero: "/ak-47-case-hardened-detailed-view.jpg",
    },
    popularity: 0.85,
  },
  {
    id: "m4a1-s-printstream",
    name: "M4A1-S | Printstream",
    type: "weapon_skin",
    weapon: "M4A1-S",
    finish: "Printstream",
    paint_index: 850,
    rarity: "Covert",
    collection: "The Fracture Collection",
    case: "Fracture Case",
    release_year: 2020,
    float_min: 0.0,
    float_max: 1.0,
    color_hue: 200,
    images: {
      thumb: "/placeholder.jpg",
      hero: "/placeholder.jpg",
    },
    popularity: 0.89,
  },
  {
    id: "desert-eagle-printstream",
    name: "Desert Eagle | Printstream",
    type: "weapon_skin",
    weapon: "Desert Eagle",
    finish: "Printstream",
    paint_index: 851,
    rarity: "Covert",
    collection: "The Fracture Collection",
    case: "Fracture Case",
    release_year: 2020,
    float_min: 0.0,
    float_max: 1.0,
    color_hue: 200,
    images: {
      thumb: "/placeholder.jpg",
      hero: "/placeholder.jpg",
    },
    popularity: 0.87,
  },
  {
    id: "awp-asiimov",
    name: "AWP | Asiimov",
    type: "weapon_skin",
    weapon: "AWP",
    finish: "Asiimov",
    paint_index: 279,
    rarity: "Covert",
    collection: "The Operation Phoenix Collection",
    case: "Operation Phoenix Weapon Case",
    release_year: 2014,
    float_min: 0.18,
    float_max: 1.0,
    color_hue: 30,
    images: {
      thumb: "/awp-dragon-lore.jpg", // fallback
      hero: "/awp-dragon-lore-detailed-view.jpg",
    },
    popularity: 0.93,
  },
]

/**
 * Get item by ID
 */
export function getItemById(id: string): ItemMetadata | undefined {
  return ITEMS.find(item => item.id === id)
}

/**
 * Get item by name (for API lookups)
 */
export function getItemByName(name: string): ItemMetadata | undefined {
  return ITEMS.find(item => item.name.toLowerCase() === name.toLowerCase())
}

/**
 * Get all items (for search/listing pages)
 */
export function getAllItems(): ItemMetadata[] {
  return ITEMS
}

/**
 * Search items by query
 */
export function searchItems(query: string): ItemMetadata[] {
  const lowerQuery = query.toLowerCase()
  return ITEMS.filter(item =>
    item.name.toLowerCase().includes(lowerQuery) ||
    item.weapon?.toLowerCase().includes(lowerQuery) ||
    item.finish?.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Convert ItemMetadata to SearchResult format
 * (for home page and search pages - without prices)
 */
export function itemToSearchResult(item: ItemMetadata, price?: number) {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    rarity: item.rarity,
    release_year: item.release_year,
    images: {
      thumb: item.images.thumb,
    },
    best_price: {
      market: "Steam",
      currency: "USD",
      price: price || 0,
    },
    delta_7d: "+0.0%", // Placeholder - would need historical data
    delta_30d: "+0.0%", // Placeholder - would need historical data
    lowest_float: item.float_min,
  }
}

/**
 * Get top trending items (sorted by popularity)
 */
export function getTrendingItems(limit: number = 6): ItemMetadata[] {
  return [...ITEMS]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit)
}
