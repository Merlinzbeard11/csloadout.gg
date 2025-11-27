/**
 * GET /api/inventory - Get user's cached inventory
 * DELETE /api/inventory - Delete inventory data (GDPR)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Cache prevents redundant API calls
 *   Scenario: Delete inventory data (GDPR Article 17 - Right to be Forgotten)
 *
 * Authentication: Required (session token)
 *
 * GET Response:
 *   - 200: Inventory object with items
 *   - 401: Unauthorized (no session or expired)
 *   - 404: No inventory found
 *   - 500: Server error
 *
 * DELETE Response:
 *   - 200: Successfully deleted
 *   - 401: Unauthorized
 *   - 404: No inventory found
 *   - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getSessionFromRequest(request)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse pagination params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Max 100 per page
    const offset = parseInt(searchParams.get('offset') || '0')

    // Filter for tradeable items (excluding permanently non-tradeable items)
    const itemFilter = {
      OR: [
        { can_trade: true }, // Currently tradeable
        { trade_hold_until: { not: null } }, // Trade-locked but will become tradeable
      ],
      // Only exclude items that can NEVER be traded
      NOT: {
        OR: [
          { market_hash_name: { contains: 'Veteran Coin' } },
          { market_hash_name: { contains: 'Service Medal' } },
          { market_hash_name: { endsWith: 'Badge' } },
          { market_hash_name: { contains: 'Loyalty Badge' } },
        ]
      }
    }

    // Fetch user's inventory with pagination
    // Include item relation to get image_url from Item table
    const inventory = await prisma.userInventory.findUnique({
      where: { user_id: session.user.id },
      include: {
        items: {
          where: itemFilter,
          skip: offset,
          take: limit,
          orderBy: {
            current_value: 'desc', // Most valuable items first
          },
          select: {
            id: true,
            steam_asset_id: true,
            market_hash_name: true,
            custom_name: true,
            float_value: true,
            wear: true,
            quality: true,
            stickers: true,
            can_trade: true,
            trade_hold_until: true,
            current_value: true,
            best_platform: true,
            icon_url: true, // Fallback image from Steam
            item: {
              select: {
                image_url: true,
                rarity: true,
              },
            },
          },
        },
      },
    })

    if (!inventory) {
      return NextResponse.json({ error: 'No inventory found for this user' }, { status: 404 })
    }

    // Get total count and sum of filtered items for accurate stats
    const [totalCount, valueAggregate] = await Promise.all([
      prisma.inventoryItem.count({
        where: {
          inventory_id: inventory.id,
          ...itemFilter,
        },
      }),
      prisma.inventoryItem.aggregate({
        where: {
          inventory_id: inventory.id,
          ...itemFilter,
        },
        _sum: {
          current_value: true,
        },
      }),
    ])

    // Calculate filtered total value (sum of all filtered items)
    const filteredTotalValue = valueAggregate._sum.current_value || 0

    // Return inventory data with pagination info
    return NextResponse.json({
      ...inventory,
      // Override total values with filtered calculations
      total_items: totalCount,
      total_value: filteredTotalValue,
      pagination: {
        offset,
        limit,
        total: totalCount,
        hasMore: offset + inventory.items.length < totalCount,
      },
    })
  } catch (error) {
    console.error('[API /inventory] GET Error:', error)

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getSessionFromRequest(request)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete user's inventory (cascade deletes InventoryItems)
    // BDD: "Delete inventory data (GDPR Article 17 - Right to be Forgotten)"
    try {
      await prisma.userInventory.delete({
        where: { user_id: session.user.id },
      })

      return NextResponse.json({
        success: true,
        message: 'Inventory data deleted successfully',
      })
    } catch (error: any) {
      // Handle case where inventory doesn't exist
      if (error.code === 'P2025') {
        // Prisma "Record not found" error
        return NextResponse.json({ error: 'No inventory found for this user' }, { status: 404 })
      }

      throw error
    }
  } catch (error) {
    console.error('[API /inventory] DELETE Error:', error)

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
