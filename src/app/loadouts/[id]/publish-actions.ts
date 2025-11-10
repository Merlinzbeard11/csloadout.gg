'use server'

/**
 * Phase 7a: Publish Toggle Server Actions
 *
 * BDD: features/08-budget-loadout-builder-phase7.feature (lines 18-57)
 * Tests: __tests__/publish-toggle.test.ts
 *
 * Responsibilities:
 * - Toggle loadout is_public field
 * - Generate URL-safe slug from loadout name
 * - Handle duplicate slugs with numeric suffix
 * - Preserve slug when making private
 * - Enforce authorization (only owner can toggle)
 * - Return success/error with updated loadout data
 */

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

interface TogglePublishResult {
  success: boolean
  message?: string
  error?: string
  loadout?: {
    id: string
    name: string
    is_public: boolean
    slug: string | null
  }
}

/**
 * Generate URL-safe slug from loadout name
 *
 * Rules:
 * - Lowercase
 * - Replace spaces with hyphens
 * - Remove special characters
 * - Truncate to 100 characters
 * - Fallback to UUID if result is empty
 */
function generateSlug(name: string, fallbackId: string): string {
  // Convert to lowercase
  let slug = name.toLowerCase()

  // Replace spaces with hyphens
  slug = slug.replace(/\s+/g, '-')

  // Remove special characters (keep alphanumeric and hyphens)
  slug = slug.replace(/[^a-z0-9-]/g, '')

  // Remove consecutive hyphens
  slug = slug.replace(/-+/g, '-')

  // Trim hyphens from start/end
  slug = slug.replace(/^-+|-+$/g, '')

  // Truncate to 100 characters
  slug = slug.substring(0, 100)

  // Fallback to ID if empty
  if (!slug) {
    slug = `loadout-${fallbackId.substring(0, 8)}`
  }

  return slug
}

/**
 * Find next available slug by checking for duplicates
 * Appends numeric suffix (-2, -3, etc.) if slug exists
 */
async function findAvailableSlug(baseSlug: string, loadoutId: string): Promise<string> {
  // Check if base slug is available
  const existing = await prisma.loadout.findFirst({
    where: {
      slug: baseSlug,
      id: { not: loadoutId } // Exclude current loadout
    }
  })

  if (!existing) {
    return baseSlug
  }

  // Find next available suffix
  let suffix = 2
  while (true) {
    const candidateSlug = `${baseSlug}-${suffix}`
    const duplicate = await prisma.loadout.findFirst({
      where: {
        slug: candidateSlug,
        id: { not: loadoutId }
      }
    })

    if (!duplicate) {
      return candidateSlug
    }

    suffix++

    // Safety: prevent infinite loop (highly unlikely with UUIDs)
    if (suffix > 1000) {
      return `${baseSlug}-${Date.now()}`
    }
  }
}

/**
 * Toggle loadout public/private status
 *
 * BDD Scenarios:
 * - Make loadout public with slug generation (lines 18-26)
 * - Generate unique slug from loadout name (lines 28-33)
 * - Handle duplicate slugs with numeric suffix (lines 35-41)
 * - Make public loadout private again (lines 43-50)
 * - Only loadout owner can toggle publish status (lines 52-57)
 */
export async function togglePublishAction(
  loadoutId: string,
  userId: string
): Promise<TogglePublishResult> {
  try {
    // Fetch loadout with authorization check
    const loadout = await prisma.loadout.findUnique({
      where: { id: loadoutId },
      select: {
        id: true,
        user_id: true,
        name: true,
        is_public: true,
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

    // Authorization: only owner can toggle
    if (loadout.user_id !== userId) {
      return {
        success: false,
        error: 'Unauthorized: You do not own this loadout'
      }
    }

    // Toggle is_public
    const newPublicStatus = !loadout.is_public

    // If making public, generate slug if it doesn't exist
    let slug = loadout.slug
    if (newPublicStatus && !slug) {
      const baseSlug = generateSlug(loadout.name, loadout.id)
      slug = await findAvailableSlug(baseSlug, loadout.id)
    }

    // Update loadout
    const updated = await prisma.loadout.update({
      where: { id: loadoutId },
      data: {
        is_public: newPublicStatus,
        slug: slug
      },
      select: {
        id: true,
        name: true,
        is_public: true,
        slug: true
      }
    })

    // Revalidate cache for loadout page (skip in test environment)
    if (process.env.NODE_ENV !== 'test') {
      try {
        revalidatePath(`/loadouts/${loadoutId}`)
        if (slug) {
          revalidatePath(`/loadouts/${slug}`)
        }
      } catch (e) {
        // revalidatePath may fail in non-Next.js contexts, ignore
        console.warn('Cache revalidation skipped:', e instanceof Error ? e.message : e)
      }
    }

    return {
      success: true,
      message: newPublicStatus ? 'Loadout is now public' : 'Loadout is now private',
      loadout: updated
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error toggling publish status:', errorMessage, error)
    return {
      success: false,
      error: `Failed to toggle publish status: ${errorMessage}`
    }
  }
}
