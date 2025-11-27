/**
 * Script to run ONLY the collections and cases import from ByMykel API
 * This is a faster alternative to run-import.ts when you just need to refresh collection links
 *
 * Usage: npx tsx scripts/import-collections-only.ts
 */

import { fetchCollections, importCollections, fetchCases, importCases } from '../src/lib/import-service'

async function main() {
  console.log('Starting collections and cases import...\n')

  try {
    // Import collections (Feature 02)
    console.log('[Import] Fetching collections...')
    const collections = await fetchCollections()
    console.log(`[Import] Fetched ${collections.length} collections, beginning import...`)
    const collectionsResult = await importCollections(collections)
    console.log(`[Import] Collections: ${collectionsResult.processed} processed, ${collectionsResult.created} created, ${collectionsResult.updated} updated, ${collectionsResult.failed} failed`)

    // Import cases (Feature 02)
    console.log('\n[Import] Fetching cases...')
    const casesList = await fetchCases()
    console.log(`[Import] Fetched ${casesList.length} cases, beginning import...`)
    const casesResult = await importCases(casesList)
    console.log(`[Import] Cases: ${casesResult.processed} processed, ${casesResult.created} created, ${casesResult.updated} updated, ${casesResult.failed} failed`)

    console.log('\n=== Import Complete ===')
    console.log(`Collections: ${collectionsResult.processed} processed, ${collectionsResult.created} created`)
    console.log(`Cases: ${casesResult.processed} processed, ${casesResult.created} created`)

  } catch (error) {
    console.error('Import failed:', error)
    process.exit(1)
  }
}

main()
