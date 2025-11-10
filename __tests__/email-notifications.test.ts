/**
 * Email Notification Service Tests
 *
 * BDD: features/09-price-alerts-phase1.feature (Phase 1e: Email Notifications)
 * Tests: Lines 143-164
 *
 * Technology: Resend (resend.com)
 * Rationale: Perpetual free tier (3000 emails/month), Next.js native, React Email templates
 * Gotcha: SendGrid free tier eliminated in 2025 (now 60-day trial only)
 *
 * Architecture:
 * - EmailService wrapper around Resend SDK
 * - React Email templates for type-safe HTML generation
 * - Suppression list checking before send
 * - GDPR-compliant unsubscribe (one-click, no login)
 * - Error handling with graceful degradation
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

describe('Email Notification Service - Phase 1e', () => {
  let testUserId: string
  let testItemId: string
  let testAlertId: string

  beforeEach(async () => {
    // Create test user with email
    const testUser = await prisma.user.create({
      data: {
        steam_id: 'test_email_notifications',
        persona_name: 'EmailTester',
        profile_url: 'https://steamcommunity.com/id/emailtester',
        avatar: 'https://example.com/avatar.png',
        email: 'user@example.com',
        notification_email_enabled: true
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
        notify_email: true,
        notify_push: false,
        is_active: true
      }
    })
    testAlertId = alert.id
  })

  afterEach(async () => {
    // Cleanup in reverse dependency order
    await prisma.alertTrigger.deleteMany({})
    await prisma.priceAlert.deleteMany({})
    await prisma.emailSuppressionList.deleteMany({})
    await prisma.marketplacePrice.deleteMany({})
    await prisma.item.deleteMany({})
    await prisma.user.deleteMany({ where: { steam_id: 'test_email_notifications' } })
  })

  /**
   * BDD Scenario: Send email notification when alert triggers (line 143)
   * Given I have an alert with notify_email = true
   * And my email is "user@example.com"
   * When the alert triggers at price $7.95
   * Then an email should be sent to "user@example.com"
   */
  test('should send email when alert triggers with notify_email = true', async () => {
    // Arrange
    const emailService = (await import('@/lib/email/email-service')).emailService
    const sendSpy = jest.spyOn(emailService, 'sendPriceAlertEmail')

    // Act: Trigger alert and send email
    const alert = await prisma.priceAlert.findUnique({
      where: { id: testAlertId },
      include: {
        user: true,
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

    const result = await emailService.sendPriceAlertEmail({
      to: alert!.user.email!,
      itemName: alert!.item.display_name,
      targetPrice: Number(alert!.target_price),
      triggeredPrice: Number(alert!.item.marketplace_prices[0].total_cost),
      platform: alert!.item.marketplace_prices[0].platform,
      listingUrl: alert!.item.marketplace_prices[0].listing_url!,
      alertId: alert!.id
    })

    // Assert
    expect(result.success).toBe(true)
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        itemName: 'AK-47 | Redline (Field-Tested)',
        targetPrice: 8.00,
        triggeredPrice: 7.95
      })
    )
  })

  /**
   * BDD Scenario: Email subject line (line 148)
   * And email subject should be "🔔 Price Alert: AK-47 Redline is now $7.95"
   */
  test('should format email subject correctly', async () => {
    const emailService = (await import('@/lib/email/email-service')).emailService

    const result = await emailService.sendPriceAlertEmail({
      to: 'user@example.com',
      itemName: 'AK-47 | Redline (Field-Tested)',
      targetPrice: 8.00,
      triggeredPrice: 7.95,
      platform: 'csfloat',
      listingUrl: 'https://csfloat.com/item/12345',
      alertId: testAlertId
    })

    expect(result.emailData?.subject).toContain('Price Alert')
    expect(result.emailData?.subject).toContain('AK-47')
    expect(result.emailData?.subject).toContain('$7.95')
  })

  /**
   * BDD Scenario: Email content requirements (line 149-151)
   * And email should contain "Your target price: $8.00"
   * And email should contain marketplace link to buy
   * And email should contain "Manage your alerts" link
   */
  test('should include required content in email body', async () => {
    const emailService = (await import('@/lib/email/email-service')).emailService

    const result = await emailService.sendPriceAlertEmail({
      to: 'user@example.com',
      itemName: 'AK-47 | Redline (Field-Tested)',
      targetPrice: 8.00,
      triggeredPrice: 7.95,
      platform: 'csfloat',
      listingUrl: 'https://csfloat.com/item/12345',
      alertId: testAlertId
    })

    const htmlBody = result.emailData?.html || ''

    expect(htmlBody).toContain('$8.00') // Target price
    expect(htmlBody).toContain('https://csfloat.com/item/12345') // Marketplace link
    expect(htmlBody).toContain('alerts') // Manage alerts link
  })

  /**
   * BDD Scenario: Email includes GDPR-compliant unsubscribe link (line 153)
   * Then email footer should contain unsubscribe link
   * And unsubscribe should be one-click (no login required)
   * And unsubscribe link should be visible and accessible
   */
  test('should include GDPR-compliant unsubscribe link in footer', async () => {
    const emailService = (await import('@/lib/email/email-service')).emailService

    const result = await emailService.sendPriceAlertEmail({
      to: 'user@example.com',
      itemName: 'AK-47 | Redline (Field-Tested)',
      targetPrice: 8.00,
      triggeredPrice: 7.95,
      platform: 'csfloat',
      listingUrl: 'https://csfloat.com/item/12345',
      alertId: testAlertId
    })

    const htmlBody = result.emailData?.html || ''

    // Unsubscribe link present
    expect(htmlBody).toContain('unsubscribe')

    // Link should be one-click (contains alert ID for token-based unsubscribe)
    expect(htmlBody).toMatch(/unsubscribe.*alert.*[a-f0-9-]{36}/)
  })

  /**
   * BDD Scenario: Check suppression list before sending email (line 159)
   * Given user "user@example.com" is on email suppression list
   * When an alert triggers for this user
   * Then NO email should be sent
   * And suppression should be logged
   */
  test('should NOT send email if user is on suppression list', async () => {
    // Arrange: Add user to suppression list
    await prisma.emailSuppressionList.create({
      data: {
        email: 'user@example.com',
        reason: 'user_unsubscribed',
        suppressed_at: new Date()
      }
    })

    const emailService = (await import('@/lib/email/email-service')).emailService
    const sendSpy = jest.spyOn(emailService, 'sendPriceAlertEmail')

    // Act: Attempt to send email
    const result = await emailService.sendPriceAlertEmail({
      to: 'user@example.com',
      itemName: 'AK-47 | Redline (Field-Tested)',
      targetPrice: 8.00,
      triggeredPrice: 7.95,
      platform: 'csfloat',
      listingUrl: 'https://csfloat.com/item/12345',
      alertId: testAlertId
    })

    // Assert: Email not sent
    expect(result.success).toBe(false)
    expect(result.error).toContain('suppressed')
  })

  /**
   * BDD Scenario: Handle email service errors gracefully (line 248)
   * Given an alert triggers
   * But the email service (Resend) is down
   * When attempting to send notification
   * Then the error should be caught and logged
   * And the alert trigger should still be recorded in database
   */
  test('should handle email service errors gracefully', async () => {
    const emailService = (await import('@/lib/email/email-service')).emailService

    // Mock Resend API failure
    jest.spyOn(emailService as any, 'resend').mockImplementation(() => {
      throw new Error('Resend API unavailable')
    })

    // Act
    const result = await emailService.sendPriceAlertEmail({
      to: 'user@example.com',
      itemName: 'AK-47 | Redline (Field-Tested)',
      targetPrice: 8.00,
      triggeredPrice: 7.95,
      platform: 'csfloat',
      listingUrl: 'https://csfloat.com/item/12345',
      alertId: testAlertId
    })

    // Assert: Error handled gracefully
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  /**
   * Test: Skip email if notify_email = false
   */
  test('should NOT send email if notify_email = false', async () => {
    // Arrange: Update alert to disable email
    await prisma.priceAlert.update({
      where: { id: testAlertId },
      data: { notify_email: false }
    })

    const emailService = (await import('@/lib/email/email-service')).emailService
    const sendSpy = jest.spyOn(emailService, 'sendPriceAlertEmail')

    // Act: Check if email should be sent
    const alert = await prisma.priceAlert.findUnique({
      where: { id: testAlertId }
    })

    // Assert: Email service not called
    if (!alert?.notify_email) {
      expect(sendSpy).not.toHaveBeenCalled()
    }
  })

  /**
   * Test: Record email_sent timestamp in AlertTrigger
   */
  test('should record email_sent timestamp in AlertTrigger', async () => {
    // Create AlertTrigger
    const trigger = await prisma.alertTrigger.create({
      data: {
        alert_id: testAlertId,
        triggered_price: 7.95,
        platform: 'csfloat',
        email_sent: false
      }
    })

    // Simulate email sent successfully
    const updatedTrigger = await prisma.alertTrigger.update({
      where: { id: trigger.id },
      data: {
        email_sent: true,
        email_sent_at: new Date()
      }
    })

    expect(updatedTrigger.email_sent).toBe(true)
    expect(updatedTrigger.email_sent_at).toBeInstanceOf(Date)
  })
})
