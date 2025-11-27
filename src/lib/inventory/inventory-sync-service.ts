/**
 * Inventory Sync Service
 *
 * Orchestrates Steam inventory fetch, item matching, and database synchronization.
 *
 * BDD Reference: features/07-inventory-import.feature
 *
 * Service Responsibilities:
 * - Orchestrate Steam inventory fetch via SteamInventoryClient
 * - Match Steam items to database items via market_hash_name
 * - Store/update UserInventory and InventoryItem records
 * - Calculate total inventory value from marketplace prices
 * - Handle privacy errors (403), rate limits (429), GDPR compliance
 *
 * Critical Gotchas Applied:
 * - Prisma interactive transactions for atomicity
 * - Fetch from Steam API BEFORE transaction (avoid network calls inside)
 * - Use transaction prisma instance (tx), not injected instance
 * - Transaction timeout: 10s for large inventories (default 5s too short)
 * - GDPR: 90-day retention, scheduled_delete timestamps
 * - Cache TTL: 6 hours to prevent rate limiting
 */

import { PrismaClient } from '@prisma/client'
import { SteamInventoryClient } from '../steam/steam-inventory-client'
import type { InventorySyncOptions, InventorySyncResult } from './types'
import type { SteamInventoryItem } from '../steam/types'

export class InventorySyncService {
  private readonly CACHE_TTL_HOURS = 6
  private readonly GDPR_RETENTION_DAYS = 90

  constructor(
    private readonly steamClient: SteamInventoryClient,
    private readonly prisma: PrismaClient
  ) {}

  /**
   * Sync user's Steam inventory to database
   *
   * BDD: Scenario "First-time inventory import shows total value"
   * BDD: Scenario "Handle private inventory gracefully"
   * BDD: Scenario "Auto-delete stale inventories (90-day retention)"
   */
  async syncInventory(userId: string, options?: InventorySyncOptions): Promise<InventorySyncResult> {
    try {
      // Fetch user with inventory relation
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { inventory: true },
      })

      if (!user) {
        return {
          success: false,
          error: 'DATABASE_ERROR',
          message: 'User not found',
        }
      }

      // BDD: "Require consent before storing inventory" (GDPR)
      if (options?.consentGiven === false) {
        return {
          success: false,
          error: 'CONSENT_REQUIRED',
          message: 'User consent required to store inventory data',
        }
      }

      // BDD: "Cache prevents redundant API calls" (6-hour TTL)
      if (user.inventory && !options?.force) {
        const cacheAge = Date.now() - user.inventory.last_synced.getTime()
        const cacheAgeHours = cacheAge / (1000 * 60 * 60)

        if (cacheAgeHours < this.CACHE_TTL_HOURS) {
          // Return cached result
          return {
            success: true,
            itemsImported: user.inventory.total_items,
            totalValue: parseFloat(user.inventory.total_value.toString()),
            cached: true,
          }
        }
      }

      // Fetch inventory from Steam API (BEFORE transaction - avoid network calls inside)
      // BDD: "Fetch inventory from Steam API with pagination"
      const steamResult = await this.steamClient.fetchInventory(user.steam_id)

      // Handle Steam API errors
      if (!steamResult.success) {
        return await this.handleSteamApiError(userId, steamResult.error, steamResult.message)
      }

      // Match items to database and calculate value (BEFORE transaction)
      const matchedItems = await this.matchItemsToDatabase(steamResult.items)

      // Calculate total value
      const totalValue = matchedItems.reduce((sum, item) => sum + (item.currentValue || 0), 0)

      // Use interactive transaction for database operations
      // BDD: "Transaction rollback if item insertion fails"
      const result = await this.prisma.$transaction(
        async (tx) => {
          // Upsert UserInventory
          const inventory = await tx.userInventory.upsert({
            where: { user_id: userId },
            create: {
              user_id: userId,
              steam_id: user.steam_id,
              total_items: steamResult.totalCount,
              total_value: totalValue,
              sync_status: 'success',
              is_public: true,
              consent_given: options?.consentGiven ?? true,
              consent_date: options?.consentGiven ? new Date() : undefined,
              scheduled_delete: this.calculateScheduledDelete(user.last_login),
            },
            update: {
              total_items: steamResult.totalCount,
              total_value: totalValue,
              sync_status: 'success',
              is_public: true,
              last_synced: new Date(),
              error_message: null,
              scheduled_delete: this.calculateScheduledDelete(user.last_login),
            },
          })

          // Delete existing inventory items (will be replaced with fresh data)
          await tx.inventoryItem.deleteMany({
            where: { inventory_id: inventory.id },
          })

          // Insert inventory items
          // BDD: "Store inventory items with Steam asset IDs"
          if (matchedItems.length > 0) {
            await tx.inventoryItem.createMany({
              data: matchedItems.map((item) => ({
                inventory_id: inventory.id,
                item_id: item.itemId,
                steam_asset_id: item.steamAssetId,
                market_hash_name: item.marketHashName,
                custom_name: item.customName,
                float_value: item.floatValue,
                wear: item.wear,
                quality: item.quality,
                stickers: item.stickers ? JSON.parse(JSON.stringify(item.stickers)) : undefined,
                can_trade: item.isTradable,
                trade_hold_until: item.tradeHoldUntil,
                current_value: item.currentValue,
                best_platform: item.bestPlatform,
                icon_url: item.iconUrl,
              })),
            })
          }

          return {
            success: true,
            itemsImported: steamResult.totalCount,
            unmatchedItems: matchedItems.filter((item) => !item.itemId).length,
            totalValue,
            cached: false,
          }
        },
        {
          timeout: 10000, // 10s timeout for large inventories
        }
      )

