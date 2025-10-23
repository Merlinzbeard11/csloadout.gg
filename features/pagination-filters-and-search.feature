Feature: Pagination, Filters, and Advanced Search (Phase 3)
  As a CS2 skin buyer
  I want professional pagination, filtering, and search capabilities
  So that I can efficiently browse large item catalogs and find specific skins

  Background:
    Given the CS Loadout application is running
    And I am on the homepage with item grid displayed
    And Phase 1 (Enhanced Navigation) is complete
    And Phase 2 (Professional Item Display) is complete

  # ============================================================
  # PAGINATION CONTROLS
  # ============================================================

  Scenario: Professional pagination controls display correctly
    Given I have more than 20 items to display
    When I view the item grid
    Then I should see pagination controls below the grid
    And I should see "Previous" button on the left
    And I should see "Next" button on the right
    And I should see page numbers between buttons
    And pagination should use gray-800 background with rounded-lg
    And buttons should have hover effects (hover:bg-gray-700)
    And pagination should be horizontally centered

  Scenario: Current page is visually distinct
    Given I am viewing page 2 of items
    Then page number "2" should have csgo-orange background
    And page number "2" should have white text color
    And page number "2" should have font-bold styling
    And other page numbers should have gray-700 background
    And other page numbers should have gray-300 text color

  Scenario: Previous button behavior
    Given I am on page 3 of items
    When I click the "Previous" button
    Then I should navigate to page 2
    And the item grid should update with page 2 items
    And scroll position should reset to grid top
    And page number "2" should be highlighted

  Scenario: Previous button is disabled on first page
    Given I am on page 1 of items
    Then the "Previous" button should be disabled
    And the "Previous" button should have opacity-50 styling
    And the "Previous" button should have cursor-not-allowed
    And clicking "Previous" should not navigate

  Scenario: Next button behavior
    Given I am on page 1 of items
    And there are multiple pages available
    When I click the "Next" button
    Then I should navigate to page 2
    And the item grid should update with page 2 items
    And scroll position should reset to grid top
    And page number "2" should be highlighted

  Scenario: Next button is disabled on last page
    Given I am on the last page of items
    Then the "Next" button should be disabled
    And the "Next" button should have opacity-50 styling
    And the "Next" button should have cursor-not-allowed
    And clicking "Next" should not navigate

  Scenario: Direct page number navigation
    Given I am on page 1 of items
    And I can see page numbers [1, 2, 3, 4, 5]
    When I click page number "4"
    Then I should navigate directly to page 4
    And the item grid should update with page 4 items
    And page number "4" should be highlighted
    And scroll position should reset to grid top

  Scenario: Page number truncation for many pages
    Given there are more than 7 pages of items
    And I am on page 5
    Then I should see: [1, ..., 4, 5, 6, ..., last]
    And ellipsis should be non-clickable
    And ellipsis should use gray-500 color
    And first and last page should always be visible

  Scenario: Items per page configuration
    Given pagination is configured for 20 items per page
    Then each page should show exactly 20 items
    And the last page should show remaining items (1-20)
    And total pages should be calculated correctly
    And page count should display: "Page X of Y"

  # ============================================================
  # SKELETON LOADERS FOR LOADING STATES
  # ============================================================

  Scenario: Skeleton loaders display during initial page load
    Given I am loading the homepage for the first time
    When items are being fetched from API
    Then I should see 20 skeleton loader cards
    And each skeleton should match ItemCard dimensions exactly
    And skeletons should use gray-800 background
    And skeletons should have shimmer animation
    And skeleton layout should match 2→5 column responsive grid

  Scenario: Skeleton card structure matches real cards
    Given skeleton loaders are displaying
    Then each skeleton should have:
      | Element                  | Styling                                    |
      | Container                | bg-gray-800 rounded-lg p-4                 |
      | Top border placeholder   | h-1 bg-gray-700 rounded-t-lg               |
      | Weapon name placeholder  | h-4 bg-gray-700 rounded w-3/4 mb-2         |
      | Skin name placeholder    | h-3 bg-gray-700 rounded w-full mb-3        |
      | Badge placeholders       | h-5 bg-gray-700 rounded w-12 inline-block  |
      | Price placeholder        | h-8 bg-gray-700 rounded w-1/2 mt-auto      |

  Scenario: Shimmer animation on skeleton loaders
    Given skeleton loaders are displaying
    Then skeletons should have shimmer animation
    And shimmer should move left to right continuously
    And shimmer should use linear-gradient overlay
    And shimmer should use animate-pulse or custom keyframe
    And animation duration should be 1.5-2 seconds

  Scenario: Skeleton loaders replace with real cards smoothly
    Given skeleton loaders are displaying
    When API returns item data successfully
    Then skeletons should fade out (opacity transition)
    And real ItemCards should fade in simultaneously
    And transition should be smooth (300ms duration)
    And no layout shift should occur during transition
    And grid structure should remain consistent

  Scenario: Skeleton loaders during pagination navigation
    Given I am on page 1 with items loaded
    When I click "Next" to go to page 2
    Then skeleton loaders should display immediately
    And current items should fade out
    And skeletons should show while fetching page 2 data
    And real cards should replace skeletons when data arrives
    And transition should be professional and smooth

  # ============================================================
  # ADVANCED SEARCH / FILTER MODAL
  # ============================================================

  Scenario: Advanced Search button is prominently displayed
    Given I am viewing the item grid
    Then I should see "Advanced Search" button above the grid
    And button should use gray-700 background
    And button should have hover effect (hover:bg-gray-600)
    And button should have right arrow icon with group-hover animation
    And button should have shadow-md styling
    And button should be positioned in flex-none px-4 pb-6 container

  Scenario: Advanced Search button hover animation
    Given I am viewing the "Advanced Search" button
    When I hover over the button
    Then the arrow icon should translate 3px to the right
    And arrow path opacity should increase
    And transition should be smooth (150ms ease-in-out)
    And button background should change to gray-600

  Scenario: Filter modal opens on button click
    Given I am viewing the item grid
    When I click "Advanced Search" button
    Then a modal overlay should appear
    And overlay should have dark background (bg-gray-900 opacity-75)
    And overlay should be fixed position (z-50)
    And modal should fade in (opacity transition)
    And modal dialog should display in center
    And body scroll should be disabled

  Scenario: Filter modal structure and styling
    Given the filter modal is open
    Then modal should have these elements:
      | Element           | Styling                                      |
      | Overlay           | fixed inset-0 bg-gray-900 opacity-75 z-50    |
      | Dialog container  | m-auto p-4 z-10                              |
      | Dialog            | bg-gray-800 rounded-sm shadow-md max-w-3xl   |
      | Header            | bg-gray-700 text-white text-lg p-4           |
      | Body              | bg-gray-800 overflow-y-auto custom-scrollbar |
      | Footer            | bg-gray-700 p-4 rounded-b-sm                 |

  Scenario: Filter modal header
    Given the filter modal is open
    Then the header should display "Advanced Search"
    And header should have gray-700 background
    And header should have white text (text-lg)
    And header should have close button (X icon)
    And close button should be on the right
    And close button should have hover effect (text-white)

  Scenario: Filter modal close button functionality
    Given the filter modal is open
    When I click the X close button
    Then the modal should fade out
    And the overlay should disappear
    And body scroll should be re-enabled
    And grid view should be restored
    And no filters should be applied yet

  Scenario: Filter modal overlay click closes modal
    Given the filter modal is open
    When I click on the dark overlay (outside dialog)
    Then the modal should close
    And body scroll should be re-enabled
    And I should return to item grid view

  Scenario: Filter options - Rarity filter
    Given the filter modal is open
    Then I should see "Rarity" filter section
    And I should see checkboxes for all 7 rarity tiers:
      | Rarity       | Color Indicator |
      | Consumer     | #b0c3d9         |
      | Industrial   | #5e98d9         |
      | Mil-Spec     | #4b69ff         |
      | Restricted   | #8847ff         |
      | Classified   | #d32ce6         |
      | Covert       | #eb4b4b         |
      | Contraband   | #e4ae39         |
    And each checkbox should have rarity color indicator
    And multiple rarities should be selectable

  Scenario: Filter options - Wear condition filter
    Given the filter modal is open
    Then I should see "Wear Condition" filter section
    And I should see checkboxes for all 5 wear conditions:
      | Wear Condition  | Badge Color |
      | Factory New     | green-600   |
      | Minimal Wear    | green-500   |
      | Field-Tested    | yellow-500  |
      | Well-Worn       | orange-500  |
      | Battle-Scarred  | red-600     |
    And each checkbox should have color-coded indicator
    And multiple wear conditions should be selectable

  Scenario: Filter options - Price range filter
    Given the filter modal is open
    Then I should see "Price Range" filter section
    And I should see "Min Price" input field
    And I should see "Max Price" input field
    And inputs should accept numeric values only
    And inputs should have $ prefix indicator
    And inputs should have gray-700 background
    And inputs should have focus:ring-2 ring-csgo-orange

  Scenario: Filter options - Float value filter
    Given the filter modal is open
    Then I should see "Float Value" filter section
    And I should see "Min Float" input (0.00 - 1.00)
    And I should see "Max Float" input (0.00 - 1.00)
    And inputs should accept decimal values (4 places)
    And inputs should validate range (0.00 to 1.00)
    And inputs should have gray-700 background

  Scenario: Filter modal footer buttons
    Given the filter modal is open
    Then I should see "Cancel" button on the left
    And I should see "Search" button on the right
    And "Cancel" button should have gray-700 background
    And "Cancel" button should have hover:bg-gray-600
    And "Search" button should have blue-600 background
    And "Search" button should have hover:bg-blue-500
    And "Search" button should have font-bold styling
    And "Search" button should have arrow icon

  Scenario: Applying filters updates item grid
    Given the filter modal is open
    And I select "Covert" rarity
    And I select "Factory New" wear condition
    And I set min price to "100"
    And I set max price to "500"
    When I click "Search" button
    Then the modal should close
    And the item grid should update with filtered results
    And only items matching ALL criteria should display
    And pagination should reset to page 1
    And active filters should be indicated above grid

  Scenario: Active filter indicators
    Given I have applied filters (Covert, Factory New, $100-$500)
    And the modal has closed
    Then I should see filter badges above the grid
    And each active filter should have its own badge
    And badges should display: "Covert", "Factory New", "$100-$500"
    And each badge should have X remove button
    And badges should use gray-700 background
    And badges should have csgo-orange text

  Scenario: Removing individual filters
    Given I have active filter badges displayed
    When I click X on the "Factory New" badge
    Then "Factory New" filter should be removed
    And the item grid should update immediately
    And other filters should remain active
    And pagination should reset to page 1

  Scenario: Clear all filters button
    Given I have multiple active filters
    Then I should see "Clear All Filters" button
    And button should be next to filter badges
    When I click "Clear All Filters"
    Then all filter badges should disappear
    And item grid should show all items (unfiltered)
    And pagination should reset to page 1

  Scenario: Filter modal cancel button behavior
    Given the filter modal is open
    And I have selected multiple filters
    And I have NOT clicked "Search" yet
    When I click "Cancel" button
    Then the modal should close
    And NO filters should be applied
    And the item grid should remain unchanged
    And previous filter state should be preserved

  # ============================================================
  # SORT FUNCTIONALITY
  # ============================================================

  Scenario: Sort dropdown is displayed above grid
    Given I am viewing the item grid
    Then I should see "Sort by:" label
    And I should see sort dropdown next to label
    And dropdown should have gray-800 background
    And dropdown should have border-gray-700 border
    And dropdown should have rounded-lg styling

  Scenario: Sort options are comprehensive
    Given I click the sort dropdown
    Then I should see these sort options:
      | Sort Option          | Description                        |
      | Price: Low to High   | Ascending price order              |
      | Price: High to Low   | Descending price order             |
      | Float: Low to High   | Ascending float value order        |
      | Float: High to Low   | Descending float value order       |
      | Rarity: Common First | Consumer → Contraband              |
      | Rarity: Rare First   | Contraband → Consumer              |
      | Name: A-Z            | Alphabetical ascending             |
      | Name: Z-A            | Alphabetical descending            |

  Scenario: Sort by price (low to high)
    Given I am viewing unsorted items
    When I select "Price: Low to High" from sort dropdown
    Then items should re-order by ascending price
    And cheapest item should appear first
    And most expensive item should appear last
    And pagination should reset to page 1
    And sort selection should persist across page navigation

  Scenario: Sort by float value (low to high)
    Given I am viewing unsorted items with float data
    When I select "Float: Low to High" from sort dropdown
    Then items should re-order by ascending float value
    And lowest float (best condition) should appear first
    And highest float (worst condition) should appear last
    And only items with float data should be sorted
    And items without float should appear at end

  Scenario: Sort by rarity (rare first)
    Given I am viewing mixed rarity items
    When I select "Rarity: Rare First" from sort dropdown
    Then items should order: Contraband → Covert → Classified → Restricted → Mil-Spec → Industrial → Consumer
    And items of same rarity should maintain relative order
    And rarity colors should create visual gradient

  Scenario: Sort persists during filtering
    Given I have sorted items by "Price: Low to High"
    And I have applied a "Covert" rarity filter
    Then filtered items should maintain price sort order
    And cheapest covert item should appear first
    And sort dropdown should still show "Price: Low to High"

  Scenario: Sort indicator in dropdown
    Given I have selected "Price: High to Low"
    Then the sort dropdown should display current selection
    And dropdown button should show "Price: High to Low"
    And when opened, current option should have checkmark
    And current option should have csgo-orange highlight

  # ============================================================
  # EMPTY STATES
  # ============================================================

  Scenario: Empty state when no items match filters
    Given I have applied very restrictive filters
    And no items match the filter criteria
    Then I should see empty state message
    And message should say "No items match your filters"
    And I should see suggestion: "Try adjusting your filters"
    And I should see "Clear All Filters" button
    And CS Loadout branding should be visible
    And pagination should be hidden

  Scenario: Empty state styling
    Given the empty state is displayed
    Then container should have gray-900 background
    And container should have rounded-lg styling
    And container should have border-gray-800 border
    And container should have p-12 padding
    And text should be centered
    And icon or illustration should be displayed
    And text should use gray-400 color

  # ============================================================
  # RESPONSIVE BEHAVIOR
  # ============================================================

  Scenario: Filter modal is responsive on mobile
    Given I am on mobile viewport (< 640px)
    And the filter modal is open
    Then modal should take full viewport width
    And modal should have appropriate padding (p-4)
    And filter sections should stack vertically
    And checkboxes should be easy to tap (min 44px)
    And close button should be prominent

  Scenario: Pagination is responsive on mobile
    Given I am on mobile viewport (< 640px)
    Then pagination controls should stack if needed
    And page numbers should have min 44px tap targets
    And Previous/Next buttons should be full width on very small screens
    And page number list should scroll horizontally if needed
    And current page should always be visible

  Scenario: Sort dropdown is responsive on mobile
    Given I am on mobile viewport (< 640px)
    Then sort dropdown should be full width
    And sort options should be easy to tap
    And dropdown should not overflow viewport
    And selected option should be clearly visible

  # ============================================================
  # PERFORMANCE AND UX
  # ============================================================

  Scenario: Filter application is fast
    Given I have selected multiple filters
    When I click "Search"
    Then results should appear within 200ms
    And skeleton loaders should display during loading
    And no janky animations or layout shifts
    And smooth transition from loading to loaded

  Scenario: Pagination navigation is instant
    Given I am on page 1
    When I click "Next"
    Then page 2 should load within 100ms
    And skeleton loaders should display briefly
    And scroll should smoothly reset to top
    And no flash of unstyled content

  Scenario: URL reflects pagination state
    Given I am on page 3 with filters applied
    Then URL should contain page parameter (?page=3)
    And URL should contain filter parameters
    When I refresh the page
    Then I should remain on page 3 with filters active
    And browser back button should navigate pages correctly

  Scenario: Keyboard navigation support
    Given the filter modal is open
    Then I should be able to tab through all controls
    And Enter key should submit the form
    And Escape key should close the modal
    And focus should trap within modal
    And focus should return to trigger button on close

  # ============================================================
  # ACCEPTANCE CRITERIA SUMMARY
  # ============================================================

  # ✅ PAGINATION:
  #    - Professional controls with Previous/Next and page numbers
  #    - Current page highlighted with csgo-orange
  #    - Disabled states for first/last pages
  #    - Truncation for many pages (ellipsis pattern)
  #    - 20 items per page default
  #    - URL parameter support
  #    - Smooth transitions and scroll reset

  # ✅ SKELETON LOADERS:
  #    - Match ItemCard dimensions exactly
  #    - Shimmer animation (1.5-2s duration)
  #    - Display during initial load and pagination
  #    - Smooth fade in/out transitions
  #    - No layout shift
  #    - Responsive grid (2→5 columns)

  # ✅ FILTER MODAL:
  #    - "Advanced Search" button with hover animation
  #    - Fixed overlay (z-50, dark background)
  #    - Modal dialog (max-w-3xl, gray-800 background)
  #    - Rarity filter (7 tiers with color indicators)
  #    - Wear condition filter (5 levels with colors)
  #    - Price range filter (min/max inputs)
  #    - Float value filter (0.00-1.00 range)
  #    - Cancel and Search buttons
  #    - Close on overlay click or X button
  #    - Active filter badges with remove buttons
  #    - Clear all filters functionality

  # ✅ SORT FUNCTIONALITY:
  #    - Dropdown above grid
  #    - 8 sort options (price, float, rarity, name)
  #    - Persists across pagination
  #    - Works with filters
  #    - Visual indicator of active sort

  # ✅ EMPTY STATES:
  #    - Professional message and styling
  #    - Helpful suggestions
  #    - Clear filters button
  #    - CS Loadout branding

  # ✅ RESPONSIVE:
  #    - Mobile-optimized modal
  #    - Touch-friendly controls (min 44px)
  #    - Responsive pagination
  #    - Full-width sort on mobile

  # ✅ PERFORMANCE:
  #    - Fast filter application (<200ms)
  #    - Instant pagination (<100ms)
  #    - Smooth transitions
  #    - No layout shift
  #    - Keyboard navigation support
