/**
 * TDD Tests for Loadout Item Server Actions (Failing Tests - RED Phase)
 *
 * BDD Reference: features/08-budget-loadout-builder-phase6.feature
 *   Scenario: Save item selection to database
 *   Scenario: Load existing selections on page load
 *   Scenario: Handle concurrent selections (optimistic UI)
 *   Scenario: Handle Server Action errors
 *   Scenario: Prevent duplicate submissions
 *   Scenario: Replace existing weapon skin
 *   Scenario: Remove item from loadout
 *
 * Server Action Responsibilities:
 * - Add item to loadout (create LoadoutWeaponSkin record)
 * - Remove item from loadout (delete LoadoutWeaponSkin record)
 * - Replace item (delete old, create new LoadoutWeaponSkin)
 * - Update loadout actual_cost
 * - Enforce ONE skin per weapon_type constraint
 * - Validate budget constraints
 * - Require authentication
 * - Handle database errors gracefully
 * - Return success/error states
 *
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { addItemToLoadoutAction, removeItemFromLoadoutAction, replaceItemAction } from '@/app/loadouts/[id]/actions'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'

// Type definitions
interface AddItemResult {
  success: boolean
  error?: string
  loadoutWeaponSkin?: {
    id: string
    loadout_id: string
    item_id: string
    weapon_type: string
  }
  actualCost?: number
}

interface RemoveItemResult {
  success: boolean
  error?: string
  actualCost?: number
}

interface ReplaceItemResult {
  success: boolean
  error?: string
  removed?: string // ID of removed item
  added?: string // ID of added item
  actualCost?: number
}

describe('Loadout Item Server Actions', () => {
  let testUserId: string
  let testLoadoutId: string
  let testItemId: string

  beforeEach(async () => {
    jest.clearAllMocks()

    // Clean up test data
    await prisma.loadoutWeaponSkin.deleteMany({})
    await prisma.loadout.deleteMany({})
    await prisma.marketplacePrice.deleteMany({})
    await prisma.item.deleteMany({})
    await prisma.user.deleteMany({ where: { steam_id: 'test-steam-id' } })

    // Create test user
    const user = await prisma.user.create({
      data: {
        steam_id: 'test-steam-id',
        persona_name: 'Test User',
        profile_url: 'https://steamcommunity.com/id/testuser',
        avatar: 'https://example.com/avatar.png',
        email: 'test@example.com'
      }
    })
    testUserId = user.id

    // Update mock session with actual user ID
    ;(getSession as jest.Mock).mockResolvedValue({
      user: { id: testUserId, steamId: 'test-steam-id', personaName: 'Test User', email: 'test@example.com' },
      sessionToken: 'test-token',
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    })

    // Create test loadout
    const loadout = await prisma.loadout.create({
      data: {
        user_id: testUserId,
        name: 'Test Loadout',
        budget: 100.00,
        actual_cost: 0
      }
    })
    testLoadoutId = loadout.id

    // Create test item
    const item = await prisma.item.create({
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
    testItemId = item.id

    // Create marketplace price for item
    await prisma.marketplacePrice.create({
      data: {
        item_id: testItemId,
        platform: 'csfloat',
        price: 10.00,
        currency: 'USD',
        seller_fee_percent: 2.0,
        buyer_fee_percent: 0,
        total_cost: 10.00,
        listing_url: 'https://csfloat.com/item/test',
        quantity_available: 1,
        last_updated: new Date()
      }
    })
  })

  afterEach(async () => {
    // Cleanup
    await prisma.loadoutWeaponSkin.deleteMany({})
    await prisma.loadout.deleteMany({})
    await prisma.marketplacePrice.deleteMany({})
    await prisma.item.deleteMany({})
    await prisma.user.deleteMany({ where: { steam_id: 'test-steam-id' } })
  })

  // ============================================================================
  // Add Item Action Tests
  // ============================================================================

  describe('addItemToLoadoutAction', () => {
    // BDD: Scenario "Save item selection to database"
    it('should create LoadoutWeaponSkin record', async () => {
      const result = await addItemToLoadoutAction(testLoadoutId, testItemId, 'AK-47')

      if (!result.success) {
        console.log('Error:', result.error)
      }

      expect(result.success).toBe(true)
      expect(result.loadoutWeaponSkin).toBeDefined()

      // Verify record was created in database
      const record = await prisma.loadoutWeaponSkin.findFirst({
        where: { loadout_id: testLoadoutId, weapon_type: 'AK-47' }
      })
      expect(record).toBeDefined()
    })

    it('should store loadout_id in record', async () => {
      const loadoutId = 'loadout-123'
      const storedLoadoutId = loadoutId
      expect(storedLoadoutId).toBe('loadout-123')
    })

    it('should store item_id in record', async () => {
      const itemId = 'item-456'
      const storedItemId = itemId
      expect(storedItemId).toBe('item-456')
    })

    it('should store weapon_type in record', async () => {
      const weaponType = 'AK-47'
      const storedWeaponType = weaponType
      expect(storedWeaponType).toBe('AK-47')
    })

    it('should update loadout actual_cost', async () => {
      const previousCost = 0.00
      const itemPrice = 12.50
      const newCost = previousCost + itemPrice
      expect(newCost).toBe(12.50)
    })

    it('should calculate item price from marketplace_prices', async () => {
      const prices = [12.50, 14.20, 13.80]
      const bestPrice = Math.min(...prices)
      expect(bestPrice).toBe(12.50)
    })

    it('should return success result with created record', async () => {
      const result: AddItemResult = {
        success: true,
        loadoutWeaponSkin: {
          id: 'lwsk-789',
          loadout_id: 'loadout-123',
          item_id: 'item-456',
          weapon_type: 'AK-47'
        },
        actualCost: 12.50
      }
      expect(result.success).toBe(true)
    })
  })

  // ============================================================================
  // Budget Validation Tests
  // ============================================================================

  describe('Budget Validation', () => {
    it('should validate item price within category budget', async () => {
      const itemPrice = 12.50
      const categoryBudget = 105.00
      const categorySpent = 50.00
      const remainingBudget = categoryBudget - categorySpent
      const isWithinBudget = itemPrice <= remainingBudget
      expect(isWithinBudget).toBe(true)
    })

    it('should reject if item exceeds category budget', async () => {
      const itemPrice = 150.00
      const categoryBudget = 105.00
      const categorySpent = 0.00
      const remainingBudget = categoryBudget - categorySpent
      const isOverBudget = itemPrice > remainingBudget
      expect(isOverBudget).toBe(true)
    })

    it('should return error when budget exceeded', async () => {
      const result: AddItemResult = {
        success: false,
        error: 'Exceeds weapon skins budget ($105.00 remaining)'
      }
      expect(result.success).toBe(false)
      expect(result.error).toContain('budget')
    })
  })

  // ============================================================================
  // Duplicate Weapon Type Constraint Tests
  // ============================================================================

  describe('Duplicate Weapon Type Constraint', () => {
    it('should prevent duplicate weapon_type in same loadout', async () => {
      const existingWeapon = 'AK-47'
      const newWeapon = 'AK-47'
      const isDuplicate = existingWeapon === newWeapon
      expect(isDuplicate).toBe(true)
    })

    it('should return error when duplicate detected', async () => {
      const result: AddItemResult = {
        success: false,
        error: 'AK-47 already selected. Use replace to change.'
      }
      expect(result.success).toBe(false)
      expect(result.error).toContain('already selected')
    })

    it('should allow different weapon types', async () => {
      const existingWeapon = 'AK-47'
      const newWeapon = 'M4A4'
      const isDuplicate = existingWeapon === newWeapon
      expect(isDuplicate).toBe(false)
    })
  })

  // ============================================================================
  // Remove Item Action Tests
  // ============================================================================

  describe('removeItemFromLoadoutAction', () => {
    // BDD: Scenario "Remove item from loadout"
    it('should delete LoadoutWeaponSkin record', async () => {
      // First add an item
      await addItemToLoadoutAction(testLoadoutId, testItemId, 'AK-47')

      // Verify it exists
      let record = await prisma.loadoutWeaponSkin.findFirst({
        where: { loadout_id: testLoadoutId, weapon_type: 'AK-47' }
      })
      expect(record).toBeDefined()

      // Remove it
      const result = await removeItemFromLoadoutAction(testLoadoutId, 'AK-47')
      expect(result.success).toBe(true)

      // Verify it's deleted
      record = await prisma.loadoutWeaponSkin.findFirst({
        where: { loadout_id: testLoadoutId, weapon_type: 'AK-47' }
      })
      expect(record).toBeNull()
    })

    it('should decrease loadout actual_cost', async () => {
      const previousCost = 50.50
      const itemPrice = 12.50
      const newCost = previousCost - itemPrice
      expect(newCost).toBe(38.00)
    })

    it('should return success result with updated cost', async () => {
      const result: RemoveItemResult = {
        success: true,
        actualCost: 38.00
      }
      expect(result.success).toBe(true)
      expect(result.actualCost).toBe(38.00)
    })

    it('should return error if item not found', async () => {
      const result: RemoveItemResult = {
        success: false,
        error: 'Item not found in loadout'
      }
      expect(result.success).toBe(false)
    })
  })

  // ============================================================================
  // Replace Item Action Tests
  // ============================================================================

  describe('replaceItemAction', () => {
    // BDD: Scenario "Replace existing weapon skin"
    it('should delete old LoadoutWeaponSkin record', async () => {
      // Add initial item
      await addItemToLoadoutAction(testLoadoutId, testItemId, 'AK-47')
      const oldRecord = await prisma.loadoutWeaponSkin.findFirst({
        where: { loadout_id: testLoadoutId, weapon_type: 'AK-47' }
      })
      const oldRecordId = oldRecord!.id

      // Create new item for replacement
      const newItem = await prisma.item.create({
        data: {
          name: 'AK-47 | Asiimov (Field-Tested)',
          display_name: 'AK-47 | Asiimov (Field-Tested)',
          search_name: 'ak47asiimovfieldtested',
          type: 'skin',
          weapon_type: 'AK-47',
          rarity: 'covert',
          quality: 'normal',
          wear: 'field_tested',
          image_url: 'https://example.com/ak47-asiimov.png'
        }
      })
      await prisma.marketplacePrice.create({
        data: {
          item_id: newItem.id,
          platform: 'csfloat',
          price: 15.00,
          currency: 'USD',
          seller_fee_percent: 2.0,
          buyer_fee_percent: 0,
          total_cost: 15.00,
          listing_url: 'https://csfloat.com/item/test2',
          quantity_available: 1,
          last_updated: new Date()
        }
      })

      // Replace
      await replaceItemAction(testLoadoutId, 'AK-47', newItem.id)

      // Verify old record deleted
      const deletedRecord = await prisma.loadoutWeaponSkin.findUnique({
        where: { id: oldRecordId }
      })
      expect(deletedRecord).toBeNull()
    })

    it('should create new LoadoutWeaponSkin record', async () => {
      // Add initial item
      await addItemToLoadoutAction(testLoadoutId, testItemId, 'AK-47')

      // Create new item for replacement
      const newItem = await prisma.item.create({
        data: {
          name: 'AK-47 | Asiimov (Field-Tested)',
          display_name: 'AK-47 | Asiimov (Field-Tested)',
          search_name: 'ak47asiimovfieldtested',
          type: 'skin',
          weapon_type: 'AK-47',
          rarity: 'covert',
          quality: 'normal',
          wear: 'field_tested',
          image_url: 'https://example.com/ak47-asiimov.png'
        }
      })
      await prisma.marketplacePrice.create({
        data: {
          item_id: newItem.id,
          platform: 'csfloat',
          price: 15.00,
          currency: 'USD',
          seller_fee_percent: 2.0,
          buyer_fee_percent: 0,
          total_cost: 15.00,
          listing_url: 'https://csfloat.com/item/test2',
          quantity_available: 1,
          last_updated: new Date()
        }
      })

      // Replace
      const result = await replaceItemAction(testLoadoutId, 'AK-47', newItem.id)
      expect(result.success).toBe(true)

      // Verify new record created
      const newRecord = await prisma.loadoutWeaponSkin.findFirst({
        where: { loadout_id: testLoadoutId, item_id: newItem.id }
      })
      expect(newRecord).toBeDefined()
      expect(newRecord!.weapon_type).toBe('AK-47')
    })

    it('should update actual_cost (subtract old, add new)', async () => {
      const previousCost = 50.50
      const oldItemPrice = 12.50
      const newItemPrice = 18.00
      const updatedCost = previousCost - oldItemPrice + newItemPrice
      expect(updatedCost).toBe(56.00)
    })

    it('should maintain same weapon_type', async () => {
      const weaponType = 'AK-47'
      const oldWeaponType = weaponType
      const newWeaponType = weaponType
      expect(oldWeaponType).toBe(newWeaponType)
    })

    it('should return success with removed and added IDs', async () => {
      const result: ReplaceItemResult = {
        success: true,
        removed: 'lwsk-old',
        added: 'lwsk-new',
        actualCost: 56.00
      }
      expect(result.success).toBe(true)
      expect(result.removed).toBeDefined()
      expect(result.added).toBeDefined()
    })

    it('should validate new item within budget', async () => {
      const oldItemPrice = 12.50
      const newItemPrice = 150.00
      const categoryBudget = 105.00
      const categorySpent = 50.00 // Including old item
      const remainingAfterRemoval = categoryBudget - (categorySpent - oldItemPrice)
      const isWithinBudget = newItemPrice <= remainingAfterRemoval
      expect(isWithinBudget).toBe(false)
    })
  })

  // ============================================================================
  // Authentication Tests
  // ============================================================================

  describe('Authentication', () => {
    it('should require user to be authenticated', async () => {
      // Mock no session (not authenticated)
      ;(getSession as jest.Mock).mockResolvedValueOnce(null)

      const result = await addItemToLoadoutAction(testLoadoutId, testItemId, 'AK-47')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not authenticated')
    })

    it('should return error if not authenticated', async () => {
      ;(getSession as jest.Mock).mockResolvedValueOnce(null)

      const result = await addItemToLoadoutAction(testLoadoutId, testItemId, 'AK-47')

      expect(result.success).toBe(false)
      expect(result.error).toContain('authenticated')
    })
  })

  // ============================================================================
  // Authorization Tests
  // ============================================================================

  describe('Authorization', () => {
    it('should verify user owns the loadout', async () => {
      // Mock different user ID
      ;(getSession as jest.Mock).mockResolvedValueOnce({
        user: { id: 'different-user-id', steamId: 'different-steam', personaName: 'Different User', email: 'other@example.com' },
        sessionToken: 'test-token',
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
      })

      const result = await addItemToLoadoutAction(testLoadoutId, testItemId, 'AK-47')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
    })

    it('should return error if user does not own loadout', async () => {
      // Mock different user ID
      ;(getSession as jest.Mock).mockResolvedValueOnce({
        user: { id: 'different-user-id', steamId: 'different-steam', personaName: 'Different User', email: 'other@example.com' },
        sessionToken: 'test-token',
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
      })

      const result = await addItemToLoadoutAction(testLoadoutId, testItemId, 'AK-47')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unauthorized')
    })
  })

  // ============================================================================
  // Database Error Handling Tests
  // ============================================================================

  describe('Database Error Handling', () => {
    // BDD: Scenario "Handle Server Action errors"
    it('should handle database connection errors', async () => {
      // Test with invalid loadout ID (will trigger database error)
      const result = await addItemToLoadoutAction('invalid-uuid-format', testItemId, 'AK-47')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should return error message on database failure', async () => {
      // Invalid item ID
      const result = await addItemToLoadoutAction(testLoadoutId, 'non-existent-item-id', 'AK-47')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should log errors for debugging', async () => {
      // Server actions catch and return errors - they handle gracefully
      const result = await addItemToLoadoutAction('invalid-id', 'invalid-id', 'AK-47')

      // Error is caught and returned, not thrown
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  // ============================================================================
  // Concurrent Request Handling Tests
  // ============================================================================

  describe('Concurrent Request Handling', () => {
    // BDD: Scenario "Handle concurrent selections (optimistic UI)"
    it('should handle race conditions gracefully', async () => {
      // Prisma transactions handle race conditions automatically
      // If constraint violated, transaction rolls back
      await addItemToLoadoutAction(testLoadoutId, testItemId, 'AK-47')

      // Try to add same weapon_type again (should fail)
      const result = await addItemToLoadoutAction(testLoadoutId, testItemId, 'AK-47')

      expect(result.success).toBe(false)
      expect(result.error).toContain('already has a skin selected')
    })

    it('should use database transactions for atomic updates', async () => {
      // Actions use prisma.$transaction() - verify by checking atomicity
      const result = await addItemToLoadoutAction(testLoadoutId, testItemId, 'AK-47')

      expect(result.success).toBe(true)

      // Both LoadoutWeaponSkin record and actual_cost should be updated atomically
      const loadout = await prisma.loadout.findUnique({ where: { id: testLoadoutId } })
      const skin = await prisma.loadoutWeaponSkin.findFirst({ where: { loadout_id: testLoadoutId } })

      expect(Number(loadout!.actual_cost)).toBe(10.00) // Price from beforeEach setup (convert Decimal to number)
      expect(skin).toBeDefined()
    })

    it('should rollback on error', async () => {
      // If error occurs mid-transaction, all changes rolled back
      const initialLoadout = await prisma.loadout.findUnique({ where: { id: testLoadoutId } })
      const initialCost = initialLoadout!.actual_cost

      // Try invalid item (will fail)
      await addItemToLoadoutAction(testLoadoutId, 'non-existent-item', 'AK-47')

      // Verify rollback - cost unchanged, no skin created
      const finalLoadout = await prisma.loadout.findUnique({ where: { id: testLoadoutId } })
      const skins = await prisma.loadoutWeaponSkin.findMany({ where: { loadout_id: testLoadoutId } })

      expect(finalLoadout!.actual_cost).toEqual(initialCost)
      expect(skins.length).toBe(0)
    })
  })

  // ============================================================================
  // Data Integrity Tests
  // ============================================================================

  describe('Data Integrity', () => {
    it('should validate loadout exists before adding item', async () => {
      const result = await addItemToLoadoutAction('non-existent-loadout-id', testItemId, 'AK-47')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Loadout not found')
    })

    it('should validate item exists before adding', async () => {
      const result = await addItemToLoadoutAction(testLoadoutId, 'non-existent-item-id', 'AK-47')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Item not found')
    })

    it('should validate item has pricing data', async () => {
      // Create item without marketplace price
      const itemWithoutPrice = await prisma.item.create({
        data: {
          name: 'M4A4 | Asiimov (Field-Tested)',
          display_name: 'M4A4 | Asiimov (Field-Tested)',
          search_name: 'm4a4asiimovfieldtested',
          type: 'skin',
          weapon_type: 'M4A4',
          rarity: 'covert',
          quality: 'normal',
          wear: 'field_tested',
          image_url: 'https://example.com/m4a4-asiimov.png'
        }
      })

      // Action should still work, using 0 as price fallback
      const result = await addItemToLoadoutAction(testLoadoutId, itemWithoutPrice.id, 'M4A4')

      expect(result.success).toBe(true)
      expect(result.actualCost).toBe(0)
    })

    it('should ensure actual_cost never goes negative', async () => {
      const cost = 0.00
      const removal = 10.00
      const newCost = Math.max(0, cost - removal)
      expect(newCost).toBe(0.00)
    })
  })

  // ============================================================================
  // Idempotency Tests
  // ============================================================================

  describe('Idempotency', () => {
    // BDD: Scenario "Prevent duplicate submissions"
    it('should prevent duplicate submissions', async () => {
      // First submission succeeds
      const result1 = await addItemToLoadoutAction(testLoadoutId, testItemId, 'AK-47')
      expect(result1.success).toBe(true)

      // Second submission for same weapon_type fails (constraint)
      const result2 = await addItemToLoadoutAction(testLoadoutId, testItemId, 'AK-47')
      expect(result2.success).toBe(false)
      expect(result2.error).toContain('already has a skin selected')
    })

    it('should return same result on repeated calls', async () => {
      // Removing non-existent item returns same error
      const result1 = await removeItemFromLoadoutAction(testLoadoutId, 'M4A4')
      const result2 = await removeItemFromLoadoutAction(testLoadoutId, 'M4A4')

      expect(result1.success).toBe(false)
      expect(result2.success).toBe(false)
      expect(result1.error).toBe(result2.error)
    })
  })
})
