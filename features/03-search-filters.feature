Feature: Search & Filter System
  As a user
  I want to search and filter CS2 items
  So that I can quickly find specific skins, weapons, and collections

  # Reference: features/03-search-filters.md
  # Performance Targets: <100ms search, <50ms autocomplete
  # MVP Strategy: PostgreSQL full-text search + pg_trgm for fuzzy matching

  Background:
    Given the items database contains 7000 CS2 items
    And the search index is properly configured
    And price data is available from Feature 04

  # ============================================================================
  # Basic Text Search
  # ============================================================================

  Scenario: Search for items by name
    When I search for "AK-47 Redline"
    Then I should see results containing "AK-47 | Redline"
    And the response time should be under 100ms
    And results should be sorted by relevance

  Scenario: Search with multiple keywords
    When I search for "blue M4A4"
    Then I should see M4A4 skins with blue aesthetics
    And results should match both "blue" AND "M4A4" keywords
    And the response time should be under 100ms

  Scenario: Search handles short queries (<3 characters)
    When I search for "AK"
    Then I should see results starting with "AK"
    And the search should use prefix matching instead of trigram
    And the response time should be under 100ms

  Scenario: Search with typos (fuzzy matching)
    When I search for "asimov" (typo: asiimov)
    Then I should see results for "Asiimov"
    And the search should use trigram similarity
    And results with exact matches should appear first

  # ============================================================================
  # Autocomplete
  # ============================================================================

  Scenario: Autocomplete suggestions appear instantly
    When I type "ak" in the search box
    Then I should see autocomplete suggestions within 50ms
    And suggestions should include "AK-47 | Redline", "AK-47 | Asiimov"
    And suggestions should be limited to 10 items maximum

  Scenario: Autocomplete groups suggestions by type
    When I type "operation" in the search box
    Then I should see suggestions grouped as:
      | Type       | Example                          |
      | items      | Operation Riptide AK-47          |
      | weapons    | (none)                           |
      | collections| Operation Riptide Collection     |

  Scenario: Autocomplete uses exact match before fuzzy
    When I type "blue ak" in the search box
    Then exact prefix matches should appear first
    And fuzzy matches should appear after
    And total results should not exceed 10 suggestions

  Scenario: Autocomplete handles keyboard navigation
    When I type "ak" and press down arrow
    Then the first suggestion should be highlighted
    When I press down arrow again
    Then the second suggestion should be highlighted
    When I press enter
    Then the highlighted suggestion should be selected

  # ============================================================================
  # Filter by Rarity
  # ============================================================================

  Scenario: Filter items by single rarity
    When I search with rarity filter "classified"
    Then I should only see classified rarity items
    And results should include rarity badge

  Scenario: Filter items by multiple rarities
    When I search with rarity filters "classified,covert"
    Then I should see items with classified OR covert rarity
    And results should be mixed between both rarities

  # ============================================================================
  # Filter by Weapon Type
  # ============================================================================

  Scenario: Filter items by weapon type
    When I search with weapon type filter "AK-47"
    Then I should only see AK-47 skins
    And no M4A4 or other weapons should appear

  Scenario: Filter by multiple weapon types
    When I search with weapon type filters "AK-47,M4A4"
    Then I should see skins for both AK-47 and M4A4
    And results should be mixed between both weapons

  # ============================================================================
  # Filter by Price Range
  # ============================================================================

  Scenario: Filter items by price range
    When I search with price filter "$5-$20"
    Then I should only see items priced between $5.00 and $20.00
    And all results should have total_cost within range

  Scenario: Filter items under budget
    When I search with max price "$10"
    Then I should only see items under $10
    And the most expensive result should cost $10.00 or less

  Scenario: Filter expensive items only
    When I search with min price "$100"
    Then I should only see items over $100
    And the cheapest result should cost $100.00 or more

  # ============================================================================
  # Filter by Wear Condition
  # ============================================================================

  Scenario: Filter items by wear condition
    When I search with wear filter "factory_new"
    Then I should only see Factory New items
    And no Minimal Wear or other conditions should appear

  Scenario: Filter by multiple wear conditions
    When I search with wear filters "factory_new,minimal_wear"
    Then I should see items in Factory New OR Minimal Wear
    And results should be mixed between both conditions

  # ============================================================================
  # Advanced Filters (Float Value)
  # ============================================================================

  Scenario: Filter by float value range (collectors)
    When I search with float filter "0.00-0.01"
    Then I should only see items with float_value between 0.00 and 0.01
    And these are "low float" collector items

  Scenario: Filter by pattern seed (blue gem hunters)
    When I search for "Case Hardened" with pattern seed "661"
    Then I should see Case Hardened items with pattern_seed 661
    And this is the famous "blue gem" pattern

  # ============================================================================
  # Combining Multiple Filters
  # ============================================================================

  Scenario: Combine text search with filters
    When I search for "AK-47"
    And I apply rarity filter "classified"
    And I apply price filter "$5-$20"
    Then I should see classified AK-47 skins priced $5-$20
    And results should match ALL filters (AND logic)

  Scenario: Complex multi-filter query
    When I search for "blue"
    And I apply weapon type filters "AK-47,M4A4"
    And I apply rarity filters "classified,covert"
    And I apply wear filter "factory_new"
    And I apply price filter "$10-$50"
    Then I should see blue-themed Factory New AK-47/M4A4 skins
    And they should be classified or covert rarity
    And they should cost between $10-$50
    And the response time should be under 300ms

  # ============================================================================
  # Sort Options
  # ============================================================================

  Scenario: Sort search results by price ascending
    When I search for "AK-47"
    And I sort by "price_asc"
    Then results should be sorted from cheapest to most expensive
    And the first result should be the lowest price

  Scenario: Sort search results by price descending
    When I search for "M4A4"
    And I sort by "price_desc"
    Then results should be sorted from most expensive to cheapest
    And the first result should be the highest price

  Scenario: Sort search results by name
    When I search for "AK-47"
    And I sort by "name_asc"
    Then results should be alphabetically sorted
    And "AK-47 | Asiimov" should come before "AK-47 | Redline"

  Scenario: Sort search results by rarity
    When I search for "knife"
    And I sort by "rarity_desc"
    Then rarest items should appear first
    And covert items should appear before classified items

  # ============================================================================
  # Faceted Search (Filter Counts)
  # ============================================================================

  Scenario: Display available filter counts
    When I search for "AK-47"
    Then I should see filter counts:
      | Filter      | Count |
      | Classified  | 12    |
      | Covert      | 8     |
      | Restricted  | 15    |
    And counts should update when filters applied

  Scenario: Gray out filters with zero results
    When I search for "AK-47"
    And I apply wear filter "factory_new"
    Then I should see which other filters have results
    And filters with 0 matching items should be grayed out

  # ============================================================================
  # Pagination
  # ============================================================================

  Scenario: Paginate search results
    When I search for "knife" (200+ results)
    Then I should see 50 results per page (default)
    And I should see total result count
    And I should see pagination controls

  Scenario: Navigate to next page
    When I search for "knife"
    And I click "Next Page"
    Then I should see results 51-100
    And the URL should update to ?page=2
    And the previous page should be available

  # ============================================================================
  # URL State Persistence
  # ============================================================================

  Scenario: Search state persists in URL
    When I search for "AK-47"
    And I apply rarity filter "classified"
    And I apply price filter "$5-$20"
    Then the URL should be "/search?query=AK-47&rarity=classified&priceMin=5&priceMax=20"
    And I can share this URL with others

  Scenario: Browser back button works
    When I search for "AK-47"
    And I apply a filter
    And I click browser back button
    Then the filter should be removed
    And search results should update

  # ============================================================================
  # No Results Handling
  # ============================================================================

  Scenario: Handle no results gracefully
    When I search for "nonexistent item xyz123"
    Then I should see "No results found for 'nonexistent item xyz123'"
    And I should see spelling suggestions
    And I should see popular items as alternatives
    And I should NOT see an error message

  Scenario: Suggest similar searches on no results
    When I search for "awp asiimov" with all filters applied
    And no items match ALL filters
    Then I should see "Try removing some filters"
    And I should see suggested searches like "AWP Asiimov" (without filters)

  # ============================================================================
  # Performance Requirements
  # ============================================================================

  Scenario: Basic search meets performance target
    When I search for "AK-47"
    Then the API response time should be under 100ms (p95)
    And the total page load should be under 1 second

  Scenario: Filtered search meets performance target
    When I search for "blue AK-47"
    And I apply 3 filters (rarity, price, wear)
    Then the API response time should be under 300ms
    And results should use database indexes

  Scenario: Autocomplete meets performance target
    When I type "ak" in search box
    Then autocomplete suggestions should appear in under 50ms
    And suggestions should be cached in Redis

  # ============================================================================
  # Mobile UX
  # ============================================================================

  Scenario: Filters accessible on mobile
    Given I am on a mobile device (screen width <768px)
    When I view the search page
    Then the filter sidebar should be hidden
    And I should see a "Filters" button
    When I tap "Filters"
    Then a bottom sheet should slide up
    And I should see all filter options
    And the sheet should cover 80% of screen height

  Scenario: Active filter chips on mobile
    Given I am on a mobile device
    When I apply filters
    Then I should see filter chips at top of results
    And each chip should have an X to remove
    And tapping X should remove that specific filter

  # ============================================================================
  # SEO & Crawlability
  # ============================================================================

  Scenario: Search pages use canonical URL to prevent duplicate content
    When I visit "/search?query=AK-47&rarity=classified&page=1"
    Then the canonical URL should be "https://csloadout.gg/search"
    And the page should have "noindex" meta tag
    And this prevents faceted navigation SEO issues

  Scenario: Base search page is indexable
    When I visit "/search" without filters
    Then the page should be indexable
    And robots should follow links
    And this is the only search page Google indexes

  # ============================================================================
  # Security
  # ============================================================================

  Scenario: Search prevents SQL injection
    When I search for "'; DROP TABLE items; --"
    Then the query should be safely parameterized
    And no SQL should be executed
    And I should see safe "No results" message

  Scenario: Search input is sanitized
    When I search for "<script>alert('xss')</script>"
    Then the input should be escaped
    And no JavaScript should execute
    And the search should treat it as plain text

  # ============================================================================
  # Recent Search History
  # ============================================================================

  Scenario: Save recent searches to localStorage
    When I search for "AK-47"
    And I search for "M4A4"
    And I search for "AWP"
    Then my recent searches should show:
      | AWP   |
      | M4A4  |
      | AK-47 |
    And recent searches should persist across sessions

  Scenario: Limit recent searches to 5
    When I perform 10 different searches
    Then only the last 5 searches should be saved
    And oldest searches should be removed

  Scenario: Clear recent search history
    Given I have recent searches
    When I click "Clear recent searches"
    Then my recent search history should be empty
    And localStorage should be cleared

  # ============================================================================
  # Edge Cases
  # ============================================================================

  Scenario: Handle empty search query
    When I submit search with empty query ""
    Then I should see all items (default browse view)
    Or I should see "Please enter a search term"

  Scenario: Handle very long search query
    When I search with 500 character query
    Then the query should be truncated to 200 characters
    And the search should still execute safely

  Scenario: Handle special characters in search
    When I search for "M4A1-S | Knight"
    Then the search should correctly handle hyphens and pipes
    And I should see "M4A1-S | Knight" results

  Scenario: Handle concurrent filter changes
    When I apply multiple filters rapidly
    Then only the final filter combination should execute
    And previous requests should be cancelled (debounced)

  # ============================================================================
  # Database Index Usage
  # ============================================================================

  Scenario: Search uses GIN index for full-text search
    When I search for "blue AK-47"
    Then the query should use the search_vector GIN index
    And execution time should be under 100ms
    And EXPLAIN ANALYZE should show "Bitmap Index Scan on items_search_gin_idx"

  Scenario: Search uses B-tree index for price filters
    When I apply price filter "$5-$20"
    Then the query should use idx_items_price index
    And execution should avoid full table scan

  Scenario: Search uses composite index for common filter combinations
    When I search with weapon type "AK-47" and rarity "classified"
    Then the query should use idx_items_search_combo
    And this covers (weapon_type, rarity, price)
