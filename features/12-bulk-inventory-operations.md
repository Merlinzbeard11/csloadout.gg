# 12 - Bulk Inventory Operations

## Overview

Bulk selection and batch operations for managing thousands of items across multiple accounts. Select 500 cases, filter by criteria, execute actions (tag, move recommendations, export lists). Critical productivity tool for bulk traders who manually manage inventory today.

**Value Prop:** "Manage 5,000 items as easily as managing 5 - bulk select, filter, and organize in seconds"

## User Segments Served

- **Primary:** Bulk Traders (managing 1,000+ items across multiple accounts)
- **Secondary:** Investors (organizing portfolios by strategy)
- **Tertiary:** Collectors (bulk organizing collections)

## User Stories / Use Cases

### As a Bulk Trader
- I want to select all cases worth <$0.50 across all my accounts
- I want to tag 300 items as "Sell on CSFloat" for tracking
- I want to export a list of all items to sell (for manual listing)
- I want to see which items to move between accounts for optimal storage
- I want to bulk filter by "trade-locked items" to see what's available

### As an Investor
- I want to tag items by investment strategy ("Long-term hold", "Quick flip", "Arbitrage")
- I want to bulk select items purchased in Q4 2024 for tax reporting
- I want to filter items by profit/loss percentage
- I want to export portfolio for external analysis

### As a Collector
- I want to tag all "AK-47" skins across accounts for collection tracking
- I want to identify duplicate items across accounts
- I want to organize items by collection (e.g., "Shattered Web Collection")

## Research & Context

### Bulk Operations in Portfolio Management

**Reference Platforms:**
```
1. Google Photos:
   - Bulk select with "Shift+Click" (select range)
   - Filter by date, location, people
   - Batch operations: download, delete, add to album

2. Gmail:
   - Select all matching filter ("Select all 1,247 conversations")
   - Batch operations: archive, delete, label, mark as read
   - Advanced filters: from:, to:, subject:, has:attachment

3. Amazon S3 Console:
   - Bulk select objects
   - Batch operations: delete, change storage class, set permissions
   - Filter by prefix, size, last modified

4. Lightroom (Photo Management):
   - Batch editing (apply preset to 500 photos)
   - Smart collections (auto-filter by criteria)
   - Bulk tagging and metadata editing
```

**Key Patterns Users Expect:**
- **Checkbox Selection**: Individual item checkboxes
- **Select All**: "Select all 1,247 items matching current filter"
- **Range Selection**: Shift+Click to select range
- **Filters Persist**: Selections respect active filters
- **Batch Actions Menu**: Dropdown with available operations
- **Undo/Confirmation**: Dangerous operations require confirmation

### CS2-Specific Bulk Operations

**What Bulk Traders Need:**
```
1. Filtering:
   - By value range ($0.10 - $1.00)
   - By item type (cases, skins, stickers)
   - By trade status (tradeable vs trade-locked)
   - By account (show items from Account A only)
   - By acquisition date (items purchased in last 30 days)

2. Tagging:
   - Custom labels ("Sell on CSFloat", "Long-term hold", "Arbitrage")
   - Color coding for visual organization
   - Multi-tag support (item can have multiple tags)

3. Bulk Actions:
   - Export to CSV/JSON (for external tools)
   - Generate listing URLs (bulk list on marketplace)
   - Mark for sale/not for sale
   - Calculate total value of selection
   - Identify move recommendations (optimal account placement)

4. Smart Filters (Auto-Collections):
   - "All items worth >$100" (high-value tracking)
   - "All trade-locked items" (can't sell yet)
   - "All items purchased this month" (recent acquisitions)
   - "All duplicate items across accounts" (identify redundancy)
```

### Bulk Operation Performance

**Challenge:** Displaying 5,000+ items in UI is slow

