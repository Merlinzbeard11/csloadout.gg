/**
 * Populate Icon URLs for Inventory Items
 *
 * Fetches Steam inventory and updates icon_url for existing items.
 * This preserves existing prices while adding image URLs.
 *
 * Usage: DATABASE_URL="..." npx tsx scripts/populate-icon-urls.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface SteamAsset {
  assetid: string
  classid: string
  instanceid: string
}

interface SteamDescription {
  classid: string
  instanceid: string
  icon_url: string
  market_hash_name: string
}

interface SteamInventoryResponse {
  assets?: SteamAsset[]
  descriptions?: SteamDescription[]
  success: number
  total_inventory_count?: number
}

async function fetchSteamInventory(steamId: string): Promise<Map<string, string>> {
  const iconMap = new Map<string, string>()
  let startAssetId: string | undefined

  console.log(`[Steam] Fetching inventory for Steam ID: ${steamId}`)

  while (true) {
    const url = new URL('https://steamcommunity.com/inventory/' + steamId + '/730/2')
    url.searchParams.set('l', 'english')
    url.searchParams.set('count', '2000')
    if (startAssetId) {
      url.searchParams.set('start_assetid', startAssetId)
    }

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
        signal: AbortSignal.timeout(30000),
      })

      if (response.status === 429) {
        console.log(`  [RATE LIMITED] Waiting 60 seconds...`)
        await new Promise(r => setTimeout(r, 60000))
        continue
      }

      if (response.status === 403) {
        console.log(`  [PRIVATE] Inventory is private`)
        break
      }

      if (!response.ok) {
        console.log(`  [ERROR] HTTP ${response.status}`)
        break
      }

      const data: SteamInventoryResponse = await response.json()

      if (data.success !== 1) {
        console.log(`  [ERROR] Steam API returned success !== 1`)
        break
      }

      // Build description lookup by classid_instanceid
      const descLookup = new Map<string, SteamDescription>()
      for (const desc of data.descriptions || []) {
        const key = `${desc.classid}_${desc.instanceid}`
        descLookup.set(key, desc)
      }

      // Map asset IDs to icon URLs
      for (const asset of data.assets || []) {
        const key = `${asset.classid}_${asset.instanceid}`
        const desc = descLookup.get(key)
        if (desc?.icon_url) {
          iconMap.set(asset.assetid, desc.icon_url)
        }
      }

      console.log(`  Fetched ${data.assets?.length || 0} items (total: ${iconMap.size})`)

      // Check if there are more items
      const assets = data.assets || []
      if (assets.length < 2000) {
        break // No more items
      }

      // Get the last asset ID for pagination
      startAssetId = assets[assets.length - 1].assetid

      // Delay between requests
      await new Promise(r => setTimeout(r, 1000))
    } catch (error) {
      console.error(`  [ERROR] Fetch failed:`, error)
      break
    }
  }

  return iconMap
}

async function main() {
  console.log('[IconUrls] Starting icon URL population...\n')

  // Get all inventories with their steam_id
  const inventories = await prisma.userInventory.findMany({
    select: {
      id: true,
      steam_id: true,
      user: {
        select: {
          steam_id: true,
        },
      },
    },
  })

  console.log(`[IconUrls] Found ${inventories.length} user inventories\n`)

  let totalUpdated = 0
  let totalFailed = 0

  for (const inventory of inventories) {
    const steamId = inventory.steam_id || inventory.user?.steam_id

    if (!steamId) {
      console.log(`[IconUrls] Skipping inventory ${inventory.id}: No Steam ID`)
      continue
    }

    // Get inventory items that don't have icon_url
    const items = await prisma.inventoryItem.findMany({
      where: {
        inventory_id: inventory.id,
        OR: [
          { icon_url: null },
          { icon_url: '' },
        ],
      },
      select: {
        id: true,
        steam_asset_id: true,
        market_hash_name: true,
      },
    })

    if (items.length === 0) {
      console.log(`[IconUrls] Inventory ${inventory.id}: All items have icon_url`)
      continue
    }

    console.log(`\n[IconUrls] Inventory ${inventory.id}: ${items.length} items need icon_url`)

    // Fetch Steam inventory
    const iconMap = await fetchSteamInventory(steamId)

    if (iconMap.size === 0) {
      console.log(`  [WARNING] No icons fetched from Steam`)
      totalFailed += items.length
      continue
    }

    // Update items with icon URLs
    let updated = 0
    let notFound = 0

    for (const item of items) {
      const iconUrl = iconMap.get(item.steam_asset_id)

      if (iconUrl) {
        await prisma.inventoryItem.update({
          where: { id: item.id },
          data: { icon_url: iconUrl },
        })
        updated++
      } else {
        notFound++
      }
    }

    console.log(`  Updated: ${updated} | Not found in Steam: ${notFound}`)
    totalUpdated += updated
    totalFailed += notFound

    // Delay between users
    await new Promise(r => setTimeout(r, 2000))
  }

  console.log('\n[IconUrls] Complete!')
  console.log(`  Total updated: ${totalUpdated}`)
  console.log(`  Total not found: ${totalFailed}`)

  // Verify
  const withIcons = await prisma.inventoryItem.count({
    where: { icon_url: { not: null } },
  })
  const withoutIcons = await prisma.inventoryItem.count({
    where: { icon_url: null },
  })

  console.log(`\n[IconUrls] Final counts:`)
  console.log(`  Items with icon_url: ${withIcons}`)
  console.log(`  Items without icon_url: ${withoutIcons}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
