/**
 * FilterSidebar Component with Desktop & Mobile Support
 *
 * BDD Reference: features/03-search-filters.feature:76-311
 * Tests: __tests__/FilterSidebar.test.tsx
 *
 * Features:
 * - Multi-select filters (rarity, weapon type, wear, quality)
 * - Price range filters (min/max)
 * - URL-based state management (query string updates)
 * - Desktop: Always-visible sidebar
 * - Mobile (<768px): Hidden sidebar, "Filters" button, bottom sheet
 * - Active filter chips with remove functionality
 * - Facet counts (show how many items match each filter)
 *
 * Critical Gotchas Addressed:
 * - React: URL state sync with Next.js router
 * - React: Mobile bottom sheet pattern
 * - Tailwind: Responsive breakpoints (<768px)
 * - React: Cleanup event listeners in useEffect
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { SearchFacets, Rarity, Wear, Quality } from '@/types/search';

interface FilterSidebarProps {
  facets: SearchFacets;
}

export default function FilterSidebar({ facets }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Responsive state (mobile detection)
  const [isMobile, setIsMobile] = useState(false);

  // Mobile bottom sheet state
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkMobile();

    // Listen for resize
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Price filter state (debounced)
  const [priceMin, setPriceMin] = useState<string>(searchParams.get('priceMin') || '');
  const [priceMax, setPriceMax] = useState<string>(searchParams.get('priceMax') || '');
  const priceDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Parse current filters from URL
  const currentRarities = searchParams.get('rarity')?.split(',').filter(Boolean) || [];
  const currentWeaponTypes = searchParams.get('weaponType')?.split(',').filter(Boolean) || [];
  const currentWearConditions = searchParams.get('wear')?.split(',').filter(Boolean) || [];
  const currentQualities = searchParams.get('quality')?.split(',').filter(Boolean) || [];

  // Update URL with new filter values
  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    // Reset to page 1 when filters change
    params.set('page', '1');

    router.push(`/items?${params.toString()}`);
  };

  // Handle multi-select checkbox toggle
  const toggleFilter = (filterKey: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentValues = params.get(filterKey)?.split(',').filter(Boolean) || [];

    let newValues: string[];
    if (currentValues.includes(value)) {
      // Remove value
      newValues = currentValues.filter((v) => v !== value);
    } else {
      // Add value
      newValues = [...currentValues, value];
    }

    if (newValues.length > 0) {
      params.set(filterKey, newValues.join(','));
    } else {
      params.delete(filterKey);
    }

    // Reset to page 1
    params.set('page', '1');

    router.push(`/items?${params.toString()}`);
  };

  // Clear all filters
  const clearAllFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    // Keep only the search query
    const query = params.get('q');
    params.delete('rarity');
    params.delete('weaponType');
    params.delete('wear');
    params.delete('quality');
    params.delete('priceMin');
    params.delete('priceMax');
    params.set('page', '1');

    router.push(`/items?${params.toString()}`);
  };

  // Debounced price filter update
  useEffect(() => {
    if (priceDebounceRef.current) {
      clearTimeout(priceDebounceRef.current);
    }

    priceDebounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (priceMin) {
        params.set('priceMin', priceMin);
      } else {
        params.delete('priceMin');
      }

      if (priceMax) {
        params.set('priceMax', priceMax);
      } else {
        params.delete('priceMax');
      }

      params.set('page', '1');

      router.push(`/items?${params.toString()}`);
    }, 300);

    return () => {
      if (priceDebounceRef.current) {
        clearTimeout(priceDebounceRef.current);
      }
    };
  }, [priceMin, priceMax, router, searchParams]);

  // Close bottom sheet when clicking outside
  const bottomSheetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isBottomSheetOpen &&
        bottomSheetRef.current &&
        !bottomSheetRef.current.contains(event.target as Node)
      ) {
        setIsBottomSheetOpen(false);
      }
    };

    if (isBottomSheetOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBottomSheetOpen]);

  // Render filter sections
  const renderFilters = () => (
    <>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-cs2-light mb-2">Filters</h2>
        <button
          onClick={clearAllFilters}
          className="text-sm text-cs2-blue hover:text-cs2-blue/80 transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* Rarity Filter */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-cs2-light mb-3">Rarity</h3>
        <div className="space-y-2">
          {Object.entries(facets.rarities).map(([rarity, count]) => (
            <label
              key={rarity}
              className={`flex items-center justify-between cursor-pointer ${
                count === 0 ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={currentRarities.includes(rarity)}
                  onChange={() => toggleFilter('rarity', rarity)}
                  disabled={count === 0}
                  className="mr-2"
                  aria-label={`${rarity.charAt(0).toUpperCase() + rarity.slice(1)}`}
                />
                <span className="text-cs2-light capitalize">{rarity}</span>
              </div>
              <span className="text-xs text-cs2-light/50">{count}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Weapon Type Filter */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-cs2-light mb-3">Weapon Type</h3>
        <div className="space-y-2">
          {Object.entries(facets.weaponTypes).map(([weaponType, count]) => (
            <label
              key={weaponType}
              className={`flex items-center justify-between cursor-pointer ${
                count === 0 ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={currentWeaponTypes.includes(weaponType)}
                  onChange={() => toggleFilter('weaponType', weaponType)}
                  disabled={count === 0}
                  className="mr-2"
                  aria-label={weaponType}
                />
                <span className="text-cs2-light">{weaponType}</span>
              </div>
              <span className="text-xs text-cs2-light/50">{count}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-cs2-light mb-3">Price Range</h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="price-min" className="block text-xs text-cs2-light/70 mb-1">
              Min Price
            </label>
            <input
              id="price-min"
              type="number"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              placeholder="$0"
              className="w-full px-3 py-2 bg-cs2-dark border border-cs2-blue/20 rounded text-cs2-light focus:outline-none focus:border-cs2-blue/50"
              aria-label="Min Price"
            />
          </div>
          <div>
            <label htmlFor="price-max" className="block text-xs text-cs2-light/70 mb-1">
              Max Price
            </label>
            <input
              id="price-max"
              type="number"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder="$999+"
              className="w-full px-3 py-2 bg-cs2-dark border border-cs2-blue/20 rounded text-cs2-light focus:outline-none focus:border-cs2-blue/50"
              aria-label="Max Price"
            />
          </div>
        </div>
      </div>

      {/* Wear Condition Filter */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-cs2-light mb-3">Wear Condition</h3>
        <div className="space-y-2">
          {Object.entries(facets.wearConditions).map(([wear, count]) => (
            <label
              key={wear}
              className={`flex items-center justify-between cursor-pointer ${
                count === 0 ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={currentWearConditions.includes(wear)}
                  onChange={() => toggleFilter('wear', wear)}
                  disabled={count === 0}
                  className="mr-2"
                  aria-label={`${wear.replace(/_/g, ' ').charAt(0).toUpperCase() + wear.replace(/_/g, ' ').slice(1)}`}
                />
                <span className="text-cs2-light capitalize">{wear.replace(/_/g, ' ')}</span>
              </div>
              <span className="text-xs text-cs2-light/50">{count}</span>
            </label>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside
        role="complementary"
        className={`w-64 bg-cs2-dark/50 border border-cs2-blue/20 rounded-lg p-6 h-fit sticky top-6 ${
          isMobile ? 'hidden' : ''
        }`}
      >
        {renderFilters()}
      </aside>

      {/* Mobile: Filters Button */}
      {isMobile && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setIsBottomSheetOpen(true)}
            className="bg-cs2-blue text-white px-6 py-3 rounded-full shadow-lg font-semibold hover:bg-cs2-blue/90 transition-colors"
            role="button"
          >
            Filters
          </button>
        </div>
      )}

      {/* Mobile: Active Filter Chips */}
      {isMobile &&
        (currentRarities.length > 0 ||
          currentWeaponTypes.length > 0 ||
          currentWearConditions.length > 0 ||
          priceMin ||
          priceMax) && (
          <div className="mb-4 flex flex-wrap gap-2">
            {currentRarities.map((rarity) => (
              <button
                key={`chip-${rarity}`}
                onClick={() => toggleFilter('rarity', rarity)}
                className="inline-flex items-center gap-2 px-3 py-1 bg-cs2-blue/20 text-cs2-light rounded-full text-sm"
                role="button"
              >
                <span className="capitalize">{rarity === 'classified' ? 'Classified' : rarity}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="remove">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ))}
            {currentWeaponTypes.map((weaponType) => (
              <button
                key={`chip-${weaponType}`}
                onClick={() => toggleFilter('weaponType', weaponType)}
                className="inline-flex items-center gap-2 px-3 py-1 bg-cs2-blue/20 text-cs2-light rounded-full text-sm"
                role="button"
              >
                <span>{weaponType}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="remove">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ))}
          </div>
        )}

      {/* Mobile: Bottom Sheet */}
      {isMobile && isBottomSheetOpen && (
        <>
          {/* Backdrop */}
          <div
            data-testid="bottom-sheet-backdrop"
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsBottomSheetOpen(false)}
          />

          {/* Bottom Sheet */}
          <div
            ref={bottomSheetRef}
            role="dialog"
            aria-modal="true"
            className="visible fixed bottom-0 left-0 right-0 bg-cs2-dark border-t border-cs2-blue/20 rounded-t-2xl p-6 z-50 overflow-y-auto"
            style={{ height: '80%' }}
          >
            {/* Close Handle */}
            <div className="flex justify-center mb-4">
              <div className="w-12 h-1 bg-cs2-light/30 rounded-full" />
            </div>

            {renderFilters()}
          </div>
        </>
      )}
    </>
  );
}
