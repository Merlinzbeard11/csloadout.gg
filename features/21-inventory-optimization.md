# Feature 21: Inventory Optimization

## Overview
AI-powered inventory optimization recommendations that help bulk traders maximize profit by identifying underperforming items to sell, high-potential items to acquire, and optimal pricing strategies. Analyzes market trends, holding costs, liquidity, and opportunity costs to provide actionable insights.

## User Segments
- **Primary**: Bulk Traders, Market Makers, Investors
- **Secondary**: Wholesalers, Hobbyists
- **Tertiary**: Casual Traders

## User Stories

### As a Bulk Trader
- I want to see which items in my inventory are losing value so I can sell them before further depreciation
- I want to identify items with low liquidity that are tying up capital
- I want to know my optimal inventory mix (% in high-liquidity vs long-term holds)
- I want to see opportunity cost analysis (what I could earn if I sold item X and bought item Y)
- I want alerts when my inventory composition becomes suboptimal (e.g., too much capital in illiquid items)

### As a Market Maker
- I want to see turnover velocity for each item category (how fast items sell)
- I want to identify items with high carrying costs (storage slots, capital tied up)
- I want to know when to rotate inventory (sell stagnant items, buy trending items)
- I want to see profit per day held for each item (not just total profit)

### As an Investor
- I want to see risk-adjusted returns for my inventory
- I want diversification recommendations (not too concentrated in one skin type)
- I want to know when to rebalance my portfolio
- I want to see tax-loss harvesting opportunities (sell items at a loss to offset gains)

### As the Platform
- I want to help users make more profitable decisions (increases transaction volume)
- I want to identify common mistakes users make (holding too long, poor diversification)
- I want to provide data-driven insights that differentiate csloadout.gg from competitors

## Research & Context

### Inventory Optimization Concepts

1. **Inventory Turnover Ratio**
   - Formula: `Cost of Goods Sold / Average Inventory Value`
   - Higher ratio = better (inventory moves faster)
   - CS2 skins: Aim for 4+ (sell each item within ~90 days)

2. **Holding Costs**
   - Capital Cost: Money tied up that could be invested elsewhere
   - Opportunity Cost: Missing better investment opportunities
   - Storage Cost: Steam account slot limits (1,000 items max)
   - Depreciation: Item loses value while held

3. **ABC Analysis**
   - A items: 20% of items, 80% of value (focus here)
   - B items: 30% of items, 15% of value (moderate attention)
   - C items: 50% of items, 5% of value (liquidate or ignore)

4. **Pareto Principle (80/20 Rule)**
   - 80% of profits come from 20% of items
   - Identify and focus on high-performers

5. **Risk-Adjusted Returns (Sharpe Ratio)**
   - Formula: `(Return - Risk-Free Rate) / Standard Deviation of Returns`
   - Higher is better (more return per unit of risk)

### Industry Benchmarks
- **Stock Trading**: Portfolio rebalancing every quarter
- **E-commerce**: Inventory turnover 4-6x per year
- **Real Estate**: Hold 5-10 years for appreciation
- **CS2 Skins**: Varies widely (stickers 1-2 years, knives 1-6 months)

### Competitor Gap
- **CSFloat, Skinport, DMarket**: No inventory optimization features
- **Steam**: No analytics at all
- **Opportunity**: First mover advantage in AI-powered CS2 inventory optimization

## Technical Requirements

### Database Schema

