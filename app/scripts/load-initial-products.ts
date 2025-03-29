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

// Define product URLs by category and subcategory, with some having multiple subcategories
const productsByCategory = {
  refrigerators: {
    french_door: [
      'https://www.bestbuy.com/site/samsung-29-cu-ft-bespoke-4-door-flex-smart-refrigerator-with-family-hub-stainless-steel/6505101.p?skuId=6505101',
      'https://www.homedepot.com/p/LG-Electronics-26-cu-ft-French-Door-Smart-Refrigerator-with-InstaView-Door-in-Door-and-Craft-Ice-in-PrintProof-Stainless-Steel-LRFXC2606S/316393829',
    ],
    side_by_side: [
      'https://www.bestbuy.com/site/samsung-28-cu-ft-large-capacity-side-by-side-refrigerator-with-touch-screen-family-hub-fingerprint-resistant-stainless-steel/6401672.p?skuId=6401672',
      'https://www.homedepot.com/p/LG-Electronics-27-cu-ft-Side-by-Side-Refrigerator-with-Door-in-Door-and-Craft-Ice-in-PrintProof-Stainless-Steel-LRSDS2706S/319135639',
    ],
    top_freezer: [
      'https://www.bestbuy.com/site/ge-17-5-cu-ft-top-freezer-refrigerator-stainless-steel/6390560.p?skuId=6390560',
      'https://www.lowes.com/pd/Whirlpool-18-2-cu-ft-Top-Freezer-Refrigerator-with-Ice-Maker-Stainless-Steel/5001895697',
    ],
    bottom_freezer: [
      'https://www.bestbuy.com/site/lg-26-cu-ft-bottom-freezer-refrigerator-stainless-steel/6419633.p?skuId=6419633',
      'https://www.homedepot.com/p/LG-Electronics-26-cu-ft-Bottom-Freezer-Refrigerator-in-Stainless-Steel-LFXS26973S/309383595',
    ],
    built_in: [
      'https://www.bestbuy.com/site/thermador-freedom-collection-36-built-in-french-door-refrigerator-stainless-steel/6191342.p?skuId=6191342',
      'https://www.homedepot.com/p/KitchenAid-42-in-W-25-5-cu-ft-Built-In-Side-by-Side-Refrigerator-in-PrintShield-Stainless-KBSN602ESS/304034054'
    ],
    full_freezer: [
      'https://www.bestbuy.com/site/frigidaire-20-cu-ft-frost-free-upright-freezer-brushed-steel/6401756.p?skuId=6401756',
      'https://www.homedepot.com/p/GE-21-3-cu-ft-Frost-Free-Upright-Freezer-in-White-FUF21DLRWW/312587548'
    ]
  },
  
  washing_machines: {
    front_load: [
      'https://www.bestbuy.com/site/lg-5-0-cu-ft-front-load-washer-with-ai-technology-white/6542177.p?skuId=6542177',
      'https://www.homedepot.com/p/LG-Electronics-5-0-cu-ft-Smart-White-Front-Load-Washer-with-TurboWash360-Steam-and-Built-In-Intelligence-WM4500HWA/314577440',
    ],
    top_load: [
      'https://www.bestbuy.com/site/samsung-5-0-cu-ft-high-efficiency-top-load-washer-with-super-speed-wash-brushed-black/6401599.p?skuId=6401599',
      'https://www.lowes.com/pd/GE-4-5-cu-ft-Smart-Capable-Top-Load-Washer-with-Tide-PODS-Dispense-and-Sanitize-with-Oxi-White/5001695869',
    ],
    portable: [
      'https://www.bestbuy.com/site/magic-chef-1-6-cu-ft-compact-portable-washer-white/6401722.p?skuId=6401722',
      'https://www.homedepot.com/p/BLACK-DECKER-0-9-cu-ft-Portable-Washer-in-White-BPWM09W/314458370'
    ]
  },
  
  dryers: {
    electric: [
      'https://www.bestbuy.com/site/samsung-7-4-cu-ft-electric-dryer-with-sensor-dry-brushed-black/6401749.p?skuId=6401749',
      'https://www.homedepot.com/p/LG-Electronics-7-4-cu-ft-White-Smart-Electric-Vented-Dryer-with-TurboSteam-and-Built-In-Intelligence-DLEX4500W/314580010',
    ],
    gas: [
      'https://www.bestbuy.com/site/samsung-7-4-cu-ft-gas-dryer-with-sensor-dry-white/6401603.p?skuId=6401603',
      'https://www.lowes.com/pd/GE-7-8-cu-ft-Smart-Stackable-Gas-Dryer-with-Steam-Sanitize-ENERGY-STAR/1001840980',
    ]
  },
  
  dishwashers: {
    built_in: [
      'https://www.bestbuy.com/site/bosch-800-series-24-built-in-dishwasher-with-crystaldry-stainless-steel/6397758.p?skuId=6397758',
      'https://www.homedepot.com/p/GE-Profile-24-in-Smart-Built-In-Front-Control-Tall-Tub-Dishwasher-in-Fingerprint-Resistant-Stainless-Steel-with-Steam-Cleaning-40-dBA-PDP715SYPFS/313074462',
    ],
    portable: [
      'https://www.bestbuy.com/site/ge-24-portable-dishwasher-with-sanitize-cycle-white/6505438.p?skuId=6505438',
      'https://www.lowes.com/pd/GE-24-in-Portable-Dishwasher-White-55-Decibel-ENERGY-STAR/5001442887',
    ]
  },
  
  ovens: {
    wall_oven: [
      'https://www.bestbuy.com/site/ge-profile-30-smart-single-electric-wall-oven-with-convection-stainless-steel/6190906.p?skuId=6190906',
      'https://www.homedepot.com/p/GE-30-in-Smart-Single-Electric-Wall-Oven-with-Convection-Steam-Self-Cleaning-in-Stainless-Steel-JTS5000SNSS/311892361',
    ],
    range: [
      'https://www.bestbuy.com/site/samsung-7-1-cu-ft-electric-double-oven-convection-range-fingerprint-resistant-stainless-steel/6449731.p?skuId=6449731',
      'https://www.lowes.com/pd/GE-Profile-Smart-Slide-In-Double-Oven-Air-Fry-Convection-Range-Stainless-Steel-Common-30-in-Actual-29-875-in/5014248005',
    ]
  },

  laundry_centers: {
    electric: [
      'https://www.bestbuy.com/site/lg-washer-and-electric-dryer-laundry-center-white/6419633.p?skuId=6419633',
      'https://www.homedepot.com/p/GE-Unitized-Spacemaker-3-8-cu-ft-Washer-and-5-9-cu-ft-Electric-Dryer-Laundry-Center-White-GUD27ESSMWW/204394431'
    ],
    gas: [
      'https://www.bestbuy.com/site/lg-washer-and-gas-dryer-laundry-center-white/6419634.p?skuId=6419634',
      'https://www.homedepot.com/p/GE-Unitized-Spacemaker-3-8-cu-ft-Washer-and-5-9-cu-ft-Gas-Dryer-Laundry-Center-White-GUD27GSSMWW/204394432'
    ]
  },
};

