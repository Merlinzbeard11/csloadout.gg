'use server'

/**
 * Server Actions for Loadout Item Management
 *
 * BDD: features/08-budget-loadout-builder-phase6.feature
 * Tests: __tests__/loadout-item-actions.test.ts
 *
 * Responsibilities:
 * - Add item to loadout (create LoadoutWeaponSkin record)
 * - Remove item from loadout (delete LoadoutWeaponSkin record)
 * - Replace item (delete old + create new in transaction)
 * - Update loadout actual_cost on all operations
 * - Validate budget constraints per category
 * - Enforce ONE weapon_type per loadout constraint
 * - Require authentication
 * - Verify user owns loadout (authorization)
 * - Handle database errors gracefully
 * - Use transactions for atomic updates
 */

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth/session'

interface ActionResult {
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

/**
 * Add item to loadout
 * BDD: Scenario "Save item selection to database"
 */
export async function addItemToLoadoutAction(
  loadoutId: string,
  itemId: string
): Promise<ActionResult> {
  try {
    // Require authentication
    const session = await requireAuth()

    // Fetch item with pricing
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        marketplace_prices: {
          orderBy: { total_cost: 'asc' },
          take: 1
        }
      }
    })

    if (!item) {
      return { success: false, error: 'Item not found' }
    }

    if (item.marketplace_prices.length === 0) {
      return { success: false, error: 'No pricing data available for this item' }
    }

    const itemPrice = Number(item.marketplace_prices[0].total_cost)
    const weaponType = item.weapon_type || 'Unknown'

    // Fetch loadout with selected items
    const loadout = await prisma.loadout.findUnique({
      where: { id: loadoutId },
      include: {
        weapon_skins: {
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
        }
      }
    })

    if (!loadout) {
      return { success: false, error: 'Loadout not found' }
    }

    // Authorization: verify user owns loadout
    if (loadout.user_id !== session.user.id) {
      return { success: false, error: 'Unauthorized: you do not own this loadout' }
    }

    // Check for duplicate weapon_type
    const existingWeapon = loadout.weapon_skins.find(
      lwsk => lwsk.weapon_type === weaponType
    )

    if (existingWeapon) {
      return {
        success: false,
        error: `${weaponType} already selected. Use replace to change.`
      }
    }

    // Calculate category budget and spent
    const allocation = (loadout.custom_allocation as any) || {}
    const category = getCategoryFromWeaponType(weaponType)
    const categoryPercentage = allocation[category] || 0
    const categoryBudget = (Number(loadout.budget) * categoryPercentage) / 100

    const categorySpent = loadout.weapon_skins
      .filter(lwsk => getCategoryFromWeaponType(lwsk.weapon_type) === category)
      .reduce((sum, lwsk) => {
        const price = Number(lwsk.item.marketplace_prices[0]?.total_cost || 0)
        return sum + price
      }, 0)

    const categoryRemaining = categoryBudget - categorySpent

    // Validate budget
    if (itemPrice > categoryRemaining) {
      return {
        success: false,
        error: `Exceeds ${category.replace('_', ' ')} budget ($${categoryRemaining.toFixed(2)} remaining)`
      }
    }

    // Create LoadoutWeaponSkin record
    const loadoutWeaponSkin = await prisma.loadoutWeaponSkin.create({
      data: {
        loadout_id: loadoutId,
        item_id: itemId,
        weapon_type: weaponType,
        selected_platform: item.marketplace_prices[0].platform,
        price: item.marketplace_prices[0].total_cost
      }
    })

    // Update loadout actual_cost
    const newActualCost = Number(loadout.actual_cost) + itemPrice
    await prisma.loadout.update({
      where: { id: loadoutId },
      data: { actual_cost: newActualCost }
    })

    // Revalidate page
    revalidatePath(`/loadouts/${loadoutId}`)

    return {
      success: true,
      loadoutWeaponSkin: {
        id: loadoutWeaponSkin.id,
        loadout_id: loadoutWeaponSkin.loadout_id,
        item_id: loadoutWeaponSkin.item_id,
        weapon_type: loadoutWeaponSkin.weapon_type
      },
      actualCost: newActualCost
    }
  } catch (error) {
    console.error('Error adding item to loadout:', error)
    return {
      success: false,
      error: 'Unable to add item. Please try again.'
    }
  }
}

/**
 * Remove item from loadout
 * BDD: Scenario "Remove item from loadout"
 */
