/**
 * Main Database Seed Script
 *
 * Imports CS2 data from ByMykel/CSGO-API into the database
 * Features: 01 (Item Database) + 02 (Relational Browsing)
 *
 * BDD Reference: features/01-item-database-import.feature
 *
 * Usage:
 *   npm run seed          # Seed all data
 *   npx tsx prisma/seed.ts
 *
 * Environment Variables:
 *   GITHUB_TOKEN - Optional, increases rate limit from 60/hr to 5,000/hr
 *
 * Gotchas Applied:
 *   - GitHub rate limits: 60 req/hr (no token) vs 5,000 req/hr (with token)
 *   - Upsert strategy prevents duplicates
 *   - Retry logic with exponential backoff for network errors
 *   - Validates data before inserting to prevent constraint violations
 */

import { runCompleteImport } from '../src/lib/import-service'

async function main() {
  console.log('====================================')
  console.log('CS Loadout Database Seed')
  console.log('====================================\n')

  const startTime = Date.now()

  // Check for GitHub token
  if (process.env.GITHUB_TOKEN) {
    console.log('✓ GITHUB_TOKEN detected (5,000 req/hr rate limit)\n')
  } else {
    console.warn('⚠️  GITHUB_TOKEN not set (limited to 60 req/hr)')
    console.warn('   Set GITHUB_TOKEN=your_token for faster imports\n')
  }

  try {
    // Feature 01: Import All Items (skins, stickers, agents, keychains, collectibles)
    console.log('[ Feature 01 ] Importing Items from ByMykel API...\n')
    const results = await runCompleteImport()

    // Calculate totals
    const totals = {
      processed: 0,
      created: 0,
      updated: 0,
      failed: 0,
    }

    for (const [type, stats] of Object.entries(results)) {
      totals.processed += stats.processed
      totals.created += stats.created
      totals.updated += stats.updated
      totals.failed += stats.failed
    }

    console.log('\n====================================')
    console.log('✅ All items imported successfully')
    console.log('====================================')
    console.log(`Total Processed: ${totals.processed}`)
    console.log(`Total Created:   ${totals.created}`)
    console.log(`Total Updated:   ${totals.updated}`)
    console.log(`Total Failed:    ${totals.failed}\n`)

    console.log('Breakdown by Type:')
    for (const [type, stats] of Object.entries(results)) {
      console.log(`  ${type.padEnd(15)} ${stats.created} created, ${stats.updated} updated`)
    }

    // TODO: Feature 02 - Import Collections
    // TODO: Feature 02 - Import Cases

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log('\n====================================')
    console.log(`✅ Seed completed in ${duration}s`)
    console.log('====================================')
    if (!process.env.GITHUB_TOKEN) {
      console.log('⚠️  GITHUB_TOKEN not set (limited to 60 req/hr)')
      console.log('   Set GITHUB_TOKEN=your_token for faster imports')
    }
    console.log()

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Seed failed with error:')
    console.error(error)
    console.error('\nPlease check:')
    console.error('  1. Database connection (DATABASE_URL)')
    console.error('  2. Internet connection (ByMykel API access)')
    console.error('  3. GitHub rate limits (use GITHUB_TOKEN)')
    process.exit(1)
  }
}

main()
