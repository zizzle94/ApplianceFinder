// Import the required modules
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local file
dotenv.config({ path: '.env.local' });

// Get the directory name of the current module
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

// Create a Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function initializeDatabase() {
  try {
    // Read schema SQL
    const schema = fs.readFileSync(
      path.join(__dirname, '../app/lib/db/schema.sql'),
      'utf8'
    );

    // Execute schema SQL using Supabase's rpc call
    const { error } = await supabase.rpc('exec_sql', { sql_query: schema });
    
    if (error) throw error;
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

async function initializeSchemaUpdates() {
  try {
    // Read schema update SQL
    const schemaUpdate = fs.readFileSync(
      path.join(__dirname, '../app/lib/db/schema-update.sql'),
      'utf8'
    );

    // Execute schema update SQL using Supabase's rpc call
    const { error } = await supabase.rpc('exec_sql', { sql_query: schemaUpdate });
    
    if (error) throw error;
    console.log('Database schema updates applied successfully');
  } catch (error) {
    console.error('Error applying database schema updates:', error);
    throw error;
  }
}

// Run the database initialization
async function initDb() {
  try {
    await initializeDatabase();
    await initializeSchemaUpdates();
    console.log('Database initialization complete!');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// Execute the function
initDb(); 