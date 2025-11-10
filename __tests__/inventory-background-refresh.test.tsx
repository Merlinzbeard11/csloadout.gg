/**
 * TDD Tests for Background Refresh Trigger (Failing Tests - RED Phase)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Background refresh for stale data (lines 309-317)
 *
 * Requirements:
 * - Automatically trigger refresh when viewing stale inventory
 * - Show "Refreshing in background..." notification
 * - Update UI when refresh completes
 * - Show "Updated: Just now" after completion
 * - No refresh triggered when inventory is fresh
 *
 * @jest-environment jsdom
 */

import React from 'react'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import '@testing-library/jest-dom'
import { render, screen, waitFor, act } from '@testing-library/react'
import BackgroundRefreshTrigger from '@/components/BackgroundRefreshTrigger'

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

describe('Background Refresh Trigger (TDD - RED Phase)', () => {
  beforeEach(() => {
    mockRefreshInventoryData.mockClear()
    jest.clearAllTimers()
  })

  it('should trigger refresh when inventory is stale', async () => {
    mockRefreshInventoryData.mockResolvedValue({
      success: true,
      message: 'Inventory refreshed successfully'
    })

    render(<BackgroundRefreshTrigger isStale={true} />)

    await waitFor(() => {
      expect(mockRefreshInventoryData).toHaveBeenCalledTimes(1)
    })
  })

  it('should not trigger refresh when inventory is fresh', async () => {
    render(<BackgroundRefreshTrigger isStale={false} />)

    // Wait a bit to ensure no refresh is triggered
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    expect(mockRefreshInventoryData).not.toHaveBeenCalled()
  })

  it('should show "Refreshing in background..." notification', async () => {
    let resolveRefresh: (value: any) => void
    const refreshPromise = new Promise((resolve) => {
      resolveRefresh = resolve
    })
    mockRefreshInventoryData.mockReturnValue(refreshPromise)

    render(<BackgroundRefreshTrigger isStale={true} />)

    // Should show notification while refreshing
    await waitFor(() => {
      expect(screen.getByText(/refreshing in background/i)).toBeInTheDocument()
    })

    // Resolve refresh
    await act(async () => {
      resolveRefresh!({
        success: true,
        message: 'Inventory refreshed successfully'
      })
    })
  })

  it('should show "Updated: Just now" after successful refresh', async () => {
    mockRefreshInventoryData.mockResolvedValue({
      success: true,
      message: 'Inventory refreshed successfully',
      lastSynced: new Date()
    })

    render(<BackgroundRefreshTrigger isStale={true} />)

    await waitFor(() => {
      expect(screen.getByText(/updated.*just now/i)).toBeInTheDocument()
    })
  })

  it('should hide notification after 5 seconds', async () => {
    jest.useFakeTimers()

    mockRefreshInventoryData.mockResolvedValue({
      success: true,
      message: 'Inventory refreshed successfully'
    })

    render(<BackgroundRefreshTrigger isStale={true} />)

    // Wait for notification to appear
    await waitFor(() => {
      expect(screen.getByText(/updated.*just now/i)).toBeInTheDocument()
    })

    // Advance timers by 5 seconds
    await act(async () => {
      jest.advanceTimersByTime(5000)
    })

    // Notification should be hidden
    await waitFor(() => {
      expect(screen.queryByText(/updated.*just now/i)).not.toBeInTheDocument()
    })

    jest.useRealTimers()
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

    render(<BackgroundRefreshTrigger isStale={true} />)

    await waitFor(() => {
      expect(mockRouterRefresh).toHaveBeenCalledTimes(1)
    })
  })

  it('should not show notification on error', async () => {
    mockRefreshInventoryData.mockResolvedValue({
      success: false,
      message: 'Failed to refresh inventory'
    })

    render(<BackgroundRefreshTrigger isStale={true} />)

    await waitFor(() => {
      expect(mockRefreshInventoryData).toHaveBeenCalled()
    })

    // Should not show success notification on error
    expect(screen.queryByText(/updated/i)).not.toBeInTheDocument()
  })

  it('should only trigger refresh once on mount', async () => {
    mockRefreshInventoryData.mockResolvedValue({
      success: true,
      message: 'Inventory refreshed successfully'
    })

    const { rerender } = render(<BackgroundRefreshTrigger isStale={true} />)

    await waitFor(() => {
      expect(mockRefreshInventoryData).toHaveBeenCalledTimes(1)
    })

    // Rerender with same props
    rerender(<BackgroundRefreshTrigger isStale={true} />)

    // Should still only be called once
    expect(mockRefreshInventoryData).toHaveBeenCalledTimes(1)
  })

  it('should cleanup on unmount', async () => {
    jest.useFakeTimers()

    mockRefreshInventoryData.mockResolvedValue({
      success: true,
      message: 'Inventory refreshed successfully'
    })

    const { unmount } = render(<BackgroundRefreshTrigger isStale={true} />)

    // Wait for notification
    await waitFor(() => {
      expect(screen.getByText(/updated/i)).toBeInTheDocument()
    })

    // Unmount before timer completes
    unmount()

    // Advance timers - should not cause errors
    await act(async () => {
      jest.advanceTimersByTime(5000)
    })

    // No assertion needed - test passes if no errors thrown

    jest.useRealTimers()
  })
})
