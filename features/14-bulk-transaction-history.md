# 14 - Bulk Transaction History

## Overview

Comprehensive transaction log tracking all purchases, sales, trades, and transfers across Steam and all connected marketplaces. Provides complete audit trail for tax reporting, profit/loss calculation, and portfolio performance analysis. Critical for investors and bulk traders managing hundreds of transactions monthly.

**Value Prop:** "Complete transaction history across all platforms - export for taxes in 1 click"

## User Segments Served

- **Primary:** Investors (tax reporting, profit/loss tracking)
- **Secondary:** Bulk Traders (audit trail for thousands of transactions)
- **Tertiary:** Casual Players (see purchase history, spending analysis)

## User Stories / Use Cases

### As an Investor
- I want to see all transactions (buys/sells) for 2024 tax year
- I want to export transaction history to CSV for my accountant
- I want to calculate realized profit/loss per item
- I want to see total capital gains for tax filing
- I want to filter transactions by platform to reconcile statements

### As a Bulk Trader
- I want to see which items I've bought/sold most frequently
- I want to track average buy price vs average sell price
- I want to identify my most profitable item types
- I want to see transaction volume per platform (where am I most active?)

### As a Casual Player
- I want to see how much I've spent on CS2 skins this year
- I want to see my first ever skin purchase (nostalgia)
- I want to track return on investment (did I profit from selling?)

## Research & Context

### Transaction Tracking in Financial Apps

**Reference Platforms:**
```
1. Robinhood (Stock Trading):
   - Complete transaction history (buys, sells, dividends)
   - Filter by date range, symbol, transaction type
   - Export to CSV for taxes
   - Shows cost basis, realized gain/loss per trade
   - Tax documents auto-generated (1099 forms)

2. Coinbase (Crypto Trading):
   - All transactions across wallets
   - Categorization (buy, sell, send, receive, convert)
   - Cost basis tracking (FIFO, LIFO, Specific ID)
   - Export for TurboTax, CoinTracker
   - Tax summary dashboard

3. Mint (Personal Finance):
   - Transaction categorization (groceries, entertainment, etc.)
   - Search and filter (date, amount, category)
   - Spending trends over time
   - Export to CSV, PDF, Quicken

4. eBay (E-Commerce):
   - Purchase history (all items bought)
   - Seller history (all items sold)
   - Profit/loss per item
   - Export to QuickBooks for business accounting
```

**Key Features to Implement:**
- Chronological transaction log (newest first)
- Advanced filtering (date range, platform, transaction type, item)
- Export formats (CSV, PDF, QuickBooks-compatible)
- Cost basis tracking (what did I pay? what did I sell for?)
- Realized gain/loss calculation
- Tax summary dashboard (annual capital gains)

### CS2 Transaction Types

**Categories:**
```
1. Purchase (Buy):
   - Bought item from marketplace
   - Records: platform, item, price paid, fees, date

2. Sale (Sell):
   - Sold item on marketplace
   - Records: platform, item, price received, fees, profit/loss, date

3. Trade (Peer-to-Peer):
   - Exchanged items with another user
   - Records: items given, items received, trade value difference

4. Unbox (Case Opening):
   - Opened case, received item
   - Records: case cost, item received, item value (profit/loss)

5. Gift (Received):
   - Received item as gift (no cost)
   - Records: item, date received, value at time

6. Transfer (Between Accounts):
   - Moved item between user's own Steam accounts
   - Records: from account, to account, item, date

7. Steam Market Transaction:
   - Bought/sold via Steam Community Market
   - Records: price, Steam fee (15%), net amount
```

### Tax Reporting Requirements

**United States (IRS):**
```
Capital Gains Tax on Virtual Assets:
- CS2 skins are considered "collectibles" (tax treatment)
- Short-term gains (<1 year holding): Taxed as ordinary income (up to 37%)
- Long-term gains (>1 year holding): Taxed at collectibles rate (28% max)

Required Information:
- Date acquired
- Cost basis (purchase price + fees)
- Date sold
- Sale price (minus fees)
- Holding period
- Net gain/loss

Form 8949: Sales and Dispositions of Capital Assets
Schedule D: Capital Gains and Losses
```

