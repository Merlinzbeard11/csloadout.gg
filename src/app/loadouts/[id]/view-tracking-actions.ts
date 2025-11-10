'use server'

/**
 * Phase 7e: View Tracking Server Actions
 *
 * BDD: features/08-budget-loadout-builder-phase7.feature (lines 208-243)
 * Tests: __tests__/view-analytics.test.ts
 *
 * Responsibilities:
 * - Track unique views with IP-based deduplication
 * - Hash IP addresses with SHA-256 + salt (GDPR compliant)
 * - 24-hour deduplication window (same IP within 24h doesn't increment)
 * - Only track views on public loadouts
 * - Atomic view record creation + count increment
 * - Extract client IP from x-forwarded-for header
 */

import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { headers } from 'next/headers'

interface TrackViewResult {
  success: boolean
  message?: string
  error?: string
  viewCount?: number
}

/**
 * Track a view on a loadout with IP-based deduplication
 *
 * BDD Scenarios:
 * - Track unique view from new IP (lines 208-218)
 * - Deduplicate views within 24 hours (lines 220-230)
 * - Track views only on public loadouts (lines 232-237)
 * - Handle edge cases (null IP, invalid loadout) (lines 239-243)
 */
export async function trackLoadoutViewAction(
  loadoutId: string
): Promise<TrackViewResult> {
  try {
    // Get client IP from headers
    const headersList = await headers()
    const forwardedFor = headersList.get('x-forwarded-for')
    const realIp = headersList.get('x-real-ip')

    // Extract IP (priority: x-forwarded-for first IP, x-real-ip, fallback)
    let clientIp: string
    if (forwardedFor) {
      // x-forwarded-for can be: "client, proxy1, proxy2"
      // First IP is the original client
      clientIp = forwardedFor.split(',')[0].trim()
    } else if (realIp) {
      clientIp = realIp
    } else {
      // Fallback for local development or missing headers
      clientIp = 'unknown'
    }

    // Hash IP with salt (GDPR compliance - never store original IP)
    const salt = process.env.HASH_SALT || 'default-development-salt-change-in-production'
    const ipHash = crypto
      .createHash('sha256')
      .update(clientIp + salt)
      .digest('hex')

    // Fetch loadout to verify it exists and is public
    const loadout = await prisma.loadout.findUnique({
      where: { id: loadoutId },
      select: {
        id: true,
        is_public: true,
        views: true
      }
    })

    // Loadout not found
    if (!loadout) {
      return {
        success: false,
        error: 'Loadout not found'
      }
    }

    // Only track views on public loadouts
    if (!loadout.is_public) {
      return {
        success: false,
        error: 'Views are only tracked on public loadouts'
      }
    }

    // Check for existing view within 24 hours (deduplication)
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    const existingView = await prisma.loadoutView.findFirst({
      where: {
        loadout_id: loadoutId,
        viewer_ip_hash: ipHash,
        viewed_at: {
          gte: twentyFourHoursAgo
        }
      }
    })

    // Deduplicate: same IP within 24h doesn't increment
    if (existingView) {
      return {
        success: true,
        message: 'View already tracked (within 24 hours)',
        viewCount: loadout.views
      }
    }

    // Track new view (atomic transaction)
    const result = await prisma.$transaction(async (tx) => {
      // Create view record
      await tx.loadoutView.create({
        data: {
          loadout_id: loadoutId,
          viewer_ip_hash: ipHash
        }
      })

      // Increment view count
      const updated = await tx.loadout.update({
        where: { id: loadoutId },
        data: { views: { increment: 1 } },
        select: { views: true }
      })

      return { viewCount: updated.views }
    })

    return {
      success: true,
      message: 'View tracked successfully',
      viewCount: result.viewCount
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error tracking view:', errorMessage, error)

    return {
      success: false,
      error: `Failed to track view: ${errorMessage}`
    }
  }
}

/**
 * Get view analytics for a loadout
 * Returns total views and recent view activity
 */
export async function getViewAnalyticsAction(loadoutId: string) {
  try {
    // Get loadout with view count
    const loadout = await prisma.loadout.findUnique({
      where: { id: loadoutId },
      select: {
        views: true,
        is_public: true
      }
    })

    if (!loadout) {
      return {
        success: false,
        error: 'Loadout not found'
      }
    }

    // Get view records for last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentViews = await prisma.loadoutView.findMany({
      where: {
        loadout_id: loadoutId,
        viewed_at: {
          gte: sevenDaysAgo
        }
      },
      orderBy: {
        viewed_at: 'desc'
      },
      take: 100 // Limit to 100 most recent views
    })

    // Group views by day for analytics
    const viewsByDay = recentViews.reduce((acc, view) => {
      const day = view.viewed_at.toISOString().split('T')[0]
      acc[day] = (acc[day] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      success: true,
      totalViews: loadout.views,
      recentViewCount: recentViews.length,
      viewsByDay,
      isPublic: loadout.is_public
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error fetching view analytics:', errorMessage, error)

    return {
      success: false,
      error: `Failed to fetch analytics: ${errorMessage}`
    }
  }
}
