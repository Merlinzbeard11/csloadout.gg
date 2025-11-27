/**
 * ByMykel API Data Import Service
 *
 * Fetches CS2 item data from ByMykel/CSGO-API (GitHub) and imports to database.
 * Uses upsert logic to handle both new and existing items.
 *
 * BDD Reference: features/01-item-database.feature:73-80
 * Spec Reference: features/01-item-database.md (Gotcha #3: GitHub rate limiting)
 *
 * Critical Implementation Details:
 * - GitHub token required for 5,000 req/hr (vs 60 req/hr without)
 * - Composite unique key [name, quality, wear] prevents duplicates
 * - Normalization using normalizeItemName() for cross-platform matching
 * - Image fallback strategy for Steam CDN reliability
 */

import { prisma } from './prisma';
import { normalizeItemName } from './normalize';

export interface ByMykelItem {
  id: string;
  name: string;
  description?: string;
  weapon?: {
    id: string;
    name: string;
  };
  category?: {
    id: string;
    name: string;
  };
  pattern?: {
    id: string;
    name: string;
  };
  min_float?: number;
  max_float?: number;
  rarity?: {
    id: string;
    name: string;
    color: string;
  };
  stattrak?: boolean;
  souvenir?: boolean;
  wears?: Array<{
    id: string;
    name: string;
  }>;
  collections?: Array<any>;
  crates?: Array<any>;
  image: string;
}

export interface ByMykelCollection {
  id: string;
  name: string;
  crates?: Array<{
    id: string;
    name: string;
    image: string;
  }>;
  contains: Array<{
    id: string;
    name: string;
    rarity?: {
      id: string;
      name: string;
      color: string;
    };
    paint_index?: string;
    image: string;
  }>;
}

export interface ByMykelCase {
  id: string;
  name: string;
  description?: string;
  type?: string;
  first_sale_date?: string;
  image: string;
  contains: Array<{
    id: string;
    name: string;
    rarity?: {
      id: string;
      name: string;
      color: string;
    };
    paint_index?: string;
    image: string;
  }>;
  contains_rare?: Array<{
    id: string;
    name: string;
    rarity?: {
      id: string;
      name: string;
      color: string;
    };
    paint_index?: string;
    image: string;
  }>;
}

export interface ImportResult {
  processed: number;
  created: number;
  updated: number;
  failed: number;
}

/**
 * Fetches items from ByMykel/CSGO-API GitHub repository
 * Uses GitHub personal access token for higher rate limit (5,000 req/hr)
 *
 * @throws Error if API request fails after retries
 */
export async function fetchByMykelAPI(): Promise<ByMykelItem[]> {
  const url = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';

  const headers: HeadersInit = {};
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[ByMykel API] Fetch failed:', error);
    // Return empty array instead of throwing to allow graceful degradation
    return [];
  }
}

/**
 * Map wear name to database wear value and display name
 * ByMykel API uses names like "Factory New", "Minimal Wear", etc.
 */
const WEAR_NAME_MAPPING: Record<string, { dbValue: string; displayName: string }> = {
  'Factory New': { dbValue: 'factory_new', displayName: 'Factory New' },
  'Minimal Wear': { dbValue: 'minimal_wear', displayName: 'Minimal Wear' },
  'Field-Tested': { dbValue: 'field_tested', displayName: 'Field-Tested' },
  'Well-Worn': { dbValue: 'well_worn', displayName: 'Well-Worn' },
  'Battle-Scarred': { dbValue: 'battle_scarred', displayName: 'Battle-Scarred' },
};

/**
 * Get wear info from ByMykel wear data
 * Uses name-based matching since ByMykel IDs vary
 */
function getWearInfo(wearName: string): { dbValue: string; displayName: string } {
  return WEAR_NAME_MAPPING[wearName] || { dbValue: 'none', displayName: 'None' };
}

/**
 * Imports items to database using upsert logic
 * Creates SEPARATE records for each wear variant (5 per skin)
 *
 * For each item with wears:
 * 1. Creates market_hash_name format: "AK-47 | Redline (Field-Tested)"
 * 2. Creates one record per wear variant
 * 3. Upserts using composite unique key [name, quality, wear]
 *
 * @param items - Array of items from ByMykel API
 * @returns Import statistics (processed, created, updated, failed)
 */
