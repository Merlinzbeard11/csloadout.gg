# Feature 08 - Budget Loadout Builder (Phase 2: Loadout Storage)
# Status: In Progress
# Priority: P0 (Must Ship for Phase 1)

Feature: Loadout Storage System
  As a user
  I want to save and manage my budget loadouts
  So that I can track my cosmetic combinations and share them with others

  Background:
    Given the database includes loadouts table
    And the database includes loadout_weapon_skins table
    And user "user123" is authenticated
    And cosmetic categories exist from Phase 1
    And weapon priorities exist from Phase 1

  # ============================================================================
  # Loadout CRUD Operations
  # ============================================================================

  Scenario: Create a new loadout
    When I create a loadout with:
      | name        | Red Dragon Budget |
      | description | Affordable red-themed loadout |
      | budget      | 150.00            |
      | theme       | red               |
    Then the loadout should be saved
    And the loadout should have id
    And the loadout should belong to user "user123"
    And actual_cost should be 0.00 (no items added yet)
    And is_public should be false by default

  Scenario: Add weapon skin to loadout
    Given I have a loadout "Red Dragon Budget"
    When I add weapon skin to loadout:
      | weapon_type | AK-47           |
      | item_name   | AK-47 Redline   |
      | wear        | Field-Tested    |
      | float_value | 0.16            |
      | quality     | normal          |
      | price       | 25.50           |
      | platform    | csfloat         |
    Then the weapon skin should be added to loadout
    And the loadout actual_cost should be 25.50

  Scenario: Prevent duplicate weapon types in same loadout
    Given I have a loadout "Red Dragon Budget"
    And the loadout includes AK-47 skin
    When I try to add another AK-47 skin to the same loadout
    Then I should get error "Duplicate weapon type in loadout"
    And the duplicate should not be saved

  Scenario: Calculate total loadout cost
    Given I have a loadout "Red Dragon Budget"
    And the loadout includes:
      | weapon_type   | price |
      | AK-47         | 25.50 |
      | M4A4          | 18.00 |
      | AWP           | 45.00 |
      | Desert Eagle  | 12.00 |
    Then the loadout actual_cost should be 100.50

  Scenario: Track budget vs actual cost
    Given I have a loadout with budget 150.00
    And the loadout actual_cost is 100.50
    Then remaining_budget should be 49.50
    And budget_utilization should be 67% (100.50 / 150.00)

  Scenario: Update loadout name and description
    Given I have a loadout "Red Dragon Budget"
    When I update the loadout:
      | name        | Crimson Loadout   |
      | description | Updated red theme |
    Then the loadout name should be "Crimson Loadout"
    And the loadout description should be "Updated red theme"
    And updated_at timestamp should be updated

  Scenario: Delete loadout cascades to weapon skins
    Given I have a loadout "Red Dragon Budget"
    And the loadout includes 4 weapon skins
    When I delete the loadout
    Then the loadout should be removed from database
    And all 4 weapon skins should be deleted (CASCADE)

  # ============================================================================
  # Loadout Queries
  # ============================================================================

  Scenario: List user's loadouts ordered by created_at
    Given I have 3 loadouts:
      | name              | created_at          |
      | Budget Starter    | 2025-01-01 10:00:00 |
      | Red Dragon Budget | 2025-01-02 10:00:00 |
      | Blue Steel Pro    | 2025-01-03 10:00:00 |
    When I query my loadouts ordered by created_at DESC
    Then I should see loadouts in order:
      | Blue Steel Pro    |
      | Red Dragon Budget |
      | Budget Starter    |

  Scenario: Filter loadouts by theme
    Given I have loadouts with themes:
      | name              | theme |
      | Red Dragon Budget | red   |
      | Blue Steel Pro    | blue  |
      | Ocean Theme       | blue  |
    When I filter loadouts by theme "blue"
    Then I should see 2 loadouts
    And they should be "Blue Steel Pro" and "Ocean Theme"

  Scenario: Search loadouts by name
    Given I have loadouts:
      | name              |
      | Red Dragon Budget |
      | Dragon Lore Pro   |
      | Blue Steel        |
    When I search for "dragon"
    Then I should see 2 loadouts
    And they should include "Red Dragon Budget" and "Dragon Lore Pro"

  # ============================================================================
  # Weapon Skins in Loadouts
  # ============================================================================

  Scenario: Query all weapon skins in a loadout
    Given I have a loadout "Red Dragon Budget"
    And the loadout includes weapon skins:
      | weapon_type   | item_name        | price |
      | AK-47         | AK-47 Redline    | 25.50 |
      | M4A4          | M4A4 Asiimov     | 45.00 |
      | AWP           | AWP Redline      | 18.00 |
    When I query weapon skins for this loadout
    Then I should see 3 weapon skins
    And total price should be 88.50

  Scenario: Update weapon skin in loadout
    Given I have a loadout "Red Dragon Budget"
    And the loadout includes AK-47 skin with price 25.50
    When I update the AK-47 skin to:
      | item_name   | AK-47 Vulcan     |
      | price       | 35.00            |
      | wear        | Minimal Wear     |
      | float_value | 0.08             |
    Then the AK-47 skin should be updated
    And the loadout actual_cost should reflect new price

  Scenario: Remove weapon skin from loadout
    Given I have a loadout "Red Dragon Budget"
    And the loadout includes:
      | weapon_type | price |
      | AK-47       | 25.50 |
      | M4A4        | 18.00 |
    When I remove the M4A4 skin
    Then the loadout should have 1 weapon skin
    And the loadout actual_cost should be 25.50

  # ============================================================================
  # Float Value Optimization (Gotcha #3)
  # ============================================================================

  Scenario: Store optimal float values for budget builds
    Given I have a loadout "Budget Optimizer"
    When I add weapon skin with target float range:
      | weapon_type | AK-47        |
      | wear        | Field-Tested |
      | target_min  | 0.15         |
      | target_max  | 0.18         |
      | float_value | 0.16         |
    Then the float_value should be 0.16
    And it should be within target range (0.15-0.18)

  # ============================================================================
  # Stickers and Charms (NEW)
  # ============================================================================

  Scenario: Store stickers on weapon skin
    Given I have a loadout "Red Dragon Budget"
    And the loadout includes AK-47 skin
    When I add stickers to AK-47:
      | position | sticker_name          |
      | 1        | Natus Vincere (Holo)  |
      | 2        | Cloud9 (Foil)         |
    Then the AK-47 should have 2 stickers stored as JSONB
    And stickers should include position data

  Scenario: Store weapon charms (NEW - Oct 2025)
    Given I have a loadout "Modern Loadout"
    And the loadout includes AK-47 skin
    When I add weapon charm:
      | charm_name | Golden Eagle |
      | rarity     | Legendary    |
    Then the charm should be stored in charms JSONB field
    And the loadout should support this new cosmetic category

  # ============================================================================
  # Custom Budget Allocation (User-Configurable Percentages)
  # ============================================================================

  Scenario: Set custom allocation percentages
    Given I have a loadout "Custom Allocation Test"
    When I set custom allocation:
      | category     | percentage |
      | weapon_skins | 50.00      |
      | knife        | 30.00      |
      | gloves       | 20.00      |
      | agents       | 0.00       |
      | music_kit    | 0.00       |
      | charms       | 0.00       |
    Then the loadout should save custom_allocation as JSONB
    And custom_allocation should match input percentages

  Scenario: Custom allocation percentages must sum to 100%
    Given I have a loadout "Validation Test"
    When I try to set custom allocation:
      | category     | percentage |
      | weapon_skins | 60.00      |
      | knife        | 30.00      |
      | gloves       | 5.00       |
    Then I should get error "Custom allocation must sum to 100.00%"
    And the custom_allocation should not be saved

  Scenario: Custom allocation overrides preset prioritize mode
    Given I have a loadout with prioritize "balance"
    When I set custom allocation percentages
    Then the algorithm should use custom_allocation
    And the algorithm should ignore prioritize preset

  Scenario: Custom allocation with zero percentages excludes categories
    Given I have a loadout "Weapons Only"
    When I set custom allocation:
      | category     | percentage |
      | weapon_skins | 100.00     |
      | knife        | 0.00       |
      | gloves       | 0.00       |
      | agents       | 0.00       |
      | music_kit    | 0.00       |
      | charms       | 0.00       |
    Then knife should receive $0.00 allocation
    And gloves should receive $0.00 allocation
    And weapon_skins should receive 100% of budget

  Scenario: Custom allocation percentages support decimals
    Given I have a loadout with budget $100.00
    When I set custom allocation:
      | category     | percentage |
      | weapon_skins | 33.33      |
      | knife        | 33.33      |
      | gloves       | 33.34      |
    Then the total should equal 100.00%
    And weapon_skins should receive $33.33
    And knife should receive $33.33
    And gloves should receive $33.34

  Scenario: Custom allocation validates percentage range (0-100)
    Given I have a loadout "Range Validation"
    When I try to set custom allocation with weapon_skins = 150.00
    Then I should get error "Percentage must be between 0.00 and 100.00"
    When I try to set custom allocation with knife = -10.00
    Then I should get error "Percentage must be between 0.00 and 100.00"

  Scenario: Clear custom allocation to use presets again
    Given I have a loadout with custom allocation set
    When I clear custom_allocation field
    Then the loadout should use prioritize preset mode
    And custom_allocation should be NULL

  # ============================================================================
  # Data Integrity
  # ============================================================================

  Scenario: Loadout must belong to a user
    When I try to create a loadout without user_id
    Then I should get error "user_id is required"
    And the loadout should not be saved

  Scenario: Weapon skin must reference valid item
    Given I have a loadout "Red Dragon Budget"
    When I try to add weapon skin with invalid item_id
    Then I should get error "Invalid item reference"
    And the weapon skin should not be added

  Scenario: Loadout budget must be positive
    When I try to create loadout with budget -50.00
    Then I should get error "Budget must be positive"
    And the loadout should not be saved

  Scenario: Actual cost cannot exceed budget (soft warning)
    Given I have a loadout with budget 100.00
    When I add weapon skins totaling 120.00
    Then the loadout should still save
    But I should get warning "Loadout exceeds budget by $20.00"

  # ============================================================================
  # Performance
  # ============================================================================

  Scenario: Query loadouts efficiently with indexes
    Given I have 100 loadouts
    When I query loadouts by user_id
    Then the query should use idx_loadouts_user index
    And the query should execute in less than 10ms

  Scenario: Query weapon skins by loadout efficiently
    Given a loadout has 10 weapon skins
    When I query weapon skins by loadout_id
    Then the query should use idx_loadout_weapon_skins_loadout index
    And the query should execute in less than 10ms

  # ============================================================================
  # Slug Generation (SEO)
  # ============================================================================

  Scenario: Generate unique slug from loadout name
    When I create a loadout "Red Dragon Budget"
    Then the slug should be "red-dragon-budget"
    And the slug should be unique

  Scenario: Handle duplicate slug with counter
    Given a loadout exists with slug "red-dragon-budget"
    When I create another loadout "Red Dragon Budget"
    Then the slug should be "red-dragon-budget-2"
    And both slugs should be unique
