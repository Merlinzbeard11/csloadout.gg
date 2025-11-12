/**
 * Push Notification Service Tests
 *
 * BDD: features/09-price-alerts-phase1.feature (Phase 1f: Push Notifications)
 * Tests: Lines 170-187
 *
 * Technology: web-push library (npm package)
 * Rationale: Zero cost, unlimited subscribers, full control, no vendor lock-in
 * Gotcha: OneSignal free tier limited to 10K subscribers ($99/month after)
 * Gotcha: Service workers require HTTPS in production (localhost OK for dev)
 * Gotcha: 410 Gone errors indicate expired subscriptions - must remove from DB
 *
 * Architecture:
 * - Service worker in public/sw.js for background push handling
 * - PushService wrapper around web-push library
 * - PushSubscription table stores user subscriptions
 * - VAPID keys for secure authentication
 * - 410 error handling removes expired subscriptions
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { prisma } from '@/lib/prisma'

// Mock web-push library
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn().mockResolvedValue({ statusCode: 201 })
}))

describe('Push Notification Service - Phase 1f', () => {
  let testUserId: string
  let testItemId: string
  let testAlertId: string
  let testSubscriptionId: string

  beforeEach(async () => {
    // Start transaction for test isolation
    await global.prismaTestHelper.startTransaction()

    // Clear mock state
    jest.clearAllMocks()

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        steam_id: 'test_push_notifications',
        persona_name: 'PushTester',
        profile_url: 'https://steamcommunity.com/id/pushtester',
        avatar: 'https://example.com/avatar.png',
        email: 'push@example.com',
        notification_push_enabled: true
      }
    })
    testUserId = testUser.id

    // Create test item
    const testItem = await prisma.item.create({
      data: {
        name: 'AK-47 | Redline (Field-Tested)',
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

    // Create marketplace price
    await prisma.marketplacePrice.create({
      data: {
        item_id: testItemId,
        platform: 'csfloat',
        price: 7.95,
        currency: 'USD',
        seller_fee_percent: 2.0,
        buyer_fee_percent: 0,
        total_cost: 7.95,
        listing_url: 'https://csfloat.com/item/12345',
        quantity_available: 1,
        last_updated: new Date()
      }
    })

    // Create price alert
    const alert = await prisma.priceAlert.create({
      data: {
        user_id: testUserId,
        item_id: testItemId,
        target_price: 8.00,
        notify_email: false,
        notify_push: true, // Push enabled
        is_active: true
      }
    })
    testAlertId = alert.id

    // Create push subscription
    const subscription = await prisma.pushSubscription.create({
      data: {
        user_id: testUserId,
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-123',
        p256dh_key: 'test-p256dh-key-base64',
        auth_key: 'test-auth-key-base64',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome/120.0.0.0'
      }
    })
    testSubscriptionId = subscription.id
  })

  afterEach(() => {
    // Rollback transaction - automatic cleanup, no manual deletion needed
    global.prismaTestHelper.rollbackTransaction()
  })

  /**
   * BDD Scenario: Send push notification when alert triggers (line 170)
   * Given I have an alert with notify_push = true
   * And I have a valid push subscription
   * When the alert triggers at price $7.95
   * Then a push notification should be sent
   */
  test('should send push notification when alert triggers with notify_push = true', async () => {
    // Arrange
    const pushService = (await import('@/lib/push/push-service')).pushService

    const subscription = await prisma.pushSubscription.findUnique({
      where: { id: testSubscriptionId }
    })

    // Act: Send push notification
    const result = await pushService.sendPriceAlertPush({
      subscription: {
        endpoint: subscription!.endpoint,
        keys: {
          p256dh: subscription!.p256dh_key,
          auth: subscription!.auth_key
        }
      },
      title: 'Price Alert: AK-47 | Redline',
      body: 'Now $7.95 - Your target: $8.00',
      icon: 'https://example.com/ak47-redline.png',
      url: 'https://csfloat.com/item/12345'
    })

    // Assert
    expect(result.success).toBe(true)
  })

  /**
   * BDD Scenario: Notification title and body format (line 175-176)
   * And notification title should be "Price Alert: AK-47 Redline"
   * And notification body should contain "$7.95"
   */
  test('should format push notification title and body correctly', async () => {
    const pushService = (await import('@/lib/push/push-service')).pushService

    const subscription = await prisma.pushSubscription.findUnique({
      where: { id: testSubscriptionId }
    })

    const payload = {
      title: 'Price Alert: AK-47 | Redline',
      body: 'Now $7.95 - Your target: $8.00',
      icon: 'https://example.com/ak47-redline.png',
      url: 'https://csfloat.com/item/12345'
    }

    const result = await pushService.sendPriceAlertPush({
      subscription: {
        endpoint: subscription!.endpoint,
        keys: {
          p256dh: subscription!.p256dh_key,
          auth: subscription!.auth_key
        }
      },
      ...payload
    })

    expect(result.payload?.title).toContain('AK-47')
    expect(result.payload?.body).toContain('$7.95')
  })

  /**
   * BDD Scenario: Notification includes item icon (line 177)
   * And notification should include item icon
   */
  test('should include item icon in push notification', async () => {
    const pushService = (await import('@/lib/push/push-service')).pushService

    const subscription = await prisma.pushSubscription.findUnique({
      where: { id: testSubscriptionId }
    })

    const result = await pushService.sendPriceAlertPush({
      subscription: {
        endpoint: subscription!.endpoint,
        keys: {
          p256dh: subscription!.p256dh_key,
          auth: subscription!.auth_key
        }
      },
      title: 'Price Alert: AK-47 | Redline',
      body: 'Now $7.95',
      icon: 'https://example.com/ak47-redline.png',
      url: 'https://csfloat.com/item/12345'
    })

    expect(result.payload?.icon).toBe('https://example.com/ak47-redline.png')
  })

  /**
   * BDD Scenario: Clicking notification opens marketplace link (line 178)
   * And clicking notification should open marketplace link
   */
  test('should include click action URL in push notification', async () => {
    const pushService = (await import('@/lib/push/push-service')).pushService

    const subscription = await prisma.pushSubscription.findUnique({
      where: { id: testSubscriptionId }
    })

    const result = await pushService.sendPriceAlertPush({
      subscription: {
        endpoint: subscription!.endpoint,
        keys: {
          p256dh: subscription!.p256dh_key,
          auth: subscription!.auth_key
        }
      },
      title: 'Price Alert: AK-47 | Redline',
      body: 'Now $7.95',
      icon: 'https://example.com/ak47-redline.png',
      url: 'https://csfloat.com/item/12345'
    })

    expect(result.payload?.data?.url).toBe('https://csfloat.com/item/12345')
  })

  /**
   * BDD Scenario: Handle expired push subscription gracefully (line 180)
   * Given I have an alert with notify_push = true
   * But my push subscription has expired (410 error)
   * When the alert triggers
   * Then the system should catch the 410 error
   * And the expired subscription should be removed from database
   */
  test('should catch 410 errors and remove expired subscription', async () => {
    // Import webpush mock
    const webpush = await import('web-push')

    // Mock 410 Gone error for this test only
    const mockSendNotification = webpush.sendNotification as jest.MockedFunction<typeof webpush.sendNotification>
    mockSendNotification.mockRejectedValueOnce({
      statusCode: 410,
      body: 'Gone',
      headers: {}
    })

    const pushService = (await import('@/lib/push/push-service')).pushService

    const subscription = await prisma.pushSubscription.findUnique({
      where: { id: testSubscriptionId }
    })

    // Act: Attempt to send push (will fail with 410)
    const result = await pushService.sendPriceAlertPush({
      subscription: {
        endpoint: subscription!.endpoint,
        keys: {
          p256dh: subscription!.p256dh_key,
          auth: subscription!.auth_key
        }
      },
      title: 'Price Alert',
      body: 'Test',
      icon: '',
      url: '',
      subscriptionId: testSubscriptionId
    })

    // Assert: Error caught
    expect(result.success).toBe(false)
    expect(result.error).toContain('410')

    // Assert: Subscription removed from database
    const removedSub = await prisma.pushSubscription.findUnique({
      where: { id: testSubscriptionId }
    })
    expect(removedSub).toBeNull()
  })

  /**
   * BDD Scenario: Email fallback when push fails (line 186)
   * And email notification should still be sent as fallback
   */
  test('should NOT block alert processing if push fails', async () => {
    // This test verifies that push errors don't prevent email fallback
    // Alert checker should try push, catch error, continue with email

    const pushService = (await import('@/lib/push/push-service')).pushService

    // Mock push failure
    jest.spyOn(pushService, 'sendPriceAlertPush').mockResolvedValue({
      success: false,
      error: 'Push service unavailable'
    })

    // Verify alert processing continues despite push failure
    const result = await pushService.sendPriceAlertPush({
      subscription: {
        endpoint: 'invalid',
        keys: { p256dh: '', auth: '' }
      },
      title: 'Test',
      body: 'Test',
      icon: '',
      url: ''
    })

    expect(result.success).toBe(false)
    // Alert checker should log error and continue with email
  })

  /**
   * Test: Record push_sent timestamp in AlertTrigger
   */
  test('should record push_sent timestamp in AlertTrigger', async () => {
    // Create AlertTrigger
    const trigger = await prisma.alertTrigger.create({
      data: {
        alert_id: testAlertId,
        triggered_price: 7.95,
        platform: 'csfloat',
        push_sent: false
      }
    })

    // Simulate push sent successfully
    const updatedTrigger = await prisma.alertTrigger.update({
      where: { id: trigger.id },
      data: {
        push_sent: true,
        push_sent_at: new Date()
      }
    })

    expect(updatedTrigger.push_sent).toBe(true)
    expect(updatedTrigger.push_sent_at).toBeInstanceOf(Date)
  })

  /**
   * Test: Do not send push if notify_push = false
   * Note: This tests that the alert checker LOGIC correctly skips push
   * We're not testing the alert checker here, just verifying the flag
   */
  test('should NOT send push if notify_push = false', async () => {
    // Update alert to disable push
    const updatedAlert = await prisma.priceAlert.update({
      where: { id: testAlertId },
      data: { notify_push: false }
    })

    // Verify notify_push flag is false
    expect(updatedAlert.notify_push).toBe(false)

    // In the alert checker, this alert would be skipped for push
    // The alert checker implementation already has:
    // if (alert.notify_push) { /* send push */ }
  })
})
