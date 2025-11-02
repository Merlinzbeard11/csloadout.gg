# Feature 35: Predictive Analytics

## Overview
Machine learning-powered predictive analytics system forecasting CS2 skin price movements, identifying high-potential investments, predicting Major tournament impacts, and providing AI-driven buy/sell recommendations. Combines historical price data, market sentiment, whale activity, seasonal patterns, and external factors (tournaments, game updates) to generate actionable investment intelligence.

## User Segments
- **Primary**: Investors, Professional Traders, Portfolio Managers
- **Secondary**: Bulk Traders, Serious Collectors
- **Tertiary**: Market Analysts, Researchers

## User Stories

### As an Investor
- I want AI-powered price predictions for items in my watchlist
- I want to identify undervalued items with high growth potential
- I want confidence scores for each prediction to assess reliability
- I want to see historical prediction accuracy to trust the system
- I want personalized recommendations based on my risk tolerance

### As a Professional Trader
- I want buy/sell signals with entry/exit price recommendations
- I want to predict Major tournament impact on sticker prices
- I want alerts when AI detects high-confidence investment opportunities
- I want to backtest prediction models against historical data
- I want to understand WHY the model makes specific predictions (explainability)

### As a Portfolio Manager
- I want portfolio optimization recommendations (which items to hold/sell/buy)
- I want risk-adjusted return predictions for different strategies
- I want to forecast portfolio value 30/60/90 days out
- I want diversification recommendations to reduce risk
- I want to compare predicted vs actual performance

### As a Market Analyst
- I want access to prediction model internals for research
- I want to export prediction data for external analysis
- I want to see feature importance (what factors drive predictions)
- I want to compare different prediction models (LSTM, Random Forest, etc.)

### As the Platform
- I want to establish csloadout.gg as industry leader in CS2 analytics
- I want to monetize premium predictions (high-confidence signals)
- I want to continuously improve models with user feedback
- I want to track prediction accuracy and model performance

## Research & Context

### Predictive Analytics Approaches

1. **Time Series Forecasting**
   - **ARIMA (AutoRegressive Integrated Moving Average)**: Classical statistical method
   - **LSTM (Long Short-Term Memory)**: Deep learning for sequential data
   - **Prophet**: Facebook's forecasting library (good for seasonal patterns)
   - **Ensemble Methods**: Combine multiple models for better accuracy

2. **Feature Engineering**
   - **Price Features**: Moving averages (7d, 30d, 90d), RSI, MACD, Bollinger Bands
   - **Volume Features**: Volume trend, volume spikes, liquidity indicators
   - **Sentiment Features**: Social sentiment score, news sentiment, search trends
   - **External Events**: Major tournaments, game updates, pro player usage
   - **Market Features**: Market cap, sector performance, whale activity
   - **Seasonal Features**: Day of week, month, quarter, proximity to Major

3. **Model Evaluation**
   - **Metrics**: MAE (Mean Absolute Error), RMSE (Root Mean Squared Error), MAPE (Mean Absolute Percentage Error)
   - **Backtesting**: Test predictions on historical data
   - **Confidence Intervals**: Provide prediction ranges, not just point estimates
   - **Feature Importance**: SHAP values, permutation importance

4. **Recommendation Engine**
   - **Buy Signals**: Predicted price increase >15%, high confidence, low risk
   - **Sell Signals**: Predicted price decrease >10%, or target profit reached
   - **Hold Signals**: Neutral prediction, or insufficient confidence
   - **Risk Scoring**: Volatility-adjusted recommendations

5. **External Data Sources**
   - **Tournament Calendar**: Major dates, team lineups, expected viewership
   - **Game Updates**: Patch notes, new skins, balance changes
   - **Google Trends**: Search volume for skin names
   - **Social Media**: Twitter mentions, Reddit discussions
   - **Steam Workshop**: Votes on upcoming skins

### Competitor Predictive Tools

- **Stock Market**: Robinhood (simple predictions), Bloomberg Terminal (professional)
- **Crypto**: TradingView (technical analysis), Glassnode (on-chain analytics)
- **CS2**: None - No comprehensive predictive analytics exists
- **Opportunity**: First AI-powered CS2 price prediction platform

## Technical Requirements

### Database Schema Extensions

