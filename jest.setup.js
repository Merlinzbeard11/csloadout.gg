// Jest setup for React Testing Library
require('@testing-library/jest-dom');

// Mock React cache() function for Next.js Server Components in tests
// Gotcha: React cache() is not available in Node test environment
// Solution: Pass-through mock for testing
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  cache: (fn) => fn, // Pass-through: cache(fn) returns fn unchanged
}));
