/**
 * Public Loadouts Gallery Page (Server Component)
 *
 * BDD Phase 7c: features/08-budget-loadout-builder-phase7.feature (lines 112-160)
 * Tests: __tests__/public-gallery.test.ts
 *
 * Responsibilities:
 * - Fetch public loadouts with filtering, sorting, and pagination
 * - Support budget range filters (min/max via searchParams)
 * - Support theme filtering
 * - Support sorting (upvotes, views, recent, budget)
 * - Paginate with 20 items per page
 * - Calculate total count for pagination controls
 * - Render gallery grid with loadout cards
 * - Handle empty states
 */

import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { LoadoutCard } from './loadout-card'
import { GalleryFilters } from './gallery-filters'
import { Pagination } from './pagination'

interface PageProps {
  searchParams: {
    page?: string
    budgetMin?: string
    budgetMax?: string
    theme?: string
    sort?: 'upvotes' | 'views' | 'recent' | 'budget_asc'
  }
}

export const metadata: Metadata = {
  title: 'Public Loadouts Gallery - CSLoadout.gg',
  description: 'Browse and discover CS2 budget loadouts created by the community. Filter by budget, theme, and sort by popularity.',
  robots: 'index, follow'
}

export default async function PublicLoadoutsGalleryPage({ searchParams }: PageProps) {
  // Parse search params
  const page = Math.max(1, parseInt(searchParams.page || '1', 10))
  const budgetMin = searchParams.budgetMin ? parseFloat(searchParams.budgetMin) : undefined
  const budgetMax = searchParams.budgetMax ? parseFloat(searchParams.budgetMax) : undefined
  const theme = searchParams.theme || undefined
  const sort = searchParams.sort || 'upvotes'

  const pageSize = 20

  // Build where clause
  const where: any = {
    is_public: true
  }

  // Budget range filter
  if (budgetMin !== undefined || budgetMax !== undefined) {
    where.budget = {}
    if (budgetMin !== undefined) where.budget.gte = budgetMin
    if (budgetMax !== undefined) where.budget.lte = budgetMax
  }

  // Theme filter
  if (theme && theme !== 'all') {
    where.theme = theme
  }

  // Determine sort order
  let orderBy: any = { upvotes: 'desc' } // Default sort

  switch (sort) {
    case 'upvotes':
      orderBy = { upvotes: 'desc' }
      break
    case 'views':
      orderBy = { views: 'desc' }
      break
    case 'recent':
      orderBy = { created_at: 'desc' }
      break
    case 'budget_asc':
      orderBy = { budget: 'asc' }
      break
    default:
      orderBy = { upvotes: 'desc' }
  }

  // Fetch loadouts with pagination
  const [loadouts, totalCount] = await Promise.all([
    prisma.loadout.findMany({
      where,
      orderBy,
      take: pageSize,
      skip: (page - 1) * pageSize,
      select: {
        id: true,
        name: true,
        theme: true,
        budget: true,
        upvotes: true,
        views: true,
        slug: true,
        user: {
          select: {
            persona_name: true,
            avatar: true
          }
        }
      }
    }),
    prisma.loadout.count({ where })
  ])

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <main className="min-h-screen bg-gray-50 py-8" aria-label="Public loadouts gallery">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Public Loadouts</h1>
          <p className="mt-2 text-gray-600">
            Browse {totalCount.toLocaleString()} community-created CS2 budget loadouts
          </p>
        </div>

        {/* Filters and Sorting */}
        <GalleryFilters
          currentBudgetMin={budgetMin}
          currentBudgetMax={budgetMax}
          currentTheme={theme}
          currentSort={sort}
        />

        {/* Results Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {loadouts.length === 0 ? 0 : (page - 1) * pageSize + 1} -{' '}
            {Math.min(page * pageSize, totalCount)} of {totalCount} loadouts
          </p>
        </div>

        {/* Empty State */}
        {loadouts.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No loadouts found</h2>
            <p className="text-gray-600 mb-6">
              Try adjusting your filters or browse all loadouts
            </p>
            <Link
              href="/loadouts"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Clear Filters
            </Link>
          </div>
        )}

        {/* Loadout Grid */}
        {loadouts.length > 0 && (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8"
            role="list"
            aria-label="Loadouts grid"
          >
            {loadouts.map(loadout => (
              <LoadoutCard
                key={loadout.id}
                loadout={{
                  id: loadout.id,
                  name: loadout.name,
                  theme: loadout.theme,
                  budget: Number(loadout.budget),
                  upvotes: loadout.upvotes,
                  views: loadout.views,
                  slug: loadout.slug!,
                  creatorName: loadout.user.persona_name,
                  creatorAvatar: loadout.user.avatar
                }}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            searchParams={searchParams}
          />
        )}
      </div>
    </main>
  )
}
