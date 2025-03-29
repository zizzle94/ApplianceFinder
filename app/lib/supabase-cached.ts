import 'server-only';
import { createServerSupabaseClient } from './auth';
import { cache } from 'react';

// Cache constants
export const CACHE_NONE = 0;
export const CACHE_SHORT = 60; // 1 minute
export const CACHE_MEDIUM = 60 * 15; // 15 minutes
export const CACHE_LONG = 60 * 60 * 24; // 24 hours

/**
 * Creates a cached version of a database query
 * Uses Next.js React cache() for efficient server component rendering
 * 
 * @param fn The function to cache
 * @returns A cached version of the function
 */
export function createCachedQuery<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return cache(fn) as T;
}

/**
 * Generic cached Supabase query with error handling
 * Use this for queries that can be cached for some time
 * 
 * @param queryFn Function that performs the Supabase query
 * @returns Result of the query or null on error
 */
export const cachedSupabaseQuery = createCachedQuery(async <T>(
  queryFn: (supabase: ReturnType<typeof createServerSupabaseClient>) => Promise<{ data: T | null, error: any }>
): Promise<T | null> => {
  const supabase = createServerSupabaseClient();
  try {
    const { data, error } = await queryFn(supabase);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Supabase query error:', error);
    return null;
  }
});

/**
 * Get a product by ID with caching
 * Example of a specific cached query
 */
export const getProductById = createCachedQuery(async (productId: string) => {
  return cachedSupabaseQuery(async (supabase) => {
    return supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();
  });
});

/**
 * Get products by type with caching
 * Example of a cached query with parameters
 */
export const getProductsByType = createCachedQuery(async (type: string, limit: number = 20) => {
  return cachedSupabaseQuery(async (supabase) => {
    return supabase
      .from('products')
      .select('*')
      .eq('appliance_type', type)
      .order('popularity', { ascending: false })
      .limit(limit);
  });
});

/**
 * Search products with caching but shorter TTL due to search nature
 */
export const searchProducts = createCachedQuery(async (searchTerm: string, limit: number = 20) => {
  return cachedSupabaseQuery(async (supabase) => {
    // Use text search capabilities
    return supabase
      .from('products')
      .select('*')
      .textSearch('name', searchTerm, {
        type: 'websearch',
        config: 'english'
      })
      .limit(limit);
  });
});

/**
 * Get popular products across all types (good for homepage)
 */
export const getPopularProducts = createCachedQuery(async (limit: number = 10) => {
  return cachedSupabaseQuery(async (supabase) => {
    return supabase
      .from('products')
      .select('*')
      .order('popularity', { ascending: false })
      .limit(limit);
  });
}); 