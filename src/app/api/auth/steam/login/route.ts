/**
 * GET /api/auth/steam/login - Initiate Steam OpenID Authentication
 * 
 * BDD Reference: features/06-steam-authentication.feature
 *   Scenario: Successful Steam login flow
 * 
 * Security:
 * - Gotcha 6c8a668c: Avoid cookie race condition (no immediate redirect after cookie set)
 * - CSRF protection via state parameter
 * - Session stored in database (30-day expiration per BDD)
 * 
 * Flow:
 * 1. Generate CSRF state token
 * 2. Store state in temporary session (5-minute expiration)
 * 3. Get Steam authentication URL from provider
 * 4. Redirect user to Steam login page
 */

import { NextRequest, NextResponse } from 'next/server';
import { SteamOpenIDProvider } from '@/lib/steam/steam-openid-provider';
import { randomBytes } from 'crypto';

// Force dynamic rendering (uses request.url and cookies which require dynamic mode)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get callback URL and realm from environment
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const callbackUrl = `${baseUrl}/api/auth/steam/callback`;
    const realm = baseUrl;

    // Initialize Steam OpenID provider
    const provider = new SteamOpenIDProvider(callbackUrl, realm);

    // Generate CSRF state token (32 bytes = 64 hex characters)
    const state = randomBytes(32).toString('hex');

    // Get Steam authentication URL with state parameter
    const authUrl = await provider.getAuthenticationUrl(state);

    // Store state in cookie for verification in callback
    // Note: Using cookie instead of session for stateless auth
    // Expires in 5 minutes (enough time for user to authenticate)
    const response = NextResponse.redirect(authUrl);
    
    response.cookies.set('steam_auth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Allow redirect from Steam
      maxAge: 5 * 60, // 5 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[API /auth/steam/login] Error:', error);

    // Return error page instead of throwing (better UX)
    const errorUrl = new URL('/auth/error', process.env.NEXTAUTH_URL || 'http://localhost:3000');
    errorUrl.searchParams.set('error', 'Configuration');
    
    return NextResponse.redirect(errorUrl);
  }
}
