Feature: Filter Dropdown UI Components
  As a CS2 trader
  I want dropdown filters in the search interface
  So that I can easily browse items by category and container type

  Background:
    Given I am on the search page
    And the filter sidebar is visible

  # Weapon Category Dropdown
  Scenario: Weapon Category dropdown is visible
    Then I should see a "Weapon Category" dropdown in the filters
    And the dropdown should show "All categories" as placeholder
    And the dropdown should be positioned after the Weapon dropdown

  Scenario: Weapon Category dropdown shows all categories
    When I click the "Weapon Category" dropdown
    Then I should see the following options:
      | Category     |
      | All categories |
      | Pistols      |
      | SMGs         |
      | Rifles       |
      | Heavy        |
      | Knives       |
      | Gloves       |
    And options should be in the displayed order

  Scenario: Select Rifles category
    When I select "Rifles" from "Weapon Category" dropdown
    Then the dropdown should display "Rifles"
    And the search results should update to show only rifles
    And the URL should include "weapon_category=Rifles"
    And the results should show 3,681 items

  Scenario: Select Pistols category
    When I select "Pistols" from "Weapon Category" dropdown
    Then the dropdown should display "Pistols"
    And the search results should update to show only pistols
    And the results should show 3,006 items

  Scenario: Clear weapon category filter
    Given I have selected "Rifles" category
    When I select "All categories" from dropdown
    Then the category filter should be cleared
    And the URL should not include "weapon_category"
    And all weapon types should be shown in results

  Scenario: Combine weapon category with other filters
    Given I have selected "Rifles" category
    When I select "Covert" rarity
    Then results should show only Covert rarity rifles
    And both filters should be active
    And the active filter count should show "2 active"

  # Container Type Dropdown
  Scenario: Container Type dropdown appears when cases selected
    When I select "Case" from "Item Type" dropdown
    Then I should see a "Container Type" dropdown in the filters
    And the dropdown should show "All containers" as placeholder

  Scenario: Container Type dropdown hidden for non-cases
    Given the "Container Type" dropdown is visible
    When I select "Weapon Skin" from "Item Type" dropdown
    Then the "Container Type" dropdown should disappear
    And any container type filter should be cleared

  Scenario: Container Type dropdown shows both types
    Given I have selected "Case" item type
    When I click the "Container Type" dropdown
    Then I should see the following options:
      | Type             |
      | All containers   |
      | Weapon Case      |
      | Sticker Capsule  |

  Scenario: Filter for Weapon Cases only
    Given I have selected "Case" item type
    When I select "Weapon Case" from "Container Type" dropdown
    Then the dropdown should display "Weapon Case"
    And the search results should update to show only weapon cases
    And the URL should include "container_type=Weapon%20Case"
    And the results should show 42 items

  Scenario: Filter for Sticker Capsules only
    Given I have selected "Case" item type
    When I select "Sticker Capsule" from "Container Type" dropdown
    Then the dropdown should display "Sticker Capsule"
    And the search results should show only sticker capsules
    And the results should show 92 items

  Scenario: Clear container type filter
    Given I have selected "Weapon Case" container type
    When I select "All containers" from dropdown
    Then the container type filter should be cleared
    And all 453 containers should be shown

  # Filter State Management
  Scenario: Dropdowns persist on page refresh
    Given I have selected "Rifles" weapon category
    And I have selected "Covert" rarity
    When I refresh the page
    Then "Rifles" should still be selected in dropdown
    And "Covert" rarity should still be selected
    And results should match the persisted filters

  Scenario: Clear all filters resets dropdowns
    Given I have selected "Rifles" weapon category
    And I have selected "Weapon Case" container type
    When I click "Clear" button
    Then "Weapon Category" dropdown should show "All categories"
    And "Container Type" dropdown should show "All containers"
    And active filter count should show 0

  # Mobile Responsive Behavior
  Scenario: Dropdowns work in mobile filter sheet
    Given I am on mobile viewport
    When I tap the "Filters" button
    Then the filter sheet should open
    And I should see "Weapon Category" dropdown
    When I select "Pistols" category
    Then results should update even with sheet open
    And the filter sheet should remain open

  # Performance Requirements
  Scenario: Dropdown interactions are instant
    When I click any dropdown
    Then the dropdown should open within 50ms
    And options should be rendered immediately
    And no loading spinners should appear

  Scenario: Filter changes update results quickly
    When I select "Rifles" from dropdown
    Then search results should update within 200ms
    And the transition should be smooth
    And no flickering should occur
