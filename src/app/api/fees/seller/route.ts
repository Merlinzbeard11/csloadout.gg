/**
 * POST /api/fees/seller - Calculate seller proceeds after fees
 *
 * BDD Reference: features/05-fee-transparency.feature:58-90
 * Service: src/lib/fee-calculator.ts
 * Tests: __tests__/api-fee-calculator.test.ts
 *
 * Request Body:
 *   {
 *     salePrice: number,      // Item sale price (e.g., 100.00)
 *     platform: string        // Platform identifier (e.g., "steam", "csfloat")
 *   }
 *
 * Response:
 *   {
 *     salePrice: number,
 *     platformFee: number,      // Negative value (seller pays)
 *     sellerReceives: number,
 *     effectiveFeePercent: string,
 *     badgeText?: string        // "Low Fees: 2%" for platforms with ≤2% fees
 *   }
 *
 * Critical Gotchas:
 * - Validate request body (missing/invalid fields return 400)
 * - Platform fee is negative (seller pays)
 * - Prisma Decimal conversion to number (.toNumber())
 */

import { NextRequest, NextResponse } from 'next/server';
import { feeCalculator } from '@/lib/fee-calculator';
import type { SellerProceedsInput } from '@/types/fees';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request body
    if (typeof body.salePrice !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request: salePrice must be a number' },
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
    const input: SellerProceedsInput = {
      salePrice: body.salePrice,
      platform: body.platform,
    };

    // Calculate seller proceeds
    const result = await feeCalculator.calculateSellerProceeds(input);

    // Return response
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[API /api/fees/seller] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error calculating seller proceeds' },
      { status: 500 }
    );
  }
}
