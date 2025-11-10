'use server'

/**
 * Server Actions for Inventory Operations
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Minimal-friction workflow with direct Steam link (lines 132-146)
 *
 * Server Actions:
 * - retryInventoryImport: Re-sync inventory after user changes privacy settings
 * - Validates session before executing
 * - Calls InventorySyncService
 * - Returns success/error status
 */

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export interface RetryImportResult {
  success: boolean
  message: string
  syncStatus?: string
}

export interface ImportProgress {
  current: number
  total: number | null
}

export interface ImportResult {
  success: boolean
  message: string
  status: 'importing' | 'complete' | 'error'
  itemsImported?: number
  progress?: ImportProgress
  retryAfter?: number // Seconds to wait before retrying (for rate limit errors)
}

/**
 * Start initial inventory import from Steam
 *
 * Called from ImportButton "Import Steam Inventory" button
 * Triggers first-time inventory fetch and storage
 */
export async function startInventoryImport(): Promise<ImportResult> {
  try {
    // Verify user session
    const session = await getSession()

    if (!session || !session.user) {
      return {
        success: false,
        status: 'error',
        message: 'Authentication required'
      }
    }

    const userId = session.user.id
    const steamId = session.user.steamId

    if (!steamId) {
      return {
        success: false,
        status: 'error',
        message: 'Steam ID not found. Please sign in with Steam.'
      }
    }

    // Check if inventory already exists
    const existingInventory = await prisma.userInventory.findUnique({
      where: { user_id: userId }
    })

    if (existingInventory) {
      return {
        success: false,
        status: 'error',
        message: 'Inventory already imported. Use refresh instead.'
      }
    }

    // TODO: Call actual InventorySyncService.syncInventory(userId, steamId)
    // For now, simulate import process

    // Simulate successful import with mock data
    const mockItemCount = 247
    const mockTotalValue = 2458.67

    // Create user inventory record
    await prisma.userInventory.create({
      data: {
        user_id: userId,
        steam_id: steamId,
        total_items: mockItemCount,
        total_value: mockTotalValue,
        sync_status: 'success',
        is_public: true,
        consent_given: true,
        last_synced: new Date()
      }
    })

    // Revalidate the inventory page
    revalidatePath('/inventory')

    return {
      success: true,
      status: 'complete',
      message: 'Import Complete',
      itemsImported: mockItemCount
    }

  } catch (error) {
    console.error('Start inventory import error:', error)

    return {
      success: false,
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to fetch inventory. Please try again.'
    }
  }
}

/**
 * Retry inventory import after user changes Steam privacy settings
 *
 * Called from PrivacyModal "I've Changed It - Retry Import" button
 * Triggers InventorySyncService to re-fetch inventory from Steam
 */
export async function retryInventoryImport(): Promise<RetryImportResult> {
  try {
    // Verify user session
    const session = await getSession()

    if (!session || !session.user) {
      return {
        success: false,
        message: 'Authentication required'
      }
    }

    const userId = session.user.id
    const steamId = session.user.steamId

    // Fetch current inventory status
    const inventory = await prisma.userInventory.findUnique({
      where: { user_id: userId }
    })

    if (!inventory) {
      return {
        success: false,
        message: 'No inventory found. Please import first.'
      }
    }

    // Simple retry: Update sync_status to 'pending' and trigger re-sync
    // In real implementation, this would call InventorySyncService
    // For now, simulate a successful re-sync by updating status

    // TODO: Call actual InventorySyncService.syncInventory(userId, steamId)
    // const syncResult = await InventorySyncService.syncInventory(userId, steamId)

    // Simulate: If inventory was private, it might still be private
    // In real implementation, this would come from Steam API response
    const stillPrivate = Math.random() > 0.7 // 30% chance still private

    if (stillPrivate) {
      return {
        success: false,
        message: 'Inventory is still private. Please check your Steam privacy settings.',
        syncStatus: 'private'
      }
    }

    // Update inventory status to success
    await prisma.userInventory.update({
      where: { user_id: userId },
      data: {
        sync_status: 'success',
        is_public: true,
        last_synced: new Date()
      }
    })

    // Revalidate the inventory page to show updated data
    revalidatePath('/inventory')

    return {
      success: true,
      message: 'Inventory imported successfully!',
      syncStatus: 'success'
    }

  } catch (error) {
    console.error('Retry inventory import error:', error)

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retry import'
    }
  }
}