```sql
-- Price predictions
CREATE TABLE price_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Item details
  item_id UUID REFERENCES market_items(id) ON DELETE CASCADE,
  market_hash_name VARCHAR(255) NOT NULL,

  -- Prediction details
  current_price DECIMAL(12,2) NOT NULL,
  predicted_price DECIMAL(12,2) NOT NULL,
  prediction_horizon_days INTEGER NOT NULL, -- 7, 30, 90 days
  predicted_change_percent DECIMAL(10,4) NOT NULL,

  -- Confidence and risk
  confidence_score DECIMAL(5,2) NOT NULL, -- 0-100
  risk_score DECIMAL(5,2), -- 0-100 (higher = riskier)

  -- Model details
  model_name VARCHAR(100), -- 'LSTM', 'Prophet', 'Ensemble'
  model_version VARCHAR(50), -- 'v1.2.3'
  feature_importance JSONB, -- { "price_momentum": 0.35, "volume_trend": 0.20, ... }

  -- Recommendation
  recommendation VARCHAR(50), -- 'strong_buy', 'buy', 'hold', 'sell', 'strong_sell'
  target_price DECIMAL(12,2), -- Recommended exit price
  stop_loss DECIMAL(12,2), -- Risk management

  -- Timestamps
  predicted_at TIMESTAMPTZ DEFAULT NOW(),
  prediction_target_date TIMESTAMPTZ NOT NULL,

  -- Actual outcome (for accuracy tracking)
  actual_price DECIMAL(12,2),
  actual_change_percent DECIMAL(10,4),
  prediction_error DECIMAL(10,4), -- Absolute % error
  is_accurate BOOLEAN, -- Within acceptable threshold

  INDEX idx_price_predictions_item (item_id, predicted_at DESC),
  INDEX idx_price_predictions_recommendation (recommendation, confidence_score DESC)
);

-- Prediction model performance
CREATE TABLE prediction_model_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Model details
  model_name VARCHAR(100) NOT NULL,
  model_version VARCHAR(50) NOT NULL,

  -- Performance metrics (last 30 days)
  total_predictions INTEGER DEFAULT 0,
  accurate_predictions INTEGER DEFAULT 0, -- Within ±5% of actual
  accuracy_rate DECIMAL(5,2), -- %
  mean_absolute_error DECIMAL(10,4), -- Average % error
  rmse DECIMAL(10,4), -- Root Mean Squared Error

  -- By prediction horizon
  accuracy_7d DECIMAL(5,2),
  accuracy_30d DECIMAL(5,2),
  accuracy_90d DECIMAL(5,2),

  -- By recommendation type
  buy_signal_accuracy DECIMAL(5,2),
  sell_signal_accuracy DECIMAL(5,2),

  -- Timestamps
  evaluation_period_start TIMESTAMPTZ NOT NULL,
  evaluation_period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_model_performance_model (model_name, model_version),
  INDEX idx_model_performance_created (created_at DESC)
);

-- Investment opportunities (AI-detected)
CREATE TABLE investment_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Item details
  item_id UUID REFERENCES market_items(id) ON DELETE CASCADE,
  market_hash_name VARCHAR(255) NOT NULL,

  -- Opportunity details
  opportunity_type VARCHAR(50) NOT NULL, -- 'undervalued', 'breakout', 'seasonal', 'tournament'
  expected_return_percent DECIMAL(10,4) NOT NULL,
  timeframe_days INTEGER NOT NULL, -- Expected time to realize return
  confidence_score DECIMAL(5,2) NOT NULL,

  -- Risk assessment
  risk_level VARCHAR(50), -- 'low', 'medium', 'high'
  risk_factors JSONB, -- { "volatility": "high", "liquidity": "medium" }

  -- Rationale
  reasoning TEXT NOT NULL, -- AI-generated explanation
  supporting_evidence JSONB, -- { "price_momentum": "+15%", "volume_spike": "+300%" }

  -- Status
  is_active BOOLEAN DEFAULT true,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  invalidated_at TIMESTAMPTZ,
  invalidation_reason TEXT,

  -- Outcome tracking
  actual_return_percent DECIMAL(10,4),
  was_successful BOOLEAN,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_investment_opportunities_active (is_active, confidence_score DESC),
  INDEX idx_investment_opportunities_type (opportunity_type, discovered_at DESC)
);

-- User prediction feedback
CREATE TABLE prediction_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  prediction_id UUID REFERENCES price_predictions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Feedback
  was_helpful BOOLEAN,
  was_accurate BOOLEAN,
  comment TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_prediction_feedback_prediction (prediction_id)
);
```

