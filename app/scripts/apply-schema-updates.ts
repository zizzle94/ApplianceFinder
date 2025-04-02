'use server';

import { initializeSchemaUpdates } from '../lib/db';

async function applySchemaUpdates() {
  try {
    console.log('Applying database schema updates...');
    await initializeSchemaUpdates();
    console.log('Schema updates applied successfully!');
  } catch (error) {
    console.error('Error applying schema updates:', error);
  }
}

// Run the function if this script is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  applySchemaUpdates().catch(error => console.error('Error in main function:', error));
} 