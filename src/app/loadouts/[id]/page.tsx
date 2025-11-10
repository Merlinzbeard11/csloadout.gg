/**
 * Loadout Detail Page (Server Component)
 *
 * BDD Phase 6: features/08-budget-loadout-builder-phase6.feature
 * BDD Phase 7b: features/08-budget-loadout-builder-phase7.feature (lines 62-100)
 * Tests: __tests__/loadout-detail-page.test.tsx, __tests__/public-viewing.test.tsx
 *
 * Responsibilities:
 * - Support BOTH UUID and slug routing
 * - Fetch loadout by ID (UUID) OR slug (public only)
 * - Optional authentication (public loadouts viewable by anyone)
 * - Fetch selected items (LoadoutWeaponSkin with Item + Prices)
 * - Calculate budget summary (total, spent, remaining)
 * - Calculate category budgets from custom_allocation
 * - Render client components (ItemBrowser, BudgetTracker, SelectedItemsList)
 * - Show edit controls for owner, read-only for others
 * - Handle 404 (loadout not found or private accessed by slug)
 */

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { ItemBrowser } from './item-browser'
import { BudgetTracker } from './budget-tracker'
import { SelectedItemsList } from './selected-items-list'
import { UpvoteButton } from './upvote-button'
import { addItemToLoadoutAction, removeItemFromLoadoutAction, replaceItemAction } from './actions'
import { checkUserUpvotedAction } from './upvote-actions'
import { trackLoadoutViewAction } from './view-tracking-actions'

interface PageProps {
  params: { id: string }
  searchParams: { category?: string; page?: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // Detect UUID vs slug
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)

  const loadout = await prisma.loadout.findFirst({
    where: isUUID
      ? { id: params.id }
      : { slug: params.id, is_public: true },
    select: {
      id: true,
      name: true,
      description: true,
      budget: true,
      is_public: true,
      slug: true,
      created_at: true,
      updated_at: true,
      upvotes: true,
      views: true
    }
  })

  if (!loadout) {
    return {
      title: 'Loadout Not Found - CSLoadout.gg'
    }
  }

  // Truncate description to 160 characters for optimal SEO
  const metaDescription = loadout.description
    ? (loadout.description.length > 160
        ? loadout.description.slice(0, 157) + '...'
        : loadout.description)
    : `View and customize this CS2 loadout: ${loadout.name}. Budget: $${Number(loadout.budget).toFixed(2)}`

  // Use slug for canonical URL (preferred over UUID)
  const canonicalSlug = loadout.slug || params.id

  // Base metadata (always present)
  const baseMetadata: Metadata = {
    title: `${loadout.name} - CSLoadout.gg`,
    description: metaDescription,
    robots: loadout.is_public ? 'index, follow' : 'noindex, nofollow'
  }

  // Enhanced metadata for public loadouts only (Phase 7f)
  if (loadout.is_public) {
    return {
      ...baseMetadata,
      openGraph: {
        title: loadout.name,
        description: metaDescription,
        type: 'website',
        url: `/loadouts/${canonicalSlug}`,
        siteName: 'CSLoadout.gg',
        images: [
          {
            url: `/api/og-image/${loadout.id}`,
            width: 1200,
            height: 630,
            alt: `${loadout.name} - CSLoadout.gg`
          }
        ]
      },
      // Twitter Card auto-inherits from openGraph (no duplication needed)
      twitter: {
        card: 'summary_large_image',
        creator: '@csloadoutgg'
      },
      // Canonical URL for SEO consolidation
      alternates: {
        canonical: `/loadouts/${canonicalSlug}`
      },
      // Structured data for rich snippets
      other: {
        'script:ld+json': JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: loadout.name,
          description: metaDescription,
          url: `https://csloadout.gg/loadouts/${canonicalSlug}`,
          datePublished: loadout.created_at.toISOString(),
          dateModified: loadout.updated_at.toISOString(),
          author: {
            '@type': 'Organization',
            name: 'CSLoadout.gg'
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: loadout.upvotes,
            reviewCount: loadout.upvotes,
            bestRating: loadout.upvotes,
            worstRating: 0
          },
          interactionStatistic: [
            {
              '@type': 'InteractionCounter',
              interactionType: 'https://schema.org/LikeAction',
              userInteractionCount: loadout.upvotes
            },
            {
              '@type': 'InteractionCounter',
              interactionType: 'https://schema.org/ViewAction',
              userInteractionCount: loadout.views
            }
          ]
        })
      }
    }
  }

  return baseMetadata
}

