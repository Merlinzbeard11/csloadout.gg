/**
 * Session Management Utilities
 * 
 * Server-only utilities for session verification in Server Components.
 * Uses cookies() from next/headers to read session token.
 * 
 * IMPORTANT: Server Components can READ cookies but NOT SET them.
 * Cookie modifications must happen in Route Handlers or Server Actions.
 */

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { cache } from 'react';
import { redirect } from 'next/navigation';

export interface SessionUser {
  id: string;
  steamId: string;
  personaName: string;
  profileUrl: string;
  avatar: string;
  hasCS2Game: boolean;
  lastLogin: Date;
}

export interface Session {
  user: SessionUser;
  sessionToken: string;
  expires: Date;
}

/**
 * Get current session from cookie
 * 
 * Uses React cache() to memoize within single render pass.
 * Server Components should call this to verify authentication.
 * 
 * @returns Session object or null if not authenticated
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session_token')?.value;

  if (!sessionToken) {
    return null;
  }

  // Query session with user data
  const session = await prisma.session.findUnique({
    where: {
      session_token: sessionToken,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    return null;
  }

  // Check if session expired
  if (session.expires < new Date()) {
    // Session expired - clean up in background
    prisma.session.delete({
      where: { session_token: sessionToken },
    }).catch(() => {
      // Ignore cleanup errors
    });
    
    return null;
  }

  // Return session with user data
  return {
    user: {
      id: session.user.id,
      steamId: session.user.steam_id,
      personaName: session.user.persona_name,
      profileUrl: session.user.profile_url,
      avatar: session.user.avatar,
      hasCS2Game: session.user.has_cs2_game,
      lastLogin: session.user.last_login,
    },
    sessionToken: session.session_token,
    expires: session.expires,
  };
});

/**
 * Require authentication - redirects if not authenticated
 * 
 * Use in Server Components that require authentication.
 * Redirects to sign-in page if not authenticated.
 * 
 * @returns Session (guaranteed non-null due to redirect)
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();

  if (!session) {
    redirect('/auth/signin');
  }

  return session;
}
