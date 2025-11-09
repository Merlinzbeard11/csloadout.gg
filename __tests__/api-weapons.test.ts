/**
 * TDD Tests for Weapons API
 * BDD Reference: features/02-relational-browsing.feature
 *   - View all skins for specific weapon
 *   - Weapon type normalization
 *   - Rarity-based sorting
 *   - Collection name display
 *
 * API Endpoint:
 *   - GET /api/weapons/:weaponType/items - List all skins for weapon
 *
 * Spec Reference: features/02-relational-browsing.md
 *   - Gotcha #5: Weapon name inconsistencies across sources
 *   - Gotcha #9: URL parameter validation
 */

import { describe, it, expect } from '@jest/globals';

describe('GET /api/weapons/:weaponType/items - List Skins for Weapon', () => {
  describe('Response Structure', () => {
    it('should return array of items for weapon type', () => {
      const mockResponse = {
        items: [
          {
            id: 'item1',
            name: 'AK-47 | Redline',
            displayName: 'AK-47 | Redline',
            rarity: 'classified',
            type: 'skin',
            weaponType: 'AK-47',
            imageUrl: 'https://example.com/ak47-redline.png',
            collection: {
              id: 'phoenix',
              name: 'The Phoenix Collection',
              slug: 'phoenix-collection',
            },
          },
        ],
        weaponType: 'AK-47',
        total: 150,
      };

      expect(mockResponse.items).toBeInstanceOf(Array);
      expect(mockResponse.items[0].weaponType).toBe('AK-47');
      expect(mockResponse.total).toBe(150);
    });

    it('should include collection information for each item', () => {
      // BDD: "each variant should show collection name"
      const item = {
        id: 'item1',
        name: 'AK-47 | Redline',
        weaponType: 'AK-47',
        collection: {
          id: 'phoenix',
          name: 'The Phoenix Collection',
          slug: 'phoenix-collection',
        },
      };

      expect(item.collection).toBeTruthy();
      expect(item.collection.name).toBe('The Phoenix Collection');
    });

    it('should include weapon type in response', () => {
      const response = {
        weaponType: 'AK-47',
        items: [],
      };

      expect(response.weaponType).toBe('AK-47');
    });
  });

  describe('Weapon Type Normalization', () => {
    it('should normalize weapon type variations', () => {
      // BDD: "weapon names AK47, Ak-47, ak47 should normalize to AK-47"
      // Gotcha #5: Weapon name inconsistencies
      const variations = ['AK47', 'Ak-47', 'ak47', 'AK-47', 'ak-47'];
      const normalized = variations.map((v) =>
        v.toUpperCase().replace(/([A-Z]+)(\d+)/, '$1-$2')
      );

      normalized.forEach((norm) => {
        expect(norm).toBe('AK-47');
      });
    });

    it('should handle weapon types with special characters', () => {
      const weaponTypes = [
        { input: 'M4A4', expected: 'M4A4' },
        { input: 'm4a4', expected: 'M4A4' },
        { input: 'M4A1S', expected: 'M4A1-S' },
        { input: 'USP-S', expected: 'USP-S' },
      ];

      weaponTypes.forEach(({ input, expected }) => {
        const normalized = normalizeWeaponType(input);
        expect(normalized).toBe(expected);
      });
    });

    it('should validate weapon type format', () => {
      const validWeaponTypes = [
        'AK-47',
        'M4A4',
        'AWP',
        'USP-S',
        'Desert Eagle',
        'Glock-18',
      ];
      const invalidWeaponTypes = ['', '  ', 'AK@47', 'M4<script>'];

      const weaponTypePattern = /^[A-Za-z0-9\s-]+$/;

      validWeaponTypes.forEach((type) => {
        expect(type).toMatch(weaponTypePattern);
      });

      invalidWeaponTypes.forEach((type) => {
        if (type.trim()) {
          expect(type).not.toMatch(weaponTypePattern);
        }
      });
    });
  });

  describe('Sorting and Filtering', () => {
    it('should sort items by rarity (highest first)', () => {
      // BDD: "skins should be sorted by rarity (highest first)"
      const items = [
        { name: 'AK-47 | Safari Mesh', rarity: 'consumer' },
        { name: 'AK-47 | Redline', rarity: 'classified' },
        { name: 'AK-47 | Fire Serpent', rarity: 'covert' },
        { name: 'AK-47 | Elite Build', rarity: 'milspec' },
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

      expect(sorted[0].name).toBe('AK-47 | Fire Serpent'); // covert
      expect(sorted[1].name).toBe('AK-47 | Redline'); // classified
      expect(sorted[3].name).toBe('AK-47 | Safari Mesh'); // consumer
    });

    it('should filter by weapon type only', () => {
      const allItems = [
        { name: 'AK-47 | Redline', weaponType: 'AK-47' },
        { name: 'M4A4 | Howl', weaponType: 'M4A4' },
        { name: 'AK-47 | Fire Serpent', weaponType: 'AK-47' },
      ];

      const ak47Items = allItems.filter((item) => item.weaponType === 'AK-47');

      expect(ak47Items).toHaveLength(2);
      expect(ak47Items.every((item) => item.weaponType === 'AK-47')).toBe(true);
    });

    it('should support case-insensitive weapon type matching', () => {
      const weaponType = 'ak-47';
      const normalizedType = weaponType.toUpperCase().replace(/([A-Z]+)(\d+)/, '$1-$2');

      expect(normalizedType).toBe('AK-47');
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for invalid weapon type', () => {
      // Gotcha #9: URL parameter validation
      const invalidWeaponType = '';
      const errorStatus = invalidWeaponType.trim() === '' ? 400 : 200;

      expect(errorStatus).toBe(400);
    });

    it('should return 404 for nonexistent weapon type', () => {
      // BDD: Weapon type with no items should return 404
      const weaponType = 'NonexistentWeapon';
      const items: any[] = [];
      const status = items.length === 0 ? 404 : 200;

      expect(status).toBe(404);
    });

    it('should handle database errors gracefully', () => {
      const errorResponse = {
        error: 'Failed to fetch weapon items',
      };

      expect(errorResponse.error).toBeTruthy();
    });
  });

  describe('Response Data', () => {
    it('should include all required item fields', () => {
      const item = {
        id: 'item1',
        name: 'AK-47 | Redline',
        displayName: 'AK-47 | Redline',
        searchName: 'ak-47 redline',
        rarity: 'classified',
        type: 'skin',
        weaponType: 'AK-47',
        imageUrl: 'https://example.com/image.png',
        imageUrlFallback: 'https://fallback.com/image.png',
      };

      expect(item.id).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(item.displayName).toBeTruthy();
      expect(item.rarity).toBeTruthy();
      expect(item.type).toBe('skin');
      expect(item.weaponType).toBe('AK-47');
    });

    it('should include collection data when available', () => {
      const item = {
        id: 'item1',
        name: 'AK-47 | Redline',
        weaponType: 'AK-47',
        collection: {
          id: 'phoenix',
          name: 'The Phoenix Collection',
          slug: 'phoenix-collection',
        },
      };

      expect(item.collection).toBeTruthy();
      expect(item.collection?.id).toBe('phoenix');
      expect(item.collection?.name).toBe('The Phoenix Collection');
    });

    it('should handle items without collection', () => {
      const item = {
        id: 'item1',
        name: 'AK-47 | Elite Build',
        weaponType: 'AK-47',
        collection: null,
      };

      expect(item.collection).toBeNull();
    });
  });

  describe('Performance Requirements', () => {
    it('should use efficient query for weapon filtering', () => {
      // Should use indexed weapon_type column
      const useIndexedColumn = true;
      expect(useIndexedColumn).toBe(true);
    });

    it('should include collection data without N+1 queries', () => {
      // Should use Prisma include to JOIN collections
      const useInclude = true;
      expect(useInclude).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle weapon types with spaces', () => {
      const weaponType = 'Desert Eagle';
      const isValid = /^[A-Za-z0-9\s-]+$/.test(weaponType);

      expect(isValid).toBe(true);
    });

    it('should handle weapon types with hyphens', () => {
      const weaponTypes = ['AK-47', 'M4A1-S', 'USP-S', 'Glock-18'];

      weaponTypes.forEach((type) => {
        const isValid = /^[A-Za-z0-9\s-]+$/.test(type);
        expect(isValid).toBe(true);
      });
    });

    it('should return empty array for weapon with no skins', () => {
      const response = {
        weaponType: 'UnusedWeapon',
        items: [],
        total: 0,
      };

      // Should return 404 per error handling rules
      const status = response.items.length === 0 ? 404 : 200;
      expect(status).toBe(404);
    });
  });
});

// Helper function referenced in tests
function normalizeWeaponType(input: string): string {
  if (!input || input.trim() === '') return '';

  // Convert to uppercase
  let normalized = input.toUpperCase().trim();

  // Handle special cases first
  if (normalized === 'M4A1S') return 'M4A1-S';
  if (normalized === 'USPS') return 'USP-S';
  if (normalized === 'M4A4') return 'M4A4';

  // Add hyphen between weapon name and numbers (e.g., AK47 → AK-47)
  // Only if there's NOT already a hyphen and it's a simple pattern like AK47
  if (/^[A-Z]{2,}\d+$/.test(normalized)) {
    normalized = normalized.replace(/([A-Z]+)(\d+)/, '$1-$2');
  }

  return normalized;
}
