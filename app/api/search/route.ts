import { NextRequest, NextResponse } from 'next/server';
import { processApplianceQuery } from '../../lib/api/claude';
import { searchProducts, Product } from '../../lib/api/oxylabs-scraper';
import { getUserById } from '../../lib/db';
import { getUserQueries, saveQuery } from '../../lib/api/query-db';
import { hasExceededQueryLimit, getRemainingQueries } from '../../lib/api/query-limits';
import { checkEnvironmentVariables } from '../../lib/api/env-check';
import { getSession } from '../../lib/api/session';
import { findSimilarProducts, incrementProductRecommendationCount } from '../../lib/db';

// Run environment check at module initialization
const envCheck = checkEnvironmentVariables();

// Add detailed error logging helper
function logDetailedError(stage: string, error: any): any {
  console.error(`[ERROR] Stage: ${stage}`);
  
  if (error instanceof Error) {
    console.error(`Error name: ${error.name}`);
    console.error(`Error message: ${error.message}`);
    console.error(`Error stack: ${error.stack}`);
    return {
      stage,
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  } else {
    console.error(`Non-error object:`, error);
    return {
      stage,
      error: String(error)
    };
  }
}

// Ensure all data is serializable to prevent circular reference issues
function sanitizeDataForSerialization(data: any): any {
  // Convert data to JSON and back to remove any circular references or non-serializable content
  try {
    return JSON.parse(JSON.stringify(data));
  } catch (error) {
    console.error("Failed to sanitize data for serialization:", error);
    // Fallback to simple sanitization - handle common non-serializable values
    if (Array.isArray(data)) {
      return data.map(item => sanitizeDataForSerialization(item));
    } else if (data && typeof data === 'object') {
      const safeObject: Record<string, any> = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          safeObject[key] = sanitizeDataForSerialization(data[key]);
        }
      }
      return safeObject;
    }
    // For primitive values or functions/symbols that failed to serialize
    return typeof data === 'function' || typeof data === 'symbol' ? undefined : data;
  }
}

