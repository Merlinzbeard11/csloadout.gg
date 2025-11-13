// Jest setup for React Testing Library
require('@testing-library/jest-dom');

// Mock PointerEvent for JSDOM compatibility with Radix UI
// Source: https://github.com/radix-ui/primitives/issues/1220
class MockPointerEvent extends Event {
  constructor(type, props = {}) {
    super(type, props);
    this.button = props.button || 0;
    this.ctrlKey = props.ctrlKey || false;
    this.pointerType = props.pointerType || 'mouse';
  }
}
global.PointerEvent = MockPointerEvent;

// Mock ResizeObserver (required by Radix UI floating-ui)
// Source: https://github.com/radix-ui/primitives/issues/1220
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock Next.js Image component
// Source: https://dev.to/jenchen/jest-mocking-nextjs-image-to-handle-dynamic-properties-in-tests-33m4
// Using React.createElement to avoid JSX syntax in .js file
const React = require('react');
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return React.createElement('img', props);
  },
}));

// Mock Next.js Link component
// Source: https://bradgarropy.com/blog/mocking-nextjs
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }) => {
    return React.createElement('a', { href, ...props }, children);
  },
}));

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
