/**
 * Skin Detail Page - /skins/:slug
 * BDD Reference: features/02-relational-browsing.feature
 *   - View skin with all variants (wears, StatTrak, Souvenir)
 *   - Price ranges per variant
 *   - Source cases/collections
 *   - csgostash-style layout
 *
 * Implementation:
 *   - React Server Component (data fetching on server)
 *   - Dynamic route with slug
 *   - Fetch from GET /api/skins/:slug
 *   - Display variants in organized sections
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ExternalLink } from 'lucide-react';
import { Breadcrumb } from '@/components/breadcrumb';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface PriceInfo {
  platform: string;
  price: number;
  totalCost: number;
  currency: string;
  listingUrl: string | null;
  lastUpdated: string;
}

interface Variant {
  id: string;
  name: string;
  displayName: string;
  wear: string | null;
  quality: string;
  imageUrl: string;
  imageUrlFallback: string | null;
  wearMin: number | null;
  wearMax: number | null;
  priceRange: {
    min: number;
    max: number;
    currency: string;
  } | null;
  prices: PriceInfo[];
}

interface Source {
  id: string;
  name: string;
  slug: string;
}

interface SkinDetailResponse {
  baseName: string;
  slug: string;
  rarity: string | null;
  type: string;
  weaponType: string | null;
  imageUrl: string;
  imageUrlFallback: string | null;
  description: string | null;
  hasStatTrak: boolean;
  hasSouvenir: boolean;
  variantCount: number;
  variants: Variant[];
  sources: {
    cases: Source[];
    collections: Source[];
  };
  priceRange: {
    min: number;
    max: number;
    currency: string;
  } | null;
}

// CS2 rarity colors
const rarityColors: Record<string, string> = {
  consumer: 'text-gray-400',
  industrial: 'text-blue-400',
  milspec: 'text-blue-500',
  restricted: 'text-purple-500',
  classified: 'text-pink-500',
  covert: 'text-red-500',
  contraband: 'text-yellow-500',
};

const rarityBgColors: Record<string, string> = {
  consumer: 'bg-gray-500/20 border-gray-500/50',
  industrial: 'bg-blue-400/20 border-blue-400/50',
  milspec: 'bg-blue-500/20 border-blue-500/50',
  restricted: 'bg-purple-500/20 border-purple-500/50',
  classified: 'bg-pink-500/20 border-pink-500/50',
  covert: 'bg-red-500/20 border-red-500/50',
  contraband: 'bg-yellow-500/20 border-yellow-500/50',
};

async function getSkinDetail(slug: string): Promise<SkinDetailResponse | null> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL ||
                    process.env.NEXT_PUBLIC_APP_URL ||
                    'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/skins/${slug}`, {
      next: { revalidate: 3600 },
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch skin: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('[Skin Detail] Fetch error:', error);
    return null;
  }
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const skin = await getSkinDetail(params.slug);

  if (!skin) {
    return {
      title: 'Skin Not Found | csloadout.gg',
    };
  }

  const priceText = skin.priceRange
    ? `$${skin.priceRange.min.toFixed(2)} - $${skin.priceRange.max.toFixed(2)}`
    : '';

  return {
    title: `${skin.baseName} - CS2 Skin Prices & Details | csloadout.gg`,
    description: `${skin.baseName} ${skin.rarity || ''} ${skin.weaponType || ''}. ${skin.hasStatTrak ? 'StatTrak Available. ' : ''}${priceText ? `Prices from ${priceText}. ` : ''}View all ${skin.variantCount} variants.`,
  };
}

export default async function SkinDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const skin = await getSkinDetail(params.slug);

  if (!skin) {
    notFound();
  }

  // Group variants by quality
  const normalVariants = skin.variants.filter(v => v.quality === 'Normal');
  const statTrakVariants = skin.variants.filter(v => v.quality === 'StatTrak™');
  const souvenirVariants = skin.variants.filter(v => v.quality === 'Souvenir');

  // Get price range for normal and StatTrak separately
  const normalPrices = normalVariants.flatMap(v => v.priceRange ? [v.priceRange.min, v.priceRange.max] : []);
  const statTrakPrices = statTrakVariants.flatMap(v => v.priceRange ? [v.priceRange.min, v.priceRange.max] : []);

  const normalPriceRange = normalPrices.length > 0 ? {
    min: Math.min(...normalPrices),
    max: Math.max(...normalPrices),
  } : null;

  const statTrakPriceRange = statTrakPrices.length > 0 ? {
    min: Math.min(...statTrakPrices),
    max: Math.max(...statTrakPrices),
  } : null;

  return (
    <main className="min-h-screen bg-cs2-darker text-cs2-light">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Skins', href: '/items' },
            { label: skin.baseName },
          ]}
        />

        {/* Header Section */}
        <div className="bg-cs2-dark border border-cs2-blue/20 rounded-lg overflow-hidden mb-8">
          <div className="grid md:grid-cols-2 gap-8 p-8">
            {/* Image */}
            <div className="aspect-square relative bg-cs2-darker/50 rounded-lg">
              <Image
                src={skin.imageUrl || '/placeholder.svg'}
                alt={skin.baseName}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain p-8"
                priority
              />
            </div>

            {/* Info */}
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-4xl font-bold mb-3">{skin.baseName}</h1>

                {/* Rarity + Type Badge */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {skin.rarity && (
                    <span
                      className={`inline-block text-sm font-medium uppercase px-3 py-1 rounded border ${
                        rarityBgColors[skin.rarity] || 'bg-gray-500/20 border-gray-500/50'
                      } ${rarityColors[skin.rarity] || 'text-gray-400'}`}
                    >
                      {skin.rarity} {skin.weaponType || skin.type}
                    </span>
                  )}

                  {/* StatTrak Badge */}
                  {skin.hasStatTrak && (
                    <span className="inline-block text-sm font-medium px-3 py-1 rounded border bg-orange-500/20 border-orange-500/50 text-orange-400">
                      StatTrak Available
                    </span>
                  )}

                  {/* Souvenir Badge */}
                  {skin.hasSouvenir && (
                    <span className="inline-block text-sm font-medium px-3 py-1 rounded border bg-yellow-500/20 border-yellow-500/50 text-yellow-400">
                      Souvenir Available
                    </span>
                  )}
                </div>

                {skin.description && (
                  <p className="text-cs2-light/70 mb-4">{skin.description}</p>
                )}
              </div>

              {/* Price Summary */}
              <div className="space-y-3">
                {normalPriceRange && (
                  <div className="bg-cs2-darker/50 rounded-lg p-4">
                    <div className="text-sm text-cs2-light/60 mb-1">Normal Price Range</div>
                    <div className="text-2xl font-bold text-green-500">
                      ${normalPriceRange.min.toFixed(2)} - ${normalPriceRange.max.toFixed(2)}
                    </div>
                  </div>
                )}

                {statTrakPriceRange && (
                  <div className="bg-cs2-darker/50 rounded-lg p-4">
                    <div className="text-sm text-orange-400/80 mb-1">StatTrak™ Price Range</div>
                    <div className="text-2xl font-bold text-orange-400">
                      ${statTrakPriceRange.min.toFixed(2)} - ${statTrakPriceRange.max.toFixed(2)}
                    </div>
                  </div>
                )}

                {!normalPriceRange && !statTrakPriceRange && (
                  <div className="bg-cs2-darker/50 rounded-lg p-4">
                    <div className="text-sm text-cs2-light/60 mb-1">Price</div>
                    <div className="text-lg text-cs2-light/50">No price data available</div>
                  </div>
                )}
              </div>

              {/* Sources */}
              {(skin.sources.cases.length > 0 || skin.sources.collections.length > 0) && (
                <div className="mt-auto">
                  <div className="text-sm text-cs2-light/60 mb-2">Found In:</div>
                  <div className="flex flex-wrap gap-2">
                    {skin.sources.cases.map((source) => (
                      <Link
                        key={source.id}
                        href={`/cases/${source.slug}`}
                        className="text-sm px-3 py-1 rounded bg-cs2-blue/20 hover:bg-cs2-blue/30 text-cs2-blue transition-colors"
                      >
                        {source.name}
                      </Link>
                    ))}
                    {skin.sources.collections.map((source) => (
                      <Link
                        key={source.id}
                        href={`/collections/${source.slug}`}
                        className="text-sm px-3 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 transition-colors"
                      >
                        {source.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Variants Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">
            All Variants ({skin.variantCount})
          </h2>

          {/* Normal Variants */}
          {normalVariants.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-medium text-cs2-light/80 mb-3">Normal</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {normalVariants.map((variant) => (
                  <VariantCard key={variant.id} variant={variant} />
                ))}
              </div>
            </div>
          )}

          {/* StatTrak Variants */}
          {statTrakVariants.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-medium text-orange-400 mb-3">StatTrak™</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {statTrakVariants.map((variant) => (
                  <VariantCard key={variant.id} variant={variant} isStatTrak />
                ))}
              </div>
            </div>
          )}

          {/* Souvenir Variants */}
          {souvenirVariants.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-medium text-yellow-400 mb-3">Souvenir</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {souvenirVariants.map((variant) => (
                  <VariantCard key={variant.id} variant={variant} isSouvenir />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

// Variant Card Component
function VariantCard({
  variant,
  isStatTrak = false,
  isSouvenir = false,
}: {
  variant: Variant;
  isStatTrak?: boolean;
  isSouvenir?: boolean;
}) {
  const borderColor = isStatTrak
    ? 'border-orange-500/30 hover:border-orange-500/60'
    : isSouvenir
    ? 'border-yellow-500/30 hover:border-yellow-500/60'
    : 'border-cs2-blue/20 hover:border-cs2-blue/50';

  return (
    <Link
      href={`/items/${variant.id}`}
      className={`bg-cs2-dark border rounded-lg overflow-hidden transition-colors ${borderColor}`}
    >
      {/* Image */}
      <div className="aspect-square relative bg-cs2-darker/50">
        <Image
          src={variant.imageUrl || '/placeholder.svg'}
          alt={variant.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 20vw"
          className="object-contain p-4"
        />
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Wear */}
        <div className="text-sm font-medium text-cs2-light mb-1">
          {variant.wear || 'No Wear'}
        </div>

        {/* Float Range */}
        {variant.wearMin !== null && variant.wearMax !== null && (
          <div className="text-xs text-cs2-light/50 mb-2">
            Float: {variant.wearMin.toFixed(2)} - {variant.wearMax.toFixed(2)}
          </div>
        )}

        {/* Price */}
        {variant.priceRange ? (
          <div className={`text-sm font-semibold ${isStatTrak ? 'text-orange-400' : isSouvenir ? 'text-yellow-400' : 'text-green-500'}`}>
            ${variant.priceRange.min.toFixed(2)} - ${variant.priceRange.max.toFixed(2)}
          </div>
        ) : (
          <div className="text-sm text-cs2-light/40">No price data</div>
        )}
      </div>
    </Link>
  );
}
