# Feature 08 - Budget Loadout Builder (Phase 5: Minimal UI - Budget Input)
# Status: In Progress
# Priority: P0 (Must Ship for Phase 1)

Feature: Budget Loadout Creation UI
  As a user
  I want a web interface to create budget loadouts
  So that I can easily configure my cosmetic budget and see allocation recommendations

  Background:
    Given I am authenticated with valid session
    And the budget allocation algorithm is available from Phase 3
    And the API endpoints are available from Phase 4
    And I am on the "Create Loadout" page at /loadouts/new

  # ============================================================================
  # Form Rendering & Basic Validation
  # ============================================================================

  Scenario: Render budget input form with all fields
    When the page loads
    Then I should see a form with:
      | field               | type     | required |
      | Name                | text     | yes      |
      | Description         | textarea | no       |
      | Budget              | number   | yes      |
      | Theme               | select   | no       |
      | Allocation Mode     | radio    | yes      |
    And the "Create Loadout" submit button should be visible
    And the form should have ARIA labels for accessibility

  Scenario: Validate name field is required
    When I leave the name field empty
    And I try to submit the form
    Then I should see error "Name is required"
    And the submit button should be disabled
    And the name field should have ARIA error message

  Scenario: Validate name length (3-100 characters)
    When I enter "AB" in the name field
    Then I should see error "Name must be at least 3 characters"
    When I enter a name with 101 characters
    Then I should see error "Name must be 100 characters or less"

  Scenario: Validate budget is required and positive
    When I leave the budget field empty
    Then I should see error "Budget is required"
    When I enter "-50" in the budget field
    Then I should see error "Budget must be positive"
    When I enter "0" in the budget field
    Then I should see error "Budget must be positive"

  Scenario: Validate budget range ($10 - $100,000)
    When I enter "5" in the budget field
    Then I should see error "Minimum budget is $10"
    When I enter "150000" in the budget field
    Then I should see error "Maximum budget is $100,000"
    When I enter "150.50" in the budget field
    Then I should not see any budget errors

  # ============================================================================
  # Preset Mode Selection
  # ============================================================================

  Scenario: Display preset mode options
    When the page loads
    And "Use custom allocation" is unchecked
    Then I should see 4 preset allocation modes:
      | mode         | description                              |
      | Balance      | 70% weapons, 15% knife, 10% gloves       |
      | Price        | 80% weapons (maximize weapon skins)      |
      | Quality      | 60% weapons, 20% knife (balanced high-end) |
      | Color Match  | 65% weapons, 18% knife (visual cohesion) |
    And "Balance" mode should be selected by default

  Scenario: Switch between preset modes
    Given I am on the loadout creation page
    When I select "Price" preset mode
    Then the budget visualization should update to show 80% weapons allocation
    When I select "Quality" preset mode
    Then the budget visualization should update to show 60% weapons, 20% knife allocation

  Scenario: Preset mode disabled when custom allocation enabled
    Given I am on the loadout creation page
    When I check "Use custom allocation"
    Then the preset mode selector should be hidden
    And the custom allocation sliders should be visible

  # ============================================================================
  # Custom Allocation Sliders
  # ============================================================================

  Scenario: Display custom allocation sliders
    Given I check "Use custom allocation"
    Then I should see 6 allocation sliders:
      | category     |
      | Weapon Skins |
      | Knife        |
      | Gloves       |
      | Agents       |
      | Music Kit    |
      | Charms       |
    And each slider should have a percentage display
    And each slider should have a number input

  Scenario: Adjust custom allocation sliders
    Given custom allocation is enabled
    When I set "Weapon Skins" slider to 70%
    And I set "Knife" slider to 20%
    And I set "Gloves" slider to 10%
    Then the total should display "100.00%"
    And the total should be shown in green (valid)

  Scenario: Validate custom allocation must sum to 100%
    Given custom allocation is enabled
    When I set sliders to:
      | category     | percentage |
      | weapon_skins | 60.00      |
      | knife        | 30.00      |
      | gloves       | 5.00       |
    Then the total should display "95.00%"
    And I should see error "Allocation must sum to 100.00%"
    And the total should be shown in red (invalid)
    And the submit button should be disabled

  Scenario: Custom allocation allows decimal precision
    Given custom allocation is enabled
    When I set sliders to:
      | category     | percentage |
      | weapon_skins | 70.50      |
      | knife        | 15.25      |
      | gloves       | 10.15      |
      | agents       | 3.10       |
      | music_kit    | 0.75       |
      | charms       | 0.25       |
    Then the total should display "100.00%"
    And the total should be shown in green (valid)

  Scenario: Custom allocation validation tolerance (±0.01%)
    Given custom allocation is enabled
    When I set sliders to total 99.99%
    Then the total should be shown in red (invalid)
    When I set sliders to total 100.01%
    Then the total should be shown in red (invalid)
    When I set sliders to total 100.00%
    Then the total should be shown in green (valid)

  Scenario: Slider and number input sync
    Given custom allocation is enabled
    When I move the "Weapon Skins" slider to 75%
    Then the number input should show "75.00"
    When I type "80.00" in the number input
    Then the slider should move to 80%

  # ============================================================================
  # Budget Visualization
  # ============================================================================

  Scenario: Display budget visualization
    Given I have entered a budget of $150
    And I am using "Balance" preset mode
    Then I should see a budget breakdown visualization with:
      | category     | percentage | amount  |
      | Weapon Skins | 70.00%     | $105.00 |
      | Knife        | 15.00%     | $22.50  |
      | Gloves       | 10.00%     | $15.00  |
      | Agents       | 3.00%      | $4.50   |
      | Music Kit    | 2.00%      | $3.00   |
    And I should see a total of $150.00

  Scenario: Budget visualization updates in real-time
    Given I have entered a budget of $100
    When I change the budget to $200
    Then all category amounts should double immediately
    When I switch from "Balance" to "Price" preset
    Then the visualization should update to show Price allocation

  Scenario: Visualization shows horizontal bars
    Given I am viewing the budget visualization
    Then each category should have a horizontal progress bar
    And the bar width should represent the percentage allocation
    And the bars should have different colors for each category

  # ============================================================================
  # Server Action Submission
  # ============================================================================

  Scenario: Submit valid loadout form
    Given I have filled in:
      | field       | value                |
      | Name        | Red Dragon Budget    |
      | Description | Affordable red theme |
      | Budget      | 150                  |
      | Theme       | red                  |
    And I am using "Balance" preset mode
    When I click "Create Loadout"
    Then the form should be submitted via Server Action
    And I should be redirected to /loadouts/{id}

  Scenario: Server-side validation failure
    Given I have filled in invalid data
    When I submit the form
    Then the Server Action should re-validate
    And I should see server-side error messages
    And the form should preserve my input values

  Scenario: Form disabled during submission
    Given I have filled in valid data
    When I click "Create Loadout"
    Then all form fields should be disabled
    And the submit button should show "Creating..."
    And the submit button should have a loading spinner

  Scenario: Handle Server Action errors
    Given the database is unavailable
    When I submit the form
    Then I should see error "Unable to create loadout. Please try again."
    And the form should remain enabled for retry

  Scenario: Prevent double submission
    Given I have filled in valid data
    When I click "Create Loadout"
    Then the submit button should be disabled immediately
    And subsequent clicks should be ignored until completion

  # ============================================================================
  # Progressive Enhancement
  # ============================================================================

  Scenario: Form works without JavaScript
    Given JavaScript is disabled
    When I submit the form
    Then the form should POST to Server Action
    And validation should occur on the server
    And errors should display on page reload

  Scenario: Custom allocation fallback without JavaScript
    Given JavaScript is disabled
    And custom allocation is enabled
    Then the form should fallback to hidden inputs
    And preset mode should be used by default

  # ============================================================================
  # Accessibility
  # ============================================================================

  Scenario: Keyboard navigation
    Given I am on the loadout creation page
    When I press Tab repeatedly
    Then focus should move through all form fields in logical order
    And the current focused element should have visible focus indicator

  Scenario: Screen reader support
    Given I am using a screen reader
    When I navigate the form
    Then all inputs should have clear aria-label attributes
    And error messages should be announced via aria-describedby
    And required fields should be marked with aria-required="true"

  Scenario: Error announcement for screen readers
    Given I am using a screen reader
    When validation fails
    Then the error message should be announced
    And the error should be linked to the field via aria-describedby

  # ============================================================================
  # Real-time Feedback
  # ============================================================================

  Scenario: Validation on blur (not on every keystroke)
    Given I am typing in the name field
    When I type "A"
    Then I should not see an error yet
    When I move focus to another field (blur)
    Then I should see error "Name must be at least 3 characters"

  Scenario: Budget updates visualization immediately
    Given I have a budget of $100
    When I change the budget to $200
    Then the visualization should update within 100ms
    And there should be no page reload

  Scenario: Slider changes update visualization
    Given I am using custom allocation
    When I move the "Knife" slider to 25%
    Then the knife dollar amount should update immediately
    And the total should recalculate

  # ============================================================================
  # Loading States
  # ============================================================================

  Scenario: Submit button loading state
    Given I have filled in valid data
    When I click "Create Loadout"
    Then the button text should change to "Creating..."
    And a loading spinner should appear
    And the button should be disabled

  Scenario: Form loading state during redirect
    Given the loadout was created successfully
    When the redirect happens
    Then the form should remain disabled
    And the loading state should persist until navigation

  # ============================================================================
  # Edge Cases
  # ============================================================================

  Scenario: Handle floating-point precision errors
    Given custom allocation is enabled
    When I set sliders to values that sum to 99.999999999%
    Then the system should handle floating-point precision
    And validation should use ±0.01% tolerance

  Scenario: Maximum budget with custom allocation
    Given I enter $100,000 budget
    And I use custom allocation with 80% weapons
    Then the weapon allocation should show $80,000.00
    And there should be no overflow errors

  Scenario: Minimum budget with all categories
    Given I enter $10 budget
    And I use "Balance" preset
    Then all allocations should be calculated
    And the total should equal $10.00 exactly

  # ============================================================================
  # URL State & Navigation
  # ============================================================================

  Scenario: Page URL is /loadouts/new
    Given I navigate to /loadouts/new
    Then the page should load successfully
    And I should see the loadout creation form

  Scenario: Redirect after successful creation
    Given I created a loadout
    Then I should be redirected to /loadouts/{loadout-id}
    And the URL should contain the new loadout's ID

  # ============================================================================
  # Performance
  # ============================================================================

  Scenario: Form renders quickly
    Given I navigate to /loadouts/new
    Then the page should render within 2 seconds
    And all form fields should be interactive

  Scenario: Slider updates are smooth
    Given I am using custom allocation
    When I drag a slider rapidly
    Then the UI should update without lag
    And the total should recalculate smoothly
