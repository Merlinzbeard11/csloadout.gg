/**
 * Prisma Test Isolation Setup using @chax-at/transactional-prisma-testing
 *
 * This setup file provides transaction-based test isolation for Prisma tests.
 * Each test runs in its own transaction that is rolled back after completion,
 * ensuring database state doesn't leak between tests.
 *
 * Benefits:
 * - 10-100x faster than truncation/deletion approach
 * - Parallel test execution supported (same database)
 * - Consistent database state for each test
 * - No manual cleanup required
 *
 * Limitations:
 * - PostgreSQL only
 * - No Fluent API support
 * - Sequences not reset (use SETVAL if needed)
 * - @default(now()) uses transaction start time (use statement_timestamp() if needed)
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaTestingHelper } = require('@chax-at/transactional-prisma-testing');

let prismaTestingHelper;
let prismaClient;

/**
 * Get or create the global Prisma testing helper
 * Singleton pattern ensures only one helper per test runner
 */
function getPrismaTestingHelper() {
  if (!prismaTestingHelper) {
    const originalPrisma = new PrismaClient();
    prismaTestingHelper = new PrismaTestingHelper(originalPrisma);
  }
  return prismaTestingHelper;
}

/**
 * Get the transactional Prisma client proxy
 * All queries through this client run in the current test transaction
 */
function getTransactionalPrismaClient() {
  if (!prismaClient) {
    const helper = getPrismaTestingHelper();
    prismaClient = helper.getProxyClient();
  }
  return prismaClient;
}

/**
 * Start a new transaction for the test
 * Call this in beforeEach()
 */
async function startTestTransaction() {
  const helper = getPrismaTestingHelper();
  await helper.startNewTransaction({
    timeout: 60000, // 60 second timeout for long-running tests
    maxWait: 10000  // 10 second max wait for transaction to start
  });
}

/**
 * Rollback the current test transaction
 * Call this in afterEach()
 */
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

// Mock Prisma client to use transactional client in tests
jest.mock('@/lib/prisma', () => ({
  prisma: getTransactionalPrismaClient()
}));
