# 16 - Investment Insights

## Overview

AI-powered investment recommendations based on market trends, historical performance, user portfolio, and community sentiment. Suggests undervalued items, alerts to overpriced holdings, identifies market opportunities, and provides data-driven buy/sell signals. Transforms csloadout.gg from tool to advisor.

**Value Prop:** "Get investment recommendations like a hedge fund - AI analyzes 10,000+ items to find opportunities"

## User Segments Served

- **Primary:** Investors (seeking alpha, market-beating returns)
- **Secondary:** Wannabe Investors (learning what to buy)
- **Tertiary:** Deal Hunters (finding undervalued items)

## User Stories / Use Cases

### As an Investor
- I want daily recommendations of undervalued items with high growth potential
- I want alerts when items in my portfolio become overvalued (sell signal)
- I want to see predicted price movements based on market trends
- I want to know which item categories are hot right now
- I want to compare investment strategies (long-term hold vs active trading)

### As a Wannabe Investor
- I want beginner-friendly recommendations with explanations
- I want to understand WHY an item is a good investment
- I want to see success rate of past recommendations
- I want risk level indicators (low/medium/high risk)

### As a Deal Hunter
- I want alerts for items temporarily underpriced due to market inefficiencies
- I want arbitrage opportunities (price differences between platforms)
- I want bulk deal recommendations (buy 100x cases at $0.40)

## Research & Context

### Investment Recommendation Systems

**Reference Platforms:**
```
1. Robinhood Insights:
   - Analyst ratings (Buy, Hold, Sell)
   - Price targets
   - News sentiment
   - "Why this stock?" explanations
   - Risk indicators

2. Motley Fool Stock Advisor:
   - Best Buys Now (top 10 stocks)
   - Stock recommendations with rationale
   - Performance tracking (vs S&P 500)
   - Community discussion

3. Seeking Alpha:
   - Quant ratings (1-5 stars)
   - Momentum, value, growth scores
   - Analyst consensus
   - Fair value estimates

4. Zillow (Real Estate):
   - Zestimate (predicted home value)
   - Confidence score
   - Market hotness score
   - Comparable sales
```

**Key Components:**
```
1. Recommendation Types:
   - Buy (undervalued, strong fundamentals)
   - Hold (fairly valued, wait for catalyst)
   - Sell (overvalued, better opportunities elsewhere)
   - Strong Buy (urgent, high confidence)

2. Rationale (Why?):
   - Price trend (up 20% in 30 days)
   - Volume trend (trading volume increased 3x)
   - Market sentiment (community interest rising)
   - Historical pattern (similar item patterns)

3. Confidence Score:
   - High (85%+): Strong data, clear signal
   - Medium (60-85%): Reasonable data, some uncertainty
   - Low (<60%): Weak signal, speculative

4. Risk Level:
   - Low: Stable items, small movements
   - Medium: Moderate volatility
   - High: Speculative, large swings
```

### CS2-Specific Investment Signals

**Price Momentum:**
```
Bullish Signals:
- Price increased 15%+ in 7 days
- Trading volume up 50%+ vs 30-day average
- Listings decreasing (supply constraint)

Bearish Signals:
- Price dropped 15%+ in 7 days
- Trading volume down 50%
- Listings increasing (supply glut)
```

**Sentiment Analysis:**
```
Data Sources:
- Reddit mentions (r/GlobalOffensiveTrade)
- Twitter hashtags (#CS2Skins)
- YouTube video titles
- Steam Community discussions

Sentiment Score:
- Positive mentions / Total mentions
- Trending topics
- Influencer endorsements
```

**Historical Patterns:**
```
Seasonal Trends:
- Major update release → prices spike
- Operation ends → case prices drop
- Holiday sales → skin prices dip

Event Correlation:
- ESL tournament → team stickers increase
- New case release → old case prices drop
- Skin wear rarity discovered → pattern prices surge
```

**Comparative Analysis:**
```
Similar Items:
- "AK-47 | Redline similar to AK-47 | Bloodsport"
- "If Bloodsport up 20%, Redline likely to follow"
- Pattern recognition across item families
```

