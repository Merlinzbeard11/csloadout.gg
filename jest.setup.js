// Jest setup for React Testing Library
require('@testing-library/jest-dom');

// Mock React cache() function for Next.js Server Components in tests
// Gotcha: React cache() is not available in Node test environment
// Solution: Pass-through mock for testing
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  cache: (fn) => fn, // Pass-through: cache(fn) returns fn unchanged
}));

// Mock authentication for testing server actions
// Global mock that can be overridden in individual tests
global.mockSession = {
  user: {
    id: 'test-user-id',
    steamId: 'test-steam-id',
    personaName: 'Test User',
    email: 'test@example.com',
    avatar: 'https://example.com/avatar.png'
  },
  sessionToken: 'test-session-token',
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
};

// Mock getSession from auth module
jest.mock('@/lib/auth/session', () => ({
  getSession: jest.fn(() => Promise.resolve(global.mockSession))
}));

// Mock Next.js revalidatePath for server actions
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  unstable_cache: jest.fn()
}));
