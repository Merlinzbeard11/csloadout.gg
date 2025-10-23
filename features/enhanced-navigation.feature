Feature: Enhanced Navigation with Weapon Categories
  As a CS2 skin buyer
  I want professional navigation with weapon category dropdowns
  So that I can quickly browse skins by weapon type like on csgoskins.gg

  Background:
    Given the CS Loadout application is running
    And I am on the homepage

  Scenario: Desktop user sees weapon category dropdowns in navbar
    Given I am viewing the site on a desktop browser (>= 1024px width)
    When I look at the navigation bar
    Then I should see a fixed navbar with dark styling (bg-gray-800, shadow-md)
    And I should see "CS Loadout" logo on the left
    And I should see weapon category buttons: "Pistols", "Rifles", "SMGs", "Heavy", "Equipment"
    And the navbar should have z-index 40 to stay above content

  Scenario: User hovers over weapon category to see dropdown
    Given I am viewing the site on a desktop browser
    When I hover over the "Pistols" category button
    Then I should see a dropdown menu appear below the button
    And the dropdown should have dark gray background (bg-gray-700)
    And the dropdown should show weapon options with icons
    And each weapon option should have an icon (37.5px × 28px)
    And weapon names should be displayed next to icons

  Scenario: User clicks weapon in dropdown to filter items
    Given I am viewing the site on a desktop browser
    And I hover over the "Pistols" category
    When I click on "Desert Eagle" in the dropdown
    Then the dropdown should close
    And the main content should show only Desert Eagle skins
    And the selected category should be highlighted

  Scenario: Dropdown items have hover states
    Given I am viewing the site on a desktop browser
    And the "Rifles" dropdown is open
    When I hover over "AK-47" option
    Then the option background should change to hover color (bg-gray-600)
    And the text should change to white
    And the transition should be smooth

  Scenario: Mobile user sees hamburger menu instead of categories
    Given I am viewing the site on a mobile browser (< 1024px width)
    When I look at the navigation bar
    Then I should see a hamburger menu icon
    And I should NOT see weapon category buttons inline
    And I should see a search icon button
    And I should see a settings icon button

  Scenario: Mobile user opens hamburger menu
    Given I am viewing the site on a mobile browser
    When I tap the hamburger menu icon
    Then a mobile menu should slide open
    And I should see all weapon categories listed vertically
    And each category should be tappable to expand
    And the hamburger icon should change to a close (X) icon

  Scenario: Mobile dropdown expands on tap
    Given I am viewing the site on a mobile browser
    And the mobile menu is open
    When I tap on "SMGs" category
    Then the SMGs weapon list should expand below the category
    And I should see all SMG weapons with icons
    And other categories should remain collapsed

  Scenario: Navbar stays fixed on scroll
    Given I am on the homepage
    When I scroll down the page
    Then the navbar should remain fixed at the top
    And the navbar should stay visible at all times
    And content should scroll behind the navbar

  Scenario: Navigation matches csgoskins.gg styling
    Given I am on the homepage
    Then the navbar background should be #1f2937 (gray-800)
    And the logo text should be CS Loadout orange (#FF6B00)
    And dropdown backgrounds should be #374151 (gray-700)
    And hover states should use #4b5563 (gray-600)
    And all transitions should be smooth (200ms duration)

  Scenario: Responsive breakpoints work correctly
    Given I am testing navigation responsiveness
    When I resize the browser to 640px (sm breakpoint)
    Then padding should adjust to px-4
    And navbar height should adjust
    When I resize to 1024px (lg breakpoint)
    Then category dropdowns should become visible
    And hamburger menu should hide
    When I resize to 1280px (xl breakpoint)
    Then full logo should be visible
    And category spacing should increase

  Scenario: Logo is responsive across breakpoints
    Given I am testing logo responsiveness
    When I view at mobile width (< 1024px)
    Then I should see the full CS Loadout logo
    When I view at large width (1024px - 1280px)
    Then I should see a compact icon-only logo
    When I view at xl width (>= 1280px)
    Then I should see the full CS Loadout logo again

  # Acceptance Criteria Summary
  # ✅ Fixed navbar with z-40, bg-gray-800, shadow-md
  # ✅ Weapon category dropdowns (Pistols, Rifles, SMGs, Heavy, Equipment)
  # ✅ Dropdown styling: bg-gray-700, hover:bg-gray-600
  # ✅ Weapon icons: w-9.5 h-7 (37.5px × 28px)
  # ✅ Mobile responsive: hamburger menu < 1024px, categories >= 1024px
  # ✅ Hover states with smooth transitions (200ms)
  # ✅ Matches csgoskins.gg color scheme and spacing
  # ✅ Responsive logo (compact lg-xl, full <lg and >=xl)
  # ✅ All breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
