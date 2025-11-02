# 05 - Fee Transparency & Total Cost Calculator

## Overview

Display true total cost including all marketplace fees, breaking down exactly what users will pay. Addresses major pain point: platforms hide effective fees (CS.MONEY shows "7%" but takes 27% with bot markup, TradeIt shows "2-60%" vaguely).

**Value Prop:** "See what you'll ACTUALLY pay - no hidden fees"

## User Segments Served

- **Primary:** All Users (100% - everyone wants price clarity)
- **Secondary:** Deal Hunters (need accurate arbitrage calculations)
- **Tertiary:** Bulk Traders (fees multiply on volume purchases)

## User Stories / Use Cases

### As a Casual Player
- I want to see "List Price: $10 + Fees: $0.20 (2%) = Total: $10.20" so I know my exact cost
- I want to compare "CSFloat total $10.20 vs Steam total $11.50" to see real savings
- I don't want surprises at checkout

### As a Deal Hunter
- I want to see effective fee rates to identify true arbitrage: "Buy CSFloat $10.20 total, Sell CS.MONEY $11 after 7% fee = $10.23 profit"
- I want fee breakdowns for bulk purchases: "100 cases × $1.02 each = $102 total with fees"

### As an Investor
- I want to calculate sell proceeds: "Sell at $100 on CSFloat (2% fee) = $98 in my pocket"
- I want to compare effective take-home across platforms

## Research & Context

### Fee Opacity Problem (from discovery research)

| Platform | Advertised Fee | Hidden Costs | Actual Cost | Transparency Score |
|----------|---------------|--------------|-------------|-------------------|
| **Steam** | "15%" | Split as 10% + 5% (confusing) | 15% | ⭐⭐ |
| **CSFloat** | "2%" | None | 2% | ⭐⭐⭐⭐⭐ |
| **CS.MONEY** | "7%" | +20% bot markup | ~27% | ⭐ |
| **TradeIt** | "2-60%" | Varies by item/method | Unknown until checkout | ⭐ |
| **DMarket** | "2-10%" | Item-dependent | Unknown | ⭐⭐ |
| **Buff163** | "2.5%" | None | 2.5% | ⭐⭐⭐⭐ |

**User Complaints (from research):**
- "I thought it was $10 but paid $11.50 at checkout"
- "CS.MONEY says 7% but I only got $73 for a $100 item"
- "TradeIt fee was way higher than expected"

**csloadout.gg Advantage:**
✅ Show TOTAL upfront (list + fees)
✅ Break down fee components
✅ Compare net proceeds across platforms
✅ No surprises

### Fee Types to Account For

**Buyer-Side Fees:**
```
1. Platform Transaction Fee: X% of purchase price
2. Payment Processing Fee: Credit card, PayPal fees (if applicable)
3. Currency Conversion Fee: If buying in non-native currency
4. Withdrawal Fee: To move items to Steam inventory (some platforms)
```

**Seller-Side Fees (for showing proceeds):**
```
1. Listing Fee: Some platforms charge to list
2. Sale Commission: % of sale price
3. Withdrawal Fee: To cash out (PayPal, crypto, etc.)
4. Trade Hold Fee: Extra fee for items on hold (TradeIt)
```

**Hidden Fees (must expose):**
```
1. Bot Markup: CS.MONEY's 20% over "market price"
2. Spread: Buy price vs sell price difference
3. Minimum Price Floors: Can't list below X
4. Maximum Price Caps: Steam's $1,800 limit
```

### Fee Data Sources

**Option A: Hardcode Fee Structures**
```typescript
const PLATFORM_FEES = {
  steam: { buyer: 0, seller: 15, type: 'percentage' },
  csfloat: { buyer: 0, seller: 2, type: 'percentage' },
  csmoney: { buyer: 0, seller: 7, hidden_markup: 20 }, // Document bot markup
  tradeit: { buyer: 0, seller: 2, max_seller: 60, note: 'Varies by item' },
  dmarket: { buyer: 0, seller_min: 2, seller_max: 10, note: 'Item-dependent' },
  buff163: { buyer: 0, seller: 2.5, type: 'percentage' }
};
```
**Pro:** Simple, immediate implementation
**Con:** Requires manual updates if platforms change fees

