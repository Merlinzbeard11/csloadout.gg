/**
 * TDD Tests for Refresh Button Functionality (Failing Tests - RED Phase)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Manual refresh when cache is stale (lines 298-307)
 *
 * Requirements:
 * - Show "Refresh Now" button when inventory is stale (>6 hours old)
 * - Button triggers inventory refresh from Steam
 * - Show loading state during refresh
 * - Update "Last synced" to "Just now" after refresh
 * - Display success/error feedback
 * - Button disabled during refresh to prevent duplicate requests
 *
 * @jest-environment jsdom
 */

import React from 'react'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import RefreshButton from '@/components/RefreshButton'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
    push: jest.fn()
  })
}))

// Mock refresh action
const mockRefreshInventoryData = jest.fn()
jest.mock('@/actions/inventory', () => ({
  refreshInventoryData: () => mockRefreshInventoryData()
}))

describe('Refresh Button Functionality (TDD - RED Phase)', () => {
  beforeEach(() => {
    mockRefreshInventoryData.mockClear()
    jest.clearAllTimers()
  })

  it('should render refresh button when inventory is stale', () => {
    render(<RefreshButton isStale={true} />)

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    expect(refreshButton).toBeInTheDocument()
  })

  it('should not render refresh button when inventory is fresh', () => {
    render(<RefreshButton isStale={false} />)

    const refreshButton = screen.queryByRole('button', { name: /refresh/i })
    expect(refreshButton).not.toBeInTheDocument()
  })

  it('should trigger server action when clicked', async () => {
    mockRefreshInventoryData.mockResolvedValue({
      success: true,
      message: 'Inventory refreshed successfully'
    })

    render(<RefreshButton isStale={true} />)

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)

    await waitFor(() => {
      expect(mockRefreshInventoryData).toHaveBeenCalledTimes(1)
    })
  })

  it('should show loading state during refresh', async () => {
    let resolveRefresh: (value: any) => void
    const refreshPromise = new Promise((resolve) => {
      resolveRefresh = resolve
    })
    mockRefreshInventoryData.mockReturnValue(refreshPromise)

    render(<RefreshButton isStale={true} />)

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)

    // Should show loading indicator
    await waitFor(() => {
      expect(screen.getByText(/refreshing/i)).toBeInTheDocument()
    })

    // Resolve promise
    await act(async () => {
      resolveRefresh!({
        success: true,
        message: 'Inventory refreshed successfully'
      })
    })
  })

  it('should display success message after refresh', async () => {
    mockRefreshInventoryData.mockResolvedValue({
      success: true,
      message: 'Inventory refreshed successfully'
    })

    render(<RefreshButton isStale={true} />)

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)

    await waitFor(() => {
      expect(screen.getByText(/inventory refreshed successfully/i)).toBeInTheDocument()
    })
  })

  it('should display error message when refresh fails', async () => {
    mockRefreshInventoryData.mockResolvedValue({
      success: false,
      message: 'Failed to refresh inventory. Please try again.'
    })

    render(<RefreshButton isStale={true} />)

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)

    await waitFor(() => {
      expect(screen.getByText(/failed to refresh inventory/i)).toBeInTheDocument()
    })
  })

  it('should disable button during refresh', async () => {
    let resolveRefresh: (value: any) => void
    const refreshPromise = new Promise((resolve) => {
      resolveRefresh = resolve
    })
    mockRefreshInventoryData.mockReturnValue(refreshPromise)

    render(<RefreshButton isStale={true} />)

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)

    // Button should be disabled
    expect(refreshButton).toBeDisabled()

    // Resolve promise
    await act(async () => {
      resolveRefresh!({
        success: true,
        message: 'Inventory refreshed successfully'
      })
    })

    // Button should be enabled again
    await waitFor(() => {
      expect(refreshButton).not.toBeDisabled()
    })
  })

  it('should prevent multiple simultaneous refresh requests', async () => {
    let resolveRefresh: (value: any) => void
    const refreshPromise = new Promise((resolve) => {
      resolveRefresh = resolve
    })
    mockRefreshInventoryData.mockReturnValue(refreshPromise)

    render(<RefreshButton isStale={true} />)

    const refreshButton = screen.getByRole('button', { name: /refresh/i })

    // Click multiple times
    fireEvent.click(refreshButton)
    fireEvent.click(refreshButton)
    fireEvent.click(refreshButton)

    // Should only call action once
    expect(mockRefreshInventoryData).toHaveBeenCalledTimes(1)

    // Resolve promise
    await act(async () => {
      resolveRefresh!({
        success: true,
        message: 'Inventory refreshed successfully'
      })
    })
  })

  it('should hide feedback message after 3 seconds', async () => {
    jest.useFakeTimers()

    mockRefreshInventoryData.mockResolvedValue({
      success: true,
      message: 'Inventory refreshed successfully'
    })

    render(<RefreshButton isStale={true} />)

    const refreshButton = screen.getByRole('button', { name: /refresh/i })

    await act(async () => {
      fireEvent.click(refreshButton)
    })

    // Success message should be visible
    await waitFor(() => {
      expect(screen.getByText(/inventory refreshed successfully/i)).toBeInTheDocument()
    })

    // Advance timers by 3 seconds
    await act(async () => {
      jest.advanceTimersByTime(3000)
    })

    // Feedback should be hidden
    await waitFor(() => {
      expect(screen.queryByText(/inventory refreshed successfully/i)).not.toBeInTheDocument()
    })

    jest.useRealTimers()
  })

  it('should handle refresh action throwing error', async () => {
    mockRefreshInventoryData.mockRejectedValue(new Error('Network error'))

    render(<RefreshButton isStale={true} />)

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)

    await waitFor(() => {
      expect(screen.getByText(/failed to refresh/i)).toBeInTheDocument()
    })
  })

  it('should trigger router refresh after successful refresh', async () => {
    const mockRouterRefresh = jest.fn()
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
      refresh: mockRouterRefresh,
      push: jest.fn()
    })

    mockRefreshInventoryData.mockResolvedValue({
      success: true,
      message: 'Inventory refreshed successfully'
    })

    render(<RefreshButton isStale={true} />)

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)

    await waitFor(() => {
      expect(mockRouterRefresh).toHaveBeenCalledTimes(1)
    })
  })
})