**Solutions:**
```
1. Virtual Scrolling (Windowing):
   - Only render visible items (50-100 at a time)
   - Libraries: react-window, react-virtualized
   - Performance: 60fps even with 10,000+ items

2. Server-Side Filtering:
   - Don't load all items to client
   - Apply filters in database query
   - Return only matching items

3. Pagination with Large Page Sizes:
   - Show 500 items per page
   - "Load more" for additional items
   - Balance: initial load speed vs. infinite scroll

4. Selection State Management:
   - Track selected item IDs (not full objects)
   - Efficient Set data structure for O(1) lookup
   - Handle "select all" without loading all items
```

## Technical Requirements

### Database Schema

```sql
-- User-defined tags for organizing items
CREATE TABLE item_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7),                      -- Hex color for visual distinction
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, name)                  -- Tag names unique per user
);

CREATE INDEX idx_item_tags_user ON item_tags(user_id);

-- Many-to-many: items can have multiple tags
CREATE TABLE inventory_item_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES item_tags(id) ON DELETE CASCADE,
  tagged_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(inventory_item_id, tag_id)     -- Prevent duplicate tags on same item
);

CREATE INDEX idx_inventory_item_tags_item ON inventory_item_tags(inventory_item_id);
CREATE INDEX idx_inventory_item_tags_tag ON inventory_item_tags(tag_id);

-- Bulk operation history (audit log)
CREATE TABLE bulk_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operation_type VARCHAR(50) NOT NULL,   -- 'tag', 'export', 'mark_for_sale', etc.
  item_count INTEGER NOT NULL,
  filter_criteria JSONB,                 -- Store filter used for selection
  operation_data JSONB,                  -- Store operation-specific data
  executed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bulk_operations_user ON bulk_operations(user_id);
CREATE INDEX idx_bulk_operations_type ON bulk_operations(operation_type);
```

### Bulk Filter Query Builder

