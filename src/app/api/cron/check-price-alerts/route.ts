/**
 * Vercel Cron Job: Price Alert Checker
 *
 * BDD: features/09-price-alerts-phase1.feature (Phase 1d: Alert Triggering Logic)
 * Tests: __tests__/alert-checker.test.ts
 *
 * CRITICAL GOTCHA: Vercel serverless doesn't support persistent background processes.
 * This API route is triggered by Vercel Cron Jobs (vercel.json configuration).
 * Hobby plan limitations: 2 crons max, once daily minimum, 10-60 second max duration.
 *
 * Deployment: Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/check-price-alerts",
 *     "schedule": "every 5 minutes"
 *   }]
 * }
 *
 * Responsibilities:
 * - Fetch all active price alerts with eager loading (prevent N+1)
 * - Compare current lowest price vs target price
 * - Trigger alerts where price <= target AND cooldown elapsed (15 min)
 * - Increment triggered_count and update last_triggered_at
 * - Create AlertTrigger records for history tracking
 * - Send email/push notifications (Phase 1e/1f - implemented separately)
 * - Respect 15-minute cooldown between triggers (prevent spam)
 * - Complete within 60 seconds (Vercel timeout)
 * - Use BRIN index for price_history queries (Phase 1j performance requirement)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { emailService } from '@/lib/email/email-service'
import { pushService } from '@/lib/push/push-service'

// Force dynamic rendering (uses request.headers for authorization)
export const dynamic = 'force-dynamic'

const COOLDOWN_MINUTES = 15

/**
 * GET /api/cron/check-price-alerts
 * Triggered by Vercel Cron on schedule defined in vercel.json
 *
 * BDD Scenario: "Alert triggers when price drops below target" (line 106)
 * BDD Scenario: "Prevent duplicate triggers within cooldown period" (line 131)
 */
export async function GET(request: NextRequest) {
  try {
    // Authorization: Only allow Vercel Cron to call this endpoint
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const startTime = Date.now()

    // Step 1: Fetch all active alerts with eager loading (prevent N+1)
    // BDD Performance: "Price checker completes within time limit" (line 288)
    const activeAlerts = await prisma.priceAlert.findMany({
      where: { is_active: true },
      include: {
        item: {
          include: {
            marketplace_prices: {
              orderBy: { total_cost: 'asc' },
              take: 1 // Only fetch lowest price
            }
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            notification_email_enabled: true,
            notification_push_enabled: true
          }
        }
      }
    })

    const now = new Date()
    const alertsTriggered = []

    // Step 2: Filter alerts that should trigger
    for (const alert of activeAlerts) {
      const lowestPrice = alert.item.marketplace_prices[0]
      if (!lowestPrice) continue // No price data available

      const currentPrice = Number(lowestPrice.total_cost)
      const targetPrice = Number(alert.target_price)

      // Check price condition
      if (currentPrice > targetPrice) continue

      // Check cooldown period (15 minutes minimum between triggers)
      // BDD Scenario: "Prevent duplicate triggers within cooldown period" (line 131)
      if (alert.last_triggered_at) {
        const minutesSinceLastTrigger =
          (now.getTime() - alert.last_triggered_at.getTime()) / (1000 * 60)
        if (minutesSinceLastTrigger < COOLDOWN_MINUTES) continue
      }

      // Step 3: Trigger alert (update database)
      try {
        // Update alert record
        // BDD Scenario: "Alert triggers when price drops below target" (line 114)
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: {
            triggered_count: { increment: 1 },
            last_triggered_at: now
          }
        })

        // Create AlertTrigger record for history tracking
        // BDD Scenario: "View alert trigger history" (line 266)
        const trigger = await prisma.alertTrigger.create({
          data: {
            alert_id: alert.id,
            triggered_price: currentPrice,
            platform: lowestPrice.platform,
            listing_url: lowestPrice.listing_url || null,
            clicked: false
          }
        })

        alertsTriggered.push({
          alert_id: alert.id,
          item_name: alert.item.display_name,
          target_price: targetPrice,
          triggered_price: currentPrice,
          user_email: alert.user.email
        })

        // Phase 1e: Send email notification if notify_email = true
        // BDD Scenario: "Send email notification when alert triggers" (line 143)
        if (alert.notify_email && alert.user.email) {
          const emailResult = await emailService.sendPriceAlertEmail({
            to: alert.user.email,
            itemName: alert.item.display_name,
            targetPrice: targetPrice,
            triggeredPrice: currentPrice,
            platform: lowestPrice.platform,
            listingUrl: lowestPrice.listing_url || '',
            alertId: alert.id
          })

          // Update trigger record with email status
          if (emailResult.success) {
            await prisma.alertTrigger.update({
              where: { id: trigger.id },
              data: {
                email_sent: true,
                email_sent_at: new Date()
              }
            })
          } else {
            console.error(`Failed to send email for alert ${alert.id}:`, emailResult.error)
          }
        }

        // Phase 1f: Send push notification if notify_push = true
        // BDD Scenario: "Send push notification when alert triggers" (line 170)
        if (alert.notify_push) {
          // Fetch all push subscriptions for this user
          const subscriptions = await prisma.pushSubscription.findMany({
            where: { user_id: alert.user_id }
          })

          // Send to all subscriptions (user may have multiple devices)
          for (const sub of subscriptions) {
            const pushResult = await pushService.sendPriceAlertPush({
              subscription: {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh_key,
                  auth: sub.auth_key
                }
              },
              title: `Price Alert: ${alert.item.display_name}`,
              body: `Now $${currentPrice.toFixed(2)} - Your target: $${targetPrice.toFixed(2)}`,
              icon: alert.item.image_url,
              url: lowestPrice.listing_url || '',
              subscriptionId: sub.id
            })

            // Update trigger record with push status (once successful)
            if (pushResult.success) {
              await prisma.alertTrigger.update({
                where: { id: trigger.id },
                data: {
                  push_sent: true,
                  push_sent_at: new Date()
                }
              })
              break // Only update once even if multiple subscriptions
            } else {
              console.error(`Failed to send push for alert ${alert.id} to subscription ${sub.id}:`, pushResult.error)
              // Continue with other subscriptions even if one fails
            }
          }
        }
      } catch (error) {
        console.error(`Failed to trigger alert ${alert.id}:`, error)
        // Continue processing other alerts even if one fails
        continue
      }
    }

    const elapsedTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      alerts_checked: activeAlerts.length,
      alerts_triggered: alertsTriggered.length,
      elapsed_ms: elapsedTime,
      triggered_details: alertsTriggered
    })
  } catch (error) {
    console.error('Error in price alert checker:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}
