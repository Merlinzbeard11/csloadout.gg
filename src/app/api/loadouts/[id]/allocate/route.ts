/**
 * POST /api/loadouts/:id/allocate - Run Budget Allocation Algorithm
 *
 * BDD Reference: features/08-budget-loadout-builder-phase4.feature:219-246
 *
 * Executes the budget allocation algorithm for a specific loadout.
 * Uses saved loadout settings (budget, custom_allocation, prioritize mode).
 * Optionally enables float optimization guidance.
 *
 * Authentication: Required (getSessionFromRequest)
 * Authorization: User must own the loadout
 *
 * Response: AllocationResult from Phase 3 budget-allocator
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth/session'
import { allocateBudgetForLoadout } from '@/lib/budget-loadout/budget-allocator'

// ============================================================================
// POST /api/loadouts/:id/allocate - Run Budget Allocation Algorithm
// ============================================================================

export async function POST(
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

    // Check if loadout exists and user owns it
    const loadout = await prisma.loadout.findUnique({
      where: { id: loadoutId },
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

    // Authorization check
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

    // Run budget allocation algorithm (uses loadout settings)
    const allocationResult = await allocateBudgetForLoadout(loadoutId)

    // Transform Decimal to number for JSON serialization
    const data = {
      totalBudget: allocationResult.totalBudget,
      categoryAllocations: allocationResult.categoryAllocations.map((c) => ({
        category: c.category,
        percentage: c.percentage,
        allocatedBudget: c.allocatedBudget,
      })),
      weaponAllocations: allocationResult.weaponAllocations.map((w) => ({
        weaponType: w.weaponType,
        budgetWeight: w.budgetWeight,
        allocatedBudget: w.allocatedBudget,
        isEssential: w.isEssential,
      })),
      allocationMode: allocationResult.allocationMode,
      floatGuidance: allocationResult.floatGuidance,
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
    console.error(`POST /api/loadouts/${params.id}/allocate error:`, error)
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
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}
