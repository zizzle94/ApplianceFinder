import axios from 'axios';
import { Product } from './oxylabs-scraper';

// Define retry parameters
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

// Function to extract retailer from URL
export function extractRetailerFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    if (hostname.includes('bestbuy.com')) return 'Best Buy';
    if (hostname.includes('homedepot.com')) return 'Home Depot';
    if (hostname.includes('lowes.com')) return 'Lowes';
    
    return null;
  } catch (error) {
    console.error('Error extracting retailer from URL:', error);
    return null;
  }
}

// Extract make and model from product name or features
export function extractMakeAndModel(productName: string, features: string[]): { make: string | null, modelNumber: string | null } {
  // Default return values
  let make: string | null = null;
  let modelNumber: string | null = null;
  
  // Common appliance brands
  const knownBrands = [
    'LG', 'Samsung', 'GE', 'Whirlpool', 'Frigidaire', 'Maytag', 'KitchenAid', 
    'Bosch', 'Amana', 'Kenmore', 'Haier', 'Hotpoint', 'Danby', 'Galanz', 'Vissani'
  ];
  
  // Try to extract brand from product name
  for (const brand of knownBrands) {
    if (productName.includes(brand)) {
      make = brand;
      break;
    }
  }
  
  // Look for model number patterns in product name (typically alphanumeric with hyphens)
  const modelPatterns = [
    /\b([A-Z0-9]+-[A-Z0-9]+)\b/i,                   // Pattern like "ABC-123"
    /\b([A-Z]{2,}[0-9]{4,}[A-Z]*)\b/i,              // Pattern like "GTE18GTNRWW" 
    /\b(WR[A-Z0-9]{5,}[A-Z]*)\b/i,                  // Whirlpool pattern like "WRT518SZFM"
    /\b(RF[0-9]{2}[A-Z]{1,2}[0-9]{4,}[A-Z]*)\b/i,   // Samsung pattern like "RF28R7201SR"
    /\b(LT[A-Z0-9]{5,}[A-Z]*)\b/i,                  // LG pattern like "LTCS20020S"
    /\b(FF[A-Z0-9]{5,}[A-Z]*)\b/i                   // Frigidaire pattern like "FFHT1835VS"
  ];
  
  // Try to find model in product name
  for (const pattern of modelPatterns) {
    const match = productName.match(pattern);
    if (match && match[1]) {
      modelNumber = match[1];
      break;
    }
  }
  
  // If model wasn't found in the product name, look through features
  if (!modelNumber) {
    const modelKeywords = ['Model:', 'Model #:', 'Model Number:', 'Item #:'];
    
    for (const feature of features) {
      // Check for explicit model number designations
      for (const keyword of modelKeywords) {
        if (feature.includes(keyword)) {
          const parts = feature.split(keyword);
          if (parts.length > 1) {
            modelNumber = parts[1].trim().split(' ')[0]; // Take first word after the keyword
            break;
          }
        }
      }
      
      // If we still don't have a model, try the patterns on each feature
      if (!modelNumber) {
        for (const pattern of modelPatterns) {
          const match = feature.match(pattern);
          if (match && match[1]) {
            modelNumber = match[1];
            break;
          }
        }
      }
      
      if (modelNumber) break;
    }
  }
  
  return { make, modelNumber };
}