**Option B: Scrape Fee Info from Platforms**
```typescript
// Periodic scraper checks each platform's fee page
async function scrapePlatformFees(platform: string): Promise<FeeStructure> {
  // ...
}
```
**Pro:** Auto-updated
**Con:** Fragile, platforms may block

**Option C: User-Reported Fees**
```typescript
// Community submits actual fees paid
// Average submissions for accuracy
```
**Pro:** Real-world data
**Con:** Slow to update, requires moderation

**MVP Decision:** Option A (hardcoded) + manual monitoring of platform fee pages

## Technical Requirements

### Database Schema Extension

```sql
-- Extend marketplace_prices table from [04-price-aggregation.md]
ALTER TABLE marketplace_prices
ADD COLUMN buyer_fee_percent DECIMAL(5,2) DEFAULT 0,
ADD COLUMN buyer_fee_fixed DECIMAL(10,2) DEFAULT 0,
ADD COLUMN hidden_fees_percent DECIMAL(5,2) DEFAULT 0, -- e.g., CS.MONEY bot markup
ADD COLUMN fee_breakdown JSONB; -- Detailed breakdown for complex fee structures

-- Example fee_breakdown JSON:
{
  "base_price": 10.00,
  "platform_fee": { "percent": 2, "amount": 0.20 },
  "payment_processing": { "percent": 0, "amount": 0 },
  "hidden_markup": { "percent": 0, "amount": 0 },
  "total_cost": 10.20,
  "fee_notes": ["2% platform fee", "No payment processing fees"]
}

-- Platform fee configuration table
CREATE TABLE platform_fee_config (
  platform VARCHAR(50) PRIMARY KEY,
  buyer_fee_percent DECIMAL(5,2) DEFAULT 0,
  buyer_fee_fixed DECIMAL(10,2) DEFAULT 0,
  seller_fee_percent DECIMAL(5,2) DEFAULT 0,
  seller_fee_fixed DECIMAL(10,2) DEFAULT 0,
  hidden_markup_percent DECIMAL(5,2) DEFAULT 0, -- Document known hidden fees
  fee_notes TEXT[], -- Human-readable fee explanations
  last_verified TIMESTAMP,
  source_url TEXT -- Link to platform's fee page
);

-- Seed with known fee structures
INSERT INTO platform_fee_config (platform, seller_fee_percent, fee_notes, source_url) VALUES
('steam', 15.00, ARRAY['10% Steam fee', '5% game-specific fee'], 'https://steamcommunity.com/market/'),
('csfloat', 2.00, ARRAY['2% sale fee', 'No buyer fees'], 'https://blog.csfloat.com/changes-to-fees-on-csgofloat-market/'),
('csmoney', 7.00, ARRAY['7% platform fee', '~20% bot markup (estimated)'], 'https://cs.money/market/'),
('tradeit', 2.00, ARRAY['2-60% fee varies by item and trade method'], 'https://tradeit.gg/'),
('buff163', 2.50, ARRAY['2.5% sale fee'], 'https://buff.163.com/'),
('dmarket', 2.00, ARRAY['2-10% fee varies by item liquidity'], 'https://dmarket.com/');
```

### Total Cost Calculation

```typescript
interface FeeBreakdown {
  basePrice: number;
  fees: {
    platformFee: { percent: number; amount: number; description: string };
    paymentProcessing?: { percent: number; amount: number; description: string };
    hiddenMarkup?: { percent: number; amount: number; description: string };
    withdrawal?: { fixed: number; description: string };
  };
  totalCost: number;
  effectiveFeePercent: number; // Total fees as % of base price
  feeNotes: string[];
}

function calculateTotalCost(basePrice: number, platform: string): FeeBreakdown {
  const config = getFeeConfig(platform);

  const platformFeeAmount = basePrice * (config.buyer_fee_percent / 100) + config.buyer_fee_fixed;
  const hiddenMarkupAmount = config.hidden_markup_percent ? basePrice * (config.hidden_markup_percent / 100) : 0;

  const totalFees = platformFeeAmount + hiddenMarkupAmount;
  const totalCost = basePrice + totalFees;

  return {
    basePrice,
    fees: {
      platformFee: {
        percent: config.buyer_fee_percent,
        amount: platformFeeAmount,
        description: `${config.buyer_fee_percent}% platform fee`
      },
      hiddenMarkup: config.hidden_markup_percent ? {
        percent: config.hidden_markup_percent,
        amount: hiddenMarkupAmount,
        description: `~${config.hidden_markup_percent}% estimated bot markup`
      } : undefined
    },
    totalCost,
    effectiveFeePercent: (totalFees / basePrice) * 100,
    feeNotes: config.fee_notes
  };
}

// Example usage:
const breakdown = calculateTotalCost(10.00, 'csmoney');
// {
//   basePrice: 10.00,
//   fees: {
//     platformFee: { percent: 7, amount: 0.70, description: "7% platform fee" },
//     hiddenMarkup: { percent: 20, amount: 2.00, description: "~20% estimated bot markup" }
//   },
//   totalCost: 12.70,
//   effectiveFeePercent: 27,
//   feeNotes: ["7% platform fee", "~20% bot markup (estimated)"]
// }
```

