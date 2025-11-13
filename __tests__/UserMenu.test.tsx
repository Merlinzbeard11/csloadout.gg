/**
 * TDD Tests for UserMenu Component
 * BDD Reference: features/06-steam-authentication.feature:15-20
 *   - User profile displayed in navigation after login
 *   - Steam username shown in navigation bar
 *   - Steam avatar displayed
 *   - Sign out button functionality
 *
 * PROPER TDD: Tests written BEFORE implementation
 */

import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UserMenu } from '@/components/user-menu';

// Mock fetch API
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('UserMenu Component', () => {
  const mockProps = {
    personaName: 'TestPlayer',
    avatar: 'https://avatars.steamstatic.com/test123_full.jpg',
    steamId: '76561198000000000',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Display Requirements', () => {
    it('should display user avatar in trigger button', () => {
      // BDD: "I should see my Steam avatar"
      render(<UserMenu {...mockProps} />);
      const avatar = screen.getByAltText('TestPlayer');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', mockProps.avatar);
    });

    it('should display persona name in dropdown menu', async () => {
      // BDD: "I should see my Steam username in the navigation bar"
      // Source: https://github.com/radix-ui/primitives/discussions/2666
      const user = userEvent.setup();
      render(<UserMenu {...mockProps} />);
      const trigger = screen.getByRole('button');
      await user.click(trigger);
      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    });

    it('should display Steam ID in dropdown menu', async () => {
      const user = userEvent.setup();
      render(<UserMenu {...mockProps} />);
      const trigger = screen.getByRole('button');
      await user.click(trigger);
      expect(screen.getByText(/Steam ID: 76561198000000000/)).toBeInTheDocument();
    });
  });

  describe('Sign Out Functionality', () => {
    it('should have sign out button', async () => {
      const user = userEvent.setup();
      render(<UserMenu {...mockProps} />);
      const trigger = screen.getByRole('button');
      await user.click(trigger);
      const signOutButton = screen.getByRole('menuitem', { name: /sign out/i });
      expect(signOutButton).toBeInTheDocument();
    });

    it('should call /api/auth/signout endpoint when sign out clicked', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, redirectTo: '/' }),
      } as Response);

      const user = userEvent.setup();
      render(<UserMenu {...mockProps} />);
      const trigger = screen.getByRole('button');
      await user.click(trigger);
      const signOutButton = screen.getByRole('menuitem', { name: /sign out/i });
      await user.click(signOutButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/signout', {
          method: 'POST',
        });
      });
    });

    it('should redirect to home page after successful sign out', async () => {
      // Source: https://openillumi.com/en/en-jest-fix-location-href-typeerror/
      // Source: https://github.com/jestjs/jest/issues/15674
      delete (window as any).location;
      (window as any).location = { href: '' };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, redirectTo: '/' }),
      } as Response);

      const user = userEvent.setup();
      render(<UserMenu {...mockProps} />);
      const trigger = screen.getByRole('button');
      await user.click(trigger);
      const signOutButton = screen.getByRole('menuitem', { name: /sign out/i });
      await user.click(signOutButton);

      await waitFor(() => {
        // jsdom converts '/' to 'http://localhost/'
        expect(window.location.href).toBe('http://localhost/');
      });
    });
  });
});
