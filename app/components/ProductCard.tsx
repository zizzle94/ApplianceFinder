import React from 'react';
import Image from 'next/image';
import { Product } from '../lib/api/oxylabs-scraper';
import { formatPrice, truncateText } from '../lib/utils';
import { useAppStore } from '../lib/store';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { currentQueryId } = useAppStore();
  
  const handleProductClick = async () => {
    try {
      // Only track clicks if we have a query ID
      if (currentQueryId) {
        await fetch('/api/track-click', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            queryId: currentQueryId,
            productUrl: product.productUrl,
          }),
        });
      }
      
      // Open the product page in a new tab
      window.open(product.productUrl, '_blank');
    } catch (error) {
      console.error('Error tracking product click:', error);
      // Still open the product page even if tracking fails
      window.open(product.productUrl, '_blank');
    }
  };
  
  return (
    <div 
      className="border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer bg-white"
      onClick={handleProductClick}
    >
      <div className="relative h-48 w-full bg-gray-100">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-contain"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No Image Available
          </div>
        )}
      </div>
      
      <div className="p-4">
        <p className="text-sm text-gray-500 mb-1">{product.retailer}</p>
        <h3 className="text-lg font-semibold mb-2">{truncateText(product.name, 60)}</h3>
        
        <div className="flex justify-between items-center">
          <p className="text-xl font-bold text-primary">{formatPrice(product.price)}</p>
          <p className="text-sm text-blue-600 hover:underline">View Details</p>
        </div>
        
        {product.features.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h4 className="text-sm font-medium mb-1">Features:</h4>
            <ul className="text-sm text-gray-600">
              {product.features.slice(0, 3).map((feature, index) => (
                <li key={index} className="mb-1">
                  • {truncateText(feature, 70)}
                </li>
              ))}
              {product.features.length > 3 && (
                <li className="text-blue-600 text-xs">+ {product.features.length - 3} more</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
} 