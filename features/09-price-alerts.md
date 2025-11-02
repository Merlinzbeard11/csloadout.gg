# 09 - Basic Price Alerts

## Overview

Allow users to set price alerts for specific items across all marketplaces. When an item drops below the user's target price on any platform, they receive notifications via email and/or browser push.

**Value Prop:** "Get notified when your target items hit your price - never miss a deal"

## User Segments Served

- **Primary:** Deal Hunters (waiting for price drops)
- **Secondary:** Investors (buy-low opportunities)
- **Tertiary:** Casual Players (waiting for budget items to drop)

## User Stories / Use Cases

### As a Deal Hunter
- I want to set an alert "AWP | Atheris < $4" so I get notified when it's affordable
- I want alerts for multiple items across different platforms
- I want to see alert history (when prices hit my target)

### As an Investor
- I want to set alerts for bulk items "Danger Zone Case < $0.08" to buy 500 cases
- I want to compare alert triggers across platforms to identify arbitrage

### As a Casual Player
- I want alerts for my wishlist items when they go on sale
- I want email notifications (don't check site daily)

## Research & Context

### Price Alert Best Practices

From research on price tracking sites (CamelCamelCamel, Honey, etc.):

**User Expectations:**
- Instant notifications (<1 min after price drop)
- Choice of notification method (email, push, SMS)
- Alert history (track past triggers)
- One-click purchase from notification
- Temporary price spikes ignored (avoid false alerts)

**Common Issues:**
- False positives from temporary price glitches
- Spam if too many alerts
- Alerts fire but item out of stock
- User forgets about old alerts

### Notification Channels

| Channel | Delivery Speed | Open Rate | Cost | Implementation |
|---------|---------------|-----------|------|----------------|
| **Email** | 1-5 min | 20-30% | Free (SendGrid) | Easy |
| **Browser Push** | Instant | 40-50% | Free | Medium (service worker) |
| **SMS** | Instant | 95%+ | $$$ ($0.01/msg) | Medium (Twilio) |
| **Discord** | Instant | 60%+ | Free | Easy (webhook) |
| **Telegram** | Instant | 70%+ | Free | Easy (bot API) |

**MVP Decision:**
- Email (via SendGrid - 100 emails/day free)
- Browser Push (via Web Push API)
- Phase 2: Discord/Telegram webhooks

### Alert Triggering Strategy

**Simple Approach (MVP):**
```
Price check every 5 minutes (matches price sync frequency)
If current price <= user target price → trigger alert
```

**Smart Approach (Phase 2):**
```
- Ignore temporary spikes (price must stay low for 15+ min)
- Multi-platform coordination (alert only on best platform)
- Predictive alerts ("likely to hit your target in 24hrs")
```

## Technical Requirements

### Database Schema

```sql
-- Price alerts
CREATE TABLE price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),

  -- Alert conditions
  target_price DECIMAL(10,2) NOT NULL,
  platform VARCHAR(50),              -- NULL = any platform, or specific like 'csfloat'
  wear VARCHAR(20),                  -- NULL = any wear
  quality VARCHAR(20),               -- NULL = any quality

  -- Notification preferences
  notify_email BOOLEAN DEFAULT TRUE,
  notify_push BOOLEAN DEFAULT TRUE,
  notify_sms BOOLEAN DEFAULT FALSE,

  -- Alert status
  is_active BOOLEAN DEFAULT TRUE,
  triggered_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMP,
  expires_at TIMESTAMP,              -- Optional expiration

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT positive_price CHECK (target_price > 0)
);

CREATE INDEX idx_price_alerts_user ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_item ON price_alerts(item_id);
CREATE INDEX idx_price_alerts_active ON price_alerts(is_active);

-- Alert triggers history
CREATE TABLE alert_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES price_alerts(id) ON DELETE CASCADE,

  -- Trigger details
  triggered_at TIMESTAMP NOT NULL DEFAULT NOW(),
  triggered_price DECIMAL(10,2) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  listing_url TEXT,

  -- Notification status
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP,
  push_sent BOOLEAN DEFAULT FALSE,
  push_sent_at TIMESTAMP,

  -- User interaction
  clicked BOOLEAN DEFAULT FALSE,
  clicked_at TIMESTAMP,
  purchased BOOLEAN DEFAULT FALSE,  -- User-reported or tracked via affiliate
  purchased_at TIMESTAMP
);

CREATE INDEX idx_alert_triggers_alert ON alert_triggers(alert_id);
CREATE INDEX idx_alert_triggers_date ON alert_triggers(triggered_at);

-- User notification preferences
ALTER TABLE users
ADD COLUMN notification_email_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN notification_push_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN notification_frequency VARCHAR(20) DEFAULT 'instant'; -- 'instant', 'daily_digest', 'weekly_digest'
```

### Alert Checker Service (Background Job)

```typescript
// Runs every 5 minutes (coordinated with price sync)
class PriceAlertChecker {
  async checkAllAlerts() {
    // 1. Get all active alerts
    const alerts = await db.priceAlerts.findMany({
      where: { is_active: true },
      include: { user: true, item: true }
    });

    console.log(`Checking ${alerts.length} active price alerts...`);

    // 2. Batch fetch current prices for all alerted items
    const itemIds = [...new Set(alerts.map(a => a.item_id))];
    const currentPrices = await this.fetchCurrentPrices(itemIds);

    // 3. Check each alert
    for (const alert of alerts) {
      await this.checkAlert(alert, currentPrices);
    }
  }

  async checkAlert(alert: PriceAlert, currentPrices: Map<string, Price[]>) {
    const prices = currentPrices.get(alert.item_id);
    if (!prices || prices.length === 0) return;

    // Filter prices by alert criteria
    let relevantPrices = prices;

    if (alert.platform) {
      relevantPrices = prices.filter(p => p.platform === alert.platform);
    }
    if (alert.wear) {
      // TODO: Match wear if specified
    }

    // Find lowest price
    const lowestPrice = relevantPrices.sort((a, b) => a.total_cost - b.total_cost)[0];

    // Check if alert should trigger
    if (lowestPrice.total_cost <= alert.target_price) {
      await this.triggerAlert(alert, lowestPrice);
    }
  }

  async triggerAlert(alert: PriceAlert, price: Price) {
    // Check if already triggered recently (avoid spam)
    const recentTrigger = await db.alertTriggers.findFirst({
      where: {
        alert_id: alert.id,
        triggered_at: { gte: new Date(Date.now() - 60 * 60 * 1000) } // 1 hour
      }
    });

    if (recentTrigger) {
      console.log(`Alert ${alert.id} already triggered in last hour, skipping`);
      return;
    }

    // Create trigger record
    const trigger = await db.alertTriggers.create({
      data: {
        alert_id: alert.id,
        triggered_price: price.total_cost,
        platform: price.platform,
        listing_url: price.listing_url
      }
    });

    // Send notifications
    if (alert.notify_email && alert.user.notification_email_enabled) {
      await this.sendEmailNotification(alert, price, trigger.id);
    }

    if (alert.notify_push && alert.user.notification_push_enabled) {
      await this.sendPushNotification(alert, price, trigger.id);
    }

    // Update alert
    await db.priceAlerts.update({
      where: { id: alert.id },
      data: {
        triggered_count: { increment: 1 },
        last_triggered_at: new Date()
      }
    });

    console.log(`Alert triggered: ${alert.item.name} @ $${price.total_cost} on ${price.platform}`);
  }

  async sendEmailNotification(alert: PriceAlert, price: Price, triggerId: string) {
    const emailContent = {
      to: alert.user.email,
      subject: `🔔 Price Alert: ${alert.item.name} is now $${price.total_cost}`,
      html: `
        <h2>Your price alert triggered!</h2>
        <p><strong>${alert.item.name}</strong> is now available for <strong>$${price.total_cost}</strong> on ${price.platform}</p>
        <p>Your target price: $${alert.target_price}</p>
        <p>
          <a href="${price.listing_url}?ref=csloadout_alert_${triggerId}" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none;">
            Buy Now on ${price.platform}
          </a>
        </p>
        <p><small>Prices change frequently. Act fast!</small></p>
        <p><a href="https://csloadout.gg/alerts">Manage your alerts</a></p>
      `
    };

    await sendEmail(emailContent);

    await db.alertTriggers.update({
      where: { id: triggerId },
      data: { email_sent: true, email_sent_at: new Date() }
    });
  }

  async sendPushNotification(alert: PriceAlert, price: Price, triggerId: string) {
    // Web Push API implementation
    const payload = JSON.stringify({
      title: `Price Alert: ${alert.item.name}`,
      body: `Now $${price.total_cost} on ${price.platform} (target: $${alert.target_price})`,
      icon: alert.item.icon_url,
      badge: '/icons/badge-96x96.png',
      data: {
        url: `${price.listing_url}?ref=csloadout_alert_${triggerId}`,
        alertId: alert.id,
        triggerId: triggerId
      }
    });

    // Send to all user's subscribed devices
    const subscriptions = await db.pushSubscriptions.findMany({
      where: { user_id: alert.user_id }
    });

    for (const subscription of subscriptions) {
      await webpush.sendNotification(subscription, payload);
    }

    await db.alertTriggers.update({
      where: { id: triggerId },
      data: { push_sent: true, push_sent_at: new Date() }
    });
  }
}

// Cron job
cron.schedule('*/5 * * * *', async () => {
  const checker = new PriceAlertChecker();
  await checker.checkAllAlerts();
});
```

### API Endpoints

```typescript
// Create price alert
POST /api/alerts
Body: {
  itemId: "...",
  targetPrice: 8.50,
  platform: "csfloat",  // optional
  wear: "field_tested", // optional
  notifyEmail: true,
  notifyPush: true
}
Response: {
  alert: {
    id: "...",
    itemId: "...",
    itemName: "AK-47 | Redline (Field-Tested)",
    targetPrice: 8.50,
    currentPrice: 10.20,
    isActive: true,
    createdAt: "2025-11-02T16:00:00Z"
  }
}

// Get user's alerts
GET /api/alerts
Response: {
  alerts: [
    {
      id: "...",
      item: {...},
      targetPrice: 8.50,
      currentPrice: 10.20,
      difference: 1.70,
      isActive: true,
      triggeredCount: 3,
      lastTriggeredAt: "2025-11-01T14:23:00Z"
    },
    // ...
  ]
}

// Update alert
PATCH /api/alerts/:id
Body: {
  targetPrice: 8.00,  // Lower target
  isActive: false     // Pause alert
}

// Delete alert
DELETE /api/alerts/:id

// Get alert history (past triggers)
GET /api/alerts/:id/history
Response: {
  triggers: [
    {
      triggeredAt: "2025-11-01T14:23:00Z",
      price: 8.20,
      platform: "csfloat",
      clicked: true,
      purchased: false
    },
    // ...
  ]
}

// Register push subscription
POST /api/notifications/push/subscribe
Body: {
  subscription: {
    endpoint: "...",
    keys: {...}
  }
}
```

### Frontend Components

```typescript
// Alert Creation Modal
<CreateAlertModal item={item} onClose={handleClose}>
  <h2>Set Price Alert for {item.name}</h2>

  <div className="current-price">
    Current Price: ${item.lowestPrice}
  </div>

  <div className="form-group">
    <label>Target Price</label>
    <input
      type="number"
      step="0.01"
      value={targetPrice}
      onChange={(e) => setTargetPrice(e.target.value)}
      placeholder="e.g., 8.50"
    />
    <small>Alert me when price drops to or below this amount</small>
  </div>

  <div className="form-group">
    <label>Platform (optional)</label>
    <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
      <option value="">Any platform</option>
      <option value="csfloat">CSFloat only</option>
      <option value="buff163">Buff163 only</option>
      <option value="steam">Steam only</option>
    </select>
  </div>

  <div className="form-group">
    <label>Notification Method</label>
    <label>
      <input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} />
      Email me
    </label>
    <label>
      <input type="checkbox" checked={notifyPush} onChange={(e) => setNotifyPush(e.target.checked)} />
      Browser push notification
    </label>
  </div>

  <button onClick={handleCreate} disabled={!targetPrice}>
    Create Alert
  </button>
</CreateAlertModal>

// Alerts Management Page
<AlertsPage alerts={alerts}>
  <h1>My Price Alerts</h1>

  {alerts.length === 0 ? (
    <div className="empty-state">
      <p>No active alerts. Set alerts on items to get notified when prices drop.</p>
      <a href="/search">Browse Items</a>
    </div>
  ) : (
    <div className="alerts-list">
      {alerts.map(alert => (
        <AlertCard key={alert.id} alert={alert}>
          <div className="alert-item">
            <img src={alert.item.iconUrl} alt={alert.item.name} />
            <div className="alert-details">
              <h3>{alert.item.name}</h3>
              <div className="price-info">
                <span className="current">Current: ${alert.currentPrice}</span>
                <span className="target">Target: ${alert.targetPrice}</span>
                <span className={alert.difference > 0 ? 'difference-positive' : 'difference-negative'}>
                  {alert.difference > 0 ? `$${alert.difference} to go` : 'Target reached!'}
                </span>
              </div>
              {alert.lastTriggeredAt && (
                <div className="last-trigger">
                  Last triggered: {formatRelative(alert.lastTriggeredAt)}
                </div>
              )}
            </div>
            <div className="alert-actions">
              <button onClick={() => handleEdit(alert.id)}>Edit</button>
              <button onClick={() => handleToggle(alert.id)}>
                {alert.isActive ? 'Pause' : 'Resume'}
              </button>
              <button onClick={() => handleDelete(alert.id)}>Delete</button>
            </div>
          </div>
        </AlertCard>
      ))}
    </div>
  )}

  <div className="alert-stats">
    <div className="stat">
      <h4>Active Alerts</h4>
      <p>{alerts.filter(a => a.isActive).length}</p>
    </div>
    <div className="stat">
      <h4>Total Triggers</h4>
      <p>{alerts.reduce((sum, a) => sum + a.triggeredCount, 0)}</p>
    </div>
  </div>
</AlertsPage>

// Push Notification Permission Prompt
<PushPermissionPrompt>
  {!pushPermission && (
    <div className="push-prompt">
      <h3>🔔 Enable Push Notifications</h3>
      <p>Get instant alerts when your target prices are reached</p>
      <button onClick={handleRequestPermission}>
        Enable Notifications
      </button>
    </div>
  )}
</PushPermissionPrompt>
```

### Web Push Implementation

```typescript
// Service worker for push notifications
// public/sw.js
self.addEventListener('push', function(event) {
  const data = event.data.json();

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    data: data.data,
    actions: [
      { action: 'view', title: 'View Item' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Frontend push subscription
async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  });

  // Send subscription to server
  await fetch('/api/notifications/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription })
  });
}
```

## Success Metrics

- ✅ 20%+ users create at least one alert
- ✅ 3 alerts per user average
- ✅ <1 min notification delay (alert → user notified)
- ✅ 15%+ click-through rate (notification → purchase)
- ✅ <2% false positives (price glitches)

## Dependencies

### Must Have Before Starting
- [04] Price Aggregation (provides price data)
- [06] Steam Auth (identifies users)
- Email service (SendGrid)
- Push notification service (Web Push API)

### Blocks Other Features
None (self-contained feature)

## Effort Estimate

- **Development Time:** 1-2 weeks
- **Complexity:** Medium
- **Team Size:** 1 developer

**Breakdown:**
- Days 1-3: Database schema, alert checker service
- Days 4-6: Email notifications (SendGrid integration)
- Days 7-9: Push notifications (service worker, VAPID keys)
- Day 10: Frontend UI, testing

## Implementation Notes

### Email Service Setup (SendGrid)

```bash
# Install SendGrid
npm install @sendgrid/mail

# .env
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=alerts@csloadout.gg
```

```typescript
// lib/email.ts
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export async function sendEmail(options: EmailOptions) {
  await sgMail.send({
    to: options.to,
    from: process.env.SENDGRID_FROM_EMAIL!,
    subject: options.subject,
    html: options.html
  })
}
```

### VAPID Keys for Web Push

```bash
# Generate VAPID keys
npx web-push generate-vapid-keys

# .env
VAPID_PUBLIC_KEY=BG...
VAPID_PRIVATE_KEY=xxx
VAPID_SUBJECT=mailto:support@csloadout.gg
```

## Critical Gotchas & Production Issues

### 1. SendGrid Shared IP Reputation Degradation ⚠️ CRITICAL

**Problem:** SendGrid uses shared IPs where reputation degradation from other users directly affects your deliverability. When other clients send spam and users report emails, the reputation of the shared sender IP goes down, affecting ALL users on that IP. **Even with perfect SPF/DKIM setup, emails can still go to spam.**

**Impact:** 40%+ of price alert emails may land in spam folder, causing users to miss critical price drops and resulting in poor user experience, high unsubscribe rates, and lost revenue from missed purchases.

**Solution:**

```typescript
// Option 1: Dedicated IP ($79.95/month) for high-volume senders
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
sgMail.setIpPoolName('dedicated_pool');

// Option 2: IP Warm-up Strategy on Shared IPs
const warmUpSchedule = {
  day1: 100,    // Start low
  day2: 200,
  day3: 500,
  day7: 1000,
  day14: 5000,
  day30: 10000  // Gradually increase
};

// Option 3: Monitor deliverability metrics with Google Postmaster Tools
const deliverabilityMetrics = await sendgrid.getStats({
  start_date: '2025-11-01',
  end_date: '2025-11-02'
});

if (deliverabilityMetrics.spam_reports > 0.1) {
  // CRITICAL: Pause sending and investigate
  await pauseEmailCampaign();
  await notifyAdmin('High spam rate detected: ' + deliverabilityMetrics.spam_reports);
}

// Option 4: Consider alternative providers for transactional emails
// - Mailgun (better shared IP reputation management)
// - Amazon SES (dedicated IPs included, lower cost)
// - Postmark (transactional email specialist)
```

**Best Practices:**
- Start with IP warm-up: 100-200 emails/day, gradually increase over 30 days
- Monitor with Google Postmaster Tools for domain reputation
- Keep spam complaint rate below 0.1%
- Use authenticated sending domain (not sendgrid.net)
- For >100K emails/month: dedicated IP is cost-effective

**Sources:**
- Hello Inbox: "How to Fix SendGrid Emails Going to Spam"
- SendGrid Documentation: SPF/DKIM setup and deliverability
- Google Postmaster Tools: Domain reputation monitoring

---

### 2. VAPID Keys Required Despite "Voluntary" Name ⚠️ CRITICAL

**Problem:** VAPID (Voluntary Application Server Identification) keys are **NOT actually voluntary** - Chrome and Safari require them. If you try to subscribe to push notifications in Safari without VAPID keys, you will receive an error about missing `applicationServerKey`. Only Firefox doesn't require them.

**Impact:** Push subscription fails silently or with cryptic "permission denied" errors in 70%+ of browsers (Chrome + Safari market share), making browser push notifications completely non-functional.

**Solution:**

```bash
# Generate VAPID keys (run once)
npx web-push generate-vapid-keys

# Output:
# Public Key: BG...
# Private Key: xxx

# Add to .env
VAPID_PUBLIC_KEY=BG...
VAPID_PRIVATE_KEY=xxx
VAPID_SUBJECT=mailto:support@csloadout.gg
```

```typescript
// Server-side setup (REQUIRED)
import webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,      // mailto:support@csloadout.gg
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Client-side subscription (MUST include applicationServerKey)
const registration = await navigator.serviceWorker.ready;

const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true, // REQUIRED: silent push not supported
  applicationServerKey: urlBase64ToUint8Array(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY! // CRITICAL: Must provide
  )
});

// Utility function to convert base64 VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
}
```

**Browser Compatibility:**
- ✅ Chrome/Edge: VAPID keys REQUIRED
- ✅ Safari: VAPID keys REQUIRED
- ✅ Firefox: VAPID keys optional (but use anyway for consistency)

**Sources:**
- MDN Web Push API Documentation
- web-push library: https://github.com/web-push-libs/web-push
- Browser compatibility: caniuse.com/push-api

---

### 3. Push Subscription Expiration After 24+ Hours ⚠️ MAJOR

**Problem:** After at least 24 hours, you may get `InvalidSubscription` response (410 NotRegistered) when trying to send push notifications to already registered subscriptions. Subscriptions can expire if user clears browser data, revokes permission, or browser automatically expires them.

**Impact:** 30-50% of push subscriptions become stale over 90 days, resulting in failed notification attempts, wasted server resources, and database bloat from storing invalid subscriptions.

**Solution:**

```typescript
// Handle subscription expiration gracefully
async function sendPushNotification(subscription: PushSubscription, payload: any) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (error: any) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Subscription expired or invalid - REMOVE from database
      console.log('Subscription expired, removing from database');
      await db.pushSubscriptions.delete({
        where: { endpoint: subscription.endpoint }
      });
    } else if (error.statusCode === 429) {
      // Rate limited - retry with exponential backoff
      await retryWithBackoff(() =>
        webpush.sendNotification(subscription, JSON.stringify(payload))
      );
    } else {
      throw error; // Re-throw unknown errors
    }
  }
}

// Periodic cleanup of stale subscriptions (run daily)
async function cleanupStaleSubscriptions() {
  const subscriptions = await db.pushSubscriptions.findMany({
    where: {
      created_at: {
        lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days old
      }
    }
  });

  console.log(`Checking ${subscriptions.length} subscriptions for validity...`);

  for (const sub of subscriptions) {
    try {
      // Test subscription with minimal payload
      await webpush.sendNotification(sub, JSON.stringify({
        title: 'Test',
        body: 'Subscription validation',
        silent: true
      }));
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Invalid subscription - delete
        await db.pushSubscriptions.delete({ where: { id: sub.id } });
        console.log(`Removed expired subscription: ${sub.endpoint}`);
      }
    }
  }
}

// Schedule daily cleanup
cron.schedule('0 2 * * *', cleanupStaleSubscriptions); // 2 AM daily
```

**Best Practices:**
- Always handle 410/404 errors and remove invalid subscriptions
- Implement periodic cleanup (daily/weekly) to remove stale subscriptions
- Store subscription creation timestamp for age-based validation
- Re-prompt users to enable notifications when subscription expires
- Track subscription metrics (active vs total) to monitor health

**Sources:**
- Web Push Protocol Specification (RFC 8030)
- Browser push service documentation (FCM, APNs)

---

### 4. Horizontal Scaling Duplicate Execution ⚠️ CRITICAL

**Problem:** If multiple instances have the same cron job, it could fire simultaneously and execute the same task multiple times. In notification systems, this means **users receive duplicate alerts**. Example: price alert cron runs on 3 servers simultaneously, sends 3 identical emails to each user.

**Impact:** User receives 3x duplicate notifications for same alert, causing spam complaints, high unsubscribe rates, and poor user experience. In production: has caused actual duplicate charges when payment processing ran multiple times.

**Solution:**

```typescript
// Solution 1: Distributed Lock with Redis
import Redis from 'ioredis';
const redis = new Redis();

async function checkAlertsWithLock() {
  const lockKey = 'cron:price-alerts:lock';
  const lockValue = `${process.env.HOSTNAME}-${Date.now()}`;
  const lockTTL = 300; // 5 minutes

  // Try to acquire lock (NX = only set if not exists)
  const acquired = await redis.set(lockKey, lockValue, 'EX', lockTTL, 'NX');

  if (!acquired) {
    console.log('Another instance is running this job, skipping');
    return;
  }

  try {
    // Execute job - only runs on one instance
    await checkAllAlerts();
  } finally {
    // Release lock (only if we still own it)
    const currentValue = await redis.get(lockKey);
    if (currentValue === lockValue) {
      await redis.del(lockKey);
    }
  }
}

// Cron job with lock
cron.schedule('*/5 * * * *', checkAlertsWithLock);

// Solution 2: Use BullMQ for distributed job queue (RECOMMENDED)
import { Queue, Worker } from 'bullmq';

const alertQueue = new Queue('price-alerts', {
  connection: { host: 'redis', port: 6379 }
});

// Add repeating job (runs once across all instances)
await alertQueue.add('check-alerts', {}, {
  repeat: { pattern: '*/5 * * * *' } // Every 5 minutes
});

// Worker (can run on multiple instances safely)
const worker = new Worker('price-alerts', async (job) => {
  console.log('Processing job:', job.id);
  await checkAllAlerts();
}, {
  connection: { host: 'redis', port: 6379 },
  concurrency: 1 // Only one job at a time
});

// Solution 3: Vercel Cron (serverless, guaranteed single execution)
// vercel.json
{
  "crons": [{
    "path": "/api/cron/check-alerts",
    "schedule": "*/5 * * * *"
  }]
}

// api/cron/check-alerts.ts
export default async function handler(req: Request) {
  // Verify cron secret to prevent unauthorized access
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  await checkAllAlerts();
  return new Response('OK');
}
```

**Best Practices:**
- Use distributed locking (Redis SETNX) for traditional cron
- Prefer job queue systems (BullMQ, Agenda.js) for horizontal scaling
- Implement idempotency keys to prevent duplicate processing even with locks
- For serverless: use Vercel Cron or AWS EventBridge (single execution guarantee)
- Monitor job execution metrics to detect duplicate runs

**Sources:**
- Slack Engineering: "Executing Cron Scripts Reliably At Scale"
- Redis distributed locking: https://redis.io/docs/manual/patterns/distributed-locks/
- BullMQ documentation: https://docs.bullmq.io/

---

### 5. GDPR 30-Day Unsubscribe Processing Requirement ⚠️ CRITICAL

**Problem:** Under GDPR right to erasure, you have a **maximum of 30 days** to honor unsubscribe requests. However, best practice is **72 hours** with automatic suppression to prevent future mailings. Failure to comply can result in fines **up to €20 million or 4% of annual global revenue**, whichever is higher.

**Impact:** GDPR violations result in massive fines, legal liability, reputational damage, and potential class-action lawsuits. Even technical implementation errors (race conditions causing emails after unsubscribe) are compliance violations.

**Solution:**

```typescript
// Immediate unsubscribe handling (within seconds)
app.get('/unsubscribe/:token', async (req, res) => {
  const { token } = req.params;

  // Verify token and get user
  const user = await verifyUnsubscribeToken(token);

  if (!user) {
    return res.status(400).send('Invalid unsubscribe link');
  }

  // CRITICAL: Immediate suppression (prevent race conditions)
  await db.$transaction([
    // Disable all email alerts immediately
    db.priceAlerts.updateMany({
      where: { user_id: user.id },
      data: { notify_email: false }
    }),

    // Add to suppression list (PERMANENT)
    db.emailSuppressionList.create({
      data: {
        email: user.email,
        reason: 'user_unsubscribed',
        suppressed_at: new Date()
      }
    }),

    // Log for GDPR audit trail
    db.unsubscribeLog.create({
      data: {
        user_id: user.id,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        timestamp: new Date()
      }
    })
  ]);

  res.send(`
    <h1>You have been unsubscribed</h1>
    <p>No further emails will be sent to ${user.email}</p>
    <p><a href="/preferences/${user.id}">Manage preferences</a></p>
  `);
});

// CRITICAL: Check suppression before EVERY email send
async function sendAlertEmail(user: User, alert: Alert, price: Price) {
  // Step 1: Check suppression list FIRST
  const suppressed = await db.emailSuppressionList.findUnique({
    where: { email: user.email }
  });

  if (suppressed) {
    console.log(`User ${user.email} is suppressed, skipping email`);
    return; // MUST NOT send
  }

  // Step 2: Check user preferences
  if (!user.notification_email_enabled) {
    console.log(`User ${user.email} disabled email notifications`);
    return;
  }

  // Step 3: Proceed with sending
  const unsubscribeToken = generateUnsubscribeToken(user.id);

  await sendEmail({
    to: user.email,
    subject: `Price Alert: ${alert.item.name} now $${price.total_cost}`,
    html: `
      <p>Your alert triggered!</p>
      <p><strong>${alert.item.name}</strong> is now $${price.total_cost} on ${price.platform}</p>
      <a href="${price.listing_url}">Buy Now</a>

      <!-- GDPR REQUIRED: Unsubscribe link in EVERY email -->
      <p style="font-size: 12px; color: #666;">
        <a href="${process.env.APP_URL}/unsubscribe/${unsubscribeToken}">
          Unsubscribe from price alerts
        </a> |
        <a href="${process.env.APP_URL}/preferences/${user.id}">
          Manage preferences
        </a>
      </p>
    `
  });
}

// Preference center for granular control (GDPR best practice)
app.post('/preferences/:userId', async (req, res) => {
  const { userId } = req.params;
  const { emailFrequency, categories } = req.body;

  await db.users.update({
    where: { id: userId },
    data: {
      notification_frequency: emailFrequency,    // 'instant', 'daily_digest', 'weekly_digest'
      notification_categories: categories         // ['price_alerts', 'new_items', 'promotions']
    }
  });

  res.json({ success: true, message: 'Preferences updated' });
});
```

**GDPR Compliance Checklist:**
- ✅ Unsubscribe link in footer of EVERY email
- ✅ One-click unsubscribe (no login required)
- ✅ Process within 72 hours (immediate recommended)
- ✅ Suppression list to prevent race conditions
- ✅ Preference center for granular control
- ✅ Audit logging of all unsubscribe events
- ✅ Data export capability (GDPR Article 15)
- ✅ Right to be forgotten implementation

**Sources:**
- GDPR Regulations 2025: Right to Erasure (Article 17)
- Email Marketing Compliance Guide: enable.services
- GDPR and Marketing Complete Compliance Guide: secureprivacy.ai

---

### 6. Alert Fatigue - 30% Attention Decline Per Reminder ⚠️ MAJOR

**Problem:** Research shows that **every reminder after the initial alert decreases the recipient's attention by approximately 30%**. Notification fatigue can cause **40% productivity loss** from task switching. Users become desensitized to alerts due to high volume, leading to reduced responsiveness or outright disengagement.

**Impact:** Low notification engagement rates (<10% click-through), high unsubscribe rates (>20%), user complaints about spam, decreased conversion from alerts, and overall poor user experience.

**Solution:**

```typescript
// Implement intelligent alert frequency limits
async function shouldSendAlert(userId: string, itemId: string): Promise<boolean> {
  // 1. Check cooldown period (15 minutes minimum)
  const recentAlert = await db.alertTriggers.findFirst({
    where: {
      alert: { user_id: userId },
      item_id: itemId,
      triggered_at: { gte: new Date(Date.now() - 15 * 60 * 1000) }
    }
  });

  if (recentAlert) {
    console.log('Alert on cooldown (15 min), skipping');
    return false;
  }

  // 2. Check daily limit (3-5 alerts per day max)
  const todayCount = await db.alertTriggers.count({
    where: {
      alert: { user_id: userId },
      triggered_at: { gte: new Date(new Date().setHours(0,0,0,0)) }
    }
  });

  if (todayCount >= 5) {
    console.log('Daily alert limit reached (5 max), skipping');
    return false;
  }

  // 3. Check user preference for digest vs instant
  const user = await db.users.findUnique({ where: { id: userId } });

  if (user?.notification_frequency === 'daily_digest') {
    // Queue for daily digest instead of instant send
    await queueForDigest(userId, itemId);
    return false;
  }

  return true; // OK to send
}

// Batch notifications into daily/weekly digests
async function sendDailyDigest(userId: string) {
  const user = await db.users.findUnique({ where: { id: userId } });

  const alerts = await db.pendingDigestAlerts.findMany({
    where: { user_id: userId },
    include: { item: true, alert: true }
  });

  if (alerts.length === 0) return;

  // Consolidate into single email (reduces fatigue)
  await sendEmail({
    to: user.email,
    subject: `Daily Price Alert Summary: ${alerts.length} items reached your target price`,
    html: `
      <h2>Your Daily Price Alert Digest</h2>
      <p>${alerts.length} items have reached your target price in the last 24 hours:</p>

      ${alerts.map(alert => `
        <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0;">
          <h3>${alert.item.name}</h3>
          <p>
            <strong>Current Price:</strong> $${alert.triggered_price}
            <br>
            <strong>Your Target:</strong> $${alert.alert.target_price}
            <br>
            <strong>Savings:</strong> $${(alert.alert.target_price - alert.triggered_price).toFixed(2)}
          </p>
          <a href="${alert.listing_url}" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none;">
            View on ${alert.platform}
          </a>
        </div>
      `).join('')}

      <p><small>You're receiving daily digests. <a href="/preferences/${userId}">Change to instant alerts</a></small></p>
    `
  });

  // Clear pending alerts
  await db.pendingDigestAlerts.deleteMany({ where: { user_id: userId } });
}

// Smart timing with user activity patterns (ML-based)
async function getOptimalSendTime(userId: string): Promise<Date> {
  const userActivity = await db.userActivityLog.findMany({
    where: { user_id: userId },
    orderBy: { timestamp: 'desc' },
    take: 100
  });

  // Analyze when user is most active
  const hourCounts = new Array(24).fill(0);
  userActivity.forEach(activity => {
    hourCounts[new Date(activity.timestamp).getHours()]++;
  });

  const mostActiveHour = hourCounts.indexOf(Math.max(...hourCounts));

  // Schedule notification for user's most active hour
  const optimal = new Date();
  optimal.setHours(mostActiveHour, 0, 0, 0);

  if (optimal < new Date()) {
    optimal.setDate(optimal.getDate() + 1); // Tomorrow
  }

  return optimal;
}

// Prioritize critical vs non-critical alerts
async function sendPrioritizedAlert(alert: Alert, price: Price) {
  const savingsPercent = ((alert.target_price - price.total_cost) / alert.target_price) * 100;

  if (savingsPercent > 50) {
    // CRITICAL: >50% savings - send immediately via multiple channels
    await sendEmail(...);
    await sendPushNotification(...);
  } else if (savingsPercent > 20) {
    // MAJOR: >20% savings - send via preferred channel
    if (alert.notify_push) {
      await sendPushNotification(...);
    } else {
      await sendEmail(...);
    }
  } else {
    // MINOR: <20% savings - add to daily digest
    await queueForDigest(alert.user_id, alert.item_id);
  }
}
```

**Best Practices - Combating Alert Fatigue:**
1. **Limit frequency:** 3-5 alerts per session, 15-minute cooldown
2. **Batch notifications:** Daily/weekly digests for non-urgent alerts
3. **Smart timing:** ML-based optimal delivery time prediction
4. **Prioritize by severity:** Critical alerts instant, minor alerts batched
5. **User control:** Granular preference center (frequency, categories, channels)
6. **Multi-channel strategy:** Don't spam same alert across email + push + SMS
7. **Track engagement:** Monitor click-through rates, adjust frequency accordingly

**Sources:**
- Datadog: "Best Practices to Prevent Alert Fatigue"
- Better Stack: "Solving Noisy Alerts and Preventing Alert Fatigue"
- UX Research: 30% attention decline per reminder, 40% productivity loss

---

### 7. Price Glitches and False Positives ⚠️ MODERATE

**Problem:** APIs can return temporary price glitches ($0.01 for 1 second), causing false alert triggers and user frustration.

**Solution:**

```typescript
// Require price to stay low for 15+ minutes before triggering
async function checkAlert(alert: PriceAlert, currentPrice: number) {
  // Check if price qualifies
  if (currentPrice > alert.target_price) return;

  // Get price history for last 15 minutes
  const recentPrices = await db.priceHistory.findMany({
    where: {
      item_id: alert.item_id,
      platform: alert.platform,
      recorded_at: { gte: new Date(Date.now() - 15 * 60 * 1000) }
    },
    orderBy: { recorded_at: 'asc' }
  });

  // Verify price stability (must stay low for 15+ minutes)
  const allQualify = recentPrices.every(p => p.price <= alert.target_price);
  const sufficientHistory = recentPrices.length >= 3; // At least 3 data points

  if (allQualify && sufficientHistory) {
    await triggerAlert(alert, currentPrice);
  } else {
    console.log('Price unstable, waiting for confirmation');
  }
}
```

---

### 8. Stale Alerts and Database Bloat ⚠️ MODERATE

**Problem:** Users set alerts, forget about them, and item never reaches target price. Leads to database bloat and wasted processing.

**Solution:**

```typescript
// Auto-expire alerts after 90 days
async function cleanupStaleAlerts() {
  const staleAlerts = await db.priceAlerts.findMany({
    where: {
      is_active: true,
      created_at: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      triggered_count: 0 // Never triggered
    }
  });

  // Notify users before expiration
  for (const alert of staleAlerts) {
    await sendEmail({
      to: alert.user.email,
      subject: 'Your price alert is expiring soon',
      html: `
        <p>Your alert for <strong>${alert.item.name}</strong> at $${alert.target_price}
        has not triggered in 90 days and will expire in 7 days.</p>
        <p>Current price: $${alert.item.current_price}</p>
        <a href="/alerts/${alert.id}/renew">Renew Alert</a>
      `
    });
  }

  // Auto-disable after 97 days (7 day warning period)
  await db.priceAlerts.updateMany({
    where: {
      is_active: true,
      created_at: { lt: new Date(Date.now() - 97 * 24 * 60 * 60 * 1000) }
    },
    data: { is_active: false }
  });
}
```

---

### 9. N+1 Query Problem in Alert Checking ⚠️ CRITICAL (Database)

**Problem:** Alert systems commonly suffer from N+1 queries: one query fetches all active alerts, then N additional queries fetch user/item data for each alert in a loop. For 10,000 active alerts, this results in **10,001 database queries** instead of 1-2 optimized queries. Performance impact: alert checking takes 10-30 seconds instead of sub-second.

**Impact:** Massive database load, slow alert checking (10-30s), thousands of unnecessary queries, high CPU usage, potential timeout failures causing alerts to never trigger.

**Solution:**

```typescript
// ❌ WRONG: N+1 queries (1 + 2N queries)
const alerts = await db.priceAlerts.findMany({
  where: { is_active: true }
});

for (const alert of alerts) {
  const user = await db.users.findUnique({ where: { id: alert.user_id } }); // N queries
  const item = await db.items.findUnique({ where: { id: alert.item_id } });  // N queries
  await checkAlert(alert, user, item);
}
// Total: 1 + 20,000 queries for 10K alerts = 10,001 queries

// ✅ CORRECT: Single query with eager loading (1 query)
const alerts = await db.priceAlerts.findMany({
  where: { is_active: true },
  include: {
    user: {
      select: {
        id: true,
        email: true,
        notification_email_enabled: true,
        notification_push_enabled: true
      }
    },
    item: {
      include: {
        prices: {
          where: {
            recorded_at: { gte: new Date(Date.now() - 15 * 60 * 1000) }
          }
        }
      }
    }
  }
});

for (const alert of alerts) {
  await checkAlert(alert, alert.user, alert.item);
}
// Total: 1 query (10,000x fewer queries)

// ✅ ALTERNATIVE: Raw SQL with explicit joins
const alerts = await db.$queryRaw<Alert[]>`
  SELECT
    a.*,
    u.email, u.notification_email_enabled,
    i.name, i.current_price,
    ARRAY_AGG(p.*) as recent_prices
  FROM price_alerts a
  INNER JOIN users u ON u.id = a.user_id
  INNER JOIN items i ON i.id = a.item_id
  LEFT JOIN prices p ON p.item_id = i.id
    AND p.recorded_at >= NOW() - INTERVAL '15 minutes'
  WHERE a.is_active = true
  GROUP BY a.id, u.id, i.id
`;
```

**Monitoring:**
Use APM tools (Datadog, New Relic, Sentry) that auto-detect N+1 problems and send alerts.

**Sources:**
- PlanetScale: "What is the N+1 Query Problem"
- Sentry: N+1 Queries Performance Issues Documentation

---

### 10. Missing BRIN Index on Time-Series Price Data ⚠️ MAJOR (Database)

**Problem:** B-tree indexes on `price_history` tables grow massive (10GB+ for millions of rows) and slow down inserts. BRIN (Block Range Index) is specifically designed for time-series data, **reduces index size by 99%**, and improves insert performance while maintaining query speed for range queries.

**Impact:** Massive index size (10GB+), slow insert performance, disk space exhaustion, index bloat over time, eventually degraded query performance.

**Solution:**

```sql
-- ❌ WRONG: B-tree index on time-series column (10GB for 100M rows)
CREATE INDEX idx_price_history_timestamp
ON price_history (recorded_at);

-- ✅ CORRECT: BRIN index for time-series data (100MB for 100M rows)
CREATE INDEX idx_price_history_timestamp_brin
ON price_history USING BRIN (recorded_at)
WITH (pages_per_range = 128);

-- Query performance comparison
EXPLAIN ANALYZE
SELECT * FROM price_history
WHERE recorded_at >= NOW() - INTERVAL '15 minutes'
  AND item_id = '123';
-- BRIN: 0.04ms (99% less storage)
-- B-tree: 0.05ms (marginal speed difference, massive storage cost)

-- Composite index for alert system queries
CREATE INDEX idx_price_history_item_time_brin
ON price_history USING BRIN (item_id, recorded_at)
WITH (pages_per_range = 128);

-- Partial B-tree for recent data (hot data), BRIN for historical
CREATE INDEX idx_price_history_recent
ON price_history (item_id, recorded_at)
WHERE recorded_at >= NOW() - INTERVAL '1 hour';

CREATE INDEX idx_price_history_historical_brin
ON price_history USING BRIN (recorded_at)
WHERE recorded_at < NOW() - INTERVAL '1 hour';
```

**When to Use BRIN:**
- ✅ Time-series data (timestamps, sequential IDs)
- ✅ Data naturally ordered on disk
- ✅ Large tables (100M+ rows)
- ✅ Append-only or mostly append workloads
- ❌ Random access patterns
- ❌ Frequent updates to old data

**Sources:**
- PostgreSQL Documentation: BRIN Indexes
- Alibaba Cloud: PostgreSQL Time-Series Best Practices (Stock Exchange)

---

### 11. Connection Pool Exhaustion in Cron Jobs ⚠️ MAJOR (Database)

**Problem:** Cron jobs checking thousands of alerts can exhaust database connection pool if not properly managed. Each alert check may open new connection, leading to **'too many clients'** errors. Default PostgreSQL `max_connections` is 100, easily exceeded by parallel alert processing.

**Impact:** Complete system failure with "too many clients" errors, cron jobs failing intermittently, database refusing new connections, cascading failures across services.

**Solution:**

```typescript
// ❌ WRONG: Opening new connection per alert (exhausts pool)
async function checkAllAlerts() {
  const alerts = await db.priceAlerts.findMany({ where: { is_active: true } });

  await Promise.all(alerts.map(async (alert) => {
    const prisma = new PrismaClient(); // NEW connection per alert!
    await checkSingleAlert(prisma, alert);
    await prisma.$disconnect();
  }));
  // With 10,000 alerts: opens 10,000 connections simultaneously = CRASH
}

// ✅ CORRECT: Reuse connection pool with batching
async function checkAllAlerts() {
  const alerts = await db.priceAlerts.findMany({
    where: { is_active: true }
  });

  // Process in batches to control concurrency
  const BATCH_SIZE = 100;
  for (let i = 0; i < alerts.length; i += BATCH_SIZE) {
    const batch = alerts.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(alert =>
      checkSingleAlert(db, alert) // Reuse shared connection pool
    ));
  }

  console.log(`Processed ${alerts.length} alerts using connection pool`);
}

// ✅ Configure Prisma connection pool properly
// lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma || new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

// Singleton pattern: reuse same client
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ✅ Use PgBouncer for connection pooling (100 real → 10,000 virtual)
# pgbouncer.ini
[databases]
csloadout = host=localhost port=5432 dbname=csloadout

[pgbouncer]
pool_mode = transaction
max_client_conn = 10000
default_pool_size = 100
reserve_pool_size = 25

// Update DATABASE_URL to use PgBouncer
DATABASE_URL="postgresql://user:pass@localhost:6432/csloadout"
```

**Alternative: pg_cron Background Workers (No Connections)**

```sql
-- postgresql.conf
cron.use_background_workers = on
max_worker_processes = 20  -- Increase from default 8

-- pg_cron uses background workers instead of connections
SELECT cron.schedule('check-alerts', '*/5 * * * *',
  'SELECT check_all_alerts()'
);
-- No connection overhead, runs inside PostgreSQL process
```

**Sources:**
- PostgreSQL Documentation: Connection Pooling
- PgBouncer Documentation
- Prisma: Connection Management Best Practices

---

### 12. PostgreSQL LISTEN/NOTIFY Global Lock ⚠️ CRITICAL (Database)

**Problem:** When `NOTIFY` is issued during a transaction, it acquires a **global lock on the entire database** during the commit phase, effectively serializing ALL commits. Under high concurrent write load, this results in immense database load and potential downtime.

**Impact:** Database commit slowdown (5ms → 30s), lock contention spikes, transaction timeouts, system-wide performance degradation, potential complete database lockup.

**Solution:**

```typescript
// ❌ WRONG: NOTIFY inside transaction (global lock!)
await db.$transaction(async (tx) => {
  await tx.priceAlerts.update({
    where: { id: alertId },
    data: { triggered_count: { increment: 1 } }
  });

  // CRITICAL: Acquires global lock, serializes ALL transactions
  await tx.$executeRaw`NOTIFY price_alert_triggered, ${JSON.stringify({ alertId })}`;
});

// ✅ CORRECT: Use job queue instead of LISTEN/NOTIFY
import { Queue } from 'bullmq';

const alertQueue = new Queue('price-alerts', {
  connection: { host: 'redis', port: 6379 }
});

// Publish to queue (no global lock, distributed)
await alertQueue.add('alert-triggered', {
  alertId: alertId,
  price: currentPrice
}, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  }
});

// Worker processes queue
const worker = new Worker('price-alerts', async (job) => {
  await sendAlertNotification(job.data.alertId, job.data.price);
}, {
  connection: { host: 'redis', port: 6379 }
});

// ✅ ALTERNATIVE: NOTIFY outside transaction if you must use it
await db.priceAlerts.update({
  where: { id: alertId },
  data: { triggered_count: { increment: 1 } }
});

// Call NOTIFY AFTER commit (no global lock during transaction)
await db.$executeRaw`NOTIFY price_alert_triggered, ${JSON.stringify({ alertId })}`;
```

**LISTEN/NOTIFY Limitations:**
- ❌ Global lock during transaction commit
- ❌ 8000-byte payload limit
- ❌ Ephemeral delivery (no guarantee, lost if listener disconnected)
- ❌ No built-in retry or dead-letter queue
- ❌ Difficult with connection pooling

**Recommended Alternatives:**
- ✅ BullMQ (Redis-based job queue)
- ✅ Redis Pub/Sub (if ephemeral OK)
- ✅ Kafka (enterprise, guaranteed delivery)
- ✅ pg-boss (job queue in PostgreSQL without LISTEN/NOTIFY)

**Sources:**
- PostgreSQL Documentation: LISTEN/NOTIFY
- GitHub: pg-boss (PostgreSQL job queue)
- Production incident reports: NOTIFY global lock issues

## Best Business Practices & Industry Standards

### 1. Notification Channel Effectiveness and Cost Analysis

**Industry Benchmarks:**

| Channel | Open Rate | Delivery Speed | Cost | Best Use Case |
|---------|-----------|----------------|------|---------------|
| **Email** | 20-30% | 1-5 min | Free (SendGrid 100/day) | Non-urgent, detailed information |
| **Browser Push** | 40-50% | Instant | Free | Instant alerts, high engagement |
| **SMS** | 95%+ | Instant | $0.01/msg | Critical alerts only |
| **Discord** | 60-70% | Instant | Free | Community-focused users |
| **Telegram** | 70%+ | Instant | Free | International users |

**MVP Recommendation:** Email + Browser Push provides best cost/effectiveness ratio.

**Cost Projections:**
- 10,000 users, 3 alerts/user/month = 30,000 notifications
- Email: $0 (within SendGrid free tier)
- Push: $0 (free)
- SMS: $300/month (prohibitively expensive for non-critical alerts)

**Implementation Priority:**
1. **Phase 1:** Email (SendGrid) + Browser Push (Web Push API)
2. **Phase 2:** Discord/Telegram webhooks (free channels for engaged users)
3. **Phase 3:** SMS (premium users only, critical alerts)

**Sources:**
- Email marketing benchmarks: Mailchimp, Campaign Monitor
- Push notification engagement: OneSignal, Pusher
- SMS pricing: Twilio, MessageBird

---

### 2. Alert Frequency Optimization Strategy

**Research-Backed Approach:**

Every reminder after initial alert decreases attention by 30%. Optimal frequency:
- **Instant alerts:** 3-5 per day maximum
- **Cooldown period:** 15 minutes minimum between same-item alerts
- **Digest option:** Daily summary for non-urgent alerts
- **Smart timing:** ML-based delivery time prediction

**User Segmentation:**
- **Power users** (investors, traders): Instant alerts, high frequency tolerance
- **Casual users** (deal hunters): Daily digest preferred
- **Inactive users** (low engagement): Weekly summary or disable

**Implementation:**

```typescript
const alertFrequencyRules = {
  power_user: {
    max_daily: 20,
    cooldown_minutes: 5,
    channels: ['email', 'push', 'sms']
  },
  casual_user: {
    max_daily: 5,
    cooldown_minutes: 15,
    channels: ['email', 'push'],
    prefer_digest: true
  },
  inactive_user: {
    max_daily: 1,
    cooldown_minutes: 60,
    channels: ['email'],
    force_digest: true
  }
};
```

**Sources:**
- Datadog: Alert fatigue prevention best practices
- UX Research: Notification timing and frequency guidelines

---

### 3. GDPR Compliance and Privacy Best Practices

**Mandatory Requirements (2025):**

1. **Unsubscribe Processing:**
   - Maximum: 30 days (GDPR legal requirement)
   - Best practice: Immediate (<1 minute)
   - Recommended: 72 hours with automatic suppression

2. **Consent Management:**
   - Explicit opt-in for marketing emails
   - Double opt-in verification recommended
   - Granular preferences (frequency, categories, channels)
   - Easy withdrawal (one-click unsubscribe)

3. **Data Retention:**
   - Store only necessary data (email, alert preferences)
   - Delete user data upon request (Right to Erasure)
   - Provide data export (Right to Access - Article 15)
   - Audit logging for compliance verification

4. **Penalty Risk:**
   - Up to €20 million or 4% annual global revenue
   - Recent enforcement: €50K fine for 7-day unsubscribe delay

**Preference Center Best Practice:**

```typescript
// Granular control reduces unsubscribes
interface UserPreferences {
  notification_frequency: 'instant' | 'hourly' | 'daily_digest' | 'weekly_digest';
  notification_categories: string[];  // ['price_alerts', 'new_items', 'promotions']
  notification_channels: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  quiet_hours: {
    start: string; // '22:00'
    end: string;   // '08:00'
  };
}
```

**Sources:**
- GDPR Regulations: Articles 15, 17 (Right to Access, Right to Erasure)
- Email Marketing Compliance Guide 2025: enable.services
- GDPR and Marketing: secureprivacy.ai

---

### 4. Distributed System Reliability for Background Jobs

**Industry Standard: Job Queue Systems Over Cron**

For horizontally scaled systems, use job queue instead of traditional cron:

**Why Job Queues Win:**
- ✅ Guaranteed single execution across instances
- ✅ Built-in retry logic with exponential backoff
- ✅ Job prioritization and rate limiting
- ✅ Dead letter queues for failed jobs
- ✅ Monitoring and observability

**Recommended Solutions:**
1. **BullMQ** (Redis-based, best for Node.js)
   - Supports delayed jobs, repeating jobs, job priorities
   - Built-in UI for monitoring
   - Automatic retry with exponential backoff

2. **Vercel Cron** (serverless, best for Next.js)
   - Guaranteed single execution
   - No infrastructure management
   - Simple configuration

3. **AWS EventBridge** (enterprise, best for multi-cloud)
   - Managed service, highly reliable
   - Integrates with Lambda, SQS, etc.

**Comparison:**

| Solution | Complexity | Cost | Reliability | Best For |
|----------|------------|------|-------------|----------|
| BullMQ | Medium | Free (Redis cost) | High | Self-hosted, Node.js |
| Vercel Cron | Low | Free (Hobby), $20/mo (Pro) | Very High | Next.js on Vercel |
| AWS EventBridge | Medium | Pay-per-invocation | Very High | Enterprise, AWS ecosystem |
| Traditional Cron + Redis Lock | High | Free | Medium | Existing infra |

**Sources:**
- Slack Engineering: "Executing Cron Scripts Reliably At Scale"
- BullMQ documentation: https://docs.bullmq.io/
- AWS EventBridge: Serverless cron patterns

---

### 5. Email Deliverability Optimization

**SPF/DKIM/DMARC Setup (Mandatory):**

```dns
; SPF Record (Sender Policy Framework)
csloadout.gg. TXT "v=spf1 include:sendgrid.net ~all"

; DKIM Record (DomainKeys Identified Mail)
s1._domainkey.csloadout.gg. TXT "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA..."

; DMARC Record (Domain-based Message Authentication)
_dmarc.csloadout.gg. TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@csloadout.gg"
```

**DNS Propagation Warning:** 48-72 hours for full propagation. Test deliverability before full rollout.

**IP Warm-up Strategy (Critical for Shared IPs):**

| Day | Volume | Cumulative |
|-----|--------|------------|
| 1 | 100 | 100 |
| 2 | 200 | 300 |
| 3 | 500 | 800 |
| 7 | 1,000 | ~5,000 |
| 14 | 5,000 | ~50,000 |
| 30 | 10,000+ | Full volume |

**Monitoring with Google Postmaster Tools:**
- Domain reputation score
- Spam complaint rate (keep below 0.1%)
- IP reputation
- Authentication rates (SPF/DKIM pass rate)

**When to Use Dedicated IP:**
- Sending >100,000 emails/month
- Transactional emails (price alerts are transactional)
- Need full control over IP reputation
- Cost: $79.95/month (SendGrid)

**Sources:**
- SendGrid: SPF/DKIM Setup Guide
- Google Postmaster Tools: Domain reputation monitoring
- DMARCLY: Email authentication best practices

## Authoritative Documentation & Sources

### Official Documentation

1. **SendGrid Email Deliverability**
   - Source: SendGrid Documentation
   - URL: https://docs.sendgrid.com/ui/account-and-settings/spf-dkim
   - Coverage: SPF/DKIM setup, email authentication, deliverability best practices

2. **Web Push API Specification**
   - Source: MDN Web Docs
   - URL: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
   - Coverage: Push notification protocol, service workers, VAPID keys

3. **VAPID Key Generation**
   - Source: web-push library (GitHub)
   - URL: https://github.com/web-push-libs/web-push
   - Coverage: Generating VAPID keys, Push notification implementation

4. **GDPR Regulations 2025**
   - Source: GDPR Official Text
   - Coverage: Articles 15 (Right to Access), 17 (Right to Erasure), email consent requirements

### Industry Best Practices

5. **Email Deliverability Troubleshooting**
   - Source: Hello Inbox Blog
   - URL: https://www.helloinbox.email/blog/how-to-fix-sendgrid-emails-going-to-spam/
   - Coverage: SendGrid spam folder issues, shared IP reputation, authentication

6. **Alert Fatigue Prevention**
   - Source: Datadog
   - URL: https://www.datadoghq.com/blog/best-practices-to-prevent-alert-fatigue/
   - Coverage: Alert frequency optimization, 30% attention decline research, prioritization strategies

7. **Notification Fatigue UX Research**
   - Source: Better Stack Community
   - URL: https://betterstack.com/community/guides/monitoring/best-practices-alert-fatigue/
   - Coverage: User engagement patterns, notification batching, smart timing

8. **GDPR Email Compliance Guide**
   - Source: enable.services
   - URL: https://www.enable.services/2025/02/12/a-guide-to-the-unsubscribe-option-on-your-emails-gdpr-best-practices/
   - Coverage: Unsubscribe requirements, preference centers, consent management, 2025 updates

### Technical Implementation

9. **Distributed Cron at Scale**
   - Source: Slack Engineering Blog
   - URL: https://slack.engineering/executing-cron-scripts-reliably-at-scale/
   - Coverage: Distributed locking, job queue systems, horizontal scaling challenges

10. **BullMQ Documentation**
    - Source: BullMQ Official Docs
    - URL: https://docs.bullmq.io/
    - Coverage: Redis-based job queues, repeating jobs, retry logic, distributed execution

11. **Google Postmaster Tools**
    - Source: Google
    - URL: https://postmaster.google.com/
    - Coverage: Domain reputation monitoring, spam rate tracking, deliverability metrics

12. **Web Push Protocol (RFC 8030)**
    - Source: IETF
    - URL: https://datatracker.ietf.org/doc/html/rfc8030
    - Coverage: Push service protocol, subscription expiration, error handling

### Pricing and Cost Analysis

13. **SendGrid Pricing**
    - Free tier: 100 emails/day
    - Dedicated IP: $79.95/month
    - URL: https://sendgrid.com/pricing/

14. **Twilio SMS Pricing**
    - Cost: $0.0079/SMS (US)
    - URL: https://www.twilio.com/pricing/messaging

15. **Vercel Cron**
    - Free on Hobby plan
    - Guaranteed single execution
    - URL: https://vercel.com/docs/cron-jobs

## Status

- [x] Research complete (gotchas, best practices, authoritative sources documented)
- [x] Gotchas documented (12 critical issues: 8 general + 4 database-specific)
- [x] Best practices captured (6 industry standards documented)
- [x] Authoritative sources documented (15 official/industry sources)
- [ ] Database schema created
- [ ] Alert checker service implemented
- [ ] Email notifications configured
- [ ] Push notifications configured
- [ ] Frontend UI built
- [ ] Testing complete
- [ ] Deployed to production

## Related Features

- **Depends On:**
  - [04] Price Aggregation
  - [06] Steam Auth

- **Enables:**
  - [17] Advanced Deal Alerts (builds on basic alerts)

## References

- SendGrid Docs: https://docs.sendgrid.com/
- Web Push API: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- VAPID Keys: https://github.com/web-push-libs/web-push
