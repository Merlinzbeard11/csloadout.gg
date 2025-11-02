# Feature 22: Duplicate Detection & Consolidation

## Overview
Intelligent duplicate detection system that identifies identical or similar items across multiple Steam accounts, helps users consolidate duplicates to free up inventory space, and prevents accidental duplicate purchases. Essential for bulk traders managing thousands of items across multiple accounts.

## User Segments
- **Primary**: Bulk Traders, Market Makers
- **Secondary**: Wholesalers, Investors
- **Tertiary**: Casual Traders, Hobbyists

## User Stories

### As a Bulk Trader
- I want to see all duplicate items across my linked accounts so I can consolidate them
- I want to identify items I have multiple copies of that I should sell
- I want to be alerted before purchasing an item I already own
- I want to see which items are duplicated the most (may indicate overstock)
- I want to auto-list duplicates for sale while keeping one copy

### As a Market Maker
- I want to optimize inventory space by consolidating duplicates to fewer accounts
- I want to identify arbitrage opportunities (same item at different prices across accounts)
- I want to see duplicate stickers/patches that can be combined on a single skin
- I want to track "useful duplicates" (intentional duplicates for trading) vs "waste duplicates"

### As a Casual Trader
- I want to avoid accidentally buying items I already own
- I want to know if I have duplicates so I can sell extras
- I want to see my "unique item count" vs "total item count"

### As the Platform
- I want to help users optimize inventory space (1,000 item limit per account)
- I want to reduce user frustration from accidental duplicate purchases
- I want to provide insights that save users money

## Research & Context

### Steam Inventory Constraints
- **Item Limit**: 1,000 items per Steam account
- **Problem**: Users with 5+ accounts can easily accumulate duplicates unknowingly
- **Pain Point**: Buying same item twice wastes capital and inventory slots

### Types of Duplicates

1. **Exact Duplicates**
   - Same item (market_hash_name)
   - Same float value
   - Same stickers/patches
   - Example: 2x "AK-47 | Redline (Field-Tested)" with 0.25 float

2. **Functional Duplicates**
   - Same item, different float/wear
   - Example: "AWP | Dragon Lore (FN)" and "AWP | Dragon Lore (MW)"
   - User may only need one

3. **Sticker Duplicates**
   - Same stickers across multiple skins
   - Opportunity to consolidate onto one "god-tier" skin

4. **Near-Duplicates**
   - Similar items (e.g., different AK-47 skins)
   - User may prefer to diversify

### Consolidation Strategies

1. **Keep Best, Sell Rest**
   - Keep highest float (FN condition)
   - Sell lower quality duplicates

2. **Keep One Per Account**
   - Distribute unique items across accounts
   - Maximize space utilization

3. **Intentional Duplicates**
   - Keep 2-3 copies for high-volume trading
   - Mark as "do not flag"

### Competitor Analysis
- **Steam**: No duplicate detection
- **CSFloat**: No duplicate detection
- **Skinport**: No duplicate detection
- **Opportunity**: First-to-market feature that solves real pain point

## Technical Requirements

### Database Schema

