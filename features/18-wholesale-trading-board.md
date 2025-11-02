# 18 - Wholesale Trading Board

## Overview

Dedicated marketplace for bulk transactions (100+ items, wholesale pricing). Enables bulk traders to list large inventories, negotiate deals, and connect with other bulk buyers/sellers. Solves the "where do I sell 1,000 cases?" problem that existing marketplaces don't address.

**Value Prop:** "Sell 1,000 items in one transaction - find wholesale buyers, not retail customers"

## User Segments Served

- **Primary:** Bulk Traders (selling/buying 100+ items at once)
- **Secondary:** Investors (liquidating large positions)
- **Tertiary:** Wholesalers (professional CS2 skin dealers)

## User Stories / Use Cases

### As a Bulk Trader (Seller)
- I want to list "500x Operation Bravo Cases @ $0.45 each" and find ONE buyer
- I want to negotiate bulk pricing (10% discount for buying all 500)
- I want to verify buyer is reputable before committing
- I want escrow protection for large transactions ($500+)

### As a Bulk Trader (Buyer)
- I want to find sellers offering bulk lots (not browse 500 individual listings)
- I want to negotiate lower per-unit prices for bulk purchases
- I want to see seller's reputation and transaction history
- I want to make offers below asking price

### As an Investor (Liquidating)
- I want to sell entire portfolio ($10K worth) quickly
- I want to advertise "Selling complete AK-47 collection (47 skins)"
- I want serious buyers only (minimum purchase $1K)

## Research & Context

### Wholesale Marketplace Patterns

**Reference Platforms:**
```
1. Alibaba (B2B Marketplace):
   - Minimum Order Quantity (MOQ)
   - Bulk pricing tiers (1-99: $5, 100-499: $4.50, 500+: $4)
   - Negotiation via messaging
   - Trade assurance (escrow)
   - Supplier verification (business licenses)

2. eBay Wholesale Lots:
   - "Lot of 100" listings
   - Auction + Buy It Now
   - Wholesale categories
   - Feedback system

3. Facebook Marketplace (Local Wholesale):
   - "Bulk sale" posts
   - Direct negotiation
   - Meetups for verification
   - Community trust

4. CS:GO Lounge (Historical):
   - Trade offers
   - Item-for-item trades
   - Reputation system
   - No escrow (trust-based)
```

**Key Features:**
```
1. Listing Types:
   - Fixed Price (500x @ $0.45 = $225)
   - Negotiable (500x @ $0.45 or best offer)
   - Auction (bids on bulk lot)
   - Bulk Inquiry ("Buying 1000+ cases, PM offers")

2. Pricing Models:
   - Per-unit pricing ("$0.45 each")
   - Total lot pricing ("$225 for all 500")
   - Tiered pricing (1-100: $0.50, 101-500: $0.45)

3. Trust & Safety:
   - Seller reputation score
   - Transaction history
   - Escrow requirements ($500+ deals)
   - Verification badges (email, phone, Steam profile)

4. Discovery:
   - Filter by item type, quantity, price range
   - Sort by total value, per-unit price, seller rating
   - Search "cases 500+" or "AWP skins bulk"
```

### CS2-Specific Wholesale Scenarios

**Common Bulk Listings:**
```
1. Case Lots:
   - "1,000x Operation Bravo Cases @ $0.42/each = $420 total"
   - Wholesale price 10% below retail
   - Target: Investors buying for long-term hold

2. Low-Tier Skin Bundles:
   - "200x Mixed Mil-Spec Skins @ $0.80/each = $160 total"
   - Various items, bundled for volume
   - Target: Players building cheap loadouts

3. Complete Collections:
   - "Full AK-47 Collection (47 skins) @ $1,200 total"
   - Premium pricing for completeness
   - Target: Collectors

4. Inventory Liquidation:
   - "Selling entire inventory (850 items, valued $4,200) for $3,800"
   - 10% discount for taking everything
   - Target: Bulk traders looking to flip

5. Arbitrage Opportunities:
   - "Buying 500+ cases at $0.38 each (Steam price $0.42)"
   - Buyer offers below market, seller liquidates fast
   - Target: Arbitrageurs
```

### Negotiation & Messaging

**Workflow:**
```
1. Buyer sees listing: "500x cases @ $0.45"
2. Buyer sends message: "I'll take all 500 for $0.42 each ($210 total)"
3. Seller counters: "$0.43 each ($215), firm"
4. Buyer accepts or walks away
5. If accepted → Escrow transaction initiated
```

**Messaging Features:**
```
- Thread per listing
- Offer/counteroffer buttons (quick negotiation)
- Auto-calculate totals
- Mark as "Deal Closed" when sold
- Block lowball spammers
```

