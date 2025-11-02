# 06 - Steam OpenID Authentication

## Overview

Enable users to log in with Steam accounts using OpenID authentication. This provides seamless access to Steam inventory data, personalized features (price alerts, favorites, portfolio tracking), and builds trust by using official Valve authentication.

**Value Prop:** "One-click login with Steam - no passwords to remember"

## User Segments Served

- **Primary:** All Users (100% of CS2 players have Steam accounts)
- **Secondary:** N/A (foundational feature for personalization)

## User Stories / Use Cases

### As a Casual Player
- I want to click "Sign in with Steam" and be logged in instantly
- I want to save favorite items to my account
- I want my price alerts to persist across devices

### As an Investor
- I want to import my Steam inventory to track portfolio value
- I want my watchlist and portfolio saved to my account
- I want to access my data from any device

### As a Bulk Trader
- I want to link multiple Steam accounts to one csloadout.gg account
- I want secure access without sharing Steam credentials

## Research & Context

### Steam OpenID Overview

**What is Steam OpenID:**
- Official authentication method provided by Valve
- OAuth-like flow using OpenID 2.0 protocol
- Returns Steam ID after successful authentication
- NO access to Steam credentials (password never shared)
- Free to use, no API key required for basic auth

**Flow:**
```
1. User clicks "Sign in with Steam"
2. Redirect to steamcommunity.com/openid/login
3. User approves on Steam (already logged in to Steam = instant)
4. Steam redirects back with signed response
5. Verify signature, extract Steam ID
6. Create/update user session
```

**Data Returned:**
- Steam ID 64-bit (unique identifier)
- NO email, NO username (must query Steam Web API for profile data)

### Security Considerations

**Pros:**
✅ No password storage (Valve handles all authentication)
✅ No credential leaks (we never see passwords)
✅ Users trust Steam login (familiar pattern)
✅ Free, official, widely supported

