/**
 * Collection Detail Page - /collections/:slug
 * BDD Reference: features/02-relational-browsing.feature
 *   - View collection detail with items
 *   - Items sorted by rarity (highest first)
 *   - Collection header (name, description, item count)
 *   - Total collection value
 *   - Discontinued collections badge
 *
 * Implementation:
 *   - React Server Component (data fetching on server)
 *   - Dynamic route with generateStaticParams
 *   - Fetch from GET /api/collections/:slug
 *   - Display items in grid using ItemCard
 *   - Handle 404 and redirects
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ItemCard from '@/components/ItemCard';

interface CollectionItem {
  id: string;
  name: string;
  displayName: string;
  searchName: string;
  rarity: string | null;
  type: string;
  imageUrl: string;
  imageUrlFallback: string | null;
  weaponType: string | null;
  collection?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface CollectionDetailResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string;
  releaseDate: string;
  isDiscontinued: boolean;
  discontinuedDate: string | null;
  items: CollectionItem[];
  totalValue: number;
  itemCount: number;
}

async function getCollection(slug: string): Promise<CollectionDetailResponse | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/collections/${slug}`, {
      next: { revalidate: 3600 }, // Revalidate every 1 hour
    });

    // Handle redirects (301 from previous_slugs)
    if (res.redirected) {
      // Extract new slug from redirected URL
      const redirectUrl = new URL(res.url);
      const newSlug = redirectUrl.pathname.split('/').pop();
      if (newSlug && newSlug !== slug) {
        // Re-fetch with new slug
        return getCollection(newSlug);
      }
    }

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch collection: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('[Collection Detail] Fetch error:', error);
    return null;
  }
}

// Generate static paths for all collections
export async function generateStaticParams() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/collections`);

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return data.collections.map((collection: { slug: string }) => ({
      slug: collection.slug,
    }));
  } catch (error) {
    console.error('[generateStaticParams] Error:', error);
    return [];
  }
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const collection = await getCollection(params.slug);

  if (!collection) {
    return {
      title: 'Collection Not Found | csloadout.gg',
    };
  }

  return {
    title: `${collection.name} - CS2 Skins | csloadout.gg`,
    description: collection.description || `Browse all ${collection.itemCount} items from ${collection.name}. View skins, rarity, and collection details.`,
  };
}

export default async function CollectionDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const collection = await getCollection(params.slug);

  if (!collection) {
    notFound();
  }

  const releaseDate = new Date(collection.releaseDate);
  const discontinuedDate = collection.discontinuedDate
    ? new Date(collection.discontinuedDate)
    : null;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Collection Header */}
        <header className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">{collection.name}</h1>
              {collection.description && (
                <p className="text-gray-400 text-lg">{collection.description}</p>
              )}
            </div>

            {/* Discontinued Badge */}
            {collection.isDiscontinued && (
              <div className="bg-red-600 text-white px-4 py-2 rounded-lg">
                <div className="font-semibold">No Longer Drops</div>
                {discontinuedDate && (
                  <div className="text-xs text-red-100">
                    Since {discontinuedDate.toLocaleDateString()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Collection Metadata */}
          <div className="flex gap-6 text-sm text-gray-400">
            <div>
              <span className="text-orange-500 font-semibold">
                {collection.itemCount}
              </span>{' '}
              items
            </div>
            <div>
              Released{' '}
              <time dateTime={collection.releaseDate}>
                {releaseDate.toLocaleDateString()}
              </time>
            </div>
            {collection.totalValue > 0 && (
              <div>
                Total Value:{' '}
                <span className="text-green-500 font-semibold">
                  ${collection.totalValue.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Items Grid */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">
            Collection Items ({collection.items.length})
          </h2>

          {collection.items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {collection.items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={{
                    id: item.id,
                    name: item.name,
                    display_name: item.displayName,
                    rarity: item.rarity,
                    type: item.type,
                    image_url: item.imageUrl,
                    image_url_fallback: item.imageUrlFallback,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-400">
                This collection has no items yet.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
