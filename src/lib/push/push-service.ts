/**
 * Push Notification Service - web-push Integration
 *
 * BDD: features/09-price-alerts-phase1.feature (Phase 1f: Push Notifications)
 * Tests: __tests__/push-notifications.test.ts
 *
 * Technology: web-push library (npm package)
 * - Zero cost, unlimited subscribers
 * - Full control, no vendor lock-in
 * - VAPID authentication for security
 *
 * Responsibilities:
 * - Send push notifications using Web Push API
 * - Handle 410 Gone errors (expired subscriptions)
 * - Remove expired subscriptions from database
 * - Log push sending attempts
 * - Format notification payload
 *
 * Environment Variables Required:
 * - NEXT_PUBLIC_VAPID_PUBLIC_KEY: VAPID public key (client-side)
 * - VAPID_PRIVATE_KEY: VAPID private key (server-side only)
 * - VAPID_SUBJECT: Contact email (mailto:admin@csloadout.gg)
 */

import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

// Configure VAPID details (only if keys are available)
// In test environment, this might not be set - tests will mock webpush.sendNotification
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@csloadout.gg'
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

export interface IPushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface ISendPushParams {
  subscription: IPushSubscription
  title: string
  body: string
  icon: string
  url: string
  subscriptionId?: string // Optional for 410 error handling
}

export interface IPushResult {
  success: boolean
  error?: string
  payload?: {
    title: string
    body: string
    icon: string
    data: {
      url: string
    }
  }
}

class PushService {
  /**
   * Send price alert push notification
   * BDD Scenario: "Send push notification when alert triggers" (line 170)
   */
  async sendPriceAlertPush(params: ISendPushParams): Promise<IPushResult> {
    try {
      const { subscription, title, body, icon, url, subscriptionId } = params

      // Construct notification payload
      // BDD: notification title, body, icon, click action URL (lines 175-178)
      const payload = {
        title,
        body,
        icon,
        data: {
          url // Clicking notification opens this URL
        }
      }

      // Send push notification using web-push
      await webpush.sendNotification(
        subscription,
        JSON.stringify(payload)
      )

      return {
        success: true,
        payload
      }
    } catch (error: any) {
      // BDD Scenario: "Handle expired push subscription gracefully" (line 180)
      // Catch 410 Gone errors (expired subscription)
      if (error.statusCode === 410 && params.subscriptionId) {
        console.log(`Push subscription expired (410): ${params.subscriptionId}`)

        // Remove expired subscription from database
        await prisma.pushSubscription.delete({
          where: { id: params.subscriptionId }
        }).catch(err => {
          console.error('Failed to delete expired subscription:', err)
        })

        return {
          success: false,
          error: '410 Gone - Subscription expired and removed'
        }
      }

      console.error('Push notification error:', error)
      return {
        success: false,
        error: error.message || 'Failed to send push notification'
      }
    }
  }

  /**
   * Get VAPID public key for client-side subscription
   */
  getPublicVapidKey(): string {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
  }
}

export const pushService = new PushService()
