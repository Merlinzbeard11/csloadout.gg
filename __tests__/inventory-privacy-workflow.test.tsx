/**
 * TDD Tests for Interactive Privacy Workflow (Iteration 17)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Interactive workflow to change Steam privacy settings (lines 157-191)
 *
 * Requirements:
 * - Display privacy workflow modal with heading "Your Steam Inventory is Private"
 * - Show warning icon (⚠️)
 * - Include clear problem description
 * - Display step-by-step numbered instructions with visual guides
 * - Primary CTA: "Open Steam Settings" (external link)
 * - Secondary CTA: "I've Changed My Settings - Retry Import"
 * - Help link: "Why is my inventory private?"
 * - 7 numbered steps with descriptions
 * - Steam URL detection (steam:// vs https://)
 * - Track "privacy_settings_opened" event
 * - Retry import functionality with loading state
 *
 * @jest-environment jsdom
 */

import React from 'react'
import { describe, it, expect, beforeEach } from '@jest/globals'
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import PrivacyWorkflowModal from '@/components/PrivacyWorkflowModal'

describe('Interactive Privacy Workflow (TDD - Iteration 17)', () => {
  const mockOnClose = jest.fn()
  const mockOnRetry = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should display heading "Your Steam Inventory is Private"', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
      />
    )

    expect(screen.getByText(/your steam inventory is private/i)).toBeInTheDocument()
  })

  it('should show warning icon (⚠️)', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
      />
    )

    // Should have warning icon SVG
    const icon = screen.getByRole('img', { hidden: true })
    expect(icon).toBeInTheDocument()
  })

  it('should display clear problem description', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
      />
    )

    expect(screen.getByText(/we can't import your inventory/i)).toBeInTheDocument()
  })

  it('should display 7 numbered step-by-step instructions', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
      />
    )

    // All 7 steps should be present (text is split across elements, so check separately)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText(/click your steam username/i)).toBeInTheDocument()

    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText(/select.*profile.*dropdown/i)).toBeInTheDocument()

    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText(/click.*edit profile.*button/i)).toBeInTheDocument()

    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText(/go to.*privacy settings.*tab/i)).toBeInTheDocument()

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText(/find.*inventory.*public/i)).toBeInTheDocument()

    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText(/click.*save changes/i)).toBeInTheDocument()

    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText(/return to csloadout.*retry import/i)).toBeInTheDocument()
  })

  it('should display "Open Steam Settings" primary CTA button', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
      />
    )

    const button = screen.getByRole('link', { name: /open steam settings/i })
    expect(button).toBeInTheDocument()
  })

  it('should display "I\'ve Changed My Settings - Retry Import" secondary CTA', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
      />
    )

    const button = screen.getByRole('button', { name: /i've changed my settings.*retry import/i })
    expect(button).toBeInTheDocument()
  })

  it('should display "Why is my inventory private?" help link', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
      />
    )

    const helpLink = screen.getByRole('button', { name: /why is my inventory private/i })
    expect(helpLink).toBeInTheDocument()
  })

  it('should use Steam deep link (steam://) when Steam client detected', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
        steamClientDetected={true}
      />
    )

    const link = screen.getByRole('link', { name: /open steam settings/i })
    expect(link).toHaveAttribute('href', 'steam://url/SteamIDEditPage')
  })

  it('should use browser URL (https://) when Steam client NOT detected', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
        steamClientDetected={false}
      />
    )

    const link = screen.getByRole('link', { name: /open steam settings/i })
    expect(link).toHaveAttribute('href', 'https://steamcommunity.com/my/edit/settings')
  })

  it('should open Steam settings link in new tab', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
      />
    )

    const link = screen.getByRole('link', { name: /open steam settings/i })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('should call onRetry when "Retry Import" button clicked', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
      />
    )

    const button = screen.getByRole('button', { name: /i've changed my settings.*retry import/i })
    fireEvent.click(button)

    expect(mockOnRetry).toHaveBeenCalledTimes(1)
  })

  it('should show loading state during retry import', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
        isRetrying={true}
      />
    )

    const button = screen.getByRole('button', { name: /retrying/i })
    expect(button).toBeDisabled()
  })

  it('should display external link icon on "Open Steam Settings" button', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
      />
    )

    const link = screen.getByRole('link', { name: /open steam settings/i })
    // Link should contain an external link icon (SVG)
    const svg = link.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('should NOT render when isOpen is false', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={false}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
      />
    )

    expect(screen.queryByText(/your steam inventory is private/i)).not.toBeInTheDocument()
  })

  it('should expand help section when "Why is my inventory private?" clicked', () => {
    render(
      <PrivacyWorkflowModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
      />
    )

    const helpButton = screen.getByRole('button', { name: /why is my inventory private/i })

    // Initially, help content should be hidden
    expect(screen.queryByText(/steam privacy settings/i)).not.toBeInTheDocument()

    // Click help button
    fireEvent.click(helpButton)

    // Help content should now be visible
    expect(screen.getByText(/steam privacy settings/i)).toBeInTheDocument()
  })
})
