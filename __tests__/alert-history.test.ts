/**
 * Alert History Tests - Phase 1i
 *
 * BDD: features/09-price-alerts-phase1.feature (Phase 1i: Alert History)
 * Tests: Lines 263-284
 *
 * Test Coverage:
 * - Viewing alert trigger history
 * - Displaying trigger timestamps, prices, platforms
 * - Tracking if user clicked notification links
 * - Recording clicked_at timestamps
 * - Sorting triggers by most recent first
 *
 * Privacy Considerations:
 * - First-party click tracking (no third-party analytics)
 * - Server-side tracking (GDPR-friendly)
 * - No IP addresses or user agents stored beyond what's needed
 * - User already consented to account (user_id tracking acceptable)
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { prisma } from '@/lib/prisma'

describe('Alert History - Phase 1i', () => {
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
        steam_id: `test_alert_history_${Date.now()}`,
        persona_name: 'HistoryTester',
        profile_url: 'https://steamcommunity.com/id/historytester',
        avatar: 'https://example.com/avatar.png',
        email: `history_${Date.now()}@example.com`,
        notification_email_enabled: true
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

    // Create test alert
    const testAlert = await prisma.priceAlert.create({
      data: {
        user_id: testUserId,
        item_id: testItemId,
        target_price: 8.00,
        notify_email: true,
        notify_push: false,
        is_active: true
      }
    })
    testAlertId = testAlert.id
  })

  afterEach(() => {
    // Rollback transaction - automatic cleanup, no manual deletion needed
    global.prismaTestHelper.rollbackTransaction()
  })

  /**
   * BDD Scenario: View alert trigger history (line 266)
   * Given I have an alert that has triggered 3 times
   * When I view alert details
   * And I click "View History"
   * Then I should see 3 trigger records
   * And each record should show: triggered_at, price, platform, clicked
   */
  describe('View Alert Trigger History', () => {
    test('should fetch all triggers for an alert sorted by most recent', async () => {
      // Create 3 trigger records at different times
      const trigger1 = await prisma.alertTrigger.create({
        data: {
          alert_id: testAlertId,
          triggered_price: 7.95,
          platform: 'csfloat',
          listing_url: 'https://csfloat.com/item/1',
          clicked: false,
          triggered_at: new Date('2025-11-08T10:00:00Z')
        }
      })

      const trigger2 = await prisma.alertTrigger.create({
        data: {
          alert_id: testAlertId,
          triggered_price: 7.85,
          platform: 'skinport',
          listing_url: 'https://skinport.com/item/2',
          clicked: true,
          clicked_at: new Date('2025-11-09T11:00:00Z'),
          triggered_at: new Date('2025-11-09T10:00:00Z')
        }
      })

      const trigger3 = await prisma.alertTrigger.create({
        data: {
          alert_id: testAlertId,
          triggered_price: 7.75,
          platform: 'buff163',
          listing_url: 'https://buff.163.com/item/3',
          clicked: false,
          triggered_at: new Date('2025-11-10T10:00:00Z')
        }
      })

      // Fetch triggers sorted by most recent first
      const triggers = await prisma.alertTrigger.findMany({
        where: { alert_id: testAlertId },
        orderBy: { triggered_at: 'desc' }
      })

      // Assert: Should have 3 triggers
      expect(triggers.length).toBe(3)

      // Assert: Should be sorted most recent first
      expect(triggers[0].id).toBe(trigger3.id)
      expect(triggers[1].id).toBe(trigger2.id)
      expect(triggers[2].id).toBe(trigger1.id)

      // Assert: Each trigger has required fields (line 271-276)
      triggers.forEach(trigger => {
        expect(trigger.triggered_at).toBeInstanceOf(Date) // triggered_at
        expect(trigger.triggered_price).toBeDefined() // price
        expect(trigger.platform).toBeDefined() // platform
        expect(typeof trigger.clicked).toBe('boolean') // clicked (Yes/No)
      })
    })

    test('should display trigger data in correct format', async () => {
      const trigger = await prisma.alertTrigger.create({
        data: {
          alert_id: testAlertId,
          triggered_price: 7.95,
          platform: 'csfloat',
          listing_url: 'https://csfloat.com/item/12345',
          clicked: true,
          clicked_at: new Date('2025-11-10T15:23:00Z'),
          triggered_at: new Date('2025-11-10T15:20:00Z')
        }
      })

      // Verify data matches BDD example (line 273-276)
      expect(trigger.triggered_at).toBeInstanceOf(Date) // "2025-11-10 10:23 AM"
      expect(Number(trigger.triggered_price)).toBe(7.95) // "$7.95"
      expect(trigger.platform).toBe('csfloat') // "CSFloat"
      expect(trigger.clicked).toBe(true) // "Yes"
    })

    test('should return empty array for alert with no triggers', async () => {
      const triggers = await prisma.alertTrigger.findMany({
        where: { alert_id: testAlertId }
      })

      expect(triggers.length).toBe(0)
      expect(Array.isArray(triggers)).toBe(true)
    })

    test('should include listing URL in trigger history', async () => {
      const trigger = await prisma.alertTrigger.create({
        data: {
          alert_id: testAlertId,
          triggered_price: 7.95,
          platform: 'csfloat',
          listing_url: 'https://csfloat.com/item/12345',
          clicked: false
        }
      })

      expect(trigger.listing_url).toBe('https://csfloat.com/item/12345')
    })

    test('should support pagination for large trigger history', async () => {
      // Create 25 triggers
      const triggers = []
      for (let i = 0; i < 25; i++) {
        triggers.push({
          alert_id: testAlertId,
          triggered_price: 7.95 - (i * 0.01),
          platform: 'csfloat',
          listing_url: `https://csfloat.com/item/${i}`,
          clicked: false,
          triggered_at: new Date(Date.now() - (i * 60000)) // 1 minute apart
        })
      }
      await prisma.alertTrigger.createMany({ data: triggers })

      // Fetch first page (limit 10)
      const page1 = await prisma.alertTrigger.findMany({
        where: { alert_id: testAlertId },
        orderBy: { triggered_at: 'desc' },
        take: 10
      })

      // Fetch second page (skip 10, limit 10)
      const page2 = await prisma.alertTrigger.findMany({
        where: { alert_id: testAlertId },
        orderBy: { triggered_at: 'desc' },
        skip: 10,
        take: 10
      })

      expect(page1.length).toBe(10)
      expect(page2.length).toBe(10)
      expect(page1[0].id).not.toBe(page2[0].id) // Different records
    })
  })

  /**
   * BDD Scenario: Track if user clicked on notification (line 278)
   * Given an alert trigger created a notification
   * When I click the notification link
   * Then clicked should be set to true
   * And clicked_at should be recorded
   */
  describe('Click Tracking', () => {
    test('should update clicked status when user clicks notification link', async () => {
      // Create trigger
      const trigger = await prisma.alertTrigger.create({
        data: {
          alert_id: testAlertId,
          triggered_price: 7.95,
          platform: 'csfloat',
          listing_url: 'https://csfloat.com/item/12345',
          clicked: false
        }
      })

      expect(trigger.clicked).toBe(false)
      expect(trigger.clicked_at).toBeNull()

      // Simulate user clicking notification link
      const clickedAt = new Date()
      const updatedTrigger = await prisma.alertTrigger.update({
        where: { id: trigger.id },
        data: {
          clicked: true,
          clicked_at: clickedAt
        }
      })

      // Assert: clicked should be true
      expect(updatedTrigger.clicked).toBe(true)

      // Assert: clicked_at should be recorded
      expect(updatedTrigger.clicked_at).toBeInstanceOf(Date)
      expect(updatedTrigger.clicked_at?.getTime()).toBeCloseTo(clickedAt.getTime(), -2)
    })

    test('should allow clicking trigger multiple times (idempotent)', async () => {
      const trigger = await prisma.alertTrigger.create({
        data: {
          alert_id: testAlertId,
          triggered_price: 7.95,
          platform: 'csfloat',
          listing_url: 'https://csfloat.com/item/12345',
          clicked: false
        }
      })

      // First click
      const firstClick = new Date()
      await prisma.alertTrigger.update({
        where: { id: trigger.id },
        data: { clicked: true, clicked_at: firstClick }
      })

      // Second click (user clicks again)
      const secondClick = new Date(Date.now() + 1000)
      const finalTrigger = await prisma.alertTrigger.update({
        where: { id: trigger.id },
        data: { clicked: true, clicked_at: secondClick }
      })

      // Should still be marked as clicked
      expect(finalTrigger.clicked).toBe(true)

      // clicked_at should be the most recent click
      expect(finalTrigger.clicked_at?.getTime()).toBeGreaterThan(firstClick.getTime())
    })

    test('should track which triggers were clicked vs not clicked', async () => {
      // Create multiple triggers, some clicked, some not
      await prisma.alertTrigger.create({
        data: {
          alert_id: testAlertId,
          triggered_price: 7.95,
          platform: 'csfloat',
          clicked: true,
          clicked_at: new Date()
        }
      })

      await prisma.alertTrigger.create({
        data: {
          alert_id: testAlertId,
          triggered_price: 7.85,
          platform: 'skinport',
          clicked: false
        }
      })

      await prisma.alertTrigger.create({
        data: {
          alert_id: testAlertId,
          triggered_price: 7.75,
          platform: 'buff163',
          clicked: true,
          clicked_at: new Date()
        }
      })

      // Query clicked triggers
      const clickedTriggers = await prisma.alertTrigger.findMany({
        where: {
          alert_id: testAlertId,
          clicked: true
        }
      })

      // Query unclicked triggers
      const unclickedTriggers = await prisma.alertTrigger.findMany({
        where: {
          alert_id: testAlertId,
          clicked: false
        }
      })

      expect(clickedTriggers.length).toBe(2)
      expect(unclickedTriggers.length).toBe(1)
    })
  })

  /**
   * Additional test: Calculate click-through rate
   */
  test('should calculate click-through rate for alert', async () => {
    // Create 5 triggers: 3 clicked, 2 not clicked
    for (let i = 0; i < 3; i++) {
      await prisma.alertTrigger.create({
        data: {
          alert_id: testAlertId,
          triggered_price: 7.95,
          platform: 'csfloat',
          clicked: true,
          clicked_at: new Date()
        }
      })
    }

    for (let i = 0; i < 2; i++) {
      await prisma.alertTrigger.create({
        data: {
          alert_id: testAlertId,
          triggered_price: 7.95,
          platform: 'csfloat',
          clicked: false
        }
      })
    }

    // Calculate CTR
    const totalTriggers = await prisma.alertTrigger.count({
      where: { alert_id: testAlertId }
    })

    const clickedTriggers = await prisma.alertTrigger.count({
      where: { alert_id: testAlertId, clicked: true }
    })

    const clickThroughRate = (clickedTriggers / totalTriggers) * 100

    expect(totalTriggers).toBe(5)
    expect(clickedTriggers).toBe(3)
    expect(clickThroughRate).toBe(60) // 3/5 = 60%
  })
})