### Seller Proceeds Calculator

```typescript
function calculateSellerProceeds(salePrice: number, platform: string): {
  salePrice: number;
  fees: number;
  proceeds: number;
  effectiveFeePercent: number;
} {
  const config = getFeeConfig(platform);
  const feeAmount = salePrice * (config.seller_fee_percent / 100) + config.seller_fee_fixed;
  const proceeds = salePrice - feeAmount;

  return {
    salePrice,
    fees: feeAmount,
    proceeds,
    effectiveFeePercent: (feeAmount / salePrice) * 100
  };
}

// Example: Selling $100 item on CSFloat
// { salePrice: 100, fees: 2, proceeds: 98, effectiveFeePercent: 2 }

// Example: Selling $100 item on Steam
// { salePrice: 100, fees: 15, proceeds: 85, effectiveFeePercent: 15 }
```

### API Endpoints

```typescript
// Get detailed fee breakdown for an item on specific platform
GET /api/items/:itemId/fees?platform=csfloat
Response: {
  itemId: "...",
  platform: "csfloat",
  basePrice: 10.00,
  feeBreakdown: {
    platformFee: { percent: 2, amount: 0.20 },
    totalCost: 10.20,
    effectiveFeePercent: 2
  },
  sellerProceeds: {
    salePrice: 10.00,
    fees: 0.20,
    proceeds: 9.80
  }
}

// Compare fees across all platforms for an item
GET /api/items/:itemId/fee-comparison
Response: {
  itemId: "...",
  platforms: [
    {
      platform: "csfloat",
      basePrice: 10.00,
      totalCost: 10.20,
      effectiveFee: 2,
      rank: 1  // Cheapest
    },
    {
      platform: "buff163",
      basePrice: 10.10,
      totalCost: 10.35,
      effectiveFee: 2.5,
      rank: 2
    },
    {
      platform: "steam",
      basePrice: 10.00,
      totalCost: 11.50,
      effectiveFee: 15,
      rank: 3
    }
  ],
  savings: 1.30  // Best vs worst
}
```

### Frontend Components

```typescript
// Fee Breakdown Component (tooltip/expandable)
<FeeBreakdown price={priceData}>
  <div className="fee-breakdown">
    <div className="base-price">
      <span>Base Price:</span>
      <span>${priceData.basePrice}</span>
    </div>

    {Object.entries(priceData.fees).map(([key, fee]) => (
      <div key={key} className="fee-line">
        <span>{fee.description}:</span>
        <span>+${fee.amount} ({fee.percent}%)</span>
      </div>
    ))}

    <div className="total-cost font-bold">
      <span>Total You Pay:</span>
      <span>${priceData.totalCost}</span>
    </div>

    {priceData.feeNotes.length > 0 && (
      <div className="fee-notes text-sm text-gray-600">
        {priceData.feeNotes.map(note => (
          <div key={note}>ℹ️ {note}</div>
        ))}
      </div>
    )}
  </div>
</FeeBreakdown>

// Seller Proceeds Calculator Component
<SellerProceedsCalculator item={item}>
  <input
    type="number"
    placeholder="Enter sale price"
    value={salePrice}
    onChange={(e) => setSalePrice(e.target.value)}
  />

  <table>
    <thead>
      <tr>
        <th>Platform</th>
        <th>Sale Price</th>
        <th>Fees</th>
        <th>You Receive</th>
      </tr>
    </thead>
    <tbody>
      {platforms.map(platform => {
        const proceeds = calculateSellerProceeds(salePrice, platform);
        return (
          <tr key={platform}>
            <td>{platform}</td>
            <td>${proceeds.salePrice}</td>
            <td className="text-red-600">-${proceeds.fees} ({proceeds.effectiveFeePercent}%)</td>
            <td className="font-bold text-green-600">${proceeds.proceeds}</td>
          </tr>
        );
      })}
    </tbody>
  </table>
</SellerProceedsCalculator>

// Fee Comparison Badge (on price cards)
<FeeComparisonBadge platform={platform} effectiveFee={effectiveFee}>
  {effectiveFee <= 3 ? (
    <span className="badge badge-green">Low Fees: {effectiveFee}%</span>
  ) : effectiveFee <= 10 ? (
    <span className="badge badge-yellow">Medium Fees: {effectiveFee}%</span>
  ) : (
    <span className="badge badge-red">High Fees: {effectiveFee}%</span>
  )}
</FeeComparisonBadge>
```

