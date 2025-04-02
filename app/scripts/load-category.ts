'use server';

import { 
  addProductToCategory,
  createOrUpdateProduct, 
  getCategoryIdByNameAndParent,
  initializeDatabase, 
  initializeSchemaUpdates
} from '../lib/db';
import { scrapeProductData } from '../lib/api/product-scraper';
import { supabase } from '../lib/supabase';
import { productsByCategory, multiCategoryProducts } from './load-initial-products';

/**
 * Load products for a specific category and subcategory
 */
async function loadCategoryProducts(
  mainCategory: string,
  subcategory?: string,
  limit?: number
) {
  try {
    // Initialize the database first
    await initializeDatabase();
    await initializeSchemaUpdates();
    
    console.log(`Starting to load products for ${mainCategory}${subcategory ? ' / ' + subcategory : ''}...`);
    
    // Check if the category exists
    if (!productsByCategory[mainCategory]) {
      console.error(`Main category not found: ${mainCategory}`);
      console.log(`Available categories: ${Object.keys(productsByCategory).join(', ')}`);
      return;
    }
    
    // Get main category ID
    const mainCategoryId = await getCategoryIdByNameAndParent(mainCategory, null);
    if (!mainCategoryId) {
      console.error(`Main category not found in database: ${mainCategory}`);
      return;
    }
    
    const subcategories = productsByCategory[mainCategory];
    
    // Filter subcategories if specified
    const subcategoriesToProcess = subcategory 
      ? subcategories[subcategory] ? { [subcategory]: subcategories[subcategory] } : {}
      : subcategories;
    
    if (subcategory && !subcategories[subcategory]) {
      console.error(`Subcategory not found: ${subcategory}`);
      console.log(`Available subcategories for ${mainCategory}: ${Object.keys(subcategories).join(', ')}`);
      return;
    }
    
    // Process each subcategory
    for (const [subCategoryName, urls] of Object.entries(subcategoriesToProcess)) {
      console.log(`\nProcessing subcategory: ${subCategoryName}`);
      
      // Get subcategory ID
      const subCategoryId = await getCategoryIdByNameAndParent(subCategoryName, mainCategoryId);
      if (!subCategoryId) {
        console.error(`Subcategory not found in database: ${subCategoryName}`);
        continue;
      }
      
      // Apply limit if provided
      const urlsToProcess = limit ? (urls as string[]).slice(0, limit) : (urls as string[]);
      console.log(`Processing ${urlsToProcess.length} out of ${(urls as string[]).length} URLs`);
      
      // Process each URL in this subcategory
      for (const url of urlsToProcess) {
        try {
          console.log(`Processing: ${url}`);
          const productData = await scrapeProductData(url);
          
          if (productData) {
            // Create/update the product
            await createOrUpdateProduct(
              productData.name,
              productData.retailer,
              productData.price,
              url,
              {
                ...productData,
                main_category: mainCategory,
                sub_category: subCategoryName
              },
              30, // Longer validity period for initial data
              productData.imageUrl
            );
            
            // Get the product ID
            const productId = await getProductIdByUrl(url);
            if (productId) {
              // Check if this product is in multiCategoryProducts
              const multiCategoryConfig = multiCategoryProducts[url];
              
              if (multiCategoryConfig && 
                  multiCategoryConfig.mainCategory === mainCategory && 
                  multiCategoryConfig.primarySubcategory === subCategoryName) {
                
                // Add as primary category
                await addProductToCategory(productId, subCategoryId, true);
                
                // Add additional categories
                for (const additionalCat of multiCategoryConfig.additionalSubcategories) {
                  const additionalMainCatId = await getCategoryIdByNameAndParent(additionalCat.category, null);
                  if (additionalMainCatId) {
                    const additionalSubCatId = await getCategoryIdByNameAndParent(
                      additionalCat.subcategory, 
                      additionalMainCatId
                    );
                    
                    if (additionalSubCatId) {
                      await addProductToCategory(productId, additionalSubCatId, false);
                      console.log(`Added additional category ${additionalCat.category}/${additionalCat.subcategory}`);
                    }
                  }
                }
              } else {
                // Regular product, just add to its primary category
                await addProductToCategory(productId, subCategoryId, true);
              }
              
              console.log(`Added: ${productData.name}`);
            }
          } else {
            console.log(`Failed to scrape: ${url}`);
          }
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`Error processing ${url}:`, error);
        }
      }
    }
    
    console.log('\nProduct loading completed');
  } catch (error) {
    console.error('Error in load category products script:', error);
  }
}

// Helper function to get product ID by URL
async function getProductIdByUrl(url: string) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .eq('url', url)
      .single();
      
    if (error) throw error;
    return data?.id;
  } catch (error) {
    console.error('Error getting product ID by URL:', error);
    return null;
  }
}

// Function to list available categories and subcategories
function listCategories() {
  console.log('Available categories and subcategories:');
  for (const [mainCategory, subcategories] of Object.entries(productsByCategory)) {
    console.log(`\n${mainCategory}:`);
    for (const subcategory of Object.keys(subcategories)) {
      const count = (subcategories[subcategory] as string[]).length;
      console.log(`  - ${subcategory} (${count} products)`);
    }
  }
}

// This function will be called when the script is executed directly
export async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.length === 0) {
    console.log('Usage: node load-category.ts [options]');
    console.log('');
    console.log('Options:');
    console.log('  --category [name]      Load only the specified category');
    console.log('  --subcategory [name]   Load only the specified subcategory (requires --category)');
    console.log('  --limit [number]       Limit the number of products to load per subcategory');
    console.log('  --list                 List all available categories and subcategories');
    console.log('  --help                 Show this help message');
    return;
  }
  
  if (args.includes('--list')) {
    listCategories();
    return;
  }
  
  // Check for --category flag
  const categoryIndex = args.indexOf('--category');
  if (categoryIndex === -1 || args.length <= categoryIndex + 1) {
    console.error('Error: --category option is required with a category name');
    return;
  }
  const category = args[categoryIndex + 1];
  
  // Check for --subcategory flag
  let subcategory = undefined;
  const subcategoryIndex = args.indexOf('--subcategory');
  if (subcategoryIndex !== -1 && args.length > subcategoryIndex + 1) {
    subcategory = args[subcategoryIndex + 1];
  }
  
  // Check for --limit flag
  let limit = undefined;
  const limitIndex = args.indexOf('--limit');
  if (limitIndex !== -1 && args.length > limitIndex + 1) {
    limit = parseInt(args[limitIndex + 1], 10);
  }
  
  await loadCategoryProducts(category, subcategory, limit);
  
  // Exit process after completion if this is a script
  if (typeof window === 'undefined') {
    console.log('Script execution completed');
    process.exit(0);
  }
}

// Auto-execute when run directly
if (typeof window === 'undefined' && process.argv[1]?.includes('load-category')) {
  main();
} 