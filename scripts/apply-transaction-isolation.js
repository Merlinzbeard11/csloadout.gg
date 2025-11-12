#!/usr/bin/env node

/**
 * Automated Test Isolation Update Script
 *
 * Updates test files to use transaction-based isolation
 * Pattern: Add startTransaction() to beforeEach, rollbackTransaction() to afterEach
 * Remove manual cleanup (deleteMany, truncate, etc.)
 */

const fs = require('fs');
const path = require('path');

// List of test files to update
const TEST_FILES = [
  // Inventory tests (10 files)
  '__tests__/inventory-cache-ttl.test.tsx',
  '__tests__/inventory-custom-name-tags.test.tsx',
  '__tests__/inventory-item-grid.test.tsx',
  '__tests__/inventory-page.test.tsx',
  '__tests__/inventory-privacy-change.test.tsx',
  '__tests__/inventory-privacy-workflow.test.tsx',
  '__tests__/inventory-refresh-button.test.tsx',
  '__tests__/inventory-resume-import.test.tsx',
  '__tests__/inventory-sticker-display.test.tsx',
  '__tests__/inventory-total-savings.test.tsx',
  '__tests__/inventory-trade-locks.test.tsx',
  '__tests__/inventory-unmatched-items.test.tsx',
  '__tests__/InventoryImportButton.test.tsx',

  // Alert/notification tests (5 files)
  '__tests__/alert-checker.test.ts',
  '__tests__/alert-history.test.ts',
  '__tests__/email-notifications.test.ts',
  '__tests__/price-alerts.test.ts',
  '__tests__/push-notifications.test.ts',

  // Loadout/budget tests (7 files)
  '__tests__/BudgetTracker.test.tsx',
  '__tests__/ItemBrowser.test.tsx',
  '__tests__/loadout-detail-page.test.tsx',
  '__tests__/loadout-item-actions.test.ts',
  '__tests__/SelectedItemsList.test.tsx',
  'src/lib/budget-loadout/__tests__/budget-allocator.test.ts',
  'src/lib/budget-loadout/__tests__/database-foundation.test.ts',
  'src/lib/budget-loadout/__tests__/loadout-storage.test.ts',

  // Public/viewing tests (4 files)
  '__tests__/public-gallery.test.ts',
  '__tests__/public-viewing.test.tsx',
  '__tests__/publish-toggle.test.ts',
  '__tests__/upvote-functionality.test.ts',
  '__tests__/view-analytics.test.ts',

  // API/service tests (3 files)
  'src/app/api/inventory/__tests__/route.test.ts',
  'src/app/api/inventory/sync/__tests__/route.test.ts',
  'src/app/api/loadouts/__tests__/loadouts-api.test.ts',
  'src/lib/inventory/__tests__/inventory-sync-service.test.ts',

  // Misc tests (3 files)
  '__tests__/error-handling.test.ts',
  '__tests__/import.test.ts',
  '__tests__/performance.test.ts',
  '__tests__/steam-openid-provider.test.ts',
];

function updateTestFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  SKIP: ${filePath} (not found)`);
    return { status: 'skipped', reason: 'not found' };
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Check if already updated
  if (content.includes('prismaTestHelper.startTransaction')) {
    console.log(`✅ SKIP: ${filePath} (already updated)`);
    return { status: 'skipped', reason: 'already updated' };
  }

  // Check if uses Prisma
  if (!content.match(/prisma\.(user|item|inventory|marketplace|loadout|alert)/)) {
    console.log(`⚠️  SKIP: ${filePath} (no Prisma usage)`);
    return { status: 'skipped', reason: 'no prisma' };
  }

  let modified = false;

  // Pattern 1: beforeEach with deleteMany cleanup
  const beforeEachPattern = /(beforeEach\(async \(\) => \{)\s*\/\/ Clean up test data\s*((?:await prisma\.\w+\.deleteMany\(\{[^}]*\}\)\s*)+)/g;

  if (beforeEachPattern.test(content)) {
    content = content.replace(
      beforeEachPattern,
      `$1
    // Start transaction for test isolation
    await global.prismaTestHelper.startTransaction()

    // Clear mock state
    jest.clearAllMocks()

    // (Manual cleanup removed - handled by transaction rollback)
`
    );
    modified = true;
  }

  // Pattern 2: beforeEach without cleanup comment
  const beforeEachSimple = /(beforeEach\(async \(\) => \{)\s*((?:await prisma\.\w+\.deleteMany\([^)]*\)\s*)+)/g;

  if (!modified && beforeEachSimple.test(content)) {
    content = content.replace(
      beforeEachSimple,
      `$1
    // Start transaction for test isolation
    await global.prismaTestHelper.startTransaction()

    // Clear mock state
    jest.clearAllMocks()

`
    );
    modified = true;
  }

  // Pattern 3: Empty beforeEach - just add transaction start
  const emptyBeforeEach = /(beforeEach\(async \(\) => \{)(\s*)(\/\/[^\n]*\n\s*)?(\})/g;

  if (!modified && content.includes('beforeEach(async () => {')) {
    content = content.replace(
      emptyBeforeEach,
      `$1
    // Start transaction for test isolation
    await global.prismaTestHelper.startTransaction()

    // Clear mock state
    jest.clearAllMocks()
$4`
    );
    modified = true;
  }

  // Pattern 4: afterEach cleanup - replace with rollback
  const afterEachPattern = /(afterEach\(async \(\) => \{)\s*\/\/ Clean up test data\s*((?:await prisma\.\w+\.deleteMany\(\{[^}]*\}\)\s*)+)(\s*\})/g;

  content = content.replace(
    afterEachPattern,
    `afterEach(() => {
    // Rollback transaction - automatic cleanup, no manual deletion needed
    global.prismaTestHelper.rollbackTransaction()
  })`
  );

  // Pattern 5: afterEach without comment
  const afterEachSimple = /(afterEach\(async \(\) => \{)\s*((?:await prisma\.\w+\.deleteMany\([^)]*\)\s*)+)(\s*\})/g;

  content = content.replace(
    afterEachSimple,
    `afterEach(() => {
    // Rollback transaction - automatic cleanup, no manual deletion needed
    global.prismaTestHelper.rollbackTransaction()
  })`
  );

  if (modified || content.includes('global.prismaTestHelper.rollbackTransaction')) {
    // Create backup
    fs.writeFileSync(`${fullPath}.backup`, fs.readFileSync(fullPath));

    // Write updated content
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ UPDATED: ${filePath}`);
    return { status: 'updated' };
  }

  console.log(`⚠️  NO CHANGES: ${filePath} (pattern not matched)`);
  return { status: 'no-match' };
}

// Main execution
console.log('🔧 Applying transaction isolation to test files...\n');

const results = {
  updated: 0,
  skipped: 0,
  failed: 0,
  noMatch: 0
};

TEST_FILES.forEach(file => {
  try {
    const result = updateTestFile(file);
    if (result.status === 'updated') results.updated++;
    else if (result.status === 'skipped') results.skipped++;
    else if (result.status === 'no-match') results.noMatch++;
  } catch (error) {
    console.log(`❌ ERROR: ${file} - ${error.message}`);
    results.failed++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`   Updated: ${results.updated} files`);
console.log(`   Skipped: ${results.skipped} files`);
console.log(`   No match: ${results.noMatch} files`);
console.log(`   Failed: ${results.failed} files`);
console.log(`\n✅ Script complete!`);

if (results.noMatch > 0) {
  console.log(`\n⚠️  Files with no pattern match may need manual update.`);
  console.log(`   See docs/TEST-ISOLATION-GUIDE.md for pattern examples.`);
}
