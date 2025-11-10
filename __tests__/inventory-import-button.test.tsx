/**
 * TDD Tests for Import Button and Progress Indicator (Failing Tests - RED Phase)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: First-time inventory import shows total value (lines 17-27)
 *
 * Requirements:
 * - Display "Import Steam Inventory" button in empty state
 * - Button triggers import process
 * - Show progress indicator during import
 * - Display "Fetching inventory from Steam..." message
 * - Show "Import Complete" when finished
 * - Display "247 items imported" count
 * - Refresh to show imported inventory
 *
 * @jest-environment jsdom
 */

import React from 'react'
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { prisma } from '@/lib/prisma'
import InventoryPage from '@/app/inventory/page'

// Mock next/navigation
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  useRouter: () => ({
    refresh: mockRefresh,
    push: jest.fn()
  })
}))

// Mock auth session
const mockGetSession = jest.fn()
jest.mock('@/lib/auth/session', () => ({
  getSession: () => mockGetSession()
}))

// Mock import action - will be updated per test
const mockStartImport = jest.fn()
jest.mock('@/actions/inventory', () => ({
  startInventoryImport: () => mockStartImport(),
  retryInventoryImport: jest.fn()
}))

describe('Import Button and Progress Indicator (TDD - RED Phase)', () => {
  let testUserId: string

  beforeEach(async () => {
    // Reset mocks
    mockRefresh.mockClear()
    mockStartImport.mockClear()

    // Clean up test data
    await prisma.inventoryItem.deleteMany({})
    await prisma.marketplacePrice.deleteMany({})
    await prisma.userInventory.deleteMany({})
    await prisma.user.deleteMany({ where: { steam_id: { startsWith: 'test-' } } })

    // Create test user
    const user = await prisma.user.create({
      data: {
        steam_id: 'test-steam-76561198123456789',
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
        steamId: 'test-steam-76561198123456789'
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

  it('should display "Import Steam Inventory" button in empty state', async () => {
    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })
    expect(importButton).toBeInTheDocument()
  })

  it('should show import button as clickable in empty state', async () => {
    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })
    expect(importButton).not.toBeDisabled()
  })

  it('should display progress message when import starts', async () => {
    // Mock import to return pending state
    mockStartImport.mockResolvedValue({
      success: true,
      status: 'importing',
      message: 'Fetching inventory from Steam...'
    })

    const InventoryPageResult = await InventoryPage()
    const { container } = render(InventoryPageResult)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })
    fireEvent.click(importButton)

    await waitFor(() => {
      expect(screen.getByText(/fetching inventory from steam/i)).toBeInTheDocument()
    })
  })

  it('should show progress indicator during import', async () => {
    mockStartImport.mockResolvedValue({
      success: true,
      status: 'importing',
      message: 'Fetching inventory from Steam...'
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })
    fireEvent.click(importButton)

    await waitFor(() => {
      // Should show loading spinner or progress indicator
      const progressElement = screen.getByRole('status') || screen.getByLabelText(/loading/i)
      expect(progressElement).toBeInTheDocument()
    })
  })

  it('should disable import button during import', async () => {
    mockStartImport.mockResolvedValue({
      success: true,
      status: 'importing',
      message: 'Fetching inventory from Steam...'
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })
    fireEvent.click(importButton)

    await waitFor(() => {
      expect(importButton).toBeDisabled()
    })
  })

  it('should display "Import Complete" message when finished', async () => {
    mockStartImport.mockResolvedValue({
      success: true,
      status: 'complete',
      message: 'Import Complete',
      itemsImported: 247
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })
    fireEvent.click(importButton)

    await waitFor(() => {
      expect(screen.getByText(/import complete/i)).toBeInTheDocument()
    })
  })

  it('should display item count after import', async () => {
    mockStartImport.mockResolvedValue({
      success: true,
      status: 'complete',
      message: 'Import Complete',
      itemsImported: 247
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })
    fireEvent.click(importButton)

    await waitFor(() => {
      expect(screen.getByText(/247 items imported/i)).toBeInTheDocument()
    })
  })

  it('should refresh page after successful import', async () => {
    mockStartImport.mockResolvedValue({
      success: true,
      status: 'complete',
      message: 'Import Complete',
      itemsImported: 247
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })
    fireEvent.click(importButton)

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('should display error message if import fails', async () => {
    mockStartImport.mockResolvedValue({
      success: false,
      status: 'error',
      message: 'Failed to fetch inventory. Please try again.'
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })
    fireEvent.click(importButton)

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch inventory/i)).toBeInTheDocument()
    })
  })

  it('should re-enable button after import completes', async () => {
    mockStartImport.mockResolvedValue({
      success: true,
      status: 'complete',
      message: 'Import Complete',
      itemsImported: 247
    })

    const InventoryPageResult = await InventoryPage()
    render(InventoryPageResult)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })
    fireEvent.click(importButton)

    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText(/import complete/i)).toBeInTheDocument()
    })

    // Button should be enabled again (or replaced with new inventory view)
    await waitFor(() => {
      expect(importButton).not.toBeDisabled()
    }, { timeout: 3000 })
  })
})