export async function importItems(items: ByMykelItem[]): Promise<ImportResult> {
  const stats: ImportResult = {
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,
  };

  if (!items || items.length === 0) {
    return stats;
  }

  for (const item of items) {
    try {
      // Validate required fields
      if (!item.name || !item.image) {
        stats.failed++;
        continue;
      }

      // Determine type from category
      const type = item.category?.id?.includes('knife') ? 'knife' :
                  item.category?.id?.includes('glove') ? 'gloves' :
                  item.category?.id?.includes('agent') ? 'agent' : 'skin';

      // Build list of quality variants to create
      // Always create 'normal' variant, plus 'stattrak' if item supports it
      const qualities: string[] = ['normal'];
      if (item.stattrak) {
        qualities.push('stattrak');
      }
      if (item.souvenir) {
        qualities.push('souvenir');
      }

      // Get wears from API, or use 'none' for items without wear (agents, stickers, etc.)
      const wears = item.wears && item.wears.length > 0 ? item.wears : [{ id: 'none', name: 'None' }];

      // Create one record per wear AND quality variant
      for (const wearData of wears) {
        for (const quality of qualities) {
          try {
            const wearInfo = getWearInfo(wearData.name);
            const wear = wearInfo.dbValue;

            // Build market_hash_name format: "AK-47 | Redline (Field-Tested)"
            // For StatTrak: "StatTrak™ AK-47 | Redline (Field-Tested)"
            const baseName = quality === 'stattrak' ? `StatTrak™ ${item.name}` :
                            quality === 'souvenir' ? `Souvenir ${item.name}` : item.name;
            const marketHashName = wear !== 'none'
              ? `${baseName} (${wearInfo.displayName})`
              : baseName;

            // Upsert item using composite unique key [name, quality, wear]
            const result = await prisma.item.upsert({
              where: {
                name_quality_wear: {
                  name: marketHashName,
                  quality,
                  wear,
                },
              },
            update: {
              display_name: marketHashName,
              search_name: normalizeItemName(marketHashName),
              description: item.description || null,
              rarity: item.rarity?.id || null,
              weapon_type: item.weapon?.name || null,
              image_url: item.image,
              image_url_fallback: null,
              wear_min: item.min_float || null,
              wear_max: item.max_float || null,
              pattern_count: null,
              updated_at: new Date(),
            },
            create: {
              name: marketHashName,
              display_name: marketHashName,
              search_name: normalizeItemName(marketHashName),
              description: item.description || null,
              type,
              rarity: item.rarity?.id || null,
              quality,
              wear,
              weapon_type: item.weapon?.name || null,
              image_url: item.image,
              image_url_fallback: null,
              wear_min: item.min_float || null,
              wear_max: item.max_float || null,
              pattern_count: null,
            },
          });

          stats.processed++;

          // Check if created or updated by comparing timestamps
          const isNew = result.created_at.getTime() === result.updated_at.getTime();
          if (isNew) {
            stats.created++;
          } else {
            stats.updated++;
          }
        } catch (wearError) {
            console.error(`[Import] Failed to import wear/quality variant: ${item.name} (${wearData.name}, ${quality})`, wearError);
            stats.failed++;
          }
        }
      }
    } catch (error) {
      console.error(`[Import] Failed to import item: ${item.name}`, error);
      stats.failed++;
    }
  }

  return stats;
}

/**
 * Fetches stickers from ByMykel API
 */
export async function fetchStickers(): Promise<ByMykelItem[]> {
  const url = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/stickers.json';

  const headers: HeadersInit = {};
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[ByMykel API] Stickers fetch failed:', error);
    return [];
  }
}

/**
 * Fetches agents from ByMykel API
 */
export async function fetchAgents(): Promise<ByMykelItem[]> {
  const url = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/agents.json';

  const headers: HeadersInit = {};
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[ByMykel API] Agents fetch failed:', error);
    return [];
  }
}

/**
 * Fetches keychains from ByMykel API
 */
export async function fetchKeychains(): Promise<ByMykelItem[]> {
  const url = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/keychains.json';

  const headers: HeadersInit = {};
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[ByMykel API] Keychains fetch failed:', error);
    return [];
  }
}

/**
 * Fetches collectibles from ByMykel API
 */
export async function fetchCollectibles(): Promise<ByMykelItem[]> {
  const url = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/collectibles.json';

  const headers: HeadersInit = {};
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[ByMykel API] Collectibles fetch failed:', error);
    return [];
  }
}

/**
 * Imports stickers with proper type classification
 */
