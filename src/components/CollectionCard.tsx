/**
 * CollectionCard Component
 * BDD Reference: features/02-relational-browsing.feature
 *   - Display collection as card in grid
 *   - Show image, name, item count, release date
 *   - Handle discontinued collections
 *   - Link to collection detail page
 */

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl: string;
  releaseDate: string;
  isDiscontinued: boolean;
  discontinuedDate?: string | null;
  itemCount: number;
}

interface CollectionCardProps {
  collection: Collection;
}

export default function CollectionCard({ collection }: CollectionCardProps) {
  const releaseDate = new Date(collection.releaseDate);

  return (
    <div
      data-testid="collection-card"
      className="group relative overflow-hidden rounded-lg bg-gray-900 border border-gray-800 hover:border-orange-500 transition-all duration-300"
    >
      <Link href={`/collections/${collection.slug}`} className="block">
        {/* Collection Image */}
        <div className="relative aspect-video w-full overflow-hidden">
          <Image
            src={collection.imageUrl}
            alt={collection.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />

          {/* Discontinued Badge */}
          {collection.isDiscontinued && (
            <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded">
              No Longer Drops
            </div>
          )}
        </div>

        {/* Collection Info */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-white group-hover:text-orange-500 transition-colors line-clamp-1">
            {collection.name}
          </h3>

          <div className="mt-2 flex items-center justify-between text-sm text-gray-400">
            <span>{collection.itemCount} items</span>
            <time dateTime={collection.releaseDate}>
              {releaseDate.toLocaleDateString()}
            </time>
          </div>
        </div>
      </Link>
    </div>
  );
}