// Function to search for product using Oxylabs and make/model
export async function searchProductByMakeModel(make: string, model: string, retailer?: string): Promise<string | null> {
  if (!process.env.OXYLABS_USERNAME || !process.env.OXYLABS_PASSWORD) {
    console.warn('Oxylabs credentials not found, cannot search by make/model');
    return null;
  }

  try {
    // Construct search query
    const searchQuery = `${make} ${model}`;
    const retailers = retailer ? [retailer] : ['bestbuy.com', 'homedepot.com', 'lowes.com'];
    
    for (const site of retailers) {
      try {
        // Make a search request to Oxylabs
        const payload = {
          source: 'universal_search',
          domain: site,
          query: searchQuery,
          parse: true,
          geo_location: 'United States'
        };

        const response = await axios.post('https://realtime.oxylabs.io/v1/queries', payload, {
          auth: {
            username: process.env.OXYLABS_USERNAME as string,
            password: process.env.OXYLABS_PASSWORD as string
          },
          timeout: 30000 // 30 second timeout
        });

        const results = response.data.results;
        if (results && results.length > 0 && results[0].content && results[0].content.results) {
          const searchResults = results[0].content.results;
          
          // Try to find an exact match by model number in the search results
          for (const result of searchResults) {
            if (result.url && (
                result.title.toLowerCase().includes(model.toLowerCase()) ||
                result.description?.toLowerCase().includes(model.toLowerCase())
              )) {
              return result.url;
            }
          }
          
          // If no exact match found, return the first result URL
          if (searchResults.length > 0 && searchResults[0].url) {
            return searchResults[0].url;
          }
        }
      } catch (error) {
        console.error(`Error searching on ${site}:`, error);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error in searchProductByMakeModel:', error);
    return null;
  }
}

// Function to scrape product data using Oxylabs
export async function scrapeProductData(url: string): Promise<{
  name: string;
  price: number | null;
  retailer: string;
  imageUrl?: string;
  features?: string[];
  make?: string | null;
  modelNumber?: string | null;
} | null> {
  if (!process.env.OXYLABS_USERNAME || !process.env.OXYLABS_PASSWORD) {
    console.warn('Oxylabs credentials not found, returning mock data');
    return {
      name: `[MOCK] Product from ${extractRetailerFromUrl(url) || 'Unknown Retailer'}`,
      price: 999.99,
      retailer: extractRetailerFromUrl(url) || 'Unknown Retailer',
      imageUrl: 'https://via.placeholder.com/300x300?text=No+Image',
      features: ['Mock Feature 1', 'Mock Feature 2'],
      make: 'Mock Brand',
      modelNumber: 'MOCK123'
    };
  }

  let retries = 0;
  let backoff = INITIAL_BACKOFF_MS;

  while (retries <= MAX_RETRIES) {
    try {
      console.log(`Scraping product data from ${url} (attempt ${retries + 1}/${MAX_RETRIES + 1})`);
      
      // Create the payload for Oxylabs with enhanced parsing instructions
      const payload = {
        source: 'universal_ecommerce',
        url: url,
        geo_location: 'United States',
        render: 'html',
        parse: true,
        parsing_instructions: {
          product: {
            _fns: [
              {
                _fn: 'element',
                _args: ['body']
              }
            ],
            product_name: {
              _fns: [
                {
                  _fn: 'element',
                  _args: ['h1']
                },
                {
                  _fn: 'text'
                }
              ]
            },
            price: {
              _fns: [
                {
                  _fn: 'element',
                  _args: ['[data-price], .price-display, .product-price, .price, .product-price-primary']
                },
                {
                  _fn: 'text'
                }
              ]
            },
            image_url: {
              _fns: [
                {
                  _fn: 'element',
                  _args: ['img.primary-image, img.product-image, .product-image img']
                },
                {
                  _fn: 'attr',
                  _args: ['src']
                }
              ]
            },
            features: {
              _fns: [
                {
                  _fn: 'elements',
                  _args: ['.product-info li, .product-features li, .product-specs li, .product-description li, .specs-table tr, .product-details-list li']
                },
                {
                  _fn: 'text'
                }
              ]
            },
            specifications: {
              _fns: [
                {
                  _fn: 'elements',
                  _args: ['.product-specs .specs-table tr, .specifications tr, .specs-list li, #specifications li']
                },
                {
                  _fn: 'text'
                }
              ]
            },
            brand: {
              _fns: [
                {
                  _fn: 'element',
                  _args: ['.product-brand, .brand, [itemprop="brand"], .manufacturer']
                },
                {
                  _fn: 'text'
                }
              ]
            },
            model_number: {
              _fns: [
                {
                  _fn: 'element',
                  _args: ['[data-product-id], [data-model], .model-number, .product-model']
                },
                {
                  _fn: 'text'
                }
              ]
            }
          }
        }
      };

      // Make the request to Oxylabs
      const response = await axios.post('https://realtime.oxylabs.io/v1/queries', payload, {
        auth: {
          username: process.env.OXYLABS_USERNAME as string,
          password: process.env.OXYLABS_PASSWORD as string
        },
        timeout: 60000 // 60 second timeout
      });

      // If we got here, the request was successful
      console.log('Product data scraped successfully');
      
      // Extract and normalize the product data
      const results = response.data.results;
      if (!results || results.length === 0) {
        console.warn('No results returned from Oxylabs');
        return null;
      }

      const productData = results[0].content?.product;
      if (!productData) {
        console.warn('No product data found in Oxylabs response');
        return null;
      }

      // Parse the price from string to number if needed
      let price: number | null = null;
      if (typeof productData.price === 'number') {
        price = productData.price;
      } else if (typeof productData.price === 'string') {
        // Remove currency symbols and other characters, keep only digits and decimal point
        const priceString = productData.price.replace(/[^0-9.]/g, '');
        price = priceString ? parseFloat(priceString) : null;
      }

      // Extract features as an array
      const features = Array.isArray(productData.features) 
        ? productData.features 
        : typeof productData.features === 'string'
          ? [productData.features]
          : [];
      
      // Add specifications to features if they're different
      if (productData.specifications) {
        const specs = Array.isArray(productData.specifications) 
          ? productData.specifications 
          : typeof productData.specifications === 'string'
            ? [productData.specifications]
            : [];
        
        // Add specs that aren't already in features
        for (const spec of specs) {
          if (!features.includes(spec)) {
            features.push(spec);
          }
        }
      }

      // Extract make (brand) and model from the response, or use our own extraction logic
      let make = productData.brand || null;
      let modelNumber = productData.model_number || null;
      
      // If make or model wasn't explicitly found, try to extract them from name and features
      if (!make || !modelNumber) {
        const extracted = extractMakeAndModel(productData.product_name || '', features);
        
        // Only use the extracted values if we didn't already have them
        if (!make) make = extracted.make;
        if (!modelNumber) modelNumber = extracted.modelNumber;
      }

      // Return the enhanced product data
      return {
        name: productData.product_name || 'Unknown Product',
        price: price,
        retailer: extractRetailerFromUrl(url) || 'Unknown Retailer',
        imageUrl: productData.image_url || undefined,
        features: features,
        make: make,
        modelNumber: modelNumber
      };
    } catch (error: any) {
      console.error(`Error scraping product data (attempt ${retries + 1}):`, error);
      
      // Check if this is a rate limit error
      const isRateLimit = error.response?.status === 429;
      
      // Check if we should retry
      if (retries >= MAX_RETRIES) {
        console.error('Maximum retries reached, giving up');
        return null;
      }
      
      // If it's a rate limit, use a longer backoff
      if (isRateLimit) {
        backoff = Math.min(backoff * 2, 30000); // Max 30 second backoff
        console.log(`Rate limit hit, backing off for ${backoff}ms before retry`);
      } else {
        // Standard exponential backoff with jitter
        backoff = Math.min(backoff * (1.5 + Math.random() * 0.5), 15000); // Max 15 second backoff
        console.log(`Request failed, backing off for ${backoff}ms before retry`);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, backoff));
      retries++;
    }
  }
  
  return null;
} 