export async function importStickers(items: ByMykelItem[]): Promise<ImportResult> {
  const stats: ImportResult = {
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,
  };

  if (!items || items.length === 0) {
    return stats;
  }

  for (const item of items) {
    try {
      if (!item.name || !item.image) {
        stats.failed++;
        continue;
      }

      const quality = 'normal';
      const wear = 'none';
      const type = 'sticker';

      const result = await prisma.item.upsert({
        where: {
          name_quality_wear: {
            name: item.name,
            quality,
            wear,
          },
        },
        update: {
          display_name: item.name,
          search_name: normalizeItemName(item.name),
          description: item.description || null,
          rarity: item.rarity?.id || null,
          image_url: item.image,
          updated_at: new Date(),
        },
        create: {
          name: item.name,
          display_name: item.name,
          search_name: normalizeItemName(item.name),
          description: item.description || null,
          type,
          rarity: item.rarity?.id || null,
          quality,
          wear,
          image_url: item.image,
        },
      });

      stats.processed++;
      const isNew = result.created_at.getTime() === result.updated_at.getTime();
      if (isNew) {
        stats.created++;
      } else {
        stats.updated++;
      }
    } catch (error) {
      console.error(`[Import] Failed to import sticker: ${item.name}`, error);
      stats.failed++;
    }
  }

  return stats;
}

/**
 * Imports agents with proper type classification
 */
export async function importAgents(items: ByMykelItem[]): Promise<ImportResult> {
  const stats: ImportResult = {
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,
  };

  if (!items || items.length === 0) {
    return stats;
  }

  for (const item of items) {
    try {
      if (!item.name || !item.image) {
        stats.failed++;
        continue;
      }

      const quality = 'normal';
      const wear = 'none';
      const type = 'agent';

      const result = await prisma.item.upsert({
        where: {
          name_quality_wear: {
            name: item.name,
            quality,
            wear,
          },
        },
        update: {
          display_name: item.name,
          search_name: normalizeItemName(item.name),
          description: item.description || null,
          rarity: item.rarity?.id || null,
          image_url: item.image,
          updated_at: new Date(),
        },
        create: {
          name: item.name,
          display_name: item.name,
          search_name: normalizeItemName(item.name),
          description: item.description || null,
          type,
          rarity: item.rarity?.id || null,
          quality,
          wear,
          image_url: item.image,
        },
      });

      stats.processed++;
      const isNew = result.created_at.getTime() === result.updated_at.getTime();
      if (isNew) {
        stats.created++;
      } else {
        stats.updated++;
      }
    } catch (error) {
      console.error(`[Import] Failed to import agent: ${item.name}`, error);
      stats.failed++;
    }
  }

  return stats;
}

/**
 * Imports keychains with proper type classification
 */
export async function importKeychains(items: ByMykelItem[]): Promise<ImportResult> {
  const stats: ImportResult = {
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,
  };

  if (!items || items.length === 0) {
    return stats;
  }

  for (const item of items) {
    try {
      if (!item.name || !item.image) {
        stats.failed++;
        continue;
      }

      const quality = 'normal';
      const wear = 'none';
      const type = 'keychain';

      const result = await prisma.item.upsert({
        where: {
          name_quality_wear: {
            name: item.name,
            quality,
            wear,
          },
        },
        update: {
          display_name: item.name,
          search_name: normalizeItemName(item.name),
          description: item.description || null,
          rarity: item.rarity?.id || null,
          image_url: item.image,
          updated_at: new Date(),
        },
        create: {
          name: item.name,
          display_name: item.name,
          search_name: normalizeItemName(item.name),
          description: item.description || null,
          type,
          rarity: item.rarity?.id || null,
          quality,
          wear,
          image_url: item.image,
        },
      });

      stats.processed++;
      const isNew = result.created_at.getTime() === result.updated_at.getTime();
      if (isNew) {
        stats.created++;
      } else {
        stats.updated++;
      }
    } catch (error) {
      console.error(`[Import] Failed to import keychain: ${item.name}`, error);
      stats.failed++;
    }
  }

  return stats;
}

/**
 * Imports collectibles with proper type classification
 */
