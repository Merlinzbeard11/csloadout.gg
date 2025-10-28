Feature: Container Type Filtering
  As a CS2 trader
  I want to distinguish between Weapon Cases and Sticker Capsules
  So that I can browse specific container types separately

  Background:
    Given the system has 134 total containers loaded
    And container types include: "Weapon Case" and "Sticker Capsule"

  Scenario: Filter for Weapon Cases only
    When I request items with type "case"
    And container_type "Weapon Case"
    Then I should receive 42 weapon cases
    And all items should have container_type "Weapon Case"
    And results should include "Chroma Case", "Prisma Case", and "Operation cases"
    And items may have contains_rare field with knife counts

  Scenario: Filter for Sticker Capsules only
    When I request items with type "case"
    And container_type "Sticker Capsule"
    Then I should receive 92 sticker capsules
    And all items should have container_type "Sticker Capsule"
    And results should include "2020 RMR Challengers", "Katowice 2019", and tournament capsules
    And items should only contain stickers, not skins

  Scenario: Weapon Cases contain knives
    When I request items with container_type "Weapon Case"
    Then some results should have contains_rare > 0
    And the contains_rare field represents rare knives
    And items should have contains_items field for regular skins

  Scenario: Sticker Capsules contain only stickers
    When I request items with container_type "Sticker Capsule"
    Then all results should have contains_rare = 0 or null
    And items should only reference sticker contents
    And no knife references should exist

  Scenario: All cases without container filter
    When I request items with type "case"
    And no container_type filter
    Then I should receive 134 total containers
    And results should include both Weapon Cases and Sticker Capsules
    And response should show mix of both types

  Scenario: Invalid container type
    When I request items with container_type "InvalidType"
    Then I should receive 0 items
    And the response should indicate no matches found

  Scenario: Container type field accuracy
    When I request all items with type "case"
    Then every item should have container_type field populated
    And container_type should be either "Weapon Case" or "Sticker Capsule"
    And no items should have null container_type

  Scenario: API response includes container_type in filters
    When I request items with container_type "Weapon Case"
    Then the response filters object should include container_type
    And the filters.container_type should equal "Weapon Case"

  Scenario: Performance with container type filter
    When I request items with container_type filter
    Then the response time should be under 50ms
    And filtering should be efficient with large dataset
