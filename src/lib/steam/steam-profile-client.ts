/**
 * Steam Web API Client for fetching player profile data
 *
 * Official Documentation:
 * https://partner.steamgames.com/doc/webapi/ISteamUser#GetPlayerSummaries
 *
 * Gotcha ebc25a37: Backend-only Steam API calls
 * Steam Web API requires API key - NEVER expose in client-side code
 */

export interface SteamPlayerProfile {
  steamid: string
  personaname: string
  avatar: string
  avatarmedium: string
  avatarfull: string
  profileurl: string
  communityvisibilitystate: number
}

interface SteamApiResponse {
  response: {
    players: SteamPlayerProfile[]
  }
}

export class SteamProfileClient {
  private readonly apiKey: string
  private readonly baseUrl = 'https://api.steampowered.com'

  constructor() {
    const apiKey = process.env.STEAM_API_KEY
    if (!apiKey) {
      throw new Error('STEAM_API_KEY is not configured')
    }
    this.apiKey = apiKey
  }

  /**
   * Fetch player profile data from Steam Web API
   *
   * @param steamId - Steam ID (64-bit format)
   * @returns Player profile data
   * @throws Error if API request fails or player not found
   */
  async getPlayerSummaries(steamId: string): Promise<SteamPlayerProfile> {
    // Validate Steam ID format (64-bit Steam ID is 17 digits starting with 7656119)
    if (!/^7656119\d{10}$/.test(steamId)) {
      throw new Error('Invalid Steam ID format')
    }

    if (!this.apiKey) {
      throw new Error('STEAM_API_KEY is not configured')
    }

    const url = `${this.baseUrl}/ISteamUser/GetPlayerSummaries/v2/?key=${this.apiKey}&steamids=${steamId}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(
        `Steam API request failed: ${response.status} ${response.statusText}`
      )
    }

    const data: SteamApiResponse = await response.json()

    if (!data.response.players || data.response.players.length === 0) {
      throw new Error('Player not found')
    }

    return data.response.players[0]
  }
}