**Cons:**
❌ No email provided (can't contact users easily)
❌ Requires Steam Web API call to get username/avatar
❌ Users can't log in if Steam is down
❌ OpenID 2.0 is deprecated (but Steam still uses it as of 2025)

**Security Best Practices:**
1. Verify OpenID signature (prevent impersonation)
2. Use HTTPS only (prevent man-in-the-middle)
3. Store Steam IDs securely (hash if needed)
4. Implement session management (JWT or cookies)
5. CSRF protection on return URL

### Alternative: Steam Web API Key

After OpenID auth, we can query Steam Web API to get:
- Profile name
- Avatar image
- Privacy settings
- Inventory data (if public)

**Requires:** Steam Web API key (free from https://steamcommunity.com/dev/apikey)

## Technical Requirements

### Tech Stack

**Option A: NextAuth.js with Steam Provider** (Recommended for Next.js)
```typescript
// Pros: Built-in session management, CSRF protection, easy setup
// Cons: Less control over flow

import NextAuth from "next-auth"
import SteamProvider from "next-auth-steam"

export default NextAuth({
  providers: [
    SteamProvider({
      clientSecret: process.env.STEAM_SECRET,
      callbackUrl: "https://csloadout.gg/api/auth/callback/steam"
    })
  ]
})
```

**Option B: Custom OpenID Implementation**
```typescript
// Pros: Full control, no dependencies
// Cons: More code to maintain, security concerns

import openid from 'openid'

const relyingParty = new openid.RelyingParty(
  'https://csloadout.gg/api/auth/verify',  // Return URL
  'https://csloadout.gg',                   // Realm
  true,                                     // Use stateless verification
  false,                                    // Strict mode
  []                                        // Extensions
);
```

**MVP Decision:** NextAuth.js (faster, more secure, well-maintained)

### Database Schema

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  steam_id VARCHAR(20) UNIQUE NOT NULL,  -- Steam ID 64-bit as string
  steam_username VARCHAR(255),
  steam_avatar_url TEXT,
  profile_url TEXT,                       -- Steam profile URL
  inventory_privacy VARCHAR(20),          -- 'public', 'friends', 'private'

  -- csloadout.gg user data
  email VARCHAR(255),                     -- Optional, user-provided
  email_verified BOOLEAN DEFAULT FALSE,
  premium_tier VARCHAR(20) DEFAULT 'free', -- 'free', 'premium', 'pro'
  premium_expires_at TIMESTAMP,

  -- Preferences
  default_currency VARCHAR(3) DEFAULT 'USD',
  price_alert_email BOOLEAN DEFAULT TRUE,
  price_alert_browser BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login TIMESTAMP,
  login_count INTEGER DEFAULT 0,

  -- Multi-account support (for bulk traders)
  parent_user_id UUID REFERENCES users(id), -- Links alt accounts to primary

  CONSTRAINT valid_steam_id CHECK (steam_id ~ '^[0-9]{17}$')
);

CREATE INDEX idx_users_steam_id ON users(steam_id);
CREATE INDEX idx_users_parent ON users(parent_user_id);

-- User sessions (if not using JWT)
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Session metadata
  ip_address INET,
  user_agent TEXT,
  last_activity TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
```

### Authentication Flow Implementation

```typescript
// pages/api/auth/[...nextauth].ts
import NextAuth from "next-auth"
import type { NextAuthOptions } from "next-auth"

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "steam",
      name: "Steam",
      type: "oauth",
      clientId: "steam",
      clientSecret: process.env.STEAM_SECRET!,
      authorization: {
        url: "https://steamcommunity.com/openid/login",
        params: {
          "openid.mode": "checkid_setup",
          "openid.ns": "http://specs.openid.net/auth/2.0",
          "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
          "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
          "openid.return_to": `${process.env.NEXTAUTH_URL}/api/auth/callback/steam`,
          "openid.realm": process.env.NEXTAUTH_URL
        }
      },
      token: {
        url: "https://steamcommunity.com/openid/login",
        params: { "openid.mode": "check_authentication" }
      },
      userinfo: {
        async request({ tokens }) {
          // Extract Steam ID from OpenID response
          const steamId = tokens.openid_claimed_id.split("/").pop()

          // Fetch Steam profile data via Steam Web API
          const response = await fetch(
            `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_API_KEY}&steamids=${steamId}`
          )
          const data = await response.json()
          const profile = data.response.players[0]

          return {
            id: steamId,
            name: profile.personaname,
            image: profile.avatarfull,
            profile_url: profile.profileurl
          }
        }
      },
      profile(profile) {
        return {
          id: profile.id,
          name: profile.name,
          image: profile.image,
          steam_id: profile.id,
          profile_url: profile.profile_url
        }
      }
    }
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      // Create or update user in database
      await db.users.upsert({
        where: { steam_id: user.steam_id },
        update: {
          steam_username: user.name,
          steam_avatar_url: user.image,
          profile_url: user.profile_url,
          last_login: new Date(),
          login_count: { increment: 1 }
        },
        create: {
          steam_id: user.steam_id,
          steam_username: user.name,
          steam_avatar_url: user.image,
          profile_url: user.profile_url
        }
      })

      return true
    },

    async session({ session, token }) {
      // Add custom data to session
      if (token.sub) {
        const user = await db.users.findUnique({
          where: { steam_id: token.sub },
          select: { id: true, steam_id: true, premium_tier: true, email: true }
        })

        session.user.id = user.id
        session.user.steamId = user.steam_id
        session.user.premiumTier = user.premium_tier
        session.user.email = user.email
      }

      return session
    }
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: "/login",
    error: "/auth/error"
  }
}

export default NextAuth(authOptions)
```

### Frontend Components

```typescript
// components/LoginButton.tsx
import { signIn, signOut, useSession } from "next-auth/react"

export function LoginButton() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <button disabled>Loading...</button>
  }

  if (session) {
    return (
      <div className="user-menu">
        <img src={session.user.image} alt="Avatar" className="avatar" />
        <span>{session.user.name}</span>
        <button onClick={() => signOut()}>Sign Out</button>
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn("steam")}
      className="btn-steam"
    >
      <SteamIcon />
      Sign in with Steam
    </button>
  )
}

// Protect routes
// pages/dashboard.tsx
import { getServerSession } from "next-auth/next"
import { authOptions } from "./api/auth/[...nextauth]"

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions)

  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false
      }
    }
  }

  return {
    props: { session }
  }
}

// Client-side protection
import { useSession } from "next-auth/react"
import { useRouter } from "next/router"

export function ProtectedComponent() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/login")
    }
  })

  if (status === "loading") {
    return <div>Loading...</div>
  }

  return <div>Protected content for {session.user.name}</div>
}
```

### Session Management

**Option A: JWT (Stateless) - Recommended**
```typescript
// Pros: No database queries, scalable
// Cons: Can't revoke sessions easily

