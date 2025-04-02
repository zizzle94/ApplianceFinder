'use server';

import { supabase } from '../lib/supabase';

async function applyDirectSchemaUpdates() {
  try {
    console.log('Applying database schema updates directly...');
    
    const { error } = await supabase.rpc('exec_sql', { 
      sql_query: `
        ALTER TABLE products ADD COLUMN IF NOT EXISTS make TEXT;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS model_number TEXT;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS features JSONB;
        CREATE INDEX IF NOT EXISTS idx_products_make ON products(make);
        CREATE INDEX IF NOT EXISTS idx_products_model_number ON products(model_number);
      `
    });
    
    if (error) {
      console.error('Error applying schema updates:', error);
      return;
    }
    
    console.log('Schema updates applied successfully!');
  } catch (error) {
    console.error('Error applying schema updates:', error);
  }
}

// Run the function if this script is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  applyDirectSchemaUpdates().catch(error => console.error('Error in main function:', error));
} 