```typescript
// Advanced filter builder for bulk operations
interface BulkFilterCriteria {
  // Value filters
  minPrice?: number;
  maxPrice?: number;
  minFloat?: number;
  maxFloat?: number;

  // Item properties
  itemTypes?: string[];                // ['skin', 'case', 'sticker']
  rarities?: string[];                 // ['classified', 'covert']
  weaponTypes?: string[];              // ['AK-47', 'AWP']

  // Account filters
  accountIds?: string[];               // Filter by specific accounts
  excludeAccountIds?: string[];        // Exclude specific accounts

  // Status filters
  canTrade?: boolean;                  // Only tradeable items
  tradeLockedOnly?: boolean;           // Only trade-locked items

  // Date filters
  acquiredAfter?: Date;
  acquiredBefore?: Date;

  // Tag filters
  tagIds?: string[];                   // Items with specific tags
  untaggedOnly?: boolean;              // Items with no tags

  // Search
  searchQuery?: string;                // Item name search

  // Sorting
  sortBy?: 'value' | 'name' | 'acquired_date' | 'float';
  sortOrder?: 'asc' | 'desc';
}

class BulkInventoryService {
  async getFilteredItems(
    userId: string,
    filters: BulkFilterCriteria,
    pagination?: { limit: number; offset: number }
  ): Promise<BulkFilterResult> {
    // Build dynamic query based on filters
    const query = db.inventory_items.findMany({
      where: {
        inventory: {
          user_inventory: {
            linked_account: {
              user_id: userId
            }
          }
        },
        // Apply filters
        ...(filters.minPrice && { current_value: { gte: filters.minPrice } }),
        ...(filters.maxPrice && { current_value: { lte: filters.maxPrice } }),
        ...(filters.minFloat && { float_value: { gte: filters.minFloat } }),
        ...(filters.maxFloat && { float_value: { lte: filters.maxFloat } }),
        ...(filters.itemTypes && { item: { type: { in: filters.itemTypes } } }),
        ...(filters.rarities && { item: { rarity: { in: filters.rarities } } }),
        ...(filters.weaponTypes && { item: { weapon_type: { in: filters.weaponTypes } } }),
        ...(filters.accountIds && {
          inventory: {
            user_inventory: {
              linked_account_id: { in: filters.accountIds }
            }
          }
        }),
        ...(filters.canTrade !== undefined && { can_trade: filters.canTrade }),
        ...(filters.tradeLockedOnly && {
          can_trade: false,
          trade_hold_until: { gt: new Date() }
        }),
        ...(filters.acquiredAfter && { acquired_at: { gte: filters.acquiredAfter } }),
        ...(filters.acquiredBefore && { acquired_at: { lte: filters.acquiredBefore } }),
        ...(filters.tagIds && {
          inventory_item_tags: {
            some: { tag_id: { in: filters.tagIds } }
          }
        }),
        ...(filters.untaggedOnly && {
          inventory_item_tags: { none: {} }
        }),
        ...(filters.searchQuery && {
          item: {
            name: { contains: filters.searchQuery, mode: 'insensitive' }
          }
        })
      },
      include: {
        item: true,
        inventory_item_tags: {
          include: { tag: true }
        },
        inventory: {
          include: {
            user_inventory: {
              include: {
                linked_account: true
              }
            }
          }
        }
      },
      orderBy: this.buildOrderBy(filters.sortBy, filters.sortOrder),
      ...(pagination && { take: pagination.limit, skip: pagination.offset })
    });

    const items = await query;

    // Get total count (for pagination)
    const totalCount = await db.inventory_items.count({
      where: query.where
    });

    // Calculate total value of filtered items
    const totalValue = items.reduce((sum, item) => sum + (item.current_value || 0), 0);

    return {
      items,
      totalCount,
      totalValue,
      filters // Echo back filters for frontend state
    };
  }

  private buildOrderBy(sortBy?: string, sortOrder?: string) {
    const order = sortOrder === 'desc' ? 'desc' : 'asc';

    switch (sortBy) {
      case 'value':
        return { current_value: order };
      case 'name':
        return { item: { name: order } };
      case 'acquired_date':
        return { acquired_at: order };
      case 'float':
        return { float_value: order };
      default:
        return { current_value: 'desc' }; // Default: highest value first
    }
  }

  // Bulk tag operation
  async bulkTagItems(
    userId: string,
    itemIds: string[],
    tagId: string
  ): Promise<BulkOperationResult> {
    // Verify user owns these items
    const items = await db.inventory_items.findMany({
      where: {
        id: { in: itemIds },
        inventory: {
          user_inventory: {
            linked_account: {
              user_id: userId
            }
          }
        }
      }
    });

    if (items.length !== itemIds.length) {
      throw new Error('Some items not found or not owned by user');
    }

    // Batch insert tags (ignore duplicates)
    const tagOperations = itemIds.map(itemId => ({
      inventory_item_id: itemId,
      tag_id: tagId,
      tagged_at: new Date()
    }));

    await db.inventory_item_tags.createMany({
      data: tagOperations,
      skipDuplicates: true // Don't fail if already tagged
    });

    // Log bulk operation
    await db.bulk_operations.create({
      data: {
        user_id: userId,
        operation_type: 'tag',
        item_count: itemIds.length,
        operation_data: { tag_id: tagId }
      }
    });

    return {
      success: true,
      itemsAffected: itemIds.length,
      operationType: 'tag'
    };
  }

  // Bulk export to CSV
  async bulkExportItems(
    userId: string,
    itemIds: string[],
    format: 'csv' | 'json'
  ): Promise<string> {
    const items = await db.inventory_items.findMany({
      where: {
        id: { in: itemIds },
        inventory: {
          user_inventory: {
            linked_account: {
              user_id: userId
            }
          }
        }
      },
      include: {
        item: true,
        inventory: {
          include: {
            user_inventory: {
              include: { linked_account: true }
            }
          }
        }
      }
    });

    if (format === 'csv') {
      return this.generateCSV(items);
    } else {
      return JSON.stringify(items, null, 2);
    }
  }

  private generateCSV(items: any[]): string {
    const headers = [
      'Item Name',
      'Type',
      'Rarity',
      'Wear',
      'Float Value',
      'Current Value',
      'Best Platform',
      'Account Label',
      'Steam ID',
      'Can Trade',
      'Trade Hold Until'
    ];

    const rows = items.map(item => [
      item.item.name,
      item.item.type,
      item.item.rarity,
      item.wear,
      item.float_value,
      item.current_value,
      item.best_platform,
      item.inventory.user_inventory.linked_account.account_label,
      item.inventory.user_inventory.linked_account.steam_id,
      item.can_trade,
      item.trade_hold_until
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  }

  // Calculate item recommendations (which account to move items to)
  async getMoveRecommendations(userId: string): Promise<MoveRecommendation[]> {
    // Get all accounts and their space usage
    const accounts = await db.linked_steam_accounts.findMany({
      where: { user_id: userId },
      orderBy: { space_used_percent: 'asc' } // Least full first
    });

    // Get all items
    const allItems = await this.getFilteredItems(userId, {});

    const recommendations: MoveRecommendation[] = [];

    // Simple algorithm: Move items from full accounts to empty accounts
    const fullAccounts = accounts.filter(a => a.space_used_percent >= 90);
    const emptyAccounts = accounts.filter(a => a.space_used_percent < 70);

    for (const fullAccount of fullAccounts) {
      const itemsInAccount = allItems.items.filter(
        i => i.inventory.user_inventory.linked_account_id === fullAccount.id
      );

      // Recommend moving lowest-value items (easier to organize)
      const itemsToMove = itemsInAccount
        .sort((a, b) => (a.current_value || 0) - (b.current_value || 0))
        .slice(0, Math.min(100, itemsInAccount.length - 700)); // Move up to 100 items

      if (emptyAccounts.length > 0 && itemsToMove.length > 0) {
        recommendations.push({
          fromAccount: fullAccount,
          toAccount: emptyAccounts[0],
          items: itemsToMove,
          reason: `${fullAccount.account_label} is ${fullAccount.space_used_percent}% full`
        });
      }
    }

    return recommendations;
  }
}
```