**Other Countries:**
- UK: Capital Gains Tax (CGT) allowance £12,300
- Canada: 50% of gains taxable as income
- Australia: CGT applies to digital assets

**csloadout.gg Opportunity:**
- Auto-generate Form 8949-compatible CSV
- Calculate short-term vs long-term gains
- Track cost basis with multiple accounting methods (FIFO, LIFO)

## Technical Requirements

### Database Schema

```sql
-- Unified transaction log (all types)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Transaction type
  type VARCHAR(20) NOT NULL,             -- 'buy', 'sell', 'trade', 'unbox', 'gift', 'transfer'
  category VARCHAR(50),                  -- 'capital-gain', 'capital-loss', 'neutral'

  -- Transaction details
  item_id UUID REFERENCES items(id),     -- Primary item involved
  quantity INTEGER DEFAULT 1,

  -- Financial details
  amount DECIMAL(10,2),                  -- Transaction amount (positive = received, negative = paid)
  currency VARCHAR(3) DEFAULT 'USD',
  platform VARCHAR(50),                  -- 'csfloat', 'buff163', 'steam', etc.
  platform_fee DECIMAL(10,2) DEFAULT 0,  -- Marketplace fee
  net_amount DECIMAL(10,2),              -- amount - platform_fee

  -- Cost basis tracking
  cost_basis DECIMAL(10,2),              -- Original purchase price (for sales)
  realized_gain_loss DECIMAL(10,2),      -- net_amount - cost_basis (for sales)
  holding_period_days INTEGER,           -- Days between buy and sell

  -- Related entities
  listing_id UUID REFERENCES cross_platform_listings(id), -- If from our listing manager
  linked_account_id UUID REFERENCES linked_steam_accounts(id), -- Which account

  -- Counterparty (for trades)
  counterparty_steam_id VARCHAR(20),
  counterparty_items JSONB,              -- Items received in trade

  -- Metadata
  description TEXT,
  external_transaction_id VARCHAR(255),  -- Platform's transaction ID
  transaction_date TIMESTAMP NOT NULL,   -- When transaction occurred
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW(), -- When we recorded it

  -- Tax classification
  is_taxable BOOLEAN DEFAULT TRUE,
  tax_year INTEGER,                      -- Year for tax purposes
  tax_notes TEXT,                        -- Notes for accountant

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_tax_year ON transactions(tax_year);
CREATE INDEX idx_transactions_item ON transactions(item_id);

-- Cost basis ledger (track purchase history for FIFO/LIFO)
CREATE TABLE cost_basis_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,

  -- Purchase details
  purchase_transaction_id UUID REFERENCES transactions(id),
  purchase_price DECIMAL(10,2) NOT NULL,
  purchase_date TIMESTAMP NOT NULL,
  quantity INTEGER DEFAULT 1,

  -- Sale tracking
  quantity_remaining INTEGER DEFAULT 1,  -- Decrements as sold
  is_fully_sold BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cost_basis_user ON cost_basis_ledger(user_id);
CREATE INDEX idx_cost_basis_item ON cost_basis_ledger(inventory_item_id);

-- Tax summary (annual aggregated data)
CREATE TABLE tax_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL,

  -- Aggregated gains/losses
  total_short_term_gains DECIMAL(10,2) DEFAULT 0,  -- Held <1 year
  total_long_term_gains DECIMAL(10,2) DEFAULT 0,   -- Held >1 year
  total_short_term_losses DECIMAL(10,2) DEFAULT 0,
  total_long_term_losses DECIMAL(10,2) DEFAULT 0,

  -- Transaction counts
  total_purchases INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  total_trades INTEGER DEFAULT 0,

  -- Summary
  net_capital_gain_loss DECIMAL(10,2),   -- Total gains - total losses
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, tax_year)
);

CREATE INDEX idx_tax_summaries_user_year ON tax_summaries(user_id, tax_year);
```