### Investment Recommendation Algorithm

**Multi-Factor Model:**
```typescript
function calculateInvestmentScore(item: Item): InvestmentScore {
  let score = 0;
  const factors = [];

  // Factor 1: Price Momentum (0-30 points)
  const priceChange7d = getPriceChange(item, 7);
  if (priceChange7d > 15) {
    score += 30;
    factors.push({ name: 'Strong upward momentum', weight: 30 });
  } else if (priceChange7d > 5) {
    score += 15;
    factors.push({ name: 'Moderate upward momentum', weight: 15 });
  }

  // Factor 2: Volume Trend (0-25 points)
  const volumeChange = getVolumeChange(item, 30);
  if (volumeChange > 50) {
    score += 25;
    factors.push({ name: 'Trading volume surging', weight: 25 });
  }

  // Factor 3: Sentiment (0-20 points)
  const sentimentScore = getSentiment(item);
  score += sentimentScore * 20; // 0-1 range → 0-20 points
  factors.push({ name: 'Community sentiment', weight: sentimentScore * 20 });

  // Factor 4: Supply/Demand (0-15 points)
  const listingsChange = getListingsChange(item, 7);
  if (listingsChange < -20) { // Listings decreasing
    score += 15;
    factors.push({ name: 'Supply decreasing', weight: 15 });
  }

  // Factor 5: Historical Performance (0-10 points)
  const avgReturn = getHistoricalReturn(item, 90);
  if (avgReturn > 20) {
    score += 10;
    factors.push({ name: 'Strong historical returns', weight: 10 });
  }

  // Normalize to 0-100
  const normalizedScore = Math.min(score, 100);

  // Determine recommendation
  let recommendation: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
  if (normalizedScore >= 80) recommendation = 'Strong Buy';
  else if (normalizedScore >= 60) recommendation = 'Buy';
  else if (normalizedScore >= 40) recommendation = 'Hold';
  else if (normalizedScore >= 20) recommendation = 'Sell';
  else recommendation = 'Strong Sell';

  return {
    score: normalizedScore,
    recommendation,
    factors,
    confidence: calculateConfidence(factors)
  };
}
```

## Technical Requirements

### Database Schema

