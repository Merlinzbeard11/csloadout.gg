# Feature 34: Market Intelligence Dashboard

## Overview
Comprehensive real-time market intelligence dashboard providing macro-level CS2 economy insights, trend analysis, volatility indicators, sector performance, whale activity tracking, and market sentiment analysis. Designed for professional traders, investors, and market analysts seeking data-driven decision intelligence beyond individual item tracking.

## User Segments
- **Primary**: Professional Traders, Market Analysts, Investors
- **Secondary**: Bulk Traders, Content Creators, Researchers
- **Tertiary**: Serious Collectors, Portfolio Managers

## User Stories

### As a Professional Trader
- I want to see real-time market sentiment indicators (bullish/bearish)
- I want to identify emerging trends before they become mainstream
- I want to track whale activity (large transactions) to predict market movements
- I want sector performance comparison (rifles vs pistols vs knives)
- I want volatility indicators to assess risk

### As a Market Analyst
- I want historical trend data with customizable timeframes
- I want correlation analysis between different skin categories
- I want to export market data for external analysis
- I want to create custom watchlists and alerts
- I want to see trading volume heatmaps by category

### As an Investor
- I want to identify undervalued sectors with growth potential
- I want risk-adjusted return metrics for different categories
- I want to see liquidity indicators (how fast items sell)
- I want macro economic indicators (total market cap, daily volume)
- I want to compare CS2 market trends with real-world markets

### As a Content Creator
- I want embeddable market widgets for my website/stream
- I want to screenshot market intelligence for social media
- I want to access market insights API for automated content
- I want historical snapshots for "market then vs now" comparisons

### As the Platform
- I want to provide premium market intelligence to paid subscribers
- I want to establish csloadout.gg as authoritative data source
- I want to attract institutional traders and researchers
- I want to monetize advanced analytics features

## Research & Context

### Market Intelligence Components

1. **Macro Indicators**
   - Total CS2 market capitalization (sum of all item values)
   - 24-hour trading volume across all platforms
   - Market sentiment index (derived from price movements, volume, social mentions)
   - Active listings count (total items for sale)
   - Average time to sell (liquidity indicator)

2. **Sector Performance**
   - Performance by weapon type (Rifles, Pistols, SMGs, Shotguns, Knives, Gloves)
   - Performance by rarity (Consumer, Industrial, Mil-Spec, Restricted, Classified, Covert)
   - Performance by collection (Dust 2, Nuke, Ancient, etc.)
   - Performance by age (new skins vs vintage)

3. **Trend Detection**
   - Momentum indicators (RSI, MACD for popular items)
   - Breakout detection (items showing unusual activity)
   - Correlation analysis (which items move together)
   - Seasonal patterns (e.g., Major tournament impacts)

4. **Whale Activity**
   - Large transactions (>$1,000) tracked across platforms
   - Whale wallet tracking (accounts with >$50k inventory)
   - Accumulation/distribution patterns
   - Influence on market prices

5. **Sentiment Analysis**
   - Social media sentiment (Twitter, Reddit mentions)
   - Search trend analysis (Google Trends for skin names)
   - Price momentum sentiment (moving averages)
   - News sentiment (CS2 updates, pro player usage)

### Competitor Intelligence Tools

- **TradingView**: Stock market intelligence (gold standard for technical analysis)
- **CoinMarketCap**: Crypto market intelligence (sector performance, heatmaps)
- **CSGOEmpire Analytics**: Basic market stats (limited depth)
- **Opportunity**: First comprehensive CS2 market intelligence platform with professional-grade analytics

## Technical Requirements

### Database Schema Extensions

