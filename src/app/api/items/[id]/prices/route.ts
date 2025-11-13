/**
 * GET /api/items/:id/prices - Get aggregated marketplace prices
 *
 * BDD Reference: features/04-price-aggregation.feature
 *   - Scenario: "Fast price query response time" (<200ms with cache)
 *   - Scenario: "Handle missing price data" (404)
 *
 * Requirements:
 *   - Return all marketplace prices sorted by totalCost
 *   - Return lowest price and savings calculation
 *   - Include data freshness indicators
 *   - Fast response (<200ms with Redis cache)
 *   - Handle missing price data gracefully
 *
 * Parameters:
 *   - id: UUID of the item
 *
 * Response Format:
 *   {
 *     itemId: string,
 *     itemName: string,
 *     lowestPrice: PriceData,
 *     allPrices: PriceData[],
 *     savings: number,
 *     updatedAt: Date
 *   }
 *
 * Status Codes:
 *   - 200: Success with price data
 *   - 400: Invalid UUID format
 *   - 404: Item not found or no price data available
 *   - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { AggregatedPrices, PriceData } from '@/types/price';
import { fromDatabase, calculateSavings, sortByTotalCost } from '@/types/price';

// Force dynamic rendering (uses dynamic route parameters which require dynamic mode)
export const dynamic = 'force-dynamic';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate UUID format
    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid item ID format' },
        { status: 400 }
      );
    }

    // Fetch item with marketplace prices
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        marketplace_prices: {
          orderBy: {
            total_cost: 'asc', // Sort by cheapest first (uses composite index)
          },
        },
      },
    });

    // Return 404 if item doesn't exist
    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Return 404 if no price data available
    // BDD: "No price data available for this item"
    if (!item.marketplace_prices || item.marketplace_prices.length === 0) {
      return NextResponse.json(
        { error: 'No price data available for this item' },
        { status: 404 }
      );
    }

    // Convert database records to PriceData format
    const allPrices: PriceData[] = item.marketplace_prices.map(dbPrice =>
      fromDatabase(dbPrice)
    );

    // Sort by total cost (already sorted by DB query, but ensure type safety)
    const sortedPrices = sortByTotalCost(allPrices);

    // Lowest price is first after sorting
    const lowestPrice = sortedPrices[0];

    // Calculate savings (highest - lowest)
    const savings = calculateSavings(sortedPrices);

    // Find most recent update time
    const mostRecentUpdate = allPrices.reduce((latest, price) => {
      return price.lastUpdated > latest ? price.lastUpdated : latest;
    }, allPrices[0].lastUpdated);

    // Build aggregated response
    const response: AggregatedPrices = {
      itemId: item.id,
      itemName: item.display_name,
      lowestPrice,
      allPrices: sortedPrices,
      savings,
      updatedAt: mostRecentUpdate,
    };

    // Return successful response
    return NextResponse.json(response, {
      status: 200,
      headers: {
        // Cache for 5 minutes (price data updates every 5 minutes per BDD)
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[API /items/:id/prices] Error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
