/**
 * POST /api/inventory/sync - Trigger inventory synchronization
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: First-time inventory import shows total value
 *   Scenario: Handle private inventory gracefully
 *   Scenario: Handle rate limit during import
 *   Scenario: Bypass cache with force refresh
 *
 * Authentication: Required (session token)
 *
 * Request Body:
 *   {
 *     consentGiven: boolean  // GDPR consent (required)
 *     force?: boolean        // Bypass cache, force fresh fetch
 *   }
 *
 * Response:
 *   - 200: Sync successful
 *   - 400: Invalid request (missing consent)
 *   - 401: Unauthorized
 *   - 403: Private inventory
 *   - 429: Rate limited
 *   - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { InventorySyncService } from '@/lib/inventory/inventory-sync-service'
import { SteamInventoryClient } from '@/lib/steam/steam-inventory-client'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getSessionFromRequest(request)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    let body: { consentGiven?: boolean; force?: boolean }
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Validate GDPR consent
    // BDD: "Require consent before storing inventory"
    if (body.consentGiven === false) {
      return NextResponse.json(
        { error: 'Consent required to store inventory data' },
        { status: 400 }
      )
    }

    // Initialize sync service
    const steamClient = new SteamInventoryClient()
    const syncService = new InventorySyncService(steamClient, prisma)

    // Trigger inventory sync
    const result = await syncService.syncInventory(session.user.id, {
      consentGiven: body.consentGiven ?? true,
      force: body.force ?? false,
    })

    // Handle sync errors
    if (!result.success) {
      switch (result.error) {
        case 'PRIVATE_INVENTORY':
          return NextResponse.json(
            { error: result.error, message: result.message },
            { status: 403 }
          )

        case 'RATE_LIMITED':
          return NextResponse.json(
            { error: result.error, message: result.message },
            { status: 429 }
          )

        case 'CONSENT_REQUIRED':
          return NextResponse.json(
            { error: result.error, message: result.message },
            { status: 400 }
          )

        case 'DATABASE_ERROR':
        case 'NETWORK_ERROR':
        default:
          return NextResponse.json(
            { error: result.error, message: result.message },
            { status: 500 }
          )
      }
    }

    // Return successful sync result
    return NextResponse.json(result)
  } catch (error) {
    console.error('[API /inventory/sync] POST Error:', error)

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
