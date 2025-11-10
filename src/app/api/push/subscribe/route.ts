/**
 * Push Subscription API - Subscribe Endpoint
 *
 * BDD: features/09-price-alerts-phase1.feature (Phase 1f: Push Notifications)
 *
 * Responsibilities:
 * - Save push subscription to database
 * - Associate subscription with authenticated user
 * - Validate subscription format
 * - Handle duplicate subscriptions (upsert)
 *
 * URL: POST /api/push/subscribe
 * Body: { endpoint, keys: { p256dh, auth } }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth()

    const body = await request.json()
    const { endpoint, keys } = body

    // Validation
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription format' },
        { status: 400 }
      )
    }

    // Save subscription to database (upsert to handle re-subscriptions)
    const subscription = await prisma.pushSubscription.upsert({
      where: {
        endpoint: endpoint
      },
      create: {
        user_id: session.user.id,
        endpoint: endpoint,
        p256dh_key: keys.p256dh,
        auth_key: keys.auth,
        user_agent: request.headers.get('user-agent') || 'Unknown'
      },
      update: {
        p256dh_key: keys.p256dh,
        auth_key: keys.auth,
        user_agent: request.headers.get('user-agent') || 'Unknown',
        updated_at: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        endpoint: subscription.endpoint
      }
    })
  } catch (error) {
    console.error('Push subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    )
  }
}
