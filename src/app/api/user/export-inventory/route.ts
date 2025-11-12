/**
 * GDPR Data Export API Route
 *
 * BDD Reference: features/07-inventory-import.feature (lines 347-356)
 * Scenario: Export inventory data (GDPR Article 15)
 *
 * Compliance:
 * - GDPR Article 15: Right of Access
 * - GDPR Article 20: Right to Data Portability
 * - Response within 30 days (immediate in this implementation)
 *
 * Requirements:
 * - Authenticated users can export their complete inventory data
 * - Export includes: inventory metadata, all items, pricing data, sync history
 * - Format: JSON (machine-readable, portable format)
 * - Filename: inventory-export-{timestamp}.json
 * - Includes GDPR compliance statement
 *
 * Security:
 * - Requires authenticated session
 * - Users can only export their own data
 * - No sensitive credentials included in export
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/user/export-inventory
 *
 * Export user's complete inventory data in GDPR-compliant JSON format
 */
export async function GET(request: NextRequest) {
  // Step 1: Verify authentication
  const session = await getSession()

  if (!session || !session.user) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    )
  }

  const userId = session.user.id

  try {
    // Step 2: Fetch user's complete inventory data
    const inventory = await prisma.userInventory.findUnique({
      where: { user_id: userId },
      include: {
        items: {
          include: {
            item: true // Include Item details (name, display_name, rarity, etc.)
          }
        }
      }
    })

    // Step 3: Fetch all marketplace prices for items in inventory
    let pricingData: Record<string, Array<{
      platform: string
      price: number
      currency: string
      lastUpdated: string
    }>> = {}

    if (inventory && inventory.items.length > 0) {
      const itemIds = inventory.items.map(invItem => invItem.item_id)

      const prices = await prisma.marketplacePrice.findMany({
        where: {
          item_id: { in: itemIds }
        }
      })

      // Group prices by item_id
      prices.forEach(price => {
        if (!pricingData[price.item_id]) {
          pricingData[price.item_id] = []
        }
        pricingData[price.item_id].push({
          platform: price.platform,
          price: Number(price.price),
          currency: price.currency,
          lastUpdated: price.last_updated.toISOString()
        })
      })
    }

    // Step 4: Build export data structure
    const exportData = {
      // GDPR compliance statement
      gdprCompliance: 'This export complies with GDPR Article 15 (Right of Access) and Article 20 (Right to Data Portability). Your personal data is provided in a structured, commonly used, and machine-readable format.',

      // Export metadata
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        userId: userId,
        steamId: session.user.steamId
      },

      // Inventory metadata
      metadata: {
        totalItems: inventory?.total_items || 0,
        totalValue: inventory ? Number(inventory.total_value) : 0,
        lastSynced: inventory?.last_synced?.toISOString() || null,
        syncStatus: inventory?.sync_status || 'no_inventory',
        isPublic: inventory?.is_public || false,
        consentGiven: inventory?.consent_given || false
      },

      // Sync history
      syncHistory: {
        lastSynced: inventory?.last_synced?.toISOString() || null,
        syncStatus: inventory?.sync_status || 'no_inventory',
        errorMessage: inventory?.error_message || null,
        consentDate: inventory?.consent_date?.toISOString() || null,
        consentIpAddress: inventory?.consent_ip_address || null,
        consentMethod: inventory?.consent_method || null,
        consentVersion: inventory?.consent_version || null
      },

      // All inventory items
      items: inventory?.items.map(invItem => ({
        steamAssetId: invItem.steam_asset_id,
        marketHashName: invItem.market_hash_name,
        itemName: invItem.item.display_name,
        currentValue: Number(invItem.current_value),
        bestPlatform: invItem.best_platform,
        wear: invItem.wear,
        quality: invItem.quality,
        rarity: invItem.item.rarity,
        type: invItem.item.type,
        customName: invItem.custom_name,
        canTrade: invItem.can_trade,
        tradeHoldUntil: invItem.trade_hold_until?.toISOString() || null,
        stickers: invItem.stickers as Array<{ name: string; position: number }> | null,
        // Pricing data for this item
        pricing: pricingData[invItem.item_id] || []
      })) || []
    }

    // Step 5: Generate timestamped filename
    const timestamp = Date.now()
    const filename = `inventory-export-${timestamp}.json`

    // Step 6: Return JSON with proper headers
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('[EXPORT] Error exporting inventory data:', error)
    return NextResponse.json(
      { error: 'Failed to export inventory data' },
      { status: 500 }
    )
  }
}
