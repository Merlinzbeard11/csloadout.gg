Feature: Multi-Marketplace Price Aggregation
  As a CS2 player
  I want to see prices from multiple marketplaces side-by-side
  So I can find the cheapest place to buy items and save money

  Background:
    Given the price aggregation service is running
    And prices are synced from 6+ marketplaces every 5 minutes
    And the marketplace_prices database table exists

  # Core Price Display
  Scenario: View lowest price for an item
    Given I am viewing an item detail page for "AK-47 | Redline (Field-Tested)"
    When the page loads
    Then I should see the lowest price highlighted: "$8.50 on CSFloat"
    And I should see total cost including fees: "$8.67"
    And I should see a "Buy on CSFloat" button that links to the marketplace
    And I should see "Save $2.53 vs Steam" savings message

  Scenario: View all marketplace prices for comparison
    Given I am viewing an item detail page
    When I view the price comparison table
    Then I should see all available marketplace prices sorted by total cost
    And each row should show:
      | Field      | Description                    |
      | Platform   | Marketplace name               |
      | Price      | Base price                     |
      | Fees       | Fee percentage                 |
      | Total Cost | Price + fees (calculated)      |
      | Action     | "Buy on {Platform}" link       |
    And the lowest price row should be highlighted in green
    And each marketplace link should open in a new tab

  Scenario: Calculate total cost including fees
    Given an item costs $100 on CSFloat with 2% seller fee
    When the total cost is calculated
    Then the total cost should be $102.00
    And the fee breakdown should show "2% ($2.00)"

  # Data Freshness & Updates
  Scenario: Display data freshness indicator
    Given prices were last updated 2 minutes ago
    When I view the price comparison
    Then I should see "Live" status indicator in green
    And I should see "Updated 2 minutes ago" timestamp

  Scenario: Show stale data warning
    Given prices were last updated 12 minutes ago
    When I view the price comparison
    Then I should see "Stale" status indicator in yellow
    And I should see "Updated 12 minutes ago" timestamp
    And I should see a manual refresh button

  Scenario: Automatic price refresh every 5 minutes
    Given the price sync cron job is configured
    When 5 minutes elapse
    Then the system should fetch updated prices from all marketplaces
    And update the marketplace_prices table
    And invalidate cached prices in Redis
    And log the sync completion with item count

  # Currency Conversion
  Scenario: Convert non-USD prices to USD
    Given an item costs 800 CNY on Buff163
    And the CNY/USD exchange rate is 0.14
    When the price is converted
    Then the displayed price should be $112.00 USD
    And the currency should show as "USD (from CNY)"

  Scenario: Handle currency API failures gracefully
    Given the primary currency API is unavailable
    When a price conversion is needed
    Then the system should fallback to the secondary currency API
    And if all APIs fail, use cached exchange rates from last successful sync
    And log the currency API failure

  # Outlier Detection
  Scenario: Detect and filter price outliers
    Given an item typically costs $10-$15
    And one marketplace shows a price of $999.99 (scam listing)
    When prices are aggregated
    Then the $999.99 price should be flagged as an outlier using IQR method
    And the outlier should NOT be displayed to users
    And the outlier should be logged for investigation

  Scenario: Outlier detection using IQR method
    Given price data: [$10, $11, $12, $13, $14, $999]
    When outlier detection is applied
    Then Q1 should be $10.75
    And Q3 should be $13.25
    And IQR should be $2.50
    And lower bound should be $7.00 (Q1 - 1.5*IQR)
    And upper bound should be $17.00 (Q3 + 1.5*IQR)
    And $999 should be flagged as outlier

  # Price History
  Scenario: View 30-day price history chart
    Given I am viewing an item detail page
    When I click "View Price History"
    Then I should see a line chart showing price over last 30 days
    And I should be able to select specific platforms to compare
    And the chart should show dates on X-axis and prices on Y-axis
    And I should see min/max/average price indicators

  # API Performance
  Scenario: Fast price query response time
    Given an item has cached price data in Redis
    When I request prices via GET /api/items/:itemId/prices
    Then the API should respond in <200ms
    And the response should include all marketplace prices
    And the response should include lowest price and savings

  Scenario: Handle missing price data
    Given an item exists but has no price data
    When I request prices via GET /api/items/:itemId/prices
    Then the API should return 404 status
    And the error message should be "No price data available for this item"

  # Bulk Pricing
  Scenario: Get bulk prices for loadout builder
    Given I want to build a loadout with 5 specific items
    When I request POST /api/prices/bulk with itemIds: ["id1", "id2", "id3", "id4", "id5"]
    Then I should receive lowest prices for all 5 items
    And I should see total cost if buying all from cheapest platforms
    And I should see total savings vs buying all from Steam

  # Affiliate Compliance
  Scenario: Display FTC-compliant affiliate disclosure
    Given I am viewing the price comparison table
    Then I should see an affiliate disclosure ABOVE the table
    And the disclosure should state: "We earn a commission when you purchase through our links at no extra cost to you"
    And the disclosure should be prominently visible (not hidden in footer)
    And the disclosure should appear BEFORE any affiliate links

  # Caching Strategy
  Scenario: Cache prices with TTL jitter to prevent stampede
    Given base TTL is 300 seconds (5 minutes)
    And jitter range is 60 seconds
    When a price is cached in Redis
    Then the actual TTL should be between 300-360 seconds (random)
    And this prevents all cache entries from expiring simultaneously

  # Rate Limiting & Reliability
  Scenario: Handle marketplace API rate limiting
    Given a marketplace API rate limits at 100 requests/minute
    And we exceed the rate limit
    When the API returns 429 status
    Then the system should use exponential backoff with jitter
    And retry delays should be: 1s * random(0,1), 2s * random(0,1), 4s * random(0,1)
    And max retry delay should be capped at 32 seconds
    And the system should log rate limit events

  Scenario: Graceful degradation when marketplace APIs are down
    Given CSFloat API is unavailable
    When prices are synced
    Then the system should continue syncing other marketplaces
    And CSFloat prices should show stale data with warning
    And the system should log the API failure
    And alert ops if API is down for >30 minutes

  # Database Performance
  Scenario: Efficient price lookup query
    Given the marketplace_prices table has composite index on (item_id, total_cost)
    When querying lowest price for an item
    Then the database should use the composite index
    And query execution time should be <50ms
    And the query should return results sorted by total_cost ascending

  Scenario: Prevent database bloat from price history
    Given prices are updated every 5 minutes
    And each update creates a new row
    When the price sync runs
    Then old prices should be UPDATED (not inserted as new rows)
    And only daily snapshots should be stored for historical charts
    And database growth should be predictable (items × platforms × 1 current + 365 daily snapshots)
