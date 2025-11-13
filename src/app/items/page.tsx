/**
 * Browse Items Page (/items)
 *
 * BDD Reference: features/01-item-database.feature:11-30
 *   - Browse all items with pagination (50 per page)
 *   - Search with fuzzy matching (PostgreSQL trigram)
 *   - Item cards with image, name, rarity
 *   - Lazy loading images (via ItemGrid)
 *   - Pagination controls
 *
 * Implementation:
 * - React Server Component (async, server-side data fetching)
 * - Fetches from GET /api/items with pagination + search
 * - SearchBox client component for interactive search
 * - Responsive grid layout (2 cols mobile → 5 cols desktop)
 * - ItemGrid component for display
 * - URL-based pagination and search via searchParams
 */

import { Metadata } from 'next';
import { ItemGrid } from '@/components/item-grid';
import { SearchBox } from '@/components/search-box';
import { Pagination } from '@/components/pagination';
import Link from 'next/link';

// Force dynamic rendering (fetches from API with cache: 'no-store')
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Browse CS2 Items | csloadout.gg',
  description: 'Browse and search Counter-Strike 2 items including skins, stickers, agents, and more with fuzzy matching.',
};

interface ItemsPageProps {
  searchParams?: Promise<{
    q?: string;
    page?: string;
    pageSize?: string;
  }>;
}

interface Item {
  id: string;
  name: string;
  display_name: string;
  rarity: string | null;
  type: string;
  image_url: string;
  image_url_fallback?: string | null;
}

interface ItemsResponse {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Fetch items from API
 * Server-side fetch with error handling
 * Supports search query for fuzzy matching
 */
async function fetchItems(page: number, pageSize: number, searchQuery?: string): Promise<ItemsResponse | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    if (searchQuery) {
      params.set('q', searchQuery);
    }

    const url = `${baseUrl}/api/items?${params.toString()}`;

    const response = await fetch(url, {
      cache: 'no-store', // Disable caching for fresh data
    });

    if (!response.ok) {
      console.error('[Browse Page] API error:', response.status);
      return null;
    }

    const data: ItemsResponse = await response.json();
    return data;
  } catch (error) {
    console.error('[Browse Page] Fetch failed:', error);
    return null;
  }
}

/**
 * Browse Items Page Component
 * Server Component with async data fetching
 */
export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  // Await searchParams in Next.js 15+
  const params = searchParams ? await searchParams : {};

  // Parse pagination params with defaults
  const page = parseInt(params?.page || '1', 10);
  const pageSize = parseInt(params?.pageSize || '50', 10);
  const searchQuery = params?.q?.trim() || undefined;

  // Fetch items from API
  const data = await fetchItems(page, pageSize, searchQuery);

  // Error state
  if (!data) {
    return (
      <div className="min-h-screen bg-cs2-darker text-cs2-light">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold mb-6">Browse CS2 Items</h1>
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 text-center">
            <p className="text-red-400 mb-4">Failed to load items. Please try again.</p>
            <Link
              href="/items"
              className="inline-block bg-cs2-blue hover:bg-cs2-blue/80 px-6 py-2 rounded-lg transition-colors"
            >
              Try Again
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { items, total, totalPages } = data;
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="min-h-screen bg-cs2-darker text-cs2-light">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            {searchQuery ? 'Search CS2 Items' : 'Browse CS2 Items'}
          </h1>
          {searchQuery ? (
            <p className="text-cs2-light/70">
              Search results for &apos;{searchQuery}&apos; - {total.toLocaleString()}{' '}
              {total === 1 ? 'item' : 'items'} found
            </p>
          ) : (
            <p className="text-cs2-light/70">
              Showing {startItem.toLocaleString()}-{endItem.toLocaleString()} of{' '}
              {total.toLocaleString()} items
            </p>
          )}
        </div>

        {/* Search Box */}
        <div className="mb-8">
          <SearchBox defaultValue={searchQuery} />
        </div>

        {/* Content */}
        {items.length === 0 ? (
          <div className="bg-cs2-dark border border-cs2-blue/20 rounded-lg p-12 text-center">
            <h2 className="text-2xl font-semibold mb-2">No items found</h2>
            <p className="text-cs2-light/70 mb-4">Try adjusting your search or browse all items</p>
            <Link
              href="/items"
              className="inline-block bg-cs2-blue hover:bg-cs2-blue/80 text-white px-6 py-2 rounded-lg transition-colors"
            >
              View All Items
            </Link>
          </div>
        ) : (
          <>
            <ItemGrid items={items} />
            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination currentPage={page} totalPages={totalPages} query={searchQuery} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
