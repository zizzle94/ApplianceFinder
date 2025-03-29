import React from 'react';
import { useAppStore } from '../lib/store';
import { ProductCard } from './ProductCard';

export function ProductResults() {
  const { products, claudeResponse, isLoading, error } = useAppStore();
  
  // Group products by retailer
  const groupedByRetailer = products.reduce((acc, product) => {
    acc[product.retailer] = acc[product.retailer] || [];
    acc[product.retailer].push(product);
    return acc;
  }, {} as Record<string, typeof products>);
  
  // Get environment status from the API response
  const envStatus = (claudeResponse as any)?.envStatus || {};
  const usingMockData = envStatus.usingMockData;
  const missingVars = envStatus.missingEnvVars || [];
  
  if (isLoading) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-16">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-6 w-64 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 w-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="w-full text-center py-16">
        <h3 className="text-xl text-red-600 font-semibold mb-2">Error</h3>
        <p className="text-gray-700">{error}</p>
      </div>
    );
  }
  
  if (products.length === 0) {
    return null;
  }
  
  return (
    <div className="w-full max-w-6xl mx-auto mt-8 px-4">
      {/* Display mock data warning if applicable */}
      {usingMockData && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6">
          <div className="flex items-center">
            <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="font-bold">Notice: Showing demonstration data</p>
          </div>
          <p className="mt-2">
            The application is currently showing <strong>demo product data</strong> instead of real scraped products.
          </p>
          <div className="mt-2">
            <p className="font-medium">Possible reasons:</p>
            <ul className="list-disc ml-6 mt-1">
              <li>Missing Oxylabs credentials in environment variables</li>
              <li>Your Oxylabs subscription doesn't include the required scrapers</li>
              <li>API permissions or authentication issues</li>
              <li>Oxylabs API endpoints may have changed</li>
            </ul>
          </div>
          <p className="mt-2 text-sm">
            Check product names for specific error details.
          </p>
          <div className="mt-3 text-sm bg-yellow-50 p-2 rounded">
            <p className="font-medium">To see real data:</p>
            <ol className="list-decimal ml-6 mt-1">
              <li>Verify your OXYLABS_USERNAME and OXYLABS_PASSWORD are correct in .env.local</li>
              <li>Ensure your Oxylabs subscription includes web scraper access</li>
              <li>Contact Oxylabs support if issues persist</li>
            </ol>
          </div>
        </div>
      )}
      
      {claudeResponse && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">
            {products.length > 0 
              ? `Found ${products.length} ${claudeResponse.applianceType}${products.length > 1 ? 's' : ''}`
              : `No ${claudeResponse.applianceType}s found matching your criteria`
            }
          </h2>
          <div className="space-y-2 text-sm text-gray-700">
            {claudeResponse.features.length > 0 && (
              <p><span className="font-semibold">Features:</span> {claudeResponse.features.join(', ')}</p>
            )}
            {(claudeResponse.priceRange.min !== null || claudeResponse.priceRange.max !== null) && (
              <p>
                <span className="font-semibold">Price Range:</span> 
                {claudeResponse.priceRange.min !== null && `$${claudeResponse.priceRange.min}`}
                {claudeResponse.priceRange.min !== null && claudeResponse.priceRange.max !== null && ' - '}
                {claudeResponse.priceRange.max !== null && `$${claudeResponse.priceRange.max}`}
              </p>
            )}
            {claudeResponse.brands.length > 0 && (
              <p><span className="font-semibold">Brands:</span> {claudeResponse.brands.join(', ')}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Display products grouped by retailer */}
      <div className="space-y-12">
        {Object.entries(groupedByRetailer).map(([retailer, retailerProducts]) => (
          <div key={retailer}>
            <h3 className="text-xl font-bold mb-4 pb-2 border-b">{retailer} ({retailerProducts.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {retailerProducts.map((product, index) => (
                <ProductCard key={`${retailer}-${index}`} product={product} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 