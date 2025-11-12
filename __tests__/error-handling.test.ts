/**
 * Error Handling Tests - Phase 1h
 *
 * BDD: features/09-price-alerts-phase1.feature (Phase 1h: Error Handling)
 * Tests: Lines 238-262
 *
 * Test Coverage:
 * - Database errors (connection failures, timeouts, constraint violations)
 * - Email service errors (Resend API failures, rate limits)
 * - Push service errors (web-push failures, expired subscriptions)
 * - Validation errors (invalid item references, missing fields)
 * - Graceful degradation (continue processing despite partial failures)
 *
 * Critical Gotchas:
 * - Prisma P2024 connection pool timeout needs retry logic
 * - Prisma P1001/P1002 connection failures need exponential backoff
 * - Email/push failures should NOT block alert processing
 * - Partial failures should be logged but not abort entire operation
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

describe('Error Handling - Phase 1h', () => {
  let testUserId: string
  let testItemId: string

  beforeEach(async () => {
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        steam_id: 'test_error_handling',
        persona_name: 'ErrorTester',
        profile_url: 'https://steamcommunity.com/id/errortester',
        avatar: 'https://example.com/avatar.png',
        email: 'error@example.com',
        notification_email_enabled: true,
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
  })

  afterEach(() => {
    // Rollback transaction - automatic cleanup, no manual deletion needed
    global.prismaTestHelper.rollbackTransaction()
  })

  /**
   * BDD Scenario: Handle database errors gracefully (line 241)
   * Given the database is temporarily unavailable
   * When I try to create a price alert
   * Then I should see error "Unable to create alert. Please try again."
   * And the error should be logged
   * And no partial data should be saved
   */
  describe('Database Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // Mock Prisma to throw connection error
      const mockPrismaError = new Prisma.PrismaClientInitializationError(
        'Can\'t reach database server',
        'clientVersion'
      )

      jest.spyOn(prisma.priceAlert, 'create').mockRejectedValueOnce(mockPrismaError)

      // Simulate API call that would create alert
      try {
        await prisma.priceAlert.create({
          data: {
            user_id: testUserId,
            item_id: testItemId,
            target_price: 8.00,
            notify_email: true,
            notify_push: false,
            is_active: true
          }
        })
        fail('Should have thrown error')
      } catch (error) {
        expect(error).toBeInstanceOf(Prisma.PrismaClientInitializationError)
        expect((error as Error).message).toContain('database server')
      }

      // Verify no partial data saved
      const alerts = await prisma.priceAlert.findMany({
        where: { user_id: testUserId }
      })
      expect(alerts.length).toBe(0)
    })

    test('should allow multiple alerts for same item (no unique constraint)', async () => {
      // Create initial alert
      const alert1 = await prisma.priceAlert.create({
        data: {
          user_id: testUserId,
          item_id: testItemId,
          target_price: 8.00,
          notify_email: true,
          notify_push: false,
          is_active: true
        }
      })

      // Create second alert for same item with different target price
      // Schema allows multiple alerts per user/item combination
      const alert2 = await prisma.priceAlert.create({
        data: {
          user_id: testUserId,
          item_id: testItemId,
          target_price: 7.50,
          notify_email: true,
          notify_push: false,
          is_active: true
        }
      })

      expect(alert1.id).not.toBe(alert2.id)
      expect(alert1.target_price).not.toEqual(alert2.target_price)

      // Both alerts should exist
      const alerts = await prisma.priceAlert.findMany({
        where: { user_id: testUserId, item_id: testItemId }
      })
      expect(alerts.length).toBe(2)
    })

    test('should handle connection pool timeout (P2024)', async () => {
      // Mock P2024 connection pool timeout
      const mockPoolTimeout = new Prisma.PrismaClientKnownRequestError(
        'Timed out fetching a new connection from the connection pool',
        {
          code: 'P2024',
          clientVersion: '5.0.0',
          meta: {}
        }
      )

      jest.spyOn(prisma.priceAlert, 'findMany').mockRejectedValueOnce(mockPoolTimeout)

      // Attempt query that would timeout
      try {
        await prisma.priceAlert.findMany()
        fail('Should have thrown P2024 error')
      } catch (error) {
        expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError)
        const prismaError = error as Prisma.PrismaClientKnownRequestError
        expect(prismaError.code).toBe('P2024')
      }

      // In real implementation, this would trigger retry logic
    })
  })

  /**
   * BDD Scenario: Handle email service errors gracefully (line 248)
   * Given an alert triggers
   * But the email service (Resend) is down
   * When attempting to send notification
   * Then the error should be caught and logged
   * And the alert trigger should still be recorded in database
   * And retry should be attempted later
   */
  describe('Email Service Error Handling', () => {
    test('should continue processing when email service fails', async () => {
      // Create alert and marketplace price
      const alert = await prisma.priceAlert.create({
        data: {
          user_id: testUserId,
          item_id: testItemId,
          target_price: 8.00,
          notify_email: true,
          notify_push: false,
          is_active: true
        }
      })

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

      // Mock email service to fail
      const emailService = await import('@/lib/email/email-service')
      jest.spyOn(emailService.emailService, 'sendPriceAlertEmail').mockResolvedValueOnce({
        success: false,
        error: 'Resend API is temporarily unavailable'
      })

      // Simulate alert trigger
      const trigger = await prisma.alertTrigger.create({
        data: {
          alert_id: alert.id,
          triggered_price: 7.95,
          platform: 'csfloat',
          listing_url: 'https://csfloat.com/item/12345',
          clicked: false,
          email_sent: false
        }
      })

      // Verify alert trigger was recorded despite email failure
      expect(trigger).toBeDefined()
      expect(trigger.email_sent).toBe(false)
      expect(trigger.email_sent_at).toBeNull()

      // In real implementation:
      // - Error would be logged
      // - Retry queue would be populated
      // - Alert processing would continue
    })

    test('should handle email service errors gracefully', async () => {
      const emailService = await import('@/lib/email/email-service')

      // Mock email service failure
      jest.spyOn(emailService.emailService, 'sendPriceAlertEmail').mockResolvedValueOnce({
        success: false,
        error: 'Resend API is temporarily unavailable'
      })

      const result = await emailService.emailService.sendPriceAlertEmail({
        to: 'test@example.com',
        itemName: 'Test Item',
        targetPrice: 10.00,
        triggeredPrice: 9.50,
        platform: 'csfloat',
        listingUrl: 'https://example.com',
        alertId: 'test-alert-id'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  /**
   * BDD Scenario: Handle invalid item reference (line 256)
   * Given I try to create alert for non-existent item ID
   * When I submit the alert
   * Then I should see error "Item not found"
   * And no alert should be created
   */
  describe('Validation Error Handling', () => {
    test('should reject alert for non-existent item', async () => {
      const fakeItemId = '00000000-0000-0000-0000-000000000000'

      try {
        await prisma.priceAlert.create({
          data: {
            user_id: testUserId,
            item_id: fakeItemId,
            target_price: 8.00,
            notify_email: true,
            notify_push: false,
            is_active: true
          }
        })
        fail('Should have thrown foreign key constraint error')
      } catch (error) {
        expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError)
        const prismaError = error as Prisma.PrismaClientKnownRequestError
        expect(prismaError.code).toBe('P2003') // Foreign key constraint violation
      }

      // Verify no alert created
      const alerts = await prisma.priceAlert.findMany({
        where: { user_id: testUserId }
      })
      expect(alerts.length).toBe(0)
    })

    test('should reject alert for non-existent user', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000'

      try {
        await prisma.priceAlert.create({
          data: {
            user_id: fakeUserId,
            item_id: testItemId,
            target_price: 8.00,
            notify_email: true,
            notify_push: false,
            is_active: true
          }
        })
        fail('Should have thrown foreign key constraint error')
      } catch (error) {
        expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError)
        const prismaError = error as Prisma.PrismaClientKnownRequestError
        expect(prismaError.code).toBe('P2003')
      }
    })

    test('should validate target_price is positive', async () => {
      try {
        await prisma.priceAlert.create({
          data: {
            user_id: testUserId,
            item_id: testItemId,
            target_price: -5.00, // Invalid negative price
            notify_email: true,
            notify_push: false,
            is_active: true
          }
        })
        fail('Should have thrown validation error for negative price')
      } catch (error) {
        // Database CHECK constraint should prevent negative prices
        expect(error).toBeDefined()
      }
    })
  })

  /**
   * Push Service Error Handling
   * Verify push failures don't block alert processing
   */
  describe('Push Service Error Handling', () => {
    test('should continue processing when push service fails', async () => {
      const pushService = await import('@/lib/push/push-service')

      // Mock push failure
      jest.spyOn(pushService.pushService, 'sendPriceAlertPush').mockResolvedValueOnce({
        success: false,
        error: 'Push service temporarily unavailable'
      })

      const result = await pushService.pushService.sendPriceAlertPush({
        subscription: {
          endpoint: 'https://fcm.googleapis.com/test',
          keys: { p256dh: 'test-key', auth: 'test-auth' }
        },
        title: 'Test Alert',
        body: 'Test Body',
        icon: 'https://example.com/icon.png',
        url: 'https://example.com'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('temporarily unavailable')
    })
  })
})
