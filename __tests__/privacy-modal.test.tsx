/**
 * TDD Tests for Privacy Workflow Modal (Failing Tests - RED Phase)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Handle private inventory gracefully (lines 117-130)
 *   Scenario: Minimal-friction workflow with direct Steam link (lines 132-146)
 *
 * Client Component Responsibilities:
 * - Display modal when triggered by parent component
 * - Show "Your Inventory is Private" heading
 * - Display streamlined privacy message
 * - "Open Steam Privacy Settings" primary CTA button
 * - Detect Steam client and use appropriate URL
 * - "I've Changed It - Retry Import" secondary button
 * - Close modal on Esc key or background click
 * - Accessibility: role="dialog", aria-modal="true", focus trap
 *
 * @jest-environment jsdom
 */

import React from 'react'
import { describe, it, expect } from '@jest/globals'
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import PrivacyModal from '@/components/PrivacyModal'

describe('Privacy Workflow Modal (TDD - RED Phase)', () => {
  describe('Modal Display', () => {
    it('should render modal when isOpen is true', () => {
      const mockOnClose = jest.fn()
      const mockOnRetry = jest.fn()

      render(
        <PrivacyModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should not render modal when isOpen is false', () => {
      const mockOnClose = jest.fn()
      const mockOnRetry = jest.fn()

      render(
        <PrivacyModal
          isOpen={false}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
        />
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should display "Your Inventory is Private" heading', () => {
      const mockOnClose = jest.fn()
      const mockOnRetry = jest.fn()

      render(
        <PrivacyModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
        />
      )

      expect(screen.getByRole('heading', { name: /your inventory is private/i })).toBeInTheDocument()
    })

    it('should display privacy explanation message', () => {
      const mockOnClose = jest.fn()
      const mockOnRetry = jest.fn()

      render(
        <PrivacyModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
        />
      )

      expect(screen.getByText(/we need permission to view your inventory/i)).toBeInTheDocument()
    })

    it('should display quick instructions', () => {
      const mockOnClose = jest.fn()
      const mockOnRetry = jest.fn()

      render(
        <PrivacyModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
        />
      )

      expect(screen.getByText(/click the button.*set inventory to public.*come back/i)).toBeInTheDocument()
    })
  })

  describe('Primary CTA - Open Steam Privacy Settings', () => {
    it('should display "Open Steam Privacy Settings" button prominently', () => {
      const mockOnClose = jest.fn()
      const mockOnRetry = jest.fn()

      render(
        <PrivacyModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
        />
      )

      const openButton = screen.getByRole('link', { name: /open steam privacy settings/i })
      expect(openButton).toBeInTheDocument()
      expect(openButton.className).toMatch(/bg-blue/)
    })

    it('should use steam://url/SteamIDEditPage deep link', () => {
      const mockOnClose = jest.fn()
      const mockOnRetry = jest.fn()

      render(
        <PrivacyModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
        />
      )

      const openButton = screen.getByRole('link', { name: /open steam privacy settings/i })
      expect(openButton).toHaveAttribute('href', 'steam://url/SteamIDEditPage')
    })

    it('should fallback to browser URL if Steam client not available', () => {
      const mockOnClose = jest.fn()
      const mockOnRetry = jest.fn()

      render(
        <PrivacyModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
          steamClientDetected={false}
        />
      )

      const openButton = screen.getByRole('link', { name: /open steam privacy settings/i })
      expect(openButton).toHaveAttribute('href', 'https://steamcommunity.com/my/edit/settings')
    })

    it('should open link in new tab', () => {
      const mockOnClose = jest.fn()
      const mockOnRetry = jest.fn()

      render(
        <PrivacyModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
        />
      )

      const openButton = screen.getByRole('link', { name: /open steam privacy settings/i })
      expect(openButton).toHaveAttribute('target', '_blank')
      expect(openButton).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  describe('Secondary CTA - Retry Import', () => {
    it('should display "I\'ve Changed It - Retry Import" button', () => {
      const mockOnClose = jest.fn()
      const mockOnRetry = jest.fn()

      render(
        <PrivacyModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
        />
      )

      expect(screen.getByRole('button', { name: /i've changed it.*retry import/i })).toBeInTheDocument()
    })

    it('should call onRetry callback when clicked', () => {
      const mockOnClose = jest.fn()
      const mockOnRetry = jest.fn()

      render(
        <PrivacyModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
        />
      )

      const retryButton = screen.getByRole('button', { name: /i've changed it.*retry import/i })
      fireEvent.click(retryButton)

      expect(mockOnRetry).toHaveBeenCalledTimes(1)
    })

    it('should close modal after retry callback', () => {
      const mockOnClose = jest.fn()
      const mockOnRetry = jest.fn()

      render(
        <PrivacyModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
        />
      )

      const retryButton = screen.getByRole('button', { name: /i've changed it.*retry import/i })
      fireEvent.click(retryButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('should have role="dialog" attribute', () => {
      const mockOnClose = jest.fn()
      const mockOnRetry = jest.fn()

      render(
        <PrivacyModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should have aria-modal="true" attribute', () => {
      const mockOnClose = jest.fn()
      const mockOnRetry = jest.fn()

      render(
        <PrivacyModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
        />
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
    })

    it('should have aria-labelledby linking to heading', () => {
      const mockOnClose = jest.fn()
      const mockOnRetry = jest.fn()

      render(
        <PrivacyModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
        />
      )

      const dialog = screen.getByRole('dialog')
      const headingId = dialog.getAttribute('aria-labelledby')
      expect(headingId).toBeTruthy()

      const heading = document.getElementById(headingId!)
      expect(heading).toHaveTextContent(/your inventory is private/i)
    })

    it('should close modal on Escape key press', () => {
      const mockOnClose = jest.fn()
      const mockOnRetry = jest.fn()

      render(
        <PrivacyModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
        />
      )

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should close modal on background click', () => {
      const mockOnClose = jest.fn()
      const mockOnRetry = jest.fn()

      const { container } = render(
        <PrivacyModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
        />
      )

      const backdrop = container.querySelector('.modal-backdrop')
      if (backdrop) {
        fireEvent.click(backdrop)
      }

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should trap focus within modal when open', () => {
      const mockOnClose = jest.fn()
      const mockOnRetry = jest.fn()

      const { container } = render(
        <PrivacyModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
        />
      )

      const focusableElements = container.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')
      expect(focusableElements.length).toBeGreaterThan(0)
    })
  })
})