```sql
-- Inventory optimization recommendations
CREATE TABLE inventory_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Recommendation metadata
  recommendation_type VARCHAR(50) NOT NULL, -- 'sell', 'hold', 'buy_more', 'diversify', 'rebalance'
  priority VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low'
  confidence_score DECIMAL(3,2) NOT NULL, -- 0.00 to 1.00

  -- Affected items
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE, -- NULL if portfolio-wide
  item_name VARCHAR(255),

  -- Recommendation details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reasoning JSONB NOT NULL, -- Detailed breakdown of why this recommendation

  -- Expected impact
  potential_profit DECIMAL(10,2), -- Expected profit if recommendation followed
  potential_loss DECIMAL(10,2), -- Expected loss if ignored
  time_sensitivity_days INTEGER, -- How urgent (e.g., 7 days before major price drop)

  -- Action tracking
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired'
  user_action VARCHAR(50), -- 'sold', 'bought', 'ignored', 'snoozed'
  action_taken_at TIMESTAMPTZ,

  -- Outcome tracking (for learning)
  actual_outcome VARCHAR(255), -- What actually happened
  actual_profit DECIMAL(10,2), -- Actual profit/loss after action

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Recommendation expires if not acted upon

  INDEX idx_inventory_recommendations_user_id (user_id),
  INDEX idx_inventory_recommendations_status (status),
  INDEX idx_inventory_recommendations_priority (priority),
  INDEX idx_inventory_recommendations_created_at (created_at DESC)
);

-- Portfolio health metrics (historical snapshots)
CREATE TABLE portfolio_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,

  -- Overall health score (0-100)
  health_score INTEGER NOT NULL,

  -- Component scores
  liquidity_score INTEGER NOT NULL, -- How quickly portfolio can be liquidated
  diversification_score INTEGER NOT NULL, -- How well diversified
  performance_score INTEGER NOT NULL, -- Returns vs benchmarks
  risk_score INTEGER NOT NULL, -- Risk level (inverse - lower is riskier)

  -- Key metrics
  total_value DECIMAL(12,2) NOT NULL,
  avg_item_age_days INTEGER,
  inventory_turnover_ratio DECIMAL(5,2),

  -- Risk metrics
  concentration_risk DECIMAL(5,2), -- % of portfolio in single item type
  illiquidity_risk DECIMAL(5,2), -- % of portfolio in low-volume items

  -- Performance metrics
  roi_30d DECIMAL(5,2),
  roi_90d DECIMAL(5,2),
  sharpe_ratio DECIMAL(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, snapshot_date)
);

-- Inventory optimization rules (user-configurable)
CREATE TABLE optimization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Rule configuration
  rule_type VARCHAR(50) NOT NULL, -- 'auto_sell', 'auto_buy', 'alert_only'

  -- Trigger conditions
  trigger_condition JSONB NOT NULL, -- e.g., { "item_age_days": 90, "roi_threshold": -10 }

  -- Actions
  action_config JSONB NOT NULL, -- e.g., { "list_price_multiplier": 0.95, "platforms": ["steam", "csfloat"] }

  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Opportunity cost tracking (what-if scenarios)
CREATE TABLE opportunity_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Scenario
  scenario_name VARCHAR(255) NOT NULL,
  current_item_id UUID REFERENCES inventory_items(id),
  alternative_item_id VARCHAR(255), -- market_hash_name of alternative

  -- Cost analysis
  current_holding_cost DECIMAL(10,2),
  alternative_potential_gain DECIMAL(10,2),
  opportunity_cost DECIMAL(10,2), -- Difference

  -- Timeframe
  analysis_date DATE NOT NULL,
  holding_period_days INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_portfolio_health_user_date ON portfolio_health_snapshots(user_id, snapshot_date DESC);
CREATE INDEX idx_optimization_rules_user_enabled ON optimization_rules(user_id, is_enabled);
```

### Services

#### `src/services/InventoryOptimizationService.ts`