## Success Metrics

- ✅ 100% fee transparency (all known fees documented)
- ✅ <1% user-reported fee surprises ("I paid more than shown")
- ✅ 50%+ users engage with fee breakdowns (clicks/hovers)
- ✅ 20%+ increase in CSFloat affiliate clicks (lowest fees = more clicks)
- ✅ Zero complaints about hidden fees

## Dependencies

### Must Have Before Starting
- [04] Price Aggregation (provides base prices)
- Platform fee research (document all fee structures)

### Blocks Other Features
- [17] Advanced Deal Alerts (needs accurate fee calculations for arbitrage)
- [21] Inventory Optimization (sell proceeds calculations)

## Effort Estimate

- **Development Time:** 1 week
- **Complexity:** Low-Medium
- **Team Size:** 1 developer

**Breakdown:**
- Days 1-2: Research platform fees, create config table, seed data
- Days 3-4: Implement calculation logic, API endpoints
- Days 5-6: Frontend components, tooltips, comparison tables
- Day 7: Testing, documentation

## Implementation Notes

### Fee Verification System

```typescript
// Community-reported fees for verification
CREATE TABLE user_reported_fees (
  id UUID PRIMARY KEY,
  platform VARCHAR(50),
  item_name VARCHAR(255),
  expected_cost DECIMAL(10,2), -- What csloadout.gg showed
  actual_cost DECIMAL(10,2),   -- What user actually paid
  screenshot_url TEXT,          -- Proof
  reported_at TIMESTAMP,
  verified BOOLEAN DEFAULT FALSE
);

// Alert system if reported fees deviate >5% from config
async function checkFeeAccuracy() {
  const reports = await db.userReportedFees.findMany({
    where: { verified: false }
  });

  for (const report of reports) {
    const deviation = Math.abs((report.actual_cost - report.expected_cost) / report.expected_cost);
    if (deviation > 0.05) {
      // Alert admin to review fee config
      await sendAlert(`Fee mismatch on ${report.platform}: expected ${report.expected_cost}, actual ${report.actual_cost}`);
    }
  }
}
```

### Critical Gotchas (Research-Backed - 2025)

#### 🔴 CRITICAL SEVERITY

**1. FTC Junk Fees Rule - Effective May 12, 2025 (LEGAL REQUIREMENT)**
- **Issue:** FTC Rule on Unfair or Deceptive Fees requires total price disclosure upfront including all mandatory fees. Applies to live-event tickets and short-term lodging (may expand). Civil penalties up to $53,088 per violation.
- **Impact on csloadout.gg:** While we're not tickets/lodging, rule signals FTC enforcement priorities on fee transparency. Expect expansion to e-commerce.
- **Solution:**
  - Display total price prominently upfront
  - Include all mandatory fees except government taxes, shipping, and optional services
  - Ensure total price displayed more prominently than other pricing information
  - Document compliance for regulatory defense
