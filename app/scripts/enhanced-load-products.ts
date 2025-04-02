'use server';

import { 
  addProductToCategory,
  createOrUpdateProduct, 
  getCategoryIdByNameAndParent,
  initializeDatabase, 
  initializeSchemaUpdates,
  findProductByMakeModel
} from '../lib/db';
import { scrapeProductData, searchProductByMakeModel, extractMakeAndModel } from '../lib/api/product-scraper';
import { supabase } from '../lib/supabase';

// Define product URLs by category and subcategory
// This could be loaded from a file or database in the future
const productsByCategory = {
  refrigerators: {
    french_door: [
      'https://www.homedepot.com/p/LG-28-cu-ft-3-Door-French-Door-Refrigerator-with-Ice-and-Water-Dispenser-and-Craft-Ice-in-PrintProof-Stainless-Steel-LHFS28XBS/325158253',
      // Add more URLs as needed
    ],
    side_by_side: [
      'https://www.homedepot.com/p/Frigidaire-36-in-25-6-cu-ft-Standard-Depth-Side-by-Side-Refrigerator-in-Stainless-Steel-FRSS2623AS/320970662',
      // Add more URLs as needed
    ],
    // Other subcategories...
  },
  // Other main categories...
};

// Define the configuration for products that should be in multiple categories
interface MultiCategoryConfig {
  mainCategory: string;
  primarySubcategory: string;
  additionalSubcategories: Array<{
    category: string;
    subcategory: string;
  }>;
}

// Map of product URL to multi-category configuration
// This allows products to appear in multiple relevant categories
const multiCategoryProducts: Record<string, MultiCategoryConfig> = {
  'https://www.bestbuy.com/site/lg-standard-depth-max-30-7-cu-ft-french-door-smart-refrigerator-with-instaview-stainless-steel/6573588.p?skuId=6573588': {
    mainCategory: 'refrigerators',
    primarySubcategory: 'french_door',
    additionalSubcategories: [
      { category: 'refrigerators', subcategory: 'counter_depth' }
    ]
  },
  // Add more multi-category configurations as needed
};

