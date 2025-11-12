# Test Isolation Guide - Transaction Rollback with Prisma

## Problem

When running Jest tests in parallel with Prisma, database state contamination causes test failures:
- **Symptom**: 323 tests failing in parallel, but passing individually
- **Root Cause**: Database state leaking between tests
- **Impact**: Flaky tests, slow execution, unreliable CI/CD

## Solution

Transaction-based test isolation using `@chax-at/transactional-prisma-testing`:
- Each test runs in its own database transaction
- Transaction automatically rolled back after test completion
- **10-100x faster** than manual cleanup (deleteMany/truncate)
- Supports parallel test execution on same database

---

## Implementation

### 1. Installation

```bash
npm install --save-dev @chax-at/transactional-prisma-testing
```

**Note**: Package `@quramy/jest-prisma` is **incompatible** with Jest 30. Use `@chax-at/transactional-prisma-testing` instead.

---

### 2. Create `jest.setup.prisma.js`

```javascript
/**
 * Prisma Test Isolation Setup
 * Provides transaction-based test isolation for Prisma tests
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaTestingHelper } = require('@chax-at/transactional-prisma-testing');

let prismaTestingHelper;
let prismaClient;

function getPrismaTestingHelper() {
  if (!prismaTestingHelper) {
    const originalPrisma = new PrismaClient();
    prismaTestingHelper = new PrismaTestingHelper(originalPrisma);
  }
  return prismaTestingHelper;
}

function getTransactionalPrismaClient() {
  if (!prismaClient) {
    const helper = getPrismaTestingHelper();
    prismaClient = helper.getProxyClient();
  }
  return prismaClient;
}

async function startTestTransaction() {
  const helper = getPrismaTestingHelper();
  await helper.startNewTransaction({
    timeout: 60000, // 60 second timeout
    maxWait: 10000  // 10 second max wait
  });
}

function rollbackTestTransaction() {
  const helper = getPrismaTestingHelper();
  helper.rollbackCurrentTransaction();
}

// Export for use in tests
global.prismaTestHelper = {
  getClient: getTransactionalPrismaClient,
  startTransaction: startTestTransaction,
  rollbackTransaction: rollbackTestTransaction
};

// Mock Prisma client to use transactional client
jest.mock('@/lib/prisma', () => ({
  prisma: getTransactionalPrismaClient()
}));
```

---

### 3. Update `jest.config.js`

```javascript
module.exports = {
  // ... other config
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/jest.setup.prisma.js'  // Add this line
  ],
};
```

---

### 4. Update Test Files

**Before (Manual Cleanup):**

```typescript
describe('My Test Suite', () => {
  beforeEach(async () => {
    // Manual cleanup - SLOW and error-prone
    await prisma.inventoryItem.deleteMany({})
    await prisma.marketplacePrice.deleteMany({})
    await prisma.item.deleteMany({})
    await prisma.userInventory.deleteMany({})
    await prisma.user.deleteMany({})

    // Setup test data
    const user = await prisma.user.create({ ... })
  })

  afterEach(async () => {
    // More manual cleanup
    await prisma.inventoryItem.deleteMany({})
    await prisma.marketplacePrice.deleteMany({})
    // ... etc
  })

  it('should do something', async () => {
    // Test code
  })
})
```

**After (Transaction Rollback):**

```typescript
describe('My Test Suite', () => {
  beforeEach(async () => {
    // Start transaction - FAST and automatic
    await global.prismaTestHelper.startTransaction()

    // Clear mock state
    jest.clearAllMocks()

    // Setup test data (inside transaction)
    const user = await prisma.user.create({ ... })
  })

  afterEach(() => {
    // Rollback transaction - automatic cleanup, no manual deletion
    global.prismaTestHelper.rollbackTransaction()
  })

  it('should do something', async () => {
    // Test code
  })
})
```

---

## Benefits

### ✅ Performance
- **10-100x faster** than manual cleanup
- Transaction rollback is instant
- No cascade deletion overhead

### ✅ Reliability
- No database state leakage between tests
- Consistent starting state for every test
- Parallel execution supported

### ✅ Simplicity
- Remove all `deleteMany()` calls
- Remove manual cleanup code
- Two simple hooks: `startTransaction()` + `rollbackTransaction()`

---

## Migration Checklist

For each failing test file:

