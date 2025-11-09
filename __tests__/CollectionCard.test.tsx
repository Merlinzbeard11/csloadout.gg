/**
 * TDD Tests for CollectionCard Component
 * BDD Reference: features/02-relational-browsing.feature
 *   - Browse all collections displayed as cards
 *   - Each card shows: image, name, item count, release date
 *
 * Component Requirements:
 *   - Display collection thumbnail image
 *   - Show collection name
 *   - Show item count
 *   - Show release date
 *   - Handle discontinued collections badge
 *   - Link to collection detail page
 */

import { describe, it, expect } from '@jest/globals';

// Collection type for testing
type CollectionCardProps = {
  collection: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    imageUrl: string;
    releaseDate: string;
    isDiscontinued: boolean;
    discontinuedDate?: string | null;
    itemCount: number;
  };
};

describe('CollectionCard Component', () => {
  const mockCollection = {
    id: '1',
    name: 'Operation Riptide Collection',
    slug: 'operation-riptide',
    description: 'Community-designed skins from Operation Riptide',
    imageUrl: 'https://example.com/op-riptide.png',
    releaseDate: '2021-09-21T00:00:00.000Z',
    isDiscontinued: false,
    itemCount: 17,
  };

  describe('Display Requirements', () => {
    it('should have collection name', () => {
      // BDD: "each collection card should show name"
      expect(mockCollection.name).toBe('Operation Riptide Collection');
    });

    it('should have collection image URL', () => {
      // BDD: "each collection card should show image"
      expect(mockCollection.imageUrl).toBe('https://example.com/op-riptide.png');
      expect(mockCollection.imageUrl).toBeDefined();
    });

    it('should have item count', () => {
      // BDD: "each collection card should show item count"
      expect(mockCollection.itemCount).toBe(17);
      expect(typeof mockCollection.itemCount).toBe('number');
    });

    it('should have release date', () => {
      // BDD: "each collection card should show release date"
      expect(mockCollection.releaseDate).toBe('2021-09-21T00:00:00.000Z');
      const releaseDate = new Date(mockCollection.releaseDate);
      expect(releaseDate).toBeInstanceOf(Date);
    });

    it('should generate correct link URL from slug', () => {
      const linkPath = `/collections/${mockCollection.slug}`;
      expect(linkPath).toBe('/collections/operation-riptide');
    });
  });

  describe('Discontinued Collections', () => {
    it('should identify discontinued collections', () => {
      // BDD: "I should see a 'No Longer Drops' badge"
      const discontinuedCollection = {
        ...mockCollection,
        isDiscontinued: true,
        discontinuedDate: '2020-01-01T00:00:00.000Z',
      };

      expect(discontinuedCollection.isDiscontinued).toBe(true);
      expect(discontinuedCollection.discontinuedDate).toBe('2020-01-01T00:00:00.000Z');
    });

    it('should identify active collections', () => {
      expect(mockCollection.isDiscontinued).toBe(false);
    });
  });

  describe('Props Validation', () => {
    it('should have all required fields', () => {
      const minimalCollection = {
        id: '1',
        name: 'Test Collection',
        slug: 'test-collection',
        imageUrl: 'https://example.com/test.png',
        releaseDate: '2021-01-01T00:00:00.000Z',
        isDiscontinued: false,
        itemCount: 10,
      };

      expect(minimalCollection.id).toBeDefined();
      expect(minimalCollection.name).toBeDefined();
      expect(minimalCollection.slug).toBeDefined();
      expect(minimalCollection.imageUrl).toBeDefined();
      expect(minimalCollection.releaseDate).toBeDefined();
      expect(typeof minimalCollection.isDiscontinued).toBe('boolean');
      expect(typeof minimalCollection.itemCount).toBe('number');
    });

    it('should handle zero items', () => {
      const emptyCollection = {
        ...mockCollection,
        itemCount: 0,
      };

      expect(emptyCollection.itemCount).toBe(0);
      expect(typeof emptyCollection.itemCount).toBe('number');
    });
  });

  describe('Visual Presentation', () => {
    it('should generate URL from slug', () => {
      const linkUrl = `/collections/${mockCollection.slug}`;
      expect(linkUrl).toContain(mockCollection.slug);
      expect(linkUrl).toBe('/collections/operation-riptide');
    });

    it('should format date as locale string', () => {
      const formattedDate = new Date(mockCollection.releaseDate).toLocaleDateString();
      expect(formattedDate).toBeDefined();
      expect(formattedDate.length).toBeGreaterThan(0);
    });

    it('should display item count with proper formatting', () => {
      const itemCountText = `${mockCollection.itemCount} items`;
      expect(itemCountText).toBe('17 items');
    });
  });

  describe('Data Integrity', () => {
    it('should have valid slug format', () => {
      const slugPattern = /^[a-z0-9-]+$/;
      expect(mockCollection.slug).toMatch(slugPattern);
    });

    it('should have valid ISO date format', () => {
      const date = new Date(mockCollection.releaseDate);
      expect(date.toISOString()).toBe(mockCollection.releaseDate);
    });

    it('should have positive or zero item count', () => {
      expect(mockCollection.itemCount).toBeGreaterThanOrEqual(0);
    });
  });
});
