/**
 * TDD Tests for Rate Limit Handling (Failing Tests - RED Phase)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Handle rate limit during import (lines 86-92)
 *
 * Requirements:
 * - Show "Rate limit reached. Please try again in 1 minute." when 429 received
 * - Import button disabled for 60 seconds
 * - Countdown timer showing remaining time
 * - Button re-enabled after countdown completes
 * - Retry-After header value used for countdown duration
 *
 * @jest-environment jsdom
 */

import React from 'react'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import ImportButton from '@/components/ImportButton'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
    push: jest.fn()
  })
}))

// Mock import action
const mockStartImport = jest.fn()
jest.mock('@/actions/inventory', () => ({
  startInventoryImport: () => mockStartImport(),
  retryInventoryImport: jest.fn()
}))

describe('Rate Limit Handling (TDD - RED Phase)', () => {
  beforeEach(() => {
    mockStartImport.mockClear()
    jest.clearAllTimers()
  })

  it('should display rate limit error message', async () => {
    mockStartImport.mockResolvedValue({
      success: false,
      status: 'error',
      message: 'Rate limit reached. Please try again in 1 minute.',
      retryAfter: 60
    })

    render(<ImportButton />)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })
    fireEvent.click(importButton)

    await waitFor(() => {
      expect(screen.getByText(/rate limit reached/i)).toBeInTheDocument()
    })
  })

  it('should disable import button during rate limit cooldown', async () => {
    mockStartImport.mockResolvedValue({
      success: false,
      status: 'error',
      message: 'Rate limit reached. Please try again in 1 minute.',
      retryAfter: 60
    })

    render(<ImportButton />)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })
    fireEvent.click(importButton)

    await waitFor(() => {
      expect(importButton).toBeDisabled()
    })
  })

  it('should show countdown timer starting at retry-after value', async () => {
    mockStartImport.mockResolvedValue({
      success: false,
      status: 'error',
      message: 'Rate limit reached. Please try again in 1 minute.',
      retryAfter: 60
    })

    render(<ImportButton />)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })
    fireEvent.click(importButton)

    await waitFor(() => {
      // 60 seconds is formatted as "1 minute"
      expect(screen.getByText(/retry in 1 minute/i)).toBeInTheDocument()
    })
  })

  it('should decrement countdown timer every second', async () => {
    jest.useFakeTimers()

    mockStartImport.mockResolvedValue({
      success: false,
      status: 'error',
      message: 'Rate limit reached. Please try again in 1 minute.',
      retryAfter: 60
    })

    render(<ImportButton />)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })

    await act(async () => {
      fireEvent.click(importButton)
    })

    // Initial: 60 seconds = "1 minute"
    await waitFor(() => {
      expect(screen.getByText(/retry in 1 minute/i)).toBeInTheDocument()
    })

    // After 1 second: 59 seconds
    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(screen.getByText(/retry in 59 seconds/i)).toBeInTheDocument()
    })

    // After another second: 58 seconds
    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(screen.getByText(/retry in 58 seconds/i)).toBeInTheDocument()
    })

    jest.useRealTimers()
  })

  it('should re-enable button after countdown completes', async () => {
    jest.useFakeTimers()

    mockStartImport.mockResolvedValue({
      success: false,
      status: 'error',
      message: 'Rate limit reached. Please try again in 1 minute.',
      retryAfter: 3 // Short countdown for testing
    })

    render(<ImportButton />)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })

    await act(async () => {
      fireEvent.click(importButton)
    })

    // Button should be disabled
    expect(importButton).toBeDisabled()

    // Advance past countdown (3 seconds)
    await act(async () => {
      jest.advanceTimersByTime(3000)
    })

    // Button should be re-enabled
    await waitFor(() => {
      expect(importButton).not.toBeDisabled()
    })

    jest.useRealTimers()
  })

  it('should hide error message after countdown completes', async () => {
    jest.useFakeTimers()

    mockStartImport.mockResolvedValue({
      success: false,
      status: 'error',
      message: 'Rate limit reached. Please try again in 1 minute.',
      retryAfter: 2
    })

    render(<ImportButton />)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })

    await act(async () => {
      fireEvent.click(importButton)
    })

    // Error should be visible
    expect(screen.getByText(/rate limit reached/i)).toBeInTheDocument()

    // Advance past countdown
    await act(async () => {
      jest.advanceTimersByTime(2000)
    })

    // Error should be hidden
    await waitFor(() => {
      expect(screen.queryByText(/rate limit reached/i)).not.toBeInTheDocument()
    })

    jest.useRealTimers()
  })

  it('should handle retry-after in seconds format', async () => {
    mockStartImport.mockResolvedValue({
      success: false,
      status: 'error',
      message: 'Rate limit reached. Please try again in 2 minutes.',
      retryAfter: 120 // 2 minutes in seconds
    })

    render(<ImportButton />)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })
    fireEvent.click(importButton)

    await waitFor(() => {
      // 120 seconds is formatted as "2 minutes"
      expect(screen.getByText(/retry in 2 minutes/i)).toBeInTheDocument()
    })
  })

  it('should prevent multiple import attempts during cooldown', async () => {
    jest.useFakeTimers()

    mockStartImport.mockResolvedValue({
      success: false,
      status: 'error',
      message: 'Rate limit reached.',
      retryAfter: 60
    })

    render(<ImportButton />)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })

    // First click
    await act(async () => {
      fireEvent.click(importButton)
    })

    expect(mockStartImport).toHaveBeenCalledTimes(1)

    // Advance 30 seconds (still in cooldown)
    await act(async () => {
      jest.advanceTimersByTime(30000)
    })

    // Try clicking again - should be disabled
    fireEvent.click(importButton)

    // Should not call import again
    expect(mockStartImport).toHaveBeenCalledTimes(1)

    jest.useRealTimers()
  })

  it('should format countdown with minutes when over 60 seconds', async () => {
    mockStartImport.mockResolvedValue({
      success: false,
      status: 'error',
      message: 'Rate limit reached.',
      retryAfter: 90 // 1 minute 30 seconds
    })

    render(<ImportButton />)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })
    fireEvent.click(importButton)

    await waitFor(() => {
      // Should show "1 minute 30 seconds" or "90 seconds"
      const hasMinuteFormat = screen.queryByText(/1 minute.*30 seconds/i)
      const hasSecondFormat = screen.queryByText(/90 seconds/i)
      expect(hasMinuteFormat || hasSecondFormat).toBeTruthy()
    })
  })

  it('should clean up timer on component unmount', async () => {
    jest.useFakeTimers()

    mockStartImport.mockResolvedValue({
      success: false,
      status: 'error',
      message: 'Rate limit reached.',
      retryAfter: 60
    })

    const { unmount } = render(<ImportButton />)

    const importButton = screen.getByRole('button', { name: /import steam inventory/i })

    await act(async () => {
      fireEvent.click(importButton)
    })

    // Unmount component
    unmount()

    // Advance timers - should not cause errors
    await act(async () => {
      jest.advanceTimersByTime(60000)
    })

    // No assertion needed - test passes if no errors thrown

    jest.useRealTimers()
  })
})
