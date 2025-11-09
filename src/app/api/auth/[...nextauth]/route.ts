/**
 * NextAuth v5 (Auth.js) API Route Handlers with Steam OpenID
 *
 * Feature 06: Steam OpenID Authentication
 * BDD Reference: features/06-steam-authentication.feature
 *
 * Critical Gotcha (ID: a1b74af7):
 * - steam-next-auth requires NextRequest as first parameter
 * - Incompatible with centralized auth.ts pattern
 * - Must configure NextAuth inline in route handler
 *
 * Routes handled:
 * - GET  /api/auth/signin - Sign-in page
 * - POST /api/auth/signin/:provider - Initiate provider sign-in
 * - GET  /api/auth/callback/:provider - OAuth callback
 * - GET  /api/auth/signout - Sign-out page
 * - POST /api/auth/signout - Sign out user
 * - GET  /api/auth/session - Get current session
 * - GET  /api/auth/csrf - Get CSRF token
 */

import NextAuth from 'next-auth';
import { NextRequest } from 'next/server';
import SteamProvider from 'steam-next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { extractSteamIdFromClaimedId } from '@/lib/steam/steamid-extraction';

// Environment validation
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

if (!process.env.NEXTAUTH_URL) {
  throw new Error('NEXTAUTH_URL environment variable is required');
}

/**
 * NextAuth handler function
 * BDD: "Successful Steam login flow"
 *
 * Note: Inline request handling required by steam-next-auth
 */
function handler(req: NextRequest) {
  return NextAuth(req, {
    // Database adapter for session/user storage
    adapter: PrismaAdapter(prisma),

    // Session strategy: database-backed sessions (BDD: 30-day expiration)
    session: {
      strategy: 'database',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    },

    // Authentication providers
    providers: [
      SteamProvider(req, {
        clientSecret: process.env.NEXTAUTH_SECRET!,
        callbackUrl: `${process.env.NEXTAUTH_URL}/api/auth/fuckoffnextauth`,
      }),
    ],

    // Callbacks for custom authentication flow
    callbacks: {
      /**
       * Session callback - Add SteamID to session
       * BDD: "Maintain authenticated session across page loads"
       */
      async session({ session, user }) {
        if (user) {
          session.user = {
            ...session.user,
            id: user.id,
            // @ts-expect-error - Custom User fields from Prisma schema
            steamId: user.steam_id,
            // @ts-expect-error - Custom User fields
            hasCS2Game: user.has_cs2_game,
          };
        }
        return session;
      },

      /**
       * SignIn callback - Extract SteamID and create/update user
       * BDD: "Extract SteamID from OpenID claimed identity"
       */
      async signIn({ user, account, profile }) {
        if (account?.provider === 'steam' && profile) {
          try {
            // Extract SteamID from OpenID claimed_id
            const steamId = extractSteamIdFromClaimedId(profile.id);

            if (!steamId) {
              console.error('[Auth] Failed to extract SteamID:', profile.id);
              return false;
            }

            // Check if user exists
            const existingUser = await prisma.user.findUnique({
              where: { steam_id: steamId },
            });

            if (existingUser) {
              // Update existing user
              await prisma.user.update({
                where: { steam_id: steamId },
                data: {
                  // @ts-expect-error - profile fields from steam-next-auth
                  persona_name: profile.personaname || 'Steam User',
                  // @ts-expect-error
                  profile_url: profile.profileurl || `https://steamcommunity.com/profiles/${steamId}`,
                  // @ts-expect-error
                  avatar: profile.avatarfull || '',
                  last_login: new Date(),
                },
              });
            } else {
              // Create new user
              await prisma.user.create({
                data: {
                  steam_id: steamId,
                  // @ts-expect-error
                  persona_name: profile.personaname || 'Steam User',
                  // @ts-expect-error
                  profile_url: profile.profileurl || `https://steamcommunity.com/profiles/${steamId}`,
                  // @ts-expect-error
                  avatar: profile.avatarfull || '',
                  // @ts-expect-error
                  profile_state: profile.profilestate || 1,
                  last_login: new Date(),
                },
              });
            }

            return true;
          } catch (error) {
            console.error('[Auth] Error during Steam sign-in:', error);
            return false;
          }
        }

        return true;
      },
    },

    // Pages configuration
    pages: {
      signIn: '/auth/signin',
      error: '/auth/error',
    },

    // Debug logging in development
    debug: process.env.NODE_ENV === 'development',
  });
}

// Export GET and POST handlers
export { handler as GET, handler as POST };
