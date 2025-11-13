/**
 * GET /api/auth/steam/callback - Steam OpenID Callback Handler
 * 
 * BDD Reference: features/06-steam-authentication.feature
 *   Scenario: Successful Steam login flow
 *   Scenario: Extract SteamID from OpenID claimed identity
 * 
 * Security:
 * - Gotcha 6c8a668c: Cookie race condition (return JSON, client-side redirect)
 * - Gotcha fcb0e63d: Hardcoded Steam endpoint validation
 * - CSRF state verification
 * - Domain validation (steamcommunity.com only)
 * - Signature verification via OpenID provider
 * 
 * Flow:
 * 1. Verify CSRF state token matches
 * 2. Verify OpenID assertion with Steam
 * 3. Extract SteamID from verified claimed_id
 * 4. Create or update user in database
 * 5. Create session (30-day expiration per BDD)
 * 6. Set session cookie
 * 7. Return success + redirect URL (client handles redirect)
 */

import { NextRequest, NextResponse } from 'next/server';
import { SteamOpenIDProvider } from '@/lib/steam/steam-openid-provider';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

// Force dynamic rendering (uses request.url and cookies which require dynamic mode)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract OpenID parameters from callback URL
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    // Initialize base URL first (needed for redirects)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Handle user cancellation
    if (params['openid.mode'] === 'cancel') {
      const cancelUrl = new URL('/auth/signin', baseUrl);
      cancelUrl.searchParams.set('error', 'Cancelled');
      return NextResponse.redirect(cancelUrl);
    }

    // Verify CSRF state token
    const expectedState = request.cookies.get('steam_auth_state')?.value;

    // Check if user already has a valid session (might be a double-request after successful auth)
    const existingSessionToken = request.cookies.get('session_token')?.value;
    if (!expectedState && existingSessionToken) {
      console.log('[Steam Callback] CSRF cookie missing but session exists - likely double-request after successful auth');
      console.log('[Steam Callback] Redirecting to homepage with existing session');

      // Return HTML with JavaScript redirect (same as main flow)
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
</head>
<body>
  <p>Redirecting...</p>
  <script>
    window.location.href = '/';
  </script>
</body>
</html>`;

      return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (!expectedState) {
      console.error('[Steam Callback] Missing CSRF state cookie and no existing session');
      console.error('[Steam Callback] Available cookies:', request.cookies.getAll().map(c => c.name));
      // If CSRF token is missing and no session, likely expired (5 min timeout)
      // Redirect to sign-in page to start fresh
      return NextResponse.redirect(new URL('/auth/signin?error=expired', baseUrl));
    }

    // Initialize Steam OpenID provider
    const callbackUrl = `${baseUrl}/api/auth/steam/callback`;
    const realm = baseUrl;
    const provider = new SteamOpenIDProvider(callbackUrl, realm);

    // Verify OpenID assertion and extract SteamID
    console.log('[Steam Callback] Verifying with expectedState:', expectedState ? 'present' : 'missing');
    console.log('[Steam Callback] OpenID params:', {
      mode: params['openid.mode'],
      claimed_id: params['openid.claimed_id'],
      identity: params['openid.identity']
    });

    const result = await provider.verifyCallback(params, expectedState);

    if (!result.verified || !result.steamId) {
      console.error('[Steam Callback] Verification failed:', result);
      throw new Error('OpenID verification failed');
    }

    console.log('[Steam Callback] Verification successful, SteamID:', result.steamId);

    const steamId = result.steamId;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { steam_id: steamId },
    });

    let userId: string;

    if (existingUser) {
      // Update existing user's last login
      await prisma.user.update({
        where: { steam_id: steamId },
        data: {
          last_login: new Date(),
        },
      });
      userId = existingUser.id;
    } else {
      // Create new user
      // Note: Profile data will be synced separately via Steam Web API
      const newUser = await prisma.user.create({
        data: {
          steam_id: steamId,
          persona_name: 'Steam User', // Placeholder until profile sync
          profile_url: `https://steamcommunity.com/profiles/${steamId}`,
          avatar: '',
          last_login: new Date(),
        },
      });
      userId = newUser.id;
    }

    // Create session (30-day expiration per BDD)
    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await prisma.session.create({
      data: {
        session_token: sessionToken,
        user_id: userId,
        expires: expiresAt,
      },
    });

    // Set session cookie and return HTML with client-side redirect
    // Gotcha 6c8a668c: Cookie race condition
    // Server-side redirect doesn't reliably set cookies before redirecting.
    // Solution: Return HTML with JavaScript redirect after cookies are set.
    const redirectUrl = '/';
    console.log('[Steam Callback] Setting session cookie and preparing HTML response');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
</head>
<body>
  <p>Authentication successful. Redirecting...</p>
  <script>
    // Wait 100ms to ensure cookies are set before redirect
    setTimeout(function() {
      window.location.href = '${redirectUrl}';
    }, 100);
  </script>
</body>
</html>`;

    const response = new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });

    console.log('[Steam Callback] Setting session cookie');
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      path: '/',
    });

    // Clear CSRF state cookie
    console.log('[Steam Callback] Clearing CSRF cookie');
    response.cookies.delete('steam_auth_state');

    console.log('[Steam Callback] Returning HTML response with JavaScript redirect');
    return response;
  } catch (error) {
    console.error('[API /auth/steam/callback] Error:', error);

    // Clear CSRF state cookie on error
    const response = NextResponse.redirect(
      new URL('/auth/error?error=Verification', process.env.NEXTAUTH_URL || 'http://localhost:3000')
    );
    response.cookies.delete('steam_auth_state');
    
    return response;
  }
}
