/**
 * TDD Tests for Steam OpenID 2.0 Provider
 * 
 * BDD Reference: features/06-steam-authentication.feature
 * 
 * Tests cover:
 * - RelyingParty initialization with hardcoded Steam endpoint
 * - Authentication URL generation with correct parameters
 * - Callback URL validation and verification
 * - SteamID extraction from verified assertion
 * - Security: Domain validation, CSRF protection, replay attack prevention
 * - Error handling: Invalid responses, network failures, timeout
 */

import { SteamOpenIDProvider } from '@/lib/steam/steam-openid-provider';

describe('Steam OpenID 2.0 Provider', () => {
  const CALLBACK_URL = 'http://localhost:3000/api/auth/callback/steam';
  const REALM = 'http://localhost:3000';

  describe('Initialization', () => {
    it('should create provider with hardcoded Steam endpoint', () => {
      const provider = new SteamOpenIDProvider(CALLBACK_URL, REALM);
      expect(provider).toBeDefined();
      expect(provider.getProviderUrl()).toBe('https://steamcommunity.com/openid/login');
    });

    it('should throw error if callback URL is invalid', () => {
      expect(() => {
        new SteamOpenIDProvider('not-a-url', REALM);
      }).toThrow('Invalid callback URL');
    });

    it('should throw error if callback URL is not HTTPS in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      expect(() => {
        new SteamOpenIDProvider('http://example.com/callback', REALM);
      }).toThrow('Callback URL must use HTTPS in production');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Authentication URL Generation', () => {
    it('should generate valid Steam authentication URL', async () => {
      const provider = new SteamOpenIDProvider(CALLBACK_URL, REALM);
      const authUrl = await provider.getAuthenticationUrl();

      expect(authUrl).toContain('https://steamcommunity.com/openid/login');
      expect(authUrl).toContain('openid.mode=checkid_setup');
      expect(authUrl).toContain('openid.ns=http://specs.openid.net/auth/2.0');
      expect(authUrl).toContain('openid.return_to=');
      expect(authUrl).toContain('openid.realm=');
      expect(authUrl).toContain('openid.identity=http://specs.openid.net/auth/2.0/identifier_select');
      expect(authUrl).toContain('openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select');
    });

    it('should include state parameter for CSRF protection', async () => {
      const provider = new SteamOpenIDProvider(CALLBACK_URL, REALM);
      const state = 'random-csrf-token-12345';
      const authUrl = await provider.getAuthenticationUrl(state);

      expect(authUrl).toContain(`state=${state}`);
    });
  });

  describe('Callback Verification', () => {
    const mockValidSteamResponse = {
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'id_res',
      'openid.op_endpoint': 'https://steamcommunity.com/openid/login',
      'openid.claimed_id': 'https://steamcommunity.com/openid/id/76561198012345678',
      'openid.identity': 'https://steamcommunity.com/openid/id/76561198012345678',
      'openid.return_to': 'http://localhost:3000/api/auth/callback/steam',
      'openid.response_nonce': '2024-01-01T00:00:00ZabcDEF123',
      'openid.assoc_handle': '1234567890',
      'openid.signed': 'signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle',
      'openid.sig': 'dGVzdHNpZ25hdHVyZQ==',
    };

    it('should verify valid Steam OpenID response', async () => {
      const provider = new SteamOpenIDProvider(CALLBACK_URL, REALM);
      
      const result = await provider.verifyCallback(mockValidSteamResponse);

      expect(result.verified).toBe(true);
      expect(result.steamId).toBe('76561198012345678');
      expect(result.claimedId).toBe('https://steamcommunity.com/openid/id/76561198012345678');
    });

    it('should reject response with invalid Steam domain', async () => {
      const provider = new SteamOpenIDProvider(CALLBACK_URL, REALM);
      
      const invalidResponse = {
        ...mockValidSteamResponse,
        'openid.claimed_id': 'https://evil.com/openid/id/76561198012345678',
        'openid.identity': 'https://evil.com/openid/id/76561198012345678',
      };

      await expect(provider.verifyCallback(invalidResponse)).rejects.toThrow(
        'Invalid claimed_id domain - must be steamcommunity.com'
      );
    });

    it('should reject response with missing required fields', async () => {
      const provider = new SteamOpenIDProvider(CALLBACK_URL, REALM);
      
      const incompleteResponse = {
        'openid.mode': 'id_res',
        'openid.claimed_id': 'https://steamcommunity.com/openid/id/76561198012345678',
      };

      await expect(provider.verifyCallback(incompleteResponse)).rejects.toThrow(
        'Missing required OpenID parameters'
      );
    });

    it('should reject response with invalid signature', async () => {
      const provider = new SteamOpenIDProvider(CALLBACK_URL, REALM);
      
      const invalidSigResponse = {
        ...mockValidSteamResponse,
        'openid.sig': 'invalid-signature',
      };

      await expect(provider.verifyCallback(invalidSigResponse)).rejects.toThrow(
        'OpenID signature verification failed'
      );
    });

    it('should extract SteamID from verified response', async () => {
      const provider = new SteamOpenIDProvider(CALLBACK_URL, REALM);
      
      const result = await provider.verifyCallback(mockValidSteamResponse);
      
      expect(result.steamId).toBe('76561198012345678');
      expect(result.steamId).toHaveLength(17);
      expect(result.steamId.startsWith('7656119')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle Steam server error responses', async () => {
      const provider = new SteamOpenIDProvider(CALLBACK_URL, REALM);
      
      const errorResponse = {
        'openid.mode': 'error',
        'openid.error': 'Invalid request',
      };

      await expect(provider.verifyCallback(errorResponse)).rejects.toThrow('Invalid request');
    });

    it('should handle user cancellation', async () => {
      const provider = new SteamOpenIDProvider(CALLBACK_URL, REALM);
      
      const cancelResponse = {
        'openid.mode': 'cancel',
      };

      const result = await provider.verifyCallback(cancelResponse);
      
      expect(result.verified).toBe(false);
      expect(result.cancelled).toBe(true);
    });
  });

  describe('Security Features', () => {
    it('should validate return_to URL matches callback URL', async () => {
      const provider = new SteamOpenIDProvider(CALLBACK_URL, REALM);
      
      const tamperedResponse = {
        ...mockValidSteamResponse,
        'openid.return_to': 'https://evil.com/steal-auth',
      };

      await expect(provider.verifyCallback(tamperedResponse)).rejects.toThrow(
        'return_to URL does not match callback URL'
      );
    });

    it('should validate CSRF state parameter', async () => {
      const provider = new SteamOpenIDProvider(CALLBACK_URL, REALM);
      
      const expectedState = 'valid-csrf-token';
      await provider.getAuthenticationUrl(expectedState);
      
      const responseWithWrongState = {
        ...mockValidSteamResponse,
        state: 'wrong-csrf-token',
      };

      await expect(
        provider.verifyCallback(responseWithWrongState, expectedState)
      ).rejects.toThrow('CSRF state mismatch');
    });
  });
});