```sql
-- Investment recommendations (generated daily)
CREATE TABLE investment_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id),

  -- Recommendation
  recommendation VARCHAR(20) NOT NULL,   -- 'Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'
  score INTEGER NOT NULL,                -- 0-100
  confidence VARCHAR(20),                -- 'High', 'Medium', 'Low'
  risk_level VARCHAR(20),                -- 'Low', 'Medium', 'High'

  -- Price data
  current_price DECIMAL(10,2),
  target_price DECIMAL(10,2),            -- Predicted price in 30 days
  upside_potential_percent DECIMAL(5,2), -- (target - current) / current * 100

  -- Factors contributing to recommendation
  factors JSONB,                         -- [{ name: "...", weight: 30 }, ...]

  -- Rationale (human-readable)
  rationale TEXT,                        -- "Price up 18% in 7 days with increasing volume..."

  -- Metadata
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,                  -- Recommendations valid for 24 hours

  -- Performance tracking
  was_profitable BOOLEAN,                -- Did price move in predicted direction?
  actual_return_percent DECIMAL(5,2),    -- Actual return if followed

  UNIQUE(item_id, generated_at::DATE)    -- One rec per item per day
);

CREATE INDEX idx_investment_recs_score ON investment_recommendations(score DESC);
CREATE INDEX idx_investment_recs_recommendation ON investment_recommendations(recommendation);
CREATE INDEX idx_investment_recs_generated ON investment_recommendations(generated_at);

-- Market signals (real-time indicators)
CREATE TABLE market_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type VARCHAR(50) NOT NULL,      -- 'price-spike', 'volume-surge', 'sentiment-shift'
  item_id UUID REFERENCES items(id),
  category VARCHAR(50),                  -- If category-wide signal

  -- Signal strength
  strength VARCHAR(20),                  -- 'Weak', 'Moderate', 'Strong'
  confidence DECIMAL(3,2),               -- 0.0-1.0

  -- Details
  description TEXT,
  data JSONB,                            -- Signal-specific data

  detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP                   -- Signals valid for X hours
);

CREATE INDEX idx_market_signals_type ON market_signals(signal_type);
CREATE INDEX idx_market_signals_item ON market_signals(item_id);
CREATE INDEX idx_market_signals_detected ON market_signals(detected_at);

-- Sentiment tracking
CREATE TABLE sentiment_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id),
  source VARCHAR(50) NOT NULL,           -- 'reddit', 'twitter', 'youtube'

  -- Sentiment
  sentiment_score DECIMAL(3,2),          -- -1.0 (very negative) to 1.0 (very positive)
  mention_count INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,    -- Likes, upvotes, views

  -- Context
  sample_text TEXT,                      -- Example mention
  url TEXT,

  collected_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sentiment_item_date ON sentiment_data(item_id, collected_at);

-- User recommendation preferences
CREATE TABLE user_investment_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Preferences
  risk_tolerance VARCHAR(20) DEFAULT 'Medium', -- 'Low', 'Medium', 'High'
  investment_style VARCHAR(50) DEFAULT 'Balanced', -- 'Conservative', 'Balanced', 'Aggressive'
  min_confidence VARCHAR(20) DEFAULT 'Medium', -- Only show Medium+ confidence recs
  preferred_categories JSONB,            -- ['skins', 'cases'] (exclude stickers)

  -- Notification settings
  daily_digest BOOLEAN DEFAULT TRUE,     -- Email with top 5 recommendations
  alert_on_strong_buy BOOLEAN DEFAULT TRUE, -- Instant alert for Strong Buy
  alert_on_portfolio_sell BOOLEAN DEFAULT TRUE, -- Alert when owned item → Sell

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);
```

### Investment Insights Service

