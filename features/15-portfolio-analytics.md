# 15 - Portfolio Analytics

## Overview

Advanced portfolio performance tracking with charts, metrics, and insights. Shows portfolio value over time, profit/loss analysis, ROI by item type, platform performance comparison, and investment strategy effectiveness. Transforms raw transaction data into actionable intelligence for investors.

**Value Prop:** "See your CS2 portfolio performance like a stock portfolio - charts, ROI, and insights"

## User Segments Served

- **Primary:** Investors (tracking portfolio performance, ROI)
- **Secondary:** Bulk Traders (analyzing business metrics)
- **Tertiary:** Casual Players (see inventory value trends)

## User Stories / Use Cases

### As an Investor
- I want to see my portfolio value over the last 12 months (line chart)
- I want to see ROI breakdown by item type (cases: +15%, skins: +8%)
- I want to identify my best and worst investments
- I want to compare my performance vs CS2 market average
- I want to see which holding strategy performs best (long-term vs flips)

### As a Bulk Trader
- I want to see total revenue by platform (CSFloat: $5K, Buff163: $3K)
- I want to track average profit margin per transaction
- I want to identify highest-volume items (what sells fastest?)
- I want to see capital efficiency (how fast is inventory turning over?)

### As a Casual Player
- I want to see if my inventory is going up or down in value
- I want to see my biggest profit (item I bought for $5, now worth $20)
- I want to see total return on investment (did I make money overall?)

## Research & Context

### Portfolio Analytics in Investment Apps

**Reference Platforms:**
```
1. Robinhood (Stocks):
   - Portfolio value chart (1D, 1W, 1M, 3M, 1Y, All)
   - Total return ($ and %)
   - Today's change ($ and %)
   - Investing vs portfolio value comparison
   - Holdings breakdown (pie chart by stock)
   - Performance history (daily snapshots)

2. Coinbase (Crypto):
   - Portfolio balance over time (line chart)
   - Total profit/loss
   - Asset breakdown (BTC 45%, ETH 30%, etc.)
   - Best/worst performers
   - Cost basis vs current value
   - Unrealized gains/losses

3. Fidelity (Investments):
   - Portfolio performance vs benchmark (S&P 500)
   - Asset allocation (stocks, bonds, cash)
   - Gain/loss summary
   - Cost basis tracking
   - Tax-loss harvesting opportunities
   - Performance attribution (what drove returns?)

4. Zillow (Real Estate):
   - Home value over time (Zestimate chart)
   - Equity buildup
   - Neighborhood trends
   - Comparable sales
```

**Key Metrics to Track:**
```
1. Performance Metrics:
   - Total portfolio value
   - Total invested (cost basis)
   - Unrealized gain/loss (current items)
   - Realized gain/loss (sold items)
   - Total ROI (%)
   - Time-weighted return

2. Breakdown Metrics:
   - Value by item type (skins, cases, stickers)
   - Value by rarity
   - Value by platform listed
   - Value by account

3. Transaction Metrics:
   - Total purchases (count, $)
   - Total sales (count, $)
   - Average purchase price
   - Average sale price
   - Average holding period

4. Comparison Metrics:
   - Portfolio vs CS2 market index
   - Platform performance (CSFloat vs Buff163)
   - Item type performance (cases vs skins)
```

### CS2-Specific Analytics

**Market Index (Benchmark):**
```
Create "CS2 Market Index" = Average price of top 100 most-traded items
- Similar to S&P 500 for stocks
- Allows users to see if they beat the market
- "Your portfolio: +12% vs Market: +5%"

Example:
- Track prices of AK-47 Redline, AWP Asiimov, etc. (top items)
- Weight by trading volume
- Calculate daily average
- Compare user portfolio performance
```

**Item-Specific Insights:**
```
Best Investments:
- "AK-47 | Redline bought for $7, sold for $12 (+71% ROI)"

Worst Investments:
- "M4A4 | Howl bought for $1,200, currently $950 (-21% unrealized loss)"

Fastest Flips:
- "Case bought for $0.40, sold for $0.55 in 2 days (+37.5% ROI, 190% annualized)"
```

