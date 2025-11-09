/**
 * ItemCard Component
 *
 * Displays CS2 item cards with image, name, and rarity.
 * Implements multi-source image fallback strategy for Steam CDN reliability.
 *
 * BDD Reference: features/01-item-database.feature:15-16, 60-65
 * Spec Reference: features/01-item-database.md Gotcha #1 (Steam CDN expiration)
 *
 * Features:
 * - Lazy loading images
 * - Multi-source fallback (image_url → image_url_fallback → placeholder)
 * - Rarity-based color coding
 * - Keyboard accessible
 * - Error handling (broken URLs don't crash UI)
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export interface ItemCardProps {
  item: {
    id: string;
    name: string;
    display_name: string;
    rarity: string | null;
    type: string;
    image_url: string;
    image_url_fallback?: string | null;
  };
}

const RARITY_COLORS: Record<string, string> = {
  consumer: 'text-gray-400',
  industrial: 'text-blue-400',
  milspec: 'text-blue-500',
  restricted: 'text-purple-500',
  classified: 'text-pink-500',
  covert: 'text-red-500',
  contraband: 'text-yellow-500',
};

export default function ItemCard({ item }: ItemCardProps) {
  // Multi-source fallback state (Gotcha #1: Steam CDN URL expiration)
  const [imgSrc, setImgSrc] = useState(item.image_url);
  const [imgError, setImgError] = useState(false);

  /**
   * Handle image load errors with fallback strategy
   * BDD: "the image should fallback to image_url_fallback"
   * BDD: "if fallback also fails, show placeholder image"
   */
  const handleImageError = () => {
    if (!imgError && item.image_url_fallback) {
      // Try fallback URL first
      setImgSrc(item.image_url_fallback);
      setImgError(true);
    } else {
      // Use placeholder if all fail
      setImgSrc('/placeholder-item.png');
    }
  };

  const rarityColor = item.rarity ? RARITY_COLORS[item.rarity.toLowerCase()] || 'text-gray-300' : 'text-gray-300';

  return (
    <Link
      href={`/items/${item.id}`}
      className="block bg-cs2-dark border border-cs2-blue/20 rounded-lg overflow-hidden hover:border-cs2-blue/50 transition-colors"
    >
      <div className="aspect-square relative bg-cs2-dark/50">
        <img
          src={imgSrc}
          alt={item.display_name}
          loading="lazy"
          onError={handleImageError}
          className="w-full h-full object-contain"
        />
      </div>

      <div className="p-4">
        <h3 className="text-sm font-medium text-cs2-light truncate mb-1">
          {item.display_name}
        </h3>

        {item.rarity && (
          <p className={`text-xs font-semibold uppercase ${rarityColor}`}>
            {item.rarity}
          </p>
        )}
      </div>
    </Link>
  );
}
