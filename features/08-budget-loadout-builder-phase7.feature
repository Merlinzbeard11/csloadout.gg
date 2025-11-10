# Feature 08 - Budget Loadout Builder (Phase 7: Public Sharing & Social Features)
# Status: In Progress
# Priority: P0 (Must Ship for Phase 1)

Feature: Public Loadout Sharing and Social Engagement
  As a user
  I want to share my budget loadouts publicly and engage with other users' loadouts
  So that I can showcase my creativity and discover popular loadout combinations

  Background:
    Given I am authenticated with valid session
    And I have created a loadout with:
      | field               | value                |
      | name                | Red Dragon Theme     |
      | budget              | 150.00               |
      | is_public           | false                |
      | slug                | null                 |
    And the loadout has selected items worth $145.00

  # ============================================================================
  # Phase 7a: Publish Toggle (Make Loadout Public/Private)
  # ============================================================================

  Scenario: Make loadout public with slug generation
    Given I am on my loadout detail page at /loadouts/{loadout-id}
    And the loadout is currently private
    When I click the "Make Public" toggle
    Then the loadout should be updated with:
      | field      | value              |
      | is_public  | true               |
      | slug       | red-dragon-theme   |
    And I should see message "Loadout is now public"
    And I should see the public URL "csloadout.gg/loadouts/red-dragon-theme"
    And I should see a "Copy URL" button

  Scenario: Generate unique slug from loadout name
    Given my loadout is named "Red Dragon Theme"
    When I make the loadout public
    Then the slug should be "red-dragon-theme"
    And the slug should be URL-safe (lowercase, hyphens, no special chars)
    And the slug should be stored in the database

  Scenario: Handle duplicate slugs with numeric suffix
    Given a public loadout already exists with slug "red-dragon-theme"
    And I have a loadout named "Red Dragon Theme"
    When I make my loadout public
    Then my loadout slug should be "red-dragon-theme-2"
    And the slug should be unique in the database

  Scenario: Make public loadout private again
    Given my loadout is public with slug "red-dragon-theme"
    When I click the "Make Private" toggle
    Then the loadout should be updated with:
      | field      | value |
      | is_public  | false |
    And I should see message "Loadout is now private"
    And the public URL should no longer be accessible
    And the slug should be preserved (not deleted)

  Scenario: Only loadout owner can toggle publish status
    Given I am viewing someone else's public loadout
    When I try to access the publish toggle
    Then I should not see the "Make Public" or "Make Private" toggle
    And only the owner should see publish controls

  # ============================================================================
  # Phase 7b: Public Viewing by Slug
  # ============================================================================

  Scenario: View public loadout by slug (unauthenticated user)
    Given a public loadout exists with slug "red-dragon-theme"
    And I am NOT authenticated
    When I navigate to /loadouts/red-dragon-theme
    Then I should see the loadout details:
      | field           | value            |
      | name            | Red Dragon Theme |
      | budget          | $150.00          |
      | spent           | $145.00          |
    And I should see all selected items with images and prices
    And I should NOT see edit controls (Add to Loadout, Remove, etc.)
    And I should see "View Only" badge

  Scenario: View public loadout by slug (authenticated user)
    Given a public loadout exists with slug "red-dragon-theme"
    And I am authenticated
    When I navigate to /loadouts/red-dragon-theme
    Then I should see the loadout in read-only mode
    And I should see an "Upvote" button
    And I should see view count
    And I should NOT see edit controls (unless I'm the owner)

  Scenario: Owner views their own public loadout by slug
    Given I own a public loadout with slug "red-dragon-theme"
    When I navigate to /loadouts/red-dragon-theme
    Then I should see the full loadout detail page with edit controls
    And I should see the "Make Private" toggle
    And I should see analytics (view count, upvotes)

  Scenario: Private loadout not accessible by slug
    Given a private loadout exists with slug "red-dragon-theme"
    And I am NOT the owner
    When I try to navigate to /loadouts/red-dragon-theme
    Then I should see "404 - Loadout Not Found"
    And the private loadout should not be revealed

  Scenario: Slug not found returns 404
    When I navigate to /loadouts/nonexistent-slug-12345
    Then I should see "404 - Loadout Not Found"
    And I should see a link to "Browse Public Loadouts"

  # ============================================================================
  # Phase 7c: Public Loadout Gallery
  # ============================================================================

  Scenario: Browse public loadouts gallery
    Given there are 50 public loadouts in the database
    When I navigate to /loadouts
    Then I should see a grid of public loadout cards
    And each card should show:
      | field       | example              |
      | name        | Red Dragon Theme     |
      | theme       | Red Dragon           |
      | budget      | $150                 |
      | upvotes     | 42                   |
      | views       | 1,203                |
      | thumbnail   | First weapon image   |
    And loadouts should be sorted by upvotes DESC by default

  Scenario: Filter public loadouts by budget range
    Given I am on the public loadouts gallery
    When I set budget filter to $100-$200
    Then only loadouts with budgets between $100-$200 should be displayed
    When I set budget filter to "Under $50"
    Then only loadouts under $50 should be displayed

  Scenario: Filter public loadouts by theme
    Given I am on the public loadouts gallery
    When I select "Red Dragon" theme filter
    Then only loadouts with "Red Dragon" theme should be displayed
    When I select "All Themes"
    Then all public loadouts should be displayed

  Scenario: Sort public loadouts by different criteria
    Given I am viewing the public loadouts gallery
    When I select "Most Upvoted" sort
    Then loadouts should be ordered by upvotes DESC
    When I select "Most Viewed" sort
    Then loadouts should be ordered by views DESC
    When I select "Recently Published" sort
    Then loadouts should be ordered by created_at DESC
    When I select "Budget: Low to High" sort
    Then loadouts should be ordered by budget ASC

  Scenario: Paginate public loadouts gallery
    Given there are 100 public loadouts
    When I navigate to /loadouts
    Then I should see 20 loadouts per page
    And I should see pagination controls
    When I click "Next Page"
    Then I should see page 2 with the next 20 loadouts

  # ============================================================================
  # Phase 7d: Upvote Functionality
  # ============================================================================

  Scenario: Upvote a public loadout
    Given I am authenticated
    And I am viewing a public loadout with slug "red-dragon-theme"
    And the loadout has 42 upvotes
    And I have NOT upvoted this loadout yet
    When I click the "Upvote" button
    Then the upvote count should increase to 43
    And the button should change to "Upvoted" state with filled icon
    And a LoadoutUpvote record should be created with:
      | loadout_id | {loadout-id} |
      | user_id    | {my-user-id} |

  Scenario: Remove upvote from loadout
    Given I am authenticated
    And I have previously upvoted a public loadout
    And the loadout has 43 upvotes
    When I click the "Upvoted" button to remove my upvote
    Then the upvote count should decrease to 42
    And the button should change to "Upvote" state with outline icon
    And the LoadoutUpvote record should be deleted

  Scenario: Cannot upvote own loadout
    Given I am authenticated
    And I am viewing my own public loadout
    When I try to upvote my own loadout
    Then the upvote button should be disabled
    And I should see tooltip "You cannot upvote your own loadout"

  Scenario: Must be authenticated to upvote
    Given I am NOT authenticated
    And I am viewing a public loadout
    When I click the "Upvote" button
    Then I should be redirected to sign in page
    And after signing in, I should return to the loadout page

  Scenario: Prevent duplicate upvotes (database constraint)
    Given I have already upvoted a loadout
    When I try to upvote the same loadout again via API manipulation
    Then the database should reject the duplicate upvote
    And the upvote count should remain unchanged

  # ============================================================================
  # Phase 7e: View Analytics (IP-based Tracking)
  # ============================================================================

  Scenario: Track unique view with IP-based deduplication
    Given a public loadout exists with slug "red-dragon-theme"
    And the loadout has 100 views
    And I have NOT viewed this loadout in the last 24 hours
    When I navigate to /loadouts/red-dragon-theme
    Then the view count should increment to 101
    And a LoadoutView record should be created with:
      | loadout_id     | {loadout-id}           |
      | viewer_ip_hash | {sha256-hashed-ip}     |
      | viewed_at      | {current-timestamp}    |

  Scenario: Prevent duplicate views within 24-hour window
    Given I viewed a public loadout 2 hours ago
    And the loadout has 101 views
    When I navigate to the same loadout again
    Then the view count should remain at 101
    And no new LoadoutView record should be created
    And my previous view timestamp should be checked

  Scenario: Allow new view after 24 hours
    Given I viewed a public loadout 25 hours ago
    And the loadout has 101 views
    When I navigate to the same loadout again
    Then the view count should increment to 102
    And a new LoadoutView record should be created

  Scenario: Owner views do not count toward view analytics
    Given I own a public loadout with 100 views
    When I navigate to my own loadout by slug
    Then the view count should remain at 100
    And no LoadoutView record should be created for owner views

  Scenario: GDPR compliance - IP addresses are hashed
    Given I am viewing a public loadout
    When the view is tracked
    Then my IP address should be hashed with SHA-256
    And the original IP should NOT be stored in the database
    And the hash should use a secure salt from environment variables

  # ============================================================================
  # Phase 7f: SEO Metadata (OpenGraph Tags)
  # ============================================================================

  Scenario: Public loadout has SEO metadata
    Given a public loadout exists with:
      | name   | Red Dragon Theme |
      | theme  | Red Dragon       |
      | budget | 150.00           |
      | slug   | red-dragon-theme |
    When a search engine or social media crawler fetches /loadouts/red-dragon-theme
    Then the page should include OpenGraph meta tags:
      | tag              | value                                         |
      | og:title         | Red Dragon Theme - CSLoadout.gg               |
      | og:description   | Complete Red Dragon-themed CS2 loadout for $150 |
      | og:url           | https://csloadout.gg/loadouts/red-dragon-theme |
      | og:type          | website                                       |
      | og:image         | {default-og-image-url}                        |
    And the page should include robots meta tag: "index, follow"

  Scenario: Private loadout excludes SEO indexing
    Given a private loadout exists
    When a search engine crawler fetches /loadouts/{loadout-id}
    Then the page should include robots meta tag: "noindex, nofollow"
    And OpenGraph tags should NOT be included
    And the loadout should not appear in search engine results

  Scenario: Generate SEO-friendly description from loadout data
    Given a public loadout has:
      | name        | Budget AWP Beast      |
      | theme       | null                  |
      | budget      | 75.00                 |
      | weapon_count| 8                     |
    When SEO metadata is generated
    Then the description should be "Complete CS2 loadout for $75 with 8 weapons"
    And the description should be concise and keyword-rich

  # ============================================================================
  # Phase 7g: Share Buttons (Twitter, Copy URL)
  # ============================================================================

  Scenario: Share loadout on Twitter
    Given I am viewing a public loadout with:
      | name   | Red Dragon Theme |
      | theme  | Red Dragon       |
      | budget | 150              |
      | slug   | red-dragon-theme |
    When I click the "Share on Twitter" button
    Then a Twitter intent window should open with pre-filled text:
      "Check out my Red Dragon Theme CS2 loadout! Complete Red Dragon theme for $150 https://csloadout.gg/loadouts/red-dragon-theme"
    And the tweet should include the public loadout URL

  Scenario: Copy share URL to clipboard
    Given I am viewing a public loadout with slug "red-dragon-theme"
    When I click the "Copy URL" button
    Then the URL "https://csloadout.gg/loadouts/red-dragon-theme" should be copied to clipboard
    And I should see confirmation message "URL copied to clipboard!"
    And the confirmation should disappear after 3 seconds

  Scenario: Clipboard API fallback for older browsers
    Given I am using a browser without Clipboard API support
    When I click the "Copy URL" button
    Then the URL should be copied using execCommand fallback
    And I should see the same confirmation message

  Scenario: Share buttons only visible on public loadouts
    Given I am viewing my own private loadout
    When I check for share buttons
    Then I should NOT see "Share on Twitter" or "Copy URL" buttons
    And share functionality should only be available for public loadouts

  # ============================================================================
  # Phase 7h: Error Handling
  # ============================================================================

  Scenario: Handle loadout not found gracefully
    When I navigate to /loadouts/nonexistent-slug
    Then I should see "404 - Loadout Not Found" page
    And I should see helpful message "This loadout may have been deleted or made private"
    And I should see a link to "Browse Public Loadouts"
    And I should see a search box to find other loadouts

  Scenario: Handle unauthorized access to private loadout
    Given a private loadout exists with ID "{loadout-id}"
    And I am NOT the owner
    When I try to navigate to /loadouts/{loadout-id}
    Then I should see "403 - Unauthorized" page
    And I should see message "You do not have permission to view this loadout"
    And the loadout details should NOT be revealed

  Scenario: Handle upvote action errors
    Given I am authenticated
    And I am viewing a public loadout
    And the database is temporarily unavailable
    When I click the "Upvote" button
    Then I should see error message "Unable to upvote. Please try again."
    And the upvote count should NOT change
    And the button should return to original state

  Scenario: Handle view tracking failures gracefully
    Given the database is temporarily unavailable
    When I view a public loadout
    Then the loadout should still render successfully
    And view tracking should fail silently
    And the user experience should not be affected

  # ============================================================================
  # Phase 7i: Performance & Caching
  # ============================================================================

  Scenario: Cache public loadout data for performance
    Given a public loadout with slug "red-dragon-theme" is frequently accessed
    When the loadout is requested
    Then the loadout data should be cached for 5 minutes
    And subsequent requests should serve from cache
    And cache should be invalidated when loadout is updated

  Scenario: Revalidate cache on loadout updates
    Given a public loadout is cached
    When the owner updates the loadout (adds/removes items)
    Then the cache should be invalidated immediately
    And the next request should fetch fresh data
    And the new data should be re-cached

  Scenario: Separate cache for public vs private loadouts
    Given a loadout exists with both private (by ID) and public (by slug) routes
    When the loadout is made public
    Then the public route cache should be separate from private route cache
    And making the loadout private should clear the public route cache
