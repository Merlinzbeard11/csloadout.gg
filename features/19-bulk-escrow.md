# 19 - Bulk Escrow

## Overview

Secure escrow service for high-value transactions ($500+) ensuring both buyer and seller protection. csloadout.gg acts as trusted intermediary - holds payment until items delivered, then releases funds. Critical for building trust in wholesale trading board and enabling large transactions between strangers.

**Value Prop:** "Trade $5,000 safely - we hold payment until you confirm delivery"

## User Segments Served

- **Primary:** Bulk Traders (high-value wholesale transactions)
- **Secondary:** Investors (large portfolio sales)
- **Tertiary:** All Users (any transaction >$500)

## User Stories / Use Cases

### As a Bulk Trader (Buyer)
- I want escrow protection when buying $2,000 worth of items from unknown seller
- I want to inspect items before funds are released
- I want refund if seller doesn't deliver or items don't match description
- I want dispute resolution if something goes wrong

### As a Bulk Trader (Seller)
- I want guaranteed payment after delivering items
- I want protection from buyer claiming "didn't receive" after I sent
- I want fast fund release (not 30-day hold)
- I want minimal escrow fees (2-3%)

### As an Investor
- I want to sell $10K portfolio with escrow protecting both sides
- I want clear documentation for tax purposes
- I want professional dispute mediation if needed

## Research & Context

### Escrow Service Patterns

**Reference Platforms:**
```
1. Escrow.com (Domain/Website Sales):
   - Buyer deposits funds
   - Seller delivers goods
   - Buyer inspects (5-day window)
   - Buyer approves → Funds released
   - Escrow fee: 3.25% (minimum $25)
   - Dispute resolution included

2. PayPal Goods & Services:
   - Buyer pays via PayPal
   - Seller ships item
   - Buyer receives, has 180 days to dispute
   - PayPal mediates disputes
   - Fee: 2.9% + $0.30
   - Seller protection if tracking provided

3. Steam Trade Hold (Historical):
   - 15-day trade hold without Steam Mobile Authenticator
   - Prevents scams but frustrates users
   - No escrow, just delay

4. CS:GO Trading Bots:
   - Instant trade via bots
   - Bot holds items briefly
   - Both sides confirm simultaneously
   - No financial escrow (item-for-item only)

5. Alibaba Trade Assurance:
   - Buyer pays Alibaba
   - Supplier ships goods
   - Buyer confirms receipt and quality
   - Alibaba releases payment
   - Refund if product doesn't match description
```

**Key Escrow Principles:**
```
1. Trust = Neutral Third Party
   - csloadout.gg holds funds (not buyer, not seller)
   - No incentive to favor either party
   - Transparent process

2. Inspection Period
   - Buyer has X days to verify items
   - Claim discrepancies
   - Request refund if items don't match

3. Dispute Resolution
   - If buyer/seller disagree → Mediation
   - Evidence submission (screenshots, Steam trade history)
   - Final decision by csloadout.gg support

4. Fee Structure
   - Percentage of transaction (2-3%)
   - OR flat fee ($25 minimum)
   - Paid by buyer or split

5. Fund Security
   - Held in segregated account
   - NOT commingled with company funds
   - Legally protected
```

### CS2-Specific Escrow Scenarios

**Typical Transaction Flow:**
```
Day 1: Buyer & Seller agree on wholesale deal
  - 500x cases @ $0.42 = $210 total
  - Agree to use csloadout.gg escrow

Day 1 (30 mins later): Buyer deposits funds
  - Buyer pays $210 + $6.30 escrow fee (3%) = $216.30
  - Funds held by csloadout.gg

Day 1 (1 hour later): Seller delivers items via Steam trade
  - Seller sends Steam trade offer with 500 cases
  - Buyer accepts trade
  - Items transferred to buyer's Steam account

Day 2: Buyer inspects items
  - Confirms 500 cases received
  - Verifies they match description
  - Clicks "Approve" in escrow dashboard

Day 2 (instant): Funds released to seller
  - csloadout.gg transfers $210 to seller
  - Transaction complete
  - Both parties can leave ratings
```

