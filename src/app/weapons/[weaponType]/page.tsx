/**
 * Weapon Browse Page - /weapons/:weaponType
 * BDD Reference: features/02-relational-browsing.feature
 *   - View all skins for specific weapon
 *   - Skins sorted by rarity (highest first)
 *   - Show collection name for each variant
 *   - Handle weapon type normalization
 *
 * Implementation:
 *   - React Server Component (data fetching on server)
 *   - Dynamic route with generateStaticParams
 *   - Fetch from GET /api/weapons/:weaponType/items
 *   - Display items in grid using ItemCard
 *   - Handle 404 for invalid weapon types
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ItemCard from '@/components/ItemCard';

interface WeaponItem {
  id: string;
  name: string;
  displayName: string;
  searchName: string;
  rarity: string | null;
  type: string;
  weaponType: string | null;
  imageUrl: string;
  imageUrlFallback: string | null;
  collection: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface WeaponItemsResponse {
  weaponType: string;
  items: WeaponItem[];
  total: number;
}

// Common weapons to pre-render
const COMMON_WEAPONS = [
  'AK-47',
  'M4A4',
  'M4A1-S',
  'AWP',
  'Desert Eagle',
  'Glock-18',
  'USP-S',
  'Karambit',
  'Butterfly Knife',
  'Bayonet',
];

async function getWeaponItems(weaponType: string): Promise<WeaponItemsResponse | null> {
  try {
    // Decode and normalize weapon type from URL
    const decodedWeaponType = decodeURIComponent(weaponType);
    const normalizedWeaponType = decodedWeaponType.toUpperCase();

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/weapons/${encodeURIComponent(normalizedWeaponType)}/items`, {
      next: { revalidate: 3600 }, // Revalidate every 1 hour
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch weapon items: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('[Weapon Page] Fetch error:', error);
    return null;
  }
}

// Generate static paths for common weapons
export async function generateStaticParams() {
  return COMMON_WEAPONS.map((weaponType) => ({
    weaponType: weaponType.toLowerCase().replace(/\s+/g, '-'),
  }));
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: { weaponType: string };
}): Promise<Metadata> {
  const weaponData = await getWeaponItems(params.weaponType);

  if (!weaponData) {
    return {
      title: 'Weapon Not Found | csloadout.gg',
    };
  }

  return {
    title: `${weaponData.weaponType} Skins - CS2 | csloadout.gg`,
    description: `Browse all ${weaponData.total}+ ${weaponData.weaponType} skins and finishes. View rarity, collections, and find the perfect skin for your loadout.`,
  };
}

export default async function WeaponPage({
  params,
}: {
  params: { weaponType: string };
}) {
  const weaponData = await getWeaponItems(params.weaponType);

  if (!weaponData) {
    notFound();
  }

  // Group items by rarity for display
  const itemsByRarity: Record<string, WeaponItem[]> = {};
  weaponData.items.forEach((item) => {
    const rarity = item.rarity || 'unknown';
    if (!itemsByRarity[rarity]) {
      itemsByRarity[rarity] = [];
    }
    itemsByRarity[rarity].push(item);
  });

  // Rarity order for display
  const rarityOrder = [
    'contraband',
    'covert',
    'classified',
    'restricted',
    'milspec',
    'industrial',
    'consumer',
    'unknown',
  ];

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <header className="mb-8">
          <div className="flex items-baseline gap-3 mb-2">
            <h1 className="text-4xl font-bold">{weaponData.weaponType} Skins</h1>
            <span className="text-gray-500">
              ({weaponData.total} variant{weaponData.total !== 1 ? 's' : ''})
            </span>
          </div>
          <p className="text-gray-400">
            Browse all available skins and finishes for the {weaponData.weaponType}
          </p>
        </header>

        {/* Items Grid */}
        <section>
          {weaponData.items.length > 0 ? (
            <>
              {/* Show all items in single grid (already sorted by API) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {weaponData.items.map((item) => (
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

              {/* Show rarity distribution */}
              <div className="mt-8 p-4 bg-gray-900 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">
                  Rarity Distribution
                </h3>
                <div className="flex flex-wrap gap-4 text-sm">
                  {rarityOrder.map((rarity) => {
                    const count = itemsByRarity[rarity]?.length || 0;
                    if (count === 0) return null;

                    return (
                      <div key={rarity} className="flex items-center gap-2">
                        <span className="capitalize text-gray-300">{rarity}:</span>
                        <span className="text-orange-500 font-semibold">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg mb-4">
                No skins found for this weapon type.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