## Technical Requirements

### Database Schema

```sql
-- Wholesale listings
CREATE TABLE wholesale_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Listing details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  listing_type VARCHAR(20) NOT NULL,   -- 'fixed-price', 'negotiable', 'auction', 'inquiry'

  -- Items
  items JSONB NOT NULL,                -- [{ item_id, quantity, per_unit_price }, ...]
  total_items INTEGER NOT NULL,
  total_value DECIMAL(10,2) NOT NULL,

  -- Pricing
  per_unit_price DECIMAL(10,2),       -- For homogeneous lots
  total_price DECIMAL(10,2),          -- For mixed lots or collections
  is_negotiable BOOLEAN DEFAULT TRUE,
  minimum_offer DECIMAL(10,2),        -- Seller's floor

  -- Requirements
  minimum_purchase_amount DECIMAL(10,2), -- Must buy at least $X
  preferred_payment_methods JSONB,    -- ['steam-trade', 'paypal', 'crypto']
  requires_escrow BOOLEAN DEFAULT TRUE,

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'pending', 'sold', 'expired'
  expires_at TIMESTAMP,

  -- Seller info
  seller_reputation_score DECIMAL(3,2), -- Cached for performance
  seller_verified BOOLEAN DEFAULT FALSE,

  -- Engagement
  view_count INTEGER DEFAULT 0,
  inquiry_count INTEGER DEFAULT 0,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wholesale_listings_seller ON wholesale_listings(seller_id);
CREATE INDEX idx_wholesale_listings_status ON wholesale_listings(status);
CREATE INDEX idx_wholesale_listings_total_value ON wholesale_listings(total_value);
CREATE INDEX idx_wholesale_listings_created ON wholesale_listings(created_at);

-- Wholesale inquiries/messages
CREATE TABLE wholesale_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES wholesale_listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES users(id),

  -- Message thread
  messages JSONB NOT NULL,             -- [{ sender_id, message, timestamp, offer_amount }, ...]

  -- Current offer
  current_offer_amount DECIMAL(10,2),
  current_offer_status VARCHAR(20),    -- 'pending', 'accepted', 'rejected', 'countered'

  -- Deal status
  deal_status VARCHAR(20) DEFAULT 'negotiating', -- 'negotiating', 'agreed', 'escrow', 'completed', 'cancelled'

  -- Engagement
  last_message_at TIMESTAMP,
  is_read BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wholesale_inquiries_listing ON wholesale_inquiries(listing_id);
CREATE INDEX idx_wholesale_inquiries_buyer ON wholesale_inquiries(buyer_id);
CREATE INDEX idx_wholesale_inquiries_seller ON wholesale_inquiries(seller_id);

-- Wholesale transactions (completed deals)
CREATE TABLE wholesale_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES wholesale_listings(id),
  seller_id UUID NOT NULL REFERENCES users(id),
  buyer_id UUID NOT NULL REFERENCES users(id),

  -- Transaction details
  items JSONB NOT NULL,                -- What was sold
  total_items INTEGER NOT NULL,
  final_price DECIMAL(10,2) NOT NULL,

  -- Escrow
  used_escrow BOOLEAN DEFAULT FALSE,
  escrow_id UUID REFERENCES escrow_transactions(id), -- Link to feature 19

  -- Ratings (after completion)
  seller_rating INTEGER,               -- 1-5 stars
  buyer_rating INTEGER,
  seller_feedback TEXT,
  buyer_feedback TEXT,

  completed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wholesale_txns_seller ON wholesale_transactions(seller_id);
CREATE INDEX idx_wholesale_txns_buyer ON wholesale_transactions(buyer_id);
CREATE INDEX idx_wholesale_txns_completed ON wholesale_transactions(completed_at);
```

### Wholesale Marketplace Service

