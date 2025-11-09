/**
 * SearchBox Component with Autocomplete
 *
 * BDD Reference: features/03-search-filters.feature:47-74 (Autocomplete scenarios)
 * Tests: __tests__/SearchBox.test.tsx
 *
 * Features:
 * - Instant autocomplete suggestions (<50ms performance target)
 * - Keyboard navigation (Arrow Up/Down, Enter, Escape)
 * - Grouped suggestions (items, weapons, collections)
 * - Debounced search and autocomplete (300ms)
 * - URL-based state management
 * - Accessibility (ARIA labels, keyboard support)
 * - Click-outside to close suggestions
 *
 * Critical Gotchas Addressed:
 * - Gotcha #4: Limit to 8-10 suggestions (best practice)
 * - React: Cleanup debounce timers in useEffect
 * - React: Handle outside clicks properly
 * - React: Prevent default form submission on Enter with suggestions
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AutocompleteResponse, AutocompleteSuggestion } from '@/types/search';

export default function SearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get('q') || '';

  const [searchValue, setSearchValue] = useState(currentQuery);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autocompleteTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update local state when URL changes (e.g., back button)
  useEffect(() => {
    setSearchValue(currentQuery);
  }, [currentQuery]);

  // Fetch autocomplete suggestions
  const fetchAutocomplete = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/search/autocomplete?query=${encodeURIComponent(query)}&limit=10`
      );

      if (response.ok) {
        const data: AutocompleteResponse = await response.json();

        // Flatten grouped suggestions into single array
        const allSuggestions: AutocompleteSuggestion[] = [
          ...data.suggestions.items,
          ...data.suggestions.weapons,
          ...data.suggestions.collections,
        ];

        setSuggestions(allSuggestions);
        setShowSuggestions(allSuggestions.length > 0);
      }
    } catch (error) {
      console.error('[SearchBox] Autocomplete error:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced autocomplete fetch
  useEffect(() => {
    // Clear previous timer
    if (autocompleteTimerRef.current) {
      clearTimeout(autocompleteTimerRef.current);
    }

    // Debounce autocomplete API calls (300ms)
    autocompleteTimerRef.current = setTimeout(() => {
      if (searchValue.trim()) {
        fetchAutocomplete(searchValue.trim());
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    // Cleanup timer on unmount
    return () => {
      if (autocompleteTimerRef.current) {
        clearTimeout(autocompleteTimerRef.current);
      }
    };
  }, [searchValue, fetchAutocomplete]);

  // Debounced search handler (updates URL)
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (searchValue.trim()) {
        params.set('q', searchValue.trim());
        params.set('page', '1'); // Reset to page 1 on new search
      } else {
        params.delete('q');
      }

      router.push(`/items?${params.toString()}`);
    }, 300);

    // Cleanup timer on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchValue, router, searchParams]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;

      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          selectSuggestion(suggestions[highlightedIndex]);
        }
        break;

      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Select suggestion (click or Enter key)
  const selectSuggestion = (suggestion: AutocompleteSuggestion) => {
    setSearchValue(suggestion.name);
    setShowSuggestions(false);
    setHighlightedIndex(-1);

    // Update URL immediately (bypass debounce for suggestion selection)
    const params = new URLSearchParams(searchParams.toString());
    params.set('q', suggestion.name);
    params.set('page', '1');

    router.push(`/items?${params.toString()}`);
  };

  const handleClear = () => {
    setSearchValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div className="relative mb-6">
      <input
        ref={inputRef}
        type="text"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search items (e.g., 'AK-47 Redline')..."
        className="w-full px-4 py-3 pl-12 bg-cs2-dark border border-cs2-blue/20 rounded-lg text-cs2-light placeholder-cs2-light/40 focus:outline-none focus:border-cs2-blue/50 transition-colors"
        aria-label="Search items"
        aria-autocomplete="list"
        aria-controls="search-suggestions"
        aria-activedescendant={
          highlightedIndex >= 0 ? `suggestion-${highlightedIndex}` : undefined
        }
        role="combobox"
        aria-expanded={showSuggestions}
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

      {/* Autocomplete Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          id="search-suggestions"
          role="listbox"
          aria-label="Search suggestions"
          className="absolute z-50 w-full mt-2 bg-cs2-dark border border-cs2-blue/20 rounded-lg shadow-xl max-h-96 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.type}-${suggestion.itemId || suggestion.name}-${index}`}
              id={`suggestion-${index}`}
              role="option"
              aria-selected={highlightedIndex === index}
              onClick={() => selectSuggestion(suggestion)}
              className={`
                px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors
                ${
                  highlightedIndex === index
                    ? 'bg-cs2-blue/20 highlighted'
                    : 'hover:bg-cs2-blue/10'
                }
              `}
            >
              {/* Suggestion Icon */}
              {suggestion.icon && (
                <img
                  src={suggestion.icon}
                  alt=""
                  className="w-10 h-10 object-cover rounded"
                  loading="lazy"
                />
              )}

              {/* Suggestion Text */}
              <div className="flex-1">
                <div className="text-cs2-light font-medium">{suggestion.name}</div>
                <div className="text-xs text-cs2-light/50 capitalize">
                  {suggestion.type}
                  {suggestion.score !== undefined && suggestion.score < 1.0 && (
                    <span className="ml-2 text-cs2-blue/70">(fuzzy match)</span>
                  )}
                </div>
              </div>

              {/* Match Indicator */}
              {suggestion.score === 1.0 && (
                <svg
                  className="w-4 h-4 text-cs2-green/70"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="px-4 py-2 text-center text-cs2-light/50 text-sm">
              Loading suggestions...
            </div>
          )}
        </div>
      )}

      {/* Fuzzy Search Hint */}
      {searchValue && !showSuggestions && (
        <p className="mt-2 text-xs text-cs2-light/50">
          Using fuzzy matching - typos okay (e.g., "ak47 redlin" finds "AK-47 | Redline")
        </p>
      )}
    </div>
  );
}