- **Code Example:**
```typescript
// ✅ CORRECT: FTC-compliant total price display
<div className="price-display">
  <div className="total-price" style="font-size: 2rem; font-weight: bold;">
    ${totalPrice.toFixed(2)}
  </div>
  <div className="base-price" style="font-size: 1rem; color: gray;">
    Base: ${basePrice} + Fees: ${fees}
  </div>
</div>

// ❌ WRONG: Base price more prominent than total
<div className="price-display">
  <div className="base-price" style="font-size: 2rem;">
    ${basePrice}
  </div>
  <div className="total-price" style="font-size: 1rem;">
    Total: ${totalPrice}
  </div>
</div>
```
- **Source:** FTC Press Release May 2025, FTC FAQ on Unfair or Deceptive Fees Rule

**2. Drip Pricing Prohibition - US & UK (CRITICAL)**
- **Issue:** Drip pricing (showing initial headline price then revealing additional fees during checkout) is prohibited under UK DMCC Act (April 6, 2025) and FTC Junk Fees Rule (May 12, 2025). 75% of consumers face hidden fees appearing only at checkout. Causes cart abandonment and consumer complaints.
- **Penalties:**
  - UK: Fines up to 10% of global turnover for businesses, £300,000 for individuals
  - US: $53,088 per violation
- **Solution:**
  - Display total price upfront in all invitations to purchase
  - Include all mandatory fees, taxes, charges
  - No progressive disclosure of fees during checkout flow
  - Show fee breakdown but make total price most prominent
- **Code Example:**
```typescript
// ✅ CORRECT: All-in pricing upfront
<ProductCard>
  <h3>{item.name}</h3>
  <div className="price-primary">${totalCost}</div>
  <button onClick={() => showFeeBreakdown()}>See fee breakdown</button>
</ProductCard>

// ❌ WRONG: Drip pricing (progressive disclosure)
<ProductCard>
  <div className="base-price">${basePrice}</div>
  {/* Fees revealed only after clicking "Buy Now" */}
</ProductCard>
```
- **Real-World Data:** India 2025 audit found 75% of consumers experienced hidden checkout fees, leading to government investigations
- **Source:** UK DMCC Act 2025, FTC Junk Fees Rule, LocalCircles India Audit 2025

**3. Dark Patterns - Hidden Fees with Misleading Labels (CRITICAL)**
- **Issue:** India 2025 audit: Amazon, Flipkart, Myntra add Rs 7-10 "handling" fees for Cash-on-Delivery. 97% of 290 major platforms use dark patterns despite 2023 prohibition. Classified as deceptive practice under consumer protection law.
- **Real-World Example:** Government of India launched probe in October 2025 into e-commerce platforms for misleading COD fee labels
- **Solution:**
  - Eliminate hidden fees with misleading names like "offer handling," "payment protection," "platform fee"
  - All fees must be clearly labeled with actual purpose ("2% CSFloat marketplace commission")
  - Include in upfront total price
  - Comply with Central Consumer Protection Authority (India) and FTC (US) dark pattern prohibitions
- **Code Example:**
```typescript
// ✅ CORRECT: Clear, honest fee labels
const feeBreakdown = {
  platformFee: {
    label: "CSFloat Marketplace Commission (2%)",
    amount: 0.20
  },
  paymentProcessing: {
    label: "Credit Card Processing Fee",
    amount: 0.30
  }
};

// ❌ WRONG: Misleading fee labels
const feeBreakdown = {
  handling: { label: "Convenience Fee", amount: 0.50 },  // What is this?
  protection: { label: "Buyer Protection", amount: 1.00 }  // Sounds optional but isn't
};
```
- **Symptoms:** Government investigation, consumer complaints, enforcement action, brand reputation damage
- **Source:** LocalCircles National Audit June-Sept 2025, India Dept of Consumer Affairs Probe Oct 2025

**4. State Fee Transparency Laws - 7 States with Varying Requirements (CRITICAL)**
- **Issue:** California SB 478 (July 1, 2024), Minnesota (Jan 1, 2025), Massachusetts 940 CMR 38 (Sept 2, 2025), plus CO, CT, MD, NY, TN. Penalties $1,000-$10,000 per violation. Must display all-in pricing except government taxes and shipping.
- **State-Specific Effective Dates:**
  - California: July 1, 2024 (already in effect)
  - Minnesota: January 1, 2025
  - Massachusetts: September 2, 2025
  - Others: Various dates through 2025
- **Solution:**
  - Implement geolocation-aware pricing display
  - For users in regulated states, show all-in pricing
  - Track state law effective dates in database
  - Exclude only government taxes and shipping from total price requirement