      return result
    } catch (error) {
      console.error('Inventory sync error:', error)
      return {
        success: false,
        error: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown database error',
      }
    }
  }

  /**
   * Handle Steam API errors and update inventory status
   *
   * BDD: "Handle private inventory gracefully"
   * BDD: "Handle rate limit during import"
   */
  private async handleSteamApiError(
    userId: string,
    error?: string,
    message?: string
  ): Promise<InventorySyncResult> {
    // Map error to sync_status
    const syncStatus =
      error === 'PRIVATE_INVENTORY' ? 'private' : error === 'RATE_LIMITED' ? 'rate_limited' : 'error'

    // Update UserInventory with error state
    await this.prisma.userInventory.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        steam_id: (await this.prisma.user.findUnique({ where: { id: userId } }))!.steam_id,
        sync_status: syncStatus,
        is_public: error === 'PRIVATE_INVENTORY' ? false : true,
        error_message: message,
      },
      update: {
        sync_status: syncStatus,
        is_public: error === 'PRIVATE_INVENTORY' ? false : true,
        error_message: message,
        last_synced: new Date(),
      },
    })

    return {
      success: false,
      error: error as any,
      message,
    }
  }

  /**
   * Match Steam items to database items via market_hash_name
   *
   * BDD: "Match items to database via market_hash_name"
   * BDD: "Store unmatched items with NULL item_id"
   */
  private async matchItemsToDatabase(
    steamItems: SteamInventoryItem[]
  ): Promise<Array<MatchedInventoryItem>> {
    // Extract unique market hash names
    const marketHashNames = Array.from(new Set(steamItems.map((item) => item.marketHashName)))

    // Fetch matching database items with their prices
    const dbItems = await this.prisma.item.findMany({
      where: {
        display_name: { in: marketHashNames },
      },
      include: {
        marketplace_prices: {
          orderBy: {
            total_cost: 'asc', // Get best price first
          },
          take: 1,
        },
      },
    })

    // Create lookup map: market_hash_name → database item
    const itemLookup = new Map(dbItems.map((item) => [item.display_name, item]))

    // Match Steam items to database items
    return steamItems.map((steamItem) => {
      const dbItem = itemLookup.get(steamItem.marketHashName)
      const price = dbItem?.marketplace_prices[0]

      return {
        steamAssetId: steamItem.assetId,
        marketHashName: steamItem.marketHashName,
        itemId: dbItem?.id ?? null, // NULL if no match
        customName: steamItem.customName,
        floatValue: steamItem.floatValue,
        wear: steamItem.wear,
        quality: steamItem.quality,
        stickers: steamItem.stickerDescriptions,
        isTradable: steamItem.isTradable,
        tradeHoldUntil: steamItem.tradeHoldUntil,
        currentValue: price ? parseFloat(price.price.toString()) : null, // Use lowest_price, not total_cost
        bestPlatform: price?.platform ?? null,
        iconUrl: steamItem.iconUrl,
      }
    })
  }

  /**
   * Calculate scheduled_delete timestamp for GDPR compliance
   *
   * BDD: "Auto-delete stale inventories (90-day retention)"
   *
   * Users inactive for >90 days have inventory scheduled for deletion
   */
  private calculateScheduledDelete(lastLogin: Date | null): Date | null {
    if (!lastLogin) return null

    const daysSinceLogin = (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceLogin > this.GDPR_RETENTION_DAYS) {
      // User already inactive - schedule for deletion
      return new Date(lastLogin.getTime() + this.GDPR_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    }

    return null
  }
}

/**
 * Internal type for matched inventory items
 */
interface MatchedInventoryItem {
  steamAssetId: string
  marketHashName: string
  itemId: string | null
  customName?: string
  floatValue?: number
  wear?: string
  quality?: string
  stickers?: string[]
  isTradable: boolean
  tradeHoldUntil?: Date
  currentValue: number | null
  bestPlatform: string | null
  iconUrl?: string
}
