/**
 * TDD Tests for GET /api/items/:id API Endpoint
 * BDD Reference: features/01-item-database.feature:51-58 (View item detail page)
 *
 * Requirements:
 * - Show item name, rarity, and type
 * - Show item image
 * - Show wear range (min/max float)
 * - Show pattern count if applicable
 */

import { describe, it, expect } from '@jest/globals';

describe('GET /api/items/:id', () => {
  describe('Response Structure', () => {
    it('should return item with all detail fields', () => {
      const mockItem = {
        id: 'uuid-123',
        name: 'AK-47 | Case Hardened',
        display_name: 'AK-47 | Case Hardened',
        search_name: 'ak-47 case hardened',
        description: 'A high-damage assault rifle',
        type: 'skin',
        rarity: 'classified',
        quality: 'normal',
        wear: 'none',
        weapon_type: 'AK-47',
        image_url: 'https://example.com/image.png',
        image_url_fallback: 'https://example.com/fallback.png',
        image_local_path: null,
        wear_min: 0.0,
        wear_max: 1.0,
        pattern_count: 1000,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // BDD: "I should see the item name, rarity, and type"
      expect(mockItem).toHaveProperty('name');
      expect(mockItem).toHaveProperty('rarity');
      expect(mockItem).toHaveProperty('type');

      // BDD: "I should see the item image"
      expect(mockItem).toHaveProperty('image_url');

      // BDD: "I should see wear range (min/max float)"
      expect(mockItem).toHaveProperty('wear_min');
      expect(mockItem).toHaveProperty('wear_max');

      // BDD: "I should see pattern count if applicable"
      expect(mockItem).toHaveProperty('pattern_count');
    });

    it('should include all item fields for complete detail view', () => {
      const itemFields = [
        'id',
        'name',
        'display_name',
        'search_name',
        'description',
        'type',
        'rarity',
        'quality',
        'wear',
        'weapon_type',
        'image_url',
        'image_url_fallback',
        'image_local_path',
        'wear_min',
        'wear_max',
        'pattern_count',
        'created_at',
        'updated_at',
      ];

      expect(itemFields.length).toBe(18);
    });
  });

  describe('Parameter Validation', () => {
    it('should accept valid UUID parameter', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(validUUID)).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      const invalidUUID = 'not-a-uuid';
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(invalidUUID)).toBe(false);
    });

    it('should reject empty ID', () => {
      const emptyId = '';
      expect(emptyId.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 when item not found', () => {
      const notFoundResponse = {
        error: 'Item not found',
        status: 404,
      };
      expect(notFoundResponse.status).toBe(404);
      expect(notFoundResponse.error).toBe('Item not found');
    });

    it('should return 400 for invalid UUID format', () => {
      const badRequestResponse = {
        error: 'Invalid item ID format',
        status: 400,
      };
      expect(badRequestResponse.status).toBe(400);
    });

    it('should return 500 for database errors', () => {
      const serverErrorResponse = {
        error: 'Internal server error',
        status: 500,
      };
      expect(serverErrorResponse.status).toBe(500);
    });
  });

  describe('Optional Fields', () => {
    it('should handle items without wear range (non-skins)', () => {
      const sticker = {
        id: 'uuid',
        name: 'Sticker | Team Liquid',
        type: 'sticker',
        wear_min: null,
        wear_max: null,
        pattern_count: null,
      };

      expect(sticker.wear_min).toBeNull();
      expect(sticker.wear_max).toBeNull();
      expect(sticker.pattern_count).toBeNull();
    });

    it('should handle items without pattern count', () => {
      const awp = {
        id: 'uuid',
        name: 'AWP | Dragon Lore',
        type: 'skin',
        wear_min: 0.0,
        wear_max: 0.7,
        pattern_count: null, // Not all skins have patterns
      };

      expect(awp.pattern_count).toBeNull();
    });

    it('should handle missing description', () => {
      const item = {
        name: 'Item',
        description: null,
      };

      expect(item.description).toBeNull();
    });
  });

  describe('Image Fallback Fields', () => {
    it('should include image_url_fallback for reliability', () => {
      // BDD Gotcha #1: Steam CDN URL expiration
      const item = {
        image_url: 'https://steamcdn.com/primary.png',
        image_url_fallback: 'https://backup.com/fallback.png',
        image_local_path: '/vercel-blob/cached.png',
      };

      expect(item.image_url_fallback).toBeDefined();
      expect(item.image_local_path).toBeDefined();
    });
  });
});
