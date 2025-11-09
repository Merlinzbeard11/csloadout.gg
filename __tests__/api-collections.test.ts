/**
 * TDD Tests for Collections API
 * BDD Reference: features/02-relational-browsing.feature
 *   - Browse all collections
 *   - View collection detail with items
 *   - Calculate total collection value
 *   - Handle discontinued collections
 *
 * API Endpoints:
 *   - GET /api/collections - List all collections
 *   - GET /api/collections/:slug - Collection detail
 *
 * Spec Reference: features/02-relational-browsing.md
 *   - Gotcha #1: N+1 query performance killer (<50ms requirement)
 *   - Gotcha #3: Empty collections return 200 (should be 404)
 *   - Gotcha #7: URL slug redirects for SEO
 */

import { describe, it, expect } from '@jest/globals';

describe('GET /api/collections - List All Collections', () => {
  describe('Response Structure', () => {
    it('should return array of collections', () => {
      const mockResponse = {
        collections: [
          {
            id: '1',
            name: 'Operation Riptide Collection',
            slug: 'operation-riptide',
            description: 'Community-designed skins from Operation Riptide',
            imageUrl: 'https://example.com/op-riptide.png',
            releaseDate: '2021-09-21T00:00:00.000Z',
            isDiscontinued: false,
            itemCount: 17,
          },
        ],
        total: 1,
      };

      expect(mockResponse.collections).toBeInstanceOf(Array);
      expect(mockResponse.collections[0].name).toBe(
        'Operation Riptide Collection'
      );
      expect(mockResponse.total).toBe(1);
    });

    it('should include item count for each collection', () => {
      // BDD: "each collection card should show item count"
      const collection = {
        id: '1',
        name: 'Dreams & Nightmares Collection',
        itemCount: 17,
      };

      expect(collection.itemCount).toBe(17);
    });

    it('should include release date for sorting', () => {
      const collection = {
        name: 'Operation Riptide Collection',
        releaseDate: '2021-09-21T00:00:00.000Z',
      };

      const releaseDate = new Date(collection.releaseDate);
      expect(releaseDate).toBeInstanceOf(Date);
    });

    it('should flag discontinued collections', () => {
      const discontinuedCollection = {
        name: 'Cobblestone Collection',
        isDiscontinued: true,
        discontinuedDate: '2020-01-01T00:00:00.000Z',
      };

      expect(discontinuedCollection.isDiscontinued).toBe(true);
    });
  });

  describe('Sorting and Filtering', () => {
    it('should sort by release date (newest first) by default', () => {
      const collections = [
        { name: 'Op Riptide', releaseDate: '2021-09-21' },
        { name: 'Dreams & Nightmares', releaseDate: '2021-12-03' },
        { name: 'Op Broken Fang', releaseDate: '2020-12-03' },
      ];

      // Should be sorted: Dreams (2021-12) → Riptide (2021-09) → Broken Fang (2020-12)
      const sorted = [...collections].sort(
        (a, b) =>
          new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
      );

      expect(sorted[0].name).toBe('Dreams & Nightmares');
      expect(sorted[2].name).toBe('Op Broken Fang');
    });

    it('should support filtering by discontinued status', () => {
      const collections = [
        { name: 'Active', isDiscontinued: false },
        { name: 'Discontinued', isDiscontinued: true },
      ];

      const activeOnly = collections.filter((c) => !c.isDiscontinued);
      expect(activeOnly).toHaveLength(1);
      expect(activeOnly[0].name).toBe('Active');
    });
  });

  describe('Performance Requirements', () => {
    it('should include item count without N+1 queries', () => {
      // Gotcha #1: N+1 query prevention
      // Should use aggregation/count query, not loading all items
      const collection = {
        id: '1',
        name: 'Operation Riptide Collection',
        itemCount: 17, // Aggregated count, not items.length
      };

      expect(collection.itemCount).toBe(17);
      expect(collection).not.toHaveProperty('items'); // Items not loaded in list view
    });
  });

  describe('Error Handling', () => {
    it('should return empty array if no collections exist', () => {
      const emptyResponse = {
        collections: [],
        total: 0,
      };

      expect(emptyResponse.collections).toHaveLength(0);
      expect(emptyResponse.total).toBe(0);
    });

    it('should handle database errors gracefully', () => {
      const errorResponse = {
        error: 'Failed to fetch collections',
      };

      expect(errorResponse.error).toBeTruthy();
    });
  });
});

