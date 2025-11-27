/**
 * TDD Tests for Inventory Dashboard Page (Failing Tests - RED Phase)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: First-time inventory import shows total value (lines 17-27)
 *   Scenario: Display inventory value comparison across platforms (lines 29-43)
 *
 * Server Component Responsibilities:
 * - Fetch user's inventory from database (UserInventory model)
 * - Display empty state when no inventory exists
 * - Show "Import Steam Inventory" button
 * - Display total value, item count, last synced when inventory exists
 * - Handle authentication requirement
 * - Handle loading/error states
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  useRouter: () => ({
    refresh: jest.fn(),
    push: jest.fn()
  })
}))

// Component will be imported once implemented
// import InventoryPage from '@/app/inventory/page'

// Type definitions matching Prisma schema
interface UserInventory {
  id: string
  user_id: string
  steam_id: string
  total_items: number
  total_value: number
  last_synced: Date
  sync_status: string
  is_public: boolean
  consent_given: boolean
}

describe('Inventory Dashboard Page (TDD - RED Phase)', () => {
  const uniqueId = () => `${Date.now()}-${Math.random().toString(36).substring(7)}`
  let testUserId: string
  let testSteamId: string

  beforeEach(async () => {
    // Start transaction for test isolation
    await global.prismaTestHelper.startTransaction()
    jest.clearAllMocks()

    // Create test user
    const user = await prisma.user.create({
      data: {
        steam_id: `test-steam-${uniqueId()}`,
        persona_name: 'Test User',
        profile_url: 'https://steamcommunity.com/id/testuser',
        avatar: 'https://example.com/avatar.png',
        email: 'test@example.com'
      }
    })
    testUserId = user.id
    testSteamId = user.steam_id

    // Mock getSession to return test user
    ;(getSession as jest.Mock).mockResolvedValue({
      user: {
        id: testUserId,
        steamId: testSteamId,
        personaName: 'Test User',
        email: 'test@example.com'
      },
      sessionToken: 'test-token',
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    })
  })

  afterEach(() => {
    // Rollback transaction - automatic cleanup, no manual deletion needed
    global.prismaTestHelper.rollbackTransaction()
  })

  describe('Empty State - No Inventory', () => {
    it('should render empty state when user has no inventory', async () => {
      // BDD: Given I have never imported my inventory before
      // No UserInventory record exists for test user

      const InventoryPage = (await import('@/app/inventory/page')).default
      const { container } = render(<InventoryPage />)

      // Then I should see empty state message
      expect(screen.getByText(/import your steam inventory/i)).toBeInTheDocument()
    })

    it('should display "Import Steam Inventory" button in empty state', async () => {
      // BDD: When I click "Import Steam Inventory"

      const InventoryPage = (await import('@/app/inventory/page')).default
      const { container } = render(<InventoryPage />)

      // Then I should see the import button
      const importButton = screen.getByRole('button', { name: /import steam inventory/i })
      expect(importButton).toBeInTheDocument()
    })

    it('should show helpful message explaining inventory benefits', async () => {
      // Empty state should explain what inventory feature does

      const InventoryPage = (await import('@/app/inventory/page')).default
      const { container } = render(<InventoryPage />)

      // Then I should see explanation of inventory feature
      expect(screen.getByText(/see the total value/i)).toBeInTheDocument()
    })
  })

  describe('Imported Inventory Display', () => {
    beforeEach(async () => {
      // Create inventory record for test user
      await prisma.userInventory.create({
        data: {
          user_id: testUserId,
          steam_id: testSteamId,
          total_items: 247,
          total_value: 2458.67,
          last_synced: new Date(),
          sync_status: 'success',
          is_public: true,
          consent_given: true
        }
      })
    })

    it('should display total inventory value', async () => {
      // BDD: Then I should see my total inventory value "$2,458.67"

      const InventoryPage = (await import('@/app/inventory/page')).default
      const { container } = render(<InventoryPage />)

      expect(screen.getByText(/\$2,458\.67/)).toBeInTheDocument()
    })

    it('should display total item count', async () => {
      // BDD: And I should see "247 items imported"

      const InventoryPage = (await import('@/app/inventory/page')).default
      const { container } = render(<InventoryPage />)

      expect(screen.getByText(/247 items/i)).toBeInTheDocument()
    })

    it('should display last synced timestamp', async () => {
      // BDD: And I should see "Last synced: Just now"

      const InventoryPage = (await import('@/app/inventory/page')).default
      const { container } = render(<InventoryPage />)

      expect(screen.getByText(/last synced/i)).toBeInTheDocument()
    })

    it('should display refresh button for stale inventory', async () => {
      // Update inventory to be 7 hours old (cache TTL is 6 hours)
      const sevenHoursAgo = new Date(Date.now() - 7 * 60 * 60 * 1000)
      await prisma.userInventory.update({
        where: { user_id: testUserId },
        data: { last_synced: sevenHoursAgo }
      })

      const InventoryPage = (await import('@/app/inventory/page')).default
      const { container } = render(<InventoryPage />)

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
    })
  })

  describe('Authentication', () => {
    it('should require user to be authenticated', async () => {
      // Mock no session (not authenticated)
      ;(getSession as jest.Mock).mockResolvedValueOnce(null)

      const InventoryPage = (await import('@/app/inventory/page')).default

      // Component should redirect to sign-in (redirect() throws in tests)
      await expect(async () => {
        render(<InventoryPage />)
      }).rejects.toThrow()
    })

    it('should fetch inventory for authenticated user only', async () => {
      // Create inventory for test user
      await prisma.userInventory.create({
        data: {
          user_id: testUserId,
          steam_id: testSteamId,
          total_items: 100,
          total_value: 500.00,
          last_synced: new Date(),
          sync_status: 'success',
          is_public: true,
          consent_given: true
        }
      })

      const InventoryPage = (await import('@/app/inventory/page')).default
      const { container } = render(<InventoryPage />)

      // Should display user's inventory data
      expect(screen.getByText(/\$500\.00/)).toBeInTheDocument()
    })
  })

  describe('Error States', () => {
    it('should handle private inventory status', async () => {
      // Create inventory with private status
      await prisma.userInventory.create({
        data: {
          user_id: testUserId,
          steam_id: testSteamId,
          total_items: 0,
          total_value: 0,
          last_synced: new Date(),
          sync_status: 'private',
          is_public: false,
          consent_given: true,
          error_message: 'Inventory is private'
        }
      })

      const InventoryPage = (await import('@/app/inventory/page')).default
      const { container } = render(<InventoryPage />)

      expect(screen.getByRole('heading', { name: /inventory is private/i })).toBeInTheDocument()
    })

    it('should handle rate limit error status', async () => {
      // Create inventory with rate_limited status
      await prisma.userInventory.create({
        data: {
          user_id: testUserId,
          steam_id: testSteamId,
          total_items: 0,
          total_value: 0,
          last_synced: new Date(),
          sync_status: 'rate_limited',
          is_public: true,
          consent_given: true,
          error_message: 'Rate limit exceeded'
        }
      })

      const InventoryPage = (await import('@/app/inventory/page')).default
      const { container } = render(<InventoryPage />)

      expect(screen.getByRole('heading', { name: /rate limit/i })).toBeInTheDocument()
    })
  })
})
