/**
 * TDD Tests for Unmatched Items Handling (Iteration 20)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Handle items not found in database (lines 223-232)
 *
 * Requirements:
 * - Track items from Steam that aren't in csloadout.gg database
 * - Display "247 items imported successfully"
 * - Display "⚠️ 3 items had issues"
 * - Show warning section with unmatched item details
 * - Track two types of issues:
 *   1. Items not in database (e.g., "Souvenir MP7 Sand Dune")
 *   2. Non-skin items excluded (e.g., "Operation Riptide Coin")
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

describe('Unmatched Items Handling (TDD - Iteration 20)', () => {
  let testUserId: string

  beforeEach(async () => {
    // Clean up test data
    await prisma.inventoryItem.deleteMany({})
    await prisma.marketplacePrice.deleteMany({})
    await prisma.userInventory.deleteMany({})
    await prisma.user.deleteMany({ where: { steam_id: { startsWith: 'test-' } } })

    // Create test user
    const user = await prisma.user.create({
      data: {
        steam_id: 'test-steam-unmatched-76561198888888888',
        persona_name: 'Unmatched Test User',
        profile_url: 'https://steamcommunity.com/id/unmatchedtest',
        avatar: 'https://example.com/avatar.jpg'
      }
    })
    testUserId = user.id

    // Update mock to return correct user ID
    mockGetSession.mockResolvedValue({
      user: {
        id: testUserId,
        steamId: 'test-steam-unmatched-76561198888888888'
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

  it('should display "247 items imported successfully" when 247 matched out of 250', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-unmatched-76561198888888888',
        total_items: 247,
        total_value: 5000.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        items_unmatched_count: 3
      }
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    expect(screen.getByText(/247 items imported successfully/i)).toBeInTheDocument()
  })

  it('should display "⚠️ 3 items had issues" when 3 items unmatched', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-unmatched-76561198888888888',
        total_items: 247,
        total_value: 5000.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        items_unmatched_count: 3
      }
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    expect(screen.getByText(/⚠️ 3 items had issues/i)).toBeInTheDocument()
  })

  it('should show warning section when items_unmatched_count > 0', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-unmatched-76561198888888888',
        total_items: 247,
        total_value: 5000.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        items_unmatched_count: 3
      }
    })

    const InventoryPageResult = await InventoryPage()
    const { container } = render(InventoryPageResult)

    // Should show yellow warning section
    const warningSection = container.querySelector('.bg-yellow-50')
    expect(warningSection).toBeInTheDocument()
  })

  it('should NOT show warning section when all items matched (items_unmatched_count = 0)', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-unmatched-76561198888888888',
        total_items: 250,
        total_value: 5500.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        items_unmatched_count: 0
      }
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    // Should NOT show warning
    expect(screen.queryByText(/items had issues/i)).not.toBeInTheDocument()
  })

  it('should NOT show warning section when items_unmatched_count is null', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-unmatched-76561198888888888',
        total_items: 250,
        total_value: 5500.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true
        // items_unmatched_count omitted (null)
      }
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    expect(screen.queryByText(/items had issues/i)).not.toBeInTheDocument()
  })

  it('should explain why items were not matched in warning section', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-unmatched-76561198888888888',
        total_items: 247,
        total_value: 5000.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        items_unmatched_count: 3
      }
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    // Should explain common reasons
    expect(screen.getByText(/not yet in our database/i)).toBeInTheDocument()
  })

  it('should mention non-skin items are excluded in warning text', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-unmatched-76561198888888888',
        total_items: 247,
        total_value: 5000.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        items_unmatched_count: 3
      }
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    // Should mention non-skin exclusion
    expect(screen.getByText(/operation coins|music kits|stickers/i)).toBeInTheDocument()
  })

  it('should use yellow/warning styling for unmatched items section', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-unmatched-76561198888888888',
        total_items: 247,
        total_value: 5000.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true,
        items_unmatched_count: 3
      }
    })

    const InventoryPageResult = await InventoryPage()
    const { container } = render(InventoryPageResult)

    const warningSection = container.querySelector('.bg-yellow-50')
    expect(warningSection).toBeInTheDocument()
    expect(warningSection).toHaveClass('border-yellow-200')
  })
})
