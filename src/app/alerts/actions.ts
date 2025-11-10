'use server'

/**
 * Server Actions for Price Alert Management
 *
 * BDD: features/09-price-alerts-phase1.feature
 * Tests: __tests__/price-alerts.test.ts
 *
 * Responsibilities:
 * - Create price alert (with validation)
 * - Update alert target price and notification preferences
 * - Delete alert
 * - Pause/resume alert (toggle is_active)
 * - Validate: positive target_price, at least one notification method
 * - Prevent duplicate active alerts for same user+item
 * - Require authentication
 * - Handle database errors gracefully
 */

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth/session'

interface IActionResult {
  success: boolean
  error?: string
  priceAlert?: {
    id: string
    user_id: string
    item_id: string
    target_price: number
    notify_email: boolean
    notify_push: boolean
    is_active: boolean
  }
}

/**
 * Create price alert
 * BDD: Scenario "Create price alert with email notification" (line 22)
 * BDD: Scenario "Create price alert with push notification" (line 40)
 */
export async function createPriceAlertAction(
  itemId: string,
  targetPrice: number,
  notifyEmail: boolean,
  notifyPush: boolean
): Promise<IActionResult> {
  try {
    // Require authentication
    const session = await requireAuth()

    // Validation: Positive target price
    // BDD: Scenario "Reject invalid target price (negative)" (line 61)
    // BDD: Scenario "Reject invalid target price (zero)" (line 68)
    if (targetPrice <= 0) {
      return {
        success: false,
        error: 'Target price must be greater than $0'
      }
    }

    // Validation: At least one notification method
    // BDD: Scenario "Validate at least one notification method selected" (line 80)
    if (!notifyEmail && !notifyPush) {
      return {
        success: false,
        error: 'Select at least one notification method'
      }
    }

    // Check for duplicate active alerts
    // BDD: Scenario "Prevent duplicate active alerts for same item" (line 90)
    const existingAlert = await prisma.priceAlert.findFirst({
      where: {
        user_id: session.user.id,
        item_id: itemId,
        is_active: true
      }
    })

    if (existingAlert) {
      return {
        success: false,
        error: 'You already have an active alert for this item'
      }
    }

    // Fetch item to verify it exists
    const item = await prisma.item.findUnique({
      where: { id: itemId }
    })

    if (!item) {
      return {
        success: false,
        error: 'Item not found'
      }
    }

    // Create price alert
    const priceAlert = await prisma.priceAlert.create({
      data: {
        user_id: session.user.id,
        item_id: itemId,
        target_price: targetPrice,
        notify_email: notifyEmail,
        notify_push: notifyPush,
        is_active: true
      }
    })

    // Revalidate cache
    revalidatePath('/alerts')
    revalidatePath(`/items/${itemId}`)

    return {
      success: true,
      priceAlert: {
        id: priceAlert.id,
        user_id: priceAlert.user_id,
        item_id: priceAlert.item_id,
        target_price: Number(priceAlert.target_price),
        notify_email: priceAlert.notify_email,
        notify_push: priceAlert.notify_push,
        is_active: priceAlert.is_active
      }
    }
  } catch (error) {
    console.error('Error creating price alert:', error)
    return {
      success: false,
      error: 'Unable to create alert. Please try again.'
    }
  }
}

/**
 * Update price alert
 * BDD: Scenario "Edit alert target price" (line 229)
 */
