/**
 * TDD Tests for Custom Name Tags (Iteration 23)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Handle custom name tags correctly (lines 272-279)
 *
 * Requirements:
 * - Item matched using market_hash_name (NOT custom display name)
 * - Custom name stored in custom_name field
 * - Display "Custom Name: My Custom Name" in item details
 * - Custom name does NOT affect item matching/identification
 * - Custom name shown prominently but separately from item name
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

describe('Custom Name Tags (TDD - Iteration 23)', () => {
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
        persona_name: 'Custom Name Test User',
        profile_url: 'https://steamcommunity.com/id/customnametest',
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

  it('should match item using market_hash_name even with custom name tag', async () => {
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
            custom_name: 'My Custom Name',
            current_value: 50.00,
            wear: 'field_tested',
            quality: 'normal',
            best_platform: 'buff163'
          }
        }
      }
    })

    render(<InventoryPage />)

    // Item should be matched correctly (display_name from Item table, not custom name)
    expect(screen.getByText(/AK-47.*Redline/i)).toBeInTheDocument()
  })

  it('should display "Custom Name: My Custom Name" in item details', async () => {
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
            custom_name: 'My Custom Name',
            current_value: 50.00,
            wear: 'field_tested',
            quality: 'normal',
            best_platform: 'buff163'
          }
        }
      }
    })

    render(<InventoryPage />)

    // Custom name label and value are in separate elements
    expect(screen.getByText(/Custom Name:/i)).toBeInTheDocument()
    expect(screen.getByText(/My Custom Name/i)).toBeInTheDocument()
  })

  it('should NOT display custom name section when item has no custom name', async () => {
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
            // No custom_name field
            current_value: 50.00,
            wear: 'field_tested',
            quality: 'normal',
            best_platform: 'buff163'
          }
        }
      }
    })

    render(<InventoryPage />)

    // Should NOT show custom name section
    expect(screen.queryByText(/Custom Name:/i)).not.toBeInTheDocument()
  })

  it('should store custom name in custom_name field (database verification)', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    const inventory = await prisma.userInventory.create({
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
            custom_name: 'My Epic AK',
            current_value: 50.00,
            wear: 'field_tested',
            quality: 'normal',
            best_platform: 'buff163'
          }
        }
      }
    })

    // Fetch item from database
    const inventoryWithItems = await prisma.userInventory.findUnique({
      where: { id: inventory.id },
      include: { items: true }
    })

    expect(inventoryWithItems?.items[0].custom_name).toBe('My Epic AK')
  })

  it('should visually distinguish custom name from item name', async () => {
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
            custom_name: '"The Destroyer"',
            current_value: 50.00,
            wear: 'field_tested',
            quality: 'normal',
            best_platform: 'buff163'
          }
        }
      }
    })

    const { container } = render(<InventoryPage />)

    // Should have a dedicated custom name section with data-testid
    const customNameSection = container.querySelector('[data-testid="custom-name-section"]')
    expect(customNameSection).toBeInTheDocument()
  })

  it('should handle special characters and emojis in custom names', async () => {
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
            custom_name: '🔥 MLG Pro 🔥',
            current_value: 50.00,
            wear: 'field_tested',
            quality: 'normal',
            best_platform: 'buff163'
          }
        }
      }
    })

    render(<InventoryPage />)

    // Should render emojis and special characters correctly
    expect(screen.getByText(/🔥 MLG Pro 🔥/)).toBeInTheDocument()
  })
})