```typescript
// Service for wholesale trading board
class WholesaleMarketplaceService {
  // Create wholesale listing
  async createListing(params: {
    sellerId: string;
    title: string;
    description: string;
    items: { itemId: string; quantity: number; perUnitPrice: number }[];
    totalPrice?: number;
    isNegotiable: boolean;
    minimumOffer?: number;
  }): Promise<WholesaleListing> {
    // Calculate totals
    const totalItems = params.items.reduce((sum, item) => sum + item.quantity, 0);

    const totalValue = params.totalPrice ||
      params.items.reduce((sum, item) => sum + (item.quantity * item.perUnitPrice), 0);

    // Get seller reputation
    const sellerReputation = await this.getSellerReputation(params.sellerId);

    // Create listing
    const listing = await db.wholesale_listings.create({
      data: {
        seller_id: params.sellerId,
        title: params.title,
        description: params.description,
        listing_type: params.isNegotiable ? 'negotiable' : 'fixed-price',
        items: params.items,
        total_items: totalItems,
        total_value: totalValue,
        total_price: totalValue,
        is_negotiable: params.isNegotiable,
        minimum_offer: params.minimumOffer,
        requires_escrow: totalValue >= 500, // Escrow required for $500+
        seller_reputation_score: sellerReputation,
        expires_at: addDays(new Date(), 30) // 30-day listing
      }
    });

    return listing;
  }

  // Submit inquiry/offer
  async submitInquiry(params: {
    listingId: string;
    buyerId: string;
    message: string;
    offerAmount?: number;
  }): Promise<WholesaleInquiry> {
    const listing = await db.wholesale_listings.findUnique({
      where: { id: params.listingId }
    });

    // Create or update inquiry
    let inquiry = await db.wholesale_inquiries.findFirst({
      where: {
        listing_id: params.listingId,
        buyer_id: params.buyerId
      }
    });

    const newMessage = {
      sender_id: params.buyerId,
      message: params.message,
      offer_amount: params.offerAmount,
      timestamp: new Date()
    };

    if (inquiry) {
      // Add to existing thread
      inquiry = await db.wholesale_inquiries.update({
        where: { id: inquiry.id },
        data: {
          messages: [...inquiry.messages, newMessage],
          current_offer_amount: params.offerAmount || inquiry.current_offer_amount,
          current_offer_status: params.offerAmount ? 'pending' : inquiry.current_offer_status,
          last_message_at: new Date(),
          is_read: false
        }
      });
    } else {
      // Create new inquiry
      inquiry = await db.wholesale_inquiries.create({
        data: {
          listing_id: params.listingId,
          buyer_id: params.buyerId,
          seller_id: listing.seller_id,
          messages: [newMessage],
          current_offer_amount: params.offerAmount,
          current_offer_status: params.offerAmount ? 'pending' : null,
          last_message_at: new Date()
        }
      });
    }

    // Update listing inquiry count
    await db.wholesale_listings.update({
      where: { id: params.listingId },
      data: { inquiry_count: { increment: 1 } }
    });

    // Notify seller
    await this.notifySeller(listing.seller_id, inquiry);

    return inquiry;
  }

  // Accept offer
  async acceptOffer(inquiryId: string, sellerId: string): Promise<void> {
    const inquiry = await db.wholesale_inquiries.findUnique({
      where: { id: inquiryId },
      include: { listing: true }
    });

    if (inquiry.seller_id !== sellerId) {
      throw new Error('Not authorized');
    }

    // Update inquiry
    await db.wholesale_inquiries.update({
      where: { id: inquiryId },
      data: {
        current_offer_status: 'accepted',
        deal_status: 'agreed'
      }
    });

    // Update listing status
    await db.wholesale_listings.update({
      where: { id: inquiry.listing_id },
      data: { status: 'pending' }
    });

    // Notify buyer
    await this.notifyBuyer(inquiry.buyer_id, inquiry);

    // If escrow required, initiate escrow
    if (inquiry.listing.requires_escrow) {
      await this.initiateEscrow(inquiry);
    }
  }

  // Complete transaction
  async completeTransaction(params: {
    inquiryId: string;
    sellerRating: number;
    buyerRating: number;
    sellerFeedback?: string;
    buyerFeedback?: string;
  }): Promise<void> {
    const inquiry = await db.wholesale_inquiries.findUnique({
      where: { id: params.inquiryId },
      include: { listing: true }
    });

    // Create transaction record
    await db.wholesale_transactions.create({
      data: {
        listing_id: inquiry.listing_id,
        seller_id: inquiry.seller_id,
        buyer_id: inquiry.buyer_id,
        items: inquiry.listing.items,
        total_items: inquiry.listing.total_items,
        final_price: inquiry.current_offer_amount || inquiry.listing.total_price,
        used_escrow: inquiry.listing.requires_escrow,
        seller_rating: params.sellerRating,
        buyer_rating: params.buyerRating,
        seller_feedback: params.sellerFeedback,
        buyer_feedback: params.buyerFeedback
      }
    });

    // Update inquiry
    await db.wholesale_inquiries.update({
      where: { id: params.inquiryId },
      data: { deal_status: 'completed' }
    });

    // Update listing
    await db.wholesale_listings.update({
      where: { id: inquiry.listing_id },
      data: { status: 'sold' }
    });

    // Update seller/buyer reputation
    await this.updateReputation(inquiry.seller_id, params.sellerRating);
    await this.updateReputation(inquiry.buyer_id, params.buyerRating);
  }

  // Get seller reputation
  private async getSellerReputation(userId: string): Promise<number> {
    const transactions = await db.wholesale_transactions.findMany({
      where: { seller_id: userId },
      select: { seller_rating: true }
    });

    if (transactions.length === 0) return 0;

    const avgRating = transactions
      .filter(t => t.seller_rating !== null)
      .reduce((sum, t) => sum + t.seller_rating, 0) / transactions.length;

    return avgRating;
  }

  // Update reputation
  private async updateReputation(userId: string, rating: number): Promise<void> {
    // Recalculate average rating
    const reputation = await this.getSellerReputation(userId);

    // Update cached reputation on all listings
    await db.wholesale_listings.updateMany({
      where: { seller_id: userId },
      data: { seller_reputation_score: reputation }
    });
  }
}
```

