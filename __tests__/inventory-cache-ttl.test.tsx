/**
 * TDD Tests for Cache TTL Enforcement (Iteration 16)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Cache prevents redundant API calls (lines 105-111)
 *
 * Requirements:
 * - Cache TTL is 6 hours
 * - Return cached data immediately when cache is valid
 * - Do NOT call Steam API when cache is valid
 * - Display "Last synced: X hours ago" indicator
 * - Only fetch fresh data when cache expires (>6 hours)
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { prisma } from '@/lib/prisma'
import InventoryPage from '@/app/inventory/page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  useRouter: () => ({
    refresh: jest.fn(),
    push: jest.fn()
  })
}))

// Mock auth session
const mockGetSession = jest.fn()
jest.mock('@/lib/auth/session', () => ({
  getSession: () => mockGetSession()
}))

describe('Cache TTL Enforcement (TDD - Iteration 16)', () => {
  let testUserId: string
  let testInventoryId: string

  beforeEach(async () => {
    // Clean up test data
    await prisma.inventoryItem.deleteMany({})
    await prisma.marketplacePrice.deleteMany({})
    await prisma.userInventory.deleteMany({})
    await prisma.user.deleteMany({ where: { steam_id: { startsWith: 'test-' } } })

    // Create test user
    const user = await prisma.user.create({
      data: {
        steam_id: 'test-steam-cache-76561198123456789',
        persona_name: 'Cache Test User',
        profile_url: 'https://steamcommunity.com/id/cachetest',
        avatar: 'https://example.com/avatar.jpg'
      }
    })
    testUserId = user.id

    // Update mock to return correct user ID
    mockGetSession.mockResolvedValue({
      user: {
        id: testUserId,
        steamId: 'test-steam-cache-76561198123456789'
      }
    })
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.inventoryItem.deleteMany({})
    await prisma.marketplacePrice.deleteMany({})
    await prisma.userInventory.deleteMany({})
    await prisma.user.deleteMany({ where: { steam_id: { startsWith: 'test-' } } })
  })

  it('should display "Last synced: 3 hours ago" when cache is 3 hours old', async () => {
    // Create inventory synced 3 hours ago
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000)

    const inventory = await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-cache-76561198123456789',
        total_items: 247,
        total_value: 1234.56,
        sync_status: 'success',
        last_synced: threeHoursAgo,
        is_public: true,
        consent_given: true
      }
    })
    testInventoryId = inventory.id

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    // Should show last synced timestamp
    expect(screen.getByText(/last synced.*3 hours ago/i)).toBeInTheDocument()
  })

  it('should display "Last synced: 1 hour ago" when cache is 1 hour old', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-cache-76561198123456789',
        total_items: 150,
        total_value: 500.00,
        sync_status: 'success',
        last_synced: oneHourAgo,
        is_public: true,
        consent_given: true
      }
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    expect(screen.getByText(/last synced.*1 hour ago/i)).toBeInTheDocument()
  })

  it('should display "Last synced: just now" when cache is <1 minute old', async () => {
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-cache-76561198123456789',
        total_items: 200,
        total_value: 750.00,
        sync_status: 'success',
        last_synced: thirtySecondsAgo,
        is_public: true,
        consent_given: true
      }
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    expect(screen.getByText(/last synced.*just now/i)).toBeInTheDocument()
  })

  it('should display "Last synced: 5 hours ago" when cache is nearly expired', async () => {
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-cache-76561198123456789',
        total_items: 300,
        total_value: 1500.00,
        sync_status: 'success',
        last_synced: fiveHoursAgo,
        is_public: true,
        consent_given: true
      }
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    expect(screen.getByText(/last synced.*5 hours ago/i)).toBeInTheDocument()
  })

  it('should show cache age in minutes when between 1-59 minutes old', async () => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-cache-76561198123456789',
        total_items: 100,
        total_value: 300.00,
        sync_status: 'success',
        last_synced: thirtyMinutesAgo,
        is_public: true,
        consent_given: true
      }
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    expect(screen.getByText(/last synced.*30 minutes ago/i)).toBeInTheDocument()
  })

  it('should display "Last synced: 7 hours ago" when cache has expired', async () => {
    const sevenHoursAgo = new Date(Date.now() - 7 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-cache-76561198123456789',
        total_items: 180,
        total_value: 650.00,
        sync_status: 'success',
        last_synced: sevenHoursAgo,
        is_public: true,
        consent_given: true
      }
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    expect(screen.getByText(/last synced.*7 hours ago/i)).toBeInTheDocument()
  })

  it('should show cache age in days when >24 hours old', async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-cache-76561198123456789',
        total_items: 50,
        total_value: 100.00,
        sync_status: 'success',
        last_synced: threeDaysAgo,
        is_public: true,
        consent_given: true
      }
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    expect(screen.getByText(/last synced.*3 days ago/i)).toBeInTheDocument()
  })

  it('should NOT display last synced indicator when no inventory exists', async () => {
    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    // Should show empty state, NOT last synced indicator
    expect(screen.queryByText(/last synced/i)).not.toBeInTheDocument()
  })
})
