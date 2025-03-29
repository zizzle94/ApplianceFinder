'use client';

import React, { useEffect } from 'react';
import { SearchBar } from './components/SearchBar';
import { ProductResults } from './components/ProductResults';
import { useAppStore } from './lib/store';
import { getRemainingQueries } from './lib/api/query-limits';

// Make sure this is a client component with dynamic data
export default function Home() {
  const { setRemainingQueries } = useAppStore();
  
  // Fetch the user's remaining queries on page load
  useEffect(() => {
    const fetchRemainingQueries = async () => {
      try {
        // For now, we're using the default user ID for testing
        const defaultUserId = '00000000-0000-0000-0000-000000000000';
        const remaining = await getRemainingQueries(defaultUserId);
        setRemainingQueries(remaining);
      } catch (error) {
        console.error('Error fetching remaining queries:', error);
      }
    };
    
    fetchRemainingQueries();
  }, [setRemainingQueries]);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <section className="mb-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Find Your Perfect Appliance</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Describe the appliance you're looking for in your own words, and we'll find the best matches from top retailers.
          </p>
        </div>
        
        <SearchBar />
      </section>
      
      <ProductResults />
    </div>
  );
} 