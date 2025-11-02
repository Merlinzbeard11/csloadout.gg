# 17 - Advanced Deal Alerts

## Overview

Sophisticated alert system combining price triggers, market conditions, investment insights, and user preferences. Goes beyond simple "price below $X" to include complex rules like "AK-47 skins drop 15% + volume increases + Strong Buy rating". Enables power users to automate deal hunting with precision.

**Value Prop:** "Set it and forget it - get alerted only when perfect deals match YOUR exact criteria"

## User Segments Served

- **Primary:** Deal Hunters (sophisticated deal-finding automation)
- **Secondary:** Investors (entry/exit signal automation)
- **Tertiary:** Bulk Traders (bulk purchase opportunities)

## User Stories / Use Cases

### As a Deal Hunter
- I want alerts when items drop 20%+ AND have Strong Buy rating
- I want alerts for arbitrage opportunities (price difference >$5 between platforms)
- I want alerts when specific item categories go on sale (all AWP skins down 10%)
- I want alerts limited to items I can afford (price <$50)

### As an Investor
- I want alerts when items in my watchlist hit target entry price
- I want alerts when items I own become overvalued (sell signal)
- I want alerts for momentum plays (price up 15% with volume surge)
- I want to combine multiple conditions (price drop + sentiment positive + low supply)

### As a Bulk Trader
- I want alerts for bulk deals (100x cases at discount)
- I want alerts when inventory space becomes available (account <800 items)
- I want alerts for platform-specific deals (Buff163 cheaper than CSFloat by 10%+)

## Research & Context

### Advanced Alert Systems

**Reference Platforms:**
```
1. Stock Alert Apps (Stock Alarm, Webull):
   - Price triggers (above/below/crosses)
   - Percent change triggers (+/-5%)
   - Volume triggers (volume > 2x average)
   - Technical indicators (RSI, MACD)
   - Compound conditions (price AND volume)

2. IFTTT (If This Then That):
   - Rule-based automation
   - Multi-condition triggers
   - Channel integrations (email, SMS, webhook)
   - Complex logic (AND, OR, NOT)

3. Google Alerts:
   - Keyword monitoring
   - Frequency settings (immediate, daily, weekly)
   - Source filtering (news, blogs, forums)
   - Email delivery

4. CamelCamelCamel (Amazon Price Tracker):
   - Desired price alerts
   - Price drop % alerts
   - Historical price triggers (below 90-day average)
   - Multi-retailer comparison
```

**Key Features:**
```
1. Trigger Types:
   - Price-based (below $X, drop Y%)
   - Market-based (volume surge, supply drop)
   - Recommendation-based (Strong Buy rating)
   - Platform-based (arbitrage opportunities)
   - Time-based (deal duration, expiry)

2. Condition Logic:
   - Single condition (price < $10)
   - AND logic (price < $10 AND volume > 1000)
   - OR logic (Strong Buy OR price drop 20%)
   - NOT logic (NOT already owned)

3. Delivery Methods:
   - Email (immediate, digest)
   - Browser push notification
   - SMS (premium feature)
   - Webhook (API integration)

4. Alert Management:
   - Snooze (mute for X hours)
   - Pause/resume
   - One-time vs recurring
   - Priority levels (critical, normal, low)
```

### CS2-Specific Alert Scenarios

**Common Alert Rules:**
```
1. "Flash Crash" Alert:
   - Price drops >20% in 1 hour
   - Trading volume >2x average
   - NOT a permanent price change

2. "Arbitrage Opportunity":
   - Price difference between platforms >$5
   - Both platforms have stock available
   - Can profit after fees

3. "Momentum Play":
   - Price up 15%+ in 7 days
   - Volume increasing
   - Strong Buy recommendation
   - Low risk rating

4. "Value Investment":
   - Price <80% of 90-day average
   - High confidence recommendation
   - Item type in user preferences

5. "Inventory Bargain":
   - Item in user's watchlist
   - Price below user's target
   - Seller has good reputation (Phase 2)

6. "Bulk Deal":
   - Quantity >=100 items
   - Price per unit <$0.50
   - Total cost <$500 (affordable)
```

### Alert Fatigue Prevention

**Problem:** Too many alerts = user ignores all