session: {
  strategy: "jwt",
  maxAge: 30 * 24 * 60 * 60, // 30 days
}
```

**Option B: Database Sessions (Stateful)**
```typescript
// Pros: Can revoke sessions, track activity
// Cons: Database query on every request

session: {
  strategy: "database",
  maxAge: 30 * 24 * 60 * 60,
}
```

**MVP Decision:** JWT for MVP, migrate to database sessions in Phase 2 if needed

## Success Metrics

- ✅ 50%+ sign-up rate (visitors → Steam auth users)
- ✅ <3s authentication flow (click → logged in)
- ✅ <0.1% authentication errors
- ✅ 80%+ session retention (users stay logged in)
- ✅ Zero security incidents (no account compromises)

## Dependencies

### Must Have Before Starting
- Next.js project initialized
- Steam Web API key obtained
- HTTPS/SSL certificate (required for Steam OpenID)
- Environment variables configured

### Blocks Other Features
- [07] Inventory Import (needs Steam ID)
- [09] Price Alerts (needs user accounts)
- [11] Multi-Account Dashboard (needs primary account)
- All personalization features

## Effort Estimate

- **Development Time:** 3-5 days
- **Complexity:** Low-Medium
- **Team Size:** 1 developer

**Breakdown:**
- Day 1: NextAuth.js setup, Steam provider config
- Day 2: Database schema, user creation/update logic
- Day 3: Frontend login UI, protected routes
- Day 4: Session management, error handling
- Day 5: Testing, security audit

## Implementation Notes

### Environment Variables

```bash
# .env.local
NEXTAUTH_URL=https://csloadout.gg
NEXTAUTH_SECRET=<generated-secret>  # openssl rand -base64 32
STEAM_API_KEY=<your-steam-api-key>
DATABASE_URL=postgresql://...
```

### Steam API Key Setup

1. Go to https://steamcommunity.com/dev/apikey
2. Enter domain: csloadout.gg
3. Agree to terms
4. Copy API key to .env

### Testing Locally

```bash
# Use ngrok for HTTPS localhost (Steam requires HTTPS)
ngrok http 3000

# Update .env.local
NEXTAUTH_URL=https://abc123.ngrok.io

# Steam OpenID will now work locally
```

### Critical Gotchas & Production Issues

#### 1. **Steam OpenID Library Vulnerabilities** ⚠️ CRITICAL

**Problem:** Generic OpenID libraries (like `openid` npm package) have discovery vulnerabilities. LightOpenID allows identity spoofing via malicious discovery documents.

**Impact:** Attackers can impersonate Steam users, claim profiles they don't own.

**Solution:**
```typescript
// ❌ WRONG: Generic OpenID library with discovery
import openid from 'openid';
const relyingParty = new openid.RelyingParty(
  returnUrl,
  realm,
  true,  // Stateless verification
  false, // Strict mode OFF - vulnerable
  []
);

// ✅ CORRECT: Hardcoded Steam-only implementation
const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';