```sql
-- Market snapshots (hourly aggregates)
CREATE TABLE market_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Timestamp
  snapshot_timestamp TIMESTAMPTZ NOT NULL,

  -- Macro indicators
  total_market_cap DECIMAL(18,2) NOT NULL,
  total_volume_24h DECIMAL(18,2) NOT NULL,
  active_listings INTEGER NOT NULL,
  avg_time_to_sell_hours DECIMAL(10,2),

  -- Sentiment
  sentiment_score DECIMAL(5,2), -- -100 to +100
  sentiment_label VARCHAR(50), -- 'very_bearish', 'bearish', 'neutral', 'bullish', 'very_bullish'

  -- Volatility
  volatility_index DECIMAL(10,4), -- Standard deviation of price changes

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_market_snapshots_timestamp (snapshot_timestamp DESC)
);

-- Sector performance (by category)
CREATE TABLE sector_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sector details
  sector_type VARCHAR(50) NOT NULL, -- 'weapon_type', 'rarity', 'collection'
  sector_name VARCHAR(255) NOT NULL, -- 'Rifles', 'Covert', 'Dust 2'

  -- Timeframe
  timeframe VARCHAR(20) NOT NULL, -- '1h', '24h', '7d', '30d', '1y'
  start_timestamp TIMESTAMPTZ NOT NULL,
  end_timestamp TIMESTAMPTZ NOT NULL,

  -- Performance metrics
  total_value DECIMAL(18,2),
  price_change_percent DECIMAL(10,4),
  volume_24h DECIMAL(18,2),
  num_items INTEGER,
  num_transactions INTEGER,

  -- Trend indicators
  trend_direction VARCHAR(20), -- 'up', 'down', 'sideways'
  momentum_score DECIMAL(10,4), -- -100 to +100

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_sector_performance_sector (sector_type, sector_name, timeframe),
  INDEX idx_sector_performance_timestamp (end_timestamp DESC)
);

-- Whale transactions
CREATE TABLE whale_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Transaction details
  item_name VARCHAR(500) NOT NULL,
  transaction_amount DECIMAL(18,2) NOT NULL,
  transaction_type VARCHAR(50), -- 'buy', 'sell', 'transfer'
  platform VARCHAR(100), -- 'Steam Market', 'Buff163', etc.

  -- Whale details (anonymized)
  whale_id VARCHAR(100), -- Hashed identifier
  whale_tier VARCHAR(50), -- 'whale' (>50k), 'mega_whale' (>500k)

  -- Market impact
  price_before DECIMAL(12,2),
  price_after DECIMAL(12,2),
  price_impact_percent DECIMAL(10,4),

  transaction_timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_whale_transactions_timestamp (transaction_timestamp DESC),
  INDEX idx_whale_transactions_whale_id (whale_id)
);

-- Trend signals (breakouts, anomalies)
CREATE TABLE trend_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Item details
  item_name VARCHAR(500) NOT NULL,
  market_hash_name VARCHAR(255) NOT NULL,

  -- Signal details
  signal_type VARCHAR(50) NOT NULL, -- 'breakout', 'breakdown', 'volume_spike', 'whale_accumulation'
  signal_strength DECIMAL(5,2), -- 0-100
  confidence DECIMAL(5,2), -- 0-100

  -- Context
  current_price DECIMAL(12,2),
  price_change_24h DECIMAL(10,4),
  volume_change_24h DECIMAL(10,4),
  description TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,
  triggered_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_trend_signals_item (market_hash_name, is_active),
  INDEX idx_trend_signals_type (signal_type, triggered_at DESC)
);

-- Social sentiment data
CREATE TABLE social_sentiment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source
  source VARCHAR(50) NOT NULL, -- 'twitter', 'reddit', 'youtube', 'twitch'
  source_url TEXT,

  -- Content
  content TEXT,
  keywords VARCHAR(255)[], -- Extracted keywords

  -- Sentiment
  sentiment_score DECIMAL(5,2), -- -1 to +1
  sentiment_label VARCHAR(20), -- 'positive', 'neutral', 'negative'

  -- Engagement
  likes_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,

  posted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_social_sentiment_posted_at (posted_at DESC),
  INDEX idx_social_sentiment_keywords (keywords USING GIN)
);
```

### Services

#### `src/services/MarketIntelligenceService.ts`

