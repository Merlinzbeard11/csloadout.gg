'use client';

import { useState, useEffect } from 'react';
import { POPULAR_CS2_ITEMS } from '@/lib/steam';

interface PriceData {
  market: string;
  price: number;
  url: string;
  floatValue?: number;
}

export default function Home() {
  const [itemName, setItemName] = useState(POPULAR_CS2_ITEMS[0]);
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPrices() {
      setLoading(true);
      setError(null);

      try {
        // Fetch from our API route (server-side, no CORS issues)
        const encodedItemName = encodeURIComponent(itemName);
        const response = await fetch(`/api/prices/${encodedItemName}`);

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch pricing data');
        }

        if (data.prices.length === 0) {
          setError('No pricing data available for this item');
        }

        setPrices(data.prices);
      } catch (err) {
        console.error('Error fetching prices:', err);
        setError('Failed to fetch pricing data');
      } finally {
        setLoading(false);
      }
    }

    fetchPrices();
  }, [itemName]);

  const lowest = prices.length > 0 ? Math.min(...prices.map(p => p.price)) : 0;

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-12">
        <h1 className="text-4xl font-bold text-csgo-orange mb-2">CS Loadout</h1>
        <p className="text-gray-400">Find the cheapest CS2 skins across multiple marketplaces</p>
      </header>

      {/* Item Selector */}
      <div className="max-w-2xl mb-12">
        <label htmlFor="item-select" className="block text-sm font-medium text-gray-400 mb-2">
          Select CS2 Item to Compare Prices
        </label>
        <select
          id="item-select"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          className="w-full bg-gray-800 text-white px-6 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-csgo-orange cursor-pointer"
        >
          {POPULAR_CS2_ITEMS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <p className="mt-2 text-sm text-gray-500">
          Showing prices from {prices.length} marketplace{prices.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Item Display */}
      <div className="max-w-4xl">
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-6">{itemName}</h2>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-csgo-orange"></div>
              <p className="mt-4 text-gray-400">Fetching prices from Steam Market, CSFloat, and Skinport...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-red-900/30 border border-red-500 rounded p-4 text-red-200">
              {error}
            </div>
          )}

          {/* Price Comparison Table */}
          {!loading && !error && prices.length > 0 && (
            <div className="space-y-3">
              {prices.map((price, idx) => (
                <div
                  key={idx}
                  className={`flex justify-between items-center p-4 rounded ${
                    price.price === lowest ? 'bg-green-900/30 border border-green-500' : 'bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-gray-300">{price.market}</span>
                    {price.price === lowest && (
                      <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                        LOWEST
                      </span>
                    )}
                    {price.floatValue && (
                      <span className="text-xs bg-purple-900 text-purple-200 px-2 py-1 rounded">
                        Float: {price.floatValue.toFixed(4)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-csgo-orange">
                      ${price.price.toLocaleString()}
                    </span>
                    <a
                      href={price.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-csgo-blue hover:bg-blue-600 px-4 py-2 rounded text-sm transition-colors"
                    >
                      Buy
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-12 text-center text-gray-500 text-sm">
        <p>Live pricing from Steam Market, CSFloat, and Skinport. Prices update in real-time.</p>
      </div>
    </div>
  );
}
