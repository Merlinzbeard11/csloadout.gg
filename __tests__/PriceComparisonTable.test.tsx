/**
 * TDD Tests for PriceComparisonTable Component
 * BDD Reference: features/04-price-aggregation.feature
 *   - Scenario: "View all marketplace prices for comparison"
 *   - Scenario: "Calculate total cost including fees"
 *   - Scenario: "Display data freshness indicator"
 *
 * Requirements:
 *   - Display all marketplace prices sorted by total cost
 *   - Columns: Platform, Price, Fees, Total Cost, Action
 *   - Highlight lowest price row in green
 *   - "Buy on {Platform}" links open in new tab
 *   - Show savings message
 *   - Display data freshness indicator
 *   - Show "Updated X minutes ago" timestamp
 */

import React from 'react';
import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PriceComparisonTable from '../src/components/PriceComparisonTable';
import type { AggregatedPrices } from '../src/types/price';

describe('PriceComparisonTable Component', () => {
  const mockPrices: AggregatedPrices = {
    itemId: 'test-item-id',
    itemName: 'AK-47 | Redline (Field-Tested)',
    lowestPrice: {
      platform: 'csfloat',
      price: 8.50,
      currency: 'USD',
      fees: { seller: 2.0, buyer: 0.0, total: 2.0 },
      totalCost: 8.67,
      lastUpdated: new Date('2025-11-08T14:00:00Z'),
    },
    allPrices: [
      {
        platform: 'csfloat',
        price: 8.50,
        currency: 'USD',
        fees: { seller: 2.0, buyer: 0.0, total: 2.0 },
        totalCost: 8.67,
        listingUrl: 'https://csfloat.com/item/123',
        lastUpdated: new Date('2025-11-08T14:00:00Z'),
      },
      {
        platform: 'buff163',
        price: 8.90,
        currency: 'USD',
        fees: { seller: 2.5, buyer: 0.0, total: 2.5 },
        totalCost: 9.12,
        listingUrl: 'https://buff.163.com/item/456',
        lastUpdated: new Date('2025-11-08T13:30:00Z'),
      },
      {
        platform: 'steam',
        price: 10.00,
        currency: 'USD',
        fees: { seller: 15.0, buyer: 0.0, total: 15.0 },
        totalCost: 11.50,
        listingUrl: 'https://steamcommunity.com/market/listings/730/item',
        lastUpdated: new Date('2025-11-08T12:00:00Z'),
      },
    ],
    savings: 2.83,
    updatedAt: new Date('2025-11-08T14:00:00Z'),
  };

  describe('Table Structure', () => {
    it('should render table with correct columns', () => {
      render(<PriceComparisonTable prices={mockPrices} />);

      expect(screen.getByText('Platform')).toBeInTheDocument();
      expect(screen.getByText('Price')).toBeInTheDocument();
      expect(screen.getByText('Fees')).toBeInTheDocument();
      expect(screen.getByText('Total Cost')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('should render all price rows', () => {
      render(<PriceComparisonTable prices={mockPrices} />);

      expect(screen.getByText('CSFloat')).toBeInTheDocument();
      expect(screen.getByText('Buff163')).toBeInTheDocument();
      expect(screen.getByText('Steam Market')).toBeInTheDocument();
    });

    it('should display prices in sorted order (cheapest first)', () => {
      render(<PriceComparisonTable prices={mockPrices} />);

      const rows = screen.getAllByRole('row');
      // Skip header row (index 0), check data rows
      expect(rows[1]).toHaveTextContent('CSFloat'); // $8.67 (lowest)
      expect(rows[2]).toHaveTextContent('Buff163'); // $9.12
      expect(rows[3]).toHaveTextContent('Steam'); // $11.50 (highest)
    });
  });

  describe('Price Display', () => {
    it('should display base price with $ symbol', () => {
      render(<PriceComparisonTable prices={mockPrices} />);

      expect(screen.getByText('$8.50')).toBeInTheDocument();
      expect(screen.getByText('$8.90')).toBeInTheDocument();
      expect(screen.getByText('$10.00')).toBeInTheDocument();
    });

    it('should display fee badges with FeeBreakdown component', () => {
      render(<PriceComparisonTable prices={mockPrices} />);

      // All platforms have 0% buyer fees (seller pays), so all show "Low Fees: 0%"
      const feeBadges = screen.getAllByText(/Low Fees: 0%/i);
      expect(feeBadges.length).toBeGreaterThanOrEqual(3); // CSFloat, Buff163, Steam
    });

    it('should display total cost with $ symbol', () => {
      render(<PriceComparisonTable prices={mockPrices} />);

      expect(screen.getByText('$8.67')).toBeInTheDocument();
      expect(screen.getByText('$9.12')).toBeInTheDocument();
      expect(screen.getByText('$11.50')).toBeInTheDocument();
    });

    it('should format prices to 2 decimal places', () => {
      const pricesWithDecimals: AggregatedPrices = {
        ...mockPrices,
        allPrices: [
          {
            ...mockPrices.allPrices[0],
            price: 8.5,
            totalCost: 8.67,
          },
        ],
      };

      render(<PriceComparisonTable prices={pricesWithDecimals} />);

      expect(screen.getByText('$8.50')).toBeInTheDocument();
    });
  });

  describe('Lowest Price Highlighting', () => {
    it('should highlight lowest price row in green', () => {
      const { container } = render(<PriceComparisonTable prices={mockPrices} />);

      const rows = container.querySelectorAll('tbody tr');
      expect(rows[0]).toHaveClass('bg-green-50'); // CSFloat row (lowest)
      expect(rows[1]).not.toHaveClass('bg-green-50'); // Buff163 row
      expect(rows[2]).not.toHaveClass('bg-green-50'); // Steam row
    });

    it('should identify lowest price by total cost, not base price', () => {
      // Even if base price is lower, total cost determines lowest
      const lowestPriceData = { ...mockPrices.allPrices[1], totalCost: 8.00 };
      const pricesWithHighFees: AggregatedPrices = {
        ...mockPrices,
        lowestPrice: lowestPriceData, // Buff163 has lowest total despite higher base
        allPrices: [
          lowestPriceData, // Lowest total
          { ...mockPrices.allPrices[0], totalCost: 9.00 },
        ],
      };

      const { container } = render(<PriceComparisonTable prices={pricesWithHighFees} />);

      const rows = container.querySelectorAll('tbody tr');
      expect(rows[0]).toHaveClass('bg-green-50'); // First row (lowest total)
    });
  });

  describe('Action Links', () => {
    it('should render "Buy on {Platform}" links', () => {
      render(<PriceComparisonTable prices={mockPrices} />);

      expect(screen.getByText('Buy on CSFloat')).toBeInTheDocument();
      expect(screen.getByText('Buy on Buff163')).toBeInTheDocument();
      expect(screen.getByText('Buy on Steam Market')).toBeInTheDocument();
    });

    it('should open links in new tab (target="_blank")', () => {
      render(<PriceComparisonTable prices={mockPrices} />);

      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAttribute('target', '_blank');
      });
    });

    it('should include rel="noopener noreferrer" for security', () => {
      render(<PriceComparisonTable prices={mockPrices} />);

      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });

    it('should link to marketplace listing URL', () => {
      render(<PriceComparisonTable prices={mockPrices} />);

      const csfloatLink = screen.getByText('Buy on CSFloat').closest('a');
      expect(csfloatLink).toHaveAttribute('href', 'https://csfloat.com/item/123');
    });

    it('should handle missing listing URL gracefully', () => {
      const pricesWithoutUrl: AggregatedPrices = {
        ...mockPrices,
        allPrices: [
          {
            ...mockPrices.allPrices[0],
            listingUrl: undefined,
          },
        ],
      };

      render(<PriceComparisonTable prices={pricesWithoutUrl} />);

      // Should still render but link might be disabled or point to platform homepage
      expect(screen.getByText('Buy on CSFloat')).toBeInTheDocument();
    });
  });

  describe('Savings Message', () => {
    it('should display savings amount', () => {
      render(<PriceComparisonTable prices={mockPrices} />);

      expect(screen.getByText(/Save \$2\.83/)).toBeInTheDocument();
    });

    it('should show platform with lowest price', () => {
      render(<PriceComparisonTable prices={mockPrices} />);

      expect(screen.getByText(/by buying on CSFloat/)).toBeInTheDocument();
    });

    it('should format savings to 2 decimal places', () => {
      const pricesWithLargeSavings: AggregatedPrices = {
        ...mockPrices,
        savings: 12.5,
      };

      render(<PriceComparisonTable prices={pricesWithLargeSavings} />);

      expect(screen.getByText(/\$12\.50/)).toBeInTheDocument();
    });

    it('should handle zero savings (all prices identical)', () => {
      const identicalPrices: AggregatedPrices = {
        ...mockPrices,
        savings: 0,
        allPrices: [
          { ...mockPrices.allPrices[0], totalCost: 10.00 },
          { ...mockPrices.allPrices[1], totalCost: 10.00 },
        ],
      };

      render(<PriceComparisonTable prices={identicalPrices} />);

      // Should still display but show $0.00 savings
      expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
    });
  });

  describe('Data Freshness Indicator', () => {
    it('should display "Updated X minutes ago" timestamp', () => {
      render(<PriceComparisonTable prices={mockPrices} />);

      expect(screen.getByText(/Updated/)).toBeInTheDocument();
      expect(screen.getByText(/ago/)).toBeInTheDocument();
    });

    it('should show relative time for recent updates', () => {
      const recentPrices: AggregatedPrices = {
        ...mockPrices,
        updatedAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      };

      render(<PriceComparisonTable prices={recentPrices} />);

      expect(screen.getByText(/2 minutes ago/)).toBeInTheDocument();
    });
  });

  describe('Platform Name Display', () => {
    it('should use display names from PLATFORM_NAMES', () => {
      render(<PriceComparisonTable prices={mockPrices} />);

      expect(screen.getByText('CSFloat')).toBeInTheDocument();
      expect(screen.getByText('Buff163')).toBeInTheDocument();
      expect(screen.getByText('Steam Market')).toBeInTheDocument();
    });

    it('should handle all supported platforms', () => {
      const allPlatformsPrices: AggregatedPrices = {
        ...mockPrices,
        allPrices: [
          { ...mockPrices.allPrices[0], platform: 'csfloat' },
          { ...mockPrices.allPrices[0], platform: 'steam' },
          { ...mockPrices.allPrices[0], platform: 'csmoney' },
          { ...mockPrices.allPrices[0], platform: 'tradeit' },
          { ...mockPrices.allPrices[0], platform: 'buff163' },
          { ...mockPrices.allPrices[0], platform: 'dmarket' },
        ],
      };

      render(<PriceComparisonTable prices={allPlatformsPrices} />);

      expect(screen.getByText('CSFloat')).toBeInTheDocument();
      expect(screen.getByText('Steam Market')).toBeInTheDocument();
      expect(screen.getByText('CS.MONEY')).toBeInTheDocument();
      expect(screen.getByText('TradeIt.gg')).toBeInTheDocument();
      expect(screen.getByText('Buff163')).toBeInTheDocument();
      expect(screen.getByText('DMarket')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should handle empty price list gracefully', () => {
      const emptyPrices: AggregatedPrices = {
        ...mockPrices,
        allPrices: [],
      };

      render(<PriceComparisonTable prices={emptyPrices} />);

      // Should render table structure but no data rows
      expect(screen.getByText('Platform')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible table structure', () => {
      render(<PriceComparisonTable prices={mockPrices} />);

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(5);
    });

    it('should have descriptive link text', () => {
      render(<PriceComparisonTable prices={mockPrices} />);

      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link.textContent).toMatch(/Buy on/);
      });
    });
  });
});