export default async function LoadoutDetailPage({ params, searchParams }: PageProps) {
  // Optional authentication (public loadouts don't require auth)
  const session = await getSession()

  // Detect UUID vs slug
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)

  // Fetch loadout with selected items
  const loadout = await prisma.loadout.findFirst({
    where: isUUID
      ? { id: params.id }
      : { slug: params.id, is_public: true }, // Slug access requires is_public
    include: {
      weapon_skins: {
        include: {
          item: {
            include: {
              marketplace_prices: {
                orderBy: {
                  total_cost: 'asc' // Cheapest first
                }
              }
            }
          }
        }
      }
    }
  })

  // Handle 404 (loadout not found or private accessed by slug)
  if (!loadout) {
    notFound()
  }

  // Determine if user is owner
  const isOwner = session?.user?.id === loadout.user_id

  // Authorization for private loadouts accessed by UUID
  if (!loadout.is_public && !isOwner) {
    return (
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-900 mb-2">Unauthorized</h1>
            <p className="text-red-700">You do not have permission to view this loadout.</p>
          </div>
        </div>
      </main>
    )
  }

  // Calculate budget summary
  const totalBudget = Number(loadout.budget)
  const spent = Number(loadout.actual_cost)
  const remaining = totalBudget - spent

  // Parse custom allocation (JSONB)
  const allocation = (loadout.custom_allocation as any) || {
    weapon_skins: 70.00,
    knife: 15.00,
    gloves: 10.00,
    agents: 3.00,
    music_kit: 2.00,
    charms: 0.00
  }

  // Calculate category budgets
  const categoryBudgets = {
    weapon_skins: (totalBudget * allocation.weapon_skins) / 100,
    knife: (totalBudget * allocation.knife) / 100,
    gloves: (totalBudget * allocation.gloves) / 100,
    agents: (totalBudget * allocation.agents) / 100,
    music_kit: (totalBudget * allocation.music_kit) / 100,
    charms: (totalBudget * allocation.charms) / 100
  }

  // Calculate spent per category
  const categorySpent = loadout.weapon_skins.reduce((acc, lwsk) => {
    const category = getCategoryFromWeaponType(lwsk.weapon_type)
    const price = lwsk.item.marketplace_prices[0]?.total_cost || 0
    acc[category] = (acc[category] || 0) + Number(price)
    return acc
  }, {} as Record<string, number>)

  // Default category from query params
  const currentCategory = (searchParams.category || 'weapon_skins') as keyof typeof categoryBudgets

  // Transform selected items for client component
  const selectedItems = loadout.weapon_skins.map(lwsk => ({
    id: lwsk.id,
    item_id: lwsk.item_id,
    weapon_type: lwsk.weapon_type,
    category: getCategoryFromWeaponType(lwsk.weapon_type),
    item: {
      name: lwsk.item.name,
      display_name: lwsk.item.display_name,
      image_url: lwsk.item.image_url,
      quality: lwsk.item.quality,
      wear: lwsk.item.wear,
      rarity: lwsk.item.rarity
    },
    price: Number(lwsk.item.marketplace_prices[0]?.total_cost || 0)
  }))

  // Fetch items for current category with marketplace prices
  const categoryItems = await fetchItemsForCategory(currentCategory, categoryBudgets[currentCategory])

  // Check if user has upvoted this loadout (Phase 7d)
  const userUpvoted = session?.user?.id
    ? await checkUserUpvotedAction(loadout.id, session.user.id)
    : false

  // Track view for public loadouts (Phase 7e)
  // Non-blocking: track view in background, don't wait for result
  if (loadout.is_public) {
    // Fire and forget - don't await to avoid blocking page render
    trackLoadoutViewAction(loadout.id).catch(err => {
      console.error('Failed to track view:', err)
    })
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8" aria-label="Loadout detail page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{loadout.name}</h1>
            {!isOwner && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                View Only
              </span>
            )}
          </div>
          {loadout.description && (
            <p className="mt-2 text-gray-600">{loadout.description}</p>
          )}

          {/* Stats Row - Phase 7d & 7e */}
          {loadout.is_public && (
            <div className="mt-4 flex items-center gap-4">
              {/* Upvote Button */}
              <UpvoteButton
                loadoutId={loadout.id}
                userId={session?.user?.id || null}
                isOwner={isOwner}
                initialUpvoted={userUpvoted}
                initialCount={loadout.upvotes}
              />

              {/* View Count - Phase 7e */}
              <div className="flex items-center gap-2 text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="font-medium">{loadout.views.toLocaleString()}</span>
                <span className="text-sm">views</span>
              </div>
            </div>
          )}
        </div>

        {/* Budget Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Budget Summary</h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900">${totalBudget.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Spent</p>
              <p className="text-2xl font-bold text-blue-600">${spent.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Remaining</p>
              <p className="text-2xl font-bold text-green-600">${remaining.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px" aria-label="Category tabs">
              {(Object.keys(categoryBudgets) as Array<keyof typeof categoryBudgets>).map(category => {
                const budget = categoryBudgets[category]
                const categorySpentAmount = categorySpent[category] || 0
                const isActive = category === currentCategory

                if (budget === 0) return null // Skip zero-budget categories

                return (
                  <a
                    key={category}
                    href={`?category=${category}`}
                    className={`
                      px-6 py-4 text-sm font-medium border-b-2 transition-colors
                      ${isActive
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <span>{formatCategoryName(category)}</span>
                      <span className="text-xs text-gray-500">
                        {allocation[category].toFixed(0)}% (${budget.toFixed(2)})
                      </span>
                    </div>
                  </a>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Item Browser (2/3 width) - Owner only */}
          {isOwner && (
            <div className="lg:col-span-2">
              <ItemBrowser
                category={currentCategory}
                categoryBudget={categoryBudgets[currentCategory]}
                remainingBudget={categoryBudgets[currentCategory] - (categorySpent[currentCategory] || 0)}
                selectedItems={selectedItems.map(item => item.item_id)}
                onItemSelect={addItemToLoadoutAction}
                items={categoryItems}
                loadoutId={params.id}
              />
            </div>
          )}

          {/* Sidebar (full width for non-owners, 1/3 for owners) */}
          <div className={isOwner ? 'space-y-6' : 'lg:col-span-3 space-y-6'}>
            {/* Budget Tracker */}
            <BudgetTracker
              totalBudget={totalBudget}
              allocation={allocation}
              selectedItems={selectedItems}
            />

            {/* Selected Items List */}
            <SelectedItemsList
              selectedItems={selectedItems}
              onRemove={isOwner ? removeItemFromLoadoutAction : async () => {}}
              onChange={isOwner ? replaceItemAction : async () => {}}
            />
          </div>
        </div>
      </div>
    </main>
  )
}