### Transaction Recording Service

```typescript
// Service to record transactions from various sources
class TransactionRecordingService {
  // Record purchase transaction
  async recordPurchase(params: {
    userId: string;
    itemId: string;
    platform: string;
    price: number;
    platformFee: number;
    transactionDate: Date;
    externalTransactionId?: string;
  }): Promise<Transaction> {
    const netAmount = params.price + params.platformFee; // Total cost

    const transaction = await db.transactions.create({
      data: {
        user_id: params.userId,
        type: 'buy',
        category: 'neutral', // Purchases don't have gain/loss
        item_id: params.itemId,
        amount: -netAmount,  // Negative = money out
        currency: 'USD',
        platform: params.platform,
        platform_fee: params.platformFee,
        net_amount: -netAmount,
        transaction_date: params.transactionDate,
        external_transaction_id: params.externalTransactionId,
        tax_year: params.transactionDate.getFullYear(),
        description: `Purchased on ${params.platform}`
      }
    });

    // Record in cost basis ledger
    await db.cost_basis_ledger.create({
      data: {
        user_id: params.userId,
        purchase_transaction_id: transaction.id,
        purchase_price: netAmount,
        purchase_date: params.transactionDate,
        quantity: 1,
        quantity_remaining: 1
      }
    });

    return transaction;
  }

  // Record sale transaction (with cost basis calculation)
  async recordSale(params: {
    userId: string;
    itemId: string;
    platform: string;
    salePrice: number;
    platformFee: number;
    transactionDate: Date;
    listingId?: string;
    costBasisMethod?: 'FIFO' | 'LIFO' | 'Specific ID';
  }): Promise<Transaction> {
    const netAmount = params.salePrice - params.platformFee; // Money received

    // Find cost basis (what did we pay for this item?)
    const costBasis = await this.getCostBasis(
      params.userId,
      params.itemId,
      params.costBasisMethod || 'FIFO'
    );

    // Calculate gain/loss
    const realizedGainLoss = netAmount - costBasis.purchasePrice;

    // Calculate holding period
    const holdingPeriodDays = Math.floor(
      (params.transactionDate.getTime() - costBasis.purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Categorize as short-term or long-term
    const category = holdingPeriodDays >= 365 ? 'long-term-gain' : 'short-term-gain';

    const transaction = await db.transactions.create({
      data: {
        user_id: params.userId,
        type: 'sell',
        category,
        item_id: params.itemId,
        amount: params.salePrice,    // Positive = money in
        currency: 'USD',
        platform: params.platform,
        platform_fee: params.platformFee,
        net_amount: netAmount,
        cost_basis: costBasis.purchasePrice,
        realized_gain_loss: realizedGainLoss,
        holding_period_days: holdingPeriodDays,
        transaction_date: params.transactionDate,
        listing_id: params.listingId,
        tax_year: params.transactionDate.getFullYear(),
        is_taxable: true,
        description: `Sold on ${params.platform}`
      }
    });

    // Update cost basis ledger (mark as sold)
    await db.cost_basis_ledger.update({
      where: { id: costBasis.id },
      data: {
        quantity_remaining: 0,
        is_fully_sold: true
      }
    });

    // Update tax summary
    await this.updateTaxSummary(params.userId, params.transactionDate.getFullYear());

    return transaction;
  }

  // Get cost basis using specified accounting method
  private async getCostBasis(
    userId: string,
    itemId: string,
    method: 'FIFO' | 'LIFO' | 'Specific ID'
  ): Promise<CostBasisEntry> {
    switch (method) {
      case 'FIFO': // First In, First Out
        return await db.cost_basis_ledger.findFirst({
          where: {
            user_id: userId,
            inventory_item_id: itemId,
            quantity_remaining: { gt: 0 }
          },
          orderBy: { purchase_date: 'asc' } // Oldest first
        });

      case 'LIFO': // Last In, First Out
        return await db.cost_basis_ledger.findFirst({
          where: {
            user_id: userId,
            inventory_item_id: itemId,
            quantity_remaining: { gt: 0 }
          },
          orderBy: { purchase_date: 'desc' } // Newest first
        });

      case 'Specific ID': // User chooses specific purchase
        // Would require additional UI to let user select
        throw new Error('Specific ID method requires user selection');
    }
  }

  // Update annual tax summary
  async updateTaxSummary(userId: string, taxYear: number): Promise<void> {
    // Calculate aggregated data for the year
    const transactions = await db.transactions.findMany({
      where: {
        user_id: userId,
        tax_year: taxYear,
        type: 'sell'
      }
    });

    const shortTermGains = transactions
      .filter(t => t.category === 'short-term-gain' && t.realized_gain_loss > 0)
      .reduce((sum, t) => sum + t.realized_gain_loss, 0);

    const longTermGains = transactions
      .filter(t => t.category === 'long-term-gain' && t.realized_gain_loss > 0)
      .reduce((sum, t) => sum + t.realized_gain_loss, 0);

    const shortTermLosses = transactions
      .filter(t => t.category === 'short-term-gain' && t.realized_gain_loss < 0)
      .reduce((sum, t) => sum + Math.abs(t.realized_gain_loss), 0);

    const longTermLosses = transactions
      .filter(t => t.category === 'long-term-gain' && t.realized_gain_loss < 0)
      .reduce((sum, t) => sum + Math.abs(t.realized_gain_loss), 0);

    const netCapitalGainLoss = (shortTermGains + longTermGains) - (shortTermLosses + longTermLosses);

    const purchases = await db.transactions.count({
      where: { user_id: userId, tax_year: taxYear, type: 'buy' }
    });

    const sales = await db.transactions.count({
      where: { user_id: userId, tax_year: taxYear, type: 'sell' }
    });

    // Upsert tax summary
    await db.tax_summaries.upsert({
      where: {
        user_id_tax_year: { user_id: userId, tax_year: taxYear }
      },
      update: {
        total_short_term_gains: shortTermGains,
        total_long_term_gains: longTermGains,
        total_short_term_losses: shortTermLosses,
        total_long_term_losses: longTermLosses,
        total_purchases: purchases,
        total_sales: sales,
        net_capital_gain_loss: netCapitalGainLoss,
        generated_at: new Date()
      },
      create: {
        user_id: userId,
        tax_year: taxYear,
        total_short_term_gains: shortTermGains,
        total_long_term_gains: longTermGains,
        total_short_term_losses: shortTermLosses,
        total_long_term_losses: longTermLosses,
        total_purchases: purchases,
        total_sales: sales,
        net_capital_gain_loss: netCapitalGainLoss
      }
    });
  }

  // Import transactions from platform (historical sync)
  async importPlatformTransactions(
    userId: string,
    platform: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ImportResult> {
    const connection = await db.marketplace_connections.findFirst({
      where: { user_id: userId, platform }
    });

    if (!connection || !connection.is_active) {
      throw new Error(`Not connected to ${platform}`);
    }

    // Fetch transaction history from platform API
    const platformTransactions = await this.fetchPlatformTransactions(
      platform,
      connection,
      startDate,
      endDate
    );

    let imported = 0;
    let skipped = 0;

    for (const platformTx of platformTransactions) {
      // Check if already imported
      const exists = await db.transactions.findFirst({
        where: {
          user_id: userId,
          platform,
          external_transaction_id: platformTx.id
        }
      });

      if (exists) {
        skipped++;
        continue;
      }

      // Record transaction
      if (platformTx.type === 'buy') {
        await this.recordPurchase({
          userId,
          itemId: platformTx.itemId,
          platform,
          price: platformTx.price,
          platformFee: platformTx.fee,
          transactionDate: platformTx.date,
          externalTransactionId: platformTx.id
        });
      } else if (platformTx.type === 'sell') {
        await this.recordSale({
          userId,
          itemId: platformTx.itemId,
          platform,
          salePrice: platformTx.price,
          platformFee: platformTx.fee,
          transactionDate: platformTx.date
        });
      }

      imported++;
    }

    return {
      platform,
      imported,
      skipped,
      total: platformTransactions.length
    };
  }
}
```