### API Endpoints

```typescript
// Get filtered items with bulk selection support
POST /api/bulk/filter
Body: {
  filters: {
    minPrice: 0.10,
    maxPrice: 1.00,
    itemTypes: ["case"],
    canTrade: true
  },
  pagination: { limit: 500, offset: 0 }
}
Response: {
  items: [...],           // Matching items
  totalCount: 1247,       // Total matching items (for pagination)
  totalValue: 456.78,     // Total value of matching items
  filters: {...}          // Echo back filters
}

// Bulk tag items
POST /api/bulk/tag
Body: {
  itemIds: ["...", "..."], // Array of item IDs
  tagId: "..."             // Tag to apply
}
Response: {
  success: true,
  itemsAffected: 300
}

// Bulk export items
POST /api/bulk/export
Body: {
  itemIds: ["...", "..."],
  format: "csv"            // or "json"
}
Response: {
  downloadUrl: "/api/bulk/download/abc123.csv",
  expiresAt: "2025-11-03T12:00:00Z"
}

// Get move recommendations
GET /api/bulk/move-recommendations
Response: {
  recommendations: [
    {
      fromAccount: { id: "...", label: "Trading Account", spaceUsedPercent: 95 },
      toAccount: { id: "...", label: "Storage Account", spaceUsedPercent: 45 },
      items: [...],         // Items to move
      reason: "Trading Account is 95% full"
    }
  ]
}

// Create custom tag
POST /api/tags
Body: {
  name: "Sell on CSFloat",
  color: "#3B82F6"
}
Response: {
  id: "...",
  name: "Sell on CSFloat",
  color: "#3B82F6"
}

// Get user's tags
GET /api/tags
Response: {
  tags: [
    { id: "...", name: "Sell on CSFloat", color: "#3B82F6", itemCount: 234 },
    { id: "...", name: "Long-term hold", color: "#10B981", itemCount: 89 }
  ]
}
```

### Frontend Components