### Machine Learning Service

#### `src/services/PredictiveAnalyticsService.ts`

```typescript
import { db } from '@/lib/db';
import * as tf from '@tensorflow/tfjs-node'; // TensorFlow.js for Node

export class PredictiveAnalyticsService {
  private models: Map<string, tf.LayersModel> = new Map();

  /**
   * Generate price prediction for item
   */
  async generatePrediction(itemId: string, horizonDays: number = 30): Promise<any> {
    // Fetch item and historical data
    const item = await db.market_items.findUnique({ where: { id: itemId } });
    if (!item) throw new Error('Item not found');

    const priceHistory = await this.fetchPriceHistory(item.market_hash_name, 90); // 90 days history

    // Prepare features
    const features = await this.prepareFeatures(item, priceHistory);

    // Load or train model
    const model = await this.getOrTrainModel('LSTM', horizonDays);

    // Make prediction
    const prediction = await this.predict(model, features);

    // Calculate confidence and risk
    const confidence = this.calculateConfidence(prediction, features);
    const risk = this.calculateRisk(item, priceHistory);

    // Generate recommendation
    const recommendation = this.generateRecommendation(prediction, confidence, risk);

    // Store prediction
    const predictionRecord = await db.price_predictions.create({
      data: {
        item_id: itemId,
        market_hash_name: item.market_hash_name,
        current_price: item.median_price || 0,
        predicted_price: prediction.price,
        prediction_horizon_days: horizonDays,
        predicted_change_percent: prediction.changePercent,
        confidence_score: confidence,
        risk_score: risk,
        model_name: 'LSTM',
        model_version: 'v1.0.0',
        feature_importance: prediction.featureImportance,
        recommendation: recommendation.action,
        target_price: recommendation.targetPrice,
        stop_loss: recommendation.stopLoss,
        prediction_target_date: new Date(Date.now() + horizonDays * 24 * 60 * 60 * 1000),
      },
    });

    return predictionRecord;
  }

  /**
   * Fetch price history
   */
  private async fetchPriceHistory(marketHashName: string, days: number): Promise<any[]> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return await db.price_history.findMany({
      where: {
        market_hash_name: marketHashName,
        timestamp: { gte: cutoff },
      },
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Prepare machine learning features
   */
  private async prepareFeatures(item: any, priceHistory: any[]): Promise<any> {
    const prices = priceHistory.map((p) => p.price);

    // Price features
    const priceFeatures = {
      current_price: item.median_price || 0,
      price_change_7d: this.calculateChange(prices, 7),
      price_change_30d: this.calculateChange(prices, 30),
      sma_7: this.calculateSMA(prices, 7),
      sma_30: this.calculateSMA(prices, 30),
      rsi_14: this.calculateRSI(prices, 14),
      volatility_30d: this.calculateVolatility(prices, 30),
    };

    // Volume features
    const volumeFeatures = {
      volume_24h: item.volume_24h || 0,
      volume_trend_7d: this.calculateVolumeTrend(priceHistory, 7),
    };

    // Sentiment features
    const sentimentFeatures = await this.fetchSentimentFeatures(item.market_hash_name);

    // Seasonal features
    const seasonalFeatures = this.getSeasonalFeatures();

    // External event features
    const eventFeatures = await this.getEventFeatures();

    return {
      ...priceFeatures,
      ...volumeFeatures,
      ...sentimentFeatures,
      ...seasonalFeatures,
      ...eventFeatures,
    };
  }

  /**
   * Calculate percentage change
   */
  private calculateChange(prices: number[], days: number): number {
    if (prices.length < days + 1) return 0;

    const current = prices[prices.length - 1];
    const previous = prices[prices.length - 1 - days];

    return ((current - previous) / previous) * 100;
  }

  /**
   * Calculate Simple Moving Average
   */
  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;

    const recentPrices = prices.slice(-period);
    return recentPrices.reduce((sum, p) => sum + p, 0) / period;
  }

  /**
   * Calculate Relative Strength Index (RSI)
   */
  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50; // Neutral

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    return rsi;
  }

  /**
   * Calculate volatility (standard deviation)
   */
  private calculateVolatility(prices: number[], period: number): number {
    if (prices.length < period) return 0;

    const recentPrices = prices.slice(-period);
    const mean = recentPrices.reduce((sum, p) => sum + p, 0) / period;
    const variance = recentPrices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / period;

    return Math.sqrt(variance);
  }

  /**
   * Calculate volume trend
   */
  private calculateVolumeTrend(priceHistory: any[], days: number): number {
    if (priceHistory.length < days) return 0;

    const recentVolume = priceHistory.slice(-days);
    const avgVolume = recentVolume.reduce((sum, p) => sum + (p.volume || 0), 0) / days;
    const currentVolume = recentVolume[recentVolume.length - 1]?.volume || 0;

    return ((currentVolume - avgVolume) / avgVolume) * 100;
  }

  /**
   * Fetch sentiment features
   */
  private async fetchSentimentFeatures(marketHashName: string): Promise<any> {
    // Query social sentiment, search trends, etc.
    // Simplified for example
    return {
      sentiment_score: 0.5,
      search_trend: 1.2,
    };
  }

  /**
   * Get seasonal features
   */
  private getSeasonalFeatures(): any {
    const now = new Date();
    return {
      day_of_week: now.getDay(),
      month: now.getMonth() + 1,
      quarter: Math.floor(now.getMonth() / 3) + 1,
      days_until_major: this.daysUntilNextMajor(),
    };
  }

  /**
   * Days until next Major tournament
   */
  private daysUntilNextMajor(): number {
    // Hardcoded for example - should query tournament calendar
    const nextMajor = new Date('2025-05-15'); // Example date
    const now = new Date();
    const diff = nextMajor.getTime() - now.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  /**
   * Get external event features
   */
  private async getEventFeatures(): Promise<any> {
    // Check for upcoming game updates, new skins, etc.
    return {
      has_upcoming_update: false,
      new_collection_announced: false,
    };
  }

  /**
   * Load or train model
   */
  private async getOrTrainModel(modelName: string, horizonDays: number): Promise<tf.LayersModel> {
    const modelKey = `${modelName}_${horizonDays}d`;

    if (this.models.has(modelKey)) {
      return this.models.get(modelKey)!;
    }

    // Load pre-trained model or train new one
    // Simplified - real implementation would load from file
    const model = await this.buildLSTMModel();
    this.models.set(modelKey, model);

    return model;
  }

  /**
   * Build LSTM model architecture
   */
  private async buildLSTMModel(): Promise<tf.LayersModel> {
    const model = tf.sequential();

    model.add(
      tf.layers.lstm({
        units: 50,
        returnSequences: true,
        inputShape: [30, 10], // 30 timesteps, 10 features
      })
    );

    model.add(tf.layers.dropout({ rate: 0.2 }));

    model.add(
      tf.layers.lstm({
        units: 50,
        returnSequences: false,
      })
    );

    model.add(tf.layers.dropout({ rate: 0.2 }));

    model.add(tf.layers.dense({ units: 1 })); // Output: predicted price

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
    });

    return model;
  }

  /**
   * Make prediction
   */
  private async predict(model: tf.LayersModel, features: any): Promise<any> {
    // Convert features to tensor
    // Simplified - real implementation would normalize and reshape properly
    const inputTensor = tf.tensor2d([[Object.values(features)]]);

    const prediction = model.predict(inputTensor) as tf.Tensor;
    const predictedPrice = (await prediction.data())[0];

    const currentPrice = features.current_price;
    const changePercent = ((predictedPrice - currentPrice) / currentPrice) * 100;

    return {
      price: predictedPrice,
      changePercent,
      featureImportance: this.calculateFeatureImportance(features),
    };
  }

  /**
   * Calculate feature importance (simplified SHAP-like)
   */
  private calculateFeatureImportance(features: any): any {
    // Simplified - real implementation would use SHAP or permutation importance
    return {
      price_momentum: 0.35,
      volume_trend: 0.20,
      sentiment: 0.15,
      rsi: 0.10,
      volatility: 0.10,
      seasonal: 0.10,
    };
  }

  /**
   * Calculate prediction confidence
   */
  private calculateConfidence(prediction: any, features: any): number {
    // Factors: model accuracy, volatility, data quality
    let confidence = 70; // Base confidence

    // Reduce confidence for high volatility
    if (features.volatility_30d > 0.2) confidence -= 10;

    // Increase confidence for strong momentum
    if (Math.abs(features.price_change_7d) > 10) confidence += 10;

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Calculate risk score
   */
  private calculateRisk(item: any, priceHistory: any[]): number {
    const prices = priceHistory.map((p) => p.price);
    const volatility = this.calculateVolatility(prices, 30);
    const volume = item.volume_24h || 0;

    let risk = 50; // Base risk

    // High volatility = higher risk
    if (volatility > 0.3) risk += 20;

    // Low volume (illiquid) = higher risk
    if (volume < 100) risk += 15;

    return Math.max(0, Math.min(100, risk));
  }

  /**
   * Generate buy/sell recommendation
   */
  private generateRecommendation(prediction: any, confidence: number, risk: number): any {
    const changePercent = prediction.changePercent;

    let action = 'hold';
    let targetPrice = null;
    let stopLoss = null;

    if (changePercent > 15 && confidence > 70 && risk < 60) {
      action = 'strong_buy';
      targetPrice = prediction.price;
      stopLoss = prediction.price * 0.9; // 10% stop loss
    } else if (changePercent > 8 && confidence > 60) {
      action = 'buy';
      targetPrice = prediction.price;
      stopLoss = prediction.price * 0.92; // 8% stop loss
    } else if (changePercent < -10 && confidence > 70) {
      action = 'sell';
    } else if (changePercent < -15) {
      action = 'strong_sell';
    }

    return { action, targetPrice, stopLoss };
  }

  /**
   * Detect investment opportunities
   */
  async detectInvestmentOpportunities(): Promise<void> {
    // Find undervalued items (predicted price significantly > current price)
    const predictions = await db.price_predictions.findMany({
      where: {
        predicted_change_percent: { gte: 20 },
        confidence_score: { gte: 70 },
        predicted_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24h
      },
      orderBy: { confidence_score: 'desc' },
      take: 50,
    });

    for (const prediction of predictions) {
      await db.investment_opportunities.create({
        data: {
          item_id: prediction.item_id,
          market_hash_name: prediction.market_hash_name,
          opportunity_type: 'undervalued',
          expected_return_percent: prediction.predicted_change_percent,
          timeframe_days: prediction.prediction_horizon_days,
          confidence_score: prediction.confidence_score,
          risk_level: prediction.risk_score > 60 ? 'high' : prediction.risk_score > 40 ? 'medium' : 'low',
          risk_factors: {},
          reasoning: `AI predicts ${prediction.predicted_change_percent.toFixed(1)}% price increase in ${prediction.prediction_horizon_days} days`,
          supporting_evidence: prediction.feature_importance,
        },
      });
    }
  }

  /**
   * Evaluate model performance
   */
  async evaluateModelPerformance(modelName: string): Promise<void> {
    // Get predictions from 30 days ago that should have resolved
    const evaluationDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const predictions = await db.price_predictions.findMany({
      where: {
        model_name: modelName,
        prediction_target_date: { lte: new Date() },
        predicted_at: { gte: evaluationDate },
      },
    });

    let totalPredictions = predictions.length;
    let accuratePredictions = 0;
    let totalError = 0;

    for (const prediction of predictions) {
      // Fetch actual price at target date
      const actualPrice = await this.fetchActualPrice(prediction.market_hash_name, prediction.prediction_target_date);

      if (actualPrice) {
        const actualChangePercent = ((actualPrice - prediction.current_price) / prediction.current_price) * 100;
        const error = Math.abs(actualChangePercent - prediction.predicted_change_percent);

        // Update prediction with actual outcome
        await db.price_predictions.update({
          where: { id: prediction.id },
          data: {
            actual_price: actualPrice,
            actual_change_percent: actualChangePercent,
            prediction_error: error,
            is_accurate: error < 5, // Within ±5% threshold
          },
        });

        if (error < 5) accuratePredictions++;
        totalError += error;
      }
    }

    const accuracyRate = (accuratePredictions / totalPredictions) * 100;
    const mae = totalError / totalPredictions;

    // Store model performance
    await db.prediction_model_performance.create({
      data: {
        model_name: modelName,
        model_version: 'v1.0.0',
        total_predictions: totalPredictions,
        accurate_predictions: accuratePredictions,
        accuracy_rate: accuracyRate,
        mean_absolute_error: mae,
        evaluation_period_start: evaluationDate,
        evaluation_period_end: new Date(),
      },
    });
  }

  /**
   * Fetch actual price at specific date
   */
  private async fetchActualPrice(marketHashName: string, targetDate: Date): Promise<number | null> {
    const priceRecord = await db.price_history.findFirst({
      where: {
        market_hash_name: marketHashName,
        timestamp: { gte: targetDate, lte: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000) },
      },
      orderBy: { timestamp: 'asc' },
    });

    return priceRecord?.price || null;
  }
}

export const predictiveAnalyticsService = new PredictiveAnalyticsService();
```

