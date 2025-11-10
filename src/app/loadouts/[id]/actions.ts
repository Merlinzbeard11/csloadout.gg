/**
 * Server Actions for Loadout Item Management
 *
 * Feature 08 Phase 6: Item Selection & Persistence
 * BDD: features/08-budget-loadout-builder-phase6.feature lines 264-304
 * Tests: __tests__/loadout-item-actions.test.ts
 *
 * Security: Following 2025 best practices (CVE-2025-29927)
 * - Authenticate INSIDE each action (not middleware)
 * - Validate ALL inputs
 * - Use structured error responses
 * - Handle Prisma errors gracefully
 */

'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// ============================================================================
// Type Definitions
// ============================================================================

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
  actualCost?: number
}

// ============================================================================
// Server Action 1: Add Item to Loadout
// ============================================================================

/**
 * Add item to loadout
 *
 * BDD Scenario: Save item selection to database (line 264)
 *
 * Security:
 * - Authenticates user inside action
 * - Validates user owns loadout
 * - Validates budget constraint
 * - Enforces ONE skin per weapon_type
 *
 * @param loadoutId - UUID of loadout
 * @param itemId - UUID of item to add
 * @param weaponType - Weapon type (AK-47, M4A4, etc.)
 */
export async function addItemToLoadoutAction(
  loadoutId: string,
  itemId: string,
  weaponType: string
): Promise<AddItemResult> {
  try {
    // 1. Authenticate user (2025 security requirement)
    const session = await getSession()
    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    // 2. Validate inputs
    if (!loadoutId || !itemId || !weaponType) {
      return { success: false, error: 'Missing required fields' }
    }

    // 3. Use Prisma transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 3a. Fetch loadout with ownership check
      const loadout = await tx.loadout.findUnique({
        where: { id: loadoutId },
        include: {
          weapon_skins: true
        }
      })

      if (!loadout) {
        throw new Error('Loadout not found')
      }

      // 3b. Verify user owns loadout (authorization)
      if (loadout.user_id !== session.user.id) {
        throw new Error('Unauthorized')
      }

      // 3c. Fetch item to get price
      const item = await tx.item.findUnique({
        where: { id: itemId },
        include: {
          marketplace_prices: {
            orderBy: { total_cost: 'asc' },
            take: 1
          }
        }
      })

      if (!item) {
        throw new Error('Item not found')
      }

      const itemPrice = item.marketplace_prices[0]?.total_cost || 0

      // 3d. Check budget constraint
      const newActualCost = Number(loadout.actual_cost) + Number(itemPrice)
      if (newActualCost > Number(loadout.budget)) {
        throw new Error(`Exceeds budget ($${(Number(loadout.budget) - Number(loadout.actual_cost)).toFixed(2)} remaining)`)
      }

      // 3e. Check ONE skin per weapon_type constraint
      const existingSkin = loadout.weapon_skins.find(
        skin => skin.weapon_type === weaponType
      )

      if (existingSkin) {
        throw new Error(`${weaponType} already has a skin selected. Use replaceItemAction instead.`)
      }

      // 3f. Create LoadoutWeaponSkin record
      const loadoutWeaponSkin = await tx.loadoutWeaponSkin.create({
        data: {
          loadout_id: loadoutId,
          item_id: itemId,
          weapon_type: weaponType,
          selected_platform: item.marketplace_prices[0]?.platform || 'unknown',
          price: itemPrice
        }
      })

      // 3g. Update loadout actual_cost
      const updatedLoadout = await tx.loadout.update({
        where: { id: loadoutId },
        data: {
          actual_cost: newActualCost
        }
      })

      return {
        loadoutWeaponSkin,
        actualCost: Number(updatedLoadout.actual_cost)
      }
    })

    // 4. Revalidate path for fresh data
    revalidatePath(`/loadouts/${loadoutId}`)

    // 5. Return success
    return {
      success: true,
      loadoutWeaponSkin: {
        id: result.loadoutWeaponSkin.id,
        loadout_id: result.loadoutWeaponSkin.loadout_id,
        item_id: result.loadoutWeaponSkin.item_id,
        weapon_type: result.loadoutWeaponSkin.weapon_type
      },
      actualCost: result.actualCost
    }

  } catch (error) {
    // Handle errors gracefully
    const errorMessage = error instanceof Error ? error.message : 'Failed to add item'
    return { success: false, error: errorMessage }
  }
}

// ============================================================================
// Server Action 2: Remove Item from Loadout
// ============================================================================

/**
 * Remove item from loadout
 *
 * BDD Scenario: Remove item from loadout (line 245)
 *
 * @param loadoutId - UUID of loadout
 * @param weaponType - Weapon type to remove
 */