// Log environment configuration
console.log('API Route Environment Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);

export async function POST(request: NextRequest) {
  const errors: any[] = [];
  
  try {
    console.log('Search API request received');
    
    // Extract the query from the request body
    let query;
    try {
      const body = await request.json();
      query = body.query;
      console.log('Request body parsed:', { query });
    } catch (error) {
      errors.push(logDetailedError('request_parsing', error));
      return NextResponse.json(
        { 
          error: 'Failed to parse request body',
          diagnostics: { errors }
        }, 
        { status: 400 }
      );
    }
    
    // Validate the query
    if (!query || typeof query !== 'string' || query.trim() === '') {
      errors.push({ stage: 'query_validation', message: 'Query is required' });
      return NextResponse.json(
        { 
          error: 'Query is required',
          diagnostics: { errors }
        }, 
        { status: 400 }
      );
    }
    
    // Get the user ID from the session
    let session;
    let userId = '00000000-0000-0000-0000-000000000000';
    try {
      session = await getSession();
      userId = session?.user?.id || '00000000-0000-0000-0000-000000000000';
      console.log('Session retrieved:', { userId });
    } catch (error) {
      errors.push(logDetailedError('session_retrieval', error));
      console.warn('Failed to get session, using anonymous user ID');
      // Continue with anonymous user ID
    }
    
    // Get the user's subscription tier
    let subscriptionTier = 'free';
    let pastQueries: string[] = [];
    
    try {
      const user = await getUserById(userId);
      if (user) {
        subscriptionTier = user.subscription_tier || 'free';
        console.log('User found with subscription tier:', subscriptionTier);
        
        // For top tier users, fetch past queries for personalized recommendations
        if (subscriptionTier === 'top') {
          const userQueries = await getUserQueries(userId, 5);
          pastQueries = userQueries.map(q => q.input_text);
          console.log('Retrieved past queries:', pastQueries.length);
        }
      } else {
        console.log('No user found for ID, using free tier');
      }
    } catch (error) {
      errors.push(logDetailedError('user_retrieval', error));
      console.warn('Error getting user or past queries, defaulting to free tier');
      // Continue with free tier if there's an error
    }
    
    // Check if the user has exceeded their query limit
    let hasExceeded = false;
    let remainingQueries = 0;
    
    try {
      hasExceeded = await hasExceededQueryLimit(userId);
      remainingQueries = await getRemainingQueries(userId);
      console.log(`Query limit check - User: ${userId}, Tier: ${subscriptionTier}, Exceeded: ${hasExceeded}, Remaining: ${remainingQueries}`);
    } catch (error) {
      errors.push(logDetailedError('query_limit_check', error));
      console.warn('Error checking query limits, assuming not exceeded');
      // Continue assuming user hasn't exceeded limits
    }
    
    if (hasExceeded) {
      return NextResponse.json(
        { 
          error: 'You have reached your query limit.',
          remainingQueries,
          queryLimit: true,
          diagnostics: { errors }
        }, 
        { status: 403 }
      );
    }
    
    // Process the query with Claude
    console.log('Processing query with Claude:', query);
    let claudeResponse;
    try {
      claudeResponse = await processApplianceQuery({ 
        userQuery: query,
        userId,
        subscriptionTier: subscriptionTier as 'free' | 'middle' | 'top',
        pastQueries
      });
      console.log('Claude response received successfully');
    } catch (error) {
      errors.push(logDetailedError('claude_processing', error));
      return NextResponse.json(
        { 
          error: 'Error processing your query with AI. Please try again later.',
          diagnostics: { errors }
        },
        { status: 500 }
      );
    }
    
    // Save the query to the database
    let queryId;
    try {
      queryId = await saveQuery(userId, query, claudeResponse);
      console.log('Query saved to database with ID:', queryId);
    } catch (error) {
      errors.push(logDetailedError('query_saving', error));
      console.warn('Error saving query to database, continuing without saving');
      // Continue with the search even if saving fails
    }
    
    // Get environment status
    const envStatus = {
      usingMockData: !process.env.OXYLABS_USERNAME || !process.env.OXYLABS_PASSWORD,
      missingVars: envCheck.missingVars
    };
    console.log('Environment status:', envStatus);
    
    // ENHANCED CACHING APPROACH: First check cache for similar products
    let cachedProducts = [];
    let foundInCache = false;
    
    try {
      // Try to find similar products in the cache for each retailer
      if (claudeResponse.applianceType) {
        console.log(`Looking for cached ${claudeResponse.applianceType} products...`);
        
        // Search for each major retailer
        const retailers = ['Best Buy', 'Home Depot', 'Lowes'];
        for (const retailer of retailers) {
          const similarProducts = await findSimilarProducts(claudeResponse.applianceType, retailer, 5);
          
          if (similarProducts.length > 0) {
            console.log(`Found ${similarProducts.length} cached products for ${retailer}`);
            
            // Convert database products to our Product interface
            const convertedProducts = similarProducts.map(p => ({
              name: p.product_name,
              price: p.price || 0,
              imageUrl: p.claude_data?.imageUrl || 'https://via.placeholder.com/300x300?text=No+Image',
              productUrl: p.url,
              retailer: p.retailer,
              features: p.claude_data?.features || []
            }));
            
            cachedProducts.push(...convertedProducts);
            
            // Increment recommendation counts for these products
            for (const product of similarProducts) {
              try {
                await incrementProductRecommendationCount(product.id);
              } catch (err) {
                console.warn(`Failed to increment recommendation count for product ${product.id}:`, err);
              }
            }
          }
        }
        
        if (cachedProducts.length > 0) {
          foundInCache = true;
        }
      }
    } catch (error) {
      errors.push(logDetailedError('cache_retrieval', error));
      console.warn('Error checking product cache, continuing with direct search');
    }
    
    // If we have enough cached products, use them instead of a direct search
    let products: Product[] = [];
    let fromCache = false;
    let pendingUpdate = false;
    
    if (foundInCache && cachedProducts.length >= 3) {
      console.log(`Using ${cachedProducts.length} cached products instead of direct search`);
      products = cachedProducts;
      fromCache = true;
      
      // Asynchronously trigger a background refresh of product data for future queries
      // We don't await this, letting it run in the background
      try {
        fetch('/api/update-products', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET_KEY || 'not-set'}`
          }
        }).catch(err => {
          console.warn('Background cache refresh failed:', err);
        });
        
        pendingUpdate = true;
      } catch (error) {
        console.warn('Failed to trigger background cache refresh:', error);
      }
    } else {
      // Fall back to the original direct search approach
      console.log('Not enough cached results, performing direct search with Oxylabs...');
      
      try {
        // Let's time how long the product search takes
        const startTime = Date.now();
        console.log('Starting product search at:', new Date(startTime).toISOString());
        
        // Setting a progressive timeout strategy
        const quickTimeout = 60000; // 1 minute for initial results
        const fullTimeout = 120000; // 2 minutes max for full results
        
        // Create a promise that will attempt to get results with a progressive timeout
        const searchPromise = new Promise<Product[]>(async (resolve, reject) => {
          try {
            // Create a flag to track if we've already resolved with partial results
            let hasResolvedWithPartialResults = false;
            
            // Set a quick timeout to get at least some results
            const quickTimeoutId = setTimeout(() => {
              // @ts-ignore - Access partial results from global scope
              if (global._partialSearchResults && global._partialSearchResults.length > 0) {
                // @ts-ignore
                console.log(`Quick timeout reached (${quickTimeout}ms). Resolving with ${global._partialSearchResults.length} partial results.`);
                hasResolvedWithPartialResults = true;
                // @ts-ignore
                resolve(global._partialSearchResults);
              }
            }, quickTimeout);
            
            // Start the search
            const searchResult = searchProducts(claudeResponse, subscriptionTier as 'free' | 'middle' | 'top');
            
            // Set up a race between the full timeout and search completion
            const fullResults = await Promise.race([
              searchResult,
              new Promise<Product[]>((_, timeoutReject) => {
                setTimeout(() => {
                  timeoutReject(new Error(`Product search timed out after ${fullTimeout}ms`));
                }, fullTimeout);
              })
            ]);
            
            // Clear the quick timeout since we got full results
            clearTimeout(quickTimeoutId);
            
            // Don't resolve if we already resolved with partial results
            if (!hasResolvedWithPartialResults) {
              resolve(fullResults);
            }
          } catch (error) {
            // @ts-ignore - Access partial results from global scope
            if (global._partialSearchResults && global._partialSearchResults.length > 0) {
              // @ts-ignore
              console.log(`Search failed but returning ${global._partialSearchResults.length} partial results.`);
              // @ts-ignore
              resolve(global._partialSearchResults);
            } else {
              reject(error);
            }
          }
        });
        
        // Wait for the search results or the timeout
        products = await searchPromise;
        
        const endTime = Date.now();
        console.log(`Product search completed in ${endTime - startTime}ms. Found ${products.length} products.`);
        
        // For each product that was found, store it in the cache for future use
        for (const product of products) {
          try {
            // Save to the product cache asynchronously with validated category detection
            fetch('/api/products', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url: product.productUrl,
                name: product.name,
                price: product.price,
                retailer: product.retailer,
                claudeData: {
                  ...product,
                  applianceType: claudeResponse.applianceType,
                  features: [...(product.features || []), ...(claudeResponse.features || [])],
                  brands: claudeResponse.brands || []
                }
              })
            }).catch(err => {
              console.warn(`Failed to cache product ${product.name}:`, err);
            });
          } catch (error) {
            console.warn(`Error caching product ${product.name}:`, error);
          }
        }
      } catch (error) {
        errors.push(logDetailedError('product_search', error));
        
        // Fallback to cached results if direct search fails
        if (cachedProducts.length > 0) {
          console.log(`Direct search failed, falling back to ${cachedProducts.length} cached products`);
          products = cachedProducts;
          fromCache = true;
        } else {
          return NextResponse.json({
            error: 'Error retrieving products. Please try again later.',
            diagnostics: { errors }
          }, { status: 500 });
        }
      }
    }
    
    // Get updated remaining queries
    let updatedRemainingQueries = remainingQueries;
    try {
      updatedRemainingQueries = await getRemainingQueries(userId);
    } catch (error) {
      errors.push(logDetailedError('remaining_queries_check', error));
      console.warn('Error getting updated remaining queries');
      // Continue with previous value
    }
    
    // Add environment status and subscription tier to Claude response to make it accessible on frontend
    const claudeResponseWithMetadata = {
      ...claudeResponse,
      envStatus,
      subscriptionTier
    };
    
    console.log('Search API request completed successfully');

    // Sanitize data before returning to prevent serialization issues
    const sanitizedResponse = sanitizeDataForSerialization({
      claudeResponse: claudeResponseWithMetadata,
      products,
      queryId,
      remainingQueries: updatedRemainingQueries,
      envStatus,
      subscriptionTier,
      fromCache,
      pendingUpdate,
      diagnostics: errors.length > 0 ? { errors, warnings: true } : undefined
    });

    // Return the results
    return NextResponse.json(sanitizedResponse);
  } catch (error) {
    const detailedError = logDetailedError('unexpected_error', error);
    errors.push(detailedError);
    
    // Add environment variable status in error response
    const missingVars = [];
    if (!process.env.ANTHROPIC_API_KEY) missingVars.push('ANTHROPIC_API_KEY');
    if (!process.env.OXYLABS_USERNAME) missingVars.push('OXYLABS_USERNAME');
    if (!process.env.OXYLABS_PASSWORD) missingVars.push('OXYLABS_PASSWORD');
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    console.error('Critical error in search API:', {
      error: detailedError,
      missingVars
    });
    
    return NextResponse.json(
      { 
        error: 'An error occurred while searching for appliances. Please try again later.',
        diagnostics: {
          missingVars,
          errors,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      }, 
      { status: 500 }
    );
  }
} 