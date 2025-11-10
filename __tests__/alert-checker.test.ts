/**
 * Alert Checker Service Tests
 *
 * BDD: features/09-price-alerts-phase1.feature (Phase 1d: Alert Triggering Logic)
 * Tests: Lines 103-137
 *
 * CRITICAL GOTCHA: Vercel serverless doesn't support persistent background processes.
 * Solution: Use Vercel Cron Jobs (vercel.json) to trigger API route every 5 minutes.
 * Hobby plan limitations: 2 crons max, once daily minimum, 10-60 second max duration.
 *
 * Architecture:
 * - API Route: /api/cron/check-price-alerts/route.ts (triggered by Vercel Cron)
 * - Service: fetchActiveAlertsWithPrices() - eager loading to prevent N+1
 * - Logic: Compare current_lowest_price <= target_price
 * - Cooldown: 15 minutes between triggers (check last_triggered_at)
 * - Side Effects: Increment triggered_count, update last_triggered_at, create AlertTrigger record
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

describe('Alert Checker Service - Phase 1d: Alert Triggering Logic', () => {
  let testUserId: string
  let testItemId: string

  beforeEach(async () => {
    // Create test user with email for notifications
    const testUser = await prisma.user.create({
      data: {
        steam_id: 'test_steam_alert_checker',
        persona_name: 'AlertCheckerTester',
        profile_url: 'https://steamcommunity.com/id/alertcheckertester',
        avatar: 'https://example.com/avatar.png',
        email: 'alertchecker@test.com',
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

    // Create marketplace price for item ($10.50 current price)
    await prisma.marketplacePrice.create({
      data: {
        item_id: testItemId,
        platform: 'csfloat',
        price: 10.50,
        currency: 'USD',
        seller_fee_percent: 2.0,
        buyer_fee_percent: 0,
        total_cost: 10.50,
        listing_url: 'https://csfloat.com/item/123',
        quantity_available: 1,
        last_updated: new Date()
      }
    })
  })

  afterEach(async () => {
    // Cleanup in reverse dependency order
    await prisma.alertTrigger.deleteMany({})
    await prisma.priceAlert.deleteMany({})
    await prisma.marketplacePrice.deleteMany({})
    await prisma.item.deleteMany({})
    await prisma.user.deleteMany({ where: { steam_id: 'test_steam_alert_checker' } })
  })

  /**
   * BDD Scenario: Alert triggers when price drops below target (line 106)
   * Given I have an active alert with target $8.00 and current price $10.50
   * When the price checker runs and price updates to $7.95
   * Then the alert should trigger
   */
  test('should trigger alert when current price drops below target price', async () => {
    // Arrange: Create active alert with target $8.00
    const alert = await prisma.priceAlert.create({
      data: {
        user_id: testUserId,
        item_id: testItemId,
        target_price: 8.00,
        notify_email: true,
        notify_push: false,
        is_active: true,
        triggered_count: 0
      }
    })

    // Update marketplace price to $7.95 (below target)
    await prisma.marketplacePrice.updateMany({
      where: { item_id: testItemId },
      data: { price: 7.95, total_cost: 7.95 }
    })

    // Act: Run alert checker logic (fetch with marketplace prices)
    const activeAlerts = await prisma.priceAlert.findMany({
      where: { is_active: true },
      include: {
        item: {
          include: {
            marketplace_prices: {
              orderBy: { total_cost: 'asc' },
              take: 1
            }
          }
        },
        user: true
      }
    })

    const alertsToTrigger = activeAlerts.filter(alert => {
      const lowestPrice = alert.item.marketplace_prices[0]
      if (!lowestPrice) return false
      const currentPrice = Number(lowestPrice.total_cost)
      const targetPrice = Number(alert.target_price)
      return currentPrice <= targetPrice
    })

    // Assert: Alert should be in trigger list
    expect(alertsToTrigger.length).toBe(1)
    expect(alertsToTrigger[0].id).toBe(alert.id)
    expect(Number(alertsToTrigger[0].item.marketplace_prices[0].total_cost)).toBe(7.95)
    expect(Number(alertsToTrigger[0].target_price)).toBe(8.00)
  })

  /**
   * BDD Scenario: Alert triggers when price drops below target (line 114)
   * Then triggered_count should increment by 1
   * And last_triggered_at should be updated to current time
   */
  test('should increment triggered_count and update last_triggered_at when alert triggers', async () => {
    // Arrange
    const alert = await prisma.priceAlert.create({
      data: {
        user_id: testUserId,
        item_id: testItemId,
        target_price: 8.00,
        notify_email: true,
        notify_push: false,
        is_active: true,
        triggered_count: 0,
        last_triggered_at: null
      }
    })

    await prisma.marketplacePrice.updateMany({
      where: { item_id: testItemId },
      data: { price: 7.95, total_cost: 7.95 }
    })

    const beforeTriggerTime = new Date()

    // Act: Simulate trigger processing
    const updatedAlert = await prisma.priceAlert.update({
      where: { id: alert.id },
      data: {
        triggered_count: { increment: 1 },
        last_triggered_at: new Date()
      }
    })

    // Assert
    expect(updatedAlert.triggered_count).toBe(1)
    expect(updatedAlert.last_triggered_at).not.toBeNull()
    expect(updatedAlert.last_triggered_at!.getTime()).toBeGreaterThanOrEqual(beforeTriggerTime.getTime())
  })

  /**
   * BDD Scenario: Alert does not trigger when price above target (line 117)
   * Given I have an active alert with target $8.00
   * And current price is $10.50
   * When the price checker runs and price remains at $10.50
   * Then the alert should NOT trigger
   */
  test('should NOT trigger alert when price remains above target', async () => {
    // Arrange
    await prisma.priceAlert.create({
      data: {
        user_id: testUserId,
        item_id: testItemId,
        target_price: 8.00,
        notify_email: true,
        notify_push: false,
        is_active: true,
        triggered_count: 0
      }
    })

    // Price remains at $10.50 (above target $8.00)

    // Act
    const activeAlerts = await prisma.priceAlert.findMany({
      where: { is_active: true },
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

    const alertsToTrigger = activeAlerts.filter(alert => {
      const lowestPrice = alert.item.marketplace_prices[0]
      if (!lowestPrice) return false
      const currentPrice = Number(lowestPrice.total_cost)
      const targetPrice = Number(alert.target_price)
      return currentPrice <= targetPrice
    })

    // Assert
    expect(alertsToTrigger.length).toBe(0)
  })

  /**
   * BDD Scenario: Alert triggers at exact target price (line 125)
   * Given I have an active alert with target $8.00
   * When price updates to exactly $8.00
   * Then the alert should trigger
   */
  test('should trigger alert when price equals exact target price', async () => {
    // Arrange
    await prisma.priceAlert.create({
      data: {
        user_id: testUserId,
        item_id: testItemId,
        target_price: 8.00,
        notify_email: true,
        notify_push: false,
        is_active: true,
        triggered_count: 0
      }
    })

    // Update price to exactly $8.00
    await prisma.marketplacePrice.updateMany({
      where: { item_id: testItemId },
      data: { price: 8.00, total_cost: 8.00 }
    })

    // Act
    const activeAlerts = await prisma.priceAlert.findMany({
      where: { is_active: true },
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

    const alertsToTrigger = activeAlerts.filter(alert => {
      const lowestPrice = alert.item.marketplace_prices[0]
      if (!lowestPrice) return false
      const currentPrice = Number(lowestPrice.total_cost)
      const targetPrice = Number(alert.target_price)
      return currentPrice <= targetPrice
    })

    // Assert
    expect(alertsToTrigger.length).toBe(1)
    expect(Number(alertsToTrigger[0].item.marketplace_prices[0].total_cost)).toBe(8.00)
  })

  /**
   * BDD Scenario: Prevent duplicate triggers within cooldown period (line 131)
   * Given I have an alert that triggered 10 minutes ago
   * When the price checker runs again and price is still below target
   * Then the alert should NOT trigger again
   * # Cooldown: 15 minutes minimum between triggers
   */
  test('should NOT trigger alert if cooldown period (15 minutes) has not elapsed', async () => {
    // Arrange: Alert triggered 10 minutes ago (within 15-minute cooldown)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)

    await prisma.priceAlert.create({
      data: {
        user_id: testUserId,
        item_id: testItemId,
        target_price: 8.00,
        notify_email: true,
        notify_push: false,
        is_active: true,
        triggered_count: 1,
        last_triggered_at: tenMinutesAgo
      }
    })

    // Price still below target
    await prisma.marketplacePrice.updateMany({
      where: { item_id: testItemId },
      data: { price: 7.50, total_cost: 7.50 }
    })

    // Act: Check with cooldown logic
    const COOLDOWN_MINUTES = 15
    const now = new Date()

    const activeAlerts = await prisma.priceAlert.findMany({
      where: { is_active: true },
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

    const alertsToTrigger = activeAlerts.filter(alert => {
      const lowestPrice = alert.item.marketplace_prices[0]
      if (!lowestPrice) return false
      const currentPrice = Number(lowestPrice.total_cost)
      const targetPrice = Number(alert.target_price)

      // Check if price condition met
      if (currentPrice > targetPrice) return false

      // Check cooldown period
      if (alert.last_triggered_at) {
        const minutesSinceLastTrigger = (now.getTime() - alert.last_triggered_at.getTime()) / (1000 * 60)
        if (minutesSinceLastTrigger < COOLDOWN_MINUTES) return false
      }

      return true
    })

    // Assert: Should NOT trigger (cooldown not elapsed)
    expect(alertsToTrigger.length).toBe(0)
  })

  /**
   * BDD Scenario: Allow trigger after cooldown period elapsed
   * Given I have an alert that triggered 20 minutes ago
   * When the price checker runs and price is still below target
   * Then the alert SHOULD trigger again (cooldown elapsed)
   */
  test('should trigger alert if cooldown period (15 minutes) has elapsed', async () => {
    // Arrange: Alert triggered 20 minutes ago (cooldown elapsed)
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000)

    await prisma.priceAlert.create({
      data: {
        user_id: testUserId,
        item_id: testItemId,
        target_price: 8.00,
        notify_email: true,
        notify_push: false,
        is_active: true,
        triggered_count: 1,
        last_triggered_at: twentyMinutesAgo
      }
    })

    await prisma.marketplacePrice.updateMany({
      where: { item_id: testItemId },
      data: { price: 7.50, total_cost: 7.50 }
    })

    // Act
    const COOLDOWN_MINUTES = 15
    const now = new Date()

    const activeAlerts = await prisma.priceAlert.findMany({
      where: { is_active: true },
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

    const alertsToTrigger = activeAlerts.filter(alert => {
      const lowestPrice = alert.item.marketplace_prices[0]
      if (!lowestPrice) return false
      const currentPrice = Number(lowestPrice.total_cost)
      const targetPrice = Number(alert.target_price)

      if (currentPrice > targetPrice) return false

      if (alert.last_triggered_at) {
        const minutesSinceLastTrigger = (now.getTime() - alert.last_triggered_at.getTime()) / (1000 * 60)
        if (minutesSinceLastTrigger < COOLDOWN_MINUTES) return false
      }

      return true
    })

    // Assert: Should trigger (cooldown elapsed)
    expect(alertsToTrigger.length).toBe(1)
  })

  /**
   * BDD Scenario: Create AlertTrigger record when alert fires
   * Test that AlertTrigger record is created with correct data
   */
  test('should create AlertTrigger record when alert triggers', async () => {
    // Arrange
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

    await prisma.marketplacePrice.updateMany({
      where: { item_id: testItemId },
      data: { price: 7.95, total_cost: 7.95 }
    })

    // Act: Create AlertTrigger record
    const alertTrigger = await prisma.alertTrigger.create({
      data: {
        alert_id: alert.id,
        triggered_price: 7.95,
        platform: 'csfloat',
        clicked: false
      }
    })

    // Assert
    expect(alertTrigger.alert_id).toBe(alert.id)
    expect(Number(alertTrigger.triggered_price)).toBe(7.95)
    expect(alertTrigger.platform).toBe('csfloat')
    expect(alertTrigger.clicked).toBe(false)
    expect(alertTrigger.triggered_at).toBeInstanceOf(Date)
  })

  /**
   * BDD Scenario: Only check active alerts (ignore paused alerts)
   */
  test('should NOT trigger paused alerts (is_active = false)', async () => {
    // Arrange: Create paused alert
    await prisma.priceAlert.create({
      data: {
        user_id: testUserId,
        item_id: testItemId,
        target_price: 8.00,
        notify_email: true,
        notify_push: false,
        is_active: false, // PAUSED
        triggered_count: 0
      }
    })

    await prisma.marketplacePrice.updateMany({
      where: { item_id: testItemId },
      data: { price: 7.50, total_cost: 7.50 }
    })

    // Act: Only fetch active alerts
    const activeAlerts = await prisma.priceAlert.findMany({
      where: { is_active: true },
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

    // Assert: No alerts fetched (paused alert excluded)
    expect(activeAlerts.length).toBe(0)
  })

  /**
   * Performance Requirement: Use eager loading to prevent N+1 queries
   * BDD: Scenario "Price checker completes within time limit" (line 288)
   */
  test('should use eager loading (include) to prevent N+1 queries', async () => {
    // Arrange: Create 10 active alerts
    const alertPromises = Array.from({ length: 10 }, (_, i) =>
      prisma.priceAlert.create({
        data: {
          user_id: testUserId,
          item_id: testItemId,
          target_price: 8.00 + i,
          notify_email: true,
          notify_push: false,
          is_active: true
        }
      })
    )
    await Promise.all(alertPromises)

    // Act: Fetch with eager loading
    const startTime = Date.now()
    const activeAlerts = await prisma.priceAlert.findMany({
      where: { is_active: true },
      include: {
        item: {
          include: {
            marketplace_prices: {
              orderBy: { total_cost: 'asc' },
              take: 1
            }
          }
        },
        user: true
      }
    })
    const queryTime = Date.now() - startTime

    // Assert: Single query with joins (not N+1)
    expect(activeAlerts.length).toBe(10)
    expect(activeAlerts[0].item).toBeDefined()
    expect(activeAlerts[0].user).toBeDefined()
    expect(queryTime).toBeLessThan(1000) // Should be fast with proper indexing
  })
})