```sql
-- Duplicate detection results
CREATE TABLE duplicate_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Group metadata
  item_name VARCHAR(255) NOT NULL, -- market_hash_name
  duplicate_type VARCHAR(50) NOT NULL, -- 'exact', 'functional', 'sticker', 'near'
  total_duplicates INTEGER NOT NULL,
  total_value DECIMAL(10,2) NOT NULL,

  -- Consolidation recommendation
  recommended_action VARCHAR(50), -- 'sell_all_but_one', 'consolidate_stickers', 'redistribute', 'ignore'
  potential_savings DECIMAL(10,2), -- Space or capital freed

  -- Detection metadata
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),

  -- User action tracking
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'resolved', 'ignored'
  resolved_at TIMESTAMPTZ,

  INDEX idx_duplicate_groups_user_id (user_id),
  INDEX idx_duplicate_groups_status (status),
  INDEX idx_duplicate_groups_detected_at (detected_at DESC)
);

-- Individual items in duplicate group
CREATE TABLE duplicate_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duplicate_group_id UUID NOT NULL REFERENCES duplicate_groups(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,

  -- Item details
  account_id UUID REFERENCES linked_steam_accounts(id),
  current_value DECIMAL(10,2),
  float_value DECIMAL(10,8),
  stickers JSONB,

  -- Recommendation
  keep BOOLEAN DEFAULT false, -- Recommended to keep this one
  reason TEXT, -- Why keep or sell

  INDEX idx_duplicate_items_group_id (duplicate_group_id),
  INDEX idx_duplicate_items_inventory_id (inventory_item_id)
);

-- Duplicate prevention rules (user preferences)
CREATE TABLE duplicate_prevention_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Rule configuration
  rule_type VARCHAR(50) NOT NULL, -- 'block_purchase', 'warn_purchase', 'allow_duplicates'
  item_pattern VARCHAR(255), -- Regex or exact match, e.g., "AWP | Dragon Lore*"

  -- Duplicate tolerance
  max_allowed_duplicates INTEGER DEFAULT 1,
  allow_different_floats BOOLEAN DEFAULT false,
  allow_different_stickers BOOLEAN DEFAULT true,

  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_duplicate_prevention_user_id (user_id, is_enabled)
);

-- Duplicate check history (for pre-purchase warnings)
CREATE TABLE duplicate_check_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Check details
  item_checked VARCHAR(255) NOT NULL, -- market_hash_name
  has_duplicates BOOLEAN NOT NULL,
  duplicate_count INTEGER DEFAULT 0,

  -- User decision
  user_action VARCHAR(50), -- 'proceeded_anyway', 'cancelled_purchase', null (still deciding)

  checked_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_duplicate_check_user_item (user_id, item_checked, checked_at DESC)
);

-- Consolidation history (track what users consolidated)
CREATE TABLE consolidation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  duplicate_group_id UUID REFERENCES duplicate_groups(id) ON DELETE SET NULL,

  -- Consolidation details
  action_type VARCHAR(50) NOT NULL, -- 'sold_duplicates', 'transferred_items', 'deleted_items'
  items_affected INTEGER NOT NULL,
  space_freed INTEGER, -- Inventory slots freed
  capital_freed DECIMAL(10,2), -- Money freed up

  consolidated_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_consolidation_user_date (user_id, consolidated_at DESC)
);
```

### Services

#### `src/services/DuplicateDetectionService.ts`