```typescript
// Service to generate investment recommendations
class InvestmentInsightsService {
  // Generate daily recommendations for all items
  async generateDailyRecommendations(): Promise<void> {
    const items = await db.items.findMany({
      include: {
        prices: true,
        priceHistory: true
      }
    });

    const recommendations: InvestmentRecommendation[] = [];

    for (const item of items) {
      const rec = await this.analyzeItem(item);

      if (rec.score >= 40) { // Only save Buy/Strong Buy recs
        recommendations.push(rec);
      }
    }

    // Sort by score (highest first)
    recommendations.sort((a, b) => b.score - a.score);

    // Save top 100 recommendations
    const topRecs = recommendations.slice(0, 100);

    for (const rec of topRecs) {
      await db.investment_recommendations.create({
        data: {
          item_id: rec.itemId,
          recommendation: rec.recommendation,
          score: rec.score,
          confidence: rec.confidence,
          risk_level: rec.riskLevel,
          current_price: rec.currentPrice,
          target_price: rec.targetPrice,
          upside_potential_percent: rec.upsidePotential,
          factors: rec.factors,
          rationale: rec.rationale,
          expires_at: addHours(new Date(), 24)
        }
      });
    }

    console.log(`Generated ${topRecs.length} recommendations`);
  }

  // Analyze single item
  async analyzeItem(item: Item): Promise<InvestmentRecommendation> {
    const factors: Factor[] = [];
    let score = 0;

    // Factor 1: Price Momentum
    const priceChange7d = this.calculatePriceChange(item, 7);
    if (priceChange7d > 15) {
      score += 30;
      factors.push({
        name: 'Strong upward momentum',
        description: `Price up ${priceChange7d.toFixed(1)}% in 7 days`,
        weight: 30,
        positive: true
      });
    } else if (priceChange7d > 5) {
      score += 15;
      factors.push({
        name: 'Moderate upward momentum',
        description: `Price up ${priceChange7d.toFixed(1)}% in 7 days`,
        weight: 15,
        positive: true
      });
    } else if (priceChange7d < -15) {
      score -= 20; // Negative momentum
      factors.push({
        name: 'Downward momentum',
        description: `Price down ${Math.abs(priceChange7d).toFixed(1)}% in 7 days`,
        weight: -20,
        positive: false
      });
    }

    // Factor 2: Volume Trend
    const volumeChange = await this.calculateVolumeChange(item, 30);
    if (volumeChange > 50) {
      score += 25;
      factors.push({
        name: 'Trading volume surging',
        description: `Volume up ${volumeChange.toFixed(0)}% vs 30-day average`,
        weight: 25,
        positive: true
      });
    }

    // Factor 3: Sentiment
    const sentiment = await this.getSentiment(item);
    const sentimentScore = sentiment.score * 20; // 0-1 → 0-20
    score += sentimentScore;
    factors.push({
      name: 'Community sentiment',
      description: `${sentiment.mentions} mentions, ${(sentiment.score * 100).toFixed(0)}% positive`,
      weight: sentimentScore,
      positive: sentiment.score > 0.6
    });

    // Factor 4: Supply/Demand
    const listingsChange = await this.getListingsChange(item, 7);
    if (listingsChange < -20) {
      score += 15;
      factors.push({
        name: 'Supply decreasing',
        description: `Available listings down ${Math.abs(listingsChange).toFixed(0)}%`,
        weight: 15,
        positive: true
      });
    }

    // Factor 5: Historical Performance
    const historicalReturn = this.calculateHistoricalReturn(item, 90);
    if (historicalReturn > 20) {
      score += 10;
      factors.push({
        name: 'Strong historical returns',
        description: `Average return ${historicalReturn.toFixed(1)}% over 90 days`,
        weight: 10,
        positive: true
      });
    }

    // Normalize score
    const normalizedScore = Math.max(0, Math.min(100, score));

    // Determine recommendation
    let recommendation: Recommendation;
    if (normalizedScore >= 80) recommendation = 'Strong Buy';
    else if (normalizedScore >= 60) recommendation = 'Buy';
    else if (normalizedScore >= 40) recommendation = 'Hold';
    else if (normalizedScore >= 20) recommendation = 'Sell';
    else recommendation = 'Strong Sell';

    // Calculate confidence
    const confidence = this.calculateConfidence(factors);

    // Calculate risk level
    const riskLevel = this.calculateRiskLevel(item);

    // Generate target price (30-day prediction)
    const targetPrice = this.predictTargetPrice(item, factors, 30);

    const currentPrice = item.prices[0]?.total_cost || 0;
    const upsidePotential = currentPrice > 0
      ? ((targetPrice - currentPrice) / currentPrice) * 100
      : 0;

    // Generate rationale
    const rationale = this.generateRationale(item, factors, recommendation);

    return {
      itemId: item.id,
      itemName: item.name,
      recommendation,
      score: normalizedScore,
      confidence,
      riskLevel,
      currentPrice,
      targetPrice,
      upsidePotential,
      factors,
      rationale
    };
  }

  // Calculate price change over N days
  private calculatePriceChange(item: Item, days: number): number {
    const history = item.priceHistory.slice(-days);
    if (history.length < 2) return 0;

    const oldPrice = history[0].price;
    const newPrice = history[history.length - 1].price;

    return ((newPrice - oldPrice) / oldPrice) * 100;
  }

  // Predict target price using linear regression
  private predictTargetPrice(item: Item, factors: Factor[], daysAhead: number): number {
    // Simple prediction: current price + average of positive factors as %
    const currentPrice = item.prices[0]?.total_cost || 0;

    const positiveFactor = factors
      .filter(f => f.positive)
      .reduce((sum, f) => sum + f.weight, 0);

    const predictedIncrease = (positiveFactor / 100) * currentPrice;

    return currentPrice + predictedIncrease;
  }

  // Calculate confidence based on factor agreement
  private calculateConfidence(factors: Factor[]): Confidence {
    const positiveFactors = factors.filter(f => f.positive).length;
    const totalFactors = factors.length;

    if (totalFactors === 0) return 'Low';

    const agreement = positiveFactors / totalFactors;

    if (agreement >= 0.8) return 'High';
    if (agreement >= 0.6) return 'Medium';
    return 'Low';
  }

  // Calculate risk level based on price volatility
  private calculateRiskLevel(item: Item): RiskLevel {
    const priceHistory = item.priceHistory.slice(-30);

    if (priceHistory.length < 10) return 'High'; // Insufficient data = risky

    // Calculate standard deviation
    const prices = priceHistory.map(h => h.price);
    const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation
    const cv = (stdDev / avg) * 100;

    if (cv < 10) return 'Low';    // Stable
    if (cv < 25) return 'Medium'; // Moderate volatility
    return 'High';                // High volatility
  }

  // Generate human-readable rationale
  private generateRationale(item: Item, factors: Factor[], recommendation: Recommendation): string {
    const positiveFactors = factors.filter(f => f.positive);
    const negativeFactors = factors.filter(f => !f.positive);

    let rationale = `${item.name} is rated ${recommendation}. `;

    if (positiveFactors.length > 0) {
      rationale += `Bullish signals: ${positiveFactors.map(f => f.description).join(', ')}. `;
    }

    if (negativeFactors.length > 0) {
      rationale += `Bearish signals: ${negativeFactors.map(f => f.description).join(', ')}. `;
    }

    return rationale.trim();
  }

  // Get sentiment for item
  private async getSentiment(item: Item): Promise<SentimentResult> {
    const sentiments = await db.sentiment_data.findMany({
      where: {
        item_id: item.id,
        collected_at: { gte: subDays(new Date(), 7) }
      }
    });

    if (sentiments.length === 0) {
      return { score: 0.5, mentions: 0 }; // Neutral
    }

    const avgScore = sentiments.reduce((sum, s) => sum + s.sentiment_score, 0) / sentiments.length;
    const mentions = sentiments.reduce((sum, s) => sum + s.mention_count, 0);

    return { score: avgScore, mentions };
  }

  // Send daily digest to users
  async sendDailyDigests(): Promise<void> {
    const users = await db.user_investment_preferences.findMany({
      where: { daily_digest: true },
      include: { user: true }
    });

    for (const pref of users) {
      const recommendations = await this.getPersonalizedRecommendations(
        pref.user_id,
        pref.risk_tolerance,
        pref.preferred_categories
      );

      if (recommendations.length > 0) {
        await this.sendEmailDigest(pref.user, recommendations.slice(0, 5));
      }
    }
  }

  // Get personalized recommendations for user
  async getPersonalizedRecommendations(
    userId: string,
    riskTolerance: string,
    preferredCategories: string[]
  ): Promise<InvestmentRecommendation[]> {
    const recommendations = await db.investment_recommendations.findMany({
      where: {
        recommendation: { in: ['Strong Buy', 'Buy'] },
        risk_level: riskTolerance === 'Low' ? 'Low' :
                    riskTolerance === 'Medium' ? { in: ['Low', 'Medium'] } :
                    { in: ['Low', 'Medium', 'High'] },
        expires_at: { gt: new Date() }
      },
      include: { item: true },
      orderBy: { score: 'desc' },
      take: 20
    });

    // Filter by preferred categories if specified
    if (preferredCategories && preferredCategories.length > 0) {
      return recommendations.filter(rec =>
        preferredCategories.includes(rec.item.type)
      );
    }

    return recommendations;
  }
}

// Cron job: Generate daily recommendations
cron.schedule('0 3 * * *', async () => { // 3 AM daily
  const service = new InvestmentInsightsService();
  await service.generateDailyRecommendations();
});

// Cron job: Send daily digests
cron.schedule('0 8 * * *', async () => { // 8 AM daily
  const service = new InvestmentInsightsService();
  await service.sendDailyDigests();
});
```

