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

    // Fetch user's inventory
    const inventory = await prisma.userInventory.findUnique({
      where: { user_id: session.user.id },
      include: {
        items: {
          take: 100, // Limit initial load for performance
          orderBy: {
            current_value: 'desc', // Most valuable items first
          },
        },
      },
    })

    if (!inventory) {
      return NextResponse.json({ error: 'No inventory found for this user' }, { status: 404 })
    }

    // Return inventory data
    return NextResponse.json(inventory)
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
