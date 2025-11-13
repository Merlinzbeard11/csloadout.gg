Feature: Global Navigation
  As a user browsing csloadout.gg
  I want a consistent navigation header on every page
  So that I can easily navigate between different sections of the site

  Background:
    Given the application is running
    And I am on any page of the site

  Scenario: Navigation header is visible on all pages
    When I view any page
    Then I should see a header with the site logo "csloadout.gg"
    And the header should be sticky at the top of the page
    And the header should have a CS2-themed dark background

  Scenario: Desktop navigation menu displays all main sections
    Given I am viewing the site on a desktop device
    When I look at the navigation header
    Then I should see the following navigation links in order:
      | Link Text      | Target Route |
      | Browse Items   | /items       |
      | Collections    | /collections |
      | Loadouts       | /loadouts    |
      | Inventory      | /inventory   |
    And each link should be clearly visible and clickable

  Scenario: Active page is highlighted in navigation
    Given I am on the "/items" page
    When I look at the navigation menu
    Then the "Browse Items" link should be visually highlighted
    And other navigation links should not be highlighted

  Scenario: Navigation links route correctly
    Given I am on the home page
    When I click the "Browse Items" navigation link
    Then I should be navigated to "/items"
    And the page should load without errors

  Scenario: Mobile navigation displays hamburger menu
    Given I am viewing the site on a mobile device
    When I look at the navigation header
    Then I should see a hamburger menu icon
    And the desktop navigation links should be hidden

  Scenario: Mobile menu opens and displays navigation options
    Given I am viewing the site on a mobile device
    And the mobile menu is closed
    When I tap the hamburger menu icon
    Then a dropdown menu should open
    And I should see all navigation links:
      | Browse Items   |
      | Collections    |
      | Loadouts       |
      | Inventory      |

  Scenario: Mobile menu closes after selecting an option
    Given I am viewing the site on a mobile device
    And the mobile menu is open
    When I tap any navigation link
    Then the mobile menu should close
    And I should be navigated to the selected page

  Scenario: Logo links to home page
    Given I am on any page except the home page
    When I click the site logo
    Then I should be navigated to the home page "/"

  Scenario: Navigation header includes user account access
    When I look at the navigation header
    Then I should see a user account icon
    And the icon should be positioned on the right side of the header

  Scenario: Navigation header includes search functionality
    When I look at the navigation header
    Then I should see a search icon
    And the search icon should be positioned near the user account icon

  Scenario: Navigation respects CS2 theme colors
    When I view the navigation header
    Then the header background should use "cs2-dark" theme color
    And the logo "csloadout.gg" should have ".gg" in "cs2-orange" color
    And navigation links should be "cs2-light" color
    And hover states should use "cs2-blue" color
    And borders should use "cs2-blue/20" with transparency
