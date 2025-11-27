/**
 * Bulk Price Import Script
 *
 * Imports CS2 item prices from CSGOTrader prices API to MarketplacePrice table.
 * This provides instant bulk price data without Steam API rate limiting.
 *
 * Data source: https://prices.csgotrader.app/latest/prices_v6.json
 * - Contains Steam Market prices for all CS2 items
 * - Updated regularly
 * - Free to use, no rate limits
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface CSGOTraderPrice {
  steam: {
    last_24h?: number
    last_7d?: number
    last_30d?: number
    last_90d?: number
  }
  bitskins?: { price?: number }
  lootfarm?: { price?: number }
  csgotm?: { price?: number }
  skinport?: { price?: number }
  buff163?: {
    starting_at?: { price?: number }
    highest_order?: { price?: number }
  }
}

interface PriceData {
  [itemName: string]: CSGOTraderPrice
}

async function fetchBulkPrices(): Promise<PriceData> {
  console.log('[BulkPrices] Fetching prices from CSGOTrader...')

  const response = await fetch('https://prices.csgotrader.app/latest/prices_v6.json')

  if (!response.ok) {
    throw new Error(`Failed to fetch prices: ${response.status}`)
  }

  const data = await response.json()
  console.log(`[BulkPrices] Fetched ${Object.keys(data).length} item prices`)

  return data
}

async function importPrices() {
  console.log('[BulkPrices] Starting bulk price import...\n')

  // Fetch all prices
  const priceData = await fetchBulkPrices()

  // Get all items from database
  const items = await prisma.item.findMany({
    select: {
      id: true,
      name: true,
      display_name: true,
    }
  })

  console.log(`[BulkPrices] Found ${items.length} items in database`)

  // Create lookup maps for both name formats
  const itemByName = new Map(items.map(item => [item.name, item]))
  const itemByDisplayName = new Map(items.map(item => [item.display_name, item]))

  let matched = 0
  let created = 0
  let updated = 0
  let noPrice = 0

  // Process each price entry
  const priceEntries = Object.entries(priceData)
  console.log(`[BulkPrices] Processing ${priceEntries.length} price entries...\n`)

  for (const [itemName, prices] of priceEntries) {
    // Try to find item by name or display_name
    let item = itemByName.get(itemName) || itemByDisplayName.get(itemName)

    if (!item) {
      continue // Item not in our database
    }

    matched++

    // Get Steam price (prefer recent prices)
    const steamPrice = prices.steam?.last_24h ||
                       prices.steam?.last_7d ||
                       prices.steam?.last_30d ||
                       prices.steam?.last_90d

    if (!steamPrice || steamPrice <= 0) {
      noPrice++
      continue
    }

    try {
      // Upsert Steam marketplace price
      await prisma.marketplacePrice.upsert({
        where: {
          item_id_platform: {
            item_id: item.id,
            platform: 'steam',
          },
        },
        update: {
          price: steamPrice,
          total_cost: steamPrice * 1.15, // Steam takes ~15%
          last_updated: new Date(),
        },
        create: {
          item_id: item.id,
          platform: 'steam',
          price: steamPrice,
          currency: 'USD',
          seller_fee_percent: 13,
          buyer_fee_percent: 2,
          total_cost: steamPrice * 1.15,
          last_updated: new Date(),
        },
      })

      // Check if this was an update or create
      const existing = await prisma.marketplacePrice.findUnique({
        where: {
          item_id_platform: {
            item_id: item.id,
            platform: 'steam',
          },
        },
      })

      if (existing) {
        updated++
      } else {
        created++
      }

      // Also add Skinport price if available
      if (prices.skinport?.price && prices.skinport.price > 0) {
        await prisma.marketplacePrice.upsert({
          where: {
            item_id_platform: {
              item_id: item.id,
              platform: 'skinport',
            },
          },
          update: {
            price: prices.skinport.price,
            total_cost: prices.skinport.price * 1.12,
            last_updated: new Date(),
          },
          create: {
            item_id: item.id,
            platform: 'skinport',
            price: prices.skinport.price,
            currency: 'USD',
            seller_fee_percent: 10,
            buyer_fee_percent: 2,
            total_cost: prices.skinport.price * 1.12,
            last_updated: new Date(),
          },
        })
      }

      // Add Buff163 price if available
      if (prices.buff163?.starting_at?.price && prices.buff163.starting_at.price > 0) {
        await prisma.marketplacePrice.upsert({
          where: {
            item_id_platform: {
              item_id: item.id,
              platform: 'buff163',
            },
          },
          update: {
            price: prices.buff163.starting_at.price,
            total_cost: prices.buff163.starting_at.price * 1.025,
            last_updated: new Date(),
          },
          create: {
            item_id: item.id,
            platform: 'buff163',
            price: prices.buff163.starting_at.price,
            currency: 'USD',
            seller_fee_percent: 2.5,
            buyer_fee_percent: 0,
            total_cost: prices.buff163.starting_at.price * 1.025,
            last_updated: new Date(),
          },
        })
      }

    } catch (error) {
      console.error(`[BulkPrices] Error importing price for ${itemName}:`, error)
    }

    // Progress update every 1000 items
    if (matched % 1000 === 0) {
      console.log(`[BulkPrices] Progress: ${matched} items matched, ${created + updated} prices imported`)
    }
  }

  console.log('\n[BulkPrices] Import complete!')
  console.log(`  Items matched: ${matched}`)
  console.log(`  Prices created: ${created}`)
  console.log(`  Prices updated: ${updated}`)
  console.log(`  Items with no price: ${noPrice}`)

  // Get final count
  const totalPrices = await prisma.marketplacePrice.count()
  console.log(`\n[BulkPrices] Total prices in database: ${totalPrices}`)
}

// Run the import
importPrices()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
