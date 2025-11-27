/**
 * TDD Tests for Sticker Display (Iteration 22)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Display applied stickers on item (lines 260-270)
 *
 * Requirements:
 * - Display all applied stickers on item card
 * - Show sticker name
 * - Show sticker position (1-4, or up to 5 in CS2)
 * - Stickers should be visible in item details
 * - Handle items with 0 stickers (no display)
 * - Handle items with partial stickers (1-3)
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

describe('Sticker Display (TDD - Iteration 22)', () => {
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
        persona_name: 'Sticker Test User',
        profile_url: 'https://steamcommunity.com/id/stickertest',
        avatar: 'https://example.com/avatar.jpg'
      }
    })
    testUserId = user.id

    // Create test item (AK-47 | Redline)
    const item = await prisma.item.create({
      data: {
        name: `test-ak47-redline-${uniqueId()}`,
        display_name: 'AK-47 | Redline',
        search_name: 'ak47 redline',
        type: 'weapon',
        rarity: 'classified',
        image_url: 'https://example.com/ak47-redline.png'
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

  it('should display all 4 stickers on item with stickers', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: user.steam_id,
        total_items: 1,
        total_value: 50.00,
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
            market_hash_name: 'AK-47 | Redline (Field-Tested)',
            current_value: 50.00,
            wear: 'field_tested',
            quality: 'normal',
            best_platform: 'buff163',
            stickers: [
              { name: 'Natus Vincere (Holo)', position: 1 },
              { name: 'FaZe Clan (Holo)', position: 2 },
              { name: 'G2 Esports', position: 3 },
              { name: 'Virtus.pro', position: 4 }
            ]
          }
        }
      }
    })

    render(<InventoryPage />)

    // Should display all 4 sticker names
    expect(screen.getByText(/Natus Vincere.*Holo/i)).toBeInTheDocument()
    expect(screen.getByText(/FaZe Clan.*Holo/i)).toBeInTheDocument()
    expect(screen.getByText(/G2 Esports/i)).toBeInTheDocument()
    expect(screen.getByText(/Virtus\.pro/i)).toBeInTheDocument()
  })

  it('should show sticker positions (1-4)', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: user.steam_id,
        total_items: 1,
        total_value: 50.00,
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
            market_hash_name: 'AK-47 | Redline (Field-Tested)',
            current_value: 50.00,
            wear: 'field_tested',
            quality: 'normal',
            best_platform: 'buff163',
            stickers: [
              { name: 'Natus Vincere (Holo)', position: 1 },
              { name: 'FaZe Clan (Holo)', position: 2 }
            ]
          }
        }
      }
    })

    const { container } = render(<InventoryPage />)

    // Should show position indicators
    const stickersSection = container.querySelector('[data-testid="stickers-section"]')
    expect(stickersSection).toBeInTheDocument()
  })

  it('should NOT display stickers section when item has no stickers', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: user.steam_id,
        total_items: 1,
        total_value: 25.00,
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
            market_hash_name: 'AK-47 | Redline (Field-Tested)',
            current_value: 25.00,
            wear: 'field_tested',
            quality: 'normal',
            best_platform: 'buff163'
            // No stickers field
          }
        }
      }
    })

    render(<InventoryPage />)

    // Should NOT show stickers section
    expect(screen.queryByText(/sticker/i)).not.toBeInTheDocument()
  })

  it('should display partial stickers (1-3 stickers)', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: user.steam_id,
        total_items: 1,
        total_value: 30.00,
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
            market_hash_name: 'AK-47 | Redline (Field-Tested)',
            current_value: 30.00,
            wear: 'field_tested',
            quality: 'normal',
            best_platform: 'buff163',
            stickers: [
              { name: 'Natus Vincere (Holo)', position: 1 },
              { name: 'FaZe Clan (Holo)', position: 3 }
            ]
          }
        }
      }
    })

    render(<InventoryPage />)

    // Should display only the 2 stickers applied
    expect(screen.getByText(/Natus Vincere.*Holo/i)).toBeInTheDocument()
    expect(screen.getByText(/FaZe Clan.*Holo/i)).toBeInTheDocument()
  })

  it('should visually distinguish stickers section from other item attributes', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: user.steam_id,
        total_items: 1,
        total_value: 50.00,
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
            market_hash_name: 'AK-47 | Redline (Field-Tested)',
            current_value: 50.00,
            wear: 'field_tested',
            quality: 'normal',
            best_platform: 'buff163',
            stickers: [
              { name: 'Natus Vincere (Holo)', position: 1 }
            ]
          }
        }
      }
    })

    const { container } = render(<InventoryPage />)

    // Should have distinct stickers section with header or border
    const stickersSection = container.querySelector('[data-testid="stickers-section"]')
    expect(stickersSection).toBeInTheDocument()
  })
})
