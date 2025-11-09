# Feature 08 - Budget Loadout Builder (Phase 1: Database Foundation)
# Status: In Progress
# Priority: P0 (Must Ship for Phase 1)

Feature: Database Foundation for Budget Loadout Builder
  As a developer
  I need database tables for cosmetic categories and weapon priorities
  So that the loadout builder algorithm can allocate budget correctly

  Background:
    Given the database schema includes cosmetic_categories table
    And the database schema includes weapon_usage_priority table
    And seed data has been loaded

  # ============================================================================
  # Cosmetic Categories
  # ============================================================================

  Scenario: Query all cosmetic categories
    When I query all cosmetic categories
    Then I should see 10 categories
    And categories should include "weapon_skins"
    And categories should include "agent_ct"
    And categories should include "agent_t"
    And categories should include "knife"
    And categories should include "gloves"
    And categories should include "music_kit"
    And categories should include "stickers"
    And categories should include "patches"
    And categories should include "charms"
    And categories should include "graffiti"

  Scenario: Cosmetic categories have correct metadata
    When I query the "weapon_skins" category
    Then it should have name "Weapon Skins"
    And it should have category_type "weapon"
    And it should have sort_order 1
    And it should be marked as required
    And it should have release_date "2013-08-13"

  Scenario: Weapon charms are marked as new
    When I query the "charms" category
    Then it should have name "Weapon Charms"
    And it should have category_type "customization"
    And it should have sort_order 9
    And it should NOT be marked as required
    And it should have release_date "2025-10-01"
    And it should have description containing "NEW"

  Scenario: Categories are sorted by sort_order
    When I query all cosmetic categories ordered by sort_order
    Then the first category should be "weapon_skins"
    And the second category should be "agent_ct"
    And the third category should be "agent_t"
    And the last category should be "graffiti"

  Scenario: Identify required vs optional cosmetic categories
    When I query all required cosmetic categories
    Then I should only see "weapon_skins"
    When I query all optional cosmetic categories
    Then I should see 9 categories
    And they should include "knife", "gloves", "agent_ct", "agent_t"

  # ============================================================================
  # Weapon Usage Priorities
  # ============================================================================

  Scenario: Query weapon usage priorities for budget allocation
    When I query all weapon usage priorities
    Then I should see at least 10 weapons
    And priorities should include "AK-47"
    And priorities should include "M4A4"
    And priorities should include "M4A1-S"
    And priorities should include "AWP"
    And priorities should include "Desert Eagle"

  Scenario: AK-47 has highest budget allocation weight
    When I query the weapon priority for "AK-47"
    Then it should have usage_percentage 95.00
    And it should have budget_weight 0.25
    And it should be marked as essential

  Scenario: Weapon priorities sum to 100% budget allocation
    When I query all weapon usage priorities
    And I sum all budget_weight values
    Then the total should be approximately 1.00
    And the total should be within 0.01 of 1.00

  Scenario: Essential weapons are identified correctly
    When I query all essential weapons
    Then I should see "AK-47"
    And I should see "M4A4"
    And I should see "M4A1-S"
    And I should see "AWP"
    And I should NOT see "P250"
    And I should NOT see "Tec-9"

  Scenario: Weapon priorities ordered by usage percentage
    When I query all weapon priorities ordered by usage_percentage DESC
    Then "AK-47" should be first with 95.00%
    And "M4A4" should be second with 85.00%
    And "M4A1-S" should be third with 80.00%
    And "AWP" should be fourth with 70.00%

  Scenario: Budget weights align with weapon importance
    When I query the weapon priority for "AK-47"
    Then budget_weight should be 0.25 (highest allocation)
    When I query the weapon priority for "P250"
    Then budget_weight should be 0.02 (lowest allocation)

  # ============================================================================
  # Data Integrity
  # ============================================================================

  Scenario: All cosmetic categories have unique IDs
    When I query all cosmetic categories
    Then all id values should be unique
    And no id should be NULL

  Scenario: All weapon priorities have unique weapon types
    When I query all weapon usage priorities
    Then all weapon_type values should be unique
    And no weapon_type should be NULL

  Scenario: Cosmetic category release dates are valid
    When I query all cosmetic categories
    Then all release_date values should be valid dates
    And all release_date values should be between "2013-01-01" and "2026-01-01"
    And "weapon_skins" release_date should be oldest
    And "charms" release_date should be most recent

  Scenario: Weapon budget weights are valid percentages
    When I query all weapon usage priorities
    Then all budget_weight values should be between 0.00 and 1.00
    And no budget_weight should be negative
    And no budget_weight should be NULL

  # ============================================================================
  # Database Schema Validation
  # ============================================================================

  Scenario: Cosmetic categories table has correct columns
    When I inspect the cosmetic_categories table schema
    Then it should have column "id" of type VARCHAR(50) as PRIMARY KEY
    And it should have column "name" of type VARCHAR(100) NOT NULL
    And it should have column "category_type" of type VARCHAR(50) NOT NULL
    And it should have column "sort_order" of type INTEGER NOT NULL
    And it should have column "is_required" of type BOOLEAN with default FALSE
    And it should have column "icon_url" of type TEXT nullable
    And it should have column "description" of type TEXT nullable
    And it should have column "release_date" of type DATE nullable

  Scenario: Weapon usage priority table has correct columns
    When I inspect the weapon_usage_priority table schema
    Then it should have column "weapon_type" of type VARCHAR(50) as PRIMARY KEY
    And it should have column "usage_percentage" of type DECIMAL(5,2)
    And it should have column "budget_weight" of type DECIMAL(5,2)
    And it should have column "is_essential" of type BOOLEAN with default FALSE

  # ============================================================================
  # Performance & Indexing
  # ============================================================================

  Scenario: Query cosmetic categories by category_type efficiently
    When I query cosmetic categories where category_type = "weapon"
    Then the query should execute in less than 10ms
    And I should see only "weapon_skins"

  Scenario: Query essential weapons efficiently
    When I query weapon priorities where is_essential = true
    Then the query should execute in less than 10ms
    And I should see 4 weapons (AK-47, M4A4, M4A1-S, AWP)
