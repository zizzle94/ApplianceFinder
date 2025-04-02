import axios from 'axios';

/**
 * Validates if a potential category actually exists by checking if products can be found
 * using Oxylabs search
 * 
 * @param categoryName - The potential category name to validate
 * @returns True if the category appears to be valid (products found), false otherwise
 */
export async function validateCategoryExists(categoryName: string): Promise<boolean> {
  if (!process.env.OXYLABS_USERNAME || !process.env.OXYLABS_PASSWORD) {
    console.warn('Oxylabs credentials not found, skipping category validation');
    return false; // Fail closed if we can't validate
  }

  try {
    console.log(`Validating if category exists: "${categoryName}"`);
    
    // Construct search query
    const searchQuery = categoryName;
    const retailers = ['bestbuy.com', 'homedepot.com', 'lowes.com'];
    
    // Track if we found products in any retailer
    let productsFound = false;
    
    // Search across multiple retailers for validation
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
          
          // If we found at least 2 results, consider it validated
          // This helps avoid false positives from unrelated search results
          if (searchResults.length >= 2) {
            console.log(`Category "${categoryName}" validated with ${searchResults.length} products on ${site}`);
            productsFound = true;
            break; // No need to check other retailers
          }
          
          console.log(`Found ${searchResults.length} results for "${categoryName}" on ${site} (not enough)`);
        }
      } catch (error) {
        console.warn(`Error validating on ${site}:`, error);
        // Continue with next retailer
      }
    }
    
    // If no products found across any retailer, category is probably not valid
    if (!productsFound) {
      console.log(`Category "${categoryName}" seems invalid - no products found`);
    }
    
    return productsFound;
  } catch (error) {
    console.error('Error validating category:', error);
    return false;
  }
}

/**
 * Extracts the most likely valid category from a user query by checking what terms
 * actually return product results
 * 
 * @param userQuery - The original user query
 * @returns The validated category or subcategory name, or null if none found
 */
export async function extractValidCategory(userQuery: string): Promise<string | null> {
  // First check if the full query is a valid category
  if (await validateCategoryExists(userQuery)) {
    return userQuery;
  }
  
  // Try potential category extractions from the query
  const terms = userQuery.split(' ');
  
  // Try progressively shorter combinations of terms
  for (let length = terms.length - 1; length >= 1; length--) {
    for (let i = 0; i <= terms.length - length; i++) {
      const potentialCategory = terms.slice(i, i + length).join(' ');
      if (await validateCategoryExists(potentialCategory)) {
        return potentialCategory;
      }
    }
  }
  
  // No valid category found
  return null;
} 