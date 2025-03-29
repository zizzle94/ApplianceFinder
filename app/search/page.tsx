import { Suspense } from 'react';
import { searchProducts, Product } from '../lib/api/oxylabs-scraper';
import { notFound } from 'next/navigation';
import ProductDisplay from '../components/ProductDisplay';
import ProductSearch from '../components/ProductSearch';
import { processApplianceQuery } from '../lib/api/claude';

// Loading state for products
function ProductsLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4 animate-pulse">
            <div className="bg-gray-200 h-40 rounded-md mb-4"></div>
            <div className="h-6 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Search results component
async function SearchResults({ query, retailers }: { query: string, retailers: string[] }) {
  // Process the search query with Claude
  console.log(`Processing search for "${query}" on retailers: ${retailers.join(', ')}`);
  
  try {
    // Skip processing with Claude if no query
    if (!query) {
      return null;
    }
    
    // Process with Claude to get structured query
    const claudeResponse = await processApplianceQuery({
      userQuery: query,
      userId: '00000000-0000-0000-0000-000000000000', // Anonymous user for server component
      subscriptionTier: 'free',
      pastQueries: []
    });
    
    // Search for products with Oxylabs
    console.time('oxylabs-search');
    const products = await searchProducts(claudeResponse);
    console.timeEnd('oxylabs-search');
    
    console.log(`Found ${products.length} products for "${query}"`);
    
    // Filter products by selected retailers if specified
    const filteredProducts = retailers.length > 0
      ? products.filter(product => {
          // Extract domain from retailer string (e.g., "Best Buy" -> "bestbuy.com")
          const retailerDomain = retailers.find(r => 
            product.retailer.toLowerCase().includes(r.split('.')[0].toLowerCase())
          );
          return !!retailerDomain;
        })
      : products;
    
    return <ProductDisplay products={filteredProducts} />;
  } catch (error) {
    console.error('Error in search:', error);
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <h3 className="text-red-800 font-medium">Error searching for products</h3>
        <p className="text-red-600 text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }
}

// Page component
export default async function SearchPage({ 
  searchParams 
}: { 
  searchParams: { q?: string, retailer?: string | string[] } 
}) {
  const query = searchParams.q || '';
  
  // Handle retailer parameter (can be string or array of strings)
  let retailers: string[] = [];
  if (searchParams.retailer) {
    retailers = Array.isArray(searchParams.retailer) 
      ? searchParams.retailer 
      : [searchParams.retailer];
  }
  
  // If no query, just show the search form
  if (!query) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Search for Appliances</h1>
        <ProductSearch />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Search Results</h1>
      
      <div className="mb-8">
        <ProductSearch />
      </div>
      
      <div className="mt-8">
        <Suspense fallback={<ProductsLoading />}>
          <SearchResults query={query} retailers={retailers} />
        </Suspense>
      </div>
    </div>
  );
} 