## Success Metrics
1. **Prediction Accuracy**: 70%+ predictions within ±5% of actual price
2. **User Adoption**: 50%+ of premium users use predictive analytics weekly
3. **Investment Success**: 65%+ of "strong buy" recommendations profitable
4. **Model Improvement**: Accuracy increases by 5% every 3 months through retraining
5. **Revenue**: $10,000+ monthly revenue from premium predictive analytics

## Dependencies
- **Feature 34**: Market Intelligence Dashboard (macro data input)
- **Feature 03**: Price Tracking (historical data source)
- **Feature 14**: Bulk Transaction History (whale activity data)

## Effort Estimate
- **Database Schema**: 6 hours
- **Feature Engineering**: 20 hours
- **LSTM Model Development**: 24 hours
- **Model Training Pipeline**: 16 hours
- **PredictiveAnalyticsService**: 20 hours
- **Recommendation Engine**: 12 hours
- **Model Evaluation System**: 12 hours
- **API Routes**: 8 hours
- **Frontend UI (Predictions Page)**: 16 hours
- **Backtesting Framework**: 12 hours
- **Documentation**: 8 hours
- **Total**: ~154 hours (3.85 weeks)

## Implementation Notes
1. **Model Choice**: Start with LSTM (sequential data), expand to ensemble methods
2. **Training Data**: Minimum 1 year of historical price data required
3. **Retraining**: Retrain models monthly with latest data
4. **Feature Store**: Cache computed features to speed up predictions
5. **Explainability**: Use SHAP values to explain predictions (build trust)
6. **Premium Feature**: Gate high-confidence predictions behind paid tier

