import { NextRequest, NextResponse } from 'next/server';
import { getSteamMarketItem } from '@/lib/steam';
import { getCSFloatMarketItem } from '@/lib/csfloat';
import { getSkinportMarketItem } from '@/lib/skinport';
import {
  getCachedPrices,
  getAllCachedPrices,
  upsertPrice,
  extendCacheExpiry,
} from '@/lib/db';

interface PriceData {
  market: string;
  price: number;
  url: string;
  floatValue?: number;
  source?: 'cache' | 'fresh' | 'stale_cache';
  cachedAt?: string;
  warning?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ item: string }> }
) {
  try {
    const resolvedParams = await params;
    const itemName = decodeURIComponent(resolvedParams.item);

    // ============================================================
    // STEP 1: Check cache for valid (non-expired) entries
    // ============================================================
    let cachedPrices = await getCachedPrices(itemName);
    const cachedMarketplaces = new Set(cachedPrices.map(p => p.marketplace));

    // Determine which marketplaces need fresh data
    const needsSteam = !cachedMarketplaces.has('Steam');
    const needsSkinport = !cachedMarketplaces.has('Skinport');
    const needsCSFloat = !cachedMarketplaces.has('CSFloat');

    // ============================================================
    // STEP 2: If all cached, return immediately (cache hit)
    // ============================================================
    if (!needsSteam && !needsSkinport && !needsCSFloat) {
      const priceData = cachedPrices.map(cached => ({
        market: cached.marketplace,
        price: cached.price,
        url: getMarketplaceUrl(itemName, cached.marketplace),
        floatValue: cached.floatValue,
        source: 'cache' as const,
        cachedAt: cached.cachedAt.toISOString(),
      }));

      return NextResponse.json({
        success: true,
        itemName,
        prices: priceData,
        marketplacesChecked: 3,
        cacheHit: true,
      });
    }

    // ============================================================
    // STEP 3: Fetch missing marketplace data (partial or full cache miss)
    // ============================================================
    const fetchPromises = [];

    if (needsSteam) {
      fetchPromises.push(
        getSteamMarketItem(itemName).catch(err => {
          console.error('Steam API error:', err);
          return null;
        })
      );
    }

    if (needsCSFloat) {
      fetchPromises.push(
        getCSFloatMarketItem(itemName).catch(err => {
          console.error('CSFloat API error:', err);
          return null;
        })
      );
    }

    if (needsSkinport) {
      fetchPromises.push(
        getSkinportMarketItem(itemName).catch(err => {
          console.error('Skinport API error:', err);
          return null;
        })
      );
    }

    const freshResults = await Promise.all(fetchPromises);

    // ============================================================
    // STEP 4: Store fresh data in cache
    // ============================================================
    let resultIndex = 0;

    if (needsSteam) {
      const steamItem = freshResults[resultIndex++];
      if (steamItem) {
        await upsertPrice(
          itemName,
          'Steam',
          steamItem.price,
          'USD',
          undefined,
          5 // 5 minute TTL
        );
      }
    }

    if (needsCSFloat) {
      const csFloatItem = freshResults[resultIndex++];
      if (csFloatItem) {
        await upsertPrice(
          itemName,
          'CSFloat',
          csFloatItem.price,
          'USD',
          csFloatItem.floatValue,
          5
        );
      }
    }

    if (needsSkinport) {
      const skinportItem = freshResults[resultIndex++];
      if (skinportItem) {
        await upsertPrice(
          itemName,
          'Skinport',
          skinportItem.price,
          'USD',
          undefined,
          5
        );
      }
    }

    // ============================================================
    // STEP 5: Combine cached + fresh data for response
    // ============================================================
    const priceData: PriceData[] = [];

    // Add cached prices
    for (const cached of cachedPrices) {
      priceData.push({
        market: cached.marketplace,
        price: cached.price,
        url: getMarketplaceUrl(itemName, cached.marketplace),
        floatValue: cached.floatValue,
        source: 'cache',
        cachedAt: cached.cachedAt.toISOString(),
      });
    }

    // Add fresh prices
    resultIndex = 0;

    if (needsSteam) {
      const steamItem = freshResults[resultIndex++];
      if (steamItem) {
        priceData.push({
          market: steamItem.market,
          price: steamItem.price,
          url: steamItem.url,
          source: 'fresh',
        });
      } else {
        // API failed - try stale cache fallback
        const staleCache = await getAllCachedPrices(itemName);
        const staleSteam = staleCache.find(c => c.marketplace === 'Steam');
        if (staleSteam) {
          await extendCacheExpiry(itemName, 'Steam', 5);
          priceData.push({
            market: 'Steam',
            price: staleSteam.price,
            url: getMarketplaceUrl(itemName, 'Steam'),
            floatValue: staleSteam.floatValue,
            source: 'stale_cache',
            cachedAt: staleSteam.cachedAt.toISOString(),
            warning: 'API unavailable - showing cached price',
          });
        }
      }
    }

    if (needsCSFloat) {
      const csFloatItem = freshResults[resultIndex++];
      if (csFloatItem) {
        priceData.push({
          market: csFloatItem.market,
          price: csFloatItem.price,
          url: csFloatItem.url,
          floatValue: csFloatItem.floatValue,
          source: 'fresh',
        });
      } else {
        const staleCache = await getAllCachedPrices(itemName);
        const staleCSFloat = staleCache.find(c => c.marketplace === 'CSFloat');
        if (staleCSFloat) {
          await extendCacheExpiry(itemName, 'CSFloat', 5);
          priceData.push({
            market: 'CSFloat',
            price: staleCSFloat.price,
            url: getMarketplaceUrl(itemName, 'CSFloat'),
            floatValue: staleCSFloat.floatValue,
            source: 'stale_cache',
            cachedAt: staleCSFloat.cachedAt.toISOString(),
            warning: 'API unavailable - showing cached price',
          });
        }
      }
    }

    if (needsSkinport) {
      const skinportItem = freshResults[resultIndex++];
      if (skinportItem) {
        priceData.push({
          market: skinportItem.market,
          price: skinportItem.price,
          url: skinportItem.url,
          source: 'fresh',
        });
      } else {
        const staleCache = await getAllCachedPrices(itemName);
        const staleSkinport = staleCache.find(c => c.marketplace === 'Skinport');
        if (staleSkinport) {
          await extendCacheExpiry(itemName, 'Skinport', 5);
          priceData.push({
            market: 'Skinport',
            price: staleSkinport.price,
            url: getMarketplaceUrl(itemName, 'Skinport'),
            floatValue: staleSkinport.floatValue,
            source: 'stale_cache',
            cachedAt: staleSkinport.cachedAt.toISOString(),
            warning: 'API rate limit - showing cached price',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      itemName,
      prices: priceData,
      marketplacesChecked: 3,
      cacheHit: cachedPrices.length === 3,
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

/**
 * Helper function to generate marketplace URLs
 */
function getMarketplaceUrl(itemName: string, marketplace: string): string {
  const encodedName = encodeURIComponent(itemName);

  switch (marketplace) {
    case 'Steam':
      return `https://steamcommunity.com/market/listings/730/${encodedName}`;
    case 'CSFloat':
      return `https://csfloat.com/search?name=${encodedName}`;
    case 'Skinport':
      return `https://skinport.com/market?search=${encodedName}`;
    default:
      return '';
  }
}
