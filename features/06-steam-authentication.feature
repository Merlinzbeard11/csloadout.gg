Feature: Steam OpenID Authentication
  As a CS2 skin buyer
  I want to sign in with my Steam account
  So that I can import my inventory and track my collection

  Background:
    Given the Steam OpenID endpoint is "https://steamcommunity.com/openid/"
    And the return URL is configured for the application
    And CSRF protection is enabled

  # ============================================================================
  # CORE SCENARIOS: User Authentication Flow
  # ============================================================================

  Scenario: Successful Steam login flow
    Given I am on the csloadout.gg homepage
    And I am not authenticated
    When I click the "Sign in with Steam" button
    Then I should be redirected to "https://steamcommunity.com/openid/login"
    And I should see the Steam Community login page
    When I enter valid Steam credentials
    And I authorize csloadout.gg to access my profile
    Then I should be redirected back to csloadout.gg
    And I should see my Steam username in the navigation bar
    And I should see my Steam avatar
    And a session cookie should be set
    And my session should be valid for 30 days

  Scenario: Extract SteamID from OpenID claimed identity
    Given Steam returns a successful authentication response
    And the claimed_id is "http://steamcommunity.com/openid/id/76561198012345678"
    When the authentication callback is processed
    Then the SteamID "76561198012345678" should be extracted
    And the SteamID should be stored in the session
    And the user profile should be created or updated

  Scenario: Verify OpenID authentication response
    Given Steam returns an authentication response with:
      | Parameter              | Value                                                          |
      | openid.mode            | id_res                                                         |
      | openid.claimed_id      | http://steamcommunity.com/openid/id/76561198012345678         |
      | openid.identity        | http://steamcommunity.com/openid/id/76561198012345678         |
      | openid.return_to       | https://csloadout.gg/api/auth/steam/callback                  |
      | openid.response_nonce  | 2025-11-08T12:00:00Zunique-string                             |
      | openid.assoc_handle    | 1234567890                                                     |
      | openid.signed          | signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle |
      | openid.sig             | base64-encoded-signature                                       |
    When the response is verified with Steam
    Then the signature should be validated
    And the nonce should be checked for replay attacks
    And the return_to URL should match the configured callback
    And the authentication should be accepted

  # ============================================================================
  # SESSION MANAGEMENT
  # ============================================================================

  Scenario: Maintain authenticated session across page loads
    Given I am authenticated with Steam
    And I have a valid session cookie
    When I navigate to "/loadouts"
    Then I should remain authenticated
    And I should see my Steam username
    When I navigate to "/inventory"
    Then I should remain authenticated
    And I should not be prompted to sign in again

  Scenario: Session expiration after 30 days
    Given I am authenticated with Steam
    And my session was created 30 days ago
    When I visit csloadout.gg
    Then my session should be expired
    And I should be prompted to sign in again
    And the old session should be cleared

  Scenario: Logout functionality
    Given I am authenticated with Steam
    When I click the "Sign Out" button
    Then my session should be destroyed
    And my session cookie should be deleted
    And I should see the "Sign in with Steam" button
    And I should be redirected to the homepage
    When I visit a protected page like "/inventory"
    Then I should be redirected to the login page

  # ============================================================================
  # PROFILE DATA SYNCHRONIZATION
  # ============================================================================

  Scenario: Fetch and store Steam profile data on first login
    Given I am completing authentication for the first time
    And my SteamID is "76561198012345678"
    When the authentication succeeds
    Then the system should call the Steam Web API "ISteamUser/GetPlayerSummaries/v2"
    And the following profile data should be stored:
      | Field          | Example Value                                    |
      | steamId        | 76561198012345678                                |
      | personaName    | ProGamer123                                      |
      | profileUrl     | https://steamcommunity.com/id/progamer123        |
      | avatar         | https://avatars.steamstatic.com/abc123_full.jpg  |
      | profileState   | 1                                                |
      | lastLogOff     | 1699564800                                       |
    And a database record should be created in the "users" table
    And the user should be marked as active

  Scenario: Update profile data on subsequent logins
    Given I have previously authenticated with Steam
    And my stored persona name is "OldUsername"
    When I authenticate again
    And my current Steam persona name is "NewUsername"
    Then my profile data should be updated
    And my persona name should now be "NewUsername"
    And my last login timestamp should be updated

  # ============================================================================
  # ERROR HANDLING
  # ============================================================================

  Scenario: Handle user cancellation during Steam login
    Given I am on the Steam Community login page
    When I click "Cancel" or close the browser tab
    Then I should be redirected back to csloadout.gg
    And I should see an error message "Authentication cancelled"
    And I should not be authenticated
    And I should see the "Sign in with Steam" button

  Scenario: Handle invalid OpenID response signature
    Given Steam returns an authentication response
    And the signature is invalid or tampered with
    When the response is verified
    Then the signature validation should fail
    And the user should not be authenticated
    And an error should be logged "Invalid OpenID signature"
    And the user should see "Authentication failed. Please try again."

  Scenario: Handle Steam API timeout during profile fetch
    Given I am completing authentication
    When the Steam Web API call to GetPlayerSummaries times out
    Then the authentication should still succeed
    And a default profile should be created with SteamID only
    And a background job should be queued to retry profile fetch
    And the user should be logged in

  Scenario: Handle network failure during authentication
    Given I click "Sign in with Steam"
    When the redirect to Steam fails due to network error
    Then I should see an error message "Unable to connect to Steam. Please check your connection."
    And I should remain on csloadout.gg
    And I should be able to retry the login

  Scenario: Handle duplicate nonce (replay attack prevention)
    Given Steam returns a valid authentication response
    And the nonce "2025-11-08T12:00:00Zunique-string" has already been used
    When the response is processed
    Then the nonce should be rejected as a duplicate
    And the authentication should fail
    And an error should be logged "Replay attack detected - duplicate nonce"
    And the user should see "Authentication failed. Please try again."

  # ============================================================================
  # SECURITY CONSIDERATIONS
  # ============================================================================

  Scenario: CSRF protection with state parameter
    Given I initiate a Steam login
    When the redirect to Steam is created
    Then a random state parameter should be generated
    And the state should be stored in the session
    When the callback is received from Steam
    Then the returned state should match the stored state
    And the state should be cleared after validation

  Scenario: Secure session cookie configuration
    Given I authenticate successfully
    When the session cookie is created
    Then the cookie should have the following attributes:
      | Attribute  | Value    |
      | httpOnly   | true     |
      | secure     | true     |
      | sameSite   | lax      |
      | maxAge     | 2592000  |
    And the cookie should only be sent over HTTPS in production

  Scenario: Rate limiting authentication attempts
    Given I have failed authentication 5 times in 10 minutes
    When I attempt to authenticate again
    Then I should be rate limited
    And I should see "Too many authentication attempts. Please try again in 10 minutes."
    And the attempt should be logged for security monitoring

  # ============================================================================
  # INVENTORY ACCESS PREPARATION
  # ============================================================================

  Scenario: Check CS2 game ownership after authentication
    Given I am authenticated with SteamID "76561198012345678"
    When my profile is being set up
    Then the system should call "ISteamUser/CheckAppOwnership" with appid "730"
    And if I own CS2, my account should be marked as "hasCS2Game: true"
    And if I do not own CS2, my account should be marked as "hasCS2Game: false"

  Scenario: Prepare for inventory import (future feature link)
    Given I am authenticated
    And I own CS2
    When I view my profile page
    Then I should see a button "Import Inventory" (disabled for Phase 1)
    And I should see a tooltip "Coming in Feature 07"
    And my SteamID should be stored for future inventory API calls

  # ============================================================================
  # MOBILE RESPONSIVE CONSIDERATIONS
  # ============================================================================

  Scenario: Steam login on mobile device
    Given I am on a mobile device
    When I click "Sign in with Steam"
    Then I should be redirected to the mobile-optimized Steam login
    And after authentication I should return to the mobile view
    And the session should work identically to desktop

  # ============================================================================
  # EDGE CASES
  # ============================================================================

  Scenario: Handle private Steam profile
    Given I authenticate successfully
    And my Steam profile is set to private
    When profile data is fetched
    Then basic data (SteamID, persona name) should be available
    And private data should be marked as unavailable
    And the user should be notified "Your profile is private. Some features may be limited."

  Scenario: Handle Steam Community maintenance
    Given Steam Community is undergoing maintenance
    When I attempt to authenticate
    Then I should see "Steam is currently unavailable. Please try again later."
    And the error should be logged with timestamp
    And I should be able to use the site in guest mode (limited features)