### API Endpoints

```typescript
// Get top investment recommendations
GET /api/insights/recommendations?risk=Medium&category=skins
Response: {
  recommendations: [
    {
      id: "...",
      itemName: "AK-47 | Redline",
      recommendation: "Strong Buy",
      score: 87,
      confidence: "High",
      riskLevel: "Medium",
      currentPrice: 7.50,
      targetPrice: 10.00,
      upsidePotential: 33.33,
      rationale: "Price up 18% in 7 days with increasing volume...",
      factors: [
        { name: "Strong upward momentum", weight: 30, positive: true },
        { name: "Trading volume surging", weight: 25, positive: true }
      ]
    },
    // ... more recommendations
  ]
}

// Get insights for specific item
GET /api/insights/item/:itemId
Response: {
  item: { name: "...", currentPrice: 7.50 },
  recommendation: "Strong Buy",
  score: 87,
  confidence: "High",
  targetPrice: 10.00,
  rationale: "...",
  priceHistory: [...],  // Chart data
  similarItems: [...]   // Related recommendations
}

// Get market signals
GET /api/insights/signals
Response: {
  signals: [
    {
      type: "price-spike",
      itemName: "Operation Hydra Case",
      strength: "Strong",
      description: "Price increased 25% in 24 hours",
      detectedAt: "2025-11-02T10:00:00Z"
    },
    // ...
  ]
}

// Update user investment preferences
PATCH /api/insights/preferences
Body: {
  riskTolerance: "High",
  investmentStyle: "Aggressive",
  dailyDigest: true
}
Response: { success: true }
```

