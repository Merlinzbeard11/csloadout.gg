/**
 * Feature 08 Phase 2: Budget Loadout Builder - Loadout Storage Seed
 * BDD Reference: features/08-budget-loadout-builder-phase2.feature
 *
 * Seeds:
 * - Test user for loadouts
 * - Sample items (weapon skins)
 * - 3 sample loadouts with weapon skins
 *
 * Critical Gotchas:
 * - ONE weapon skin per weapon_type per loadout (UNIQUE constraint)
 * - actual_cost must be sum of weapon skin prices
 * - Slug must be unique
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Feature 08 Phase 2 data...')

  // ============================================================================
  // Create test user
  // ============================================================================

  const testUser = await prisma.user.upsert({
    where: { steam_id: '76561198000000123' },
    update: {},
    create: {
      steam_id: '76561198000000123',
      persona_name: 'TestUser_Loadouts',
      profile_url: 'https://steamcommunity.com/profiles/76561198000000123',
      avatar: 'https://example.com/avatar.jpg',
      profile_state: 1,
      has_cs2_game: true,
    },
  })

  console.log(`✅ Created test user: ${testUser.persona_name}`)

  // ============================================================================
  // Create sample items (weapon skins)
  // ============================================================================

  const items = [
    {
      id: 'item-ak47-redline',
      name: 'AK-47 | Redline',
      display_name: 'AK-47 | Redline',
      search_name: 'ak47redline',
      type: 'skin',
      rarity: 'classified',
      weapon_type: 'AK-47',
      image_url: 'https://example.com/ak47-redline.png',
    },
    {
      id: 'item-m4a4-asiimov',
      name: 'M4A4 | Asiimov',
      display_name: 'M4A4 | Asiimov',
      search_name: 'm4a4asiimov',
      type: 'skin',
      rarity: 'covert',
      weapon_type: 'M4A4',
      image_url: 'https://example.com/m4a4-asiimov.png',
    },
    {
      id: 'item-awp-redline',
      name: 'AWP | Redline',
      display_name: 'AWP | Redline',
      search_name: 'awpredline',
      type: 'skin',
      rarity: 'classified',
      weapon_type: 'AWP',
      image_url: 'https://example.com/awp-redline.png',
    },
    {
      id: 'item-deagle-blaze',
      name: 'Desert Eagle | Blaze',
      display_name: 'Desert Eagle | Blaze',
      search_name: 'desertea gleblaze',
      type: 'skin',
      rarity: 'restricted',
      weapon_type: 'Desert Eagle',
      image_url: 'https://example.com/deagle-blaze.png',
    },
    {
      id: 'item-glock-fade',
      name: 'Glock-18 | Fade',
      display_name: 'Glock-18 | Fade',
      search_name: 'glock18fade',
      type: 'skin',
      rarity: 'restricted',
      weapon_type: 'Glock-18',
      image_url: 'https://example.com/glock-fade.png',
    },
  ]

  console.log('📦 Seeding sample items...')
  for (const itemData of items) {
    await prisma.item.upsert({
      where: { id: itemData.id },
      update: itemData,
      create: itemData,
    })
  }
  console.log(`✅ Seeded ${items.length} sample items`)

  // ============================================================================
  // Create sample loadouts
  // ============================================================================

  console.log('🎯 Seeding sample loadouts...')

  // Loadout 1: Red Dragon Budget
  const loadout1 = await prisma.loadout.upsert({
    where: { slug: 'red-dragon-budget' },
    update: {},
    create: {
      user_id: testUser.id,
      name: 'Red Dragon Budget',
      description: 'Affordable red-themed loadout for competitive play',
      theme: 'red',
      budget: 150.0,
      actual_cost: 68.5, // Sum of weapon skins below
      is_public: false,
      slug: 'red-dragon-budget',
    },
  })

  // Add weapon skins to Loadout 1
  await prisma.loadoutWeaponSkin.createMany({
    data: [
      {
        loadout_id: loadout1.id,
        item_id: 'item-ak47-redline',
        weapon_type: 'AK-47',
        wear: 'Field-Tested',
        float_value: 0.16,
        quality: 'normal',
        selected_platform: 'csfloat',
        price: 25.5,
        stickers: JSON.stringify([
          { name: 'Natus Vincere (Holo)', position: 1 },
          { name: 'Cloud9 (Foil)', position: 2 },
        ]),
      },
      {
        loadout_id: loadout1.id,
        item_id: 'item-awp-redline',
        weapon_type: 'AWP',
        wear: 'Field-Tested',
        float_value: 0.18,
        quality: 'normal',
        selected_platform: 'steam',
        price: 18.0,
      },
      {
        loadout_id: loadout1.id,
        item_id: 'item-deagle-blaze',
        weapon_type: 'Desert Eagle',
        wear: 'Factory New',
        float_value: 0.01,
        quality: 'normal',
        selected_platform: 'csfloat',
        price: 25.0,
      },
    ],
    skipDuplicates: true,
  })

  console.log(`✅ Created loadout: ${loadout1.name} with 3 weapon skins`)

  // Loadout 2: Blue Steel Pro
  const loadout2 = await prisma.loadout.upsert({
    where: { slug: 'blue-steel-pro' },
    update: {},
    create: {
      user_id: testUser.id,
      name: 'Blue Steel Pro',
      description: 'Mid-tier blue theme for AWPers',
      theme: 'blue',
      budget: 200.0,
      actual_cost: 45.0,
      is_public: true,
      slug: 'blue-steel-pro',
      published_at: new Date(),
    },
  })

  await prisma.loadoutWeaponSkin.createMany({
    data: [
      {
        loadout_id: loadout2.id,
        item_id: 'item-m4a4-asiimov',
        weapon_type: 'M4A4',
        wear: 'Field-Tested',
        float_value: 0.17,
        quality: 'normal',
        selected_platform: 'buff163',
        price: 45.0,
      },
    ],
    skipDuplicates: true,
  })

  console.log(`✅ Created loadout: ${loadout2.name} with 1 weapon skin`)

  // Loadout 3: Budget Starter (empty loadout for testing)
  const loadout3 = await prisma.loadout.upsert({
    where: { slug: 'budget-starter' },
    update: {},
    create: {
      user_id: testUser.id,
      name: 'Budget Starter',
      description: 'Empty loadout for beginners',
      theme: null,
      budget: 50.0,
      actual_cost: 0.0, // No items yet
      is_public: false,
      slug: 'budget-starter',
    },
  })

  console.log(`✅ Created loadout: ${loadout3.name} (empty)`)

  console.log('✨ Feature 08 Phase 2 seed complete!')
  console.log(`
  Summary:
  - 1 test user created
  - 5 sample weapon skins
  - 3 loadouts created
    - Red Dragon Budget: $68.50 / $150.00 (45.7% utilized)
    - Blue Steel Pro: $45.00 / $200.00 (22.5% utilized)
    - Budget Starter: $0.00 / $50.00 (0% utilized)
  `)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
