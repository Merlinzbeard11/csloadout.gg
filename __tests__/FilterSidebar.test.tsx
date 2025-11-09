/**
 * TDD Tests for FilterSidebar Component
 *
 * BDD Reference: features/03-search-filters.feature:76-311
 * Component: src/components/FilterSidebar.tsx
 *
 * Feature Requirements:
 * - Multi-select filters (rarity, weapon type, wear, quality)
 * - Price range filters (min/max)
 * - URL-based state management (query string updates)
 * - Desktop: Always-visible sidebar
 * - Mobile (<768px): Hidden sidebar, "Filters" button, bottom sheet
 * - Active filter chips with remove functionality
 * - Facet counts (show how many items match each filter)
 *
 * BDD Scenarios:
 * - Filter by single rarity: "classified"
 * - Filter by multiple rarities: "classified,covert" (OR logic)
 * - Filter by weapon type: "AK-47"
 * - Filter by price range: $5-$20
 * - Filter by wear condition: "factory_new"
 * - Mobile: Bottom sheet slides up (80% screen height)
 * - Mobile: Active filter chips with X to remove
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';
import FilterSidebar from '@/components/FilterSidebar';
import type { SearchFacets, Rarity, Wear } from '@/types/search';

// Mock Next.js router hooks
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: jest.fn((key) => {
      // Mock URL params for testing
      const params: Record<string, string> = {
        rarity: 'classified',
        weaponType: 'AK-47',
        priceMin: '5',
        priceMax: '20',
      };
      return params[key] || null;
    }),
    toString: jest.fn(() => 'rarity=classified&weaponType=AK-47&priceMin=5&priceMax=20'),
  }),
}));

// Mock facets data
const mockFacets: SearchFacets = {
  rarities: {
    consumer: 45,
    industrial: 23,
    milspec: 34,
    restricted: 15,
    classified: 12,
    covert: 8,
    contraband: 1,
  },
  weaponTypes: {
    'AK-47': 89,
    'M4A4': 34,
    'AWP': 56,
    'Knife': 12,
  },
  priceRanges: {
    '0-10': 45,
    '10-50': 123,
    '50+': 12,
  },
  wearConditions: {
    factory_new: 23,
    minimal_wear: 45,
    field_tested: 67,
    well_worn: 12,
    battle_scarred: 8,
    none: 0,
  },
};

describe('FilterSidebar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Desktop: Basic Rendering
  // ============================================================================

  describe('Desktop: Basic Rendering', () => {
    it('should render filter sidebar', () => {
      render(<FilterSidebar facets={mockFacets} />);
      expect(screen.getByText(/filters/i)).toBeInTheDocument();
    });

    it('should render rarity filter section', () => {
      render(<FilterSidebar facets={mockFacets} />);
      expect(screen.getByText(/rarity/i)).toBeInTheDocument();
    });

    it('should render weapon type filter section', () => {
      render(<FilterSidebar facets={mockFacets} />);
      expect(screen.getByText(/weapon type/i)).toBeInTheDocument();
    });

    it('should render price range filter section', () => {
      render(<FilterSidebar facets={mockFacets} />);
      expect(screen.getByText(/price range/i)).toBeInTheDocument();
    });

    it('should render wear condition filter section', () => {
      render(<FilterSidebar facets={mockFacets} />);
      expect(screen.getByText(/wear condition/i)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Rarity Filters (Multi-Select)
  // ============================================================================

  describe('Rarity Filters', () => {
    it('should render all rarity options with counts', () => {
      render(<FilterSidebar facets={mockFacets} />);

      expect(screen.getByText(/classified/i)).toBeInTheDocument();
      expect(screen.getByText(/12/)).toBeInTheDocument(); // Count

      expect(screen.getByText(/covert/i)).toBeInTheDocument();
      expect(screen.getByText(/8/)).toBeInTheDocument(); // Count
    });

    it('should allow selecting single rarity', () => {
      render(<FilterSidebar facets={mockFacets} />);

      const classifiedCheckbox = screen.getByLabelText(/classified/i);
      fireEvent.click(classifiedCheckbox);

      // Should update URL with rarity parameter
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('rarity=classified')
      );
    });

    it('should allow selecting multiple rarities', () => {
      render(<FilterSidebar facets={mockFacets} />);

      const classifiedCheckbox = screen.getByLabelText(/classified/i);
      const covertCheckbox = screen.getByLabelText(/covert/i);

      fireEvent.click(classifiedCheckbox);
      fireEvent.click(covertCheckbox);

      // Should update URL with comma-separated rarities
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('rarity=classified,covert')
      );
    });

    it('should show checked state for active filters', () => {
      render(<FilterSidebar facets={mockFacets} />);

      const classifiedCheckbox = screen.getByLabelText(/classified/i) as HTMLInputElement;
      expect(classifiedCheckbox.checked).toBe(true); // From mock URL params
    });

    it('should gray out options with zero results', () => {
      const emptyFacets: SearchFacets = {
        ...mockFacets,
        rarities: {
          ...mockFacets.rarities,
          contraband: 0, // No results
        },
      };

      render(<FilterSidebar facets={emptyFacets} />);

      const contrabandOption = screen.getByText(/contraband/i).closest('label');
      expect(contrabandOption).toHaveClass('opacity-50'); // Or equivalent disabled style
    });
  });

  // ============================================================================
  // Weapon Type Filters (Multi-Select)
  // ============================================================================

  describe('Weapon Type Filters', () => {
    it('should render all weapon types with counts', () => {
      render(<FilterSidebar facets={mockFacets} />);

      expect(screen.getByText('AK-47')).toBeInTheDocument();
      expect(screen.getByText(/89/)).toBeInTheDocument(); // Count
    });

    it('should allow selecting weapon type', () => {
      render(<FilterSidebar facets={mockFacets} />);

      const ak47Checkbox = screen.getByLabelText('AK-47');
      fireEvent.click(ak47Checkbox);

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('weaponType=AK-47')
      );
    });

    it('should allow selecting multiple weapon types', () => {
      render(<FilterSidebar facets={mockFacets} />);

      const ak47Checkbox = screen.getByLabelText('AK-47');
      const m4a4Checkbox = screen.getByLabelText('M4A4');

      fireEvent.click(ak47Checkbox);
      fireEvent.click(m4a4Checkbox);

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('weaponType=AK-47,M4A4')
      );
    });
  });

  // ============================================================================
  // Price Range Filters
  // ============================================================================

  describe('Price Range Filters', () => {
    it('should render price min/max inputs', () => {
      render(<FilterSidebar facets={mockFacets} />);

      const minInput = screen.getByLabelText(/min price/i);
      const maxInput = screen.getByLabelText(/max price/i);

      expect(minInput).toBeInTheDocument();
      expect(maxInput).toBeInTheDocument();
    });

    it('should accept numeric input for min price', () => {
      render(<FilterSidebar facets={mockFacets} />);

      const minInput = screen.getByLabelText(/min price/i);
      fireEvent.change(minInput, { target: { value: '5' } });

      expect(minInput).toHaveValue(5);
    });

    it('should accept numeric input for max price', () => {
      render(<FilterSidebar facets={mockFacets} />);

      const maxInput = screen.getByLabelText(/max price/i);
      fireEvent.change(maxInput, { target: { value: '20' } });

      expect(maxInput).toHaveValue(20);
    });

    it('should update URL with price range', () => {
      render(<FilterSidebar facets={mockFacets} />);

      const minInput = screen.getByLabelText(/min price/i);
      const maxInput = screen.getByLabelText(/max price/i);

      fireEvent.change(minInput, { target: { value: '5' } });
      fireEvent.change(maxInput, { target: { value: '20' } });

      // Debounced, so wait
      waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('priceMin=5&priceMax=20')
        );
      });
    });
  });

  // ============================================================================
  // Wear Condition Filters
  // ============================================================================

  describe('Wear Condition Filters', () => {
    it('should render all wear conditions with counts', () => {
      render(<FilterSidebar facets={mockFacets} />);

      expect(screen.getByText(/factory new/i)).toBeInTheDocument();
      expect(screen.getByText(/23/)).toBeInTheDocument(); // Count
    });

    it('should allow selecting wear condition', () => {
      render(<FilterSidebar facets={mockFacets} />);

      const fnCheckbox = screen.getByLabelText(/factory new/i);
      fireEvent.click(fnCheckbox);

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('wear=factory_new')
      );
    });
  });

  // ============================================================================
  // Clear Filters
  // ============================================================================

  describe('Clear Filters', () => {
    it('should render "Clear All" button', () => {
      render(<FilterSidebar facets={mockFacets} />);
      expect(screen.getByText(/clear all/i)).toBeInTheDocument();
    });

    it('should clear all filters when clicked', () => {
      render(<FilterSidebar facets={mockFacets} />);

      const clearButton = screen.getByText(/clear all/i);
      fireEvent.click(clearButton);

      // Should navigate to URL without filter params
      expect(mockPush).toHaveBeenCalledWith(
        expect.not.stringContaining('rarity=')
      );
    });
  });

  // ============================================================================
  // Mobile: Bottom Sheet
  // ============================================================================

  describe('Mobile: Bottom Sheet', () => {
    it('should hide sidebar on mobile (<768px)', () => {
      // Mock window.innerWidth for mobile
      global.innerWidth = 375;

      render(<FilterSidebar facets={mockFacets} />);

      // Sidebar should be hidden
      const sidebar = screen.getByRole('complementary'); // Sidebar has role="complementary"
      expect(sidebar).toHaveClass('hidden'); // Or equivalent mobile-hidden class
    });

    it('should show "Filters" button on mobile', () => {
      global.innerWidth = 375;

      render(<FilterSidebar facets={mockFacets} />);

      const filtersButton = screen.getByRole('button', { name: /filters/i });
      expect(filtersButton).toBeInTheDocument();
    });

    it('should open bottom sheet when "Filters" button clicked', () => {
      global.innerWidth = 375;

      render(<FilterSidebar facets={mockFacets} />);

      const filtersButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filtersButton);

      // Bottom sheet should be visible
      const bottomSheet = screen.getByRole('dialog'); // Bottom sheet is a dialog
      expect(bottomSheet).toBeInTheDocument();
      expect(bottomSheet).toHaveClass('visible'); // Or equivalent
    });

    it('should cover 80% of screen height on mobile', () => {
      global.innerWidth = 375;

      render(<FilterSidebar facets={mockFacets} />);

      const filtersButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filtersButton);

      const bottomSheet = screen.getByRole('dialog');
      expect(bottomSheet).toHaveStyle({ height: '80%' }); // Or equivalent
    });

    it('should close bottom sheet when clicking outside', () => {
      global.innerWidth = 375;

      render(<FilterSidebar facets={mockFacets} />);

      const filtersButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filtersButton);

      // Click backdrop
      const backdrop = screen.getByTestId('bottom-sheet-backdrop');
      fireEvent.click(backdrop);

      // Bottom sheet should close
      waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Mobile: Active Filter Chips
  // ============================================================================

  describe('Mobile: Active Filter Chips', () => {
    it('should display active filter chips', () => {
      global.innerWidth = 375;

      render(<FilterSidebar facets={mockFacets} />);

      // From mock URL params: rarity=classified, weaponType=AK-47
      expect(screen.getByText('Classified')).toBeInTheDocument(); // Chip
      expect(screen.getByText('AK-47')).toBeInTheDocument(); // Chip
    });

    it('should show X button on each chip', () => {
      global.innerWidth = 375;

      render(<FilterSidebar facets={mockFacets} />);

      const chips = screen.getAllByRole('button', { name: /remove/i });
      expect(chips.length).toBeGreaterThan(0);
    });

    it('should remove specific filter when chip X clicked', () => {
      global.innerWidth = 375;

      render(<FilterSidebar facets={mockFacets} />);

      const classifiedChip = screen.getByText('Classified').closest('button');
      const removeButton = classifiedChip?.querySelector('[aria-label*="remove"]');

      if (removeButton) {
        fireEvent.click(removeButton);
      }

      // Should update URL without that filter
      expect(mockPush).toHaveBeenCalledWith(
        expect.not.stringContaining('rarity=classified')
      );
    });
  });

  // ============================================================================
  // URL State Management
  // ============================================================================

  describe('URL State Management', () => {
    it('should sync filter state with URL params', () => {
      render(<FilterSidebar facets={mockFacets} />);

      // From mock URL params
      const classifiedCheckbox = screen.getByLabelText(/classified/i) as HTMLInputElement;
      expect(classifiedCheckbox.checked).toBe(true);
    });

    it('should preserve existing URL params when adding filter', () => {
      render(<FilterSidebar facets={mockFacets} />);

      const covertCheckbox = screen.getByLabelText(/covert/i);
      fireEvent.click(covertCheckbox);

      // Should include existing params + new filter
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('weaponType=AK-47')
      );
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('rarity=classified,covert')
      );
    });

    it('should reset to page 1 when filters change', () => {
      render(<FilterSidebar facets={mockFacets} />);

      const covertCheckbox = screen.getByLabelText(/covert/i);
      fireEvent.click(covertCheckbox);

      // Should reset pagination
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('page=1')
      );
    });
  });

  // ============================================================================
  // Accessibility
  // ============================================================================

  describe('Accessibility', () => {
    it('should have proper ARIA labels on checkboxes', () => {
      render(<FilterSidebar facets={mockFacets} />);

      const checkbox = screen.getByLabelText(/classified/i);
      expect(checkbox).toHaveAttribute('type', 'checkbox');
    });

    it('should have complementary role on sidebar', () => {
      render(<FilterSidebar facets={mockFacets} />);

      const sidebar = screen.getByRole('complementary');
      expect(sidebar).toBeInTheDocument();
    });

    it('should have dialog role on mobile bottom sheet', () => {
      global.innerWidth = 375;

      render(<FilterSidebar facets={mockFacets} />);

      const filtersButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filtersButton);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });
  });
});
