/**
 * Integration Test for RefreshButton in Inventory Page (RED Phase)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Manual refresh when cache is stale (lines 298-307)
 *   Specifically: "I should see a '🔄 Refresh Now' button"
 *
 * Requirements:
 * - RefreshButton component should render in inventory page when isStale = true
 * - Button should NOT render when isStale = false (fresh inventory)
 * - Component should receive isStale prop from server component
 *
 * @jest-environment jsdom
 */

import React from 'react'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import RefreshButton from '@/components/RefreshButton'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
    push: jest.fn()
  })
}))

// Mock refresh action
jest.mock('@/actions/inventory', () => ({
  refreshInventoryData: jest.fn()
}))

describe('RefreshButton Integration in Inventory Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render refresh button when inventory is stale', () => {
    render(<RefreshButton isStale={true} />)

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    expect(refreshButton).toBeInTheDocument()
  })

  it('should not render when inventory is fresh', () => {
    render(<RefreshButton isStale={false} />)

    const refreshButton = screen.queryByRole('button', { name: /refresh/i })
    expect(refreshButton).not.toBeInTheDocument()
  })

  it('should render with correct styling', () => {
    render(<RefreshButton isStale={true} />)

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    expect(refreshButton).toHaveClass('bg-blue-600')
    expect(refreshButton).toHaveClass('text-white')
  })

  it('should display refresh icon', () => {
    const { container } = render(<RefreshButton isStale={true} />)

    // Check for SVG refresh icon
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })
})
