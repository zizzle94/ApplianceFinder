import { ApifyClient } from 'apify-client';
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

// Define the retailers to search with their corresponding Apify actors
const retailers = [
  { 
    name: 'Home Depot', 
    domain: 'homedepot.com',
    actorId: 'jupri/home-depot-browser' 
  },
  { 
    name: 'Lowes', 
    domain: 'lowes.com',
    actorId: 'natanielsantos/lowe-s-scraper' 
  },
  { 
    name: 'Best Buy', 
    domain: 'bestbuy.com',
    actorId: 'alexey/bestbuy-products-actor' 
  }
];

// Normalize the product data from different retailers
function normalizeProduct(item: any, retailer: string): Product | null {
  try {
    let name = '';
    let price = 0;
    let imageUrl = '';
    let productUrl = '';
    let features: string[] = [];

    if (retailer === 'Home Depot') {
      name = item.name || item.title || '';
      price = parseFloat(item.price?.toString().replace(/[^0-9.]/g, '') || '0');
      imageUrl = item.image || item.images?.[0] || '';
      // Ensure Home Depot URLs are absolute
      productUrl = item.url?.startsWith('http') ? item.url : `https://www.homedepot.com${item.url || ''}`;
      imageUrl = imageUrl?.startsWith('http') ? imageUrl : `https://images.homedepot.com${imageUrl || ''}`;
      features = item.features || item.specifications || [];
    } 
    else if (retailer === 'Lowes') {
      name = item.name || item.productName || '';
      price = parseFloat(item.price?.toString().replace(/[^0-9.]/g, '') || '0');
      imageUrl = item.imageUrl || item.image || '';
      // Ensure Lowes URLs are absolute
      productUrl = item.productUrl?.startsWith('http') ? item.productUrl : `https://www.lowes.com${item.productUrl || item.url || ''}`;
      imageUrl = imageUrl?.startsWith('http') ? imageUrl : `https://mobileimages.lowes.com${imageUrl || ''}`;
      features = item.features || [];
    }
    else if (retailer === 'Best Buy') {
      name = item.name || '';
      price = parseFloat(item.price?.toString().replace(/[^0-9.]/g, '') || '0');
      imageUrl = item.image || item.images?.[0] || '';
      // Ensure Best Buy URLs are absolute
      productUrl = item.url?.startsWith('http') ? item.url : `https://www.bestbuy.com${item.url || ''}`;
      imageUrl = imageUrl?.startsWith('http') ? imageUrl : `https://pisces.bbystatic.com${imageUrl || ''}`;
      features = item.features || [];
    }

    // Skip invalid products or products with invalid URLs
    if (!name || isNaN(price) || price === 0 || !productUrl || !imageUrl) {
      return null;
    }

    // Clean up URLs to ensure they're valid
    try {
      productUrl = new URL(productUrl).toString();
      imageUrl = new URL(imageUrl).toString();
    } catch (e) {
      console.error('Invalid URL:', e);
      return null;
    }

    return {
      name,
      price,
      imageUrl,
      productUrl,
      retailer,
      features: Array.isArray(features) ? features.filter(f => f && typeof f === 'string' && f.trim().length > 0) : []
    };
  } catch (error) {
    console.error('Error normalizing product:', error);
    return null;
  }
}

// Search for products using Apify
export async function searchProducts(claudeOutput: ClaudeQueryOutput): Promise<Product[]> {
  const apifyApiToken = process.env.APIFY_API_TOKEN;
  
  if (!apifyApiToken) {
    throw new Error('Apify API token not configured');
  }
  
  console.log('Starting product search with Apify token:', apifyApiToken.slice(0, 5) + '...');
  
  // Initialize the Apify client
  const apifyClient = new ApifyClient({
    token: apifyApiToken,
  });

  // Format the search query
  const formatSearchQuery = (claudeOutput: ClaudeQueryOutput): string => {
    const terms: string[] = [];
    
    // Add appliance type
    terms.push(claudeOutput.applianceType);
    
    // Add brands if specified
    if (claudeOutput.brands.length > 0) {
      terms.push(...claudeOutput.brands);
    }
    
    // Add features, filtering out common words that might confuse the search
    const commonWords = ['with', 'has', 'includes', 'featuring', 'and', 'or', 'the'];
    const features = claudeOutput.features.filter(f => !commonWords.includes(f.toLowerCase()));
    terms.push(...features);
    
    // Add price range with retailer-specific formatting
    if (claudeOutput.priceRange.min !== null || claudeOutput.priceRange.max !== null) {
      if (claudeOutput.priceRange.min !== null && claudeOutput.priceRange.max !== null) {
        terms.push(`$${claudeOutput.priceRange.min}-${claudeOutput.priceRange.max}`);
      } else if (claudeOutput.priceRange.max !== null) {
        terms.push(`under $${claudeOutput.priceRange.max}`);
      } else if (claudeOutput.priceRange.min !== null) {
        terms.push(`over $${claudeOutput.priceRange.min}`);
      }
    }
    
    return terms.join(' ').trim();
  };

  const searchTerms = formatSearchQuery(claudeOutput);
  console.log('Base search query:', searchTerms);
  
  // Search across all retailers
  const retailerPromises = retailers.map(async (retailer) => {
    try {
      console.log(`\n=== Starting search on ${retailer.name} ===`);
      console.log(`Actor ID: ${retailer.actorId}`);
      
      // Create retailer-specific search URL
      const searchUrl = `https://www.${retailer.domain}/search?q=${encodeURIComponent(searchTerms)}`;
      console.log(`Search URL: ${searchUrl}`);
      
      // Configure actor based on retailer
      let actorInput;
      if (retailer.name === 'Best Buy') {
        actorInput = {
          search: searchTerms,
          proxyConfiguration: {
            useApifyProxy: true
          }
        };
      } else if (retailer.name === 'Lowes') {
        actorInput = {
          keyword: searchTerms,
          country: 'US',
          proxyConfiguration: {
            useApifyProxy: true
          }
        };
      }
      
      console.log(`\nRunning ${retailer.name} actor with config:`, JSON.stringify(actorInput, null, 2));
      
      // Run the actor with retailer-specific configuration
      const run = await apifyClient.actor(retailer.actorId).call(actorInput);
      
      console.log(`Actor run ID: ${run.id}`);
      
      // Wait for dataset to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Get the dataset items
      const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
      console.log(`Raw items from ${retailer.name}:`, items.length);
      
      if (items.length > 0) {
        console.log('Sample item:', JSON.stringify(items[0], null, 2));
      }
      
      // Process the results
      const products = items
        .map((item: any) => {
          const product = normalizeProduct(item, retailer.name);
          if (!product) {
            console.log('Failed to normalize item:', JSON.stringify(item, null, 2));
          }
          return product;
        })
        .filter((product): product is Product => product !== null);
      
      console.log(`Normalized products from ${retailer.name}:`, products.length);
      if (products.length > 0) {
        console.log('Sample normalized product:', JSON.stringify(products[0], null, 2));
      }
      
      return products;
    } catch (error) {
      console.error(`Error fetching products from ${retailer.name}:`, error);
      // Return empty array if retailer fails
      return [];
    }
  });

  // Wait for all retailers to complete and combine results
  const results = await Promise.all(retailerPromises);
  const combinedProducts = results.flat();

  console.log('\n=== Final Results ===');
  console.log('Total products found:', combinedProducts.length);
  
  // Sort products by price
  return combinedProducts.sort((a, b) => a.price - b.price);
} 