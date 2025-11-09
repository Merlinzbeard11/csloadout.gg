/**
 * Steam OpenID SteamID Extraction Utility
 *
 * Feature 06: Steam OpenID Authentication
 * BDD Reference: features/06-steam-authentication.feature:20-27
 *   - Scenario: "Extract SteamID from OpenID claimed identity"
 *
 * Critical Gotchas:
 * - Steam uses OpenID 2.0 (legacy), NOT OpenID Connect
 * - claimed_id format: http://steamcommunity.com/openid/id/<64-bit-steamid>
 * - SteamID is always 17 digits (64-bit integer as string)
 * - Must validate format to prevent injection attacks
 */

/**
 * Extract 64-bit SteamID from OpenID 2.0 claimed_id URL
 *
 * @param claimedId - OpenID claimed_id from Steam authentication response
 * @returns SteamID as string, or null if invalid
 *
 * @example
 * const steamId = extractSteamIdFromClaimedId('http://steamcommunity.com/openid/id/76561198012345678');
 * // Returns: '76561198012345678'
 */
export function extractSteamIdFromClaimedId(claimedId: string): string | null {
  // Validate input
  if (!claimedId || typeof claimedId !== 'string') {
    return null;
  }

  try {
    // Parse URL
    const url = new URL(claimedId);

    // Validate domain (steamcommunity.com)
    if (url.hostname !== 'steamcommunity.com') {
      return null;
    }

    // Validate path structure: /openid/id/<steamid>
    const pathPattern = /^\/openid\/id\/(\d+)\/?$/;
    const match = url.pathname.match(pathPattern);

    if (!match) {
      return null;
    }

    const steamId = match[1];

    // Validate SteamID format (17 digits for 64-bit SteamID)
    // Steam uses 64-bit integers starting with 7656119...
    if (steamId.length !== 17) {
      return null;
    }

    // Additional validation: SteamID must start with 7656119
    // This is the standard prefix for Steam accounts
    if (!steamId.startsWith('7656119')) {
      return null;
    }

    return steamId;
  } catch (error) {
    // Invalid URL format
    return null;
  }
}
