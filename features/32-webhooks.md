# Feature 32: Webhooks

## Overview
Real-time webhook system enabling third-party applications to receive instant notifications when events occur (price changes, new crafts, inventory updates, pattern discoveries). Provides reliable event delivery with retry logic, signature verification, and event filtering. Complements Public API (Feature 31) by enabling push-based integrations instead of polling.

## User Segments
- **Primary**: Developers, API Consumers, Trading Bots
- **Secondary**: Third-Party Apps, Automation Services
- **Tertiary**: Enterprise Clients, Market Analysts

## User Stories

### As a Developer
- I want to receive webhook notifications when item prices change significantly
- I want to validate webhook authenticity using signature verification
- I want to filter events to only receive notifications for specific items
- I want to test webhook delivery in sandbox environment
- I want to see webhook delivery history and retry attempts

### As a Trading Bot
- I want real-time price alerts without polling API constantly
- I want to receive inventory update notifications for my tracked accounts
- I want reliable delivery with automatic retries on failure
- I want to process high-volume events efficiently

### As a Third-Party App
- I want to notify users when their crafts receive likes/comments
- I want to display real-time market trends in dashboard
- I want to receive pattern discovery notifications
- I want to integrate webhooks with my existing infrastructure

### As the Platform
- I want to reduce API polling load by providing push notifications
- I want to monetize webhook usage (volume-based pricing)
- I want to track webhook delivery success rates
- I want to prevent abuse with rate limiting and validation

## Research & Context

### Webhook Best Practices

1. **Event Types**
   - `price.updated` - Item price changed
   - `price.threshold` - Price crossed user-defined threshold
   - `craft.created` - New craft published
   - `craft.liked` - Craft received like
   - `craft.commented` - Craft received comment
   - `inventory.added` - Item added to tracked inventory
   - `inventory.removed` - Item removed from tracked inventory
   - `pattern.discovered` - New pattern registered
   - `sticker.price_change` - Sticker price significant change
   - `loadout.shared` - Loadout created or updated
   - `user.followed` - User followed another user

2. **Delivery Guarantees**
   - At-least-once delivery (may receive duplicates)
   - Retry with exponential backoff (5 attempts)
   - Event ordering not guaranteed
   - Idempotency recommended on receiver side

3. **Security**
   - HMAC-SHA256 signature verification
   - HTTPS-only endpoints
   - IP whitelisting optional
   - Signature in `X-Webhook-Signature` header

4. **Payload Format**
   - JSON body with standard envelope
   - Event ID for deduplication
   - Timestamp for ordering
   - Event type for routing
   - Data payload (event-specific)

5. **Rate Limiting**
   - **Free Tier**: 10,000 events/month
   - **Pro Tier**: 500,000 events/month ($49/month)
   - **Enterprise**: Unlimited

### Competitor Webhooks

- **Stripe Webhooks**: Industry gold standard, reliable delivery, great docs
- **GitHub Webhooks**: Event filtering, signature verification, detailed payloads
- **Discord Webhooks**: Simple, flexible, rate limited
- **Opportunity**: First CS2 market platform with comprehensive webhook system

## Technical Requirements

### Database Schema

```sql
-- Webhook endpoints
CREATE TABLE webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Endpoint details
  url VARCHAR(2083) NOT NULL, -- HTTPS URL
  secret VARCHAR(100) NOT NULL, -- For HMAC signature
  description VARCHAR(500),

  -- Event filtering
  enabled_events VARCHAR(50)[] NOT NULL, -- ['price.updated', 'craft.created']

  -- Optional filters
  filters JSONB DEFAULT '{}', -- { "min_price": 100, "items": ["AWP | Dragon Lore"] }

  -- Rate limiting
  events_per_month_limit INTEGER DEFAULT 10000,
  events_this_month INTEGER DEFAULT 0,
  month_reset_date DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE),

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,

  -- Reliability
  failure_count INTEGER DEFAULT 0, -- Consecutive failures
  disabled_at TIMESTAMPTZ, -- Auto-disabled after 10 failures

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_webhook_endpoints_user_id (user_id),
  INDEX idx_webhook_endpoints_events (enabled_events USING GIN)
);

-- Webhook delivery logs
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,

  -- Event details
  event_id UUID NOT NULL, -- Unique event ID for deduplication
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,

  -- Delivery attempt
  attempt_number INTEGER NOT NULL DEFAULT 1, -- 1-5
  http_status_code INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,

  -- Status
  status VARCHAR(50) NOT NULL, -- 'pending', 'delivered', 'failed', 'retrying'
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,

  INDEX idx_webhook_deliveries_endpoint_id (webhook_endpoint_id, created_at DESC),
  INDEX idx_webhook_deliveries_event_id (event_id),
  INDEX idx_webhook_deliveries_status (status, next_retry_at)
);

-- Webhook event queue (for processing)
CREATE TABLE webhook_event_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,

  -- Processing
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  processed_at TIMESTAMPTZ,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_webhook_queue_status (status, created_at)
);
```

