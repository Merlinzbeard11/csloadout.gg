# Feature 08 - Budget Loadout Builder (Phase 3: Budget Algorithm)
# Status: In Progress
# Priority: P0 (Must Ship for Phase 1)

Feature: Simple Budget Allocation Algorithm
  As a user
  I want the system to intelligently distribute my budget across cosmetic categories
  So that I get optimal value and balanced loadout suggestions

  Background:
    Given the database includes cosmetic categories from Phase 1
    And the database includes weapon priorities from Phase 1
    And weapon budget weights sum to exactly 1.00
    And user "user123" is authenticated

  # ============================================================================
  # Preset Allocation Modes
  # ============================================================================

  Scenario: Allocate budget using "balance" preset
    Given I have a loadout with budget $150.00
    And I select prioritize mode "balance"
    When I run the budget allocation algorithm
    Then I should receive category allocations:
      | category     | percentage | allocated_budget |
      | weapon_skins | 70.00      | 105.00           |
      | knife        | 15.00      | 22.50            |
      | gloves       | 10.00      | 15.00            |
      | agents       | 3.00       | 4.50             |
      | music_kit    | 2.00       | 3.00             |
      | charms       | 0.00       | 0.00             |
    And total allocated should equal $150.00

  Scenario: Allocate budget using "price" preset (maximize weapon skins)
    Given I have a loadout with budget $100.00
    And I select prioritize mode "price"
    When I run the budget allocation algorithm
    Then I should receive category allocations:
      | category     | percentage | allocated_budget |
      | weapon_skins | 80.00      | 80.00            |
      | knife        | 10.00      | 10.00            |
      | gloves       | 5.00       | 5.00             |
      | agents       | 3.00       | 3.00             |
      | music_kit    | 2.00       | 2.00             |
    And weapon_skins allocation should be highest

  Scenario: Allocate budget using "quality" preset (balanced high-end)
    Given I have a loadout with budget $200.00
    And I select prioritize mode "quality"
    When I run the budget allocation algorithm
    Then I should receive category allocations:
      | category     | percentage | allocated_budget |
      | weapon_skins | 60.00      | 120.00           |
      | knife        | 20.00      | 40.00            |
      | gloves       | 15.00      | 30.00            |
      | agents       | 3.00       | 6.00             |
      | music_kit    | 2.00       | 4.00             |
    And knife allocation should be second highest

  Scenario: Allocate budget using "color_match" preset
    Given I have a loadout with budget $120.00
    And I select prioritize mode "color_match"
    When I run the budget allocation algorithm
    Then I should receive category allocations:
      | category     | percentage | allocated_budget |
      | weapon_skins | 65.00      | 78.00            |
      | knife        | 18.00      | 21.60            |
      | gloves       | 12.00      | 14.40            |
      | agents       | 3.00       | 3.60             |
      | music_kit    | 2.00       | 2.40             |
    And allocations should favor visual cohesion

  # ============================================================================
  # Custom Allocation Percentages
  # ============================================================================

  Scenario: Allocate budget using custom percentages
    Given I have a loadout with budget $150.00
    And I set custom allocation:
      | category     | percentage |
      | weapon_skins | 50.00      |
      | knife        | 30.00      |
      | gloves       | 20.00      |
      | agents       | 0.00       |
      | music_kit    | 0.00       |
      | charms       | 0.00       |
    When I run the budget allocation algorithm
    Then I should receive category allocations:
      | category     | allocated_budget |
      | weapon_skins | 75.00            |
      | knife        | 45.00            |
      | gloves       | 30.00            |
      | agents       | 0.00             |
      | music_kit    | 0.00             |
      | charms       | 0.00             |
    And custom_allocation should override preset mode

  Scenario: Custom allocation with decimal percentages
    Given I have a loadout with budget $100.00
    And I set custom allocation:
      | category     | percentage |
      | weapon_skins | 33.33      |
      | knife        | 33.33      |
      | gloves       | 33.34      |
      | agents       | 0.00       |
      | music_kit    | 0.00       |
      | charms       | 0.00       |
    When I run the budget allocation algorithm
    Then I should receive category allocations:
      | category     | allocated_budget |
      | weapon_skins | 33.33            |
      | knife        | 33.33            |
      | gloves       | 33.34            |
    And total allocated should equal $100.00 exactly

  Scenario: Custom allocation with zero percentages excludes categories
    Given I have a loadout with budget $200.00
    And I set custom allocation with weapon_skins = 100.00%
    And all other categories = 0.00%
    When I run the budget allocation algorithm
    Then weapon_skins should receive $200.00
    And knife should receive $0.00
    And gloves should receive $0.00
    And the algorithm should skip excluded categories

  # ============================================================================
  # Weapon Budget Distribution (Within weapon_skins Category)
  # ============================================================================

  Scenario: Distribute weapon_skins budget among 10 weapons
    Given I have a loadout with budget $150.00
    And I use "balance" preset (weapon_skins gets 70% = $105.00)
    When I run the weapon budget distribution algorithm
    Then I should receive weapon allocations within weapon_skins:
      | weapon_type   | budget_weight | allocated_budget |
      | AK-47         | 0.25          | 26.25            |
      | M4A4          | 0.15          | 15.75            |
      | AWP           | 0.15          | 15.75            |
      | Desert Eagle  | 0.10          | 10.50            |
      | USP-S         | 0.08          | 8.40             |
      | Glock-18      | 0.07          | 7.35             |
      | M4A1-S        | 0.07          | 7.35             |
      | Five-Seven    | 0.05          | 5.25             |
      | P250          | 0.05          | 5.25             |
      | Tec-9         | 0.03          | 3.15             |
    And total weapon allocations should equal $105.00

  Scenario: Weapon budget weights must sum to 1.00
    When I query weapon priorities from database
    Then the sum of all budget_weight values should equal 1.00
    And the tolerance should be 0.001 (floating point)

  Scenario: Essential weapons receive guaranteed budget
    Given I have a loadout with very small budget $10.00
    And I use "price" preset (weapon_skins gets 80% = $8.00)
    When I run the weapon budget distribution algorithm
    Then AK-47 should receive $2.00 (25% of $8.00)
    And M4A4 should receive $1.20 (15% of $8.00)
    And essential weapons (is_essential = true) should be prioritized

  # ============================================================================
  # Budget Validation
  # ============================================================================

  Scenario: Validate total allocations equal input budget
    Given I have a loadout with budget $150.00
    When I run the budget allocation algorithm
    Then the sum of all category allocations should equal $150.00
    And the tolerance should be 0.01 (rounding)

  Scenario: Reject negative budgets
    Given I try to allocate budget $-50.00
    When I run the budget allocation algorithm
    Then I should get error "Budget must be positive"
    And no allocations should be returned

  Scenario: Handle very small budgets ($10)
    Given I have a loadout with budget $10.00
    And I use "balance" preset
    When I run the budget allocation algorithm
    Then weapon_skins should receive $7.00
    And knife should receive $1.50
    And gloves should receive $1.00
    And agents should receive $0.30
    And music_kit should receive $0.20
    And allocations should be mathematically valid

  Scenario: Handle very large budgets ($10,000)
    Given I have a loadout with budget $10000.00
    And I use "quality" preset
    When I run the budget allocation algorithm
    Then weapon_skins should receive $6000.00
    And knife should receive $2000.00
    And gloves should receive $1500.00
    And no precision errors should occur

  # ============================================================================
  # Float Value Optimization (Budget-Conscious)
  # ============================================================================

  Scenario: Target higher float values for budget optimization
    Given I have a loadout with budget $50.00 (budget-conscious)
    And I enable float optimization for "Field-Tested"
    When I run the budget allocation algorithm
    Then the algorithm should recommend float range 0.15-0.18 for FT
    And this range should be cheaper than 0.20-0.25
    And I should get guidance: "Target float 0.15-0.18 for best value"

  Scenario: Target lower float values for quality builds
    Given I have a loadout with budget $500.00 (quality build)
    And I enable float optimization for "Minimal Wear"
    When I run the budget allocation algorithm
    Then the algorithm should recommend float range 0.07-0.09 for MW
    And this range should be higher quality (better wear)
    And I should get guidance: "Target float 0.07-0.09 for best appearance"

  # ============================================================================
  # Algorithm Correctness
  # ============================================================================

  Scenario: Category allocations preserve decimal precision
    Given I have a loadout with budget $99.99
    And I use "balance" preset
    When I run the budget allocation algorithm
    Then weapon_skins should receive $69.99 (70% of $99.99)
    And knife should receive $15.00 (15% rounded)
    And decimal precision should be maintained to 2 places

  Scenario: Algorithm returns structured allocation result
    Given I have a loadout with budget $150.00
    When I run the budget allocation algorithm
    Then I should receive an object with:
      | field               | type   | description                          |
      | totalBudget         | number | Original budget ($150.00)            |
      | categoryAllocations | array  | Per-category breakdown               |
      | weaponAllocations   | array  | Per-weapon breakdown (weapon_skins)  |
      | allocationMode      | string | "preset:balance" or "custom"         |
      | floatGuidance       | object | Optional float optimization guidance |

  Scenario: Algorithm handles missing weapon priorities gracefully
    Given weapon priorities table is empty
    When I run the budget allocation algorithm
    Then I should get warning "No weapon priorities found"
    And weapon_skins budget should distribute equally among available weapons
    Or I should get error if no weapons exist

  # ============================================================================
  # Performance Requirements
  # ============================================================================

  Scenario: Algorithm executes in under 50ms
    Given I have a loadout with budget $150.00
    When I run the budget allocation algorithm
    Then the calculation should complete in less than 50ms
    And the algorithm should not make database queries per weapon

  Scenario: Algorithm caches weapon priorities
    Given weapon priorities are loaded from database once
    When I run the budget allocation algorithm 100 times
    Then weapon priorities should be cached in memory
    And database should only be queried once

  # ============================================================================
  # Integration with Loadout Model
  # ============================================================================

  Scenario: Store allocation result with loadout
    Given I create a loadout with budget $150.00
    When I run the budget allocation algorithm
    Then the loadout should store:
      | field             | value      |
      | budget            | 150.00     |
      | prioritize        | balance    |
      | custom_allocation | NULL       |
    And I can re-run algorithm using stored settings

  Scenario: Re-run algorithm after custom allocation change
    Given I have a loadout with "balance" preset
    When I change to custom allocation (50/30/20)
    And I re-run the budget allocation algorithm
    Then new allocations should use custom percentages
    And previous preset should be ignored
