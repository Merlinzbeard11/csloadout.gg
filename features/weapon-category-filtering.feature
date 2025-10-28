Feature: Weapon Category Filtering
  As a CS2 trader
  I want to filter items by weapon category
  So that I can quickly browse specific weapon types

  Background:
    Given the system has 23,956 items loaded
    And weapon categories include: Pistols, SMGs, Rifles, Heavy, Knives, Gloves

  Scenario: Filter by Rifles category
    When I request items with weapon_category "Rifles"
    Then I should receive 3,681 rifle skins
    And all items should have weapon_category "Rifles"
    And results should include "AK-47", "AWP", and "M4A4" skins

  Scenario: Filter by Pistols category
    When I request items with weapon_category "Pistols"
    Then I should receive 3,006 pistol skins
    And all items should have weapon_category "Pistols"
    And results should include "Glock-18", "Desert Eagle", and "USP-S" skins

  Scenario: Filter by SMGs category
    When I request items with weapon_category "SMGs"
    Then I should receive 2,311 SMG skins
    And all items should have weapon_category "SMGs"
    And results should include "P90", "MP7", and "MAC-10" skins

  Scenario: Filter by Heavy category
    When I request items with weapon_category "Heavy"
    Then I should receive 1,647 heavy weapon skins
    And all items should have weapon_category "Heavy"
    And results should include "Nova", "XM1014", and "M249" skins

  Scenario: Filter by Knives category
    When I request items with weapon_category "Knives"
    Then I should receive 3,630 knife skins
    And all items should have weapon_category "Knives"
    And results should include various knife types

  Scenario: Filter by Gloves category
    When I request items with weapon_category "Gloves"
    Then I should receive 340 glove skins
    And all items should have weapon_category "Gloves"
    And results should include various glove types

  Scenario: Invalid weapon category
    When I request items with weapon_category "InvalidCategory"
    Then I should receive 0 items
    And the response should indicate no matches found

  Scenario: Combine weapon category with other filters
    When I request items with weapon_category "Rifles"
    And rarity "Covert"
    Then all results should be Covert rarity rifles
    And results should include items like "AK-47 | Aquamarine Revenge"

  Scenario: API performance with category filter
    When I request items with weapon_category "Rifles"
    Then the response time should be under 100ms
    And the response should include query_time_ms metric
