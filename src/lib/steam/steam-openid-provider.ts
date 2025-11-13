/**
 * Steam OpenID 2.0 Provider
 * 
 * Custom implementation using openid package's RelyingParty.
 * Implements security best practices from gotchas:
 * - fcb0e63d: Hardcoded Steam endpoint (no generic libraries)
 * - ebc25a37: Backend-only Steam API calls
 * - 07c2d14e: Proper signature validation compliance
 * 
 * BDD Reference: features/06-steam-authentication.feature
 * TDD Tests: __tests__/steam-openid-provider.test.ts
 */

import { RelyingParty } from 'openid';
import { extractSteamIdFromClaimedId } from './steamid-extraction';

// Hardcoded Steam OpenID endpoint (Security: Gotcha fcb0e63d)
const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';
const STEAM_DOMAIN = 'steamcommunity.com';

export interface OpenIDVerificationResult {
  verified: boolean;
  steamId?: string;
  claimedId?: string;
  cancelled?: boolean;
  error?: string;
}

export interface OpenIDParameters {
  [key: string]: string;
}

export class SteamOpenIDProvider {
  private relyingParty: RelyingParty;
  private callbackUrl: string;
  private realm: string;

  constructor(callbackUrl: string, realm: string) {
    // Validate callback URL format first
    let url: URL;
    try {
      url = new URL(callbackUrl);
    } catch (error) {
      throw new Error('Invalid callback URL');
    }
    
    // Production HTTPS requirement
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      throw new Error('Callback URL must use HTTPS in production');
    }
    
    this.callbackUrl = callbackUrl;
    this.realm = realm;

    // Initialize RelyingParty with Steam-specific configuration
    // Stateless mode for better scalability
    // Strict mode for security compliance
    this.relyingParty = new RelyingParty(
      this.callbackUrl,  // Verification URL (return_to)
      this.realm,        // Realm (trust root)
      true,              // Stateless verification
      true,              // Strict mode
      []                 // No extensions needed for basic Steam auth
    );
  }

  /**
   * Get hardcoded Steam OpenID provider URL
   * Security: Prevents endpoint spoofing (Gotcha fcb0e63d)
   */
  getProviderUrl(): string {
    return STEAM_OPENID_URL;
  }

  /**
   * Generate Steam authentication URL
   * 
   * @param state - Optional CSRF token for state validation
   * @returns Promise<string> Authentication URL to redirect user to
   */
  async getAuthenticationUrl(state?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Steam OpenID identifier (use identifier_select for Steam login page)
      const identifier = 'https://steamcommunity.com/openid';

      this.relyingParty.authenticate(
        identifier,
        false, // Not immediate mode (allow user interaction)
        (error, authUrl) => {
          if (error) {
            reject(error);
            return;
          }

          if (!authUrl) {
            reject(new Error('Failed to generate authentication URL'));
            return;
          }

          // Add CSRF state parameter if provided
          let finalUrl = authUrl;
          if (state) {
            const separator = authUrl.includes('?') ? '&' : '?';
            finalUrl = `${authUrl}${separator}state=${encodeURIComponent(state)}`;
          }

          resolve(finalUrl);
        }
      );
    });
  }

  /**
   * Verify OpenID callback response from Steam
   * 
   * @param params - OpenID parameters from callback URL
   * @param expectedState - Expected CSRF state token
   * @returns Promise<OpenIDVerificationResult>
   */
  async verifyCallback(
    params: OpenIDParameters,
    expectedState?: string
  ): Promise<OpenIDVerificationResult> {
    // Handle user cancellation
    if (params['openid.mode'] === 'cancel') {
      return {
        verified: false,
        cancelled: true,
      };
    }

    // Handle error responses from Steam
    if (params['openid.mode'] === 'error') {
      throw new Error(params['openid.error'] || 'OpenID authentication error');
    }

    // Validate required OpenID parameters
    const requiredParams = [
      'openid.ns',
      'openid.mode',
      'openid.op_endpoint',
      'openid.claimed_id',
      'openid.identity',
      'openid.return_to',
      'openid.response_nonce',
      'openid.assoc_handle',
      'openid.signed',
      'openid.sig',
    ];

    for (const param of requiredParams) {
      if (!params[param]) {
        throw new Error('Missing required OpenID parameters');
      }
    }

    // Security: CSRF state validation
    // Note: Steam OpenID does not preserve custom 'state' parameters in the callback.
    // State validation must be done via cookies in the calling route (callback/route.ts).
    // The expectedState parameter is kept for API compatibility but not validated here.
    // Cookie-based CSRF protection is handled by the route before calling this method.

    // Security: Validate claimed_id domain (Gotcha fcb0e63d)
    const claimedId = params['openid.claimed_id'];
    try {
      const claimedUrl = new URL(claimedId);
      if (claimedUrl.hostname !== STEAM_DOMAIN) {
        throw new Error('Invalid claimed_id domain - must be steamcommunity.com');
      }
    } catch (error) {
      throw new Error('Invalid claimed_id domain - must be steamcommunity.com');
    }

    // Security: Validate return_to URL matches callback URL
    const returnTo = params['openid.return_to'];
    if (!returnTo.startsWith(this.callbackUrl)) {
      throw new Error('return_to URL does not match callback URL');
    }

    // Verify assertion with Steam (signature validation)
    return new Promise((resolve, reject) => {
      // Convert params to URL format for verifyAssertion
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      const verificationUrl = `${this.callbackUrl}?${queryString}`;

      this.relyingParty.verifyAssertion(verificationUrl, (error, verified) => {
        if (error) {
          reject(new Error('OpenID signature verification failed'));
          return;
        }

        if (!verified) {
          reject(new Error('OpenID signature verification failed'));
          return;
        }

        // Extract SteamID from verified claimed_id
        const steamId = extractSteamIdFromClaimedId(claimedId);
        
        if (!steamId) {
          reject(new Error('Failed to extract SteamID from claimed_id'));
          return;
        }

        resolve({
          verified: true,
          steamId,
          claimedId,
        });
      });
    });
  }
}