**Dispute Scenario:**
```
Problem: Buyer claims only received 450 cases (not 500)

Buyer opens dispute:
  - Submits screenshot of Steam inventory showing 450 cases
  - Claims seller short-changed them

Seller responds:
  - Submits screenshot of Steam trade history showing 500 cases sent
  - Claims buyer is lying

csloadout.gg mediation:
  - Reviews Steam trade history (public API)
  - Confirms 500 cases were in trade offer
  - Buyer accepted trade
  - Rules in favor of seller
  - Releases full $210 to seller

Alternative outcome (seller at fault):
  - Evidence shows seller only sent 450
  - Partial refund: $8.40 (50 cases @ $0.42)
  - Seller receives $201.60
  - Buyer receives $8.40 refund
```

## Technical Requirements

### Database Schema

```sql
-- Escrow transactions
CREATE TABLE escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id),
  buyer_id UUID NOT NULL REFERENCES users(id),

  -- Transaction details
  description TEXT NOT NULL,
  items JSONB NOT NULL,                  -- [{ item_id, quantity, price }, ...]
  total_amount DECIMAL(10,2) NOT NULL,
  escrow_fee DECIMAL(10,2) NOT NULL,
  total_with_fee DECIMAL(10,2) NOT NULL,

  -- Payment
  payment_method VARCHAR(50),            -- 'paypal', 'stripe', 'crypto'
  payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'deposited', 'released', 'refunded'
  payment_received_at TIMESTAMP,

  -- Status
  status VARCHAR(20) DEFAULT 'awaiting-payment',
  -- 'awaiting-payment', 'awaiting-delivery', 'inspection', 'approved', 'disputed', 'completed', 'cancelled'

  -- Delivery
  delivery_method VARCHAR(50),           -- 'steam-trade', 'manual'
  steam_trade_offer_id VARCHAR(255),     -- Steam trade offer ID
  delivered_at TIMESTAMP,

  -- Inspection period
  inspection_deadline TIMESTAMP,         -- Buyer must approve by this date
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),

  -- Dispute
  dispute_opened_at TIMESTAMP,
  dispute_reason TEXT,
  dispute_resolution TEXT,
  dispute_resolved_at TIMESTAMP,

  -- Fund release
  funds_released_at TIMESTAMP,
  funds_released_to UUID REFERENCES users(id),
  release_amount DECIMAL(10,2),

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Link to wholesale listing (if applicable)
  wholesale_listing_id UUID REFERENCES wholesale_listings(id)
);

CREATE INDEX idx_escrow_txns_seller ON escrow_transactions(seller_id);
CREATE INDEX idx_escrow_txns_buyer ON escrow_transactions(buyer_id);
CREATE INDEX idx_escrow_txns_status ON escrow_transactions(status);

-- Escrow disputes
CREATE TABLE escrow_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_transaction_id UUID NOT NULL REFERENCES escrow_transactions(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES users(id),

  -- Dispute details
  reason TEXT NOT NULL,
  evidence JSONB,                        -- [{ type: 'screenshot', url: '...' }, ...]

  -- Responses
  seller_response TEXT,
  seller_evidence JSONB,
  buyer_response TEXT,
  buyer_evidence JSONB,

  -- Resolution
  resolved_by UUID REFERENCES users(id), -- csloadout.gg admin
  resolution TEXT,
  resolution_type VARCHAR(50),           -- 'full-refund', 'partial-refund', 'release-to-seller'
  refund_amount DECIMAL(10,2),

  -- Status
  status VARCHAR(20) DEFAULT 'open',     -- 'open', 'under-review', 'resolved', 'closed'

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX idx_escrow_disputes_txn ON escrow_disputes(escrow_transaction_id);
CREATE INDEX idx_escrow_disputes_status ON escrow_disputes(status);

-- Escrow fee configuration
CREATE TABLE escrow_fee_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_transaction_amount DECIMAL(10,2),  -- Apply to transactions >= this amount
  fee_percent DECIMAL(5,2),               -- Percentage fee
  flat_fee DECIMAL(10,2),                 -- Flat fee component
  minimum_fee DECIMAL(10,2),              -- Minimum total fee

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Default fee structure
INSERT INTO escrow_fee_config (min_transaction_amount, fee_percent, flat_fee, minimum_fee)
VALUES
  (0, 3.0, 0, 10),      -- 3% with $10 minimum
  (1000, 2.5, 0, 25),   -- 2.5% with $25 minimum for $1K+ transactions
  (5000, 2.0, 0, 50);   -- 2% with $50 minimum for $5K+ transactions
```

