Feature: Price Caching Database System
  As a csloadout.gg user
  I want marketplace prices cached in PostgreSQL
  So that page loads are fast and rate limits are avoided

  Background:
    Given the price_cache database table exists with schema:
      | Column       | Type          | Constraints                    |
      | id           | SERIAL        | PRIMARY KEY                    |
      | item_name    | VARCHAR(255)  | NOT NULL                       |
      | marketplace  | VARCHAR(50)   | NOT NULL                       |
      | price        | DECIMAL(10,2) |                                |
      | currency     | VARCHAR(3)    | DEFAULT 'USD'                  |
      | float_value  | DECIMAL(5,4)  |                                |
      | cached_at    | TIMESTAMP     | DEFAULT NOW()                  |
      | expires_at   | TIMESTAMP     | NOT NULL                       |
      |              |               | UNIQUE(item_name, marketplace) |
    And cache TTL is configured to 5 minutes

  # ============================================================
  # SCENARIO 1: Cache Miss - First Request
  # ============================================================
  Scenario: First request for item fetches from APIs and caches result
    Given no cached data exists for "AWP | Dragon Lore (Factory New)"
    When user requests price data via GET /api/prices/AWP%20%7C%20Dragon%20Lore%20%28Factory%20New%29
    Then system queries price_cache table for the item
    And cache lookup returns no results
    And system fetches prices from Steam Market API
    And system fetches prices from Skinport API
    And system fetches prices from CSFloat API
    And system inserts 3 records into price_cache:
      | item_name                            | marketplace | price    | expires_at           |
      | AWP \| Dragon Lore (Factory New)     | Steam       | 8500.00  | NOW() + 5 minutes    |
      | AWP \| Dragon Lore (Factory New)     | Skinport    | 8200.00  | NOW() + 5 minutes    |
      | AWP \| Dragon Lore (Factory New)     | CSFloat     | 8350.00  | NOW() + 5 minutes    |
    And response includes all 3 marketplace prices
    And response metadata shows "source": "fresh"
    And total response time is under 10 seconds

  # ============================================================
  # SCENARIO 2: Cache Hit - Within TTL Window
  # ============================================================
  Scenario: Subsequent request within 5 minutes returns cached data
    Given cached data exists for "AWP | Dragon Lore (Factory New)":
      | marketplace | price    | cached_at          | expires_at           |
      | Steam       | 8500.00  | 2 minutes ago      | 3 minutes from now   |
      | Skinport    | 8200.00  | 2 minutes ago      | 3 minutes from now   |
      | CSFloat     | 8350.00  | 2 minutes ago      | 3 minutes from now   |
    When user requests price data via GET /api/prices/AWP%20%7C%20Dragon%20Lore%20%28Factory%20New%29
    Then system queries price_cache WHERE expires_at > NOW()
    And cache lookup returns 3 valid records
    And system does NOT call any marketplace APIs
    And response includes all 3 cached prices
    And response metadata shows "source": "cache"
    And response metadata includes "cached_at" timestamp
    And total response time is under 100 milliseconds

  # ============================================================
  # SCENARIO 3: Cache Expiry - Beyond TTL Window
  # ============================================================
  Scenario: Request after cache expiry refetches and updates
    Given cached data exists for "AK-47 | Wild Lotus (Factory New)":
      | marketplace | price    | cached_at          | expires_at        |
      | Steam       | 12000.00 | 6 minutes ago      | 1 minute ago      |
      | Skinport    | 11500.00 | 6 minutes ago      | 1 minute ago      |
      | CSFloat     | 11800.00 | 6 minutes ago      | 1 minute ago      |
    When user requests price data via GET /api/prices/AK-47%20%7C%20Wild%20Lotus%20%28Factory%20New%29
    Then system queries price_cache WHERE expires_at > NOW()
    And cache lookup returns 0 records (all expired)
    And system treats request as cache miss
    And system fetches fresh prices from all 3 marketplaces
    And system UPDATES existing cache records using UPSERT:
      """sql
      INSERT INTO price_cache (item_name, marketplace, price, cached_at, expires_at)
      VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '5 minutes')
      ON CONFLICT (item_name, marketplace)
      DO UPDATE SET price = EXCLUDED.price,
                    cached_at = EXCLUDED.cached_at,
                    expires_at = EXCLUDED.expires_at
      """
    And response includes fresh pricing data
    And response metadata shows "source": "fresh"

  # ============================================================
  # SCENARIO 4: Partial Cache Hit - Mixed Fresh and Cached
  # ============================================================
  Scenario: One marketplace cache expired, others still valid
    Given cached data exists for "M4A4 | Howl (Factory New)":
      | marketplace | price     | cached_at          | expires_at           |
      | Steam       | 25000.00  | 6 minutes ago      | 1 minute ago (EXPIRED) |
      | Skinport    | 24500.00  | 2 minutes ago      | 3 minutes from now    |
      | CSFloat     | 24800.00  | 2 minutes ago      | 3 minutes from now    |
    When user requests price data via GET /api/prices/M4A4%20%7C%20Howl%20%28Factory%20New%29
    Then system queries price_cache WHERE expires_at > NOW()
    And cache lookup returns 2 valid records (Skinport, CSFloat)
    And system identifies Steam cache as expired
    And system fetches ONLY from Steam Market API
    And system updates Steam record in price_cache
    And response includes:
      | marketplace | price     | source |
      | Steam       | 25200.00  | fresh  |
      | Skinport    | 24500.00  | cache  |
      | CSFloat     | 24800.00  | cache  |
    And response metadata shows "source": "mixed"

  # ============================================================
  # SCENARIO 5: API Failure with Stale Cache Fallback
  # ============================================================
  Scenario: Marketplace API fails but stale cache exists
    Given cached data exists for "Karambit | Fade (Factory New)":
      | marketplace | price     | cached_at          | expires_at        |
      | Steam       | 3500.00   | 10 minutes ago     | 5 minutes ago (EXPIRED) |
      | Skinport    | 3400.00   | 10 minutes ago     | 5 minutes ago (EXPIRED) |
      | CSFloat     | 3450.00   | 10 minutes ago     | 5 minutes ago (EXPIRED) |
    When user requests price data via GET /api/prices/Karambit%20%7C%20Fade%20%28Factory%20New%29
    And Skinport API returns HTTP 429 (Rate Limit Exceeded)
    Then system attempts to fetch from all marketplaces
    And Steam API succeeds and updates cache
    And Skinport API fails with rate limit error
    And CSFloat API succeeds and updates cache
    And system returns stale Skinport cache with warning flag
    And system extends Skinport cache expiry by 5 minutes
    And response includes:
      | marketplace | price   | source          | warning                     |
      | Steam       | 3520.00 | fresh           | null                        |
      | Skinport    | 3400.00 | stale_cache     | API rate limit exceeded     |
      | CSFloat     | 3460.00 | fresh           | null                        |
    And error is logged to monitoring system

  # ============================================================
  # SCENARIO 6: Concurrent Request Deduplication
  # ============================================================
  Scenario: Multiple simultaneous requests for same item (cache miss)
    Given no cached data exists for "Glock-18 | Fade (Factory New)"
    And 10 users request price data simultaneously
    When all 10 requests arrive within 100 milliseconds
    Then ONLY the first request triggers marketplace API calls
    And subsequent 9 requests wait for cache to populate
    And database uses row-level locking to prevent race conditions:
      """sql
      SELECT * FROM price_cache
      WHERE item_name = $1 AND marketplace = $2 AND expires_at > NOW()
      FOR UPDATE SKIP LOCKED
      """
    And all 10 users receive the same pricing data
    And total API calls to marketplaces = 3 (not 30)
    And all requests complete within 12 seconds

  # ============================================================
  # SCENARIO 7: Performance Validation - Cache Lookup Speed
  # ============================================================
  Scenario: Cache lookup performance with 100 items cached
    Given 100 different items have cached prices (300 total cache records)
    When user requests price data for any cached item
    Then database query uses indexes:
      """sql
      CREATE INDEX idx_price_cache_expiry ON price_cache(expires_at);
      CREATE INDEX idx_price_cache_item ON price_cache(item_name);
      """
    And cache lookup query completes in under 50 milliseconds
    And total API response time is under 100 milliseconds
    And database query plan uses index scan (not sequential scan)

  # ============================================================
  # SCENARIO 8: Cache Storage Validation
  # ============================================================
  Scenario: All marketplace data stored with correct schema
    Given no cached data exists for "Desert Eagle | Blaze (Factory New)"
    When user requests price data
    And Steam returns: price $450.00, no float value
    And Skinport returns: price $435.00, float 0.0123
    And CSFloat returns: price $440.00, float 0.0089
    Then system inserts 3 records with correct data types:
      | item_name                           | marketplace | price  | currency | float_value | cached_at         | expires_at            |
      | Desert Eagle \| Blaze (Factory New) | Steam       | 450.00 | USD      | NULL        | 2025-10-24 05:00  | 2025-10-24 05:05      |
      | Desert Eagle \| Blaze (Factory New) | Skinport    | 435.00 | USD      | 0.0123      | 2025-10-24 05:00  | 2025-10-24 05:05      |
      | Desert Eagle \| Blaze (Factory New) | CSFloat     | 440.00 | USD      | 0.0089      | 2025-10-24 05:00  | 2025-10-24 05:05      |
    And price is stored as DECIMAL(10,2) with 2 decimal places
    And float_value is stored as DECIMAL(5,4) with 4 decimal places
    And timestamps are in UTC timezone

  # ============================================================
  # SCENARIO 9: API Route Integration
  # ============================================================
  Scenario: Existing API route modified to use cache
    Given API route exists at /src/app/api/prices/[item]/route.ts
    When code is modified to implement caching
    Then route checks cache before calling marketplace APIs
    And route uses PostgreSQL client from 'pg' package
    And database connection uses environment variable DATABASE_URL
    And route handles database connection errors gracefully
    And route returns consistent response format:
      """json
      {
        "success": true,
        "prices": [
          {"market": "Steam", "price": 850.00, "url": "...", "source": "cache"},
          {"market": "Skinport", "price": 820.00, "url": "...", "source": "fresh"},
          {"market": "CSFloat", "price": 835.00, "url": "...", "source": "cache"}
        ],
        "cached_at": "2025-10-24T05:00:00Z"
      }
      """

  # ============================================================
  # SCENARIO 10: Database Connection Management
  # ============================================================
  Scenario: Connection pooling prevents database overload
    Given 50 concurrent users request different items
    When API routes establish database connections
    Then connection pool is configured with max 10 connections
    And connection pool reuses existing connections
    And no connection leaks occur (all connections released)
    And database does not exceed max_connections limit
    And error handling includes connection timeout recovery

  # ============================================================
  # BUSINESS VALUE VALIDATION
  # ============================================================
  Scenario: Rate limit problem eliminated
    Given 28 items displayed on homepage
    And each item has 3 marketplace price listings
    And Skinport API limit is 8 requests per 5 minutes
    When 10 users load homepage simultaneously
    And first user triggers cache population (84 API calls)
    And cache is populated with all 28 items
    Then subsequent 9 users receive 100% cached data
    And total Skinport API calls = 28 (not 280)
    And no rate limit errors occur
    And all users see pricing data within 1 second

  Scenario: Page load time reduced from 8-10 seconds to <500ms
    Given cache is populated with 28 popular items
    When user loads homepage
    Then 100% of prices served from cache
    And API response time is under 100ms per item
    And total page load time is under 500 milliseconds
    And user experience is "instant" pricing display
