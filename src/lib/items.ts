/**
 * CS2 Items Database - Using ByMykel/CSGO-API
 * 8,338 real CS2 items from comprehensive API (with wear conditions)
 */

import { CS2_ITEMS } from './cs2-items-full'

export interface ItemMetadata {
  id: string
  name: string // Weapon: "StatTrak™ AK-47 | Case Hardened (FN)", Case: "Operation Riptide Case", Sticker: "Sticker | Shooter"
  type: "weapon_skin" | "knife" | "gloves" | "sticker" | "case"

  // Weapon-specific fields
  weapon?: string
  weapon_category?: "Pistols" | "SMGs" | "Rifles" | "Heavy" | "Knives" | "Gloves" | null
  finish?: string
  wear?: string // "Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"
  wear_short?: string // "FN", "MW", "FT", "WW", "BS"
  min_float?: number
  max_float?: number
  stattrak?: boolean // Whether this base skin CAN have StatTrak
  souvenir?: boolean // Whether this base skin CAN have Souvenir
  is_stattrak?: boolean // Whether THIS specific item IS StatTrak
  is_souvenir?: boolean // Whether THIS specific item IS Souvenir

  // Case-specific fields
  container_type?: "Weapon Case" | "Sticker Capsule" | null // Type of container
  contains_items?: number // Number of regular items in case
  contains_rare?: number // Number of rare items (knives, etc.)
  market_hash_name?: string

  // Sticker-specific fields
  sticker_type?: string // Event, Holo, Foil, Glitter, etc.
  tournament?: string | null // Tournament name
  effect?: string

  // Common fields
  rarity: "Consumer" | "Industrial" | "Mil-Spec" | "Restricted" | "Classified" | "Covert" | "Extraordinary" | "Contraband"
  collection?: string
  release_year: number
  image?: string
  description?: string
}

// Transform fetched data to ItemMetadata format
export const ITEMS: ItemMetadata[] = CS2_ITEMS.map(item => ({
  id: item.id,
  name: item.name,
  type: item.type as ItemMetadata['type'],

  // Weapon fields
  weapon: item.weapon,
  weapon_category: item.weapon_category as ItemMetadata['weapon_category'],
  finish: item.finish || undefined,
  wear: item.wear,
  wear_short: item.wear_short,
  min_float: item.min_float,
  max_float: item.max_float,
  stattrak: item.stattrak,
  souvenir: item.souvenir,
  is_stattrak: item.is_stattrak || false,
  is_souvenir: item.is_souvenir || false,

  // Case fields
  container_type: item.container_type as ItemMetadata['container_type'],
  contains_items: item.contains_items,
  contains_rare: item.contains_rare,
  market_hash_name: item.market_hash_name,

  // Sticker fields
  sticker_type: item.sticker_type,
  tournament: item.tournament,
  effect: item.effect,

  // Common fields
  rarity: item.rarity as ItemMetadata['rarity'],
  collection: item.collection || undefined,
  release_year: item.release_year,
  image: item.image,
  description: item.description
}))

/**
 * Get item by ID
 */
export function getItemById(id: string): ItemMetadata | undefined {
  return ITEMS.find(item => item.id === id)
}

/**
 * Search items by name, weapon, or finish
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
 * Get all items
 */
export function getAllItems(): ItemMetadata[] {
  return ITEMS
}

/**
 * Get trending items (top items by rarity)
 */
export function getTrendingItems(limit: number = 6): ItemMetadata[] {
  return ITEMS.slice(0, limit)
}

/**
 * Transform ItemMetadata to SearchResult format for UI
 */
export function itemToSearchResult(item: ItemMetadata) {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    weapon_category: item.weapon_category,
    container_type: item.container_type,
    rarity: item.rarity,
    release_year: item.release_year,
    images: {
      thumb: item.image || '/placeholder.svg'
    },
    best_price: {
      market: 'Steam',
      currency: 'USD',
      price: 0  // Will be fetched from API
    },
    delta_7d: '+0.0%',
    delta_30d: '+0.0%',
    lowest_float: item.min_float || 0
  }
}