### Escrow Service

```typescript
// Service to manage escrow transactions
class EscrowService {
  // Create escrow transaction
  async createEscrow(params: {
    sellerId: string;
    buyerId: string;
    description: string;
    items: { itemId: string; quantity: number; price: number }[];
    totalAmount: number;
  }): Promise<EscrowTransaction> {
    // Calculate escrow fee
    const escrowFee = this.calculateEscrowFee(params.totalAmount);
    const totalWithFee = params.totalAmount + escrowFee;

    // Create transaction
    const escrow = await db.escrow_transactions.create({
      data: {
        seller_id: params.sellerId,
        buyer_id: params.buyerId,
        description: params.description,
        items: params.items,
        total_amount: params.totalAmount,
        escrow_fee: escrowFee,
        total_with_fee: totalWithFee,
        status: 'awaiting-payment',
        inspection_deadline: addDays(new Date(), 5) // 5-day inspection period
      }
    });

    // Send payment instructions to buyer
    await this.sendPaymentInstructions(params.buyerId, escrow);

    return escrow;
  }

  // Record payment received
  async recordPayment(escrowId: string, paymentMethod: string): Promise<void> {
    await db.escrow_transactions.update({
      where: { id: escrowId },
      data: {
        payment_status: 'deposited',
        payment_method: paymentMethod,
        payment_received_at: new Date(),
        status: 'awaiting-delivery'
      }
    });

    // Notify seller that funds are in escrow
    const escrow = await db.escrow_transactions.findUnique({ where: { id: escrowId } });
    await this.notifySeller(escrow);
  }

  // Record item delivery
  async recordDelivery(params: {
    escrowId: string;
    deliveryMethod: string;
    steamTradeOfferId?: string;
  }): Promise<void> {
    await db.escrow_transactions.update({
      where: { id: params.escrowId },
      data: {
        delivery_method: params.deliveryMethod,
        steam_trade_offer_id: params.steamTradeOfferId,
        delivered_at: new Date(),
        status: 'inspection'
      }
    });

    // Notify buyer to inspect and approve
    const escrow = await db.escrow_transactions.findUnique({ where: { id: params.escrowId } });
    await this.notifyBuyerToInspect(escrow);
  }

  // Buyer approves delivery
  async approveDelivery(escrowId: string, buyerId: string): Promise<void> {
    const escrow = await db.escrow_transactions.findUnique({ where: { id: escrowId } });

    if (escrow.buyer_id !== buyerId) {
      throw new Error('Not authorized');
    }

    if (escrow.status !== 'inspection') {
      throw new Error('Cannot approve - not in inspection status');
    }

    // Approve
    await db.escrow_transactions.update({
      where: { id: escrowId },
      data: {
        approved_at: new Date(),
        approved_by: buyerId,
        status: 'approved'
      }
    });

    // Release funds to seller
    await this.releaseFunds(escrowId);
  }

  // Release funds to seller
  async releaseFunds(escrowId: string): Promise<void> {
    const escrow = await db.escrow_transactions.findUnique({ where: { id: escrowId } });

    // Transfer funds to seller (via payment processor)
    await this.transferFunds(escrow.seller_id, escrow.total_amount);

    // Update transaction
    await db.escrow_transactions.update({
      where: { id: escrowId },
      data: {
        payment_status: 'released',
        funds_released_at: new Date(),
        funds_released_to: escrow.seller_id,
        release_amount: escrow.total_amount,
        status: 'completed'
      }
    });

    // Notify seller
    await this.notifySellerFundsReleased(escrow);
  }

  // Open dispute
  async openDispute(params: {
    escrowId: string;
    openedBy: string;
    reason: string;
    evidence: { type: string; url: string }[];
  }): Promise<void> {
    const escrow = await db.escrow_transactions.findUnique({ where: { id: params.escrowId } });

    // Update escrow status
    await db.escrow_transactions.update({
      where: { id: params.escrowId },
      data: {
        status: 'disputed',
        dispute_opened_at: new Date(),
        dispute_reason: params.reason
      }
    });

    // Create dispute record
    await db.escrow_disputes.create({
      data: {
        escrow_transaction_id: params.escrowId,
        opened_by: params.openedBy,
        reason: params.reason,
        evidence: params.evidence
      }
    });

    // Notify other party
    const otherParty = params.openedBy === escrow.buyer_id ? escrow.seller_id : escrow.buyer_id;
    await this.notifyDisputeOpened(otherParty, params.escrowId);

    // Notify csloadout.gg support
    await this.notifySupportDisputeOpened(params.escrowId);
  }

  // Resolve dispute (admin only)
  async resolveDispute(params: {
    disputeId: string;
    resolvedBy: string;
    resolution: string;
    resolutionType: 'full-refund' | 'partial-refund' | 'release-to-seller';
    refundAmount?: number;
  }): Promise<void> {
    const dispute = await db.escrow_disputes.findUnique({
      where: { id: params.disputeId },
      include: { escrow_transaction: true }
    });

    // Update dispute
    await db.escrow_disputes.update({
      where: { id: params.disputeId },
      data: {
        resolved_by: params.resolvedBy,
        resolution: params.resolution,
        resolution_type: params.resolutionType,
        refund_amount: params.refundAmount,
        status: 'resolved',
        resolved_at: new Date()
      }
    });

    // Execute resolution
    switch (params.resolutionType) {
      case 'full-refund':
        await this.refundBuyer(dispute.escrow_transaction.id, dispute.escrow_transaction.total_amount);
        break;

      case 'partial-refund':
        await this.refundBuyer(dispute.escrow_transaction.id, params.refundAmount);
        await this.releaseFundsToSeller(
          dispute.escrow_transaction.id,
          dispute.escrow_transaction.total_amount - params.refundAmount
        );
        break;

      case 'release-to-seller':
        await this.releaseFundsToSeller(dispute.escrow_transaction.id, dispute.escrow_transaction.total_amount);
        break;
    }

    // Update escrow status
    await db.escrow_transactions.update({
      where: { id: dispute.escrow_transaction.id },
      data: {
        status: 'completed',
        dispute_resolved_at: new Date(),
        dispute_resolution: params.resolution
      }
    });

    // Notify both parties
    await this.notifyDisputeResolved(dispute.escrow_transaction.id);
  }

  // Calculate escrow fee
  private calculateEscrowFee(amount: number): number {
    const feeConfig = await db.escrow_fee_config.findFirst({
      where: {
        min_transaction_amount: { lte: amount },
        is_active: true
      },
      orderBy: { min_transaction_amount: 'desc' }
    });

    if (!feeConfig) {
      // Default: 3% with $10 minimum
      return Math.max(amount * 0.03, 10);
    }

    const percentFee = amount * (feeConfig.fee_percent / 100);
    const totalFee = percentFee + feeConfig.flat_fee;

    return Math.max(totalFee, feeConfig.minimum_fee);
  }

  // Transfer funds (integration with payment processor)
  private async transferFunds(userId: string, amount: number): Promise<void> {
    const user = await db.users.findUnique({ where: { id: userId } });

    // Stripe payout, PayPal transfer, etc.
    // await stripe.payouts.create({ amount: amount * 100, ... });

    console.log(`Transferred $${amount} to user ${userId}`);
  }
}

// Cron job: Auto-approve if inspection deadline passed
cron.schedule('0 * * * *', async () => { // Hourly
  const expiredInspections = await db.escrow_transactions.findMany({
    where: {
      status: 'inspection',
      inspection_deadline: { lt: new Date() }
    }
  });

  const escrowService = new EscrowService();

  for (const escrow of expiredInspections) {
    console.log(`Auto-approving escrow ${escrow.id} - inspection period expired`);
    await escrowService.releaseFunds(escrow.id);
  }
});
```

