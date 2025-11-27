/**
 * POST /api/inventory/prices - Update inventory items with Steam Market prices
 *
 * Fetches current lowest prices from Steam Market and updates inventory items.
 * Rate-limited to ~20 requests/minute to respect Steam's API limits.
 *
 * Authentication: Required (session token)
 *
 * Response:
 *   - 200: { updated: number, total: number, message: string }
 *   - 401: Unauthorized
 *   - 404: No inventory found
 *   - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { updateInventoryPrices } from '@/lib/price/steam-market-price-service'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getSessionFromRequest(request)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update prices
    const result = await updateInventoryPrices(session.user.id)

    return NextResponse.json({
      success: true,
      updated: result.updated,
      total: result.total,
      message: `Updated ${result.updated} of ${result.total} items with current Steam Market prices`,
    })
  } catch (error) {
    console.error('[API /inventory/prices] POST Error:', error)

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