export async function removeItemFromLoadoutAction(
  loadoutWeaponSkinId: string
): Promise<ActionResult> {
  try {
    // Require authentication
    const session = await requireAuth()

    // Fetch LoadoutWeaponSkin with item pricing
    const lwsk = await prisma.loadoutWeaponSkin.findUnique({
      where: { id: loadoutWeaponSkinId },
      include: {
        loadout: true,
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

    if (!lwsk) {
      return { success: false, error: 'Item not found in loadout' }
    }

    // Authorization
    if (lwsk.loadout.user_id !== session.user.id) {
      return { success: false, error: 'Unauthorized: you do not own this loadout' }
    }

    const itemPrice = Number(lwsk.item.marketplace_prices[0]?.total_cost || 0)

    // Delete LoadoutWeaponSkin record
    await prisma.loadoutWeaponSkin.delete({
      where: { id: loadoutWeaponSkinId }
    })

    // Update loadout actual_cost
    const newActualCost = Math.max(0, Number(lwsk.loadout.actual_cost) - itemPrice)
    await prisma.loadout.update({
      where: { id: lwsk.loadout_id },
      data: { actual_cost: newActualCost }
    })

    // Revalidate page
    revalidatePath(`/loadouts/${lwsk.loadout_id}`)

    return {
      success: true,
      actualCost: newActualCost
    }
  } catch (error) {
    console.error('Error removing item from loadout:', error)
    return {
      success: false,
      error: 'Unable to remove item. Please try again.'
    }
  }
}

/**
 * Replace existing item with new item
 * BDD: Scenario "Replace existing weapon skin"
 */
export async function replaceItemAction(
  oldLoadoutWeaponSkinId: string,
  newItemId: string
): Promise<ActionResult> {
  try {
    // Require authentication
    const session = await requireAuth()

    // Fetch old LoadoutWeaponSkin
    const oldLwsk = await prisma.loadoutWeaponSkin.findUnique({
      where: { id: oldLoadoutWeaponSkinId },
      include: {
        loadout: true,
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

    if (!oldLwsk) {
      return { success: false, error: 'Existing item not found' }
    }

    // Authorization
    if (oldLwsk.loadout.user_id !== session.user.id) {
      return { success: false, error: 'Unauthorized: you do not own this loadout' }
    }

    // Fetch new item
    const newItem = await prisma.item.findUnique({
      where: { id: newItemId },
      include: {
        marketplace_prices: {
          orderBy: { total_cost: 'asc' },
          take: 1
        }
      }
    })

    if (!newItem) {
      return { success: false, error: 'New item not found' }
    }

    if (newItem.marketplace_prices.length === 0) {
      return { success: false, error: 'No pricing data for new item' }
    }

    const oldPrice = Number(oldLwsk.item.marketplace_prices[0]?.total_cost || 0)
    const newPrice = Number(newItem.marketplace_prices[0].total_cost)
    const weaponType = oldLwsk.weapon_type

    // Validate weapon_type match
    if (newItem.weapon_type !== weaponType) {
      return {
        success: false,
        error: `Weapon type mismatch: expected ${weaponType}, got ${newItem.weapon_type}`
      }
    }

    // Budget validation (considering removal of old item)
    const allocation = (oldLwsk.loadout.custom_allocation as any) || {}
    const category = getCategoryFromWeaponType(weaponType)
    const categoryPercentage = allocation[category] || 0
    const categoryBudget = (Number(oldLwsk.loadout.budget) * categoryPercentage) / 100

    // Calculate current category spent (excluding the item being replaced)
    const currentActualCost = Number(oldLwsk.loadout.actual_cost)
    const categorySpentAfterRemoval = currentActualCost - oldPrice
    const categoryRemainingAfterRemoval = categoryBudget - categorySpentAfterRemoval

    if (newPrice > categoryRemainingAfterRemoval) {
      return {
        success: false,
        error: `Exceeds budget after replacement ($${categoryRemainingAfterRemoval.toFixed(2)} available)`
      }
    }

    // Transaction: delete old + create new
    const result = await prisma.$transaction(async (tx) => {
      // Delete old
      await tx.loadoutWeaponSkin.delete({
        where: { id: oldLoadoutWeaponSkinId }
      })

      // Create new
      const newLwsk = await tx.loadoutWeaponSkin.create({
        data: {
          loadout_id: oldLwsk.loadout_id,
          item_id: newItemId,
          weapon_type: weaponType,
          selected_platform: newItem.marketplace_prices[0].platform,
          price: newItem.marketplace_prices[0].total_cost
        }
      })

      // Update actual_cost
      const newActualCost = currentActualCost - oldPrice + newPrice
      await tx.loadout.update({
        where: { id: oldLwsk.loadout_id },
        data: { actual_cost: newActualCost }
      })

      return { newLwsk, newActualCost }
    })

    // Revalidate page
    revalidatePath(`/loadouts/${oldLwsk.loadout_id}`)

    return {
      success: true,
      loadoutWeaponSkin: {
        id: result.newLwsk.id,
        loadout_id: result.newLwsk.loadout_id,
        item_id: result.newLwsk.item_id,
        weapon_type: result.newLwsk.weapon_type
      },
      actualCost: result.newActualCost
    }
  } catch (error) {
    console.error('Error replacing item:', error)
    return {
      success: false,
      error: 'Unable to replace item. Please try again.'
    }
  }
}

/**
 * Helper: Determine category from weapon_type
 */
function getCategoryFromWeaponType(weaponType: string): string {
  if (weaponType === 'Knife') return 'knife'
  if (weaponType === 'Gloves') return 'gloves'
  if (weaponType.startsWith('Agent')) return 'agents'
  if (weaponType === 'Music Kit') return 'music_kit'
  if (weaponType === 'Charm') return 'charms'
  return 'weapon_skins'
}
