/**
 * GET /api/loadouts - List User Loadouts
 * POST /api/loadouts - Create New Loadout
 *
 * BDD Reference: features/08-budget-loadout-builder-phase4.feature
 *
 * Authentication: Required (getSessionFromRequest)
 * Authorization: User can only see/create their own loadouts
 *
 * Next.js 14 App Router Conventions:
 * - export async function GET(request: Request)
 * - export async function POST(request: Request)
 * - Return NextResponse.json() with status code
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth/session'
import {
  validateCustomAllocation,
  type CustomAllocation,
} from '@/lib/budget-loadout/custom-allocation-validator'

// ============================================================================
// GET /api/loadouts - List User Loadouts
// ============================================================================

export async function GET(request: Request) {
  try {
    // Authentication check
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Authentication required',
            code: 'UNAUTHORIZED',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      )
    }

    // Fetch user's loadouts ordered by created_at DESC
    const loadouts = await prisma.loadout.findMany({
      where: {
        user_id: session.user.id,
      },
      orderBy: {
        created_at: 'desc',
      },
      include: {
        weapon_skins: true, // Include associated weapon skins
      },
    })

    // Transform to API response format
    const data = loadouts.map((loadout) => ({
      id: loadout.id,
      name: loadout.name,
      description: loadout.description,
      budget: loadout.budget.toNumber(),
      actual_cost: loadout.actual_cost.toNumber(),
      theme: loadout.theme,
      is_public: loadout.is_public,
      slug: loadout.slug,
      custom_allocation: loadout.custom_allocation,
      created_at: loadout.created_at.toISOString(),
      updated_at: loadout.updated_at.toISOString(),
      weapon_count: loadout.weapon_skins.length,
    }))

    return NextResponse.json(
      {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('GET /api/loadouts error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST /api/loadouts - Create New Loadout
// ============================================================================

export async function POST(request: Request) {
  try {
    // Authentication check
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Authentication required',
            code: 'UNAUTHORIZED',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      )
    }

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Invalid JSON',
            code: 'INVALID_JSON',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // Validate required fields
    const { name, budget, description, theme, custom_allocation } = body

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Name is required',
            code: 'VALIDATION_ERROR',
            details: ['name field is required and must be a non-empty string'],
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    if (typeof budget !== 'number' || budget <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Budget must be positive',
            code: 'VALIDATION_ERROR',
            details: ['budget must be a positive number'],
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // Validate custom_allocation if provided
    if (custom_allocation) {
      const validation = validateCustomAllocation(custom_allocation as CustomAllocation)
      if (!validation.isValid) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: validation.errors[0] || 'Custom allocation must sum to 100.00%',
              code: 'VALIDATION_ERROR',
              details: validation.errors,
            },
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        )
      }
    }

    // Generate unique slug from name
    const slug = await generateUniqueSlug(name)

    // Create loadout
    const loadout = await prisma.loadout.create({
      data: {
        user_id: session.user.id,
        name: name.trim(),
        description: description || null,
        budget,
        theme: theme || null,
        custom_allocation: custom_allocation || null,
        slug,
        actual_cost: 0, // No items added yet
        is_public: false, // Default to private
      },
    })

    // Return created loadout
    const data = {
      id: loadout.id,
      name: loadout.name,
      description: loadout.description,
      budget: loadout.budget.toNumber(),
      actual_cost: loadout.actual_cost.toNumber(),
      theme: loadout.theme,
      is_public: loadout.is_public,
      slug: loadout.slug,
      custom_allocation: loadout.custom_allocation,
      created_at: loadout.created_at.toISOString(),
      updated_at: loadout.updated_at.toISOString(),
    }

    return NextResponse.json(
      {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/loadouts error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate URL-friendly slug from name
 * Example: "Red Dragon Budget" → "red-dragon-budget"
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
}

/**
 * Generate unique slug with counter for duplicates
 * BDD Scenario: "Handle duplicate slug with counter"
 * Example: "red-dragon-budget" exists → "red-dragon-budget-2"
 */
async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = generateSlug(name)

  // Check if base slug is available
  const existing = await prisma.loadout.findUnique({
    where: { slug: baseSlug },
  })

  if (!existing) {
    return baseSlug
  }

  // Find next available counter
  let counter = 2
  while (true) {
    const candidateSlug = `${baseSlug}-${counter}`
    const exists = await prisma.loadout.findUnique({
      where: { slug: candidateSlug },
    })

    if (!exists) {
      return candidateSlug
    }

    counter++

    // Safety: prevent infinite loop
    if (counter > 1000) {
      throw new Error('Too many slug collisions')
    }
  }
}
