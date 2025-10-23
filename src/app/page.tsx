'use client';

import { useState, useEffect } from 'react';
import { POPULAR_CS2_ITEMS } from '@/lib/steam';
import Navbar from '@/components/Navbar';
import ItemCard from '@/components/ItemCard';

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
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      {/* Main Content with top padding for fixed navbar */}
      <main className="pt-20 px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <header className="mb-12 text-center">
            <h1 className="text-5xl font-bold text-white mb-4">
              Find the Best CS2 Skin Deals
            </h1>
            <p className="text-xl text-gray-400">
              Compare prices across multiple marketplaces in real-time
            </p>
          </header>

          {/* Item Grid Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-6">Popular Items</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {POPULAR_CS2_ITEMS.map((item) => (
                <ItemCard
                  key={item}
                  itemName={item}
                  isSelected={item === itemName}
                  onClick={() => setItemName(item)}
                />
              ))}
            </div>
          </section>

          {/* Price Comparison Section */}
          <section>
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-white">{itemName}</h2>
                <p className="text-sm text-gray-500">
                  {prices.length} marketplace{prices.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-csgo-orange"></div>
                  <p className="mt-4 text-gray-400">Fetching prices from Steam Market and Skinport...</p>
                </div>
              )}

              {/* Error State */}
              {error && !loading && (
                <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 text-red-200">
                  {error}
                </div>
              )}

              {/* Price Comparison Cards */}
              {!loading && !error && prices.length > 0 && (
                <div className="space-y-3">
                  {prices.map((price, idx) => (
                    <div
                      key={idx}
                      className={`flex justify-between items-center p-5 rounded-lg transition-all ${
                        price.price === lowest
                          ? 'bg-green-900/30 border-2 border-green-500 shadow-lg'
                          : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-medium text-gray-200">{price.market}</span>
                        {price.price === lowest && (
                          <span className="text-xs bg-green-500 text-white px-3 py-1 rounded-full font-semibold">
                            BEST DEAL
                          </span>
                        )}
                        {price.floatValue && (
                          <span className="text-xs bg-purple-600 text-purple-100 px-3 py-1 rounded-full">
                            Float: {price.floatValue.toFixed(4)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-3xl font-bold text-csgo-orange">
                          ${price.price.toLocaleString()}
                        </span>
                        <a
                          href={price.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-csgo-blue hover:bg-blue-600 px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:scale-105"
                        >
                          Buy Now
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-500 text-sm">
          <p>Live pricing from Steam Market and Skinport. Prices update in real-time.</p>
        </div>
      </footer>
    </div>
  );
}
