/**
 * TDD Tests for HeaderNav Session Integration
 * BDD Reference: features/06-steam-authentication.feature:24-25
 *   - "I should see my Steam username in the navigation bar"
 *   - "I should see my Steam avatar"
 *
 * PROPER TDD: Tests written BEFORE implementation
 */

import React from 'react';
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HeaderNav } from '@/components/header-nav';
import type { Session } from '@/lib/auth/session';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('HeaderNav Session Integration', () => {
  const mockSession: Session = {
    user: {
      id: 'user123',
      steamId: '76561198000000000',
      personaName: 'TestPlayer',
      profileUrl: 'https://steamcommunity.com/id/testplayer',
      avatar: 'https://avatars.steamstatic.com/test123_full.jpg',
      hasCS2Game: true,
      lastLogin: new Date(),
    },
    sessionToken: 'test-session-token',
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };

  describe('When User is Authenticated', () => {
    it('should accept session prop', () => {
      // BDD: Header should accept session data
      expect(() => {
        render(<HeaderNav session={mockSession} />);
      }).not.toThrow();
    });

    it('should display user avatar when authenticated', () => {
      // BDD: "I should see my Steam avatar"
      render(<HeaderNav session={mockSession} />);
      const avatar = screen.getByAltText('TestPlayer');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', mockSession.user.avatar);
    });

    it('should NOT display sign in button when authenticated', () => {
      // BDD: Authenticated users should NOT see sign in button
      render(<HeaderNav session={mockSession} />);
      const signInButton = screen.queryByLabelText('Sign in');
      expect(signInButton).not.toBeInTheDocument();
    });
  });

  describe('When User is NOT Authenticated', () => {
    it('should accept null session prop', () => {
      // BDD: Header should handle unauthenticated state
      expect(() => {
        render(<HeaderNav session={null} />);
      }).not.toThrow();
    });

    it('should display sign in button when not authenticated', () => {
      // BDD: Guest users should see sign in button
      render(<HeaderNav session={null} />);
      const signInButton = screen.getByLabelText('Sign in');
      expect(signInButton).toBeInTheDocument();
    });

    it('should NOT display user avatar when not authenticated', () => {
      // BDD: Guest users should NOT see user avatar
      render(<HeaderNav session={null} />);
      const avatar = screen.queryByAltText(/.*Player.*/);
      expect(avatar).not.toBeInTheDocument();
    });
  });
});
