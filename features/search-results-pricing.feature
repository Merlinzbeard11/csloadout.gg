Feature: Real Marketplace Prices in Search Results
  As a CS2 trader
  I want to see real lowest prices for items in search results
  So that I can quickly compare prices without opening each item

  Background:
    Given the database contains cached prices from Steam, CSFloat, and Skinport
    And prices have 5-minute cache TTL

  Scenario: Display lowest price from cached marketplaces
    Given an item "AK-47 | Redline (Field-Tested)" has cached prices:
      | Marketplace | Price  | Cached At           |
      | Steam       | $12.50 | 2 minutes ago       |
      | CSFloat     | $11.25 | 3 minutes ago       |
      | Skinport    | $11.80 | 1 minute ago        |
    When I view the search results
    Then I should see the item priced at "$11.25"
    And the marketplace name should be "CSFloat"
    And the marketplace name should be a clickable link to "https://csfloat.com/search?name=AK-47%20%7C%20Redline%20%28Field-Tested%29"

  Scenario: Display Steam price when it's the lowest
    Given an item "AWP | Asiimov (Field-Tested)" has cached prices:
      | Marketplace | Price  |
      | Steam       | $45.00 |
      | CSFloat     | $48.50 |
      | Skinport    | $47.25 |
    When I view the search results
    Then I should see the item priced at "$45.00"
    And the marketplace name should be "Steam"
    And clicking the marketplace name should open "https://steamcommunity.com/market/listings/730/AWP%20%7C%20Asiimov%20%28Field-Tested%29"

  Scenario: Show placeholder when no cached prices exist
    Given an item "Glock-18 | Water Elemental (Factory New)" has no cached prices
    When I view the search results
    Then I should see "Price not available" for that item
    And there should be no marketplace link displayed

  Scenario: Handle partial cache (only some marketplaces cached)
    Given an item "M4A4 | Howl (Factory New)" has cached prices:
      | Marketplace | Price     |
      | CSFloat     | $3,250.00 |
    And Steam and Skinport prices are not cached
    When I view the search results
    Then I should see the item priced at "$3,250.00"
    And the marketplace name should be "CSFloat"
    And only the CSFloat price should be displayed (lowest available)

  Scenario: Respect cache expiry
    Given an item "Desert Eagle | Blaze (Factory New)" has cached prices:
      | Marketplace | Price   | Cached At      |
      | Steam       | $420.00 | 6 minutes ago  |
      | CSFloat     | $415.00 | 4 minutes ago  |
    And the cache TTL is 5 minutes
    When I view the search results
    Then I should see the item priced at "$415.00" from CSFloat
    And the Steam price should not be included (expired)

  Scenario: Price formatting for large numbers
    Given an item "Karambit | Fade (Factory New)" has a cached price of $1,850.50 from CSFloat
    When I view the search results
    Then the price should be formatted as "$1,850.50" with comma separator
    And the marketplace should be a link to CSFloat

  Scenario: Search results pagination with prices
    Given I have 100 items in search results
    And 60 items have cached prices
    And 40 items have no cached prices
    When I view the first page (100 items)
    Then I should see 60 items with real prices
    And I should see 40 items with "Price not available"

  Scenario: Price data source indicator
    Given an item has a cached price from CSFloat at $25.50
    When I hover over the price
    Then I should see the marketplace name "CSFloat"
    And the marketplace name should be visually styled as a link

  Scenario: Multiple items with same marketplace as lowest
    Given search results contain:
      | Item         | Lowest Price | Marketplace |
      | AK-47 Item 1 | $12.00       | CSFloat     |
      | AK-47 Item 2 | $15.50       | Skinport    |
      | AK-47 Item 3 | $11.25       | CSFloat     |
    When I view the search results
    Then each item should show its respective lowest price
    And each marketplace link should point to the correct item URL

  Scenario: Graceful handling of database errors
    Given the database is temporarily unavailable
    When I view the search results
    Then items should display "Price not available"
    And the search results should still load successfully
    And no errors should be visible to the user