### Services

#### `src/services/WebhookService.ts`

```typescript
import { db } from '@/lib/db';
import crypto from 'crypto';
import axios from 'axios';

export class WebhookService {
  /**
   * Register webhook endpoint
   */
  async registerWebhook(userId: string, url: string, events: string[], description?: string, filters?: any): Promise<any> {
    // Validate URL (must be HTTPS)
    if (!url.startsWith('https://')) {
      throw new Error('Webhook URL must use HTTPS');
    }

    // Generate secret for HMAC signatures
    const secret = crypto.randomBytes(32).toString('hex');

    // Create webhook endpoint
    const webhook = await db.webhook_endpoints.create({
      data: {
        user_id: userId,
        url,
        secret,
        description,
        enabled_events: events,
        filters: filters || {},
      },
    });

    return {
      id: webhook.id,
      url: webhook.url,
      secret: webhook.secret, // Return once, user must store securely
      enabled_events: webhook.enabled_events,
    };
  }

  /**
   * Trigger webhook event
   */
  async triggerEvent(eventType: string, payload: any): Promise<void> {
    // Add to event queue for processing
    await db.webhook_event_queue.create({
      data: {
        event_type: eventType,
        payload,
      },
    });

    // Process asynchronously (don't block caller)
    setImmediate(() => this.processEventQueue());
  }

  /**
   * Process webhook event queue
   */
  private async processEventQueue(): Promise<void> {
    // Get pending events
    const events = await db.webhook_event_queue.findMany({
      where: { status: 'pending' },
      orderBy: { created_at: 'asc' },
      take: 100, // Batch size
    });

    for (const event of events) {
      await this.processEvent(event);
    }
  }

  /**
   * Process single event
   */
  private async processEvent(event: any): Promise<void> {
    try {
      // Mark as processing
      await db.webhook_event_queue.update({
        where: { id: event.id },
        data: { status: 'processing' },
      });

      // Find matching webhook endpoints
      const webhooks = await db.webhook_endpoints.findMany({
        where: {
          is_active: true,
          enabled_events: { has: event.event_type },
        },
      });

      // Deliver to each endpoint
      for (const webhook of webhooks) {
        // Check if filters match
        if (!this.matchesFilters(event.payload, webhook.filters)) {
          continue;
        }

        // Check rate limit
        const withinLimit = await this.checkRateLimit(webhook.id);
        if (!withinLimit) {
          console.log(`Webhook ${webhook.id} exceeded rate limit`);
          continue;
        }

        // Create delivery record
        const eventId = crypto.randomUUID();
        await this.deliverWebhook(webhook, event.event_type, event.payload, eventId);
      }

      // Mark event as completed
      await db.webhook_event_queue.update({
        where: { id: event.id },
        data: { status: 'completed', processed_at: new Date() },
      });
    } catch (error: any) {
      // Mark event as failed
      await db.webhook_event_queue.update({
        where: { id: event.id },
        data: { status: 'failed', error_message: error.message },
      });
    }
  }

  /**
   * Deliver webhook to endpoint
   */
  private async deliverWebhook(webhook: any, eventType: string, payload: any, eventId: string, attemptNumber: number = 1): Promise<void> {
    const startTime = Date.now();

    // Create delivery record
    const delivery = await db.webhook_deliveries.create({
      data: {
        webhook_endpoint_id: webhook.id,
        event_id: eventId,
        event_type: eventType,
        payload,
        attempt_number: attemptNumber,
        status: 'pending',
      },
    });

    try {
      // Build payload envelope
      const webhookPayload = {
        id: eventId,
        type: eventType,
        created_at: new Date().toISOString(),
        data: payload,
      };

      // Generate HMAC signature
      const signature = this.generateSignature(webhookPayload, webhook.secret);

      // Send HTTP POST
      const response = await axios.post(webhook.url, webhookPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event-Type': eventType,
          'X-Webhook-Delivery-ID': delivery.id,
        },
        timeout: 10000, // 10s timeout
      });

      const responseTime = Date.now() - startTime;

      // Update delivery as successful
      await db.webhook_deliveries.update({
        where: { id: delivery.id },
        data: {
          status: 'delivered',
          http_status_code: response.status,
          response_body: JSON.stringify(response.data).substring(0, 1000),
          response_time_ms: responseTime,
          delivered_at: new Date(),
        },
      });

      // Reset failure count
      await db.webhook_endpoints.update({
        where: { id: webhook.id },
        data: {
          failure_count: 0,
          last_triggered_at: new Date(),
          events_this_month: { increment: 1 },
        },
      });
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      // Update delivery as failed
      await db.webhook_deliveries.update({
        where: { id: delivery.id },
        data: {
          status: attemptNumber >= 5 ? 'failed' : 'retrying',
          http_status_code: error.response?.status || null,
          response_body: error.message,
          response_time_ms: responseTime,
          error_message: error.message,
          next_retry_at: attemptNumber < 5 ? this.calculateRetryTime(attemptNumber) : null,
        },
      });

      // Increment failure count
      const updatedWebhook = await db.webhook_endpoints.update({
        where: { id: webhook.id },
        data: { failure_count: { increment: 1 } },
      });

      // Auto-disable after 10 consecutive failures
      if (updatedWebhook.failure_count >= 10) {
        await db.webhook_endpoints.update({
          where: { id: webhook.id },
          data: { is_active: false, disabled_at: new Date() },
        });
        console.log(`Webhook ${webhook.id} auto-disabled after 10 failures`);
      }

      // Schedule retry if attempts remaining
      if (attemptNumber < 5) {
        setTimeout(() => {
          this.deliverWebhook(webhook, eventType, payload, eventId, attemptNumber + 1);
        }, this.calculateRetryDelay(attemptNumber));
      }
    }
  }

  /**
   * Generate HMAC signature
   */
  private generateSignature(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: any, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  /**
   * Calculate retry delay (exponential backoff)
   */
  private calculateRetryDelay(attemptNumber: number): number {
    // 1m, 5m, 15m, 60m
    const delays = [60000, 300000, 900000, 3600000];
    return delays[attemptNumber - 1] || 3600000;
  }

  /**
   * Calculate next retry time
   */
  private calculateRetryTime(attemptNumber: number): Date {
    const delay = this.calculateRetryDelay(attemptNumber);
    return new Date(Date.now() + delay);
  }

  /**
   * Check if event matches webhook filters
   */
  private matchesFilters(payload: any, filters: any): boolean {
    if (!filters || Object.keys(filters).length === 0) return true;

    // Example filters: { "min_price": 100, "items": ["AWP | Dragon Lore"] }
    if (filters.min_price && payload.price < filters.min_price) return false;
    if (filters.items && !filters.items.includes(payload.item_name)) return false;

    return true;
  }

  /**
   * Check rate limit
   */
  private async checkRateLimit(webhookId: string): Promise<boolean> {
    const webhook = await db.webhook_endpoints.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) return false;

    const currentMonth = new Date().toISOString().substring(0, 7); // "2025-01"
    const resetMonth = webhook.month_reset_date?.toISOString().substring(0, 7);

    // Reset monthly counter if new month
    if (resetMonth !== currentMonth) {
      await db.webhook_endpoints.update({
        where: { id: webhookId },
        data: {
          events_this_month: 0,
          month_reset_date: new Date(),
        },
      });
      return true;
    }

    // Check if under limit
    if (webhook.events_this_month >= webhook.events_per_month_limit) {
      return false; // Rate limit exceeded
    }

    return true;
  }

  /**
   * Get webhook delivery history
   */
  async getDeliveryHistory(webhookId: string, userId: string, limit: number = 50): Promise<any[]> {
    // Verify ownership
    const webhook = await db.webhook_endpoints.findFirst({
      where: { id: webhookId, user_id: userId },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    // Get deliveries
    const deliveries = await db.webhook_deliveries.findMany({
      where: { webhook_endpoint_id: webhookId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    return deliveries;
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string, userId: string): Promise<void> {
    await db.webhook_endpoints.deleteMany({
      where: { id: webhookId, user_id: userId },
    });
  }

  /**
   * Update webhook
   */
  async updateWebhook(webhookId: string, userId: string, updates: any): Promise<void> {
    await db.webhook_endpoints.updateMany({
      where: { id: webhookId, user_id: userId },
      data: updates,
    });
  }
}

export const webhookService = new WebhookService();
```

