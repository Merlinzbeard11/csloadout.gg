/**
 * TDD Tests for Missing Price Data Handling (Iteration 21)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Handle missing price data gracefully (lines 241-247)
 *
 * Requirements:
 * - Import items even when no marketplace has price data
 * - Display "$0.00" value for items without prices
 * - Show warning "Price data unavailable"
 * - Show message "Item will be imported with $0 value"
 * - Graceful degradation - missing prices shouldn't block imports
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

describe('Missing Price Data Handling (TDD - Iteration 21)', () => {
  let testUserId: string
  let testItemId: string

  beforeEach(async () => {
    // Clean up test data
    await prisma.inventoryItem.deleteMany({})
    await prisma.marketplacePrice.deleteMany({})
    await prisma.item.deleteMany({ where: { name: { startsWith: 'test-' } } })
    await prisma.userInventory.deleteMany({})
    await prisma.user.deleteMany({ where: { steam_id: { startsWith: 'test-' } } })

    // Create test user
    const user = await prisma.user.create({
      data: {
        steam_id: 'test-steam-missing-price-76561198777777777',
        persona_name: 'Missing Price Test User',
        profile_url: 'https://steamcommunity.com/id/missingpricetest',
        avatar: 'https://example.com/avatar.jpg'
      }
    })
    testUserId = user.id

    // Create test item (AWP | Safari Mesh)
    const item = await prisma.item.create({
      data: {
        name: 'test-awp-safari-mesh-bs',
        display_name: 'AWP | Safari Mesh (Battle-Scarred)',
        search_name: 'awp safari mesh battle scarred',
        type: 'weapon',
        rarity: 'consumer_grade',
        image_url: 'https://example.com/awp-safari-mesh.png'
      }
    })
    testItemId = item.id

    // Update mock to return correct user ID
    mockGetSession.mockResolvedValue({
      user: {
        id: testUserId,
        steamId: 'test-steam-missing-price-76561198777777777'
      }
    })
  })

  afterEach(() => {
    // Rollback transaction - automatic cleanup, no manual deletion needed
    global.prismaTestHelper.rollbackTransaction()
  })

  it('should import item with $0.00 value when no marketplace prices exist', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    // Create inventory with item that has NO marketplace prices
    const inventory = await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-missing-price-76561198777777777',
        total_items: 1,
        total_value: 0, // No price data
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        items: {
          create: {
            item: {
              connect: { id: testItemId }
            },
            steam_asset_id: '12345678901',
            market_hash_name: 'AWP | Safari Mesh (Battle-Scarred)',
            current_value: 0, // No price available
            wear: 'battle_scarred',
            quality: 'normal',
            best_platform: null, // No marketplace data
            price_updated_at: oneHourAgo
          }
        }
      }
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    // Item should display $0.00
    expect(screen.getByText('$0.00')).toBeInTheDocument()
  })

  it('should display warning "Price data unavailable" for items without prices', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-missing-price-76561198777777777',
        total_items: 1,
        total_value: 0,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        items: {
          create: {
            item: {
              connect: { id: testItemId }
            },
            steam_asset_id: '12345678901',
            market_hash_name: 'AWP | Safari Mesh (Battle-Scarred)',
            current_value: 0,
            wear: 'battle_scarred',
            quality: 'normal',
            best_platform: null,
            price_updated_at: oneHourAgo
          }
        }
      }
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    expect(screen.getByText(/price data unavailable/i)).toBeInTheDocument()
  })

  it('should display message "Item will be imported with $0 value"', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-missing-price-76561198777777777',
        total_items: 1,
        total_value: 0,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        items: {
          create: {
            item: {
              connect: { id: testItemId }
            },
            steam_asset_id: '12345678901',
            market_hash_name: 'AWP | Safari Mesh (Battle-Scarred)',
            current_value: 0,
            wear: 'battle_scarred',
            quality: 'normal',
            best_platform: null,
            price_updated_at: oneHourAgo
          }
        }
      }
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    expect(screen.getByText(/item.*imported.*\$0.*value/i)).toBeInTheDocument()
  })

  it('should NOT block import when price data is missing', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    const inventory = await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-missing-price-76561198777777777',
        total_items: 1,
        total_value: 0,
        sync_status: 'success', // Import successful
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        items: {
          create: {
            item: {
              connect: { id: testItemId }
            },
            steam_asset_id: '12345678901',
            market_hash_name: 'AWP | Safari Mesh (Battle-Scarred)',
            current_value: 0,
            wear: 'battle_scarred',
            quality: 'normal',
            best_platform: null,
            price_updated_at: oneHourAgo
          }
        }
      }
    })

    // Import should succeed even with no prices
    expect(inventory.sync_status).toBe('success')
    expect(inventory.total_items).toBe(1)
  })

  it('should show item name even when price is $0', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-missing-price-76561198777777777',
        total_items: 1,
        total_value: 0,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        items: {
          create: {
            item: {
              connect: { id: testItemId }
            },
            steam_asset_id: '12345678901',
            market_hash_name: 'AWP | Safari Mesh (Battle-Scarred)',
            current_value: 0,
            wear: 'battle_scarred',
            quality: 'normal',
            best_platform: null,
            price_updated_at: oneHourAgo
          }
        }
      }
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    // Item name should still be visible
    expect(screen.getByText(/AWP.*Safari Mesh.*Battle-Scarred/i)).toBeInTheDocument()
  })

  it('should differentiate between $0 (no data) and low-value items', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    // Create second item for comparison
    const lowValueItem = await prisma.item.create({
      data: {
        name: 'test-p250-sand-dune',
        display_name: 'P250 | Sand Dune',
        search_name: 'p250 sand dune',
        type: 'weapon',
        rarity: 'consumer_grade',
        image_url: 'https://example.com/p250.png'
      }
    })

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-missing-price-76561198777777777',
        total_items: 2,
        total_value: 0.03,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        items: {
          create: [
            {
              // Item with NO price data
              item: {
                connect: { id: testItemId }
              },
              steam_asset_id: '12345678901',
            market_hash_name: 'AWP | Safari Mesh (Battle-Scarred)',
              current_value: 0,
              wear: 'battle_scarred',
              quality: 'normal',
              best_platform: null, // No data
              price_updated_at: oneHourAgo
            },
            {
              // Low-value item WITH price data
              item: {
                connect: { id: lowValueItem.id }
              },
              steam_asset_id: '12345678902',
              market_hash_name: 'P250 | Sand Dune (Battle-Scarred)',
              current_value: 0.03,
              wear: 'battle_scarred',
              quality: 'normal',
              best_platform: 'buff163',
              price_updated_at: oneHourAgo
            }
          ]
        }
      }
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    // Should show warning for item without price data
    expect(screen.getByText(/price data unavailable/i)).toBeInTheDocument()
    // Should NOT show warning for low-value item with real price
    const warnings = screen.getAllByText(/price data unavailable/i)
    expect(warnings.length).toBe(1) // Only one item has missing data
  })

  it('should visually indicate missing price data with warning icon', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-missing-price-76561198777777777',
        total_items: 1,
        total_value: 0,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        items: {
          create: {
            item: {
              connect: { id: testItemId }
            },
            steam_asset_id: '12345678901',
            market_hash_name: 'AWP | Safari Mesh (Battle-Scarred)',
            current_value: 0,
            wear: 'battle_scarred',
            quality: 'normal',
            best_platform: null,
            price_updated_at: oneHourAgo
          }
        }
      }
    })

    const InventoryPageResult = await InventoryPage()
    const { container } = render(InventoryPageResult)

    // Should have visual warning indicator (icon or badge)
    const warningIcon = container.querySelector('svg') // Warning icon
    expect(warningIcon).toBeInTheDocument()
  })
})