### Frontend Components

```typescript
// Investment Insights Page
// pages/insights.tsx
export default function InvestmentInsightsPage() {
  const [riskFilter, setRiskFilter] = useState<'Low' | 'Medium' | 'High'>('Medium')

  const { data } = useQuery({
    queryKey: ['insights-recommendations', riskFilter],
    queryFn: () => fetch(`/api/insights/recommendations?risk=${riskFilter}`).then(r => r.json())
  })

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Investment Insights</h1>

      {/* Risk Filter */}
      <RiskFilterTabs selected={riskFilter} onChange={setRiskFilter} />

      {/* Top Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {data?.recommendations.slice(0, 6).map(rec => (
          <RecommendationCard key={rec.id} recommendation={rec} />
        ))}
      </div>

      {/* Market Signals */}
      <MarketSignalsPanel />
    </div>
  )
}

// Recommendation card
function RecommendationCard({ recommendation }) {
  const getRecommendationColor = (rec: string) => {
    if (rec === 'Strong Buy') return 'bg-green-600';
    if (rec === 'Buy') return 'bg-green-500';
    if (rec === 'Hold') return 'bg-yellow-500';
    if (rec === 'Sell') return 'bg-red-500';
    return 'bg-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{recommendation.itemName}</h3>
          <div className="text-sm text-gray-500">${recommendation.currentPrice.toFixed(2)}</div>
        </div>

        <div className={`px-3 py-1 rounded text-white font-semibold ${getRecommendationColor(recommendation.recommendation)}`}>
          {recommendation.recommendation}
        </div>
      </div>

      {/* Score & Confidence */}
      <div className="flex items-center gap-4 mb-4">
        <div>
          <div className="text-sm text-gray-600">Score</div>
          <div className="text-2xl font-bold">{recommendation.score}/100</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Confidence</div>
          <div className="font-semibold">{recommendation.confidence}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Risk</div>
          <div className="font-semibold">{recommendation.riskLevel}</div>
        </div>
      </div>

      {/* Target Price */}
      <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-600">Target Price (30 days)</div>
            <div className="text-xl font-bold text-green-600">
              ${recommendation.targetPrice.toFixed(2)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Upside</div>
            <div className="text-xl font-bold text-green-600">
              +{recommendation.upsidePotential.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Rationale */}
      <p className="text-sm text-gray-700 mb-4">{recommendation.rationale}</p>

      {/* Factors */}
      <div className="space-y-2">
        {recommendation.factors.slice(0, 3).map((factor, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className={factor.positive ? 'text-green-600' : 'text-red-600'}>
              {factor.positive ? '✓' : '✗'}
            </span>
            <span className="text-sm">{factor.description}</span>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <button
        onClick={() => router.push(`/items/${recommendation.itemId}`)}
        className="w-full mt-4 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        View Item Details
      </button>
    </div>
  )
}
```

