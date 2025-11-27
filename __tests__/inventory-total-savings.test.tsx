/**
 * TDD Tests for Total Savings Calculation (Failing Tests - RED Phase)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Show total potential savings across entire inventory (lines 45-55)
 *
 * Requirements:
 * - Calculate total savings: SUM(best_platform_price - steam_price) for all items
 * - Calculate savings percentage: (total_savings / steam_total) * 100
 * - Display prominently in summary stats with green indicator
 * - Show: Total Items, Total Value, Potential Savings, vs Steam Market %
 *
 * Test Data from BDD:
 * - 247 items total
 * - Best platforms total: $2,458.67
 * - Steam Market total: $2,134.50
 * - Expected savings: $324.17
 * - Expected percentage: +15.2%
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

// Mock auth session - will be updated with actual user ID in beforeEach
const mockGetSession = jest.fn()
jest.mock('@/lib/auth/session', () => ({
  getSession: () => mockGetSession()
}))

describe('Total Savings Calculation (TDD - RED Phase)', () => {
  const uniqueId = () => `${Date.now()}-${Math.random().toString(36).substring(7)}`
  let testUserId: string
  let testItemIds: string[] = []

  beforeEach(async () => {
    // Start transaction for test isolation
    await global.prismaTestHelper.startTransaction()
    jest.clearAllMocks()

    // Reset test data
    testItemIds = []

    // Create test user
    const user = await prisma.user.create({
      data: {
        steam_id: `test-steam-${uniqueId()}`,
        persona_name: 'Test User',
        profile_url: 'https://steamcommunity.com/id/test',
        avatar: 'https://example.com/avatar.jpg'
      }
    })
    testUserId = user.id

    // Update mock to return correct user ID
    mockGetSession.mockResolvedValue({
      user: {
        id: testUserId,
        steamId: user.steam_id
      }
    })

    // Create 3 test items with different prices to calculate savings
    // Item 1: AK-47 | Redline - Best: $10.00, Steam: $8.00, Savings: $2.00
    const item1 = await prisma.item.create({
      data: {
        name: `test-ak47-redline-${uniqueId()}`,
        display_name: 'AK-47 | Redline (Field-Tested)',
        search_name: 'ak47 redline field tested',
        type: 'skin',
        weapon_type: 'rifle',
        image_url: 'https://example.com/ak47.png',
        rarity: 'classified'
      }
    })
    testItemIds.push(item1.id)

    // Item 2: AWP | Asiimov - Best: $50.00, Steam: $45.00, Savings: $5.00
    const item2 = await prisma.item.create({
      data: {
        name: `test-awp-asiimov-${uniqueId()}`,
        display_name: 'AWP | Asiimov (Field-Tested)',
        search_name: 'awp asiimov field tested',
        type: 'skin',
        weapon_type: 'sniper_rifle',
        image_url: 'https://example.com/awp.png',
        rarity: 'covert'
      }
    })
    testItemIds.push(item2.id)

    // Item 3: M4A4 | Howl - Best: $2000.00, Steam: $1900.00, Savings: $100.00
    const item3 = await prisma.item.create({
      data: {
        name: `test-m4a4-howl-${uniqueId()}`,
        display_name: 'M4A4 | Howl (Factory New)',
        search_name: 'm4a4 howl factory new',
        type: 'skin',
        weapon_type: 'rifle',
        image_url: 'https://example.com/m4a4.png',
        rarity: 'contraband'
      }
    })
    testItemIds.push(item3.id)

    // Create marketplace prices for all items
    await prisma.marketplacePrice.createMany({
      data: [
        // Item 1 prices
        { item_id: testItemIds[0], platform: 'csfloat', price: 10.00, total_cost: 10.00 },
        { item_id: testItemIds[0], platform: 'steam', price: 8.00, total_cost: 8.00 },

        // Item 2 prices
        { item_id: testItemIds[1], platform: 'buff163', price: 50.00, total_cost: 50.00 },
        { item_id: testItemIds[1], platform: 'steam', price: 45.00, total_cost: 45.00 },

        // Item 3 prices
        { item_id: testItemIds[2], platform: 'skinport', price: 2000.00, total_cost: 2000.00 },
        { item_id: testItemIds[2], platform: 'steam', price: 1900.00, total_cost: 1900.00 },
      ]
    })

    // Create user inventory
    // Total best platform value: $10 + $50 + $2000 = $2060.00
    // Total Steam value: $8 + $45 + $1900 = $1953.00
    // Expected savings: $107.00
    // Expected percentage: ($107 / $1953) * 100 = 5.48%
    const userInventory = await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: user.steam_id,
        total_items: 3,
        total_value: 2060.00, // Sum of best platform prices
        sync_status: 'success',
        is_public: true,
        consent_given: true,
        last_synced: new Date()
      }
    })

    // Create inventory items
    await prisma.inventoryItem.createMany({
      data: [
        {
          inventory_id: userInventory.id,
          item_id: testItemIds[0],
          steam_asset_id: `asset-${uniqueId()}`,
          market_hash_name: 'AK-47 | Redline (Field-Tested)'
        },
        {
          inventory_id: userInventory.id,
          item_id: testItemIds[1],
          steam_asset_id: `asset-${uniqueId()}`,
          market_hash_name: 'AWP | Asiimov (Field-Tested)'
        },
        {
          inventory_id: userInventory.id,
          item_id: testItemIds[2],
          steam_asset_id: `asset-${uniqueId()}`,
          market_hash_name: 'M4A4 | Howl (Factory New)'
        }
      ]
    })
  })

  afterEach(() => {
    // Rollback transaction - automatic cleanup, no manual deletion needed
    global.prismaTestHelper.rollbackTransaction()
  })

  it('should display total items stat card', async () => {
    render(<InventoryPage />)

    expect(screen.getByText('Total Items')).toBeInTheDocument()
    expect(screen.getByText('3 items')).toBeInTheDocument()
  })

  it('should display total value stat card with best platform prices', async () => {
    render(<InventoryPage />)

    expect(screen.getByText('Total Value')).toBeInTheDocument()
    expect(screen.getByText('$2,060.00')).toBeInTheDocument()
  })

  it('should calculate and display potential savings', async () => {
    render(<InventoryPage />)

    // Should show "Potential Savings" label
    expect(screen.getByText('Potential Savings')).toBeInTheDocument()

    // Should show calculated savings: $2060.00 - $1953.00 = $107.00
    expect(screen.getByText('$107.00')).toBeInTheDocument()
  })

  it('should display savings percentage vs Steam Market', async () => {
    render(<InventoryPage />)

    // Should show "vs Steam Market" label
    expect(screen.getByText('vs Steam Market')).toBeInTheDocument()

    // Should show percentage: ($107 / $1953) * 100 = 5.48%
    // Allow for rounding: 5.4%, 5.5%, or +5.5%
    const percentageRegex = /\+?5\.[45]%/
    expect(screen.getByText(percentageRegex)).toBeInTheDocument()
  })

  it('should display savings with green indicator for positive savings', async () => {
    render(<InventoryPage />)

    const savingsElement = screen.getByText('$107.00')

    // Should have green color class
    const classes = savingsElement.className
    expect(classes).toMatch(/green/i)
  })

  it('should display all four stat cards in summary section', async () => {
    render(<InventoryPage />)

    // All four metrics should be visible
    expect(screen.getByText('Total Items')).toBeInTheDocument()
    expect(screen.getByText('Total Value')).toBeInTheDocument()
    expect(screen.getByText('Potential Savings')).toBeInTheDocument()
    expect(screen.getByText('vs Steam Market')).toBeInTheDocument()
  })

  it('should handle zero savings when Steam is best price', async () => {
    // Update all non-Steam prices to be worse than Steam
    await prisma.marketplacePrice.updateMany({
      where: {
        platform: { not: 'steam' }
      },
      data: { price: 1.00, total_cost: 1.00 }
    })

    // Update total value to match Steam (no savings)
    await prisma.userInventory.updateMany({
      where: { user_id: testUserId },
      data: { total_value: 1953.00 } // Same as Steam total
    })

    render(<InventoryPage />)

    // Should show $0.00 savings
    expect(screen.getByText('Potential Savings')).toBeInTheDocument()
    expect(screen.getByText('$0.00')).toBeInTheDocument()

    // Should show 0.0% or +0.0%
    expect(screen.getByText(/\+0\.0%/)).toBeInTheDocument()
  })
})
