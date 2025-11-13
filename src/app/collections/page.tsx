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

// Force dynamic rendering (fetches from API during render)
export const dynamic = 'force-dynamic';

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
    <main className="min-h-screen bg-cs2-darker text-cs2-light">
      <div className="container mx-auto px-4 py-12">
        {/* Page Header */}
        <header className="mb-12 space-y-2">
          <h1 className="text-4xl font-bold">Browse CS2 Collections</h1>
          <p className="text-cs2-light/60 text-lg">
            Explore item collections from CS2 cases and operations
          </p>
        </header>

        {/* Collections Grid */}
        {collections.length > 0 ? (
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          </section>
        ) : (
          /* Empty State */
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-cs2-light/60 text-center">No collections found.</p>
          </div>
        )}

        {/* Total Count Footer */}
        {total > 0 && (
          <footer className="mt-8 text-center text-cs2-light/50 text-sm">
            Showing {collections.length} of {total} collections
          </footer>
        )}
      </div>
    </main>
  );
}
