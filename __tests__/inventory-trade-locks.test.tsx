/**
 * TDD Tests for Trade-Locked Items (Iteration 24)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Display trade-locked items with hold date (lines 285-292)
 *
 * Requirements:
 * - Item shows can_trade: false when trade-locked
 * - Display "🔒 Tradeable in X days" indicator
 * - Show current value even when trade-locked
 * - Display "Cannot sell until [date]" message
 * - Calculate days until tradeable from trade_hold_until
 *
 * @jest-environment jsdom
 */

import React from 'react'
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

describe('Trade-Locked Items (TDD - Iteration 24)', () => {
  const uniqueId = () => `${Date.now()}-${Math.random().toString(36).substring(7)}`
  let testUserId: string
  let testItemId: string

  beforeEach(async () => {
    // Start transaction for test isolation
    await global.prismaTestHelper.startTransaction()
    jest.clearAllMocks()

    // Create test user
    const user = await prisma.user.create({
      data: {
        steam_id: `test-steam-${uniqueId()}`,
        persona_name: 'Trade Lock Test User',
        profile_url: 'https://steamcommunity.com/id/tradelocktest',
        avatar: 'https://example.com/avatar.jpg'
      }
    })
    testUserId = user.id

    // Create test item (M4A4 | Howl)
    const item = await prisma.item.create({
      data: {
        name: `test-m4a4-howl-${uniqueId()}`,
        display_name: 'M4A4 | Howl',
        search_name: 'm4a4 howl',
        type: 'weapon',
        rarity: 'covert',
        image_url: 'https://example.com/m4a4-howl.png'
      }
    })
    testItemId = item.id

    // Update mock to return correct user ID
    mockGetSession.mockResolvedValue({
      user: {
        id: testUserId,
        steamId: user.steam_id
      }
    })
  })

  afterEach(() => {
    // Rollback transaction - automatic cleanup, no manual deletion needed
    global.prismaTestHelper.rollbackTransaction()
  })

  it('should display "🔒 Tradeable in 7 days" for trade-locked item', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: user.steam_id,
        total_items: 1,
        total_value: 2000.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        items: {
          create: {
            item: {
              connect: { id: testItemId }
            },
            steam_asset_id: `asset-${uniqueId()}`,
            market_hash_name: 'M4A4 | Howl (Factory New)',
            current_value: 2000.00,
            wear: 'factory_new',
            quality: 'normal',
            best_platform: 'buff163',
            can_trade: false,
            trade_hold_until: sevenDaysFromNow
          }
        }
      }
    })

    render(<InventoryPage />)

    // Lock icon and text are in separate elements
    expect(screen.getByText('🔒')).toBeInTheDocument()
    expect(screen.getByText(/Tradeable in 7 days/i)).toBeInTheDocument()
  })

  it('should show "Cannot sell until Nov 15, 2025" for specific date', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)
    const nov15_2025 = new Date('2025-11-15T00:00:00Z')

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: user.steam_id,
        total_items: 1,
        total_value: 2000.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        items: {
          create: {
            item: {
              connect: { id: testItemId }
            },
            steam_asset_id: `asset-${uniqueId()}`,
            market_hash_name: 'M4A4 | Howl (Factory New)',
            current_value: 2000.00,
            wear: 'factory_new',
            quality: 'normal',
            best_platform: 'buff163',
            can_trade: false,
            trade_hold_until: nov15_2025
          }
        }
      }
    })

    render(<InventoryPage />)

    // Check for "Cannot sell until" and date in 2025 (date may vary by timezone)
    expect(screen.getByText(/Cannot sell until/i)).toBeInTheDocument()
    expect(screen.getByText(/Nov.*1[45].*2025/i)).toBeInTheDocument() // Nov 14 or 15, 2025 depending on timezone
  })

  it('should still display current value for trade-locked items', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: user.steam_id,
        total_items: 1,
        total_value: 2000.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        items: {
          create: {
            item: {
              connect: { id: testItemId }
            },
            steam_asset_id: `asset-${uniqueId()}`,
            market_hash_name: 'M4A4 | Howl (Factory New)',
            current_value: 2000.00,
            wear: 'factory_new',
            quality: 'normal',
            best_platform: 'buff163',
            can_trade: false,
            trade_hold_until: sevenDaysFromNow
          }
        }
      }
    })

    render(<InventoryPage />)

    // Should still show the value (may appear multiple times in summary stats)
    expect(screen.getAllByText(/\$2,000\.00/).length).toBeGreaterThanOrEqual(1)
  })

  it('should store can_trade: false in database for trade-locked items', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const inventory = await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: user.steam_id,
        total_items: 1,
        total_value: 2000.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        items: {
          create: {
            item: {
              connect: { id: testItemId }
            },
            steam_asset_id: `asset-${uniqueId()}`,
            market_hash_name: 'M4A4 | Howl (Factory New)',
            current_value: 2000.00,
            wear: 'factory_new',
            quality: 'normal',
            best_platform: 'buff163',
            can_trade: false,
            trade_hold_until: sevenDaysFromNow
          }
        }
      }
    })

    // Fetch from database
    const inventoryWithItems = await prisma.userInventory.findUnique({
      where: { id: inventory.id },
      include: { items: true }
    })

    expect(inventoryWithItems?.items[0].can_trade).toBe(false)
    expect(inventoryWithItems?.items[0].trade_hold_until).toEqual(sevenDaysFromNow)
  })

  it('should NOT display trade lock indicator for tradeable items', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: user.steam_id,
        total_items: 1,
        total_value: 2000.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        items: {
          create: {
            item: {
              connect: { id: testItemId }
            },
            steam_asset_id: `asset-${uniqueId()}`,
            market_hash_name: 'M4A4 | Howl (Factory New)',
            current_value: 2000.00,
            wear: 'factory_new',
            quality: 'normal',
            best_platform: 'buff163',
            can_trade: true // Tradeable
            // No trade_hold_until
          }
        }
      }
    })

    render(<InventoryPage />)

    // Should NOT show trade lock indicator
    expect(screen.queryByText(/🔒/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Tradeable in/i)).not.toBeInTheDocument()
  })

  it('should visually distinguish trade-locked items with dedicated section', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: user.steam_id,
        total_items: 1,
        total_value: 2000.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        items: {
          create: {
            item: {
              connect: { id: testItemId }
            },
            steam_asset_id: `asset-${uniqueId()}`,
            market_hash_name: 'M4A4 | Howl (Factory New)',
            current_value: 2000.00,
            wear: 'factory_new',
            quality: 'normal',
            best_platform: 'buff163',
            can_trade: false,
            trade_hold_until: sevenDaysFromNow
          }
        }
      }
    })

    const { container } = render(<InventoryPage />)

    // Should have a dedicated trade lock section
    const tradeLockSection = container.querySelector('[data-testid="trade-lock-section"]')
    expect(tradeLockSection).toBeInTheDocument()
  })

  it('should calculate correct days remaining until tradeable', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: user.steam_id,
        total_items: 1,
        total_value: 2000.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        items: {
          create: {
            item: {
              connect: { id: testItemId }
            },
            steam_asset_id: `asset-${uniqueId()}`,
            market_hash_name: 'M4A4 | Howl (Factory New)',
            current_value: 2000.00,
            wear: 'factory_new',
            quality: 'normal',
            best_platform: 'buff163',
            can_trade: false,
            trade_hold_until: threeDaysFromNow
          }
        }
      }
    })

    render(<InventoryPage />)

    // Should show 3 days (not 7)
    expect(screen.getByText(/Tradeable in 3 days/i)).toBeInTheDocument()
  })
})
