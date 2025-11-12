/**
 * TDD Tests for Manual Refresh Button (Iteration 25)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Manual refresh when cache is stale (lines 298-307)
 *
 * Requirements:
 * - Show "Last synced: 7 hours ago" when cache is stale (>6 hours)
 * - Display "🔄 Refresh Now" button when cache is stale
 * - Button should trigger inventory re-import from Steam
 * - After refresh, "Last synced" should show "Just now"
 * - Cache TTL is 6 hours (configurable)
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

describe('Manual Refresh Button (TDD - Iteration 25)', () => {
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
        steam_id: 'test-steam-refresh-76561199000000000',
        persona_name: 'Refresh Test User',
        profile_url: 'https://steamcommunity.com/id/refreshtest',
        avatar: 'https://example.com/avatar.jpg'
      }
    })
    testUserId = user.id

    // Create test item
    const item = await prisma.item.create({
      data: {
        name: 'test-ak47-redline',
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
        steamId: 'test-steam-refresh-76561199000000000'
      }
    })
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.inventoryItem.deleteMany({})
    await prisma.marketplacePrice.deleteMany({})
    await prisma.item.deleteMany({ where: { name: { startsWith: 'test-' } } })
    await prisma.userInventory.deleteMany({})
    await prisma.user.deleteMany({ where: { steam_id: { startsWith: 'test-' } } })
  })

  it('should display "Last synced: 7 hours ago" when cache is stale', async () => {
    const sevenHoursAgo = new Date(Date.now() - 7 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-refresh-76561199000000000',
        total_items: 1,
        total_value: 50.00,
        sync_status: 'success',
        is_public: true,
        last_synced: sevenHoursAgo,
        consent_given: true,
        items: {
          create: {
            item: {
              connect: { id: testItemId }
            },
            steam_asset_id: '12345678901',
            market_hash_name: 'AK-47 | Redline (Field-Tested)',
            current_value: 50.00,
            wear: 'field_tested',
            quality: 'normal',
            best_platform: 'buff163'
          }
        }
      }
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    expect(screen.getByText(/Last synced:.*7 hours ago/i)).toBeInTheDocument()
  })

  it('should display "Refresh" button when cache is stale (>6 hours)', async () => {
    const sevenHoursAgo = new Date(Date.now() - 7 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-refresh-76561199000000000',
        total_items: 1,
        total_value: 50.00,
        sync_status: 'success',
        is_public: true,
        last_synced: sevenHoursAgo,
        consent_given: true,
        items: {
          create: {
            item: {
              connect: { id: testItemId }
            },
            steam_asset_id: '12345678901',
            market_hash_name: 'AK-47 | Redline (Field-Tested)',
            current_value: 50.00,
            wear: 'field_tested',
            quality: 'normal',
            best_platform: 'buff163'
          }
        }
      }
    })

    const InventoryPageResult = await InventoryPage()
    const { container } = render(InventoryPageResult)

    // Search for button element specifically (not toast notification text)
    const buttons = container.querySelectorAll('button')
    const refreshButton = Array.from(buttons).find(btn =>
      btn.textContent?.trim() === 'Refresh' || btn.textContent?.includes('Refreshing...')
    )
    expect(refreshButton).toBeTruthy()
  })

  it('should NOT display refresh button when cache is fresh (<6 hours)', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-refresh-76561199000000000',
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
            steam_asset_id: '12345678901',
            market_hash_name: 'AK-47 | Redline (Field-Tested)',
            current_value: 50.00,
            wear: 'field_tested',
            quality: 'normal',
            best_platform: 'buff163'
          }
        }
      }
    })

    const InventoryPageResult = await InventoryPage()
    const { container } = render(InventoryPageResult)

    // Should NOT show refresh button (check for button element, not just text)
    const buttons = container.querySelectorAll('button')
    const refreshButton = Array.from(buttons).find(btn => btn.textContent?.includes('Refresh'))
    expect(refreshButton).toBeUndefined()
  })

  it('should display refresh button at exactly 6 hours (boundary test)', async () => {
    const exactlySixHours = new Date(Date.now() - 6 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-refresh-76561199000000000',
        total_items: 1,
        total_value: 50.00,
        sync_status: 'success',
        is_public: true,
        last_synced: exactlySixHours,
        consent_given: true,
        items: {
          create: {
            item: {
              connect: { id: testItemId }
            },
            steam_asset_id: '12345678901',
            market_hash_name: 'AK-47 | Redline (Field-Tested)',
            current_value: 50.00,
            wear: 'field_tested',
            quality: 'normal',
            best_platform: 'buff163'
          }
        }
      }
    })

    const InventoryPageResult = await InventoryPage()
    const { container } = render(InventoryPageResult)

    // At exactly 6 hours, cache is stale (>= 6 hours) - look for button element
    const buttons = container.querySelectorAll('button')
    const refreshButton = Array.from(buttons).find(btn =>
      btn.textContent?.trim() === 'Refresh' || btn.textContent?.includes('Refreshing...')
    )
    expect(refreshButton).toBeTruthy()
  })

  it('should have a visually distinct refresh button with icon', async () => {
    const sevenHoursAgo = new Date(Date.now() - 7 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-refresh-76561199000000000',
        total_items: 1,
        total_value: 50.00,
        sync_status: 'success',
        is_public: true,
        last_synced: sevenHoursAgo,
        consent_given: true,
        items: {
          create: {
            item: {
              connect: { id: testItemId }
            },
            steam_asset_id: '12345678901',
            market_hash_name: 'AK-47 | Redline (Field-Tested)',
            current_value: 50.00,
            wear: 'field_tested',
            quality: 'normal',
            best_platform: 'buff163'
          }
        }
      }
    })

    const InventoryPageResult = await InventoryPage()
    const { container } = render(InventoryPageResult)

    // Should have a button element with SVG icon
    const buttons = container.querySelectorAll('button')
    const refreshButton = Array.from(buttons).find(btn => btn.textContent?.includes('Refresh'))
    expect(refreshButton).toBeTruthy()

    // Should contain SVG icon
    const svg = refreshButton?.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('should display refresh button prominently near "Last synced" text', async () => {
    const sevenHoursAgo = new Date(Date.now() - 7 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-refresh-76561199000000000',
        total_items: 1,
        total_value: 50.00,
        sync_status: 'success',
        is_public: true,
        last_synced: sevenHoursAgo,
        consent_given: true,
        items: {
          create: {
            item: {
              connect: { id: testItemId }
            },
            steam_asset_id: '12345678901',
            market_hash_name: 'AK-47 | Redline (Field-Tested)',
            current_value: 50.00,
            wear: 'field_tested',
            quality: 'normal',
            best_platform: 'buff163'
          }
        }
      }
    })

    const InventoryPageResult = await InventoryPage()
    const { container } = render(InventoryPageResult)

    // Both "Last synced" and "Refresh" button should be visible
    expect(screen.getByText(/Last synced/i)).toBeInTheDocument()

    // Look for button element specifically
    const buttons = container.querySelectorAll('button')
    const refreshButton = Array.from(buttons).find(btn =>
      btn.textContent?.trim() === 'Refresh' || btn.textContent?.includes('Refreshing...')
    )
    expect(refreshButton).toBeTruthy()
  })
})