```typescript
import { db } from '@/lib/db';

export class MarketIntelligenceService {
  /**
   * Calculate and store hourly market snapshot
   */
  async createMarketSnapshot(): Promise<void> {
    // Calculate total market cap (sum of all median prices × volume)
    const marketCap = await this.calculateMarketCap();

    // Calculate 24h volume
    const volume24h = await this.calculate24HourVolume();

    // Count active listings
    const activeListings = await db.market_items.count({
      where: { is_active: true },
    });

    // Calculate average time to sell
    const avgTimeToSell = await this.calculateAvgTimeToSell();

    // Calculate sentiment score
    const sentimentScore = await this.calculateSentimentScore();
    const sentimentLabel = this.getSentimentLabel(sentimentScore);

    // Calculate volatility index
    const volatilityIndex = await this.calculateVolatilityIndex();

    // Store snapshot
    await db.market_snapshots.create({
      data: {
        snapshot_timestamp: new Date(),
        total_market_cap: marketCap,
        total_volume_24h: volume24h,
        active_listings: activeListings,
        avg_time_to_sell_hours: avgTimeToSell,
        sentiment_score: sentimentScore,
        sentiment_label: sentimentLabel,
        volatility_index: volatilityIndex,
      },
    });
  }

  /**
   * Calculate total market capitalization
   */
  private async calculateMarketCap(): Promise<number> {
    const items = await db.market_items.findMany({
      select: { median_price: true, volume_24h: true },
    });

    const totalValue = items.reduce((sum, item) => {
      return sum + (item.median_price || 0) * (item.volume_24h || 0);
    }, 0);

    return totalValue;
  }

  /**
   * Calculate 24-hour trading volume
   */
  private async calculate24HourVolume(): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await db.price_history.aggregate({
      where: { timestamp: { gte: cutoff } },
      _sum: { volume: true },
    });

    return result._sum.volume || 0;
  }

  /**
   * Calculate average time to sell
   */
  private async calculateAvgTimeToSell(): Promise<number> {
    // Query recent sales and calculate average time on market
    // This is simplified - real implementation would track listing→sale time
    return 48.5; // Placeholder: 48.5 hours average
  }

  /**
   * Calculate market sentiment score
   */
  private async calculateSentimentScore(): Promise<number> {
    // Combine multiple factors:
    // 1. Price momentum (% of items with positive 24h change)
    // 2. Volume trend (increasing vs decreasing)
    // 3. Social sentiment (from social_sentiment table)

    const priceChange = await this.getPriceMomentum();
    const volumeTrend = await this.getVolumeTrend();
    const socialSentiment = await this.getSocialSentiment();

    // Weighted average
    const score = priceChange * 0.4 + volumeTrend * 0.3 + socialSentiment * 0.3;

    return Math.max(-100, Math.min(100, score)); // Clamp to -100 to +100
  }

  /**
   * Get price momentum (% items with positive change)
   */
  private async getPriceMomentum(): Promise<number> {
    const items = await db.market_items.findMany({
      select: { price_change_24h: true },
    });

    const positiveCount = items.filter((item) => (item.price_change_24h || 0) > 0).length;
    const total = items.length;

    // Map to -100 to +100 range
    return ((positiveCount / total) - 0.5) * 200;
  }

  /**
   * Get volume trend
   */
  private async getVolumeTrend(): Promise<number> {
    // Compare current 24h volume to previous 24h volume
    const current = await this.calculate24HourVolume();
    const previous = await this.calculate24HourVolumeOffset(24); // 24-48 hours ago

    const change = ((current - previous) / previous) * 100;

    // Map to -100 to +100 range
    return Math.max(-100, Math.min(100, change));
  }

  /**
   * Calculate 24-hour volume with offset
   */
  private async calculate24HourVolumeOffset(hoursOffset: number): Promise<number> {
    const startTime = new Date(Date.now() - (hoursOffset + 24) * 60 * 60 * 1000);
    const endTime = new Date(Date.now() - hoursOffset * 60 * 60 * 1000);

    const result = await db.price_history.aggregate({
      where: {
        timestamp: { gte: startTime, lt: endTime },
      },
      _sum: { volume: true },
    });

    return result._sum.volume || 0;
  }

  /**
   * Get social sentiment
   */
  private async getSocialSentiment(): Promise<number> {
    const recentSentiment = await db.social_sentiment.findMany({
      where: {
        posted_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: { sentiment_score: true },
    });

    if (recentSentiment.length === 0) return 0;

    const avgSentiment = recentSentiment.reduce((sum, s) => sum + (s.sentiment_score || 0), 0) / recentSentiment.length;

    // Map -1 to +1 range to -100 to +100
    return avgSentiment * 100;
  }

  /**
   * Get sentiment label from score
   */
  private getSentimentLabel(score: number): string {
    if (score >= 50) return 'very_bullish';
    if (score >= 20) return 'bullish';
    if (score >= -20) return 'neutral';
    if (score >= -50) return 'bearish';
    return 'very_bearish';
  }

  /**
   * Calculate volatility index
   */
  private async calculateVolatilityIndex(): Promise<number> {
    // Calculate standard deviation of price changes
    const items = await db.market_items.findMany({
      select: { price_change_24h: true },
    });

    const changes = items.map((item) => item.price_change_24h || 0);
    const mean = changes.reduce((sum, val) => sum + val, 0) / changes.length;
    const variance = changes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / changes.length;
    const stdDev = Math.sqrt(variance);

    return stdDev;
  }

  /**
   * Get sector performance
   */
  async getSectorPerformance(sectorType: string, timeframe: string = '24h'): Promise<any[]> {
    return await db.sector_performance.findMany({
      where: {
        sector_type: sectorType,
        timeframe,
      },
      orderBy: { price_change_percent: 'desc' },
    });
  }

  /**
   * Detect trend signals
   */
  async detectTrendSignals(): Promise<void> {
    // Breakout detection: Price crosses 30-day high with volume spike
    await this.detectBreakouts();

    // Volume spike detection: 3x average volume
    await this.detectVolumeSpikes();

    // Whale accumulation: Large buy orders
    await this.detectWhaleAccumulation();
  }

  /**
   * Detect price breakouts
   */
  private async detectBreakouts(): Promise<void> {
    const items = await db.market_items.findMany({
      where: { is_active: true },
    });

    for (const item of items) {
      const priceHistory = await db.price_history.findMany({
        where: {
          market_hash_name: item.market_hash_name,
          timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { timestamp: 'desc' },
      });

      if (priceHistory.length < 30) continue;

      const currentPrice = item.median_price || 0;
      const thirtyDayHigh = Math.max(...priceHistory.map((p) => p.price));

      // Breakout: Current price > 30-day high AND volume > 2x average
      if (currentPrice > thirtyDayHigh * 1.02) {
        const avgVolume = priceHistory.reduce((sum, p) => sum + (p.volume || 0), 0) / priceHistory.length;
        const currentVolume = item.volume_24h || 0;

        if (currentVolume > avgVolume * 2) {
          await db.trend_signals.create({
            data: {
              item_name: item.name,
              market_hash_name: item.market_hash_name,
              signal_type: 'breakout',
              signal_strength: 80,
              confidence: 75,
              current_price: currentPrice,
              price_change_24h: item.price_change_24h || 0,
              volume_change_24h: ((currentVolume - avgVolume) / avgVolume) * 100,
              description: `Price broke above 30-day high with 2x volume`,
              triggered_at: new Date(),
            },
          });
        }
      }
    }
  }

  /**
   * Detect volume spikes
   */
  private async detectVolumeSpikes(): Promise<void> {
    // Implementation similar to detectBreakouts
  }

  /**
   * Detect whale accumulation
   */
  private async detectWhaleAccumulation(): Promise<void> {
    // Query whale_transactions for recent large buy orders
    const whaleActivity = await db.whale_transactions.groupBy({
      by: ['item_name'],
      where: {
        transaction_timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        transaction_type: 'buy',
      },
      _count: { id: true },
      _sum: { transaction_amount: true },
    });

    for (const activity of whaleActivity) {
      if ((activity._count.id || 0) >= 3) {
        // 3+ whale buys in 7 days
        await db.trend_signals.create({
          data: {
            item_name: activity.item_name,
            market_hash_name: activity.item_name,
            signal_type: 'whale_accumulation',
            signal_strength: 70,
            confidence: 60,
            description: `${activity._count.id} whale purchases totaling $${activity._sum.transaction_amount} in 7 days`,
            triggered_at: new Date(),
          },
        });
      }
    }
  }

  /**
   * Get market overview
   */
  async getMarketOverview(): Promise<any> {
    const latestSnapshot = await db.market_snapshots.findFirst({
      orderBy: { snapshot_timestamp: 'desc' },
    });

    const previousSnapshot = await db.market_snapshots.findFirst({
      where: {
        snapshot_timestamp: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { snapshot_timestamp: 'desc' },
    });

    return {
      current: latestSnapshot,
      change_24h: {
        market_cap: this.calculateChange(latestSnapshot?.total_market_cap, previousSnapshot?.total_market_cap),
        volume: this.calculateChange(latestSnapshot?.total_volume_24h, previousSnapshot?.total_volume_24h),
        sentiment: (latestSnapshot?.sentiment_score || 0) - (previousSnapshot?.sentiment_score || 0),
      },
    };
  }

  /**
   * Calculate percentage change
   */
  private calculateChange(current?: number, previous?: number): number {
    if (!current || !previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }
}

export const marketIntelligenceService = new MarketIntelligenceService();
```