// Helper function to process a batch of URLs
async function processBatch(urls: string[], category: string, subcategory: string, batchSize: number = 5) {
  console.log(`Processing batch of ${urls.length} products for ${category}/${subcategory}`);
  
  // Process in batches to avoid rate limiting
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    
    // Process each URL in the batch concurrently
    const promises = batch.map(url => processProduct(url, category, subcategory));
    await Promise.all(promises);
    
    // Wait before processing the next batch to avoid rate limits
    if (i + batchSize < urls.length) {
      console.log(`Waiting between batches...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Process a single product
async function processProduct(url: string, category: string, subcategory: string, isPrimary: boolean = true) {
  try {
    console.log(`Processing product: ${url}`);
    
    // Fetch product data from the URL
    const productData = await scrapeProductData(url);
    if (!productData) {
      console.error(`Failed to scrape product data for URL: ${url}`);
      return null;
    }
    
    // Get category ID
    const categoryId = await getCategoryIdByNameAndParent(subcategory, await getCategoryIdByNameAndParent(category, null));
    if (!categoryId) {
      console.error(`Category not found: ${category}/${subcategory}`);
      return null;
    }
    
    // Create or update the product with enhanced data
    const product = await createOrUpdateProduct(
      productData.name,
      productData.retailer,
      productData.price,
      url,
      {}, // metadata
      7, // validity period in days
      productData.imageUrl,
      productData.make,
      productData.modelNumber,
      productData.features
    );
    
    if (!product) {
      console.error(`Failed to create/update product for URL: ${url}`);
      return null;
    }
    
    // Add the product to the category
    await addProductToCategory(product.id, categoryId, isPrimary);
    
    console.log(`Successfully processed product: ${productData.name}`);
    
    // If this product is configured for multiple categories, add it to those as well
    if (multiCategoryProducts[url]) {
      const config = multiCategoryProducts[url];
      
      for (const additionalCat of config.additionalSubcategories) {
        // Get the category ID for the additional category
        const addCategoryId = await getCategoryIdByNameAndParent(
          additionalCat.subcategory, 
          await getCategoryIdByNameAndParent(additionalCat.category, null)
        );
        
        if (addCategoryId) {
          // Add to the additional category (not as primary)
          await addProductToCategory(product.id, addCategoryId, false);
          console.log(`Added product to additional category: ${additionalCat.category}/${additionalCat.subcategory}`);
        }
      }
    }
    
    return product;
  } catch (error) {
    console.error(`Error processing product URL ${url}:`, error);
    return null;
  }
}

// Main function to load initial products
async function loadInitialProducts() {
  console.log('Starting to load initial products...');
  
  try {
    // Try a direct SQL approach to add the columns
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error('Error connecting to database:', error);
    } else {
      console.log('Connected to database successfully');
      
      // Each statement separately for better error tracking
      try {
        await supabase.rpc('exec_sql', { 
          sql_query: "ALTER TABLE products ADD COLUMN IF NOT EXISTS make TEXT;"
        });
        console.log('Added make column successfully');
      } catch (e) {
        console.error('Error adding make column:', e);
      }
      
      try {
        await supabase.rpc('exec_sql', { 
          sql_query: "ALTER TABLE products ADD COLUMN IF NOT EXISTS model_number TEXT;"
        });
        console.log('Added model_number column successfully');
      } catch (e) {
        console.error('Error adding model_number column:', e);
      }
      
      try {
        await supabase.rpc('exec_sql', { 
          sql_query: "ALTER TABLE products ADD COLUMN IF NOT EXISTS features JSONB;"
        });
        console.log('Added features column successfully');
      } catch (e) {
        console.error('Error adding features column:', e);
      }
      
      try {
        await supabase.rpc('exec_sql', { 
          sql_query: "CREATE INDEX IF NOT EXISTS idx_products_make ON products(make);"
        });
        console.log('Created make index successfully');
      } catch (e) {
        console.error('Error creating make index:', e);
      }
      
      try {
        await supabase.rpc('exec_sql', { 
          sql_query: "CREATE INDEX IF NOT EXISTS idx_products_model_number ON products(model_number);"
        });
        console.log('Created model_number index successfully');
      } catch (e) {
        console.error('Error creating model_number index:', e);
      }
    }
  } catch (error) {
    console.error('Error updating database schema:', error);
    // Continue anyway, in case the columns already exist
  }
  
  // Initialize the database if needed
  await initializeDatabase();
  await initializeSchemaUpdates();
  
  // Process each category and subcategory
  for (const [category, subcategories] of Object.entries(productsByCategory)) {
    for (const [subcategory, urls] of Object.entries(subcategories)) {
      console.log(`Processing category: ${category}/${subcategory} (${urls.length} products)`);
      await processBatch(urls as string[], category, subcategory);
    }
  }
  
  console.log('Finished loading initial products!');
}

// Find a product by make and model
export async function findAppliance(make: string, modelNumber: string) {
  try {
    // First check if we have it in our database
    const existingProduct = await findProductByMakeModel(make, modelNumber);
    if (existingProduct) {
      console.log(`Found existing product for ${make} ${modelNumber} in our database`);
      return existingProduct;
    }
    
    // If not in our database, try to search for it online
    console.log(`Searching online for ${make} ${modelNumber}...`);
    const url = await searchProductByMakeModel(make, modelNumber);
    if (!url) {
      console.log(`No search results found for ${make} ${modelNumber}`);
      return null;
    }
    
    // We found a URL, now scrape the data and add it to our database
    console.log(`Found product URL: ${url}. Scraping data...`);
    const productData = await scrapeProductData(url);
    if (!productData) {
      console.log(`Failed to scrape data for ${url}`);
      return null;
    }
    
    // Determine the appropriate category based on the product name or features
    let category = 'refrigerators'; // Default category
    let subcategory = 'french_door'; // Default subcategory
    
    const productNameLower = productData.name.toLowerCase();
    if (productNameLower.includes('refrigerator') || productNameLower.includes('fridge')) {
      category = 'refrigerators';
      if (productNameLower.includes('french door')) subcategory = 'french_door';
      else if (productNameLower.includes('side by side')) subcategory = 'side_by_side';
      else if (productNameLower.includes('top freezer')) subcategory = 'top_freezer';
      else if (productNameLower.includes('bottom freezer')) subcategory = 'bottom_freezer';
    } else if (productNameLower.includes('washer') || productNameLower.includes('washing machine')) {
      category = 'washing_machines';
      if (productNameLower.includes('front load')) subcategory = 'front_load';
      else if (productNameLower.includes('top load')) subcategory = 'top_load';
    }
    // Add more category detection logic as needed
    
    // Create the product in our database
    const product = await processProduct(url, category, subcategory);
    return product;
  } catch (error) {
    console.error(`Error finding appliance by make/model:`, error);
    return null;
  }
}

// Update product info by make/model instead of URL
export async function updateProductByMakeModel(make: string, modelNumber: string) {
  try {
    // Find the product in our database
    const existingProduct = await findProductByMakeModel(make, modelNumber);
    if (!existingProduct) {
      console.log(`No product found for ${make} ${modelNumber}`);
      return null;
    }
    
    // Search for the current URL for this product
    console.log(`Searching for current URL for ${make} ${modelNumber}...`);
    const url = await searchProductByMakeModel(make, modelNumber);
    if (!url) {
      console.log(`No current URL found for ${make} ${modelNumber}`);
      return existingProduct; // Return existing product without updates
    }
    
    // If the URL has changed, update our database
    if (url !== existingProduct.url) {
      console.log(`URL has changed from ${existingProduct.url} to ${url}. Updating...`);
      
      // Scrape data from the new URL
      const productData = await scrapeProductData(url);
      if (!productData) {
        console.log(`Failed to scrape data for new URL: ${url}`);
        return existingProduct;
      }
      
      // Update the product with the new URL and data
      const updatedProduct = await createOrUpdateProduct(
        productData.name,
        productData.retailer,
        productData.price,
        url,
        {}, // metadata
        7, // validity period in days
        productData.imageUrl,
        productData.make,
        productData.modelNumber,
        productData.features
      );
      
      return updatedProduct;
    }
    
    // URL hasn't changed, just return the existing product
    return existingProduct;
  } catch (error) {
    console.error(`Error updating product by make/model:`, error);
    return null;
  }
}

// Main export function
export async function main() {
  await loadInitialProducts();
}

// Run the main function if this script is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  main().catch(error => console.error('Error in main function:', error));
} 