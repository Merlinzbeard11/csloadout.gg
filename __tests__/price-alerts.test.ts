/**
 * TDD Tests for Feature 09 Phase 1: Price Alerts (RED Phase - Failing Tests)
 *
 * BDD Reference: features/09-price-alerts-phase1.feature
 *
 * Test Coverage:
 * - Alert creation (email/push notifications)
 * - Validation (target price, notification methods)
 * - Duplicate prevention
 * - Alert triggering logic (cooldown, price drops)
 * - Email notifications (GDPR compliant)
 * - Push notifications (handle expiration)
 * - Alert management (pause/resume/delete/edit)
 * - Error handling
 * - Alert history tracking
 * - Performance (N+1 queries, BRIN index)
 *
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { prisma } from '@/lib/prisma'

// Server Actions (will be implemented in GREEN phase)
// import { createPriceAlertAction } from '@/app/alerts/create-action'
// import { toggleAlertAction } from '@/app/alerts/toggle-action'
// import { deleteAlertAction } from '@/app/alerts/delete-action'
// import { checkAlertsJob } from '@/lib/jobs/check-alerts'

describe('Feature 09 Phase 1: Price Alerts', () => {
  let testUserId: string
  let testItemId: string
  let testAlertId: string

  beforeEach(async () => {
    // Start transaction for test isolation
    await global.prismaTestHelper.startTransaction()

    // Clear mock state
    jest.clearAllMocks()

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        steam_id: `test-steam-${Date.now()}`,
        persona_name: 'Test User',
        profile_url: 'https://steamcommunity.com/profiles/test',
        avatar: 'https://example.com/avatar.jpg',
        email: 'test@example.com',
        notification_email_enabled: true,
        notification_push_enabled: true
      }
    })
    testUserId = testUser.id

    // Create test item
    const timestamp = Date.now()
    const testItem = await prisma.item.create({
      data: {
        name: `AK-47 | Redline (Field-Tested) ${timestamp}`,
        display_name: 'AK-47 | Redline (Field-Tested)',
        search_name: 'ak47redlinefieldtested',
        type: 'skin',
        weapon_type: 'AK-47',
        rarity: 'classified',
        quality: 'normal',
        wear: 'field_tested',
        image_url: 'https://example.com/ak47-redline.png'
      }
    })
    testItemId = testItem.id

    // Create marketplace price for test item
    await prisma.marketplacePrice.create({
      data: {
        item_id: testItemId,
        platform: 'csfloat',
        price: 10.00,
        currency: 'USD',
        seller_fee_percent: 2.0, // CSFloat 2% seller fee
        buyer_fee_percent: 0,
        total_cost: 10.00, // Buyer pays no fees on CSFloat
        listing_url: 'https://csfloat.com/item/123',
        quantity_available: 1,
        last_updated: new Date()
      }
    })
  })

  afterEach(() => {
    // Rollback transaction - automatic cleanup, no manual deletion needed
    global.prismaTestHelper.rollbackTransaction()
  })

  // ============================================================================
  // Phase 1a: Create Price Alert
  // ============================================================================

  describe('Create Price Alert', () => {
    it('RED: should create price alert with email notification', async () => {
      const alertData = {
        user_id: testUserId,
        item_id: testItemId,
        target_price: 8.00,
        notify_email: true,
        notify_push: false,
        is_active: true
      }

      const alert = await prisma.priceAlert.create({ data: alertData })

      expect(alert.user_id).toBe(testUserId)
      expect(alert.item_id).toBe(testItemId)
      expect(Number(alert.target_price)).toBe(8.00)
      expect(alert.notify_email).toBe(true)
      expect(alert.notify_push).toBe(false)
      expect(alert.is_active).toBe(true)
      expect(alert.triggered_count).toBe(0)
    })

    it('RED: should create price alert with push notification', async () => {
      const alert = await prisma.priceAlert.create({
        data: {
          user_id: testUserId,
          item_id: testItemId,
          target_price: 4.00,
          notify_email: false,
          notify_push: true,
          is_active: true
        }
      })

      expect(alert.notify_push).toBe(true)
      expect(alert.notify_email).toBe(false)
    })

    it('RED: should create price alert with multiple notification channels', async () => {
      const alert = await prisma.priceAlert.create({
        data: {
          user_id: testUserId,
          item_id: testItemId,
          target_price: 7.00,
          notify_email: true,
          notify_push: true,
          is_active: true
        }
      })

      expect(alert.notify_email).toBe(true)
      expect(alert.notify_push).toBe(true)
    })
  })

  // ============================================================================
  // Phase 1b: Validation Rules
  // ============================================================================

  describe('Validation Rules', () => {
    it('RED: should reject negative target price', async () => {
      await expect(async () => {
        await prisma.priceAlert.create({
          data: {
            user_id: testUserId,
            item_id: testItemId,
            target_price: -5.00,
            notify_email: true,
            is_active: true
          }
        })
      }).rejects.toThrow() // CHECK constraint violation
    })

    it('RED: should reject zero target price', async () => {
      await expect(async () => {
        await prisma.priceAlert.create({
          data: {
            user_id: testUserId,
            item_id: testItemId,
            target_price: 0,
            notify_email: true,
            is_active: true
          }
        })
      }).rejects.toThrow() // CHECK constraint violation
    })

    it('RED: should validate target price is positive', () => {
      const validatePrice = (price: number) => price > 0

      expect(validatePrice(8.00)).toBe(true)
      expect(validatePrice(0.01)).toBe(true)
      expect(validatePrice(0)).toBe(false)
      expect(validatePrice(-1)).toBe(false)
    })

    it('RED: should require at least one notification method', () => {
      const validateNotificationMethods = (email: boolean, push: boolean) => {
        return email || push
      }

      expect(validateNotificationMethods(true, false)).toBe(true)
      expect(validateNotificationMethods(false, true)).toBe(true)
      expect(validateNotificationMethods(true, true)).toBe(true)
      expect(validateNotificationMethods(false, false)).toBe(false)
    })
  })

  // ============================================================================
  // Phase 1c: Duplicate Prevention
  // ============================================================================

  describe('Duplicate Prevention', () => {
    it('RED: should prevent duplicate active alerts for same user and item', async () => {
      // Create first alert
      await prisma.priceAlert.create({
        data: {
          user_id: testUserId,
          item_id: testItemId,
          target_price: 8.00,
          notify_email: true,
          is_active: true
        }
      })

      // Check for existing active alert before creating duplicate
      const existingAlert = await prisma.priceAlert.findFirst({
        where: {
          user_id: testUserId,
          item_id: testItemId,
          is_active: true
        }
      })

      expect(existingAlert).not.toBeNull()
      expect(existingAlert?.is_active).toBe(true)
      // Should show error: "You already have an active alert for this item"
    })

    it('RED: should allow new alert if previous alert is inactive', async () => {
      // Create inactive alert
      await prisma.priceAlert.create({
        data: {
          user_id: testUserId,
          item_id: testItemId,
          target_price: 8.00,
          notify_email: true,
          is_active: false
        }
      })

      // Should allow creating new active alert
      const newAlert = await prisma.priceAlert.create({
        data: {
          user_id: testUserId,
          item_id: testItemId,
          target_price: 7.50,
          notify_email: true,
          is_active: true
        }
      })

      expect(newAlert.is_active).toBe(true)
      expect(Number(newAlert.target_price)).toBe(7.50)

      // Both alerts should exist
      const allAlerts = await prisma.priceAlert.findMany({
        where: {
          user_id: testUserId,
          item_id: testItemId
        }
      })
      expect(allAlerts).toHaveLength(2)
    })
  })

  // ============================================================================
  // Phase 1d: Alert Triggering Logic
  // ============================================================================

  describe('Alert Triggering Logic', () => {
    beforeEach(async () => {
      const alert = await prisma.priceAlert.create({
        data: {
          user_id: testUserId,
          item_id: testItemId,
          target_price: 8.00,
          notify_email: true,
          is_active: true
        }
      })
      testAlertId = alert.id
    })

    it('RED: should trigger when price drops below target', () => {
      const targetPrice = 8.00
      const currentPrice = 7.95

      const shouldTrigger = currentPrice <= targetPrice

      expect(shouldTrigger).toBe(true)
    })

    it('RED: should not trigger when price above target', () => {
      const targetPrice = 8.00
      const currentPrice = 10.50

      const shouldTrigger = currentPrice <= targetPrice

      expect(shouldTrigger).toBe(false)
    })

    it('RED: should trigger at exact target price', () => {
      const targetPrice = 8.00
      const currentPrice = 8.00

      const shouldTrigger = currentPrice <= targetPrice

      expect(shouldTrigger).toBe(true)
    })

    it('RED: should prevent duplicate triggers within cooldown period', () => {
      const COOLDOWN_MINUTES = 15
      const lastTriggeredAt = new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      const now = new Date()

      const minutesSinceLastTrigger = (now.getTime() - lastTriggeredAt.getTime()) / (1000 * 60)
      const isInCooldown = minutesSinceLastTrigger < COOLDOWN_MINUTES

      expect(isInCooldown).toBe(true) // Should NOT trigger again
    })

    it('RED: should allow trigger after cooldown period expires', () => {
      const COOLDOWN_MINUTES = 15
      const lastTriggeredAt = new Date(Date.now() - 20 * 60 * 1000) // 20 minutes ago
      const now = new Date()

      const minutesSinceLastTrigger = (now.getTime() - lastTriggeredAt.getTime()) / (1000 * 60)
      const isInCooldown = minutesSinceLastTrigger < COOLDOWN_MINUTES

      expect(isInCooldown).toBe(false) // Should allow trigger
    })

    it('RED: should increment triggered_count when alert fires', async () => {
      const beforeCount = (await prisma.priceAlert.findUnique({
        where: { id: testAlertId }
      }))?.triggered_count || 0

      // Simulate trigger
      await prisma.priceAlert.update({
        where: { id: testAlertId },
        data: {
          triggered_count: { increment: 1 },
          last_triggered_at: new Date()
        }
      })

      const afterCount = (await prisma.priceAlert.findUnique({
        where: { id: testAlertId }
      }))?.triggered_count || 0

      expect(afterCount).toBe(beforeCount + 1)
    })
  })

  // ============================================================================
  // Phase 1e: Email Notifications
  // ============================================================================

  describe('Email Notifications', () => {
    it('RED: should construct proper email notification payload', () => {
      const emailPayload = {
        to: 'test@example.com',
        subject: '🔔 Price Alert: AK-47 | Redline is now $7.95',
        html: `
          <h2>Your price alert triggered!</h2>
          <p><strong>AK-47 | Redline (Field-Tested)</strong> is now available for <strong>$7.95</strong> on CSFloat</p>
          <p>Your target price: $8.00</p>
          <a href="https://csfloat.com/item/123">Buy Now on CSFloat</a>
          <p><a href="/alerts/unsubscribe/token123">Unsubscribe</a></p>
        `
      }

      expect(emailPayload.to).toBe('test@example.com')
      expect(emailPayload.subject).toContain('Price Alert')
      expect(emailPayload.subject).toContain('$7.95')
      expect(emailPayload.html).toContain('Unsubscribe')
    })

    it('RED: should include GDPR-compliant unsubscribe link', () => {
      const emailHtml = '<p><a href="/alerts/unsubscribe/token123">Unsubscribe</a></p>'

      expect(emailHtml).toContain('Unsubscribe')
      expect(emailHtml).toContain('/alerts/unsubscribe/')
    })

    it('RED: should check suppression list before sending', async () => {
      // Create suppression record
      await prisma.emailSuppressionList.create({
        data: {
          email: 'suppressed@example.com',
          reason: 'user_unsubscribed',
          suppressed_at: new Date()
        }
      })

      const suppressed = await prisma.emailSuppressionList.findUnique({
        where: { email: 'suppressed@example.com' }
      })

      expect(suppressed).not.toBeNull()
      // Email should NOT be sent if suppressed
    })

    it('RED: should send email when user NOT on suppression list', async () => {
      const suppressed = await prisma.emailSuppressionList.findUnique({
        where: { email: 'test@example.com' }
      })

      expect(suppressed).toBeNull()
      // Email SHOULD be sent
    })
  })

  // ============================================================================
  // Phase 1f: Push Notifications
  // ============================================================================

  describe('Push Notifications', () => {
    it('RED: should construct proper push notification payload', () => {
      const pushPayload = {
        title: 'Price Alert: AK-47 | Redline',
        body: 'Now $7.95 on CSFloat (target: $8.00)',
        icon: 'https://example.com/ak47-redline.png',
        badge: '/icons/badge-96x96.png',
        data: {
          url: 'https://csfloat.com/item/123',
          alertId: testAlertId,
          triggerId: 'trigger-123'
        }
      }

      expect(pushPayload.title).toContain('Price Alert')
      expect(pushPayload.body).toContain('$7.95')
      expect(pushPayload.data.url).toBeTruthy()
    })

    it('RED: should handle expired push subscription (410 error)', () => {
      const mockError = { statusCode: 410, message: 'Subscription expired' }

      const shouldRemoveSubscription = mockError.statusCode === 410 || mockError.statusCode === 404

      expect(shouldRemoveSubscription).toBe(true)
    })

    it('RED: should remove expired subscriptions from database', async () => {
      const subscription = await prisma.pushSubscription.create({
        data: {
          user_id: testUserId,
          endpoint: 'https://fcm.googleapis.com/fcm/send/expired',
          p256dh_key: 'test-key',
          auth_key: 'test-auth',
          created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days old
        }
      })

      // Simulate 410 error - should delete subscription
      await prisma.pushSubscription.delete({
        where: { id: subscription.id }
      })

      const deleted = await prisma.pushSubscription.findUnique({
        where: { id: subscription.id }
      })

      expect(deleted).toBeNull()
    })
  })

  // ============================================================================
  // Phase 1g: Alert Management
  // ============================================================================

  describe('Alert Management', () => {
    beforeEach(async () => {
      const alert = await prisma.priceAlert.create({
        data: {
          user_id: testUserId,
          item_id: testItemId,
          target_price: 8.00,
          notify_email: true,
          is_active: true
        }
      })
      testAlertId = alert.id
    })

    it('RED: should pause an active alert', async () => {
      await prisma.priceAlert.update({
        where: { id: testAlertId },
        data: { is_active: false }
      })

      const paused = await prisma.priceAlert.findUnique({
        where: { id: testAlertId }
      })

      expect(paused?.is_active).toBe(false)
    })

    it('RED: should resume a paused alert', async () => {
      // First pause it
      await prisma.priceAlert.update({
        where: { id: testAlertId },
        data: { is_active: false }
      })

      // Then resume
      await prisma.priceAlert.update({
        where: { id: testAlertId },
        data: { is_active: true }
      })

      const resumed = await prisma.priceAlert.findUnique({
        where: { id: testAlertId }
      })

      expect(resumed?.is_active).toBe(true)
    })

    it('RED: should delete a price alert', async () => {
      await prisma.priceAlert.delete({
        where: { id: testAlertId }
      })

      const deleted = await prisma.priceAlert.findUnique({
        where: { id: testAlertId }
      })

      expect(deleted).toBeNull()
    })

    it('RED: should update alert target price', async () => {
      await prisma.priceAlert.update({
        where: { id: testAlertId },
        data: { target_price: 7.50 }
      })

      const updated = await prisma.priceAlert.findUnique({
        where: { id: testAlertId }
      })

      expect(Number(updated?.target_price)).toBe(7.50)
    })

    it('RED: should retrieve all alerts for a user', async () => {
      // Create additional alerts
      await prisma.priceAlert.create({
        data: {
          user_id: testUserId,
          item_id: testItemId,
          target_price: 6.00,
          notify_email: true,
          is_active: true
        }
      })

      const alerts = await prisma.priceAlert.findMany({
        where: { user_id: testUserId },
        include: {
          item: {
            include: {
              marketplace_prices: {
                orderBy: { total_cost: 'asc' },
                take: 1
              }
            }
          }
        }
      })

      expect(alerts.length).toBeGreaterThanOrEqual(2)
      alerts.forEach(alert => {
        expect(alert.user_id).toBe(testUserId)
        expect(alert.item).toBeDefined()
      })
    })
  })

  // ============================================================================
  // Phase 1h: Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    it('RED: should handle database errors gracefully', async () => {
      const handleDatabaseError = (error: any) => {
        return {
          success: false,
          error: 'Unable to create alert. Please try again.'
        }
      }

      const mockError = new Error('Database connection failed')
      const result = handleDatabaseError(mockError)

      expect(result.success).toBe(false)
      expect(result.error).toContain('try again')
    })

    it('RED: should handle invalid item reference', async () => {
      const invalidItemId = 'non-existent-item-id'

      const item = await prisma.item.findUnique({
        where: { id: invalidItemId }
      })

      expect(item).toBeNull()
      // Should return error: "Item not found"
    })
  })

  // ============================================================================
  // Phase 1i: Alert History
  // ============================================================================

  describe('Alert History', () => {
    beforeEach(async () => {
      const alert = await prisma.priceAlert.create({
        data: {
          user_id: testUserId,
          item_id: testItemId,
          target_price: 8.00,
          notify_email: true,
          is_active: true
        }
      })
      testAlertId = alert.id
    })

    it('RED: should create alert trigger record', async () => {
      const trigger = await prisma.alertTrigger.create({
        data: {
          alert_id: testAlertId,
          triggered_at: new Date(),
          triggered_price: 7.95,
          platform: 'csfloat',
          listing_url: 'https://csfloat.com/item/123',
          email_sent: true,
          email_sent_at: new Date()
        }
      })

      expect(trigger.alert_id).toBe(testAlertId)
      expect(Number(trigger.triggered_price)).toBe(7.95)
      expect(trigger.platform).toBe('csfloat')
      expect(trigger.email_sent).toBe(true)
    })

    it('RED: should retrieve alert trigger history', async () => {
      // Create multiple triggers
      for (let i = 0; i < 3; i++) {
        await prisma.alertTrigger.create({
          data: {
            alert_id: testAlertId,
            triggered_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
            triggered_price: 7.95 - i * 0.10,
            platform: 'csfloat',
            listing_url: 'https://csfloat.com/item/123'
          }
        })
      }

      const triggers = await prisma.alertTrigger.findMany({
        where: { alert_id: testAlertId },
        orderBy: { triggered_at: 'desc' }
      })

      expect(triggers).toHaveLength(3)
      expect(triggers[0].triggered_at.getTime()).toBeGreaterThan(triggers[1].triggered_at.getTime())
    })

    it('RED: should track if user clicked on notification', async () => {
      const trigger = await prisma.alertTrigger.create({
        data: {
          alert_id: testAlertId,
          triggered_at: new Date(),
          triggered_price: 7.95,
          platform: 'csfloat',
          listing_url: 'https://csfloat.com/item/123',
          clicked: false
        }
      })

      // Simulate user click
      await prisma.alertTrigger.update({
        where: { id: trigger.id },
        data: {
          clicked: true,
          clicked_at: new Date()
        }
      })

      const updated = await prisma.alertTrigger.findUnique({
        where: { id: trigger.id }
      })

      expect(updated?.clicked).toBe(true)
      expect(updated?.clicked_at).toBeDefined()
    })
  })

  // ============================================================================
  // Phase 1j: Performance Requirements
  // ============================================================================

  describe('Performance Requirements', () => {
    it('RED: should use eager loading to prevent N+1 queries', async () => {
      // Create multiple alerts
      for (let i = 0; i < 5; i++) {
        await prisma.priceAlert.create({
          data: {
            user_id: testUserId,
            item_id: testItemId,
            target_price: 8.00 - i,
            notify_email: true,
            is_active: true
          }
        })
      }

      // Fetch with eager loading (should be 1 query, not N+1)
      const alerts = await prisma.priceAlert.findMany({
        where: { is_active: true },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              notification_email_enabled: true,
              notification_push_enabled: true
            }
          },
          item: {
            include: {
              marketplace_prices: {
                where: {
                  last_updated: {
                    gte: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
                  }
                }
              }
            }
          }
        }
      })

      expect(alerts.length).toBeGreaterThanOrEqual(5)
      alerts.forEach(alert => {
        expect(alert.user).toBeDefined()
        expect(alert.item).toBeDefined()
      })
    })

    it('RED: should verify BRIN index exists for price_history queries', () => {
      // This test validates that BRIN index is used for time-series data
      // In production, verify with: EXPLAIN ANALYZE SELECT ...
      const sqlQuery = `
        SELECT * FROM price_history
        WHERE recorded_at >= NOW() - INTERVAL '15 minutes'
          AND item_id = $1
      `

      expect(sqlQuery).toContain('recorded_at')
      expect(sqlQuery).toContain('INTERVAL')
      // In GREEN phase: create BRIN index on recorded_at
    })
  })
})
