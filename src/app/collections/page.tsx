/**
 * Collections Browse Page - /collections
 * BDD Reference: features/02-relational-browsing.feature
 *   - Browse all collections displayed as cards
 *   - Collections sorted by release date (newest first)
 *   - Responsive grid layout
 *
 * Implementation:
 *   - React Server Component (data fetching on server)
 *   - Fetch from GET /api/collections
 *   - Display using CollectionCard component
 *   - CSS Grid responsive layout (1/2/3/4 columns)
 */

import { Metadata } from 'next';
import CollectionCard, { Collection } from '@/components/CollectionCard';

export const metadata: Metadata = {
  title: 'CS2 Collections - Browse All Skin Collections | csloadout.gg',
  description:
    'Browse all CS2 skin collections. View item counts, release dates, and discover themed loadouts from Operation Riptide, Dreams & Nightmares, and more.',
};

interface CollectionsResponse {
  collections: Collection[];
  total: number;
}

async function getCollections(): Promise<CollectionsResponse> {
  try {
    // Fetch from internal API route
    // In production, this would use the actual domain
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/collections`, {
      // Revalidate every 1 hour (collections don't change often)
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch collections: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('[Collections Page] Fetch error:', error);
    // Return empty state on error
    return {
      collections: [],
      total: 0,
    };
  }
}

export default async function CollectionsPage() {
  const { collections, total } = await getCollections();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Browse CS2 Collections</h1>
          <p className="text-gray-400">
            Explore {total} CS2 skin collections. Discover themed loadouts and
            rare items.
          </p>
        </header>

        {/* Collections Grid */}
        {collections.length > 0 ? (
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {collections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          </section>
        ) : (
          /* Empty State */
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg mb-4">
              No collections found. Please try again later.
            </p>
          </div>
        )}

        {/* Total Count Footer */}
        {total > 0 && (
          <footer className="mt-8 text-center text-gray-500 text-sm">
            Showing {collections.length} of {total} collections
          </footer>
        )}
      </div>
    </main>
  );
}
