/**
 * Item Detail Page (/items/[id])
 *
 * BDD Reference: features/01-item-database.feature:51-58
 *   - View item detail page with name, rarity, type, image
 *   - Wear range and pattern count (if applicable)
 *   - Navigation back to browse page
 *   - Image fallback handling
 *
 * Implementation:
 * - React Server Component (async, server-side data fetching)
 * - Fetches from GET /api/items/[id]
 * - v0.app design with CS2 theme integration
 * - Image optimization with Next.js Image component
 * - Rarity color coding matching browse page
 */

import Link from "next/link"
import Image from "next/image"
import { ChevronLeft } from "lucide-react"
import { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Item {
  id: string
  name: string
  display_name: string
  rarity: string | null
  type: string
  image_url: string
  image_url_fallback?: string | null
  wear_min?: number | null
  wear_max?: number | null
  pattern_count?: number | null
}

interface ItemDetailPageProps {
  params: Promise<{ id: string }>
}

const rarityColors: Record<string, string> = {
  consumer: "text-gray-400",
  industrial: "text-blue-400",
  milspec: "text-blue-500",
  restricted: "text-purple-500",
  classified: "text-pink-500",
  covert: "text-red-500",
  contraband: "text-yellow-500",
}

/**
 * Fetch single item from API
 * Server-side fetch with error handling
 */
async function fetchItem(id: string): Promise<Item | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const url = `${baseUrl}/api/items/${id}`;

    const response = await fetch(url, {
      cache: 'no-store', // Disable caching for fresh data
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      console.error('[Item Detail] API error:', response.status);
      return null;
    }

    const data: Item = await response.json();
    return data;
  } catch (error) {
    console.error('[Item Detail] Fetch failed:', error);
    return null;
  }
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: ItemDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await fetchItem(id);

  if (!item) {
    return {
      title: 'Item Not Found | csloadout.gg',
    };
  }

  return {
    title: `${item.display_name} | csloadout.gg`,
    description: `View details for ${item.display_name} - ${item.rarity || 'Unknown'} ${item.type}`,
  };
}

/**
 * Item Detail Page Component
 * Server Component with async data fetching
 */
export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { id } = await params;
  const item = await fetchItem(id);

  // Return 404 if item not found
  if (!item) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-cs2-darker text-cs2-light">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link
          href="/items"
          className="inline-flex items-center gap-2 text-cs2-blue hover:text-cs2-blue/80 mb-6 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
          Back to Items
        </Link>

        {/* Item Detail Card */}
        <div className="bg-cs2-dark border border-cs2-blue/20 rounded-lg overflow-hidden">
          <div className="grid md:grid-cols-2 gap-8 p-8">
            {/* Image */}
            <div className="aspect-square relative bg-cs2-darker/50 rounded-lg">
              <Image
                src={item.image_url || item.image_url_fallback || "/placeholder.svg"}
                alt={item.display_name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain p-8"
                priority
              />
            </div>

            {/* Details */}
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-4xl font-bold mb-2">{item.display_name}</h1>
                {item.rarity && (
                  <span
                    className={`inline-block text-sm font-medium uppercase px-3 py-1 rounded ${
                      rarityColors[item.rarity] || "text-gray-400"
                    } bg-cs2-darker/50`}
                  >
                    {item.rarity}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-cs2-light/70">Type:</span>
                  <span className="ml-2 font-medium capitalize">{item.type}</span>
                </div>
                <div>
                  <span className="text-cs2-light/70">Item ID:</span>
                  <span className="ml-2 font-mono text-sm">{item.id}</span>
                </div>
                {item.wear_min !== null && item.wear_min !== undefined && (
                  <div>
                    <span className="text-cs2-light/70">Wear Range:</span>
                    <span className="ml-2 font-medium">
                      {item.wear_min.toFixed(2)} - {item.wear_max?.toFixed(2) || '1.00'}
                    </span>
                  </div>
                )}
                {item.pattern_count !== null && item.pattern_count !== undefined && item.pattern_count > 0 && (
                  <div>
                    <span className="text-cs2-light/70">Pattern Count:</span>
                    <span className="ml-2 font-medium">{item.pattern_count.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <button className="bg-cs2-orange hover:bg-cs2-orange/80 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                Add to Loadout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