- **Code Example:**
```typescript
const REGULATED_STATES = ['CA', 'CO', 'CT', 'MD', 'MN', 'NY', 'TN', 'MA'];

async function getPriceDisplay(userLocation: string, item: Item) {
  const userState = await getUserState(userLocation);

  if (REGULATED_STATES.includes(userState)) {
    // Show all-in pricing (mandatory fees included)
    return {
      displayPrice: item.basePrice + item.mandatoryFees,
      breakdown: {
        base: item.basePrice,
        fees: item.mandatoryFees,
        taxes: "Calculated at checkout", // OK to exclude
        shipping: "Calculated at checkout" // OK to exclude
      }
    };
  } else {
    // Standard display (can show fees separately)
    return {
      displayPrice: item.basePrice,
      fees: item.mandatoryFees
    };
  }
}
```
- **Source:** California SB 478, Massachusetts 940 CMR 38, state legislation databases

#### 🟠 MAJOR SEVERITY

**5. Payment Processing Fee Disclosure - Stripe/PayPal Transparency (MAJOR)**
- **Issue:** Stripe charges 2.9% + $0.30, PayPal charges 2.59%-3.49% + $0.49. Many platforms absorb these fees but don't disclose them, or pass them to users without transparency. Interchange-plus pricing more transparent than flat-rate but complex.
- **Solution:**
  - If passing payment processing fees to users, disclose upfront in total price
  - Link to Stripe/PayPal official pricing pages for transparency
  - Consider absorbing fees for simpler UX (build into product pricing)
  - If showing breakdown, label as "Credit Card Processing (Stripe)"
- **Code Example:**
```typescript
// ✅ CORRECT: Transparent payment processing fee
<FeeBreakdown>
  <FeeItem>
    <label>
      Credit Card Processing
      <a href="https://stripe.com/pricing" target="_blank">(Stripe rates)</a>
    </label>
    <amount>+$0.30 (2.9%)</amount>
  </FeeItem>
</FeeBreakdown>

// ❌ WRONG: Hidden or vague payment fee
<FeeBreakdown>
  <FeeItem>
    <label>Processing Fee</label>  {/* What processor? What rate? */}
    <amount>+$0.50</amount>
  </FeeItem>
</FeeBreakdown>
```
- **Source:** Stripe Official Pricing, PayPal Merchant Fees, industry analysis

**6. Fee Calculator UX - Timing of Disclosure (MAJOR - NN/G Research)**
- **Issue:** NN/G research shows users want general cost idea BEFORE checkout. Best practice: embed location field on product page, show fee estimate before cart. Unusual/unique fees must be disclosed before checkout process.
- **Real-World Example:** Restoration Hardware best practice - baseline delivery price + ZIP code calculator on product page
- **Solution:**
  - Embed ZIP code calculator on product pages for shipping estimates
  - Display baseline fees upfront ("Estimated marketplace fee: 2-15%")
  - Acknowledge existence of fees even if exact amount requires more info
  - List all potential costs (taxes, shipping, platform fees) early in shopping process
- **Code Example:**
```typescript
// ✅ CORRECT: Product page embedded calculator (Restoration Hardware pattern)
<ProductPage>
  <ProductInfo />
  <PriceDisplay>
    <BasePrice>${item.price}</BasePrice>
    <FeeEstimator>
      <label>Estimate total cost:</label>
      <input
        type="text"
        placeholder="Enter ZIP code"
        onChange={calculateShipping}
      />
      {estimatedTotal && (
        <div>
          <div>Estimated shipping: ${shippingCost}</div>
          <div>Platform fee (2%): ${platformFee}</div>
          <div className="total">Estimated total: ${estimatedTotal}</div>
        </div>
      )}
    </FeeEstimator>
  </PriceDisplay>
</ProductPage>

// ❌ WRONG: No fee disclosure until checkout
<ProductPage>
  <BasePrice>${item.price}</BasePrice>
  {/* User doesn't see fees until they click "Buy Now" */}
</ProductPage>
```
- **Symptoms:** Cart abandonment, user frustration, negative reviews about "surprise fees"
- **Source:** Nielsen Norman Group "How to Display Taxes, Fees, and Shipping Charges on Ecommerce Sites"

#### 🟡 MEDIUM SEVERITY