### API Endpoints

```typescript
// Get wholesale listings
GET /api/wholesale/listings?minValue=500&maxValue=5000&type=cases&sort=value
Response: {
  listings: [
    {
      id: "...",
      title: "1,000x Operation Bravo Cases",
      totalItems: 1000,
      totalPrice: 420.00,
      perUnitPrice: 0.42,
      isNegotiable: true,
      seller: {
        id: "...",
        username: "BulkTrader123",
        reputationScore: 4.8,
        totalTransactions: 47,
        isVerified: true
      },
      createdAt: "2025-11-01T10:00:00Z"
    },
    // ...
  ]
}

// Create wholesale listing
POST /api/wholesale/listings
Body: {
  title: "500x Operation Bravo Cases - Wholesale",
  description: "Selling 500 cases at wholesale price...",
  items: [
    { itemId: "...", quantity: 500, perUnitPrice: 0.45 }
  ],
  isNegotiable: true,
  minimumOffer: 200
}
Response: {
  id: "...",
  title: "500x Operation Bravo Cases - Wholesale",
  status: "active",
  expiresAt: "2025-12-01T10:00:00Z"
}

// Submit inquiry/offer
POST /api/wholesale/inquiries
Body: {
  listingId: "...",
  message: "I'll take all 500 for $210 total",
  offerAmount: 210
}
Response: {
  id: "...",
  currentOfferAmount: 210,
  currentOfferStatus: "pending"
}

// Accept offer
POST /api/wholesale/inquiries/:id/accept
Response: {
  success: true,
  dealStatus: "agreed",
  escrowRequired: true,
  escrowUrl: "/escrow/123"
}

// Get user's inquiries
GET /api/wholesale/inquiries/me?role=buyer
Response: {
  inquiries: [
    {
      id: "...",
      listing: { title: "...", totalPrice: 420 },
      currentOfferAmount: 400,
      currentOfferStatus: "pending",
      dealStatus: "negotiating",
      lastMessageAt: "2025-11-02T10:00:00Z"
    },
    // ...
  ]
}
```

### Frontend Components