/**
 * Helper: Determine category from weapon_type
 */
function getCategoryFromWeaponType(weaponType: string): string {
  if (weaponType === 'Knife') return 'knife'
  if (weaponType === 'Gloves') return 'gloves'
  if (weaponType.startsWith('Agent')) return 'agents'
  if (weaponType === 'Music Kit') return 'music_kit'
  if (weaponType === 'Charm') return 'charms'
  return 'weapon_skins'
}

/**
 * Helper: Fetch items for category with marketplace prices
 */
async function fetchItemsForCategory(category: string, maxBudget: number) {
  // Map category to Item filters
  const where: any = {}

  if (category === 'knife') {
    where.weapon_type = 'Knife'
  } else if (category === 'gloves') {
    where.weapon_type = 'Gloves'
  } else if (category === 'agents') {
    where.weapon_type = { startsWith: 'Agent' }
  } else if (category === 'music_kit') {
    where.weapon_type = 'Music Kit'
  } else if (category === 'charms') {
    where.weapon_type = 'Charm'
  } else if (category === 'weapon_skins') {
    // Weapon skins: exclude special categories
    where.weapon_type = {
      notIn: ['Knife', 'Gloves', 'Music Kit', 'Charm'],
      not: { startsWith: 'Agent' }
    }
  }

  // Fetch items with marketplace prices
  const items = await prisma.item.findMany({
    where,
    include: {
      marketplace_prices: {
        orderBy: { total_cost: 'asc' },
        take: 3 // Get top 3 cheapest prices
      }
    },
    orderBy: [
      { rarity: 'desc' },
      { name: 'asc' }
    ],
    take: 200 // Limit to 200 items per category for performance
  })

  // Filter items within budget (at least have one price <= maxBudget * 1.5)
  // Allow 150% of budget to show near-budget options
  const affordableItems = items.filter(item => {
    const cheapestPrice = item.marketplace_prices[0]?.total_cost
    return cheapestPrice && Number(cheapestPrice) <= maxBudget * 1.5
  })

  return affordableItems
}

/**
 * Helper: Format category name for display
 */
function formatCategoryName(category: string): string {
  const names: Record<string, string> = {
    weapon_skins: 'Weapon Skins',
    knife: 'Knife',
    gloves: 'Gloves',
    agents: 'Agents',
    music_kit: 'Music Kit',
    charms: 'Charms'
  }
  return names[category] || category
}
