/**
 * GET /api/loadouts/:id - Retrieve Single Loadout
 * PUT /api/loadouts/:id - Update Loadout
 * DELETE /api/loadouts/:id - Delete Loadout
 *
 * BDD Reference: features/08-budget-loadout-builder-phase4.feature
 *
 * Authentication: Required (getSessionFromRequest)
 * Authorization: User can only access their own loadouts
 *
 * Next.js 14 App Router Dynamic Routes:
 * - params.id is passed as second argument
 * - Route file: app/api/loadouts/[id]/route.ts
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth/session'
import {
  validateCustomAllocation,
  type CustomAllocation,
} from '@/lib/budget-loadout/custom-allocation-validator'

// ============================================================================
// GET /api/loadouts/:id - Retrieve Single Loadout
// ============================================================================

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const loadoutId = params.id

    // Validate UUID format
    if (!isValidUUID(loadoutId)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Invalid loadout ID format',
            code: 'VALIDATION_ERROR',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // Fetch loadout with weapon skins
    const loadout = await prisma.loadout.findUnique({
      where: {
        id: loadoutId,
      },
      include: {
        weapon_skins: {
          include: {
            item: true, // Include full item details
          },
        },
      },
    })

    if (!loadout) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Loadout not found',
            code: 'NOT_FOUND',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      )
    }

    // Authorization check - user must own the loadout
    if (loadout.user_id !== session.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Forbidden - not your loadout',
            code: 'FORBIDDEN',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      )
    }

    // Transform to API response format
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
      weapon_skins: loadout.weapon_skins.map((ws) => ({
        id: ws.id,
        weapon_type: ws.weapon_type,
        item_id: ws.item_id,
        item_name: ws.item?.name,
        wear: ws.wear,
        float_value: ws.float_value?.toNumber(),
        quality: ws.quality,
        selected_platform: ws.selected_platform,
        price: ws.price.toNumber(),
        stickers: ws.stickers,
        charms: ws.charms,
      })),
    }

    return NextResponse.json(
      {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error(`GET /api/loadouts/${params.id} error:`, error)
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
// PUT /api/loadouts/:id - Update Loadout
// ============================================================================

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const loadoutId = params.id

    // Validate UUID format
    if (!isValidUUID(loadoutId)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Invalid loadout ID format',
            code: 'VALIDATION_ERROR',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
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

    // Check if loadout exists
    const existingLoadout = await prisma.loadout.findUnique({
      where: { id: loadoutId },
    })

    if (!existingLoadout) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Loadout not found',
            code: 'NOT_FOUND',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      )
    }

    // Authorization check
    if (existingLoadout.user_id !== session.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Forbidden - not your loadout',
            code: 'FORBIDDEN',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      )
    }

    // Validate custom_allocation if provided
    if (body.custom_allocation !== undefined && body.custom_allocation !== null) {
      const validation = validateCustomAllocation(body.custom_allocation as CustomAllocation)
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

    // Build update data (only update provided fields)
    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.budget !== undefined) updateData.budget = body.budget
    if (body.theme !== undefined) updateData.theme = body.theme
    if (body.custom_allocation !== undefined) updateData.custom_allocation = body.custom_allocation
    if (body.is_public !== undefined) updateData.is_public = body.is_public

    // Update loadout
    const updatedLoadout = await prisma.loadout.update({
      where: { id: loadoutId },
      data: updateData,
    })

    // Return updated loadout
    const data = {
      id: updatedLoadout.id,
      name: updatedLoadout.name,
      description: updatedLoadout.description,
      budget: updatedLoadout.budget.toNumber(),
      actual_cost: updatedLoadout.actual_cost.toNumber(),
      theme: updatedLoadout.theme,
      is_public: updatedLoadout.is_public,
      slug: updatedLoadout.slug,
      custom_allocation: updatedLoadout.custom_allocation,
      created_at: updatedLoadout.created_at.toISOString(),
      updated_at: updatedLoadout.updated_at.toISOString(),
    }

    return NextResponse.json(
      {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error(`PUT /api/loadouts/${params.id} error:`, error)
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
// DELETE /api/loadouts/:id - Delete Loadout
// ============================================================================

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const loadoutId = params.id

    // Validate UUID format
    if (!isValidUUID(loadoutId)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Invalid loadout ID format',
            code: 'VALIDATION_ERROR',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // Check if loadout exists
    const existingLoadout = await prisma.loadout.findUnique({
      where: { id: loadoutId },
    })

    if (!existingLoadout) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Loadout not found',
            code: 'NOT_FOUND',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      )
    }

    // Authorization check
    if (existingLoadout.user_id !== session.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Forbidden - not your loadout',
            code: 'FORBIDDEN',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      )
    }

    // Delete loadout (CASCADE deletes weapon_skins)
    await prisma.loadout.delete({
      where: { id: loadoutId },
    })

    // Return 204 No Content
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error(`DELETE /api/loadouts/${params.id} error:`, error)
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
 * Validate UUID v4 format
 * Example: "550e8400-e29b-41d4-a716-446655440000"
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}