**7. Dynamic Fees**
- Some platforms change fees based on item value or user tier
- Solution: Document as ranges, show "may vary" warning

**8. Currency Conversion**
- Buying in EUR when user has USD
- Banks charge 2-3% conversion
- Solution: Include currency conversion fee in calculator

**9. Withdrawal Fees**
- Some platforms charge to move items to Steam
- Solution: Add to "Total Cost of Ownership" calculation

**10. Trade Hold Fees**
- TradeIt charges 0-13% extra for items on trade hold
- Solution: Document in fee notes, can't predict exactly

**11. Promotional Periods**
- Platforms sometimes waive fees (0% weekends)
- Solution: Don't hardcode, allow admin to update

## Status

- [ ] Research complete (all platform fees documented)
- [ ] Database schema updated
- [ ] Fee config table seeded
- [ ] Calculation logic implemented
- [ ] API endpoints built
- [ ] Frontend components created
- [ ] Testing complete
- [ ] User verification system deployed
- [ ] Deployed to production

## Related Features

- **Depends On:**
  - [04] Price Aggregation

- **Enables:**
  - [17] Advanced Deal Alerts
  - [19] Bulk Escrow (calculates escrow fees)
  - [21] Inventory Optimization

## Authoritative Documentation & Sources

### Fee Transparency Regulations
- [FTC Press Release - Rule on Unfair or Deceptive Fees (May 12, 2025)](https://www.ftc.gov/news-events/news/press-releases/2025/05/ftc-rule-unfair-or-deceptive-fees-take-effect-may-12-2025)
- [FTC FAQ - Rule on Unfair or Deceptive Fees](https://www.ftc.gov/business-guidance/resources/rule-unfair-or-deceptive-fees-frequently-asked-questions)
- [Barnes & Thornburg - FTC Finalizes 'Junk Fees' Rule](https://btlaw.com/en/insights/alerts/2025/ftc-finalizes-junk-fees-rule-new-pricing-disclosure-requirements-take-effect-may-12-2025)
- [UK DMCC Act - Drip Pricing Prohibitions (April 6, 2025)](https://www.taylorwessing.com/en/insights-and-events/insights/2025/04/dmcca-drip-pricing)

### State Fee Transparency Laws
- [California SB 478 - Honest Pricing Law (July 1, 2024)](https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202320240SB478)
- [Massachusetts 940 CMR 38 - Junk Fees Regulations (September 2, 2025)](https://www.mass.gov/regulations/940-CMR-38-00)
- [RunSignup - Fee Transparency Laws Overview](https://info.runsignup.com/2024/05/29/fee-transparency-laws-will-change-how-pricing-is-displayed/)

### Dark Patterns & Consumer Protection
- [LocalCircles India Audit 2025 - Dark Patterns Report](https://www.medianama.com/2025/10/223-localcircles-e-commerce-platforms-dark-patterns-hidden-fees/)
- [India Government Probe - COD Fee Dark Patterns (Oct 2025)](https://aninews.in/news/business/govt-launches-probe-into-e-commerce-platforms-over-extra-charges-classified-as-dark-pattern20251005101538/)

### UX Best Practices
- [Nielsen Norman Group - How to Display Taxes, Fees, and Shipping Charges](https://www.nngroup.com/articles/ecommerce-taxes-fees/)
- [HulkApps - Mastering E-commerce UX: The Art of Displaying Prices](https://www.hulkapps.com/blogs/ecommerce-hub/mastering-e-commerce-ux-the-art-of-displaying-prices)

### Payment Processing Transparency
- [Stripe Official Pricing](https://stripe.com/pricing)
- [Stripe Payment Processing Best Practices](https://stripe.com/guides/payment-processing-best-practices)
- [PayPal Merchant Fees](https://www.paypal.com/us/webapps/mpp/merchant-fees)
- [Swipesum - Stripe Fees Explained 2025](https://www.swipesum.com/insights/guide-to-stripe-fees-rates-for-2025)

## References

- Steam Market Fees: https://steamcommunity.com/market/
- CSFloat Fee Changes: https://blog.csfloat.com/changes-to-fees-on-csgofloat-market/
- DMarket Fee Structure: https://dmarket.com/blog/understanding-fees-on-dmarket/
- PayPal Fee Calculator: https://www.paypal.com/us/webapps/mpp/merchant-fees