```typescript
import { db } from '@/lib/db';
import { addDays, differenceInDays } from 'date-fns';

interface OptimizationRecommendation {
  type: 'sell' | 'hold' | 'buy_more' | 'diversify' | 'rebalance';
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidenceScore: number;
  inventoryItemId?: string;
  itemName?: string;
  title: string;
  description: string;
  reasoning: any;
  potentialProfit?: number;
  potentialLoss?: number;
  timeSensitivityDays?: number;
}

interface PortfolioHealth {
  healthScore: number; // 0-100
  liquidityScore: number;
  diversificationScore: number;
  performanceScore: number;
  riskScore: number;
  recommendations: OptimizationRecommendation[];
}

export class InventoryOptimizationService {
  /**
   * Generate comprehensive portfolio optimization recommendations
   */
  async generateRecommendations(userId: string): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Get user's inventory
    const inventory = await db.inventory_items.findMany({
      where: { user_id: userId },
      include: { price_history: true },
    });

    if (inventory.length === 0) {
      return [];
    }

    // Recommendation 1: Identify depreciating assets
    const depreciatingItems = await this.findDepreciatingAssets(inventory);
    recommendations.push(...depreciatingItems);

    // Recommendation 2: Identify illiquid items
    const illiquidItems = await this.findIlliquidAssets(inventory);
    recommendations.push(...illiquidItems);

    // Recommendation 3: Portfolio diversification
    const diversificationRecs = await this.analyzeDiversification(inventory);
    recommendations.push(...diversificationRecs);

    // Recommendation 4: Opportunity cost analysis
    const opportunityRecs = await this.analyzeOpportunityCosts(userId, inventory);
    recommendations.push(...opportunityRecs);

    // Recommendation 5: Tax-loss harvesting
    const taxRecs = await this.findTaxLossHarvestingOpportunities(userId, inventory);
    recommendations.push(...taxRecs);

    // Save recommendations to database
    await this.saveRecommendations(userId, recommendations);

    return recommendations;
  }

  /**
   * Find items that are losing value
   */
  private async findDepreciatingAssets(inventory: any[]): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    for (const item of inventory) {
      // Calculate price change over last 30 days
      const priceHistory = item.price_history || [];
      if (priceHistory.length < 2) continue;

      const currentPrice = item.current_value || 0;
      const price30DaysAgo = priceHistory.find((p: any) => {
        const daysDiff = differenceInDays(new Date(), new Date(p.date));
        return daysDiff >= 28 && daysDiff <= 32;
      })?.price || currentPrice;

      const priceChange = ((currentPrice - price30DaysAgo) / price30DaysAgo) * 100;

      // If item lost >10% value in 30 days, recommend selling
      if (priceChange < -10) {
        const holdingPeriod = item.purchase_date
          ? differenceInDays(new Date(), new Date(item.purchase_date))
          : 0;

        recommendations.push({
          type: 'sell',
          priority: priceChange < -20 ? 'critical' : 'high',
          confidenceScore: 0.85,
          inventoryItemId: item.id,
          itemName: item.item_name,
          title: `Sell ${item.item_name} - Depreciating Asset`,
          description: `This item has lost ${Math.abs(priceChange).toFixed(1)}% of its value in the last 30 days. Consider selling before further depreciation.`,
          reasoning: {
            priceChange30d: priceChange,
            currentPrice,
            price30DaysAgo,
            holdingPeriod,
            trend: 'declining',
          },
          potentialLoss: Math.abs((currentPrice * priceChange) / 100),
          timeSensitivityDays: 7, // Urgent - sell within a week
        });
      }
    }

    return recommendations;
  }

  /**
   * Find items with low liquidity (hard to sell)
   */
  private async findIlliquidAssets(inventory: any[]): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    for (const item of inventory) {
      // Get market data for this item
      const marketData = await db.market_items.findFirst({
        where: { market_hash_name: item.market_hash_name },
      });

      if (!marketData) continue;

      const dailyVolume = marketData.volume_24h || 0;
      const itemValue = item.current_value || 0;

      // If daily volume is low relative to item value, it's illiquid
      // Rule: If item value > 10x daily volume, it's illiquid
      const liquidityRatio = dailyVolume > 0 ? itemValue / dailyVolume : Infinity;

      if (liquidityRatio > 10 && itemValue > 100) {
        const holdingPeriod = item.purchase_date
          ? differenceInDays(new Date(), new Date(item.purchase_date))
          : 0;

        recommendations.push({
          type: 'sell',
          priority: holdingPeriod > 180 ? 'high' : 'medium',
          confidenceScore: 0.75,
          inventoryItemId: item.id,
          itemName: item.item_name,
          title: `Sell ${item.item_name} - Low Liquidity`,
          description: `This item has low market liquidity (daily volume: $${dailyVolume.toFixed(2)}). It may be difficult to sell quickly. Consider liquidating to free up capital.`,
          reasoning: {
            dailyVolume,
            itemValue,
            liquidityRatio,
            holdingPeriod,
            risk: 'liquidity_risk',
          },
          potentialProfit: itemValue * 0.05, // Assume 5% opportunity cost
          timeSensitivityDays: 30,
        });
      }
    }

    return recommendations;
  }

  /**
   * Analyze portfolio diversification
   */
  private async analyzeDiversification(inventory: any[]): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Group items by type
    const itemsByType: Record<string, number> = {};
    let totalValue = 0;

    inventory.forEach((item) => {
      const itemType = this.categorizeItem(item.item_name);
      const itemValue = item.current_value || 0;
      itemsByType[itemType] = (itemsByType[itemType] || 0) + itemValue;
      totalValue += itemValue;
    });

    // Check for concentration risk (>50% in one type)
    for (const [itemType, value] of Object.entries(itemsByType)) {
      const concentration = (value / totalValue) * 100;

      if (concentration > 50) {
        recommendations.push({
          type: 'diversify',
          priority: concentration > 70 ? 'high' : 'medium',
          confidenceScore: 0.80,
          title: `Diversify Portfolio - High Concentration in ${itemType}`,
          description: `${concentration.toFixed(1)}% of your portfolio is in ${itemType}. Consider diversifying to reduce risk.`,
          reasoning: {
            itemType,
            concentration,
            totalValue,
            risk: 'concentration_risk',
          },
          potentialLoss: value * 0.20, // Assume 20% risk if that category crashes
          timeSensitivityDays: 60,
        });
      }
    }

    return recommendations;
  }

  /**
   * Analyze opportunity costs (better investment alternatives)
   */
  private async analyzeOpportunityCosts(userId: string, inventory: any[]): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // For each item held for >90 days with <5% ROI, find better alternatives
    for (const item of inventory) {
      if (!item.purchase_date) continue;

      const holdingPeriod = differenceInDays(new Date(), new Date(item.purchase_date));
      if (holdingPeriod < 90) continue;

      const costBasis = await db.cost_basis_ledger.findFirst({
        where: { inventory_item_id: item.id },
      });

      if (!costBasis) continue;

      const currentValue = item.current_value || 0;
      const purchasePrice = costBasis.purchase_price;
      const roi = ((currentValue - purchasePrice) / purchasePrice) * 100;
      const annualizedRoi = (roi / holdingPeriod) * 365;

      // If item has <5% annualized ROI, find better alternatives
      if (annualizedRoi < 5) {
        // Find trending items with higher growth potential
        const trendingItems = await db.market_items.findMany({
          where: {
            price_change_percentage_7d: { gte: 10 }, // 10%+ growth in last week
            volume_24h: { gte: 1000 }, // Good liquidity
          },
          orderBy: { price_change_percentage_7d: 'desc' },
          take: 5,
        });

        if (trendingItems.length > 0) {
          const bestAlternative = trendingItems[0];
          const opportunityCost = (bestAlternative.price_change_percentage_7d - annualizedRoi) * (currentValue / 100);

          recommendations.push({
            type: 'sell',
            priority: 'medium',
            confidenceScore: 0.70,
            inventoryItemId: item.id,
            itemName: item.item_name,
            title: `Sell ${item.item_name} - Better Opportunities Available`,
            description: `Your item has ${annualizedRoi.toFixed(1)}% annualized ROI. Consider selling and buying ${bestAlternative.market_hash_name} (${bestAlternative.price_change_percentage_7d.toFixed(1)}% growth).`,
            reasoning: {
              currentRoi: annualizedRoi,
              alternativeRoi: bestAlternative.price_change_percentage_7d,
              opportunityCost,
              alternativeItem: bestAlternative.market_hash_name,
            },
            potentialProfit: opportunityCost,
            timeSensitivityDays: 14,
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Find tax-loss harvesting opportunities
   */
  private async findTaxLossHarvestingOpportunities(userId: string, inventory: any[]): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Only run in Q4 (October-December) for tax purposes
    const currentMonth = new Date().getMonth();
    if (currentMonth < 9) return []; // Not Q4

    for (const item of inventory) {
      const costBasis = await db.cost_basis_ledger.findFirst({
        where: { inventory_item_id: item.id },
      });

      if (!costBasis) continue;

      const currentValue = item.current_value || 0;
      const purchasePrice = costBasis.purchase_price;
      const unrealizedLoss = currentValue - purchasePrice;

      // If item has unrealized loss >$100, recommend tax-loss harvesting
      if (unrealizedLoss < -100) {
        recommendations.push({
          type: 'sell',
          priority: 'medium',
          confidenceScore: 0.90,
          inventoryItemId: item.id,
          itemName: item.item_name,
          title: `Tax-Loss Harvesting: Sell ${item.item_name}`,
          description: `Sell this item to realize a $${Math.abs(unrealizedLoss).toFixed(2)} loss, which can offset capital gains for tax purposes.`,
          reasoning: {
            unrealizedLoss,
            purchasePrice,
            currentValue,
            strategy: 'tax_loss_harvesting',
          },
          potentialProfit: Math.abs(unrealizedLoss) * 0.25, // Assume 25% tax benefit
          timeSensitivityDays: 90, // Before end of tax year
        });
      }
    }

    return recommendations;
  }

  /**
   * Save recommendations to database
   */
  private async saveRecommendations(userId: string, recommendations: OptimizationRecommendation[]): Promise<void> {
    for (const rec of recommendations) {
      await db.inventory_recommendations.create({
        data: {
          user_id: userId,
          recommendation_type: rec.type,
          priority: rec.priority,
          confidence_score: rec.confidenceScore,
          inventory_item_id: rec.inventoryItemId,
          item_name: rec.itemName,
          title: rec.title,
          description: rec.description,
          reasoning: rec.reasoning,
          potential_profit: rec.potentialProfit,
          potential_loss: rec.potentialLoss,
          time_sensitivity_days: rec.timeSensitivityDays,
          expires_at: rec.timeSensitivityDays
            ? addDays(new Date(), rec.timeSensitivityDays)
            : undefined,
        },
      });
    }
  }

  /**
   * Calculate overall portfolio health score
   */
  async calculatePortfolioHealth(userId: string): Promise<PortfolioHealth> {
    const inventory = await db.inventory_items.findMany({
      where: { user_id: userId },
    });

    // Calculate component scores
    const liquidityScore = await this.calculateLiquidityScore(inventory);
    const diversificationScore = await this.calculateDiversificationScore(inventory);
    const performanceScore = await this.calculatePerformanceScore(inventory);
    const riskScore = await this.calculateRiskScore(inventory);

    // Overall health score (weighted average)
    const healthScore = Math.round(
      liquidityScore * 0.25 +
      diversificationScore * 0.25 +
      performanceScore * 0.30 +
      riskScore * 0.20
    );

    // Generate recommendations
    const recommendations = await this.generateRecommendations(userId);

    // Save snapshot
    await db.portfolio_health_snapshots.create({
      data: {
        user_id: userId,
        snapshot_date: new Date(),
        health_score: healthScore,
        liquidity_score: liquidityScore,
        diversification_score: diversificationScore,
        performance_score: performanceScore,
        risk_score: riskScore,
        total_value: inventory.reduce((sum, item) => sum + (item.current_value || 0), 0),
      },
    });

    return {
      healthScore,
      liquidityScore,
      diversificationScore,
      performanceScore,
      riskScore,
      recommendations,
    };
  }

  /**
   * Calculate liquidity score (0-100)
   */
  private async calculateLiquidityScore(inventory: any[]): Promise<number> {
    if (inventory.length === 0) return 100;

    let totalValue = 0;
    let liquidValue = 0;

    for (const item of inventory) {
      const itemValue = item.current_value || 0;
      totalValue += itemValue;

      const marketData = await db.market_items.findFirst({
        where: { market_hash_name: item.market_hash_name },
      });

      const dailyVolume = marketData?.volume_24h || 0;

      // Item is liquid if daily volume > item value
      if (dailyVolume > itemValue) {
        liquidValue += itemValue;
      }
    }

    return Math.round((liquidValue / totalValue) * 100);
  }

  /**
   * Calculate diversification score (0-100)
   */
  private async calculateDiversificationScore(inventory: any[]): Promise<number> {
    if (inventory.length === 0) return 100;

    const itemsByType: Record<string, number> = {};
    let totalValue = 0;

    inventory.forEach((item) => {
      const itemType = this.categorizeItem(item.item_name);
      const itemValue = item.current_value || 0;
      itemsByType[itemType] = (itemsByType[itemType] || 0) + itemValue;
      totalValue += itemValue;
    });

    // Calculate Herfindahl-Hirschman Index (HHI) for concentration
    let hhi = 0;
    for (const value of Object.values(itemsByType)) {
      const marketShare = (value / totalValue) * 100;
      hhi += marketShare * marketShare;
    }

    // HHI ranges from 0 (perfect diversification) to 10,000 (monopoly)
    // Convert to 0-100 score (lower HHI = higher score)
    const score = Math.max(0, 100 - (hhi / 100));
    return Math.round(score);
  }

  /**
   * Calculate performance score (0-100)
   */
  private async calculatePerformanceScore(inventory: any[]): Promise<number> {
    if (inventory.length === 0) return 50;

    let totalRoi = 0;
    let itemCount = 0;

    for (const item of inventory) {
      const costBasis = await db.cost_basis_ledger.findFirst({
        where: { inventory_item_id: item.id },
      });

      if (!costBasis) continue;

      const currentValue = item.current_value || 0;
      const purchasePrice = costBasis.purchase_price;
      const roi = ((currentValue - purchasePrice) / purchasePrice) * 100;

      totalRoi += roi;
      itemCount++;
    }

    if (itemCount === 0) return 50;

    const avgRoi = totalRoi / itemCount;

    // Map ROI to score: -20% = 0, 0% = 50, 20% = 100
    const score = Math.max(0, Math.min(100, 50 + (avgRoi * 2.5)));
    return Math.round(score);
  }

  /**
   * Calculate risk score (0-100, higher = safer)
   */
  private async calculateRiskScore(inventory: any[]): Promise<number> {
    if (inventory.length === 0) return 100;

    // Risk factors:
    // 1. Concentration risk (score from diversification)
    // 2. Liquidity risk (score from liquidity)
    // 3. Volatility risk (price volatility)

    const diversificationScore = await this.calculateDiversificationScore(inventory);
    const liquidityScore = await this.calculateLiquidityScore(inventory);

    // Calculate volatility
    let totalVolatility = 0;
    let itemCount = 0;

    for (const item of inventory) {
      const priceHistory = item.price_history || [];
      if (priceHistory.length < 7) continue;

      const prices = priceHistory.slice(0, 30).map((p: any) => p.price);
      const avgPrice = prices.reduce((sum: number, p: number) => sum + p, 0) / prices.length;
      const variance = prices.reduce((sum: number, p: number) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
      const stdDev = Math.sqrt(variance);
      const volatility = (stdDev / avgPrice) * 100;

      totalVolatility += volatility;
      itemCount++;
    }

    const avgVolatility = itemCount > 0 ? totalVolatility / itemCount : 10;

    // Map volatility to score: 0% = 100, 50% = 0
    const volatilityScore = Math.max(0, 100 - (avgVolatility * 2));

    // Weighted average
    const riskScore = Math.round(
      diversificationScore * 0.4 +
      liquidityScore * 0.3 +
      volatilityScore * 0.3
    );

    return riskScore;
  }

  /**
   * Categorize item by type
   */
  private categorizeItem(itemName: string): string {
    if (itemName.includes('Knife') || itemName.includes('Karambit') || itemName.includes('Bayonet')) {
      return 'Knives';
    } else if (itemName.includes('Gloves')) {
      return 'Gloves';
    } else if (itemName.includes('Sticker')) {
      return 'Stickers';
    } else if (itemName.includes('Case')) {
      return 'Cases';
    } else if (itemName.includes('Key')) {
      return 'Keys';
    } else {
      return 'Skins';
    }
  }
}

export const inventoryOptimizationService = new InventoryOptimizationService();
```

