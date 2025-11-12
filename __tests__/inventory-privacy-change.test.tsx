/**
 * TDD Tests for Privacy Change Detection (Iteration 19)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Detect inventory privacy change (lines 210-217)
 *
 * Requirements:
 * - When inventory changes from public to private:
 *   1. Update sync_status to "private"
 *   2. Show privacy warning banner
 *   3. Keep old cached inventory data visible
 *   4. Display "Last synced: X ago (inventory now private)"
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

describe('Privacy Change Detection (TDD - Iteration 19)', () => {
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
        steam_id: 'test-steam-privacy-change-76561198999999999',
        persona_name: 'Privacy Test User',
        profile_url: 'https://steamcommunity.com/id/privacytest',
        avatar: 'https://example.com/avatar.jpg'
      }
    })
    testUserId = user.id

    // Update mock to return correct user ID
    mockGetSession.mockResolvedValue({
      user: {
        id: testUserId,
        steamId: 'test-steam-privacy-change-76561198999999999'
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

  it('should update sync_status to "private" when inventory becomes private', async () => {
    // Create inventory that was previously public, now private
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)

    const inventory = await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-privacy-change-76561198999999999',
        total_items: 247,
        total_value: 1234.56,
        sync_status: 'private', // Now private
        is_public: false,
        last_synced: twoDaysAgo,
        consent_given: true
      }
    })

    expect(inventory.sync_status).toBe('private')
    expect(inventory.is_public).toBe(false)
  })

  it('should show privacy warning banner when inventory is private', async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-privacy-change-76561198999999999',
        total_items: 247,
        total_value: 1234.56,
        sync_status: 'private',
        is_public: false,
        last_synced: twoDaysAgo,
        consent_given: true
      }
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    // Should show privacy warning
    expect(screen.getByText(/inventory is now private/i)).toBeInTheDocument()
  })

  it('should keep old cached inventory data visible when private', async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)

    const inventory = await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-privacy-change-76561198999999999',
        total_items: 247,
        total_value: 1234.56,
        sync_status: 'private',
        is_public: false,
        last_synced: twoDaysAgo,
        consent_given: true
      }
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    // Should still show cached inventory stats
    expect(screen.getByText('247 items')).toBeInTheDocument()
    expect(screen.getByText(/\$1,234\.56/)).toBeInTheDocument()
  })

  it('should display "Last synced: X ago (inventory now private)" message', async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-privacy-change-76561198999999999',
        total_items: 247,
        total_value: 1234.56,
        sync_status: 'private',
        is_public: false,
        last_synced: twoDaysAgo,
        consent_given: true
      }
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    // Should show last synced timestamp
    expect(screen.getByText(/last synced.*2 days ago/i)).toBeInTheDocument()
    // Should show privacy indicator
    expect(screen.getByText(/inventory now private/i)).toBeInTheDocument()
  })

  it('should show warning banner with yellow/orange styling', async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-privacy-change-76561198999999999',
        total_items: 100,
        total_value: 500.00,
        sync_status: 'private',
        is_public: false,
        last_synced: twoDaysAgo,
        consent_given: true
      }
    })

    const InventoryPageResult = await InventoryPage()
    const { container } = render(InventoryPageResult)

    // Should have orange warning banner
    const warningBanner = container.querySelector('.bg-orange-50')
    expect(warningBanner).toBeInTheDocument()
    expect(warningBanner).toHaveClass('border-orange-200')
  })

  it('should NOT show privacy warning when inventory is public', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-privacy-change-76561198999999999',
        total_items: 150,
        total_value: 750.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true
      }
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    // Should NOT show privacy warning
    expect(screen.queryByText(/inventory is now private/i)).not.toBeInTheDocument()
  })

  it('should NOT add "(inventory now private)" to timestamp when public', async () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: 'test-steam-privacy-change-76561198999999999',
        total_items: 200,
        total_value: 1000.00,
        sync_status: 'success',
        is_public: true,
        last_synced: oneHourAgo,
        consent_given: true
      }
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    // Should show normal timestamp without privacy indicator
    expect(screen.getByText(/last synced.*1 hour ago/i)).toBeInTheDocument()
    expect(screen.queryByText(/inventory now private/i)).not.toBeInTheDocument()
  })
})
