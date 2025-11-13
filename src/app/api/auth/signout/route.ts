/**
 * POST /api/auth/signout - Sign Out Handler
 *
 * BDD Reference: features/06-steam-authentication.feature
 *   Scenario: Logout functionality
 *
 * Destroys session and clears cookie.
 * Returns JSON with redirect URL for client-side navigation.
 *
 * Implementation follows TDD - tests written FIRST, then this code.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get session token from cookie
    const sessionToken = request.cookies.get('session_token')?.value;

    if (sessionToken) {
      // Delete session from database
      await prisma.session.delete({
        where: {
          session_token: sessionToken,
        },
      }).catch(() => {
        // Ignore if session already deleted
      });
    }

    // Return JSON with redirect URL (client will navigate)
    // Using JSON pattern instead of server redirect to ensure cookie deletion completes
    const response = NextResponse.json({
      success: true,
      redirectTo: '/',
    });

    // Delete session cookie
    response.cookies.delete('session_token');

    return response;
  } catch (error) {
    console.error('[API /auth/signout] Error:', error);

    // Even on error, clear the cookie
    const response = NextResponse.json({
      success: false,
      error: 'Sign out failed',
    }, { status: 500 });

    response.cookies.delete('session_token');

    return response;
  }
}
