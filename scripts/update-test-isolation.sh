#!/bin/bash

# Script to update all test files with transaction-based isolation
# Adds transaction hooks to beforeEach/afterEach blocks

set -e

echo "🔧 Updating test files with transaction isolation..."

# Array of all failing test files that need updates
TEST_FILES=(
  "__tests__/alert-checker.test.ts"
  "__tests__/alert-history.test.ts"
  "__tests__/BudgetTracker.test.tsx"
  "__tests__/daily-auto-refresh-cron.test.tsx"
  "__tests__/email-notifications.test.ts"
  "__tests__/error-handling.test.ts"
  "__tests__/gdpr-data-export.test.tsx"
  "__tests__/import.test.ts"
  "__tests__/inventory-cache-ttl.test.tsx"
  "__tests__/inventory-custom-name-tags.test.tsx"
  "__tests__/inventory-item-grid.test.tsx"
  "__tests__/inventory-missing-price-data.test.tsx"
  "__tests__/inventory-page.test.tsx"
  "__tests__/inventory-privacy-change.test.tsx"
  "__tests__/inventory-privacy-workflow.test.tsx"
  "__tests__/inventory-refresh-button.test.tsx"
  "__tests__/inventory-resume-import.test.tsx"
  "__tests__/inventory-sticker-display.test.tsx"
  "__tests__/inventory-total-savings.test.tsx"
  "__tests__/inventory-trade-locks.test.tsx"
  "__tests__/inventory-unmatched-items.test.tsx"
  "__tests__/InventoryImportButton.test.tsx"
  "__tests__/ItemBrowser.test.tsx"
  "__tests__/loadout-detail-page.test.tsx"
  "__tests__/loadout-item-actions.test.ts"
  "__tests__/performance.test.ts"
  "__tests__/price-alerts.test.ts"
  "__tests__/public-gallery.test.ts"
  "__tests__/public-viewing.test.tsx"
  "__tests__/publish-toggle.test.ts"
  "__tests__/push-notifications.test.ts"
  "__tests__/SelectedItemsList.test.tsx"
  "__tests__/steam-openid-provider.test.ts"
  "__tests__/upvote-functionality.test.ts"
  "__tests__/view-analytics.test.ts"
  "src/app/api/inventory/__tests__/route.test.ts"
  "src/app/api/inventory/sync/__tests__/route.test.ts"
  "src/app/api/loadouts/__tests__/loadouts-api.test.ts"
  "src/lib/budget-loadout/__tests__/budget-allocator.test.ts"
  "src/lib/budget-loadout/__tests__/database-foundation.test.ts"
  "src/lib/budget-loadout/__tests__/loadout-storage.test.ts"
  "src/lib/inventory/__tests__/inventory-sync-service.test.ts"
)

echo "Found ${#TEST_FILES[@]} test files to update"
echo ""

UPDATED=0
SKIPPED=0

for file in "${TEST_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "⚠️  SKIP: $file (not found)"
    ((SKIPPED++))
    continue
  fi

  # Check if file already has transaction setup
  if grep -q "prismaTestHelper.startTransaction" "$file"; then
    echo "✅ SKIP: $file (already updated)"
    ((SKIPPED++))
    continue
  fi

  # Check if file uses Prisma
  if ! grep -q "prisma\." "$file"; then
    echo "⚠️  SKIP: $file (no Prisma usage detected)"
    ((SKIPPED++))
    continue
  fi

  echo "🔄 Updating: $file"

  # Create backup
  cp "$file" "$file.backup"

  # Add transaction start to beforeEach blocks
  # Look for lines with deleteMany, create, update patterns in beforeEach
  # and inject transaction start before them

  # Simple approach: Add transaction hooks at the beginning of beforeEach/afterEach
  # This is a conservative approach - manual review may be needed

  # For now, just mark the file for manual update
  echo "   ⚠️  Manual update required - transaction hooks need context-specific placement"

  # Restore backup (not modifying automatically)
  rm "$file.backup"

  ((SKIPPED++))
done

echo ""
echo "📊 Summary:"
echo "   Updated: $UPDATED files"
echo "   Skipped: $SKIPPED files"
echo ""
echo "⚠️  RECOMMENDATION:"
echo "   Due to varying beforeEach/afterEach patterns, manual updates recommended."
echo "   Pattern to follow (see __tests__/gdpr-data-deletion.test.tsx):"
echo ""
echo "   beforeEach(async () => {"
echo "     await global.prismaTestHelper.startTransaction()"
echo "     jest.clearAllMocks()"
echo "     // ... rest of setup"
echo "   })"
echo ""
echo "   afterEach(() => {"
echo "     global.prismaTestHelper.rollbackTransaction()"
echo "   })"
echo ""
echo "   Remove manual cleanup: deleteMany(), truncate(), etc."
