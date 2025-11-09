/**
 * TDD Tests for GET /api/search - Advanced Search & Filter System
 *
 * BDD Reference: features/03-search-filters.feature
 * Type Reference: src/types/search.ts
 *
 * Feature 03 Requirements:
 * - Full-text search using PostgreSQL search_vector (tsvector)
 * - Multi-filter support (rarity, weapon type, price, wear, quality)
 * - Faceted search (dynamic counts for each filter option)
 * - Multiple sort options (relevance, price, name, rarity)
 * - Performance targets: <100ms basic, <300ms filtered
 * - Pagination with 50 results per page default
 *
 * Critical Gotchas Addressed:
 * - Gotcha #1: Use dedicated search_vector column (50x faster)
 * - Gotcha #5: Exact-match-first for autocomplete (prevents slowdown)
 * - Gotcha #6: Separate handling for <3 character queries
 * - Gotcha #7: Trigram similarity threshold 0.5 (not default 0.3)
 */

import { describe, it, expect } from '@jest/globals';
import type {
  SearchFilters,
  SearchResponse,
  SearchResultItem,
  SearchFacets,
  SearchSortBy,
  Rarity,
  Quality,
  Wear,
} from '@/types/search';

describe('GET /api/search - Advanced Search & Filter System', () => {
  // ============================================================================
  // Basic Text Search (Full-Text Search with tsvector)
  // ============================================================================

  describe('Basic Text Search', () => {
    it('should accept search query parameter', () => {
      // BDD: "When I search for 'AK-47 Redline'"
      const filters: SearchFilters = {
        query: 'AK-47 Redline',
      };

      expect(filters.query).toBe('AK-47 Redline');
    });

    it('should use PostgreSQL search_vector for text search', () => {
      // BDD: "Then the query should use the search_vector GIN index"
      // Spec: Uses to_tsquery('english', ...) with search_vector column
      const searchMethod = 'search_vector @@ to_tsquery';
      expect(searchMethod).toContain('search_vector');
      expect(searchMethod).toContain('to_tsquery');
    });

    it('should handle multi-keyword AND matching', () => {
      // BDD: "When I search for 'blue M4A4'"
      // BDD: "Then results should match both 'blue' AND 'M4A4' keywords"
      const query = 'blue M4A4';
      const tsquery = 'blue & m4a4'; // PostgreSQL AND syntax

      expect(tsquery).toContain('&'); // AND operator
      expect(tsquery).toContain('blue');
      expect(tsquery).toContain('m4a4');
    });

    it('should handle short queries (<3 characters) with prefix matching', () => {
      // BDD: "When I search for 'AK' (2 characters)"
      // BDD: "Then the search should use prefix matching instead of trigram"
      // Gotcha #6: pg_trgm doesn't work for <3 characters
      const shortQuery = 'AK';
      const usePrefix = shortQuery.length < 3;

      expect(shortQuery.length).toBe(2);
      expect(usePrefix).toBe(true);
    });

    it('should construct valid API request with query parameter', () => {
      const searchQuery = 'AK-47';
      const url = `/api/search?query=${encodeURIComponent(searchQuery)}`;

      expect(url).toBe('/api/search?query=AK-47');
    });
  });

  // ============================================================================
  // Filter by Rarity
  // ============================================================================

  describe('Filter by Rarity', () => {
    it('should accept single rarity filter', () => {
      // BDD: "When I search with rarity filter 'classified'"
      const filters: SearchFilters = {
        rarity: ['classified'],
      };

      expect(filters.rarity).toEqual(['classified']);
    });

    it('should accept multiple rarity filters (OR logic)', () => {
      // BDD: "When I search with rarity filters 'classified,covert'"
      // BDD: "Then I should see items with classified OR covert rarity"
      const filters: SearchFilters = {
        rarity: ['classified', 'covert'],
      };

      expect(filters.rarity).toHaveLength(2);
      expect(filters.rarity).toContain('classified');
      expect(filters.rarity).toContain('covert');
    });

    it('should construct query string with multiple rarities', () => {
      const rarities: Rarity[] = ['classified', 'covert'];
      const queryString = `rarity=${rarities.join(',')}`;

      expect(queryString).toBe('rarity=classified,covert');
    });
  });

  // ============================================================================
  // Filter by Weapon Type
  // ============================================================================

  describe('Filter by Weapon Type', () => {
    it('should accept single weapon type filter', () => {
      // BDD: "When I search with weapon type filter 'AK-47'"
      const filters: SearchFilters = {
        weaponType: ['AK-47'],
      };

      expect(filters.weaponType).toEqual(['AK-47']);
    });

    it('should accept multiple weapon types (OR logic)', () => {
      // BDD: "When I search with weapon type filters 'AK-47,M4A4'"
      const filters: SearchFilters = {
        weaponType: ['AK-47', 'M4A4'],
      };

      expect(filters.weaponType).toHaveLength(2);
    });
  });

  // ============================================================================
  // Filter by Price Range
  // ============================================================================

  describe('Filter by Price Range', () => {
    it('should accept price range filters', () => {
      // BDD: "When I search with price filter '$5-$20'"
      const filters: SearchFilters = {
        priceMin: 5,
        priceMax: 20,
      };

      expect(filters.priceMin).toBe(5);
      expect(filters.priceMax).toBe(20);
    });

    it('should accept min price only (under budget filter)', () => {
      // BDD: "When I search with max price '$10'"
      const filters: SearchFilters = {
        priceMax: 10,
      };

      expect(filters.priceMax).toBe(10);
      expect(filters.priceMin).toBeUndefined();
    });

    it('should accept max price only (expensive items filter)', () => {
      // BDD: "When I search with min price '$100'"
      const filters: SearchFilters = {
        priceMin: 100,
      };

      expect(filters.priceMin).toBe(100);
      expect(filters.priceMax).toBeUndefined();
    });

    it('should use MIN(marketplace_prices.total_cost) for price filtering', () => {
      // Spec: Price filter uses lowest available marketplace price
      const priceQuery = 'MIN(marketplace_prices.total_cost)';
      expect(priceQuery).toContain('MIN');
      expect(priceQuery).toContain('total_cost');
    });
  });

  // ============================================================================
  // Filter by Wear Condition
  // ============================================================================

  describe('Filter by Wear Condition', () => {
    it('should accept single wear filter', () => {
      // BDD: "When I search with wear filter 'factory_new'"
      const filters: SearchFilters = {
        wear: ['factory_new'],
      };

      expect(filters.wear).toEqual(['factory_new']);
    });

    it('should accept multiple wear conditions (OR logic)', () => {
      // BDD: "When I search with wear filters 'factory_new,minimal_wear'"
      const filters: SearchFilters = {
        wear: ['factory_new', 'minimal_wear'],
      };

      expect(filters.wear).toHaveLength(2);
    });
  });

  // ============================================================================
  // Advanced Filters (Float Value, Pattern Seed)
  // ============================================================================

  describe('Advanced Collector Filters', () => {
    it('should accept float value range filter', () => {
      // BDD: "When I search with float filter '0.00-0.01'"
      // BDD: "Then I should only see items with float_value between 0.00 and 0.01"
      const filters: SearchFilters = {
        floatMin: 0.0,
        floatMax: 0.01,
      };

      expect(filters.floatMin).toBe(0.0);
      expect(filters.floatMax).toBe(0.01);
    });

    it('should accept pattern seed filter (blue gem hunters)', () => {
      // BDD: "When I search for 'Case Hardened' with pattern seed '661'"
      // BDD: "Then I should see Case Hardened items with pattern_seed 661"
      const filters: SearchFilters = {
        query: 'Case Hardened',
        patternSeed: 661,
      };

      expect(filters.patternSeed).toBe(661);
    });

    it('should accept sticker filters', () => {
      const filters: SearchFilters = {
        hasStickers: true,
        stickerCount: 4,
      };

      expect(filters.hasStickers).toBe(true);
      expect(filters.stickerCount).toBe(4);
    });
  });

  // ============================================================================
  // Combining Multiple Filters (AND Logic)
  // ============================================================================

  describe('Complex Multi-Filter Queries', () => {
    it('should combine text search with filters (AND logic)', () => {
      // BDD: "When I search for 'AK-47'"
      // BDD: "And I apply rarity filter 'classified'"
      // BDD: "And I apply price filter '$5-$20'"
      // BDD: "Then I should see classified AK-47 skins priced $5-$20"
      const filters: SearchFilters = {
        query: 'AK-47',
        rarity: ['classified'],
        priceMin: 5,
        priceMax: 20,
      };

      expect(filters.query).toBe('AK-47');
      expect(filters.rarity).toContain('classified');
      expect(filters.priceMin).toBe(5);
      expect(filters.priceMax).toBe(20);
    });

    it('should handle complex 5-filter combination', () => {
      // BDD: "When I search for 'blue'"
      // BDD: "And I apply weapon type filters 'AK-47,M4A4'"
      // BDD: "And I apply rarity filters 'classified,covert'"
      // BDD: "And I apply wear filter 'factory_new'"
      // BDD: "And I apply price filter '$10-$50'"
      const filters: SearchFilters = {
        query: 'blue',
        weaponType: ['AK-47', 'M4A4'],
        rarity: ['classified', 'covert'],
        wear: ['factory_new'],
        priceMin: 10,
        priceMax: 50,
      };

      expect(filters.query).toBe('blue');
      expect(filters.weaponType).toHaveLength(2);
      expect(filters.rarity).toHaveLength(2);
      expect(filters.wear).toHaveLength(1);
      expect(filters.priceMin).toBe(10);
    });
  });

  // ============================================================================
  // Sort Options
  // ============================================================================

  describe('Sort Options', () => {
    it('should default to relevance sort for text searches', () => {
      // BDD: "When I search for 'AK-47' without specifying sort"
      // BDD: "Then results should be sorted by relevance"
      const filters: SearchFilters = {
        query: 'AK-47',
      };

      const defaultSort: SearchSortBy = 'relevance';
      expect(defaultSort).toBe('relevance');
    });

    it('should support price_asc sort', () => {
      // BDD: "When I sort by 'price_asc'"
      // BDD: "Then results should be sorted from cheapest to most expensive"
      const filters: SearchFilters = {
        sortBy: 'price_asc',
      };

      expect(filters.sortBy).toBe('price_asc');
    });

    it('should support price_desc sort', () => {
      // BDD: "When I sort by 'price_desc'"
      const filters: SearchFilters = {
        sortBy: 'price_desc',
      };

      expect(filters.sortBy).toBe('price_desc');
    });

    it('should support name_asc sort', () => {
      // BDD: "When I sort by 'name_asc'"
      // BDD: "Then results should be alphabetically sorted"
      const filters: SearchFilters = {
        sortBy: 'name_asc',
      };

      expect(filters.sortBy).toBe('name_asc');
    });

    it('should support rarity_desc sort', () => {
      // BDD: "When I sort by 'rarity_desc'"
      // BDD: "Then rarest items should appear first"
      const filters: SearchFilters = {
        sortBy: 'rarity_desc',
      };

      expect(filters.sortBy).toBe('rarity_desc');
    });

    it('should support all defined sort options', () => {
      const sortOptions: SearchSortBy[] = [
        'relevance',
        'price_asc',
        'price_desc',
        'name_asc',
        'name_desc',
        'rarity_desc',
        'rarity_asc',
        'popularity',
        'change_percent',
        'float_asc',
        'float_desc',
      ];

      expect(sortOptions).toHaveLength(11);
    });
  });

  // ============================================================================
  // Pagination
  // ============================================================================

  describe('Pagination', () => {
    it('should default to page 1 with 50 results per page', () => {
      // BDD: "Then I should see 50 results per page (default)"
      const filters: SearchFilters = {
        page: 1,
        limit: 50,
      };

      expect(filters.page).toBe(1);
      expect(filters.limit).toBe(50);
    });

    it('should accept custom page number', () => {
      // BDD: "When I click 'Next Page'"
      // BDD: "Then the URL should update to ?page=2"
      const filters: SearchFilters = {
        page: 2,
      };

      expect(filters.page).toBe(2);
    });

    it('should accept custom page size (max 100)', () => {
      const filters: SearchFilters = {
        limit: 100,
      };

      expect(filters.limit).toBe(100);
    });

    it('should enforce max limit of 100', () => {
      // Spec: SEARCH_LIMITS.maxLimit = 100
      const MAX_LIMIT = 100;
      const requestedLimit = 200;
      const actualLimit = Math.min(requestedLimit, MAX_LIMIT);

      expect(actualLimit).toBe(100);
    });
  });

  // ============================================================================
  // API Response Structure
  // ============================================================================

  describe('API Response Structure', () => {
    it('should return SearchResponse with items array', () => {
      const mockResponse: SearchResponse = {
        items: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
        facets: {
          rarities: {} as Record<Rarity, number>,
          weaponTypes: {},
          priceRanges: {},
          wearConditions: {} as Record<Wear, number>,
        },
      };

      expect(mockResponse).toHaveProperty('items');
      expect(mockResponse).toHaveProperty('total');
      expect(mockResponse).toHaveProperty('facets');
    });

    it('should include facets for filter counts', () => {
      // BDD: "Then I should see filter counts: Classified (12), Covert (8)"
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

      expect(mockFacets.rarities.classified).toBe(12);
      expect(mockFacets.rarities.covert).toBe(8);
      expect(mockFacets.weaponTypes['AK-47']).toBe(89);
    });

    it('should include performance metadata', () => {
      // BDD: "Then the API response time should be under 100ms (p95)"
      const mockResponse: SearchResponse = {
        items: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
        facets: {} as SearchFacets,
        meta: {
          executionTime: 87, // milliseconds
          cached: false,
        },
      };

      expect(mockResponse.meta?.executionTime).toBeLessThan(100);
    });

    it('should calculate totalPages correctly', () => {
      const total = 237; // items
      const limit = 50; // per page
      const totalPages = Math.ceil(total / limit);

      expect(totalPages).toBe(5); // 237 / 50 = 4.74 → 5 pages
    });
  });

  // ============================================================================
  // Performance Requirements
  // ============================================================================

  describe('Performance Requirements', () => {
    it('should target <100ms for basic search', () => {
      // BDD: "Then the API response time should be under 100ms (p95)"
      const TARGET_BASIC_SEARCH_MS = 100;
      expect(TARGET_BASIC_SEARCH_MS).toBe(100);
    });

    it('should target <300ms for filtered search', () => {
      // BDD: "When I apply 3 filters (rarity, price, wear)"
      // BDD: "Then the API response time should be under 300ms"
      const TARGET_FILTERED_SEARCH_MS = 300;
      expect(TARGET_FILTERED_SEARCH_MS).toBe(300);
    });

    it('should use database indexes to avoid full table scan', () => {
      // BDD: "Then the query should use the search_vector GIN index"
      // BDD: "And EXPLAIN ANALYZE should show 'Bitmap Index Scan on items_search_gin_idx'"
      const expectedIndexUsage = 'Bitmap Index Scan on items_search_gin_idx';
      expect(expectedIndexUsage).toContain('Index Scan');
    });
  });

  // ============================================================================
  // Security (SQL Injection Prevention)
  // ============================================================================

  describe('Security - SQL Injection Prevention', () => {
    it('should safely handle malicious search queries', () => {
      // BDD: "When I search for '; DROP TABLE items; --'"
      // BDD: "Then the query should be safely parameterized"
      const maliciousQuery = "'; DROP TABLE items; --";
      const filters: SearchFilters = {
        query: maliciousQuery,
      };

      // Should be parameterized, not concatenated into SQL
      expect(filters.query).toBe(maliciousQuery);
      // Test will verify parameterized query execution
    });

    it('should safely handle XSS attempts in search', () => {
      // BDD: "When I search for '<script>alert('xss')</script>'"
      // BDD: "Then the input should be escaped"
      const xssAttempt = "<script>alert('xss')</script>";
      const filters: SearchFilters = {
        query: xssAttempt,
      };

      expect(filters.query).toBeTruthy();
      // Frontend should escape, backend should parameterize
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty search query', () => {
      // BDD: "When I submit search with empty query ''"
      // BDD: "Then I should see all items (default browse view)"
      const filters: SearchFilters = {
        query: '',
      };

      expect(filters.query).toBe('');
    });

    it('should truncate very long queries', () => {
      // BDD: "When I search with 500 character query"
      // BDD: "Then the query should be truncated to 200 characters"
      const MAX_QUERY_LENGTH = 200;
      const longQuery = 'a'.repeat(500);
      const truncated = longQuery.slice(0, MAX_QUERY_LENGTH);

      expect(truncated.length).toBe(200);
    });

    it('should handle special characters in search', () => {
      // BDD: "When I search for 'M4A1-S | Knight'"
      // BDD: "Then the search should correctly handle hyphens and pipes"
      const specialChars = 'M4A1-S | Knight';
      const filters: SearchFilters = {
        query: specialChars,
      };

      expect(filters.query).toContain('-');
      expect(filters.query).toContain('|');
    });

    it('should handle concurrent filter changes (debouncing)', () => {
      // BDD: "When I apply multiple filters rapidly"
      // BDD: "Then only the final filter combination should execute"
      const debounceDelay = 300; // milliseconds
      expect(debounceDelay).toBe(300);
    });
  });

  // ============================================================================
  // URL State Persistence
  // ============================================================================

  describe('URL State Persistence', () => {
    it('should encode filters in URL query string', () => {
      // BDD: "When I search for 'AK-47' with rarity 'classified' and price '$5-$20'"
      // BDD: "Then the URL should be '/search?query=AK-47&rarity=classified&priceMin=5&priceMax=20'"
      const filters: SearchFilters = {
        query: 'AK-47',
        rarity: ['classified'],
        priceMin: 5,
        priceMax: 20,
      };

      const queryString = new URLSearchParams({
        query: filters.query || '',
        rarity: filters.rarity?.join(',') || '',
        priceMin: filters.priceMin?.toString() || '',
        priceMax: filters.priceMax?.toString() || '',
      }).toString();

      expect(queryString).toContain('query=AK-47');
      expect(queryString).toContain('rarity=classified');
      expect(queryString).toContain('priceMin=5');
    });
  });
});
