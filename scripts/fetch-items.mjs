#!/usr/bin/env node
/**
 * Fetch CS2 Items from ByMykel/CSGO-API
 * Transforms data into our ItemMetadata format
 */

import https from 'https'
import fs from 'fs'

const API_BASE = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en'

// Weapon types we want to include
const POPULAR_WEAPONS = [
  'AK-47', 'M4A4', 'M4A1-S', 'AWP', 'Desert Eagle', 'Glock-18', 'USP-S',
  'Galil AR', 'FAMAS', 'AUG', 'SG 553', 'SSG 08', 'SCAR-20', 'G3SG1',
  'Nova', 'XM1014', 'Sawed-Off', 'MAG-7', 'M249', 'Negev',
  'MAC-10', 'MP9', 'MP7', 'MP5-SD', 'UMP-45', 'P90', 'PP-Bizon',
  'Five-SeveN', 'Tec-9', 'CZ75-Auto', 'P250', 'Dual Berettas', 'R8 Revolver',
  'Karambit', 'M9 Bayonet', 'Butterfly Knife', 'Bayonet', 'Flip Knife',
  'Gut Knife', 'Falchion Knife', 'Bowie Knife', 'Shadow Daggers',
  'Ursus Knife', 'Navaja Knife', 'Stiletto Knife', 'Talon Knife',
  'Nomad Knife', 'Survival Knife', 'Paracord Knife', 'Classic Knife',
  'Skeleton Knife', 'Sport Gloves', 'Driver Gloves', 'Hand Wraps',
  'Moto Gloves', 'Specialist Gloves', 'Hydra Gloves', 'Broken Fang Gloves'
]

// Rarity mapping
const RARITY_MAP = {
  'rarity_common_weapon': 'Consumer',
  'rarity_uncommon_weapon': 'Industrial',
  'rarity_rare_weapon': 'Mil-Spec',
  'rarity_mythical_weapon': 'Restricted',
  'rarity_legendary_weapon': 'Classified',
  'rarity_ancient_weapon': 'Covert',
  'rarity_ancient': 'Extraordinary',
  'rarity_contraband': 'Contraband'
}

// Type mapping
const TYPE_MAP = {
  'Rifles': 'weapon_skin',
  'Pistols': 'weapon_skin',
  'SMGs': 'weapon_skin',
  'Shotguns': 'weapon_skin',
  'Machine Guns': 'weapon_skin',
  'Sniper Rifles': 'weapon_skin',
  'Knives': 'knife',
  'Gloves': 'gloves'
}