## Success Metrics

- ✅ 70%+ investors use insights weekly (of premium users)
- ✅ 60%+ recommendation accuracy (price moved in predicted direction)
- ✅ 50%+ users enable daily digest
- ✅ 40%+ users act on Strong Buy recommendations
- ✅ Average 15%+ return following recommendations (30-day window)

## Dependencies

### Must Have Before Starting
- [04] Price Aggregation (for current prices)
- [15] Portfolio Analytics (for performance tracking)

### Blocks Other Features
None (self-contained premium feature)

## Effort Estimate

- **Development Time:** 3-4 weeks
- **Complexity:** High
- **Team Size:** 1-2 developers

**Breakdown:**
- Week 1: Database schema, recommendation algorithm, factor calculations
- Week 2: Sentiment tracking, market signals, prediction models
- Week 3: Daily digest emails, personalization logic
- Week 4: Frontend UI, testing, performance tracking

## Implementation Notes

### Sentiment Data Collection

```typescript
// Collect sentiment from Reddit
async function collectRedditSentiment(item: Item): Promise<void> {
  const subreddit = 'GlobalOffensiveTrade';
  const query = item.name;

  const posts = await reddit.search({
    subreddit,
    query,
    time: 'week'
  });

  for (const post of posts) {
    const sentimentScore = analyzeSentiment(post.title + ' ' + post.selftext);

    await db.sentiment_data.create({
      data: {
        item_id: item.id,
        source: 'reddit',
        sentiment_score: sentimentScore,
        mention_count: 1,
        engagement_score: post.ups - post.downs,
        sample_text: post.title,
        url: post.url,
        collected_at: new Date()
      }
    });
  }
}

// Simple sentiment analysis (MVP)
function analyzeSentiment(text: string): number {
  const positive = ['buy', 'invest', 'profit', 'bullish', 'growing', 'rising'];
  const negative = ['sell', 'dump', 'loss', 'bearish', 'dropping', 'falling'];

  const words = text.toLowerCase().split(/\s+/);

  let score = 0;
  words.forEach(word => {
    if (positive.includes(word)) score += 1;
    if (negative.includes(word)) score -= 1;
  });

  // Normalize to -1.0 to 1.0
  return Math.max(-1, Math.min(1, score / words.length));
}
```

### Gotchas to Watch For

1. **Recommendation Accuracy**
   - Predictions may be wrong (market is unpredictable)
   - Solution: Disclaimer "past performance doesn't guarantee future results"

2. **Data Lag**
   - Price data may be delayed (5min cache)
   - Solution: Timestamp recommendations, show "as of X time"

3. **Overfitting**
   - Algorithm optimized for past data, fails on new patterns
   - Solution: Regular backtesting, adjust weights

4. **Market Manipulation**
   - Users pump items based on our recommendations
   - Solution: Delay recommendations 1-2 hours after generation

5. **Liability**
   - Users lose money following recommendations
   - Solution: Legal disclaimer, "for informational purposes only"

6. **Sentiment Spam**
   - Bots spam positive sentiment to game algorithm
   - Solution: Filter low-engagement posts, verify accounts

## Status

- [ ] Research complete
- [ ] Database schema created
- [ ] Recommendation algorithm implemented
- [ ] Sentiment tracking functional
- [ ] Market signals working
- [ ] Daily digest emails configured
- [ ] Frontend UI complete
- [ ] Performance tracking live
- [ ] Testing complete
- [ ] Deployed to production

## Related Features

- **Depends On:**
  - [04] Price Aggregation
  - [15] Portfolio Analytics

- **Enhances:**
  - [09] Price Alerts (alert on Strong Buy)
  - [17] Advanced Deal Alerts (combine insights)

## References

- Sentiment Analysis: https://www.nltk.org/howto/sentiment.html
- Time Series Forecasting: https://facebook.github.io/prophet/
- Reddit API: https://www.reddit.com/dev/api
- Stock Recommendation Systems: https://www.investopedia.com/articles/analyst/030102.asp