### Performance Calculation Methods

**Simple Return:**
```
ROI = (Current Value - Cost Basis) / Cost Basis * 100

Example:
Cost Basis: $1,000
Current Value: $1,250
ROI = ($1,250 - $1,000) / $1,000 * 100 = 25%
```

**Time-Weighted Return (TWR):**
```
Accounts for deposits/withdrawals over time
More accurate for portfolios with frequent trading

Example:
User adds $500 each month, portfolio grows
TWR shows performance independent of new deposits
```

**Money-Weighted Return (MWR) / IRR:**
```
Internal Rate of Return
Accounts for timing of cash flows
"If I had invested all money at once, what return would I get?"
```

## Technical Requirements

### Database Schema

```sql
-- Daily portfolio snapshots (for historical charts)
CREATE TABLE portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Date
  snapshot_date DATE NOT NULL,

  -- Portfolio values
  total_value DECIMAL(10,2) NOT NULL,     -- Current market value
  total_cost_basis DECIMAL(10,2) NOT NULL, -- What user paid
  unrealized_gain_loss DECIMAL(10,2),      -- total_value - total_cost_basis
  unrealized_gain_loss_percent DECIMAL(5,2),

  -- Counts
  total_items INTEGER DEFAULT 0,
  total_accounts INTEGER DEFAULT 0,

  -- Breakdown by type
  value_by_type JSONB,                     -- {"skins": 500, "cases": 200, "stickers": 50}
  value_by_rarity JSONB,                   -- {"covert": 300, "classified": 200}

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, snapshot_date)
);

CREATE INDEX idx_portfolio_snapshots_user_date ON portfolio_snapshots(user_id, snapshot_date);

-- Performance metrics (aggregated calculations)
CREATE TABLE portfolio_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period VARCHAR(20) NOT NULL,             -- '1D', '1W', '1M', '3M', '1Y', 'ALL'

  -- Performance
  start_value DECIMAL(10,2),
  end_value DECIMAL(10,2),
  absolute_change DECIMAL(10,2),
  percent_change DECIMAL(5,2),

  -- ROI
  total_invested DECIMAL(10,2),
  total_returned DECIMAL(10,2),            -- From sales
  total_unrealized DECIMAL(10,2),          -- Current holdings
  total_roi_percent DECIMAL(5,2),

  -- Comparison
  market_index_change_percent DECIMAL(5,2), -- CS2 market benchmark
  relative_performance DECIMAL(5,2),         -- user vs market

  calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, period)
);

CREATE INDEX idx_portfolio_metrics_user ON portfolio_metrics(user_id);

-- Best/worst investments
CREATE TABLE investment_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Item
  item_id UUID REFERENCES items(id),
  item_name VARCHAR(255),

  -- Performance
  cost_basis DECIMAL(10,2) NOT NULL,
  current_value DECIMAL(10,2),              -- If still held
  realized_value DECIMAL(10,2),             -- If sold
  roi_percent DECIMAL(5,2),
  roi_category VARCHAR(20),                 -- 'best', 'worst', 'neutral'

  -- Timing
  purchase_date TIMESTAMP,
  sale_date TIMESTAMP,
  holding_period_days INTEGER,

  insight_type VARCHAR(50),                 -- 'best-investment', 'worst-investment', 'fastest-flip'
  generated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_investment_insights_user ON investment_insights(user_id);
CREATE INDEX idx_investment_insights_type ON investment_insights(insight_type);

-- CS2 Market Index (benchmark)
CREATE TABLE market_index_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  index_date DATE NOT NULL UNIQUE,
  index_value DECIMAL(10,2) NOT NULL,      -- Average price of top 100 items
  percent_change DECIMAL(5,2),              -- vs previous day
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_market_index_date ON market_index_history(index_date);
```

### Portfolio Analytics Service