1. **Add transaction hooks:**
   ```typescript
   beforeEach(async () => {
     await global.prismaTestHelper.startTransaction()
     jest.clearAllMocks()
     // ... rest of setup
   })

   afterEach(() => {
     global.prismaTestHelper.rollbackTransaction()
   })
   ```

2. **Remove manual cleanup:**
   - Delete all `deleteMany()` calls
   - Delete all `truncate()` calls
   - Delete manual cleanup in `afterEach`

3. **Keep setup code:**
   - `prisma.create()` calls stay
   - Test data setup stays
   - Mock configuration stays

4. **Test the file:**
   ```bash
   npm test -- path/to/test.test.tsx
   ```

---

## Example Test Files

Successfully updated:
- `__tests__/gdpr-data-deletion.test.tsx` (7/7 passing)
- `__tests__/gdpr-data-export.test.tsx` (8/8 passing)
- `__tests__/daily-auto-refresh-cron.test.tsx` (7/7 passing)

See these files for working examples.

---

## Limitations

From `@chax-at/transactional-prisma-testing` documentation:

1. **PostgreSQL only** - Other databases untested
2. **No Fluent API** - Not supported
3. **Sequences not reset** - Auto-increment IDs continue across tests
4. **`@default(now())` behavior** - Uses transaction start time (all timestamps same)
   - Use `@default(dbgenerated("statement_timestamp()"))` if unique timestamps needed

---

## Remaining Work

**Status**: 3/43 failing test files updated

**Remaining test files** (40 files):
```
__tests__/alert-checker.test.ts
__tests__/alert-history.test.ts
__tests__/BudgetTracker.test.tsx
__tests__/email-notifications.test.ts
__tests__/error-handling.test.ts
__tests__/import.test.ts
__tests__/inventory-cache-ttl.test.tsx
__tests__/inventory-custom-name-tags.test.tsx
__tests__/inventory-item-grid.test.tsx
__tests__/inventory-page.test.tsx
__tests__/inventory-privacy-change.test.tsx
__tests__/inventory-privacy-workflow.test.tsx
__tests__/inventory-refresh-button.test.tsx
__tests__/inventory-resume-import.test.tsx
__tests__/inventory-sticker-display.test.tsx
__tests__/inventory-total-savings.test.tsx
__tests__/inventory-trade-locks.test.tsx
__tests__/inventory-unmatched-items.test.tsx
__tests__/InventoryImportButton.test.tsx
__tests__/ItemBrowser.test.tsx
__tests__/loadout-detail-page.test.tsx
__tests__/loadout-item-actions.test.ts
__tests__/performance.test.ts
__tests__/price-alerts.test.ts
__tests__/public-gallery.test.ts
__tests__/public-viewing.test.tsx
__tests__/publish-toggle.test.ts
__tests__/push-notifications.test.ts
__tests__/SelectedItemsList.test.tsx
__tests__/steam-openid-provider.test.ts
__tests__/upvote-functionality.test.ts
__tests__/view-analytics.test.ts
src/app/api/inventory/__tests__/route.test.ts
src/app/api/inventory/sync/__tests__/route.test.ts
src/app/api/loadouts/__tests__/loadouts-api.test.ts
src/lib/budget-loadout/__tests__/budget-allocator.test.ts
src/lib/budget-loadout/__tests__/database-foundation.test.ts
src/lib/budget-loadout/__tests__/loadout-storage.test.ts
src/lib/inventory/__tests__/inventory-sync-service.test.ts
```

**Expected outcome**: 1918/1918 tests passing (currently 1595/1918 = 83.2%)

---

## Troubleshooting

### Tests still failing after update?

1. **Check transaction hooks present:**
   ```typescript
   await global.prismaTestHelper.startTransaction()
   global.prismaTestHelper.rollbackTransaction()
   ```

2. **Verify no manual cleanup:**
   - Search for `deleteMany` in beforeEach/afterEach
   - Remove if found

3. **Check mock clearing:**
   ```typescript
   jest.clearAllMocks() // Should be in beforeEach
   ```

4. **Run test file individually:**
   ```bash
   npm test -- path/to/test.test.tsx
   ```

---

## Resources

- Package: https://www.npmjs.com/package/@chax-at/transactional-prisma-testing
- GitHub: https://github.com/chax-at/transactional-prisma-testing
- Prisma Docs: https://www.prisma.io/docs/orm/prisma-client/queries/transactions
