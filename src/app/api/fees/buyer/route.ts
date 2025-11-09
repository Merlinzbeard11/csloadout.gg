/**
 * POST /api/fees/buyer - Calculate buyer total cost with fees
 *
 * BDD Reference: features/05-fee-transparency.feature:20-52
 * Service: src/lib/fee-calculator.ts
 * Tests: __tests__/api-fee-calculator.test.ts
 *
 * Request Body:
 *   {
 *     basePrice: number,      // Item listing price (e.g., 10.00)
 *     platform: string        // Platform identifier (e.g., "csfloat", "steam", "csmoney")
 *   }
 *
 * Response:
 *   {
 *     basePrice: number,
 *     platformFee: number,
 *     hiddenMarkup: number,
 *     totalCost: number,
 *     effectiveFeePercent: string,
 *     feeNote: string,
 *     hasWarning: boolean,
 *     warningMessage?: string
 *   }
 *
 * Critical Gotchas:
 * - Validate request body (missing/invalid fields return 400)
 * - Handle unknown platforms gracefully (return fee info unavailable)
 * - Prisma Decimal conversion to number (.toNumber())
 */

import { NextRequest, NextResponse } from 'next/server';
import { feeCalculator } from '@/lib/fee-calculator';
import type { FeeCalculationInput } from '@/types/fees';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request body
    if (typeof body.basePrice !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request: basePrice must be a number' },
        { status: 400 }
      );
    }

    if (typeof body.platform !== 'string' || !body.platform) {
      return NextResponse.json(
        { error: 'Invalid request: platform must be a non-empty string' },
        { status: 400 }
      );
    }

    // Build input
    const input: FeeCalculationInput = {
      basePrice: body.basePrice,
      platform: body.platform,
    };

    // Calculate buyer fees
    const result = await feeCalculator.calculateBuyerFees(input);

    // Return response
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[API /api/fees/buyer] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error calculating buyer fees' },
      { status: 500 }
    );
  }
}