// Weapon category mapping (CS2 official categories)
const WEAPON_CATEGORY_MAP = {
  // Pistols (10 weapons)
  'Glock-18': 'Pistols',
  'P2000': 'Pistols',
  'USP-S': 'Pistols',
  'Dual Berettas': 'Pistols',
  'P250': 'Pistols',
  'Tec-9': 'Pistols',
  'Five-SeveN': 'Pistols',
  'CZ75-Auto': 'Pistols',
  'Desert Eagle': 'Pistols',
  'R8 Revolver': 'Pistols',

  // SMGs (7 weapons)
  'MAC-10': 'SMGs',
  'MP9': 'SMGs',
  'MP7': 'SMGs',
  'MP5-SD': 'SMGs',
  'UMP-45': 'SMGs',
  'P90': 'SMGs',
  'PP-Bizon': 'SMGs',

  // Rifles (11 weapons - including AWP as sniper rifle)
  'Galil AR': 'Rifles',
  'FAMAS': 'Rifles',
  'AK-47': 'Rifles',
  'M4A4': 'Rifles',
  'M4A1-S': 'Rifles',
  'SG 553': 'Rifles',
  'AUG': 'Rifles',
  'SSG 08': 'Rifles',
  'AWP': 'Rifles',
  'G3SG1': 'Rifles',
  'SCAR-20': 'Rifles',

  // Heavy (6 weapons - shotguns + machine guns)
  'Nova': 'Heavy',
  'XM1014': 'Heavy',
  'Sawed-Off': 'Heavy',
  'MAG-7': 'Heavy',
  'M249': 'Heavy',
  'Negev': 'Heavy'
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

// Wear condition short names mapping
const WEAR_SHORT_NAMES = {
  'Factory New': 'FN',
  'Minimal Wear': 'MW',
  'Field-Tested': 'FT',
  'Well-Worn': 'WW',
  'Battle-Scarred': 'BS'
}

function transformSkin(skin) {
  const weaponName = skin.weapon.name

  // Skip if not in popular weapons list
  if (!POPULAR_WEAPONS.some(w => weaponName.includes(w))) {
    return null
  }

  const rarity = RARITY_MAP[skin.rarity.id] || 'Mil-Spec'
  const type = TYPE_MAP[skin.category.name] || 'weapon_skin'

  // Extract weapon and finish
  const nameParts = skin.name.replace(/★\s*/g, '').split(' | ')
  const weapon = nameParts[0]
  const finish = nameParts[1] || null
  const baseName = skin.name.replace(/★\s*/g, '')

  // Determine weapon category
  const weaponCategory = WEAPON_CATEGORY_MAP[weapon] || (type === 'knife' ? 'Knives' : type === 'gloves' ? 'Gloves' : null)

  // Get collection if available
  const collection = skin.collections && skin.collections[0]
    ? skin.collections[0].name
    : null

  // Determine year from crates (rough estimate)
  let year = 2013 // Default
  if (skin.crates && skin.crates.length > 0) {
    const crateName = skin.crates[0].name
    if (crateName.includes('2024')) year = 2024
    else if (crateName.includes('2023')) year = 2023
    else if (crateName.includes('2022')) year = 2022
    else if (crateName.includes('2021')) year = 2021
    else if (crateName.includes('2020')) year = 2020
    else if (crateName.includes('2019')) year = 2019
    else if (crateName.includes('2018')) year = 2018
    else if (crateName.includes('2017')) year = 2017
    else if (crateName.includes('2016')) year = 2016
    else if (crateName.includes('2015')) year = 2015
    else if (crateName.includes('2014')) year = 2014
  }

  // Get available wear conditions from API (authoritative source)
  // The API explicitly lists which wears are available for each item
  const availableWears = skin.wears?.map(w => w.name) || []

  if (availableWears.length === 0) {
    // If no wears specified, skip this item
    return null
  }

  // Create one item per available wear condition
  // Then expand each wear to include StatTrak and Souvenir variants (mutually exclusive)
  const wearVariants = availableWears.map(wearName => {
    const wearShort = WEAR_SHORT_NAMES[wearName]

    // Base item data
    const baseItem = {
      type,
      weapon: type === 'weapon_skin' ? weapon : undefined,
      weapon_category: weaponCategory,
      finish,
      wear: wearName,
      wear_short: wearShort,
      rarity,
      collection,
      release_year: year,
      min_float: skin.min_float,
      max_float: skin.max_float,
      image: skin.image,
      description: skin.description
    }

    // Create variants array starting with normal version
    const variants = []

    // 1. Normal (always exists)
    variants.push({
      ...baseItem,
      id: baseName.toLowerCase()
        .replace(/\s+\|\s+/g, '-')
        .replace(/\s+/g, '-')
        .replace(/[()]/g, '')
        + '-' + wearShort.toLowerCase(),
      name: `${baseName} (${wearName})`,
      is_stattrak: false,
      is_souvenir: false,
      stattrak: false,
      souvenir: false
    })

    // 2. StatTrak™ variant (if available)
    if (skin.stattrak) {
      variants.push({
        ...baseItem,
        id: 'stattrak-' + baseName.toLowerCase()
          .replace(/\s+\|\s+/g, '-')
          .replace(/\s+/g, '-')
          .replace(/[()]/g, '')
          + '-' + wearShort.toLowerCase(),
        name: `StatTrak™ ${baseName} (${wearName})`,
        is_stattrak: true,
        is_souvenir: false,
        stattrak: true,
        souvenir: false
      })
    }

    // 3. Souvenir variant (if available, mutually exclusive with StatTrak)
    if (skin.souvenir) {
      variants.push({
        ...baseItem,
        id: 'souvenir-' + baseName.toLowerCase()
          .replace(/\s+\|\s+/g, '-')
          .replace(/\s+/g, '-')
          .replace(/[()]/g, '')
          + '-' + wearShort.toLowerCase(),
        name: `Souvenir ${baseName} (${wearName})`,
        is_stattrak: false,
        is_souvenir: true,
        stattrak: false,
        souvenir: true
      })
    }

    return variants
  })

  // Flatten the nested arrays: [wear variations] -> [variants per wear] -> flat list
  return wearVariants.flat()
}

// Transform case/container data
function transformCase(crate) {
  // Determine container type from API type field
  let containerType = null
  if (crate.type === 'Case') {
    containerType = 'Weapon Case'
  } else if (crate.type === 'Sticker Capsule') {
    containerType = 'Sticker Capsule'
  }

  return {
    id: crate.id,
    name: crate.name,
    type: 'case',
    container_type: containerType,
    rarity: RARITY_MAP[crate.rarity.id] || 'Consumer',
    collection: null,
    release_year: crate.first_sale_date ? parseInt(crate.first_sale_date.split('/')[0]) : 2013,
    image: crate.image,
    description: crate.description,
    market_hash_name: crate.market_hash_name,
    contains_items: crate.contains?.length || 0,
    contains_rare: crate.contains_rare?.length || 0,
    is_stattrak: false,
    is_souvenir: false
  }
}

// Transform sticker data
function transformSticker(sticker) {
  return {
    id: sticker.id,
    name: sticker.name,
    type: 'sticker',
    rarity: RARITY_MAP[sticker.rarity.id] || 'Consumer',
    collection: null,
    release_year: sticker.tournament?.name ? parseInt(sticker.tournament.name.match(/\d{4}/)?.[0] || '2013') : 2013,
    image: sticker.image,
    description: sticker.description,
    sticker_type: sticker.type, // Event, Holo, etc.
    tournament: sticker.tournament?.name || null,
    effect: sticker.effect,
    market_hash_name: sticker.market_hash_name,
    is_stattrak: false,
    is_souvenir: false
  }
}

async function main() {
  console.log('Fetching CS2 items from ByMykel/CSGO-API...')

  // Fetch skins
  const skins = await fetchJSON(`${API_BASE}/skins.json`)
  console.log(`Total skins available: ${skins.length}`)

  const transformedSkins = skins
    .map(transformSkin)
    .filter(Boolean) // Remove nulls
    .flat() // Flatten because each skin now returns array of wear variations

  console.log(`Expanded to ${transformedSkins.length} weapon skins with wear conditions`)

  // Fetch cases
  console.log('Fetching cases...')
  const cases = await fetchJSON(`${API_BASE}/crates.json`)
  const transformedCases = cases.map(transformCase)
  console.log(`Added ${transformedCases.length} cases`)

  // Fetch stickers
  console.log('Fetching stickers...')
  const stickers = await fetchJSON(`${API_BASE}/stickers.json`)
  const transformedStickers = stickers.map(transformSticker)
  console.log(`Added ${transformedStickers.length} stickers`)

  // Combine all items
  const allItems = [...transformedSkins, ...transformedCases, ...transformedStickers]
  console.log(`\n✅ Total items: ${allItems.length}`)
  console.log(`   - Weapon skins: ${transformedSkins.length}`)
  console.log(`   - Cases: ${transformedCases.length}`)
  console.log(`   - Stickers: ${transformedStickers.length}`)

  // Sort by type, then rarity, then name
  const typeOrder = ['knife', 'gloves', 'weapon_skin', 'case', 'sticker']
  const rarityOrder = ['Contraband', 'Covert', 'Extraordinary', 'Classified', 'Restricted', 'Mil-Spec', 'Industrial', 'Consumer']
  allItems.sort((a, b) => {
    const typeDiff = typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)
    if (typeDiff !== 0) return typeDiff
    const rarityDiff = rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity)
    if (rarityDiff !== 0) return rarityDiff
    return a.name.localeCompare(b.name)
  })

  // Write to file
  const output = `// Auto-generated from ByMykel/CSGO-API
// Total items: ${allItems.length}
//   - Weapon skins: ${transformedSkins.length}
//   - Cases: ${transformedCases.length}
//   - Stickers: ${transformedStickers.length}
// Last updated: ${new Date().toISOString()}

export const CS2_ITEMS = ${JSON.stringify(allItems, null, 2)}
`

  fs.writeFileSync('src/lib/cs2-items-full.ts', output)
  console.log('\n✅ Written to src/lib/cs2-items-full.ts')

  // Also create a top 100 file for quick loading (weapon skins only)
  const top100Skins = transformedSkins.slice(0, 100)
  const top100Output = `// Auto-generated - Top 100 weapon skins
// Last updated: ${new Date().toISOString()}

export const CS2_ITEMS_TOP100 = ${JSON.stringify(top100Skins, null, 2)}
`
  fs.writeFileSync('src/lib/cs2-items-top100.ts', top100Output)
  console.log('✅ Written to src/lib/cs2-items-top100.ts')
}

main().catch(console.error)
