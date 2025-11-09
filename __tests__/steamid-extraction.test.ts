/**
 * TDD Tests for Steam OpenID SteamID Extraction Utility
 * BDD Reference: features/06-steam-authentication.feature
 *   - Scenario: "Extract SteamID from OpenID claimed identity"
 *
 * Requirements:
 *   - Extract 64-bit SteamID from OpenID 2.0 claimed_id URL
 *   - Format: http://steamcommunity.com/openid/id/76561198012345678
 *   - Handle invalid URLs gracefully
 *   - Return null for malformed claimed_id
 *   - Validate SteamID format (64-bit integer)
 */

import { describe, it, expect } from '@jest/globals';
import { extractSteamIdFromClaimedId } from '../src/lib/steam/steamid-extraction';

describe('Steam OpenID SteamID Extraction', () => {
  describe('Valid claimed_id URLs', () => {
    it('should extract SteamID from standard claimed_id URL', () => {
      const claimedId = 'http://steamcommunity.com/openid/id/76561198012345678';
      const result = extractSteamIdFromClaimedId(claimedId);

      expect(result).toBe('76561198012345678');
    });

    it('should extract SteamID from HTTPS claimed_id URL', () => {
      const claimedId = 'https://steamcommunity.com/openid/id/76561198012345678';
      const result = extractSteamIdFromClaimedId(claimedId);

      expect(result).toBe('76561198012345678');
    });

    it('should handle claimed_id with trailing slash', () => {
      const claimedId = 'http://steamcommunity.com/openid/id/76561198012345678/';
      const result = extractSteamIdFromClaimedId(claimedId);

      expect(result).toBe('76561198012345678');
    });

    it('should handle claimed_id with query parameters', () => {
      const claimedId = 'http://steamcommunity.com/openid/id/76561198012345678?param=value';
      const result = extractSteamIdFromClaimedId(claimedId);

      expect(result).toBe('76561198012345678');
    });
  });

  describe('Invalid claimed_id URLs', () => {
    it('should return null for empty string', () => {
      const result = extractSteamIdFromClaimedId('');

      expect(result).toBeNull();
    });

    it('should return null for invalid URL format', () => {
      const claimedId = 'not-a-url';
      const result = extractSteamIdFromClaimedId(claimedId);

      expect(result).toBeNull();
    });

    it('should return null for non-Steam URL', () => {
      const claimedId = 'http://example.com/openid/id/76561198012345678';
      const result = extractSteamIdFromClaimedId(claimedId);

      expect(result).toBeNull();
    });

    it('should return null for wrong Steam URL path', () => {
      const claimedId = 'http://steamcommunity.com/profiles/76561198012345678';
      const result = extractSteamIdFromClaimedId(claimedId);

      expect(result).toBeNull();
    });

    it('should return null for missing SteamID in path', () => {
      const claimedId = 'http://steamcommunity.com/openid/id/';
      const result = extractSteamIdFromClaimedId(claimedId);

      expect(result).toBeNull();
    });

    it('should return null for non-numeric SteamID', () => {
      const claimedId = 'http://steamcommunity.com/openid/id/notanumber';
      const result = extractSteamIdFromClaimedId(claimedId);

      expect(result).toBeNull();
    });
  });

  describe('SteamID Format Validation', () => {
    it('should validate 64-bit SteamID format (17 digits)', () => {
      const claimedId = 'http://steamcommunity.com/openid/id/76561198012345678';
      const result = extractSteamIdFromClaimedId(claimedId);

      expect(result).toBe('76561198012345678');
      expect(result?.length).toBe(17); // Standard 64-bit SteamID length
    });

    it('should reject SteamID that is too short', () => {
      const claimedId = 'http://steamcommunity.com/openid/id/12345';
      const result = extractSteamIdFromClaimedId(claimedId);

      expect(result).toBeNull();
    });

    it('should reject SteamID that is too long', () => {
      const claimedId = 'http://steamcommunity.com/openid/id/765611980123456789999';
      const result = extractSteamIdFromClaimedId(claimedId);

      expect(result).toBeNull();
    });

    it('should handle edge case: exactly 17-digit SteamID', () => {
      const claimedId = 'http://steamcommunity.com/openid/id/76561197960265728'; // Gabe Newell's SteamID
      const result = extractSteamIdFromClaimedId(claimedId);

      expect(result).toBe('76561197960265728');
    });
  });

  describe('BDD Scenario: Extract SteamID from OpenID claimed identity', () => {
    it('should extract SteamID matching BDD example', () => {
      // BDD Reference: features/06-steam-authentication.feature:21-24
      const claimedId = 'http://steamcommunity.com/openid/id/76561198012345678';
      const steamId = extractSteamIdFromClaimedId(claimedId);

      expect(steamId).toBe('76561198012345678');
    });
  });
});
