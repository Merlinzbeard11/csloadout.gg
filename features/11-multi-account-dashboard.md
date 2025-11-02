# 11 - Multi-Account Dashboard

## Overview

Unified dashboard for bulk traders managing multiple Steam accounts. Shows aggregated portfolio value, space utilization across all accounts, and enables cross-account item management. Solves the critical pain point of juggling multiple Steam inventories without a centralized view.

**Value Prop:** "Manage all your CS2 accounts in one place - see $50K across 8 accounts at a glance"

## User Segments Served

- **Primary:** Bulk Traders (managing 3-20+ Steam accounts)
- **Secondary:** Investors (2-3 accounts for diversification)
- **Tertiary:** Collectors (separate accounts for different collections)

## User Stories / Use Cases

### As a Bulk Trader
- I want to see total portfolio value across all 12 of my Steam accounts
- I want to know which accounts are near the 1,000 item limit
- I want to quickly switch between account views without re-authenticating
- I want to identify which items to move between accounts for optimal storage
- I want to see consolidated profit/loss across all accounts

### As an Investor
- I want to separate "long-term holds" (Account A) from "active trading" (Account B)
- I want to compare performance between accounts
- I want to track total exposure without switching between Steam profiles

### As a Collector
- I want Account A for "Complete AK-47 Collection" and Account B for "Katowice 2014 Stickers"
- I want to see completion percentage per collection per account

## Research & Context

### Multi-Account Trading Landscape

**Why Traders Use Multiple Accounts:**
```
1. Storage Limits:
   - CS2 free inventory: 1,000 items max
   - Storage units: $1.99 per 1,000 items (one-time purchase)
   - Bulk traders prefer multiple free accounts vs paying for storage

2. Risk Mitigation:
   - Spread inventory across accounts to reduce Steam ban impact
   - Separate "clean" trading accounts from "experimental" ones

3. Organization:
   - Account A: Cases (bulk 500x)
   - Account B: High-value skins ($500+)
   - Account C: Active trading inventory
   - Account D: Long-term investment holds

4. Trade Restrictions:
   - Steam Mobile Authenticator required for instant trades
   - Trade holds if SMA not enabled (15-day hold)
   - Separate accounts for different trade strategies
```

**Current Pain Points (No Solution Exists):**
- No platform aggregates multi-account inventory
- Users manually track accounts in spreadsheets
- Steam only shows one inventory at a time
- No way to see "total net worth" across all accounts
- Can't identify optimal account for new purchases (space availability)

**Competitive Gap:**
✅ **csloadout.gg ONLY platform offering this** - massive competitive advantage

### Multi-Account Management Best Practices

From research on portfolio dashboards (Personal Capital, Mint, investment platforms):

**Key Features Users Expect:**
- Single unified view (all accounts on one screen)
- Drill-down capability (click account → see details)
- Aggregated metrics (total value, total items, total space used)
- Account comparison (which account performing best)
- Quick account switching (no re-auth required)
- Account labeling/tagging ("Trading", "Long-term", "Cases")

**Visual Design Patterns:**
```
┌─────────────────────────────────────────────────┐
│ Total Portfolio: $47,352.67                     │
│ 8 Accounts • 4,237 Items • 54% Space Used       │
├─────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│ │ Account A   │ │ Account B   │ │ Account C   ││
│ │ $12,450     │ │ $8,920      │ │ $6,780      ││
│ │ 876/1000    │ │ 542/1000    │ │ 1000/1000   ││ <- Space bars
│ │ 📈 +12.5%   │ │ 📉 -3.2%    │ │ 📊 +5.1%    ││
│ └─────────────┘ └─────────────┘ └─────────────┘│
│ ...                                             │
└─────────────────────────────────────────────────┘
```

### Account Linking Security

