import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Create a Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetDatabaseCascade() {
  try {
    console.log('Starting complete database reset with CASCADE...');
    
    // SQL to drop all tables forcefully with CASCADE
    const dropTablesSql = `
      -- Drop tables forcefully with CASCADE option
      DROP TABLE IF EXISTS feedback CASCADE;
      DROP TABLE IF EXISTS queries CASCADE;
      DROP TABLE IF EXISTS saved_appliances CASCADE;
      DROP TABLE IF EXISTS homespy_lookups CASCADE;
      DROP TABLE IF EXISTS products CASCADE;
      DROP TABLE IF EXISTS product_categories CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      
      -- Let the user know this was successful
      SELECT 'All tables dropped successfully' as result;
    `;
    
    // Execute SQL for dropping tables
    console.log('Dropping all tables with CASCADE...');
    const dropResult = await supabase.rpc('exec_sql', { sql_query: dropTablesSql });
    
    if (dropResult.error) {
      console.error('Error dropping tables:', dropResult.error);
      return;
    }
    console.log('All tables dropped successfully');
    
    console.log('Database has been completely reset.');
    console.log('Run the fix-db.ts script to initialize the database structure again.');
  } catch (error) {
    console.error('Error in database reset:', error);
  }
}

// Confirmation prompt
console.log('WARNING: This will delete ALL data in your database!');
console.log('Press Ctrl+C to cancel or wait 5 seconds to proceed...');

// Wait 5 seconds before proceeding
setTimeout(() => {
  resetDatabaseCascade()
    .catch(error => console.error('Unhandled error:', error))
    .finally(() => console.log('Script execution completed'));
}, 5000); 