```typescript
import { db } from '@/lib/db';

interface DuplicateGroup {
  id: string;
  itemName: string;
  duplicateType: 'exact' | 'functional' | 'sticker' | 'near';
  totalDuplicates: number;
  totalValue: number;
  recommendedAction: string;
  potentialSavings: number;
  items: DuplicateItem[];
}

interface DuplicateItem {
  inventoryItemId: string;
  accountId: string;
  currentValue: number;
  floatValue: number;
  stickers: any[];
  keep: boolean;
  reason: string;
}

export class DuplicateDetectionService {
  /**
   * Scan user's entire inventory for duplicates
   */
  async scanForDuplicates(userId: string): Promise<DuplicateGroup[]> {
    const duplicateGroups: DuplicateGroup[] = [];

    // Get all inventory items across all linked accounts
    const inventory = await db.inventory_items.findMany({
      where: { user_id: userId },
      include: { linked_account: true },
    });

    // Group items by market_hash_name
    const itemsByName = new Map<string, any[]>();
    inventory.forEach((item) => {
      const key = item.market_hash_name;
      if (!itemsByName.has(key)) {
        itemsByName.set(key, []);
      }
      itemsByName.get(key)!.push(item);
    });

    // Identify duplicate groups
    for (const [itemName, items] of itemsByName.entries()) {
      if (items.length < 2) continue; // Not a duplicate

      // Determine duplicate type
      const duplicateType = this.classifyDuplicateType(items);

      // Calculate total value
      const totalValue = items.reduce((sum, item) => sum + (item.current_value || 0), 0);

      // Generate recommendation
      const { recommendedAction, potentialSavings, itemRecommendations } = this.generateConsolidationRecommendation(items);

      // Create duplicate group
      const group: DuplicateGroup = {
        id: '', // Will be set after DB insert
        itemName,
        duplicateType,
        totalDuplicates: items.length,
        totalValue,
        recommendedAction,
        potentialSavings,
        items: itemRecommendations,
      };

      duplicateGroups.push(group);
    }

    // Save to database
    await this.saveDuplicateGroups(userId, duplicateGroups);

    return duplicateGroups;
  }

  /**
   * Classify type of duplicate
   */
  private classifyDuplicateType(items: any[]): 'exact' | 'functional' | 'sticker' | 'near' {
    // Check if all items have same float and stickers (exact duplicates)
    const firstItem = items[0];
    const allExact = items.every((item) =>
      Math.abs((item.float_value || 0) - (firstItem.float_value || 0)) < 0.0001 &&
      JSON.stringify(item.stickers || []) === JSON.stringify(firstItem.stickers || [])
    );

    if (allExact) {
      return 'exact';
    }

    // Check if stickers are duplicated
    const stickerCounts = new Map<string, number>();
    items.forEach((item) => {
      (item.stickers || []).forEach((sticker: any) => {
        const key = sticker.name;
        stickerCounts.set(key, (stickerCounts.get(key) || 0) + 1);
      });
    });

    const hasDuplicateStickers = Array.from(stickerCounts.values()).some((count) => count > 1);
    if (hasDuplicateStickers) {
      return 'sticker';
    }

    // Check if functional duplicates (same item, different condition)
    const baseName = items[0].market_hash_name.split('(')[0].trim();
    const allSameBase = items.every((item) => item.market_hash_name.startsWith(baseName));
    if (allSameBase) {
      return 'functional';
    }

    return 'near';
  }

  /**
   * Generate consolidation recommendation
   */
  private generateConsolidationRecommendation(items: any[]): {
    recommendedAction: string;
    potentialSavings: number;
    itemRecommendations: DuplicateItem[];
  } {
    // Sort items by quality (float, stickers, value)
    const sortedItems = items.sort((a, b) => {
      // Prefer lower float (better condition)
      if (a.float_value !== b.float_value) {
        return (a.float_value || 1) - (b.float_value || 1);
      }

      // Prefer items with stickers
      const aStickerCount = (a.stickers || []).length;
      const bStickerCount = (b.stickers || []).length;
      if (aStickerCount !== bStickerCount) {
        return bStickerCount - aStickerCount;
      }

      // Prefer higher value
      return (b.current_value || 0) - (a.current_value || 0);
    });

    // Recommendation: Keep best one, sell rest
    const bestItem = sortedItems[0];
    const itemsToSell = sortedItems.slice(1);

    const potentialSavings = itemsToSell.reduce((sum, item) => sum + (item.current_value || 0), 0);

    const itemRecommendations: DuplicateItem[] = sortedItems.map((item, index) => ({
      inventoryItemId: item.id,
      accountId: item.linked_account_id,
      currentValue: item.current_value || 0,
      floatValue: item.float_value || 0,
      stickers: item.stickers || [],
      keep: index === 0, // Keep only the best one
      reason: index === 0
        ? 'Best quality (lowest float, most stickers, highest value)'
        : `Lower quality than kept item (float: ${item.float_value?.toFixed(6) || 'N/A'})`,
    }));

    return {
      recommendedAction: 'sell_all_but_one',
      potentialSavings,
      itemRecommendations,
    };
  }

  /**
   * Save duplicate groups to database
   */
  private async saveDuplicateGroups(userId: string, groups: DuplicateGroup[]): Promise<void> {
    // Delete old duplicate groups
    await db.duplicate_groups.deleteMany({
      where: { user_id: userId },
    });

    // Insert new groups
    for (const group of groups) {
      const dbGroup = await db.duplicate_groups.create({
        data: {
          user_id: userId,
          item_name: group.itemName,
          duplicate_type: group.duplicateType,
          total_duplicates: group.totalDuplicates,
          total_value: group.totalValue,
          recommended_action: group.recommendedAction,
          potential_savings: group.potentialSavings,
        },
      });

      // Insert duplicate items
      for (const item of group.items) {
        await db.duplicate_items.create({
          data: {
            duplicate_group_id: dbGroup.id,
            inventory_item_id: item.inventoryItemId,
            account_id: item.accountId,
            current_value: item.currentValue,
            float_value: item.floatValue,
            stickers: item.stickers,
            keep: item.keep,
            reason: item.reason,
          },
        });
      }
    }
  }

  /**
   * Check if user is about to purchase a duplicate
   */
  async checkBeforePurchase(userId: string, itemName: string): Promise<{
    hasDuplicates: boolean;
    duplicateCount: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }> {
    // Get user's prevention rules
    const rules = await db.duplicate_prevention_rules.findMany({
      where: { user_id: userId, is_enabled: true },
    });

    // Check if item matches any rule pattern
    const matchedRule = rules.find((rule) => {
      if (rule.item_pattern === '*') return true; // Match all
      return itemName.includes(rule.item_pattern || '');
    });

    if (!matchedRule) {
      // No rules apply, allow purchase
      return { hasDuplicates: false, duplicateCount: 0, message: '', severity: 'info' };
    }

    // Check existing inventory
    const existingItems = await db.inventory_items.findMany({
      where: {
        user_id: userId,
        market_hash_name: itemName,
      },
    });

    const duplicateCount = existingItems.length;

    // Log check history
    await db.duplicate_check_history.create({
      data: {
        user_id: userId,
        item_checked: itemName,
        has_duplicates: duplicateCount > 0,
        duplicate_count: duplicateCount,
      },
    });

    if (duplicateCount === 0) {
      return { hasDuplicates: false, duplicateCount: 0, message: '', severity: 'info' };
    }

    // Check if exceeds max allowed
    if (duplicateCount >= (matchedRule.max_allowed_duplicates || 1)) {
      if (matchedRule.rule_type === 'block_purchase') {
        return {
          hasDuplicates: true,
          duplicateCount,
          message: `Purchase blocked: You already own ${duplicateCount} of this item. Maximum allowed: ${matchedRule.max_allowed_duplicates}.`,
          severity: 'error',
        };
      } else if (matchedRule.rule_type === 'warn_purchase') {
        return {
          hasDuplicates: true,
          duplicateCount,
          message: `Warning: You already own ${duplicateCount} of this item. Are you sure you want to purchase another?`,
          severity: 'warning',
        };
      }
    }

    return {
      hasDuplicates: true,
      duplicateCount,
      message: `You already own ${duplicateCount} of this item.`,
      severity: 'info',
    };
  }

  /**
   * Get duplicate summary statistics
   */
  async getDuplicateStats(userId: string): Promise<{
    totalDuplicateGroups: number;
    totalDuplicateItems: number;
    totalValueInDuplicates: number;
    potentialSavings: number;
    spaceWasted: number; // Inventory slots
  }> {
    const groups = await db.duplicate_groups.findMany({
      where: { user_id: userId, status: 'pending' },
    });

    const totalDuplicateGroups = groups.length;
    const totalDuplicateItems = groups.reduce((sum, g) => sum + (g.total_duplicates - 1), 0); // Exclude one "keeper" per group
    const totalValueInDuplicates = groups.reduce((sum, g) => sum + g.total_value, 0);
    const potentialSavings = groups.reduce((sum, g) => sum + (g.potential_savings || 0), 0);
    const spaceWasted = totalDuplicateItems; // Each duplicate item wastes 1 slot

    return {
      totalDuplicateGroups,
      totalDuplicateItems,
      totalValueInDuplicates,
      potentialSavings,
      spaceWasted,
    };
  }

  /**
   * Consolidate duplicates (auto-list for sale)
   */
  async consolidateDuplicates(userId: string, groupId: string): Promise<void> {
    const group = await db.duplicate_groups.findUnique({
      where: { id: groupId },
      include: { items: true },
    });

    if (!group) {
      throw new Error('Duplicate group not found');
    }

    // Get items to sell (keep=false)
    const itemsToSell = (group as any).items.filter((item: any) => !item.keep);

    // TODO: Integrate with Feature 13 (Cross-Platform Listing Manager)
    // Auto-list these items for sale
    for (const item of itemsToSell) {
      // await crossPlatformListingService.createListing(...)
    }

    // Mark group as resolved
    await db.duplicate_groups.update({
      where: { id: groupId },
      data: {
        status: 'resolved',
        resolved_at: new Date(),
      },
    });

    // Log consolidation
    await db.consolidation_history.create({
      data: {
        user_id: userId,
        duplicate_group_id: groupId,
        action_type: 'sold_duplicates',
        items_affected: itemsToSell.length,
        space_freed: itemsToSell.length,
        capital_freed: itemsToSell.reduce((sum: number, item: any) => sum + item.current_value, 0),
      },
    });
  }

  /**
   * Create or update duplicate prevention rule
   */
  async setPreventionRule(
    userId: string,
    ruleType: 'block_purchase' | 'warn_purchase' | 'allow_duplicates',
    itemPattern: string = '*',
    maxAllowedDuplicates: number = 1
  ): Promise<void> {
    await db.duplicate_prevention_rules.upsert({
      where: {
        user_id_item_pattern: {
          user_id: userId,
          item_pattern: itemPattern,
        },
      },
      update: {
        rule_type: ruleType,
        max_allowed_duplicates: maxAllowedDuplicates,
        is_enabled: true,
      },
      create: {
        user_id: userId,
        rule_type: ruleType,
        item_pattern: itemPattern,
        max_allowed_duplicates: maxAllowedDuplicates,
        is_enabled: true,
      },
    });
  }
}

export const duplicateDetectionService = new DuplicateDetectionService();
```

