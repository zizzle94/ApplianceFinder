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

// Function to scrape product data using Oxylabs
export async function scrapeProductData(url: string): Promise<{
  name: string;
  price: number | null;
  retailer: string;
  imageUrl?: string;
  features?: string[];
} | null> {
  if (!process.env.OXYLABS_USERNAME || !process.env.OXYLABS_PASSWORD) {
    console.warn('Oxylabs credentials not found, returning mock data');
    return {
      name: `[MOCK] Product from ${extractRetailerFromUrl(url) || 'Unknown Retailer'}`,
      price: 999.99,
      retailer: extractRetailerFromUrl(url) || 'Unknown Retailer',
      imageUrl: 'https://via.placeholder.com/300x300?text=No+Image',
      features: ['Mock Feature 1', 'Mock Feature 2']
    };
  }

  let retries = 0;
  let backoff = INITIAL_BACKOFF_MS;

  while (retries <= MAX_RETRIES) {
    try {
      console.log(`Scraping product data from ${url} (attempt ${retries + 1}/${MAX_RETRIES + 1})`);
      
      // Create the payload for Oxylabs
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
                  _args: ['.product-info li, .product-features li, .product-specs li, .product-description li']
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

      // Return the normalized product data
      return {
        name: productData.product_name || 'Unknown Product',
        price: price,
        retailer: extractRetailerFromUrl(url) || 'Unknown Retailer',
        imageUrl: productData.image_url || undefined,
        features: features
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