**Steam Authentication for Multiple Accounts:**
```
Problem: User can only be logged into one Steam account at a time in browser
Solution: Link Steam IDs to csloadout.gg account, don't require simultaneous login

Flow:
1. User logs in with Steam (Account A) → Creates csloadout.gg account
2. User clicks "Add Another Steam Account"
3. Redirects to Steam login (signs out of Account A, signs into Account B)
4. Steam authenticates Account B → Returns to csloadout.gg
5. Link Account B's Steam ID to same csloadout.gg account
6. User can now view both accounts in dashboard (without being logged into Steam)
```

**Security Considerations:**
- Verify user owns both Steam accounts (email verification or trade verification)
- Limit to 20 linked accounts (prevent abuse)
- Allow unlinking accounts
- Show last sync time per account (user must re-auth if inventory private)

## Technical Requirements

### Database Schema

```sql
-- Extend users table to support primary account concept
ALTER TABLE users ADD COLUMN is_primary_account BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN primary_user_id UUID REFERENCES users(id);
-- primary_user_id IS NULL for primary accounts
-- primary_user_id points to primary for linked accounts

-- Alternative approach: Explicit account linking table
CREATE TABLE linked_steam_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- csloadout.gg user
  steam_id VARCHAR(20) NOT NULL UNIQUE,

  -- Account metadata
  steam_username VARCHAR(255),
  steam_avatar_url TEXT,
  account_label VARCHAR(100),           -- User-defined label ("Trading", "Cases", etc.)
  account_color VARCHAR(7),             -- Hex color for visual distinction

  -- Sync status
  last_synced TIMESTAMP,
  sync_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'success', 'private', 'error'
  is_primary BOOLEAN DEFAULT FALSE,     -- Mark one account as primary

  -- Space tracking
  total_items INTEGER DEFAULT 0,
  space_limit INTEGER DEFAULT 1000,     -- 1000 base + storage units
  space_used_percent DECIMAL(5,2),      -- Auto-calculated

  -- Portfolio metrics
  total_value DECIMAL(10,2),
  last_value_check TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, steam_id)             -- Prevent duplicate links
);

CREATE INDEX idx_linked_accounts_user ON linked_steam_accounts(user_id);
CREATE INDEX idx_linked_accounts_steam ON linked_steam_accounts(steam_id);

-- Update user_inventories to reference linked accounts
ALTER TABLE user_inventories
  ADD COLUMN linked_account_id UUID REFERENCES linked_steam_accounts(id);

-- Aggregated portfolio view (materialized view for performance)
CREATE MATERIALIZED VIEW user_portfolio_summary AS
SELECT
  la.user_id,
  COUNT(la.id) AS total_accounts,
  SUM(la.total_items) AS total_items,
  SUM(la.total_value) AS total_value,
  SUM(la.total_items) AS total_space_used,
  SUM(la.space_limit) AS total_space_available,
  (SUM(la.total_items)::DECIMAL / SUM(la.space_limit)::DECIMAL * 100) AS space_used_percent,
  MIN(la.last_synced) AS oldest_sync,
  MAX(la.last_synced) AS newest_sync
FROM linked_steam_accounts la
GROUP BY la.user_id;

CREATE UNIQUE INDEX idx_portfolio_summary_user ON user_portfolio_summary(user_id);

-- Refresh materialized view on demand or via cron
REFRESH MATERIALIZED VIEW CONCURRENTLY user_portfolio_summary;
```

### Multi-Account Sync Service

