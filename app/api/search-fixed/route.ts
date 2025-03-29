import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';

/**
 * A simplified and fixed version of the search API that focuses on robustness
 * and proper error handling to diagnose the 500 error issue.
 * This version avoids all database interactions to isolate potential issues.
 */
export async function POST(request: NextRequest) {
  console.log('Fixed search API started');
  const errors: any[] = [];
  
  try {
    // 1. SAFELY EXTRACT QUERY
    let query = '';
    try {
      const body = await request.json();
      query = body.query;
      console.log('Query extracted:', query);
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json({ 
        error: 'Failed to parse request body',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 400 });
    }
    
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return NextResponse.json({ 
        error: 'Query is required and must be a non-empty string'
      }, { status: 400 });
    }
    
    // 2. CHECK ENVIRONMENT VARIABLES
    const envStatus = {
      NODE_ENV: process.env.NODE_ENV || 'not set',
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY ? 'Set' : 'Missing',
      OXYLABS_USERNAME: !!process.env.OXYLABS_USERNAME ? 'Set' : 'Missing',
      OXYLABS_PASSWORD: !!process.env.OXYLABS_PASSWORD ? 'Set' : 'Missing',
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
    };
    
    console.log('Environment status:', envStatus);
    
    const missingVars = [];
    if (!process.env.ANTHROPIC_API_KEY) missingVars.push('ANTHROPIC_API_KEY');
    if (!process.env.OXYLABS_USERNAME) missingVars.push('OXYLABS_USERNAME');
    if (!process.env.OXYLABS_PASSWORD) missingVars.push('OXYLABS_PASSWORD');
    
    // 3. CLAUDE API CALL (WITH ROBUST ERROR HANDLING)
    let claudeResponse;
    
    // First check if ANTHROPIC_API_KEY is available
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('ANTHROPIC_API_KEY is missing, using mock data');
      claudeResponse = {
        applianceType: "refrigerator",
        features: ["stainless steel", "french door", "energy star"],
        priceRange: {
          min: null,
          max: 2000
        },
        brands: [],
        mockData: true
      };
    } else {
      try {
        // Create Anthropic client
        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });
        
        console.log('Making Claude API call...');
        
        // Basic prompt for demonstration
        const prompt = `You are a helpful assistant that translates user requests for home appliances into structured data.
        
Extract the following from this query:
- applianceType (string): The type of appliance
- features (array of strings): Specific features mentioned by the user
- priceRange (object): An object with min and max properties
- brands (array of strings): Any specific brands mentioned

Return only the JSON object, no other text.

User Input: ${query}`;

        // Use Claude API to analyze the query
        try {
          console.log('Calling Claude API with input:', query);
          const response = await anthropic.messages.create({
            model: 'claude-3-7-sonnet-20250219',
            max_tokens: 1024,
            temperature: 0,
            system: "You are a helpful assistant that extracts structured information from user appliance queries. Respond with only JSON, no other text.",
            messages: [
              { role: 'user', content: prompt }
            ],
          });
          
          // Extract and parse the JSON from the response
          if (response.content[0].type === 'text') {
            const jsonText = response.content[0].text;
            claudeResponse = JSON.parse(jsonText);
            console.log('Claude response parsed successfully');
          } else {
            throw new Error('Unexpected response format from Claude API');
          }
        } catch (error) {
          console.error('Error calling Claude API:', error);
          
          // Provide a fallback response instead of failing
          claudeResponse = {
            applianceType: "refrigerator",
            features: ["stainless steel"],
            priceRange: {
              min: null,
              max: null
            },
            brands: [],
            errorFallback: true
          };
          
          errors.push({
            stage: 'claude_api',
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
        }
      } catch (error) {
        console.error('Error calling Claude API:', error);
        
        // Provide a fallback response instead of failing
        claudeResponse = {
          applianceType: "refrigerator",
          features: ["stainless steel"],
          priceRange: {
            min: null,
            max: null
          },
          brands: [],
          errorFallback: true
        };
        
        errors.push({
          stage: 'claude_api',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    }
    
    // 4. MOCK PRODUCT DATA (NO EXTERNAL API CALLS OR DB CALLS TO REDUCE ERROR SURFACE)
    const products = [
      {
        name: "Sample Refrigerator 1",
        price: 999.99,
        imageUrl: "https://via.placeholder.com/300x400?text=Demo+Refrigerator",
        productUrl: "https://www.bestbuy.com/sample-product",
        retailer: "Best Buy (Demo)",
        features: ["Energy Star", "Ice Maker", "25 cu ft"]
      },
      {
        name: "Sample Refrigerator 2",
        price: 1299.99,
        imageUrl: "https://via.placeholder.com/300x400?text=Demo+Refrigerator+2",
        productUrl: "https://www.homedepot.com/sample-product",
        retailer: "Home Depot (Demo)",
        features: ["French Door", "Stainless Steel", "27 cu ft"]
      }
    ];
    
    // 5. SUCCESSFUL RESPONSE WITH DETAILS
    console.log('Search API completed successfully');
    
    return NextResponse.json({
      claudeResponse: {
        ...claudeResponse,
        envStatus
      },
      products,
      queryId: 'fixed-search-' + Date.now(), // Generate a unique ID without DB
      remainingQueries: 999, // Fixed value since we're not checking the DB
      envStatus: {
        usingMockData: true,
        missingVars,
        dbBypass: true // Flag to indicate we're completely bypassing the database
      },
      subscriptionTier: 'free',
      diagnostics: errors.length > 0 ? { errors } : undefined
    });
  } catch (unexpectedError) {
    console.error('Critical error in fixed search API:', unexpectedError);
    
    return NextResponse.json({ 
      error: 'An unexpected error occurred. Please try again later.',
      errorDetails: unexpectedError instanceof Error ? unexpectedError.message : String(unexpectedError),
      errorStack: unexpectedError instanceof Error ? unexpectedError.stack : undefined
    }, { status: 500 });
  }
} 