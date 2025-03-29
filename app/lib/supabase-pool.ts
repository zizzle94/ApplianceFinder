import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'server-only';

// Create a simple connection pool for Supabase clients
// This helps manage the number of concurrent connections to Supabase

class SupabasePool {
  private static instance: SupabasePool;
  private pool: SupabaseClient[] = [];
  private inUse: Set<SupabaseClient> = new Set();
  private maxSize: number;
  private minSize: number;
  
  constructor(maxSize = 10, minSize = 2) {
    this.maxSize = maxSize;
    this.minSize = minSize;
    
    // Initialize with minimum connections
    this.initializeMinConnections();
  }
  
  // Get the singleton instance
  public static getInstance(): SupabasePool {
    if (!SupabasePool.instance) {
      SupabasePool.instance = new SupabasePool();
    }
    return SupabasePool.instance;
  }
  
  // Initialize minimum connections
  private initializeMinConnections() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    for (let i = 0; i < this.minSize; i++) {
      const client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }
      });
      this.pool.push(client);
    }
  }
  
  // Get a client from the pool
  public async getClient(): Promise<SupabaseClient> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // If there are available clients in the pool, use one
    if (this.pool.length > 0) {
      const client = this.pool.pop()!;
      this.inUse.add(client);
      return client;
    }
    
    // If we haven't reached max size, create a new client
    if (this.inUse.size < this.maxSize) {
      const client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }
      });
      this.inUse.add(client);
      return client;
    }
    
    // Otherwise, wait for a client to be released
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.pool.length > 0) {
          clearInterval(checkInterval);
          const client = this.pool.pop()!;
          this.inUse.add(client);
          resolve(client);
        }
      }, 50);
    });
  }
  
  // Release a client back to the pool
  public releaseClient(client: SupabaseClient) {
    if (this.inUse.has(client)) {
      this.inUse.delete(client);
      this.pool.push(client);
    }
  }
  
  // Get stats about the pool
  public getStats() {
    return {
      availableClients: this.pool.length,
      inUseClients: this.inUse.size,
      totalCapacity: this.maxSize
    };
  }
}

// Helper function to get a client from the pool and automatically release it
export async function withSupabaseClient<T>(
  fn: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  const pool = SupabasePool.getInstance();
  const client = await pool.getClient();
  
  try {
    return await fn(client);
  } finally {
    pool.releaseClient(client);
  }
}

// Example usage functions

/**
 * Get user data using the connection pool
 */
export async function getPooledUserData(userId: string) {
  return withSupabaseClient(async (supabase) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    return data;
  });
}

/**
 * Save a query using the connection pool
 */
export async function savePooledQuery(
  userId: string,
  inputText: string,
  claudeResponse: any
) {
  return withSupabaseClient(async (supabase) => {
    const { data, error } = await supabase
      .from('queries')
      .insert({
        user_id: userId,
        input_text: inputText,
        claude_response: claudeResponse
      })
      .select('id')
      .single();
      
    if (error) throw error;
    return data.id;
  });
}

/**
 * Get pool stats - useful for monitoring
 */
export function getPoolStats() {
  return SupabasePool.getInstance().getStats();
} 