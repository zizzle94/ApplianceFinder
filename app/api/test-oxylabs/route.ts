import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check if Oxylabs credentials are available
    if (!process.env.OXYLABS_USERNAME || !process.env.OXYLABS_PASSWORD) {
      return NextResponse.json({
        error: 'Oxylabs credentials not found in environment variables',
        credentialsExist: false
      }, { status: 400 });
    }
    
    // Test search for a refrigerator
    const payload = {
      source: 'universal_ecommerce',
      domain: 'bestbuy.com',
      parse: true,
      render: 'html',
      geo_location: 'United States',
      user_agent_type: 'desktop',
      url: 'https://www.bestbuy.com/site/searchpage.jsp?st=refrigerator'
    };
    
    // Attempt to connect to Oxylabs
    const response = await axios.post('https://realtime.oxylabs.io/v1/queries', payload, {
      auth: {
        username: process.env.OXYLABS_USERNAME,
        password: process.env.OXYLABS_PASSWORD
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Check the response structure
    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Oxylabs API',
      data: {
        status: response.status,
        hasResults: !!response.data.results,
        resultsCount: response.data.results ? response.data.results.length : 0,
        content_structure: response.data.results?.[0]?.content ? Object.keys(response.data.results[0].content) : []
      }
    });
  } catch (error) {
    console.error('Error testing Oxylabs connection:', error);
    
    // Return error information
    const errorResponse = {
      success: false,
      message: 'Failed to connect to Oxylabs API'
    };
    
    if (axios.isAxiosError(error)) {
      // @ts-ignore
      errorResponse.axiosError = {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message
      };
    } else if (error instanceof Error) {
      // @ts-ignore
      errorResponse.error = error.message;
    }
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
} 