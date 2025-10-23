import { NextRequest, NextResponse } from 'next/server';
import { getSteamMarketItem } from '@/lib/steam';
import { getCSFloatMarketItem } from '@/lib/csfloat';
import { getSkinportMarketItem } from '@/lib/skinport';

interface PriceData {
  market: string;
  price: number;
  url: string;
  floatValue?: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ item: string }> }
) {
  try {
    const resolvedParams = await params;
    const itemName = decodeURIComponent(resolvedParams.item);

    // Fetch prices from all 3 marketplaces in parallel (server-side, no CORS)
    const [steamItem, csFloatItem, skinportItem] = await Promise.all([
      getSteamMarketItem(itemName),
      getCSFloatMarketItem(itemName),
      getSkinportMarketItem(itemName),
    ]);

    const priceData: PriceData[] = [];

    if (steamItem) {
      priceData.push({
        market: steamItem.market,
        price: steamItem.price,
        url: steamItem.url,
      });
    }

    if (csFloatItem) {
      priceData.push({
        market: csFloatItem.market,
        price: csFloatItem.price,
        url: csFloatItem.url,
        floatValue: csFloatItem.floatValue,
      });
    }

    if (skinportItem) {
      priceData.push({
        market: skinportItem.market,
        price: skinportItem.price,
        url: skinportItem.url,
      });
    }

    return NextResponse.json({
      success: true,
      itemName,
      prices: priceData,
      marketplacesChecked: 3,
    });
  } catch (error) {
    console.error('Error fetching prices:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch pricing data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
