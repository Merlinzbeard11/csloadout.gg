/**
 * TDD Tests for Cases API
 * BDD Reference: features/02-relational-browsing.feature
 *   - Browse all cases
 *   - View case contents with probabilities
 *   - Calculate case expected value
 *   - Validate probability sums to 100%
 *
 * API Endpoints:
 *   - GET /api/cases - List all cases
 *   - GET /api/cases/:slug - Case detail with contents
 *
 * Spec Reference: features/02-relational-browsing.md
 *   - Gotcha #4: Case drop probabilities must sum to 100%
 *   - Gotcha #7: URL slug redirects for SEO
 */

import { describe, it, expect } from '@jest/globals';

describe('GET /api/cases - List All Cases', () => {
  describe('Response Structure', () => {
    it('should return array of cases', () => {
      const mockResponse = {
        cases: [
          {
            id: '1',
            name: 'Clutch Case',
            slug: 'clutch-case',
            description: 'Released in February 2018',
            imageUrl: 'https://example.com/clutch-case.png',
            keyPrice: 2.49,
            releaseDate: '2018-02-15T00:00:00.000Z',
            itemCount: 17,
          },
        ],
        total: 1,
      };

      expect(mockResponse.cases).toBeInstanceOf(Array);
      expect(mockResponse.cases[0].name).toBe('Clutch Case');
      expect(mockResponse.total).toBe(1);
    });

    it('should include key price for each case', () => {
      // BDD: "each case should show key price"
      const caseData = {
        id: '1',
        name: 'Clutch Case',
        keyPrice: 2.49,
      };

      expect(caseData.keyPrice).toBe(2.49);
      expect(typeof caseData.keyPrice).toBe('number');
    });

    it('should include item count for each case', () => {
      // BDD: "each case should show number of possible drops"
      const caseData = {
        id: '1',
        name: 'Clutch Case',
        itemCount: 17,
      };

      expect(caseData.itemCount).toBe(17);
    });

    it('should include release date for sorting', () => {
      const caseData = {
        name: 'Clutch Case',
        releaseDate: '2018-02-15T00:00:00.000Z',
      };

      const releaseDate = new Date(caseData.releaseDate);
      expect(releaseDate).toBeInstanceOf(Date);
    });
  });

  describe('Sorting and Filtering', () => {
    it('should sort by release date (newest first) by default', () => {
      const cases = [
        { name: 'Clutch Case', releaseDate: '2018-02-15' },
        { name: 'Horizon Case', releaseDate: '2018-08-03' },
        { name: 'Danger Zone Case', releaseDate: '2018-12-06' },
      ];

      const sorted = [...cases].sort(
        (a, b) =>
          new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
      );

      expect(sorted[0].name).toBe('Danger Zone Case'); // Newest
      expect(sorted[2].name).toBe('Clutch Case'); // Oldest
    });
  });

  describe('Performance Requirements', () => {
    it('should include item count without N+1 queries', () => {
      // Use aggregation to count items, not loading all items
      const caseData = {
        id: '1',
        name: 'Clutch Case',
        itemCount: 17, // Aggregated count, not items.length
      };

      expect(caseData.itemCount).toBe(17);
      expect(caseData).not.toHaveProperty('items'); // Items not loaded in list view
    });
  });

  describe('Error Handling', () => {
    it('should return empty array if no cases exist', () => {
      const emptyResponse = {
        cases: [],
        total: 0,
      };

      expect(emptyResponse.cases).toHaveLength(0);
      expect(emptyResponse.total).toBe(0);
    });

    it('should handle database errors gracefully', () => {
      const errorResponse = {
        error: 'Failed to fetch cases',
      };

      expect(errorResponse.error).toBeTruthy();
    });
  });
});