**Solutions:**
```
1. Smart Frequency Limits:
   - Max 5 alerts per day (configurable)
   - Group similar alerts (3 AK-47 skins → "3 AK-47 deals")
   - Cooldown period (don't alert same item for 24h)

2. Priority Scoring:
   - Critical: Strong Buy + price drop 20%+ (send immediately)
   - High: Matches all user conditions
   - Medium: Matches some conditions
   - Low: Generic deals (daily digest only)

3. User Control:
   - Quiet hours (no alerts 10PM-8AM)
   - Platform preferences (email vs push)
   - Alert limits per category

4. Feedback Loop:
   - "Was this alert useful?" → Learn user preferences
   - Auto-disable alerts with 0% click-through
```

## Technical Requirements

### Database Schema

```sql
-- User-defined alert rules
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Rule name & description
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Trigger conditions (JSON for flexibility)
  conditions JSONB NOT NULL,             -- Complex rule logic
  /*
  Example conditions:
  {
    "operator": "AND",
    "rules": [
      { "field": "price_drop_percent", "operator": ">", "value": 20 },
      { "field": "recommendation", "operator": "=", "value": "Strong Buy" },
      { "field": "risk_level", "operator": "=", "value": "Low" }
    ]
  }
  */

  -- Filters
  item_ids JSONB,                        -- Specific items to watch (null = all items)
  item_types JSONB,                      -- ['skins', 'cases']
  platforms JSONB,                       -- ['csfloat', 'buff163']
  max_price DECIMAL(10,2),               -- Affordability limit

  -- Alert settings
  priority VARCHAR(20) DEFAULT 'Medium', -- 'Critical', 'High', 'Medium', 'Low'
  delivery_method JSONB,                 -- ['email', 'push', 'sms']
  is_active BOOLEAN DEFAULT TRUE,
  is_one_time BOOLEAN DEFAULT FALSE,     -- Fire once then auto-disable

  -- Frequency limits
  max_alerts_per_day INTEGER DEFAULT 5,
  cooldown_hours INTEGER DEFAULT 24,     -- Don't alert same item for X hours

  -- Quiet hours
  quiet_hours_start TIME,                -- e.g., 22:00
  quiet_hours_end TIME,                  -- e.g., 08:00

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_triggered_at TIMESTAMP,
  trigger_count INTEGER DEFAULT 0
);

CREATE INDEX idx_alert_rules_user ON alert_rules(user_id);
CREATE INDEX idx_alert_rules_active ON alert_rules(is_active);

-- Triggered alerts (historical log)
CREATE TABLE triggered_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Trigger details
  item_id UUID REFERENCES items(id),
  item_name VARCHAR(255),
  trigger_reason TEXT,                   -- "Price dropped 22%, Strong Buy rating"

  -- Snapshot data (at time of alert)
  snapshot_data JSONB,                   -- { price: 7.50, recommendation: "Strong Buy", ... }

  -- Delivery
  priority VARCHAR(20),
  delivered_via JSONB,                   -- ['email', 'push']
  delivered_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- User engagement
  was_clicked BOOLEAN DEFAULT FALSE,
  clicked_at TIMESTAMP,
  was_purchased BOOLEAN DEFAULT FALSE,   -- Did user buy the item?
  was_dismissed BOOLEAN DEFAULT FALSE,
  was_useful BOOLEAN,                    -- User feedback

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_triggered_alerts_user ON triggered_alerts(user_id);
CREATE INDEX idx_triggered_alerts_rule ON triggered_alerts(alert_rule_id);
CREATE INDEX idx_triggered_alerts_delivered ON triggered_alerts(delivered_at);

-- Alert performance metrics
CREATE TABLE alert_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),

  -- Performance
  total_triggers INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_purchases INTEGER DEFAULT 0,
  total_dismissals INTEGER DEFAULT 0,

  -- Effectiveness
  click_through_rate DECIMAL(5,2),       -- clicks / triggers
  conversion_rate DECIMAL(5,2),          -- purchases / triggers
  usefulness_score DECIMAL(5,2),         -- avg(was_useful)

  -- Calculated at
  calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(alert_rule_id)
);
```

### Advanced Alert Engine

