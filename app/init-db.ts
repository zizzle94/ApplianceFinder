import { initializeDatabase, initializeSchemaUpdates } from './lib/db';

// Initialize the database
export async function initDb() {
  try {
    await initializeDatabase();
    await initializeSchemaUpdates();
    return { success: true };
  } catch (error) {
    console.error('Error initializing database:', error);
    return { success: false, error };
  }
}

// Export for use in Next.js config
export default initDb; 