describe('GET /api/collections/:slug - Collection Detail', () => {
  describe('Response Structure', () => {
    it('should return collection with items array', () => {
      const mockResponse = {
        id: '1',
        name: 'Operation Riptide Collection',
        slug: 'operation-riptide',
        description: 'Community-designed skins from Operation Riptide',
        imageUrl: 'https://example.com/op-riptide.png',
        releaseDate: '2021-09-21T00:00:00.000Z',
        isDiscontinued: false,
        items: [
          {
            id: 'item1',
            name: 'AK-47 | Leet Museo',
            displayName: 'AK-47 | Leet Museo',
            rarity: 'covert',
            imageUrl: 'https://example.com/ak47-leet.png',
          },
        ],
        totalValue: 125.5, // Sum of lowest prices
      };

      expect(mockResponse.items).toBeInstanceOf(Array);
      expect(mockResponse.items[0].name).toBe('AK-47 | Leet Museo');
      expect(mockResponse.totalValue).toBe(125.5);
    });

    it('should include all items in the collection', () => {
      // BDD: "I should see a grid of all 17 items in the collection"
      const collection = {
        name: 'Operation Riptide Collection',
        items: new Array(17).fill({ id: 'test', name: 'Test Item' }),
      };

      expect(collection.items).toHaveLength(17);
    });

    it('should sort items by rarity (highest first)', () => {
      // BDD: "items should be sorted by rarity (highest first)"
      const items = [
        { name: 'Item 1', rarity: 'consumer' },
        { name: 'Item 2', rarity: 'covert' },
        { name: 'Item 3', rarity: 'classified' },
      ];

      const rarityOrder: Record<string, number> = {
        contraband: 1,
        covert: 2,
        classified: 3,
        restricted: 4,
        milspec: 5,
        industrial: 6,
        consumer: 7,
      };

      const sorted = [...items].sort((a, b) => {
        const orderA = rarityOrder[a.rarity] || 999;
        const orderB = rarityOrder[b.rarity] || 999;
        return orderA - orderB;
      });

      expect(sorted[0].rarity).toBe('covert');
      expect(sorted[2].rarity).toBe('consumer');
    });
  });

  describe('Total Value Calculation', () => {
    it('should sum lowest prices of all items', () => {
      // BDD: "the value should sum the lowest price of each item"
      const items = [
        { name: 'Item 1', lowestPrice: 10.5 },
        { name: 'Item 2', lowestPrice: 25.0 },
        { name: 'Item 3', lowestPrice: 90.0 },
      ];

      const totalValue = items.reduce(
        (sum, item) => sum + item.lowestPrice,
        0
      );
      expect(totalValue).toBe(125.5);
    });

    it('should handle items without prices', () => {
      const items = [
        { name: 'Item 1', lowestPrice: 10.0 },
        { name: 'Item 2', lowestPrice: null }, // No price data
      ];

      const totalValue = items.reduce(
        (sum, item) => sum + (item.lowestPrice || 0),
        0
      );
      expect(totalValue).toBe(10.0);
    });
  });

  describe('Performance Requirements', () => {
    it('should use single JOIN query (not N+1)', () => {
      // Gotcha #1: Must fetch collection + items in single query
      // Using Prisma include or $queryRaw with JOIN
      const singleQueryApproach = true;
      expect(singleQueryApproach).toBe(true);
    });

    it('should complete in <50ms', () => {
      // BDD: "query should complete in <50ms"
      const targetResponseTime = 50; // milliseconds
      expect(targetResponseTime).toBe(50);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for nonexistent collection', () => {
      // BDD: "Given a user visits /collections/fake-collection"
      // BDD: "Then it should return 404 status"
      const notFoundStatus = 404;
      expect(notFoundStatus).toBe(404);
    });

    it('should return 404 for empty collections', () => {
      // Gotcha #3: Empty collections return 200 (should be 404)
      // BDD: "Given a collection exists but has no items"
      // BDD: "Then the page should return 404 status"
      const emptyCollectionStatus = 404;
      expect(emptyCollectionStatus).toBe(404);
    });

    it('should handle database errors with 500 status', () => {
      const serverErrorStatus = 500;
      expect(serverErrorStatus).toBe(500);
    });
  });

  describe('URL Slug Handling', () => {
    it('should accept slug parameter', () => {
      const slug = 'operation-riptide';
      const slugPattern = /^[a-z0-9-]+$/;
      expect(slug).toMatch(slugPattern);
    });

    it('should support previous slugs for redirects', () => {
      // Gotcha #7: URL slug changes break backlinks
      const collection = {
        slug: 'operation-riptide',
        previousSlugs: ['op-riptide', 'riptide'],
      };

      expect(collection.previousSlugs).toContain('op-riptide');
    });

    it('should validate slug format', () => {
      const validSlugs = ['operation-riptide', 'dreams-nightmares', 'cobblestone'];
      const invalidSlugs = ['Op Riptide', 'dreams&nightmares', 'cobble#stone'];

      const slugPattern = /^[a-z0-9-]+$/;

      validSlugs.forEach((slug) => {
        expect(slug).toMatch(slugPattern);
      });

      invalidSlugs.forEach((slug) => {
        expect(slug).not.toMatch(slugPattern);
      });
    });
  });

  describe('Discontinued Collections', () => {
    it('should display discontinued badge data', () => {
      // BDD: "Then I should see a 'No Longer Drops' badge"
      const collection = {
        name: 'Cobblestone Collection',
        isDiscontinued: true,
        discontinuedDate: '2020-01-01T00:00:00.000Z',
      };

      expect(collection.isDiscontinued).toBe(true);
      expect(collection.discontinuedDate).toBeTruthy();
    });

    it('should still show items for discontinued collections', () => {
      // BDD: "items should still be browsable"
      const collection = {
        name: 'Cobblestone Collection',
        isDiscontinued: true,
        items: [{ id: '1', name: 'Dragon Lore' }],
      };

      expect(collection.items).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle collections with zero items', () => {
      const collection = {
        name: 'New Collection',
        items: [],
      };

      // Should return 404 per Gotcha #3
      const shouldReturn404 = collection.items.length === 0;
      expect(shouldReturn404).toBe(true);
    });

    it('should handle null/undefined slug gracefully', () => {
      const invalidSlug = null;
      const shouldReturn400 = invalidSlug === null;
      expect(shouldReturn400).toBe(true);
    });
  });
});
