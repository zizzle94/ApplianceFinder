import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
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

async function resetAndInitializeDatabase() {
  try {
    console.log('Starting database reset and initialization...');
    
    // Read schema SQL
    const schemaPath = path.join(process.cwd(), 'app/lib/db/schema.sql');
    console.log(`Reading schema from ${schemaPath}`);
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema SQL using Supabase's rpc call
    console.log('Applying base schema...');
    const schemaResult = await supabase.rpc('exec_sql', { sql_query: schema });
    
    if (schemaResult.error) {
      console.error('Error applying base schema:', schemaResult.error);
      return;
    }
    console.log('Base schema applied successfully');
    
    // Read schema update SQL
    const schemaUpdatePath = path.join(process.cwd(), 'app/lib/db/schema-update.sql');
    console.log(`Reading schema updates from ${schemaUpdatePath}`);
    const schemaUpdate = fs.readFileSync(schemaUpdatePath, 'utf8');
    
    // Execute schema update SQL
    console.log('Applying schema updates...');
    const updateResult = await supabase.rpc('exec_sql', { sql_query: schemaUpdate });
    
    if (updateResult.error) {
      console.error('Error applying schema updates:', updateResult.error);
      return;
    }
    console.log('Schema updates applied successfully');
    
    console.log('Database reset and initialization complete!');
  } catch (error) {
    console.error('Error in database reset and initialization:', error);
  }
}

// Run the function
resetAndInitializeDatabase()
  .catch(error => console.error('Unhandled error:', error))
  .finally(() => console.log('Script execution completed')); 