// Define interface for multi-category product configuration
interface MultiCategoryConfig {
  mainCategory: string;
  primarySubcategory: string;
  additionalSubcategories: Array<{
    category: string;
    subcategory: string;
  }>;
}

// Define products that should be in multiple categories
const multiCategoryProducts: Record<string, MultiCategoryConfig> = {
  'https://www.bestbuy.com/site/samsung-23-cu-ft-counter-depth-4-door-flex-refrigerator-with-family-hub-fingerprint-resistant-stainless-steel/6401671.p?skuId=6401671': {
    mainCategory: 'refrigerators',
    primarySubcategory: 'counter_depth',
    additionalSubcategories: [
      { category: 'refrigerators', subcategory: 'french_door' }
    ]
  },
  'https://www.bestbuy.com/site/samsung-5-0-cu-ft-high-efficiency-smart-top-load-washer-with-super-speed-wash-brushed-black/6401754.p?skuId=6401754': {
    mainCategory: 'washing_machines',
    primarySubcategory: 'smart',
    additionalSubcategories: [
      { category: 'washing_machines', subcategory: 'top_load' }
    ]
  },
  'https://www.bestbuy.com/site/samsung-7-4-cu-ft-smart-electric-dryer-with-steam-sanitize-brushed-black/6401752.p?skuId=6401752': {
    mainCategory: 'dryers',
    primarySubcategory: 'smart',
    additionalSubcategories: [
      { category: 'dryers', subcategory: 'electric' }
    ]
  }
};

async function loadInitialProducts() {
  try {
    // Initialize the database first
    await initializeDatabase();
    await initializeSchemaUpdates();
    
    console.log('Starting to load initial products...');
    
    // Process each main category
    for (const [mainCategoryName, subcategories] of Object.entries(productsByCategory)) {
      console.log(`\nProcessing main category: ${mainCategoryName}`);
      
      // Get main category ID
      const mainCategoryId = await getCategoryIdByNameAndParent(mainCategoryName, null);
      if (!mainCategoryId) {
        console.error(`Main category not found: ${mainCategoryName}`);
        continue;
      }
      
      // Process each subcategory
      for (const [subCategoryName, urls] of Object.entries(subcategories)) {
        console.log(`\nProcessing subcategory: ${subCategoryName}`);
        
        // Get subcategory ID
        const subCategoryId = await getCategoryIdByNameAndParent(subCategoryName, mainCategoryId);
        if (!subCategoryId) {
          console.error(`Subcategory not found: ${subCategoryName}`);
          continue;
        }
        
        // Process each URL in this subcategory
        for (const url of urls) {
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
                  main_category: mainCategoryName,
                  sub_category: subCategoryName
                },
                30 // Longer validity period for initial data
              );
              
              // Get the product ID
              const productId = await getProductIdByUrl(url);
              if (productId) {
                // Check if this product is in multiCategoryProducts
                const multiCategoryConfig = multiCategoryProducts[url];
                
                if (multiCategoryConfig && 
                    multiCategoryConfig.mainCategory === mainCategoryName && 
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
    }
    
    console.log('\nInitial product loading completed');
  } catch (error) {
    console.error('Error in load initial products script:', error);
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

// This function will be called when the script is executed directly
export async function main() {
  await loadInitialProducts();
  // Exit process after completion if this is a script
  if (typeof window === 'undefined') {
    console.log('Script execution completed');
    process.exit(0);
  }
}

// Auto-execute when run directly
if (typeof window === 'undefined' && process.argv[1]?.includes('load-initial-products')) {
  main();
} 