export async function importCollectibles(items: ByMykelItem[]): Promise<ImportResult> {
  const stats: ImportResult = {
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,
  };

  if (!items || items.length === 0) {
    return stats;
  }

  for (const item of items) {
    try {
      if (!item.name || !item.image) {
        stats.failed++;
        continue;
      }

      const quality = 'normal';
      const wear = 'none';
      const type = 'collectible';

      const result = await prisma.item.upsert({
        where: {
          name_quality_wear: {
            name: item.name,
            quality,
            wear,
          },
        },
        update: {
          display_name: item.name,
          search_name: normalizeItemName(item.name),
          description: item.description || null,
          rarity: item.rarity?.id || null,
          image_url: item.image,
          updated_at: new Date(),
        },
        create: {
          name: item.name,
          display_name: item.name,
          search_name: normalizeItemName(item.name),
          description: item.description || null,
          type,
          rarity: item.rarity?.id || null,
          quality,
          wear,
          image_url: item.image,
        },
      });

      stats.processed++;
      const isNew = result.created_at.getTime() === result.updated_at.getTime();
      if (isNew) {
        stats.created++;
      } else {
        stats.updated++;
      }
    } catch (error) {
      console.error(`[Import] Failed to import collectible: ${item.name}`, error);
      stats.failed++;
    }
  }

  return stats;
}

/**
 * Main import function - fetches from API and imports to database
 * Combines fetchByMykelAPI() and importItems() for convenience
 */
export async function runImport(): Promise<ImportResult> {
  console.log('[Import] Fetching items from ByMykel API...');
  const items = await fetchByMykelAPI();

  console.log(`[Import] Fetched ${items.length} items, beginning import...`);
  const result = await importItems(items);

  console.log(`[Import] Complete: ${result.processed} processed, ${result.created} created, ${result.updated} updated, ${result.failed} failed`);
  return result;
}

/**
 * Fetches collections from ByMykel API
 */
export async function fetchCollections(): Promise<ByMykelCollection[]> {
  const url = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/collections.json';

  const headers: HeadersInit = {};
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[ByMykel API] Collections fetch failed:', error);
    return [];
  }
}

/**
 * Imports collections and links items to collections
 */
