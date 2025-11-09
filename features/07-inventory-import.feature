Feature: Basic Inventory Import
  As a CS2 skin investor
  I want to import my Steam CS2 inventory
  So that I can see the total value across all marketplaces

  Background:
    Given I am authenticated with Steam
    And my Steam inventory is public
    And the Steam inventory API endpoint is "https://steamcommunity.com/inventory/{steamid}/730/2"
    And rate limiting is configured with 5 requests per minute maximum
    And cache TTL is set to 6 hours

  # ============================================================================
  # CORE SCENARIOS: Successful Inventory Import
  # ============================================================================

  Scenario: First-time inventory import shows total value
    Given I have never imported my inventory before
    And my Steam inventory contains 247 CS2 items
    When I click "Import Steam Inventory"
    Then I should see a progress indicator
    And I should see "Fetching inventory from Steam..."
    When the import completes successfully
    Then I should see "Import Complete"
    And I should see "247 items imported"
    And I should see my total inventory value "$2,458.67"
    And I should see "Last synced: Just now"

  Scenario: Display inventory value comparison across platforms
    Given I have imported my inventory
    And my inventory contains an "AK-47 | Redline (Field-Tested)"
    And the item is priced at:
      | Platform  | Price  |
      | CSFloat   | $8.67  |
      | Buff163   | $8.20  |
      | Steam     | $7.20  |
    When I view my inventory
    Then I should see the item listed with:
      | Field           | Value           |
      | Best Platform   | CSFloat         |
      | Best Price      | $8.67           |
      | Steam Price     | $7.20           |
      | Potential Savings | $1.47         |

  Scenario: Show total potential savings across entire inventory
    Given I have imported my inventory with 247 items
    And total value on best platforms is "$2,458.67"
    And total value on Steam Market is "$2,134.50"
    When I view my inventory dashboard
    Then I should see a stat card with:
      | Metric              | Value      |
      | Total Items         | 247        |
      | Total Value         | $2,458.67  |
      | Potential Savings   | $324.17    |
      | vs Steam Market     | +15.2%     |

  # ============================================================================
  # PAGINATION: Large Inventory Support (>2000 items)
  # ============================================================================

  Scenario: Import large inventory with pagination
    Given my Steam inventory contains 4,523 CS2 items
    When I click "Import Steam Inventory"
    Then I should see "Fetching inventory from Steam..."
    And I should see progress "Fetching... 2000/4523 items (44%)"
    When the first page is fetched
    Then the system should use cursor pagination with "start_assetid"
    And the system should wait 2 seconds before fetching the next page
    When all pages are fetched
    Then I should see "4,523 items imported"
    And the total value should be calculated correctly

  Scenario: Resume failed import for large inventory
    Given my Steam inventory contains 4,523 items
    And I started an import that failed after 2,000 items
    When I click "Retry Import"
    Then the system should resume from "last_assetid" cursor
    And I should see "Resuming from 2,000 items..."
    When the import completes
    Then I should see "4,523 items imported"

  # ============================================================================
  # RATE LIMITING: Handle Steam API 429 Errors
  # ============================================================================

  Scenario: Handle rate limit during import
    Given I have triggered 5 inventory requests in the last minute
    When I click "Import Steam Inventory"
    Then I should receive HTTP 429 (Too Many Requests)
    And I should see "Rate limit reached. Please try again in 1 minute."
    And the import button should be disabled for 60 seconds
    And I should see a countdown timer

  Scenario: Exponential backoff on 429 error
    Given the Steam API returns 429 on the first request
    When the system retries the request
    Then it should wait 2 seconds before retry #1
    When the API returns 429 on retry #1
    Then it should wait 4 seconds before retry #2
    When the API returns 429 on retry #2
    Then it should wait 8 seconds before retry #3
    When the API returns 429 on retry #3
    Then it should fail with "Rate limit exceeded, try again later"

  Scenario: Cache prevents redundant API calls
    Given I imported my inventory 3 hours ago
    And the cache TTL is 6 hours
    When I view my inventory
    Then the cached data should be returned immediately
    And no Steam API call should be made
    And I should see "Last synced: 3 hours ago"

  # ============================================================================
  # PRIVACY: Private Inventory Handling
  # ============================================================================

  Scenario: Handle private inventory gracefully
    Given my Steam inventory is set to private
    When I click "Import Steam Inventory"
    Then I should receive HTTP 403 (Forbidden)
    And I should see "⚠️ Inventory is Private"
    And I should see "We can't import your inventory because it's set to private in Steam."
    And I should see instructions:
      """
      To enable import:
      1. Go to Steam → Profile → Edit Profile → Privacy Settings
      2. Set "Inventory" to "Public"
      3. Come back and click "Refresh Inventory"
      """
    And I should see a link to "Open Steam Privacy Settings"

  Scenario: Minimal-friction workflow with direct Steam link
    Given my Steam inventory is set to private
    When I click "Import Steam Inventory"
    Then I should see a streamlined privacy modal with:
      | Element                    | Value                                                         |
      | Heading                    | "Your Inventory is Private"                                  |
      | Message                    | "We need permission to view your inventory."                 |
      | Primary CTA                | "Open Steam Privacy Settings" (large, prominent button)      |
      | Quick Instructions         | "Click the button → Set Inventory to Public → Come back"    |
      | Secondary CTA              | "I've Changed It - Retry Import"                             |
    And clicking "Open Steam Privacy Settings" should:
      | Action                     | Result                                                        |
      | Detect Steam Client        | Use steam://url/SteamIDEditPage if client detected          |
      | Fallback to Browser        | Use https://steamcommunity.com/my/edit/settings if no client |
      | Open in New Tab            | User can keep csloadout.gg open                              |
      | Land on Privacy Tab        | User sees Inventory setting immediately (no extra clicks)    |
    And the user flow should be:
      | Step | Action                                    | Clicks Required |
      | 1    | User clicks "Open Steam Privacy Settings"| 1               |
      | 2    | Steam opens directly to Privacy Settings | 0 (automatic)   |
      | 3    | User changes Inventory to "Public"       | 2 (dropdown + save) |
      | 4    | User returns to csloadout.gg             | 1 (switch tab)  |
      | 5    | User clicks "Retry Import"               | 1               |
    And the total clicks should be 5 (minimal friction)

  Scenario: Interactive workflow to change Steam privacy settings
    Given my Steam inventory is set to private
    When I click "Import Steam Inventory"
    Then I should see a privacy workflow modal with:
      | Element                    | Description                                          |
      | Heading                    | "Your Steam Inventory is Private"                    |
      | Icon                       | ⚠️ Warning icon                                      |
      | Problem Description        | Clear explanation of why import failed               |
      | Step-by-step Instructions  | Numbered visual guide with screenshots               |
      | Primary CTA Button         | "Open Steam Settings" (external link)               |
      | Secondary CTA Button       | "I've Changed My Settings - Retry Import"           |
      | Help Link                  | "Why is my inventory private?"                       |
    And the step-by-step instructions should include:
      | Step | Instruction                                                   | Visual Aid           |
      | 1    | Click your Steam username in the top-right corner           | Screenshot with arrow |
      | 2    | Select "Profile" from the dropdown menu                      | Screenshot with arrow |
      | 3    | Click "Edit Profile" button on your profile page            | Screenshot with arrow |
      | 4    | Go to "Privacy Settings" tab                                 | Screenshot with arrow |
      | 5    | Find "Inventory" setting and change to "Public"              | Screenshot with highlight |
      | 6    | Click "Save Changes" at the bottom                           | Screenshot with arrow |
      | 7    | Return to csloadout.gg and click "Retry Import"              | -                    |
    And the "Open Steam Settings" button should:
      | Behavior                              | Value                                                |
      | Primary Link (Browser)                | https://steamcommunity.com/my/edit/settings         |
      | Fallback Deep Link (Steam Client)     | steam://url/SteamIDEditPage                         |
      | Target                                | _blank (new tab)                                     |
      | Icon                                  | External link icon                                   |
      | Smart Detection                       | Detect if Steam client installed, use deep link     |
      | Tracking                              | Log event "privacy_settings_opened"                 |
    And the "Retry Import" button should:
      | Behavior                              | Value                                                |
      | Action                                | Re-trigger inventory sync API call                  |
      | State Management                      | Show loading spinner during retry                    |
      | Success Behavior                      | Close modal, show success message, display inventory |
      | Failure Behavior                      | Keep modal open, update message with current status  |

  Scenario: Provide help documentation for privacy concerns
    Given I am viewing the privacy workflow modal
    When I click "Why is my inventory private?"
    Then I should see an expandable help section with:
      | Topic                          | Content                                                          |
      | Default Steam Privacy          | "Steam sets inventories to private by default for new accounts" |
      | Security Benefits              | "Private inventories prevent scammers from targeting you"       |
      | csloadout.gg Data Access       | "We only read public data - we never access private items"      |
      | What We Can See                | "Item names, quantities, wear values - same as Steam Community" |
      | What We Can't See              | "Nothing when private - Steam blocks all access"                |
      | Data Security                  | "We encrypt all data and never share with third parties"        |
    And I should see a reassurance statement:
      """
      Making your inventory public is safe. Millions of Steam users have public inventories.
      You can change it back to private anytime in Steam settings.
      """

  Scenario: Detect inventory privacy change
    Given my inventory was previously public and imported
    And I have now set my inventory to private
    When I click "Refresh Inventory"
    Then the sync status should be updated to "private"
    And I should see the privacy warning
    And my old cached inventory data should still be visible
    And I should see "Last synced: 2 days ago (inventory now private)"

  # ============================================================================
  # ERROR HANDLING: Item Matching Failures
  # ============================================================================

  Scenario: Handle items not found in database
    Given my Steam inventory contains 250 items
    And 3 items cannot be matched to the csloadout.gg database:
      | Steam Item Name                    | Reason                 |
      | Souvenir MP7 Sand Dune            | Not in item database   |
      | Operation Riptide Coin (Gold)     | Non-skin item excluded |
      | Music Kit Beta                    | Non-skin item excluded |
    When I import my inventory
    Then I should see "247 items imported successfully"
    And I should see "⚠️ 3 items had issues"
    And I should be able to click "Show Details"
    And I should see a table with:
      | Item                              | Issue                     | Suggested Fix                |
      | Souvenir MP7 Sand Dune           | Not in item database      | Skip or contact support      |
      | Operation Riptide Coin (Gold)    | Non-skin item excluded    | Automatically skipped        |
      | Music Kit Beta                   | Non-skin item excluded    | Automatically skipped        |
    And I should be able to download an error report as CSV

  Scenario: Handle missing price data gracefully
    Given my Steam inventory contains an "AWP | Safari Mesh (Battle-Scarred)"
    And no marketplace has price data for this item
    When I import my inventory
    Then the item should be imported with "$0.00" value
    And I should see a warning "Price data unavailable"
    And I should see "Item will be imported with $0 value"

  # ============================================================================
  # ITEM ATTRIBUTES: Float Values, Stickers, Name Tags
  # ============================================================================

  Scenario: Extract float value from Steam API response
    Given my Steam inventory contains an "AK-47 | Redline (Field-Tested)"
    And the Steam API returns float_value "0.234567"
    When I import my inventory
    Then the item should be stored with float_value "0.234567"
    And I should see "Float: 0.234567" in the item details

  Scenario: Display applied stickers on item
    Given my Steam inventory contains an "AK-47 | Redline"
    And the item has 4 applied stickers:
      | Sticker Name        | Position |
      | Natus Vincere (Holo) | 1        |
      | FaZe Clan (Holo)     | 2        |
      | G2 Esports           | 3        |
      | Virtus.pro           | 4        |
    When I import my inventory
    Then I should see the item with all 4 stickers displayed
    And stickers should be visible in the item card

  Scenario: Handle custom name tags correctly
    Given my Steam inventory contains an "AK-47 | Redline (Field-Tested)"
    And the item has a custom name tag "My Custom Name"
    When I import my inventory
    Then the item should be matched using "market_hash_name"
    And NOT using the custom display name
    And the custom name should be stored in "custom_name" field
    And I should see "Custom Name: My Custom Name" in item details

  # ============================================================================
  # TRADE RESTRICTIONS: Trade-Locked Items
  # ============================================================================

  Scenario: Display trade-locked items with hold date
    Given my Steam inventory contains an "M4A4 | Howl (Factory New)"
    And the item is trade-locked until "2025-11-15"
    When I import my inventory
    Then the item should show "can_trade: false"
    And I should see "🔒 Tradeable in 7 days"
    And the item should still show current value
    And I should see "Cannot sell until Nov 15, 2025"

  # ============================================================================
  # REFRESH: Manual and Auto-Refresh
  # ============================================================================

  Scenario: Manual refresh when cache is stale
    Given I imported my inventory 7 hours ago
    And the cache TTL is 6 hours (cache is stale)
    When I view my inventory
    Then I should see "Last synced: 7 hours ago"
    And I should see a "🔄 Refresh Now" button
    When I click "Refresh Now"
    Then the inventory should be re-imported from Steam
    And I should see updated values
    And "Last synced" should show "Just now"

  Scenario: Background refresh for stale data
    Given I imported my inventory 8 hours ago (stale)
    When I view my inventory
    Then I should see the cached data immediately
    And a background refresh should be triggered automatically
    And I should see "Refreshing in background..."
    When the background refresh completes
    Then the UI should update with new values
    And I should see "Updated: Just now"

  Scenario: Daily auto-refresh for active users
    Given I am an active user (logged in within last 7 days)
    And my inventory was last synced 25 hours ago
    When the daily background job runs at 2:00 AM
    Then my inventory should be refreshed automatically
    And the job should add a 5-second delay between users
    And no notification should be sent to me

  # ============================================================================
  # GDPR COMPLIANCE: User Data Rights
  # ============================================================================

  Scenario: Request consent before first import
    Given I have never imported my inventory before
    When I click "Import Steam Inventory"
    Then I should see a privacy policy consent screen
    And I should see "We will import your inventory data from Steam API"
    And I should see what data is collected:
      | Data Field        | Purpose                          |
      | Asset ID          | Identify unique items            |
      | Market Hash Name  | Match items to our database      |
      | Float Value       | Calculate collector value        |
      | Trade Status      | Show trade restrictions          |
    And I should be able to accept or decline
    When I click "Accept and Import"
    Then my consent should be recorded with timestamp
    And an audit log entry should be created

  Scenario: Export inventory data (GDPR Article 15)
    Given I have imported my inventory
    When I request to export my data
    Then I should receive a JSON file with:
      | Data                | Format                 |
      | Inventory metadata  | JSON                   |
      | All inventory items | JSON array             |
      | Pricing data        | JSON per item          |
      | Sync history        | JSON timestamps        |
    And the file should be named "inventory-export-{timestamp}.json"

  Scenario: Delete inventory data (GDPR Article 17 - Right to be Forgotten)
    Given I have imported my inventory
    When I request to delete my inventory data
    Then all inventory records should be deleted (cascade)
    And an audit log entry should record the deletion
    And I should see "Inventory data deleted successfully"
    And the deletion should be permanent

  Scenario: Auto-delete stale inventories (90-day retention)
    Given a user last logged in 95 days ago
    And their inventory was last synced 95 days ago
    When the cleanup job runs
    Then their inventory data should be automatically deleted
    And an audit log should record the auto-deletion
    And the reason should be "90-day retention policy"

  # ============================================================================
  # PERFORMANCE: Response Times
  # ============================================================================

  Scenario: Small inventory imports in under 10 seconds
    Given my Steam inventory contains 150 items
    When I click "Import Steam Inventory"
    Then the import should complete in under 10 seconds
    And all 150 items should be priced
    And the total value should be displayed

  Scenario: Large inventory provides progress feedback
    Given my Steam inventory contains 3,200 items
    When I click "Import Steam Inventory"
    Then I should see phase-based progress:
      | Phase      | Status       | Progress         |
      | Fetching   | Completed    | 3200/3200 (100%) |
      | Matching   | In Progress  | 1856/3200 (58%)  |
      | Pricing    | Pending      | -                |
      | Saving     | Pending      | -                |
    And each phase should show current/total counts
    And estimated time remaining should be displayed

  # ============================================================================
  # SECURITY: Data Encryption and Access Control
  # ============================================================================

  Scenario: Encrypt inventory data at rest
    Given I have imported my inventory
    Then all inventory data should be encrypted in the database
    And encryption should use TLS 1.3 for data in transit
    And database fields should be encrypted at rest

  Scenario: Enforce user ownership - cannot view other user's inventory
    Given User A has imported their inventory
    And User B is authenticated
    When User B tries to access User A's inventory
    Then User B should receive HTTP 403 (Forbidden)
    And an audit log should record the unauthorized access attempt

  # ============================================================================
  # MULTI-ACCOUNT: Bulk Trader Support (Future Phase)
  # ============================================================================

  Scenario: Identify need for multi-account support
    Given I am a bulk trader
    And I have 3 Steam accounts
    When I try to import inventory from second account
    Then I should see "Multi-account support coming in Phase 2"
    And I should see "Track multiple inventories with Premium plan"
