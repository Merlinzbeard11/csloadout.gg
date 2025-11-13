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
  return (
    <Link
      href={`/collections/${collection.slug}`}
      data-testid="collection-card"
      className="block bg-cs2-dark border border-cs2-blue/20 rounded-lg hover:border-cs2-blue/50 transition-colors"
    >
      <div className="p-6 space-y-4">
        {/* Collection header */}
        <div>
          <h3 className="text-lg font-bold text-cs2-light">{collection.name}</h3>
          <p className="text-sm text-cs2-light/60">{collection.itemCount} items</p>
        </div>

        {/* Collection Image Preview */}
        <div className="relative aspect-video w-full overflow-hidden rounded bg-cs2-darker/50">
          <Image
            src={collection.imageUrl}
            alt={collection.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />

          {/* Discontinued Badge */}
          {collection.isDiscontinued && (
            <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded">
              No Longer Drops
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
