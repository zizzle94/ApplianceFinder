import axios from 'axios';
import { ClaudeQueryOutput } from './claude';

// Define the product interface (keeping the same structure)
export interface Product {
  name: string;
  price: number;
  imageUrl: string;
  productUrl: string;
  retailer: string;
  features: string[];
}

// Define the retailers to search with their corresponding Oxylabs sources
const retailers = [
  { 
    name: 'Best Buy', 
    domain: 'bestbuy.com',
    source: 'universal_ecommerce',
    priority: 1, // Higher priority (faster response)
    timeout: 45000 // 45 seconds timeout (reduced from 60s)
  },
  { 
    name: 'Home Depot', 
    domain: 'homedepot.com',
    source: 'universal_ecommerce',
    priority: 2, // Medium priority
    timeout: 45000 // 45 seconds timeout (reduced from 60s)
  },
  { 
    name: 'Lowes', 
    domain: 'lowes.com',
    source: 'universal_ecommerce',
    priority: 3, // Lower priority
    timeout: 45000 // 45 seconds timeout (reduced from 60s)
  }
];

// Get mock data for demonstration/fallback
function getMockProducts(applianceType: string, reason: string = 'unknown'): Product[] {
  console.log(`Using mock data for ${applianceType}. Reason: ${reason}`);
  
  // Base64 encoded simple 1x1 pixel PNG images 
  const refrigeratorImg = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const washerImg = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const defaultImg = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  
  const mockData: Record<string, Product[]> = {
    'refrigerator': [
      {
        name: `[DEMO] Sample Refrigerator 1 (${reason})`,
        price: 999.99,
        imageUrl: refrigeratorImg,
        productUrl: 'https://www.bestbuy.com/sample-product',
        retailer: 'Best Buy (Demo)',
        features: ['Energy Star', 'Ice Maker', '25 cu ft', 'Demo Product']
      },
      {
        name: `[DEMO] Sample Refrigerator 2 (${reason})`,
        price: 1299.99,
        imageUrl: refrigeratorImg,
        productUrl: 'https://www.homedepot.com/sample-product',
        retailer: 'Home Depot (Demo)',
        features: ['French Door', 'Stainless Steel', '27 cu ft', 'Demo Product']
      }
    ],
    'washer': [
      {
        name: `[DEMO] Sample Washer 1 (${reason})`,
        price: 599.99,
        imageUrl: washerImg,
        productUrl: 'https://www.lowes.com/sample-product',
        retailer: 'Lowes (Demo)',
        features: ['Front Load', 'Steam Clean', '4.5 cu ft', 'Demo Product']
      }
    ],
    'default': [
      {
        name: `[DEMO] Sample Product (${reason})`,
        price: 499.99,
        imageUrl: defaultImg,
        productUrl: 'https://www.bestbuy.com/sample-product',
        retailer: 'Best Buy (Demo)',
        features: ['Feature 1', 'Feature 2', 'Feature 3', 'Demo Product']
      }
    ]
  };
  
  const defaultMock = [
    {
      name: `[DEMO] Sample ${applianceType || 'Appliance'} (${reason})`,
      price: 499.99,
      imageUrl: defaultImg,
      productUrl: 'https://www.bestbuy.com/sample-product',
      retailer: 'Best Buy (Demo)',
      features: ['Feature 1', 'Feature 2', 'Feature 3', 'Demo Product']
    },
    {
      name: `[DEMO] Premium ${applianceType || 'Appliance'} (${reason})`,
      price: 799.99,
      imageUrl: defaultImg,
      productUrl: 'https://www.homedepot.com/sample-product',
      retailer: 'Home Depot (Demo)',
      features: ['Premium Feature 1', 'Premium Feature 2', 'Demo Product']
    }
  ];
  
  return mockData[applianceType] || mockData['default'] || defaultMock;
}