```typescript
// Service to calculate portfolio analytics
class PortfolioAnalyticsService {
  // Generate daily portfolio snapshot
  async generateSnapshot(userId: string, date: Date = new Date()): Promise<PortfolioSnapshot> {
    // Get all user's inventory items
    const inventoryItems = await db.inventory_items.findMany({
      where: {
        inventory: {
          user_inventory: {
            linked_account: {
              user_id: userId
            }
          }
        }
      },
      include: {
        item: true
      }
    });

    // Calculate total value
    const totalValue = inventoryItems.reduce((sum, item) => sum + (item.current_value || 0), 0);

    // Calculate total cost basis
    const costBasisEntries = await db.cost_basis_ledger.findMany({
      where: {
        user_id: userId,
        quantity_remaining: { gt: 0 } // Only unsold items
      }
    });

    const totalCostBasis = costBasisEntries.reduce((sum, entry) => sum + entry.purchase_price, 0);

    // Calculate unrealized gain/loss
    const unrealizedGainLoss = totalValue - totalCostBasis;
    const unrealizedGainLossPercent = totalCostBasis > 0
      ? (unrealizedGainLoss / totalCostBasis) * 100
      : 0;

    // Breakdown by type
    const valueByType = {};
    inventoryItems.forEach(item => {
      const type = item.item.type;
      valueByType[type] = (valueByType[type] || 0) + (item.current_value || 0);
    });

    // Breakdown by rarity
    const valueByRarity = {};
    inventoryItems.forEach(item => {
      const rarity = item.item.rarity;
      valueByRarity[rarity] = (valueByRarity[rarity] || 0) + (item.current_value || 0);
    });

    // Count accounts
    const accounts = await db.linked_steam_accounts.count({
      where: { user_id: userId }
    });

    // Save snapshot
    const snapshot = await db.portfolio_snapshots.create({
      data: {
        user_id: userId,
        snapshot_date: startOfDay(date),
        total_value: totalValue,
        total_cost_basis: totalCostBasis,
        unrealized_gain_loss: unrealizedGainLoss,
        unrealized_gain_loss_percent: unrealizedGainLossPercent,
        total_items: inventoryItems.length,
        total_accounts: accounts,
        value_by_type: valueByType,
        value_by_rarity: valueByRarity
      }
    });

    return snapshot;
  }

  // Calculate performance metrics for period
  async calculateMetrics(userId: string, period: '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'): Promise<PortfolioMetrics> {
    const endDate = startOfDay(new Date());
    const startDate = this.getStartDate(period, endDate);

    // Get snapshots for period
    const snapshots = await db.portfolio_snapshots.findMany({
      where: {
        user_id: userId,
        snapshot_date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { snapshot_date: 'asc' }
    });

    if (snapshots.length === 0) {
      return this.getEmptyMetrics(userId, period);
    }

    const startSnapshot = snapshots[0];
    const endSnapshot = snapshots[snapshots.length - 1];

    // Calculate absolute and percent change
    const absoluteChange = endSnapshot.total_value - startSnapshot.total_value;
    const percentChange = startSnapshot.total_value > 0
      ? (absoluteChange / startSnapshot.total_value) * 100
      : 0;

    // Calculate total invested, returned, unrealized
    const transactions = await db.transactions.findMany({
      where: {
        user_id: userId,
        transaction_date: {
          lte: endDate
        }
      }
    });

    const totalInvested = transactions
      .filter(tx => tx.type === 'buy')
      .reduce((sum, tx) => sum + Math.abs(tx.net_amount), 0);

    const totalReturned = transactions
      .filter(tx => tx.type === 'sell')
      .reduce((sum, tx) => sum + tx.net_amount, 0);

    const totalUnrealized = endSnapshot.total_value;

    const totalROI = totalInvested > 0
      ? ((totalReturned + totalUnrealized - totalInvested) / totalInvested) * 100
      : 0;

    // Get market index change for comparison
    const marketIndexChange = await this.getMarketIndexChange(startDate, endDate);

    const relativePerformance = percentChange - marketIndexChange;

    // Save metrics
    const metrics = await db.portfolio_metrics.upsert({
      where: {
        user_id_period: { user_id: userId, period }
      },
      update: {
        start_value: startSnapshot.total_value,
        end_value: endSnapshot.total_value,
        absolute_change: absoluteChange,
        percent_change: percentChange,
        total_invested: totalInvested,
        total_returned: totalReturned,
        total_unrealized: totalUnrealized,
        total_roi_percent: totalROI,
        market_index_change_percent: marketIndexChange,
        relative_performance: relativePerformance,
        calculated_at: new Date()
      },
      create: {
        user_id: userId,
        period,
        start_value: startSnapshot.total_value,
        end_value: endSnapshot.total_value,
        absolute_change: absoluteChange,
        percent_change: percentChange,
        total_invested: totalInvested,
        total_returned: totalReturned,
        total_unrealized: totalUnrealized,
        total_roi_percent: totalROI,
        market_index_change_percent: marketIndexChange,
        relative_performance: relativePerformance
      }
    });

    return metrics;
  }

  // Generate investment insights (best/worst investments)
  async generateInsights(userId: string): Promise<InvestmentInsight[]> {
    const insights: InvestmentInsight[] = [];

    // Get all completed transactions (sold items)
    const soldTransactions = await db.transactions.findMany({
      where: {
        user_id: userId,
        type: 'sell',
        realized_gain_loss: { not: null }
      },
      include: {
        item: true
      },
      orderBy: { realized_gain_loss: 'desc' }
    });

    // Best investments (highest ROI)
    const best = soldTransactions.slice(0, 5);
    for (const tx of best) {
      insights.push({
        user_id: userId,
        item_id: tx.item_id,
        item_name: tx.item.name,
        cost_basis: tx.cost_basis,
        realized_value: tx.net_amount,
        roi_percent: (tx.realized_gain_loss / tx.cost_basis) * 100,
        roi_category: 'best',
        purchase_date: tx.transaction_date, // Would need to join purchase tx
        sale_date: tx.transaction_date,
        holding_period_days: tx.holding_period_days,
        insight_type: 'best-investment'
      });
    }

    // Worst investments (lowest/negative ROI)
    const worst = soldTransactions.slice(-5).reverse();
    for (const tx of worst) {
      insights.push({
        user_id: userId,
        item_id: tx.item_id,
        item_name: tx.item.name,
        cost_basis: tx.cost_basis,
        realized_value: tx.net_amount,
        roi_percent: (tx.realized_gain_loss / tx.cost_basis) * 100,
        roi_category: 'worst',
        purchase_date: tx.transaction_date,
        sale_date: tx.transaction_date,
        holding_period_days: tx.holding_period_days,
        insight_type: 'worst-investment'
      });
    }

    // Fastest flips (shortest holding period with positive ROI)
    const fastFlips = soldTransactions
      .filter(tx => tx.holding_period_days <= 7 && tx.realized_gain_loss > 0)
      .sort((a, b) => a.holding_period_days - b.holding_period_days)
      .slice(0, 5);

    for (const tx of fastFlips) {
      insights.push({
        user_id: userId,
        item_id: tx.item_id,
        item_name: tx.item.name,
        cost_basis: tx.cost_basis,
        realized_value: tx.net_amount,
        roi_percent: (tx.realized_gain_loss / tx.cost_basis) * 100,
        roi_category: 'neutral',
        purchase_date: tx.transaction_date,
        sale_date: tx.transaction_date,
        holding_period_days: tx.holding_period_days,
        insight_type: 'fastest-flip'
      });
    }

    // Save insights
    await db.investment_insights.deleteMany({
      where: { user_id: userId }
    });

    await db.investment_insights.createMany({
      data: insights
    });

    return insights;
  }

  // Calculate CS2 Market Index
  async calculateMarketIndex(date: Date): Promise<number> {
    // Get top 100 most-traded items
    const topItems = await db.items.findMany({
      take: 100,
      orderBy: { trading_volume: 'desc' } // Assume we track volume
    });

    // Get current prices for these items
    const prices = await db.marketplace_prices.findMany({
      where: {
        item_id: { in: topItems.map(i => i.id) }
      },
      orderBy: { total_cost: 'asc' }
    });

    // Calculate average (weighted by volume if possible)
    const averagePrice = prices.reduce((sum, p) => sum + p.total_cost, 0) / prices.length;

    // Save to history
    await db.market_index_history.create({
      data: {
        index_date: startOfDay(date),
        index_value: averagePrice
      }
    });

    return averagePrice;
  }

  private getStartDate(period: string, endDate: Date): Date {
    switch (period) {
      case '1D': return subDays(endDate, 1);
      case '1W': return subWeeks(endDate, 1);
      case '1M': return subMonths(endDate, 1);
      case '3M': return subMonths(endDate, 3);
      case '1Y': return subYears(endDate, 1);
      case 'ALL': return new Date(2020, 0, 1); // Far past
    }
  }

  private async getMarketIndexChange(startDate: Date, endDate: Date): Promise<number> {
    const startIndex = await db.market_index_history.findFirst({
      where: { index_date: startOfDay(startDate) }
    });

    const endIndex = await db.market_index_history.findFirst({
      where: { index_date: startOfDay(endDate) }
    });

    if (!startIndex || !endIndex) return 0;

    return ((endIndex.index_value - startIndex.index_value) / startIndex.index_value) * 100;
  }
}

// Cron job: Generate daily snapshots for all users
cron.schedule('0 1 * * *', async () => { // 1 AM daily
  const users = await db.users.findMany({
    where: { linkedSteamAccounts: { some: {} } } // Users with inventory
  });

  const service = new PortfolioAnalyticsService();

  for (const user of users) {
    await service.generateSnapshot(user.id);
  }
});

// Cron job: Calculate market index daily
cron.schedule('0 2 * * *', async () => { // 2 AM daily
  const service = new PortfolioAnalyticsService();
  await service.calculateMarketIndex(new Date());
});
```

