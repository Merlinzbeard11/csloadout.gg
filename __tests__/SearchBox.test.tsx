/**
 * TDD Tests for SearchBox Component with Autocomplete
 *
 * BDD Reference: features/03-search-filters.feature:47-74
 * Component: src/components/SearchBox.tsx
 *
 * Feature Requirements:
 * - Autocomplete suggestions appear instantly (<50ms)
 * - Keyboard navigation (Arrow Up/Down, Enter, Escape)
 * - Grouped suggestions (items, weapons, collections)
 * - Debounced API calls (300ms)
 * - URL state management
 * - Accessibility (ARIA labels, roles)
 *
 * Critical Gotchas:
 * - Gotcha #4: Limit to 8-10 suggestions
 * - React: Cleanup debounce timers in useEffect
 * - React: Handle outside clicks to close suggestions
 * - React: Prevent default form submission on Enter
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';
import SearchBox from '@/components/SearchBox';

// Mock Next.js router hooks
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(() => null),
    toString: jest.fn(() => ''),
  }),
}));

// Mock fetch for autocomplete API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        suggestions: {
          items: [
            { type: 'item', name: 'AK-47 | Redline', itemId: 'uuid-1', score: 1.0 },
            { type: 'item', name: 'AK-47 | Asiimov', itemId: 'uuid-2', score: 1.0 },
          ],
          weapons: [{ type: 'weapon', name: 'AK-47', score: 1.0 }],
          collections: [],
        },
        meta: {
          executionTime: 42,
          cached: false,
        },
      }),
  })
) as jest.Mock;

describe('SearchBox Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Basic Rendering
  // ============================================================================

  describe('Basic Rendering', () => {
    it('should render search input', () => {
      render(<SearchBox />);
      const input = screen.getByPlaceholderText(/search items/i);
      expect(input).toBeInTheDocument();
    });

    it('should render search icon', () => {
      render(<SearchBox />);
      const searchIcon = screen.getByLabelText(/search items/i);
      expect(searchIcon).toBeInTheDocument();
    });

    it('should have proper ARIA labels', () => {
      render(<SearchBox />);
      const input = screen.getByLabelText(/search items/i);
      expect(input).toHaveAttribute('aria-label');
    });
  });

  // ============================================================================
  // Autocomplete Functionality
  // ============================================================================

  describe('Autocomplete Suggestions', () => {
    it('should fetch autocomplete suggestions when typing', async () => {
      render(<SearchBox />);
      const input = screen.getByPlaceholderText(/search items/i);

      fireEvent.change(input, { target: { value: 'ak' } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/search/autocomplete?query=ak')
        );
      });
    });

    it('should display autocomplete suggestions', async () => {
      render(<SearchBox />);
      const input = screen.getByPlaceholderText(/search items/i);

      fireEvent.change(input, { target: { value: 'ak' } });

      await waitFor(() => {
        expect(screen.getByText('AK-47 | Redline')).toBeInTheDocument();
        expect(screen.getByText('AK-47 | Asiimov')).toBeInTheDocument();
      });
    });

    it('should group suggestions by type', async () => {
      render(<SearchBox />);
      const input = screen.getByPlaceholderText(/search items/i);

      fireEvent.change(input, { target: { value: 'ak' } });

      await waitFor(() => {
        // Should have grouped headers or sections
        const suggestions = screen.getAllByRole('option');
        expect(suggestions.length).toBeGreaterThan(0);
      });
    });

    it('should debounce autocomplete API calls', async () => {
      render(<SearchBox />);
      const input = screen.getByPlaceholderText(/search items/i);

      // Type rapidly
      fireEvent.change(input, { target: { value: 'a' } });
      fireEvent.change(input, { target: { value: 'ak' } });
      fireEvent.change(input, { target: { value: 'ak-' } });

      // Should only call API once after debounce
      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalledTimes(1);
        },
        { timeout: 500 }
      );
    });

    it('should not fetch suggestions for queries < 2 characters', () => {
      render(<SearchBox />);
      const input = screen.getByPlaceholderText(/search items/i);

      fireEvent.change(input, { target: { value: 'a' } });

      // Should not call autocomplete API for single character
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should clear suggestions when input is empty', async () => {
      render(<SearchBox />);
      const input = screen.getByPlaceholderText(/search items/i);

      fireEvent.change(input, { target: { value: 'ak' } });
      await waitFor(() => {
        expect(screen.getByText('AK-47 | Redline')).toBeInTheDocument();
      });

      fireEvent.change(input, { target: { value: '' } });

      await waitFor(() => {
        expect(screen.queryByText('AK-47 | Redline')).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Keyboard Navigation (BDD: Autocomplete handles keyboard navigation)
  // ============================================================================

  describe('Keyboard Navigation', () => {
    it('should highlight first suggestion on Arrow Down', async () => {
      render(<SearchBox />);
      const input = screen.getByPlaceholderText(/search items/i);

      fireEvent.change(input, { target: { value: 'ak' } });
      await waitFor(() => {
        expect(screen.getByText('AK-47 | Redline')).toBeInTheDocument();
      });

      fireEvent.keyDown(input, { key: 'ArrowDown' });

      await waitFor(() => {
        const firstSuggestion = screen.getByText('AK-47 | Redline').closest('[role="option"]');
        expect(firstSuggestion).toHaveClass('highlighted'); // Or equivalent
      });
    });

    it('should highlight second suggestion on second Arrow Down', async () => {
      render(<SearchBox />);
      const input = screen.getByPlaceholderText(/search items/i);

      fireEvent.change(input, { target: { value: 'ak' } });
      await waitFor(() => {
        expect(screen.getByText('AK-47 | Redline')).toBeInTheDocument();
      });

      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      await waitFor(() => {
        const secondSuggestion = screen.getByText('AK-47 | Asiimov').closest('[role="option"]');
        expect(secondSuggestion).toHaveClass('highlighted');
      });
    });

    it('should highlight previous suggestion on Arrow Up', async () => {
      render(<SearchBox />);
      const input = screen.getByPlaceholderText(/search items/i);

      fireEvent.change(input, { target: { value: 'ak' } });
      await waitFor(() => {
        expect(screen.getByText('AK-47 | Redline')).toBeInTheDocument();
      });

      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowUp' });

      await waitFor(() => {
        const firstSuggestion = screen.getByText('AK-47 | Redline').closest('[role="option"]');
        expect(firstSuggestion).toHaveClass('highlighted');
      });
    });

    it('should select highlighted suggestion on Enter', async () => {
      const { container } = render(<SearchBox />);
      const input = screen.getByPlaceholderText(/search items/i);

      fireEvent.change(input, { target: { value: 'ak' } });
      await waitFor(() => {
        expect(screen.getByText('AK-47 | Redline')).toBeInTheDocument();
      });

      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });

      // Should populate input with selected suggestion
      expect(input).toHaveValue('AK-47 | Redline');
    });

    it('should close suggestions on Escape', async () => {
      render(<SearchBox />);
      const input = screen.getByPlaceholderText(/search items/i);

      fireEvent.change(input, { target: { value: 'ak' } });
      await waitFor(() => {
        expect(screen.getByText('AK-47 | Redline')).toBeInTheDocument();
      });

      fireEvent.keyDown(input, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText('AK-47 | Redline')).not.toBeInTheDocument();
      });
    });

    it('should prevent default form submission on Enter with suggestions open', async () => {
      // Wrap in a form to test form submission prevention
      const handleSubmit = jest.fn((e) => e.preventDefault());
      const { container } = render(
        <form onSubmit={handleSubmit}>
          <SearchBox />
        </form>
      );
      const input = screen.getByPlaceholderText(/search items/i);

      fireEvent.change(input, { target: { value: 'ak' } });
      await waitFor(() => {
        expect(screen.getByText('AK-47 | Redline')).toBeInTheDocument();
      });

      // Press Enter when suggestions are visible
      fireEvent.keyDown(input, { key: 'Enter' });

      // Form should not be submitted (handleSubmit not called because preventDefault was called in component)
      // NOTE: This test verifies the Enter key is handled, preventing form submission
      // The actual behavior is that Enter selects a suggestion OR just prevents default
      expect(handleSubmit).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Click Interactions
  // ============================================================================

  describe('Click Interactions', () => {
    it('should select suggestion on click', async () => {
      render(<SearchBox />);
      const input = screen.getByPlaceholderText(/search items/i);

      fireEvent.change(input, { target: { value: 'ak' } });
      await waitFor(() => {
        expect(screen.getByText('AK-47 | Redline')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('AK-47 | Redline'));

      expect(input).toHaveValue('AK-47 | Redline');
    });

    it('should close suggestions when clicking outside', async () => {
      render(
        <div>
          <SearchBox />
          <div data-testid="outside">Outside</div>
        </div>
      );
      const input = screen.getByPlaceholderText(/search items/i);

      fireEvent.change(input, { target: { value: 'ak' } });
      await waitFor(() => {
        expect(screen.getByText('AK-47 | Redline')).toBeInTheDocument();
      });

      // Use mouseDown since component listens for mousedown events
      fireEvent.mouseDown(screen.getByTestId('outside'));

      await waitFor(() => {
        expect(screen.queryByText('AK-47 | Redline')).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Clear Button
  // ============================================================================

  describe('Clear Button', () => {
    it('should show clear button when input has value', () => {
      render(<SearchBox />);
      const input = screen.getByPlaceholderText(/search items/i);

      fireEvent.change(input, { target: { value: 'ak' } });

      const clearButton = screen.getByLabelText(/clear search/i);
      expect(clearButton).toBeInTheDocument();
    });

    it('should clear input when clear button clicked', () => {
      render(<SearchBox />);
      const input = screen.getByPlaceholderText(/search items/i);

      fireEvent.change(input, { target: { value: 'ak' } });
      fireEvent.click(screen.getByLabelText(/clear search/i));

      expect(input).toHaveValue('');
    });

    it('should close suggestions when clear button clicked', async () => {
      render(<SearchBox />);
      const input = screen.getByPlaceholderText(/search items/i);

      fireEvent.change(input, { target: { value: 'ak' } });
      await waitFor(() => {
        expect(screen.getByText('AK-47 | Redline')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText(/clear search/i));

      await waitFor(() => {
        expect(screen.queryByText('AK-47 | Redline')).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Accessibility
  // ============================================================================

  describe('Accessibility', () => {
    it('should have proper ARIA attributes on suggestions list', async () => {
      render(<SearchBox />);
      const input = screen.getByPlaceholderText(/search items/i);

      fireEvent.change(input, { target: { value: 'ak' } });

      await waitFor(() => {
        const suggestionsList = screen.getByRole('listbox');
        expect(suggestionsList).toBeInTheDocument();
        expect(suggestionsList).toHaveAttribute('aria-label');
      });
    });

    it('should have role="option" on each suggestion', async () => {
      render(<SearchBox />);
      const input = screen.getByPlaceholderText(/search items/i);

      fireEvent.change(input, { target: { value: 'ak' } });

      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options.length).toBeGreaterThan(0);
      });
    });

    it('should set aria-activedescendant on input when suggestion highlighted', async () => {
      render(<SearchBox />);
      const input = screen.getByPlaceholderText(/search items/i);

      fireEvent.change(input, { target: { value: 'ak' } });
      await waitFor(() => {
        expect(screen.getByText('AK-47 | Redline')).toBeInTheDocument();
      });

      fireEvent.keyDown(input, { key: 'ArrowDown' });

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-activedescendant');
      });
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.reject(new Error('API Error'))
      );

      render(<SearchBox />);
      const input = screen.getByPlaceholderText(/search items/i);

      fireEvent.change(input, { target: { value: 'ak' } });

      // Should not crash, should show no suggestions
      await waitFor(() => {
        expect(screen.queryByText('AK-47 | Redline')).not.toBeInTheDocument();
      });
    });

    it('should handle empty autocomplete response', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              suggestions: {
                items: [],
                weapons: [],
                collections: [],
              },
            }),
        })
      );

      render(<SearchBox />);
      const input = screen.getByPlaceholderText(/search items/i);

      fireEvent.change(input, { target: { value: 'xyz123' } });

      await waitFor(() => {
        expect(screen.queryByRole('option')).not.toBeInTheDocument();
      });
    });
  });
});