```typescript
// Service to evaluate alert rules and trigger notifications
class AdvancedAlertEngine {
  // Check all active alert rules (run every 5 minutes)
  async evaluateAllRules(): Promise<void> {
    const activeRules = await db.alert_rules.findMany({
      where: { is_active: true }
    });

    for (const rule of activeRules) {
      try {
        await this.evaluateRule(rule);
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error);
      }
    }
  }

  // Evaluate single alert rule
  async evaluateRule(rule: AlertRule): Promise<void> {
    // Check if rule is within quiet hours
    if (this.isQuietHours(rule)) {
      return;
    }

    // Check if rule has hit daily limit
    const todayTriggers = await this.getTodayTriggerCount(rule.id);
    if (todayTriggers >= rule.max_alerts_per_day) {
      return;
    }

    // Get candidate items (apply filters first)
    const candidates = await this.getCandidateItems(rule);

    // Evaluate conditions for each candidate
    for (const item of candidates) {
      const meetsConditions = await this.evaluateConditions(item, rule.conditions);

      if (meetsConditions) {
        // Check cooldown (don't alert same item within X hours)
        const recentAlert = await db.triggered_alerts.findFirst({
          where: {
            alert_rule_id: rule.id,
            item_id: item.id,
            delivered_at: { gte: subHours(new Date(), rule.cooldown_hours) }
          }
        });

        if (recentAlert) {
          continue; // Skip, already alerted recently
        }

        // Trigger alert!
        await this.triggerAlert(rule, item);

        // If one-time alert, disable rule
        if (rule.is_one_time) {
          await db.alert_rules.update({
            where: { id: rule.id },
            data: { is_active: false }
          });
          break;
        }
      }
    }
  }

  // Get items matching rule filters
  private async getCandidateItems(rule: AlertRule): Promise<Item[]> {
    const filters: any = {};

    if (rule.item_ids && rule.item_ids.length > 0) {
      filters.id = { in: rule.item_ids };
    }

    if (rule.item_types && rule.item_types.length > 0) {
      filters.type = { in: rule.item_types };
    }

    if (rule.max_price) {
      filters.prices = {
        some: {
          total_cost: { lte: rule.max_price }
        }
      };
    }

    return await db.items.findMany({
      where: filters,
      include: {
        prices: true,
        priceHistory: true,
        investment_recommendation: true
      }
    });
  }

  // Evaluate complex conditions (recursive)
  private async evaluateConditions(item: Item, conditions: RuleConditions): Promise<boolean> {
    if (conditions.operator === 'AND') {
      return await this.evaluateAND(item, conditions.rules);
    } else if (conditions.operator === 'OR') {
      return await this.evaluateOR(item, conditions.rules);
    } else if (conditions.operator === 'NOT') {
      return !(await this.evaluateConditions(item, conditions.rule));
    } else {
      // Single condition
      return await this.evaluateSingleCondition(item, conditions);
    }
  }

  private async evaluateAND(item: Item, rules: Rule[]): Promise<boolean> {
    for (const rule of rules) {
      const result = await this.evaluateConditions(item, rule);
      if (!result) return false;
    }
    return true;
  }

  private async evaluateOR(item: Item, rules: Rule[]): Promise<boolean> {
    for (const rule of rules) {
      const result = await this.evaluateConditions(item, rule);
      if (result) return true;
    }
    return false;
  }

  // Evaluate single condition
  private async evaluateSingleCondition(item: Item, condition: Condition): Promise<boolean> {
    const field = condition.field;
    const operator = condition.operator;
    const targetValue = condition.value;

    // Get actual value for this field
    const actualValue = await this.getFieldValue(item, field);

    // Compare based on operator
    switch (operator) {
      case '=':
        return actualValue === targetValue;
      case '!=':
        return actualValue !== targetValue;
      case '>':
        return actualValue > targetValue;
      case '>=':
        return actualValue >= targetValue;
      case '<':
        return actualValue < targetValue;
      case '<=':
        return actualValue <= targetValue;
      case 'in':
        return Array.isArray(targetValue) && targetValue.includes(actualValue);
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  // Get field value from item
  private async getFieldValue(item: Item, field: string): Promise<any> {
    switch (field) {
      case 'price':
        return item.prices[0]?.total_cost || 0;

      case 'price_drop_percent':
        const priceChange7d = this.calculatePriceChange(item, 7);
        return Math.abs(priceChange7d); // Absolute value

      case 'recommendation':
        return item.investment_recommendation?.recommendation || 'Hold';

      case 'risk_level':
        return item.investment_recommendation?.risk_level || 'Medium';

      case 'volume_change_percent':
        return await this.calculateVolumeChange(item, 30);

      case 'platform':
        return item.prices[0]?.platform || '';

      case 'price_vs_average':
        const avg = await this.get30DayAverage(item);
        return ((item.prices[0]?.total_cost || 0) / avg) * 100; // % of average

      case 'arbitrage_opportunity':
        return await this.calculateArbitrageOpportunity(item);

      default:
        throw new Error(`Unknown field: ${field}`);
    }
  }

  // Trigger alert (send notification)
  private async triggerAlert(rule: AlertRule, item: Item): Promise<void> {
    // Generate trigger reason
    const reason = this.generateTriggerReason(rule, item);

    // Snapshot current data
    const snapshot = {
      price: item.prices[0]?.total_cost,
      platform: item.prices[0]?.platform,
      recommendation: item.investment_recommendation?.recommendation,
      risk_level: item.investment_recommendation?.risk_level
    };

    // Save triggered alert
    const triggeredAlert = await db.triggered_alerts.create({
      data: {
        alert_rule_id: rule.id,
        user_id: rule.user_id,
        item_id: item.id,
        item_name: item.name,
        trigger_reason: reason,
        snapshot_data: snapshot,
        priority: rule.priority,
        delivered_via: rule.delivery_method
      }
    });

    // Send notifications
    if (rule.delivery_method.includes('email')) {
      await this.sendEmailAlert(rule, item, reason);
    }

    if (rule.delivery_method.includes('push')) {
      await this.sendPushAlert(rule, item, reason);
    }

    if (rule.delivery_method.includes('sms')) {
      await this.sendSMSAlert(rule, item, reason);
    }

    // Update rule last triggered
    await db.alert_rules.update({
      where: { id: rule.id },
      data: {
        last_triggered_at: new Date(),
        trigger_count: { increment: 1 }
      }
    });
  }

  // Generate human-readable trigger reason
  private generateTriggerReason(rule: AlertRule, item: Item): string {
    const reasons: string[] = [];

    // Parse conditions and generate reasons
    // Example: "Price dropped 22% to $7.50, Strong Buy rating, Low risk"

    const price = item.prices[0]?.total_cost || 0;
    reasons.push(`Price: $${price.toFixed(2)}`);

    if (item.investment_recommendation) {
      reasons.push(`${item.investment_recommendation.recommendation} rating`);
      reasons.push(`${item.investment_recommendation.risk_level} risk`);
    }

    return reasons.join(', ');
  }

  // Send email alert
  private async sendEmailAlert(rule: AlertRule, item: Item, reason: string): Promise<void> {
    const user = await db.users.findUnique({ where: { id: rule.user_id } });

    await sendEmail({
      to: user.email,
      subject: `🔔 Alert: ${rule.name}`,
      html: `
        <h2>${item.name}</h2>
        <p><strong>Alert Triggered:</strong> ${rule.name}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Current Price:</strong> $${item.prices[0]?.total_cost.toFixed(2)}</p>
        <a href="https://csloadout.gg/items/${item.id}">View Item</a>
      `
    });
  }

  // Send browser push notification
  private async sendPushAlert(rule: AlertRule, item: Item, reason: string): Promise<void> {
    // Use Web Push API
    await webPush.sendNotification(user.pushSubscription, {
      title: `🔔 ${rule.name}`,
      body: `${item.name} - ${reason}`,
      data: {
        url: `/items/${item.id}`
      }
    });
  }
}

// Cron job: Evaluate all alert rules every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  const engine = new AdvancedAlertEngine();
  await engine.evaluateAllRules();
});
```