export async function removeItemFromLoadoutAction(
  loadoutId: string,
  weaponType: string
): Promise<RemoveItemResult> {
  try {
    // 1. Authenticate user
    const session = await getSession()
    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    // 2. Validate inputs
    if (!loadoutId || !weaponType) {
      return { success: false, error: 'Missing required fields' }
    }

    // 3. Use Prisma transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 3a. Fetch loadout with ownership check
      const loadout = await tx.loadout.findUnique({
        where: { id: loadoutId }
      })

      if (!loadout) {
        throw new Error('Loadout not found')
      }

      // 3b. Verify user owns loadout
      if (loadout.user_id !== session.user.id) {
        throw new Error('Unauthorized')
      }

      // 3c. Find LoadoutWeaponSkin by loadout_id + weapon_type
      const skin = await tx.loadoutWeaponSkin.findFirst({
        where: {
          loadout_id: loadoutId,
          weapon_type: weaponType
        },
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

      if (!skin) {
        throw new Error(`No ${weaponType} skin found in loadout`)
      }

      const itemPrice = skin.item.marketplace_prices[0]?.total_cost || 0

      // 3d. Delete LoadoutWeaponSkin record
      await tx.loadoutWeaponSkin.delete({
        where: { id: skin.id }
      })

      // 3e. Update loadout actual_cost (subtract item price)
      const newActualCost = Number(loadout.actual_cost) - Number(itemPrice)
      const updatedLoadout = await tx.loadout.update({
        where: { id: loadoutId },
        data: {
          actual_cost: Math.max(0, newActualCost) // Prevent negative cost
        }
      })

      return {
        actualCost: Number(updatedLoadout.actual_cost)
      }
    })

    // 4. Revalidate path
    revalidatePath(`/loadouts/${loadoutId}`)

    // 5. Return success
    return {
      success: true,
      actualCost: result.actualCost
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to remove item'
    return { success: false, error: errorMessage }
  }
}

// ============================================================================
// Server Action 3: Replace Item
// ============================================================================

/**
 * Replace existing weapon skin with new one
 *
 * BDD Scenario: Replace existing weapon skin (line 207)
 *
 * @param loadoutId - UUID of loadout
 * @param oldWeaponType - Weapon type to replace
 * @param newItemId - UUID of new item
 */
export async function replaceItemAction(
  loadoutId: string,
  oldWeaponType: string,
  newItemId: string
): Promise<ReplaceItemResult> {
  try {
    // 1. Authenticate user
    const session = await getSession()
    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    // 2. Validate inputs
    if (!loadoutId || !oldWeaponType || !newItemId) {
      return { success: false, error: 'Missing required fields' }
    }

    // 3. Use Prisma transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 3a. Fetch loadout with ownership check
      const loadout = await tx.loadout.findUnique({
        where: { id: loadoutId }
      })

      if (!loadout) {
        throw new Error('Loadout not found')
      }

      // 3b. Verify user owns loadout
      if (loadout.user_id !== session.user.id) {
        throw new Error('Unauthorized')
      }

      // 3c. Find old LoadoutWeaponSkin
      const oldSkin = await tx.loadoutWeaponSkin.findFirst({
        where: {
          loadout_id: loadoutId,
          weapon_type: oldWeaponType
        },
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

      if (!oldSkin) {
        throw new Error(`No ${oldWeaponType} skin found in loadout`)
      }

      const oldPrice = oldSkin.item.marketplace_prices[0]?.total_cost || 0

      // 3d. Fetch new item to get price
      const newItem = await tx.item.findUnique({
        where: { id: newItemId },
        include: {
          marketplace_prices: {
            orderBy: { total_cost: 'asc' },
            take: 1
          }
        }
      })

      if (!newItem) {
        throw new Error('New item not found')
      }

      const newPrice = newItem.marketplace_prices[0]?.total_cost || 0

      // 3e. Check budget constraint (new price vs old price)
      const costDifference = Number(newPrice) - Number(oldPrice)
      const newActualCost = Number(loadout.actual_cost) + costDifference

      if (newActualCost > Number(loadout.budget)) {
        throw new Error(`Exceeds budget ($${(Number(loadout.budget) - Number(loadout.actual_cost)).toFixed(2)} remaining)`)
      }

      // 3f. Delete old LoadoutWeaponSkin (executed first for sequential order)
      await tx.loadoutWeaponSkin.delete({
        where: { id: oldSkin.id }
      })

      // 3g. Create new LoadoutWeaponSkin (executed second)
      await tx.loadoutWeaponSkin.create({
        data: {
          loadout_id: loadoutId,
          item_id: newItemId,
          weapon_type: oldWeaponType,
          selected_platform: newItem.marketplace_prices[0]?.platform || 'unknown',
          price: newPrice
        }
      })

      // 3h. Update loadout actual_cost
      const updatedLoadout = await tx.loadout.update({
        where: { id: loadoutId },
        data: {
          actual_cost: newActualCost
        }
      })

      return {
        actualCost: Number(updatedLoadout.actual_cost)
      }
    })

    // 4. Revalidate path
    revalidatePath(`/loadouts/${loadoutId}`)

    // 5. Return success
    return {
      success: true,
      actualCost: result.actualCost
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to replace item'
    return { success: false, error: errorMessage }
  }
}
