/**
 * Push Subscription API - Unsubscribe Endpoint
 *
 * BDD: features/09-price-alerts-phase1.feature (Phase 1f: Push Notifications)
 *
 * Responsibilities:
 * - Remove push subscription from database
 * - Require authentication (user can only delete their own subscriptions)
 *
 * URL: DELETE /api/push/unsubscribe
 * Body: { endpoint }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth/session'

export async function DELETE(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth()

    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint required' },
        { status: 400 }
      )
    }

    // Find subscription
    const subscription = await prisma.pushSubscription.findUnique({
      where: { endpoint }
    })

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }

    // Authorization: verify user owns subscription
    if (subscription.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Delete subscription
    await prisma.pushSubscription.delete({
      where: { endpoint }
    })

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Push unsubscribe error:', error)
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    )
  }
}