### API Endpoints

#### `src/app/api/optimization/recommendations/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { inventoryOptimizationService } from '@/services/InventoryOptimizationService';

// GET /api/optimization/recommendations - Get optimization recommendations
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recommendations = await inventoryOptimizationService.generateRecommendations(session.user.id);
    return NextResponse.json({ recommendations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### `src/app/api/optimization/health/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { inventoryOptimizationService } from '@/services/InventoryOptimizationService';

// GET /api/optimization/health - Get portfolio health score
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const health = await inventoryOptimizationService.calculatePortfolioHealth(session.user.id);
    return NextResponse.json(health);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## Frontend Components

### `src/app/dashboard/optimization/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

export default function OptimizationPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    const res = await fetch('/api/optimization/health');
    const data = await res.json();
    setHealth(data);
    setLoading(false);
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Inventory Optimization</h1>

      {/* Health Score Card */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-lg p-8 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Portfolio Health Score</h2>
            <p className="text-blue-100">Overall assessment of your inventory's optimization</p>
          </div>
          <div className="text-center">
            <div className="text-6xl font-bold">{health.healthScore}</div>
            <div className="text-xl">/ 100</div>
          </div>
        </div>

        {/* Component Scores */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <ScoreCard label="Liquidity" score={health.liquidityScore} />
          <ScoreCard label="Diversification" score={health.diversificationScore} />
          <ScoreCard label="Performance" score={health.performanceScore} />
          <ScoreCard label="Risk" score={health.riskScore} />
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Recommendations ({health.recommendations.length})</h2>

        {health.recommendations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CheckCircleIcon className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium">Your portfolio is well optimized!</p>
            <p>No critical recommendations at this time.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {health.recommendations.map((rec: any, index: number) => (
              <RecommendationCard key={index} recommendation={rec} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  const getColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-white/10 rounded-lg p-4">
      <div className="text-sm mb-1">{label}</div>
      <div className={`text-3xl font-bold ${getColor(score)}`}>{score}</div>
    </div>
  );
}

function RecommendationCard({ recommendation }: { recommendation: any }) {
  const getPriorityColor = (priority: string) => {
    if (priority === 'critical') return 'border-red-500 bg-red-50';
    if (priority === 'high') return 'border-orange-500 bg-orange-50';
    if (priority === 'medium') return 'border-yellow-500 bg-yellow-50';
    return 'border-blue-500 bg-blue-50';
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'critical' || priority === 'high') {
      return <ExclamationTriangleIcon className="w-6 h-6" />;
    }
    return <InformationCircleIcon className="w-6 h-6" />;
  };

  return (
    <div className={`border-l-4 rounded-lg p-4 ${getPriorityColor(recommendation.priority)}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {getPriorityIcon(recommendation.priority)}
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">{recommendation.title}</h3>
            <p className="text-gray-700 mb-2">{recommendation.description}</p>

            <div className="flex gap-4 text-sm">
              {recommendation.potentialProfit && (
                <span className="text-green-600 font-medium">
                  Potential Profit: ${recommendation.potentialProfit.toFixed(2)}
                </span>
              )}
              {recommendation.potentialLoss && (
                <span className="text-red-600 font-medium">
                  Potential Loss: ${recommendation.potentialLoss.toFixed(2)}
                </span>
              )}
              {recommendation.timeSensitivityDays && (
                <span className="text-gray-600">
                  Act within {recommendation.timeSensitivityDays} days
                </span>
              )}
              <span className="text-gray-500">
                Confidence: {(recommendation.confidenceScore * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap">
          Take Action
        </button>
      </div>
    </div>
  );
}
```

## Success Metrics
1. **Adoption Rate**: 40%+ of bulk traders use optimization recommendations
2. **Action Rate**: 30%+ of recommendations result in user action (sell, buy, etc.)
3. **Accuracy**: 70%+ of recommendations result in positive outcomes
4. **Portfolio Performance**: Users who follow recommendations see 15%+ higher ROI
5. **Engagement**: Users return to optimization dashboard 2x per week
6. **Health Score Improvement**: Average health score increases by 10 points after 30 days

## Dependencies
- **Feature 15**: Portfolio Analytics (snapshot data, ROI tracking)
- **Feature 14**: Bulk Transaction History (cost basis, holding periods)
- **Feature 16**: Investment Insights (trending items, market analysis)
- **Feature 03**: Price Tracking System (market data, price history)

## Effort Estimate
- **Database Schema**: 5 hours
- **InventoryOptimizationService**: 20 hours
- **Recommendation Algorithms**: 12 hours
- **Portfolio Health Scoring**: 8 hours
- **API Endpoints**: 3 hours
- **Optimization Dashboard Page**: 10 hours
- **Testing & Tuning**: 10 hours
- **Total**: ~68 hours (1.7 weeks)

## Implementation Notes
1. **Cron Job**: Run optimization analysis daily for all users, email recommendations
2. **Machine Learning**: Track recommendation outcomes to improve algorithm over time
3. **Personalization**: Learn user risk tolerance and adjust recommendations accordingly
4. **Backtesting**: Test recommendations against historical data to validate accuracy
5. **Performance**: Cache health scores, only recalculate when inventory changes
6. **User Education**: Explain WHY recommendations matter (many users won't understand opportunity cost)

## Gotchas
1. **Over-Optimization**: Don't recommend too many actions - causes decision fatigue
2. **Market Volatility**: CS2 prices fluctuate rapidly - recommendations can become stale quickly
3. **User Resistance**: Users emotionally attached to items may ignore recommendations
4. **Tax Implications**: Be careful with tax-loss harvesting advice (consult tax professional disclaimer)
5. **False Signals**: Ensure recommendation logic is sound - bad advice damages trust
6. **Computation Cost**: Calculating recommendations for 10,000+ item inventories is expensive
7. **Data Quality**: Recommendations only as good as underlying market data

## Status Checklist
- [ ] Database schema created and migrated
- [ ] InventoryOptimizationService implemented
- [ ] Recommendation algorithms tested and validated
- [ ] Portfolio health scoring algorithm completed
- [ ] API endpoints created
- [ ] Optimization dashboard page built
- [ ] Recommendation cards UI implemented
- [ ] Daily cron job configured
- [ ] Email notifications set up
- [ ] Backtesting against historical data completed
- [ ] Unit tests written (95% coverage)
- [ ] Integration tests written
- [ ] Documentation completed

## Related Features
- **Feature 15**: Portfolio Analytics (provides snapshot data)
- **Feature 14**: Bulk Transaction History (cost basis tracking)
- **Feature 16**: Investment Insights (market analysis)
- **Feature 03**: Price Tracking (market data)
- **Feature 12**: Bulk Inventory Operations (execute recommendations)

## References
- [Inventory Turnover Ratio](https://www.investopedia.com/terms/i/inventoryturnover.asp)
- [Sharpe Ratio](https://www.investopedia.com/terms/s/sharperatio.asp)
- [ABC Analysis](https://www.investopedia.com/terms/a/abc.asp)
- [Tax-Loss Harvesting](https://www.investopedia.com/terms/t/taxgainlossharvesting.asp)
- [Portfolio Rebalancing](https://www.investopedia.com/terms/r/rebalancing.asp)
