# Feature 08 - Budget Loadout Builder (Phase 6: Item Selection UI)
# Status: In Progress
# Priority: P0 (Must Ship for Phase 1)

Feature: Loadout Item Selection and Management
  As a user
  I want to browse and select CS2 items for my budget loadout
  So that I can build a complete cosmetic loadout within my budget constraints

  Background:
    Given I am authenticated with valid session
    And I have created a loadout with:
      | field               | value                |
      | name                | Red Dragon Budget    |
      | budget              | 150.00               |
      | custom_allocation   | {"weapon_skins": 70.00, "knife": 15.00, "gloves": 10.00, "agents": 3.00, "music_kit": 2.00, "charms": 0.00} |
    And the Items table contains CS2 items with marketplace prices
    And I am on the loadout detail page at /loadouts/{loadout-id}

  # ============================================================================
  # Page Rendering & Basic Layout
  # ============================================================================

  Scenario: Render loadout detail page with budget summary
    When the page loads
    Then I should see the loadout name "Red Dragon Budget"
    And I should see budget summary:
      | field           | value    |
      | Total Budget    | $150.00  |
      | Spent           | $0.00    |
      | Remaining       | $150.00  |
    And I should see category tabs for item selection
    And I should see an item browser section

  Scenario: Display category tabs with budget allocations
    When the page loads
    Then I should see category tabs:
      | category     | allocation | budget   |
      | Weapon Skins | 70.00%     | $105.00  |
      | Knife        | 15.00%     | $22.50   |
      | Gloves       | 10.00%     | $15.00   |
      | Agents       | 3.00%      | $4.50    |
      | Music Kit    | 2.00%      | $3.00    |
    And "Weapon Skins" tab should be active by default
    And each tab should show remaining budget for that category

  Scenario: Category tabs filter items by type
    Given I am viewing the loadout detail page
    When I click the "Knife" tab
    Then the item browser should display only knife items
    And the category budget should show $22.50
    When I click the "Gloves" tab
    Then the item browser should display only glove items
    And the category budget should show $15.00

  # ============================================================================
  # Item Browsing & Display
  # ============================================================================

  Scenario: Display items in a grid layout
    Given I am on the "Weapon Skins" tab
    When the page loads
    Then I should see items displayed in a responsive grid
    And each item card should show:
      | field        | example                |
      | Image        | Item preview image     |
      | Name         | AK-47 \| Redline       |
      | Wear         | Field-Tested           |
      | Quality      | StatTrak™              |
      | Rarity       | Classified             |
      | Best Price   | $12.50 (CSFloat)       |
    And items should be ordered by quality asc, float_value asc, price asc

  Scenario: Display multi-platform pricing
    Given I am viewing an item card
    When I hover over the price
    Then I should see a price comparison tooltip showing:
      | platform  | price   |
      | CSFloat   | $12.50  |
      | Steam     | $14.20  |
      | CSMoney   | $13.80  |
      | Buff163   | $11.90  |
    And the cheapest price should be highlighted
    And each price should link to the marketplace listing

  Scenario: Filter items by weapon type
    Given I am on the "Weapon Skins" tab
    When I select "AK-47" from the weapon filter
    Then only AK-47 skins should be displayed
    When I select "AWP" from the weapon filter
    Then only AWP skins should be displayed
    When I select "All Weapons"
    Then all weapon skins should be displayed

  Scenario: Filter items by wear condition
    Given I am viewing weapon skins
    When I select "Factory New" from the wear filter
    Then only Factory New items should be displayed
    When I select "Minimal Wear" from the wear filter
    Then only Minimal Wear items should be displayed
    When I select "Any Wear"
    Then items with all wear conditions should be displayed

  Scenario: Filter items by quality
    Given I am viewing weapon skins
    When I check "StatTrak™" quality filter
    Then only StatTrak™ items should be displayed
    When I check "Souvenir" quality filter
    Then only Souvenir items should be displayed
    When I uncheck all quality filters
    Then all qualities should be displayed

  Scenario: Filter items by price range
    Given I am viewing the "Knife" tab with $22.50 budget
    When I set price range to $0 - $20
    Then only knives under $20 should be displayed
    When I set price range to $20 - $25
    Then only knives between $20-$25 should be displayed
    And the max price should not exceed the category budget

  # ============================================================================
  # Pagination
  # ============================================================================

  Scenario: Paginate item results
    Given there are 100 AK-47 skins in the database
    And I am on the "Weapon Skins" tab
    When I filter by "AK-47"
    Then I should see 20 items per page
    And I should see pagination controls
    And I should see "Page 1 of 5"

  Scenario: Navigate between pages
    Given I am viewing paginated results
    When I click "Next Page"
    Then I should see page 2 items
    And the URL should update to include ?page=2
    When I click "Previous Page"
    Then I should see page 1 items
    And the URL should update to ?page=1

  Scenario: Pagination preserves filters
    Given I have filtered by "AK-47" and "Factory New"
    And I am on page 2
    When I navigate to another page
    Then the filters should remain active
    And only AK-47 Factory New items should be shown

  # ============================================================================
  # Item Selection & Budget Tracking
  # ============================================================================

  Scenario: Select item and update budget
    Given I am viewing the "Weapon Skins" tab
    And my weapon skins budget is $105.00
    When I click "Add to Loadout" on "AK-47 | Redline ($12.50)"
    Then the item should be added to my loadout
    And the weapon skins budget should show:
      | spent     | $12.50  |
      | remaining | $92.50  |
    And the total budget should show:
      | spent     | $12.50  |
      | remaining | $137.50 |

  Scenario: Select multiple items from different categories
    Given I am on the loadout detail page
    When I add "AK-47 | Redline ($12.50)" from Weapon Skins tab
    And I add "Bayonet | Fade ($20.00)" from Knife tab
    And I add "Sport Gloves | Superconductor ($14.00)" from Gloves tab
    Then the total spent should be $46.50
    And the remaining budget should be $103.50
    And each category should show updated spent/remaining

  Scenario: Real-time budget tracking updates
    Given I have $105.00 weapon skins budget
    When I select an item worth $12.50
    Then the budget should update within 100ms
    And there should be no page reload
    And the remaining budget should show $92.50

  Scenario: Prevent selection when budget exceeded
    Given I have $22.50 knife budget remaining
    When I try to add a knife worth $25.00
    Then I should see error "Exceeds knife budget ($22.50 remaining)"
    And the item should not be added
    And the "Add to Loadout" button should be disabled for that item

  Scenario: Highlight items within budget
    Given I have $22.50 knife budget remaining
    When I browse knives
    Then knives under $22.50 should have "Add to Loadout" button enabled
    And knives over $22.50 should have button disabled
    And disabled items should show "Over Budget" badge

  # ============================================================================
  # Weapon Type Constraint (ONE skin per weapon)
  # ============================================================================

  Scenario: Allow one skin per weapon type
    Given I am viewing AK-47 skins
    When I add "AK-47 | Redline" to my loadout
    Then the AK-47 should be marked as selected
    When I try to add another AK-47 skin
    Then I should see message "Replace existing AK-47 skin?"
    And I should have options to "Replace" or "Cancel"

  Scenario: Replace existing weapon skin
    Given I have "AK-47 | Redline ($12.50)" in my loadout
    When I select "AK-47 | Fire Serpent ($150.00)"
    And I click "Replace"
    Then "AK-47 | Redline" should be removed
    And "AK-47 | Fire Serpent" should be added
    And the budget should reflect the new price
    And the spent amount should update from $12.50 to $150.00

  Scenario: Cancel weapon skin replacement
    Given I have "AK-47 | Redline" in my loadout
    When I select another AK-47 skin
    And I click "Cancel"
    Then the original "AK-47 | Redline" should remain
    And the new skin should not be added

  Scenario: Visual indicator for selected weapons
    Given I have added "AK-47 | Redline" to my loadout
    When I browse AK-47 skins
    Then "AK-47 | Redline" should have a "Selected" badge
    And other AK-47 skins should show "Replace Selected"

  # ============================================================================
  # Selected Items Display
  # ============================================================================

  Scenario: Display selected items summary
    Given I have selected:
      | weapon_type | item                  | price  |
      | AK-47       | AK-47 \| Redline      | $12.50 |
      | M4A4        | M4A4 \| Asiimov       | $18.00 |
      | AWP         | AWP \| Dragon Lore    | $75.00 |
    When I view the loadout page
    Then I should see a "Selected Items" section showing:
      | category     | items | spent   |
      | Weapon Skins | 3     | $105.50 |
    And I should see a list of selected items with thumbnails

  Scenario: Remove item from loadout
    Given I have "AK-47 | Redline ($12.50)" in my loadout
    And my spent amount is $12.50
    When I click "Remove" on the AK-47
    Then the AK-47 should be removed from my loadout
    And the spent amount should return to $0.00
    And the remaining budget should increase by $12.50

  Scenario: Edit selected item
    Given I have "AK-47 | Redline" in my loadout
    When I click "Change" on the AK-47
    Then I should be scrolled to the AK-47 filter
    And the item browser should show AK-47 alternatives
    And I can select a different AK-47 skin to replace it

  # ============================================================================
  # Server Actions & Data Persistence
  # ============================================================================

  Scenario: Save item selection to database
    Given I am viewing the loadout detail page
    When I add "AK-47 | Redline" to my loadout
    Then a Server Action should create a LoadoutWeaponSkin record with:
      | loadout_id  | {current-loadout-id} |
      | item_id     | {ak47-redline-id}    |
      | weapon_type | AK-47                |
    And the loadout actual_cost should update to $12.50

  Scenario: Load existing selections on page load
    Given I previously selected:
      | weapon_type | item             | price  |
      | AK-47       | AK-47 \| Redline | $12.50 |
      | Knife       | Bayonet \| Fade  | $20.00 |
    When I navigate to /loadouts/{loadout-id}
    Then I should see both items in "Selected Items" section
    And the budget should show $32.50 spent
    And the items should have "Selected" badges in the browser

  Scenario: Handle concurrent selections (optimistic UI)
    Given I am adding an item to my loadout
    When I click "Add to Loadout"
    Then the UI should update immediately (optimistic)
    And the item should show as "Adding..." state
    When the Server Action completes
    Then the item should show as "Selected"
    And the budget should be confirmed

  Scenario: Handle Server Action errors
    Given the database is unavailable
    When I try to add an item
    Then I should see error "Unable to add item. Please try again."
    And the optimistic UI update should be reverted
    And the item should return to "Add to Loadout" state

  Scenario: Prevent duplicate submissions
    Given I am adding an item
    When I click "Add to Loadout"
    Then the button should be disabled immediately
    And subsequent clicks should be ignored until completion

  # ============================================================================
  # Search Functionality
  # ============================================================================

  Scenario: Search items by name
    Given I am on the loadout detail page
    When I type "Redline" in the search box
    Then I should see items matching "Redline":
      | item                  |
      | AK-47 \| Redline      |
      | M4A4 \| Redline       |
      | AWP \| Redline        |
    And items should be filtered across all weapons

  Scenario: Search autocomplete
    Given I am typing in the search box
    When I type "Asi"
    Then I should see autocomplete suggestions:
      | suggestion        |
      | Asiimov           |
      | Asian Persuasion  |
    And I can select a suggestion to apply the filter

  Scenario: Search with no results
    Given I am on the loadout detail page
    When I search for "NonexistentSkin12345"
    Then I should see message "No items found matching 'NonexistentSkin12345'"
    And I should see a link to "Clear search"

  # ============================================================================
  # Empty States
  # ============================================================================

  Scenario: Empty loadout state
    Given I have not selected any items yet
    When I view the loadout detail page
    Then I should see "No items selected yet"
    And I should see guidance: "Browse items by category to build your loadout"
    And I should see my full budget available

  Scenario: No items match filters
    Given I have applied multiple filters
    And no items match the combination
    When the item browser loads
    Then I should see "No items found matching your filters"
    And I should see a "Clear Filters" button

  Scenario: Category has no budget
    Given my custom allocation has 0% for Charms
    When I click the "Charms" tab
    Then I should see "No budget allocated for Charms"
    And I should see a link to "Edit Allocation"
    And the item browser should be empty

  # ============================================================================
  # Accessibility
  # ============================================================================

  Scenario: Keyboard navigation for item grid
    Given I am viewing the item grid
    When I press Tab repeatedly
    Then focus should move through item cards in order
    And each card should have a visible focus indicator
    When I press Enter on a focused card
    Then the item should be added to the loadout

  Scenario: Screen reader support for budget tracking
    Given I am using a screen reader
    When I add an item to my loadout
    Then the screen reader should announce "AK-47 | Redline added. Remaining budget: $137.50"
    And budget updates should be announced via aria-live region

  Scenario: Screen reader support for filters
    Given I am using a screen reader
    When I apply a filter
    Then the screen reader should announce "Showing 12 AK-47 skins"
    And filter changes should be announced

  # ============================================================================
  # Performance
  # ============================================================================

  Scenario: Page loads quickly
    Given I navigate to /loadouts/{loadout-id}
    Then the page should render within 2 seconds
    And the item grid should load within 3 seconds
    And budget summary should be interactive immediately

  Scenario: Image lazy loading
    Given I am viewing a list of 100 items
    When the page loads
    Then only visible images should load initially
    And images should load as I scroll
    And lazy loading should improve initial page load

  Scenario: Optimistic UI feels instant
    Given I am adding an item
    When I click "Add to Loadout"
    Then the UI should update within 50ms
    And the user should feel instant feedback
    And the Server Action should process in background

  # ============================================================================
  # URL State & Sharing
  # ============================================================================

  Scenario: URL reflects current filters
    Given I am on the loadout detail page
    When I filter by "AK-47" and "Factory New"
    Then the URL should update to ?weapon=AK-47&wear=factory_new
    And I can share this URL with others
    And reloading preserves the filters

  Scenario: Deep linking to category tab
    Given someone shares a link /loadouts/{id}?category=knife
    When I visit that URL
    Then the "Knife" tab should be active
    And knife items should be displayed

  # ============================================================================
  # Edge Cases
  # ============================================================================

  Scenario: Handle item price changes
    Given I have "AK-47 | Redline" selected at $12.50
    When the marketplace price updates to $15.00
    Then my loadout should still show $12.50 (price when selected)
    And I should see a badge "Price changed: now $15.00"

  Scenario: Handle out-of-stock items
    Given an item has quantity_available = 0
    When I browse items
    Then the item should show "Out of Stock"
    And the "Add to Loadout" button should be disabled
    And I should see link to "View on {marketplace}"

  Scenario: Handle items with no pricing data
    Given an item has no MarketplacePrice records
    When I browse items
    Then the item should show "Price unavailable"
    And the item should not be addable to loadout
    And I should see "Check back later for pricing"

  Scenario: Maximum items reached
    Given the loadout has selected items for all weapon types
    When I browse items
    Then I should see message "All weapon slots filled"
    And I can only replace existing selections
    And "Add to Loadout" should change to "Replace Selected"