async function verifySteamAuth(params: URLSearchParams) {
  // Only accept Steam as provider
  const claimedId = params.get('openid.claimed_id');
  if (!claimedId?.startsWith('https://steamcommunity.com/openid/id/')) {
    throw new Error('Invalid Steam ID');
  }

  // Verify signature with Steam directly
  const verifyParams = new URLSearchParams(params);
  verifyParams.set('openid.mode', 'check_authentication');

  const response = await fetch(STEAM_OPENID_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: verifyParams.toString()
  });

  const text = await response.text();
  return text.includes('is_valid:true');
}
```

**Better:** Use Steam-specific libraries that don't implement discovery:
- `xpaw/steam-openid` (PHP)
- `node-steam-openid` (Node.js)
- `@hyperplay/next-auth-steam` (NextAuth.js V5)

**References:**
- Stack Overflow: "Steam OpenID Security Best Practices"
- LightOpenID CVE reports

---

#### 2. **Backend Signature Validation - Single Use Only** ⚠️ CRITICAL

**Problem:** Steam's OpenID signature validation endpoint returns `is_valid:true` ONLY ONCE per authentication. Calling it again returns `false`, even for legitimate requests.

**Impact:** Cannot retry failed validations, must implement robust error handling and logging.

**Solution:**
```typescript
async function validateSteamCallback(params: URLSearchParams) {
  const claimedId = params.get('openid.claimed_id');
  const signature = params.get('openid.sig');

  // Log BEFORE validation (can't retry after)
  console.log('[Steam Auth] Validating signature', { claimedId, timestamp: new Date() });

  try {
    const isValid = await verifySteamSignature(params);

    if (!isValid) {
      // Log failure, but CANNOT retry validation
      console.error('[Steam Auth] Signature validation failed - cannot retry');
      throw new Error('Steam authentication failed');
    }

    // Extract Steam ID and create session immediately
    const steamId = claimedId.split('/').pop();
    return steamId;

  } catch (error) {
    // If network error, DO NOT attempt re-validation
    // Signature is now consumed - must redirect user to start over
    console.error('[Steam Auth] Validation error, user must re-authenticate', error);
    throw error;
  }
}
```

**Best Practices:**
- Validate signature ONCE in production
- Test validation flow in development with different Steam accounts
- Implement comprehensive logging before validation attempts
- Have fallback UX for validation failures (redirect to login)

---

#### 3. **NextAuth.js V5 Breaking Changes** ⚠️ CRITICAL

**Problem:** NextAuth V5 requires `issuer` and `token` endpoints, breaking Steam providers that use legacy OpenID 2.0.

**Error Message:**
```
Error: Provider 'steam' is missing both issuer and token endpoint config.
At least one of them is required.
```

**Root Cause:** Steam uses OpenID 2.0 (not OpenID Connect). V5 expects OAuth 2.0/OIDC flow.

**Solution Options:**

**Option A: Stay on NextAuth V4** (Recommended for MVP)
```json
{
  "dependencies": {
    "next-auth": "^4.24.5"
  }
}
```

**Option B: Use Community V5 Adapter**
```typescript
// Using @hyperplay/next-auth-steam for V5
import SteamProvider from '@hyperplay/next-auth-steam';

export default NextAuth({
  providers: [
    SteamProvider({
      clientSecret: process.env.STEAM_SECRET!,
      callbackUrl: `${process.env.NEXTAUTH_URL}/api/auth/callback/steam`
    })
  ]
});
```

**Option C: Use steam-next-auth Package**
```bash
npm install steam-next-auth
```

**References:**
- NextAuth GitHub Issues: #9572, #8542
- NextAuth V5 Migration Guide
- @hyperplay/next-auth-steam documentation

---

#### 4. **OpenID 2.0 Deprecated - Security Vulnerabilities** ⚠️ CRITICAL

**Problem:** OpenID 2.0 deprecated 10+ years ago. Has known vulnerabilities:
- Attribute Exchange not verified (MITM attacks)
- Identity forgery possible with malicious providers
- Audience injection vulnerabilities
- No built-in CSRF protection

**Issue:** Steam still uses OpenID 2.0 as of 2025 (no OpenID Connect support).

**Mitigation Strategies:**

```typescript
// Implement additional security layers
export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "steam",
      // ... Steam config
    }
  ],

  callbacks: {
    async signIn({ user, account }) {
      // 1. CSRF Token Validation
      const csrfToken = await getCsrfToken({ req });
      if (!csrfToken) {
        console.error('[Steam Auth] Missing CSRF token');
        return false;
      }

      // 2. Session Binding - Prevent session fixation
      const sessionId = generateSecureSessionId();
      await storeSession(user.steam_id, sessionId);

      // 3. IP Address Verification (optional - blocks VPN switching)
      const requestIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      await logAuthAttempt(user.steam_id, requestIp);

      return true;
    }
  },

  // HTTPS only
  useSecureCookies: process.env.NODE_ENV === 'production',

  cookies: {
    sessionToken: {
      name: '__Secure-next-auth.session-token',
      options: {
        httpOnly: true,
        secure: true,  // HTTPS only
        sameSite: 'lax', // CSRF protection
        path: '/',
      }
    }
  }
};
```

**Future-Proofing:**
- Monitor Steam's authentication roadmap for OpenID Connect migration
- Document security assumptions for compliance audits
- Plan migration path when Steam upgrades

**References:**
- OpenID 2.0 CVE Database
- Apache Airflow CVE-2022-40754 (OpenID vulnerabilities)
- OWASP OpenID Security Cheat Sheet

---

#### 5. **Steam Web API Rate Limits** ⚠️ MAJOR

**Problem:** Official documentation says 100,000 requests/day, but 429 (Too Many Requests) errors occur more frequently in practice.

**Impact:** Authentication fails during traffic spikes, profile data unavailable.

**Solution:**

```typescript
import pRetry from 'p-retry';

