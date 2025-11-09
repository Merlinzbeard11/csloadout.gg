Feature: Fee Transparency & Total Cost Calculator
  As a CS2 skin buyer
  I want to see the true total cost including all fees
  So that I know exactly what I'll pay with no surprises at checkout

  Background:
    Given the following platform fee configurations exist:
      | platform  | buyer_fee_percent | seller_fee_percent | hidden_markup_percent | fee_notes                                    |
      | steam     | 0                 | 15.00              | 0                     | 10% Steam fee + 5% game-specific fee         |
      | csfloat   | 0                 | 2.00               | 0                     | 2% sale fee, No buyer fees                   |
      | csmoney   | 0                 | 7.00               | 20.00                 | 7% platform fee + ~20% bot markup (estimated)|
      | tradeit   | 0                 | 2.00               | 0                     | 2-60% fee varies by item and trade method    |
      | buff163   | 0                 | 2.50               | 0                     | 2.5% sale fee                                |
      | dmarket   | 0                 | 2.00               | 0                     | 2-10% fee varies by item liquidity           |

  # ============================================================================
  # Scenario: Basic Fee Calculation and Display
  # ============================================================================

  Scenario: Display total cost with fee breakdown for CSFloat listing
    Given an item "AK-47 | Redline (Field-Tested)" is listed on "csfloat" for $10.00
    When I view the price details
    Then I should see the fee breakdown:
      | Component      | Amount  |
      | Base Price     | $10.00  |
      | Platform Fee   | $0.00   |
      | Total You Pay  | $10.00  |
    And the effective fee percentage should be "0%"
    And I should see the fee note "2% sale fee (seller pays, not buyer)"

  Scenario: Display total cost with buyer fees
    Given an item "AWP | Asiimov (Field-Tested)" is listed on "hypothetical_platform" for $50.00
    And "hypothetical_platform" has a buyer fee of "3%"
    When I view the price details
    Then I should see the fee breakdown:
      | Component      | Amount  |
      | Base Price     | $50.00  |
      | Platform Fee   | $1.50   |
      | Total You Pay  | $51.50  |
    And the effective fee percentage should be "3.00%"

  Scenario: Expose hidden bot markup fees (CS.MONEY)
    Given an item "Butterfly Knife | Fade (Factory New)" is listed on "csmoney" for $1000.00
    When I view the price details
    Then I should see the fee breakdown:
      | Component         | Amount   |
      | Base Price        | $1000.00 |
      | Hidden Bot Markup | $200.00  |
      | Total You Pay     | $1200.00 |
    And the effective fee percentage should be "20.00%"
    And I should see a warning "⚠️ Includes ~20% estimated bot markup"
    And I should see the fee note "7% platform fee + ~20% bot markup (estimated)"

  # ============================================================================
  # Scenario: Seller Proceeds Calculation
  # ============================================================================

  Scenario: Calculate seller proceeds for Steam sale
    Given I want to sell an item for $100.00
    When I calculate seller proceeds for "steam"
    Then I should see the proceeds breakdown:
      | Component        | Amount  |
      | Sale Price       | $100.00 |
      | Steam Fee (15%)  | -$15.00 |
      | You Receive      | $85.00  |
    And the effective fee percentage should be "15.00%"

  Scenario: Calculate seller proceeds for CSFloat sale (lowest fees)
    Given I want to sell an item for $100.00
    When I calculate seller proceeds for "csfloat"
    Then I should see the proceeds breakdown:
      | Component        | Amount  |
      | Sale Price       | $100.00 |
      | Platform Fee (2%)| -$2.00  |
      | You Receive      | $98.00  |
    And the effective fee percentage should be "2.00%"
    And I should see a badge "Low Fees: 2%"

  Scenario: Compare seller proceeds across all platforms
    Given I want to sell an item for $100.00
    When I view the seller proceeds comparison table
    Then I should see proceeds for all platforms:
      | Platform | Sale Price | Fees    | You Receive | Effective Fee |
      | csfloat  | $100.00    | -$2.00  | $98.00      | 2.00%         |
      | buff163  | $100.00    | -$2.50  | $97.50      | 2.50%         |
      | csmoney  | $100.00    | -$7.00  | $93.00      | 7.00%         |
      | dmarket  | $100.00    | -$2.00  | $98.00      | 2.00%         |
      | steam    | $100.00    | -$15.00 | $85.00      | 15.00%        |
      | tradeit  | $100.00    | -$2.00  | $98.00      | 2.00%         |
    And "csfloat" should be highlighted as "Best Proceeds"

  # ============================================================================
  # Scenario: Fee Comparison Across Platforms
  # ============================================================================

  Scenario: Compare total cost across platforms for same item
    Given an item "M4A4 | Howl (Factory New)" is available on multiple platforms:
      | Platform | Base Price |
      | csfloat  | $2000.00   |
      | csmoney  | $1800.00   |
      | buff163  | $1950.00   |
    When I view the price comparison
    Then I should see total costs including fees:
      | Platform | Base Price | Fees    | Total Cost | Savings vs Highest |
      | csfloat  | $2000.00   | $0.00   | $2000.00   | $160.00            |
      | csmoney  | $1800.00   | $360.00 | $2160.00   | $0.00              |
      | buff163  | $1950.00   | $0.00   | $1950.00   | $210.00            |
    And "buff163" should be highlighted as "Best Total Price"
    And I should see "Save $210 vs CS.MONEY"

  Scenario: Show fee transparency badges on price cards
    Given an item "Glock-18 | Water Elemental (Minimal Wear)" is listed on "csfloat" for $5.00
    When I view the price card
    Then I should see a badge "Low Fees: 0%" in green
    And when I hover over the badge
    Then I should see a tooltip with:
      """
      Base Price: $5.00
      Platform Fee: $0.00 (0%)
      Total You Pay: $5.00

      ℹ️ 2% sale fee (seller pays, not buyer)
      """

  Scenario: Show high fee warning for CS.MONEY listings
    Given an item "Karambit | Doppler (Factory New)" is listed on "csmoney" for $500.00
    When I view the price card
    Then I should see a badge "High Fees: 20%" in red
    And I should see a warning icon "⚠️"
    And when I hover over the badge
    Then I should see a tooltip with:
      """
      Base Price: $500.00
      Hidden Bot Markup: $100.00 (20%)
      Total You Pay: $600.00

      ⚠️ Includes ~20% estimated bot markup
      ℹ️ 7% platform fee + ~20% bot markup (estimated)
      """

  # ============================================================================
  # Scenario: Decimal Precision and Rounding
  # ============================================================================

  Scenario: Handle decimal precision correctly for fee calculations
    Given an item "P250 | See Ya Later (Field-Tested)" is listed on "hypothetical_platform" for $1.37
    And "hypothetical_platform" has a buyer fee of "2.5%"
    When I calculate the total cost
    Then the platform fee should be exactly "$0.03" (not $0.034)
    And the total cost should be exactly "$1.40"
    And all monetary values should be rounded to 2 decimal places

  Scenario: Handle high-value item fees with precision
    Given an item "AWP | Dragon Lore (Factory New)" is listed on "csfloat" for $9876.54
    And "csfloat" has a seller fee of "2%"
    When I calculate seller proceeds
    Then the platform fee should be exactly "$197.53"
    And the seller proceeds should be exactly "$9679.01"
    And no rounding errors should accumulate

  Scenario: Handle very small fees (under $0.01)
    Given an item "Sticker | Titan (Holo) | Katowice 2014" is listed on "hypothetical_platform" for $0.15
    And "hypothetical_platform" has a buyer fee of "2%"
    When I calculate the total cost
    Then the platform fee should be exactly "$0.00" (rounds to zero)
    And the total cost should be exactly "$0.15"
    And I should see a note "Fee less than $0.01"

  # ============================================================================
  # Scenario: Fee Notes and Transparency
  # ============================================================================

  Scenario: Display comprehensive fee notes for TradeIt (variable fees)
    Given an item "Desert Eagle | Printstream (Factory New)" is listed on "tradeit" for $75.00
    When I view the fee details
    Then I should see a warning "⚠️ Fees vary by item and trade method (2-60%)"
    And I should see "Actual fee shown at checkout"
    And the fee breakdown should note "2-60% fee varies by item and trade method"

  Scenario: Display comprehensive fee notes for DMarket (item-dependent fees)
    Given an item "AK-47 | The Empress (Minimal Wear)" is listed on "dmarket" for $30.00
    When I view the fee details
    Then I should see a warning "ℹ️ Fees vary by item liquidity (2-10%)"
    And I should see "Check DMarket for exact fee"
    And the fee breakdown should note "2-10% fee varies by item liquidity"

  Scenario: Link to platform fee documentation
    Given I am viewing fee details for "steam"
    When I click "Where do these fees come from?"
    Then I should see a link to "https://steamcommunity.com/market/"
    And I should see "Last verified: [date]"
    And I should see "Report incorrect fees" link

  # ============================================================================
  # Scenario: Arbitrage and Deal Hunting
  # ============================================================================

  Scenario: Calculate arbitrage profit accounting for fees
    Given an item "AK-47 | Redline (Field-Tested)" is available:
      | Platform | Buy Price | Sell Price | Buy Fees | Sell Fees |
      | csfloat  | $10.00    | $12.00     | $0.00    | 2%        |
      | steam    | $11.00    | $13.00     | $0.00    | 15%       |
    When I calculate arbitrage opportunities
    Then I should see:
      | Buy From | Buy Total | Sell On | Sell Proceeds | Profit  | ROI    |
      | csfloat  | $10.00    | steam   | $11.05        | $1.05   | 10.5%  |
      | csfloat  | $10.00    | csfloat | $11.76        | $1.76   | 17.6%  |
    And "Buy csfloat → Sell csfloat" should be highlighted as "Best ROI"

  Scenario: Show "no arbitrage" when fees eliminate profit
    Given an item "Glock-18 | Fade (Factory New)" is available:
      | Platform | Buy Price | Sell Price | Buy Fees | Sell Fees |
      | buff163  | $500.00   | $505.00    | $0.00    | 2.5%      |
    When I calculate arbitrage opportunities
    Then I should see:
      | Buy From | Buy Total | Sell On | Sell Proceeds | Profit  |
      | buff163  | $500.00   | buff163 | $493.38       | -$6.62  |
    And I should see a message "No profitable arbitrage after fees"
    And the profit should be displayed in red

  # ============================================================================
  # Scenario: Bulk Purchase Fee Calculations
  # ============================================================================

  Scenario: Calculate total fees for bulk purchase
    Given I want to buy 100 cases of "Operation Riptide Case" on "csfloat"
    And each case costs $1.00
    And "csfloat" has a buyer fee of "0%"
    When I calculate the bulk purchase total
    Then I should see:
      | Item Price    | $1.00    |
      | Quantity      | 100      |
      | Subtotal      | $100.00  |
      | Total Fees    | $0.00    |
      | Total Cost    | $100.00  |
    And I should see "Buying 100 items"

  Scenario: Calculate total fees for bulk purchase with fees
    Given I want to buy 50 stickers of "Sticker | Cloud9 | Katowice 2015" on "hypothetical_platform"
    And each sticker costs $2.00
    And "hypothetical_platform" has a buyer fee of "3%"
    When I calculate the bulk purchase total
    Then I should see:
      | Item Price    | $2.00    |
      | Quantity      | 50       |
      | Subtotal      | $100.00  |
      | Total Fees    | $3.00    |
      | Total Cost    | $103.00  |
    And I should see "You save $147 vs buying individually on Steam"

  # ============================================================================
  # Scenario: Fee Configuration Management (Admin)
  # ============================================================================

  Scenario: Update platform fee configuration
    Given I am an administrator
    When I update the fee configuration for "csfloat":
      | Field             | New Value                     |
      | seller_fee_percent| 2.5                           |
      | fee_notes         | Updated to 2.5% effective Jan 1|
      | source_url        | https://blog.csfloat.com/fees |
      | last_verified     | 2025-11-08                    |
    Then the fee configuration should be updated
    And all new price calculations should use "2.5%" fee
    And I should see "Fee configuration updated successfully"

  Scenario: Fee configuration audit trail
    Given platform fees have been updated
    When I view the fee configuration history
    Then I should see:
      | Platform | Old Fee | New Fee | Updated By | Updated At          |
      | csfloat  | 2.0%    | 2.5%    | admin      | 2025-11-08 10:30:00 |
    And I should be able to revert to previous configuration

  # ============================================================================
  # Scenario: Edge Cases and Error Handling
  # ============================================================================

  Scenario: Handle missing fee configuration gracefully
    Given an item is listed on "unknown_platform" for $50.00
    And no fee configuration exists for "unknown_platform"
    When I view the price details
    Then I should see "Fee information not available"
    And I should see "Contact platform for fee details"
    And the base price should still be displayed

  Scenario: Handle zero-price items (free drops)
    Given an item "Operation Riptide Case" is listed for $0.00
    When I calculate fees
    Then the total cost should be $0.00
    And no percentage fees should be calculated
    And I should see "Free item - no fees"

  Scenario: Handle maximum price limits (Steam $1,800 cap)
    Given an item "Karambit | Case Hardened (Factory New)" is worth $5000.00
    When I view the price on "steam"
    Then I should see a warning "⚠️ Exceeds Steam's $1,800 listing limit"
    And I should see "Cannot be sold on Steam Market"
    And "csfloat" should be suggested as "No price limit"

  # ============================================================================
  # Scenario: Mobile and Responsive Display
  # ============================================================================

  Scenario: Display fee breakdown on mobile devices
    Given I am viewing on a mobile device
    And an item "M4A1-S | Printstream (Minimal Wear)" is listed for $45.00
    When I tap "See fee breakdown"
    Then a bottom sheet should appear showing:
      | Base Price     | $45.00 |
      | Platform Fee   | $0.00  |
      | Total You Pay  | $45.00 |
    And the bottom sheet should be dismissible by swiping down

  Scenario: Condensed fee display on small screens
    Given I am viewing on a mobile device (width < 768px)
    And an item is listed with fees
    When I view the price card
    Then I should see "Total: $10.50" prominently
    And I should see "incl. fees" in smaller text
    And the full breakdown should be accessible via tap/expand

  # ============================================================================
  # Success Criteria
  # ============================================================================

  @success-criteria
  Scenario: Verify 100% fee transparency
    Given all supported platforms have fee configurations
    When a user views any item price
    Then all known fees should be documented
    And hidden fees (like bot markup) should be exposed
    And fee calculation sources should be verifiable

  @success-criteria
  Scenario: Verify no fee surprises for users
    Given a user views the total cost on csloadout.gg
    When they proceed to checkout on the actual marketplace
    Then the final checkout price should match the displayed total
    And there should be less than 1% variance (for dynamic fees)

  @success-criteria
  Scenario: Verify 50%+ engagement with fee breakdowns
    Given users are viewing item prices
    When we track user interactions
    Then at least 50% of users should click/hover fee breakdowns
    And fee transparency should be a documented competitive advantage