```typescript
// Service to manage multi-account syncing
class MultiAccountSyncService {
  async syncAllAccounts(userId: string): Promise<SyncSummary> {
    const accounts = await db.linkedSteamAccounts.findMany({
      where: { user_id: userId }
    });

    const results: AccountSyncResult[] = [];

    // Sync each account in parallel (Steam API allows this)
    await Promise.all(
      accounts.map(async (account) => {
        const result = await this.syncSingleAccount(account);
        results.push(result);
      })
    );

    // Refresh materialized view with new data
    await db.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY user_portfolio_summary`;

    return {
      totalAccounts: accounts.length,
      successfulSyncs: results.filter(r => r.status === 'success').length,
      failedSyncs: results.filter(r => r.status === 'error').length,
      privateSyncs: results.filter(r => r.status === 'private').length,
      results
    };
  }

  async syncSingleAccount(account: LinkedSteamAccount): Promise<AccountSyncResult> {
    try {
      // Use inventory import service from feature 07
      const inventoryService = new InventoryImportService();
      const syncResult = await inventoryService.syncInventory(account.user_id, account.steam_id);

      if (syncResult.status === 'success') {
        // Update account metrics
        await db.linkedSteamAccounts.update({
          where: { id: account.id },
          data: {
            total_items: syncResult.totalItems,
            total_value: syncResult.totalValue,
            space_used_percent: (syncResult.totalItems / account.space_limit) * 100,
            last_synced: new Date(),
            sync_status: 'success'
          }
        });

        return {
          accountId: account.id,
          steamId: account.steam_id,
          status: 'success',
          totalItems: syncResult.totalItems,
          totalValue: syncResult.totalValue
        };
      } else {
        // Handle private or error status
        await db.linkedSteamAccounts.update({
          where: { id: account.id },
          data: { sync_status: syncResult.status, last_synced: new Date() }
        });

        return {
          accountId: account.id,
          steamId: account.steam_id,
          status: syncResult.status,
          message: syncResult.message
        };
      }
    } catch (error) {
      console.error(`Failed to sync account ${account.steam_id}:`, error);
      return {
        accountId: account.id,
        steamId: account.steam_id,
        status: 'error',
        message: error.message
      };
    }
  }

  async getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    // Query materialized view for fast aggregated data
    const summary = await db.$queryRaw<PortfolioSummary[]>`
      SELECT * FROM user_portfolio_summary WHERE user_id = ${userId}
    `;

    if (summary.length === 0) {
      return {
        userId,
        totalAccounts: 0,
        totalItems: 0,
        totalValue: 0,
        spaceUsedPercent: 0,
        accounts: []
      };
    }

    // Get detailed account breakdown
    const accounts = await db.linkedSteamAccounts.findMany({
      where: { user_id: userId },
      orderBy: { total_value: 'desc' }
    });

    return {
      ...summary[0],
      accounts: accounts.map(a => ({
        id: a.id,
        steamId: a.steam_id,
        label: a.account_label,
        color: a.account_color,
        totalItems: a.total_items,
        totalValue: a.total_value,
        spaceUsed: a.total_items,
        spaceLimit: a.space_limit,
        spaceUsedPercent: a.space_used_percent,
        lastSynced: a.last_synced,
        syncStatus: a.sync_status
      }))
    };
  }
}
```

### Account Linking Flow

```typescript
// pages/api/accounts/link.ts
// Step 1: User initiates linking (must be authenticated)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Redirect to Steam OpenID with special callback
  const callbackUrl = `${process.env.NEXTAUTH_URL}/api/accounts/link/callback`;
  const steamLoginUrl = buildSteamOpenIDUrl(callbackUrl);

  return NextResponse.json({ redirectUrl: steamLoginUrl });
}

// Step 2: Steam returns after authentication
// pages/api/accounts/link/callback.ts
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.redirect('/login?error=session_expired');

  // Extract Steam ID from OpenID response
  const steamId = extractSteamIdFromCallback(req.url);

  // Check if this Steam ID is already linked to ANY csloadout.gg account
  const existingLink = await db.linkedSteamAccounts.findFirst({
    where: { steam_id: steamId }
  });

  if (existingLink && existingLink.user_id !== session.user.id) {
    // This Steam account is already linked to a different user
    return NextResponse.redirect('/dashboard/accounts?error=already_linked');
  }

  // Fetch Steam profile data
  const steamProfile = await fetchSteamProfile(steamId);

  // Create link
  await db.linkedSteamAccounts.create({
    data: {
      user_id: session.user.id,
      steam_id: steamId,
      steam_username: steamProfile.personaname,
      steam_avatar_url: steamProfile.avatarfull,
      account_label: `Account ${await getNextAccountNumber(session.user.id)}`,
      account_color: generateRandomColor(),
      is_primary: false, // Primary is the one used for initial login
      sync_status: 'pending'
    }
  });

  // Trigger background sync
  const syncService = new MultiAccountSyncService();
  syncService.syncSingleAccountByUserId(session.user.id, steamId);

  return NextResponse.redirect('/dashboard/accounts?success=account_linked');
}