```typescript
// Bulk Inventory Management Page
// pages/bulk/inventory.tsx
import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'

export default function BulkInventoryPage() {
  const [filters, setFilters] = useState<BulkFilterCriteria>({})
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['bulk-filter', filters],
    queryFn: () => fetch('/api/bulk/filter', {
      method: 'POST',
      body: JSON.stringify({ filters, pagination: { limit: 1000, offset: 0 } })
    }).then(r => r.json())
  })

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItemIds(new Set())
      setSelectAll(false)
    } else {
      // Select all items matching current filter
      const allIds = new Set(data.items.map(item => item.id))
      setSelectedItemIds(allIds)
      setSelectAll(true)
    }
  }

  const handleToggleItem = (itemId: string) => {
    const newSet = new Set(selectedItemIds)
    if (newSet.has(itemId)) {
      newSet.delete(itemId)
    } else {
      newSet.add(itemId)
    }
    setSelectedItemIds(newSet)
    setSelectAll(false) // Uncheck "select all" if manually selecting
  }

  const selectedCount = selectedItemIds.size
  const selectedValue = useMemo(() => {
    return data?.items
      ?.filter(item => selectedItemIds.has(item.id))
      ?.reduce((sum, item) => sum + (item.current_value || 0), 0) || 0
  }, [selectedItemIds, data])

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Bulk Inventory Management</h1>

      {/* Filter Panel */}
      <BulkFilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        resultCount={data?.totalCount}
        resultValue={data?.totalValue}
      />

      {/* Selection Summary */}
      {selectedCount > 0 && (
        <SelectionSummary
          count={selectedCount}
          value={selectedValue}
          onClearSelection={() => setSelectedItemIds(new Set())}
        />
      )}

      {/* Batch Actions Toolbar */}
      {selectedCount > 0 && (
        <BatchActionsToolbar
          selectedItemIds={Array.from(selectedItemIds)}
          onActionComplete={() => setSelectedItemIds(new Set())}
        />
      )}

      {/* Item List with Virtual Scrolling */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={handleSelectAll}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-600">
              {selectAll ? `All ${data?.totalCount} items selected` : 'Select all'}
            </span>
          </div>

          <div className="text-sm text-gray-600">
            {data?.totalCount} items • ${data?.totalValue?.toFixed(2)}
          </div>
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <VirtualItemList
            items={data.items}
            selectedItemIds={selectedItemIds}
            onToggleItem={handleToggleItem}
          />
        )}
      </div>
    </div>
  )
}

// Virtual scrolling for 1,000+ items
function VirtualItemList({ items, selectedItemIds, onToggleItem }) {
  const parentRef = React.useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated row height
    overscan: 10           // Render 10 extra rows for smooth scrolling
  })

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {rowVirtualizer.getVirtualItems().map(virtualRow => {
          const item = items[virtualRow.index]
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              <BulkItemRow
                item={item}
                isSelected={selectedItemIds.has(item.id)}
                onToggle={() => onToggleItem(item.id)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Individual item row with checkbox
function BulkItemRow({ item, isSelected, onToggle }) {
  return (
    <div
      className={`flex items-center gap-4 p-3 border-b hover:bg-gray-50 ${
        isSelected ? 'bg-blue-50' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        className="w-4 h-4"
      />

      <img
        src={item.item.icon_url}
        alt={item.item.name}
        className="w-12 h-12 object-contain"
      />

      <div className="flex-1">
        <div className="font-semibold">{item.item.name}</div>
        <div className="text-sm text-gray-500">
          {item.wear} • Float: {item.float_value?.toFixed(6)}
        </div>
      </div>

      <div className="text-right">
        <div className="font-semibold text-green-600">
          ${item.current_value?.toFixed(2)}
        </div>
        <div className="text-xs text-gray-500">
          {item.inventory?.user_inventory?.linked_account?.account_label}
        </div>
      </div>

      {item.inventory_item_tags?.map(({ tag }) => (
        <span
          key={tag.id}
          className="px-2 py-1 text-xs rounded"
          style={{
            backgroundColor: tag.color + '20',
            color: tag.color
          }}
        >
          {tag.name}
        </span>
      ))}
    </div>
  )
}