async function fetchSteamProfile(steamId: string, attempt: number = 0) {
  const MAX_RETRIES = 3;
  const BASE_DELAY = 1000;

  return pRetry(
    async () => {
      const response = await fetch(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_API_KEY}&steamids=${steamId}`
      );

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : BASE_DELAY * Math.pow(2, attempt);
        throw new pRetry.AbortError(`Rate limited, retry after ${delay}ms`);
      }

      if (!response.ok) {
        throw new Error(`Steam API error: ${response.status}`);
      }

      return response.json();
    },
    {
      retries: MAX_RETRIES,
      onFailedAttempt: (error) => {
        console.log(`[Steam API] Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
      }
    }
  );
}

// Cache profile data to reduce API calls
async function getCachedSteamProfile(steamId: string) {
  const cached = await redis.get(`steam:profile:${steamId}`);
  if (cached) return JSON.parse(cached);

  const profile = await fetchSteamProfile(steamId);

  // Cache for 1 hour
  await redis.setex(`steam:profile:${steamId}`, 3600, JSON.stringify(profile));

  return profile;
}
```

**Best Practices:**
- Cache profile data (avatar, username) for 1+ hours
- Implement exponential backoff with jitter
- Honor `Retry-After` headers
- Monitor 429 error rates in production

**References:**
- Steam Web API Documentation
- Reddit r/SteamWebAPI rate limit discussions
- Valve Developer Community forums

---

#### 6. **JWT Session Revocation Impossible** ⚠️ MAJOR

**Problem:** JWT is stateless - cannot revoke sessions on logout, compromise, or admin action.

**Impact:** Logged-out users can still access API until JWT expires (up to 30 days).

**Industry Guidance:**
- Healthcare: MUST use database sessions (HIPAA compliance)
- Banking: MUST use database sessions (PCI-DSS)
- Insurance: MUST use database sessions (SOC 2 compliance)
- E-commerce with payments: Database sessions recommended

**Solution Options:**

**Option A: Database Sessions** (Recommended for csloadout.gg - deals with payments)
```typescript
session: {
  strategy: "database",
  maxAge: 30 * 24 * 60 * 60, // 30 days
  updateAge: 24 * 60 * 60,   // Update daily
},
adapter: PrismaAdapter(prisma),
```

**Pros:**
- ✅ Immediate revocation on logout
- ✅ Can revoke compromised sessions
- ✅ Track session activity (IP, device)
- ✅ Admin can force logout

**Cons:**
- ❌ Database query on every request
- ❌ More complex infrastructure

**Option B: Hybrid Approach** (Short-lived JWT + Refresh Token)
```typescript
session: {
  strategy: "jwt",
  maxAge: 5 * 60, // 5 minutes (short-lived)
},

callbacks: {
  async jwt({ token, user }) {
    if (user) {
      // Generate refresh token stored in database
      const refreshToken = await createRefreshToken(user.id);
      token.refreshToken = refreshToken;
    }
    return token;
  },

  async session({ session, token }) {
    // Verify refresh token still valid
    const isValid = await validateRefreshToken(token.refreshToken);
    if (!isValid) {
      throw new Error('Session revoked');
    }
    return session;
  }
}
```

**Pros:**
- ✅ Can revoke via refresh token invalidation
- ✅ Faster than full database sessions
- ✅ 5-min window if refresh token revoked

**Cons:**
- ❌ More complex implementation
- ❌ Still requires database for refresh tokens

**References:**
- Auth.js Documentation: "Database Sessions vs JWT"
- OWASP: "JSON Web Token Cheat Sheet"
- Industry analysis: "When NOT to use JWT"

---

#### 7. **GDPR Compliance - EU Users** ⚠️ CRITICAL

**Problem:** Steam returns Steam ID but NO email. GDPR requires ability to:
- Export all user data on request
- Delete all user data on request
- Notify users of data collection
- Get consent for data processing

**Solution:**

```typescript
// Privacy policy consent during first login
callbacks: {
  async signIn({ user, account, profile }) {
    const existingUser = await db.users.findUnique({
      where: { steam_id: user.steam_id }
    });

    if (!existingUser) {
      // First-time user - require privacy policy acceptance
      return '/privacy-consent?steam_id=' + user.steam_id;
    }

    // Log data access for GDPR audit trail
    await db.auditLog.create({
      data: {
        user_id: existingUser.id,
        action: 'LOGIN',
        timestamp: new Date(),
        ip_address: req.headers['x-forwarded-for']
      }
    });

    return true;
  }
}

