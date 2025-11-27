/**
 * Import Prices for Inventory Items
 *
 * Fetches prices from Steam Market for items in user inventories.
 * Rate limited to 20 requests/minute to respect Steam's limits.
 *
 * Usage: DATABASE_URL="..." npx tsx scripts/import-inventory-prices.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const MAX_REQUESTS_PER_MINUTE = 20
const DELAY_BETWEEN_REQUESTS = 3000 // 3 seconds between requests

interface SteamPriceResponse {
  success: boolean
  lowest_price?: string
  median_price?: string
  volume?: string
}

function parsePrice(priceStr: string | undefined): number | null {
  if (!priceStr) return null
  const cleaned = priceStr.replace(/[^0-9.,]/g, '').replace(',', '.')
  const price = parseFloat(cleaned)
  return isNaN(price) ? null : price
}

async function fetchSteamPrice(marketHashName: string): Promise<number | null> {
  const url = new URL('https://steamcommunity.com/market/priceoverview/')
  url.searchParams.set('appid', '730')
  url.searchParams.set('currency', '1') // USD
  url.searchParams.set('market_hash_name', marketHashName)

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      if (response.status === 429) {
        console.log(`  [RATE LIMITED] Waiting 60 seconds...`)
        await new Promise(r => setTimeout(r, 60000))
        return null
      }
      return null
    }

    const data: SteamPriceResponse = await response.json()
    if (!data.success) return null

    return parsePrice(data.lowest_price)
  } catch (error) {
    console.error(`  Error fetching price for ${marketHashName}:`, error)
    return null
  }
}

async function main() {
  console.log('[PriceImport] Starting inventory price import...\n')

  // Get unique market_hash_names from inventory items that don't have prices
  const itemsWithoutPrices = await prisma.inventoryItem.findMany({
    where: {
      OR: [
        { current_value: null },
        { current_value: 0 },
      ],
    },
    select: {
      market_hash_name: true,
    },
    distinct: ['market_hash_name'],
  })

  const uniqueNames = [...new Set(itemsWithoutPrices.map(i => i.market_hash_name))]
  console.log(`[PriceImport] Found ${uniqueNames.length} unique items without prices\n`)

  let fetched = 0
  let updated = 0
  let failed = 0

  for (const marketHashName of uniqueNames) {
    console.log(`[${fetched + 1}/${uniqueNames.length}] Fetching: ${marketHashName}`)

    const price = await fetchSteamPrice(marketHashName)
    fetched++

    if (price !== null && price > 0) {
      // Update all inventory items with this market_hash_name
      const result = await prisma.inventoryItem.updateMany({
        where: { market_hash_name: marketHashName },
        data: { current_value: price },
      })

      console.log(`  Price: $${price.toFixed(2)} (updated ${result.count} items)`)
      updated += result.count

      // Also try to update MarketplacePrice if item exists
      const item = await prisma.item.findFirst({
        where: {
          OR: [
            { name: marketHashName },
            { display_name: marketHashName },
          ],
        },
      })

      if (item) {
        await prisma.marketplacePrice.upsert({
          where: {
            item_id_platform: {
              item_id: item.id,
              platform: 'steam',
            },
          },
          update: {
            price: price,
            total_cost: price * 1.15,
            last_updated: new Date(),
          },
          create: {
            item_id: item.id,
            platform: 'steam',
            price: price,
            currency: 'USD',
            seller_fee_percent: 13,
            buyer_fee_percent: 2,
            total_cost: price * 1.15,
            last_updated: new Date(),
          },
        })
      }
    } else {
      console.log(`  No price found`)
      failed++
    }

    // Rate limiting
    if (fetched % MAX_REQUESTS_PER_MINUTE === 0) {
      console.log(`\n[PriceImport] Rate limit pause (60s)...\n`)
      await new Promise(r => setTimeout(r, 60000))
    } else {
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_REQUESTS))
    }
  }

  // Update UserInventory total values
  console.log('\n[PriceImport] Updating inventory totals...')

  const inventories = await prisma.userInventory.findMany({
    include: {
      items: {
        select: { current_value: true },
      },
    },
  })

  for (const inv of inventories) {
    const totalValue = inv.items.reduce((sum, item) => sum + (Number(item.current_value) || 0), 0)
    await prisma.userInventory.update({
      where: { id: inv.id },
      data: { total_value: totalValue },
    })
  }

  console.log('\n[PriceImport] Complete!')
  console.log(`  Items fetched: ${fetched}`)
  console.log(`  Items updated: ${updated}`)
  console.log(`  Items failed: ${failed}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