```typescript
// Wholesale Marketplace Page
// pages/wholesale.tsx
export default function WholesaleMarketplacePage() {
  const [filters, setFilters] = useState({
    minValue: 100,
    maxValue: 10000,
    type: undefined,
    sort: 'value'
  })

  const { data } = useQuery({
    queryKey: ['wholesale-listings', filters],
    queryFn: () => fetch(`/api/wholesale/listings?${new URLSearchParams(filters)}`).then(r => r.json())
  })

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Wholesale Trading Board</h1>

      {/* Filters */}
      <WholesaleFilters filters={filters} onChange={setFilters} />

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data?.listings.map(listing => (
          <WholesaleListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  )
}

// Wholesale listing card
function WholesaleListingCard({ listing }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xl font-semibold">{listing.title}</h3>
        {listing.isNegotiable && (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
            Negotiable
          </span>
        )}
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-sm text-gray-600">Total Items</div>
          <div className="text-lg font-semibold">{listing.totalItems.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Total Price</div>
          <div className="text-lg font-semibold text-green-600">
            ${listing.totalPrice.toLocaleString()}
          </div>
        </div>
        {listing.perUnitPrice && (
          <>
            <div>
              <div className="text-sm text-gray-600">Per Unit</div>
              <div className="text-lg font-semibold">${listing.perUnitPrice.toFixed(2)}</div>
            </div>
          </>
        )}
      </div>

      {/* Seller Info */}
      <div className="flex items-center gap-2 mb-4 pb-4 border-b">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{listing.seller.username}</span>
            {listing.seller.isVerified && (
              <span className="text-blue-600">✓</span>
            )}
          </div>
          <div className="text-sm text-gray-600">
            ⭐ {listing.seller.reputationScore.toFixed(1)} ({listing.seller.totalTransactions} deals)
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => router.push(`/wholesale/${listing.id}`)}
          className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          View Details
        </button>
        <button
          onClick={() => handleSendOffer(listing.id)}
          className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
        >
          Make Offer
        </button>
      </div>
    </div>
  )
}

// Offer modal
function OfferModal({ listing, isOpen, onClose }) {
  const [offerAmount, setOfferAmount] = useState(listing.totalPrice * 0.9) // 10% below ask
  const [message, setMessage] = useState('')

  const handleSubmit = async () => {
    await fetch('/api/wholesale/inquiries', {
      method: 'POST',
      body: JSON.stringify({
        listingId: listing.id,
        message,
        offerAmount
      })
    })

    toast.success('Offer sent!')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Make an Offer</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Your Offer</label>
          <input
            type="number"
            value={offerAmount}
            onChange={(e) => setOfferAmount(parseFloat(e.target.value))}
            className="w-full px-3 py-2 border rounded"
          />
          <div className="text-sm text-gray-600 mt-1">
            Asking price: ${listing.totalPrice} • Your offer: ${offerAmount} ({((1 - offerAmount / listing.totalPrice) * 100).toFixed(1)}% discount)
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Message to Seller</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            rows={4}
            placeholder="I'm interested in purchasing all 500 cases..."
          />
        </div>

        <div className="flex gap-4">
          <button onClick={handleSubmit} className="btn-primary">
            Send Offer
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

- ✅ 50%+ bulk traders use wholesale board (of premium users)
- ✅ Average listing value: $500+
- ✅ 40%+ inquiry-to-deal conversion rate
- ✅ 30%+ repeat transactions (users return for more deals)
- ✅ Average 4.5+ stars seller rating

## Dependencies

### Must Have Before Starting
- [06] Steam Authentication (for user accounts)
- [11] Multi-Account Dashboard (bulk traders have inventories)
- [19] Bulk Escrow (for large transaction safety)

### Blocks Other Features
None (self-contained premium feature)

## Effort Estimate

- **Development Time:** 2-3 weeks
- **Complexity:** Medium-High
- **Team Size:** 1-2 developers

**Breakdown:**
- Week 1: Database schema, listing creation, inquiry system
- Week 2: Messaging/negotiation, reputation system
- Week 3: Frontend UI, testing

## Implementation Notes

### Reputation System

```typescript
// Calculate reputation score (1.0 - 5.0)
function calculateReputation(userId: string): Promise<number> {
  const transactions = await db.wholesale_transactions.findMany({
    where: {
      OR: [
        { seller_id: userId },
        { buyer_id: userId }
      ]
    }
  });

  const sellerRatings = transactions
    .filter(t => t.seller_id === userId && t.seller_rating)
    .map(t => t.seller_rating);

  const buyerRatings = transactions
    .filter(t => t.buyer_id === userId && t.buyer_rating)
    .map(t => t.buyer_rating);

  const allRatings = [...sellerRatings, ...buyerRatings];

  if (allRatings.length === 0) return 0;

  return allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length;
}
```

### Gotchas to Watch For

1. **Scams**
   - Fake sellers, payment disputes
   - Solution: Escrow for $500+, reputation system

2. **Lowball Spam**
   - Buyers offer 50% of asking price repeatedly
   - Solution: Block users, minimum offer threshold

3. **Listing Expiry**
   - Stale listings clutter marketplace
   - Solution: 30-day expiry, auto-archive

4. **Price Manipulation**
   - Sellers inflate total_value to appear high
   - Solution: Validate against market prices

5. **Negotiation Fatigue**
   - 20 inquiries, 0 deals = seller frustrated
   - Solution: "Serious buyers only" filter

## Status

- [ ] Research complete
- [ ] Database schema created
- [ ] Listing creation working
- [ ] Inquiry/negotiation system built
- [ ] Reputation system implemented
- [ ] Frontend UI complete
- [ ] Testing complete
- [ ] Deployed to production

## Related Features

- **Depends On:**
  - [06] Steam Authentication
  - [11] Multi-Account Dashboard
  - [19] Bulk Escrow

- **Enhances:**
  - [20] Seller Reputation System

## References

- Alibaba Trade Assurance: https://sale.alibaba.com/buyer/trade_assurance.htm
- eBay Wholesale Lots: https://www.ebay.com/b/Wholesale-Lots/45000/bn_1853146
- CS:GO Lounge History: https://csgolounge.com/