// Data export endpoint (GDPR Article 15)
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const userData = await db.users.findUnique({
    where: { id: session.user.id },
    include: {
      priceAlerts: true,
      favoriteItems: true,
      inventory: true,
      sessions: true
    }
  });

  return new Response(JSON.stringify(userData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename=user-data.json'
    }
  });
}

// Data deletion endpoint (GDPR Article 17 - Right to be Forgotten)
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response('Unauthorized', { status: 401 });

  // Cascade delete all user data
  await db.users.delete({
    where: { id: session.user.id }
  });

  // Log deletion for audit
  await db.auditLog.create({
    data: {
      user_id: session.user.id,
      action: 'ACCOUNT_DELETED',
      timestamp: new Date()
    }
  });

  return new Response('Account deleted', { status: 200 });
}
```

**GDPR Checklist:**
- ✅ Privacy policy displayed before first login
- ✅ Cookie consent banner (EU users)
- ✅ Data export endpoint (JSON format)
- ✅ Account deletion endpoint (cascade delete)
- ✅ Audit log for all data access
- ✅ Data retention policy documented
- ✅ DPO contact information (if >250 employees)

**Penalties:** €20 million OR 4% of global annual revenue (whichever higher)

**References:**
- GDPR Official Text: Articles 15, 17
- ICO (UK): "Right to erasure guide"
- CNIL (France): "Gaming platforms GDPR compliance"

---

### Additional Gotchas (Lower Severity)

8. **Steam Requires HTTPS**
   - OpenID flow fails on http://
   - Solution: Use ngrok for local dev, proper SSL in production

9. **No Email Address**
   - Steam OpenID doesn't return email
   - Solution: Optionally ask users to provide email after login

10. **Privacy Settings**
    - Some Steam profiles are private (can't access inventory)
    - Solution: Check privacy status, show message if private

11. **Steam ID Format**
    - Steam ID is 64-bit integer (e.g., 76561198012345678)
    - Must store as string (JavaScript number limits)

12. **Session Expiry**
    - Users expect to stay logged in indefinitely
    - Solution: 30-day sessions with "Remember Me" option

13. **Multi-Device Login**
    - JWT sessions work across devices
    - Database sessions can limit concurrent logins if needed

14. **Account Linking**
    - Users may have multiple Steam accounts
    - Solution: Allow linking alt accounts (see [11-multi-account-dashboard.md])

---

## Best Business Practices & Industry Standards

### Session Management Best Practices

**Industry Standard:** Database sessions for platforms dealing with financial transactions or sensitive user data.

**Decision Matrix:**

| Use Case | Recommendation | Reasoning |
|----------|---------------|-----------|
| E-commerce with payments | Database sessions | PCI-DSS compliance, immediate revocation needed |
| Social/community platform | JWT acceptable | Stateless, scalable, lower security requirements |
| Healthcare/Banking | Database sessions (REQUIRED) | HIPAA/PCI-DSS compliance mandatory |
| Gaming marketplace (csloadout.gg) | Database sessions | Handles Steam inventory, price alerts, future payments |

**Recommendation for csloadout.gg:** Database sessions
- Enables future premium features (payments)
- Allows immediate session revocation (security requirement)
- Tracks user activity for fraud detection
- Supports multi-account management features

---

### Authentication UX Best Practices

**Industry Research:**
- **Baymard Institute:** "One-click social login increases conversion by 25-40%"
- **Auth0 Research:** "90% of users prefer OAuth over creating new passwords"
- **Nielsen Norman Group:** "Social login reduces form abandonment by 35%"

**Implementation:**

```typescript
// Login page - Steam button prominently displayed
export default function LoginPage() {
  return (
    <div className="login-container">
      <h1>Sign in to csloadout.gg</h1>

      {/* Primary CTA - Steam login */}
      <button
        onClick={() => signIn('steam')}
        className="btn-steam-primary"
        style={{
          backgroundColor: '#171a21',
          color: '#c7d5e0',
          padding: '12px 24px',
          fontSize: '16px',
          borderRadius: '3px'
        }}
      >
        <img src="/steam-icon.svg" alt="" width="24" height="24" />
        Sign in with Steam
      </button>

      {/* Trust indicators */}
      <div className="trust-signals">
        <p>✅ No password required</p>
        <p>✅ Official Valve authentication</p>
        <p>✅ Your Steam credentials never shared</p>
      </div>

      {/* GDPR compliance - EU users */}
      <p className="privacy-notice">
        By signing in, you agree to our{' '}
        <a href="/privacy">Privacy Policy</a> and{' '}
        <a href="/terms">Terms of Service</a>
      </p>
    </div>
  );
}
```

**Key Principles:**
1. **Single Sign-On (SSO) as Primary Option** - Don't offer email/password signup for CS2 marketplace (100% of users have Steam)
2. **Trust Indicators** - Explain what data is/isn't shared
3. **Fast Authentication** - <3 seconds from click to logged in
4. **Clear Privacy Notice** - GDPR compliance, terms acceptance
5. **Mobile-Friendly** - Steam mobile app integration

---

### Security Audit Checklist

Before production deployment, complete this security checklist:

**Authentication Security:**
- [ ] HTTPS enforced (HSTS headers enabled)
- [ ] CSRF protection enabled (NextAuth.js default)
- [ ] Secure cookies (HttpOnly, Secure, SameSite=Lax)
- [ ] Steam signature validation (backend only, never client-side)
- [ ] Rate limiting on auth endpoints (prevent brute force)
- [ ] IP-based throttling (block suspicious activity)
- [ ] Session fixation prevention (regenerate session ID on login)

**Data Privacy:**
- [ ] GDPR compliance (data export/deletion endpoints)
- [ ] Privacy policy displayed before first login
- [ ] Cookie consent banner (EU users)
- [ ] Audit logging (track all data access)
- [ ] Data retention policy documented
- [ ] Encryption at rest (database)
- [ ] Encryption in transit (TLS 1.3)

**Operational Security:**
- [ ] Steam API key stored in environment variables (never in code)
- [ ] NextAuth secret rotated regularly
- [ ] Database credentials secured (secrets manager)
- [ ] Error messages sanitized (don't leak sensitive info)
- [ ] Logging excludes sensitive data (Steam IDs hashed in logs)
- [ ] Monitoring for suspicious auth patterns
- [ ] Incident response plan documented

**References:**
- OWASP Authentication Cheat Sheet
- NIST Digital Identity Guidelines (SP 800-63B)
- CIS Controls for Effective Cyber Defense

---

### Performance Benchmarks

**Industry Standards for Authentication:**
- **Google OAuth:** <2s median authentication time
- **GitHub OAuth:** <1.5s median
- **Steam OpenID:** <3s median (slower due to OpenID 2.0 overhead)

**Target Metrics for csloadout.gg:**
- ✅ <3s authentication flow (click → logged in)
- ✅ <100ms session validation (cached profile data)
- ✅ <0.1% authentication error rate
- ✅ 99.9% uptime (dependent on Steam's uptime)

**Optimization Strategies:**

```typescript
// Cache Steam profile data to reduce API calls
const PROFILE_CACHE_TTL = 3600; // 1 hour

