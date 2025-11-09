# Feature 08 - Budget Loadout Builder (Phase 4: Basic API Endpoints)
# Status: In Progress
# Priority: P0 (Must Ship for Phase 1)

Feature: REST API Endpoints for Budget Loadouts
  As a frontend application
  I want REST API endpoints for loadout operations
  So that users can create, manage, and allocate budgets through the UI

  Background:
    Given the database includes tables from Phases 1-3
    And the budget allocation algorithm exists from Phase 3
    And user "user123" is authenticated with valid session
    And user "user456" is another authenticated user

  # ============================================================================
  # GET /api/loadouts - List User Loadouts
  # ============================================================================

  Scenario: List all loadouts for authenticated user
    Given user "user123" has 3 loadouts:
      | name              | budget | created_at          |
      | Red Dragon Budget | 150.00 | 2025-01-01 10:00:00 |
      | Blue Steel Pro    | 300.00 | 2025-01-02 10:00:00 |
      | Budget Starter    | 50.00  | 2025-01-03 10:00:00 |
    When I GET /api/loadouts
    Then I should receive status 200
    And I should receive JSON array with 3 loadouts
    And loadouts should be ordered by created_at DESC
    And each loadout should include:
      | field       | type   |
      | id          | string |
      | name        | string |
      | budget      | number |
      | actual_cost | number |
      | created_at  | string |

  Scenario: List loadouts returns empty array for user with no loadouts
    Given user "user123" has 0 loadouts
    When I GET /api/loadouts
    Then I should receive status 200
    And I should receive JSON array with 0 items

  Scenario: List loadouts requires authentication
    Given I am not authenticated
    When I GET /api/loadouts
    Then I should receive status 401
    And I should receive error "Authentication required"

  Scenario: List loadouts only returns current user's loadouts (isolation)
    Given user "user123" has 2 loadouts
    And user "user456" has 3 loadouts
    When I GET /api/loadouts as user "user123"
    Then I should receive 2 loadouts
    And all loadouts should belong to user "user123"
    And I should not see loadouts from user "user456"

  # ============================================================================
  # POST /api/loadouts - Create New Loadout
  # ============================================================================

  Scenario: Create new loadout with valid data
    When I POST /api/loadouts with:
      """
      {
        "name": "Red Dragon Budget",
        "description": "Affordable red-themed loadout",
        "budget": 150.00,
        "theme": "red"
      }
      """
    Then I should receive status 201
    And I should receive created loadout with:
      | field       | value                         |
      | name        | Red Dragon Budget             |
      | budget      | 150.00                        |
      | actual_cost | 0.00                          |
      | is_public   | false                         |
      | slug        | red-dragon-budget             |
    And the loadout should be saved to database
    And the loadout should belong to authenticated user

  Scenario: Create loadout with custom allocation
    When I POST /api/loadouts with:
      """
      {
        "name": "Custom Allocation Test",
        "budget": 100.00,
        "custom_allocation": {
          "weapon_skins": 50.00,
          "knife": 30.00,
          "gloves": 20.00,
          "agents": 0.00,
          "music_kit": 0.00,
          "charms": 0.00
        }
      }
      """
    Then I should receive status 201
    And the loadout should have custom_allocation set
    And custom_allocation should match input percentages

  Scenario: Create loadout validates custom allocation percentages
    When I POST /api/loadouts with invalid custom allocation:
      """
      {
        "name": "Invalid Allocation",
        "budget": 100.00,
        "custom_allocation": {
          "weapon_skins": 60.00,
          "knife": 30.00,
          "gloves": 5.00
        }
      }
      """
    Then I should receive status 400
    And I should receive error "Custom allocation must sum to 100.00%"

  Scenario: Create loadout validates required fields
    When I POST /api/loadouts with missing name:
      """
      {
        "budget": 100.00
      }
      """
    Then I should receive status 400
    And I should receive error "Name is required"

  Scenario: Create loadout validates budget is positive
    When I POST /api/loadouts with negative budget:
      """
      {
        "name": "Invalid Budget",
        "budget": -50.00
      }
      """
    Then I should receive status 400
    And I should receive error "Budget must be positive"

  Scenario: Create loadout requires authentication
    Given I am not authenticated
    When I POST /api/loadouts with valid data
    Then I should receive status 401
    And I should receive error "Authentication required"

  # ============================================================================
  # GET /api/loadouts/:id - Retrieve Single Loadout
  # ============================================================================

  Scenario: Retrieve loadout by ID
    Given user "user123" has loadout "loadout-abc" with:
      | name   | Red Dragon Budget |
      | budget | 150.00            |
    When I GET /api/loadouts/loadout-abc
    Then I should receive status 200
    And I should receive loadout with:
      | field  | value             |
      | id     | loadout-abc       |
      | name   | Red Dragon Budget |
      | budget | 150.00            |

  Scenario: Retrieve loadout includes weapon skins
    Given loadout "loadout-abc" has 3 weapon skins:
      | weapon_type  | price |
      | AK-47        | 25.00 |
      | M4A4         | 18.00 |
      | AWP          | 45.00 |
    When I GET /api/loadouts/loadout-abc
    Then I should receive loadout with weapon_skins array
    And weapon_skins should have 3 items
    And actual_cost should be 88.00 (sum of prices)

  Scenario: Retrieve non-existent loadout returns 404
    When I GET /api/loadouts/non-existent-id
    Then I should receive status 404
    And I should receive error "Loadout not found"

  Scenario: Retrieve loadout requires ownership (authorization)
    Given user "user123" has loadout "loadout-abc"
    And user "user456" is authenticated
    When user "user456" tries to GET /api/loadouts/loadout-abc
    Then I should receive status 403
    And I should receive error "Forbidden - not your loadout"

  Scenario: Retrieve loadout requires authentication
    Given I am not authenticated
    When I GET /api/loadouts/loadout-abc
    Then I should receive status 401
    And I should receive error "Authentication required"

  # ============================================================================
  # PUT /api/loadouts/:id - Update Loadout
  # ============================================================================

  Scenario: Update loadout name and description
    Given user "user123" has loadout "loadout-abc" with name "Old Name"
    When I PUT /api/loadouts/loadout-abc with:
      """
      {
        "name": "New Name",
        "description": "Updated description"
      }
      """
    Then I should receive status 200
    And I should receive updated loadout with:
      | field       | value               |
      | name        | New Name            |
      | description | Updated description |
    And updated_at timestamp should be updated

  Scenario: Update loadout budget
    Given user "user123" has loadout "loadout-abc" with budget 100.00
    When I PUT /api/loadouts/loadout-abc with:
      """
      {
        "budget": 200.00
      }
      """
    Then I should receive status 200
    And the loadout budget should be 200.00

  Scenario: Update loadout custom allocation
    Given user "user123" has loadout "loadout-abc"
    When I PUT /api/loadouts/loadout-abc with new custom allocation:
      """
      {
        "custom_allocation": {
          "weapon_skins": 60.00,
          "knife": 25.00,
          "gloves": 15.00,
          "agents": 0.00,
          "music_kit": 0.00,
          "charms": 0.00
        }
      }
      """
    Then I should receive status 200
    And custom_allocation should be updated

  Scenario: Update validates custom allocation
    Given user "user123" has loadout "loadout-abc"
    When I PUT /api/loadouts/loadout-abc with invalid allocation
    Then I should receive status 400
    And I should receive error "Custom allocation must sum to 100.00%"

  Scenario: Update non-existent loadout returns 404
    When I PUT /api/loadouts/non-existent-id with valid data
    Then I should receive status 404
    And I should receive error "Loadout not found"

  Scenario: Update loadout requires ownership
    Given user "user123" has loadout "loadout-abc"
    And user "user456" is authenticated
    When user "user456" tries to PUT /api/loadouts/loadout-abc
    Then I should receive status 403
    And I should receive error "Forbidden - not your loadout"

  Scenario: Update loadout requires authentication
    Given I am not authenticated
    When I PUT /api/loadouts/loadout-abc with valid data
    Then I should receive status 401
    And I should receive error "Authentication required"

  # ============================================================================
  # DELETE /api/loadouts/:id - Delete Loadout
  # ============================================================================

  Scenario: Delete loadout
    Given user "user123" has loadout "loadout-abc"
    When I DELETE /api/loadouts/loadout-abc
    Then I should receive status 204
    And the loadout should be removed from database
    And associated weapon skins should be deleted (CASCADE)

  Scenario: Delete non-existent loadout returns 404
    When I DELETE /api/loadouts/non-existent-id
    Then I should receive status 404
    And I should receive error "Loadout not found"

  Scenario: Delete loadout requires ownership
    Given user "user123" has loadout "loadout-abc"
    And user "user456" is authenticated
    When user "user456" tries to DELETE /api/loadouts/loadout-abc
    Then I should receive status 403
    And I should receive error "Forbidden - not your loadout"

  Scenario: Delete loadout requires authentication
    Given I am not authenticated
    When I DELETE /api/loadouts/loadout-abc
    Then I should receive status 401
    And I should receive error "Authentication required"

  # ============================================================================
  # POST /api/loadouts/:id/allocate - Run Budget Allocation Algorithm
  # ============================================================================

  Scenario: Run budget allocation for loadout with preset mode
    Given user "user123" has loadout "loadout-abc" with:
      | budget    | 150.00  |
      | prioritize| balance |
    When I POST /api/loadouts/loadout-abc/allocate
    Then I should receive status 200
    And I should receive allocation result with:
      | field               | type  |
      | totalBudget         | 150.00|
      | categoryAllocations | array |
      | weaponAllocations   | array |
      | allocationMode      | preset:balance |

  Scenario: Run budget allocation with custom allocation
    Given user "user123" has loadout "loadout-abc" with custom allocation
    When I POST /api/loadouts/loadout-abc/allocate
    Then I should receive status 200
    And allocationMode should be "custom"
    And categoryAllocations should use custom percentages

  Scenario: Run budget allocation with float optimization
    Given user "user123" has loadout "loadout-abc" with budget 50.00
    When I POST /api/loadouts/loadout-abc/allocate with:
      """
      {
        "enableFloatOptimization": true
      }
      """
    Then I should receive status 200
    And I should receive floatGuidance object
    And floatGuidance should recommend FT 0.15-0.18 for budget build

  Scenario: Run allocation on non-existent loadout returns 404
    When I POST /api/loadouts/non-existent-id/allocate
    Then I should receive status 404
    And I should receive error "Loadout not found"

  Scenario: Run allocation requires ownership
    Given user "user123" has loadout "loadout-abc"
    And user "user456" is authenticated
    When user "user456" tries to POST /api/loadouts/loadout-abc/allocate
    Then I should receive status 403
    And I should receive error "Forbidden - not your loadout"

  Scenario: Run allocation requires authentication
    Given I am not authenticated
    When I POST /api/loadouts/loadout-abc/allocate
    Then I should receive status 401
    And I should receive error "Authentication required"

  # ============================================================================
  # Error Handling & Edge Cases
  # ============================================================================

  Scenario: API handles malformed JSON gracefully
    When I POST /api/loadouts with malformed JSON:
      """
      { "name": "Test", "budget": }
      """
    Then I should receive status 400
    And I should receive error "Invalid JSON"

  Scenario: API handles database connection errors
    Given the database is unavailable
    When I GET /api/loadouts
    Then I should receive status 500
    And I should receive error "Internal server error"
    And the error should be logged

  Scenario: API validates UUID format for loadout ID
    When I GET /api/loadouts/invalid-uuid-format
    Then I should receive status 400
    And I should receive error "Invalid loadout ID format"

  Scenario: API rate limits requests (security)
    Given I have made 100 requests in 1 minute
    When I make the 101st request
    Then I should receive status 429
    And I should receive error "Rate limit exceeded"

  # ============================================================================
  # Response Format Consistency
  # ============================================================================

  Scenario: Success responses follow consistent format
    When I GET /api/loadouts
    Then the response should have structure:
      """
      {
        "success": true,
        "data": [...],
        "timestamp": "2025-01-01T10:00:00Z"
      }
      """

  Scenario: Error responses follow consistent format
    When I POST /api/loadouts with invalid data
    Then the response should have structure:
      """
      {
        "success": false,
        "error": {
          "message": "Validation error",
          "code": "VALIDATION_ERROR",
          "details": [...]
        },
        "timestamp": "2025-01-01T10:00:00Z"
      }
      """

  # ============================================================================
  # Performance Requirements
  # ============================================================================

  Scenario: List loadouts responds in under 100ms
    Given user "user123" has 50 loadouts
    When I GET /api/loadouts
    Then the response should arrive in less than 100ms
    And the query should use database indexes

  Scenario: Create loadout responds in under 200ms
    When I POST /api/loadouts with valid data
    Then the response should arrive in less than 200ms
    And the transaction should be atomic

  Scenario: Run allocation responds in under 150ms
    When I POST /api/loadouts/loadout-abc/allocate
    Then the response should arrive in less than 150ms
    And the algorithm should execute in under 50ms
