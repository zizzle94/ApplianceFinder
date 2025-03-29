import Image from 'next/image';
import { Product } from '../lib/api/oxylabs-scraper';
import { formatPrice } from '../lib/utils';

// Error boundary for the server component
function ProductError({ error }: { error: Error }) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
      <h3 className="text-red-800 font-medium">Error loading products</h3>
      <p className="text-red-600 text-sm">{error.message}</p>
    </div>
  );
}

// Loading state for the server component
function ProductSkeleton() {
  return (
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
  );
}

// Individual product card (client component)
function ProductCard({ product }: { product: Product }) {
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="aspect-video relative mb-4 bg-white">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={false}
        />
      </div>
      <h3 className="font-medium text-lg mb-1 line-clamp-2">{product.name}</h3>
      <p className="text-lg font-bold text-blue-600 mb-2">{formatPrice(product.price)}</p>
      <p className="text-sm text-gray-500 mb-3">{product.retailer}</p>
      
      {product.features.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-600 font-medium mb-1">Key Features:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            {product.features.slice(0, 3).map((feature, i) => (
              <li key={i} className="line-clamp-1">• {feature}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="mt-4">
        <a 
          href={product.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-md transition-colors"
        >
          View Product
        </a>
      </div>
    </div>
  );
}

// Grid layout for product cards (server component)
export default async function ProductDisplay({ products }: { products: Product[] }) {
  if (!products || products.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-center">
        <p className="text-gray-600">No products found. Please try a different search.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Found {products.length} products</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product, index) => (
          <ProductCard key={`${product.retailer}-${index}`} product={product} />
        ))}
      </div>
    </div>
  );
}

// Helper function to create a utils.ts file if it doesn't exist
// This should be placed in app/lib/utils.ts
/*
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price);
}
*/ 