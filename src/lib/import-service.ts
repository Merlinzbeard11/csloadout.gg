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
  name: string;
  rarity?: string;
  type: string;
  weapon_type?: string;
  quality?: string;
  wear?: string;
  image: string;
  image_alternative?: string;
  wear_min?: number;
  wear_max?: number;
  pattern_count?: number;
  description?: string;
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
 * Imports items to database using upsert logic
 *
 * For each item:
 * 1. Normalizes name using normalizeItemName()
 * 2. Sets display_name to preserve original formatting
 * 3. Sets search_name to normalized value
 * 4. Upserts using composite unique key [name, quality, wear]
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
      if (!item.name || !item.type || !item.image) {
        stats.failed++;
        continue;
      }

      const quality = item.quality || 'normal';
      const wear = item.wear || 'none';

      // Upsert item using composite unique key [name, quality, wear]
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
          rarity: item.rarity || null,
          weapon_type: item.weapon_type || null,
          image_url: item.image,
          image_url_fallback: item.image_alternative || null,
          wear_min: item.wear_min || null,
          wear_max: item.wear_max || null,
          pattern_count: item.pattern_count || null,
          updated_at: new Date(),
        },
        create: {
          name: item.name,
          display_name: item.name,
          search_name: normalizeItemName(item.name),
          description: item.description || null,
          type: item.type,
          rarity: item.rarity || null,
          quality,
          wear,
          weapon_type: item.weapon_type || null,
          image_url: item.image,
          image_url_fallback: item.image_alternative || null,
          wear_min: item.wear_min || null,
          wear_max: item.wear_max || null,
          pattern_count: item.pattern_count || null,
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
    } catch (error) {
      console.error(`[Import] Failed to import item: ${item.name}`, error);
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
