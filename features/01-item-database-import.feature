Feature: ByMykel API Data Import Service
  As a system administrator
  I want to import CS2 item data from ByMykel/CSGO-API
  So that the database is populated with 7,000+ items for users to browse

  Background:
    Given the ByMykel CSGO-API is accessible at https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/
    And the database schema is migrated and ready
    And GitHub rate limits allow 60 requests/hour (unauthenticated) or 5,000 requests/hour (authenticated)

  # Feature 01: Item Import
  Scenario: Import items from ByMykel API successfully
    Given the Item table is empty
    When I run the import service for items
    Then it should fetch skins_not_grouped.json from ByMykel API
    And it should parse the JSON response successfully
    And it should upsert items into the Item table
    And it should populate required fields: name, display_name, search_name, type, image_url
    And it should populate optional fields: rarity, weapon_type, wear_min, wear_max
    And it should normalize search_name to lowercase without special characters
    And it should complete within 60 seconds
    And the Item table should contain 7,000+ items after import

  Scenario: Handle duplicate items with upsert strategy
    Given the Item table already contains "AK-47 | Redline (Field-Tested)"
    When I run the import service and the same item appears in the API
    Then it should UPDATE the existing item instead of creating a duplicate
    And it should preserve the original created_at timestamp
    And it should update the updated_at timestamp
    And the unique constraint on (name, quality, wear) should prevent duplicates

  Scenario: Handle items with missing optional fields gracefully
    Given an item from the API has no rarity field
    When the import service processes this item
    Then it should set rarity to NULL
    And it should NOT fail the entire import
    And it should log a warning about the missing field
    And it should continue importing remaining items

  Scenario: Normalize item names for cross-platform compatibility
    Given an item from ByMykel API is named "AK-47 | Case Hardened"
    When the import service processes this item
    Then display_name should be "AK-47 | Case Hardened" (original)
    And search_name should be "ak47casehardened" (normalized: lowercase, no spaces, no special chars)
    And name should be "AK-47 | Case Hardened" (stored as-is)
    And this enables matching with Steam Market format "AK-47 | Case Hardened (Field-Tested)"

  Scenario: Handle GitHub API rate limit gracefully
    Given I am making unauthenticated requests to GitHub
    And I have made 59 requests in the current hour
    When I make the 60th request
    Then the import service should complete successfully
    When I attempt to make a 61st request
    Then the import service should detect the rate limit (HTTP 429 or 403)
    And it should log an error with retry-after time
    And it should fail gracefully without corrupting the database
    And it should provide instructions to use GITHUB_TOKEN for 5,000 req/hr

  Scenario: Use GitHub personal access token for higher rate limits
    Given GITHUB_TOKEN environment variable is set
    When the import service makes requests to GitHub
    Then it should include "Authorization: token {GITHUB_TOKEN}" header
    And it should have access to 5,000 requests per hour
    And it should log "Using authenticated requests (5,000 req/hr)"

  Scenario: Validate data integrity before inserting
    Given an item from the API is missing required field "name"
    When the import service validates this item
    Then it should reject the item
    And it should log a validation error
    And it should continue importing other valid items
    And the import summary should report 1 failed validation

  Scenario: Handle network errors with retry logic
    Given the ByMykel API request times out
    When the import service attempts to fetch data
    Then it should retry up to 3 times with exponential backoff
    And backoff delays should be: 2s, 4s, 8s
    And if all retries fail, it should log a critical error
    And it should exit with a non-zero status code

  Scenario: Import stickers as separate items
    Given the ByMykel API has a stickers.json endpoint
    When I run the import service for stickers
    Then it should fetch stickers.json
    And it should create Item records with type="sticker"
    And stickers should have no weapon_type (NULL)
    And stickers should have no wear values
    And the Item table should contain 5,000+ sticker items

  # Feature 02: Collection Import
  Scenario: Import collections from ByMykel API successfully
    Given the Collection table is empty
    When I run the import service for collections
    Then it should fetch collections.json from ByMykel API
    And it should parse the JSON response successfully
    And it should upsert collections into the Collection table
    And it should populate: name, slug, description, image_url, release_date
    And it should generate URL-friendly slugs from collection names
    And it should complete within 30 seconds
    And the Collection table should contain 50+ collections after import

  Scenario: Link items to collections during import
    Given the Collection "Operation Riptide" exists with id "abc-123"
    And the Item "AK-47 | Leet Museo" is from "Operation Riptide" collection
    When I run the collection linking process
    Then the item should have collection_id set to "abc-123"
    And the collection should show 17 items when queried via items relationship
    And orphaned items (no collection match) should have collection_id = NULL

  Scenario: Handle collections with discontinued status
    Given a collection from the API has "discontinued": true
    When the import service processes this collection
    Then is_discontinued should be set to true
    And discontinued_date should be set if provided in API
    And the collection should still be browsable in the UI
    And it should display a "No Longer Drops" badge

  Scenario: Generate URL-friendly slugs for collections
    Given a collection named "Operation Riptide Collection"
    When the import service generates a slug
    Then the slug should be "operation-riptide-collection"
    And special characters should be removed: "Dreams & Nightmares" → "dreams-nightmares"
    And spaces should become hyphens
    And the slug should be unique (enforced by database constraint)

  # Feature 02: Case Import
  Scenario: Import cases from ByMykel API successfully
    Given the Case table is empty
    When I run the import service for cases
    Then it should fetch crates.json from ByMykel API
    And it should filter for type="case" (exclude sticker capsules)
    And it should upsert cases into the Case table
    And it should populate: name, slug, description, image_url, key_price, release_date
    And it should complete within 30 seconds
    And the Case table should contain 100+ cases after import

  Scenario: Import case contents with drop probabilities
    Given the "Clutch Case" exists in the Case table
    And the API provides items with drop probabilities
    When I run the case items import
    Then it should create CaseItem records linking Case ↔ Item
    And it should populate probability field (percentage)
    And it should populate is_rare_special for knives/gloves
    And probabilities for all items in a case should sum to 100%
    And the Clutch Case should link to 17 normal items + rare specials

  Scenario: Handle cases with rare special items (knives, gloves)
    Given the "Chroma 3 Case" contains knives as rare drops
    When I import the case contents
    Then knife items should have is_rare_special = true
    And knife probabilities should be very low (< 1%)
    And normal items should have is_rare_special = false
    And the case detail page should highlight rare items separately

  # Error Handling & Edge Cases
  Scenario: Handle malformed JSON response from API
    Given the ByMykel API returns invalid JSON
    When the import service attempts to parse it
    Then it should catch the JSON parse error
    And it should log the error with the URL that failed
    And it should NOT crash the entire import process
    And it should mark the import as failed
    And it should exit with status code 1

  Scenario: Handle API endpoint returning 404
    Given the ByMykel API endpoint /skins.json is moved or deleted
    When the import service requests this endpoint
    Then it should receive HTTP 404
    And it should log "Endpoint not found: /skins.json"
    And it should NOT retry (404 is permanent failure)
    And it should exit gracefully

  Scenario: Handle empty API response
    Given the ByMykel API returns an empty array []
    When the import service processes the response
    Then it should log a warning "No items found in API response"
    And it should NOT delete existing database items
    And it should exit with status code 0 (success, but no changes)

  Scenario: Import summary report
    Given I run the complete import for items, collections, and cases
    When the import completes
    Then it should output a summary report:
      """
      ✅ Import Summary
      Items:
        - Total fetched: 7,523
        - Inserted: 7,500
        - Updated: 23
        - Failed: 0
      Collections:
        - Total fetched: 58
        - Inserted: 58
        - Updated: 0
      Cases:
        - Total fetched: 142
        - Inserted: 142
        - Updated: 0
      Duration: 45s
      Status: SUCCESS
      """

  # Performance Requirements
  Scenario: Import performance meets SLA
    Given the database is empty
    When I run the complete import (items + collections + cases)
    Then items import should complete within 60 seconds
    And collections import should complete within 30 seconds
    And cases import should complete within 30 seconds
    And total import time should be less than 2 minutes
    And database should be in consistent state (all foreign keys valid)

  # Idempotency & Safety
  Scenario: Import is idempotent (safe to run multiple times)
    Given the database already contains imported data
    When I run the import service again with identical API data
    Then it should detect that items already exist
    And it should NOT create duplicates
    And it should update updated_at timestamps only
    And it should report "0 inserted, 7523 updated" in summary

  Scenario: Import preserves user-generated data
    Given users have created price_alerts for specific items
    When I run the import service and items are updated
    Then existing price_alerts relationships should remain intact
    And item IDs should NOT change (upsert by unique constraint)
    And no user data should be deleted

  Scenario: Rollback on critical error
    Given the import has processed 5,000 items successfully
    When a database constraint violation occurs on item 5,001
    Then the import should log the specific error
    And it should continue processing remaining items (no rollback)
    And the summary should report which items failed
    And valid items should remain in the database

  # Monitoring & Observability
  Scenario: Import logs structured output for monitoring
    Given I run the import service
    When the import is in progress
    Then it should log progress every 500 items: "Imported 500/7523 items (6.6%)"
    And it should log each stage: "Fetching items...", "Parsing JSON...", "Inserting to database..."
    And it should log performance metrics: "Processed 7523 items in 45s (167 items/sec)"
    And logs should be JSON-formatted for log aggregation tools

  Scenario: Detect data drift between API and database
    Given the ByMykel API adds a new item "M4A4 | Temukau"
    When I run the import service
    Then it should detect 1 new item
    And it should log "New item discovered: M4A4 | Temukau"
    And it should insert the new item
    And the summary should report "1 inserted, 7522 updated"
