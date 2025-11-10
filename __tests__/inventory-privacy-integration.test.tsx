/**
 * TDD Tests for Inventory Privacy Modal Integration (Simplified)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Handle private inventory gracefully (lines 117-130)
 *
 * @jest-environment jsdom
 */

import React from 'react'
import { describe, it, expect } from '@jest/globals'
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import InventoryPrivacyWrapper from '@/components/InventoryPrivacyWrapper'

// Mock server action
jest.mock('@/actions/inventory', () => ({
  retryInventoryImport: jest.fn(() => Promise.resolve({
    success: true,
    message: 'Success',
    syncStatus: 'success'
  }))
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
    push: jest.fn()
  })
}))

describe('Inventory Privacy Modal Integration', () => {
  it('should display modal when isPrivate is true', () => {
    render(
      <InventoryPrivacyWrapper isPrivate={true}>
        <div>Test Content</div>
      </InventoryPrivacyWrapper>
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('should not display modal when isPrivate is false', () => {
    render(
      <InventoryPrivacyWrapper isPrivate={false}>
        <div>Test Content</div>
      </InventoryPrivacyWrapper>
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should render children content', () => {
    render(
      <InventoryPrivacyWrapper isPrivate={false}>
        <div>Test Content</div>
      </InventoryPrivacyWrapper>
    )

    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should display privacy modal heading when private', () => {
    render(
      <InventoryPrivacyWrapper isPrivate={true}>
        <div>Test Content</div>
      </InventoryPrivacyWrapper>
    )

    expect(screen.getByRole('heading', { name: /your inventory is private/i })).toBeInTheDocument()
  })

  it('should show retry button', () => {
    render(
      <InventoryPrivacyWrapper isPrivate={true}>
        <div>Test Content</div>
      </InventoryPrivacyWrapper>
    )

    expect(screen.getByRole('button', { name: /i've changed it.*retry import/i })).toBeInTheDocument()
  })

  it('should allow modal close', () => {
    render(
      <InventoryPrivacyWrapper isPrivate={true}>
        <div>Test Content</div>
      </InventoryPrivacyWrapper>
    )

    const closeButton = screen.getByLabelText(/close modal/i)
    fireEvent.click(closeButton)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
