/**
 * TDD Tests for Inventory Item Grid (Failing Tests - RED Phase)
 *
 * BDD Reference: features/07-inventory-import.feature
 *   Scenario: Display inventory value comparison across platforms (lines 29-43)
 *   Scenario: Show total potential savings across entire inventory (lines 45-59)
 *
 * Tests Item Grid Component Responsibilities:
 * - Display grid of inventory items with images
 * - Show marketplace price comparison per item
 * - Display best platform and price
 * - Show potential savings vs Steam price
 * - Handle loading states with skeletons
 * - Display empty state when no items
 * - Paginate large inventories
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  useRouter: () => ({
    refresh: jest.fn(),
    push: jest.fn()
  })
}))

// Component will be imported once implemented
// import InventoryPage from '@/app/inventory/page'

// Type definitions matching Prisma schema
interface InventoryItemWithPricing {
  id: string
  inventory_id: string
  steam_asset_id: string
  market_hash_name: string
  float_value: number | null
  wear: string | null
  quality: string | null
  current_value: number | null
  best_platform: string | null
  item: {
    name: string
    display_name: string
    image_url: string
    rarity: string | null
  } | null
}

describe('Inventory Item Grid (TDD - RED Phase)', () => {
  const uniqueId = () => `${Date.now()}-${Math.random().toString(36).substring(7)}`
  let testUserId: string
  let testSteamId: string
  let testInventoryId: string
  let testItemId: string

  beforeEach(async () => {
    // Start transaction for test isolation
    await global.prismaTestHelper.startTransaction()
    jest.clearAllMocks()

    // Create test user
    const user = await prisma.user.create({
      data: {
        steam_id: `test-steam-${uniqueId()}`,
        persona_name: 'Test User Grid',
        profile_url: 'https://steamcommunity.com/id/testuser',
        avatar: 'https://example.com/avatar.png',
        email: 'test-grid@example.com'
      }
    })
    testUserId = user.id
    testSteamId = user.steam_id

    // Create test item (AK-47 | Redline)
    const item = await prisma.item.create({
      data: {
        name: `test-ak47-redline-${uniqueId()}`,
        display_name: 'AK-47 | Redline (Field-Tested)',
        search_name: 'ak47 redline field tested',
        type: 'skin',
        weapon_type: 'rifle',
        image_url: 'https://community.akamai.steamstatic.com/economy/image/test-ak47.png',
        rarity: 'classified',
        wear_min: 0.1,
        wear_max: 0.7
      }
    })
    testItemId = item.id

    // Create marketplace prices for the item
    await prisma.marketplacePrice.createMany({
      data: [
        {
          item_id: testItemId,
          platform: 'csfloat',
          price: 8.67,
          currency: 'USD',
          total_cost: 8.67,
          last_updated: new Date()
        },
        {
          item_id: testItemId,
          platform: 'buff163',
          price: 8.20,
          currency: 'USD',
          total_cost: 8.20,
          last_updated: new Date()
        },
        {
          item_id: testItemId,
          platform: 'steam',
          price: 7.20,
          currency: 'USD',
          total_cost: 7.20,
          last_updated: new Date()
        }
      ]
    })

    // Create test inventory
    const inventory = await prisma.userInventory.create({
      data: {
        user_id: testUserId,
        steam_id: testSteamId,
        total_items: 1,
        total_value: 8.67,
        last_synced: new Date(),
        sync_status: 'success',
        is_public: true,
        consent_given: true
      }
    })
    testInventoryId = inventory.id

    // Create inventory item
    await prisma.inventoryItem.create({
      data: {
        inventory_id: testInventoryId,
        item_id: testItemId,
        steam_asset_id: `test-asset-${uniqueId()}`,
        market_hash_name: 'AK-47 | Redline (Field-Tested)',
        wear: 'field_tested',
        quality: 'normal',
        current_value: 8.67,
        best_platform: 'csfloat',
        float_value: 0.25
      }
    })

    // Mock getSession to return test user
    ;(getSession as jest.Mock).mockResolvedValue({
      user: {
        id: testUserId,
        steamId: testSteamId,
        personaName: 'Test User Grid',
        email: 'test-grid@example.com'
      },
      sessionToken: 'test-token',
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    })
  })

  afterEach(() => {
    // Rollback transaction - automatic cleanup, no manual deletion needed
    global.prismaTestHelper.rollbackTransaction()
  })

  describe('Item Grid Display', () => {
    it('should display inventory items in a grid', async () => {
      // BDD: When I view my inventory
      // Then I should see the item listed

      const InventoryPage = (await import('@/app/inventory/page')).default
      const { container } = render(<InventoryPage />)

      // Should display item name
      expect(screen.getByText(/AK-47 \| Redline/i)).toBeInTheDocument()
    })

    it('should display item image from Steam CDN', async () => {
      // BDD: Items should display with proper images

      const InventoryPage = (await import('@/app/inventory/page')).default
      const { container } = render(<InventoryPage />)

      // Should have image with Steam CDN URL
      const image = screen.getByAltText(/AK-47 \| Redline/i)
      expect(image).toHaveAttribute('src', expect.stringContaining('steamstatic.com'))
    })

    it('should display item wear condition', async () => {
      // BDD: Display item attributes (Field-Tested)

      const InventoryPage = (await import('@/app/inventory/page')).default
      const { container } = render(<InventoryPage />)

      expect(screen.getByText(/Field Tested/i)).toBeInTheDocument()
    })

    it('should display float value for skinned items', async () => {
      // BDD: Extract float value from Steam API response

      const InventoryPage = (await import('@/app/inventory/page')).default
      const { container } = render(<InventoryPage />)

      expect(screen.getByText(/0\.25/)).toBeInTheDocument()
    })
  })

  describe('Marketplace Price Comparison', () => {
    it('should display best platform price', async () => {
      // BDD: Then I should see the item listed with Best Platform: CSFloat

      const InventoryPage = (await import('@/app/inventory/page')).default
      const { container } = render(<InventoryPage />)

      expect(screen.getByText(/CSFLOAT/i)).toBeInTheDocument()
      // Price appears multiple times (summary + item grid), just verify it exists
      expect(screen.getAllByText(/\$8\.67/).length).toBeGreaterThan(0)
    })

    it('should display Steam price for comparison', async () => {
      // BDD: And Steam Price: $7.20

      const InventoryPage = (await import('@/app/inventory/page')).default
      const { container } = render(<InventoryPage />)

      expect(screen.getByText(/Steam/i)).toBeInTheDocument()
      expect(screen.getByText(/\$7\.20/)).toBeInTheDocument()
    })

    it('should calculate and display potential savings', async () => {
      // BDD: And Potential Savings: $1.47
      // In this test: $8.67 (CSFloat) - $7.20 (Steam) = $1.47

      const InventoryPage = (await import('@/app/inventory/page')).default
      const { container } = render(<InventoryPage />)

      expect(screen.getByText(/\$1\.47/)).toBeInTheDocument()
    })

    it('should highlight best platform visually', async () => {
      // BDD: Best platform should be visually distinct

      const InventoryPage = (await import('@/app/inventory/page')).default
      const { container } = render(<InventoryPage />)

      // Best platform should have distinct styling (green color, badge, etc.)
      const bestPlatformElement = screen.getByText(/CSFLOAT/i)
      const classes = bestPlatformElement.className
      expect(classes).toMatch(/green|best|highlight/i)
    })
  })

  describe('Multiple Items Display', () => {
    beforeEach(async () => {
      // Add second item (M4A4 | Asiimov)
      const m4a4Item = await prisma.item.create({
        data: {
          name: `test-m4a4-asiimov-${uniqueId()}`,
          display_name: 'M4A4 | Asiimov (Battle-Scarred)',
          search_name: 'm4a4 asiimov battle scarred',
          type: 'skin',
          weapon_type: 'rifle',
          image_url: 'https://community.akamai.steamstatic.com/economy/image/test-m4a4.png',
          rarity: 'covert',
          wear_min: 0.18,
          wear_max: 1.0
        }
      })

      await prisma.inventoryItem.create({
        data: {
          inventory_id: testInventoryId,
          item_id: m4a4Item.id,
          steam_asset_id: `test-asset-${uniqueId()}`,
          market_hash_name: 'M4A4 | Asiimov (Battle-Scarred)',
          wear: 'battle_scarred',
          quality: 'stattrak',
          current_value: 12.50,
          best_platform: 'buff163',
          float_value: 0.78
        }
      })

      // Update inventory total
      await prisma.userInventory.update({
        where: { id: testInventoryId },
        data: { total_items: 2, total_value: 21.17 }
      })
    })

    it('should display multiple items in grid layout', async () => {
      const InventoryPage = (await import('@/app/inventory/page')).default
      const { container } = render(<InventoryPage />)

      expect(screen.getByText(/AK-47 \| Redline/i)).toBeInTheDocument()
      expect(screen.getByText(/M4A4 \| Asiimov/i)).toBeInTheDocument()
    })

    it('should display StatTrak™ badge for StatTrak items', async () => {
      const InventoryPage = (await import('@/app/inventory/page')).default
      const { container } = render(<InventoryPage />)

      expect(screen.getByText(/StatTrak™/i)).toBeInTheDocument()
    })

    it('should use grid layout with responsive columns', async () => {
      const InventoryPage = (await import('@/app/inventory/page')).default
      const { container } = render(<InventoryPage />)

      // Grid container should have grid classes
      const gridContainer = container.querySelector('.grid')
      expect(gridContainer).toBeInTheDocument()
      const classes = gridContainer?.className || ''
      expect(classes).toMatch(/grid-cols/)
    })
  })

  describe('Empty State', () => {
    beforeEach(async () => {
      // Delete inventory items to test empty state
      await prisma.inventoryItem.deleteMany({
        where: { inventory_id: testInventoryId }
      })

      // Update inventory to 0 items
      await prisma.userInventory.update({
        where: { id: testInventoryId },
        data: { total_items: 0, total_value: 0 }
      })
    })

    it('should display empty state message when inventory has no items', async () => {
      const InventoryPage = (await import('@/app/inventory/page')).default
      const { container } = render(<InventoryPage />)

      expect(screen.getByText(/no items in your inventory/i)).toBeInTheDocument()
    })

    it('should show import button in empty state', async () => {
      const InventoryPage = (await import('@/app/inventory/page')).default
      const { container } = render(<InventoryPage />)

      expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument()
    })
  })

  describe('Rarity Display', () => {
    it('should display rarity badge with appropriate color', async () => {
      // BDD: Items should show rarity (Classified = pink/magenta)

      const InventoryPage = (await import('@/app/inventory/page')).default
      const { container } = render(<InventoryPage />)

      const rarityBadge = screen.getByText(/classified/i)
      expect(rarityBadge).toBeInTheDocument()
      // Rarity should have color styling (purple/pink for classified)
      const classes = rarityBadge.className
      expect(classes).toMatch(/purple|pink/i)
    })
  })
})
