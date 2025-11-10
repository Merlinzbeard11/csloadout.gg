# Feature 09 - Price Alerts (Phase 1: Alert Creation and Basic Notifications)
# Status: In Progress
# Priority: P1 (Post-MVP)

Feature: Basic Price Alert System
  As a user
  I want to set price alerts for specific items
  So that I get notified when prices drop to my target

  Background:
    Given I am authenticated with valid session
    And the following items exist in the database:
      | id   | name                          | current_lowest_price |
      | i001 | AK-47 Redline (Field-Tested)  | 10.50               |
      | i002 | AWP Atheris (Minimal Wear)    | 5.25                |
      | i003 | M4A4 Desolate Space (FT)      | 8.75                |

  # ============================================================================
  # Phase 1a: Create Price Alert
  # ============================================================================

  Scenario: Create price alert with email notification
    Given I am viewing item "AK-47 Redline (Field-Tested)"
    And the current lowest price is $10.50
    When I click "Set Price Alert"
    And I enter target price "$8.00"
    And I select notification method "Email"
    And I click "Create Alert"
    Then a price alert should be created with:
      | field         | value                        |
      | user_id       | {my-user-id}                 |
      | item_id       | i001                         |
      | target_price  | 8.00                         |
      | notify_email  | true                         |
      | notify_push   | false                        |
      | is_active     | true                         |
    And I should see confirmation "Price alert created successfully"
    And I should see "You'll be notified when price drops to $8.00"

  Scenario: Create price alert with push notification
    Given I am viewing item "AWP Atheris (Minimal Wear)"
    And I have enabled browser push notifications
    When I set price alert for "$4.00" with push notifications
    Then a price alert should be created with notify_push = true
    And I should see "Push notifications enabled for this alert"

  Scenario: Create price alert with multiple notification channels
    Given I am viewing item "M4A4 Desolate Space (FT)"
    When I set price alert for "$7.00"
    And I select notification methods:
      | method |
      | Email  |
      | Push   |
    Then notify_email should be true
    And notify_push should be true

  # ============================================================================
  # Phase 1b: Validation Rules
  # ============================================================================

  Scenario: Reject invalid target price (negative)
    Given I am creating a price alert
    When I enter target price "-5.00"
    And I click "Create Alert"
    Then I should see error "Target price must be greater than $0"
    And no alert should be created

  Scenario: Reject invalid target price (zero)
    Given I am creating a price alert
    When I enter target price "0"
    Then I should see error "Target price must be greater than $0"

  Scenario: Reject target price above current price
    Given item "AK-47 Redline" has current price $10.50
    When I set target price "$15.00"
    Then I should see warning "Target price is above current price ($10.50)"
    And I should see "Alert will trigger immediately if price increases"
    But the alert should still be created if I confirm

  Scenario: Validate at least one notification method selected
    Given I am creating a price alert
    When I deselect all notification methods
    And I click "Create Alert"
    Then I should see error "Select at least one notification method"

  # ============================================================================
  # Phase 1c: Duplicate Prevention
  # ============================================================================

  Scenario: Prevent duplicate active alerts for same item
    Given I have an active alert for item "AK-47 Redline" at $8.00
    When I try to create another alert for "AK-47 Redline"
    Then I should see error "You already have an active alert for this item"
    And I should see link "Manage existing alert"

  Scenario: Allow new alert if previous alert is inactive
    Given I had an alert for "AK-47 Redline" that is now inactive
    When I create a new alert for "AK-47 Redline" at $7.50
    Then the new alert should be created successfully
    And the old inactive alert should remain in database

  # ============================================================================
  # Phase 1d: Alert Triggering Logic
  # ============================================================================

  Scenario: Alert triggers when price drops below target
    Given I have an active alert:
      | item           | AK-47 Redline |
      | target_price   | 8.00          |
      | current_price  | 10.50         |
    When the price checker runs
    And the lowest price updates to $7.95
    Then the alert should trigger
    And triggered_count should increment by 1
    And last_triggered_at should be updated to current time

  Scenario: Alert does not trigger when price above target
    Given I have an active alert with target $8.00
    And current price is $10.50
    When the price checker runs
    And price remains at $10.50
    Then the alert should NOT trigger
    And triggered_count should remain 0

  Scenario: Alert triggers at exact target price
    Given I have an active alert with target $8.00
    When price updates to exactly $8.00
    Then the alert should trigger
    And I should receive notification

  Scenario: Prevent duplicate triggers within cooldown period
    Given I have an alert that triggered 10 minutes ago
    When the price checker runs again
    And price is still below target
    Then the alert should NOT trigger again
    And no duplicate notification should be sent
    # Cooldown: 15 minutes minimum between triggers

  # ============================================================================
  # Phase 1e: Email Notifications
  # ============================================================================

  Scenario: Send email notification when alert triggers
    Given I have an alert with notify_email = true
    And my email is "user@example.com"
    When the alert triggers at price $7.95
    Then an email should be sent to "user@example.com"
    And email subject should be "🔔 Price Alert: AK-47 Redline is now $7.95"
    And email should contain "Your target price: $8.00"
    And email should contain marketplace link to buy
    And email should contain "Manage your alerts" link

  Scenario: Email includes GDPR-compliant unsubscribe link
    Given an alert notification email is sent
    Then email footer should contain unsubscribe link
    And unsubscribe should be one-click (no login required)
    And unsubscribe link should be visible and accessible

  Scenario: Check suppression list before sending email
    Given user "user@example.com" is on email suppression list
    When an alert triggers for this user
    Then NO email should be sent
    And suppression should be logged
    And user should not receive any emails

  # ============================================================================
  # Phase 1f: Push Notifications
  # ============================================================================

  Scenario: Send push notification when alert triggers
    Given I have an alert with notify_push = true
    And I have a valid push subscription
    When the alert triggers at price $7.95
    Then a push notification should be sent
    And notification title should be "Price Alert: AK-47 Redline"
    And notification body should contain "$7.95"
    And notification should include item icon
    And clicking notification should open marketplace link

  Scenario: Handle expired push subscription gracefully
    Given I have an alert with notify_push = true
    But my push subscription has expired (410 error)
    When the alert triggers
    Then the system should catch the 410 error
    And the expired subscription should be removed from database
    And email notification should still be sent as fallback
    And user should be prompted to re-enable push on next visit

  # ============================================================================
  # Phase 1g: Alert Management
  # ============================================================================

  Scenario: View all my active price alerts
    Given I have 3 active price alerts
    When I navigate to /alerts
    Then I should see a list of 3 alerts
    And each alert should display:
      | field          | example                  |
      | item_name      | AK-47 Redline (FT)       |
      | item_icon      | [image]                  |
      | current_price  | $10.50                   |
      | target_price   | $8.00                    |
      | difference     | $2.50 to go              |
      | is_active      | Active badge             |

  Scenario: Pause an active alert
    Given I have an active alert for "AK-47 Redline"
    When I click "Pause Alert"
    Then is_active should be set to false
    And I should see "Alert paused"
    And the alert should stop checking prices
    And I should see "Resume" button

  Scenario: Resume a paused alert
    Given I have a paused alert (is_active = false)
    When I click "Resume Alert"
    Then is_active should be set to true
    And I should see "Alert resumed"
    And the alert should resume price checking

  Scenario: Delete a price alert
    Given I have an alert for "AK-47 Redline"
    When I click "Delete Alert"
    And I confirm deletion
    Then the alert should be deleted from database
    And I should see "Alert deleted successfully"
    And I should be redirected to alerts list

  Scenario: Edit alert target price
    Given I have an alert with target price $8.00
    When I click "Edit Alert"
    And I change target price to "$7.50"
    And I save changes
    Then target_price should be updated to 7.50
    And I should see "Alert updated successfully"

  # ============================================================================
  # Phase 1h: Error Handling
  # ============================================================================

  Scenario: Handle database errors gracefully
    Given the database is temporarily unavailable
    When I try to create a price alert
    Then I should see error "Unable to create alert. Please try again."
    And the error should be logged
    And no partial data should be saved

  Scenario: Handle email service errors gracefully
    Given an alert triggers
    But the email service (SendGrid) is down
    When attempting to send notification
    Then the error should be caught and logged
    And the alert trigger should still be recorded in database
    And retry should be attempted later

  Scenario: Handle invalid item reference
    Given I try to create alert for non-existent item ID
    When I submit the alert
    Then I should see error "Item not found"
    And no alert should be created

  # ============================================================================
  # Phase 1i: Alert History
  # ============================================================================

  Scenario: View alert trigger history
    Given I have an alert that has triggered 3 times
    When I view alert details
    And I click "View History"
    Then I should see 3 trigger records
    And each record should show:
      | field          | example              |
      | triggered_at   | 2025-11-10 10:23 AM  |
      | price          | $7.95                |
      | platform       | CSFloat              |
      | clicked        | Yes/No               |

  Scenario: Track if user clicked on notification
    Given an alert trigger created a notification
    When I click the notification link
    Then clicked should be set to true
    And clicked_at should be recorded

  # ============================================================================
  # Phase 1j: Performance Requirements
  # ============================================================================

  Scenario: Price checker completes within time limit
    Given there are 10,000 active alerts
    When the price checker runs
    Then all alerts should be checked within 60 seconds
    And database queries should use eager loading (no N+1)

  Scenario: Use BRIN index for price history queries
    Given price_history table has 1,000,000 rows
    When querying recent prices for alert checking
    Then BRIN index should be used for timestamp queries
    And query should complete in under 50ms
