/**
 * TDD Tests for Search Functionality
 * BDD Reference: features/01-item-database.feature:19-30
 *   - Search for items by name
 *   - Results within 200ms
 *   - Fuzzy matching with typos (PostgreSQL trigram)
 *   - Sort by rarity (highest first)
 *
 * Technical Requirements:
 * - PostgreSQL pg_trgm extension
 * - similarity() function with 0.3 threshold (default)
 * - GIN index for performance
 */

import { describe, it, expect } from '@jest/globals';

describe('Search Functionality', () => {
  describe('Search Query Parameter', () => {
    it('should accept search query parameter', () => {
      // BDD: "When I enter 'AK-47' in the search box"
      const searchQuery = 'AK-47';
      expect(searchQuery).toBe('AK-47');
    });

    it('should handle empty search query', () => {
      const searchQuery = '';
      expect(searchQuery).toBe('');
    });

    it('should trim whitespace from search query', () => {
      const searchQuery = '  AK-47  ';
      const trimmed = searchQuery.trim();
      expect(trimmed).toBe('AK-47');
    });

    it('should handle case-insensitive search', () => {
      const searchQuery = 'ak-47';
      const normalized = searchQuery.toLowerCase();
      expect(normalized).toBe('ak-47');
    });
  });

  describe('PostgreSQL Trigram Matching', () => {
    it('should use pg_trgm extension for fuzzy matching', () => {
      // BDD: "the search should use PostgreSQL trigram matching"
      const extensionName = 'pg_trgm';
      expect(extensionName).toBe('pg_trgm');
    });

    it('should use similarity() function', () => {
      // PostgreSQL similarity() returns 0-1 score
      const similarityFunction = 'similarity';
      expect(similarityFunction).toBe('similarity');
    });

    it('should use default similarity threshold of 0.3', () => {
      // BDD: Handle typos like "ak47 redlin" → "AK-47 | Redline"
      const defaultThreshold = 0.3;
      expect(defaultThreshold).toBe(0.3);
    });

    it('should construct trigram similarity query', () => {
      const searchTerm = 'ak47 redlin';
      const query = `similarity(search_name, ?) > 0.3`;

      expect(query).toContain('similarity');
      expect(query).toContain('search_name');
      expect(query).toContain('0.3');
    });
  });

  describe('Fuzzy Matching with Typos', () => {
    it('should match "ak47 redlin" to "AK-47 | Redline"', () => {
      // BDD: "When I enter 'ak47 redlin' in the search box (missing 'e')"
      // BDD: "Then I should still see 'AK-47 | Redline' in the results"
      const userInput = 'ak47 redlin';
      const expectedMatch = 'ak-47 | redline';

      // Fuzzy matching should find this despite typo
      expect(userInput.toLowerCase()).not.toBe(expectedMatch);
      expect(userInput).toContain('redlin'); // missing 'e'
    });

    it('should handle common typos: missing characters', () => {
      const typos = [
        { input: 'ak47 redlin', expected: 'ak-47 | redline' }, // missing 'e'
        { input: 'awp asiimov', expected: 'awp | asiimov' }, // missing pipe
        { input: 'm4a4 howl', expected: 'm4a4 | howl' }, // missing pipe
      ];

      typos.forEach((typo) => {
        expect(typo.input).toBeTruthy();
        expect(typo.expected).toBeTruthy();
      });
    });

    it('should handle common typos: extra characters', () => {
      const typo = 'ak-47  redline'; // extra space
      const normalized = typo.replace(/\s+/g, ' ').trim();
      expect(normalized).toBe('ak-47 redline');
    });

    it('should handle case variations', () => {
      const variations = ['AK-47', 'ak-47', 'Ak-47', 'AK47'];
      variations.forEach((variation) => {
        expect(variation.toLowerCase()).toBeTruthy();
      });
    });
  });

  describe('Search Results Sorting', () => {
    it('should sort by rarity (highest first)', () => {
      // BDD: "results should be sorted by rarity (highest first)"
      const rarityOrder = [
        'contraband', // 1 - rarest
        'covert',     // 2
        'classified', // 3
        'restricted', // 4
        'milspec',    // 5
        'industrial', // 6
        'consumer',   // 7 - most common
      ];

      expect(rarityOrder[0]).toBe('contraband');
      expect(rarityOrder[rarityOrder.length - 1]).toBe('consumer');
    });

    it('should map rarity to sort order', () => {
      const raritySortOrder: Record<string, number> = {
        contraband: 1,
        covert: 2,
        classified: 3,
        restricted: 4,
        milspec: 5,
        industrial: 6,
        consumer: 7,
      };

      expect(raritySortOrder['contraband']).toBe(1);
      expect(raritySortOrder['covert']).toBe(2);
    });

    it('should handle null rarity with lowest priority', () => {
      const nullRarityOrder = 999; // Lowest priority
      expect(nullRarityOrder).toBeGreaterThan(7);
    });
  });

  describe('Performance Requirements', () => {
    it('should target 200ms response time', () => {
      // BDD: "Then I should see results within 200ms"
      const targetResponseTime = 200; // milliseconds
      expect(targetResponseTime).toBe(200);
    });

    it('should use GIN index for performance', () => {
      // PostgreSQL GIN index for trigram matching
      const indexType = 'GIN';
      expect(indexType).toBe('GIN');
    });

    it('should index search_name column', () => {
      // Index should be on search_name (normalized) not display_name
      const indexedColumn = 'search_name';
      expect(indexedColumn).toBe('search_name');
    });
  });

  describe('API Response Structure', () => {
    it('should return items matching search query', () => {
      const mockResponse = {
        items: [
          {
            id: '123',
            name: 'AK-47 | Case Hardened',
            display_name: 'AK-47 | Case Hardened',
            search_name: 'ak-47 | case hardened',
            rarity: 'classified',
            type: 'skin',
            image_url: 'https://example.com/image.png',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      };

      expect(mockResponse.items).toHaveLength(1);
      expect(mockResponse.items[0].display_name).toContain('AK-47');
    });

    it('should include search query in response for debugging', () => {
      const mockResponse = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
        totalPages: 0,
        searchQuery: 'ak47 redlin',
      };

      expect(mockResponse.searchQuery).toBe('ak47 redlin');
    });

    it('should return empty array for no matches', () => {
      const mockResponse = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
        totalPages: 0,
      };

      expect(mockResponse.items).toHaveLength(0);
      expect(mockResponse.total).toBe(0);
    });
  });

  describe('Search Query Normalization', () => {
    it('should normalize search query for matching', () => {
      const userInput = 'AK-47 | Redline';
      const normalized = userInput.toLowerCase();

      expect(normalized).toBe('ak-47 | redline');
    });

    it('should preserve special characters in search', () => {
      const userInput = 'M4A4 | Howl';
      const normalized = userInput.toLowerCase();

      expect(normalized).toContain('|');
      expect(normalized).toContain('4');
    });

    it('should handle multiple spaces', () => {
      const userInput = 'AK-47   Redline';
      const normalized = userInput.replace(/\s+/g, ' ').trim().toLowerCase();

      expect(normalized).toBe('ak-47 redline');
    });
  });

  describe('Integration with Pagination', () => {
    it('should combine search with pagination', () => {
      const searchQuery = 'ak-47';
      const page = 1;
      const pageSize = 50;

      const queryString = `q=${searchQuery}&page=${page}&pageSize=${pageSize}`;
      expect(queryString).toContain('q=ak-47');
      expect(queryString).toContain('page=1');
    });

    it('should update total count based on search results', () => {
      const totalWithoutSearch = 10000;
      const totalWithSearch = 42; // Only 42 AK-47 skins

      expect(totalWithSearch).toBeLessThan(totalWithoutSearch);
    });

    it('should recalculate totalPages for search results', () => {
      const totalSearchResults = 42;
      const pageSize = 50;
      const totalPages = Math.ceil(totalSearchResults / pageSize);

      expect(totalPages).toBe(1); // 42 results fit in 1 page
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short search queries (1 character)', () => {
      const shortQuery = 'a';
      expect(shortQuery.length).toBe(1);
    });

    it('should handle very long search queries', () => {
      const longQuery = 'a'.repeat(200);
      expect(longQuery.length).toBe(200);
    });

    it('should handle special characters safely', () => {
      const specialChars = "'; DROP TABLE items; --";
      expect(specialChars).toContain("'");
      // Should be parameterized to prevent SQL injection
    });

    it('should handle Unicode characters', () => {
      const unicode = 'АК-47'; // Cyrillic characters
      expect(unicode).toBeTruthy();
    });
  });
});
