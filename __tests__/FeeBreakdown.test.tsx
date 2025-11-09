/**
 * TDD Tests for FeeBreakdown Component
 * BDD Reference: features/05-fee-transparency.feature:111-139
 *
 * Requirements:
 *   - Display fee badge with color coding (green for low fees, red for high fees)
 *   - Show tooltip on hover with detailed breakdown
 *   - Display warning icon for high fees
 *   - Show fee notes and warnings
 *   - Handle decimal precision (2 decimal places)
 *   - Handle edge case: fees under $0.01
 */

import React from 'react';
import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeeBreakdown from '../src/components/FeeBreakdown';
import type { FeeBreakdown as FeeBreakdownType } from '../src/types/fees';

describe('FeeBreakdown Component', () => {
  // BDD Scenario: features/05-fee-transparency.feature:111-123
  describe('Low Fee Badge (CSFloat)', () => {
    const lowFeesData: FeeBreakdownType = {
      basePrice: 5.00,
      platformFee: 0.00,
      hiddenMarkup: 0.00,
      totalCost: 5.00,
      effectiveFeePercent: '0%',
      feeNote: '2% sale fee (seller pays, not buyer)',
      hasWarning: false,
    };

    it('should display green badge for low fees', () => {
      const { container } = render(<FeeBreakdown breakdown={lowFeesData} />);

      const badge = screen.getByText(/Low Fees: 0%/i);
      expect(badge).toBeInTheDocument();

      // Check parent div for bg-green-100 class
      const badgeContainer = container.querySelector('.bg-green-100');
      expect(badgeContainer).toBeInTheDocument();
    });

    it('should show tooltip on hover with fee breakdown', async () => {
      const user = userEvent.setup();
      render(<FeeBreakdown breakdown={lowFeesData} />);

      const badge = screen.getByText(/Low Fees: 0%/i);
      await user.hover(badge);

      expect(screen.getByText('Base Price:')).toBeInTheDocument();
      expect(screen.getAllByText('$5.00').length).toBeGreaterThan(0);
      expect(screen.getByText('Platform Fee:')).toBeInTheDocument();
      expect(screen.getByText(/\$0\.00 \(0%\)/)).toBeInTheDocument();
      expect(screen.getByText('Total You Pay:')).toBeInTheDocument();
      expect(screen.getByText(/2% sale fee \(seller pays, not buyer\)/i)).toBeInTheDocument();
    });
  });

  // BDD Scenario: features/05-fee-transparency.feature:125-139
  describe('High Fee Warning (CS.MONEY)', () => {
    const highFeesData: FeeBreakdownType = {
      basePrice: 500.00,
      platformFee: 0.00,
      hiddenMarkup: 100.00,
      totalCost: 600.00,
      effectiveFeePercent: '20.00%',
      feeNote: '7% platform fee + ~20% bot markup (estimated)',
      hasWarning: true,
      warningMessage: '⚠️ Includes ~20% estimated bot markup',
    };

    it('should display red badge for high fees', () => {
      const { container } = render(<FeeBreakdown breakdown={highFeesData} />);

      const badge = screen.getByText(/High Fees: 20\.00%/i);
      expect(badge).toBeInTheDocument();

      // Check parent div for bg-red-100 class
      const badgeContainer = container.querySelector('.bg-red-100');
      expect(badgeContainer).toBeInTheDocument();
    });

    it('should show warning icon for high fees', () => {
      render(<FeeBreakdown breakdown={highFeesData} />);

      expect(screen.getByText('⚠️')).toBeInTheDocument();
    });

    it('should show tooltip with hidden markup details', async () => {
      const user = userEvent.setup();
      render(<FeeBreakdown breakdown={highFeesData} />);

      const badge = screen.getByText(/High Fees: 20\.00%/i);
      await user.hover(badge);

      expect(screen.getByText('Base Price:')).toBeInTheDocument();
      expect(screen.getByText('$500.00')).toBeInTheDocument();
      expect(screen.getByText('Hidden Bot Markup:')).toBeInTheDocument();
      expect(screen.getByText(/\$100\.00 \(20%\)/)).toBeInTheDocument();
      expect(screen.getByText('Total You Pay:')).toBeInTheDocument();
      expect(screen.getByText('$600.00')).toBeInTheDocument();
      expect(screen.getByText(/⚠️ Includes ~20% estimated bot markup/i)).toBeInTheDocument();
      expect(screen.getByText(/7% platform fee \+ ~20% bot markup \(estimated\)/i)).toBeInTheDocument();
    });
  });

  // BDD Scenario: features/05-fee-transparency.feature:145-151
  describe('Decimal Precision', () => {
    const precisionData: FeeBreakdownType = {
      basePrice: 1.37,
      platformFee: 0.03,
      hiddenMarkup: 0.00,
      totalCost: 1.40,
      effectiveFeePercent: '2.19%',
      feeNote: '2.5% buyer fee',
      hasWarning: false,
    };

    it('should display all monetary values with 2 decimal places', () => {
      render(<FeeBreakdown breakdown={precisionData} />);

      const badge = screen.getByText(/2\.19%/i);
      expect(badge).toBeInTheDocument();
    });

    it('should show precise fee calculation in tooltip', async () => {
      const user = userEvent.setup();
      render(<FeeBreakdown breakdown={precisionData} />);

      const badge = screen.getByText(/2\.19%/i);
      await user.hover(badge);

      expect(screen.getByText('Platform Fee:')).toBeInTheDocument();
      expect(screen.getByText(/\$0\.03/)).toBeInTheDocument();
      expect(screen.getByText('Total You Pay:')).toBeInTheDocument();
      expect(screen.getByText('$1.40')).toBeInTheDocument();
    });
  });

  // BDD Scenario: features/05-fee-transparency.feature:161-167
  describe('Very Small Fees (Under $0.01)', () => {
    const smallFeeData: FeeBreakdownType = {
      basePrice: 0.15,
      platformFee: 0.00, // Rounds to zero
      hiddenMarkup: 0.00,
      totalCost: 0.15,
      effectiveFeePercent: '0%',
      feeNote: '2% buyer fee - Fee less than $0.01',
      hasWarning: false,
    };

    it('should show fee as $0.00 when under $0.01', async () => {
      const user = userEvent.setup();
      render(<FeeBreakdown breakdown={smallFeeData} />);

      const badge = screen.getByText(/0%/i);
      await user.hover(badge);

      expect(screen.getByText('Platform Fee:')).toBeInTheDocument();
      expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
    });

    it('should show note about fee being less than $0.01', async () => {
      const user = userEvent.setup();
      render(<FeeBreakdown breakdown={smallFeeData} />);

      const badge = screen.getByText(/0%/i);
      await user.hover(badge);

      expect(screen.getByText(/Fee less than \$0\.01/i)).toBeInTheDocument();
    });
  });

  // BDD Scenario: features/05-fee-transparency.feature:31-40 (Buyer fees)
  describe('Standard Buyer Fees', () => {
    const buyerFeesData: FeeBreakdownType = {
      basePrice: 10.00,
      platformFee: 0.50,
      hiddenMarkup: 0.00,
      totalCost: 10.50,
      effectiveFeePercent: '5.00%',
      feeNote: '5% buyer fee',
      hasWarning: false,
    };

    it('should display buyer fee breakdown', async () => {
      const user = userEvent.setup();
      render(<FeeBreakdown breakdown={buyerFeesData} />);

      const badge = screen.getByText(/5\.00%/i);
      await user.hover(badge);

      expect(screen.getByText('Base Price:')).toBeInTheDocument();
      expect(screen.getByText('$10.00')).toBeInTheDocument();
      expect(screen.getByText('Platform Fee:')).toBeInTheDocument();
      expect(screen.getByText(/\$0\.50/)).toBeInTheDocument();
      expect(screen.getByText('Total You Pay:')).toBeInTheDocument();
      expect(screen.getByText('$10.50')).toBeInTheDocument();
    });
  });

  describe('Badge Color Coding', () => {
    it('should use green for fees <= 2%', () => {
      const lowFee: FeeBreakdownType = {
        basePrice: 100.00,
        platformFee: 2.00,
        hiddenMarkup: 0.00,
        totalCost: 102.00,
        effectiveFeePercent: '2.00%',
        feeNote: '2% fee',
        hasWarning: false,
      };

      const { container } = render(<FeeBreakdown breakdown={lowFee} />);
      screen.getByText(/Low Fees: 2\.00%/i);

      const badgeContainer = container.querySelector('.bg-green-100');
      expect(badgeContainer).toBeInTheDocument();
    });

    it('should use yellow for fees 2% < x <= 10%', () => {
      const mediumFee: FeeBreakdownType = {
        basePrice: 100.00,
        platformFee: 5.00,
        hiddenMarkup: 0.00,
        totalCost: 105.00,
        effectiveFeePercent: '5.00%',
        feeNote: '5% fee',
        hasWarning: false,
      };

      const { container } = render(<FeeBreakdown breakdown={mediumFee} />);
      screen.getByText(/5\.00%/i);

      const badgeContainer = container.querySelector('.bg-yellow-100');
      expect(badgeContainer).toBeInTheDocument();
    });

    it('should use red for fees > 10%', () => {
      const highFee: FeeBreakdownType = {
        basePrice: 100.00,
        platformFee: 15.00,
        hiddenMarkup: 0.00,
        totalCost: 115.00,
        effectiveFeePercent: '15.00%',
        feeNote: '15% fee',
        hasWarning: false,
      };

      const { container } = render(<FeeBreakdown breakdown={highFee} />);
      screen.getByText(/High Fees: 15\.00%/i);

      const badgeContainer = container.querySelector('.bg-red-100');
      expect(badgeContainer).toBeInTheDocument();
    });
  });
});