// Helper to get next account number for default label
async function getNextAccountNumber(userId: string): Promise<number> {
  const count = await db.linkedSteamAccounts.count({
    where: { user_id: userId }
  });
  return count + 1;
}
```

### API Endpoints

```typescript
// Get portfolio summary (all accounts aggregated)
GET /api/portfolio/summary
Response: {
  totalAccounts: 8,
  totalItems: 4237,
  totalValue: 47352.67,
  spaceUsedPercent: 54.2,
  oldestSync: "2025-11-01T08:30:00Z",
  newestSync: "2025-11-02T14:20:00Z",
  accounts: [
    {
      id: "...",
      steamId: "76561198012345678",
      label: "Trading Account",
      color: "#3B82F6",
      totalItems: 876,
      totalValue: 12450.00,
      spaceUsed: 876,
      spaceLimit: 1000,
      spaceUsedPercent: 87.6,
      lastSynced: "2025-11-02T14:20:00Z",
      syncStatus: "success"
    },
    // ... 7 more accounts
  ]
}

// Get detailed inventory for specific account
GET /api/accounts/:accountId/inventory
Response: {
  account: {
    id: "...",
    label: "Trading Account",
    steamId: "76561198012345678",
    // ...
  },
  inventory: {
    totalItems: 876,
    totalValue: 12450.00,
    items: [
      {
        id: "...",
        name: "AK-47 | Redline",
        currentValue: 8.67,
        // ... full item details
      },
      // ...
    ]
  }
}

// Link new Steam account
POST /api/accounts/link
Response: {
  redirectUrl: "https://steamcommunity.com/openid/login?..."
}

// Update account settings (label, color)
PATCH /api/accounts/:accountId
Body: {
  label: "Case Storage",
  color: "#10B981"
}
Response: { success: true, account: {...} }

// Unlink Steam account
DELETE /api/accounts/:accountId
Response: { success: true }

// Sync all accounts (trigger refresh)
POST /api/portfolio/sync
Response: {
  totalAccounts: 8,
  successfulSyncs: 7,
  failedSyncs: 0,
  privateSyncs: 1,
  results: [...]
}

// Get account comparison metrics
GET /api/portfolio/comparison
Response: {
  accounts: [
    {
      accountId: "...",
      label: "Trading Account",
      metrics: {
        totalValue: 12450.00,
        valueChange30d: 1245.67,
        valueChangePercent: 11.3,
        averageItemValue: 14.21,
        topItem: { name: "...", value: 450.00 }
      }
    },
    // ...
  ]
}
```

### Frontend Components

```typescript
// Multi-Account Dashboard Page
// pages/dashboard/accounts.tsx
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"

export default function MultiAccountDashboard() {
  const { data: session } = useSession()
  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: () => fetch('/api/portfolio/summary').then(r => r.json())
  })

  if (isLoading) return <LoadingSkeleton />

  return (
    <div className="container mx-auto p-6">
      {/* Portfolio Header */}
      <PortfolioHeader
        totalValue={portfolio.totalValue}
        totalItems={portfolio.totalItems}
        totalAccounts={portfolio.totalAccounts}
        spaceUsedPercent={portfolio.spaceUsedPercent}
      />

      {/* Quick Actions */}
      <div className="flex gap-4 my-6">
        <button
          onClick={handleSyncAll}
          className="btn-primary"
        >
          🔄 Sync All Accounts
        </button>
        <button
          onClick={handleAddAccount}
          className="btn-secondary"
        >
          ➕ Add Steam Account
        </button>
      </div>

      {/* Account Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {portfolio.accounts.map(account => (
          <AccountCard
            key={account.id}
            account={account}
            onViewInventory={() => router.push(`/accounts/${account.id}`)}
            onEdit={() => setEditingAccount(account)}
          />
        ))}
      </div>

      {/* Account Comparison Table */}
      <AccountComparisonTable accounts={portfolio.accounts} />
    </div>
  )
}

