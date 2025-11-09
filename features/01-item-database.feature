Feature: Complete Item Database
  As a CS2 trader
  I want to browse and search all CS2 items
  So that I can find items and compare prices across marketplaces

  Background:
    Given the item database contains 7,000+ CS2 items
    And the database includes skins, stickers, cases, collections, agents, and graffiti
    And data is synchronized hourly from ByMykel/CSGO-API

  Scenario: Browse all items with pagination
    Given I am on the items browse page
    When I view the item grid
    Then I should see 50 items per page
    And I should see item cards with image, name, and rarity
    And images should load with lazy loading
    And I should see pagination controls

  Scenario: Search for items by name
    Given I am on the items browse page
    When I enter "AK-47" in the search box
    Then I should see results within 200ms
    And I should see all AK-47 skins in the results
    And results should be sorted by rarity (highest first)

  Scenario: Search with typo uses fuzzy matching
    Given I am on the items browse page
    When I enter "ak47 redlin" in the search box (missing 'e')
    Then I should still see "AK-47 | Redline" in the results
    And the search should use PostgreSQL trigram matching

  Scenario: Filter items by type
    Given I am on the items browse page
    When I select "Stickers" from the type filter
    Then I should only see items with type = "sticker"
    And I should see approximately 5,000+ sticker results
    And pagination should update to reflect filtered count

  Scenario: Filter items by rarity
    Given I am on the items browse page
    When I select "Covert" from the rarity filter
    Then I should only see items with rarity = "covert"
    And results should include high-value skins like AWP Dragon Lore

  Scenario: Filter items by weapon type
    Given I am on the items browse page
    When I select "AK-47" from the weapon filter
    Then I should only see items with weapon_type = "AK-47"
    And I should see both normal and StatTrak variants

  Scenario: View item detail page
    Given I am browsing items
    When I click on "AK-47 | Case Hardened"
    Then I should see the item detail page
    And I should see the item name, rarity, and type
    And I should see the item image
    And I should see wear range (min/max float)
    And I should see pattern count if applicable

  Scenario: Image fallback when Steam CDN URL breaks
    Given an item has a broken Steam CDN image URL
    When I view the item card
    Then the image should fallback to image_url_fallback
    And if fallback also fails, show placeholder image
    And the broken URL should not cause UI errors

  Scenario: Search performance meets SLA
    Given the database contains 7,000+ items
    When I perform a full-text search
    Then the response time should be <200ms at 95th percentile
    And PostgreSQL indexes (GIN, trigram) should be used

  Scenario: Data synchronization from ByMykel API
    Given it is the top of the hour
    When the hourly cron job runs
    Then items should be fetched from ByMykel/CSGO-API
    And new items should be inserted
    And existing items should be updated (upsert)
    And the sync should use GitHub personal access token (5,000 req/hr)
    And duplicate items should be prevented by composite unique key

  Scenario: Legal compliance footer displayed
    Given I am on any page of the site
    When I scroll to the footer
    Then I should see "csloadout.gg is not affiliated with Valve Corporation"
    And I should see "CS2, Counter-Strike, Steam trademarks are property of Valve"
    And I should see "Prices are estimates"

  Scenario: Item name normalization for cross-platform matching
    Given an item is imported from ByMykel API
    When the item is saved to the database
    Then display_name should preserve original formatting
    And search_name should be normalized (lowercase, no special chars)
    And this enables matching across different marketplace formats