### API Endpoints

```typescript
// Create alert rule
POST /api/alerts/rules
Body: {
  name: "Flash Crash Alerts",
  conditions: {
    "operator": "AND",
    "rules": [
      { "field": "price_drop_percent", "operator": ">", "value": 20 },
      { "field": "recommendation", "operator": "=", "value": "Strong Buy" }
    ]
  },
  item_types: ["skins"],
  max_price: 50,
  delivery_method: ["email", "push"]
}
Response: {
  id: "...",
  name: "Flash Crash Alerts",
  is_active: true,
  created_at: "2025-11-02T10:00:00Z"
}

// Get user's alert rules
GET /api/alerts/rules
Response: {
  rules: [
    {
      id: "...",
      name: "Flash Crash Alerts",
      is_active: true,
      trigger_count: 12,
      last_triggered_at: "2025-11-01T14:30:00Z",
      metrics: {
        click_through_rate: 67.5,
        usefulness_score: 4.2
      }
    },
    // ...
  ]
}

// Update alert rule
PATCH /api/alerts/rules/:id
Body: { is_active: false }
Response: { success: true }

// Get triggered alerts (history)
GET /api/alerts/triggered?limit=20
Response: {
  alerts: [
    {
      id: "...",
      rule_name: "Flash Crash Alerts",
      item_name: "AK-47 | Redline",
      trigger_reason: "Price dropped 22%, Strong Buy rating",
      snapshot_data: { price: 7.50 },
      delivered_at: "2025-11-02T10:15:00Z",
      was_clicked: true
    },
    // ...
  ]
}

// Mark alert as useful/not useful (feedback)
POST /api/alerts/triggered/:id/feedback
Body: { was_useful: true }
Response: { success: true }

// Test alert rule (dry run)
POST /api/alerts/rules/:id/test
Response: {
  matches: [
    {
      item_name: "AK-47 | Redline",
      reason: "Price dropped 22%, Strong Buy rating",
      price: 7.50
    },
    // ... items that would trigger this rule
  ],
  match_count: 3
}
```