// Portfolio Header Component
function PortfolioHeader({ totalValue, totalItems, totalAccounts, spaceUsedPercent }) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
      <h1 className="text-4xl font-bold mb-4">
        ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </h1>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-blue-100">Total Accounts</div>
          <div className="text-2xl font-semibold">{totalAccounts}</div>
        </div>
        <div>
          <div className="text-blue-100">Total Items</div>
          <div className="text-2xl font-semibold">{totalItems.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-blue-100">Space Used</div>
          <div className="text-2xl font-semibold">{spaceUsedPercent.toFixed(1)}%</div>
        </div>
      </div>

      {/* Overall space usage bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-blue-100 mb-1">
          <span>Total Space Usage</span>
          <span>{totalItems} / {totalAccounts * 1000} items</span>
        </div>
        <div className="w-full bg-blue-800 rounded-full h-2">
          <div
            className="bg-white rounded-full h-2 transition-all"
            style={{ width: `${spaceUsedPercent}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// Account Card Component
function AccountCard({ account, onViewInventory, onEdit }) {
  const spaceWarning = account.spaceUsedPercent >= 90;
  const spaceCritical = account.spaceUsedPercent >= 98;

  return (
    <div
      className="bg-white rounded-lg shadow-md p-6 border-t-4 hover:shadow-lg transition-shadow"
      style={{ borderTopColor: account.color }}
    >
      {/* Account Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img
            src={account.steamAvatarUrl}
            alt={account.label}
            className="w-12 h-12 rounded-full"
          />
          <div>
            <h3 className="font-semibold text-lg">{account.label}</h3>
            <p className="text-sm text-gray-500">{account.steamUsername}</p>
          </div>
        </div>
        <button onClick={onEdit} className="text-gray-400 hover:text-gray-600">
          ⚙️
        </button>
      </div>

      {/* Value & Items */}
      <div className="mb-4">
        <div className="text-3xl font-bold text-green-600">
          ${account.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
        <div className="text-sm text-gray-500">
          {account.totalItems} items
        </div>
      </div>

      {/* Space Usage */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Space Used</span>
          <span className={spaceCritical ? 'text-red-600 font-semibold' : spaceWarning ? 'text-orange-600' : ''}>
            {account.spaceUsed} / {account.spaceLimit}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`rounded-full h-2 transition-all ${
              spaceCritical ? 'bg-red-500' : spaceWarning ? 'bg-orange-500' : 'bg-green-500'
            }`}
            style={{ width: `${account.spaceUsedPercent}%` }}
          />
        </div>
        {spaceCritical && (
          <p className="text-xs text-red-600 mt-1">⚠️ Almost full!</p>
        )}
      </div>

      {/* Sync Status */}
      <div className="text-xs text-gray-500 mb-4">
        Last synced: {formatRelative(account.lastSynced)}
        {account.syncStatus !== 'success' && (
          <span className="text-orange-600 ml-2">⚠️ {account.syncStatus}</span>
        )}
      </div>

      {/* Actions */}
      <button
        onClick={onViewInventory}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
      >
        View Inventory
      </button>
    </div>
  )
}

