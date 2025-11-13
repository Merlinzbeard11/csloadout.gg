/**
 * GET /api/cases - List all cases
 *
 * BDD Reference: features/02-relational-browsing.feature
 *   - Browse all cases displayed as cards
 *   - Each case shows: image, name, item count, key price
 *   - Cases sorted by release date (newest first)
 *
 * Performance:
 *   - Prevents N+1 queries by using aggregation
 *   - Returns item count without loading all items
 *
 * Response:
 *   {
 *     cases: Case[],
 *     total: number
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering (uses request.url which requires dynamic mode)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Fetch all cases with item counts (prevent N+1 queries)
    const cases = await prisma.case.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image_url: true,
        key_price: true,
        release_date: true,
        _count: {
          select: { case_items: true }, // Aggregated count, not loading all items
        },
      },
      orderBy: {
        release_date: 'desc', // Newest first
      },
    });

    // Transform response
    const formattedCases = cases.map((caseData) => ({
      id: caseData.id,
      name: caseData.name,
      slug: caseData.slug,
      description: caseData.description,
      imageUrl: caseData.image_url,
      keyPrice: caseData.key_price,
      releaseDate: caseData.release_date.toISOString(),
      itemCount: caseData._count.case_items,
    }));

    return NextResponse.json({
      cases: formattedCases,
      total: formattedCases.length,
    });
  } catch (error) {
    console.error('[API /cases] Error:', error);

    return NextResponse.json(
      { error: 'Failed to fetch cases' },
      { status: 500 }
    );
  }
}
