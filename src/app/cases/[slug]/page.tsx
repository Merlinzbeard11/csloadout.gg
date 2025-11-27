/**
 * Case Contents Page - /cases/:slug
 * BDD Reference: features/02-relational-browsing.feature
 *   - View case contents with probabilities
 *   - Items grouped by rarity
 *   - Special items highlighted
 *   - Calculate expected value
 *   - Validate probabilities sum to 100%
 *
 * Implementation:
 *   - React Server Component (data fetching on server)
 *   - Dynamic route with generateStaticParams
 *   - Fetch from GET /api/cases/:slug
 *   - Display items in grid using ItemCard
 *   - Handle 404 for nonexistent cases
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GroupedItemCard } from '@/components/grouped-item-card';

// Force dynamic rendering (fetches from API with dynamic route parameter)
export const dynamic = 'force-dynamic';

interface Variant {
  id: string;
  name: string;
  displayName: string | null;
  variantType: 'normal' | 'stattrak' | 'souvenir';
  wear: string | null;
  imageUrl: string;
  imageUrlFallback: string | null;
  dropProbability: number;
}

interface GroupedCaseItem {
  baseName: string;
  slug: string;
  rarity: string | null;
  type: string;
  weaponType: string | null;
  imageUrl: string;
  imageUrlFallback: string | null;
  isSpecialItem: boolean;
  dropProbability: number;
  variantCount: number;
  hasStatTrak: boolean;
  hasSouvenir: boolean;
  variants: Variant[];
}

interface CaseDetailResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string;
  keyPrice: number;
  releaseDate: string;
  items: GroupedCaseItem[];
  itemCount: number;
  totalVariants: number;
  expectedValue: number;
  probabilityValid: boolean;
  totalProbability: number;
}

// Popular cases to pre-render
const POPULAR_CASES = [
  'clutch-case',
  'horizon-case',
  'danger-zone-case',
  'prisma-case',
  'spectrum-case',
];

async function getCaseDetail(slug: string): Promise<CaseDetailResponse | null> {
  try {
    // Server Component - use NEXTAUTH_URL (server-side only, more secure)
    const baseUrl = process.env.NEXTAUTH_URL ||
                    process.env.NEXT_PUBLIC_APP_URL ||
                    'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/cases/${slug}`, {
      next: { revalidate: 3600 }, // Revalidate every 1 hour
    });

    // Handle redirects (301 from previous_slugs)
    if (res.redirected) {
      // Extract new slug from redirected URL
      const redirectUrl = new URL(res.url);
      const newSlug = redirectUrl.pathname.split('/').pop();
      if (newSlug && newSlug !== slug) {
        // Re-fetch with new slug
        return getCaseDetail(newSlug);
      }
    }

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch case: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('[Case Detail] Fetch error:', error);
    return null;
  }
}

// Generate static paths for popular cases
export async function generateStaticParams() {
  return POPULAR_CASES.map((slug) => ({
    slug,
  }));
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const caseData = await getCaseDetail(params.slug);

  if (!caseData) {
    return {
      title: 'Case Not Found | csloadout.gg',
    };
  }

  return {
    title: `${caseData.name} - CS2 Case Contents | csloadout.gg`,
    description: `View all ${caseData.itemCount} items from ${caseData.name}. See drop probabilities, rarity distribution, and expected value.`,
  };
}

export default async function CaseDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const caseData = await getCaseDetail(params.slug);

  if (!caseData) {
    notFound();
  }

  const releaseDate = new Date(caseData.releaseDate);

  // Group items by rarity for display
  const itemsByRarity: Record<string, GroupedCaseItem[]> = {};
  caseData.items.forEach((item) => {
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

  // Count special items
  const specialItemCount = caseData.items.filter(
    (item) => item.isSpecialItem
  ).length;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Case Header */}
        <header className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">{caseData.name}</h1>
              {caseData.description && (
                <p className="text-gray-400 text-lg">{caseData.description}</p>
              )}
            </div>
          </div>

          {/* Case Metadata */}
          <div className="flex gap-6 text-sm text-gray-400 mb-4">
            <div>
              <span className="text-orange-500 font-semibold">
                {caseData.itemCount}
              </span>{' '}
              items
            </div>
            <div>
              Key Price:{' '}
              <span className="text-green-500 font-semibold">
                ${caseData.keyPrice.toFixed(2)}
              </span>
            </div>
            <div>
              Released{' '}
              <time dateTime={caseData.releaseDate}>
                {releaseDate.toLocaleDateString()}
              </time>
            </div>
            {specialItemCount > 0 && (
              <div>
                <span className="text-yellow-500 font-semibold">
                  {specialItemCount}
                </span>{' '}
                rare special item{specialItemCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Expected Value & Probability Validation */}
          <div className="flex gap-6 text-sm">
            <div className="bg-gray-900 px-4 py-2 rounded-lg">
              <div className="text-gray-400 text-xs mb-1">Expected Value</div>
              <div className="text-green-500 font-bold text-lg">
                ${caseData.expectedValue.toFixed(2)}
              </div>
            </div>

            <div
              className={`px-4 py-2 rounded-lg ${
                caseData.probabilityValid
                  ? 'bg-green-900/20 border border-green-500'
                  : 'bg-red-900/20 border border-red-500'
              }`}
            >
              <div className="text-gray-400 text-xs mb-1">
                Probability Check
              </div>
              <div
                className={`font-semibold ${
                  caseData.probabilityValid ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {caseData.probabilityValid
                  ? `Valid (${caseData.totalProbability.toFixed(2)}%)`
                  : `Invalid (${caseData.totalProbability.toFixed(2)}%)`}
              </div>
            </div>
          </div>

          {/* Warning if probabilities invalid */}
          {!caseData.probabilityValid && (
            <div className="mt-4 bg-red-900/20 border border-red-500 rounded-lg p-4">
              <p className="text-red-400 font-semibold">
                ⚠️ Warning: Drop probabilities do not sum to 100%
              </p>
              <p className="text-red-300 text-sm mt-1">
                The total probability is {caseData.totalProbability.toFixed(4)}%
                (expected 100.00%). This data may be incorrect.
              </p>
            </div>
          )}
        </header>

        {/* Items Grid */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">
            Case Contents ({caseData.itemCount} skins, {caseData.totalVariants} variants)
          </h2>

          {caseData.items.length > 0 ? (
            <>
              {/* Show all items in single grid (already sorted by rarity from API) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {caseData.items.map((item) => (
                  <GroupedItemCard
                    key={item.baseName}
                    item={item}
                  />
                ))}
              </div>

              {/* Rarity Distribution */}
              <div className="mt-8 p-4 bg-gray-900 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">
                  Rarity Distribution
                </h3>
                <div className="flex flex-wrap gap-4 text-sm">
                  {rarityOrder.map((rarity) => {
                    const count = itemsByRarity[rarity]?.length || 0;
                    if (count === 0) return null;

                    // Calculate total probability for this rarity
                    const totalRarityProbability = itemsByRarity[rarity].reduce(
                      (sum, item) => sum + item.dropProbability,
                      0
                    );

                    return (
                      <div key={rarity} className="flex items-center gap-2">
                        <span className="capitalize text-gray-300">
                          {rarity}:
                        </span>
                        <span className="text-orange-500 font-semibold">
                          {count} item{count !== 1 ? 's' : ''}
                        </span>
                        <span className="text-gray-500 text-xs">
                          ({totalRarityProbability.toFixed(2)}%)
                        </span>
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
                No items found in this case.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
