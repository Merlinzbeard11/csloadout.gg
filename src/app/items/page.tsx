/**
 * Browse Items Page (/items)
 *
 * BDD Reference: features/01-item-database.feature:11-30
 *   - Browse all items with pagination (50 per page)
 *   - Search with fuzzy matching (PostgreSQL trigram)
 *   - Item cards with image, name, rarity
 *   - Lazy loading images (via ItemCard)
 *   - Pagination controls
 *
 * Implementation:
 * - React Server Component (async, server-side data fetching)
 * - Fetches from GET /api/items with pagination + search
 * - SearchBox client component for interactive search
 * - Responsive grid layout (2 cols mobile → 5 cols desktop)
 * - ItemCard component for display
 * - URL-based pagination and search via searchParams
 */

import { Metadata } from 'next';
import ItemCard from '@/components/ItemCard';
import SearchBox from '@/components/SearchBox';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Browse CS2 Items | csloadout.gg',
  description: 'Browse and search Counter-Strike 2 items including skins, stickers, agents, and more with fuzzy matching.',
};

interface ItemsPageProps {
  searchParams?: {
    q?: string;
    page?: string;
    pageSize?: string;
  };
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
  // Parse pagination params with defaults
  const page = parseInt(searchParams?.page || '1', 10);
  const pageSize = parseInt(searchParams?.pageSize || '50', 10);
  const searchQuery = searchParams?.q?.trim() || undefined;

  // Fetch items from API
  const data = await fetchItems(page, pageSize, searchQuery);

  // Error state
  if (!data) {
    return (
      <div className="min-h-screen bg-cs2-darker text-cs2-light">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">Browse CS2 Items</h1>
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

  // Helper function to build pagination URLs
  const buildPaginationUrl = (pageNum: number) => {
    const params = new URLSearchParams();
    params.set('page', pageNum.toString());
    params.set('pageSize', pageSize.toString());
    if (searchQuery) {
      params.set('q', searchQuery);
    }
    return `/items?${params.toString()}`;
  };

  // Empty state
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-cs2-darker text-cs2-light">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">Browse CS2 Items</h1>
          <div className="bg-cs2-dark border border-cs2-blue/20 rounded-lg p-8 text-center">
            <p className="text-cs2-light/60">No items found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cs2-darker text-cs2-light">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">
            {searchQuery ? 'Search CS2 Items' : 'Browse CS2 Items'}
          </h1>
          <p className="text-cs2-light/60">
            {searchQuery ? (
              <>
                Search results for "{searchQuery}" - {total.toLocaleString()} {total === 1 ? 'item' : 'items'} found
              </>
            ) : (
              <>
                Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, total)} of {total.toLocaleString()} items
              </>
            )}
          </p>
        </div>

        {/* Search Box */}
        <SearchBox />

        {/* Item Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            {/* Previous Button */}
            {page > 1 ? (
              <Link
                href={buildPaginationUrl(page - 1)}
                className="px-4 py-2 bg-cs2-dark border border-cs2-blue/20 rounded-lg hover:border-cs2-blue/50 transition-colors"
              >
                Previous
              </Link>
            ) : (
              <button
                disabled
                className="px-4 py-2 bg-cs2-dark border border-cs2-blue/10 rounded-lg text-cs2-light/30 cursor-not-allowed"
              >
                Previous
              </button>
            )}

            {/* Page Numbers */}
            <div className="flex gap-2">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                // Show first page, last page, current page, and 2 pages around current
                let pageNum: number;

                if (totalPages <= 7) {
                  // Show all pages
                  pageNum = i + 1;
                } else if (page <= 4) {
                  // Near start
                  pageNum = i + 1;
                } else if (page >= totalPages - 3) {
                  // Near end
                  pageNum = totalPages - 6 + i;
                } else {
                  // Middle
                  pageNum = page - 3 + i;
                }

                const isCurrentPage = pageNum === page;

                return (
                  <Link
                    key={pageNum}
                    href={buildPaginationUrl(pageNum)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      isCurrentPage
                        ? 'bg-cs2-blue text-white'
                        : 'bg-cs2-dark border border-cs2-blue/20 hover:border-cs2-blue/50'
                    }`}
                  >
                    {pageNum}
                  </Link>
                );
              })}
            </div>

            {/* Next Button */}
            {page < totalPages ? (
              <Link
                href={buildPaginationUrl(page + 1)}
                className="px-4 py-2 bg-cs2-dark border border-cs2-blue/20 rounded-lg hover:border-cs2-blue/50 transition-colors"
              >
                Next
              </Link>
            ) : (
              <button
                disabled
                className="px-4 py-2 bg-cs2-dark border border-cs2-blue/10 rounded-lg text-cs2-light/30 cursor-not-allowed"
              >
                Next
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
