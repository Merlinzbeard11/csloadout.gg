/**
 * Create Loadout Page (Server Component)
 *
 * Server-side rendered page for creating budget loadouts.
 * - Requires authentication
 * - Renders CreateLoadoutForm with user context
 * - Supports progressive enhancement (works without JavaScript)
 */

import { Metadata } from 'next'
import { requireAuth } from '@/lib/auth/session'
import { CreateLoadoutForm } from './create-loadout-form'
import { createLoadoutAction } from './actions'

export const metadata: Metadata = {
  title: 'Create Loadout - CSLoadout.gg',
  description: 'Create a budget-optimized CS2 loadout',
  robots: 'noindex, nofollow'
}

export default async function Page() {
  // Require authentication (redirects if not authenticated)
  const session = await requireAuth()

  return (
    <main
      aria-label="Create loadout form"
      className="min-h-screen bg-gray-50 py-8"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Skip Navigation Link */}
        <a
          href="#create-form"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Skip to form
        </a>

        {/* Page Heading */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Loadout</h1>
          <p className="mt-2 text-gray-600">
            Define your budget and allocation strategy to get personalized CS2 loadout recommendations.
          </p>
        </div>

        {/* Main Form */}
        <div
          id="create-form"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <CreateLoadoutForm
            userId={session.user.id}
            createLoadoutAction={createLoadoutAction}
          />
        </div>
      </div>
    </main>
  )
}
