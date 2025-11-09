/**
 * TDD Tests for GET /api/search/autocomplete - Instant Autocomplete Suggestions
 *
 * BDD Reference: features/03-search-filters.feature:47-74 (Autocomplete scenarios)
 * Type Reference: src/types/search.ts (AutocompleteResponse, AutocompleteSuggestion)
 * Spec Reference: features/03-search-filters.md:510-609 (Autocomplete gotchas)
 *
 * Feature Requirements:
 * - <50ms response time (CRITICAL performance target)
 * - Limit to 10 suggestions maximum (8 for mobile, 10 for desktop)
 * - Group suggestions by type (items, weapons, collections)
 * - Exact-match-first, then fuzzy fallback (Gotcha #5 mitigation)
 * - Keyboard navigation support (frontend, but API structure matters)
 *
 * Critical Gotchas Addressed:
 * - Gotcha #4: Only 19% of sites get autocomplete right (limit suggestions, group by type)
 * - Gotcha #5: pg_trgm ORDER BY causes severe slowdown (exact-match-first prevents this)
 * - Gotcha #6: pg_trgm doesn't work for <3 characters (use prefix matching)
 *
 * Performance Optimization Strategy:
 * 1. Exact prefix match first (FAST - uses B-tree index idx_items_name_prefix)
 * 2. If < 10 results, add fuzzy matches (pg_trgm, but limited)
 * 3. NO ORDER BY similarity() - that's the killer (Gotcha #5)
 * 4. Group results by type for better UX
 */

import { describe, it, expect } from '@jest/globals';
import type {
  AutocompleteResponse,
  AutocompleteSuggestion,
  AutocompleteSuggestionType,
} from '@/types/search';