### API Endpoints

```typescript
// Get transaction history
GET /api/transactions?startDate=2024-01-01&endDate=2024-12-31&type=sell&platform=csfloat
Response: {
  transactions: [
    {
      id: "...",
      type: "sell",
      itemName: "AK-47 | Redline",
      platform: "csfloat",
      amount: 8.50,
      platformFee: 0.17,
      netAmount: 8.33,
      costBasis: 7.00,
      realizedGainLoss: 1.33,
      holdingPeriodDays: 45,
      transactionDate: "2024-11-01T10:00:00Z"
    },
    // ...
  ],
  totalCount: 247,
  summary: {
    totalRevenue: 1234.56,
    totalCosts: 987.65,
    totalProfit: 246.91
  }
}

// Get tax summary for year
GET /api/transactions/tax-summary/2024
Response: {
  taxYear: 2024,
  totalShortTermGains: 1245.67,
  totalLongTermGains: 543.21,
  totalShortTermLosses: 234.56,
  totalLongTermLosses: 123.45,
  netCapitalGainLoss: 1430.87,
  totalPurchases: 120,
  totalSales: 95,
  estimatedTaxLiability: {
    shortTermTax: 460.90,  // 37% of short-term gains (example rate)
    longTermTax: 152.10,   // 28% of long-term gains (collectibles rate)
    totalTax: 613.00
  }
}

// Export transactions for tax filing
GET /api/transactions/export?format=csv&year=2024&type=form8949
Response: {
  downloadUrl: "/api/downloads/form8949_2024.csv",
  expiresAt: "2025-11-03T12:00:00Z"
}

// Import historical transactions from platform
POST /api/transactions/import
Body: {
  platform: "csfloat",
  startDate: "2024-01-01",
  endDate: "2024-12-31"
}
Response: {
  platform: "csfloat",
  imported: 87,
  skipped: 12,  // Already in database
  total: 99
}
```

