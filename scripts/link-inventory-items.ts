/**
 * Link Inventory Items to Database Items
 *
 * Matches inventory items to database items by market_hash_name → display_name
 * This fixes items that weren't matched during initial sync.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function linkInventoryItems() {
  console.log('[LinkItems] Starting inventory item linking...\n')

  // Get all inventory items without item_id
  const unlinkedItems = await prisma.inventoryItem.findMany({
    where: { item_id: null },
    select: {
      id: true,
      market_hash_name: true,
    },
  })

  console.log(`[LinkItems] Found ${unlinkedItems.length} unlinked inventory items`)

  // Get unique market_hash_names
  const uniqueNames = [...new Set(unlinkedItems.map(i => i.market_hash_name))]
  console.log(`[LinkItems] ${uniqueNames.length} unique item names to match\n`)

  // Fetch all matching items from database
  const dbItems = await prisma.item.findMany({
    where: {
      display_name: { in: uniqueNames },
    },
    select: {
      id: true,
      display_name: true,
      image_url: true,
    },
  })

  console.log(`[LinkItems] Found ${dbItems.length} matching items in database\n`)

  // Create lookup map
  const itemLookup = new Map(dbItems.map(item => [item.display_name, item]))

  let linked = 0
  let notFound = 0

  // Update inventory items with item_id
  for (const invItem of unlinkedItems) {
    const dbItem = itemLookup.get(invItem.market_hash_name)

    if (dbItem) {
      await prisma.inventoryItem.update({
        where: { id: invItem.id },
        data: { item_id: dbItem.id },
      })
      linked++

      if (linked % 50 === 0) {
        console.log(`[LinkItems] Progress: ${linked} items linked`)
      }
    } else {
      notFound++
    }
  }

  console.log('\n[LinkItems] Complete!')
  console.log(`  Items linked: ${linked}`)
  console.log(`  Items not found in database: ${notFound}`)

  // Show some examples of unmatched items
  if (notFound > 0) {
    const unmatchedNames = unlinkedItems
      .filter(i => !itemLookup.has(i.market_hash_name))
      .slice(0, 10)
      .map(i => i.market_hash_name)

    console.log('\n  Sample unmatched items:')
    unmatchedNames.forEach(name => console.log(`    - ${name}`))
  }

  // Verify the fix
  const finalCount = await prisma.inventoryItem.count({
    where: { item_id: { not: null } },
  })
  console.log(`\n[LinkItems] Final count: ${finalCount} items now have item_id`)
}

linkInventoryItems()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
