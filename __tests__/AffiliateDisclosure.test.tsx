/**
 * TDD Tests for AffiliateDisclosure Component
 * BDD Reference: features/04-price-aggregation.feature
 *   - Scenario: "Display FTC-compliant affiliate disclosure"
 *
 * FTC Compliance Requirements (features/04-price-aggregation.md):
 *   1. Proximity: Disclosure must be visible BEFORE affiliate links
 *   2. Prominence: Font size must be easily readable
 *   3. Presentation: Simple language - no jargon
 *   4. Placement: Near affiliate links, not hidden in footer
 *
 * Requirements:
 *   - Display disclosure above price comparison table
 *   - Text: "We earn a commission when you purchase through our links at no extra cost to you"
 *   - Prominently visible with background color
 *   - Include "Disclosure:" label in bold
 *   - Additional message: "This helps us keep csloadout.gg free for everyone."
 */

import React from 'react';
import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AffiliateDisclosure from '../src/components/AffiliateDisclosure';

describe('AffiliateDisclosure Component', () => {
  describe('FTC Compliance - Required Text', () => {
    it('should display the mandatory FTC disclosure message', () => {
      // BDD: "the disclosure should state: We earn a commission..."
      render(<AffiliateDisclosure />);

      expect(
        screen.getByText(/We earn a commission when you purchase through our links at no extra cost to you/i)
      ).toBeInTheDocument();
    });

    it('should include "Disclosure:" label', () => {
      render(<AffiliateDisclosure />);

      expect(screen.getByText(/Disclosure:/i)).toBeInTheDocument();
    });

    it('should include additional transparency message', () => {
      render(<AffiliateDisclosure />);

      expect(
        screen.getByText(/This helps us keep csloadout\.gg free for everyone/i)
      ).toBeInTheDocument();
    });

    it('should use simple, non-jargon language', () => {
      // FTC Requirement: Presentation - Simple language, no jargon
      render(<AffiliateDisclosure />);

      const text = screen.getByText(/We earn a commission/i).textContent;

      // Should not contain jargon terms
      expect(text).not.toMatch(/affiliate/i);
      expect(text).not.toMatch(/monetization/i);
      expect(text).not.toMatch(/revenue/i);
    });
  });

  describe('FTC Compliance - Prominence', () => {
    it('should have prominent visual styling', () => {
      // FTC Requirement: Prominence - easily readable
      const { container } = render(<AffiliateDisclosure />);

      const disclosure = container.firstChild as HTMLElement;

      // Should have background for visibility
      expect(disclosure).toHaveClass('bg-gray-100'); // or similar
    });

    it('should have adequate padding for readability', () => {
      const { container } = render(<AffiliateDisclosure />);

      const disclosure = container.firstChild as HTMLElement;

      // Should have padding class for spacing
      const classList = Array.from(disclosure.classList);
      const hasPadding = classList.some(c => c.includes('p-'));

      expect(hasPadding).toBe(true);
    });

    it('should have margin separation from other content', () => {
      const { container } = render(<AffiliateDisclosure />);

      const disclosure = container.firstChild as HTMLElement;

      // Should have margin class for separation
      const classList = Array.from(disclosure.classList);
      const hasMargin = classList.some(c => c.includes('m'));

      expect(hasMargin).toBe(true);
    });

    it('should emphasize "Disclosure:" label with bold font', () => {
      render(<AffiliateDisclosure />);

      const disclosureLabel = screen.getByText(/Disclosure:/i);

      // Should be bold or have strong tag
      expect(disclosureLabel.tagName).toBe('STRONG');
    });
  });

  describe('FTC Compliance - Placement', () => {
    it('should render as a standalone component', () => {
      const { container } = render(<AffiliateDisclosure />);

      expect(container.firstChild).toBeTruthy();
    });

    it('should be suitable for placement above price tables', () => {
      // Component should be block-level for proper positioning
      const { container } = render(<AffiliateDisclosure />);

      const disclosure = container.firstChild as HTMLElement;

      // Should be a div (block element)
      expect(disclosure.tagName).toBe('DIV');
    });

    it('should not be hidden or require interaction to view', () => {
      // FTC: Must be visible without user action
      const { container } = render(<AffiliateDisclosure />);

      const disclosure = container.firstChild as HTMLElement;

      // Should not have display:none or hidden classes
      expect(disclosure).not.toHaveClass('hidden');
      expect(disclosure).not.toHaveClass('invisible');
    });
  });

  describe('Accessibility', () => {
    it('should be readable by screen readers', () => {
      render(<AffiliateDisclosure />);

      // All text should be accessible
      expect(screen.getByText(/We earn a commission/i)).toBeInTheDocument();
    });

    it('should have semantic HTML structure', () => {
      const { container } = render(<AffiliateDisclosure />);

      const paragraphs = container.querySelectorAll('p');

      // Should use proper paragraph tags
      expect(paragraphs.length).toBeGreaterThan(0);
    });
  });

  describe('Optional Customization', () => {
    it('should accept optional className prop for styling override', () => {
      const { container } = render(<AffiliateDisclosure className="custom-class" />);

      const disclosure = container.firstChild as HTMLElement;

      expect(disclosure).toHaveClass('custom-class');
    });

    it('should accept optional additional message prop', () => {
      const customMessage = 'Your privacy matters to us.';
      render(<AffiliateDisclosure additionalMessage={customMessage} />);

      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rendering without props', () => {
      expect(() => render(<AffiliateDisclosure />)).not.toThrow();
    });

    it('should display full message without truncation', () => {
      render(<AffiliateDisclosure />);

      const message = screen.getByText(/We earn a commission/i);

      // Message should not be truncated
      expect(message.textContent).toContain('at no extra cost to you');
    });
  });
});