// Batch actions toolbar
function BatchActionsToolbar({ selectedItemIds, onActionComplete }) {
  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: () => fetch('/api/tags').then(r => r.json())
  })

  const tagMutation = useMutation({
    mutationFn: (tagId: string) =>
      fetch('/api/bulk/tag', {
        method: 'POST',
        body: JSON.stringify({ itemIds: selectedItemIds, tagId })
      }),
    onSuccess: () => {
      toast.success('Items tagged successfully')
      onActionComplete()
    }
  })

  const exportMutation = useMutation({
    mutationFn: (format: 'csv' | 'json') =>
      fetch('/api/bulk/export', {
        method: 'POST',
        body: JSON.stringify({ itemIds: selectedItemIds, format })
      }).then(r => r.json()),
    onSuccess: (data) => {
      window.location.href = data.downloadUrl
    }
  })

  return (
    <div className="bg-blue-600 text-white p-4 rounded-lg mb-4 flex items-center gap-4">
      <span className="font-semibold">
        {selectedItemIds.length} items selected
      </span>

      <select
        onChange={(e) => {
          if (e.target.value) {
            tagMutation.mutate(e.target.value)
            e.target.value = '' // Reset
          }
        }}
        className="px-4 py-2 rounded bg-white text-gray-900"
      >
        <option value="">Add Tag...</option>
        {tags?.tags.map(tag => (
          <option key={tag.id} value={tag.id}>
            {tag.name}
          </option>
        ))}
      </select>

      <button
        onClick={() => exportMutation.mutate('csv')}
        className="px-4 py-2 bg-white text-blue-600 rounded hover:bg-gray-100"
      >
        Export CSV
      </button>

      <button
        onClick={() => exportMutation.mutate('json')}
        className="px-4 py-2 bg-white text-blue-600 rounded hover:bg-gray-100"
      >
        Export JSON
      </button>
    </div>
  )
}

