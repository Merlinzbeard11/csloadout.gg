/**
 * Script to re-import just cases to fix item linkages
 */

import { prisma } from '../src/lib/prisma'

interface ByMykelCase {
  id: string;
  name: string;
  description?: string;
  type?: string;
  first_sale_date?: string;
  image: string;
  contains: Array<{
    id: string;
    name: string;
    rarity?: { id: string; name: string; color: string };
    paint_index?: string;
    image: string;
  }>;
  contains_rare?: Array<{
    id: string;
    name: string;
    rarity?: { id: string; name: string; color: string };
    paint_index?: string;
    image: string;
  }>;
}

// Standard drop rates by rarity
const RARITY_DROP_RATES: Record<string, number> = {
  'rarity_common_weapon': 79.92, // Consumer
  'rarity_uncommon_weapon': 15.98, // Industrial
  'rarity_rare_weapon': 3.20, // Mil-Spec
  'rarity_mythical_weapon': 0.64, // Restricted
  'rarity_legendary_weapon': 0.16, // Classified
  'rarity_ancient_weapon': 0.04, // Covert
  'rarity_contraband_weapon': 0.00, // Contraband
  'rare': 0.26, // Special items (knives/gloves)
}

function calculateDropProbability(rarity: string, itemCount: number, isSpecial: boolean): number {
  if (isSpecial) {
    return RARITY_DROP_RATES['rare'] / itemCount
  }
  const totalRarityProb = RARITY_DROP_RATES[rarity] || 3.20
  return totalRarityProb / itemCount
}

async function fetchCases(): Promise<ByMykelCase[]> {
  const url = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json'
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch cases: ${response.status}`)
  }
  const data = await response.json()
  // Filter to weapon cases only
  return Array.isArray(data) ? data.filter((c: any) =>
    c.type === 'Case' ||
    c.name.includes('Case') ||
    c.name.includes('Weapon Case')
  ) : []
}

async function reimportCases() {
  console.log('Fetching cases from ByMykel API...')
  const cases = await fetchCases()
  console.log(`Found ${cases.length} cases`)

  let totalLinked = 0
  let casesProcessed = 0

  for (const caseData of cases) {
    try {
      // Generate slug
      const slug = caseData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

      // Find the case in our database
      const caseRecord = await prisma.case.findUnique({
        where: { slug }
      })

      if (!caseRecord) {
        console.log(`  Skipping ${caseData.name} - not in database`)
        continue
      }

      // Delete existing links
      await prisma.caseItem.deleteMany({
        where: { case_id: caseRecord.id }
      })

      const linkedItemIds = new Set<string>()
      let caseLinked = 0

      // Link regular items
      if (caseData.contains && caseData.contains.length > 0) {
        const itemsByRarity: { [key: string]: typeof caseData.contains } = {}
        for (const item of caseData.contains) {
          const rarity = item.rarity?.id || 'rarity_rare_weapon'
          if (!itemsByRarity[rarity]) itemsByRarity[rarity] = []
          itemsByRarity[rarity].push(item)
        }

        for (const [rarity, items] of Object.entries(itemsByRarity)) {
          const probability = calculateDropProbability(rarity, items.length, false)

          for (const item of items) {
            // Find ALL items that start with this base name
            const matchingItems = await prisma.item.findMany({
              where: {
                OR: [
                  { name: item.name },
                  { name: { startsWith: `${item.name} (` } },
                  { name: { startsWith: `StatTrak™ ${item.name} (` } },
                  { name: { startsWith: `Souvenir ${item.name} (` } },
                ],
              },
            })

            for (const itemRecord of matchingItems) {
              if (!linkedItemIds.has(itemRecord.id)) {
                await prisma.caseItem.create({
                  data: {
                    case_id: caseRecord.id,
                    item_id: itemRecord.id,
                    drop_probability: probability,
                    is_special_item: false,
                  },
                })
                linkedItemIds.add(itemRecord.id)
                caseLinked++
              }
            }
          }
        }
      }

      // Link special items (knives/gloves)
      if (caseData.contains_rare && caseData.contains_rare.length > 0) {
        const probability = calculateDropProbability('rare', caseData.contains_rare.length, true)

        for (const item of caseData.contains_rare) {
          const matchingItems = await prisma.item.findMany({
            where: {
              OR: [
                { name: item.name },
                { name: { startsWith: `${item.name} |` } },
                { name: { startsWith: `StatTrak™ ${item.name} |` } },
              ],
            },
          })

          for (const itemRecord of matchingItems) {
            if (!linkedItemIds.has(itemRecord.id)) {
              await prisma.caseItem.create({
                data: {
                  case_id: caseRecord.id,
                  item_id: itemRecord.id,
                  drop_probability: probability,
                  is_special_item: true,
                },
              })
              linkedItemIds.add(itemRecord.id)
              caseLinked++
            }
          }
        }
      }

      totalLinked += caseLinked
      casesProcessed++
      console.log(`  ${caseData.name}: linked ${caseLinked} items`)

    } catch (error) {
      console.error(`  Error processing ${caseData.name}:`, error)
    }
  }

  console.log(`\n=== Done ===`)
  console.log(`Cases processed: ${casesProcessed}`)
  console.log(`Total items linked: ${totalLinked}`)

  await prisma.$disconnect()
}

reimportCases()