// Normalize the product data from different retailers
function normalizeProduct(item: any, retailer: string): Product | null {
  try {
    console.log(`Normalizing product for ${retailer}:`, JSON.stringify(item).substring(0, 500) + '...');
    
    let name = '';
    let price = 0;
    let imageUrl = '';
    let productUrl = '';
    let features: string[] = [];

    // Try to get common properties first, then fallback to retailer-specific
    name = item.name || item.title || item.product_name || '';
    
    // Handle price in various formats
    if (typeof item.price === 'number') {
      price = item.price;
    } else if (typeof item.price === 'string') {
      price = parseFloat(item.price.replace(/[^0-9.]/g, '') || '0');
    } else if (item.price_amount) {
      price = parseFloat(String(item.price_amount));
    } else if (item.original_price) {
      price = parseFloat(String(item.original_price).replace(/[^0-9.]/g, '') || '0');
    } else if (item.final_price) {
      price = parseFloat(String(item.final_price).replace(/[^0-9.]/g, '') || '0');
    }
    
    // Try various image URL patterns
    imageUrl = item.image_url || item.imageUrl || item.image || item.primary_image || item.thumbnail || '';
    if (!imageUrl && item.images && Array.isArray(item.images) && item.images.length > 0) {
      imageUrl = item.images[0].url || item.images[0].src || item.images[0];
    }
    
    // Try various product URL patterns
    productUrl = item.url || item.product_url || item.link || '';
    
    // Try various feature patterns
    features = item.features || item.specifications || item.specs || [];
    if (!Array.isArray(features)) {
      features = [];
    }

    // Additional retailer-specific processing
    if (retailer === 'Lowes') {
      // Additional Lowes-specific logic if needed
    }
    else if (retailer === 'Best Buy') {
      // Additional Best Buy-specific logic if needed
    }
    else if (retailer === 'Home Depot') {
      // Additional Home Depot-specific logic if needed
    }

    // Debug what we've extracted
    console.log(`Extracted data for ${retailer}:`, { 
      name: name ? name.substring(0, 30) + '...' : 'MISSING', 
      price: isNaN(price) ? 'INVALID' : price, 
      imageUrl: imageUrl ? imageUrl.substring(0, 30) + '...' : 'MISSING',
      productUrl: productUrl ? productUrl.substring(0, 30) + '...' : 'MISSING',
      features: Array.isArray(features) ? `${features.length} features` : 'INVALID'
    });

    // Skip invalid products or products with invalid URLs
    if (!name) {
      console.warn(`Skipping product: Missing name`);
      return null;
    }
    
    if (isNaN(price) || price === 0) {
      console.warn(`Skipping product "${name.substring(0, 30)}...": Invalid price (${price})`);
      return null;
    }
    
    if (!productUrl) {
      console.warn(`Skipping product "${name.substring(0, 30)}...": Missing product URL`);
      return null;
    }
    
    if (!imageUrl) {
      // For images, don't fail - just log a warning
      console.warn(`Warning: Missing image URL for "${name.substring(0, 30)}..."`);
    }

    // Clean up URLs to ensure they're valid
    try {
      if (productUrl) {
        productUrl = new URL(productUrl).toString();
      }
      if (imageUrl) {
        imageUrl = new URL(imageUrl).toString();
      }
    } catch (e) {
      console.error(`Invalid URL for "${name.substring(0, 30)}...":`, e);
      return null;
    }

    return {
      name,
      price,
      imageUrl: imageUrl || 'https://via.placeholder.com/300x300?text=No+Image',
      productUrl,
      retailer,
      features: Array.isArray(features) ? features.filter(f => f && typeof f === 'string' && f.trim().length > 0) : []
    };
  } catch (error) {
    console.error('Error normalizing product:', error);
    return null;
  }
}

// Add a simple in-memory cache for search results
type CacheEntry = {
  timestamp: number;
  products: Product[];
};

const searchCache: Record<string, CacheEntry> = {};
const CACHE_TTL = 3600000; // 1 hour in milliseconds

// Build appropriate search URLs for different retailers
function buildSearchUrl(retailer: typeof retailers[0], searchTerm: string): string {
  const encodedSearchTerm = encodeURIComponent(searchTerm);
  
  switch (retailer.name) {
    case 'Best Buy':
      return `https://www.bestbuy.com/site/searchpage.jsp?st=${encodedSearchTerm}`;
    case 'Home Depot':
      return `https://www.homedepot.com/s/${encodedSearchTerm}`;
    case 'Lowes':
      return `https://www.lowes.com/search?searchTerm=${encodedSearchTerm}`;
    default:
      return `https://${retailer.domain}/search?q=${encodedSearchTerm}`;
  }
}