### API Routes

#### `src/app/api/intelligence/overview/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { marketIntelligenceService } from '@/services/MarketIntelligenceService';

// GET /api/intelligence/overview - Market overview
export async function GET(req: NextRequest) {
  try {
    const overview = await marketIntelligenceService.getMarketOverview();
    return NextResponse.json({ data: overview });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### `src/app/api/intelligence/sectors/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { marketIntelligenceService } from '@/services/MarketIntelligenceService';

// GET /api/intelligence/sectors - Sector performance
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sectorType = searchParams.get('type') || 'weapon_type';
    const timeframe = searchParams.get('timeframe') || '24h';

    const sectors = await marketIntelligenceService.getSectorPerformance(sectorType, timeframe);

    return NextResponse.json({ data: sectors });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Frontend Components

#### `src/app/intelligence/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';

export default function IntelligenceDashboardPage() {
  const [overview, setOverview] = useState<any>(null);
  const [sectors, setSectors] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [overviewRes, sectorsRes, signalsRes] = await Promise.all([
      fetch('/api/intelligence/overview'),
      fetch('/api/intelligence/sectors?type=weapon_type&timeframe=24h'),
      fetch('/api/intelligence/signals?limit=10'),
    ]);

    const overviewData = await overviewRes.json();
    const sectorsData = await sectorsRes.json();
    const signalsData = await signalsRes.json();

    setOverview(overviewData.data);
    setSectors(sectorsData.data || []);
    setSignals(signalsData.data || []);
    setLoading(false);
  };

  if (loading) return <div>Loading market intelligence...</div>;

  const sentimentColor = (score: number) => {
    if (score >= 50) return 'bg-green-500';
    if (score >= 20) return 'bg-green-300';
    if (score >= -20) return 'bg-gray-300';
    if (score >= -50) return 'bg-red-300';
    return 'bg-red-500';
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Market Intelligence Dashboard</h1>

      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Market Cap</div>
          <div className="text-2xl font-bold">${(overview.current.total_market_cap / 1000000).toFixed(2)}M</div>
          <div className={`text-sm ${overview.change_24h.market_cap >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {overview.change_24h.market_cap >= 0 ? '+' : ''}
            {overview.change_24h.market_cap.toFixed(2)}% (24h)
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">24h Volume</div>
          <div className="text-2xl font-bold">${(overview.current.total_volume_24h / 1000000).toFixed(2)}M</div>
          <div className={`text-sm ${overview.change_24h.volume >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {overview.change_24h.volume >= 0 ? '+' : ''}
            {overview.change_24h.volume.toFixed(2)}% (24h)
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Market Sentiment</div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${sentimentColor(overview.current.sentiment_score)}`}></div>
            <div className="text-2xl font-bold">{overview.current.sentiment_label.replace('_', ' ')}</div>
          </div>
          <div className="text-sm text-gray-600">{overview.current.sentiment_score.toFixed(0)} / 100</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">Volatility Index</div>
          <div className="text-2xl font-bold">{overview.current.volatility_index.toFixed(2)}%</div>
          <div className="text-sm text-gray-600">Standard Deviation</div>
        </div>
      </div>

      {/* Sector Performance */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Sector Performance (24h)</h2>
        <div className="space-y-2">
          {sectors.map((sector) => (
            <div key={sector.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="font-medium">{sector.sector_name}</div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">${(sector.total_value / 1000000).toFixed(2)}M</div>
                <div className={`font-semibold ${sector.price_change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {sector.price_change_percent >= 0 ? '+' : ''}
                  {sector.price_change_percent.toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trend Signals */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Active Trend Signals</h2>
        <div className="space-y-3">
          {signals.map((signal) => (
            <div key={signal.id} className="border-l-4 border-blue-500 pl-4 py-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold">{signal.item_name}</div>
                  <div className="text-sm text-gray-600">{signal.description}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Signal: {signal.signal_type} | Strength: {signal.signal_strength}/100 | Confidence: {signal.confidence}%
                  </div>
                </div>
                <div className="text-sm text-gray-500">{new Date(signal.triggered_at).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## Success Metrics
1. **User Engagement**: 30%+ of professional traders use intelligence dashboard daily
2. **Data Accuracy**: 95%+ accuracy in trend signal predictions
3. **Premium Subscriptions**: 1,000+ users subscribe to premium intelligence features
4. **API Usage**: 500+ third-party integrations consuming intelligence data
5. **Industry Recognition**: Cited as authoritative source by 5+ major CS2 trading communities

## Dependencies
- **Feature 03**: Price Tracking (price data source)
- **Feature 31**: Public API (data export)
- **Feature 14**: Bulk Transaction History (whale transaction data)

## Effort Estimate
- **Database Schema**: 6 hours
- **MarketIntelligenceService**: 24 hours
- **Snapshot Cron Job**: 8 hours
- **Sector Performance Calculation**: 12 hours
- **Trend Signal Detection**: 16 hours
- **Sentiment Analysis**: 12 hours
- **API Routes**: 8 hours
- **Dashboard UI**: 24 hours
- **Charts & Visualizations**: 16 hours
- **Testing**: 12 hours
- **Documentation**: 8 hours
- **Total**: ~146 hours (3.65 weeks)

## Implementation Notes
1. **Real-Time Updates**: Use WebSocket or polling for live dashboard updates
2. **Data Aggregation**: Run hourly cron job to calculate market snapshots
3. **Caching**: Cache sector performance calculations (refresh hourly)
4. **Historical Data**: Store snapshots for trend analysis (retain 2 years)
5. **Premium Feature**: Gate advanced analytics behind paid subscription

## Gotchas
1. **Data Volume**: Market snapshots generate significant data (optimize queries)
2. **Calculation Performance**: Sector calculations can be slow (use materialized views)
3. **Signal Noise**: Trend detection may produce false positives (tune thresholds)
4. **Sentiment Accuracy**: Social sentiment analysis requires NLP fine-tuning
5. **Whale Privacy**: Anonymize whale identifiers to protect privacy

## Status Checklist
- [ ] Database schema created and migrated
- [ ] MarketIntelligenceService implemented
- [ ] Hourly snapshot cron job configured
- [ ] Sector performance calculation working
- [ ] Trend signal detection functional
- [ ] Sentiment analysis integrated
- [ ] API routes created
- [ ] Dashboard UI built
- [ ] Charts and visualizations implemented
- [ ] Real-time updates working (WebSocket/polling)
- [ ] Premium feature gating implemented
- [ ] Unit tests written (95% coverage)
- [ ] Performance testing completed (handle hourly snapshots)
- [ ] Documentation completed

## Related Features
- **Feature 03**: Price Tracking (data source)
- **Feature 31**: Public API (intelligence export)
- **Feature 14**: Bulk Transaction History (whale data)
- **Feature 35**: Predictive Analytics (consumes intelligence data)

## References
- [TradingView](https://www.tradingview.com/) (technical analysis gold standard)
- [CoinMarketCap](https://coinmarketcap.com/) (crypto market intelligence)
- [Market Sentiment Analysis](https://en.wikipedia.org/wiki/Market_sentiment)
- [Technical Indicators (RSI, MACD)](https://www.investopedia.com/terms/t/technicalindicator.asp)
