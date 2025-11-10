'use server'

/**
 * Phase 7d: Upvote Server Actions
 *
 * BDD: features/08-budget-loadout-builder-phase7.feature (lines 162-206)
 * Tests: __tests__/upvote-functionality.test.ts
 *
 * Responsibilities:
 * - Toggle upvote (add if not exists, remove if exists)
 * - Enforce authorization (must be authenticated)
 * - Prevent upvoting own loadout
 * - Prevent duplicate upvotes (database constraint)
 * - Update Loadout.upvotes count atomically with LoadoutUpvote record
 * - Return success/error with updated state
 */

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

interface ToggleUpvoteResult {
  success: boolean
  message?: string
  error?: string
  upvoted?: boolean // New state: true if upvoted, false if removed
  upvoteCount?: number // Updated count
}

/**
 * Toggle upvote on a loadout
 *
 * BDD Scenarios:
 * - Upvote a public loadout (lines 166-176)
 * - Remove upvote from loadout (lines 178-185)
 * - Cannot upvote own loadout (lines 187-192)
 * - Must be authenticated to upvote (lines 194-199)
 * - Prevent duplicate upvotes (lines 201-205)
 */
export async function toggleUpvoteAction(
  loadoutId: string,
  userId: string | null
): Promise<ToggleUpvoteResult> {
  try {
    // Authorization: must be authenticated
    if (!userId) {
      return {
        success: false,
        error: 'You must be signed in to upvote loadouts'
      }
    }

    // Fetch loadout with authorization check
    const loadout = await prisma.loadout.findUnique({
      where: { id: loadoutId },
      select: {
        id: true,
        user_id: true,
        is_public: true,
        upvotes: true,
        slug: true
      }
    })

    // Loadout not found
    if (!loadout) {
      return {
        success: false,
        error: 'Loadout not found'
      }
    }

    // Only public loadouts can be upvoted
    if (!loadout.is_public) {
      return {
        success: false,
        error: 'Only public loadouts can be upvoted'
      }
    }

    // Cannot upvote own loadout
    if (loadout.user_id === userId) {
      return {
        success: false,
        error: 'You cannot upvote your own loadout'
      }
    }

    // Check if user already upvoted
    const existingUpvote = await prisma.loadoutUpvote.findFirst({
      where: {
        loadout_id: loadoutId,
        user_id: userId
      }
    })

    // Toggle: Remove if exists, add if not exists
    if (existingUpvote) {
      // Remove upvote (atomic transaction)
      const result = await prisma.$transaction(async (tx) => {
        // Delete upvote record
        await tx.loadoutUpvote.delete({
          where: { id: existingUpvote.id }
        })

        // Decrement count
        const updated = await tx.loadout.update({
          where: { id: loadoutId },
          data: { upvotes: { decrement: 1 } },
          select: { upvotes: true }
        })

        return { upvoted: false, upvoteCount: updated.upvotes }
      })

      // Revalidate cache (skip in test environment)
      if (process.env.NODE_ENV !== 'test') {
        try {
          revalidatePath(`/loadouts/${loadoutId}`)
          if (loadout.slug) {
            revalidatePath(`/loadouts/${loadout.slug}`)
          }
          revalidatePath('/loadouts') // Gallery page
        } catch (e) {
          console.warn('Cache revalidation skipped:', e instanceof Error ? e.message : e)
        }
      }

      return {
        success: true,
        message: 'Upvote removed',
        upvoted: result.upvoted,
        upvoteCount: result.upvoteCount
      }
    } else {
      // Add upvote (atomic transaction)
      const result = await prisma.$transaction(async (tx) => {
        // Create upvote record
        await tx.loadoutUpvote.create({
          data: {
            loadout_id: loadoutId,
            user_id: userId
          }
        })

        // Increment count
        const updated = await tx.loadout.update({
          where: { id: loadoutId },
          data: { upvotes: { increment: 1 } },
          select: { upvotes: true }
        })

        return { upvoted: true, upvoteCount: updated.upvotes }
      })

      // Revalidate cache (skip in test environment)
      if (process.env.NODE_ENV !== 'test') {
        try {
          revalidatePath(`/loadouts/${loadoutId}`)
          if (loadout.slug) {
            revalidatePath(`/loadouts/${loadout.slug}`)
          }
          revalidatePath('/loadouts') // Gallery page
        } catch (e) {
          console.warn('Cache revalidation skipped:', e instanceof Error ? e.message : e)
        }
      }

      return {
        success: true,
        message: 'Loadout upvoted',
        upvoted: result.upvoted,
        upvoteCount: result.upvoteCount
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error toggling upvote:', errorMessage, error)

    // Handle unique constraint violation (duplicate upvote attempt)
    if (errorMessage.includes('Unique constraint')) {
      return {
        success: false,
        error: 'You have already upvoted this loadout'
      }
    }

    return {
      success: false,
      error: `Failed to toggle upvote: ${errorMessage}`
    }
  }
}

/**
 * Check if user has upvoted a loadout
 * Useful for rendering initial button state
 */
export async function checkUserUpvotedAction(
  loadoutId: string,
  userId: string | null
): Promise<boolean> {
  if (!userId) return false

  const upvote = await prisma.loadoutUpvote.findFirst({
    where: {
      loadout_id: loadoutId,
      user_id: userId
    }
  })

  return !!upvote
}
