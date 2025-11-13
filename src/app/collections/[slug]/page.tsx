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
import { Suspense } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/breadcrumb';
import { ItemCard } from '@/components/item-card';
import { CollectionSkeleton } from '@/components/collection-skeleton';

// Force dynamic rendering (fetches from API with dynamic route parameter)
export const dynamic = 'force-dynamic';

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
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
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
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
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

async function CollectionContent({ slug }: { slug: string }) {
  const collection = await getCollection(slug);

  if (!collection) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <h2 className="text-2xl font-bold text-cs2-light mb-2">Collection not found</h2>
        <p className="text-cs2-light/60 mb-6">The collection you're looking for doesn't exist.</p>
        <Link
          href="/collections"
          className="bg-cs2-blue hover:bg-cs2-blue/80 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Back to Collections
        </Link>
      </div>
    );
  }

  if (collection.items.length === 0) {
    return (
      <>
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Collections", href: "/collections" },
            { label: collection.name },
          ]}
        />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-cs2-light mb-2">{collection.name}</h1>
          {collection.description && <p className="text-cs2-light/60 mb-2">{collection.description}</p>}
        </div>

        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <p className="text-cs2-light/60 text-lg">This collection has no items yet.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Collections", href: "/collections" },
          { label: collection.name },
        ]}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cs2-light mb-2">{collection.name}</h1>
        {collection.description && <p className="text-cs2-light/60 mb-2">{collection.description}</p>}
        <p className="text-cs2-light/60">
          {collection.items.length} {collection.items.length === 1 ? 'item' : 'items'} in this collection
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
    </>
  );
}

export default async function CollectionDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <main className="min-h-screen bg-cs2-darker p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <Suspense fallback={<CollectionSkeleton />}>
          <CollectionContent slug={params.slug} />
        </Suspense>
      </div>
    </main>
  );
}
