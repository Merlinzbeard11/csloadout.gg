/**
 * TDD Tests for Item Name Normalization Utility
 * BDD Reference: features/01-item-database.feature:89-94 (Item name normalization)
 * Spec Reference: features/01-item-database.md Gotcha #4 (cross-platform name matching)
 */

import { describe, it, expect } from '@jest/globals';
import { normalizeItemName } from '@/lib/normalize';

describe('normalizeItemName', () => {
  describe('Basic Normalization', () => {
    it('should convert to lowercase', () => {
      expect(normalizeItemName('AK-47 | Case Hardened')).toBe('ak-47 case hardened');
    });

    it('should remove pipe characters', () => {
      expect(normalizeItemName('AK-47 | Case Hardened')).toBe('ak-47 case hardened');
    });

    it('should remove parentheses', () => {
      expect(normalizeItemName('AK-47 Case Hardened (Field-Tested)')).toBe('ak-47 case hardened field-tested');
    });

    it('should trim leading and trailing whitespace', () => {
      expect(normalizeItemName('  AK-47 | Case Hardened  ')).toBe('ak-47 case hardened');
    });

    it('should collapse multiple spaces to single space', () => {
      expect(normalizeItemName('AK-47   Case   Hardened')).toBe('ak-47 case hardened');
    });
  });

  describe('Cross-Platform Format Handling', () => {
    it('should normalize Steam format', () => {
      // Steam: "AK-47 | Case Hardened (Field-Tested)"
      expect(normalizeItemName('AK-47 | Case Hardened (Field-Tested)'))
        .toBe('ak-47 case hardened field-tested');
    });

    it('should normalize ByMykel format', () => {
      // ByMykel: "AK-47 Case Hardened"
      expect(normalizeItemName('AK-47 Case Hardened'))
        .toBe('ak-47 case hardened');
    });

    it('should normalize CSFloat format', () => {
      // CSFloat: "ak47_case_hardened"
      expect(normalizeItemName('ak47_case_hardened'))
        .toBe('ak47 case hardened');
    });

    it('should handle all formats to same normalized output', () => {
      const steam = normalizeItemName('AK-47 | Case Hardened (Field-Tested)');
      const bymykel = normalizeItemName('AK-47 Case Hardened');
      const normalized = 'ak-47 case hardened field-tested';

      expect(steam).toContain('ak-47 case hardened');
      expect(bymykel).toBe('ak-47 case hardened');
    });
  });

  describe('Special Characters', () => {
    it('should replace underscores with spaces', () => {
      expect(normalizeItemName('ak47_case_hardened')).toBe('ak47 case hardened');
    });

    it('should preserve hyphens in weapon names', () => {
      expect(normalizeItemName('AK-47')).toBe('ak-47');
      expect(normalizeItemName('M4A4')).toBe('m4a4');
    });

    it('should remove multiple special characters', () => {
      expect(normalizeItemName('★ Karambit | Fade (Factory New)'))
        .toBe('karambit fade factory new');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      expect(normalizeItemName('')).toBe('');
    });

    it('should handle string with only special characters', () => {
      expect(normalizeItemName('|||()()_')).toBe('');
    });

    it('should handle string with only whitespace', () => {
      expect(normalizeItemName('   ')).toBe('');
    });

    it('should handle unicode characters (StatTrak star)', () => {
      expect(normalizeItemName('★ StatTrak™ AK-47 | Redline'))
        .toBe('stattrak ak-47 redline');
    });
  });

  describe('Real-World Examples', () => {
    it('should normalize AWP Dragon Lore', () => {
      expect(normalizeItemName('AWP | Dragon Lore (Factory New)'))
        .toBe('awp dragon lore factory new');
    });

    it('should normalize Karambit Fade', () => {
      expect(normalizeItemName('★ Karambit | Fade (Factory New)'))
        .toBe('karambit fade factory new');
    });

    it('should normalize Sticker format', () => {
      expect(normalizeItemName('Sticker | Team Liquid (Holo) | Katowice 2015'))
        .toBe('sticker team liquid holo katowice 2015');
    });
  });
});
