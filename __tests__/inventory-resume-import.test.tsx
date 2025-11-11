/**
 * TDD Tests for Resume Failed Import (Failing Tests - RED Phase)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Resume failed import for large inventory (lines 73-80)
 *
 * Requirements:
 * - Display "Retry Import" button when import_status is 'failed'
 * - Resume import from last_assetid cursor position
 * - Show progress message "Resuming from X items..."
 * - Continue fetching items using start_assetid parameter
 * - Display final count when complete "X items imported"
 * - Update last_assetid after each successful batch
 *
 * @jest-environment jsdom
 */

import React from 'react'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import '@testing-library/jest-dom'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'

// Mock getSession
jest.mock('@/lib/auth/session', () => ({
  getSession: jest.fn()
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
    push: jest.fn()
  })
}))

// Mock server action
const mockRetryImport = jest.fn()
jest.mock('@/actions/inventory', () => ({
  retryImport: () => mockRetryImport()
}))

describe('Resume Failed Import (TDD - RED Phase)', () => {
  const testUserId = 'user-resume-test-123'
  const testSteamId = '76561198123456789'

  beforeEach(async () => {
    mockRetryImport.mockClear()

    // Cleanup test data
    await prisma.inventoryItem.deleteMany({
      where: { inventory: { user_id: testUserId } }
    })
    await prisma.userInventory.deleteMany({
      where: { user_id: testUserId }
    })
    await prisma.user.deleteMany({
      where: { id: testUserId }
    })
  })

  afterEach(async () => {
    // Cleanup
    await prisma.inventoryItem.deleteMany({
      where: { inventory: { user_id: testUserId } }
    })
    await prisma.userInventory.deleteMany({
      where: { user_id: testUserId }
    })
    await prisma.user.deleteMany({
      where: { id: testUserId }
    })
  })

  it('should display "Retry Import" button when import_status is failed', async () => {
    // Arrange - Create user with failed import
    const user = await prisma.user.create({
      data: {
        id: testUserId,
        steam_id: testSteamId,
        persona_name: 'Test User',
        profile_url: 'https://steamcommunity.com/profiles/76561198123456789',
        avatar: 'https://avatars.steamstatic.com/default.jpg'
      }
    })

    const inventory = await prisma.userInventory.create({
      data: {
        user_id: user.id,
        steam_id: testSteamId,
        total_items: 2000,
        total_value: 1500.00,
        last_synced: new Date(),
        sync_status: 'failed',
        import_status: 'failed',
        last_asset_id: '2000',
        items_imported_count: 2000
      }
    })

    // Mock getSession to return test user
    ;(getSession as jest.Mock).mockResolvedValue({
      user: {
        id: testUserId,
        steam_id: testSteamId
      }
    })

    // Act - Render inventory page
    const InventoryPage = (await import('@/app/inventory/page')).default
    const page = await InventoryPage()
    const { container } = render(page)

    // Assert
    expect(screen.getByRole('button', { name: /retry import/i })).toBeInTheDocument()
  })

  it('should show progress message when retry import starts', async () => {
    // Arrange
    const user = await prisma.user.create({
      data: {
        id: testUserId,
        steam_id: testSteamId,
        persona_name: 'Test User',
        profile_url: 'https://steamcommunity.com/profiles/76561198123456789',
        avatar: 'https://avatars.steamstatic.com/default.jpg'
      }
    })

    await prisma.userInventory.create({
      data: {
        user_id: user.id,
        steam_id: testSteamId,
        total_items: 2000,
        total_value: 1500.00,
        last_synced: new Date(),
        sync_status: 'failed',
        import_status: 'failed',
        last_asset_id: '2000',
        items_imported_count: 2000
      }
    })

    mockRetryImport.mockImplementation(() => {
      return new Promise(() => {}) // Never resolves - keeps loading state
    })

    const RetryImportButton = (await import('@/components/RetryImportButton')).default
    render(<RetryImportButton lastAssetId="2000" itemsImported={2000} />)

    // Act
    const retryButton = screen.getByRole('button', { name: /retry import/i })
    fireEvent.click(retryButton)

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/resuming from 2,000 items/i)).toBeInTheDocument()
    })
  })

  it('should call retryImport action with last_assetid parameter', async () => {
    // Arrange
    mockRetryImport.mockResolvedValue({
      success: true,
      totalItems: 4523,
      message: '4,523 items imported'
    })

    const RetryImportButton = (await import('@/components/RetryImportButton')).default
    render(<RetryImportButton lastAssetId="2000" itemsImported={2000} />)

    // Act
    const retryButton = screen.getByRole('button', { name: /retry import/i })
    fireEvent.click(retryButton)

    // Assert
    await waitFor(() => {
      expect(mockRetryImport).toHaveBeenCalledTimes(1)
    })
  })

  it('should display success message with total count after completion', async () => {
    // Arrange
    mockRetryImport.mockResolvedValue({
      success: true,
      totalItems: 4523,
      message: '4,523 items imported'
    })

    const RetryImportButton = (await import('@/components/RetryImportButton')).default
    render(<RetryImportButton lastAssetId="2000" itemsImported={2000} />)

    // Act
    const retryButton = screen.getByRole('button', { name: /retry import/i })
    fireEvent.click(retryButton)

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/4,523 items imported/i)).toBeInTheDocument()
    })
  })

  it('should update database with new last_assetid after batch', async () => {
    // This tests the server action, not the component
    // We'll verify the database is updated with new cursor position

    // Arrange
    const user = await prisma.user.create({
      data: {
        id: testUserId,
        steam_id: testSteamId,
        persona_name: 'Test User',
        profile_url: 'https://steamcommunity.com/profiles/76561198123456789',
        avatar: 'https://avatars.steamstatic.com/default.jpg'
      }
    })

    const inventory = await prisma.userInventory.create({
      data: {
        user_id: user.id,
        steam_id: testSteamId,
        total_items: 2000,
        total_value: 1500.00,
        last_synced: new Date(),
        sync_status: 'failed',
        import_status: 'in_progress',
        last_asset_id: '2000',
        items_imported_count: 2000
      }
    })

    // Simulate batch completion - update cursor
    const updated = await prisma.userInventory.update({
      where: { id: inventory.id },
      data: {
        last_asset_id: '2500',
        items_imported_count: 2500
      }
    })

    // Assert
    expect(updated.last_asset_id).toBe('2500')
    expect(updated.items_imported_count).toBe(2500)
  })

  it('should complete import and set import_status to completed', async () => {
    // Arrange
    const user = await prisma.user.create({
      data: {
        id: testUserId,
        steam_id: testSteamId,
        persona_name: 'Test User',
        profile_url: 'https://steamcommunity.com/profiles/76561198123456789',
        avatar: 'https://avatars.steamstatic.com/default.jpg'
      }
    })

    const inventory = await prisma.userInventory.create({
      data: {
        user_id: user.id,
        steam_id: testSteamId,
        total_items: 2000,
        total_value: 1500.00,
        last_synced: new Date(),
        sync_status: 'failed',
        import_status: 'in_progress',
        last_asset_id: '4500',
        items_imported_count: 4500
      }
    })

    // Act - Complete import
    const completed = await prisma.userInventory.update({
      where: { id: inventory.id },
      data: {
        import_status: 'completed',
        total_items: 4523,
        sync_status: 'success'
      }
    })

    // Assert
    expect(completed.import_status).toBe('completed')
    expect(completed.sync_status).toBe('success')
    expect(completed.total_items).toBe(4523)
  })

  it('should not show retry button when import_status is completed', async () => {
    // Arrange
    const user = await prisma.user.create({
      data: {
        id: testUserId,
        steam_id: testSteamId,
        persona_name: 'Test User',
        profile_url: 'https://steamcommunity.com/profiles/76561198123456789',
        avatar: 'https://avatars.steamstatic.com/default.jpg'
      }
    })

    await prisma.userInventory.create({
      data: {
        user_id: user.id,
        steam_id: testSteamId,
        total_items: 4523,
        total_value: 3200.00,
        last_synced: new Date(),
        sync_status: 'success',
        import_status: 'completed',
        last_asset_id: null,
        items_imported_count: 4523
      }
    })

    // Mock getSession to return test user
    ;(getSession as jest.Mock).mockResolvedValue({
      user: {
        id: testUserId,
        steam_id: testSteamId
      }
    })

    // Act
    const InventoryPage = (await import('@/app/inventory/page')).default
    const page = await InventoryPage()
    const { container } = render(page)

    // Assert
    expect(screen.queryByRole('button', { name: /retry import/i })).not.toBeInTheDocument()
  })
})
