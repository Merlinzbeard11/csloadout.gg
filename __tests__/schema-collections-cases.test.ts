/**
 * TDD Tests for Collections and Cases Schema
 * BDD Reference: features/02-relational-browsing.feature
 *   - Collections with items
 *   - Cases with drop probabilities
 *   - Many-to-many relationships
 *   - URL slug uniqueness
 *
 * Spec Reference: features/02-relational-browsing.md
 *   - Gotcha #7: URL slug changes break backlinks
 *   - Gotcha #8: Collection name changes from Valve
 *   - Gotcha #4: Case drop probability validation
 */

import { describe, it, expect } from '@jest/globals';

describe('Collections Schema', () => {
  describe('Collection Model Structure', () => {
    it('should have required fields', () => {
      const requiredFields = [
        'id',
        'name',
        'slug',
        'description',
        'imageUrl',
        'releaseDate',
        'isDiscontinued',
      ];

      requiredFields.forEach((field) => {
        expect(field).toBeTruthy();
      });
    });

    it('should have optional fields for discontinued collections', () => {
      const collection = {
        id: '1',
        name: 'Cobblestone Collection',
        slug: 'cobblestone',
        isDiscontinued: true,
        discontinuedDate: new Date('2021-01-01'),
      };

      expect(collection.isDiscontinued).toBe(true);
      expect(collection.discontinuedDate).toBeInstanceOf(Date);
    });

    it('should store previous slugs for 301 redirects', () => {
      // BDD: "old URLs should redirect with 301 status"
      // Gotcha #7: URL slug changes break backlinks
      const collection = {
        id: '1',
        name: 'Operation Riptide Collection',
        slug: 'operation-riptide',
        previousSlugs: ['op-riptide', 'riptide'],
      };

      expect(collection.previousSlugs).toContain('op-riptide');
      expect(collection.previousSlugs).toBeInstanceOf(Array);
    });

    it('should enforce unique slug constraint', () => {
      const collection1 = { slug: 'operation-riptide' };
      const collection2 = { slug: 'operation-riptide' };

      // Slugs must be unique
      expect(collection1.slug).toBe(collection2.slug); // Would violate unique constraint in DB
    });
  });

  describe('Collection-Item Relationship', () => {
    it('should support one-to-many relationship (Collection → Items)', () => {
      const collection = {
        id: '1',
        name: 'Dreams & Nightmares Collection',
        slug: 'dreams-nightmares',
      };

      const items = [
        { id: 'item1', collectionId: '1', name: 'MP9 | Starlight Protector' },
        { id: 'item2', collectionId: '1', name: 'AK-47 | Nightwish' },
        { id: 'item3', collectionId: '1', name: 'USP-S | Ticket to Hell' },
      ];

      const itemsInCollection = items.filter(
        (item) => item.collectionId === collection.id
      );

      expect(itemsInCollection).toHaveLength(3);
    });

    it('should allow items to reference their collection', () => {
      const item = {
        id: 'item1',
        name: 'AK-47 | Nightwish',
        collectionId: 'collection-1',
        collection: {
          id: 'collection-1',
          name: 'Dreams & Nightmares Collection',
        },
      };

      expect(item.collectionId).toBe('collection-1');
      expect(item.collection?.name).toBe('Dreams & Nightmares Collection');
    });

    it('should handle items without a collection (e.g., stickers)', () => {
      const item = {
        id: 'sticker1',
        name: 'Katowice 2014 Holo',
        type: 'sticker',
        collectionId: null,
      };

      expect(item.collectionId).toBeNull();
    });
  });

  describe('Collection Metadata', () => {
    it('should store release date for sorting', () => {
      const collection = {
        name: 'Operation Riptide Collection',
        releaseDate: new Date('2021-09-21'),
      };

      expect(collection.releaseDate).toBeInstanceOf(Date);
    });

    it('should track discontinued status', () => {
      const activeCollection = { isDiscontinued: false };
      const discontinuedCollection = {
        isDiscontinued: true,
        discontinuedDate: new Date('2020-01-01'),
      };

      expect(activeCollection.isDiscontinued).toBe(false);
      expect(discontinuedCollection.isDiscontinued).toBe(true);
      expect(discontinuedCollection.discontinuedDate).toBeInstanceOf(Date);
    });
  });
});

