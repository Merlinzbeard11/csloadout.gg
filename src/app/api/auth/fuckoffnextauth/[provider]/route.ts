/**
 * Steam OpenID Callback Workaround Route
 *
 * Feature 06: Steam OpenID Authentication
 * Package: steam-next-auth
 *
 * CRITICAL: This route is required by steam-next-auth package
 * to bypass NextAuth v5's strict request/response enforcement.
 *
 * Gotcha Context:
 * - Steam uses OpenID 2.0 (NOT OpenID Connect)
 * - NextAuth v5 expects OAuth 2.0/OIDC response format
 * - This workaround injects fake code parameter and redirects to standard callback
 *
 * Route: /api/auth/fuckoffnextauth/[provider]
 * Example: /api/auth/fuckoffnextauth/steam
 *
 * Flow:
 * 1. Steam redirects here after authentication
 * 2. Inject fake 'code' parameter (NextAuth v5 requirement)
 * 3. Redirect to standard NextAuth callback: /api/auth/callback/steam
 * 4. NextAuth processes authentication normally
 */

import { NextRequest, NextResponse } from 'next/server';

type RouteParams = {
  params: {
    provider: string;
  };
};

/**
 * GET handler for Steam OpenID callback workaround
 *
 * @param req - Next.js request object
 * @param context - Route params containing provider name
 * @returns Redirect response to NextAuth standard callback
 */
export async function GET(req: NextRequest, { params }: RouteParams): Promise<Response> {
  const provider = params.provider;

  // Get all query parameters from Steam OpenID response
  const { searchParams } = new URL(req.url);

  // Inject fake 'code' parameter required by NextAuth v5
  // This bypasses strict OAuth validation for OpenID 2.0
  searchParams.set('code', '123');

  // Build redirect URL to standard NextAuth callback
  const callbackUrl = `${process.env.NEXTAUTH_URL}/api/auth/callback/${provider}?${searchParams.toString()}`;

  // Redirect to NextAuth callback handler
  return NextResponse.redirect(callbackUrl);
}

/**
 * POST handler for token endpoint workaround
 *
 * NextAuth v5 expects a token endpoint, but Steam OpenID 2.0 doesn't have one.
 * This fake endpoint returns a dummy token to satisfy NextAuth's validation.
 *
 * @returns Fake token response
 */
export async function POST(): Promise<Response> {
  return NextResponse.json({
    token: '123', // Fake token (not used, but required by NextAuth v5)
  });
}
