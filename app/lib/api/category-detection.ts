import { getCategoryIdByNameAndParent, addProductToCategory, getOrCreateCategoryByName } from '../db';
import { validateCategoryExists } from './category-validation';

// Interface for detected categories
export interface DetectedCategory {
  categoryId: string;
  isPrimary: boolean;
}

// Type definitions for category data structures
type CategoryKeywords = Record<string, string[]>;
type SubcategoryKeywords = Record<string, Record<string, string[]>>;

/**
 * Normalizes a string into a category slug name
 * @param text - The raw text to convert to a slug
 * @returns The normalized slug for use as a category name
 */
function normalizeToSlug(text: string): string {
  return text.toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')  // Remove special chars
    .replace(/[\s_-]+/g, '_')  // Replace spaces and hyphens with underscores
    .replace(/^-+|-+$/g, '');  // Trim hyphens from start and end
}

/**
 * Converts a slug to a display name
 * @param slug - The slug to convert
 * @returns The display name (capitalized words)
 */
function slugToDisplayName(slug: string): string {
  return slug
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Detects product categories based on product name, URL, and Claude's analysis
 * @param productData - The product data to analyze
 * @param url - The product URL
 * @param claudeApplianceType - Optional appliance type from Claude's analysis
 * @returns Array of detected categories with their IDs and primary status
 */
export async function detectProductCategories(
  productData: any, 
  url: string, 
  claudeApplianceType?: string
): Promise<DetectedCategory[]> {
  const name = productData.name.toLowerCase();
  const detectedCategories: DetectedCategory[] = [];
  
  // Main category detection - check for main appliance types in the name or URL
  const mainCategories: CategoryKeywords = {
    refrigerators: ['refrigerator', 'fridge', 'freezer', 'cooler'],
    washing_machines: ['washer', 'washing machine', 'wash machine', 'clothes washer'],
    dryers: ['dryer', 'drying machine', 'clothes dryer'],
    dishwashers: ['dishwasher', 'dish washer'],
    ovens: ['oven', 'wall oven', 'built-in oven'],
    stoves: ['stove', 'range', 'cooktop', 'cooking surface'],
    microwaves: ['microwave'],
    cooktops: ['cooktop', 'cooking surface', 'stovetop', 'hob'],
    range_hoods: ['range hood', 'vent hood', 'exhaust hood', 'ventilation', 'hood', 'stove hood'],
    laundry_centers: ['laundry center', 'stacked washer dryer', 'washer dryer combo', 'laundry combo'],
    air_conditioners: ['air conditioner', 'ac unit', 'cooling', 'air conditioning'],
    vacuum_cleaners: ['vacuum', 'cleaner', 'sweeper']
  };
  
  // Subcategory detection patterns
  const subCategories: SubcategoryKeywords = {
    refrigerators: {
      french_door: ['french door', 'french-door'],
      side_by_side: ['side by side', 'side-by-side'],
      top_freezer: ['top freezer', 'top-freezer', 'freezer on top'],
      bottom_freezer: ['bottom freezer', 'bottom-freezer', 'freezer on bottom'],
      counter_depth: ['counter depth', 'counter-depth', 'built-in depth'],
      mini_fridge: ['mini', 'compact', 'small']
    },
    washing_machines: {
      front_load: ['front load', 'front-load', 'front loader'],
      top_load: ['top load', 'top-load', 'top loader'],
      compact: ['compact', 'small', 'apartment size', 'space saving'],
      smart: ['smart', 'wifi', 'connected', 'app control']
    },
    dryers: {
      electric: ['electric', 'plug-in'],
      gas: ['gas', 'natural gas', 'propane'],
      compact: ['compact', 'small', 'apartment size', 'space saving'],
      smart: ['smart', 'wifi', 'connected', 'app control']
    },
    dishwashers: {
      built_in: ['built in', 'built-in', 'under counter', 'undercounter'],
      portable: ['portable', 'movable', 'countertop'],
      drawer: ['drawer', 'pull out', 'pull-out'],
      smart: ['smart', 'wifi', 'connected', 'app control'],
      control_panel: ['top control', 'front control', 'top', 'front', 'hidden controls', 'visible controls', 'panel location'],
      handle: ['pocket handle', 'pocket-handle', 'bar handle', 'bar-handle', 'handle type', 'handle style', 'recessed handle', 'integrated handle']
    },
    ovens: {
      wall_oven: ['wall oven', 'wall-oven', 'built in oven', 'built-in oven'],
      double_oven: ['double oven', 'double-oven', 'dual oven'],
      gas: ['gas', 'natural gas', 'propane'],
      electric: ['electric']
    },
    stoves: {
      freestanding: ['freestanding', 'free standing', 'standalone'],
      slide_in: ['slide-in', 'slide in'],
      drop_in: ['drop-in', 'drop in'],
      gas: ['gas', 'natural gas', 'propane', 'burner'],
      electric: ['electric', 'ceramic', 'coil', 'coil top'],
      induction: ['induction']
    },
    range_hoods: {
      under_cabinet: ['under cabinet', 'under-cabinet', 'mounted'],
      over_the_range: ['over the range', 'over-the-range', 'OTR'],
      wall_mounted: ['wall mount', 'wall-mounted', 'chimney style'],
      island: ['island', 'ceiling mounted', 'ceiling-mounted'],
      downdraft: ['downdraft', 'down draft', 'retractable'],
      convertible: ['convertible', 'ductless', 'recirculating', 'ducted']
    },
    laundry_centers: {
      electric: ['electric dryer', 'electric'],
      gas: ['gas dryer', 'gas'],
      compact: ['compact', 'apartment size', 'space saving'],
      smart: ['smart', 'wifi', 'connected']
    },
    microwaves: {
      countertop: ['countertop', 'counter top', 'portable'],
      built_in: ['built in', 'built-in', 'wall mounted'],
      over_the_range: ['over the range', 'over-the-range', 'OTR', 'microwave hood', 'hood microwave'],
      drawer: ['drawer', 'pull out', 'pull-out'],
      smart: ['smart', 'wifi', 'connected', 'app control'],
      convertible: ['convertible', 'ducted', 'ductless']
    },
    cooktops: {
      gas: ['gas', 'natural gas', 'propane', 'burner'],
      electric: ['electric', 'radiant', 'ceramic', 'coil', 'coil top', 'element'],
      induction: ['induction', 'magnetic'],
      modular: ['modular', 'convertible'],
      built_in: ['built in', 'built-in', 'drop in']
    }
  };
  
  // First try using Claude's appliance type if available
  let mainCategory: string | null = null;
  let mainCategoryId: string | null = null;
  
  if (claudeApplianceType) {
    const normalizedClaudeType = claudeApplianceType.toLowerCase().trim();
    
    // Check if Claude's type directly matches a main category
    for (const [category, _] of Object.entries(mainCategories)) {
      const normalizedCategory = category.replace('_', ' ');
      if (normalizedClaudeType.includes(normalizedCategory) || 
          normalizedCategory.includes(normalizedClaudeType)) {
        mainCategory = category;
        break;
      }
    }
    
    // If not found by direct match, look for keywords
    if (!mainCategory) {
      for (const [category, keywords] of Object.entries(mainCategories)) {
        if (keywords.some(keyword => normalizedClaudeType.includes(keyword))) {
          mainCategory = category;
          break;
        }
      }
    }
    
    // If still not found, validate and then create a new main category from Claude's type
    if (!mainCategory && claudeApplianceType) {
      console.log(`Validating potential new main category from Claude's type: ${claudeApplianceType}`);
      
      // Validate that this category actually exists by searching for products
      const isValidCategory = await validateCategoryExists(claudeApplianceType);
      
      if (isValidCategory) {
        console.log(`Validated new main category: ${claudeApplianceType}`);
        const newMainCategory = normalizeToSlug(claudeApplianceType);
        const displayName = claudeApplianceType.trim(); // Use Claude's original classification
        
        // Create the new category
        mainCategoryId = await getOrCreateCategoryByName(newMainCategory, displayName);
        
        if (mainCategoryId) {
          console.log(`Created new main category: ${displayName} (${newMainCategory})`);
          mainCategory = newMainCategory;
        }
      } else {
        console.log(`Invalid category "${claudeApplianceType}" - not creating in database`);
      }
    }
  }
  
  // If Claude's type didn't match, try product name and URL
  if (!mainCategory) {
    for (const [category, keywords] of Object.entries(mainCategories)) {
      if (keywords.some(keyword => name.includes(keyword) || url.toLowerCase().includes(keyword))) {
        mainCategory = category;
        break;
      }
    }
  }
  
  // Get the main category ID if we found a match but don't have the ID yet
  if (mainCategory && !mainCategoryId) {
    console.log(`Detected main category: ${mainCategory}`);
    mainCategoryId = await getCategoryIdByNameAndParent(mainCategory, null);
  }
  
  if (mainCategory && mainCategoryId) {
    // Look for matching subcategories if we found a main category
    let subCategoryMatches = subCategories[mainCategory] || {};
    let foundSubcategory = false;
    
    if (Object.keys(subCategoryMatches).length > 0) {
      for (const [subCategory, keywords] of Object.entries(subCategoryMatches)) {
        if (keywords.some(keyword => 
          name.includes(keyword) || 
          url.toLowerCase().includes(keyword) ||
          (claudeApplianceType && claudeApplianceType.toLowerCase().includes(keyword))
        )) {
          // Get the subcategory ID
          const subCategoryId = await getCategoryIdByNameAndParent(subCategory, mainCategoryId);
          if (subCategoryId) {
            console.log(`Detected subcategory: ${subCategory}`);
            detectedCategories.push({
              categoryId: subCategoryId,
              isPrimary: true // First matching subcategory becomes primary
            });
            foundSubcategory = true;
            break; // Stop after finding first matching subcategory
          }
        }
      }
    }
    
    // If Claude specified a type that looks like a subcategory and no subcategory was found
    if (!foundSubcategory && claudeApplianceType && 
        claudeApplianceType.toLowerCase() !== mainCategory.replace('_', ' ')) {
      // Check if Claude's type might be describing a subcategory
      const mainCatTerms = mainCategory.split('_').join(' ');
      const claudeTypeWithoutMainCat = claudeApplianceType
        .toLowerCase()
        .replace(mainCatTerms, '')
        .trim();
      
      // If there's additional description beyond the main category
      if (claudeTypeWithoutMainCat && claudeTypeWithoutMainCat !== mainCatTerms) {
        // Validate this potential subcategory
        const potentialSubcategory = `${mainCatTerms} ${claudeTypeWithoutMainCat}`;
        const isValidSubcategory = await validateCategoryExists(potentialSubcategory);
        
        if (isValidSubcategory) {
          const newSubCategorySlug = normalizeToSlug(claudeTypeWithoutMainCat);
          
          // Create display name with proper capitalization
          const displayName = claudeTypeWithoutMainCat
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          // Create the new subcategory
          const newSubCategoryId = await getOrCreateCategoryByName(
            newSubCategorySlug,
            displayName,
            mainCategoryId
          );
          
          if (newSubCategoryId) {
            console.log(`Created new subcategory: ${displayName} (${newSubCategorySlug}) under ${mainCategory}`);
            detectedCategories.push({
              categoryId: newSubCategoryId,
              isPrimary: true
            });
            foundSubcategory = true;
          }
        } else {
          console.log(`Invalid subcategory "${potentialSubcategory}" - not creating in database`);
        }
      }
    }
    
    // If no subcategory was found, at least assign the main category
    if (!foundSubcategory && mainCategoryId) {
      detectedCategories.push({
        categoryId: mainCategoryId,
        isPrimary: true
      });
    }
  }
  
  return detectedCategories;
}

/**
 * Applies detected categories to a product in the database
 * @param productId - The ID of the product in the database
 * @param categories - Array of detected categories
 */
export async function applyCategoriesToProduct(
  productId: string, 
  categories: DetectedCategory[]
): Promise<void> {
  if (!categories || categories.length === 0) {
    console.log(`No categories detected for product ${productId}`);
    return;
  }
  
  // Sort so that primary categories are processed first
  const sortedCategories = [...categories].sort((a, b) => 
    a.isPrimary === b.isPrimary ? 0 : a.isPrimary ? -1 : 1
  );
  
  for (const category of sortedCategories) {
    try {
      await addProductToCategory(productId, category.categoryId, category.isPrimary);
      console.log(`Added product ${productId} to category ${category.categoryId}${category.isPrimary ? ' (primary)' : ''}`);
    } catch (error) {
      console.error(`Failed to add product ${productId} to category ${category.categoryId}:`, error);
    }
  }
} 