### API Endpoints

```typescript
// Get portfolio overview
GET /api/portfolio/overview
Response: {
  currentValue: 12450.67,
  costBasis: 10000.00,
  unrealizedGain: 2450.67,
  unrealizedGainPercent: 24.51,
  totalItems: 247,
  totalAccounts: 3,
  todayChange: 123.45,
  todayChangePercent: 1.00
}

// Get portfolio value history
GET /api/portfolio/history?period=1M
Response: {
  period: '1M',
  dataPoints: [
    { date: '2024-10-01', value: 11500.00 },
    { date: '2024-10-02', value: 11550.00 },
    // ... daily snapshots
    { date: '2024-11-01', value: 12450.67 }
  ],
  change: {
    absolute: 950.67,
    percent: 8.27
  }
}

// Get performance metrics
GET /api/portfolio/metrics?period=1Y
Response: {
  period: '1Y',
  startValue: 10000.00,
  endValue: 12450.67,
  absoluteChange: 2450.67,
  percentChange: 24.51,
  totalInvested: 15000.00,
  totalReturned: 5000.00,       // From sales
  totalUnrealized: 12450.67,     // Current holdings
  totalROIPercent: 16.34,        // (5000 + 12450 - 15000) / 15000 * 100
  marketIndexChangePercent: 12.0,
  relativePerformance: 12.51,    // You beat market by 12.51%
  calculatedAt: '2025-11-02T10:00:00Z'
}

// Get investment insights
GET /api/portfolio/insights
Response: {
  bestInvestments: [
    {
      itemName: 'AK-47 | Redline',
      costBasis: 7.00,
      realizedValue: 12.00,
      roiPercent: 71.43,
      holdingPeriodDays: 45
    },
    // ... top 5
  ],
  worstInvestments: [
    {
      itemName: 'M4A4 | Howl',
      costBasis: 1200.00,
      realizedValue: 950.00,
      roiPercent: -20.83,
      holdingPeriodDays: 365
    },
    // ... worst 5
  ],
  fastestFlips: [
    {
      itemName: 'Operation Bravo Case',
      costBasis: 0.40,
      realizedValue: 0.55,
      roiPercent: 37.5,
      holdingPeriodDays: 2,
      annualizedROI: 6843.75  // (37.5 / 2) * 365
    },
    // ... top 5 fast flips
  ]
}

// Get breakdown charts
GET /api/portfolio/breakdown?by=type
Response: {
  breakdownBy: 'type',
  segments: [
    { label: 'Skins', value: 5000.00, percent: 40.17 },
    { label: 'Cases', value: 3500.00, percent: 28.12 },
    { label: 'Stickers', value: 2000.00, percent: 16.07 },
    { label: 'Other', value: 1950.67, percent: 15.66 }
  ]
}

// Compare platform performance
GET /api/portfolio/platform-performance
Response: {
  platforms: [
    {
      platform: 'csfloat',
      totalRevenue: 5234.56,
      totalFees: 104.69,
      netRevenue: 5129.87,
      transactionCount: 87,
      avgMargin: 12.5
    },
    // ... other platforms
  ]
}
```

