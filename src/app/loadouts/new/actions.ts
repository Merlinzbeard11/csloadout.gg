'use server'

/**
 * Server Actions for Create Loadout Form
 *
 * Handles:
 * - Form submission with server-side validation
 * - Database creation via Prisma
 * - Unique slug generation with collision handling
 * - Authentication requirement
 * - Redirect on success
 */

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth/session'
import {
  validateCustomAllocation,
  type CustomAllocation
} from '@/lib/budget-loadout/custom-allocation-validator'

interface ActionResult {
  success: boolean
  errors?: {
    name?: string
    description?: string
    budget?: string
    custom_allocation?: string
    _form?: string
  }
  loadoutId?: string
}

/**
 * Generate URL-safe slug from name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/-+/g, '-') // Replace consecutive dashes
    .replace(/^-+|-+$/g, '') // Trim leading/trailing dashes
}

/**
 * Generate unique slug with collision handling
 */
async function generateUniqueSlug(baseName: string, userId: string): Promise<string> {
  let slug = generateSlug(baseName)
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    // Check if slug exists for this user
    const existing = await prisma.loadout.findFirst({
      where: {
        user_id: userId,
        slug: slug
      }
    })

    if (!existing) {
      return slug
    }

    // Add random suffix on collision
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    slug = `${generateSlug(baseName)}-${randomSuffix}`
    attempts++
  }

  // Fallback: use timestamp
  return `${generateSlug(baseName)}-${Date.now()}`
}

/**
 * Server Action: Create Budget Loadout
 */
export async function createLoadoutAction(formData: FormData): Promise<ActionResult> {
  try {
    // Require authentication
    const session = await requireAuth()

    // Extract form data
    const name = formData.get('name')?.toString() || ''
    const description = formData.get('description')?.toString() || ''
    const budgetStr = formData.get('budget')?.toString() || ''
    const theme = formData.get('theme')?.toString() || null
    const useCustomAllocation = formData.get('useCustomAllocation') === 'true'
    const presetMode = formData.get('presetMode')?.toString() as 'balance' | 'price' | 'quality' | 'color_match'

    // Server-side validation
    const errors: ActionResult['errors'] = {}

    // Validate name
    if (!name.trim()) {
      errors.name = 'Name is required'
    } else if (name.trim().length < 3) {
      errors.name = 'Name must be at least 3 characters'
    } else if (name.trim().length > 100) {
      errors.name = 'Name must be 100 characters or less'
    }

    // Validate budget
    const budget = parseFloat(budgetStr)
    if (isNaN(budget)) {
      errors.budget = 'Budget is required'
    } else if (budget <= 0) {
      errors.budget = 'Budget must be positive'
    } else if (budget < 10) {
      errors.budget = 'Minimum budget is $10'
    } else if (budget > 100000) {
      errors.budget = 'Maximum budget is $100,000'
    }

    // Build custom allocation if enabled
    let customAllocation: CustomAllocation | null = null
    if (useCustomAllocation) {
      customAllocation = {
        weapon_skins: parseFloat(formData.get('weapon_skins')?.toString() || '0'),
        knife: parseFloat(formData.get('knife')?.toString() || '0'),
        gloves: parseFloat(formData.get('gloves')?.toString() || '0'),
        agents: parseFloat(formData.get('agents')?.toString() || '0'),
        music_kit: parseFloat(formData.get('music_kit')?.toString() || '0'),
        charms: parseFloat(formData.get('charms')?.toString() || '0')
      }

      // Validate custom allocation
      const validation = validateCustomAllocation(customAllocation)
      if (!validation.isValid) {
        errors.custom_allocation = validation.errors.join(', ')
      }
    }

    // Return validation errors if any
    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        errors
      }
    }

    // Generate unique slug
    const slug = await generateUniqueSlug(name, session.user.id)

    // Create loadout in database
    const loadout = await prisma.loadout.create({
      data: {
        user_id: session.user.id,
        name: name.trim(),
        description: description.trim() || null,
        budget,
        theme,
        slug,
        custom_allocation: customAllocation as any // JSONB field (or null for preset)
      }
    })

    // Redirect to loadout detail page
    redirect(`/loadouts/${loadout.id}`)

  } catch (error) {
    console.error('Error creating loadout:', error)

    // Check if error is redirect (thrown by Next.js redirect())
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error // Re-throw redirect
    }

    return {
      success: false,
      errors: {
        _form: 'Unable to create loadout. Please try again.'
      }
    }
  }
}