### API Endpoints

```typescript
// Create escrow transaction
POST /api/escrow/create
Body: {
  sellerId: "...",
  buyerId: "...",
  description: "500x Operation Bravo Cases",
  items: [{ itemId: "...", quantity: 500, price: 0.42 }],
  totalAmount: 210
}
Response: {
  id: "...",
  totalAmount: 210,
  escrowFee: 6.30,
  totalWithFee: 216.30,
  status: "awaiting-payment",
  paymentInstructions: {
    method: "paypal",
    payTo: "escrow@csloadout.gg",
    amount: 216.30
  }
}

// Record payment
POST /api/escrow/:id/payment
Body: { paymentMethod: "paypal", transactionId: "..." }
Response: { success: true, status: "awaiting-delivery" }

// Record delivery
POST /api/escrow/:id/delivery
Body: {
  deliveryMethod: "steam-trade",
  steamTradeOfferId: "1234567890"
}
Response: { success: true, status: "inspection" }

// Approve delivery
POST /api/escrow/:id/approve
Response: {
  success: true,
  status: "approved",
  fundsReleased: true
}

// Open dispute
POST /api/escrow/:id/dispute
Body: {
  reason: "Only received 450 cases, not 500",
  evidence: [
    { type: "screenshot", url: "..." }
  ]
}
Response: {
  success: true,
  disputeId: "...",
  status: "disputed"
}

// Get escrow details
GET /api/escrow/:id
Response: {
  id: "...",
  seller: { id: "...", username: "..." },
  buyer: { id: "...", username: "..." },
  totalAmount: 210,
  escrowFee: 6.30,
  status: "inspection",
  inspectionDeadline: "2025-11-07T12:00:00Z",
  timeline: [
    { event: "created", timestamp: "2025-11-02T10:00:00Z" },
    { event: "payment-received", timestamp: "2025-11-02T10:15:00Z" },
    { event: "delivery-confirmed", timestamp: "2025-11-02T11:00:00Z" }
  ]
}
```