export async function importCollections(collections: ByMykelCollection[]): Promise<ImportResult> {
  const stats: ImportResult = {
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,
  };

  if (!collections || collections.length === 0) {
    return stats;
  }

  for (const collection of collections) {
    try {
      if (!collection.name || !collection.id) {
        stats.failed++;
        continue;
      }

      // Generate slug from name
      const slug = collection.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Create or update collection
      const collectionRecord = await prisma.collection.upsert({
        where: { slug },
        update: {
          name: collection.name,
          updated_at: new Date(),
        },
        create: {
          name: collection.name,
          slug,
          description: null,
          image_url: collection.crates?.[0]?.image || '',
          release_date: new Date('2013-08-14'), // Default CS:GO release date
          is_discontinued: false,
        },
      });

      stats.processed++;
      const isNew = collectionRecord.created_at.getTime() === collectionRecord.updated_at.getTime();
      if (isNew) {
        stats.created++;
      } else {
        stats.updated++;
      }

      // Link items to collection
      if (collection.contains && collection.contains.length > 0) {
        for (const item of collection.contains) {
          try {
            // Find all items that start with this base name (handles wear variants)
            // API returns "AK-47 | Aquamarine Revenge" but DB has "AK-47 | Aquamarine Revenge (Field-Tested)"
            const itemRecords = await prisma.item.findMany({
              where: {
                OR: [
                  { name: item.name }, // Exact match for items without wear
                  { name: { startsWith: `${item.name} (` } }, // Wear variants
                  { name: { startsWith: `StatTrak™ ${item.name}` } }, // StatTrak variants
                  { name: { startsWith: `Souvenir ${item.name}` } }, // Souvenir variants
                ],
              },
            });

            // Update all matching items with collection_id
            for (const itemRecord of itemRecords) {
              await prisma.item.update({
                where: { id: itemRecord.id },
                data: { collection_id: collectionRecord.id },
              });
            }

            if (itemRecords.length > 0) {
              console.log(`[Import] Linked ${itemRecords.length} variants of ${item.name} to ${collection.name}`);
            }
          } catch (error) {
            console.error(`[Import] Failed to link item ${item.name} to collection ${collection.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`[Import] Failed to import collection: ${collection.name}`, error);
      stats.failed++;
    }
  }

  return stats;
}

/**
 * Fetches cases (crates) from ByMykel API
 */
export async function fetchCases(): Promise<ByMykelCase[]> {
  const url = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json';

  const headers: HeadersInit = {};
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    // Filter only actual cases (exclude gift packages, etc.)
    return Array.isArray(data) ? data.filter((c: ByMykelCase) => c.type === 'Case' && c.contains && c.contains.length > 0) : [];
  } catch (error) {
    console.error('[ByMykel API] Cases fetch failed:', error);
    return [];
  }
}

/**
 * Calculate drop probability based on rarity tier
 * Based on CS:GO case drop rates: https://blog.counter-strike.net/
 */
function calculateDropProbability(rarity: string, totalItemsInTier: number, isRare: boolean): number {
  if (isRare) {
    // Special items (knives, gloves): 0.26% total, divided evenly
    return 0.26 / totalItemsInTier;
  }

  // Standard rarity drop rates (approximate CS:GO rates)
  const rarityRates: { [key: string]: number } = {
    'rarity_common': 79.92,           // Consumer/Industrial Grade
    'rarity_uncommon': 79.92,         // Consumer/Industrial Grade
    'rarity_rare_weapon': 15.98,      // Mil-Spec Grade
    'rarity_mythical_weapon': 3.20,   // Restricted
    'rarity_legendary_weapon': 0.64,  // Classified
    'rarity_ancient_weapon': 0.26,    // Covert
  };

  const tierRate = rarityRates[rarity] || 1.0;
  return tierRate / totalItemsInTier;
}

/**
 * Imports cases and creates CaseItem linking with drop probabilities
 */
export async function importCases(cases: ByMykelCase[]): Promise<ImportResult> {
  const stats: ImportResult = {
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,
  };

  if (!cases || cases.length === 0) {
    return stats;
  }

  for (const caseData of cases) {
    try {
      if (!caseData.name || !caseData.id) {
        stats.failed++;
        continue;
      }

      // Generate slug from name
      const slug = caseData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Parse release date
      const releaseDate = caseData.first_sale_date
        ? new Date(caseData.first_sale_date)
        : new Date('2013-08-14');

      // Create or update case
      const caseRecord = await prisma.case.upsert({
        where: { slug },
        update: {
          name: caseData.name,
          key_price: 2.50, // Default CS:GO key price
          updated_at: new Date(),
        },
        create: {
          name: caseData.name,
          slug,
          description: caseData.description || null,
          image_url: caseData.image,
          key_price: 2.50, // Default CS:GO key price
          release_date: releaseDate,
        },
      });

      stats.processed++;
      const isNew = caseRecord.created_at.getTime() === caseRecord.updated_at.getTime();
      if (isNew) {
        stats.created++;
      } else {
        stats.updated++;
      }

      // Delete existing CaseItem links to prevent duplicates
      await prisma.caseItem.deleteMany({
        where: { case_id: caseRecord.id },
      });

      // Track which items have been linked to avoid duplicates
      const linkedItemIds = new Set<string>();

      // Link regular items with probabilities
      if (caseData.contains && caseData.contains.length > 0) {
        // Group items by rarity to calculate probabilities
        const itemsByRarity: { [key: string]: typeof caseData.contains } = {};
        for (const item of caseData.contains) {
          const rarity = item.rarity?.id || 'rarity_common';
          if (!itemsByRarity[rarity]) {
            itemsByRarity[rarity] = [];
          }
          itemsByRarity[rarity].push(item);
        }

        // Create CaseItem links
        for (const [rarity, items] of Object.entries(itemsByRarity)) {
          const probability = calculateDropProbability(rarity, items.length, false);

          for (const item of items) {
            try {
              // Find ALL items that start with this base name (all wear variants)
              // API returns "AK-47 | Redline", DB has "AK-47 | Redline (Factory New)", etc.
              const matchingItems = await prisma.item.findMany({
                where: {
                  OR: [
                    { name: item.name }, // Exact match (for items without wears)
                    { name: { startsWith: `${item.name} (` } }, // Normal variants with wear
                    { name: { startsWith: `StatTrak™ ${item.name} (` } }, // StatTrak variants
                    { name: { startsWith: `Souvenir ${item.name} (` } }, // Souvenir variants
                  ],
                },
              });

              // Link all found variants
              for (const itemRecord of matchingItems) {
                if (!linkedItemIds.has(itemRecord.id)) {
                  await prisma.caseItem.create({
                    data: {
                      case_id: caseRecord.id,
                      item_id: itemRecord.id,
                      drop_probability: probability,
                      is_special_item: false,
                    },
                  });
                  linkedItemIds.add(itemRecord.id);
                }
              }
            } catch (error) {
              console.error(`[Import] Failed to link item ${item.name} to case ${caseData.name}:`, error);
            }
          }
        }
      }

      // Link rare items (knives, gloves) with special flag
      if (caseData.contains_rare && caseData.contains_rare.length > 0) {
        const probability = calculateDropProbability('rare', caseData.contains_rare.length, true);

        for (const item of caseData.contains_rare) {
          try {
            // Find ALL variants of this knife/glove (all finishes and wears)
            // API returns "★ Navaja Knife", DB has "★ Navaja Knife | Urban Masked (Factory New)", etc.
            const matchingItems = await prisma.item.findMany({
              where: {
                OR: [
                  { name: item.name }, // Exact match (base knife without finish)
                  { name: { startsWith: `${item.name} |` } }, // Knife with finish (e.g., "★ Navaja Knife | Urban Masked")
                  { name: { startsWith: `StatTrak™ ${item.name} |` } }, // StatTrak variants
                ],
              },
            });

            // Link all found variants
            for (const itemRecord of matchingItems) {
              if (!linkedItemIds.has(itemRecord.id)) {
                await prisma.caseItem.create({
                  data: {
                    case_id: caseRecord.id,
                    item_id: itemRecord.id,
                    drop_probability: probability,
                    is_special_item: true,
                  },
                });
                linkedItemIds.add(itemRecord.id);
              }
            }
          } catch (error) {
            console.error(`[Import] Failed to link rare item ${item.name} to case ${caseData.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`[Import] Failed to import case: ${caseData.name}`, error);
      stats.failed++;
    }
  }

  return stats;
}

/**
 * Runs complete import for all item types (skins, stickers, agents, keychains, collectibles)
 */
export async function runCompleteImport(): Promise<{ [key: string]: ImportResult }> {
  const results: { [key: string]: ImportResult } = {};

  // Import skins
  console.log('[Import] Fetching skins...');
  const skins = await fetchByMykelAPI();
  console.log(`[Import] Fetched ${skins.length} skins, beginning import...`);
  results.skins = await importItems(skins);
  console.log(`[Import] Skins: ${results.skins.processed} processed, ${results.skins.created} created, ${results.skins.updated} updated, ${results.skins.failed} failed`);

  // Import stickers
  console.log('[Import] Fetching stickers...');
  const stickers = await fetchStickers();
  console.log(`[Import] Fetched ${stickers.length} stickers, beginning import...`);
  results.stickers = await importStickers(stickers);
  console.log(`[Import] Stickers: ${results.stickers.processed} processed, ${results.stickers.created} created, ${results.stickers.updated} updated, ${results.stickers.failed} failed`);

  // Import agents
  console.log('[Import] Fetching agents...');
  const agents = await fetchAgents();
  console.log(`[Import] Fetched ${agents.length} agents, beginning import...`);
  results.agents = await importAgents(agents);
  console.log(`[Import] Agents: ${results.agents.processed} processed, ${results.agents.created} created, ${results.agents.updated} updated, ${results.agents.failed} failed`);

  // Import keychains
  console.log('[Import] Fetching keychains...');
  const keychains = await fetchKeychains();
  console.log(`[Import] Fetched ${keychains.length} keychains, beginning import...`);
  results.keychains = await importKeychains(keychains);
  console.log(`[Import] Keychains: ${results.keychains.processed} processed, ${results.keychains.created} created, ${results.keychains.updated} updated, ${results.keychains.failed} failed`);

  // Import collectibles
  console.log('[Import] Fetching collectibles...');
  const collectibles = await fetchCollectibles();
  console.log(`[Import] Fetched ${collectibles.length} collectibles, beginning import...`);
  results.collectibles = await importCollectibles(collectibles);
  console.log(`[Import] Collectibles: ${results.collectibles.processed} processed, ${results.collectibles.created} created, ${results.collectibles.updated} updated, ${results.collectibles.failed} failed`);

  // Import collections (Feature 02)
  console.log('[Import] Fetching collections...');
  const collections = await fetchCollections();
  console.log(`[Import] Fetched ${collections.length} collections, beginning import...`);
  results.collections = await importCollections(collections);
  console.log(`[Import] Collections: ${results.collections.processed} processed, ${results.collections.created} created, ${results.collections.updated} updated, ${results.collections.failed} failed`);

  // Import cases (Feature 02)
  console.log('[Import] Fetching cases...');
  const casesList = await fetchCases();
  console.log(`[Import] Fetched ${casesList.length} cases, beginning import...`);
  results.cases = await importCases(casesList);
  console.log(`[Import] Cases: ${results.cases.processed} processed, ${results.cases.created} created, ${results.cases.updated} updated, ${results.cases.failed} failed`);

  return results;
}
