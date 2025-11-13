'use client'

/**
 * LoadoutCard Client Component
 *
 * BDD Phase 7c: features/08-budget-loadout-builder-phase7.feature (lines 119-126)
 *
 * Displays a loadout card in the gallery with:
 * - Name
 * - Theme
 * - Budget
 * - Upvotes count
 * - Views count
 * - Creator info
 * - Clickable link to loadout detail
 */

import Link from 'next/link'
import Image from 'next/image'

interface LoadoutCardProps {
  loadout: {
    id: string
    name: string
    theme: string | null
    budget: number
    upvotes: number
    views: number
    slug: string
    creatorName: string
    creatorAvatar: string
  }
}

export function LoadoutCard({ loadout }: LoadoutCardProps) {
  return (
    <Link
      href={`/loadouts/${loadout.slug}`}
      className="block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
      role="listitem"
    >
      {/* Thumbnail Placeholder */}
      <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <svg
          className="w-16 h-16 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>

      {/* Card Content */}
      <div className="p-4">
        {/* Name */}
        <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
          {loadout.name}
        </h3>

        {/* Theme Badge */}
        {loadout.theme && (
          <div className="mb-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {loadout.theme}
            </span>
          </div>
        )}

        {/* Budget */}
        <p className="text-2xl font-bold text-gray-900 mb-3">
          ${loadout.budget.toLocaleString()}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-3">
          {/* Upvotes */}
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
            </svg>
            <span>{loadout.upvotes.toLocaleString()}</span>
          </div>

          {/* Views */}
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <span>{loadout.views.toLocaleString()}</span>
          </div>
        </div>

        {/* Creator */}
        <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
          {loadout.creatorAvatar && loadout.creatorAvatar.startsWith('http') ? (
            <Image
              src={loadout.creatorAvatar}
              alt={loadout.creatorName}
              width={24}
              height={24}
              className="rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600">
              {loadout.creatorName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm text-gray-600">{loadout.creatorName}</span>
        </div>
      </div>
    </Link>
  )
}
