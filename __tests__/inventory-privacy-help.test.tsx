/**
 * TDD Tests for Privacy Help Documentation (Iteration 18)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Provide help documentation for privacy concerns (lines 193-208)
 *
 * Requirements:
 * - Display "Why is my inventory private?" expandable help section
 * - Show 6 comprehensive topics:
 *   1. Default Steam Privacy
 *   2. Security Benefits
 *   3. csloadout.gg Data Access
 *   4. What We Can See
 *   5. What We Can't See
 *   6. Data Security
 * - Include reassurance statement about public inventory safety
 * - Mention that setting can be changed back anytime
 *
 * @jest-environment jsdom
 */

import React from 'react'
import { describe, it, expect } from '@jest/globals'
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import PrivacyWorkflowModal from '@/components/PrivacyWorkflowModal'

describe('Privacy Help Documentation (TDD - Iteration 18)', () => {
  const mockOnClose = jest.fn()
  const mockOnRetry = jest.fn()

  it('should display "Default Steam Privacy" content when help expanded', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
      />
    )

    const helpButton = screen.getByRole('button', { name: /why is my inventory private/i })
    fireEvent.click(helpButton)

    expect(screen.getByText(/steam sets inventories to.*default/i)).toBeInTheDocument()
  })

  it('should display "Security Benefits" content when help expanded', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
      />
    )

    const helpButton = screen.getByRole('button', { name: /why is my inventory private/i })
    fireEvent.click(helpButton)

    expect(screen.getByText(/private inventories prevent scammers/i)).toBeInTheDocument()
  })

  it('should display "csloadout.gg Data Access" content when help expanded', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
      />
    )

    const helpButton = screen.getByRole('button', { name: /why is my inventory private/i })
    fireEvent.click(helpButton)

    expect(screen.getByText(/we only read public data.*never access private/i)).toBeInTheDocument()
  })

  it('should display "What We Can See" content when help expanded', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
      />
    )

    const helpButton = screen.getByRole('button', { name: /why is my inventory private/i })
    fireEvent.click(helpButton)

    expect(screen.getByText(/item names.*quantities.*wear values/i)).toBeInTheDocument()
  })

  it('should display "What We Can\'t See" content when help expanded', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
      />
    )

    const helpButton = screen.getByRole('button', { name: /why is my inventory private/i })
    fireEvent.click(helpButton)

    expect(screen.getByText(/nothing when private.*steam blocks all access/i)).toBeInTheDocument()
  })

  it('should display "Data Security" content when help expanded', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
      />
    )

    const helpButton = screen.getByRole('button', { name: /why is my inventory private/i })
    fireEvent.click(helpButton)

    expect(screen.getByText(/we encrypt all data.*never share with third parties/i)).toBeInTheDocument()
  })

  it('should display reassurance statement about public inventory safety', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
      />
    )

    const helpButton = screen.getByRole('button', { name: /why is my inventory private/i })
    fireEvent.click(helpButton)

    expect(screen.getByText(/making your inventory public is safe/i)).toBeInTheDocument()
  })

  it('should mention millions of Steam users have public inventories', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
      />
    )

    const helpButton = screen.getByRole('button', { name: /why is my inventory private/i })
    fireEvent.click(helpButton)

    expect(screen.getByText(/millions of steam users have public inventories/i)).toBeInTheDocument()
  })

  it('should mention settings can be changed back anytime', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
      />
    )

    const helpButton = screen.getByRole('button', { name: /why is my inventory private/i })
    fireEvent.click(helpButton)

    expect(screen.getByText(/you can change it back to private anytime/i)).toBeInTheDocument()
  })

  it('should organize help content with clear topic headings', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
      />
    )

    const helpButton = screen.getByRole('button', { name: /why is my inventory private/i })
    fireEvent.click(helpButton)

    // Should have topic headings
    expect(screen.getByText(/default steam privacy/i)).toBeInTheDocument()
    expect(screen.getByText(/security benefits/i)).toBeInTheDocument()
    expect(screen.getByText(/data access/i)).toBeInTheDocument()
    expect(screen.getByText(/data security/i)).toBeInTheDocument()
  })

  it('should visually distinguish reassurance statement from other content', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
      />
    )

    const helpButton = screen.getByRole('button', { name: /why is my inventory private/i })
    fireEvent.click(helpButton)

    // Reassurance should be in a highlighted box (bg-blue-50 or similar)
    const reassurance = screen.getByText(/making your inventory public is safe/i)
    const parentDiv = reassurance.closest('div')
    expect(parentDiv).toHaveClass(/bg-blue|bg-green/)
  })
})