export async function updatePriceAlertAction(
  alertId: string,
  targetPrice?: number,
  notifyEmail?: boolean,
  notifyPush?: boolean
): Promise<IActionResult> {
  try {
    // Require authentication
    const session = await requireAuth()

    // Fetch alert
    const alert = await prisma.priceAlert.findUnique({
      where: { id: alertId }
    })

    if (!alert) {
      return {
        success: false,
        error: 'Alert not found'
      }
    }

    // Authorization: verify user owns alert
    if (alert.user_id !== session.user.id) {
      return {
        success: false,
        error: 'Unauthorized: you do not own this alert'
      }
    }

    // Validate target price if provided
    if (targetPrice !== undefined && targetPrice <= 0) {
      return {
        success: false,
        error: 'Target price must be greater than $0'
      }
    }

    // Validate at least one notification method
    const finalNotifyEmail = notifyEmail !== undefined ? notifyEmail : alert.notify_email
    const finalNotifyPush = notifyPush !== undefined ? notifyPush : alert.notify_push

    if (!finalNotifyEmail && !finalNotifyPush) {
      return {
        success: false,
        error: 'Select at least one notification method'
      }
    }

    // Update alert
    const updatedAlert = await prisma.priceAlert.update({
      where: { id: alertId },
      data: {
        ...(targetPrice !== undefined && { target_price: targetPrice }),
        ...(notifyEmail !== undefined && { notify_email: notifyEmail }),
        ...(notifyPush !== undefined && { notify_push: notifyPush }),
        updated_at: new Date()
      }
    })

    // Revalidate cache
    revalidatePath('/alerts')
    revalidatePath(`/items/${alert.item_id}`)

    return {
      success: true,
      priceAlert: {
        id: updatedAlert.id,
        user_id: updatedAlert.user_id,
        item_id: updatedAlert.item_id,
        target_price: Number(updatedAlert.target_price),
        notify_email: updatedAlert.notify_email,
        notify_push: updatedAlert.notify_push,
        is_active: updatedAlert.is_active
      }
    }
  } catch (error) {
    console.error('Error updating price alert:', error)
    return {
      success: false,
      error: 'Unable to update alert. Please try again.'
    }
  }
}

/**
 * Delete price alert
 * BDD: Scenario "Delete a price alert" (line 221)
 */
export async function deletePriceAlertAction(
  alertId: string
): Promise<IActionResult> {
  try {
    // Require authentication
    const session = await requireAuth()

    // Fetch alert
    const alert = await prisma.priceAlert.findUnique({
      where: { id: alertId }
    })

    if (!alert) {
      return {
        success: false,
        error: 'Alert not found'
      }
    }

    // Authorization: verify user owns alert
    if (alert.user_id !== session.user.id) {
      return {
        success: false,
        error: 'Unauthorized: you do not own this alert'
      }
    }

    // Delete alert (CASCADE will delete related AlertTrigger records)
    await prisma.priceAlert.delete({
      where: { id: alertId }
    })

    // Revalidate cache
    revalidatePath('/alerts')
    revalidatePath(`/items/${alert.item_id}`)

    return {
      success: true
    }
  } catch (error) {
    console.error('Error deleting price alert:', error)
    return {
      success: false,
      error: 'Unable to delete alert. Please try again.'
    }
  }
}

/**
 * Pause or resume price alert
 * BDD: Scenario "Pause an active alert" (line 206)
 * BDD: Scenario "Resume a paused alert" (line 214)
 */
export async function pauseResumeAlertAction(
  alertId: string,
  isActive: boolean
): Promise<IActionResult> {
  try {
    // Require authentication
    const session = await requireAuth()

    // Fetch alert
    const alert = await prisma.priceAlert.findUnique({
      where: { id: alertId }
    })

    if (!alert) {
      return {
        success: false,
        error: 'Alert not found'
      }
    }

    // Authorization: verify user owns alert
    if (alert.user_id !== session.user.id) {
      return {
        success: false,
        error: 'Unauthorized: you do not own this alert'
      }
    }

    // Update is_active status
    const updatedAlert = await prisma.priceAlert.update({
      where: { id: alertId },
      data: {
        is_active: isActive,
        updated_at: new Date()
      }
    })

    // Revalidate cache
    revalidatePath('/alerts')
    revalidatePath(`/items/${alert.item_id}`)

    return {
      success: true,
      priceAlert: {
        id: updatedAlert.id,
        user_id: updatedAlert.user_id,
        item_id: updatedAlert.item_id,
        target_price: Number(updatedAlert.target_price),
        notify_email: updatedAlert.notify_email,
        notify_push: updatedAlert.notify_push,
        is_active: updatedAlert.is_active
      }
    }
  } catch (error) {
    console.error('Error pausing/resuming alert:', error)
    return {
      success: false,
      error: 'Unable to update alert status. Please try again.'
    }
  }
}
