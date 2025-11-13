/**
 * Integration tests for Steam callback route with profile sync
 *
 * Tests that the callback route:
 * 1. Verifies OpenID assertions
 * 2. Fetches Steam profile data via Steam Web API
 * 3. Stores real profile data (persona_name, avatar) in database
 * 4. Creates session and returns redirect
 */

import { NextRequest } from 'next/server'
import { GET } from '../route'
import { prisma } from '@/lib/prisma'
import { SteamProfileClient } from '@/lib/steam/steam-profile-client'

// Mock dependencies
jest.mock('@/lib/steam/steam-openid-provider')
jest.mock('@/lib/steam/steam-profile-client')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
    },
  },
}))

describe('GET /api/auth/steam/callback', () => {
  const mockSteamId = '76561198000000000'
  const mockProfileData = {
    steamid: mockSteamId,
    personaname: 'Test Player',
    avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb.jpg',
    avatarmedium: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg',
    avatarfull: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
    profileurl: 'https://steamcommunity.com/id/test-player/',
    communityvisibilitystate: 3,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
    process.env.STEAM_API_KEY = 'test_api_key'
  })

  afterEach(() => {
    delete process.env.NEXTAUTH_URL
    delete process.env.STEAM_API_KEY
  })

  it('should fetch Steam profile data and store real persona_name on new user creation', async () => {
    // Arrange: Mock OpenID verification success
    const { SteamOpenIDProvider } = require('@/lib/steam/steam-openid-provider')
    SteamOpenIDProvider.mockImplementation(() => ({
      verifyCallback: jest.fn().mockResolvedValue({
        verified: true,
        steamId: mockSteamId,
      }),
    }))

    // Mock: No existing user (new user flow)
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

    // Mock: Steam profile API returns real data
    ;(SteamProfileClient as jest.Mock).mockImplementation(() => ({
      getPlayerSummaries: jest.fn().mockResolvedValue(mockProfileData),
    }))

    // Mock: User creation
    ;(prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'user-123',
      steam_id: mockSteamId,
      persona_name: mockProfileData.personaname,
      avatar: mockProfileData.avatar,
      profile_url: mockProfileData.profileurl,
      last_login: new Date(),
    })

    // Mock: Session creation
    ;(prisma.session.create as jest.Mock).mockResolvedValue({
      id: 'session-123',
      session_token: 'mock-session-token',
      user_id: 'user-123',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

    const url = new URL(
      'http://localhost:3000/api/auth/steam/callback?openid.mode=id_res&openid.claimed_id=https://steamcommunity.com/openid/id/76561198000000000&openid.identity=https://steamcommunity.com/openid/id/76561198000000000&openid.ns=http://specs.openid.net/auth/2.0'
    )
    const request = new NextRequest(url, {
      method: 'GET',
      headers: new Headers({ Cookie: 'steam_csrf_state=test-state' }),
    })

    // Act
    await GET(request)

    // Assert: SteamProfileClient.getPlayerSummaries was called
    const profileClientInstance = (SteamProfileClient as jest.Mock).mock.results[0].value
    expect(profileClientInstance.getPlayerSummaries).toHaveBeenCalledWith(mockSteamId)

    // Assert: User created with REAL profile data, not placeholders
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        steam_id: mockSteamId,
        persona_name: 'Test Player', // Real name, not "Steam User"
        avatar: expect.stringContaining('steamcdn-a.akamaihd.net'), // Real avatar, not empty
        profile_url: 'https://steamcommunity.com/id/test-player/',
      }),
    })

    // Assert: persona_name is NOT the placeholder
    const createCall = (prisma.user.create as jest.Mock).mock.calls[0][0]
    expect(createCall.data.persona_name).not.toBe('Steam User')
    expect(createCall.data.avatar).not.toBe('')
  })

  it('should fetch and update Steam profile data on existing user login', async () => {
    // Arrange: Mock OpenID verification success
    const { SteamOpenIDProvider } = require('@/lib/steam/steam-openid-provider')
    SteamOpenIDProvider.mockImplementation(() => ({
      verifyCallback: jest.fn().mockResolvedValue({
        verified: true,
        steamId: mockSteamId,
      }),
    }))

    // Mock: Existing user with outdated profile
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-123',
      steam_id: mockSteamId,
      persona_name: 'Old Name',
      avatar: 'https://old-avatar.jpg',
      profile_url: `https://steamcommunity.com/profiles/${mockSteamId}`,
      last_login: new Date('2024-01-01'),
    })

    // Mock: Steam profile API returns updated data
    ;(SteamProfileClient as jest.Mock).mockImplementation(() => ({
      getPlayerSummaries: jest.fn().mockResolvedValue(mockProfileData),
    }))

    // Mock: User update
    ;(prisma.user.update as jest.Mock).mockResolvedValue({
      id: 'user-123',
      steam_id: mockSteamId,
      persona_name: mockProfileData.personaname,
      avatar: mockProfileData.avatar,
      profile_url: mockProfileData.profileurl,
      last_login: new Date(),
    })

    // Mock: Session creation
    ;(prisma.session.create as jest.Mock).mockResolvedValue({
      id: 'session-123',
      session_token: 'mock-session-token',
      user_id: 'user-123',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

    const url = new URL(
      'http://localhost:3000/api/auth/steam/callback?openid.mode=id_res&openid.claimed_id=https://steamcommunity.com/openid/id/76561198000000000&openid.identity=https://steamcommunity.com/openid/id/76561198000000000&openid.ns=http://specs.openid.net/auth/2.0'
    )
    const request = new NextRequest(url, {
      method: 'GET',
      headers: new Headers({ Cookie: 'steam_csrf_state=test-state' }),
    })

    // Act
    await GET(request)

    // Assert: SteamProfileClient.getPlayerSummaries was called
    const profileClientInstance = (SteamProfileClient as jest.Mock).mock.results[0].value
    expect(profileClientInstance.getPlayerSummaries).toHaveBeenCalledWith(mockSteamId)

    // Assert: User updated with fresh profile data
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { steam_id: mockSteamId },
      data: expect.objectContaining({
        persona_name: 'Test Player',
        avatar: expect.stringContaining('steamcdn-a.akamaihd.net'),
        profile_url: 'https://steamcommunity.com/id/test-player/',
        last_login: expect.any(Date),
      }),
    })
  })

  it('should handle Steam profile API failures gracefully', async () => {
    // Arrange: Mock OpenID verification success
    const { SteamOpenIDProvider } = require('@/lib/steam/steam-openid-provider')
    SteamOpenIDProvider.mockImplementation(() => ({
      verifyCallback: jest.fn().mockResolvedValue({
        verified: true,
        steamId: mockSteamId,
      }),
    }))

    // Mock: No existing user
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

    // Mock: Steam profile API fails
    ;(SteamProfileClient as jest.Mock).mockImplementation(() => ({
      getPlayerSummaries: jest.fn().mockRejectedValue(new Error('Steam API rate limit exceeded')),
    }))

    // Mock: User creation with fallback data
    ;(prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'user-123',
      steam_id: mockSteamId,
      persona_name: 'Steam User', // Fallback when API fails
      avatar: '',
      profile_url: `https://steamcommunity.com/profiles/${mockSteamId}`,
      last_login: new Date(),
    })

    // Mock: Session creation
    ;(prisma.session.create as jest.Mock).mockResolvedValue({
      id: 'session-123',
      session_token: 'mock-session-token',
      user_id: 'user-123',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

    const url = new URL(
      'http://localhost:3000/api/auth/steam/callback?openid.mode=id_res&openid.claimed_id=https://steamcommunity.com/openid/id/76561198000000000&openid.identity=https://steamcommunity.com/openid/id/76561198000000000&openid.ns=http://specs.openid.net/auth/2.0'
    )
    const request = new NextRequest(url, {
      method: 'GET',
      headers: new Headers({ Cookie: 'steam_csrf_state=test-state' }),
    })

    // Act
    const response = await GET(request)

    // Assert: Should still succeed with fallback data
    expect(response.status).toBe(200)
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        steam_id: mockSteamId,
        persona_name: 'Steam User', // Fallback when API fails
        avatar: '',
      }),
    })
  })
})
