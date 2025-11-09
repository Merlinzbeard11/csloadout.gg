/**
 * SearchBox Component
 *
 * BDD Reference: features/01-item-database.feature:19-30
 *   - Search input box for fuzzy matching
 *   - Updates URL with search query
 *   - 200ms debounce to avoid excessive API calls
 *
 * Features:
 * - Client component for interactive search
 * - URL-based state management
 * - Real-time search with debounce
 * - Clear button when query exists
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get('q') || '';

  const [searchValue, setSearchValue] = useState(currentQuery);

  // Update local state when URL changes (e.g., back button)
  useEffect(() => {
    setSearchValue(currentQuery);
  }, [currentQuery]);

  // Debounced search handler
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (searchValue.trim()) {
        params.set('q', searchValue.trim());
        params.set('page', '1'); // Reset to page 1 on new search
      } else {
        params.delete('q');
      }

      router.push(`/items?${params.toString()}`);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchValue, router, searchParams]);

  const handleClear = () => {
    setSearchValue('');
  };

  return (
    <div className="relative mb-6">
      <input
        type="text"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        placeholder="Search items (e.g., 'AK-47 Redline')..."
        className="w-full px-4 py-3 pl-12 bg-cs2-dark border border-cs2-blue/20 rounded-lg text-cs2-light placeholder-cs2-light/40 focus:outline-none focus:border-cs2-blue/50 transition-colors"
        aria-label="Search items"
      />

      {/* Search Icon */}
      <svg
        className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cs2-light/40"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>

      {/* Clear Button */}
      {searchValue && (
        <button
          onClick={handleClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-cs2-light/40 hover:text-cs2-light transition-colors"
          aria-label="Clear search"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}

      {/* Fuzzy Search Hint */}
      {searchValue && (
        <p className="mt-2 text-xs text-cs2-light/50">
          Using fuzzy matching - typos okay (e.g., "ak47 redlin" finds "AK-47 | Redline")
        </p>
      )}
    </div>
  );
}
