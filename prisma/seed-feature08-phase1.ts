/**
 * Feature 08 Phase 1: Budget Loadout Builder - Database Seed
 * BDD Reference: features/08-budget-loadout-builder-phase1.feature
 *
 * Seeds:
 * - 10 cosmetic categories (weapon_skins, knife, gloves, agents, etc.)
 * - 10 weapon usage priorities (AK-47, M4A4, AWP, etc.)
 *
 * Critical Gotchas:
 * - Budget weights MUST sum to exactly 1.00 (100%)
 * - Weapon charms added Oct 2025 (mark as NEW)
 * - Categories are cosmetic types, NOT weapon selection slots
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Feature 08 Phase 1 data...')

  // ============================================================================
  // Cosmetic Categories (10 categories)
  // BDD Scenario: "Query all cosmetic categories"
  // ============================================================================

  const cosmeticCategories = [
    {
      id: 'weapon_skins',
      name: 'Weapon Skins',
      category_type: 'weapon',
      sort_order: 1,
      is_required: true,
      icon_url: null,
      description: 'Skins for all weapons (pistols, rifles, SMGs, shotguns, heavy)',
      release_date: new Date('2013-08-13'), // CS:GO Arms Deal Update
    },
    {
      id: 'agent_ct',
      name: 'CT Agent',
      category_type: 'agent',
      sort_order: 2,
      is_required: false,
      icon_url: null,
      description: 'Counter-Terrorist player model',
      release_date: new Date('2019-11-18'), // Operation Shattered Web
    },
    {
      id: 'agent_t',
      name: 'T Agent',
      category_type: 'agent',
      sort_order: 3,
      is_required: false,
      icon_url: null,
      description: 'Terrorist player model',
      release_date: new Date('2019-11-18'), // Operation Shattered Web
    },
    {
      id: 'knife',
      name: 'Knife',
      category_type: 'equipment',
      sort_order: 4,
      is_required: false,
      icon_url: null,
      description: 'Melee weapon cosmetic',
      release_date: new Date('2013-08-13'), // CS:GO Arms Deal Update
    },
    {
      id: 'gloves',
      name: 'Gloves',
      category_type: 'equipment',
      sort_order: 5,
      is_required: false,
      icon_url: null,
      description: 'Glove skins',
      release_date: new Date('2016-11-28'), // Glove Case release
    },
    {
      id: 'music_kit',
      name: 'Music Kit',
      category_type: 'customization',
      sort_order: 6,
      is_required: false,
      icon_url: null,
      description: 'In-game music track',
      release_date: new Date('2014-10-01'), // Music Kit release
    },
    {
      id: 'stickers',
      name: 'Stickers',
      category_type: 'customization',
      sort_order: 7,
      is_required: false,
      icon_url: null,
      description: 'Weapon stickers (up to 4 per weapon)',
      release_date: new Date('2014-03-12'), // Sticker Capsule 1
    },
    {
      id: 'patches',
      name: 'Patches',
      category_type: 'customization',
      sort_order: 8,
      is_required: false,
      icon_url: null,
      description: 'Agent patches',
      release_date: new Date('2018-02-15'), // Patch release
    },
    {
      id: 'charms',
      name: 'Weapon Charms',
      category_type: 'customization',
      sort_order: 9,
      is_required: false,
      icon_url: null,
      description: 'NEW - Weapon charms (added Oct 2025)',
      release_date: new Date('2025-10-01'), // NEW category
    },
    {
      id: 'graffiti',
      name: 'Graffiti',
      category_type: 'customization',
      sort_order: 10,
      is_required: false,
      icon_url: null,
      description: 'Spray paint (50 charges)',
      release_date: new Date('2016-09-15'), // Graffiti release
    },
  ]

  console.log('📦 Seeding cosmetic categories...')
  for (const category of cosmeticCategories) {
    await prisma.cosmeticCategory.upsert({
      where: { id: category.id },
      update: category,
      create: category,
    })
  }
  console.log(`✅ Seeded ${cosmeticCategories.length} cosmetic categories`)

  // ============================================================================
  // Weapon Usage Priorities (10 weapons)
  // BDD Scenario: "Weapon priorities sum to 100% budget allocation"
  // Critical Gotcha: Budget weights MUST sum to exactly 1.00
  // ============================================================================

  const weaponPriorities = [
    {
      weapon_type: 'AK-47',
      usage_percentage: 95.0, // 95% of players use this weapon
      budget_weight: 0.25, // Allocate 25% of budget
      is_essential: true,
    },
    {
      weapon_type: 'M4A4',
      usage_percentage: 85.0,
      budget_weight: 0.15, // 15%
      is_essential: true,
    },
    {
      weapon_type: 'M4A1-S',
      usage_percentage: 80.0,
      budget_weight: 0.15, // 15%
      is_essential: true,
    },
    {
      weapon_type: 'AWP',
      usage_percentage: 70.0,
      budget_weight: 0.2, // 20%
      is_essential: true,
    },
    {
      weapon_type: 'Desert Eagle',
      usage_percentage: 60.0,
      budget_weight: 0.1, // 10%
      is_essential: false,
    },
    {
      weapon_type: 'USP-S',
      usage_percentage: 55.0,
      budget_weight: 0.05, // 5%
      is_essential: false,
    },
    {
      weapon_type: 'Glock-18',
      usage_percentage: 50.0,
      budget_weight: 0.03, // 3%
      is_essential: false,
    },
    {
      weapon_type: 'P250',
      usage_percentage: 40.0,
      budget_weight: 0.02, // 2%
      is_essential: false,
    },
    {
      weapon_type: 'CZ75-Auto',
      usage_percentage: 35.0,
      budget_weight: 0.02, // 2%
      is_essential: false,
    },
    {
      weapon_type: 'Tec-9',
      usage_percentage: 30.0,
      budget_weight: 0.03, // 3%
      is_essential: false,
    },
  ]

  // Validate budget weights sum to 1.00 (BDD requirement)
  const totalBudgetWeight = weaponPriorities.reduce((sum, w) => sum + w.budget_weight, 0)
  if (Math.abs(totalBudgetWeight - 1.0) > 0.001) {
    throw new Error(
      `Budget weights must sum to 1.00, got ${totalBudgetWeight.toFixed(2)}. This violates BDD scenario "Weapon priorities sum to 100% budget allocation"`
    )
  }

  console.log('🎯 Seeding weapon usage priorities...')
  for (const weapon of weaponPriorities) {
    await prisma.weaponUsagePriority.upsert({
      where: { weapon_type: weapon.weapon_type },
      update: weapon,
      create: weapon,
    })
  }
  console.log(`✅ Seeded ${weaponPriorities.length} weapon priorities`)
  console.log(`✅ Budget weight validation: ${totalBudgetWeight.toFixed(2)} (sum = 1.00)`)

  console.log('✨ Feature 08 Phase 1 seed complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
