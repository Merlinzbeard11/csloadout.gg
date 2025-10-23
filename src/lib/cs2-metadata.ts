/**
 * CS2 Item Metadata Utilities
 * Maps Steam item names to rarity, wear conditions, and float values
 */

export type Rarity = 'consumer' | 'industrial' | 'milspec' | 'restricted' | 'classified' | 'covert' | 'contraband';
export type Wear = 'FN' | 'MW' | 'FT' | 'WW' | 'BS';

export interface ItemMetadata {
  rarity: Rarity;
  wear?: Wear;
  floatValue?: number;
}

// CS2 Rarity mapping based on well-known skins
const ITEM_RARITY_MAP: Record<string, Rarity> = {
  // Contraband (Extremely Rare - Only M4A4 Howl)
  'M4A4 | Howl': 'contraband',

  // Covert (Red - Legendary Skins)
  'AWP | Dragon Lore': 'covert',
  'AWP | Medusa': 'covert',
  'AWP | Gungnir': 'covert',
  'AK-47 | Wild Lotus': 'covert',
  'AK-47 | Fire Serpent': 'covert',
  'AK-47 | Gold Arabesque': 'covert',
  'M4A4 | Poseidon': 'covert',
  'M4A1-S | Hot Rod': 'covert',
  'M4A1-S | Printstream': 'covert',
  'Desert Eagle | Printstream': 'covert',
  'Desert Eagle | Blaze': 'covert',
  'Glock-18 | Fade': 'covert',
  'USP-S | Kill Confirmed': 'covert',
  'AWP | Asiimov': 'covert',
  'AWP | Chromatic Aberration': 'covert',

  // Classified (Pink/Purple - High Tier)
  'AK-47 | Redline': 'classified',
  'AK-47 | Vulcan': 'classified',
  'AK-47 | Phantom Disruptor': 'classified',
  'M4A4 | Asiimov': 'classified',
  'M4A4 | Temukau': 'classified',
  'M4A1-S | Hyper Beast': 'classified',
  'M4A1-S | Chantico\'s Fire': 'classified',
  'Desert Eagle | Kumicho Dragon': 'classified',
  'Desert Eagle | Ocean Drive': 'classified',

  // Restricted (Purple - Mid Tier)
  'AK-47 | Fuel Injector': 'restricted',
  'AK-47 | Neon Revolution': 'restricted',
  'M4A4 | Desolate Space': 'restricted',
  'AWP | Hyper Beast': 'restricted',

  // Mil-Spec (Blue - Common Tier)
  'AK-47 | Blue Laminate': 'milspec',
  'M4A4 | Evil Daimyo': 'milspec',

  // Industrial (Light Blue)
  'AK-47 | Safari Mesh': 'industrial',

  // Consumer (Gray/White - Common)
  'AK-47 | Safari Mesh': 'consumer',

  // Knives (All Covert)
  'Karambit': 'covert',
  'Butterfly Knife': 'covert',
  'M9 Bayonet': 'covert',
  'Bayonet': 'covert',

  // Gloves (All Covert)
  'Sport Gloves': 'covert',
  'Driver Gloves': 'covert',
  'Specialist Gloves': 'covert',
};

// Float value ranges for each wear condition
const WEAR_FLOAT_RANGES: Record<Wear, { min: number; max: number }> = {
  FN: { min: 0.00, max: 0.07 },
  MW: { min: 0.07, max: 0.15 },
  FT: { min: 0.15, max: 0.38 },
  WW: { min: 0.38, max: 0.45 },
  BS: { min: 0.45, max: 1.00 },
};

// Wear condition name mapping
const WEAR_NAME_MAP: Record<string, Wear> = {
  'Factory New': 'FN',
  'Minimal Wear': 'MW',
  'Field-Tested': 'FT',
  'Well-Worn': 'WW',
  'Battle-Scarred': 'BS',
};

/**
 * Extract wear condition from item name
 * @example "AWP | Dragon Lore (Factory New)" -> "FN"
 */
export function extractWear(itemName: string): Wear | undefined {
  const wearMatch = itemName.match(/\((.*?)\)$/);
  if (!wearMatch) return undefined;

  const wearName = wearMatch[1];
  return WEAR_NAME_MAP[wearName];
}

/**
 * Extract base weapon and skin name (without wear)
 * @example "AWP | Dragon Lore (Factory New)" -> "AWP | Dragon Lore"
 */
export function extractBaseName(itemName: string): string {
  return itemName.replace(/\s*\([^)]*\)$/, '');
}

/**
 * Determine rarity tier for an item
 */
export function determineRarity(itemName: string): Rarity {
  const baseName = extractBaseName(itemName);

  // Check exact match first
  if (ITEM_RARITY_MAP[baseName]) {
    return ITEM_RARITY_MAP[baseName];
  }

  // Check weapon type matches
  const weaponType = baseName.split(' | ')[0] || baseName;
  if (ITEM_RARITY_MAP[weaponType]) {
    return ITEM_RARITY_MAP[weaponType];
  }

  // Default to classified for unmapped items (reasonable assumption for marketplace items)
  return 'classified';
}

/**
 * Generate realistic float value for given wear condition
 */
export function generateFloatValue(wear: Wear): number {
  const range = WEAR_FLOAT_RANGES[wear];
  const random = Math.random();
  return range.min + (random * (range.max - range.min));
}

/**
 * Get complete metadata for a Steam item
 */
export function getItemMetadata(itemName: string): ItemMetadata {
  const wear = extractWear(itemName);
  const rarity = determineRarity(itemName);
  const floatValue = wear ? generateFloatValue(wear) : undefined;

  return {
    rarity,
    wear,
    floatValue,
  };
}

/**
 * Enrich Steam item names with metadata
 */
export function enrichItemData(itemName: string) {
  const metadata = getItemMetadata(itemName);
  const baseName = extractBaseName(itemName);
  const parts = baseName.split(' | ');

  return {
    fullName: itemName,
    weaponName: parts[0] || itemName,
    skinName: parts.slice(1).join(' | ') || undefined,
    ...metadata,
  };
}
