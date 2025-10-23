Feature: Professional Item Display with Enhanced Visual Hierarchy
  As a CS2 skin buyer
  I want professional item cards with comprehensive visual information
  So that I can quickly assess item quality, rarity, and pricing like on csgoskins.gg

  Background:
    Given the CS Loadout application is running
    And I am on the homepage with item grid displayed
    And the enhanced navigation (Phase 1) is active

  Scenario: Professional item cards display comprehensive information
    Given I am viewing the item grid
    When I look at any item card
    Then I should see the weapon name prominently displayed
    And I should see the skin name as secondary text
    And I should see a rarity color indicator
    And I should see a wear condition badge if applicable
    And I should see the current best price
    And I should see professional shadows (shadow-lg)
    And I should see proper spacing between cards (gap-4)

  Scenario: Rarity color coding matches CS2 standards
    Given I am viewing items of different rarities
    Then Consumer grade items should have gray accent (#b0c3d9)
    And Industrial grade items should have light blue accent (#5e98d9)
    And Mil-Spec grade items should have blue accent (#4b69ff)
    And Restricted items should have purple accent (#8847ff)
    And Classified items should have pink accent (#d32ce6)
    And Covert items should have red accent (#eb4b4b)
    And Contraband items should have gold accent (#e4ae39)

  Scenario: Wear condition badges display correctly
    Given I am viewing items with different wear conditions
    Then Factory New items should show green badge "FN"
    And Minimal Wear items should show light green badge "MW"
    And Field-Tested items should show yellow badge "FT"
    And Well-Worn items should show orange badge "WW"
    And Battle-Scarred items should show red badge "BS"
    And items without wear should not show badge

  Scenario: Item cards have professional hover effects
    Given I am viewing the item grid
    When I hover over an item card
    Then the card should scale up slightly (scale-105)
    And the shadow should intensify (shadow-xl)
    And the transition should be smooth (200ms)
    And the background should lighten (bg-gray-750)
    And the cursor should indicate clickability

  Scenario: Price badges are prominently displayed
    Given I am viewing items with pricing data
    Then each card should show the lowest price prominently
    And the price should be in large font (text-2xl)
    And the price should use CS Loadout orange color (#FF6B00)
    And the price should be easily scannable
    And items without pricing should show "Checking prices..."

  Scenario: Float values display when available
    Given I am viewing items with float data
    When float values are available
    Then I should see float value badge (e.g., "0.0234")
    And the badge should have purple background (bg-purple-600)
    And the badge should be positioned near wear badge
    And float should be formatted to 4 decimal places

  Scenario: Grid layout is optimized for different screen sizes
    Given I am testing responsive grid layout
    When I view at mobile width (< 640px)
    Then I should see 2 columns (grid-cols-2)
    When I view at tablet width (640px - 768px)
    Then I should see 2 columns (sm:grid-cols-2)
    When I view at desktop width (768px - 1024px)
    Then I should see 3 columns (md:grid-cols-3)
    When I view at large desktop width (1024px - 1280px)
    Then I should see 4 columns (lg:grid-cols-4)
    When I view at xl width (>= 1280px)
    Then I should see 5 columns (xl:grid-cols-5)

  Scenario: Item cards maintain aspect ratio and professional appearance
    Given I am viewing the item grid
    Then all cards should have consistent height
    And cards should have rounded corners (rounded-lg)
    And cards should have dark background (bg-gray-800)
    And cards should have proper padding (p-4)
    And text content should not overflow
    And images should not distort

  Scenario: Selected item is visually distinct
    Given I am viewing the item grid
    When I click on an item card
    Then the selected card should have orange ring (ring-2 ring-csgo-orange)
    And the selected card should have enhanced shadow (shadow-lg)
    And a pulse indicator should appear (animate-pulse)
    And other cards should remain unaffected
    And the price comparison section should update

  Scenario: Pagination controls are professional and functional
    Given I have more than 20 items to display
    Then I should see pagination controls below the grid
    And I should see "Previous" and "Next" buttons
    And I should see page numbers between buttons
    And current page should be highlighted
    And disabled buttons should be visually distinct (opacity-50)
    And pagination should match csgoskins.gg styling

  Scenario: Pagination navigation works correctly
    Given I am on page 1 of items
    When I click "Next" button
    Then I should navigate to page 2
    And the URL should update with page parameter
    And the grid should smoothly transition
    And scroll position should reset to top
    When I click "Previous" button
    Then I should navigate back to page 1
    And the grid should update accordingly

  Scenario: Items per page is configurable
    Given I am viewing the item grid
    Then I should see 20 items per page by default
    And items should be evenly distributed across grid
    And pagination should calculate total pages correctly
    And last page should show remaining items

  Scenario: Loading states are professional
    Given items are being fetched
    Then I should see skeleton loaders for cards
    And skeleton loaders should match card dimensions
    And skeleton loaders should have shimmer animation
    And loading state should not break layout

  Scenario: Empty state is handled gracefully
    Given no items match current filters
    Then I should see professional empty state message
    And I should see suggestion to adjust filters
    And I should see CS Loadout branding
    And pagination should be hidden

  Scenario: Item images load progressively
    Given items have associated images
    Then images should lazy load as user scrolls
    And placeholder background should show while loading
    And broken images should show fallback icon
    And images should not cause layout shift

  # Acceptance Criteria Summary
  # ✅ Professional card design: shadows, spacing, borders, rounded corners
  # ✅ Rarity color coding: 7 CS2 rarity tiers with proper colors
  # ✅ Wear condition badges: 5 wear levels (FN, MW, FT, WW, BS)
  # ✅ Float value display: 4 decimal precision, purple badges
  # ✅ Price badges: prominent display, CS Loadout orange, large font
  # ✅ Hover effects: scale-105, shadow intensification, smooth transitions
  # ✅ Responsive grid: 2→3→4→5 columns across breakpoints
  # ✅ Selection state: orange ring, pulse indicator, visual distinction
  # ✅ Pagination: professional controls, page numbers, proper navigation
  # ✅ Loading states: skeleton loaders, shimmer animations
  # ✅ Empty states: graceful handling with helpful messaging
  # ✅ Image optimization: lazy loading, placeholders, fallback handling
  # ✅ Professional spacing: gap-4, proper padding, consistent heights
  # ✅ Color scheme: matches csgoskins.gg and CS Loadout brand