// Filter panel
function BulkFilterPanel({ filters, onFiltersChange, resultCount, resultValue }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Filters</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Price range */}
        <div>
          <label className="block text-sm font-medium mb-1">Price Range</label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.minPrice || ''}
              onChange={(e) => onFiltersChange({ ...filters, minPrice: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border rounded"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.maxPrice || ''}
              onChange={(e) => onFiltersChange({ ...filters, maxPrice: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>

        {/* Item type */}
        <div>
          <label className="block text-sm font-medium mb-1">Item Type</label>
          <select
            multiple
            value={filters.itemTypes || []}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value)
              onFiltersChange({ ...filters, itemTypes: selected })
            }}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="skin">Skins</option>
            <option value="case">Cases</option>
            <option value="sticker">Stickers</option>
          </select>
        </div>

        {/* Trade status */}
        <div>
          <label className="block text-sm font-medium mb-1">Trade Status</label>
          <select
            value={filters.canTrade === undefined ? '' : filters.canTrade.toString()}
            onChange={(e) => {
              const value = e.target.value === '' ? undefined : e.target.value === 'true'
              onFiltersChange({ ...filters, canTrade: value })
            }}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">All Items</option>
            <option value="true">Tradeable Only</option>
            <option value="false">Trade-Locked Only</option>
          </select>
        </div>

        {/* Search */}
        <div className="md:col-span-3">
          <label className="block text-sm font-medium mb-1">Search</label>
          <input
            type="text"
            placeholder="Item name..."
            value={filters.searchQuery || ''}
            onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={() => onFiltersChange({})}
          className="text-sm text-blue-600 hover:underline"
        >
          Clear All Filters
        </button>

        <div className="text-sm text-gray-600">
          {resultCount} items found • ${resultValue?.toFixed(2)}
        </div>
      </div>
    </div>
  )
}
```

## Success Metrics

- ✅ 70%+ bulk traders use filtering weekly (of premium users)
- ✅ Average 500+ items per bulk operation
- ✅ <2s filter application (even with 5,000 items)
- ✅ 40%+ users create custom tags for organization
- ✅ 30%+ users export data for external tools

## Dependencies

### Must Have Before Starting
- [07] Inventory Import (to have items to bulk manage)
- [11] Multi-Account Dashboard (to see items across accounts)

### Blocks Other Features
- [13] Cross-Platform Listing Manager (uses bulk selection)
- [21] Inventory Optimization (uses filtering and recommendations)

## Effort Estimate

- **Development Time:** 2 weeks
- **Complexity:** Medium-High
- **Team Size:** 1 developer

**Breakdown:**
- Days 1-3: Database schema, filter query builder
- Days 4-6: Bulk operations API (tag, export, move recommendations)
- Days 7-10: Frontend UI with virtual scrolling
- Days 11-12: Batch actions, tag management
- Days 13-14: Testing, optimization, edge cases

## Implementation Notes

### Virtual Scrolling Performance

```typescript
// Use @tanstack/react-virtual for efficient rendering
// Only renders ~20 DOM nodes even with 5,000 items
import { useVirtualizer } from '@tanstack/react-virtual'

// Key settings:
- estimateSize: () => 80      // Row height estimate
- overscan: 10                 // Extra rows rendered (smooth scrolling)
- getScrollElement            // Parent scrollable container

// Performance:
- Renders 60fps with 10,000+ items
- Memory efficient (only visible items in DOM)
- Smooth scroll with keyboard navigation
```

### "Select All" Without Loading All Items

```typescript
// Problem: "Select all 10,000 items" crashes if loading all to client

// Solution: Track selection state server-side
interface SelectionState {
  mode: 'individual' | 'all-matching-filter';
  individualIds?: Set<string>;  // If mode = 'individual'
  filters?: BulkFilterCriteria;  // If mode = 'all-matching-filter'
  excludedIds?: Set<string>;     // Items to exclude from "select all"
}

// When user clicks "Select All":
setSelectionState({
  mode: 'all-matching-filter',
  filters: currentFilters,
  excludedIds: new Set()
})

// When performing bulk operation:
if (selectionState.mode === 'all-matching-filter') {
  // Server-side: Apply operation to all items matching filter
  const items = await bulkService.getFilteredItems(userId, selectionState.filters)
  const itemIds = items.items
    .filter(item => !selectionState.excludedIds.has(item.id))
    .map(item => item.id)

  await bulkService.bulkTagItems(userId, itemIds, tagId)
}
```

### Gotchas to Watch For

1. **Performance with Large Selections**
   - Selecting 5,000 items creates huge React state
   - Solution: Use Set for O(1) lookups, virtual scrolling

2. **Stale Data After Bulk Operations**
   - User tags 500 items, but UI doesn't update
   - Solution: Invalidate React Query cache after mutations

3. **Accidental Bulk Deletions**
   - User accidentally exports wrong items
   - MVP: Export only (no delete), add confirmations later

4. **Filter Performance**
   - Complex filters slow on 10,000+ items
   - Solution: Database indexes on filterable columns

5. **CSV Export Memory**
   - Exporting 5,000 items to CSV uses lot of memory
   - Solution: Stream CSV generation, limit export to 10,000 items

6. **Mobile UX**
   - Bulk operations on mobile are awkward
   - Solution: Focus on desktop for MVP, mobile in Phase 3

7. **Undo Functionality**
   - User tags 1,000 items, wants to undo
   - MVP: No undo (manual removal), Phase 2: operation history with undo

## Status

- [ ] Research complete
- [ ] Database schema created
- [ ] Filter query builder implemented
- [ ] Bulk operations API built
- [ ] Virtual scrolling UI implemented
- [ ] Tag management complete
- [ ] Export functionality working
- [ ] Move recommendations implemented
- [ ] Testing complete
- [ ] Deployed to production

## Related Features

- **Depends On:**
  - [07] Inventory Import
  - [11] Multi-Account Dashboard

- **Enables:**
  - [13] Cross-Platform Listing Manager
  - [21] Inventory Optimization
  - [22] Duplicate Detection

## References

- React Virtual: https://tanstack.com/virtual/latest
- PostgreSQL Indexing Best Practices: https://www.postgresql.org/docs/current/indexes.html
- CSV RFC 4180: https://tools.ietf.org/html/rfc4180