### Frontend Components

```typescript
// Alert Rule Builder Page
// pages/alerts/builder.tsx
export default function AlertBuilderPage() {
  const [rule, setRule] = useState({
    name: '',
    conditions: { operator: 'AND', rules: [] },
    delivery_method: ['email']
  })

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Create Alert Rule</h1>

      {/* Rule Name */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <label className="block text-sm font-medium mb-2">Rule Name</label>
        <input
          type="text"
          value={rule.name}
          onChange={(e) => setRule({ ...rule, name: e.target.value })}
          className="w-full px-3 py-2 border rounded"
          placeholder="Flash Crash Alerts"
        />
      </div>

      {/* Condition Builder */}
      <ConditionBuilder
        conditions={rule.conditions}
        onChange={(conditions) => setRule({ ...rule, conditions })}
      />

      {/* Filters */}
      <FilterPanel
        filters={rule}
        onChange={setRule}
      />

      {/* Delivery Settings */}
      <DeliverySettings
        settings={rule}
        onChange={setRule}
      />

      {/* Test & Save */}
      <div className="flex gap-4">
        <button
          onClick={handleTest}
          className="btn-secondary"
        >
          Test Rule
        </button>
        <button
          onClick={handleSave}
          className="btn-primary"
        >
          Create Alert
        </button>
      </div>
    </div>
  )
}

// Condition builder (recursive UI)
function ConditionBuilder({ conditions, onChange }) {
  const addCondition = () => {
    const newRule = {
      field: 'price',
      operator: '<',
      value: 10
    };

    onChange({
      ...conditions,
      rules: [...conditions.rules, newRule]
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Conditions</h2>

      <div className="space-y-4">
        {conditions.rules.map((rule, index) => (
          <ConditionRow
            key={index}
            condition={rule}
            onChange={(updated) => {
              const newRules = [...conditions.rules];
              newRules[index] = updated;
              onChange({ ...conditions, rules: newRules });
            }}
            onRemove={() => {
              const newRules = conditions.rules.filter((_, i) => i !== index);
              onChange({ ...conditions, rules: newRules });
            }}
          />
        ))}

        <button
          onClick={addCondition}
          className="btn-secondary"
        >
          + Add Condition
        </button>
      </div>
    </div>
  )
}

// Single condition row
function ConditionRow({ condition, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-4 bg-gray-50 p-4 rounded">
      {/* Field */}
      <select
        value={condition.field}
        onChange={(e) => onChange({ ...condition, field: e.target.value })}
        className="px-3 py-2 border rounded"
      >
        <option value="price">Price</option>
        <option value="price_drop_percent">Price Drop %</option>
        <option value="recommendation">Recommendation</option>
        <option value="risk_level">Risk Level</option>
        <option value="volume_change_percent">Volume Change %</option>
      </select>

      {/* Operator */}
      <select
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value })}
        className="px-3 py-2 border rounded"
      >
        <option value="=">=</option>
        <option value="!=">≠</option>
        <option value=">">></option>
        <option value=">=">≥</option>
        <option value="<"><</option>
        <option value="<=">≤</option>
      </select>

      {/* Value */}
      {condition.field === 'recommendation' ? (
        <select
          value={condition.value}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          className="px-3 py-2 border rounded"
        >
          <option value="Strong Buy">Strong Buy</option>
          <option value="Buy">Buy</option>
          <option value="Hold">Hold</option>
          <option value="Sell">Sell</option>
        </select>
      ) : (
        <input
          type="number"
          value={condition.value}
          onChange={(e) => onChange({ ...condition, value: parseFloat(e.target.value) })}
          className="px-3 py-2 border rounded w-32"
        />
      )}

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="text-red-600 hover:text-red-800"
      >
        ✕
      </button>
    </div>
  )
}
```

