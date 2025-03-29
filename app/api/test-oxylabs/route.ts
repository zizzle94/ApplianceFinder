import { NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Get the Oxylabs credentials
  const oxyUsername = process.env.OXYLABS_USERNAME;
  const oxyPassword = process.env.OXYLABS_PASSWORD;
  
  if (!oxyUsername || !oxyPassword) {
    return NextResponse.json({
      success: false,
      error: 'Oxylabs credentials not configured',
      details: {
        OXYLABS_USERNAME_EXISTS: !!oxyUsername,
        OXYLABS_PASSWORD_EXISTS: !!oxyPassword
      }
    });
  }
  
  try {
    // Test a simple search using Oxylabs with a valid source
    const response = await axios.post(
      'https://realtime.oxylabs.io/v1/queries',
      {
        source: 'universal_ecommerce',
        domain: 'bestbuy.com',
        query: 'refrigerator',
        parse: true
      },
      {
        auth: {
          username: oxyUsername,
          password: oxyPassword
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Return success with sample data structure
    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Oxylabs API',
      responseStatus: response.status,
      resultsCount: response.data.results?.length || 0,
      resultsSample: response.data.results?.length > 0 ? {
        status_code: response.data.results[0].status_code,
        content_type: typeof response.data.results[0].content,
        content_structure: Object.keys(response.data.results[0].content || {}),
        products_count: response.data.results[0].content?.results?.length || 
                      response.data.results[0].content?.organic?.length || 
                      response.data.results[0].content?.products?.length || 0,
        sample_product: response.data.results[0].content?.results?.[0] || 
                      response.data.results[0].content?.organic?.[0] || 
                      response.data.results[0].content?.products?.[0] || null
      } : null
    });
  } catch (error: unknown) {
    console.error('Error testing Oxylabs API:', error);
    
    // Check if it's an authentication error
    const axiosError = error as AxiosError;
    const statusCode = axiosError.response?.status;
    const responseData = axiosError.response?.data;
    
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to Oxylabs API',
      details: {
        statusCode,
        message: axiosError.message,
        responseData
      }
    });
  }
} 