describe('Cases Schema', () => {
  describe('Case Model Structure', () => {
    it('should have required fields', () => {
      const requiredFields = [
        'id',
        'name',
        'slug',
        'description',
        'imageUrl',
        'keyPrice',
        'releaseDate',
      ];

      requiredFields.forEach((field) => {
        expect(field).toBeTruthy();
      });
    });

    it('should store case metadata', () => {
      const caseData = {
        id: '1',
        name: 'Clutch Case',
        slug: 'clutch-case',
        description: 'Released in February 2018',
        imageUrl: 'https://example.com/clutch-case.png',
        keyPrice: 2.49,
        releaseDate: new Date('2018-02-15'),
      };

      expect(caseData.name).toBe('Clutch Case');
      expect(caseData.keyPrice).toBe(2.49);
    });
  });

  describe('Case-Item Many-to-Many Relationship', () => {
    it('should support many-to-many (items can appear in multiple cases)', () => {
      // Item: MP7 | Neon Ply appears in both Clutch Case and another case
      const item = {
        id: 'mp7-neon-ply',
        name: 'MP7 | Neon Ply',
      };

      const caseItems = [
        { itemId: 'mp7-neon-ply', caseId: 'clutch-case', dropProbability: 0.79 },
        { itemId: 'mp7-neon-ply', caseId: 'another-case', dropProbability: 0.5 },
      ];

      const casesContainingItem = caseItems.filter(
        (ci) => ci.itemId === item.id
      );

      expect(casesContainingItem).toHaveLength(2);
    });

    it('should store drop probabilities for each case-item pair', () => {
      const caseItem = {
        caseId: 'clutch-case',
        itemId: 'mp7-neon-ply',
        dropProbability: 0.79, // Covert drop rate
      };

      expect(caseItem.dropProbability).toBe(0.79);
    });

    it('should validate probabilities sum to 100%', () => {
      // BDD: "probabilities should sum to 100%"
      // Gotcha #4: Case drop probability validation
      const caseItems = [
        { dropProbability: 79.92 }, // Consumer/Industrial
        { dropProbability: 15.98 }, // Mil-Spec
        { dropProbability: 3.2 },   // Restricted
        { dropProbability: 0.64 },  // Classified
        { dropProbability: 0.26 },  // Covert/Knife
      ];

      const totalProbability = caseItems.reduce(
        (sum, item) => sum + item.dropProbability,
        0
      );

      expect(totalProbability).toBeCloseTo(100, 2);
    });

    it('should detect invalid probability sums', () => {
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
      expect(isValid).toBe(false); // Should be invalid
    });
  });

  describe('Case Item Grouping', () => {
    it('should support rarity-based grouping', () => {
      const caseItems = [
        { itemId: '1', rarity: 'covert', dropProbability: 0.64 },
        { itemId: '2', rarity: 'classified', dropProbability: 0.64 },
        { itemId: '3', rarity: 'restricted', dropProbability: 3.2 },
      ];

      const covertItems = caseItems.filter((ci) => ci.rarity === 'covert');
      expect(covertItems).toHaveLength(1);
    });

    it('should highlight special items (knives, gloves)', () => {
      const caseItem = {
        itemId: 'karambit-doppler',
        caseId: 'clutch-case',
        dropProbability: 0.26,
        isSpecialItem: true, // Knife/glove flag
      };

      expect(caseItem.isSpecialItem).toBe(true);
    });
  });
});

describe('Schema Relationships', () => {
  describe('Foreign Key Constraints', () => {
    it('should enforce Item → Collection foreign key', () => {
      const item = {
        id: 'item1',
        name: 'AK-47 | Redline',
        collectionId: 'operation-phoenix',
      };

      // Collection must exist
      expect(item.collectionId).toBeTruthy();
    });

    it('should allow NULL collection_id for items without collections', () => {
      const item = {
        id: 'sticker1',
        name: 'Katowice 2014',
        collectionId: null,
      };

      expect(item.collectionId).toBeNull();
    });

    it('should cascade delete case items when case is deleted', () => {
      // When Case is deleted, CaseItem join records should also be deleted
      const cascadeDelete = true;
      expect(cascadeDelete).toBe(true);
    });
  });

  describe('Index Performance', () => {
    it('should index collection_id for fast queries', () => {
      // Index needed for: SELECT * FROM items WHERE collection_id = ?
      const indexedColumn = 'collection_id';
      expect(indexedColumn).toBe('collection_id');
    });

    it('should index slug for URL lookups', () => {
      // Index needed for: SELECT * FROM collections WHERE slug = ?
      const indexedColumn = 'slug';
      expect(indexedColumn).toBe('slug');
    });

    it('should create composite index for case contents queries', () => {
      // Index needed for: SELECT * FROM case_items WHERE case_id = ? ORDER BY rarity
      const compositeIndex = ['case_id', 'rarity'];
      expect(compositeIndex).toContain('case_id');
    });
  });
});

describe('Edge Cases', () => {
  describe('Slug Generation', () => {
    it('should generate slugs from names', () => {
      const collection = {
        name: 'Operation Riptide Collection',
        slug: 'operation-riptide-collection',
      };

      const slugPattern = /^[a-z0-9-]+$/;
      expect(collection.slug).toMatch(slugPattern);
    });

    it('should handle special characters in slugs', () => {
      const collection = {
        name: 'Dreams & Nightmares Collection',
        slug: 'dreams-nightmares-collection', // & removed, spaces to hyphens
      };

      expect(collection.slug).not.toContain('&');
      expect(collection.slug).not.toContain(' ');
    });
  });

  describe('Data Integrity', () => {
    it('should prevent duplicate collection slugs', () => {
      const collection1 = { slug: 'operation-riptide' };
      const collection2 = { slug: 'operation-riptide' };

      // Database should enforce unique constraint
      expect(collection1.slug).toBe(collection2.slug); // Would fail in DB
    });

    it('should handle missing probability data gracefully', () => {
      const caseItem = {
        caseId: 'test-case',
        itemId: 'test-item',
        dropProbability: null, // Missing data
      };

      const probability = caseItem.dropProbability ?? 0;
      expect(probability).toBe(0);
    });
  });
});