async function getProfile(steamId: string) {
  // 1. Check Redis cache first (< 5ms)
  const cached = await redis.get(`profile:${steamId}`);
  if (cached) return JSON.parse(cached);

  // 2. Fetch from Steam API (200-500ms)
  const profile = await fetchSteamProfile(steamId);

  // 3. Cache for 1 hour
  await redis.setex(`profile:${steamId}`, PROFILE_CACHE_TTL, JSON.stringify(profile));

  return profile;
}

// Prefetch profile during authentication callback
callbacks: {
  async signIn({ user }) {
    // Fetch and cache profile DURING login
    // User's next request will hit cache (fast)
    await getProfile(user.steam_id);
    return true;
  }
}
```

**Performance Monitoring:**
- Track authentication duration (P50, P95, P99)
- Monitor Steam API response times
- Alert on auth error rate >0.5%
- Track cache hit rates (target >90%)

---

## Authoritative Documentation & Sources

### Official Documentation

**Steam/Valve:**
- Steam OpenID Documentation: https://steamcommunity.com/dev
- Steam Web API Documentation: https://developer.valvesoftware.com/wiki/Steam_Web_API
- Steam API Key Registration: https://steamcommunity.com/dev/apikey
- Valve Developer Community: https://developer.valvesoftware.com/

**NextAuth.js:**
- NextAuth.js Official Documentation: https://next-auth.js.org/
- NextAuth.js V4 Documentation: https://next-auth.js.org/v4
- NextAuth.js V5 Migration Guide: https://authjs.dev/getting-started/migrating-to-v5
- Steam Provider (Community): @hyperplay/next-auth-steam
- Auth.js (NextAuth.js V5): https://authjs.dev/

**Security Standards:**
- OpenID 2.0 Specification: https://openid.net/specs/openid-authentication-2_0.html
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Session Management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP JSON Web Token Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html

**Compliance & Legal:**
- GDPR Official Text: https://gdpr-info.eu/
- GDPR Article 15 (Right to Access): https://gdpr-info.eu/art-15-gdpr/
- GDPR Article 17 (Right to Erasure): https://gdpr-info.eu/art-17-gdpr/
- ICO (UK) - Right to Erasure Guide: https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/individual-rights/right-to-erasure/
- CNIL (France) - Gaming Platforms GDPR Compliance: https://www.cnil.fr/

---

### Community & Industry Resources

**Security Research:**
- Stack Overflow: "Steam OpenID Security Best Practices"
- GitHub: xpaw/steam-openid (PHP implementation reference)
- GitHub: node-steam-openid (Node.js implementation)
- LightOpenID CVE Reports (vulnerability references)
- Apache Airflow CVE-2022-40754 (OpenID vulnerabilities)

**NextAuth.js Community:**
- GitHub Issues: #9572 (NextAuth V5 Steam provider breaking changes)
- GitHub Issues: #8542 (Steam OpenID implementation discussions)
- NextAuth.js Discord Community
- Steam Provider Implementations: https://github.com/topics/nextauth-steam

**Performance & UX:**
- Baymard Institute: "Social Login UX Research"
- Auth0: "State of Authentication Report"
- Nielsen Norman Group: "Social Login Usability"

**Session Management Debates:**
- Auth.js Documentation: "Database Sessions vs JWT"
- Industry Analysis: "When NOT to use JWT"
- NIST SP 800-63B: Digital Identity Guidelines

**Steam API Community:**
- Reddit: r/SteamWebAPI (rate limit discussions)
- Valve Developer Community Forums
- Steam Web API GitHub Discussions

---

### Research Sources (From Web Search)

**Authentication Security:**
1. "Steam OpenID Authentication Security Best Practices" - Stack Overflow security discussions
2. "LightOpenID Vulnerabilities and Mitigations" - Security researcher blogs
3. "Hardcoded Provider Implementation for Steam" - GitHub implementation guides

**NextAuth.js Version Migration:**
4. "NextAuth V5 Breaking Changes for Legacy Providers" - NextAuth.js GitHub discussions
5. "@hyperplay/next-auth-steam Documentation" - Community Steam provider for V5
6. "steam-next-auth Package Analysis" - npm package documentation

**Session Management:**
7. "JWT vs Database Sessions for Financial Applications" - Industry security analysis
8. "Session Revocation Strategies" - OWASP Session Management Guide
9. "Hybrid Session Approaches" - Auth.js documentation and community implementations

**OpenID 2.0 Deprecation:**
10. "OpenID 2.0 Security Vulnerabilities (CVE Database)" - CVE records and analysis
11. "Apache Airflow CVE-2022-40754" - Real-world OpenID vulnerability case study
12. "Migration from OpenID 2.0 to OpenID Connect" - Protocol migration guides

**Steam API Limitations:**
13. "Steam Web API Rate Limits - Real-World Experience" - Reddit r/SteamWebAPI
14. "Handling 429 Errors from Steam API" - Valve Developer Community forums
15. "Steam API Caching Strategies" - Community best practices

**GDPR Compliance:**
16. "GDPR Compliance for Gaming Platforms" - CNIL (France) guidance
17. "Right to Erasure Implementation" - ICO (UK) official guide
18. "Data Export Endpoints (GDPR Article 15)" - GDPR.eu implementation examples

---

## Status

- [ ] Research complete
- [ ] NextAuth.js configured
- [ ] Steam Web API key obtained
- [ ] Database schema created
- [ ] Authentication flow implemented
- [ ] Frontend login UI built
- [ ] Session management tested
- [ ] Security audit complete
- [ ] Deployed to production

## Related Features

- **Depends On:**
  - Next.js project setup
  - Database provisioned

- **Enables:**
  - [07] Inventory Import
  - [09] Price Alerts
  - [11] Multi-Account Dashboard
  - [28] User Profiles
  - All personalization features

## References

- NextAuth.js Documentation: https://next-auth.js.org/
- Steam OpenID Documentation: https://steamcommunity.com/dev
- Steam Web API: https://developer.valvesoftware.com/wiki/Steam_Web_API
- OpenID 2.0 Spec: https://openid.net/specs/openid-authentication-2_0.html