### API Endpoints

#### `src/app/api/duplicates/scan/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { duplicateDetectionService } from '@/services/DuplicateDetectionService';

// POST /api/duplicates/scan - Scan for duplicates
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groups = await duplicateDetectionService.scanForDuplicates(session.user.id);
    return NextResponse.json({ groups });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### `src/app/api/duplicates/stats/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { duplicateDetectionService } from '@/services/DuplicateDetectionService';

// GET /api/duplicates/stats - Get duplicate statistics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await duplicateDetectionService.getDuplicateStats(session.user.id);
    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### `src/app/api/duplicates/check-purchase/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { duplicateDetectionService } from '@/services/DuplicateDetectionService';

// POST /api/duplicates/check-purchase - Check before purchasing
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemName } = await req.json();

    const result = await duplicateDetectionService.checkBeforePurchase(session.user.id, itemName);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## Frontend Components

### `src/app/dashboard/duplicates/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function DuplicatesPage() {
  const [stats, setStats] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const res = await fetch('/api/duplicates/stats');
    const data = await res.json();
    setStats(data);
    setLoading(false);
  };

  const handleScan = async () => {
    setScanning(true);
    const res = await fetch('/api/duplicates/scan', { method: 'POST' });
    const data = await res.json();
    setGroups(data.groups);
    await fetchStats(); // Refresh stats
    setScanning(false);
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Duplicate Detection</h1>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {scanning ? 'Scanning...' : 'Scan for Duplicates'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Duplicate Groups" value={stats.totalDuplicateGroups} color="blue" />
        <StatCard label="Duplicate Items" value={stats.totalDuplicateItems} color="orange" />
        <StatCard label="Value in Duplicates" value={`$${stats.totalValueInDuplicates.toFixed(2)}`} color="green" />
        <StatCard label="Potential Savings" value={`$${stats.potentialSavings.toFixed(2)}`} color="purple" />
      </div>

      {/* Space Wasted Alert */}
      {stats.spaceWasted > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-yellow-900">Inventory Space Warning</h3>
            <p className="text-yellow-800">
              You're wasting <strong>{stats.spaceWasted}</strong> inventory slots on duplicate items.
              With Steam's 1,000 item limit per account, optimizing duplicates frees up valuable space.
            </p>
          </div>
        </div>
      )}

      {/* Duplicate Groups */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CheckCircleIcon className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h2 className="text-2xl font-bold mb-2">No Duplicates Found</h2>
          <p className="text-gray-600">Your inventory is optimized! Click "Scan for Duplicates" to check again.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <DuplicateGroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  }[color];

  return (
    <div className={`rounded-lg shadow p-4 ${colorClasses}`}>
      <div className="text-sm font-medium mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function DuplicateGroupCard({ group }: { group: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-1">{group.itemName}</h3>
          <div className="flex gap-4 text-sm text-gray-600">
            <span>Type: {group.duplicateType}</span>
            <span>Count: {group.totalDuplicates}</span>
            <span>Value: ${group.totalValue.toFixed(2)}</span>
            <span className="text-green-600 font-medium">Potential Savings: ${group.potentialSavings.toFixed(2)}</span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          {expanded ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {expanded && (
        <div className="border-t pt-4">
          <h4 className="font-bold mb-3">Items in Group:</h4>
          <div className="space-y-2">
            {group.items.map((item: any, index: number) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  item.keep ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                }`}
              >
                <div>
                  <div className="font-medium">
                    {item.keep && <span className="text-green-600 mr-2">✓ KEEP</span>}
                    Float: {item.floatValue.toFixed(6)} | Value: ${item.currentValue.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">{item.reason}</div>
                </div>
                {!item.keep && (
                  <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">
                    Sell
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Auto-List Duplicates for Sale
            </button>
            <button className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
              Ignore Group
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### `src/components/DuplicateWarningModal.tsx` (Pre-Purchase Check)

```typescript
'use client';

interface DuplicateWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  itemName: string;
  duplicateCount: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export default function DuplicateWarningModal({
  isOpen,
  onClose,
  onProceed,
  itemName,
  duplicateCount,
  severity,
  message,
}: DuplicateWarningModalProps) {
  if (!isOpen) return null;

  const severityStyles = {
    error: 'bg-red-50 border-red-500',
    warning: 'bg-yellow-50 border-yellow-500',
    info: 'bg-blue-50 border-blue-500',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-lg p-6 max-w-md w-full border-l-4 ${severityStyles[severity]}`}>
        <h2 className="text-2xl font-bold mb-4">Duplicate Detected</h2>
        <p className="mb-4">{message}</p>
        <p className="text-sm text-gray-600 mb-6">
          You already own <strong>{duplicateCount}</strong> of "{itemName}".
        </p>

        <div className="flex gap-2">
          {severity !== 'error' && (
            <button
              onClick={onProceed}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Purchase Anyway
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            {severity === 'error' ? 'OK' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Success Metrics
1. **Detection Accuracy**: 95%+ duplicate detection accuracy
2. **Space Savings**: Users free up average 150+ inventory slots
3. **Capital Freed**: Users free up average $500+ by consolidating duplicates
4. **Purchase Prevention**: 80%+ of users avoid duplicate purchases after warnings
5. **Adoption**: 50%+ of bulk traders enable duplicate scanning
6. **Time Saved**: Users save 2+ hours per week manually checking for duplicates

## Dependencies
- **Feature 11**: Multi-Account Dashboard (cross-account inventory access)
- **Feature 12**: Bulk Inventory Operations (bulk selection for consolidation)
- **Feature 13**: Cross-Platform Listing Manager (auto-list duplicates for sale)
- **Feature 03**: Price Tracking (current item values)

## Effort Estimate
- **Database Schema**: 4 hours
- **DuplicateDetectionService**: 16 hours
- **Classification Algorithm**: 8 hours
- **API Endpoints**: 4 hours
- **Duplicates Dashboard Page**: 10 hours
- **Pre-Purchase Warning Modal**: 4 hours
- **Testing**: 8 hours
- **Total**: ~54 hours (1.3 weeks)

## Implementation Notes
1. **Cron Job**: Run duplicate scan weekly for all users, email summary
2. **Real-Time Checks**: Check for duplicates on every purchase attempt
3. **User Education**: Explain different duplicate types (exact, functional, etc.)
4. **Whitelist**: Allow users to mark intentional duplicates (e.g., high-volume traders)
5. **Performance**: Cache duplicate scan results, only re-scan when inventory changes
6. **Integration**: Integrate with bulk listing manager for one-click consolidation

## Gotchas
1. **Intentional Duplicates**: Some traders keep duplicates for volume trading - allow whitelisting
2. **Float Precision**: Use proper decimal precision for float comparisons (6-8 decimals)
3. **Sticker Matching**: Stickers on same skin can have different positions - handle edge cases
4. **Performance**: Scanning 10,000+ item inventories is computationally expensive - optimize queries
5. **False Positives**: Different wear conditions (FN vs MW) may not be duplicates to user
6. **User Preference**: Some users prefer keeping one per account for security - respect preferences
7. **Timing**: Don't block urgent purchases with duplicate checks - make warnings non-blocking

## Status Checklist
- [ ] Database schema created and migrated
- [ ] DuplicateDetectionService implemented
- [ ] Classification algorithms tested
- [ ] API endpoints created
- [ ] Duplicates dashboard page built
- [ ] Pre-purchase warning modal implemented
- [ ] Prevention rules configuration UI created
- [ ] Integration with bulk listing manager completed
- [ ] Cron job for weekly scans configured
- [ ] Email notifications set up
- [ ] Unit tests written (95% coverage)
- [ ] Integration tests written
- [ ] Documentation completed

## Related Features
- **Feature 11**: Multi-Account Dashboard (cross-account inventory)
- **Feature 12**: Bulk Inventory Operations (bulk actions)
- **Feature 13**: Cross-Platform Listing Manager (auto-list duplicates)
- **Feature 21**: Inventory Optimization (consolidation recommendations)

## References
- [Steam Inventory API](https://developer.valvesoftware.com/wiki/Steam_Web_API#GetPlayerItems_.28v0001.29)
- [Fuzzy String Matching](https://en.wikipedia.org/wiki/Approximate_string_matching)
- [Herfindahl-Hirschman Index](https://www.investopedia.com/terms/h/hhi.asp) (diversification measurement)
- [Duplicate Detection Algorithms](https://en.wikipedia.org/wiki/Record_linkage)