### Frontend Components

```typescript
// Escrow Dashboard
// pages/escrow/dashboard.tsx
export default function EscrowDashboardPage() {
  const { data } = useQuery({
    queryKey: ['escrow-transactions'],
    queryFn: () => fetch('/api/escrow/me').then(r => r.json())
  })

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Escrow Dashboard</h1>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="disputed">Disputed</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {data?.active.map(escrow => (
            <EscrowCard key={escrow.id} escrow={escrow} />
          ))}
        </TabsContent>

        {/* ... other tabs */}
      </Tabs>
    </div>
  )
}

// Escrow transaction card
function EscrowCard({ escrow }) {
  const isBuyer = escrow.buyer.id === currentUserId;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">{escrow.description}</h3>
          <div className="text-sm text-gray-600">
            {isBuyer ? 'Buying from' : 'Selling to'}: {isBuyer ? escrow.seller.username : escrow.buyer.username}
          </div>
        </div>

        <StatusBadge status={escrow.status} />
      </div>

      {/* Amount */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-sm text-gray-600">Total Amount</div>
          <div className="text-xl font-bold">${escrow.totalAmount}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Escrow Fee</div>
          <div className="text-xl font-bold">${escrow.escrowFee}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">{isBuyer ? 'You Pay' : 'You Receive'}</div>
          <div className="text-xl font-bold text-green-600">
            ${isBuyer ? escrow.totalWithFee : escrow.totalAmount}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-4">
        <EscrowTimeline timeline={escrow.timeline} status={escrow.status} />
      </div>

      {/* Actions */}
      {escrow.status === 'awaiting-payment' && isBuyer && (
        <button
          onClick={() => handlePayment(escrow.id)}
          className="btn-primary"
        >
          Make Payment
        </button>
      )}

      {escrow.status === 'awaiting-delivery' && !isBuyer && (
        <button
          onClick={() => handleDelivery(escrow.id)}
          className="btn-primary"
        >
          Confirm Delivery
        </button>
      )}

      {escrow.status === 'inspection' && isBuyer && (
        <div className="flex gap-4">
          <button
            onClick={() => handleApprove(escrow.id)}
            className="btn-primary"
          >
            Approve Delivery
          </button>
          <button
            onClick={() => handleDispute(escrow.id)}
            className="btn-danger"
          >
            Open Dispute
          </button>
          <div className="text-sm text-gray-600 mt-2">
            Auto-approves in: {formatDistanceToNow(escrow.inspectionDeadline)}
          </div>
        </div>
      )}
    </div>
  )
}

// Dispute modal
function DisputeModal({ escrow, isOpen, onClose }) {
  const [reason, setReason] = useState('')
  const [evidence, setEvidence] = useState([])

  const handleSubmit = async () => {
    await fetch(`/api/escrow/${escrow.id}/dispute`, {
      method: 'POST',
      body: JSON.stringify({ reason, evidence })
    })

    toast.success('Dispute opened')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Open Dispute</h2>

        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
          <p className="text-sm text-yellow-800">
            Opening a dispute will pause the escrow transaction. Our support team will review your case.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Reason for Dispute</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            rows={4}
            placeholder="Describe the issue..."
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Evidence (Screenshots)</label>
          <FileUpload onUpload={(files) => setEvidence(files)} />
        </div>

        <div className="flex gap-4">
          <button onClick={handleSubmit} className="btn-primary">
            Submit Dispute
          </button>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}
```

