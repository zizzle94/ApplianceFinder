'use server';

import { updateProductCategories } from '../lib/db';

/**
 * This script updates the product categories in the database to include
 * all the categories and subcategories used in the load-initial-products script.
 */
async function main() {
  try {
    console.log('Starting category update...');
    await updateProductCategories();
    console.log('Categories updated successfully');
    
    // Exit process after completion
    if (typeof window === 'undefined') {
      console.log('Script execution completed');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error updating categories:', error);
    process.exit(1);
  }
}

// Auto-execute when run directly
if (typeof window === 'undefined' && require.main === module) {
  main();
}

export { main }; 