// Add a timeout wrapper for API calls with improved error handling
const fetchWithTimeout = async (promise: Promise<any>, timeout: number): Promise<any> => {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Request timed out after ${timeout}ms`));
    }, timeout);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (timer) clearTimeout(timer);
    return result;
  } catch (error) {
    if (timer) clearTimeout(timer);
    throw error;
  }
};

// Function to get retailers based on subscription tier
function getRetailersForTier(tier: 'free' | 'middle' | 'top' = 'free'): typeof retailers {
  // During testing, always return all retailers
  const isTestingMode = process.env.NODE_ENV === 'development' || process.env.TESTING_MODE === 'true';
  if (isTestingMode) {
    console.log('Testing mode enabled: searching all retailers regardless of tier');
    return retailers;
  }
  
  // For free tier, only search Best Buy (fastest retailer)
  if (tier === 'free') {
    return retailers.filter(r => r.name === 'Best Buy');
  }
  
  // For middle tier, search Best Buy and Home Depot
  if (tier === 'middle') {
    return retailers.filter(r => r.name === 'Best Buy' || r.name === 'Home Depot');
  }
  
  // For top tier, search all retailers
  return retailers;
}

// Search for products using Oxylabs Web Scraper API - optimized for speed
export async function searchProducts(claudeOutput: ClaudeQueryOutput, subscriptionTier: 'free' | 'middle' | 'top' = 'free'): Promise<Product[]> {
  console.log(`Starting product search with optimized Oxylabs integration (${subscriptionTier} tier)...`);
  let useMockData = false;
  let mockDataReason = '';
  
  // Track partial results that can be accessed by the timeout handler
  // @ts-ignore - This is intentionally added to the global scope to allow the progressive timeout to access it
  global._partialSearchResults = [];
  
  // For debug logging in Vercel
  console.log('Environment check:');
  console.log('- OXYLABS_USERNAME:', process.env.OXYLABS_USERNAME ? `Set (${process.env.OXYLABS_USERNAME.substring(0, 3)}...)` : 'Not set');
  console.log('- OXYLABS_PASSWORD:', process.env.OXYLABS_PASSWORD ? `Set (length: ${process.env.OXYLABS_PASSWORD.length})` : 'Not set');
  
  // Check if API credentials are available
  if (!process.env.OXYLABS_USERNAME || !process.env.OXYLABS_PASSWORD) {
    console.warn('Using MOCK DATA for demonstration purposes');
    console.warn('OXYLABS_USERNAME or OXYLABS_PASSWORD is not set in environment variables');
    useMockData = true;
    mockDataReason = 'API credentials missing';
  }
  
  // If we're using mock data, return it now
  if (useMockData) {
    const mockProducts = getMockProducts(claudeOutput.applianceType, mockDataReason);
    // Cache mock results too
    const cacheKey = `${claudeOutput.applianceType || 'default'}_${subscriptionTier}`;
    searchCache[cacheKey] = {
      timestamp: Date.now(),
      products: mockProducts
    };
    // Update partial results
    // @ts-ignore
    global._partialSearchResults = mockProducts;
    return mockProducts;
  }
  
  try {
    // Extract the search terms from Claude's response
    const searchTerm = claudeOutput.applianceType || '';
    
    if (!searchTerm) {
      console.warn('No search term provided by Claude');
      return getMockProducts(claudeOutput.applianceType, 'No search term');
    }
    
    // Log the search term for debugging
    console.log(`Searching for: ${searchTerm}`);
    
    // Check if we have a recent cache for this search term and tier
    const cacheKey = `${searchTerm}_${subscriptionTier}`;
    const cachedResult = searchCache[cacheKey];
    if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_TTL) {
      console.log(`Using cached search results for "${searchTerm}" (${subscriptionTier} tier), age: ${Math.round((Date.now() - cachedResult.timestamp)/1000)}s`);
      return cachedResult.products;
    }
    
    // Get retailers based on subscription tier
    const tieredRetailers = getRetailersForTier(subscriptionTier);
    console.log(`Using ${tieredRetailers.length} retailers for ${subscriptionTier} tier: ${tieredRetailers.map(r => r.name).join(', ')}`);
    
    // Sort retailers by priority (fastest first)
    const prioritizedRetailers = [...tieredRetailers].sort((a, b) => a.priority - b.priority);
    
    // We'll collect all products from all retailers
    let allProducts: Product[] = [];
    let collectedFromAtLeastOneRetailer = false;
    
    // Using a more efficient concurrent approach with Promise.allSettled and faster timeouts
    console.log(`Starting concurrent searches for all retailers...`);
    const retailerPromises = prioritizedRetailers.map(async retailer => {
      try {
        console.time(`${retailer.name}-search`);
        console.log(`Starting search for ${retailer.name}...`);
        
        // Optimized payload for Oxylabs API - keeping it simple to avoid format issues
        const payload = {
          source: retailer.source,
          domain: retailer.domain,
          parse: true,
          render: "html",
          geo_location: "United States",
          user_agent_type: "desktop",
          url: buildSearchUrl(retailer, searchTerm)
        };
        
        // Make the API request with shorter timeout
        console.log(`Sending API request to Oxylabs for ${retailer.name}...`);
        console.log(`API payload: ${JSON.stringify(payload)}`);
        
        const apiPromise = axios.post('https://realtime.oxylabs.io/v1/queries', payload, {
          auth: {
            username: (process.env.OXYLABS_USERNAME || '').trim(),
            password: (process.env.OXYLABS_PASSWORD || '').trim()
          },
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // Use our timeout wrapper with shorter timeouts
        const response = await fetchWithTimeout(apiPromise, retailer.timeout);
        console.timeEnd(`${retailer.name}-search`);
        console.log(`Received response from Oxylabs for ${retailer.name}`);
        
        // Process the response data - Oxylabs returns results in an array
        const rawProducts = response.data.results?.[0]?.content?.results || 
                          response.data.results?.[0]?.content?.organic || 
                          response.data.results?.[0]?.content?.products || 
                          [];
        
        // Log the raw response for debugging
        console.log(`Raw response structure for ${retailer.name}:`, 
          JSON.stringify({
            hasResults: !!response.data.results,
            resultsLength: response.data.results?.length || 0,
            hasContent: !!response.data.results?.[0]?.content,
            contentKeys: response.data.results?.[0]?.content ? Object.keys(response.data.results[0].content) : [],
            rawProductsLength: rawProducts.length
          })
        );
        
        // Log the number of products found
        console.log(`Found ${rawProducts.length} products from ${retailer.name}`);
        
        // Process items in parallel batches for better performance
        const batchSize = 10;
        const validProducts: Product[] = [];
        
        // Process in batches of 10 items
        for (let i = 0; i < rawProducts.length; i += batchSize) {
          const batch = rawProducts.slice(i, i + batchSize);
          
          // Process each batch in parallel
          const normalizedBatch = await Promise.all(
            batch.map((item: any) => {
              try {
                return normalizeProduct(item, retailer.name);
              } catch (err) {
                console.error(`Error normalizing product for ${retailer.name}:`, err);
                return null; // Skip items that fail to normalize
              }
            })
          );
          
          // Filter out null results and add to valid products
          validProducts.push(...normalizedBatch.filter((p): p is Product => p !== null));
        }
        
        console.log(`${retailer.name}: ${rawProducts.length} raw products -> ${validProducts.length} valid products`);
        
        if (validProducts.length > 0) {
          collectedFromAtLeastOneRetailer = true;
          
          // Update partial results
          // @ts-ignore
          global._partialSearchResults = global._partialSearchResults.concat(validProducts);
          
          return validProducts;
        }
        
        console.warn(`No valid products found from ${retailer.name}`);
        return [];
      } catch (error) {
        console.warn(`Error searching ${retailer.name}:`, error instanceof Error ? error.message : 'Unknown error');
        if (error instanceof Error) {
          console.error(`Full error details for ${retailer.name}:`, error.stack);
        }
        if (axios.isAxiosError(error) && error.response) {
          console.error(`API response error for ${retailer.name}:`, {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
          });
          
          // Log complete request details for debugging
          console.error(`Failed request details for ${retailer.name}:`, {
            url: error.config?.url,
            method: error.config?.method,
            payload: error.config?.data ? JSON.parse(error.config.data) : {}
          });
        }
        return [];
      }
    });
    
    // Use Promise.allSettled to handle both successful and failed requests
    const results = await Promise.allSettled(retailerPromises);
    
    // Process the results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allProducts = [...allProducts, ...result.value];
        // Update partial results (redundant but ensures consistency)
        // @ts-ignore
        global._partialSearchResults = allProducts;
      } else {
        console.warn(`Failed to get products from ${prioritizedRetailers[index].name}: ${result.reason}`);
      }
    });
    
    // If we've collected products from at least one retailer, return them
    if (collectedFromAtLeastOneRetailer && allProducts.length > 0) {
      console.log(`Returning ${allProducts.length} total products`);
      // Update cache
      searchCache[cacheKey] = {
        timestamp: Date.now(),
        products: allProducts
      };
      return allProducts;
    }
    
    // No products found, return mock data
    console.warn('No products found from any retailer, falling back to mock data');
    const mockProducts = getMockProducts(claudeOutput.applianceType, 'No products found');
    // Cache mock results too
    const noProductsCacheKey = `${searchTerm}_${subscriptionTier}`;
    searchCache[noProductsCacheKey] = {
      timestamp: Date.now(),
      products: mockProducts
    };
    return mockProducts;
  } catch (error) {
    // Log any errors for debugging
    console.error('Error in searchProducts:', error);
    
    // Fallback to mock data if anything fails
    const mockProducts = getMockProducts(claudeOutput.applianceType, 'Search process error');
    // Cache error results too, but with a shorter TTL
    const errorCacheKey = `${claudeOutput.applianceType || 'default'}_${subscriptionTier}`;
    searchCache[errorCacheKey] = {
      timestamp: Date.now() - (CACHE_TTL / 2), // Set to half-expired
      products: mockProducts
    };
    return mockProducts;
  }
} 