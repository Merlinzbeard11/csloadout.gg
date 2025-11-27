/**
 * Script to run the complete item import from ByMykel API
 *
 * Usage: npx tsx scripts/run-import.ts
 */

import { runCompleteImport } from '../src/lib/import-service'

async function main() {
  console.log('Starting complete import...\n')

  try {
    const results = await runCompleteImport()

    console.log('\n=== Import Complete ===')
    for (const [type, result] of Object.entries(results)) {
      console.log(`${type}: ${result.processed} processed, ${result.created} created, ${result.updated} updated, ${result.failed} failed`)
    }

    // Calculate totals
    const totals = {
      processed: 0,
      created: 0,
      updated: 0,
      failed: 0,
    }

    for (const result of Object.values(results)) {
      totals.processed += result.processed
      totals.created += result.created
      totals.updated += result.updated
      totals.failed += result.failed
    }

    console.log('\n=== Totals ===')
    console.log(`Total: ${totals.processed} processed, ${totals.created} created, ${totals.updated} updated, ${totals.failed} failed`)

  } catch (error) {
    console.error('Import failed:', error)
    process.exit(1)
  }
}

main()