### API Routes

#### `src/app/api/v1/webhooks/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { apiAuth } from '@/middleware/apiAuth';
import { webhookService } from '@/services/WebhookService';

// GET /api/v1/webhooks - List webhooks
export async function GET(req: NextRequest) {
  const authError = await apiAuth(req);
  if (authError) return authError;

  try {
    const userId = (req as any).apiKey.user_id;

    const webhooks = await db.webhook_endpoints.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        url: true,
        description: true,
        enabled_events: true,
        filters: true,
        is_active: true,
        events_this_month: true,
        events_per_month_limit: true,
        last_triggered_at: true,
        created_at: true,
      },
    });

    return NextResponse.json({ data: webhooks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/v1/webhooks - Create webhook
export async function POST(req: NextRequest) {
  const authError = await apiAuth(req);
  if (authError) return authError;

  try {
    const userId = (req as any).apiKey.user_id;
    const { url, events, description, filters } = await req.json();

    // Validate input
    if (!url || !events || events.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const webhook = await webhookService.registerWebhook(userId, url, events, description, filters);

    return NextResponse.json({ data: webhook }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### `src/app/api/v1/webhooks/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { apiAuth } from '@/middleware/apiAuth';
import { webhookService } from '@/services/WebhookService';

// GET /api/v1/webhooks/:id - Get webhook details
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = await apiAuth(req);
  if (authError) return authError;

  try {
    const userId = (req as any).apiKey.user_id;
    const webhook = await db.webhook_endpoints.findFirst({
      where: { id: params.id, user_id: userId },
    });

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    return NextResponse.json({ data: webhook });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/v1/webhooks/:id - Update webhook
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = await apiAuth(req);
  if (authError) return authError;

  try {
    const userId = (req as any).apiKey.user_id;
    const updates = await req.json();

    await webhookService.updateWebhook(params.id, userId, updates);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/v1/webhooks/:id - Delete webhook
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = await apiAuth(req);
  if (authError) return authError;

  try {
    const userId = (req as any).apiKey.user_id;
    await webhookService.deleteWebhook(params.id, userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### `src/app/api/v1/webhooks/[id]/deliveries/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { apiAuth } from '@/middleware/apiAuth';
import { webhookService } from '@/services/WebhookService';

// GET /api/v1/webhooks/:id/deliveries - Get delivery history
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = await apiAuth(req);
  if (authError) return authError;

  try {
    const userId = (req as any).apiKey.user_id;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const deliveries = await webhookService.getDeliveryHistory(params.id, userId, limit);

    return NextResponse.json({ data: deliveries });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Frontend Components

#### `src/app/developer/webhooks/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function WebhooksPage() {
  const { data: session } = useSession();
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Event type options
  const eventTypes = [
    { value: 'price.updated', label: 'Price Updated' },
    { value: 'price.threshold', label: 'Price Threshold Crossed' },
    { value: 'craft.created', label: 'Craft Created' },
    { value: 'craft.liked', label: 'Craft Liked' },
    { value: 'craft.commented', label: 'Craft Commented' },
    { value: 'inventory.added', label: 'Inventory Item Added' },
    { value: 'inventory.removed', label: 'Inventory Item Removed' },
    { value: 'pattern.discovered', label: 'Pattern Discovered' },
    { value: 'sticker.price_change', label: 'Sticker Price Changed' },
    { value: 'loadout.shared', label: 'Loadout Shared' },
    { value: 'user.followed', label: 'User Followed' },
  ];

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    const res = await fetch('/api/v1/webhooks', {
      headers: { 'X-API-Key': localStorage.getItem('api_key') || '' },
    });
    const data = await res.json();
    setWebhooks(data.data || []);
    setLoading(false);
  };

  const createWebhook = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const events = Array.from(formData.getAll('events')) as string[];

    const res = await fetch('/api/v1/webhooks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': localStorage.getItem('api_key') || '',
      },
      body: JSON.stringify({
        url: formData.get('url'),
        events,
        description: formData.get('description'),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      alert(`Webhook created! Secret: ${data.data.secret} (save this securely)`);
      fetchWebhooks();
      e.currentTarget.reset();
    }
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm('Delete this webhook?')) return;

    await fetch(`/api/v1/webhooks/${id}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': localStorage.getItem('api_key') || '' },
    });

    fetchWebhooks();
  };

  const toggleWebhook = async (id: string, isActive: boolean) => {
    await fetch(`/api/v1/webhooks/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': localStorage.getItem('api_key') || '',
      },
      body: JSON.stringify({ is_active: !isActive }),
    });

    fetchWebhooks();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Webhooks</h1>

      {/* Create Webhook Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Create New Webhook</h2>
        <form onSubmit={createWebhook} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Endpoint URL (HTTPS only)</label>
            <input
              type="url"
              name="url"
              placeholder="https://your-app.com/webhook"
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <input
              type="text"
              name="description"
              placeholder="My trading bot webhook"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Event Types (select multiple)</label>
            <div className="grid grid-cols-2 gap-2">
              {eventTypes.map((event) => (
                <label key={event.value} className="flex items-center space-x-2">
                  <input type="checkbox" name="events" value={event.value} />
                  <span className="text-sm">{event.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Create Webhook
          </button>
        </form>
      </div>

      {/* Webhook List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Your Webhooks</h2>
        </div>

        {webhooks.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No webhooks yet. Create one above.</div>
        ) : (
          <div className="divide-y">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold">{webhook.url}</h3>
                      {webhook.is_active ? (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">Inactive</span>
                      )}
                    </div>

                    {webhook.description && <p className="text-sm text-gray-600 mb-2">{webhook.description}</p>}

                    <div className="flex flex-wrap gap-2 mb-2">
                      {webhook.enabled_events.map((event: string) => (
                        <span key={event} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          {event}
                        </span>
                      ))}
                    </div>

                    <div className="text-xs text-gray-500">
                      Events this month: {webhook.events_this_month} / {webhook.events_per_month_limit}
                    </div>

                    {webhook.last_triggered_at && (
                      <div className="text-xs text-gray-500">
                        Last triggered: {new Date(webhook.last_triggered_at).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => toggleWebhook(webhook.id, webhook.is_active)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {webhook.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <a
                      href={`/developer/webhooks/${webhook.id}/deliveries`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View Deliveries
                    </a>
                    <button onClick={() => deleteWebhook(webhook.id)} className="text-sm text-red-600 hover:underline">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

#### `src/app/developer/webhooks/[id]/deliveries/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function WebhookDeliveriesPage() {
  const params = useParams();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    const res = await fetch(`/api/v1/webhooks/${params.id}/deliveries`, {
      headers: { 'X-API-Key': localStorage.getItem('api_key') || '' },
    });
    const data = await res.json();
    setDeliveries(data.data || []);
    setLoading(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Webhook Delivery History</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempt</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">HTTP Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Response Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {deliveries.map((delivery) => (
              <tr key={delivery.id}>
                <td className="px-6 py-4 text-sm">{delivery.event_type}</td>
                <td className="px-6 py-4">
                  {delivery.status === 'delivered' && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Delivered</span>
                  )}
                  {delivery.status === 'failed' && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Failed</span>
                  )}
                  {delivery.status === 'retrying' && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Retrying</span>
                  )}
                  {delivery.status === 'pending' && (
                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">Pending</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">{delivery.attempt_number} / 5</td>
                <td className="px-6 py-4 text-sm">{delivery.http_status_code || '-'}</td>
                <td className="px-6 py-4 text-sm">{delivery.response_time_ms ? `${delivery.response_time_ms}ms` : '-'}</td>
                <td className="px-6 py-4 text-sm">{new Date(delivery.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {deliveries.length === 0 && (
          <div className="p-6 text-center text-gray-500">No deliveries yet.</div>
        )}
      </div>
    </div>
  );
}
```

## Success Metrics
1. **Adoption Rate**: 30%+ of API users enable webhooks within 3 months
2. **Delivery Success Rate**: 99%+ webhook deliveries succeed on first attempt
3. **Event Volume**: 1M+ webhook events delivered per month
4. **Reliability**: <0.1% auto-disabled webhooks due to failures
5. **Developer Satisfaction**: 95%+ positive feedback on reliability

## Dependencies
- **Feature 31**: Public API (authentication, rate limiting)
- **Feature 03**: Price Tracking (price change events)
- **Feature 24**: Craft Gallery (craft events)

## Effort Estimate
- **Database Schema**: 4 hours
- **WebhookService**: 16 hours
- **Event Queue System**: 8 hours
- **Retry Logic**: 6 hours
- **API Routes**: 8 hours
- **Frontend Dashboard**: 12 hours
- **Signature Verification**: 4 hours
- **Testing**: 12 hours
- **Documentation**: 8 hours
- **Total**: ~78 hours (1.95 weeks)

## Implementation Notes
1. **Reliability**: Use retry with exponential backoff (1m, 5m, 15m, 60m)
2. **Security**: HMAC-SHA256 signatures, HTTPS-only endpoints
3. **Performance**: Process events asynchronously, don't block API requests
4. **Monitoring**: Track delivery success rates, auto-disable failing webhooks
5. **Deduplication**: Include event IDs for receiver-side deduplication
6. **Rate Limiting**: Volume-based pricing tiers (10K/500K/unlimited events/month)

## Gotchas
1. **At-Least-Once Delivery**: Receivers must handle duplicate events (use event IDs)
2. **Event Ordering**: Not guaranteed - receivers should not assume order
3. **Timeouts**: 10-second timeout for webhook endpoints
4. **Auto-Disable**: Webhooks auto-disabled after 10 consecutive failures
5. **HTTPS Required**: All webhook URLs must use HTTPS
6. **Signature Timing**: Use timing-safe comparison to prevent timing attacks

## Status Checklist
- [ ] Database schema created and migrated
- [ ] WebhookService implemented
- [ ] Event queue system built
- [ ] Retry logic with exponential backoff functional
- [ ] HMAC signature generation/verification working
- [ ] API routes created (CRUD for webhooks)
- [ ] Delivery history endpoint implemented
- [ ] Frontend webhook dashboard built
- [ ] Event filtering logic implemented
- [ ] Rate limiting functional
- [ ] Auto-disable logic tested
- [ ] Documentation written (webhook integration guide)
- [ ] Unit tests written (95% coverage)
- [ ] Integration tests written
- [ ] Load testing completed (handle 1M events/month)

## Related Features
- **Feature 31**: Public API (provides authentication)
- **Feature 03**: Price Tracking (triggers price.updated events)
- **Feature 24**: Craft Gallery (triggers craft events)

## References
- [Stripe Webhooks](https://stripe.com/docs/webhooks) (industry gold standard)
- [GitHub Webhooks](https://docs.github.com/en/webhooks)
- [Webhook Best Practices](https://webhooks.fyi/)
- [HMAC Signature Verification](https://en.wikipedia.org/wiki/HMAC)