// Account Comparison Table
function AccountComparisonTable({ accounts }) {
  const [sortBy, setSortBy] = useState<'value' | 'items' | 'space'>('value')

  const sorted = [...accounts].sort((a, b) => {
    switch (sortBy) {
      case 'value': return b.totalValue - a.totalValue
      case 'items': return b.totalItems - a.totalItems
      case 'space': return b.spaceUsedPercent - a.spaceUsedPercent
    }
  })

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-8">
      <h2 className="text-xl font-semibold mb-4">Account Comparison</h2>

      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Account</th>
            <th
              className="text-right py-2 cursor-pointer hover:bg-gray-50"
              onClick={() => setSortBy('value')}
            >
              Value {sortBy === 'value' && '▼'}
            </th>
            <th
              className="text-right py-2 cursor-pointer hover:bg-gray-50"
              onClick={() => setSortBy('items')}
            >
              Items {sortBy === 'items' && '▼'}
            </th>
            <th
              className="text-right py-2 cursor-pointer hover:bg-gray-50"
              onClick={() => setSortBy('space')}
            >
              Space {sortBy === 'space' && '▼'}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(account => (
            <tr key={account.id} className="border-b hover:bg-gray-50">
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: account.color }}
                  />
                  {account.label}
                </div>
              </td>
              <td className="text-right font-semibold">
                ${account.totalValue.toLocaleString()}
              </td>
              <td className="text-right">
                {account.totalItems}
              </td>
              <td className="text-right">
                {account.spaceUsedPercent.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold">
            <td className="py-3">Total</td>
            <td className="text-right">
              ${sorted.reduce((sum, a) => sum + a.totalValue, 0).toLocaleString()}
            </td>
            <td className="text-right">
              {sorted.reduce((sum, a) => sum + a.totalItems, 0)}
            </td>
            <td className="text-right">
              {(sorted.reduce((sum, a) => sum + a.spaceUsedPercent, 0) / sorted.length).toFixed(1)}%
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// Add Account Modal
function AddAccountModal({ isOpen, onClose }) {
  const handleAddAccount = async () => {
    const response = await fetch('/api/accounts/link', { method: 'POST' })
    const { redirectUrl } = await response.json()
    window.location.href = redirectUrl // Redirect to Steam
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Add Steam Account</h2>
        <p className="text-gray-600 mb-6">
          You'll be redirected to Steam to authenticate. After logging in with
          another Steam account, we'll link it to your csloadout.gg account.
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> You can only be logged into one Steam account
            at a time in your browser. We'll temporarily log you out of your current
            Steam session to authenticate the new account.
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleAddAccount}
            className="btn-primary"
          >
            Continue to Steam
          </button>
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}
```

## Success Metrics

- ✅ 60%+ bulk traders link 2+ accounts (of premium users)
- ✅ Average 4.5 accounts per bulk trader
- ✅ <5s portfolio summary load time (8 accounts aggregated)
- ✅ 80%+ sync success rate (accounts with public inventories)
- ✅ 40%+ users sync all accounts weekly (active engagement)

## Dependencies

### Must Have Before Starting
- [06] Steam Authentication (to link additional Steam accounts)
- [07] Inventory Import (to sync each account's inventory)
- Database with user accounts

### Blocks Other Features
- [12] Bulk Inventory Operations (needs multi-account foundation)
- [14] Bulk Transaction History (needs account aggregation)
- [15] Portfolio Analytics (needs consolidated data)

## Effort Estimate

- **Development Time:** 1-2 weeks
- **Complexity:** Medium-High
- **Team Size:** 1 developer

**Breakdown:**
- Days 1-3: Database schema, account linking flow
- Days 4-6: Multi-account sync service, materialized views
- Days 7-9: Frontend dashboard, account cards
- Days 10-11: Account comparison, space tracking
- Day 12: Testing, edge cases, optimization

## Implementation Notes

### Account Limit Enforcement

```typescript
// Prevent abuse - limit to 20 linked accounts
const MAX_LINKED_ACCOUNTS = 20;

async function canLinkAccount(userId: string): Promise<boolean> {
  const count = await db.linkedSteamAccounts.count({
    where: { user_id: userId }
  });

  return count < MAX_LINKED_ACCOUNTS;
}

// Premium users could have higher limit (30 accounts)
async function getAccountLimit(userId: string): Promise<number> {
  const user = await db.users.findUnique({ where: { id: userId } });

  switch (user.premium_tier) {
    case 'pro': return 30;
    case 'premium': return 20;
    case 'free': return 10;
    default: return 10;
  }
}
```

### Materialized View Refresh Strategy

```typescript
// Refresh materialized view efficiently
// Option 1: On-demand refresh (after sync operations)
async function refreshPortfolioSummary() {
  await db.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY user_portfolio_summary`;
}

// Option 2: Scheduled refresh (every 15 minutes via cron)
cron.schedule('*/15 * * * *', async () => {
  console.log('Refreshing portfolio summary view...');
  await db.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY user_portfolio_summary`;
});

// Option 3: Trigger-based refresh (PostgreSQL trigger)
// Create trigger on linked_steam_accounts that refreshes view on UPDATE
```

### Space Utilization Alerts

```typescript
// Notify user when accounts near capacity
class SpaceAlertService {
  async checkSpaceAlerts(userId: string) {
    const accounts = await db.linkedSteamAccounts.findMany({
      where: {
        user_id: userId,
        space_used_percent: { gte: 90 } // 90%+ full
      }
    });

    if (accounts.length > 0) {
      await this.sendSpaceWarningEmail(userId, accounts);
    }
  }

  async sendSpaceWarningEmail(userId: string, accounts: LinkedSteamAccount[]) {
    const user = await db.users.findUnique({ where: { id: userId } });

    await sendEmail({
      to: user.email,
      subject: '⚠️ Storage Space Running Low',
      html: `
        <h2>Your CS2 Inventory Space is Running Low</h2>
        <p>The following accounts are near capacity:</p>
        <ul>
          ${accounts.map(a => `
            <li>${a.account_label}: ${a.total_items}/${a.space_limit} items (${a.space_used_percent}% full)</li>
          `).join('')}
        </ul>
        <p>Consider moving items to other accounts or purchasing storage units.</p>
      `
    });
  }
}

// Run daily
cron.schedule('0 9 * * *', async () => {
  // Check all users with linked accounts
  const users = await db.users.findMany({
    where: { linkedSteamAccounts: { some: {} } }
  });

  const alertService = new SpaceAlertService();
  for (const user of users) {
    await alertService.checkSpaceAlerts(user.id);
  }
});
```

### Gotchas to Watch For

1. **Steam Authentication Limitations**
   - User can only be logged into ONE Steam account at a time in browser
   - Linking Account B requires logging out of Account A
   - Solution: Clear UX explaining the flow, show success confirmation

2. **Private Inventories**
   - Linked account may change privacy settings after linking
   - Solution: Show sync status, prompt user to make inventory public again

3. **Account Ownership Verification**
   - How to verify user owns the Steam account they're linking?
   - MVP: Trust Steam OpenID (if they can log in, they own it)
   - Phase 2: Email verification or trade verification

4. **Sync Performance**
   - Syncing 10 accounts with 1,000 items each = 10,000 items
   - Solution: Parallel syncing, materialized views, background jobs

5. **Materialized View Staleness**
   - Portfolio summary could be out of sync with real-time data
   - Solution: Refresh after syncs, show "Last updated X minutes ago"

6. **Account Unlinking**
   - What happens to inventory data when user unlinks account?
   - Solution: Soft delete (keep historical data), allow re-linking

7. **Duplicate Prevention**
   - Same Steam ID linked to multiple csloadout.gg accounts
   - Solution: UNIQUE constraint on steam_id, check before linking

8. **Session Management**
   - User logs in with Account A, links Account B - which session is active?
   - Solution: csloadout.gg session is separate from Steam session

## Status

- [ ] Research complete
- [ ] Database schema created
- [ ] Account linking flow implemented
- [ ] Multi-account sync service built
- [ ] Materialized view configured
- [ ] Frontend dashboard created
- [ ] Account comparison table built
- [ ] Space alerts implemented
- [ ] Testing complete
- [ ] Deployed to production

## Related Features

- **Depends On:**
  - [06] Steam Authentication
  - [07] Inventory Import

- **Enables:**
  - [12] Bulk Inventory Operations
  - [13] Cross-Platform Listing Manager
  - [14] Bulk Transaction History
  - [15] Portfolio Analytics
  - [21] Inventory Optimization

## References

- Steam Web API Documentation: https://developer.valvesoftware.com/wiki/Steam_Web_API
- PostgreSQL Materialized Views: https://www.postgresql.org/docs/current/sql-creatematerializedview.html
- NextAuth.js Multi-Provider: https://next-auth.js.org/configuration/providers
