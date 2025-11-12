/**
 * GDPR Data Deletion API Route
 *
 * BDD Reference: features/07-inventory-import.feature (lines 358-364)
 * Scenario: Delete inventory data (GDPR Article 17 - Right to be Forgotten)
 *
 * Compliance:
 * - GDPR Article 17: Right to Erasure ('Right to be Forgotten')
 * - Permanent deletion (hard delete, not soft delete)
 * - Cascade deletion to related records (inventory items)
 * - Audit trail maintained for compliance
 *
 * Requirements:
 * - Authenticated users can delete their complete inventory data
 * - All inventory records deleted with cascade to items
 * - Confirmation message with deletion statistics
 * - Deletion is permanent and irreversible
 * - Returns GDPR compliance statement
 *
 * Security:
 * - Requires authenticated session
 * - Users can only delete their own data
 * - No accidental deletion protection (confirmation handled client-side)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

/**
 * DELETE /api/user/delete-inventory
 *
 * Permanently delete user's inventory data (GDPR Article 17)
 */
export async function DELETE(request: NextRequest) {
  // Step 1: Verify authentication
  const session = await getSession()

  if (!session || !session.user) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    )
  }

  const userId = session.user.id

  try {
    // Step 2: Fetch inventory for statistics (before deletion)
    const inventory = await prisma.userInventory.findUnique({
      where: { user_id: userId },
      include: {
        items: true
      }
    })

    // Handle case where user has no inventory
    if (!inventory) {
      return NextResponse.json({
        success: true,
        message: 'No inventory data found to delete',
        deletedItems: 0,
        deletedValue: 0,
        gdprCompliance: 'This deletion complies with GDPR Article 17 (Right to Erasure). Your request has been processed.'
      })
    }

    // Store statistics before deletion
    const deletedItems = inventory.total_items
    const deletedValue = Number(inventory.total_value)

    // Step 3: Delete inventory (cascade deletes items automatically)
    await prisma.userInventory.delete({
      where: { user_id: userId }
    })

    console.log(`[GDPR] User ${userId} deleted inventory: ${deletedItems} items, $${deletedValue} value`)

    // Step 4: Return success response with statistics
    return NextResponse.json({
      success: true,
      message: 'Inventory data deleted successfully',
      deletedItems,
      deletedValue,
      timestamp: new Date().toISOString(),
      gdprCompliance: 'This deletion complies with GDPR Article 17 (Right to Erasure). Your personal inventory data has been permanently deleted and cannot be recovered.'
    })

  } catch (error) {
    console.error('[GDPR] Error deleting inventory data:', error)
    return NextResponse.json(
      { error: 'Failed to delete inventory data' },
      { status: 500 }
    )
  }
}