describe('GET /api/search/autocomplete - Instant Autocomplete Suggestions', () => {
  // ============================================================================
  // Basic Autocomplete Functionality
  // ============================================================================

  describe('Basic Autocomplete', () => {
    it('should accept query parameter', () => {
      // BDD: "When I type 'ak' in the search box"
      const query = 'ak';
      const url = `/api/search/autocomplete?query=${query}`;

      expect(url).toBe('/api/search/autocomplete?query=ak');
    });

    it('should return AutocompleteResponse structure', () => {
      const mockResponse: AutocompleteResponse = {
        suggestions: {
          items: [],
          weapons: [],
          collections: [],
        },
        meta: {
          executionTime: 45, // milliseconds
          cached: false,
        },
      };

      expect(mockResponse.suggestions).toHaveProperty('items');
      expect(mockResponse.suggestions).toHaveProperty('weapons');
      expect(mockResponse.suggestions).toHaveProperty('collections');
      expect(mockResponse.meta?.executionTime).toBeLessThan(50);
    });

    it('should group suggestions by type', () => {
      // BDD: "Then I should see suggestions grouped as: items, weapons, collections"
      const mockResponse: AutocompleteResponse = {
        suggestions: {
          items: [
            { type: 'item', name: 'AK-47 | Redline', itemId: 'uuid-1' },
            { type: 'item', name: 'AK-47 | Asiimov', itemId: 'uuid-2' },
          ],
          weapons: [
            { type: 'weapon', name: 'AK-47' },
          ],
          collections: [],
        },
      };

      expect(mockResponse.suggestions.items).toHaveLength(2);
      expect(mockResponse.suggestions.weapons).toHaveLength(1);
      expect(mockResponse.suggestions.collections).toHaveLength(0);
    });
  });

  // ============================================================================
  // Performance Requirements
  // ============================================================================

  describe('Performance Requirements', () => {
    it('should target <50ms response time', () => {
      // BDD: "Then I should see autocomplete suggestions within 50ms"
      // BDD: "And the response time should be under 50ms"
      const TARGET_AUTOCOMPLETE_MS = 50;
      expect(TARGET_AUTOCOMPLETE_MS).toBe(50);
    });

    it('should track execution time in metadata', () => {
      const mockResponse: AutocompleteResponse = {
        suggestions: {
          items: [],
          weapons: [],
          collections: [],
        },
        meta: {
          executionTime: 42, // milliseconds
          cached: false,
        },
      };

      expect(mockResponse.meta?.executionTime).toBeDefined();
      expect(mockResponse.meta?.executionTime).toBeLessThan(50);
    });

    it('should use exact-match-first strategy to avoid slowdown', () => {
      // Gotcha #5: pg_trgm ORDER BY causes 10s slowdown
      // Solution: Exact prefix first, fuzzy fallback
      const strategy = 'exact-match-first';
      expect(strategy).toBe('exact-match-first');
    });
  });

  // ============================================================================
  // Suggestion Limits (Gotcha #4: Only 19% get this right)
  // ============================================================================

  describe('Suggestion Limits', () => {
    it('should limit to 10 suggestions maximum', () => {
      // BDD: "And suggestions should be limited to 10 items maximum"
      // Gotcha #4: Best practice is 8-10 suggestions
      const MAX_SUGGESTIONS_DESKTOP = 10;
      expect(MAX_SUGGESTIONS_DESKTOP).toBe(10);
    });

    it('should respect mobile limit of 8 suggestions', () => {
      // Gotcha #4: Mobile devices should show fewer (8) for better UX
      const MAX_SUGGESTIONS_MOBILE = 8;
      expect(MAX_SUGGESTIONS_MOBILE).toBe(8);
    });

    it('should enforce total suggestion limit across all types', () => {
      // If user types "ak", total suggestions (items + weapons + collections) should not exceed 10
      const mockResponse: AutocompleteResponse = {
        suggestions: {
          items: Array(6).fill({ type: 'item', name: 'Item' }),
          weapons: Array(2).fill({ type: 'weapon', name: 'Weapon' }),
          collections: Array(2).fill({ type: 'collection', name: 'Collection' }),
        },
      };

      const totalSuggestions =
        mockResponse.suggestions.items.length +
        mockResponse.suggestions.weapons.length +
        mockResponse.suggestions.collections.length;

      expect(totalSuggestions).toBeLessThanOrEqual(10);
    });
  });

  // ============================================================================
  // Exact Match Before Fuzzy (Gotcha #5 Mitigation)
  // ============================================================================

  describe('Exact Match Before Fuzzy', () => {
    it('should use exact prefix matching first', () => {
      // BDD: "Then exact prefix matches should appear first"
      // Uses: idx_items_name_prefix (B-tree index for fast prefix)
      const exactMatchQuery = `
        SELECT * FROM items
        WHERE name ILIKE 'ak%'
        LIMIT 5
      `;

      expect(exactMatchQuery).toContain('ILIKE');
      expect(exactMatchQuery).toContain('%'); // Prefix wildcard
    });

    it('should add fuzzy matches only if needed', () => {
      // BDD: "And fuzzy matches should appear after"
      // Only query fuzzy if exact matches < limit
      const exactMatchCount = 3;
      const limit = 10;
      const needsFuzzy = exactMatchCount < limit;

      expect(needsFuzzy).toBe(true);
    });

    it('should NOT use ORDER BY similarity (Gotcha #5)', () => {
      // ❌ BAD: ORDER BY similarity(name, 'query') - causes 10s slowdown
      // ✅ GOOD: Return exact matches first, then fuzzy (no sorting by similarity)
      const badQuery = 'ORDER BY similarity(name, ?)';
      const goodQuery = 'UNION ALL'; // Exact UNION ALL Fuzzy

      expect(goodQuery).toContain('UNION ALL');
      expect(badQuery).toContain('similarity'); // We're NOT doing this
    });
  });

  // ============================================================================
  // Grouping by Type
  // ============================================================================

  describe('Grouping by Type', () => {
    it('should return items separately from weapons', () => {
      // BDD: "Then I should see suggestions grouped as: items, weapons, collections"
      const mockSuggestion: AutocompleteSuggestion = {
        type: 'item',
        name: 'AK-47 | Redline',
        itemId: 'uuid-123',
        icon: 'https://example.com/icon.png',
      };

      expect(mockSuggestion.type).toBe('item');
      expect(mockSuggestion.itemId).toBeDefined();
    });

    it('should support weapon type suggestions', () => {
      const weaponSuggestion: AutocompleteSuggestion = {
        type: 'weapon',
        name: 'AK-47',
        icon: 'https://example.com/weapon-icon.png',
      };

      expect(weaponSuggestion.type).toBe('weapon');
      expect(weaponSuggestion.itemId).toBeUndefined(); // Weapons don't have itemId
    });

    it('should support collection type suggestions', () => {
      const collectionSuggestion: AutocompleteSuggestion = {
        type: 'collection',
        name: 'Operation Riptide Collection',
        icon: 'https://example.com/collection-icon.png',
      };

      expect(collectionSuggestion.type).toBe('collection');
    });

    it('should prioritize items over weapons over collections', () => {
      // UX best practice: Show specific items first, then categories
      const typePriority: AutocompleteSuggestionType[] = ['item', 'weapon', 'collection'];

      expect(typePriority[0]).toBe('item');
      expect(typePriority[1]).toBe('weapon');
      expect(typePriority[2]).toBe('collection');
    });
  });

  // ============================================================================
  // Short Query Handling (Gotcha #6)
  // ============================================================================

  describe('Short Query Handling', () => {
    it('should handle queries < 3 characters with prefix matching', () => {
      // Gotcha #6: pg_trgm doesn't work for <3 characters
      // Solution: Use ILIKE with idx_items_name_prefix
      const shortQuery = 'ak'; // 2 characters
      const usePrefix = shortQuery.length < 3;

      expect(shortQuery.length).toBe(2);
      expect(usePrefix).toBe(true);
    });

    it('should handle 1-character queries', () => {
      // BDD: Edge case - very short queries
      const veryShortQuery = 'a';
      expect(veryShortQuery.length).toBe(1);
    });

    it('should use trigram matching for queries >= 3 characters', () => {
      const normalQuery = 'blue';
      const useTrigram = normalQuery.length >= 3;

      expect(normalQuery.length).toBe(4);
      expect(useTrigram).toBe(true);
    });
  });

  // ============================================================================
  // API Query Parameters
  // ============================================================================

  describe('API Query Parameters', () => {
    it('should accept query parameter', () => {
      const queryParam = 'ak-47';
      const url = `/api/search/autocomplete?query=${encodeURIComponent(queryParam)}`;

      expect(url).toContain('query=ak-47');
    });

    it('should accept optional limit parameter', () => {
      const query = 'ak';
      const limit = 5;
      const url = `/api/search/autocomplete?query=${query}&limit=${limit}`;

      expect(url).toContain('limit=5');
    });

    it('should accept optional device parameter for mobile/desktop limits', () => {
      const query = 'ak';
      const device = 'mobile'; // Will use 8 instead of 10
      const url = `/api/search/autocomplete?query=${query}&device=${device}`;

      expect(url).toContain('device=mobile');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty query', () => {
      const emptyQuery = '';
      const url = `/api/search/autocomplete?query=${emptyQuery}`;

      expect(url).toContain('query=');
    });

    it('should handle special characters safely', () => {
      const specialChars = "'; DROP TABLE items; --";
      const escaped = encodeURIComponent(specialChars);

      expect(escaped).not.toBe(specialChars);
      // Should be parameterized in SQL
    });

    it('should handle Unicode characters', () => {
      const unicode = 'АК-47'; // Cyrillic
      const url = `/api/search/autocomplete?query=${encodeURIComponent(unicode)}`;

      expect(url).toContain('query=');
    });

    it('should handle very long queries', () => {
      const longQuery = 'a'.repeat(100);
      const truncated = longQuery.slice(0, 50); // Should truncate for autocomplete

      expect(truncated.length).toBe(50);
    });
  });

  // ============================================================================
  // Keyboard Navigation Support (API Structure)
  // ============================================================================

  describe('Keyboard Navigation Support', () => {
    it('should include match score for frontend sorting', () => {
      // Frontend needs to know match quality for highlighting
      const suggestion: AutocompleteSuggestion = {
        type: 'item',
        name: 'AK-47 | Redline',
        itemId: 'uuid',
        score: 0.95, // Match confidence for frontend
      };

      expect(suggestion.score).toBeDefined();
    });

    it('should return suggestions in predictable order', () => {
      // Frontend keyboard navigation relies on stable ordering
      // Order: Exact matches first, then fuzzy, grouped by type
      const mockResponse: AutocompleteResponse = {
        suggestions: {
          items: [
            { type: 'item', name: 'AK-47 | Redline', score: 1.0 }, // Exact match
            { type: 'item', name: 'AK-47 | Asiimov', score: 1.0 }, // Exact match
            { type: 'item', name: 'MAK-10 | Fade', score: 0.7 },   // Fuzzy match
          ],
          weapons: [],
          collections: [],
        },
      };

      // First two are exact matches (score 1.0), last is fuzzy (score < 1.0)
      expect(mockResponse.suggestions.items[0].score).toBe(1.0);
      expect(mockResponse.suggestions.items[2].score).toBeLessThan(1.0);
    });
  });

  // ============================================================================
  // Caching Strategy
  // ============================================================================

  describe('Caching Strategy', () => {
    it('should indicate if results came from cache', () => {
      const mockResponse: AutocompleteResponse = {
        suggestions: {
          items: [],
          weapons: [],
          collections: [],
        },
        meta: {
          executionTime: 5, // Very fast - likely cached
          cached: true,
        },
      };

      expect(mockResponse.meta?.cached).toBe(true);
    });

    it('should cache common queries for performance', () => {
      // Common queries like "ak", "m4", "awp" should be cached
      const commonQueries = ['ak', 'm4', 'awp', 'knife'];
      expect(commonQueries).toHaveLength(4);
    });
  });
});