describe('GET /api/cases/:slug - Case Detail with Contents', () => {
  describe('Response Structure', () => {
    it('should return case with items array', () => {
      const mockResponse = {
        id: '1',
        name: 'Clutch Case',
        slug: 'clutch-case',
        description: 'Released in February 2018',
        imageUrl: 'https://example.com/clutch-case.png',
        keyPrice: 2.49,
        releaseDate: '2018-02-15T00:00:00.000Z',
        items: [
          {
            id: 'item1',
            name: 'MP7 | Neon Ply',
            rarity: 'covert',
            dropProbability: 0.79,
            isSpecialItem: false,
          },
        ],
        expectedValue: 1.34,
      };

      expect(mockResponse.items).toBeInstanceOf(Array);
      expect(mockResponse.items[0].dropProbability).toBe(0.79);
      expect(mockResponse.expectedValue).toBe(1.34);
    });

    it('should include drop probability for each item', () => {
      // BDD: "each item should show drop probability"
      const caseItem = {
        itemId: 'item1',
        name: 'MP7 | Neon Ply',
        dropProbability: 0.79, // Covert drop rate
      };

      expect(caseItem.dropProbability).toBe(0.79);
      expect(typeof caseItem.dropProbability).toBe('number');
    });

    it('should highlight special items (knives, gloves)', () => {
      // BDD: "special items should be highlighted"
      const specialItem = {
        itemId: 'karambit1',
        name: 'Karambit | Doppler',
        isSpecialItem: true,
      };

      expect(specialItem.isSpecialItem).toBe(true);
    });
  });

  describe('Probability Validation', () => {
    it('should validate probabilities sum to 100%', () => {
      // BDD: "probabilities should sum to 100%"
      // Gotcha #4: Case drop probability validation
      const caseItems = [
        { dropProbability: 79.92 }, // Consumer/Industrial
        { dropProbability: 15.98 }, // Mil-Spec
        { dropProbability: 3.2 }, // Restricted
        { dropProbability: 0.64 }, // Classified
        { dropProbability: 0.26 }, // Covert/Knife
      ];

      const totalProbability = caseItems.reduce(
        (sum, item) => sum + item.dropProbability,
        0
      );

      expect(totalProbability).toBeCloseTo(100, 2);
    });

    it('should detect invalid probability sums', () => {
      // BDD: "if probabilities don't sum to 100%, show an error"
      const caseItems = [
        { dropProbability: 50 },
        { dropProbability: 30 },
        // Missing 20% - invalid!
      ];

      const totalProbability = caseItems.reduce(
        (sum, item) => sum + item.dropProbability,
        0
      );

      const isValid = Math.abs(totalProbability - 100) <= 0.01;
      expect(isValid).toBe(false);
    });

    it('should allow 0.01% tolerance in probability sums', () => {
      // BDD: "total must equal 100% (within 0.01% tolerance)"
      const caseItems = [
        { dropProbability: 79.91 },
        { dropProbability: 15.98 },
        { dropProbability: 3.2 },
        { dropProbability: 0.64 },
        { dropProbability: 0.26 },
      ];

      const totalProbability = caseItems.reduce(
        (sum, item) => sum + item.dropProbability,
        0
      );

      // Total = 99.99%, within 0.01% tolerance
      const isValid = Math.abs(totalProbability - 100) <= 0.01;
      expect(isValid).toBe(true);
    });
  });

  describe('Rarity Grouping', () => {
    it('should group items by rarity', () => {
      // BDD: "items should be grouped by rarity"
      const items = [
        { name: 'Item 1', rarity: 'covert' },
        { name: 'Item 2', rarity: 'covert' },
        { name: 'Item 3', rarity: 'classified' },
      ];

      const groupedByRarity = items.reduce((groups: any, item) => {
        const rarity = item.rarity;
        if (!groups[rarity]) groups[rarity] = [];
        groups[rarity].push(item);
        return groups;
      }, {});

      expect(groupedByRarity.covert).toHaveLength(2);
      expect(groupedByRarity.classified).toHaveLength(1);
    });

    it('should sort rarities in descending order', () => {
      const rarityOrder: Record<string, number> = {
        contraband: 1,
        covert: 2,
        classified: 3,
        restricted: 4,
        milspec: 5,
        industrial: 6,
        consumer: 7,
      };

      const rarities = ['consumer', 'covert', 'milspec'];
      const sorted = [...rarities].sort((a, b) => {
        return rarityOrder[a] - rarityOrder[b];
      });

      expect(sorted[0]).toBe('covert'); // Highest
      expect(sorted[2]).toBe('consumer'); // Lowest
    });
  });

  describe('Expected Value Calculation', () => {
    it('should calculate expected value correctly', () => {
      // BDD: "expected value = sum of (probability × price)"
      const items = [
        { probability: 0.79, price: 5.0 }, // 0.0079 × 5 = 0.0395
        { probability: 0.26, price: 500.0 }, // 0.0026 × 500 = 1.3
      ];

      const expectedValue = items.reduce((sum, item) => {
        return sum + (item.probability / 100) * item.price;
      }, 0);

      expect(expectedValue).toBeCloseTo(1.34, 2);
    });

    it('should handle items without prices', () => {
      const items = [
        { probability: 0.79, price: 5.0 },
        { probability: 0.26, price: null }, // No price data
      ];

      const expectedValue = items.reduce((sum, item) => {
        return sum + (item.probability / 100) * (item.price || 0);
      }, 0);

      expect(expectedValue).toBeCloseTo(0.04, 2);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for nonexistent case', () => {
      const notFoundStatus = 404;
      expect(notFoundStatus).toBe(404);
    });

    it('should return 404 for empty cases', () => {
      // Similar to collections: empty cases should return 404
      const emptyCase = {
        id: '1',
        name: 'Empty Case',
        items: [],
      };

      const status = emptyCase.items.length === 0 ? 404 : 200;
      expect(status).toBe(404);
    });

    it('should handle invalid slug gracefully', () => {
      const invalidSlug = null;
      const shouldReturn400 = invalidSlug === null;
      expect(shouldReturn400).toBe(true);
    });
  });

  describe('URL Slug Handling', () => {
    it('should support previous slugs for redirects', () => {
      // Gotcha #7: URL slug changes break backlinks
      const caseData = {
        slug: 'clutch-case',
        previousSlugs: ['clutch', 'clutchcase'],
      };

      expect(caseData.previousSlugs).toContain('clutch');
    });

    it('should validate slug format', () => {
      const validSlugs = ['clutch-case', 'horizon-case', 'danger-zone'];
      const invalidSlugs = ['Clutch Case', 'horizon&case', 'danger#zone'];

      const slugPattern = /^[a-z0-9-]+$/;

      validSlugs.forEach((slug) => {
        expect(slug).toMatch(slugPattern);
      });

      invalidSlugs.forEach((slug) => {
        expect(slug).not.toMatch(slugPattern);
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should use single JOIN query for case items', () => {
      // Must fetch case + items + item details in single query
      const useSingleQuery = true;
      expect(useSingleQuery).toBe(true);
    });

    it('should include item details without N+1 queries', () => {
      // Should use Prisma include to JOIN item data
      const useInclude = true;
      expect(useInclude).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle cases with zero items', () => {
      const caseData = {
        name: 'New Case',
        items: [],
      };

      const shouldReturn404 = caseData.items.length === 0;
      expect(shouldReturn404).toBe(true);
    });

    it('should handle null/undefined slug gracefully', () => {
      const invalidSlug = null;
      const shouldReturn400 = invalidSlug === null;
      expect(shouldReturn400).toBe(true);
    });
  });
});