## Gotchas
1. **Overfitting**: Avoid memorizing historical patterns that won't repeat
2. **Data Quality**: Garbage in, garbage out - clean data is critical
3. **Black Swan Events**: Models can't predict unprecedented events (new skins, major updates)
4. **Computational Cost**: Training LSTM models is expensive (use GPU if possible)
5. **User Expectations**: Clearly communicate predictions are probabilities, not guarantees

## Status Checklist
- [ ] Database schema created and migrated
- [ ] Feature engineering pipeline built
- [ ] LSTM model architecture implemented
- [ ] Model training pipeline functional
- [ ] PredictiveAnalyticsService implemented
- [ ] Recommendation engine working
- [ ] Model evaluation system running (monthly)
- [ ] Investment opportunity detection working
- [ ] API routes created
- [ ] Frontend predictions page built
- [ ] Backtesting framework implemented
- [ ] Model accuracy >70% validated
- [ ] Premium gating implemented
- [ ] Unit tests written (90% coverage)
- [ ] Documentation completed (including model methodology)

## Related Features
- **Feature 34**: Market Intelligence Dashboard (input data)
- **Feature 03**: Price Tracking (historical data)
- **Feature 31**: Public API (prediction export)

## References
- [TensorFlow.js Documentation](https://www.tensorflow.org/js)
- [LSTM for Time Series Forecasting](https://machinelearningmastery.com/time-series-forecasting-long-short-term-memory-network-python/)
- [Facebook Prophet](https://facebook.github.io/prophet/)
- [SHAP (SHapley Additive exPlanations)](https://github.com/slundberg/shap)
- [Backtesting Trading Strategies](https://www.investopedia.com/terms/b/backtesting.asp)
