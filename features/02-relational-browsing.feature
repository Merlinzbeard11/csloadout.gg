Feature: Relational Browsing System
  As a CS2 player
  I want to browse items through their relationships (collections, weapons, cases)
  So that I can discover items contextually and build themed loadouts

  Background:
    Given the item database is populated with collections, weapons, and cases
    And relationships are properly linked (items → collections, items → weapons)

  # Collection Browsing
  Scenario: Browse all collections
    Given I am on the collections browse page
    When I view the collection grid
    Then I should see all active collections displayed as cards
    And each collection card should show:
      | Field        | Description                    |
      | Image        | Collection thumbnail           |
      | Name         | Collection display name        |
      | Item Count   | Number of items in collection  |
      | Release Date | When collection was released   |
    And collections should be sorted by release date (newest first)

  Scenario: View collection detail page
    Given I am on the "Operation Riptide" collection detail page
    When the page loads
    Then I should see the collection header with:
      | Field       | Example                                  |
      | Name        | Operation Riptide Collection             |
      | Description | Community-designed skins from Op Riptide |
      | Item Count  | 17 items                                 |
    And I should see a grid of all 17 items in the collection
    And items should be sorted by rarity (highest first)
    And each item should display image, name, and rarity

  Scenario: Calculate total collection value
    Given I am viewing the "Dreams & Nightmares Collection"
    When the collection page calculates total value
    Then the value should sum the lowest price of each item
    And the total should be displayed prominently
    And the calculation should use current market prices

  Scenario: Handle discontinued collections
    Given the "Cobblestone Collection" is discontinued
    When I view the collection detail page
    Then I should see a "No Longer Drops" badge
    And the badge should show the discontinuation date
    And items should still be browsable

  # Weapon Type Browsing
  Scenario: Browse by weapon type
    Given I am on the weapons browse page
    When I view the weapon type list
    Then I should see weapon categories:
      | Category      | Examples               |
      | Rifles        | AK-47, M4A4, AWP      |
      | Pistols       | Desert Eagle, Glock   |
      | SMGs          | MP9, MP7              |
      | Heavy         | Negev, M249           |
      | Knives        | Karambit, Butterfly   |
    And each weapon should show item count

  Scenario: View all skins for a specific weapon
    Given I am on the "AK-47" weapon page
    When the page loads
    Then I should see all AK-47 skins from all collections
    And skins should be sorted by rarity (highest first)
    And I should see approximately 150+ AK-47 variants
    And each variant should show collection name

  Scenario: Weapon type normalization
    Given different data sources use inconsistent weapon names
    When importing items with weapon names "AK47", "Ak-47", "ak47"
    Then all should be normalized to "AK-47"
    And weapon browsing should work regardless of source format

  # Case Browsing
  Scenario: Browse all cases
    Given I am on the cases browse page
    When I view the case grid
    Then I should see all available cases
    And each case should show:
      | Field        | Description              |
      | Image        | Case thumbnail           |
      | Name         | Case display name        |
      | Item Count   | Number of possible drops |
      | Key Price    | Current key price        |

  Scenario: View case contents with probabilities
    Given I am viewing the "Clutch Case" detail page
    When the page loads
    Then I should see all items that can drop from this case
    And each item should show drop probability
    And probabilities should sum to 100%
    And items should be grouped by rarity
    And special items (knives, gloves) should be highlighted

  Scenario: Calculate case expected value
    Given I am viewing a case with the following drops:
      | Item                  | Probability | Price  |
      | MP7 Neon Ply (Covert) | 0.79%       | $5.00  |
      | Karambit Doppler      | 0.26%       | $500   |
    When the expected value is calculated
    Then it should be (0.0079 × $5) + (0.0026 × $500) = $1.34
    And the calculation should account for all items in the case
    And the expected value should be displayed clearly

  Scenario: Validate case drop probabilities
    Given a case has multiple items with drop probabilities
    When the probabilities are summed
    Then the total must equal 100% (within 0.01% tolerance)
    And if probabilities don't sum to 100%, show an error
    And prevent displaying incorrect probability data

  # URL Structure & Navigation
  Scenario: Navigate via clean URLs
    Given the relational browsing system is active
    Then the following URL patterns should work:
      | URL                                  | Purpose                        |
      | /collections                         | Browse all collections         |
      | /collections/operation-riptide       | Specific collection detail     |
      | /weapons                             | Browse by weapon type          |
      | /weapons/ak-47                       | All AK-47 skins                |
      | /cases                               | Browse all cases               |
      | /cases/clutch-case                   | Clutch Case contents           |
    And URLs should use lowercase slugs with hyphens
    And old URLs should redirect with 301 status

  Scenario: Handle URL slug changes
    Given the "Operation Riptide Collection" previously had slug "op-riptide"
    And the current slug is "operation-riptide"
    When a user visits /collections/op-riptide
    Then they should be redirected to /collections/operation-riptide
    And the redirect should be a 301 (permanent)
    And SEO equity should be preserved

  # Performance Requirements
  Scenario: Efficient collection item queries
    Given I am loading a collection with 17 items
    When the collection page fetches items
    Then it should use a single JOIN query (not N+1 queries)
    And the query should complete in <50ms
    And items should be fetched with collection in one database round-trip

  Scenario: ISR caching for hub pages
    Given collection pages use Next.js ISR
    When a user visits a collection page
    Then the page should be cached for 1 hour
    And price data should be fetched separately with shorter cache (5 min)
    And stale data should be revalidated in the background

  # Edge Cases
  Scenario: Handle empty collections gracefully
    Given a collection exists but has no items
    When a user tries to view the collection
    Then the page should return 404 status
    And Google should not index empty collection pages

  Scenario: Handle nonexistent collections
    Given a user visits /collections/fake-collection
    When the page loads
    Then it should return 404 status
    And show a "Collection not found" error page

  Scenario: Related items navigation
    Given I am viewing an AK-47 skin detail page
    When I look for related items
    Then I should see links to:
      | Relationship       | Target                         |
      | Same Weapon        | All other AK-47 skins          |
      | Same Collection    | All items in this collection   |
      | Same Rarity        | All items with this rarity     |
    And I can navigate between related items without going back to browse page

  # SEO Optimization
  Scenario: Collection pages have unique meta tags
    Given I am viewing the "Dreams & Nightmares Collection"
    When the page is rendered
    Then the page title should be "Dreams & Nightmares Collection | csloadout.gg"
    And the meta description should mention item count and value range
    And Schema.org markup should be present for rich results

  Scenario: Server-side rendering for SEO
    Given collection, weapon, and case pages exist
    When a search engine crawls the pages
    Then all pages should be server-side rendered (SSR/ISR)
    And content should be fully rendered in initial HTML
    And pages should not require JavaScript to display content