## Success Metrics

- ✅ 80%+ high-value transactions use escrow ($500+)
- ✅ <5% dispute rate
- ✅ 95%+ disputes resolved within 48 hours
- ✅ 90%+ satisfaction rate (post-escrow survey)
- ✅ <0.1% fraud rate

## Dependencies

### Must Have Before Starting
- [18] Wholesale Trading Board (primary use case)
- Payment processor integration (Stripe, PayPal)
- Legal compliance (escrow regulations vary by jurisdiction)

### Blocks Other Features
None (self-contained service)

## Effort Estimate

- **Development Time:** 3-4 weeks
- **Complexity:** High
- **Team Size:** 1-2 developers + legal consultation

**Breakdown:**
- Week 1: Database schema, basic escrow flow, payment integration
- Week 2: Dispute system, admin tools
- Week 3: Frontend UI, testing
- Week 4: Legal compliance, security audit, documentation

## Implementation Notes

### Legal Compliance

```
IMPORTANT: Escrow services are regulated in many jurisdictions.

Requirements (varies by location):
- Business license for escrow services
- Bonding requirements
- Segregated bank accounts (escrow funds separate from operating funds)
- Regular audits
- Consumer protection compliance

Consultation Required:
- Lawyer specializing in fintech/payment services
- Accountant for fund handling
- Compliance officer

Alternative: Partner with licensed escrow service (Escrow.com API)
```

### Payment Processing

```typescript
// Integration with Stripe for escrow
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createEscrowPaymentIntent(escrow: EscrowTransaction) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: escrow.total_with_fee * 100, // Cents
    currency: 'usd',
    metadata: {
      escrow_id: escrow.id,
      seller_id: escrow.seller_id,
      buyer_id: escrow.buyer_id
    },
    transfer_data: {
      destination: escrow.seller_stripe_account_id
    },
    on_behalf_of: escrow.seller_stripe_account_id,
    payment_method_types: ['card'],
    capture_method: 'manual' // Don't capture until approved
  });

  return paymentIntent;
}

// Release funds to seller
async function captureFunds(escrow: EscrowTransaction) {
  await stripe.paymentIntents.capture(escrow.payment_intent_id);
}

// Refund buyer
async function refundBuyer(escrow: EscrowTransaction, amount: number) {
  await stripe.refunds.create({
    payment_intent: escrow.payment_intent_id,
    amount: amount * 100
  });
}
```

### Gotchas to Watch For

1. **Fraud**
   - Fake screenshots, stolen accounts
   - Solution: Verify Steam trade history via API, reputation system

2. **Chargeback Abuse**
   - Buyer gets items, then does credit card chargeback
   - Solution: Document everything, fight chargebacks

3. **Legal Liability**
   - csloadout.gg liable if funds lost
   - Solution: Insurance, legal entity structure, terms of service

4. **Fund Security**
   - Hacked account, stolen escrow funds
   - Solution: 2FA required, segregated accounts, insurance

5. **Slow Dispute Resolution**
   - Support backlog, complex cases
   - Solution: Clear evidence requirements, automated decisions where possible

6. **Auto-Approval Abuse**
   - Seller delays delivery until auto-approval
   - Solution: Shorter inspection period (3-5 days), buyer can extend

## Status

- [ ] Research complete
- [ ] Legal consultation complete
- [ ] Database schema created
- [ ] Payment integration working
- [ ] Escrow flow implemented
- [ ] Dispute system built
- [ ] Admin tools created
- [ ] Frontend UI complete
- [ ] Security audit complete
- [ ] Testing complete
- [ ] Deployed to production

## Related Features

- **Depends On:**
  - [18] Wholesale Trading Board

- **Enhances:**
  - [20] Seller Reputation System (escrow completion = positive rating)

## References

- Escrow.com: https://www.escrow.com/
- Stripe Escrow Patterns: https://stripe.com/docs/connect/charges-transfers
- PayPal Goods & Services: https://www.paypal.com/us/webapps/mpp/paypal-safety-and-security
- Legal Considerations: https://www.forbes.com/advisor/business/escrow-account/
