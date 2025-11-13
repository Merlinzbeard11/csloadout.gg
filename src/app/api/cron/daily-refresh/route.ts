/**
 * Daily Auto-Refresh Cron Job API Route
 *
 * BDD Reference: features/07-inventory-import.feature (lines 319-325)
 * Scenario: Daily auto-refresh for active users
 *
 * Requirements:
 * - Runs daily at 2:00 AM UTC (configured in vercel.json)
 * - Refreshes active users (logged in within last 7 days)
 * - Only processes stale inventory (last_synced > 24 hours)
 * - Adds 5-second delay between users (rate limit protection)
 * - No user notifications sent
 * - Secured with CRON_SECRET environment variable
 *
 * Security:
 * - Validates Authorization: Bearer {CRON_SECRET} header
 * - Only accessible from Vercel Cron (production deployments)
 * - Returns 401 Unauthorized if secret doesn't match
 *
 * Rate Limiting:
 * - 5-second delay between user processing
 * - Prevents Steam API rate limits
 * - Runs during low-traffic hours (2:00 AM UTC)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { refreshInventoryData } from '@/actions/inventory'

/**
 * Delay helper for rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * GET /api/cron/daily-refresh
 *
 * Vercel Cron Job Handler
 * Triggered daily at 2:00 AM UTC via vercel.json configuration
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Step 1: Validate CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret) {
    console.error('[CRON] CRON_SECRET environment variable not configured')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  const token = authHeader?.replace('Bearer ', '')

  if (token !== expectedSecret) {
    console.warn('[CRON] Unauthorized cron job access attempt')
    return NextResponse.json(
      { error: 'Unauthorized - Invalid CRON_SECRET' },
      { status: 401 }
    )
  }

  console.log('[CRON] Daily auto-refresh job started')

  // Step 2: Find eligible users
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS)
  const twentyFourHoursAgo = new Date(Date.now() - TWENTY_FOUR_HOURS_MS)

  // Query active users with stale inventory
  const eligibleUsers = await prisma.user.findMany({
    where: {
      // Active: Logged in within last 7 days
      last_login: {
        gte: sevenDaysAgo
      },
      // Has inventory that needs refresh (one-to-one relationship)
      inventory: {
        // Stale: Last synced more than 24 hours ago
        last_synced: {
          lte: twentyFourHoursAgo
        },
        // Only process successful/public inventories
        sync_status: 'success',
        is_public: true,
        consent_given: true
      }
    },
    select: {
      id: true,
      steam_id: true,
      persona_name: true
    }
  })

  console.log(`[CRON] Found ${eligibleUsers.length} eligible users for refresh`)

  // Step 3: Process users with rate limiting
  let usersProcessed = 0
  const errors: Array<{ steamId: string; error: string }> = []

  for (let i = 0; i < eligibleUsers.length; i++) {
    const user = eligibleUsers[i]

    try {
      console.log(`[CRON] Refreshing inventory for ${user.persona_name} (${user.steam_id})`)

      // TODO: Fix this - refreshInventoryData doesn't support steam_id parameter
      // const result = await refreshInventoryData(user.steam_id)
      const result = { success: false, error: 'Not implemented' } as any

      if (result.success) {
        usersProcessed++
        console.log(`[CRON] ✓ Successfully refreshed ${user.steam_id}`)
      } else {
        errors.push({
          steamId: user.steam_id,
          error: result.message
        })
        console.warn(`[CRON] ✗ Failed to refresh ${user.steam_id}: ${result.message}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push({
        steamId: user.steam_id,
        error: errorMessage
      })
      console.error(`[CRON] ✗ Exception refreshing ${user.steam_id}:`, errorMessage)
    }

    // Add 5-second delay between users (except after last user)
    if (i < eligibleUsers.length - 1) {
      await delay(5000) // 5 seconds
    }
  }

  // Step 4: Return statistics
  const duration = Date.now() - startTime

  const response = {
    success: true,
    usersProcessed,
    totalEligible: eligibleUsers.length,
    errors: errors.length > 0 ? errors : undefined,
    duration: `${Math.round(duration / 1000)}s`,
    timestamp: new Date().toISOString()
  }

  console.log(`[CRON] Daily auto-refresh completed:`, response)

  return NextResponse.json(response)
}
