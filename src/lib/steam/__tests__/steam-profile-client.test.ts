import { SteamProfileClient } from '../steam-profile-client'

describe('SteamProfileClient', () => {
  let client: SteamProfileClient
  const originalApiKey = process.env.STEAM_API_KEY

  beforeEach(() => {
    // Set test API key for all tests
    process.env.STEAM_API_KEY = 'test_api_key_12345'
    client = new SteamProfileClient()
  })

  afterEach(() => {
    // Restore original API key
    if (originalApiKey) {
      process.env.STEAM_API_KEY = originalApiKey
    } else {
      delete process.env.STEAM_API_KEY
    }
  })

  describe('getPlayerSummaries', () => {
    it('should fetch player profile data from Steam Web API', async () => {
      // Arrange
      const steamId = '76561198000000000'
      const mockApiKey = process.env.STEAM_API_KEY || 'test_api_key'

      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: {
            players: [
              {
                steamid: steamId,
                personaname: 'Test Player',
                avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb.jpg',
                avatarmedium: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg',
                avatarfull: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
                profileurl: 'https://steamcommunity.com/id/test-player/',
                communityvisibilitystate: 3,
              },
            ],
          },
        }),
      })

      // Act
      const result = await client.getPlayerSummaries(steamId)

      // Assert
      expect(result).toBeDefined()
      expect(result.steamid).toBe(steamId)
      expect(result.personaname).toBe('Test Player')
      expect(result.avatar).toContain('steamcdn-a.akamaihd.net')
      expect(result.profileurl).toContain('steamcommunity.com')

      // Verify API called correctly
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/'),
        expect.any(Object)
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`key=${mockApiKey}`),
        expect.any(Object)
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`steamids=${steamId}`),
        expect.any(Object)
      )
    })

    it('should throw error when Steam API returns no players', async () => {
      // Arrange
      const steamId = '76561198000000000'

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: {
            players: [],
          },
        }),
      })

      // Act & Assert
      await expect(client.getPlayerSummaries(steamId)).rejects.toThrow(
        'Player not found'
      )
    })

    it('should throw error when Steam API request fails', async () => {
      // Arrange
      const steamId = '76561198000000000'

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      })

      // Act & Assert
      await expect(client.getPlayerSummaries(steamId)).rejects.toThrow(
        'Steam API request failed'
      )
    })

    it('should throw error when STEAM_API_KEY is not configured', async () => {
      // Arrange
      delete process.env.STEAM_API_KEY

      // Act & Assert
      expect(() => new SteamProfileClient()).toThrow(
        'STEAM_API_KEY is not configured'
      )
    })

    it('should validate Steam ID format', async () => {
      // Arrange
      const invalidSteamId = 'invalid'

      // Act & Assert
      await expect(client.getPlayerSummaries(invalidSteamId)).rejects.toThrow(
        'Invalid Steam ID format'
      )
    })
  })
})
