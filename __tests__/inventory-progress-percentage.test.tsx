/**
 * TDD Tests for Import Progress Percentage Display (Failing Tests - RED Phase)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Import large inventory with pagination (lines 61-71)
 *   Specifically line 65: "I should see progress 'Fetching... 2000/4523 items (44%)'"
 *
 * Requirements:
 * - Display current item count during import
 * - Display total item count
 * - Calculate and show percentage progress
 * - Update progress in real-time as items are fetched
 * - Format: "Fetching... {current}/{total} items ({percentage}%)"
 *
 * @jest-environment jsdom
 */

import React from 'react'
import { describe, it, expect } from '@jest/globals'
import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ImportButton from '@/components/ImportButton'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
    push: jest.fn()
  })
}))

// Mock import action with progress support
const mockStartImport = jest.fn()
jest.mock('@/actions/inventory', () => ({
  startInventoryImport: () => mockStartImport(),
  retryInventoryImport: jest.fn()
}))

describe('Import Progress Percentage Display (TDD - RED Phase)', () => {
  beforeEach(() => {
    mockStartImport.mockClear()
  })

  it('should display progress with current and total item counts', async () => {
    // Mock import returning progress data
    mockStartImport.mockResolvedValue({
      success: true,
      status: 'importing',
      message: 'Fetching inventory from Steam...',
      progress: {
        current: 150,
        total: 247
      }
    })

    render(<ImportButton />)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })
    fireEvent.click(importButton)

    // Should display progress in format: "Fetching... 150/247 items"
    await waitFor(() => {
      expect(screen.getByText(/fetching.*150\/247 items/i)).toBeInTheDocument()
    })
  })

  it('should calculate and display percentage progress', async () => {
    mockStartImport.mockResolvedValue({
      success: true,
      status: 'importing',
      message: 'Fetching inventory from Steam...',
      progress: {
        current: 150,
        total: 247
      }
    })

    render(<ImportButton />)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })
    fireEvent.click(importButton)

    // 150/247 ≈ 60.7% → should round to 61%
    await waitFor(() => {
      expect(screen.getByText(/61%/)).toBeInTheDocument()
    })
  })

  it('should display progress for large inventory', async () => {
    mockStartImport.mockResolvedValue({
      success: true,
      status: 'importing',
      message: 'Fetching inventory from Steam...',
      progress: {
        current: 2000,
        total: 4523
      }
    })

    render(<ImportButton />)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })
    fireEvent.click(importButton)

    // Should match BDD scenario: "Fetching... 2000/4523 items (44%)"
    await waitFor(() => {
      expect(screen.getByText(/fetching.*2,000\/4,523 items/i)).toBeInTheDocument()
      expect(screen.getByText(/44%/)).toBeInTheDocument()
    })
  })

  it('should show 0% when import just started', async () => {
    mockStartImport.mockResolvedValue({
      success: true,
      status: 'importing',
      message: 'Fetching inventory from Steam...',
      progress: {
        current: 0,
        total: 247
      }
    })

    render(<ImportButton />)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })
    fireEvent.click(importButton)

    await waitFor(() => {
      expect(screen.getByText(/0%/)).toBeInTheDocument()
    })
  })

  it('should show 100% when all items fetched', async () => {
    mockStartImport.mockResolvedValue({
      success: true,
      status: 'importing',
      message: 'Fetching inventory from Steam...',
      progress: {
        current: 247,
        total: 247
      }
    })

    render(<ImportButton />)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })
    fireEvent.click(importButton)

    await waitFor(() => {
      expect(screen.getByText(/100%/)).toBeInTheDocument()
    })
  })

  it('should display progress bar visual indicator', async () => {
    mockStartImport.mockResolvedValue({
      success: true,
      status: 'importing',
      message: 'Fetching inventory from Steam...',
      progress: {
        current: 150,
        total: 247
      }
    })

    const { container } = render(<ImportButton />)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })
    fireEvent.click(importButton)

    // Should have a progress bar element
    await waitFor(() => {
      const progressBar = container.querySelector('[role="progressbar"]')
      expect(progressBar).toBeInTheDocument()
    })
  })

  it('should set progress bar width based on percentage', async () => {
    mockStartImport.mockResolvedValue({
      success: true,
      status: 'importing',
      message: 'Fetching inventory from Steam...',
      progress: {
        current: 150,
        total: 247
      }
    })

    const { container } = render(<ImportButton />)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })
    fireEvent.click(importButton)

    // Progress bar should have width style set to ~61%
    await waitFor(() => {
      const progressBar = container.querySelector('[role="progressbar"]')
      const width = progressBar?.getAttribute('aria-valuenow')
      expect(parseInt(width || '0')).toBeGreaterThanOrEqual(60)
      expect(parseInt(width || '0')).toBeLessThanOrEqual(62)
    })
  })

  it('should handle progress updates without total count', async () => {
    mockStartImport.mockResolvedValue({
      success: true,
      status: 'importing',
      message: 'Fetching inventory from Steam...',
      progress: {
        current: 150,
        total: null // Unknown total
      }
    })

    render(<ImportButton />)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })
    fireEvent.click(importButton)

    // Should show current count without percentage
    await waitFor(() => {
      expect(screen.getByText(/fetching.*150 items/i)).toBeInTheDocument()
    })
  })

  it('should not show progress info when import complete', () => {
    mockStartImport.mockResolvedValue({
      success: true,
      status: 'complete',
      message: 'Import Complete',
      itemsImported: 247
    })

    const { container } = render(<ImportButton />)

    // Should not show progress bar for completed import
    const progressBar = container.querySelector('[role="progressbar"]')
    expect(progressBar).not.toBeInTheDocument()
  })

  it('should format large numbers with commas', async () => {
    mockStartImport.mockResolvedValue({
      success: true,
      status: 'importing',
      message: 'Fetching inventory from Steam...',
      progress: {
        current: 2000,
        total: 4523
      }
    })

    render(<ImportButton />)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })
    fireEvent.click(importButton)

    // Should display with comma formatting: "2,000/4,523"
    await waitFor(() => {
      expect(screen.getByText(/2,000.*4,523/)).toBeInTheDocument()
    })
  })
})
