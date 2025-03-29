'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '../lib/api/oxylabs-scraper';
import ProductDisplay from './ProductDisplay';

// Configuration for retailers
const RETAILERS = [
  { name: 'Best Buy', domain: 'bestbuy.com' },
  { name: 'Home Depot', domain: 'homedepot.com' },
  { name: 'Lowes', domain: 'lowes.com' }
];

export default function ProductSearch({ initialProducts = [] }: { initialProducts?: Product[] }) {
  const [query, setQuery] = useState('');
  const [selectedRetailers, setSelectedRetailers] = useState<string[]>(RETAILERS.map(r => r.domain));
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRetailerChange = (domain: string) => {
    setSelectedRetailers(prev => 
      prev.includes(domain) 
        ? prev.filter(r => r !== domain) 
        : [...prev, domain]
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    if (selectedRetailers.length === 0) {
      setError('Please select at least one retailer');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Construct the search URL with query parameters
      const searchParams = new URLSearchParams();
      searchParams.set('q', query);
      selectedRetailers.forEach(retailer => searchParams.append('retailer', retailer));
      
      // Client-side navigation to search page with parameters
      router.push(`/search?${searchParams.toString()}`);
    } catch (error) {
      console.error('Error during search:', error);
      setError('An error occurred while searching. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSearch} className="space-y-4">
        <div>
          <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-1">
            Search for appliances
          </label>
          <input
            id="query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., refrigerator with ice maker"
            className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>
        
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">Select retailers to search</p>
          <div className="flex flex-wrap gap-3">
            {RETAILERS.map((retailer) => (
              <label 
                key={retailer.domain}
                className={`flex items-center px-3 py-2 rounded-md border cursor-pointer ${
                  selectedRetailers.includes(retailer.domain)
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedRetailers.includes(retailer.domain)}
                  onChange={() => handleRetailerChange(retailer.domain)}
                  className="sr-only"
                  disabled={isLoading}
                />
                <span>{retailer.name}</span>
              </label>
            ))}
          </div>
        </div>
        
        {error && (
          <div className="p-3 text-sm rounded-md bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}
        
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full rounded-md px-4 py-2 text-white ${
            isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>
      
      {isLoading && (
        <div className="text-center p-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Searching retailers...</p>
        </div>
      )}
      
      {!isLoading && products.length > 0 && (
        <ProductDisplay products={products} />
      )}
    </div>
  );
} 