### Frontend Components

```typescript
// Transaction History Page
// pages/transactions/history.tsx
export default function TransactionHistoryPage() {
  const [filters, setFilters] = useState({
    startDate: startOfYear(new Date()),
    endDate: new Date(),
    type: undefined,
    platform: undefined
  })

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => fetch(`/api/transactions?${new URLSearchParams(filters)}`).then(r => r.json())
  })

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Transaction History</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Total Revenue"
          value={`$${data?.summary.totalRevenue.toFixed(2)}`}
          icon="💰"
        />
        <SummaryCard
          title="Total Costs"
          value={`$${data?.summary.totalCosts.toFixed(2)}`}
          icon="💸"
        />
        <SummaryCard
          title="Net Profit"
          value={`$${data?.summary.totalProfit.toFixed(2)}`}
          icon="📈"
          positive={data?.summary.totalProfit > 0}
        />
        <SummaryCard
          title="Transactions"
          value={data?.totalCount}
          icon="📊"
        />
      </div>

      {/* Filter Panel */}
      <TransactionFilterPanel
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Export Button */}
      <div className="mb-6">
        <button
          onClick={handleExportCSV}
          className="btn-primary"
        >
          📥 Export to CSV
        </button>
      </div>

      {/* Transaction Table */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <TransactionTable transactions={data.transactions} />
      )}
    </div>
  )
}

// Transaction table
function TransactionTable({ transactions }) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left py-3 px-4">Date</th>
            <th className="text-left py-3 px-4">Type</th>
            <th className="text-left py-3 px-4">Item</th>
            <th className="text-left py-3 px-4">Platform</th>
            <th className="text-right py-3 px-4">Amount</th>
            <th className="text-right py-3 px-4">Fee</th>
            <th className="text-right py-3 px-4">Net</th>
            <th className="text-right py-3 px-4">Profit/Loss</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(tx => (
            <tr key={tx.id} className="border-t hover:bg-gray-50">
              <td className="py-3 px-4 text-sm text-gray-600">
                {format(new Date(tx.transactionDate), 'MMM d, yyyy')}
              </td>
              <td className="py-3 px-4">
                <span className={`px-2 py-1 rounded text-xs ${
                  tx.type === 'buy' ? 'bg-blue-100 text-blue-800' :
                  tx.type === 'sell' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {tx.type}
                </span>
              </td>
              <td className="py-3 px-4 font-semibold">{tx.itemName}</td>
              <td className="py-3 px-4 text-sm text-gray-600">{tx.platform}</td>
              <td className="py-3 px-4 text-right">${tx.amount.toFixed(2)}</td>
              <td className="py-3 px-4 text-right text-red-600">
                -${tx.platformFee.toFixed(2)}
              </td>
              <td className="py-3 px-4 text-right font-semibold">
                ${tx.netAmount.toFixed(2)}
              </td>
              <td className="py-3 px-4 text-right">
                {tx.realizedGainLoss !== null && (
                  <span className={tx.realizedGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {tx.realizedGainLoss >= 0 ? '+' : ''}
                    ${tx.realizedGainLoss.toFixed(2)}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Tax Summary Page
// pages/transactions/tax-summary.tsx
export default function TaxSummaryPage() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const { data } = useQuery({
    queryKey: ['tax-summary', selectedYear],
    queryFn: () => fetch(`/api/transactions/tax-summary/${selectedYear}`).then(r => r.json())
  })

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Tax Summary</h1>

      {/* Year Selector */}
      <div className="mb-6">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="px-4 py-2 border rounded"
        >
          {[currentYear, currentYear - 1, currentYear - 2].map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Capital Gains Summary */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Capital Gains & Losses</h2>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Short-Term (≤1 year)</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Gains:</span>
                <span className="text-green-600 font-semibold">
                  ${data?.totalShortTermGains.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Losses:</span>
                <span className="text-red-600 font-semibold">
                  -${data?.totalShortTermLosses.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Net:</span>
                <span className={
                  (data?.totalShortTermGains - data?.totalShortTermLosses) >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }>
                  ${(data?.totalShortTermGains - data?.totalShortTermLosses).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Long-Term (>1 year)</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Gains:</span>
                <span className="text-green-600 font-semibold">
                  ${data?.totalLongTermGains.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Losses:</span>
                <span className="text-red-600 font-semibold">
                  -${data?.totalLongTermLosses.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Net:</span>
                <span className={
                  (data?.totalLongTermGains - data?.totalLongTermLosses) >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }>
                  ${(data?.totalLongTermGains - data?.totalLongTermLosses).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Net Capital Gain/Loss:</span>
            <span className={`text-2xl font-bold ${
              data?.netCapitalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              ${data?.netCapitalGainLoss.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Estimated Tax Liability */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">⚠️ Estimated Tax Liability</h2>
        <p className="text-sm text-gray-600 mb-4">
          This is an estimate only. Consult a tax professional for accurate calculations.
        </p>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Short-Term Tax (37%):</span>
            <span className="font-semibold">${data?.estimatedTaxLiability.shortTermTax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Long-Term Tax (28%):</span>
            <span className="font-semibold">${data?.estimatedTaxLiability.longTermTax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total Estimated Tax:</span>
            <span className="text-red-600">${data?.estimatedTaxLiability.totalTax.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => handleExport('form8949')}
          className="btn-primary"
        >
          📥 Export Form 8949 (CSV)
        </button>
        <button
          onClick={() => handleExport('pdf')}
          className="btn-secondary"
        >
          📄 Download Tax Summary (PDF)
        </button>
      </div>
    </div>
  )
}
```

## Success Metrics

- ✅ 80%+ investors use transaction tracking (of premium users)
- ✅ 50%+ users export transactions for taxes annually
- ✅ 95%+ transaction import accuracy (from platforms)
- ✅ <5s transaction history load (500+ transactions)
- ✅ 100% cost basis accuracy (FIFO matching)

## Dependencies

### Must Have Before Starting
- [07] Inventory Import (to track inventory items)
- [13] Cross-Platform Listing Manager (to record sales)
- Platform API access for historical transactions

### Blocks Other Features
- [15] Portfolio Analytics (uses transaction data)

## Effort Estimate

- **Development Time:** 2-3 weeks
- **Complexity:** High
- **Team Size:** 1-2 developers

**Breakdown:**
- Week 1: Database schema, cost basis ledger, recording service
- Week 2: Platform transaction import, tax calculations
- Week 3: Frontend UI, export functionality, tax summary

## Implementation Notes

### Form 8949 CSV Export Format

```typescript
// Generate IRS Form 8949 compatible CSV
function generateForm8949CSV(transactions: Transaction[]): string {
  const headers = [
    'Description of property',
    'Date acquired',
    'Date sold',
    'Proceeds (sales price)',
    'Cost or other basis',
    'Gain or (loss)'
  ];

  const rows = transactions
    .filter(tx => tx.type === 'sell')
    .map(tx => [
      tx.item.name,
      format(tx.costBasisEntry.purchase_date, 'MM/dd/yyyy'),
      format(tx.transaction_date, 'MM/dd/yyyy'),
      tx.net_amount.toFixed(2),
      tx.cost_basis.toFixed(2),
      tx.realized_gain_loss.toFixed(2)
    ]);

  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}
```

### Gotchas to Watch For

1. **Cost Basis Matching**
   - User sells item, but which purchase does it match?
   - Solution: FIFO default (oldest purchase first), allow user to choose

2. **Missing Purchase History**
   - User sells item bought before joining csloadout.gg
   - Solution: Allow manual cost basis entry, mark as "estimated"

3. **Multiple Currencies**
   - Transactions in USD, EUR, CNY
   - Solution: Convert all to USD at transaction date exchange rate

4. **Wash Sales**
   - IRS wash sale rule (sell at loss, rebuy within 30 days = disallowed loss)
   - MVP: Don't handle automatically, note for user to consult accountant

5. **Partial Sales**
   - User buys 10 cases, sells 3
   - Solution: Track quantity_remaining in cost_basis_ledger

6. **Platform Transaction Limits**
   - API only returns last 90 days of transactions
   - Solution: Import regularly, don't rely on long historical fetches

## Status

- [ ] Research complete
- [ ] Database schema created
- [ ] Transaction recording service built
- [ ] Cost basis ledger implemented
- [ ] Tax summary calculations working
- [ ] Platform import functional
- [ ] Frontend UI complete
- [ ] Export functionality working
- [ ] Testing complete
- [ ] Deployed to production

## Related Features

- **Depends On:**
  - [07] Inventory Import
  - [13] Cross-Platform Listing Manager

- **Enables:**
  - [15] Portfolio Analytics

## References

- IRS Form 8949: https://www.irs.gov/forms-pubs/about-form-8949
- IRS Schedule D: https://www.irs.gov/forms-pubs/about-schedule-d-form-1040
- TurboTax Crypto Taxes: https://turbotax.intuit.com/tax-tips/investments-and-taxes/guide-to-cryptocurrency-taxes
- CoinTracker Tax Guide: https://www.cointracker.io/blog/cryptocurrency-tax-guide