### Frontend Components

```typescript
// Portfolio Analytics Page
// pages/portfolio/analytics.tsx
export default function PortfolioAnalyticsPage() {
  const [timePeriod, setTimePeriod] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M')

  const { data: overview } = useQuery({
    queryKey: ['portfolio-overview'],
    queryFn: () => fetch('/api/portfolio/overview').then(r => r.json())
  })

  const { data: history } = useQuery({
    queryKey: ['portfolio-history', timePeriod],
    queryFn: () => fetch(`/api/portfolio/history?period=${timePeriod}`).then(r => r.json())
  })

  const { data: metrics } = useQuery({
    queryKey: ['portfolio-metrics', timePeriod],
    queryFn: () => fetch(`/api/portfolio/metrics?period=${timePeriod}`).then(r => r.json())
  })

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Portfolio Analytics</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Portfolio Value"
          value={`$${overview?.currentValue.toLocaleString()}`}
          change={overview?.todayChangePercent}
          changeLabel="Today"
        />
        <MetricCard
          title="Total Gain/Loss"
          value={`$${overview?.unrealizedGain.toLocaleString()}`}
          subtext={`${overview?.unrealizedGainPercent.toFixed(2)}% ROI`}
          positive={overview?.unrealizedGain >= 0}
        />
        <MetricCard
          title="Cost Basis"
          value={`$${overview?.costBasis.toLocaleString()}`}
          subtext="Total Invested"
        />
        <MetricCard
          title="Items"
          value={overview?.totalItems}
          subtext={`${overview?.totalAccounts} accounts`}
        />
      </div>

      {/* Portfolio Value Chart */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Portfolio Value</h2>

          <TimePeriodSelector
            selected={timePeriod}
            onChange={setTimePeriod}
          />
        </div>

        <PortfolioChart
          data={history?.dataPoints || []}
          change={history?.change}
        />
      </div>

      {/* Performance vs Market */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Performance vs CS2 Market</h2>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600">Your Performance</div>
            <div className={`text-2xl font-bold ${
              metrics?.percentChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {metrics?.percentChange >= 0 ? '+' : ''}
              {metrics?.percentChange.toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">CS2 Market Index</div>
            <div className={`text-2xl font-bold ${
              metrics?.marketIndexChangePercent >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {metrics?.marketIndexChangePercent >= 0 ? '+' : ''}
              {metrics?.marketIndexChangePercent.toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Relative Performance</div>
            <div className={`text-2xl font-bold ${
              metrics?.relativePerformance >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {metrics?.relativePerformance >= 0 ? '+' : ''}
              {metrics?.relativePerformance.toFixed(2)}%
              {metrics?.relativePerformance >= 0 && (
                <span className="text-sm ml-2">🎉 Beat Market!</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Investment Insights */}
      <InvestmentInsights />

      {/* Portfolio Breakdown */}
      <PortfolioBreakdown />
    </div>
  )
}

// Portfolio value chart
function PortfolioChart({ data, change }) {
  return (
    <div>
      <div className="mb-2">
        <span className={`text-2xl font-bold ${
          change?.percent >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {change?.percent >= 0 ? '+' : ''}
          ${change?.absolute.toFixed(2)} ({change?.percent.toFixed(2)}%)
        </span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis
            dataKey="date"
            tickFormatter={(date) => format(new Date(date), 'MMM d')}
          />
          <YAxis
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <Tooltip
            formatter={(value) => [`$${value.toLocaleString()}`, 'Value']}
            labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={change?.percent >= 0 ? '#10B981' : '#EF4444'}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Investment insights panel
function InvestmentInsights() {
  const { data } = useQuery({
    queryKey: ['portfolio-insights'],
    queryFn: () => fetch('/api/portfolio/insights').then(r => r.json())
  })

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <InsightPanel
        title="🏆 Best Investments"
        items={data?.bestInvestments || []}
        showROI={true}
      />
      <InsightPanel
        title="📉 Worst Investments"
        items={data?.worstInvestments || []}
        showROI={true}
      />
      <InsightPanel
        title="⚡ Fastest Flips"
        items={data?.fastestFlips || []}
        showHoldingPeriod={true}
      />
    </div>
  )
}

function InsightPanel({ title, items, showROI, showHoldingPeriod }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between items-start">
            <div className="flex-1">
              <div className="font-semibold text-sm">{item.itemName}</div>
              <div className="text-xs text-gray-500">
                ${item.costBasis.toFixed(2)} → ${item.realizedValue.toFixed(2)}
              </div>
              {showHoldingPeriod && (
                <div className="text-xs text-gray-500">
                  Held for {item.holdingPeriodDays} days
                </div>
              )}
            </div>
            {showROI && (
              <div className={`text-right ${
                item.roiPercent >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                <div className="font-bold">
                  {item.roiPercent >= 0 ? '+' : ''}
                  {item.roiPercent.toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Success Metrics

- ✅ 90%+ investors use analytics weekly (of premium users)
- ✅ <3s chart load time (12 months of data)
- ✅ 95%+ accuracy in ROI calculations
- ✅ 60%+ users compare vs market index
- ✅ 40%+ users export analytics for external tracking

## Dependencies

### Must Have Before Starting
- [07] Inventory Import (to track inventory value)
- [14] Bulk Transaction History (for performance calculations)

### Blocks Other Features
- [16] Investment Insights (uses analytics data)

## Effort Estimate

- **Development Time:** 2-3 weeks
- **Complexity:** High
- **Team Size:** 1-2 developers

**Breakdown:**
- Week 1: Database schema, snapshot generation, metrics calculations
- Week 2: Chart components, market index tracking
- Week 3: Insights generation, frontend UI, testing

## Implementation Notes

### Chart Library Selection

```typescript
// Recommended: Recharts (React-friendly, responsive)
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// Alternative: Chart.js (more features, more complex)
// Alternative: Victory (accessible, verbose)
```

### Gotchas to Watch For

1. **Time Zones**
   - User in different timezone sees different "today"
   - Solution: Store snapshot_date as UTC date, convert for display

2. **Missing Snapshots**
   - User joins mid-period, no historical data
   - Solution: Generate backdated snapshots from transaction history

3. **Performance with Large Datasets**
   - 365 daily snapshots = slow query
   - Solution: Index on snapshot_date, use materialized views

4. **Market Index Calculation**
   - Which items to include? Volume weighting?
   - MVP: Simple average of top 100, improve later

5. **ROI Accuracy**
   - Different cost basis methods (FIFO, LIFO) yield different ROI
   - Solution: Allow user to choose method in settings

6. **Partial Sales**
   - User buys 10 cases, sells 3 - how to calc ROI?
   - Solution: Cost basis ledger tracks quantity_remaining

## Status

- [ ] Research complete
- [ ] Database schema created
- [ ] Snapshot generation working
- [ ] Metrics calculation implemented
- [ ] Market index tracking functional
- [ ] Insights generation working
- [ ] Chart components built
- [ ] Frontend UI complete
- [ ] Testing complete
- [ ] Deployed to production

## Related Features

- **Depends On:**
  - [07] Inventory Import
  - [14] Bulk Transaction History

- **Enables:**
  - [16] Investment Insights

## References

- Recharts Documentation: https://recharts.org/
- Time-Weighted Return (TWR): https://www.investopedia.com/terms/t/time-weightedror.asp
- Money-Weighted Return (IRR): https://www.investopedia.com/terms/m/money-weighted-return.asp
- Portfolio Performance Calculation: https://www.investor.gov/introduction-investing/investing-basics/glossary/calculating-your-portfolios-rate-return
