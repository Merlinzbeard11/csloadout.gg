/**
 * @jest-environment node
 *
 * TDD Tests for Sign Out API Route
 * BDD Reference: features/06-steam-authentication.feature:40-48
 *   Scenario: Logout functionality
 *   - When I click the "Sign Out" button
 *   - Then my session should be destroyed
 *   - And my session cookie should be deleted
 *
 * PROPER TDD: Test written BEFORE implementation
 *
 * Gotcha: Route handlers require node environment + next-test-api-route-handler
 * Sources:
 * - https://www.npmjs.com/package/next-test-api-route-handler
 * - https://nextjs.org/docs/app/guides/testing/jest
 */

// MUST be first import (per next-test-api-route-handler docs)
import { testApiHandler } from 'next-test-api-route-handler';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
const mockPrismaDelete = jest.fn();
const mockPrisma = {
  session: {
    delete: mockPrismaDelete,
  },
} as unknown as PrismaClient;

// Mock the prisma import
jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// Import route handler AFTER mock setup
import * as appHandler from '../route';

describe('POST /api/auth/signout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('With Valid Session Token', () => {
    it('should delete session from database', async () => {
      // BDD: "Then my session should be destroyed"
      mockPrismaDelete.mockResolvedValueOnce({ id: 'session123' });

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: {
              Cookie: 'session_token=valid_token_123',
            },
          });

          expect(mockPrismaDelete).toHaveBeenCalledWith({
            where: { session_token: 'valid_token_123' },
          });
        },
      });
    });

    it('should delete session cookie', async () => {
      // BDD: "And my session cookie should be deleted"
      mockPrismaDelete.mockResolvedValueOnce({ id: 'session123' });

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: {
              Cookie: 'session_token=valid_token_123',
            },
          });

          const setCookie = response.headers.get('set-cookie');
          expect(setCookie).toBeTruthy();
          expect(setCookie).toContain('session_token=');
          expect(setCookie).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/); // Cookie deletion
        },
      });
    });

    it('should return success response with redirect URL', async () => {
      mockPrismaDelete.mockResolvedValueOnce({ id: 'session123' });

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: {
              Cookie: 'session_token=valid_token_123',
            },
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data.success).toBe(true);
          expect(data.redirectTo).toBe('/');
        },
      });
    });
  });

  describe('Without Session Token', () => {
    it('should still delete session cookie even without database session', async () => {
      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({ method: 'POST' });

          const setCookie = response.headers.get('set-cookie');
          expect(setCookie).toBeTruthy();
          expect(setCookie).toContain('session_token=');
          expect(setCookie).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/);
        },
      });
    });

    it('should return success response even without session', async () => {
      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({ method: 'POST' });

          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data.success).toBe(true);
          expect(data.redirectTo).toBe('/');
        },
      });
    });
  });

  describe('Database Error Handling', () => {
    it('should not throw error if session deletion fails', async () => {
      mockPrismaDelete.mockRejectedValueOnce(new Error('Database connection failed'));

      await testApiHandler({
        appHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: {
              Cookie: 'session_token=valid_token_123',
            },
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data.success).toBe(true);
          expect(data.redirectTo).toBe('/');
        },
      });
    });
  });
});
