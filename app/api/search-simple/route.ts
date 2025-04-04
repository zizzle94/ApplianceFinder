import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Extract the query from the request body
    let query;
    let requestBody;
    
    try {
      requestBody = await request.json();
      query = requestBody.query;
      console.log('Request body parsed:', requestBody);
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json(
        { error: 'Failed to parse request body' }, 
        { status: 400 }
      );
    }
    
    // Validate the query
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return NextResponse.json(
        { error: 'Query is required' }, 
        { status: 400 }
      );
    }
    
    // Return a mock response to test if basic functionality works
    return NextResponse.json({
      claudeResponse: {
        applianceType: "refrigerator",
        features: ["stainless steel", "french door", "energy star"],
        priceRange: {
          min: null,
          max: 2000
        },
        brands: []
      },
      products: [],
      queryId: '12345',
      remainingQueries: 25,
      envStatus: {
        usingMockData: true,
        missingVars: []
      },
      subscriptionTier: 'free'
    });
  } catch (error) {
    console.error('Error in simplified search API:', error);
    
    return NextResponse.json(
      { 
        error: 'An error occurred while searching for appliances. Please try again later.',
        errorDetails: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
} 