## Success Metrics

- ✅ 70%+ deal hunters create custom alerts (of premium users)
- ✅ Average 3 alert rules per user
- ✅ 60%+ alert click-through rate
- ✅ 30%+ conversion rate (alert → purchase)
- ✅ <1min alert delivery time (from trigger to notification)

## Dependencies

### Must Have Before Starting
- [09] Price Alerts (basic price triggers)
- [16] Investment Insights (recommendation-based triggers)

### Blocks Other Features
None (self-contained premium feature)

## Effort Estimate

- **Development Time:** 2-3 weeks
- **Complexity:** High
- **Team Size:** 1-2 developers

**Breakdown:**
- Week 1: Database schema, condition evaluation engine
- Week 2: Alert rule builder UI, delivery integrations
- Week 3: Testing, performance metrics, feedback loop

## Implementation Notes

### Push Notification Setup

```typescript
// Server: Use web-push library
import webPush from 'web-push';

webPush.setVapidDetails(
  'mailto:support@csloadout.gg',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Client: Subscribe to push notifications
const registration = await navigator.serviceWorker.register('/sw.js');
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: VAPID_PUBLIC_KEY
});

// Save subscription to database
await fetch('/api/push/subscribe', {
  method: 'POST',
  body: JSON.stringify(subscription)
});
```

### Gotchas to Watch For

1. **Alert Fatigue**
   - Too many alerts = users ignore all
   - Solution: Daily limits, priority scoring, quiet hours

2. **False Positives**
   - Alert triggers but deal is gone
   - Solution: Verify conditions before sending, cooldown period

3. **Performance**
   - Evaluating 1,000 rules every 5 minutes = slow
   - Solution: Index on is_active, batch processing

4. **Complex Condition Bugs**
   - Recursive evaluation can have edge cases
   - Solution: Comprehensive unit tests, dry-run testing

5. **Notification Delivery Failures**
   - Email bounces, push subscription expired
   - Solution: Retry logic, fallback to alternate method

6. **Time Zone Issues**
   - Quiet hours in user's local time
   - Solution: Store timezone in user preferences

## Status

- [ ] Research complete
- [ ] Database schema created
- [ ] Condition evaluation engine built
- [ ] Alert delivery integrations working
- [ ] Rule builder UI complete
- [ ] Push notifications configured
- [ ] Performance metrics tracking
- [ ] Testing complete
- [ ] Deployed to production

## Related Features

- **Depends On:**
  - [09] Price Alerts
  - [16] Investment Insights

- **Enhances:**
  - [10] Deal Feed (alert on new deals)

## References

- Web Push Notifications: https://web.dev/push-notifications-overview/
- IFTTT Rule Engine: https://ifttt.com/docs/api_reference
- Stock Alert Best Practices: https://www.webull.com/help/faq/983-How-do-I-set-a-Price-Alert
